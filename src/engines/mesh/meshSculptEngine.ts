import * as THREE from 'three';
import type {
  MeshSculptConfig,
  SculptBasePreset,
  SerializedMeshData,
} from '../../types/studio';
import { serializeBufferGeometry } from '../cad/parametricGenerators';

export function createDefaultMeshSculptConfig(): MeshSculptConfig {
  return {
    basePreset: 'humanHead',
    brush: 'pull',
    radius: 0.48,
    strength: 0.35,
    symmetryX: true,
    twist: 0,
    taper: 0,
    noise: 0,
  };
}

/**
 * Welds coincident vertices into a watertight indexed BufferGeometry so
 * sculpting brushes never tear cracks across triangle boundaries.
 */
function weldGeometryVertices(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const posAttr = src.getAttribute('position');
  const idxAttr = src.getIndex();

  const vertMap = new Map<string, number>();
  const uniquePositions: number[] = [];
  const newIndices: number[] = [];

  const mapVertex = (vertIdx: number): number => {
    const x = posAttr.getX(vertIdx);
    const y = posAttr.getY(vertIdx);
    const z = posAttr.getZ(vertIdx);
    const key = `${Math.round(x * 2000)},${Math.round(y * 2000)},${Math.round(z * 2000)}`;
    const existing = vertMap.get(key);
    if (existing !== undefined) return existing;
    const nextIdx = uniquePositions.length / 3;
    uniquePositions.push(x, y, z);
    vertMap.set(key, nextIdx);
    return nextIdx;
  };

  if (idxAttr) {
    for (let i = 0; i < idxAttr.count; i++) {
      newIndices.push(mapVertex(idxAttr.getX(i)));
    }
  } else {
    for (let i = 0; i < posAttr.count; i++) {
      newIndices.push(mapVertex(i));
    }
  }

  src.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(uniquePositions, 3));
  out.setIndex(newIndices);
  out.computeVertexNormals();
  return out;
}

export function createBaseSculptGeometry(preset: SculptBasePreset): THREE.BufferGeometry {
  let geom: THREE.BufferGeometry;

  if (preset === 'sphere') {
    geom = new THREE.IcosahedronGeometry(1.3, 4);
  } else if (preset === 'humanHead') {
    geom = new THREE.IcosahedronGeometry(1.15, 4);
    const pos = geom.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // Cranial oval & jaw taper
      v.x *= 0.82;
      v.y *= 1.12;
      v.z *= 0.96;
      if (v.y < -0.15) {
        const jawT = Math.min(1, (-0.15 - v.y) / 1.0);
        v.x *= 1 - jawT * 0.36;
        v.z = v.z * (1 - jawT * 0.25) + jawT * 0.14;
      }
      // Subtle brow ridge & nose bridge contour on +Z front
      if (v.z > 0.45 && Math.abs(v.x) < 0.28 && v.y > -0.25 && v.y < 0.28) {
        v.z += (1 - Math.abs(v.x) / 0.28) * 0.12;
      }
      // Eye sockets indentation
      if (v.z > 0.5 && Math.abs(v.x) > 0.16 && Math.abs(v.x) < 0.45 && v.y > 0.05 && v.y < 0.36) {
        v.z -= 0.08;
      }
      pos.setXYZ(i, v.x, v.y + 1.55, v.z);
    }
  } else if (preset === 'organicPod') {
    geom = new THREE.IcosahedronGeometry(1.15, 4);
    const pos = geom.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const pinch = 1 - 0.25 * Math.sin(y * 1.8);
      pos.setXYZ(i, x * pinch, y * 1.4 + 1.6, z * pinch);
    }
  } else if (preset === 'cube') {
    geom = new THREE.BoxGeometry(2.0, 2.0, 2.0, 14, 14, 14);
    geom.translate(0, 1.35, 0);
  } else if (preset === 'torus') {
    geom = new THREE.TorusGeometry(1.2, 0.46, 28, 56);
    geom.translate(0, 1.65, 0);
  } else {
    geom = new THREE.PlaneGeometry(4.6, 4.6, 42, 42);
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, 0.35, 0);
  }

  return weldGeometryVertices(geom);
}

export class MeshSculptEngine {
  geometry: THREE.BufferGeometry;
  private sculptedBase: Float32Array;
  private neighbors: number[][] = [];
  private undoStack: Float32Array[] = [];

  constructor(preset: SculptBasePreset = 'humanHead') {
    this.geometry = createBaseSculptGeometry(preset);
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.sculptedBase = new Float32Array(pos.array as Float32Array);
    this.rebuildNeighbors();
  }

  reset(preset: SculptBasePreset): void {
    this.geometry.dispose();
    this.geometry = createBaseSculptGeometry(preset);
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.sculptedBase = new Float32Array(pos.array as Float32Array);
    this.undoStack = [];
    this.rebuildNeighbors();
  }

  private rebuildNeighbors(): void {
    const pos = this.geometry.getAttribute('position');
    const idx = this.geometry.getIndex();
    const sets: Set<number>[] = Array.from({ length: pos.count }, () => new Set());
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i);
        const b = idx.getX(i + 1);
        const c = idx.getX(i + 2);
        sets[a].add(b);
        sets[a].add(c);
        sets[b].add(a);
        sets[b].add(c);
        sets[c].add(a);
        sets[c].add(b);
      }
    }
    this.neighbors = sets.map((s) => Array.from(s));
  }

  pushUndoSnapshot(): void {
    this.undoStack.push(new Float32Array(this.sculptedBase));
    if (this.undoStack.length > 18) this.undoStack.shift();
  }

  undo(cfg: MeshSculptConfig): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    if (prev.length !== this.sculptedBase.length) return false;
    this.sculptedBase.set(prev);
    this.applyModifiers(cfg);
    return true;
  }

  applyBrushStroke(
    hitPointLocal: THREE.Vector3,
    hitNormalLocal: THREE.Vector3,
    cfg: MeshSculptConfig
  ): void {
    const applyAt = (center: THREE.Vector3, nrm: THREE.Vector3) => {
      const rad = Math.max(0.1, cfg.radius);
      const radSq = rad * rad;
      const strength = cfg.strength * 0.14;
      const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
      const nrmAttr = this.geometry.getAttribute('normal') as THREE.BufferAttribute;
      const count = posAttr.count;

      // Average neighbors target for smooth brush
      let avgPlaneDot = 0;
      if (cfg.brush === 'flatten') {
        avgPlaneDot = center.dot(nrm);
      }

      const nextCopy =
        cfg.brush === 'smooth' ? new Float32Array(this.sculptedBase) : null;

      for (let i = 0; i < count; i++) {
        const vx = this.sculptedBase[i * 3];
        const vy = this.sculptedBase[i * 3 + 1];
        const vz = this.sculptedBase[i * 3 + 2];

        const dx = vx - center.x;
        const dy = vy - center.y;
        const dz = vz - center.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= radSq) continue;

        const d = Math.sqrt(d2);
        const u = 1 - d / rad;
        const falloff = u * u * (3 - 2 * u);
        const amt = falloff * strength;

        if (cfg.brush === 'pull') {
          this.sculptedBase[i * 3] += nrm.x * amt;
          this.sculptedBase[i * 3 + 1] += nrm.y * amt;
          this.sculptedBase[i * 3 + 2] += nrm.z * amt;
        } else if (cfg.brush === 'carve') {
          this.sculptedBase[i * 3] -= nrm.x * amt;
          this.sculptedBase[i * 3 + 1] -= nrm.y * amt;
          this.sculptedBase[i * 3 + 2] -= nrm.z * amt;
        } else if (cfg.brush === 'inflate') {
          const vnX = nrmAttr ? nrmAttr.getX(i) : nrm.x;
          const vnY = nrmAttr ? nrmAttr.getY(i) : nrm.y;
          const vnZ = nrmAttr ? nrmAttr.getZ(i) : nrm.z;
          this.sculptedBase[i * 3] += vnX * amt;
          this.sculptedBase[i * 3 + 1] += vnY * amt;
          this.sculptedBase[i * 3 + 2] += vnZ * amt;
        } else if (cfg.brush === 'flatten') {
          const distToPlane = vx * nrm.x + vy * nrm.y + vz * nrm.z - avgPlaneDot;
          const shift = distToPlane * Math.min(0.85, amt * 3.5);
          this.sculptedBase[i * 3] -= nrm.x * shift;
          this.sculptedBase[i * 3 + 1] -= nrm.y * shift;
          this.sculptedBase[i * 3 + 2] -= nrm.z * shift;
        } else if (cfg.brush === 'smooth' && nextCopy) {
          const nbrs = this.neighbors[i];
          if (nbrs && nbrs.length > 0) {
            let ax = 0, ay = 0, az = 0;
            for (const ni of nbrs) {
              ax += nextCopy[ni * 3];
              ay += nextCopy[ni * 3 + 1];
              az += nextCopy[ni * 3 + 2];
            }
            const inv = 1 / nbrs.length;
            const w = Math.min(0.65, amt * 3.0);
            this.sculptedBase[i * 3] = vx + (ax * inv - vx) * w;
            this.sculptedBase[i * 3 + 1] = vy + (ay * inv - vy) * w;
            this.sculptedBase[i * 3 + 2] = vz + (az * inv - vz) * w;
          }
        }
      }
    };

    applyAt(hitPointLocal, hitNormalLocal);
    if (cfg.symmetryX && Math.abs(hitPointLocal.x) > 0.02) {
      applyAt(
        new THREE.Vector3(-hitPointLocal.x, hitPointLocal.y, hitPointLocal.z),
        new THREE.Vector3(-hitNormalLocal.x, hitNormalLocal.y, hitNormalLocal.z)
      );
    }

    this.applyModifiers(cfg);
  }

  applyModifiers(cfg: MeshSculptConfig): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      let x = this.sculptedBase[i * 3];
      let y = this.sculptedBase[i * 3 + 1];
      let z = this.sculptedBase[i * 3 + 2];

      if (Math.abs(cfg.taper) > 1e-4) {
        const factor = Math.max(0.25, 1 + cfg.taper * (y - 1.4) * 0.35);
        x *= factor;
        z *= factor;
      }

      if (Math.abs(cfg.twist) > 1e-4) {
        const angle = cfg.twist * (y - 1.4);
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const nx = x * c - z * s;
        const nz = x * s + z * c;
        x = nx;
        z = nz;
      }

      if (cfg.noise > 1e-4) {
        const disp =
          (Math.sin(x * 4.2 + y * 3.1) * Math.cos(z * 4.5 - y * 2.3) +
            Math.sin(y * 7.5 + z * 5.0) * 0.4) *
          cfg.noise *
          0.14;
        const r = Math.hypot(x, y - 1.4, z) || 1;
        x += (x / r) * disp;
        y += ((y - 1.4) / r) * disp;
        z += (z / r) * disp;
      }

      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  applySubdivide(cfg: MeshSculptConfig): boolean {
    const idxAttr = this.geometry.getIndex();
    if (!idxAttr || idxAttr.count / 3 > 25000) return false;
    this.pushUndoSnapshot();

    const newPositions: number[] = Array.from(this.sculptedBase);
    const midpointCache = new Map<string, number>();

    const getMid = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const existing = midpointCache.get(key);
      if (existing !== undefined) return existing;
      const idx = newPositions.length / 3;
      newPositions.push(
        (newPositions[a * 3] + newPositions[b * 3]) * 0.5,
        (newPositions[a * 3 + 1] + newPositions[b * 3 + 1]) * 0.5,
        (newPositions[a * 3 + 2] + newPositions[b * 3 + 2]) * 0.5
      );
      midpointCache.set(key, idx);
      return idx;
    };

    const newIndices: number[] = [];
    for (let i = 0; i < idxAttr.count; i += 3) {
      const a = idxAttr.getX(i);
      const b = idxAttr.getX(i + 1);
      const c = idxAttr.getX(i + 2);
      const ab = getMid(a, b);
      const bc = getMid(b, c);
      const ca = getMid(c, a);
      newIndices.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }

    this.geometry.dispose();
    const nextGeom = new THREE.BufferGeometry();
    nextGeom.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    nextGeom.setIndex(newIndices);
    this.geometry = nextGeom;
    this.sculptedBase = new Float32Array(newPositions);
    this.rebuildNeighbors();
    this.applyModifiers(cfg);
    return true;
  }

  getStats(): { vertices: number; triangles: number } {
    const pos = this.geometry.getAttribute('position');
    const idx = this.geometry.getIndex();
    return {
      vertices: pos ? pos.count : 0,
      triangles: idx ? idx.count / 3 : pos ? pos.count / 3 : 0,
    };
  }

  serialize(): SerializedMeshData {
    return serializeBufferGeometry(this.geometry);
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
