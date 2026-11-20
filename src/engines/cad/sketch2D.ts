import * as THREE from 'three';

export interface Sketch2DPreset {
  id: string;
  name: string;
  mode: 'extrude' | 'lathe';
  depth: number;
  points: [number, number][];
}

export const SKETCH_2D_PRESETS: Sketch2DPreset[] = [
  {
    id: 'airfoil',
    name: 'Airfoil Wing Section',
    mode: 'extrude',
    depth: 2.2,
    points: [
      [-1.0, 0.0],
      [-0.75, 0.22],
      [-0.25, 0.28],
      [0.45, 0.16],
      [1.0, 0.02],
      [0.45, -0.06],
      [-0.35, -0.08],
      [-0.85, -0.06],
    ],
  },
  {
    id: 'tSlot',
    name: 'T-Slot Structural Profile',
    mode: 'extrude',
    depth: 2.0,
    points: [
      [-0.6, -0.6],
      [0.6, -0.6],
      [0.6, -0.2],
      [0.22, -0.2],
      [0.22, 0.2],
      [0.6, 0.2],
      [0.6, 0.6],
      [-0.6, 0.6],
      [-0.6, 0.2],
      [-0.22, 0.2],
      [-0.22, -0.2],
      [-0.6, -0.2],
    ],
  },
  {
    id: 'starFlange',
    name: '6-Point Star Flange',
    mode: 'extrude',
    depth: 0.45,
    points: Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? 1.05 : 0.52;
      return [Number((Math.cos(a) * r).toFixed(3)), Number((Math.sin(a) * r).toFixed(3))] as [
        number,
        number
      ];
    }),
  },
  {
    id: 'lHook',
    name: 'Robotic Mounting Hook',
    mode: 'extrude',
    depth: 0.4,
    points: [
      [-0.7, -0.7],
      [0.7, -0.7],
      [0.7, -0.25],
      [-0.2, -0.25],
      [-0.2, 0.55],
      [0.3, 0.55],
      [0.3, 0.85],
      [-0.7, 0.85],
    ],
  },
  {
    id: 'latheBell',
    name: 'Revolved Rocket Bell',
    mode: 'lathe',
    depth: 1.0,
    points: [
      [0.28, -0.9],
      [0.42, -0.45],
      [0.22, 0.0],
      [0.48, 0.45],
      [0.82, 0.95],
      [0.72, 0.95],
      [0.38, 0.45],
      [0.14, 0.0],
      [0.32, -0.45],
      [0.2, -0.9],
    ],
  },
];

export function buildGeometryFrom2DSketch(
  points: [number, number][],
  mode: 'extrude' | 'lathe',
  depth = 1.0,
  bevel = 0.03
): THREE.BufferGeometry {
  if (points.length < 3) {
    return new THREE.BoxGeometry(0.5, 0.5, 0.5);
  }

  if (mode === 'lathe') {
    const lathePts = points.map(
      ([x, y]) => new THREE.Vector2(Math.max(0.04, Math.abs(x)), y)
    );
    const geom = new THREE.LatheGeometry(lathePts, 36);
    geom.center();
    geom.computeVertexNormals();
    return geom;
  }

  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.08, depth),
    bevelEnabled: bevel > 0.002,
    bevelSize: Math.min(0.08, bevel),
    bevelThickness: Math.min(0.08, bevel),
    bevelSegments: 2,
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

export type BlueprintSegment = [number, number, number, number];

export interface BlueprintProjection {
  width: number;
  height: number;
  depth: number;
  top: BlueprintSegment[];   // (x, z)
  front: BlueprintSegment[]; // (x, y)
  side: BlueprintSegment[];  // (z, y)
}

export function projectGeometryTo2DBlueprint(
  geometry: THREE.BufferGeometry,
  maxEdges = 600
): BlueprintProjection {
  const geom = geometry.clone();
  geom.computeBoundingBox();
  const box = geom.boundingBox ?? new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  geom.translate(-center.x, -center.y, -center.z);

  const edges = new THREE.EdgesGeometry(geom, 14);
  const pos = edges.getAttribute('position');
  const top: BlueprintSegment[] = [];
  const front: BlueprintSegment[] = [];
  const side: BlueprintSegment[] = [];

  const totalEdges = pos ? Math.floor(pos.count / 2) : 0;
  const stride = Math.max(1, Math.ceil(totalEdges / maxEdges));

  for (let i = 0; i < totalEdges; i += stride) {
    const idxA = i * 2;
    const idxB = i * 2 + 1;
    const ax = pos.getX(idxA);
    const ay = pos.getY(idxA);
    const az = pos.getZ(idxA);
    const bx = pos.getX(idxB);
    const by = pos.getY(idxB);
    const bz = pos.getZ(idxB);

    top.push([ax, az, bx, bz]);
    front.push([ax, -ay, bx, -by]); // SVG Y grows downward
    side.push([az, -ay, bz, -by]);
  }

  edges.dispose();
  geom.dispose();

  return {
    width: Number(size.x.toFixed(3)),
    height: Number(size.y.toFixed(3)),
    depth: Number(size.z.toFixed(3)),
    top,
    front,
    side,
  };
}

export function buildBlueprintSVGString(
  proj: BlueprintProjection,
  title = 'Outerflow 2D Engineering Blueprint'
): string {
  const renderPane = (
    segs: BlueprintSegment[],
    cx: number,
    cy: number,
    scale: number,
    label: string
  ) => {
    const lines = segs
      .map(
        ([x1, y1, x2, y2]) =>
          `<line x1="${(cx + x1 * scale).toFixed(1)}" y1="${(cy + y1 * scale).toFixed(
            1
          )}" x2="${(cx + x2 * scale).toFixed(1)}" y2="${(cy + y2 * scale).toFixed(1)}"/>`
      )
      .join('');
    return `<g stroke="#38bdf8" stroke-width="1.2" fill="none">${lines}</g><text x="${cx}" y="${
      cy + 125
    }" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="12">${label}</text>`;
  };

  const maxDim = Math.max(0.5, proj.width, proj.height, proj.depth);
  const scale = 175 / maxDim;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 360" width="960" height="360">
  <rect width="960" height="360" fill="#071324"/>
  <rect x="14" y="14" width="932" height="332" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
  <text x="28" y="38" fill="#e2e8f0" font-family="sans-serif" font-size="14" font-weight="700">${title}</text>
  <text x="932" y="38" text-anchor="end" fill="#38bdf8" font-family="monospace" font-size="11">W ${proj.width}m × H ${proj.height}m × D ${proj.depth}m</text>
  ${renderPane(proj.top, 175, 180, scale, 'TOP VIEW (X / Z)')}
  ${renderPane(proj.front, 480, 180, scale, 'FRONT VIEW (X / Y)')}
  ${renderPane(proj.side, 785, 180, scale, 'SIDE VIEW (Z / Y)')}
</svg>`;
}
