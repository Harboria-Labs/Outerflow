import * as THREE from 'three';
import type { CadPartConfig, CadPrimitiveKind, SerializedMeshData } from '../../types/studio';

export function createDefaultCadParts(): CadPartConfig[] {
  return [
    {
      id: 'cad-gear-1',
      name: 'Spur Gear Primary',
      kind: 'gear',
      position: [0, 1.0, 0],
      rotation: [Math.PI / 2, 0, 0],
      color: '#38bdf8',
      visible: true,
      width: 1.6,
      height: 0.45,
      depth: 1.6,
      outerRadius: 1.35,
      innerRadius: 0.35,
      bevel: 0.04,
      segments: 32,
      teeth: 16,
      holeRadius: 0.35,
      sides: 6,
      latheCurve: 'nozzle',
    },
    {
      id: 'cad-bracket-1',
      name: 'Mounting Bracket',
      kind: 'bracket',
      position: [-2.4, 0.9, 0],
      rotation: [0, 0, 0],
      color: '#f59e0b',
      visible: true,
      width: 2.2,
      height: 1.8,
      depth: 0.35,
      outerRadius: 1.0,
      innerRadius: 0.45,
      bevel: 0.04,
      segments: 24,
      teeth: 12,
      holeRadius: 0.24,
      sides: 6,
      latheCurve: 'nozzle',
    },
    {
      id: 'cad-nozzle-1',
      name: 'De Laval Nozzle',
      kind: 'lathe',
      position: [2.5, 0.0, 0],
      rotation: [0, 0, 0],
      color: '#a78bfa',
      visible: true,
      width: 1.2,
      height: 2.2,
      depth: 1.2,
      outerRadius: 0.95,
      innerRadius: 0.45,
      bevel: 0.03,
      segments: 36,
      teeth: 12,
      holeRadius: 0.25,
      sides: 6,
      latheCurve: 'nozzle',
    },
  ];
}

export function createCadPartTemplate(kind: CadPrimitiveKind, index: number): CadPartConfig {
  const palette: Record<CadPrimitiveKind, string> = {
    box: '#38bdf8',
    cylinder: '#34d399',
    pipe: '#60a5fa',
    gear: '#22d3ee',
    bracket: '#f59e0b',
    lathe: '#a78bfa',
    polygon: '#fb7185',
  };
  const labelMap: Record<CadPrimitiveKind, string> = {
    box: 'Block',
    cylinder: 'Cylinder',
    pipe: 'Hollow Pipe',
    gear: 'Spur Gear',
    bracket: 'L-Bracket',
    lathe: 'Revolved Shell',
    polygon: 'Hex Prism',
  };

  return {
    id: `cad-${kind}-${Date.now()}-${index}`,
    name: `${labelMap[kind]} ${index}`,
    kind,
    position: [0, 1.1, 0],
    rotation: kind === 'gear' ? [Math.PI / 2, 0, 0] : [0, 0, 0],
    color: palette[kind],
    visible: true,
    width: 1.6,
    height: 1.2,
    depth: 1.2,
    outerRadius: 1.0,
    innerRadius: 0.55,
    bevel: 0.04,
    segments: 32,
    teeth: 14,
    holeRadius: 0.28,
    sides: 6,
    latheCurve: 'nozzle',
  };
}

export function createParametricGeometry(part: CadPartConfig): THREE.BufferGeometry {
  if (part.csgMesh) {
    return deserializeMeshData(part.csgMesh);
  }

  const segs = Math.max(8, Math.min(96, Math.round(part.segments)));
  const bevel = Math.max(0, Math.min(0.25, part.bevel));

  switch (part.kind) {
    case 'box': {
      const w = Math.max(0.1, part.width);
      const h = Math.max(0.1, part.height);
      const d = Math.max(0.1, part.depth);
      const shape = new THREE.Shape();
      const hw = Math.max(0.05, w / 2 - bevel);
      const hd = Math.max(0.05, d / 2 - bevel);
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.05, h - bevel * 2),
        bevelEnabled: bevel > 0.002,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 2,
      });
      geom.center();
      geom.computeVertexNormals();
      return geom;
    }

    case 'cylinder': {
      const r = Math.max(0.1, part.outerRadius);
      const h = Math.max(0.1, part.height);
      return new THREE.CylinderGeometry(r, r, h, segs);
    }

    case 'pipe': {
      const rOut = Math.max(0.2, part.outerRadius);
      const rIn = Math.max(0.05, Math.min(rOut - 0.05, part.innerRadius));
      const h = Math.max(0.1, part.height);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: bevel > 0.002,
        bevelSize: Math.min(bevel, (rOut - rIn) * 0.25),
        bevelThickness: Math.min(bevel, h * 0.15),
        bevelSegments: 2,
        curveSegments: segs,
      });
      geom.rotateX(Math.PI / 2);
      geom.center();
      geom.computeVertexNormals();
      return geom;
    }

    case 'gear': {
      const teeth = Math.max(6, Math.min(48, Math.round(part.teeth)));
      const outerR = Math.max(0.3, part.outerRadius);
      const rootR = outerR * 0.78;
      const boreR = Math.max(0.04, Math.min(rootR * 0.75, part.holeRadius));
      const thick = Math.max(0.08, part.height);

      const shape = new THREE.Shape();
      const step = (Math.PI * 2) / teeth;

      for (let i = 0; i < teeth; i++) {
        const a0 = i * step;
        const a1 = a0 + step * 0.22;
        const a2 = a0 + step * 0.34;
        const a3 = a0 + step * 0.62;
        const a4 = a0 + step * 0.74;

        const p0x = Math.cos(a0) * rootR;
        const p0y = Math.sin(a0) * rootR;
        if (i === 0) shape.moveTo(p0x, p0y);
        else shape.lineTo(p0x, p0y);

        shape.lineTo(Math.cos(a1) * rootR, Math.sin(a1) * rootR);
        shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
        shape.lineTo(Math.cos(a3) * outerR, Math.sin(a3) * outerR);
        shape.lineTo(Math.cos(a4) * rootR, Math.sin(a4) * rootR);
      }
      shape.closePath();

      const hole = new THREE.Path();
      hole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: thick,
        bevelEnabled: bevel > 0.002,
        bevelSize: Math.min(bevel, outerR * 0.04),
        bevelThickness: Math.min(bevel, thick * 0.2),
        bevelSegments: 2,
      });
      geom.center();
      geom.computeVertexNormals();
      return geom;
    }

    case 'bracket': {
      const w = Math.max(0.6, part.width);
      const h = Math.max(0.6, part.height);
      const t = Math.max(0.12, Math.min(w * 0.38, h * 0.38, part.depth));
      const holeR = Math.max(0.04, Math.min(t * 0.6, part.holeRadius));

      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, t);
      shape.lineTo(t, t);
      shape.lineTo(t, h);
      shape.lineTo(0, h);
      shape.closePath();

      // Two mounting bolt holes on the horizontal leg and vertical leg
      if (w - t > holeR * 2.5) {
        const h1 = new THREE.Path();
        h1.absarc(w - (w - t) * 0.45, t * 0.5, holeR * 0.65, 0, Math.PI * 2, true);
        shape.holes.push(h1);
      }
      if (h - t > holeR * 2.5) {
        const h2 = new THREE.Path();
        h2.absarc(t * 0.5, h - (h - t) * 0.45, holeR * 0.65, 0, Math.PI * 2, true);
        shape.holes.push(h2);
      }

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.15, part.outerRadius),
        bevelEnabled: bevel > 0.002,
        bevelSize: Math.min(bevel, 0.05),
        bevelThickness: Math.min(bevel, 0.05),
        bevelSegments: 2,
      });
      geom.center();
      geom.computeVertexNormals();
      return geom;
    }

    case 'lathe': {
      const r = Math.max(0.25, part.outerRadius);
      const h = Math.max(0.4, part.height);
      const pts: THREE.Vector2[] = [];
      const steps = 20;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = t * h;
        let rad = r;
        if (part.latheCurve === 'nozzle') {
          // Convergent-divergent De Laval contour
          const throat = 0.42;
          const profile = 0.45 + 0.55 * Math.pow((t - throat) / 0.58, 2);
          rad = r * Math.min(1.15, profile);
        } else if (part.latheCurve === 'bell') {
          rad = r * (0.28 + 0.72 * Math.sin(t * Math.PI * 0.5));
        } else if (part.latheCurve === 'hourglass') {
          rad = r * (0.35 + 0.65 * Math.pow(2 * t - 1, 2));
        } else {
          rad = r * (0.3 + 0.7 * t);
        }
        pts.push(new THREE.Vector2(Math.max(0.05, rad), y));
      }
      // Inner thickness lip for hollow shell
      const wall = Math.max(0.05, r * 0.14);
      for (let i = steps; i >= 0; i--) {
        const outerPt = pts[i];
        pts.push(new THREE.Vector2(Math.max(0.02, outerPt.x - wall), outerPt.y));
      }

      const geom = new THREE.LatheGeometry(pts, segs);
      geom.computeVertexNormals();
      return geom;
    }

    case 'polygon': {
      const sides = Math.max(3, Math.min(16, Math.round(part.sides)));
      const r = Math.max(0.15, part.outerRadius);
      const h = Math.max(0.1, part.height);
      const shape = new THREE.Shape();
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();

      if (part.holeRadius > 0.04 && part.holeRadius < r * 0.75) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, part.holeRadius, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }

      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: bevel > 0.002,
        bevelSize: Math.min(bevel, r * 0.1),
        bevelThickness: Math.min(bevel, h * 0.15),
        bevelSegments: 2,
      });
      geom.rotateX(Math.PI / 2);
      geom.center();
      geom.computeVertexNormals();
      return geom;
    }
  }
}

export function serializeBufferGeometry(geometry: THREE.BufferGeometry): SerializedMeshData {
  const nonIdx = geometry.index ? geometry : geometry;
  const posAttr = nonIdx.getAttribute('position');
  let nrmAttr = nonIdx.getAttribute('normal');
  if (!nrmAttr) {
    nonIdx.computeVertexNormals();
    nrmAttr = nonIdx.getAttribute('normal');
  }
  const indexAttr = nonIdx.getIndex();
  const colorAttr = nonIdx.getAttribute('color');

  return {
    positions: Array.from(posAttr.array as Float32Array),
    normals: nrmAttr ? Array.from(nrmAttr.array as Float32Array) : [],
    indices: indexAttr ? Array.from(indexAttr.array as Uint16Array | Uint32Array) : undefined,
    colors: colorAttr
      ? Array.from(colorAttr.array as Float32Array).map((n) => Number(n.toFixed(4)))
      : undefined,
  };
}

export function deserializeMeshData(data: SerializedMeshData): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  if (data.normals && data.normals.length === data.positions.length) {
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  } else {
    geom.computeVertexNormals();
  }
  if (data.colors && data.colors.length === data.positions.length) {
    geom.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  }
  if (data.indices && data.indices.length > 0) {
    geom.setIndex(data.indices);
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}
