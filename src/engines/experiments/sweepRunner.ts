import type {
  StudioEntity,
  StudioJoint,
  SweepConfig,
  SweepTemplateId,
  SweepTrialResult,
} from '../../types/studio';
import { RapierPhysicsEngine, ensureRapier } from '../physics/rapierEngine';

export interface SweepTemplateMeta {
  id: SweepTemplateId;
  name: string;
  description: string;
  paramName: string;
  defaultMin: number;
  defaultMax: number;
  defaultSteps: number;
  defaultDuration: number;
}

export const SWEEP_TEMPLATES: SweepTemplateMeta[] = [
  {
    id: 'projectileAngle',
    name: 'Projectile Launch Angle Sweep',
    description: 'Launch sphere at v = 13 m/s across angles and measure range & apex height',
    paramName: 'Launch Angle (°)',
    defaultMin: 15,
    defaultMax: 75,
    defaultSteps: 9,
    defaultDuration: 3.2,
  },
  {
    id: 'restitutionBounce',
    name: 'Restitution Coefficient Sweep',
    description: 'Drop sphere from y = 4.0 m and measure first rebound peak & energy retention',
    paramName: 'Restitution (e)',
    defaultMin: 0.1,
    defaultMax: 0.95,
    defaultSteps: 9,
    defaultDuration: 2.2,
  },
  {
    id: 'springStiffness',
    name: 'Spring Stiffness Sweep',
    description: 'Suspend 2 kg mass on spring and measure peak speed & minimum height',
    paramName: 'Stiffness k (N/m)',
    defaultMin: 12,
    defaultMax: 96,
    defaultSteps: 8,
    defaultDuration: 2.5,
  },
  {
    id: 'catapultCounterweight',
    name: 'Catapult Counterweight Sweep',
    description: 'Vary counterweight mass and measure horizontal projectile throw distance',
    paramName: 'Counterweight (kg)',
    defaultMin: 8,
    defaultMax: 40,
    defaultSteps: 8,
    defaultDuration: 2.5,
  },
];

function makeBaseEntity(
  partial: Partial<StudioEntity> & { id: string; shape: StudioEntity['shape'] }
): StudioEntity {
  return {
    name: partial.id,
    category: 'physics',
    bodyType: 'dynamic',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    size: { width: 1, height: 1, depth: 1, radius: 0.5 },
    color: '#22d3ee',
    metalness: 0.3,
    roughness: 0.4,
    opacity: 1,
    visible: true,
    ...partial,
    physics: {
      mass: 1,
      friction: 0.4,
      restitution: 0.3,
      linearDamping: 0,
      angularDamping: 0,
      initialVelocity: [0, 0, 0],
      ...(partial.physics ?? {}),
    },
  };
}

export async function runSingleSweepTrial(
  config: SweepConfig,
  trialIndex: number,
  paramValue: number
): Promise<SweepTrialResult> {
  const engine = new RapierPhysicsEngine();
  const dt = 1 / 60;
  const totalSteps = Math.max(10, Math.round(config.durationSec / dt));
  const meta = SWEEP_TEMPLATES.find((t) => t.id === config.templateId)!;

  let entities: StudioEntity[] = [];
  let joints: StudioJoint[] = [];
  let targetId = '';

  if (config.templateId === 'projectileAngle') {
    const rad = (paramValue * Math.PI) / 180;
    const v0 = 13.0;
    targetId = 'proj';
    entities = [
      makeBaseEntity({
        id: targetId,
        shape: 'sphere',
        position: [0, 0.5, 0],
        size: { width: 0.6, height: 0.6, depth: 0.6, radius: 0.3 },
        physics: {
          mass: 1,
          friction: 0.4,
          restitution: 0.1,
          linearDamping: 0,
          angularDamping: 0,
          initialVelocity: [v0 * Math.cos(rad), v0 * Math.sin(rad), 0],
        },
      }),
    ];
  } else if (config.templateId === 'restitutionBounce') {
    targetId = 'ball';
    entities = [
      makeBaseEntity({
        id: targetId,
        shape: 'sphere',
        position: [0, 4.0, 0],
        size: { width: 0.8, height: 0.8, depth: 0.8, radius: 0.4 },
        physics: {
          mass: 1,
          friction: 0.2,
          restitution: paramValue,
          linearDamping: 0,
          angularDamping: 0,
          initialVelocity: [0, 0, 0],
        },
      }),
    ];
  } else if (config.templateId === 'springStiffness') {
    targetId = 'mass';
    entities = [
      makeBaseEntity({
        id: 'anchor',
        shape: 'box',
        bodyType: 'fixed',
        position: [0, 6.0, 0],
        size: { width: 1, height: 0.3, depth: 1, radius: 0.2 },
      }),
      makeBaseEntity({
        id: targetId,
        shape: 'sphere',
        position: [0, 2.8, 0],
        size: { width: 0.8, height: 0.8, depth: 0.8, radius: 0.4 },
        physics: {
          mass: 2,
          friction: 0.2,
          restitution: 0.2,
          linearDamping: 0.02,
          angularDamping: 0.02,
          initialVelocity: [0, 0, 0],
        },
      }),
    ];
    joints = [
      {
        id: 'sp1',
        name: 'Spring',
        kind: 'spring',
        bodyA: 'anchor',
        bodyB: targetId,
        anchorA: [0, 0, 0],
        anchorB: [0, 0, 0],
        axis: [0, 1, 0],
        motorSpeed: 0,
        motorMaxForce: 0,
        stiffness: paramValue,
        damping: 0.35,
        restLength: 2.0,
      },
    ];
  } else {
    targetId = 'payload';
    entities = [
      makeBaseEntity({
        id: 'base',
        shape: 'box',
        bodyType: 'fixed',
        position: [-2.0, 0.75, 0],
        size: { width: 1.0, height: 1.5, depth: 1.2, radius: 0.4 },
      }),
      makeBaseEntity({
        id: 'arm',
        shape: 'box',
        position: [-1.2, 1.7, 0],
        rotation: [0, 0, 0.25],
        size: { width: 4.8, height: 0.2, depth: 0.45, radius: 0.2 },
        physics: {
          mass: 2.0,
          friction: 0.4,
          restitution: 0.2,
          linearDamping: 0.01,
          angularDamping: 0.01,
          initialVelocity: [0, 0, 0],
        },
      }),
      makeBaseEntity({
        id: 'cw',
        shape: 'box',
        position: [-3.4, 1.35, 0],
        size: { width: 0.85, height: 0.85, depth: 0.85, radius: 0.4 },
        physics: {
          mass: paramValue,
          friction: 0.5,
          restitution: 0.1,
          linearDamping: 0.01,
          angularDamping: 0.01,
          initialVelocity: [0, 0, 0],
        },
      }),
      makeBaseEntity({
        id: targetId,
        shape: 'sphere',
        position: [1.0, 2.55, 0],
        size: { width: 0.7, height: 0.7, depth: 0.7, radius: 0.35 },
        physics: {
          mass: 1.1,
          friction: 0.3,
          restitution: 0.4,
          linearDamping: 0,
          angularDamping: 0.01,
          initialVelocity: [0, 0, 0],
        },
      }),
    ];
    joints = [
      {
        id: 'j1',
        name: 'Fulcrum',
        kind: 'revolute',
        bodyA: 'base',
        bodyB: 'arm',
        anchorA: [0, 0.95, 0],
        anchorB: [-0.8, 0, 0],
        axis: [0, 0, 1],
        motorSpeed: 0,
        motorMaxForce: 0,
        stiffness: 0,
        damping: 0,
        restLength: 0,
      },
      {
        id: 'j2',
        name: 'CW Hinge',
        kind: 'revolute',
        bodyA: 'arm',
        bodyB: 'cw',
        anchorA: [-2.2, 0, 0],
        anchorB: [0, 0.55, 0],
        axis: [0, 0, 1],
        motorSpeed: 0,
        motorMaxForce: 0,
        stiffness: 0,
        damping: 0,
        restLength: 0,
      },
    ];
  }

  await engine.rebuild(entities, joints, [0, -9.81, 0]);

  let peakHeight = 0;
  let maxX = -Infinity;
  let firstBouncePeak = 0;
  let bounced = false;
  let prevVy = 0;
  let maxSpeed = 0;
  let minHeight = Infinity;
  let firstImpactX = 0;
  let impacted = false;

  for (let s = 0; s < totalSteps; s++) {
    engine.step(dt);
    const body = engine.getBody(targetId);
    if (!body) continue;
    const p = body.translation();
    const v = body.linvel();
    const spd = Math.hypot(v.x, v.y, v.z);

    if (p.y > peakHeight) peakHeight = p.y;
    if (p.y < minHeight) minHeight = p.y;
    if (p.x > maxX) maxX = p.x;
    if (spd > maxSpeed) maxSpeed = spd;

    if (config.templateId === 'projectileAngle' && !impacted && s > 4 && p.y <= 0.34) {
      impacted = true;
      firstImpactX = p.x;
    }

    if (config.templateId === 'restitutionBounce') {
      if (!bounced && prevVy < -0.5 && v.y > 0.1) {
        bounced = true;
      }
      if (bounced && p.y > firstBouncePeak) {
        firstBouncePeak = p.y;
      }
    }
    prevVy = v.y;
  }

  const telemetry = engine.computeTelemetry(targetId);
  engine.dispose();

  if (config.templateId === 'projectileAngle') {
    return {
      trialIndex,
      paramName: meta.paramName,
      paramValue: Number(paramValue.toFixed(3)),
      primaryMetricName: 'Range X (m)',
      primaryMetricValue: Number((impacted ? firstImpactX : maxX).toFixed(3)),
      secondaryMetricName: 'Apex Y (m)',
      secondaryMetricValue: Number(peakHeight.toFixed(3)),
      peakHeight: Number(peakHeight.toFixed(3)),
      finalEnergy: Number(telemetry.totalEnergy.toFixed(3)),
    };
  }

  if (config.templateId === 'restitutionBounce') {
    return {
      trialIndex,
      paramName: meta.paramName,
      paramValue: Number(paramValue.toFixed(3)),
      primaryMetricName: 'Rebound Height (m)',
      primaryMetricValue: Number(firstBouncePeak.toFixed(3)),
      secondaryMetricName: 'Peak Speed (m/s)',
      secondaryMetricValue: Number(maxSpeed.toFixed(3)),
      peakHeight: Number(firstBouncePeak.toFixed(3)),
      finalEnergy: Number(telemetry.totalEnergy.toFixed(3)),
    };
  }

  if (config.templateId === 'springStiffness') {
    return {
      trialIndex,
      paramName: meta.paramName,
      paramValue: Number(paramValue.toFixed(3)),
      primaryMetricName: 'Peak Speed (m/s)',
      primaryMetricValue: Number(maxSpeed.toFixed(3)),
      secondaryMetricName: 'Min Height (m)',
      secondaryMetricValue: Number(minHeight.toFixed(3)),
      peakHeight: Number(peakHeight.toFixed(3)),
      finalEnergy: Number(telemetry.totalEnergy.toFixed(3)),
    };
  }

  return {
    trialIndex,
    paramName: meta.paramName,
    paramValue: Number(paramValue.toFixed(3)),
    primaryMetricName: 'Throw Distance (m)',
    primaryMetricValue: Number((maxX - 1.0).toFixed(3)),
    secondaryMetricName: 'Peak Altitude (m)',
    secondaryMetricValue: Number(peakHeight.toFixed(3)),
    peakHeight: Number(peakHeight.toFixed(3)),
    finalEnergy: Number(telemetry.totalEnergy.toFixed(3)),
  };
}

export async function runParameterSweep(
  config: SweepConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<SweepTrialResult[]> {
  await ensureRapier();
  const steps = Math.max(2, Math.min(25, Math.round(config.steps)));
  const results: SweepTrialResult[] = [];

  for (let i = 0; i < steps; i++) {
    const frac = steps === 1 ? 0 : i / (steps - 1);
    const val = config.paramMin + (config.paramMax - config.paramMin) * frac;
    const trial = await runSingleSweepTrial(config, i, val);
    results.push(trial);
    if (onProgress) onProgress(i + 1, steps);
    // Yield briefly so UI remains responsive in browser
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
