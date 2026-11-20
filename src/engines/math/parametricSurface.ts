import * as THREE from 'three';
import type { ParametricSurfaceConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';
import { compileMathExpr, evalSafe } from './evaluator';

export interface ParametricPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<ParametricSurfaceConfig, 'presetId' | 'colormap' | 'wireframe'>;
}

export const PARAMETRIC_PRESETS: ParametricPreset[] = [
  {
    id: 'mobius',
    name: 'Möbius Strip',
    description: 'Non-orientable ruled surface with half-twist',
    config: {
      xExpr: '(1 + 0.45 * v * cos(u / 2)) * cos(u)',
      yExpr: '0.45 * v * sin(u / 2)',
      zExpr: '(1 + 0.45 * v * cos(u / 2)) * sin(u)',
      uMin: 0,
      uMax: 6.283185,
      vMin: -1,
      vMax: 1,
      uSteps: 96,
      vSteps: 24,
      scale: 2.0,
    },
  },
  {
    id: 'klein',
    name: 'Klein Bottle (Figure-8)',
    description: 'Closed non-orientable immersion in R³',
    config: {
      xExpr: '(2.2 + cos(u / 2) * sin(v) - sin(u / 2) * sin(2 * v)) * cos(u)',
      yExpr: 'sin(u / 2) * sin(v) + cos(u / 2) * sin(2 * v)',
      zExpr: '(2.2 + cos(u / 2) * sin(v) - sin(u / 2) * sin(2 * v)) * sin(u)',
      uMin: 0,
      uMax: 6.283185,
      vMin: 0,
      vMax: 6.283185,
      uSteps: 90,
      vSteps: 48,
      scale: 0.9,
    },
  },
  {
    id: 'enneper',
    name: 'Enneper Minimal Surface',
    description: 'Zero mean curvature self-intersecting minimal surface',
    config: {
      xExpr: 'u - (u^3)/3 + u * (v^2)',
      yExpr: 'u^2 - v^2',
      zExpr: 'v - (v^3)/3 + v * (u^2)',
      uMin: -1.4,
      uMax: 1.4,
      vMin: -1.4,
      vMax: 1.4,
      uSteps: 72,
      vSteps: 72,
      scale: 0.85,
    },
  },
  {
    id: 'torusKnot',
    name: 'Torus Knot Tube',
    description: '(3, 5) trefoil-family knotted tube',
    config: {
      xExpr: '(2 + 0.7 * cos(5*u)) * cos(3*u) + 0.35 * cos(v) * cos(3*u)',
      yExpr: '0.7 * sin(5*u) + 0.35 * sin(v)',
      zExpr: '(2 + 0.7 * cos(5*u)) * sin(3*u) + 0.35 * cos(v) * sin(3*u)',
      uMin: 0,
      uMax: 6.283185,
      vMin: 0,
      vMax: 6.283185,
      uSteps: 160,
      vSteps: 28,
      scale: 0.85,
    },
  },
  {
    id: 'saddle',
    name: 'Hyperbolic Paraboloid',
    description: 'Doubly-ruled saddle shell',
    config: {
      xExpr: 'u',
      yExpr: '0.45 * (u^2 - v^2)',
      zExpr: 'v',
      uMin: -2,
      uMax: 2,
      vMin: -2,
      vMax: 2,
      uSteps: 64,
      vSteps: 64,
      scale: 1.1,
    },
  },
  {
    id: 'seashell',
    name: 'Logarithmic Seashell',
    description: 'Helicospiral bio-inspired shell geometry',
    config: {
      xExpr: '0.16 * exp(0.18 * u) * (1 + cos(v)) * cos(u)',
      yExpr: '0.24 * exp(0.18 * u) * sin(v) - 0.14 * exp(0.18 * u)',
      zExpr: '0.16 * exp(0.18 * u) * (1 + cos(v)) * sin(u)',
      uMin: -6,
      uMax: 10,
      vMin: 0,
      vMax: 6.283185,
      uSteps: 120,
      vSteps: 36,
      scale: 1.15,
    },
  },
];

export function createDefaultParametricConfig(): ParametricSurfaceConfig {
  const p = PARAMETRIC_PRESETS[0];
  return {
    presetId: p.id,
    ...p.config,
    colormap: 'harboria',
    wireframe: false,
  };
}

export interface ParametricBuildResult {
  geometry: THREE.BufferGeometry;
  errors: string[];
  vertexCount: number;
  triangleCount: number;
}

export function buildParametricSurface(
  config: ParametricSurfaceConfig
): ParametricBuildResult {
  const errors: string[] = [];
  const cx = compileMathExpr(config.xExpr);
  const cy = compileMathExpr(config.yExpr);
  const cz = compileMathExpr(config.zExpr);

  if (!cx.ok) errors.push(`x(u,v): ${cx.error}`);
  if (!cy.ok) errors.push(`y(u,v): ${cy.error}`);
  if (!cz.ok) errors.push(`z(u,v): ${cz.error}`);

  const uSteps = Math.max(4, Math.min(220, Math.round(config.uSteps)));
  const vSteps = Math.max(4, Math.min(220, Math.round(config.vSteps)));

  if (!cx.ok || !cy.ok || !cz.ok) {
    return {
      geometry: new THREE.BufferGeometry(),
      errors,
      vertexCount: 0,
      triangleCount: 0,
    };
  }

  const cols = uSteps + 1;
  const rows = vSteps + 1;
  const vertexCount = cols * rows;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let minY = Infinity;
  let maxY = -Infinity;
  const scope = { u: 0, v: 0, pi: Math.PI, e: Math.E };
  const s = config.scale || 1;

  for (let j = 0; j < rows; j++) {
    const vFrac = j / vSteps;
    const v = config.vMin + (config.vMax - config.vMin) * vFrac;
    scope.v = v;

    for (let i = 0; i < cols; i++) {
      const uFrac = i / uSteps;
      const u = config.uMin + (config.uMax - config.uMin) * uFrac;
      scope.u = u;

      const idx = j * cols + i;
      const x = evalSafe(cx.fn, scope) * s;
      const y = evalSafe(cy.fn, scope) * s;
      const z = evalSafe(cz.fn, scope) * s;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      uvs[idx * 2] = uFrac;
      uvs[idx * 2 + 1] = vFrac;

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const spanY = Math.max(1e-5, maxY - minY);
  for (let idx = 0; idx < vertexCount; idx++) {
    const y = positions[idx * 3 + 1];
    const t = (y - minY) / spanY;
    const [r, g, b] = sampleColormap(config.colormap, t);
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }

  const indices: number[] = [];
  for (let j = 0; j < vSteps; j++) {
    for (let i = 0; i < uSteps; i++) {
      const a = j * cols + i;
      const b = j * cols + (i + 1);
      const c = (j + 1) * cols + (i + 1);
      const d = (j + 1) * cols + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return {
    geometry,
    errors,
    vertexCount,
    triangleCount: indices.length / 3,
  };
}
