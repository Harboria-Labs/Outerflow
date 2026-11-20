import * as THREE from 'three';

const EPSILON = 1e-5;

class CsgVertex {
  pos: THREE.Vector3;
  normal: THREE.Vector3;

  constructor(pos: THREE.Vector3, normal: THREE.Vector3) {
    this.pos = pos.clone();
    this.normal = normal.clone();
  }

  clone(): CsgVertex {
    return new CsgVertex(this.pos, this.normal);
  }

  flip(): void {
    this.normal.negate();
  }

  interpolate(other: CsgVertex, t: number): CsgVertex {
    const p = this.pos.clone().lerp(other.pos, t);
    const n = this.normal.clone().lerp(other.normal, t);
    if (n.lengthSq() > 1e-8) n.normalize();
    return new CsgVertex(p, n);
  }
}

class CsgPlane {
  normal: THREE.Vector3;
  w: number;

  constructor(normal: THREE.Vector3, w: number) {
    this.normal = normal.clone();
    this.w = w;
  }

  static fromPoints(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): CsgPlane | null {
    const ab = b.clone().sub(a);
    const ac = c.clone().sub(a);
    const n = ab.cross(ac);
    const len = n.length();
    if (len < 1e-7) return null;
    n.divideScalar(len);
    return new CsgPlane(n, n.dot(a));
  }

  clone(): CsgPlane {
    return new CsgPlane(this.normal, this.w);
  }

  flip(): void {
    this.normal.negate();
    this.w = -this.w;
  }

  splitPolygon(
    polygon: CsgPolygon,
    coplanarFront: CsgPolygon[],
    coplanarBack: CsgPolygon[],
    front: CsgPolygon[],
    back: CsgPolygon[]
  ): void {
    const COPLANAR = 0;
    const FRONT = 1;
    const BACK = 2;
    const SPANNING = 3;

    let polygonType = 0;
    const types: number[] = [];

    for (let i = 0; i < polygon.vertices.length; i++) {
      const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      const type = t < -EPSILON ? BACK : t > EPSILON ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }

    switch (polygonType) {
      case COPLANAR:
        if (this.normal.dot(polygon.plane.normal) > 0) {
          coplanarFront.push(polygon);
        } else {
          coplanarBack.push(polygon);
        }
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING: {
        const f: CsgVertex[] = [];
        const b: CsgVertex[] = [];
        const len = polygon.vertices.length;
        for (let i = 0; i < len; i++) {
          const j = (i + 1) % len;
          const ti = types[i];
          const tj = types[j];
          const vi = polygon.vertices[i];
          const vj = polygon.vertices[j];
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
          if ((ti | tj) === SPANNING) {
            const denom = this.normal.dot(vj.pos.clone().sub(vi.pos));
            const t = Math.abs(denom) < 1e-8 ? 0.5 : (this.w - this.normal.dot(vi.pos)) / denom;
            const v = vi.interpolate(vj, Math.max(0, Math.min(1, t)));
            f.push(v);
            b.push(v.clone());
          }
        }
        if (f.length >= 3) front.push(new CsgPolygon(f, polygon.plane));
        if (b.length >= 3) back.push(new CsgPolygon(b, polygon.plane));
        break;
      }
    }
  }
}

class CsgPolygon {
  vertices: CsgVertex[];
  plane: CsgPlane;

  constructor(vertices: CsgVertex[], plane?: CsgPlane) {
    this.vertices = vertices;
    if (plane) {
      this.plane = plane.clone();
    } else {
      const p = CsgPlane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
      this.plane = p ?? new CsgPlane(new THREE.Vector3(0, 1, 0), 0);
    }
  }

  clone(): CsgPolygon {
    return new CsgPolygon(
      this.vertices.map((v) => v.clone()),
      this.plane
    );
  }

  flip(): void {
    this.vertices.reverse();
    for (const v of this.vertices) v.flip();
    this.plane.flip();
  }
}

class BspNode {
  plane: CsgPlane | null = null;
  front: BspNode | null = null;
  back: BspNode | null = null;
  polygons: CsgPolygon[] = [];

  constructor(polygons?: CsgPolygon[]) {
    if (polygons && polygons.length > 0) {
      this.build(polygons);
    }
  }

  clone(): BspNode {
    const node = new BspNode();
    node.plane = this.plane ? this.plane.clone() : null;
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    node.polygons = this.polygons.map((p) => p.clone());
    return node;
  }

  invert(): void {
    for (const p of this.polygons) p.flip();
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const temp = this.front;
    this.front = this.back;
    this.back = temp;
  }

  clipPolygons(polygons: CsgPolygon[]): CsgPolygon[] {
    if (!this.plane) return polygons.slice();
    let front: CsgPolygon[] = [];
    let back: CsgPolygon[] = [];
    for (const p of polygons) {
      this.plane.splitPolygon(p, front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    if (this.back) back = this.back.clipPolygons(back);
    else back = [];
    return front.concat(back);
  }

  clipTo(bsp: BspNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  allPolygons(): CsgPolygon[] {
    let result = this.polygons.slice();
    if (this.front) result = result.concat(this.front.allPolygons());
    if (this.back) result = result.concat(this.back.allPolygons());
    return result;
  }

  build(polygons: CsgPolygon[]): void {
    if (polygons.length === 0) return;
    const queue: { node: BspNode; polys: CsgPolygon[] }[] = [{ node: this, polys: polygons }];

    while (queue.length > 0) {
      const item = queue.pop()!;
      const { node, polys } = item;
      if (polys.length === 0) continue;
      if (!node.plane) {
        // Pick midpoint polygon as splitter to reduce degenerate depth
        const pivot = polys[Math.floor(polys.length / 2)];
        node.plane = pivot.plane.clone();
      }
      const front: CsgPolygon[] = [];
      const back: CsgPolygon[] = [];
      for (const p of polys) {
        node.plane.splitPolygon(p, node.polygons, node.polygons, front, back);
      }
      if (front.length > 0) {
        if (!node.front) node.front = new BspNode();
        queue.push({ node: node.front, polys: front });
      }
      if (back.length > 0) {
        if (!node.back) node.back = new BspNode();
        queue.push({ node: node.back, polys: back });
      }
    }
  }
}

export class CSGSolid {
  private polygons: CsgPolygon[];

  constructor(polygons: CsgPolygon[]) {
    this.polygons = polygons;
  }

  clone(): CSGSolid {
    return new CSGSolid(this.polygons.map((p) => p.clone()));
  }

  static fromGeometry(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4): CSGSolid {
    const geom = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (!geom.getAttribute('normal')) {
      geom.computeVertexNormals();
    }
    if (matrix) {
      geom.applyMatrix4(matrix);
    }

    const pos = geom.getAttribute('position');
    const nrm = geom.getAttribute('normal');
    const polygons: CsgPolygon[] = [];

    for (let i = 0; i < pos.count; i += 3) {
      const p0 = new THREE.Vector3().fromBufferAttribute(pos, i);
      const p1 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const p2 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const plane = CsgPlane.fromPoints(p0, p1, p2);
      if (!plane) continue;

      const n0 = nrm ? new THREE.Vector3().fromBufferAttribute(nrm, i).normalize() : plane.normal.clone();
      const n1 = nrm ? new THREE.Vector3().fromBufferAttribute(nrm, i + 1).normalize() : plane.normal.clone();
      const n2 = nrm ? new THREE.Vector3().fromBufferAttribute(nrm, i + 2).normalize() : plane.normal.clone();

      polygons.push(
        new CsgPolygon(
          [new CsgVertex(p0, n0), new CsgVertex(p1, n1), new CsgVertex(p2, n2)],
          plane
        )
      );
    }

    geom.dispose();
    return new CSGSolid(polygons);
  }

  toGeometry(): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];

    for (const poly of this.polygons) {
      const verts = poly.vertices;
      if (verts.length < 3) continue;
      for (let i = 2; i < verts.length; i++) {
        const a = verts[0];
        const b = verts[i - 1];
        const c = verts[i];
        // Filter degenerate triangles
        const ab = b.pos.clone().sub(a.pos);
        const ac = c.pos.clone().sub(a.pos);
        if (ab.cross(ac).lengthSq() < 1e-11) continue;

        positions.push(
          a.pos.x, a.pos.y, a.pos.z,
          b.pos.x, b.pos.y, b.pos.z,
          c.pos.x, c.pos.y, c.pos.z
        );
        normals.push(
          a.normal.x, a.normal.y, a.normal.z,
          b.normal.x, b.normal.y, b.normal.z,
          c.normal.x, c.normal.y, c.normal.z
        );
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    return geom;
  }

  union(other: CSGSolid): CSGSolid {
    const a = new BspNode(this.clone().polygons);
    const b = new BspNode(other.clone().polygons);
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    return new CSGSolid(a.allPolygons());
  }

  subtract(other: CSGSolid): CSGSolid {
    const a = new BspNode(this.clone().polygons);
    const b = new BspNode(other.clone().polygons);
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
    return new CSGSolid(a.allPolygons());
  }

  intersect(other: CSGSolid): CSGSolid {
    const a = new BspNode(this.clone().polygons);
    const b = new BspNode(other.clone().polygons);
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
    return new CSGSolid(a.allPolygons());
  }
}

export function csgUnion(
  geomA: THREE.BufferGeometry,
  matA: THREE.Matrix4 | undefined,
  geomB: THREE.BufferGeometry,
  matB: THREE.Matrix4 | undefined
): THREE.BufferGeometry {
  return CSGSolid.fromGeometry(geomA, matA).union(CSGSolid.fromGeometry(geomB, matB)).toGeometry();
}

export function csgSubtract(
  geomA: THREE.BufferGeometry,
  matA: THREE.Matrix4 | undefined,
  geomB: THREE.BufferGeometry,
  matB: THREE.Matrix4 | undefined
): THREE.BufferGeometry {
  return CSGSolid.fromGeometry(geomA, matA).subtract(CSGSolid.fromGeometry(geomB, matB)).toGeometry();
}

export function csgIntersect(
  geomA: THREE.BufferGeometry,
  matA: THREE.Matrix4 | undefined,
  geomB: THREE.BufferGeometry,
  matB: THREE.Matrix4 | undefined
): THREE.BufferGeometry {
  return CSGSolid.fromGeometry(geomA, matA).intersect(CSGSolid.fromGeometry(geomB, matB)).toGeometry();
}
