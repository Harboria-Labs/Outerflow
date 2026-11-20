import * as THREE from 'three';
import type { CadPartConfig } from '../../types/studio';
import { csgIntersect, csgSubtract, csgUnion } from './csg';
import { createParametricGeometry, serializeBufferGeometry } from './parametricGenerators';
import { buildLibraryPartGeometry } from './partsLibrary';

export interface DesignTemplate {
  id: string;
  name: string;
  code: string;
}

export const DESIGN_CODE_TEMPLATES: DesignTemplate[] = [
  {
    id: 'bearingBlock',
    name: 'Machined Bearing Block',
    code: `// Programmable 3D Design DSL (OpenSCAD-style JS)
const block = design.box(2.2, 1.4, 1.6);
const bore = design.rotate(design.cylinder(0.55, 2.2), Math.PI / 2, 0, 0);
const slot = design.translate(design.box(0.55, 0.8, 1.8), 0, -0.4, 0);
const housing = design.subtract(design.subtract(block, bore), slot);
design.add(design.translate(housing, 0, 0.7, 0), { name: 'Bearing Block', color: '#38bdf8' });
`,
  },
  {
    id: 'droneFrame',
    name: 'Quadcopter X-Frame',
    code: `// Parametric Quadcopter Frame + Motors
const hub = design.cylinder(0.65, 0.16);
const armA = design.rotate(design.box(3.4, 0.12, 0.24), 0, Math.PI / 4, 0);
const armB = design.rotate(design.box(3.4, 0.12, 0.24), 0, -Math.PI / 4, 0);
const frame = design.union(hub, design.union(armA, armB));
design.add(design.translate(frame, 0, 0.5, 0), { name: 'Quad Frame', color: '#2680eb' });

const offsets = [[1.15, 1.15], [-1.15, 1.15], [1.15, -1.15], [-1.15, -1.15]];
offsets.forEach(([x, z], idx) => {
  const pod = design.translate(design.cylinder(0.24, 0.34), x, 0.68, z);
  design.add(pod, { name: 'Motor Pod ' + (idx + 1), color: '#f59e0b' });
});
`,
  },
  {
    id: 'coolingArray',
    name: 'Finned Heat Exchanger',
    code: `// Parametric Finned Cooling Block
let plate = design.box(2.4, 0.22, 1.8);
for (let i = -4; i <= 4; i++) {
  const fin = design.translate(design.box(0.08, 0.65, 1.8), i * 0.24, 0.38, 0);
  plate = design.union(plate, fin);
}
design.add(design.translate(plate, 0, 0.45, 0), { name: 'Heat Exchanger', color: '#94a3b8' });
`,
  },
  {
    id: 'servoTurret',
    name: 'Servo Pan-Tilt Assembly',
    code: `// Assemble Library Parts Programmatically
const base = design.translate(design.library('chassis-plate'), 0, 0.1, 0);
const servo = design.translate(design.library('servo-motor'), 0, 0.55, 0);
const lidar = design.translate(design.library('lidar-turret'), 0, 1.25, 0);
design.add(base, { name: 'Turret Deck', color: '#1e293b' });
design.add(servo, { name: 'Pan Servo', color: '#2563eb' });
design.add(lidar, { name: 'LiDAR Head', color: '#22d3ee' });
`,
  },
];

export interface DesignCompileResult {
  ok: boolean;
  error?: string;
  parts: CadPartConfig[];
}

export function executeDesignCode(code: string): DesignCompileResult {
  const parts: CadPartConfig[] = [];
  let count = 0;

  const design = {
    box(w = 1, h = 1, d = 1): THREE.BufferGeometry {
      return new THREE.BoxGeometry(Math.max(0.05, w), Math.max(0.05, h), Math.max(0.05, d));
    },
    sphere(r = 0.5, segs = 22): THREE.BufferGeometry {
      return new THREE.SphereGeometry(Math.max(0.05, r), segs, segs);
    },
    cylinder(r = 0.5, h = 1, segs = 24): THREE.BufferGeometry {
      return new THREE.CylinderGeometry(Math.max(0.05, r), Math.max(0.05, r), Math.max(0.05, h), segs);
    },
    cone(r = 0.5, h = 1, segs = 24): THREE.BufferGeometry {
      return new THREE.ConeGeometry(Math.max(0.05, r), Math.max(0.05, h), segs);
    },
    gear(teeth = 16, radius = 1, thickness = 0.35): THREE.BufferGeometry {
      return createParametricGeometry({
        id: 'dsl-gear',
        name: 'Gear',
        kind: 'gear',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        color: '#ffffff',
        visible: true,
        width: radius * 2,
        height: thickness,
        depth: radius * 2,
        outerRadius: radius,
        innerRadius: radius * 0.3,
        bevel: 0.02,
        segments: 24,
        teeth,
        holeRadius: radius * 0.25,
        sides: 6,
        latheCurve: 'nozzle',
      });
    },
    pipe(outerR = 0.8, innerR = 0.45, h = 1.2): THREE.BufferGeometry {
      return createParametricGeometry({
        id: 'dsl-pipe',
        name: 'Pipe',
        kind: 'pipe',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        color: '#ffffff',
        visible: true,
        width: outerR * 2,
        height: h,
        depth: outerR * 2,
        outerRadius: outerR,
        innerRadius: innerR,
        bevel: 0.02,
        segments: 24,
        teeth: 12,
        holeRadius: innerR,
        sides: 6,
        latheCurve: 'nozzle',
      });
    },
    library(partId: string): THREE.BufferGeometry {
      return buildLibraryPartGeometry(partId);
    },
    translate(geom: THREE.BufferGeometry, x = 0, y = 0, z = 0): THREE.BufferGeometry {
      const g = geom.clone();
      g.translate(x, y, z);
      return g;
    },
    rotate(geom: THREE.BufferGeometry, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry {
      const g = geom.clone();
      if (rx) g.rotateX(rx);
      if (ry) g.rotateY(ry);
      if (rz) g.rotateZ(rz);
      return g;
    },
    scale(geom: THREE.BufferGeometry, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
      const g = geom.clone();
      g.scale(sx, sy, sz);
      return g;
    },
    union(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgUnion(a, undefined, b, undefined);
    },
    subtract(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgSubtract(a, undefined, b, undefined);
    },
    intersect(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgIntersect(a, undefined, b, undefined);
    },
    add(
      geom: THREE.BufferGeometry,
      opts: { name?: string; color?: string } = {}
    ): void {
      count++;
      const g = geom.clone();
      g.computeBoundingBox();
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      g.boundingBox?.getCenter(center);
      g.boundingBox?.getSize(size);
      g.translate(-center.x, -center.y, -center.z);
      const serialized = serializeBufferGeometry(g);
      g.dispose();

      parts.push({
        id: `cad-dsl-${Date.now()}-${count}`,
        name: opts.name || `Coded Part ${count}`,
        kind: 'box',
        position: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        color: opts.color || '#38bdf8',
        visible: true,
        locked: false,
        width: size.x,
        height: size.y,
        depth: size.z,
        outerRadius: Math.max(size.x, size.z) * 0.5,
        innerRadius: 0.25,
        bevel: 0.02,
        segments: 24,
        teeth: 16,
        holeRadius: 0.25,
        sides: 6,
        latheCurve: 'nozzle',
        csgMesh: serialized,
      });
    },
  };

  try {
    const fn = new Function('design', 'Math', code);
    fn(design, Math);
    return { ok: true, parts };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      parts,
    };
  }
}
