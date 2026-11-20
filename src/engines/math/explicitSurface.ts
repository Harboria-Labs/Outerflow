import * as THREE from 'three';
import type { ExplicitSurfaceConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';
import { compileMathExpr, evalSafe } from './evaluator';

export interface ExplicitPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<ExplicitSurfaceConfig, 'presetId' | 'colormap' | 'wireframe'>;
}

export const EXPLICIT_PRESETS: ExplicitPreset[] = [
  {
    id: 'interference',
    name: 'Dual-Source Interference',
    description: 'Two coherent radial wave emitters interfering in space-time',
    config: {
      expr: '0.55 * sin(2.8 * sqrt((x - 1.6)^2 + y^2) - 3.2 * t) + 0.55 * sin(2.8 * sqrt((x + 1.6)^2 + y^2) - 3.2 * t)',
      xMin: -4.5,
      xMax: 4.5,
      yMin: -4.5,
      yMax: 4.5,
      resolution: 88,
      animate: true,
      speed: 1,
    },
  },
  {
    id: 'standing',
    name: 'Standing Membrane Mode',
    description: '2D eigenmode vibration on a rectangular domain',
    config: {
      expr: '1.25 * sin(x * 1.1) * cos(y * 1.1) * cos(2.6 * t)',
      xMin: -4.2,
      xMax: 4.2,
      yMin: -4.2,
      yMax: 4.2,
      resolution: 76,
      animate: true,
      speed: 1,
    },
  },
  {
    id: 'mexicanHat',
    name: 'Mexican-Hat Potential',
    description: 'Symmetry-breaking Higgs-like radial potential modulated in time',
    config: {
      expr: '0.32 * (x^2 + y^2 - 5.0)^2 * 0.18 - 0.5 + 0.25 * cos(2.5 * t) * sin(sqrt(x^2 + y^2) * 1.4)',
      xMin: -3.2,
      xMax: 3.2,
      yMin: -3.2,
      yMax: 3.2,
      resolution: 76,
      animate: true,
      speed: 1,
    },
  },
  {
    id: 'sincRipple',
    name: 'Rippling Sinc Wave',
    description: 'Damped radial Bessel-like pulse packet',
    config: {
      expr: '1.7 * sin(2.4 * sqrt(x^2 + y^2) - 3.0 * t) / (1 + 0.45 * (x^2 + y^2))',
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
      resolution: 88,
      animate: true,
      speed: 1,
    },
  },
];

export function createDefaultExplicitConfig(): ExplicitSurfaceConfig {
  const p = EXPLICIT_PRESETS[0];
  return {
    presetId: p.id,
    ...p.config,
    colormap: 'harboria',
    wireframe: false,
  };
}

export interface ExplicitBuildResult {
  geometry: THREE.BufferGeometry;
  error: string | null;
  vertexCount: number;
  triangleCount: number;
}

export function buildExplicitSurface(
  config: ExplicitSurfaceConfig,
  t = 0
): ExplicitBuildResult {
  const compiled = compileMathExpr(config.expr);
  if (!compiled.ok) {
    return {
      geometry: new THREE.BufferGeometry(),
      error: compiled.error,
      vertexCount: 0,
      triangleCount: 0,
    };
  }

  const res = Math.max(8, Math.min(140, Math.round(config.resolution)));
  const cols = res + 1;
  const rows = res + 1;
  const vertexCount = cols * rows;

  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  for (let j = 0; j < rows; j++) {
    const fy = j / res;
    const y = config.yMin + (config.yMax - config.yMin) * fy;
    for (let i = 0; i < cols; i++) {
      const fx = i / res;
      const x = config.xMin + (config.xMax - config.xMin) * fx;
      const idx = j * cols + i;
      // Map math (x, y, z(x,y)) -> Three.js (X=x, Y=z(x,y), Z=y) so height is Y-up
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = y;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const a = j * cols + i;
      const b = j * cols + (i + 1);
      const c = (j + 1) * cols + (i + 1);
      const d = (j + 1) * cols + i;
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  updateExplicitSurface(geometry, config, t);

  return {
    geometry,
    error: null,
    vertexCount,
    triangleCount: indices.length / 3,
  };
}

export function updateExplicitSurface(
  geometry: THREE.BufferGeometry,
  config: ExplicitSurfaceConfig,
  t: number
): string | null {
  const compiled = compileMathExpr(config.expr);
  if (!compiled.ok) return compiled.error;

  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!posAttr || !colAttr) return null;

  const positions = posAttr.array as Float32Array;
  const colors = colAttr.array as Float32Array;
  const count = posAttr.count;

  let minH = Infinity;
  let maxH = -Infinity;
  const scope = { x: 0, y: 0, t, pi: Math.PI, e: Math.E };

  for (let i = 0; i < count; i++) {
    scope.x = positions[i * 3];
    scope.y = positions[i * 3 + 2];
    const h = evalSafe(compiled.fn, scope);
    positions[i * 3 + 1] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }

  const span = Math.max(1e-5, maxH - minH);
  for (let i = 0; i < count; i++) {
    const norm = (positions[i * 3 + 1] - minH) / span;
    const [r, g, b] = sampleColormap(config.colormap, norm);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  return null;
}
