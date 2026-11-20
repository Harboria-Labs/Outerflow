import { describe, expect, it } from 'vitest';
import { createDefaultOdeConfig, solveOdeSystem } from '../engines/math/odeSolver';

describe('ODE Dynamical System Solver', () => {
  it('integrates Lorenz attractor into bounded finite trajectories with chaos divergence', () => {
    const cfg = createDefaultOdeConfig();
    cfg.steps = 2500;
    cfg.bundleCount = 2;
    cfg.perturbation = 0.25;

    const res = solveOdeSystem(cfg);
    expect(res.errors).toEqual([]);
    expect(res.trajectories).toHaveLength(2);

    const t0 = res.trajectories[0].rawStates;
    const t1 = res.trajectories[1].rawStates;
    expect(t0).toHaveLength(2501);

    for (const s of t0) {
      expect(Number.isFinite(s[0])).toBe(true);
      expect(Number.isFinite(s[1])).toBe(true);
      expect(Number.isFinite(s[2])).toBe(true);
      expect(Math.hypot(s[0], s[1], s[2])).toBeLessThan(120);
    }

    const initDist = Math.hypot(
      t0[0][0] - t1[0][0],
      t0[0][1] - t1[0][1],
      t0[0][2] - t1[0][2]
    );
    let maxDist = 0;
    for (let i = 0; i < t0.length; i++) {
      const d = Math.hypot(
        t0[i][0] - t1[i][0],
        t0[i][1] - t1[i][1],
        t0[i][2] - t1[i][2]
      );
      if (d > maxDist) maxDist = d;
    }
    expect(initDist).toBeLessThan(0.35);
    expect(maxDist).toBeGreaterThan(5.0);
  });
});
