import * as THREE from 'three';
import type { ColormapName, SoftSimConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';

export function createDefaultSoftConfig(): SoftSimConfig {
  return {
    activeKind: 'particles',
    colormap: 'harboria',
    particles: {
      preset: 'nbody',
      count: 1400,
      centralMass: 24,
      perturberMass: 4.5,
      fieldStrength: 2.2,
      damping: 0.002,
    },
    cloth: {
      pinMode: 'topCorners',
      stiffness: 0.92,
      damping: 0.015,
      windStrength: 4.5,
      windDirectionDeg: 20,
      obstacleEnabled: true,
      obstacleRadius: 1.05,
      obstaclePos: [0, 1.85, 0.35],
    },
    sphFluid: {
      particleCount: 520,
      restDensity: 1.4,
      stiffness: 22,
      viscosity: 0.28,
      gravity: 9.81,
      tankHalfWidth: 2.2,
      tankHeight: 3.4,
    },
    waveTank: {
      waveSpeed: 5.5,
      damping: 0.35,
      rainEnabled: true,
      rainRate: 2.2,
    },
  };
}

export class ParticleFieldEngine {
  readonly positions: Float32Array;
  readonly velocities: Float32Array;
  readonly speeds: Float32Array;
  readonly count: number;
  private time = 0;
  private mesh: THREE.InstancedMesh | null = null;
  private dummy = new THREE.Object3D();
  private tmpColor = new THREE.Color();

  constructor(count: number, preset: SoftSimConfig['particles']['preset']) {
    this.count = Math.max(100, Math.min(4000, Math.round(count)));
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.speeds = new Float32Array(this.count);
    this.reset(preset);
  }

  reset(preset: SoftSimConfig['particles']['preset']): void {
    this.time = 0;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      if (preset === 'nbody') {
        const angle = (i * 2.399963) % (Math.PI * 2);
        const r = 1.2 + Math.sqrt((i + 1) / this.count) * 4.2;
        const height = (((i * 17) % 100) / 100 - 0.5) * 0.35;
        this.positions[i3] = Math.cos(angle) * r;
        this.positions[i3 + 1] = 2.6 + height;
        this.positions[i3 + 2] = Math.sin(angle) * r;

        // Tangential orbital velocity v = sqrt(GM / r)
        const vMag = Math.sqrt(24 / Math.max(0.4, r));
        this.velocities[i3] = -Math.sin(angle) * vMag;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = Math.cos(angle) * vMag;
      } else if (preset === 'vortex') {
        const angle = ((i * 73) % 360) * (Math.PI / 180);
        const r = 0.4 + (((i * 13) % 100) / 100) * 3.8;
        const y = 0.4 + (((i * 29) % 100) / 100) * 4.4;
        this.positions[i3] = Math.cos(angle) * r;
        this.positions[i3 + 1] = y;
        this.positions[i3 + 2] = Math.sin(angle) * r;
        this.velocities[i3] = -Math.sin(angle) * 1.4;
        this.velocities[i3 + 1] = 0.2;
        this.velocities[i3 + 2] = Math.cos(angle) * 1.4;
      } else {
        // Lorentz charged particle helix
        const angle = (i / this.count) * Math.PI * 10;
        const r = 0.5 + (((i * 31) % 100) / 100) * 2.8;
        this.positions[i3] = Math.cos(angle) * r;
        this.positions[i3 + 1] = 0.8 + (i / this.count) * 3.6;
        this.positions[i3 + 2] = Math.sin(angle) * r;
        this.velocities[i3] = -Math.sin(angle) * 2.4;
        this.velocities[i3 + 1] = (((i * 11) % 100) / 100 - 0.5) * 1.6;
        this.velocities[i3 + 2] = Math.cos(angle) * 2.4;
      }
      this.speeds[i] = Math.hypot(
        this.velocities[i3],
        this.velocities[i3 + 1],
        this.velocities[i3 + 2]
      );
    }
  }

  step(dt: number, cfg: SoftSimConfig['particles']): void {
    const h = Math.min(0.03, dt);
    this.time += h;
    const damp = Math.max(0, 1 - cfg.damping);
    const centerY = 2.6;

    // Orbiting secondary perturber in n-body mode
    const pertAngle = this.time * 0.9;
    const pertR = 3.2;
    const px = Math.cos(pertAngle) * pertR;
    const py = centerY;
    const pz = Math.sin(pertAngle) * pertR;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      let x = this.positions[i3];
      let y = this.positions[i3 + 1];
      let z = this.positions[i3 + 2];

      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      if (cfg.preset === 'nbody') {
        const dx = -x;
        const dy = centerY - y;
        const dz = -z;
        const r2 = dx * dx + dy * dy + dz * dz + 0.35;
        const invR3 = cfg.centralMass / (r2 * Math.sqrt(r2));

        const pdx = px - x;
        const pdy = py - y;
        const pdz = pz - z;
        const pr2 = pdx * pdx + pdy * pdy + pdz * pdz + 0.45;
        const pInvR3 = cfg.perturberMass / (pr2 * Math.sqrt(pr2));

        vx = (vx + (dx * invR3 + pdx * pInvR3) * h) * damp;
        vy = (vy + (dy * invR3 + pdy * pInvR3) * h) * damp;
        vz = (vz + (dz * invR3 + pdz * pInvR3) * h) * damp;
      } else if (cfg.preset === 'vortex') {
        const r = Math.hypot(x, z) + 0.25;
        const strength = cfg.fieldStrength;
        const targetVx = (-z / r) * strength * 1.9 - x * 0.22;
        const targetVz = (x / r) * strength * 1.9 - z * 0.22;
        const targetVy = Math.sin(r * 1.4 - this.time * 2.0) * 0.9 + (centerY - y) * 0.7;

        vx = (vx + (targetVx - vx) * 2.5 * h) * damp;
        vy = (vy + (targetVy - vy) * 2.5 * h) * damp;
        vz = (vz + (targetVz - vz) * 2.5 * h) * damp;
      } else {
        // Lorentz force F = q(E + v x B) with B along Y and weak restoring E toward center
        const B = cfg.fieldStrength * 1.4;
        const ax = -vz * B - x * 0.35;
        const ay = (centerY - y) * 1.2;
        const az = vx * B - z * 0.35;

        vx = (vx + ax * h) * damp;
        vy = (vy + ay * h) * damp;
        vz = (vz + az * h) * damp;
      }

      x += vx * h;
      y += vy * h;
      z += vz * h;

      // Soft bounding keep-alive
      if (Math.hypot(x, y - centerY, z) > 12) {
        x *= 0.35;
        y = centerY + (y - centerY) * 0.35;
        z *= 0.35;
      }

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;
      this.speeds[i] = Math.hypot(vx, vy, vz);
    }
  }

  createMesh(colormap: ColormapName): THREE.Group {
    const group = new THREE.Group();
    const geom = new THREE.IcosahedronGeometry(0.055, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.2,
    });
    this.mesh = new THREE.InstancedMesh(geom, mat, this.count);
    this.syncMesh(colormap);
    group.add(this.mesh);
    return group;
  }

  syncMesh(colormap: ColormapName): void {
    if (!this.mesh) return;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.dummy.position.set(
        this.positions[i3],
        this.positions[i3 + 1],
        this.positions[i3 + 2]
      );
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const norm = Math.min(1, this.speeds[i] / 6.5);
      const [r, g, b] = sampleColormap(colormap, norm);
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
  }
}
