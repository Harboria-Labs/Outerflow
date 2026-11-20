import { describe, expect, it } from 'vitest';
import { SphFluidSolver, WaveTankSolver } from '../engines/soft/fluidSolver';
import { createDefaultSoftConfig } from '../engines/soft/particleFieldEngine';

describe('SPH Fluid & Shallow-Water Solvers', () => {
  it('steps 3D SPH fluid cleanly inside tank bounds without NaN', () => {
    const cfg = createDefaultSoftConfig().sphFluid;
    const sph = new SphFluidSolver(180, cfg.tankHalfWidth);

    for (let s = 0; s < 35; s++) {
      sph.step(1 / 60, cfg);
    }

    for (let i = 0; i < sph.count; i++) {
      const x = sph.pos[i * 3];
      const y = sph.pos[i * 3 + 1];
      const z = sph.pos[i * 3 + 2];
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
      expect(Math.abs(x)).toBeLessThanOrEqual(cfg.tankHalfWidth + 1e-4);
      expect(y).toBeGreaterThanOrEqual(0.079);
      expect(y).toBeLessThanOrEqual(cfg.tankHeight + 1e-4);
    }
  });

  it('propagates ripples outward across shallow-water wave tank grid', () => {
    const cfg = createDefaultSoftConfig().waveTank;
    cfg.rainEnabled = false;
    const wave = new WaveTankSolver(32, 6.0);

    // Initially ripple is concentrated at center, zero near edge (4, 4)
    const edgeIdx = 4 * 32 + 4;
    expect(Math.abs(wave.u[edgeIdx])).toBe(0);

    for (let s = 0; s < 40; s++) {
      wave.step(1 / 60, cfg);
    }

    // Energy should have propagated outward into surrounding cells
    let nonZeroCount = 0;
    for (let i = 0; i < wave.u.length; i++) {
      expect(Number.isFinite(wave.u[i])).toBe(true);
      if (Math.abs(wave.u[i]) > 1e-4) nonZeroCount++;
    }
    expect(nonZeroCount).toBeGreaterThan(200);
  });
});
