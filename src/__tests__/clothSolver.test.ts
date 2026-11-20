import { describe, expect, it } from 'vitest';
import { ClothSolver } from '../engines/soft/clothSolver';
import { createDefaultSoftConfig } from '../engines/soft/particleFieldEngine';

describe('Verlet Cloth Solver', () => {
  it('hangs under gravity, keeps pinned corners stationary, and separates from sphere obstacle', () => {
    const cloth = new ClothSolver(12, 12, 3.0, 3.0);
    const cfg = createDefaultSoftConfig().cloth;
    cfg.windStrength = 0;
    cfg.obstacleEnabled = true;
    cfg.obstacleRadius = 1.0;
    cfg.obstaclePos = [0, 2.2, 0];

    const pin0Y = cloth.pos[1];
    const lastTopCol = cloth.cols - 1;
    const pin1Y = cloth.pos[lastTopCol * 3 + 1];

    for (let i = 0; i < 60; i++) {
      cloth.step(1 / 60, cfg, -9.81);
    }

    // Pinned corners stay exact
    expect(cloth.pos[1]).toBeCloseTo(pin0Y, 5);
    expect(cloth.pos[lastTopCol * 3 + 1]).toBeCloseTo(pin1Y, 5);

    // Free bottom vertex drops below initial position and remains finite
    const bottomIdx = (cloth.rows - 1) * cloth.cols + Math.floor(cloth.cols / 2);
    expect(Number.isFinite(cloth.pos[bottomIdx * 3 + 1])).toBe(true);
    expect(cloth.pos[bottomIdx * 3 + 1]).toBeLessThan(pin0Y - 0.5);

    // Every unpinned vertex stays outside obstacle radius
    for (let i = 0; i < cloth.vertexCount; i++) {
      if (cloth.pinned[i]) continue;
      const d = Math.hypot(
        cloth.pos[i * 3] - cfg.obstaclePos[0],
        cloth.pos[i * 3 + 1] - cfg.obstaclePos[1],
        cloth.pos[i * 3 + 2] - cfg.obstaclePos[2]
      );
      expect(d).toBeGreaterThanOrEqual(cfg.obstacleRadius - 1e-4);
    }
  });
});
