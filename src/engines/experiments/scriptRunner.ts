import type {
  BodyType,
  JointKind,
  StudioEntity,
  StudioJoint,
  Vec3,
} from '../../types/studio';

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'projectile',
    name: 'Projectile Trajectory Lab',
    description: 'Launches an instrumented sphere at 45° and tracks altitude & horizontal range',
    code: `// Outerflow Experiment Script: Projectile Trajectory Lab
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

const angleDeg = 45;
const speed = 13.5;
const rad = angleDeg * Math.PI / 180;

// Launch platform & target ring
outerflow.spawnBox({
  id: 'pad', name: 'Launch Pad', bodyType: 'fixed',
  pos: [-7, 0.25, 0], size: [2, 0.5, 2], color: '#475569'
});
outerflow.spawnBox({
  id: 'target', name: 'Landing Marker', bodyType: 'fixed',
  pos: [11, 0.1, 0], size: [2.5, 0.2, 2.5], color: '#34d399'
});

const proj = outerflow.spawnSphere({
  id: 'proj', name: 'Instrumented Probe', bodyType: 'dynamic',
  pos: [-7, 1.0, 0], radius: 0.4, mass: 1.5, restitution: 0.55,
  velocity: [speed * Math.cos(rad), speed * Math.sin(rad), 0],
  color: '#22d3ee'
});

outerflow.print('Launched projectile at ' + angleDeg + ' deg, v=' + speed + ' m/s');

outerflow.onStep((t, api) => {
  const state = api.getState(proj);
  if (!state) return;
  api.logMetric('rangeX', state.pos[0] + 7);
  api.logMetric('altitudeY', state.pos[1]);
});
`,
  },
  {
    id: 'springOscillator',
    name: 'Harmonic Spring Oscillator',
    description: 'Vertical mass-spring-damper rig logging displacement & phase velocity',
    code: `// Outerflow Experiment Script: Harmonic Spring Oscillator
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

const anchor = outerflow.spawnBox({
  id: 'anchor', name: 'Rig Crossbar', bodyType: 'fixed',
  pos: [0, 6.0, 0], size: [2.4, 0.3, 0.8], color: '#64748b'
});

const mass = outerflow.spawnSphere({
  id: 'oscMass', name: 'Oscillating Mass', bodyType: 'dynamic',
  pos: [0, 2.4, 0], radius: 0.55, mass: 2.0, color: '#f59e0b'
});

outerflow.addJoint({
  id: 'spring-1', name: 'Primary Coil Spring', kind: 'spring',
  bodyA: anchor, bodyB: mass,
  anchorA: [0, -0.15, 0], anchorB: [0, 0.55, 0],
  stiffness: 42, damping: 0.45, restLength: 2.2
});

outerflow.print('Spring k=42 N/m, restLength=2.2m initialized.');

outerflow.onStep((t, api) => {
  const st = api.getState(mass);
  if (!st) return;
  api.logMetric('displacementY', st.pos[1] - 3.25);
  api.logMetric('speed', Math.hypot(st.vel[0], st.vel[1], st.vel[2]));
});
`,
  },
  {
    id: 'spiralTower',
    name: 'Helical Tower Demolition',
    description: 'Procedurally builds a spiral architectural column and fires a kinetic sphere',
    code: `// Outerflow Experiment Script: Procedural Helical Tower
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

const layers = 10;
const blocksPerLayer = 6;
const radius = 1.65;

for (let y = 0; y < layers; y++) {
  const twist = y * 0.25;
  for (let i = 0; i < blocksPerLayer; i++) {
    const a = (i / blocksPerLayer) * Math.PI * 2 + twist;
    outerflow.spawnBox({
      name: 'Brick ' + y + '-' + i,
      pos: [Math.cos(a) * radius, 0.35 + y * 0.65, Math.sin(a) * radius],
      rot: [0, -a, 0],
      size: [0.55, 0.62, 1.1],
      mass: 0.85,
      color: y % 2 === 0 ? '#38bdf8' : '#818cf8'
    });
  }
}

const wrecking = outerflow.spawnSphere({
  id: 'impactor', name: 'Kinetic Impactor', radius: 0.75, mass: 18,
  pos: [-7.5, 3.0, 0], velocity: [14, 1.5, 0], color: '#fb7185'
});

outerflow.print('Generated ' + (layers * blocksPerLayer) + ' procedural bricks + kinetic impactor.');

outerflow.onStep((t, api) => {
  const s = api.getState(wrecking);
  if (s) api.logMetric('impactorSpeed', Math.hypot(s.vel[0], s.vel[1], s.vel[2]));
});
`,
  },
  {
    id: 'orbitalCapture',
    name: 'Central Gravity Capture',
    description: 'Zero-G sandbox with custom inverse-square central attractor force in onStep',
    code: `// Outerflow Experiment Script: Custom Inverse-Square Force Field
outerflow.clear();
outerflow.setGravity(0, 0, 0);

const core = outerflow.spawnSphere({
  id: 'star', name: 'Attractor Core', bodyType: 'fixed',
  pos: [0, 3.0, 0], radius: 0.7, color: '#f59e0b'
});

const probes = [
  outerflow.spawnSphere({ name: 'Orbiter A', pos: [3.2, 3.0, 0], radius: 0.28, mass: 1.0, velocity: [0, 0, 4.4], color: '#22d3ee' }),
  outerflow.spawnSphere({ name: 'Orbiter B', pos: [-4.6, 3.0, 0], radius: 0.32, mass: 1.4, velocity: [0, 1.2, -3.5], color: '#34d399' }),
  outerflow.spawnSphere({ name: 'Orbiter C', pos: [0, 3.0, 4.0], radius: 0.25, mass: 0.8, velocity: [-4.0, -0.8, 0], color: '#a78bfa' }),
];

outerflow.print('Zero-G orbital capture active with GM = 65.');

outerflow.onStep((t, api) => {
  const GM = 65;
  for (const id of probes) {
    const st = api.getState(id);
    if (!st) continue;
    const dx = 0 - st.pos[0];
    const dy = 3.0 - st.pos[1];
    const dz = 0 - st.pos[2];
    const r2 = dx*dx + dy*dy + dz*dz + 0.35;
    const r = Math.sqrt(r2);
    const f = (GM * st.mass) / r2;
    api.applyForce(id, [f * dx / r, f * dy / r, f * dz / r]);
    if (id === probes[0]) {
      api.logMetric('orbitRadiusA', r);
    }
  }
});
`,
  },
];

export interface SpawnBoxOpts {
  id?: string;
  name?: string;
  bodyType?: BodyType;
  pos?: Vec3;
  rot?: Vec3;
  size?: Vec3;
  mass?: number;
  restitution?: number;
  friction?: number;
  velocity?: Vec3;
  color?: string;
}

export interface SpawnSphereOpts {
  id?: string;
  name?: string;
  bodyType?: BodyType;
  pos?: Vec3;
  radius?: number;
  mass?: number;
  restitution?: number;
  friction?: number;
  velocity?: Vec3;
  color?: string;
}

export interface SpawnCylinderOpts {
  id?: string;
  name?: string;
  bodyType?: BodyType;
  pos?: Vec3;
  rot?: Vec3;
  radius?: number;
  height?: number;
  mass?: number;
  restitution?: number;
  friction?: number;
  velocity?: Vec3;
  color?: string;
}

export interface AddJointOpts {
  id?: string;
  name?: string;
  kind: JointKind;
  bodyA: string;
  bodyB: string;
  anchorA?: Vec3;
  anchorB?: Vec3;
  axis?: Vec3;
  motorSpeed?: number;
  motorMaxForce?: number;
  stiffness?: number;
  damping?: number;
  restLength?: number;
}

export interface StepRuntimeApi {
  getState: (
    entityId: string
  ) => { pos: Vec3; vel: Vec3; mass: number } | null;
  applyImpulse: (entityId: string, impulse: Vec3) => void;
  applyForce: (entityId: string, force: Vec3) => void;
  logMetric: (name: string, value: number) => void;
}

export interface ScriptExecutionResult {
  ok: boolean;
  error?: string;
  entities: StudioEntity[];
  joints: StudioJoint[];
  gravity: Vec3;
  logs: string[];
  stepCallback: ((t: number, api: StepRuntimeApi) => void) | null;
}

export function executeExperimentScript(code: string): ScriptExecutionResult {
  const entities: StudioEntity[] = [];
  const joints: StudioJoint[] = [];
  const logs: string[] = [];
  let gravity: Vec3 = [0, -9.81, 0];
  let stepCallback: ((t: number, api: StepRuntimeApi) => void) | null = null;
  let counter = 0;

  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const outerflow = {
    clear() {
      entities.length = 0;
      joints.length = 0;
    },
    setGravity(x: number, y: number, z: number) {
      gravity = [Number(x) || 0, Number(y) || 0, Number(z) || 0];
    },
    spawnBox(opts: SpawnBoxOpts = {}): string {
      const id = opts.id || nextId('script-box');
      const sz = opts.size ?? [1, 1, 1];
      entities.push({
        id,
        name: opts.name ?? id,
        category: 'physics',
        shape: 'box',
        bodyType: opts.bodyType ?? 'dynamic',
        position: opts.pos ?? [0, 1, 0],
        rotation: opts.rot ?? [0, 0, 0],
        scale: [1, 1, 1],
        size: { width: sz[0], height: sz[1], depth: sz[2], radius: 0.5 },
        color: opts.color ?? '#38bdf8',
        metalness: 0.25,
        roughness: 0.4,
        opacity: 1,
        visible: true,
        physics: {
          mass: opts.mass ?? 1,
          friction: opts.friction ?? 0.5,
          restitution: opts.restitution ?? 0.3,
          linearDamping: 0.01,
          angularDamping: 0.02,
          initialVelocity: opts.velocity ?? [0, 0, 0],
        },
      });
      return id;
    },
    spawnSphere(opts: SpawnSphereOpts = {}): string {
      const id = opts.id || nextId('script-sphere');
      const r = opts.radius ?? 0.5;
      entities.push({
        id,
        name: opts.name ?? id,
        category: 'physics',
        shape: 'sphere',
        bodyType: opts.bodyType ?? 'dynamic',
        position: opts.pos ?? [0, 1.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        size: { width: r * 2, height: r * 2, depth: r * 2, radius: r },
        color: opts.color ?? '#22d3ee',
        metalness: 0.35,
        roughness: 0.3,
        opacity: 1,
        visible: true,
        physics: {
          mass: opts.mass ?? 1,
          friction: opts.friction ?? 0.4,
          restitution: opts.restitution ?? 0.45,
          linearDamping: 0.01,
          angularDamping: 0.02,
          initialVelocity: opts.velocity ?? [0, 0, 0],
        },
      });
      return id;
    },
    spawnCylinder(opts: SpawnCylinderOpts = {}): string {
      const id = opts.id || nextId('script-cyl');
      const r = opts.radius ?? 0.5;
      const h = opts.height ?? 1.0;
      entities.push({
        id,
        name: opts.name ?? id,
        category: 'physics',
        shape: 'cylinder',
        bodyType: opts.bodyType ?? 'dynamic',
        position: opts.pos ?? [0, 1, 0],
        rotation: opts.rot ?? [0, 0, 0],
        scale: [1, 1, 1],
        size: { width: r * 2, height: h, depth: r * 2, radius: r },
        color: opts.color ?? '#a78bfa',
        metalness: 0.3,
        roughness: 0.35,
        opacity: 1,
        visible: true,
        physics: {
          mass: opts.mass ?? 1,
          friction: opts.friction ?? 0.5,
          restitution: opts.restitution ?? 0.3,
          linearDamping: 0.01,
          angularDamping: 0.02,
          initialVelocity: opts.velocity ?? [0, 0, 0],
        },
      });
      return id;
    },
    addJoint(opts: AddJointOpts): string {
      const id = opts.id || nextId('script-joint');
      joints.push({
        id,
        name: opts.name ?? id,
        kind: opts.kind,
        bodyA: opts.bodyA,
        bodyB: opts.bodyB,
        anchorA: opts.anchorA ?? [0, 0, 0],
        anchorB: opts.anchorB ?? [0, 0, 0],
        axis: opts.axis ?? [0, 0, 1],
        motorSpeed: opts.motorSpeed ?? 0,
        motorMaxForce: opts.motorMaxForce ?? 0,
        stiffness: opts.stiffness ?? 30,
        damping: opts.damping ?? 0.5,
        restLength: opts.restLength ?? 1.5,
      });
      return id;
    },
    onStep(fn: (t: number, api: StepRuntimeApi) => void) {
      if (typeof fn === 'function') {
        stepCallback = fn;
      }
    },
    print(...args: unknown[]) {
      logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    },
  };

  try {
    const fn = new Function('outerflow', 'Math', code);
    fn(outerflow, Math);
    return {
      ok: true,
      entities,
      joints,
      gravity,
      logs,
      stepCallback,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      entities,
      joints,
      gravity,
      logs,
      stepCallback: null,
    };
  }
}
