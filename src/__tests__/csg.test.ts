import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { csgIntersect, csgSubtract, csgUnion } from '../engines/cad/csg';

describe('CSG Boolean Operations', () => {
  it('computes union, subtract, and intersect on overlapping box and sphere', () => {
    const box = new THREE.BoxGeometry(2, 2, 2);
    const sphere = new THREE.SphereGeometry(1.15, 14, 12);
    const matA = new THREE.Matrix4().makeTranslation(0, 0, 0);
    const matB = new THREE.Matrix4().makeTranslation(0.6, 0.3, 0);

    const united = csgUnion(box, matA, sphere, matB);
    const subtracted = csgSubtract(box, matA, sphere, matB);
    const intersected = csgIntersect(box, matA, sphere, matB);

    for (const geom of [united, subtracted, intersected]) {
      const pos = geom.getAttribute('position');
      const nrm = geom.getAttribute('normal');
      expect(pos.count).toBeGreaterThan(24);
      expect(nrm.count).toBe(pos.count);
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i))).toBe(true);
        expect(Number.isFinite(pos.getY(i))).toBe(true);
        expect(Number.isFinite(pos.getZ(i))).toBe(true);
      }
      geom.dispose();
    }

    // Intersection bounding box should stay inside the 2x2x2 cube
    intersected.computeBoundingBox();
    expect(intersected.boundingBox!.max.x).toBeLessThanOrEqual(1.01);
    expect(intersected.boundingBox!.min.x).toBeGreaterThanOrEqual(-1.01);

    box.dispose();
    sphere.dispose();
  });
});
