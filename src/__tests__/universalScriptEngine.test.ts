import { describe, expect, it } from 'vitest';
import {
  UNIVERSAL_SCRIPT_TEMPLATES,
  executeUniversalScript,
} from '../engines/project/universalScriptEngine';

describe('Universal Programmable Engineering Script Engine', () => {
  it('executes all 10 flagship JS, Python (.py), and C++ / Arduino (.cpp / .ino) templates with zero errors', () => {
    expect(UNIVERSAL_SCRIPT_TEMPLATES.length).toBeGreaterThanOrEqual(10);

    for (const tpl of UNIVERSAL_SCRIPT_TEMPLATES) {
      const res = executeUniversalScript(tpl.code);
      expect(res.ok, `Template "${tpl.name}" failed: ${res.error}`).toBe(true);
      expect(res.error).toBeUndefined();
      if (tpl.language) {
        expect(res.language).toBe(tpl.language);
      }

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

  it('transpiles and executes Python (.py) engineering scripts with keyword args, range(), and def on_step()', () => {
    const pyScript = `
import outerflow
import math

outerflow.clear()
outerflow.set_gravity(0, -9.81, 0)

base_id = outerflow.spawn_box(id='py-base', name='Python Base', body_type='fixed', pos=[0, 0.25, 0], size=[3.0, 0.5, 3.0])

for i in range(3):
  outerflow.spawn_sphere(name='Ball ' + str(i), pos=[-1.0 + i * 1.0, 2.0, 0], radius=0.3, mass=1.2)

def on_step(t, api):
  api.log_metric('pySin', math.sin(t))
`;

    const res = executeUniversalScript(pyScript);
    expect(res.ok, res.error).toBe(true);
    expect(res.language).toBe('python');
    expect(res.entities.length).toBe(4);
    expect(res.stepCallback).not.toBeNull();

    let loggedMetric = 0;
    res.stepCallback?.(Math.PI / 2, {
      getState: () => ({ pos: [0, 1, 0], vel: [0, 0, 0], mass: 1 }),
      applyForce: () => {},
      applyImpulse: () => {},
      setMotor: () => {},
      logMetric: (_k: string, v: number) => {
        loggedMetric = v;
      },
    });
    expect(loggedMetric).toBeCloseTo(1.0, 4);
  });

  it('transpiles and executes C++ / Arduino (.cpp / .ino) setup() and loop(float t) scripts', () => {
    const cppScript = `
#include <Outerflow.h>
#include <Arduino.h>

#define LED_PIN 13

EntityId baseId;
EntityId rotorId;
JointId motorId;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  outerflow::clear();
  outerflow::setGravity(0.0f, -9.81f, 0.0f);

  auto g = design::paint(design::gear(16, 0.8f, 0.25f), "#38bdf8");
  baseId = outerflow::spawnBox({ name: "C++ Base", bodyType: "fixed", pos: {0.0f, 0.5f, 0.0f} });
  rotorId = design::spawnBody(g, { name: "C++ Gear", pos: {0.0f, 1.5f, 0.0f}, mass: 2.0f });
  motorId = outerflow::addJoint({
    kind: "revolute",
    bodyA: baseId,
    bodyB: rotorId,
    axis: {0.0f, 1.0f, 0.0f},
    motorSpeed: 2.0f,
    motorMaxForce: 20.0f
  });
}

void loop(float t, StepApi& api) {
  digitalWrite(LED_PIN, HIGH);
  api.setMotor(motorId, std::sin(t) * 6.0f, 25.0f);
}
`;

    const res = executeUniversalScript(cppScript);
    expect(res.ok, res.error).toBe(true);
    expect(res.language).toBe('cpp');
    expect(res.entities.length).toBe(2);
    expect(res.joints.length).toBe(1);
    expect(res.stepCallback).not.toBeNull();

    let motorCmd = 0;
    const metrics: Record<string, number> = {};
    res.stepCallback?.(Math.PI / 2, {
      getState: () => ({ pos: [0, 1, 0], vel: [0, 0, 0], mass: 1 }),
      applyForce: () => {},
      applyImpulse: () => {},
      setMotor: (_jid: string, spd: number) => {
        motorCmd = spd;
      },
      logMetric: (k: string, v: number) => {
        metrics[k] = v;
      },
    });
    expect(motorCmd).toBeCloseTo(6.0, 4);
    expect(metrics.pin_D13).toBe(5.0);
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
