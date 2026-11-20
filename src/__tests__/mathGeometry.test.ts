import { describe, expect, it } from 'vitest';
import {
  buildParametricSurface,
  createDefaultParametricConfig,
} from '../engines/math/parametricSurface';
import {
  buildExplicitSurface,
  createDefaultExplicitConfig,
  updateExplicitSurface,
} from '../engines/math/explicitSurface';
import { buildImplicitSurface } from '../engines/math/marchingTetrahedra';

describe('Mathematical Geometry Builders', () => {
  it('builds Möbius strip parametric surface with exact grid vertex and triangle counts', () => {
    const cfg = createDefaultParametricConfig();
    cfg.uSteps = 32;
    cfg.vSteps = 8;
    const res = buildParametricSurface(cfg);

    expect(res.errors).toEqual([]);
    expect(res.vertexCount).toBe(33 * 9);
    expect(res.triangleCount).toBe(32 * 8 * 2);
    expect(res.geometry.getAttribute('position').count).toBe(res.vertexCount);
    expect(res.geometry.getAttribute('normal').count).toBe(res.vertexCount);
    expect(res.geometry.getAttribute('color').count).toBe(res.vertexCount);
    res.geometry.dispose();
  });

  it('builds and time-updates explicit wave surface z = f(x, y, t)', () => {
    const cfg = createDefaultExplicitConfig();
    cfg.expr = 'sin(x) * cos(t)';
    cfg.resolution = 16;
    const res = buildExplicitSurface(cfg, 0);
    expect(res.error).toBeNull();
    expect(res.vertexCount).toBe(17 * 17);

    const posAttr = res.geometry.getAttribute('position');
    const yAtT0 = Array.from(posAttr.array as Float32Array).filter((_, i) => i % 3 === 1);

    updateExplicitSurface(res.geometry, cfg, Math.PI / 2);
    const yAtTHalfPi = Array.from(posAttr.array as Float32Array).filter((_, i) => i % 3 === 1);

    // At t = pi/2, cos(t) ~= 0, so heights flatten close to 0 while t=0 has nonzero wave height
    const maxAbsT0 = Math.max(...yAtT0.map(Math.abs));
    const maxAbsTHalfPi = Math.max(...yAtTHalfPi.map(Math.abs));
    expect(maxAbsT0).toBeGreaterThan(0.8);
    expect(maxAbsTHalfPi).toBeLessThan(1e-5);
    res.geometry.dispose();
  });

  it('extracts implicit sphere iso-surface via Marching Tetrahedra near radius 1.5', () => {
    const res = buildImplicitSurface({
      presetId: 'sphereTest',
      expr: 'x^2 + y^2 + z^2 - 2.25',
      bound: 2.0,
      resolution: 18,
      isoLevel: 0,
      colormap: 'harboria',
      wireframe: false,
    });

    expect(res.error).toBeNull();
    expect(res.triangleCount).toBeGreaterThan(200);

    const pos = res.geometry.getAttribute('position');
    let maxRadiusErr = 0;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
      maxRadiusErr = Math.max(maxRadiusErr, Math.abs(r - 1.5));
    }
    expect(maxRadiusErr).toBeLessThan(0.15);
    res.geometry.dispose();
  });
});
