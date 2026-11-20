import * as THREE from 'three';
import type { OdeSystemConfig, Vec3 } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';
import { compileMathExpr, evalSafe } from './evaluator';

export interface OdePreset {
  id: string;
  name: string;
  description: string;
  config: Omit<OdeSystemConfig, 'presetId' | 'colormap'>;
}

export const ODE_PRESETS: OdePreset[] = [
  {
    id: 'lorenz',
    name: 'Lorenz Attractor',
    description: 'Classic chaotic atmospheric convection butterfly system',
    config: {
      dxExpr: 'sigma * (y - x)',
      dyExpr: 'x * (rho - z) - y',
      dzExpr: 'x * y - beta * z',
      params: { sigma: 10, rho: 28, beta: 2.6667 },
      initialState: [1, 1, 1],
      dt: 0.008,
      steps: 2600,
      bundleCount: 3,
      perturbation: 0.04,
      scale: 0.09,
    },
  },
  {
    id: 'rossler',
    name: 'Rössler Attractor',
    description: 'Spiral chaotic attractor with folding reinjection band',
    config: {
      dxExpr: '-y - z',
      dyExpr: 'x + a * y',
      dzExpr: 'b + z * (x - c)',
      params: { a: 0.2, b: 0.2, c: 5.7 },
      initialState: [0.1, 0.1, 0.1],
      dt: 0.02,
      steps: 2800,
      bundleCount: 2,
      perturbation: 0.05,
      scale: 0.18,
    },
  },
  {
    id: 'aizawa',
    name: 'Aizawa Attractor',
    description: 'Toroidal sphere-like strange attractor',
    config: {
      dxExpr: '(z - b) * x - d * y',
      dyExpr: 'd * x + (z - b) * y',
      dzExpr: 'c + a * z - (z^3)/3 - (x^2 + y^2) * (1 + e * z) + f * z * (x^3)',
      params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
      initialState: [0.1, 0, 0],
      dt: 0.012,
      steps: 3200,
      bundleCount: 2,
      perturbation: 0.02,
      scale: 1.65,
    },
  },
  {
    id: 'thomas',
    name: 'Thomas Cyclically Symmetric',
    description: 'Dissipative 3D lattice-like strange attractor',
    config: {
      dxExpr: 'sin(y) - b * x',
      dyExpr: 'sin(z) - b * y',
      dzExpr: 'sin(x) - b * z',
      params: { b: 0.19 },
      initialState: [0.1, 0.4, -0.3],
      dt: 0.06,
      steps: 3000,
      bundleCount: 3,
      perturbation: 0.05,
      scale: 0.72,
    },
  },
  {
    id: 'halvorsen',
    name: 'Halvorsen Attractor',
    description: 'Symmetric three-wing chaotic attractor',
    config: {
      dxExpr: '-a * x - 4 * y - 4 * z - y^2',
      dyExpr: '-a * y - 4 * z - 4 * x - z^2',
      dzExpr: '-a * z - 4 * x - 4 * y - x^2',
      params: { a: 1.4 },
      initialState: [-1.48, -1.51, 2.04],
      dt: 0.005,
      steps: 2800,
      bundleCount: 2,
      perturbation: 0.03,
      scale: 0.24,
    },
  },
];

export function createDefaultOdeConfig(): OdeSystemConfig {
  const p = ODE_PRESETS[0];
  return {
    presetId: p.id,
    ...p.config,
    params: { ...p.config.params },
    initialState: [...p.config.initialState],
    colormap: 'harboria',
  };
}

export interface OdeTrajectoryData {
  points: Float32Array;
  colors: Float32Array;
  rawStates: Vec3[];
}

export interface OdeSolveResult {
  trajectories: OdeTrajectoryData[];
  errors: string[];
  centerOffset: Vec3;
}

export function solveOdeSystem(config: OdeSystemConfig): OdeSolveResult {
  const errors: string[] = [];
  const cdx = compileMathExpr(config.dxExpr);
  const cdy = compileMathExpr(config.dyExpr);
  const cdz = compileMathExpr(config.dzExpr);

  if (!cdx.ok) errors.push(`dx/dt: ${cdx.error}`);
  if (!cdy.ok) errors.push(`dy/dt: ${cdy.error}`);
  if (!cdz.ok) errors.push(`dz/dt: ${cdz.error}`);

  if (!cdx.ok || !cdy.ok || !cdz.ok) {
    return { trajectories: [], errors, centerOffset: [0, 0, 0] };
  }

  const steps = Math.max(100, Math.min(6000, Math.round(config.steps)));
  const dt = Math.max(0.0005, Math.min(0.2, config.dt));
  const bundleCount = Math.max(1, Math.min(6, Math.round(config.bundleCount)));
  const s = config.scale || 1;
  const baseScope: Record<string, number> = {
    pi: Math.PI,
    e: Math.E,
    ...config.params,
    x: 0,
    y: 0,
    z: 0,
  };

  const deriv = (state: Vec3): Vec3 => {
    baseScope.x = state[0];
    baseScope.y = state[1];
    baseScope.z = state[2];
    return [
      evalSafe(cdx.fn, baseScope, 0, 1e5),
      evalSafe(cdy.fn, baseScope, 0, 1e5),
      evalSafe(cdz.fn, baseScope, 0, 1e5),
    ];
  };

  const trajectoriesRaw: Vec3[][] = [];
  let sumX = 0, sumY = 0, sumZ = 0, totalPts = 0;

  for (let b = 0; b < bundleCount; b++) {
    const offset = (b - (bundleCount - 1) / 2) * config.perturbation;
    let state: Vec3 = [
      config.initialState[0] + offset,
      config.initialState[1] - offset * 0.5,
      config.initialState[2] + offset * 0.25,
    ];
    const pts: Vec3[] = [state];
    for (let i = 0; i < steps; i++) {
      const k1 = deriv(state);
      const s2: Vec3 = [
        state[0] + 0.5 * dt * k1[0],
        state[1] + 0.5 * dt * k1[1],
        state[2] + 0.5 * dt * k1[2],
      ];
      const k2 = deriv(s2);
      const s3: Vec3 = [
        state[0] + 0.5 * dt * k2[0],
        state[1] + 0.5 * dt * k2[1],
        state[2] + 0.5 * dt * k2[2],
      ];
      const k3 = deriv(s3);
      const s4: Vec3 = [
        state[0] + dt * k3[0],
        state[1] + dt * k3[1],
        state[2] + dt * k3[2],
      ];
      const k4 = deriv(s4);

      const next: Vec3 = [
        clampFinite(state[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])),
        clampFinite(state[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])),
        clampFinite(state[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])),
      ];
      pts.push(next);
      state = next;

      sumX += next[0] * s;
      sumY += next[2] * s; // swap Z up to Y for nicely oriented visualization
      sumZ += next[1] * s;
      totalPts++;
    }
    trajectoriesRaw.push(pts);
  }

  const cx = totalPts > 0 ? sumX / totalPts : 0;
  const cy = totalPts > 0 ? sumY / totalPts : 0;
  const cz = totalPts > 0 ? sumZ / totalPts : 0;

  const trajectories: OdeTrajectoryData[] = trajectoriesRaw.map((pts, bIdx) => {
    const arr = new Float32Array(pts.length * 3);
    const col = new Float32Array(pts.length * 3);
    const bundleShift = bundleCount > 1 ? (bIdx / (bundleCount - 1)) * 0.25 : 0;

    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i];
      arr[i * 3] = x * s - cx;
      arr[i * 3 + 1] = z * s - cy + 2.0; // Elevate slightly above ground plane
      arr[i * 3 + 2] = y * s - cz;

      const tCol = ((i / pts.length) * 0.75 + bundleShift) % 1;
      const [r, g, bl] = sampleColormap(config.colormap, tCol);
      col[i * 3] = r;
      col[i * 3 + 1] = g;
      col[i * 3 + 2] = bl;
    }
    return { points: arr, colors: col, rawStates: pts };
  });

  return { trajectories, errors, centerOffset: [cx, cy, cz] };
}

export function buildOdeGroup(solve: OdeSolveResult): {
  group: THREE.Group;
  lines: THREE.Line[];
  heads: THREE.Mesh[];
} {
  const group = new THREE.Group();
  const lines: THREE.Line[] = [];
  const heads: THREE.Mesh[] = [];

  const headGeom = new THREE.SphereGeometry(0.08, 12, 12);

  solve.trajectories.forEach((traj) => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(traj.points, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(traj.colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geom, mat);
    group.add(line);
    lines.push(line);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(traj.points[0] ?? 0, traj.points[1] ?? 2, traj.points[2] ?? 0);
    group.add(head);
    heads.push(head);
  });

  return { group, lines, heads };
}

function clampFinite(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-500, Math.min(500, v));
}
