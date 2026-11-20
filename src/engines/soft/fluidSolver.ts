import * as THREE from 'three';
import type { ColormapName, SoftSimConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';

export class SphFluidSolver {
  readonly count: number;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly density: Float32Array;
  readonly pressure: Float32Array;
  private mesh: THREE.InstancedMesh | null = null;
  private boxHelper: THREE.LineSegments | null = null;
  private dummy = new THREE.Object3D();
  private tmpColor = new THREE.Color();
  private readonly h = 0.42;

  constructor(count = 520, halfWidth = 2.2) {
    this.count = Math.max(100, Math.min(1200, Math.round(count)));
    this.pos = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.density = new Float32Array(this.count);
    this.pressure = new Float32Array(this.count);
    this.resetDamBreak(halfWidth);
  }

  resetDamBreak(halfWidth = 2.2): void {
    const cols = 8;
    const depthCols = 8;
    const spacing = 0.24;
    for (let i = 0; i < this.count; i++) {
      const layer = Math.floor(i / (cols * depthCols));
      const rem = i % (cols * depthCols);
      const ix = rem % cols;
      const iz = Math.floor(rem / cols);

      const jitter = ((i * 7) % 13) * 0.004;
      this.pos[i * 3] = -halfWidth + 0.35 + ix * spacing + jitter;
      this.pos[i * 3 + 1] = 0.25 + layer * spacing;
      this.pos[i * 3 + 2] = (iz - depthCols / 2 + 0.5) * spacing + jitter;

      this.vel[i * 3] = 0;
      this.vel[i * 3 + 1] = 0;
      this.vel[i * 3 + 2] = 0;
    }
  }

  sloshImpulse(): void {
    for (let i = 0; i < this.count; i++) {
      this.vel[i * 3] += 3.5;
      this.vel[i * 3 + 1] += 2.2;
    }
  }

  step(dt: number, cfg: SoftSimConfig['sphFluid']): void {
    const stepDt = Math.min(0.016, dt);
    const h = this.h;
    const h2 = h * h;
    const poly6 = 315 / (64 * Math.PI * Math.pow(h, 9));
    const spikyGrad = -45 / (Math.PI * Math.pow(h, 6));
    const viscLap = 45 / (Math.PI * Math.pow(h, 6));
    const mass = 0.14;

    // Spatial hash map for O(N) neighbor lookup
    const cellSize = h;
    const grid = new Map<string, number[]>();
    for (let i = 0; i < this.count; i++) {
      const cx = Math.floor(this.pos[i * 3] / cellSize);
      const cy = Math.floor(this.pos[i * 3 + 1] / cellSize);
      const cz = Math.floor(this.pos[i * 3 + 2] / cellSize);
      const key = `${cx},${cy},${cz}`;
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(i);
    }

    const neighbors: number[][] = new Array(this.count);

    // 1. Density & Pressure
    for (let i = 0; i < this.count; i++) {
      const xi = this.pos[i * 3];
      const yi = this.pos[i * 3 + 1];
      const zi = this.pos[i * 3 + 2];
      const cx = Math.floor(xi / cellSize);
      const cy = Math.floor(yi / cellSize);
      const cz = Math.floor(zi / cellSize);

      const nList: number[] = [];
      let rho = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!bucket) continue;
            for (const j of bucket) {
              const rx = xi - this.pos[j * 3];
              const ry = yi - this.pos[j * 3 + 1];
              const rz = zi - this.pos[j * 3 + 2];
              const r2 = rx * rx + ry * ry + rz * rz;
              if (r2 < h2) {
                nList.push(j);
                const diff = h2 - r2;
                rho += mass * poly6 * diff * diff * diff;
              }
            }
          }
        }
      }
      neighbors[i] = nList;
      this.density[i] = Math.max(cfg.restDensity * 0.25, rho);
      this.pressure[i] = Math.max(0, cfg.stiffness * (this.density[i] - cfg.restDensity));
    }

    // 2. Forces + Integration
    const hw = cfg.tankHalfWidth;
    const hd = cfg.tankHalfWidth * 0.72;
    const th = cfg.tankHeight;

    for (let i = 0; i < this.count; i++) {
      const xi = this.pos[i * 3];
      const yi = this.pos[i * 3 + 1];
      const zi = this.pos[i * 3 + 2];
      const vxi = this.vel[i * 3];
      const vyi = this.vel[i * 3 + 1];
      const vzi = this.vel[i * 3 + 2];

      let fx = 0;
      let fy = -cfg.gravity * this.density[i];
      let fz = 0;

      for (const j of neighbors[i]) {
        if (i === j) continue;
        const rx = xi - this.pos[j * 3];
        const ry = yi - this.pos[j * 3 + 1];
        const rz = zi - this.pos[j * 3 + 2];
        const r = Math.hypot(rx, ry, rz);
        if (r < 1e-5 || r >= h) continue;

        const avgP = (this.pressure[i] + this.pressure[j]) / (2 * this.density[j]);
        const pMag = -mass * avgP * spikyGrad * (h - r) * (h - r);
        fx += (rx / r) * pMag;
        fy += (ry / r) * pMag;
        fz += (rz / r) * pMag;

        const vFactor = (cfg.viscosity * mass * viscLap * (h - r)) / this.density[j];
        fx += (this.vel[j * 3] - vxi) * vFactor;
        fy += (this.vel[j * 3 + 1] - vyi) * vFactor;
        fz += (this.vel[j * 3 + 2] - vzi) * vFactor;
      }

      const rhoInv = 1 / Math.max(0.2, this.density[i]);
      let nvx = vxi + fx * rhoInv * stepDt;
      let nvy = vyi + fy * rhoInv * stepDt;
      let nvz = vzi + fz * rhoInv * stepDt;

      // Clamp extreme velocities for numerical stability
      const spd = Math.hypot(nvx, nvy, nvz);
      if (spd > 18) {
        const s = 18 / spd;
        nvx *= s;
        nvy *= s;
        nvz *= s;
      }

      let nx = xi + nvx * stepDt;
      let ny = yi + nvy * stepDt;
      let nz = zi + nvz * stepDt;

      const bounce = -0.35;
      if (nx < -hw) {
        nx = -hw;
        nvx *= bounce;
      } else if (nx > hw) {
        nx = hw;
        nvx *= bounce;
      }
      if (ny < 0.08) {
        ny = 0.08;
        nvy *= bounce;
      } else if (ny > th) {
        ny = th;
        nvy *= bounce;
      }
      if (nz < -hd) {
        nz = -hd;
        nvz *= bounce;
      } else if (nz > hd) {
        nz = hd;
        nvz *= bounce;
      }

      this.pos[i * 3] = nx;
      this.pos[i * 3 + 1] = ny;
      this.pos[i * 3 + 2] = nz;
      this.vel[i * 3] = nvx;
      this.vel[i * 3 + 1] = nvy;
      this.vel[i * 3 + 2] = nvz;
    }
  }

  createMesh(cfg: SoftSimConfig['sphFluid'], colormap: ColormapName): THREE.Group {
    const group = new THREE.Group();
    const geom = new THREE.SphereGeometry(0.11, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.1,
    });
    this.mesh = new THREE.InstancedMesh(geom, mat, this.count);
    group.add(this.mesh);

    const boxGeom = new THREE.BoxGeometry(
      cfg.tankHalfWidth * 2,
      cfg.tankHeight,
      cfg.tankHalfWidth * 1.44
    );
    const edges = new THREE.EdgesGeometry(boxGeom);
    boxGeom.dispose();
    this.boxHelper = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.45 })
    );
    this.boxHelper.position.set(0, cfg.tankHeight / 2, 0);
    group.add(this.boxHelper);

    this.syncMesh(colormap);
    return group;
  }

  syncMesh(colormap: ColormapName): void {
    if (!this.mesh) return;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.dummy.position.set(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const spd = Math.hypot(this.vel[i3], this.vel[i3 + 1], this.vel[i3 + 2]);
      const [r, g, b] = sampleColormap(colormap, Math.min(1, spd / 5.5));
      this.tmpColor.setRGB(r, g, b);
      this.mesh.setColorAt(i, this.tmpColor);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
    if (this.boxHelper) {
      this.boxHelper.geometry.dispose();
      (this.boxHelper.material as THREE.Material).dispose();
      this.boxHelper = null;
    }
  }
}

export class WaveTankSolver {
  readonly size: number;
  readonly u: Float32Array;
  readonly v: Float32Array;
  private readonly domainSize: number;
  private mesh: THREE.Mesh | null = null;
  private rainAccum = 0;
  private seed = 1;

  constructor(size = 56, domainSize = 7.0) {
    this.size = size;
    this.domainSize = domainSize;
    this.u = new Float32Array(size * size);
    this.v = new Float32Array(size * size);
    this.dropRipple(0, 0, 0.85);
  }

  dropRipple(nx = 0, nz = 0, amplitude = 0.75): void {
    const cx = Math.round(((nx + 1) * 0.5) * (this.size - 1));
    const cz = Math.round(((nz + 1) * 0.5) * (this.size - 1));
    const rad = 3;
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const ix = cx + dx;
        const iz = cz + dz;
        if (ix <= 1 || ix >= this.size - 2 || iz <= 1 || iz >= this.size - 2) continue;
        const dist = Math.hypot(dx, dz);
        if (dist <= rad) {
          this.u[iz * this.size + ix] += amplitude * Math.cos((dist / rad) * (Math.PI * 0.5));
        }
      }
    }
  }

  reset(): void {
    this.u.fill(0);
    this.v.fill(0);
    this.dropRipple(0, 0, 0.85);
  }

  step(dt: number, cfg: SoftSimConfig['waveTank']): void {
    const h = Math.min(0.018, dt);
    const n = this.size;
    const dx = this.domainSize / (n - 1);
    const c2 = (cfg.waveSpeed * cfg.waveSpeed) / (dx * dx);

    if (cfg.rainEnabled && cfg.rainRate > 0) {
      this.rainAccum += h * cfg.rainRate;
      while (this.rainAccum >= 1) {
        this.rainAccum -= 1;
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        const rx = ((this.seed % 1000) / 1000) * 1.6 - 0.8;
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        const rz = ((this.seed % 1000) / 1000) * 1.6 - 0.8;
        this.dropRipple(rx, rz, 0.48);
      }
    }

    for (let z = 1; z < n - 1; z++) {
      for (let x = 1; x < n - 1; x++) {
        const i = z * n + x;
        const lap =
          this.u[i - 1] +
          this.u[i + 1] +
          this.u[i - n] +
          this.u[i + n] -
          4 * this.u[i];
        const acc = c2 * lap * 0.045 - cfg.damping * this.v[i];
        this.v[i] += acc * h;
      }
    }

    for (let z = 1; z < n - 1; z++) {
      for (let x = 1; x < n - 1; x++) {
        const i = z * n + x;
        this.u[i] = Math.max(-1.6, Math.min(1.6, this.u[i] + this.v[i] * h));
      }
    }
  }

  createMesh(colormap: ColormapName): THREE.Group {
    const group = new THREE.Group();
    const n = this.size;
    const count = n * n;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let z = 0; z < n; z++) {
      const pz = (z / (n - 1) - 0.5) * this.domainSize;
      for (let x = 0; x < n; x++) {
        const px = (x / (n - 1) - 0.5) * this.domainSize;
        const i = z * n + x;
        positions[i * 3] = px;
        positions[i * 3 + 1] = 1.0;
        positions[i * 3 + 2] = pz;
      }
    }

    const indices: number[] = [];
    for (let z = 0; z < n - 1; z++) {
      for (let x = 0; x < n - 1; x++) {
        const a = z * n + x;
        const b = z * n + (x + 1);
        const c = (z + 1) * n + x;
        const d = (z + 1) * n + (x + 1);
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.14,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.receiveShadow = true;
    group.add(this.mesh);
    this.syncMesh(colormap);
    return group;
  }

  syncMesh(colormap: ColormapName): void {
    if (!this.mesh) return;
    const geom = this.mesh.geometry;
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    const total = this.size * this.size;
    for (let i = 0; i < total; i++) {
      const h = this.u[i];
      positions[i * 3 + 1] = 1.0 + h;
      const [r, g, b] = sampleColormap(colormap, Math.max(0, Math.min(1, (h + 0.6) / 1.2)));
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geom.computeVertexNormals();
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
  }
}
