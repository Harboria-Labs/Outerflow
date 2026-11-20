import { describe, expect, it } from 'vitest';
import { runParameterSweep } from '../engines/experiments/sweepRunner';

describe('Headless Rapier3D Parameter Sweep', () => {
  it('runs projectile angle sweep and finds ~45° achieves greater range than 15° and 75°', async () => {
    const results = await runParameterSweep({
      templateId: 'projectileAngle',
      paramMin: 15,
      paramMax: 75,
      steps: 5,
      durationSec: 3.0,
    });

    expect(results).toHaveLength(5);
    const angle15 = results[0];
    const angle45 = results[2];
    const angle75 = results[4];

    expect(angle15.paramValue).toBeCloseTo(15, 1);
    expect(angle45.paramValue).toBeCloseTo(45, 1);
    expect(angle75.paramValue).toBeCloseTo(75, 1);

    expect(angle45.primaryMetricValue).toBeGreaterThan(angle15.primaryMetricValue);
    expect(angle45.primaryMetricValue).toBeGreaterThan(angle75.primaryMetricValue);
    expect(angle75.peakHeight).toBeGreaterThan(angle45.peakHeight);
  });
});
