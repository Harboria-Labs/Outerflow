import { evaluate } from 'mathjs';
import type {
  DesignExperimentRun,
  EntityInspectionMetrics,
  ProjectParameter,
  StudioEntity,
  StudioJoint,
  TelemetrySample,
  Vec3,
} from '../../types/studio';
import { RapierPhysicsEngine } from '../physics/rapierEngine';

export type MaterialPresetKey = Exclude<
  NonNullable<StudioEntity['materialPreset']>,
  'custom'
>;

export const MATERIAL_DENSITY_PRESETS: Record<
  MaterialPresetKey,
  { label: string; density: number; color: string; metalness: number; roughness: number }
> = {
  steel: {
    label: 'Structural Steel (7800 kg/m³)',
    density: 7800,
    color: '#64748b',
    metalness: 0.75,
    roughness: 0.28,
  },
  aluminum: {
    label: '6061 Aluminum (2700 kg/m³)',
    density: 2700,
    color: '#94a3b8',
    metalness: 0.65,
    roughness: 0.32,
  },
  carbon: {
    label: 'Carbon Composite (1600 kg/m³)',
    density: 1600,
    color: '#334155',
    metalness: 0.35,
    roughness: 0.45,
  },
  plastic: {
    label: 'ABS Polymer (1050 kg/m³)',
    density: 1050,
    color: '#38bdf8',
    metalness: 0.15,
    roughness: 0.5,
  },
  wood: {
    label: 'Hardwood Oak (700 kg/m³)',
    density: 700,
    color: '#d97706',
    metalness: 0.1,
    roughness: 0.7,
  },
};

/**
 * Computes physical volume (m³) and surface area (m²) using studio scale
 * where 1 studio length unit = 0.1 m (100 mm = 1 dm), so Mass = Volume * Density.
 */
export function computeEntityVolumeAndArea(ent: StudioEntity): {
  volumeM3: number;
  surfaceAreaM2: number;
} {
  const sx = Math.max(0.05, Math.abs(ent.scale[0]));
  const sy = Math.max(0.05, Math.abs(ent.scale[1]));
  const sz = Math.max(0.05, Math.abs(ent.scale[2]));
  const w = Math.max(0.02, ent.size.width * sx);
  const h = Math.max(0.02, ent.size.height * sy);
  const d = Math.max(0.02, ent.size.depth * sz);
  const r = Math.max(0.02, ent.size.radius * Math.max(sx, sz));

  let volUnit3 = 1;
  let areaUnit2 = 6;

  switch (ent.shape) {
    case 'box': {
      volUnit3 = w * h * d;
      areaUnit2 = 2 * (w * h + w * d + h * d);
      break;
    }
    case 'sphere': {
      volUnit3 = (4 / 3) * Math.PI * r * r * r;
      areaUnit2 = 4 * Math.PI * r * r;
      break;
    }
    case 'cylinder': {
      volUnit3 = Math.PI * r * r * h;
      areaUnit2 = 2 * Math.PI * r * (r + h);
      break;
    }
    case 'capsule': {
      volUnit3 = Math.PI * r * r * h + (4 / 3) * Math.PI * r * r * r;
      areaUnit2 = 2 * Math.PI * r * h + 4 * Math.PI * r * r;
      break;
    }
    case 'cone': {
      const slant = Math.sqrt(h * h + r * r);
      volUnit3 = (1 / 3) * Math.PI * r * r * h;
      areaUnit2 = Math.PI * r * (r + slant);
      break;
    }
    case 'custom': {
      const mesh = ent.serializedMesh;
      if (mesh && mesh.positions.length >= 9) {
        const pos = mesh.positions;
        const idx = mesh.indices;
        let signedVol = 0;
        let surfArea = 0;

        const addTri = (ia: number, ib: number, ic: number) => {
          const ax = pos[ia * 3] * sx;
          const ay = pos[ia * 3 + 1] * sy;
          const az = pos[ia * 3 + 2] * sz;
          const bx = pos[ib * 3] * sx;
          const by = pos[ib * 3 + 1] * sy;
          const bz = pos[ib * 3 + 2] * sz;
          const cx = pos[ic * 3] * sx;
          const cy = pos[ic * 3 + 1] * sy;
          const cz = pos[ic * 3 + 2] * sz;

          const crossX = by * cz - bz * cy;
          const crossY = bz * cx - bx * cz;
          const crossZ = bx * cy - by * cx;
          signedVol += (ax * crossX + ay * crossY + az * crossZ) / 6;

          const ux = bx - ax;
          const uy = by - ay;
          const uz = bz - az;
          const vx = cx - ax;
          const vy = cy - ay;
          const vz = cz - az;
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          surfArea += 0.5 * Math.hypot(nx, ny, nz);
        };

        if (idx && idx.length >= 3) {
          for (let i = 0; i + 2 < idx.length; i += 3) {
            addTri(idx[i], idx[i + 1], idx[i + 2]);
          }
        } else {
          const vertCount = Math.floor(pos.length / 3);
          for (let i = 0; i + 2 < vertCount; i += 3) {
            addTri(i, i + 1, i + 2);
          }
        }
        volUnit3 = Math.max(0.01, Math.abs(signedVol));
        areaUnit2 = Math.max(0.05, surfArea);
      } else {
        volUnit3 = w * h * d;
        areaUnit2 = 2 * (w * h + w * d + h * d);
      }
      break;
    }
  }

  return {
    volumeM3: Number((volUnit3 * 0.001).toFixed(6)),
    surfaceAreaM2: Number((areaUnit2 * 0.01).toFixed(5)),
  };
}

export function syncEntityPhysicalMass(ent: StudioEntity): StudioEntity {
  const { volumeM3, surfaceAreaM2 } = computeEntityVolumeAndArea(ent);
  const density = ent.density && ent.density > 0 ? ent.density : undefined;
  const nextMass = density
    ? Number(Math.max(0.05, Math.min(5000, volumeM3 * density)).toFixed(3))
    : ent.physics.mass;

  return {
    ...ent,
    computedVolumeM3: volumeM3,
    computedAreaM2: surfaceAreaM2,
    physics: {
      ...ent.physics,
      mass: nextMass,
    },
  };
}

export function getDefaultParametersForPreset(
  presetId: string,
  entities: StudioEntity[],
  joints: StudioJoint[]
): ProjectParameter[] {
  if (presetId === 'suspension-rig') {
    const hub = entities.find((e) => e.id === 'susp-hub');
    const spring = joints.find((j) => j.id === 'susp-spring');
    const L = hub?.size.width ?? 1.8;
    const density = hub?.density ?? 7800;
    const k = spring?.stiffness ?? 160;
    const c = spring?.damping ?? 14;
    const vol = L * 0.55 * 0.9 * 0.001;
    const mass = vol * density;
    return [
      {
        id: 'arm_width',
        name: 'Hub Length',
        symbol: 'L',
        unit: 'dm (100mm)',
        value: L,
        min: 0.8,
        max: 3.2,
        step: 0.05,
        targetEntityId: 'susp-hub',
        targetField: 'size.width',
      },
      {
        id: 'hub_density',
        name: 'Hub Density',
        symbol: 'density',
        unit: 'kg/m³',
        value: density,
        min: 700,
        max: 12000,
        step: 100,
        targetEntityId: 'susp-hub',
        targetField: 'density',
      },
      {
        id: 'spring_k',
        name: 'Spring Stiffness',
        symbol: 'k',
        unit: 'N/m',
        value: k,
        min: 40,
        max: 450,
        step: 5,
        targetJointId: 'susp-spring',
        targetJointField: 'stiffness',
      },
      {
        id: 'damper_c',
        name: 'Damper Ratio',
        symbol: 'c',
        unit: 'N·s/m',
        value: c,
        min: 2,
        max: 50,
        step: 1,
        targetJointId: 'susp-spring',
        targetJointField: 'damping',
      },
      {
        id: 'hub_volume',
        name: 'Hub Volume',
        symbol: 'volume',
        unit: 'm³',
        value: vol,
        min: 0,
        max: 1,
        step: 0.0001,
        isCalculated: true,
        formula: 'L * 0.55 * 0.9 * 0.001',
      },
      {
        id: 'hub_mass',
        name: 'Mass = Vol × Density',
        symbol: 'mass',
        unit: 'kg',
        value: mass,
        min: 0.05,
        max: 500,
        step: 0.01,
        isCalculated: true,
        formula: 'volume * density',
        targetEntityId: 'susp-hub',
        targetField: 'physics.mass',
      },
      {
        id: 'nat_freq',
        name: 'Natural Frequency',
        symbol: 'fn',
        unit: 'Hz',
        value: Math.sqrt(k / Math.max(0.1, mass)) / (2 * Math.PI),
        min: 0,
        max: 50,
        step: 0.01,
        isCalculated: true,
        formula: 'sqrt(k / max(0.1, mass)) / (2 * pi)',
      },
    ];
  }

  if (presetId === 'catapult') {
    const beam = entities.find((e) => e.id === 'cat-arm');
    const cw = entities.find((e) => e.id === 'cat-counterweight');
    const beamL = beam?.size.width ?? 4.8;
    const cwS = cw?.size.width ?? 0.85;
    const density = cw?.density ?? 12000;
    const vol = cwS * 0.85 * 0.85 * 0.001;
    const mass = cw?.physics.mass ?? vol * density;
    return [
      {
        id: 'beam_length',
        name: 'Throwing Arm Length',
        symbol: 'beam_L',
        unit: 'dm',
        value: beamL,
        min: 2.8,
        max: 6.0,
        step: 0.1,
        targetEntityId: 'cat-arm',
        targetField: 'size.width',
      },
      {
        id: 'cw_size',
        name: 'Counterweight Width',
        symbol: 'cw_s',
        unit: 'dm',
        value: cwS,
        min: 0.5,
        max: 1.5,
        step: 0.05,
        targetEntityId: 'cat-counterweight',
        targetField: 'size.width',
      },
      {
        id: 'cw_density',
        name: 'CW Density',
        symbol: 'density',
        unit: 'kg/m³',
        value: density,
        min: 4000,
        max: 45000,
        step: 500,
        targetEntityId: 'cat-counterweight',
        targetField: 'density',
      },
      {
        id: 'cw_volume',
        name: 'CW Volume',
        symbol: 'volume',
        unit: 'm³',
        value: vol,
        min: 0,
        max: 1,
        step: 0.0001,
        isCalculated: true,
        formula: 'cw_s * 0.85 * 0.85 * 0.001',
      },
      {
        id: 'cw_mass',
        name: 'CW Mass = Vol × Density',
        symbol: 'mass',
        unit: 'kg',
        value: mass,
        min: 0.5,
        max: 500,
        step: 0.1,
        isCalculated: true,
        formula: 'volume * density',
        targetEntityId: 'cat-counterweight',
        targetField: 'physics.mass',
      },
    ];
  }

  if (presetId === 'doublePendulum') {
    const arm1 = entities.find((e) => e.id === 'dp-arm1');
    const bob = entities.find((e) => e.id === 'dp-bob');
    const l1 = arm1?.size.width ?? 2.0;
    const r = bob?.size.radius ?? 0.3;
    const density = bob?.density ?? 19000;
    const vol = (4 / 3) * Math.PI * r * r * r * 0.001;
    const mass = bob?.physics.mass ?? vol * density;
    return [
      {
        id: 'arm1_len',
        name: 'Upper Arm Length',
        symbol: 'L1',
        unit: 'dm',
        value: l1,
        min: 1.0,
        max: 3.2,
        step: 0.05,
        targetEntityId: 'dp-arm1',
        targetField: 'size.width',
      },
      {
        id: 'bob_radius',
        name: 'Bob Radius',
        symbol: 'R',
        unit: 'dm',
        value: r,
        min: 0.2,
        max: 0.7,
        step: 0.02,
        targetEntityId: 'dp-bob',
        targetField: 'size.radius',
      },
      {
        id: 'bob_density',
        name: 'Bob Density',
        symbol: 'density',
        unit: 'kg/m³',
        value: density,
        min: 2000,
        max: 22000,
        step: 250,
        targetEntityId: 'dp-bob',
        targetField: 'density',
      },
      {
        id: 'bob_volume',
        name: 'Bob Volume',
        symbol: 'volume',
        unit: 'm³',
        value: vol,
        min: 0,
        max: 1,
        step: 0.0001,
        isCalculated: true,
        formula: '(4/3) * pi * (R^3) * 0.001',
      },
      {
        id: 'bob_mass',
        name: 'Bob Mass = Vol × Density',
        symbol: 'mass',
        unit: 'kg',
        value: mass,
        min: 0.05,
        max: 500,
        step: 0.05,
        isCalculated: true,
        formula: 'volume * density',
        targetEntityId: 'dp-bob',
        targetField: 'physics.mass',
      },
    ];
  }

  if (presetId === 'robotArm') {
    const forearm = entities.find((e) => e.id === 'arm-forearm');
    const shoulder = joints.find((j) => j.id === 'arm-j-shoulder');
    const L = forearm?.size.width ?? 1.7;
    const density = forearm?.density ?? 9000;
    const omega = shoulder?.motorSpeed ?? 0.3;
    const vol = L * 0.28 * 0.28 * 0.001;
    const mass = forearm?.physics.mass ?? vol * density;
    return [
      {
        id: 'link_len',
        name: 'Forearm Length',
        symbol: 'L',
        unit: 'dm',
        value: L,
        min: 0.9,
        max: 3.0,
        step: 0.05,
        targetEntityId: 'arm-forearm',
        targetField: 'size.width',
      },
      {
        id: 'link_density',
        name: 'Alloy Density',
        symbol: 'density',
        unit: 'kg/m³',
        value: density,
        min: 1000,
        max: 12000,
        step: 200,
        targetEntityId: 'arm-forearm',
        targetField: 'density',
      },
      {
        id: 'servo_speed',
        name: 'Shoulder Motor Speed',
        symbol: 'omega',
        unit: 'rad/s',
        value: omega,
        min: -4.0,
        max: 4.0,
        step: 0.1,
        targetJointId: 'arm-j-shoulder',
        targetJointField: 'motorSpeed',
      },
      {
        id: 'link_volume',
        name: 'Link Volume',
        symbol: 'volume',
        unit: 'm³',
        value: vol,
        min: 0,
        max: 1,
        step: 0.0001,
        isCalculated: true,
        formula: 'L * 0.28 * 0.28 * 0.001',
      },
      {
        id: 'link_mass',
        name: 'Link Mass = Vol × Density',
        symbol: 'mass',
        unit: 'kg',
        value: mass,
        min: 0.05,
        max: 200,
        step: 0.02,
        isCalculated: true,
        formula: 'volume * density',
        targetEntityId: 'arm-forearm',
        targetField: 'physics.mass',
      },
      {
        id: 'tip_speed',
        name: 'Est. Tip Linear Speed',
        symbol: 'v_tip',
        unit: 'dm/s',
        value: Math.abs(omega) * L,
        min: 0,
        max: 20,
        step: 0.01,
        isCalculated: true,
        formula: 'abs(omega) * L',
      },
    ];
  }

  // Generic linked parameters for any preset using the first dynamic entity
  const primary = entities.find((e) => e.bodyType === 'dynamic') ?? entities[0];
  if (!primary) return [];
  const initDensity = primary.density ?? 2700;
  const initW = primary.size.width;
  const initH = primary.size.height;
  const initD = primary.size.depth;
  const initVol = computeEntityVolumeAndArea(primary).volumeM3;

  return [
    {
      id: 'gen_width',
      name: `${primary.name} Width`,
      symbol: 'L',
      unit: 'dm',
      value: initW,
      min: 0.2,
      max: Math.max(4.0, initW * 2.5),
      step: 0.05,
      targetEntityId: primary.id,
      targetField: 'size.width',
    },
    {
      id: 'gen_density',
      name: `${primary.name} Density`,
      symbol: 'density',
      unit: 'kg/m³',
      value: initDensity,
      min: 500,
      max: 12000,
      step: 100,
      targetEntityId: primary.id,
      targetField: 'density',
    },
    {
      id: 'gen_volume',
      name: 'Volume',
      symbol: 'volume',
      unit: 'm³',
      value: initVol,
      min: 0,
      max: 10,
      step: 0.0001,
      isCalculated: true,
      formula: `L * ${initH.toFixed(3)} * ${initD.toFixed(3)} * 0.001`,
    },
    {
      id: 'gen_mass',
      name: 'Mass = Vol × Density',
      symbol: 'mass',
      unit: 'kg',
      value: initVol * initDensity,
      min: 0.05,
      max: 500,
      step: 0.05,
      isCalculated: true,
      formula: 'volume * density',
      targetEntityId: primary.id,
      targetField: 'physics.mass',
    },
  ];
}

function applyFieldToEntity(
  ent: StudioEntity,
  field: NonNullable<ProjectParameter['targetField']>,
  value: number
): StudioEntity {
  switch (field) {
    case 'size.width':
      return { ...ent, size: { ...ent.size, width: Math.max(0.05, value) } };
    case 'size.height':
      return { ...ent, size: { ...ent.size, height: Math.max(0.05, value) } };
    case 'size.depth':
      return { ...ent, size: { ...ent.size, depth: Math.max(0.05, value) } };
    case 'size.radius':
      return { ...ent, size: { ...ent.size, radius: Math.max(0.05, value) } };
    case 'density':
      return {
        ...ent,
        density: Math.max(10, value),
        materialPreset: ent.materialPreset === 'custom' || !ent.materialPreset ? 'custom' : ent.materialPreset,
      };
    case 'physics.mass':
      return {
        ...ent,
        physics: { ...ent.physics, mass: Number(Math.max(0.05, Math.min(5000, value)).toFixed(3)) },
      };
    case 'physics.restitution':
      return {
        ...ent,
        physics: { ...ent.physics, restitution: Math.max(0, Math.min(1, value)) },
      };
    case 'position.y':
      return {
        ...ent,
        position: [ent.position[0], value, ent.position[2]],
      };
  }
}

export function evaluateProjectParameters(
  parameters: ProjectParameter[],
  entities: StudioEntity[],
  joints: StudioJoint[]
): {
  parameters: ProjectParameter[];
  entities: StudioEntity[];
  joints: StudioJoint[];
} {
  let nextEntities = entities.map((e) => ({
    ...e,
    size: { ...e.size },
    physics: { ...e.physics },
  }));
  const nextJoints = joints.map((j) => ({ ...j }));
  const nextParams = parameters.map((p) => ({ ...p }));

  // Pass 1: apply direct (non-calculated) input parameters
  for (const p of nextParams) {
    if (p.isCalculated) continue;
    if (p.targetEntityId && p.targetField) {
      nextEntities = nextEntities.map((e) =>
        e.id === p.targetEntityId ? applyFieldToEntity(e, p.targetField!, p.value) : e
      );
    }
    if (p.targetJointId && p.targetJointField) {
      const idx = nextJoints.findIndex((j) => j.id === p.targetJointId);
      if (idx !== -1) {
        nextJoints[idx] = { ...nextJoints[idx], [p.targetJointField]: p.value };
      }
    }
  }

  // Recompute exact geometry volume & surface area for all entities
  nextEntities = nextEntities.map((e) => syncEntityPhysicalMass(e));

  // Build scope from parameter symbols
  const scope: Record<string, number> = {};
  for (const p of nextParams) {
    if (p.symbol && Number.isFinite(p.value)) {
      scope[p.symbol] = p.value;
    }
  }

  // Pass 2: evaluate calculated formula parameters sequentially (supports chained equations like volume -> mass -> fn)
  for (const p of nextParams) {
    if (!p.isCalculated || !p.formula) {
      if (p.symbol) scope[p.symbol] = p.value;
      continue;
    }
    try {
      const raw = Number(evaluate(p.formula, { ...scope }));
      if (Number.isFinite(raw)) {
        p.value = Number(raw.toFixed(6));
        if (p.symbol) scope[p.symbol] = p.value;
        if (p.targetEntityId && p.targetField) {
          nextEntities = nextEntities.map((e) =>
            e.id === p.targetEntityId ? applyFieldToEntity(e, p.targetField!, p.value) : e
          );
        }
        if (p.targetJointId && p.targetJointField) {
          const idx = nextJoints.findIndex((j) => j.id === p.targetJointId);
          if (idx !== -1) {
            nextJoints[idx] = { ...nextJoints[idx], [p.targetJointField]: p.value };
          }
        }
      }
    } catch {
      // Preserve last valid numeric value if formula is mid-edit
    }
  }

  return {
    parameters: nextParams,
    entities: nextEntities,
    joints: nextJoints,
  };
}

export async function runDesignVariantExperiment(opts: {
  label: string;
  color: string;
  entities: StudioEntity[];
  joints: StudioJoint[];
  gravity: Vec3;
  parameters: ProjectParameter[];
  durationSec?: number;
}): Promise<DesignExperimentRun> {
  const durationSec = Math.max(0.5, Math.min(8.0, opts.durationSec ?? 3.0));
  const evaluated = evaluateProjectParameters(opts.parameters, opts.entities, opts.joints);
  const engine = new RapierPhysicsEngine();
  await engine.rebuild(evaluated.entities, evaluated.joints, opts.gravity);

  const tracked =
    evaluated.entities.find((e) => e.bodyType === 'dynamic') ?? evaluated.entities[0] ?? null;
  const initPos = tracked ? [...tracked.position] : [0, 0, 0];

  const totalSteps = Math.round(durationSec * 60);
  const samples: TelemetrySample[] = [];
  let peakSpeed = 0;
  let peakKineticEnergy = 0;
  let maxDisplacement = 0;
  let finalPosY = initPos[1];

  for (let i = 0; i < totalSteps; i++) {
    engine.step(1 / 60);
    if (i % 3 === 0 || i === totalSteps - 1) {
      const sample = engine.computeTelemetry(tracked?.id ?? null);
      samples.push(sample);
      if (sample.selectedSpeed > peakSpeed) peakSpeed = sample.selectedSpeed;
      if (sample.kineticEnergy > peakKineticEnergy) peakKineticEnergy = sample.kineticEnergy;
      finalPosY = sample.selectedPosY;

      if (tracked) {
        const tr = engine.getBodyTransform(tracked.id);
        if (tr) {
          const disp = Math.hypot(
            tr.position[0] - initPos[0],
            tr.position[1] - initPos[1],
            tr.position[2] - initPos[2]
          );
          if (disp > maxDisplacement) maxDisplacement = disp;
          finalPosY = tr.position[1];
        }
      }
    }
  }

  engine.dispose();

  const totalMassKg = evaluated.entities
    .filter((e) => e.bodyType === 'dynamic')
    .reduce((acc, e) => acc + e.physics.mass, 0);

  const parameterSnapshot: Record<string, number> = {};
  for (const p of evaluated.parameters) {
    parameterSnapshot[p.symbol || p.name] = Number(p.value.toFixed(4));
  }

  return {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: opts.label,
    color: opts.color,
    createdAt: new Date().toISOString(),
    durationSec,
    parameterSnapshot,
    summaryMetrics: {
      peakSpeed: Number(peakSpeed.toFixed(3)),
      peakKineticEnergy: Number(peakKineticEnergy.toFixed(3)),
      maxDisplacement: Number(maxDisplacement.toFixed(3)),
      finalPosY: Number(finalPosY.toFixed(3)),
      totalMassKg: Number(totalMassKg.toFixed(3)),
    },
    samples,
  };
}

function approxBoundingRadius(ent: StudioEntity): number {
  if (ent.shape === 'sphere' || ent.shape === 'cylinder' || ent.shape === 'capsule' || ent.shape === 'cone') {
    return ent.size.radius * Math.max(Math.abs(ent.scale[0]), Math.abs(ent.scale[2]));
  }
  const hx = ent.size.width * Math.abs(ent.scale[0]) * 0.5;
  const hy = ent.size.height * Math.abs(ent.scale[1]) * 0.5;
  const hz = ent.size.depth * Math.abs(ent.scale[2]) * 0.5;
  return Math.max(0.05, Math.min(hx, hy, hz));
}

export function inspectEntities(
  entities: StudioEntity[],
  selectedId: string | null,
  targetId: string | null
): EntityInspectionMetrics | null {
  const entA = entities.find((e) => e.id === selectedId);
  if (!entA) return null;

  const { volumeM3, surfaceAreaM2 } = computeEntityVolumeAndArea(entA);
  const densityKgM3 =
    entA.density && entA.density > 0
      ? entA.density
      : Number((entA.physics.mass / Math.max(1e-6, volumeM3)).toFixed(1));

  const entB = targetId && targetId !== selectedId ? entities.find((e) => e.id === targetId) : null;
  if (!entB) {
    return {
      volumeM3,
      surfaceAreaM2,
      densityKgM3,
      massKg: entA.physics.mass,
      centerToCenterDist: null,
      surfaceGapDist: null,
      elevationAngleDeg: null,
    };
  }

  const dx = entB.position[0] - entA.position[0];
  const dy = entB.position[1] - entA.position[1];
  const dz = entB.position[2] - entA.position[2];
  const centerToCenterDist = Math.hypot(dx, dy, dz);
  const surfaceGapDist = Math.max(
    0,
    centerToCenterDist - approxBoundingRadius(entA) - approxBoundingRadius(entB)
  );
  const horiz = Math.hypot(dx, dz);
  const elevationAngleDeg = (Math.atan2(dy, Math.max(1e-6, horiz)) * 180) / Math.PI;

  return {
    volumeM3,
    surfaceAreaM2,
    densityKgM3,
    massKg: entA.physics.mass,
    centerToCenterDist: Number(centerToCenterDist.toFixed(4)),
    surfaceGapDist: Number(surfaceGapDist.toFixed(4)),
    elevationAngleDeg: Number(elevationAngleDeg.toFixed(2)),
  };
}
