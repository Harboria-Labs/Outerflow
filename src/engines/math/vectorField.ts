import * as THREE from 'three';
import type { VectorFieldConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';
import { compileMathExpr, evalSafe } from './evaluator';

export interface VectorFieldPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<VectorFieldConfig, 'presetId' | 'colormap'>;
}

export const VECTOR_FIELD_PRESETS: VectorFieldPreset[] = [
  {
    id: 'swirlVortex',
    name: 'Swirl Vortex',
    description: 'Helical upward rotational flow with radial inflow',
    config: {
      vxExpr: '-z - 0.15 * x',
      vyExpr: '0.45 * sin(sqrt(x^2 + z^2)) + 0.3',
      vzExpr: 'x - 0.15 * z',
      bound: 2.5,
      gridCount: 6,
      arrowScale: 0.45,
      animateTracers: true,
    },
  },
  {
    id: 'magneticDipole',
    name: 'Magnetic Dipole',
    description: '3D dipole field lines emerging along the vertical axis',
    config: {
      vxExpr: '3 * x * y / ((x^2 + y^2 + z^2 + 0.35)^2.5)',
      vyExpr: '(2 * y^2 - x^2 - z^2) / ((x^2 + y^2 + z^2 + 0.35)^2.5)',
      vzExpr: '3 * z * y / ((x^2 + y^2 + z^2 + 0.35)^2.5)',
      bound: 2.4,
      gridCount: 6,
      arrowScale: 0.85,
      animateTracers: true,
    },
  },
  {
    id: 'saddle',
    name: 'Hyperbolic Saddle Flow',
    description: 'Incompressible strain-rate saddle tensor field',
    config: {
      vxExpr: 'x',
      vyExpr: '-0.5 * y',
      vzExpr: '-0.5 * z',
      bound: 2.4,
      gridCount: 6,
      arrowScale: 0.38,
      animateTracers: true,
    },
  },
  {
    id: 'sourceSink',
    name: 'Source-Sink Pair',
    description: 'Potential flow from a source (+1.5) to a sink (-1.5)',
    config: {
      vxExpr: '(x - 1.5)/((x-1.5)^2 + y^2 + z^2 + 0.3)^1.5 - (x + 1.5)/((x+1.5)^2 + y^2 + z^2 + 0.3)^1.5',
      vyExpr: 'y/((x-1.5)^2 + y^2 + z^2 + 0.3)^1.5 - y/((x+1.5)^2 + y^2 + z^2 + 0.3)^1.5',
      vzExpr: 'z/((x-1.5)^2 + y^2 + z^2 + 0.3)^1.5 - z/((x+1.5)^2 + y^2 + z^2 + 0.3)^1.5',
      bound: 2.6,
      gridCount: 6,
      arrowScale: 0.65,
      animateTracers: true,
    },
  },
];

export function createDefaultVectorFieldConfig(): VectorFieldConfig {
  const p = VECTOR_FIELD_PRESETS[0];
  return {
    presetId: p.id,
    ...p.config,
    colormap: 'harboria',
  };
}

export interface VectorFieldSceneHandle {
  group: THREE.Group;
  errors: string[];
  stepTracers: (dt: number) => void;
  dispose: () => void;
}

export function buildVectorFieldScene(config: VectorFieldConfig): VectorFieldSceneHandle {
  const errors: string[] = [];
  const cvx = compileMathExpr(config.vxExpr);
  const cvy = compileMathExpr(config.vyExpr);
  const cvz = compileMathExpr(config.vzExpr);

  if (!cvx.ok) errors.push(`vx: ${cvx.error}`);
  if (!cvy.ok) errors.push(`vy: ${cvy.error}`);
  if (!cvz.ok) errors.push(`vz: ${cvz.error}`);

  const group = new THREE.Group();
  if (!cvx.ok || !cvy.ok || !cvz.ok) {
    return {
      group,
      errors,
      stepTracers: () => {},
      dispose: () => {},
    };
  }

  const n = Math.max(3, Math.min(9, Math.round(config.gridCount)));
  const bound = Math.max(0.5, config.bound);
  const total = n * n * n;
  const yOffset = bound + 0.4;

  const samples: { pos: THREE.Vector3; dir: THREE.Vector3; mag: number }[] = [];
  let maxMag = 1e-5;
  const scope = { x: 0, y: 0, z: 0, pi: Math.PI, e: Math.E };

  for (let iz = 0; iz < n; iz++) {
    const z = n === 1 ? 0 : -bound + (2 * bound * iz) / (n - 1);
    scope.z = z;
    for (let iy = 0; iy < n; iy++) {
      const y = n === 1 ? 0 : -bound + (2 * bound * iy) / (n - 1);
      scope.y = y;
      for (let ix = 0; ix < n; ix++) {
        const x = n === 1 ? 0 : -bound + (2 * bound * ix) / (n - 1);
        scope.x = x;

        const vx = evalSafe(cvx.fn, scope);
        const vy = evalSafe(cvy.fn, scope);
        const vz = evalSafe(cvz.fn, scope);
        const mag = Math.hypot(vx, vy, vz);
        if (mag > maxMag) maxMag = mag;
        samples.push({
          pos: new THREE.Vector3(x, y + yOffset, z),
          dir: new THREE.Vector3(vx, vy, vz),
          mag,
        });
      }
    }
  }

  const shaftGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6);
  shaftGeom.translate(0, 0.36, 0);
  const coneGeom = new THREE.ConeGeometry(0.06, 0.28, 8);
  coneGeom.translate(0, 0.86, 0);

  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.2,
  });

  const shaftInst = new THREE.InstancedMesh(shaftGeom, arrowMat, total);
  const coneInst = new THREE.InstancedMesh(coneGeom, arrowMat, total);

  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion();
  const color = new THREE.Color();

  samples.forEach((s, i) => {
    const normMag = Math.min(1, s.mag / maxMag);
    const len = Math.max(0.08, (0.25 + 0.75 * normMag) * config.arrowScale);
    const unitDir = s.mag > 1e-6 ? s.dir.clone().normalize() : up.clone();

    quat.setFromUnitVectors(up, unitDir);
    dummy.position.copy(s.pos);
    dummy.quaternion.copy(quat);
    dummy.scale.set(1, len, 1);
    dummy.updateMatrix();

    shaftInst.setMatrixAt(i, dummy.matrix);
    coneInst.setMatrixAt(i, dummy.matrix);

    const [r, g, b] = sampleColormap(config.colormap, normMag);
    color.setRGB(r, g, b);
    shaftInst.setColorAt(i, color);
    coneInst.setColorAt(i, color);
  });

  shaftInst.instanceMatrix.needsUpdate = true;
  coneInst.instanceMatrix.needsUpdate = true;
  if (shaftInst.instanceColor) shaftInst.instanceColor.needsUpdate = true;
  if (coneInst.instanceColor) coneInst.instanceColor.needsUpdate = true;

  group.add(shaftInst);
  group.add(coneInst);

  // Advected streamline tracers
  const tracerCount = 160;
  const tracerGeom = new THREE.SphereGeometry(0.045, 8, 8);
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const tracerInst = new THREE.InstancedMesh(tracerGeom, tracerMat, tracerCount);
  const tracerPos: [number, number, number][] = [];

  const resetTracer = (idx: number) => {
    const angle = (idx * 2.39996) % (Math.PI * 2);
    const rad = ((idx % 17) / 17) * bound * 0.9;
    const ty = (((idx * 7) % 19) / 19 - 0.5) * 2 * bound * 0.8;
    tracerPos[idx] = [Math.cos(angle) * rad, ty, Math.sin(angle) * rad];
  };
  for (let i = 0; i < tracerCount; i++) resetTracer(i);

  group.add(tracerInst);

  const syncTracers = () => {
    for (let i = 0; i < tracerCount; i++) {
      const p = tracerPos[i];
      dummy.position.set(p[0], p[1] + yOffset, p[2]);
      dummy.quaternion.identity();
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tracerInst.setMatrixAt(i, dummy.matrix);
    }
    tracerInst.instanceMatrix.needsUpdate = true;
  };
  syncTracers();

  const stepTracers = (dt: number) => {
    tracerInst.visible = config.animateTracers;
    if (!config.animateTracers) return;
    const h = Math.min(0.05, dt);
    const limit = bound * 1.15;
    for (let i = 0; i < tracerCount; i++) {
      const p = tracerPos[i];
      scope.x = p[0];
      scope.y = p[1];
      scope.z = p[2];
      const vx = evalSafe(cvx.fn, scope);
      const vy = evalSafe(cvy.fn, scope);
      const vz = evalSafe(cvz.fn, scope);
      p[0] += vx * h;
      p[1] += vy * h;
      p[2] += vz * h;
      if (
        Math.abs(p[0]) > limit ||
        Math.abs(p[1]) > limit ||
        Math.abs(p[2]) > limit ||
        Math.hypot(vx, vy, vz) < 1e-4
      ) {
        resetTracer(i);
      }
    }
    syncTracers();
  };

  const dispose = () => {
    shaftGeom.dispose();
    coneGeom.dispose();
    arrowMat.dispose();
    tracerGeom.dispose();
    tracerMat.dispose();
  };

  return { group, errors, stepTracers, dispose };
}
