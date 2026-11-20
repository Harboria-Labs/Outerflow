import { describe, expect, it } from 'vitest';
import {
  UNIVERSAL_SCRIPT_TEMPLATES,
  executeUniversalScript,
} from '../engines/project/universalScriptEngine';

describe('Universal Programmable Engineering Script Engine', () => {
  it('executes all 6 flagship universal script templates with zero errors', () => {
    expect(UNIVERSAL_SCRIPT_TEMPLATES.length).toBeGreaterThanOrEqual(6);

    for (const tpl of UNIVERSAL_SCRIPT_TEMPLATES) {
      const res = executeUniversalScript(tpl.code);
      expect(res.ok, `Template "${tpl.name}" failed: ${res.error}`).toBe(true);
      expect(res.error).toBeUndefined();

      if (tpl.id === 'workbench-circuit-code') {
        expect(res.touchedWorkbench).toBe(true);
        expect(res.workbenchConfig?.boardId).toBe('arduino-uno-r3');
        expect(res.workbenchConfig?.modules.length).toBeGreaterThanOrEqual(4);
        expect(res.workbenchConfig?.wires.length).toBeGreaterThanOrEqual(8);
      } else {
        expect(res.touchedPhysics).toBe(true);
        expect(res.entities.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('supports CSG machining, multi-color 3D robotics hardware spawning, and 60Hz motor control', () => {
    const script = `
      outerflow.clear();
      const base = design.box(1.2, 0.2, 0.8);
      const hole = design.cylinder(0.25, 0.25, 0.4, 24);
      const bracket = design.paint(design.subtract(base, hole), '#38bdf8');
      const bracketId = design.spawnBody('Machined Bracket', bracket, {
        bodyType: 'fixed',
        position: [0, 0.5, 0],
      });

      const unoId = outerflow.addHardware('arduino-uno-r3', {
        name: 'Controller Uno',
        bodyType: 'dynamic',
        position: [0, 1.2, 0],
        scale: [0.25, 0.25, 0.25],
      });

      const jointId = outerflow.addJoint({
        kind: 'revolute',
        bodyA: bracketId,
        bodyB: unoId,
        anchorA: [0, 0.35, 0],
        anchorB: [0, -0.35, 0],
        axis: [0, 1, 0],
        motorSpeed: 2,
        motorMaxForce: 15,
      });

      outerflow.addParameter('TargetSpeed', 4.5, 'rad/s');

      outerflow.onStep((t, api) => {
        if (api.setMotor) {
          api.setMotor(jointId, Math.sin(t) * 4.5, 20);
        }
        api.logMetric('motorCmd', Math.sin(t) * 4.5);
      });
    `;

    const res = executeUniversalScript(script);
    expect(res.ok).toBe(true);
    expect(res.entities.length).toBe(2);
    expect(res.joints.length).toBe(1);
    expect(res.parameters.some((p) => p.name === 'TargetSpeed')).toBe(true);
    expect(res.stepCallback).not.toBeNull();

    const unoEntity = res.entities.find((e) => e.name === 'Controller Uno');
    expect(unoEntity).toBeDefined();
    expect(unoEntity?.serializedMesh?.colors).toBeDefined();
    expect((unoEntity?.serializedMesh?.colors?.length ?? 0) > 0).toBe(true);

    let motorUpdatedId = '';
    let motorSpeedSet = 0;
    let recordedMetricVal = 0;
    res.stepCallback?.(Math.PI / 2, {
      getState: () => ({ pos: [0, 1, 0], vel: [0, 0, 0], mass: 1 }),
      applyForce: () => {},
      applyImpulse: () => {},
      setMotor: (jid: string, spd: number) => {
        motorUpdatedId = jid;
        motorSpeedSet = spd;
      },
      logMetric: (_k: string, v: number) => {
        recordedMetricVal = v;
      },
    });

    expect(motorUpdatedId).toBe(res.joints[0].id);
    expect(motorSpeedSet).toBeCloseTo(4.5, 4);
    expect(recordedMetricVal).toBeCloseTo(4.5, 4);
  });
});
