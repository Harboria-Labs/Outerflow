import { describe, expect, it } from 'vitest';
import { getPhysicsPresets } from '../engines/physics/presets';
import { RapierPhysicsEngine } from '../engines/physics/rapierEngine';
import {
  computeEntityVolumeAndArea,
  evaluateProjectParameters,
  getDefaultParametersForPreset,
  inspectEntities,
  runDesignVariantExperiment,
  syncEntityPhysicalMass,
} from '../engines/project/parameterAndTemplateEngine';

describe('Unified Project, Linked Parameters, Checkpoints, Inspection & Design A/B Comparison', () => {
  it('calculates exact geometric volume, surface area, and Mass = Volume * Density automatically', () => {
    const preset = getPhysicsPresets().find((p) => p.id === 'suspension-rig')!;
    const hub = preset.entities.find((e) => e.id === 'susp-hub')!;

    // 1.8 x 0.55 x 0.9 dm^3 -> 0.000891 m^3; density 7800 -> mass ~6.9498 kg
    const { volumeM3, surfaceAreaM2 } = computeEntityVolumeAndArea(hub);
    expect(volumeM3).toBeCloseTo(0.000891, 6);
    expect(surfaceAreaM2).toBeCloseTo(2 * (1.8 * 0.55 + 1.8 * 0.9 + 0.55 * 0.9) * 0.01, 4);

    const synced = syncEntityPhysicalMass({ ...hub, density: 2700 });
    expect(synced.physics.mass).toBeCloseTo(0.000891 * 2700, 2);
  });

  it('propagates linked Length & Density parameter edits through equations into geometry and mass', () => {
    const preset = getPhysicsPresets().find((p) => p.id === 'suspension-rig')!;
    const baseParams = getDefaultParametersForPreset(
      preset.id,
      preset.entities,
      preset.joints
    );

    const initialEval = evaluateProjectParameters(baseParams, preset.entities, preset.joints);
    const initialHub = initialEval.entities.find((e) => e.id === 'susp-hub')!;
    const initialFreq = initialEval.parameters.find((p) => p.id === 'nat_freq')!.value;
    expect(initialFreq).toBeGreaterThan(0);

    // Double the hub length from 1.8 -> 3.0 and lower spring stiffness to test natural freq update
    const modifiedParams = baseParams.map((p) =>
      p.id === 'arm_width' ? { ...p, value: 3.0 } : p.id === 'spring_k' ? { ...p, value: 80 } : p
    );
    const nextEval = evaluateProjectParameters(modifiedParams, preset.entities, preset.joints);
    const nextHub = nextEval.entities.find((e) => e.id === 'susp-hub')!;
    const nextVolume = nextEval.parameters.find((p) => p.id === 'hub_volume')!.value;
    const nextMass = nextEval.parameters.find((p) => p.id === 'hub_mass')!.value;
    const nextFreq = nextEval.parameters.find((p) => p.id === 'nat_freq')!.value;

    expect(nextHub.size.width).toBeCloseTo(3.0, 4);
    expect(nextVolume).toBeCloseTo(3.0 * 0.55 * 0.9 * 0.001, 5);
    expect(nextMass).toBeCloseTo(nextVolume * 7800, 2);
    expect(nextHub.physics.mass).toBeCloseTo(nextMass, 2);
    expect(nextHub.physics.mass).toBeGreaterThan(initialHub.physics.mass);
    expect(nextFreq).toBeLessThan(initialFreq);
    expect(nextEval.joints.find((j) => j.id === 'susp-spring')!.stiffness).toBe(80);
  });

  it('captures Rapier3D simulation checkpoints and restores exact body state on rewind', async () => {
    const preset = getPhysicsPresets().find((p) => p.id === 'suspension-rig')!;
    const engine = new RapierPhysicsEngine();
    await engine.rebuild(preset.entities, preset.joints, [0, -9.81, 0]);

    for (let i = 0; i < 20; i++) {
      engine.step(1 / 60);
    }
    const checkpointTime = engine.time;
    const snapshot = engine.captureSnapshots();
    const savedHubPos = snapshot['susp-hub'].position;

    // Advance simulation further
    for (let i = 0; i < 40; i++) {
      engine.step(1 / 60);
    }
    expect(engine.time).toBeGreaterThan(checkpointTime);

    // Restore checkpoint
    engine.restoreSnapshots(snapshot, checkpointTime);
    expect(engine.time).toBeCloseTo(checkpointTime, 6);
    const restored = engine.getBodyTransform('susp-hub')!;
    expect(restored.position[0]).toBeCloseTo(savedHubPos[0], 4);
    expect(restored.position[1]).toBeCloseTo(savedHubPos[1], 4);
    expect(restored.position[2]).toBeCloseTo(savedHubPos[2], 4);

    engine.dispose();
  });

  it('runs reproducible Design A vs Design B variant experiments and measures 3D entity metrics', async () => {
    const preset = getPhysicsPresets().find((p) => p.id === 'suspension-rig')!;
    const paramsA = getDefaultParametersForPreset(preset.id, preset.entities, preset.joints);
    const paramsB = paramsA.map((p) =>
      p.id === 'hub_density'
        ? { ...p, value: 1600 } // lightweight carbon hub vs heavy steel hub
        : p.id === 'spring_k'
        ? { ...p, value: 320 }
        : p
    );

    const runA = await runDesignVariantExperiment({
      label: 'Design A (Steel 7800)',
      color: '#38bdf8',
      entities: preset.entities,
      joints: preset.joints,
      gravity: [0, -9.81, 0],
      parameters: paramsA,
      durationSec: 1.2,
    });
    const runB = await runDesignVariantExperiment({
      label: 'Design B (Carbon 1600)',
      color: '#f59e0b',
      entities: preset.entities,
      joints: preset.joints,
      gravity: [0, -9.81, 0],
      parameters: paramsB,
      durationSec: 1.2,
    });

    expect(runA.samples.length).toBeGreaterThan(10);
    expect(runB.samples.length).toBeGreaterThan(10);
    expect(runA.summaryMetrics.totalMassKg).toBeGreaterThan(runB.summaryMetrics.totalMassKg);
    expect(runA.summaryMetrics.peakKineticEnergy).toBeGreaterThan(0);
    expect(runB.summaryMetrics.peakKineticEnergy).toBeGreaterThan(0);

    const metrics = inspectEntities(preset.entities, 'susp-mount', 'susp-hub')!;
    expect(metrics.centerToCenterDist).toBeCloseTo(3.85 - 2.45, 3);
    expect(metrics.elevationAngleDeg).toBeCloseTo(-90, 1);
  });
});
