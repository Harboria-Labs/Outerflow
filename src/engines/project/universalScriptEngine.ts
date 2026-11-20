import * as THREE from 'three';
import type {
  BodyType,
  CadPartConfig,
  ProjectParameter,
  StudioEntity,
  StudioJoint,
  StudioMode,
  Vec3,
} from '../../types/studio';
import { csgIntersect, csgSubtract, csgUnion } from '../cad/csg';
import { createParametricGeometry, serializeBufferGeometry } from '../cad/parametricGenerators';
import { PART_LIBRARY, buildLibraryPartGeometry } from '../cad/partsLibrary';
import { buildGeometryFrom2DSketch } from '../cad/sketch2D';
import { paintGeometry } from '../electronics/roboticsHardwareLibrary';
import {
  createInitialWorkbenchConfig,
  type WorkbenchConfig,
} from '../electronics/workbench3D';
import type {
  AddJointOpts,
  SpawnBoxOpts,
  SpawnCylinderOpts,
  SpawnSphereOpts,
  StepRuntimeApi,
} from '../experiments/scriptRunner';
import { syncEntityPhysicalMass } from './parameterAndTemplateEngine';
import {
  type ScriptLanguage,
  detectScriptLanguage,
  transpileToOuterflowJS,
} from './scriptTranspilers';

export type { ScriptLanguage };
export { detectScriptLanguage };

export interface UniversalScriptTemplate {
  id: string;
  name: string;
  language?: ScriptLanguage;
  category: 'robotics' | 'cad-csg' | 'control' | 'electronics' | 'structural';
  description: string;
  code: string;
}

export const UNIVERSAL_SCRIPT_TEMPLATES: UniversalScriptTemplate[] = [
  {
    id: 'autonomous-rover',
    name: 'Programmatic 4WD Rover + Arduino & Sonar',
    category: 'robotics',
    description:
      'Builds a motorized 4-wheel robot, mounts a 3D Arduino Uno R3 & HC-SR04 sensor, and runs an onStep drive controller',
    code: `// Universal Engineering Script: Programmatic 4WD Rover + Arduino Uno & Sonar
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

// 1. Machine a custom chassis deck using Code-CAD CSG
const rawDeck = design.box(2.6, 0.28, 1.35);
const weightCut = design.box(0.8, 0.4, 0.75);
const chassisGeom = design.subtract(rawDeck, weightCut);

// Merge 3D Arduino Uno R3 and HC-SR04 Ultrasonic sensor onto the chassis deck
const uno = design.translate(design.scale(design.library('arduino-uno-r3'), 0.65, 0.65, 0.65), -0.25, 0.16, 0);
const sonar = design.translate(design.rotate(design.scale(design.library('hc-sr04-ultrasonic'), 0.6, 0.6, 0.6), 0, -Math.PI / 2, 0), 1.15, 0.22, 0);
const fullChassis = design.union(design.paint(chassisGeom, '#1e293b'), design.union(uno, sonar));

const chassisId = design.spawnBody(fullChassis, {
  id: 'rover-chassis',
  name: 'Instrumented Rover Chassis',
  pos: [-3.5, 1.05, 0],
  density: 2700,
  color: '#00878f'
});

// 2. Attach 4 motorized wheels with revolute joints
const wheelOffsets = [
  ['fl', 0.9, -0.82],
  ['fr', 0.9, 0.82],
  ['rl', -0.9, -0.82],
  ['rr', -0.9, 0.82]
];

const motorJoints = [];
for (const [tag, lx, lz] of wheelOffsets) {
  const wid = outerflow.spawnCylinder({
    id: 'wheel-' + tag,
    name: 'Drive Wheel ' + tag.toUpperCase(),
    pos: [-3.5 + lx, 0.65, lz],
    rot: [Math.PI / 2, 0, 0],
    radius: 0.44,
    height: 0.28,
    mass: 1.2,
    friction: 1.35,
    color: '#f59e0b'
  });

  const jid = outerflow.addJoint({
    id: 'motor-' + tag,
    name: 'Wheel Motor ' + tag.toUpperCase(),
    kind: 'revolute',
    bodyA: chassisId,
    bodyB: wid,
    anchorA: [lx, -0.4, lz],
    anchorB: [0, 0, 0],
    axis: [0, 1, 0],
    motorSpeed: -6.0,
    motorMaxForce: 18
  });
  motorJoints.push(jid);
}

// 3. Add test obstacle wall to trigger sonar reversal
outerflow.spawnBox({
  id: 'obstacle-wall',
  name: 'Test Barrier Wall',
  bodyType: 'fixed',
  pos: [4.2, 0.9, 0],
  size: [0.5, 1.8, 3.2],
  color: '#ef4444'
});

// 4. Closed-loop 60Hz controller: reverse direction when approaching barrier
let dir = -1;
outerflow.onStep((t, api) => {
  const st = api.getState(chassisId);
  if (!st) return;
  const distToWall = 4.2 - st.pos[0];
  if (distToWall < 2.2) dir = 1;
  if (st.pos[0] < -4.5) dir = -1;

  for (const jid of motorJoints) {
    api.setMotor(jid, dir * 6.5, 20);
  }
  api.logMetric('sonarDistM', Math.max(0, distToWall));
  api.logMetric('roverSpeed', Math.hypot(st.vel[0], st.vel[2]));
});

outerflow.print('Built 4WD Arduino + HC-SR04 Rover with closed-loop sonar reversal.');
`,
  },
  {
    id: 'csg-gear-pendulum',
    name: 'Code-CAD CSG Gearbox & Driven Pendulum',
    category: 'cad-csg',
    description:
      'Machines a CSG bearing pedestal, 18-tooth spur gear, and counterweight rotor directly into live physics',
    code: `// Universal Engineering Script: Code-CAD CSG Gearbox & Driven Pendulum
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

// 1. Machine pedestal frame with bore subtraction
const pillar = design.box(1.2, 2.8, 0.8);
const bore = design.translate(design.rotate(design.cylinder(0.28, 1.2), Math.PI / 2, 0, 0), 0, 0.9, 0);
const standGeom = design.paint(design.subtract(pillar, bore), '#475569');

const standId = design.spawnBody(standGeom, {
  id: 'csg-stand',
  name: 'Machined Bearing Stand',
  bodyType: 'fixed',
  pos: [0, 1.4, -0.65]
});

// 2. Build compound 18-tooth Spur Gear + Pendulum Arm
const gear = design.paint(design.gear(18, 0.85, 0.28), '#38bdf8');
const arm = design.paint(design.translate(design.box(2.4, 0.24, 0.22), 1.1, 0, 0), '#f59e0b');
const bob = design.paint(design.translate(design.sphere(0.38), 2.2, 0, 0), '#fb7185');
const rotorGeom = design.union(gear, design.union(arm, bob));

// Also register the machined rotor in the CAD & Parts assembly
design.addPart(rotorGeom, { name: 'CSG Gear Rotor Assembly', color: '#38bdf8', pos: [0, 2.3, 0] });

const rotorId = design.spawnBody(rotorGeom, {
  id: 'csg-rotor',
  name: 'CSG Gear Pendulum',
  pos: [0, 2.3, 0],
  density: 7800
});

const motorJoint = outerflow.addJoint({
  id: 'gear-drive',
  name: 'Gearbox Drive Shaft',
  kind: 'revolute',
  bodyA: standId,
  bodyB: rotorId,
  anchorA: [0, 0.9, 0.65],
  anchorB: [-0.75, 0, 0],
  axis: [0, 0, 1],
  motorSpeed: 2.8,
  motorMaxForce: 32
});

outerflow.onStep((t, api) => {
  const st = api.getState(rotorId);
  if (st) {
    api.logMetric('tipAltitude', st.pos[1]);
    api.logMetric('linearSpeed', Math.hypot(st.vel[0], st.vel[1], st.vel[2]));
  }
});

outerflow.print('Compiled CSG Bearing Stand + 18-Tooth Gear Rotor into CAD & Physics.');
`,
  },
  {
    id: 'pid-altitude-drone',
    name: 'Closed-Loop PID Drone Hover Controller',
    category: 'control',
    description:
      'Assembles an ESP32 quadcopter rig and runs a real-time 60Hz PID altitude controller in onStep',
    code: `// Universal Engineering Script: Closed-Loop PID Drone Hover Controller
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

// 1. Construct quadcopter X-frame + ESP32 flight controller
const armA = design.rotate(design.box(2.8, 0.12, 0.22), 0, Math.PI / 4, 0);
const armB = design.rotate(design.box(2.8, 0.12, 0.22), 0, -Math.PI / 4, 0);
const frame = design.paint(design.union(armA, armB), '#334155');
const esp32 = design.translate(design.scale(design.library('esp32-devkit-v1'), 0.55, 0.55, 0.55), 0, 0.1, 0);
const droneGeom = design.union(frame, esp32);

const basePad = outerflow.spawnBox({
  id: 'landing-pad',
  name: 'Landing Pad',
  bodyType: 'fixed',
  pos: [0, 0.1, 0],
  size: [3.2, 0.2, 3.2],
  color: '#1e293b'
});

const droneId = design.spawnBody(droneGeom, {
  id: 'quad-drone',
  name: 'ESP32 Quadcopter Plant',
  pos: [0, 0.8, 0],
  mass: 2.4,
  color: '#38bdf8'
});

// Vertical guide rail for 1D altitude benchmark
outerflow.addJoint({
  id: 'alt-guide',
  name: 'Vertical Test Guide',
  kind: 'prismatic',
  bodyA: basePad,
  bodyB: droneId,
  anchorA: [0, 0.1, 0],
  anchorB: [0, 0, 0],
  axis: [0, 1, 0]
});

// 2. Real-time PID controller in onStep(t, api)
let integral = 0;
let prevErr = 0;
const Kp = 48.0;
const Ki = 14.0;
const Kd = 22.0;

outerflow.onStep((t, api) => {
  const st = api.getState(droneId);
  if (!st) return;

  // Step setpoint: 2.8m -> 4.2m at t > 2.5s
  const setpoint = t < 2.5 ? 2.8 : 4.2;
  const err = setpoint - st.pos[1];
  const dt = 1 / 60;
  integral = Math.max(-4, Math.min(4, integral + err * dt));
  const deriv = (err - prevErr) / dt;
  prevErr = err;

  const gravityFeedforward = st.mass * 9.81;
  const thrust = Math.max(0, Math.min(120, gravityFeedforward + Kp * err + Ki * integral + Kd * deriv));

  api.applyForce(droneId, [0, thrust, 0]);
  api.logMetric('altitudeY', st.pos[1]);
  api.logMetric('setpointY', setpoint);
});

outerflow.print('PID Altitude Controller active (Kp=48, Ki=14, Kd=22).');
`,
  },
  {
    id: 'bionic-arm-gait',
    name: 'Articulated Bionic Arm + Servo Trajectory',
    category: 'robotics',
    description:
      'Builds a 3-joint robotic manipulator with a 3D Bionic Hand and drives sinusoidal joint trajectories',
    code: `// Universal Engineering Script: Articulated Bionic Arm + Multi-Servo Trajectory
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

const base = outerflow.spawnCylinder({
  id: 'arm-pedestal',
  name: 'Heavy Pedestal Base',
  bodyType: 'fixed',
  pos: [0, 0.45, 0],
  radius: 0.75,
  height: 0.9,
  color: '#334155'
});

const shoulder = outerflow.spawnBox({
  id: 'arm-shoulder',
  name: 'Upper Shoulder Link',
  pos: [0, 1.85, 0],
  size: [0.36, 1.8, 0.36],
  mass: 2.0,
  color: '#2563eb'
});

const forearm = outerflow.spawnBox({
  id: 'arm-forearm',
  name: 'Forearm Actuator Link',
  pos: [0.85, 2.75, 0],
  size: [1.6, 0.28, 0.28],
  mass: 1.2,
  color: '#38bdf8'
});

const hand = outerflow.spawnPart('bionic-hand', {
  id: 'arm-hand',
  name: 'Bionic Prosthetic Hand',
  pos: [1.85, 2.75, 0],
  mass: 0.65,
  color: '#22d3ee'
});

const jShoulder = outerflow.addJoint({
  id: 'j-shoulder',
  name: 'Shoulder Servo',
  kind: 'revolute',
  bodyA: base,
  bodyB: shoulder,
  anchorA: [0, 0.45, 0],
  anchorB: [0, -0.85, 0],
  axis: [0, 0, 1],
  motorSpeed: 0.8,
  motorMaxForce: 45
});

const jElbow = outerflow.addJoint({
  id: 'j-elbow',
  name: 'Elbow Servo',
  kind: 'revolute',
  bodyA: shoulder,
  bodyB: forearm,
  anchorA: [0, 0.85, 0],
  anchorB: [-0.75, 0, 0],
  axis: [0, 0, 1],
  motorSpeed: -1.2,
  motorMaxForce: 32
});

outerflow.addJoint({
  id: 'j-wrist',
  name: 'Wrist Mount',
  kind: 'fixed',
  bodyA: forearm,
  bodyB: hand,
  anchorA: [0.85, 0, 0],
  anchorB: [-0.2, 0, 0]
});

outerflow.onStep((t, api) => {
  api.setMotor(jShoulder, Math.sin(t * 1.8) * 1.1, 48);
  api.setMotor(jElbow, Math.cos(t * 2.4) * 1.6, 36);
  const st = api.getState(hand);
  if (st) api.logMetric('handHeightY', st.pos[1]);
});

outerflow.print('Bionic Arm + sinusoidal servo trajectory running.');
`,
  },
  {
    id: 'workbench-circuit-code',
    name: '3D Electronics Workbench: Arduino + OLED + Sonar + Servo',
    category: 'electronics',
    description:
      'Programmatically populates the 3D Electronics Workbench with boards, sensors, and curved DuPont jumper wires',
    code: `// Universal Engineering Script: Programmatic 3D Electronics Workbench Wiring
outerflow.setMode('electronics');

bench.setBoard('arduino-uno-r3');
bench.clearModules();
bench.clearWires();
bench.setExploded(0.0);

const sonar = bench.addModule('hc-sr04-ultrasonic', { pos: [1.35, 0.08, -0.75] });
const oled = bench.addModule('oled-ssd1306', { pos: [1.35, 0.08, 0.15] });
const servo = bench.addModule('sg90-micro-servo', { pos: [1.35, 0.08, 0.95] });
const led = bench.addModule('led-5mm-module', { pos: [2.45, 0.08, -0.3] });

// Route 3D curved DuPont jumper wires pin-to-pin
bench.wire('board', '5V', sonar, 'VCC', '#ef4444');
bench.wire('board', 'GND', sonar, 'GND', '#18181b');
bench.wire('board', 'D9', sonar, 'TRIG', '#38bdf8');
bench.wire('board', 'D10', sonar, 'ECHO', '#34d399');

bench.wire('board', 'A4', oled, 'SDA', '#a78bfa');
bench.wire('board', 'A5', oled, 'SCL', '#facc15');
bench.wire('board', 'GND', oled, 'GND', '#18181b');

bench.wire('board', 'D5', servo, 'PWM', '#f97316');
bench.wire('board', 'D13', led, 'SIG', '#22d3ee');

outerflow.print('Assembled & wired 3D Arduino Uno R3 Workbench with HC-SR04, OLED, SG90 Servo & LED.');
`,
  },
  {
    id: 'truss-bridge-load',
    name: 'Algorithmic Truss Bridge & Dynamic Load Test',
    category: 'structural',
    description:
      'Generates a multi-span suspension bridge with spring-damper structural links under a heavy drop load',
    code: `// Universal Engineering Script: Algorithmic Multi-Span Bridge & Impact Load Test
outerflow.clear();
outerflow.setGravity(0, -9.81, 0);

const spans = 7;
const spacing = 1.15;
const startX = -((spans - 1) * spacing) / 2;

const leftAbutment = outerflow.spawnBox({
  id: 'abut-L', name: 'Left Bridge Pier', bodyType: 'fixed',
  pos: [startX - 1.1, 1.4, 0], size: [1.0, 2.8, 1.6], color: '#475569'
});
const rightAbutment = outerflow.spawnBox({
  id: 'abut-R', name: 'Right Bridge Pier', bodyType: 'fixed',
  pos: [-startX + 1.1, 1.4, 0], size: [1.0, 2.8, 1.6], color: '#475569'
});

const planks = [];
for (let i = 0; i < spans; i++) {
  const px = startX + i * spacing;
  const pid = outerflow.spawnBox({
    id: 'plank-' + i,
    name: 'Bridge Deck ' + (i + 1),
    pos: [px, 2.6, 0],
    size: [1.0, 0.22, 1.4],
    mass: 1.4,
    color: i % 2 === 0 ? '#38bdf8' : '#0284c7'
  });
  planks.push(pid);
}

// Link bridge deck segments with structural spring-damper joints
for (let i = 0; i <= spans; i++) {
  const bodyA = i === 0 ? leftAbutment : planks[i - 1];
  const bodyB = i === spans ? rightAbutment : planks[i];
  outerflow.addJoint({
    name: 'Span Joint ' + i,
    kind: 'spring',
    bodyA,
    bodyB,
    anchorA: [0.45, 0, 0],
    anchorB: [-0.45, 0, 0],
    stiffness: 320,
    damping: 18,
    restLength: 0.22
  });
}

// Heavy steel load test cylinder dropped onto center span
const loadId = outerflow.spawnCylinder({
  id: 'test-load',
  name: '7800 kg/m³ Test Load',
  pos: [0, 4.6, 0],
  radius: 0.48,
  height: 0.85,
  mass: 9.5,
  color: '#f59e0b'
});

const midPlank = planks[Math.floor(spans / 2)];
outerflow.onStep((t, api) => {
  const st = api.getState(midPlank);
  if (st) api.logMetric('midSpanHeightY', st.pos[1]);
});

outerflow.print('Generated ' + spans + '-span bridge + 9.5 kg dynamic drop load.');
`,
  },
  {
    id: 'python-parametric-gearbox',
    name: '[Python .py] Parametric CSG Gearbox & Raspberry Pi 4 Rig',
    language: 'python',
    category: 'cad-csg',
    description:
      'Python engineering script using def, for-in-range, math, CSG boolean machining, and a 60Hz on_step servo controller',
    code: `# Outerflow Python (.py) Engineering Script: Parametric CSG Gearbox & Raspberry Pi 4 Rig
import outerflow
import math

outerflow.clear()
outerflow.set_gravity(0, -9.81, 0)

# 1. Machine an aluminum gearbox mount with CSG boolean subtraction
housing_raw = design.box(1.8, 2.2, 0.9)
bore_hole = design.translate(design.rotate(design.cylinder(0.32, 1.4), math.pi / 2, 0, 0), 0, 0.55, 0)
housing = design.paint(design.subtract(housing_raw, bore_hole), '#334155')

mount_id = design.spawn_body(housing, id='py-mount', name='Python CSG Mount', body_type='fixed', pos=[0, 1.1, -0.65])

# 2. Build a 20-tooth drive gear + Raspberry Pi 4 telemetry payload
gear = design.paint(design.gear(20, 0.92, 0.3), '#38bdf8')
arm = design.paint(design.translate(design.box(2.1, 0.25, 0.25), 1.05, 0, 0), '#34d399')
rpi4 = design.translate(design.scale(design.library('raspberry-pi-4'), 0.5, 0.5, 0.5), 1.95, 0.18, 0)
rotor_geom = design.union(gear, design.union(arm, rpi4))

rotor_id = design.spawn_body(rotor_geom, id='py-rotor', name='RPi4 Gear Rotor', pos=[0, 1.65, 0], density=2700)

drive_joint = outerflow.add_joint(id='py-drive', name='Python Gear Servo', kind='revolute', body_a=mount_id, body_b=rotor_id, anchor_a=[0, 0.55, 0.65], anchor_b=[-0.65, 0, 0], axis=[0, 0, 1], motor_speed=3.2, motor_max_force=35)

# 3. Spawn a row of 4 dynamic calibration spheres using Python range()
for i in range(4):
  px = -2.4 + i * 1.6
  outerflow.spawn_sphere(name='Probe Sphere ' + str(i + 1), pos=[px, 3.2 + i * 0.4, 1.2], radius=0.32, mass=1.1, restitution=0.65, color='#f59e0b')

def on_step(t, api):
  target_speed = math.sin(t * 1.8) * 4.5
  api.set_motor(drive_joint, target_speed, 38)
  st = api.get_state(rotor_id)
  if st:
    api.log_metric('pyRotorY', st.pos[1])
    api.log_metric('pyTargetVel', target_speed)

print('Python (.py) CSG Gearbox + Raspberry Pi 4 rig compiled and running at 60Hz.')
`,
  },
  {
    id: 'python-esp32-linear-sled',
    name: '[Python .py] Multi-Sensor ESP32 Robotics & PD Controller',
    language: 'python',
    category: 'robotics',
    description:
      'Python robotics script that spawns a 3D ESP32 + Ultrasonic actuator rig with closed-loop proportional-derivative control',
    code: `# Outerflow Python (.py) Robotics Script: ESP32 + Ultrasonic Linear Servo PD Controller
import outerflow
import math

outerflow.clear()
outerflow.set_gravity(0, -9.81, 0)

rail_id = outerflow.spawn_box(id='py-rail', name='Linear Guide Base', body_type='fixed', pos=[0, 0.25, 0], size=[6.0, 0.5, 1.4], color='#1e293b')

# Combine ESP32 DevKit V1 + HC-SR04 Ultrasonic Sensor into an active slider carriage
carriage_base = design.paint(design.box(1.4, 0.35, 1.0), '#0284c7')
esp32 = design.translate(design.scale(design.library('esp32-devkit-v1'), 0.65, 0.65, 0.65), -0.2, 0.25, 0)
sonar = design.translate(design.scale(design.library('hc-sr04-ultrasonic'), 0.65, 0.65, 0.65), 0.4, 0.28, 0)
sled_geom = design.union(carriage_base, design.union(esp32, sonar))

sled_id = design.spawn_body(sled_geom, id='py-sled', name='ESP32 Linear Sled', pos=[-2.0, 0.85, 0], mass=2.2)

outerflow.add_joint(id='py-slider', name='Prismatic Linear Rail', kind='prismatic', body_a=rail_id, body_b=sled_id, anchor_a=[0, 0.5, 0], anchor_b=[0, 0, 0], axis=[1, 0, 0])

def on_step(t, api):
  st = api.get_state(sled_id)
  if not st:
    return
  setpoint = math.sin(t * 1.4) * 2.2
  err = setpoint - st.pos[0]
  force_x = 42.0 * err - 11.0 * st.vel[0]
  api.apply_force(sled_id, [force_x, 0, 0])
  api.log_metric('sledX', st.pos[0])
  api.log_metric('setpointX', setpoint)

print('Python (.py) ESP32 Linear Servo Sled active.')
`,
  },
  {
    id: 'cpp-arduino-servo-rig',
    name: '[C++ / Arduino .ino] Arduino Uno R3 + Servo & Sonar Firmware',
    language: 'cpp',
    category: 'robotics',
    description:
      'C++ / Arduino setup() & loop(float t) firmware driving a 3D Arduino Uno R3, SG90 Servo turret, and PWM telemetry',
    code: `// Outerflow C++ / Arduino (.cpp / .ino) Engineering & Firmware Script
#include <Outerflow.h>
#include <Arduino.h>

#define LED_PIN 13
#define PWM_PIN 5

EntityId baseId;
EntityId turretId;
JointId servoJoint;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(PWM_PIN, OUTPUT);

  outerflow::clear();
  outerflow::setGravity(0.0f, -9.81f, 0.0f);

  // 1. Spawn fixed 3D Arduino Uno R3 controller base
  auto pedestal = design::paint(design::box(2.2f, 0.35f, 1.6f), "#1e293b");
  auto uno = design::translate(design::scale(design::library("arduino-uno-r3"), 0.75f, 0.75f, 0.75f), 0.0f, 0.25f, 0.0f);
  baseId = design::spawnBody(design::union(pedestal, uno), {
    name: "Arduino Uno R3 Base",
    bodyType: "fixed",
    pos: {0.0f, 0.45f, 0.0f}
  });

  // 2. Build rotating Ultrasonic Radar Turret
  auto mast = design::paint(design::cylinder(0.22f, 0.9f), "#38bdf8");
  auto sonar = design::translate(design::scale(design::library("hc-sr04-ultrasonic"), 0.75f, 0.75f, 0.75f), 0.0f, 0.55f, 0.25f);
  turretId = design::spawnBody(design::union(mast, sonar), {
    name: "SG90 Sonar Radar Turret",
    pos: {0.0f, 1.45f, 0.0f},
    mass: 1.4f
  });

  servoJoint = outerflow::addJoint({
    name: "SG90 Pan Servo",
    kind: "revolute",
    bodyA: baseId,
    bodyB: turretId,
    anchorA: {0.0f, 0.55f, 0.0f},
    anchorB: {0.0f, -0.45f, 0.0f},
    axis: {0.0f, 1.0f, 0.0f},
    motorSpeed: 2.5f,
    motorMaxForce: 28.0f
  });

  Serial.println("C++ / Arduino setup() complete: 3D Uno R3 + Sonar Radar Turret online.");
}

void loop(float t, StepApi& api) {
  float sweepVel = std::sin(t * 2.2f) * 3.8f;
  api.setMotor(servoJoint, sweepVel, 30.0f);

  int ledState = (std::sin(t * 6.0f) >= 0.0f) ? HIGH : LOW;
  digitalWrite(LED_PIN, ledState);
  analogWrite(PWM_PIN, (int)map(std::sin(t * 2.2f), -1.0f, 1.0f, 0.0f, 255.0f));
}
`,
  },
  {
    id: 'cpp-csg-reaction-wheel',
    name: '[C++ .cpp] Typed CSG Reaction Wheel & Attitude Controller',
    language: 'cpp',
    category: 'control',
    description:
      'Modern C++ script using design::subtract, design::gear, and a 60Hz loop() reaction torque controller',
    code: `// Outerflow Modern C++ (.cpp) Engineering Script: CSG Reaction Wheel Pendulum
#include <Outerflow.h>
#include <cmath>

EntityId standId;
EntityId armId;
JointId wheelMotor;

void setup() {
  outerflow::clear();
  outerflow::setGravity(0.0f, -9.81f, 0.0f);

  // Machine support tower using C++ CSG operations
  auto rawTower = design::box(1.1f, 2.6f, 0.9f);
  auto cutout = design::translate(design::cylinder(0.32f, 1.2f), 0.0f, 0.6f, 0.0f);
  auto towerGeom = design::paint(design::subtract(rawTower, cutout), "#475569");

  standId = design::spawnBody(towerGeom, {
    name: "C++ Machined Stand",
    bodyType: "fixed",
    pos: {0.0f, 1.3f, -0.6f}
  });

  // Build reaction gear flywheel + balancing arm
  auto wheel = design::paint(design::gear(22, 0.95f, 0.28f), "#22d3ee");
  auto bar = design::paint(design::translate(design::box(2.2f, 0.24f, 0.22f), 1.0f, 0.0f, 0.0f), "#a78bfa");
  armId = design::spawnBody(design::union(wheel, bar), {
    name: "C++ Reaction Wheel Arm",
    pos: {0.0f, 2.1f, 0.0f},
    density: 7800.0f
  });

  wheelMotor = outerflow::addJoint({
    name: "Flywheel Torque Drive",
    kind: "revolute",
    bodyA: standId,
    bodyB: armId,
    anchorA: {0.0f, 0.8f, 0.6f},
    anchorB: {-0.75f, 0.0f, 0.0f},
    axis: {0.0f, 0.0f, 1.0f},
    motorSpeed: 3.5f,
    motorMaxForce: 40.0f
  });

  outerflow::print("C++ Reaction Wheel Pendulum compiled (7800 kg/m³ steel).");
}

void loop(float t, StepApi& api) {
  float cmd = std::cos(t * 2.0f) * 5.2f;
  api.setMotor(wheelMotor, cmd, 42.0f);
  auto st = api.getState(armId);
  if (st) {
    api.logMetric("cppArmAltitude", st.pos[1]);
  }
}
`,
  },
];

export interface SpawnPartOpts {
  id?: string;
  name?: string;
  bodyType?: BodyType;
  pos?: Vec3;
  rot?: Vec3;
  scale?: Vec3;
  density?: number;
  mass?: number;
  restitution?: number;
  friction?: number;
  velocity?: Vec3;
  color?: string;
}

export interface UniversalScriptResult {
  ok: boolean;
  error?: string;
  language: ScriptLanguage;
  targetMode: StudioMode | null;
  entities: StudioEntity[];
  joints: StudioJoint[];
  cadParts: CadPartConfig[];
  parameters: ProjectParameter[];
  workbenchConfig: WorkbenchConfig | null;
  gravity: Vec3;
  logs: string[];
  stepCallback: ((t: number, api: StepRuntimeApi) => void) | null;
  touchedPhysics: boolean;
  touchedCad: boolean;
  touchedWorkbench: boolean;
}

export function executeUniversalScript(
  code: string,
  initialContext?: {
    entities?: StudioEntity[];
    joints?: StudioJoint[];
    cadParts?: CadPartConfig[];
    parameters?: ProjectParameter[];
    workbenchConfig?: WorkbenchConfig;
    gravity?: Vec3;
    language?: ScriptLanguage | 'auto';
  }
): UniversalScriptResult {
  const entities: StudioEntity[] = initialContext?.entities
    ? structuredClone(initialContext.entities)
    : [];
  const joints: StudioJoint[] = initialContext?.joints
    ? structuredClone(initialContext.joints)
    : [];
  const cadParts: CadPartConfig[] = initialContext?.cadParts
    ? structuredClone(initialContext.cadParts)
    : [];
  const parameters: ProjectParameter[] = initialContext?.parameters
    ? structuredClone(initialContext.parameters)
    : [];
  let workbenchConfig: WorkbenchConfig = initialContext?.workbenchConfig
    ? structuredClone(initialContext.workbenchConfig)
    : createInitialWorkbenchConfig();

  const logs: string[] = [];
  let gravity: Vec3 = initialContext?.gravity ? [...initialContext.gravity] : [0, -9.81, 0];
  let stepCallback: ((t: number, api: StepRuntimeApi) => void) | null = null;
  let explicitMode: StudioMode | null = null;
  let touchedPhysics = false;
  let touchedCad = false;
  let touchedWorkbench = false;
  let counter = 0;

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++counter}`;

  const spawnGeometryAsEntity = (
    geom: THREE.BufferGeometry,
    opts: SpawnPartOpts = {}
  ): string => {
    touchedPhysics = true;
    const id = opts.id || nextId('script-mesh');
    const g = geom.clone();
    g.computeBoundingBox();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    g.boundingBox?.getCenter(center);
    g.boundingBox?.getSize(size);
    g.translate(-center.x, -center.y, -center.z);
    const serialized = serializeBufferGeometry(g);
    g.dispose();

    const baseEnt: StudioEntity = {
      id,
      name: opts.name ?? id,
      category: 'cad',
      shape: 'custom',
      bodyType: opts.bodyType ?? 'dynamic',
      position: opts.pos ?? [center.x, Math.max(0.6, center.y), center.z],
      rotation: opts.rot ?? [0, 0, 0],
      scale: opts.scale ?? [1, 1, 1],
      size: {
        width: Math.max(0.1, size.x),
        height: Math.max(0.1, size.y),
        depth: Math.max(0.1, size.z),
        radius: Math.max(0.1, Math.max(size.x, size.z) * 0.5),
      },
      color: opts.color ?? '#38bdf8',
      metalness: 0.35,
      roughness: 0.35,
      opacity: 1,
      visible: true,
      density: opts.density,
      serializedMesh: serialized,
      physics: {
        mass: opts.mass ?? 2.0,
        friction: opts.friction ?? 0.5,
        restitution: opts.restitution ?? 0.3,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: opts.velocity ?? [0, 0, 0],
        colliderKind: 'convexHull',
      },
    };

    const synced = opts.density ? syncEntityPhysicalMass(baseEnt) : baseEnt;
    if (opts.mass !== undefined) {
      synced.physics.mass = opts.mass;
    }
    entities.push(synced);
    return id;
  };

  const design = {
    box(w = 1, h = 1, d = 1): THREE.BufferGeometry {
      return new THREE.BoxGeometry(Math.max(0.05, w), Math.max(0.05, h), Math.max(0.05, d));
    },
    sphere(r = 0.5, segs = 22): THREE.BufferGeometry {
      return new THREE.SphereGeometry(Math.max(0.05, r), segs, segs);
    },
    cylinder(r = 0.5, hOrRBottom = 1, segsOrH = 24, maybeSegs?: number): THREE.BufferGeometry {
      if (typeof maybeSegs === 'number') {
        return new THREE.CylinderGeometry(
          Math.max(0.05, r),
          Math.max(0.05, hOrRBottom),
          Math.max(0.05, segsOrH),
          maybeSegs
        );
      }
      return new THREE.CylinderGeometry(
        Math.max(0.05, r),
        Math.max(0.05, r),
        Math.max(0.05, hOrRBottom),
        segsOrH
      );
    },
    cone(r = 0.5, h = 1, segs = 24): THREE.BufferGeometry {
      return new THREE.ConeGeometry(Math.max(0.05, r), Math.max(0.05, h), segs);
    },
    gear(teeth = 16, radius = 1, thickness = 0.35): THREE.BufferGeometry {
      return createParametricGeometry({
        id: 'dsl-gear',
        name: 'Gear',
        kind: 'gear',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        color: '#ffffff',
        visible: true,
        width: radius * 2,
        height: thickness,
        depth: radius * 2,
        outerRadius: radius,
        innerRadius: radius * 0.3,
        bevel: 0.02,
        segments: 24,
        teeth,
        holeRadius: radius * 0.25,
        sides: 6,
        latheCurve: 'nozzle',
      });
    },
    pipe(outerR = 0.8, innerR = 0.45, h = 1.2): THREE.BufferGeometry {
      return createParametricGeometry({
        id: 'dsl-pipe',
        name: 'Pipe',
        kind: 'pipe',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        color: '#ffffff',
        visible: true,
        width: outerR * 2,
        height: h,
        depth: outerR * 2,
        outerRadius: outerR,
        innerRadius: innerR,
        bevel: 0.02,
        segments: 24,
        teeth: 12,
        holeRadius: innerR,
        sides: 6,
        latheCurve: 'nozzle',
      });
    },
    extrude2D(points: [number, number][], depth = 1.0, bevel = 0.02): THREE.BufferGeometry {
      return buildGeometryFrom2DSketch(points, 'extrude', depth, bevel);
    },
    lathe2D(points: [number, number][]): THREE.BufferGeometry {
      return buildGeometryFrom2DSketch(points, 'lathe', 1.0, 0);
    },
    library(partId: string): THREE.BufferGeometry {
      return buildLibraryPartGeometry(partId);
    },
    translate(geom: THREE.BufferGeometry, x = 0, y = 0, z = 0): THREE.BufferGeometry {
      const g = geom.clone();
      g.translate(x, y, z);
      return g;
    },
    rotate(geom: THREE.BufferGeometry, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry {
      const g = geom.clone();
      if (rx) g.rotateX(rx);
      if (ry) g.rotateY(ry);
      if (rz) g.rotateZ(rz);
      return g;
    },
    scale(geom: THREE.BufferGeometry, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
      const g = geom.clone();
      g.scale(sx, sy, sz);
      return g;
    },
    paint(geom: THREE.BufferGeometry, hexColor: string): THREE.BufferGeometry {
      return paintGeometry(geom.clone(), hexColor);
    },
    union(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgUnion(a, undefined, b, undefined);
    },
    subtract(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgSubtract(a, undefined, b, undefined);
    },
    intersect(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
      return csgIntersect(a, undefined, b, undefined);
    },
    add(
      geom: THREE.BufferGeometry,
      opts: { name?: string; color?: string; pos?: Vec3; rot?: Vec3; locked?: boolean } = {}
    ): string {
      return this.addPart(geom, opts);
    },
    addPart(
      geom: THREE.BufferGeometry,
      opts: { name?: string; color?: string; pos?: Vec3; rot?: Vec3; locked?: boolean } = {}
    ): string {
      touchedCad = true;
      const id = nextId('cad-dsl');
      const g = geom.clone();
      g.computeBoundingBox();
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      g.boundingBox?.getCenter(center);
      g.boundingBox?.getSize(size);
      g.translate(-center.x, -center.y, -center.z);
      const serialized = serializeBufferGeometry(g);
      g.dispose();

      cadParts.push({
        id,
        name: opts.name || `Coded Part ${cadParts.length + 1}`,
        kind: 'box',
        position: opts.pos ?? [center.x, Math.max(0.4, center.y), center.z],
        rotation: opts.rot ?? [0, 0, 0],
        color: opts.color || '#38bdf8',
        visible: true,
        locked: Boolean(opts.locked),
        width: size.x,
        height: size.y,
        depth: size.z,
        outerRadius: Math.max(size.x, size.z) * 0.5,
        innerRadius: 0.25,
        bevel: 0.02,
        segments: 24,
        teeth: 16,
        holeRadius: 0.25,
        sides: 6,
        latheCurve: 'nozzle',
        csgMesh: serialized,
      });
      return id;
    },
    spawnBody(
      geomOrName: THREE.BufferGeometry | string,
      optsOrGeom: SpawnPartOpts | THREE.BufferGeometry = {},
      maybeOpts: SpawnPartOpts = {}
    ): string {
      if (typeof geomOrName === 'string' && optsOrGeom instanceof THREE.BufferGeometry) {
        return spawnGeometryAsEntity(optsOrGeom, { ...maybeOpts, name: geomOrName });
      }
      return spawnGeometryAsEntity(
        geomOrName as THREE.BufferGeometry,
        optsOrGeom as SpawnPartOpts
      );
    },
  };

  const bench = {
    setBoard(boardId: string) {
      touchedWorkbench = true;
      workbenchConfig = { ...workbenchConfig, boardId };
    },
    clearModules() {
      touchedWorkbench = true;
      workbenchConfig = { ...workbenchConfig, modules: [] };
    },
    clearWires() {
      touchedWorkbench = true;
      workbenchConfig = { ...workbenchConfig, wires: [] };
    },
    setExploded(exploded: number) {
      touchedWorkbench = true;
      workbenchConfig = {
        ...workbenchConfig,
        exploded: Math.max(0, Math.min(1, Number(exploded) || 0)),
      };
    },
    addModule(
      specId: string,
      opts: { id?: string; pos?: Vec3; rotY?: number } = {}
    ): string {
      touchedWorkbench = true;
      const idx = workbenchConfig.modules.length;
      const instanceId = opts.id || nextId(`mod-${specId}`);
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const position: Vec3 = opts.pos ?? [1.35 + col * 1.15, 0.08, -0.75 + row * 0.85];
      workbenchConfig = {
        ...workbenchConfig,
        modules: [
          ...workbenchConfig.modules,
          { instanceId, specId, position, rotationY: opts.rotY ?? 0 },
        ],
      };
      return instanceId;
    },
    wire(
      fromTarget: 'board' | string,
      fromPin: string,
      toTarget: 'board' | string,
      toPin: string,
      color = '#facc15'
    ): string {
      touchedWorkbench = true;
      const id = nextId('wire');
      workbenchConfig = {
        ...workbenchConfig,
        wires: [
          ...workbenchConfig.wires,
          { id, fromTarget, fromPin, toTarget, toPin, color },
        ],
      };
      return id;
    },
  };

  const outerflow = {
    design,
    bench,
    clear(opts?: { all?: boolean }) {
      touchedPhysics = true;
      entities.length = 0;
      joints.length = 0;
      if (opts?.all) {
        cadParts.length = 0;
        parameters.length = 0;
      }
    },
    setMode(mode: StudioMode) {
      explicitMode = mode;
    },
    setGravity(x: number, y: number, z: number) {
      gravity = [Number(x) || 0, Number(y) || 0, Number(z) || 0];
    },
    spawnBox(opts: SpawnBoxOpts = {}): string {
      touchedPhysics = true;
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
      touchedPhysics = true;
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
      touchedPhysics = true;
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
    spawnPart(partId: string, opts: SpawnPartOpts = {}): string {
      const meta = PART_LIBRARY.find((p) => p.id === partId);
      const geom = buildLibraryPartGeometry(partId);
      const id = spawnGeometryAsEntity(geom, {
        ...opts,
        name: opts.name ?? meta?.name ?? partId,
        color: opts.color ?? meta?.defaultColor ?? '#38bdf8',
      });
      geom.dispose();
      return id;
    },
    addHardware(partId: string, opts: SpawnPartOpts & { position?: Vec3 } = {}): string {
      const meta = PART_LIBRARY.find((p) => p.id === partId);
      const geom = buildLibraryPartGeometry(partId);
      const id = spawnGeometryAsEntity(geom, {
        ...opts,
        pos: opts.pos ?? opts.position,
        name: opts.name ?? meta?.name ?? partId,
        color: opts.color ?? meta?.defaultColor ?? '#38bdf8',
      });
      geom.dispose();
      return id;
    },
    spawnMesh(geom: THREE.BufferGeometry, opts: SpawnPartOpts = {}): string {
      return spawnGeometryAsEntity(geom, opts);
    },
    addJoint(opts: AddJointOpts): string {
      touchedPhysics = true;
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
    addParameter(
      paramOrName: (Partial<ProjectParameter> & { name: string; symbol?: string }) | string,
      valueOrUnit?: number,
      unit?: string
    ): string {
      const param: Partial<ProjectParameter> & { name: string; symbol?: string } =
        typeof paramOrName === 'string'
          ? {
              name: paramOrName,
              symbol: paramOrName.replace(/[^a-zA-Z0-9_]/g, '_'),
              value: valueOrUnit ?? 1,
              unit: unit ?? 'u',
            }
          : paramOrName;
      const id = param.id || nextId('param');
      parameters.push({
        id,
        name: param.name,
        symbol: param.symbol || param.name.replace(/[^a-zA-Z0-9_]/g, '_'),
        unit: param.unit ?? 'u',
        value: param.value ?? 1,
        min: param.min ?? 0,
        max: param.max ?? 100,
        step: param.step ?? 0.1,
        formula: param.formula,
        isCalculated: Boolean(param.isCalculated || param.formula),
        targetEntityId: param.targetEntityId,
        targetField: param.targetField,
        targetJointId: param.targetJointId,
        targetJointField: param.targetJointField,
      });
      return id;
    },
    onStep(fn: (t: number, api: StepRuntimeApi) => void) {
      if (typeof fn === 'function') {
        stepCallback = fn;
      }
    },
    print(...args: unknown[]) {
      logs.push(
        args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
      );
    },
  };

  const { jsCode, detectedLanguage } = transpileToOuterflowJS(
    code,
    initialContext?.language ?? 'auto'
  );

  try {
    const fn = new Function('outerflow', 'design', 'world', 'bench', 'Math', jsCode);
    fn(outerflow, design, outerflow, bench, Math);

    const targetMode: StudioMode | null =
      explicitMode ??
      (touchedPhysics
        ? 'physics'
        : touchedWorkbench
        ? 'electronics'
        : touchedCad
        ? 'cad'
        : null);

    return {
      ok: true,
      language: detectedLanguage,
      targetMode,
      entities,
      joints,
      cadParts,
      parameters,
      workbenchConfig: touchedWorkbench ? workbenchConfig : null,
      gravity,
      logs,
      stepCallback,
      touchedPhysics,
      touchedCad,
      touchedWorkbench,
    };
  } catch (err) {
    return {
      ok: false,
      error: `[${detectedLanguage.toUpperCase()}] ${err instanceof Error ? err.message : String(err)}`,
      language: detectedLanguage,
      targetMode: null,
      entities,
      joints,
      cadParts,
      parameters,
      workbenchConfig: null,
      gravity,
      logs,
      stepCallback: null,
      touchedPhysics,
      touchedCad,
      touchedWorkbench,
    };
  }
}
