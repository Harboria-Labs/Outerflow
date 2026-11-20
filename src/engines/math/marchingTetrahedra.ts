import * as THREE from 'three';
import type { ImplicitSurfaceConfig } from '../../types/studio';
import { sampleColormap } from '../../utils/colormaps';
import { compileMathExpr, evalSafe } from './evaluator';

export interface ImplicitPreset {
  id: string;
  name: string;
  description: string;
  config: Omit<ImplicitSurfaceConfig, 'presetId' | 'colormap' | 'wireframe'>;
}

export const IMPLICIT_PRESETS: ImplicitPreset[] = [
  {
    id: 'gyroid',
    name: 'Gyroid Minimal Surface',
    description: 'Triply periodic minimal surface (TPMS) lattice',
    config: {
      expr: 'sin(2.1*x)*cos(2.1*y) + sin(2.1*y)*cos(2.1*z) + sin(2.1*z)*cos(2.1*x)',
      bound: 2.6,
      resolution: 28,
      isoLevel: 0,
    },
  },
  {
    id: 'schwarzP',
    name: 'Schwarz-P Lattice',
    description: 'Cubic triply-periodic scaffold for lightweight metamaterials',
    config: {
      expr: 'cos(2.2*x) + cos(2.2*y) + cos(2.2*z)',
      bound: 2.6,
      resolution: 28,
      isoLevel: 0,
    },
  },
  {
    id: 'metaballs',
    name: 'Metaball Triad',
    description: 'Smoothly blended implicit potential shells',
    config: {
      expr: '1/((x-1)^2 + y^2 + z^2 + 0.15) + 1/((x+1)^2 + (y-0.5)^2 + z^2 + 0.15) + 1/(x^2 + (y+0.9)^2 + (z-0.6)^2 + 0.15) - 1.6',
      bound: 2.8,
      resolution: 28,
      isoLevel: 0,
    },
  },
  {
    id: 'genus2',
    name: 'Genus-2 Pretzel Surface',
    description: 'Double-torus algebraic surface',
    config: {
      expr: '((x^2 + y^2)^2 - 1.3*(x^2 - y^2))^2 + z^2 - 0.12',
      bound: 1.9,
      resolution: 30,
      isoLevel: 0,
    },
  },
  {
    id: 'torusSdf',
    name: 'Torus SDF',
    description: 'Signed distance field for a smooth torus',
    config: {
      expr: '(sqrt(x^2 + z^2) - 1.6)^2 + y^2 - 0.36',
      bound: 2.6,
      resolution: 28,
      isoLevel: 0,
    },
  },
];

export function createDefaultImplicitConfig(): ImplicitSurfaceConfig {
  const p = IMPLICIT_PRESETS[0];
  return {
    presetId: p.id,
    ...p.config,
    colormap: 'harboria',
    wireframe: false,
  };
}

// 6 tetrahedra decomposing a unit cube [0..7]
const TETRAHEDRA: [number, number, number, number][] = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];

const CUBE_OFFSETS: [number, number, number][] = [
  [0, 0, 0], // 0
  [1, 0, 0], // 1
  [1, 1, 0], // 2
  [0, 1, 0], // 3
  [0, 0, 1], // 4
  [1, 0, 1], // 5
  [1, 1, 1], // 6
  [0, 1, 1], // 7
];

export interface ImplicitBuildResult {
  geometry: THREE.BufferGeometry;
  error: string | null;
  vertexCount: number;
  triangleCount: number;
}

export function buildImplicitSurface(
  config: ImplicitSurfaceConfig
): ImplicitBuildResult {
  const compiled = compileMathExpr(config.expr);
  if (!compiled.ok) {
    return {
      geometry: new THREE.BufferGeometry(),
      error: compiled.error,
      vertexCount: 0,
      triangleCount: 0,
    };
  }

  const n = Math.max(10, Math.min(42, Math.round(config.resolution)));
  const stride = n + 1;
  const bound = Math.max(0.5, config.bound);
  const step = (2 * bound) / n;
  const iso = config.isoLevel;

  const field = new Float32Array(stride * stride * stride);
  const scope = { x: 0, y: 0, z: 0, pi: Math.PI, e: Math.E };

  const gridIdx = (ix: number, iy: number, iz: number) =>
    (iz * stride + iy) * stride + ix;

  for (let iz = 0; iz <= n; iz++) {
    scope.z = -bound + iz * step;
    for (let iy = 0; iy <= n; iy++) {
      scope.y = -bound + iy * step;
      for (let ix = 0; ix <= n; ix++) {
        scope.x = -bound + ix * step;
        field[gridIdx(ix, iy, iz)] = evalSafe(compiled.fn, scope) - iso;
      }
    }
  }

  const outPositions: number[] = [];
  const outNormals: number[] = [];
  const outColors: number[] = [];

  const gradEps = step * 0.45;
  const evalGradNormal = (px: number, py: number, pz: number): [number, number, number] => {
    const gx =
      evalSafe(compiled.fn, { x: px + gradEps, y: py, z: pz, pi: Math.PI, e: Math.E }) -
      evalSafe(compiled.fn, { x: px - gradEps, y: py, z: pz, pi: Math.PI, e: Math.E });
    const gy =
      evalSafe(compiled.fn, { x: px, y: py + gradEps, z: pz, pi: Math.PI, e: Math.E }) -
      evalSafe(compiled.fn, { x: px, y: py - gradEps, z: pz, pi: Math.PI, e: Math.E });
    const gz =
      evalSafe(compiled.fn, { x: px, y: py, z: pz + gradEps, pi: Math.PI, e: Math.E }) -
      evalSafe(compiled.fn, { x: px, y: py, z: pz - gradEps, pi: Math.PI, e: Math.E });
    const len = Math.hypot(gx, gy, gz);
    if (len < 1e-6) return [0, 1, 0];
    return [gx / len, gy / len, gz / len];
  };

  const interpVertex = (
    p1: [number, number, number],
    p2: [number, number, number],
    v1: number,
    v2: number
  ): [number, number, number] => {
    const denom = v2 - v1;
    const t = Math.abs(denom) < 1e-7 ? 0.5 : Math.max(0, Math.min(1, -v1 / denom));
    return [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1]),
      p1[2] + t * (p2[2] - p1[2]),
    ];
  };

  const emitTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number]
  ) => {
    const na = evalGradNormal(a[0], a[1], a[2]);
    const nb = evalGradNormal(b[0], b[1], b[2]);
    const nc = evalGradNormal(c[0], c[1], c[2]);

    // Ensure winding matches gradient direction so DoubleSide or front-facing lights accurately
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    const dot = cx * na[0] + cy * na[1] + cz * na[2];

    const pts = dot >= 0 ? [a, b, c] : [a, c, b];
    const nrms = dot >= 0 ? [na, nb, nc] : [na, nc, nb];

    for (let k = 0; k < 3; k++) {
      const p = pts[k];
      const nrm = nrms[k];
      outPositions.push(p[0], p[1], p[2]);
      outNormals.push(nrm[0], nrm[1], nrm[2]);
      const tCol = (p[1] + bound) / (2 * bound);
      const [r, g, bl] = sampleColormap(config.colormap, tCol);
      outColors.push(r, g, bl);
    }
  };

  const cubePos: [number, number, number][] = new Array(8);
  const cubeVal = new Float32Array(8);

  for (let iz = 0; iz < n; iz++) {
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        let allPos = true;
        let allNeg = true;
        for (let c = 0; c < 8; c++) {
          const [ox, oy, oz] = CUBE_OFFSETS[c];
          const val = field[gridIdx(ix + ox, iy + oy, iz + oz)];
          cubeVal[c] = val;
          if (val < 0) allPos = false;
          if (val >= 0) allNeg = false;
          cubePos[c] = [
            -bound + (ix + ox) * step,
            -bound + (iy + oy) * step,
            -bound + (iz + oz) * step,
          ];
        }
        if (allPos || allNeg) continue;

        for (const tet of TETRAHEDRA) {
          const inside: number[] = [];
          const outside: number[] = [];
          for (const idx of tet) {
            if (cubeVal[idx] < 0) inside.push(idx);
            else outside.push(idx);
          }

          if (inside.length === 0 || inside.length === 4) continue;

          if (inside.length === 1) {
            const i0 = inside[0];
            const o0 = outside[0], o1 = outside[1], o2 = outside[2];
            emitTri(
              interpVertex(cubePos[i0], cubePos[o0], cubeVal[i0], cubeVal[o0]),
              interpVertex(cubePos[i0], cubePos[o1], cubeVal[i0], cubeVal[o1]),
              interpVertex(cubePos[i0], cubePos[o2], cubeVal[i0], cubeVal[o2])
            );
          } else if (inside.length === 3) {
            const o0 = outside[0];
            const i0 = inside[0], i1 = inside[1], i2 = inside[2];
            emitTri(
              interpVertex(cubePos[o0], cubePos[i0], cubeVal[o0], cubeVal[i0]),
              interpVertex(cubePos[o0], cubePos[i1], cubeVal[o0], cubeVal[i1]),
              interpVertex(cubePos[o0], cubePos[i2], cubeVal[o0], cubeVal[i2])
            );
          } else if (inside.length === 2) {
            const i0 = inside[0], i1 = inside[1];
            const o0 = outside[0], o1 = outside[1];
            const v00 = interpVertex(cubePos[i0], cubePos[o0], cubeVal[i0], cubeVal[o0]);
            const v01 = interpVertex(cubePos[i0], cubePos[o1], cubeVal[i0], cubeVal[o1]);
            const v10 = interpVertex(cubePos[i1], cubePos[o0], cubeVal[i1], cubeVal[o0]);
            const v11 = interpVertex(cubePos[i1], cubePos[o1], cubeVal[i1], cubeVal[o1]);
            emitTri(v00, v01, v11);
            emitTri(v00, v11, v10);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(outNormals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(outColors, 3));
  geometry.computeBoundingSphere();

  const vertexCount = outPositions.length / 3;
  return {
    geometry,
    error: null,
    vertexCount,
    triangleCount: vertexCount / 3,
  };
}
