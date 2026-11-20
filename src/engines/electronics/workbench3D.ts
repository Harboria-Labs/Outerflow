import * as THREE from 'three';
import type { Vec3 } from '../../types/studio';
import {
  ROBOTICS_HARDWARE_CATALOG,
  buildRoboticsHardwareGroup,
  type RoboticsHardwareSpec,
} from './roboticsHardwareLibrary';

export interface WorkbenchModulePlacement {
  instanceId: string;
  specId: string;
  position: Vec3;
  rotationY: number;
}

export interface WorkbenchWire {
  id: string;
  fromTarget: 'board' | string;
  fromPin: string;
  toTarget: 'board' | string;
  toPin: string;
  color: string;
}

export interface WorkbenchConfig {
  boardId: string;
  missionId: string;
  modules: WorkbenchModulePlacement[];
  wires: WorkbenchWire[];
  exploded: number;
  powered: boolean;
}

export interface WorkbenchMission {
  id: string;
  name: string;
  level: string;
  duration: string;
  boardId: string;
  summary: string;
  modules: WorkbenchModulePlacement[];
  wires: WorkbenchWire[];
  code: string;
  steps: string[];
}

export const WORKBENCH_MISSIONS: WorkbenchMission[] = [
  {
    id: 'hello-led',
    name: 'Hello, LED Blink',
    level: 'Beginner',
    duration: '3 min',
    boardId: 'arduino-uno-r3',
    summary: 'Wire a 5mm LED breakout module to digital pin D13 and toggle 0V ↔ 5V.',
    modules: [
      {
        instanceId: 'mod-led-1',
        specId: 'led-5mm-module',
        position: [1.45, 0.08, 0.05],
        rotationY: 0,
      },
    ],
    wires: [
      { id: 'w-led-sig', fromTarget: 'board', fromPin: 'D13', toTarget: 'mod-led-1', toPin: 'SIG', color: '#facc15' },
      { id: 'w-led-vcc', fromTarget: 'board', fromPin: '5V', toTarget: 'mod-led-1', toPin: 'VCC', color: '#ef4444' },
      { id: 'w-led-gnd', fromTarget: 'board', fromPin: 'GND', toTarget: 'mod-led-1', toPin: 'GND', color: '#18181b' },
    ],
    steps: [
      'Arduino Uno R3 D13 → 5mm LED SIG (digital HIGH/LOW pulse)',
      'Arduino Uno R3 5V → 5mm LED VCC',
      'Arduino Uno R3 GND → 5mm LED GND (completes loop)',
    ],
    code: `// Hello, LED Blink — Arduino Uno R3
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON (5V)");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("LED OFF (0V)");
  delay(500);
}`,
  },
  {
    id: 'ultrasonic-oled',
    name: 'Ultrasonic Radar + OLED',
    level: 'Intermediate',
    duration: '6 min',
    boardId: 'arduino-uno-r3',
    summary: 'Measure acoustic Time-of-Flight with HC-SR04 and stream live cm readout to I²C OLED.',
    modules: [
      {
        instanceId: 'mod-sonar-1',
        specId: 'hc-sr04-ultrasonic',
        position: [1.45, 0.08, -0.58],
        rotationY: 0,
      },
      {
        instanceId: 'mod-oled-1',
        specId: 'oled-ssd1306',
        position: [1.45, 0.08, 0.68],
        rotationY: 0,
      },
    ],
    wires: [
      { id: 'w-u-vcc', fromTarget: 'board', fromPin: '5V', toTarget: 'mod-sonar-1', toPin: 'VCC', color: '#ef4444' },
      { id: 'w-u-gnd', fromTarget: 'board', fromPin: 'GND', toTarget: 'mod-sonar-1', toPin: 'GND', color: '#18181b' },
      { id: 'w-u-trig', fromTarget: 'board', fromPin: 'D9', toTarget: 'mod-sonar-1', toPin: 'TRIG', color: '#38bdf8' },
      { id: 'w-u-echo', fromTarget: 'board', fromPin: 'D10', toTarget: 'mod-sonar-1', toPin: 'ECHO', color: '#34d399' },
      { id: 'w-o-sda', fromTarget: 'board', fromPin: 'A4', toTarget: 'mod-oled-1', toPin: 'SDA', color: '#a78bfa' },
      { id: 'w-o-scl', fromTarget: 'board', fromPin: 'A5', toTarget: 'mod-oled-1', toPin: 'SCL', color: '#f59e0b' },
      { id: 'w-o-gnd', fromTarget: 'board', fromPin: 'GND', toTarget: 'mod-oled-1', toPin: 'GND', color: '#18181b' },
    ],
    steps: [
      'HC-SR04 TRIG → D9, ECHO → D10, VCC → 5V, GND → GND',
      'SSD1306 OLED SDA → A4, SCL → A5 (hardware I²C bus)',
    ],
    code: `// HC-SR04 Ultrasonic + SSD1306 OLED Display
#define TRIG 9
#define ECHO 10
void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(115200);
}
void loop() {
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH);
  float cm = us * 0.0343 * 0.5;
  Serial.print("Distance: "); Serial.print(cm); Serial.println(" cm");
  delay(120);
}`,
  },
  {
    id: 'servo-sweep',
    name: 'SG90 Servo + Dial Control',
    level: 'Beginner',
    duration: '4 min',
    boardId: 'arduino-uno-r3',
    summary: 'Read a 10 kΩ potentiometer knob on A0 and drive a 50 Hz PWM signal to SG90 Servo.',
    modules: [
      {
        instanceId: 'mod-servo-1',
        specId: 'sg90-micro-servo',
        position: [1.4, 0.08, -0.5],
        rotationY: 0,
      },
      {
        instanceId: 'mod-pot-1',
        specId: 'potentiometer-10k',
        position: [1.4, 0.08, 0.62],
        rotationY: 0,
      },
    ],
    wires: [
      { id: 'w-s-pwm', fromTarget: 'board', fromPin: 'D9', toTarget: 'mod-servo-1', toPin: 'PWM', color: '#f59e0b' },
      { id: 'w-s-vcc', fromTarget: 'board', fromPin: '5V', toTarget: 'mod-servo-1', toPin: 'VCC', color: '#ef4444' },
      { id: 'w-s-gnd', fromTarget: 'board', fromPin: 'GND', toTarget: 'mod-servo-1', toPin: 'GND', color: '#18181b' },
      { id: 'w-p-out', fromTarget: 'board', fromPin: 'A0', toTarget: 'mod-pot-1', toPin: 'OUT', color: '#22d3ee' },
      { id: 'w-p-gnd', fromTarget: 'board', fromPin: 'GND', toTarget: 'mod-pot-1', toPin: 'GND', color: '#18181b' },
    ],
    steps: [
      'SG90 Micro Servo PWM → D9~, VCC → 5V, GND → GND',
      '10 kΩ Potentiometer OUT → Analog A0 (0–1023 ADC)',
    ],
    code: `// Potentiometer Controlled SG90 Servo
#include <Servo.h>
Servo arm;
void setup() { arm.attach(9); }
void loop() {
  int angle = map(analogRead(A0), 0, 1023, 0, 180);
  arm.write(angle);
  delay(15);
}`,
  },
  {
    id: 'motor-drive',
    name: 'L298N + TT Motor Bridge',
    level: 'Pro Robotics',
    duration: '8 min',
    boardId: 'esp32-devkit-v1',
    summary: 'Drive a geared DC wheel using ESP32 PWM, L298N H-bridge, and external 6V AA pack.',
    modules: [
      {
        instanceId: 'mod-l298-1',
        specId: 'l298n-motor-driver',
        position: [0.65, 0.08, -0.58],
        rotationY: 0,
      },
      {
        instanceId: 'mod-tt-1',
        specId: 'tt-gear-motor-wheel',
        position: [1.95, 0.08, 0.15],
        rotationY: -0.35,
      },
      {
        instanceId: 'mod-bat-1',
        specId: 'battery-4xaa',
        position: [-0.95, 0.08, 1.08],
        rotationY: 0,
      },
    ],
    wires: [
      { id: 'w-m-en', fromTarget: 'board', fromPin: 'D2', toTarget: 'mod-l298-1', toPin: 'ENA', color: '#facc15' },
      { id: 'w-m-in1', fromTarget: 'board', fromPin: 'D18', toTarget: 'mod-l298-1', toPin: 'IN1', color: '#38bdf8' },
      { id: 'w-m-pwr', fromTarget: 'mod-bat-1', fromPin: 'VCC', toTarget: 'mod-l298-1', toPin: '12V', color: '#ef4444' },
      { id: 'w-m-gnd', fromTarget: 'mod-bat-1', fromPin: 'GND', toTarget: 'mod-l298-1', toPin: 'GND', color: '#18181b' },
      { id: 'w-m-out', fromTarget: 'mod-l298-1', fromPin: 'IN2', toTarget: 'mod-tt-1', toPin: 'M+', color: '#fb923c' },
    ],
    steps: [
      'ESP32 GPIO2 (PWM) → L298N ENA, GPIO18 → IN1',
      '4×AA 6V Supply + → L298N +12V, Common GND linked',
      'L298N Bridge Output → TT Gear Motor + Wheel terminals',
    ],
    code: `// ESP32 + L298N H-Bridge TT Motor Speed Drive
void setup() {
  pinMode(18, OUTPUT);
  ledcSetup(0, 5000, 8);
  ledcAttachPin(2, 0);
}
void loop() {
  digitalWrite(18, HIGH);
  ledcWrite(0, 195); // ~76% PWM throttle
}`,
  },
];

export function createInitialWorkbenchConfig(): WorkbenchConfig {
  const m = WORKBENCH_MISSIONS[0];
  return {
    boardId: m.boardId,
    missionId: m.id,
    modules: structuredClone(m.modules),
    wires: structuredClone(m.wires),
    exploded: 0,
    powered: true,
  };
}

export function getHardwareSpec(specId: string): RoboticsHardwareSpec {
  return (
    ROBOTICS_HARDWARE_CATALOG.find((s) => s.id === specId) ?? ROBOTICS_HARDWARE_CATALOG[0]
  );
}

export interface Workbench3DHandle {
  group: THREE.Group;
  rotors: Array<{ mesh: THREE.Object3D; rpm: number }>;
  dispose: () => void;
}

export function buildWorkbench3DScene(cfg: WorkbenchConfig): Workbench3DHandle {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const rotors: Array<{ mesh: THREE.Object3D; rpm: number }> = [];

  // Slate Silicone Solder / Prototyping Bench Mat
  const benchGeom = new THREE.BoxGeometry(6.2, 0.08, 3.8);
  const benchMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.72,
    metalness: 0.12,
  });
  const bench = new THREE.Mesh(benchGeom, benchMat);
  bench.position.set(0.25, 0.04, 0.1);
  bench.receiveShadow = true;
  group.add(bench);
  disposables.push(benchGeom, benchMat);

  // Subtle recessed border trim around workbench mat
  const trimGeom = new THREE.BoxGeometry(6.28, 0.05, 3.88);
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.55,
    metalness: 0.35,
  });
  const trim = new THREE.Mesh(trimGeom, trimMat);
  trim.position.set(0.25, 0.025, 0.1);
  group.add(trim);
  disposables.push(trimGeom, trimMat);

  const boardOrigin: Vec3 = [-1.15, 0.08, -0.05];
  const boardBuilt = buildRoboticsHardwareGroup(cfg.boardId, { exploded: cfg.exploded });
  boardBuilt.group.position.set(...boardOrigin);
  group.add(boardBuilt.group);
  disposables.push(...boardBuilt.disposables);

  // Map placement IDs -> spec & world origin for pin resolution
  const placementMap = new Map<
    string,
    { spec: RoboticsHardwareSpec; origin: Vec3; rotY: number }
  >();
  placementMap.set('board', {
    spec: getHardwareSpec(cfg.boardId),
    origin: boardOrigin,
    rotY: 0,
  });

  for (const mod of cfg.modules) {
    const spec = getHardwareSpec(mod.specId);
    const built = buildRoboticsHardwareGroup(mod.specId, { exploded: cfg.exploded });
    built.group.position.set(...mod.position);
    built.group.rotation.y = mod.rotationY;
    group.add(built.group);
    disposables.push(...built.disposables);

    placementMap.set(mod.instanceId, {
      spec,
      origin: mod.position,
      rotY: mod.rotationY,
    });
  }

  // Resolve local pin coordinates to world XYZ on the workbench
  const resolvePinWorld = (targetId: string, pinId: string): THREE.Vector3 | null => {
    const target = placementMap.get(targetId);
    if (!target) return null;
    const pin =
      target.spec.pins.find((p) => p.id === pinId) ?? target.spec.pins[0];
    if (!pin) {
      return new THREE.Vector3(target.origin[0], target.origin[1] + 0.15, target.origin[2]);
    }
    const v = new THREE.Vector3(...pin.localPos);
    if (target.rotY) v.applyAxisAngle(new THREE.Vector3(0, 1, 0), target.rotY);
    v.add(new THREE.Vector3(...target.origin));
    return v;
  };

  // Shared DuPont plastic boot geometry
  const bootGeom = new THREE.BoxGeometry(0.065, 0.15, 0.065);
  const bootMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.5,
    metalness: 0.15,
  });
  disposables.push(bootGeom, bootMat);

  // Curved 3D Jumper Wires (TubeGeometry over CatmullRomCurve3 arches)
  cfg.wires.forEach((w, idx) => {
    const pA = resolvePinWorld(w.fromTarget, w.fromPin);
    const pB = resolvePinWorld(w.toTarget, w.toPin);
    if (!pA || !pB) return;

    const bootA = new THREE.Mesh(bootGeom, bootMat);
    bootA.position.set(pA.x, pA.y + 0.05, pA.z);
    const bootB = new THREE.Mesh(bootGeom, bootMat);
    bootB.position.set(pB.x, pB.y + 0.05, pB.z);
    group.add(bootA, bootB);

    const startTip = new THREE.Vector3(pA.x, pA.y + 0.12, pA.z);
    const endTip = new THREE.Vector3(pB.x, pB.y + 0.12, pB.z);
    const dist = startTip.distanceTo(endTip);
    const archH = Math.max(0.55, Math.min(1.45, 0.45 + dist * 0.28 + (idx % 3) * 0.09));
    const ctrl1 = startTip.clone().lerp(endTip, 0.28);
    ctrl1.y = Math.max(startTip.y, endTip.y) + archH;
    const ctrl2 = startTip.clone().lerp(endTip, 0.72);
    ctrl2.y = Math.max(startTip.y, endTip.y) + archH * 0.96;

    const curve = new THREE.CatmullRomCurve3([startTip, ctrl1, ctrl2, endTip]);
    const tubeGeom = new THREE.TubeGeometry(curve, 24, 0.024, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: w.color || '#facc15',
      roughness: 0.35,
      metalness: 0.1,
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    tubeMesh.castShadow = true;
    group.add(tubeMesh);
    disposables.push(tubeGeom, tubeMat);
  });

  return {
    group,
    rotors,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
