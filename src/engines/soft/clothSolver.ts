import * as THREE from 'three';
import type { ClothPinMode, ColormapName, SoftSimConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';

interface ClothConstraint {
  a: number;
  b: number;
  rest: number;
}

export class ClothSolver {
  readonly cols: number;
  readonly rows: number;
  readonly vertexCount: number;
  readonly pos: Float32Array;
  readonly prevPos: Float32Array;
  readonly pinned: Uint8Array;
  private constraints: ClothConstraint[] = [];
  private time = 0;
  private mesh: THREE.Mesh | null = null;
  private obstacleMesh: THREE.Mesh | null = null;

  constructor(cols = 22, rows = 22, width = 4.0, height = 3.4) {
    this.cols = cols;
    this.rows = rows;
    this.vertexCount = cols * rows;
    this.pos = new Float32Array(this.vertexCount * 3);
    this.prevPos = new Float32Array(this.vertexCount * 3);
    this.pinned = new Uint8Array(this.vertexCount);

    this.initGrid(width, height, 'topCorners');
  }

  private idx(c: number, r: number): number {
    return r * this.cols + c;
  }

  initGrid(width = 4.0, height = 3.4, pinMode: ClothPinMode = 'topCorners'): void {
    this.time = 0;
    this.constraints = [];
    const topY = 4.2;

    for (let r = 0; r < this.rows; r++) {
      const v = r / (this.rows - 1);
      for (let c = 0; c < this.cols; c++) {
        const u = c / (this.cols - 1);
        const i = this.idx(c, r);
        const x = (u - 0.5) * width;
        const y = topY - v * height * 0.4;
        const z = -v * height * 0.55;

        this.pos[i * 3] = x;
        this.pos[i * 3 + 1] = y;
        this.pos[i * 3 + 2] = z;
        this.prevPos[i * 3] = x;
        this.prevPos[i * 3 + 1] = y;
        this.prevPos[i * 3 + 2] = z;
      }
    }

    this.setPinMode(pinMode);

    const addConstraint = (a: number, b: number) => {
      const dx = this.pos[a * 3] - this.pos[b * 3];
      const dy = this.pos[a * 3 + 1] - this.pos[b * 3 + 1];
      const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2];
      this.constraints.push({ a, b, rest: Math.hypot(dx, dy, dz) });
    };

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = this.idx(c, r);
        // Structural
        if (c + 1 < this.cols) addConstraint(i, this.idx(c + 1, r));
        if (r + 1 < this.rows) addConstraint(i, this.idx(c, r + 1));
        // Shear
        if (c + 1 < this.cols && r + 1 < this.rows) {
          addConstraint(i, this.idx(c + 1, r + 1));
          addConstraint(this.idx(c + 1, r), this.idx(c, r + 1));
        }
        // Bend (skip 1)
        if (c + 2 < this.cols) addConstraint(i, this.idx(c + 2, r));
        if (r + 2 < this.rows) addConstraint(i, this.idx(c, r + 2));
      }
    }
  }

  setPinMode(pinMode: ClothPinMode): void {
    this.pinned.fill(0);
    if (pinMode === 'topCorners') {
      this.pinned[this.idx(0, 0)] = 1;
      this.pinned[this.idx(this.cols - 1, 0)] = 1;
    } else if (pinMode === 'topEdge') {
      for (let c = 0; c < this.cols; c++) {
        this.pinned[this.idx(c, 0)] = 1;
      }
    } else {
      this.pinned[this.idx(0, 0)] = 1;
      this.pinned[this.idx(this.cols - 1, 0)] = 1;
      this.pinned[this.idx(0, this.rows - 1)] = 1;
      this.pinned[this.idx(this.cols - 1, this.rows - 1)] = 1;
    }
  }

  step(dt: number, cfg: SoftSimConfig['cloth'], gravityY = -9.81): void {
    const h = Math.min(0.025, dt);
    this.time += h;
    const damp = Math.max(0.85, Math.min(0.999, 1 - cfg.damping));

    const windRad = (cfg.windDirectionDeg * Math.PI) / 180;
    const gust = 0.75 + 0.35 * Math.sin(this.time * 2.3);
    const wx = Math.cos(windRad) * cfg.windStrength * gust;
    const wz = Math.sin(windRad) * cfg.windStrength * gust;

    for (let i = 0; i < this.vertexCount; i++) {
      if (this.pinned[i]) continue;
      const i3 = i * 3;
      const x = this.pos[i3];
      const y = this.pos[i3 + 1];
      const z = this.pos[i3 + 2];

      const vx = (x - this.prevPos[i3]) * damp;
      const vy = (y - this.prevPos[i3 + 1]) * damp;
      const vz = (z - this.prevPos[i3 + 2]) * damp;

      this.prevPos[i3] = x;
      this.prevPos[i3 + 1] = y;
      this.prevPos[i3 + 2] = z;

      const localFlutter = Math.sin(this.time * 4 + x * 1.4 + z * 1.1) * 0.35 * cfg.windStrength;
      this.pos[i3] = x + vx + wx * h * h;
      this.pos[i3 + 1] = y + vy + (gravityY + localFlutter * 0.25) * h * h;
      this.pos[i3 + 2] = z + vz + wz * h * h;
    }

    const stiffness = Math.max(0.1, Math.min(1, cfg.stiffness));
    const iterations = 5;
    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < this.constraints.length; k++) {
        const c = this.constraints[k];
        const a3 = c.a * 3;
        const b3 = c.b * 3;
        const dx = this.pos[b3] - this.pos[a3];
        const dy = this.pos[b3 + 1] - this.pos[a3 + 1];
        const dz = this.pos[b3 + 2] - this.pos[a3 + 2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 1e-6) continue;
        const diff = ((dist - c.rest) / dist) * stiffness;

        const pinA = this.pinned[c.a] === 1;
        const pinB = this.pinned[c.b] === 1;

        if (!pinA && !pinB) {
          const half = 0.5 * diff;
          this.pos[a3] += dx * half;
          this.pos[a3 + 1] += dy * half;
          this.pos[a3 + 2] += dz * half;
          this.pos[b3] -= dx * half;
          this.pos[b3 + 1] -= dy * half;
          this.pos[b3 + 2] -= dz * half;
        } else if (pinA && !pinB) {
          this.pos[b3] -= dx * diff;
          this.pos[b3 + 1] -= dy * diff;
          this.pos[b3 + 2] -= dz * diff;
        } else if (!pinA && pinB) {
          this.pos[a3] += dx * diff;
          this.pos[a3 + 1] += dy * diff;
          this.pos[a3 + 2] += dz * diff;
        }
      }

      // Ground & obstacle collision enforcement
      const [ox, oy, oz] = cfg.obstaclePos;
      const obsR = cfg.obstacleRadius + 0.04;
      for (let i = 0; i < this.vertexCount; i++) {
        if (this.pinned[i]) continue;
        const i3 = i * 3;
        if (this.pos[i3 + 1] < 0.03) {
          this.pos[i3 + 1] = 0.03;
        }
        if (cfg.obstacleEnabled) {
          const dx = this.pos[i3] - ox;
          const dy = this.pos[i3 + 1] - oy;
          const dz = this.pos[i3 + 2] - oz;
          const d = Math.hypot(dx, dy, dz);
          if (d < obsR && d > 1e-6) {
            const s = obsR / d;
            this.pos[i3] = ox + dx * s;
            this.pos[i3 + 1] = oy + dy * s;
            this.pos[i3 + 2] = oz + dz * s;
          }
        }
      }
    }
  }

  createMesh(cfg: SoftSimConfig['cloth'], colormap: ColormapName): THREE.Group {
    const group = new THREE.Group();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const colors = new Float32Array(this.vertexCount * 3);
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const indices: number[] = [];
    for (let r = 0; r < this.rows - 1; r++) {
      for (let c = 0; c < this.cols - 1; c++) {
        const a = this.idx(c, r);
        const b = this.idx(c + 1, r);
        const d = this.idx(c, r + 1);
        const e = this.idx(c + 1, r + 1);
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }
    geom.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    group.add(this.mesh);

    const obsGeom = new THREE.SphereGeometry(cfg.obstacleRadius, 24, 24);
    const obsMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      roughness: 0.35,
      metalness: 0.4,
    });
    this.obstacleMesh = new THREE.Mesh(obsGeom, obsMat);
    this.obstacleMesh.position.set(...cfg.obstaclePos);
    this.obstacleMesh.castShadow = true;
    this.obstacleMesh.visible = cfg.obstacleEnabled;
    group.add(this.obstacleMesh);

    this.syncMesh(cfg, colormap);
    return group;
  }

  syncMesh(cfg: SoftSimConfig['cloth'], colormap: ColormapName): void {
    if (this.mesh) {
      const geom = this.mesh.geometry;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
      const colors = colAttr.array as Float32Array;
      for (let i = 0; i < this.vertexCount; i++) {
        const hNorm = Math.max(0, Math.min(1, this.pos[i * 3 + 1] / 4.5));
        const [r, g, b] = sampleColormap(colormap, hNorm);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      geom.computeVertexNormals();
    }

    if (this.obstacleMesh) {
      this.obstacleMesh.visible = cfg.obstacleEnabled;
      this.obstacleMesh.position.set(...cfg.obstaclePos);
      const scale = cfg.obstacleRadius;
      this.obstacleMesh.scale.set(scale, scale, scale);
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
    if (this.obstacleMesh) {
      this.obstacleMesh.geometry.dispose();
      (this.obstacleMesh.material as THREE.Material).dispose();
      this.obstacleMesh = null;
    }
  }
}
