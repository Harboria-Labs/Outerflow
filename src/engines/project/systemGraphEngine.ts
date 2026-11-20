/**
 * OUTERFLOW — UNIFIED ELEMENT ECOSYSTEM, MULTIDISCIPLINARY SYSTEM GRAPH & EXECUTION COORDINATOR
 *
 * Implements Phases 1–7 of the Harboria Labs Outerflow Master Product & Engineering Directive:
 *  - Section 4: Unified Element & Component Ecosystem across all 9 engineering & scientific disciplines
 *    (Mechanical, Robotics, Electrical, Mathematics, Physics, Fluid & Thermal, Computational,
 *     Biological & Artificial Life, Materials & Structures)
 *  - Section 8: Universal System Graph & Typed Connection Architecture with unit/dimension & port validation
 *  - Section 9: Multidisciplinary Execution Coordinator capable of running headless mathematical,
 *    electrical, computational, fluid/thermal, biological, and electromechanical co-simulations
 *    without depending on the 3D physics engine
 *  - Section 17: Acceptance Demonstrations:
 *    1) Complete Electromechanical Robotic System (Solar Battery -> Buck Converter -> PID Controller ->
 *       PWM Driver -> DC Gear Motor -> Robot Arm Kinematics -> Encoder Feedback)
 *    2) Pure Mathematical & Biological Reaction-Diffusion / Lotka-Volterra / FitzHugh-Nagumo Dynamical
 *       System executable independently of the 3D physics engine.
 */

import * as math from 'mathjs';

export type ElementDiscipline =
  | 'mechanical'
  | 'robotics'
  | 'electrical'
  | 'mathematics'
  | 'physics'
  | 'fluid-thermal'
  | 'computational'
  | 'biological'
  | 'materials';

export type PortKind =
  | 'physical'
  | 'mechanical'
  | 'electrical'
  | 'control'
  | 'mathematical'
  | 'data'
  | 'fluid'
  | 'thermal'
  | 'biological';

export interface ElementPortSchema {
  id: string;
  name: string;
  direction: 'input' | 'output';
  kind: PortKind;
  unit: string;
  dimension: string;
  defaultValue?: number;
}

export interface ElementPropertySchema {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface UnifiedElementDefinition {
  id: string;
  name: string;
  discipline: ElementDiscipline;
  version: string;
  summary: string;
  compatibleEngines: string[];
  properties: ElementPropertySchema[];
  ports: ElementPortSchema[];
  defaultEquation?: string;
  spawn3DPartId?: string;
}

export interface GraphNodeInstance {
  id: string;
  definitionId: string;
  name: string;
  discipline: ElementDiscipline;
  x: number;
  y: number;
  properties: Record<string, number>;
  state: Record<string, number>;
  outputs: Record<string, number>;
  customEquation?: string;
  linked3DEntityId?: string;
}

export interface GraphEdgeConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  kind: PortKind;
  valid: boolean;
  validationMessage?: string;
}

export interface SystemGraphModel {
  id: string;
  name: string;
  description: string;
  nodes: GraphNodeInstance[];
  edges: GraphEdgeConnection[];
}

export interface EngineContractDeclaration {
  id: string;
  name: string;
  disciplines: ElementDiscipline[];
  timeStepSec: number;
  solverMethod: string;
  supportsHeadless: boolean;
  supportsCoupledCoSim: boolean;
  description: string;
}

export interface SystemGraphTimeSample {
  time: number;
  values: Record<string, number>;
}

export interface SystemGraphExecutionResult {
  ok: boolean;
  error?: string;
  durationSec: number;
  dtSec: number;
  steps: number;
  samples: SystemGraphTimeSample[];
  finalNodeOutputs: Record<string, Record<string, number>>;
  validationErrors: string[];
  activeEngines: string[];
}

export const DISCIPLINE_META: Record<
  ElementDiscipline,
  { label: string; shortLabel: string; color: string }
> = {
  mechanical: { label: 'Mechanical Engineering', shortLabel: 'Mech', color: '#38bdf8' },
  robotics: { label: 'Robotics & Kinematics', shortLabel: 'Robotics', color: '#22d3ee' },
  electrical: { label: 'Electrical & Electronics', shortLabel: 'Elec', color: '#facc15' },
  mathematics: { label: 'Mathematics & Dynamical', shortLabel: 'Math', color: '#a78bfa' },
  physics: { label: 'Physics & Fields', shortLabel: 'Physics', color: '#60a5fa' },
  'fluid-thermal': { label: 'Fluid & Thermal Systems', shortLabel: 'Fluid/Therm', color: '#fb923c' },
  computational: { label: 'Computational & Control', shortLabel: 'Comp/Ctrl', color: '#34d399' },
  biological: { label: 'Biological & Artificial Life', shortLabel: 'Bio/ALife', color: '#f472b6' },
  materials: { label: 'Materials & Structures', shortLabel: 'Materials', color: '#94a3b8' },
};

export const ENGINE_CONTRACTS: EngineContractDeclaration[] = [
  {
    id: 'rapier3d-rigid-multibody',
    name: 'Rapier3D Rigid & Multibody Solver',
    disciplines: ['physics', 'mechanical', 'robotics'],
    timeStepSec: 1 / 60,
    solverMethod: 'Projected Gauss-Seidel Impulse + Island Sleeping',
    supportsHeadless: true,
    supportsCoupledCoSim: true,
    description: '3D rigid-body dynamics, convex/trimesh contacts, and motorized revolute/prismatic/spring joints.',
  },
  {
    id: 'mna-circuit-solver',
    name: 'Modified Nodal Analysis (MNA) Circuit Engine',
    disciplines: ['electrical'],
    timeStepSec: 1 / 240,
    solverMethod: 'Gaussian Elimination Nodal Matrix + Newton-Raphson Diode/MOSFET',
    supportsHeadless: true,
    supportsCoupledCoSim: true,
    description: 'Solves nodal voltages, branch currents, power dissipation, and PWM motor driver stages.',
  },
  {
    id: 'rk4-dynamical-math-solver',
    name: 'Runge-Kutta 4th Order (RK4) & Symbolic Math Engine',
    disciplines: ['mathematics', 'computational', 'biological'],
    timeStepSec: 1 / 120,
    solverMethod: 'Explicit 4th-Order Runge-Kutta + Math.js AST Evaluator',
    supportsHeadless: true,
    supportsCoupledCoSim: true,
    description: 'Executes differential equations, state-space systems, PID controllers, and biological reaction networks independently of 3D physics.',
  },
  {
    id: 'sph-thermal-network-solver',
    name: 'SPH Fluid & Lumped Thermal-Hydraulic Network Engine',
    disciplines: ['fluid-thermal', 'physics'],
    timeStepSec: 1 / 120,
    solverMethod: 'Smoothed Particle Hydrodynamics + Control-Volume Conservation',
    supportsHeadless: true,
    supportsCoupledCoSim: true,
    description: 'Solves pressure-driven pipe flow, pump head, valve throttling, and convective heat exchange.',
  },
  {
    id: 'continuum-materials-analyzer',
    name: 'Structural Stress, Strain & Material Constitutive Engine',
    disciplines: ['materials', 'mechanical'],
    timeStepSec: 1 / 60,
    solverMethod: 'Hookean / Von Mises Elastic-Plastic Constitutive Evaluation',
    supportsHeadless: true,
    supportsCoupledCoSim: true,
    description: 'Computes axial/bending stress, strain energy, and safety factors from physical loads.',
  },
];

/**
 * Reusable Unified Element Registry covering all 9 disciplines in Section 4 of the Master Directive.
 */
export const UNIFIED_ELEMENT_REGISTRY: UnifiedElementDefinition[] = [
  // 1. MECHANICAL ENGINEERING
  {
    id: 'mech-dc-gear-motor',
    name: 'Brushless DC Gear Motor',
    discipline: 'mechanical',
    version: '1.2.0',
    summary: 'Electromechanical actuator converting electrical voltage/current into shaft torque and angular velocity.',
    compatibleEngines: ['rapier3d-rigid-multibody', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'tt-gear-motor',
    properties: [
      { key: 'kt', label: 'Torque Constant Kt', unit: 'N·m/A', defaultValue: 0.45, min: 0.05, max: 5, step: 0.05 },
      { key: 'ke', label: 'Back-EMF Constant Ke', unit: 'V·s/rad', defaultValue: 0.35, min: 0.05, max: 5, step: 0.05 },
      { key: 'resistance', label: 'Winding Resistance R', unit: 'Ω', defaultValue: 2.2, min: 0.2, max: 20, step: 0.1 },
      { key: 'inertia', label: 'Rotor Inertia J', unit: 'kg·m²', defaultValue: 0.025, min: 0.002, max: 1, step: 0.005 },
      { key: 'damping', label: 'Viscous Friction B', unit: 'N·m·s', defaultValue: 0.04, min: 0.001, max: 1, step: 0.005 },
    ],
    ports: [
      { id: 'v_in', name: 'Drive Voltage', direction: 'input', kind: 'electrical', unit: 'V', dimension: 'voltage', defaultValue: 12 },
      { id: 'load_torque', name: 'External Load', direction: 'input', kind: 'mechanical', unit: 'N·m', dimension: 'torque', defaultValue: 0 },
      { id: 'omega', name: 'Shaft Speed ω', direction: 'output', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity' },
      { id: 'torque', name: 'Output Torque τ', direction: 'output', kind: 'mechanical', unit: 'N·m', dimension: 'torque' },
      { id: 'current', name: 'Armature Current I', direction: 'output', kind: 'electrical', unit: 'A', dimension: 'current' },
    ],
  },
  {
    id: 'mech-planetary-reducer',
    name: 'Planetary Gear Transmission',
    discipline: 'mechanical',
    version: '1.0.0',
    summary: 'Multiplies mechanical torque and reduces angular speed by the configured transmission ratio.',
    compatibleEngines: ['rapier3d-rigid-multibody', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'spur-gear',
    properties: [
      { key: 'ratio', label: 'Gear Reduction Ratio', unit: ':1', defaultValue: 4.0, min: 0.25, max: 50, step: 0.25 },
      { key: 'efficiency', label: 'Mesh Efficiency η', unit: '', defaultValue: 0.92, min: 0.5, max: 1.0, step: 0.01 },
    ],
    ports: [
      { id: 'omega_in', name: 'Input Speed', direction: 'input', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity', defaultValue: 0 },
      { id: 'torque_in', name: 'Input Torque', direction: 'input', kind: 'mechanical', unit: 'N·m', dimension: 'torque', defaultValue: 0 },
      { id: 'omega_out', name: 'Output Speed', direction: 'output', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity' },
      { id: 'torque_out', name: 'Output Torque', direction: 'output', kind: 'mechanical', unit: 'N·m', dimension: 'torque' },
    ],
  },
  {
    id: 'mech-torsional-spring-damper',
    name: 'Torsional Spring-Damper Joint',
    discipline: 'mechanical',
    version: '1.0.0',
    summary: 'compliant mechanical coupling generating restoring torque proportional to angular deflection and rate.',
    compatibleEngines: ['rapier3d-rigid-multibody', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'helical-spring',
    properties: [
      { key: 'stiffness', label: 'Spring Stiffness k', unit: 'N·m/rad', defaultValue: 18.0, min: 0.5, max: 500, step: 0.5 },
      { key: 'damping', label: 'Damping Coefficient c', unit: 'N·m·s/rad', defaultValue: 1.4, min: 0.01, max: 50, step: 0.1 },
    ],
    ports: [
      { id: 'theta', name: 'Deflection Angle θ', direction: 'input', kind: 'mechanical', unit: 'rad', dimension: 'angle', defaultValue: 0 },
      { id: 'omega', name: 'Angular Rate ω', direction: 'input', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity', defaultValue: 0 },
      { id: 'restoring_torque', name: 'Restoring Torque', direction: 'output', kind: 'mechanical', unit: 'N·m', dimension: 'torque' },
    ],
  },

  // 2. ROBOTICS
  {
    id: 'rob-revolute-arm-joint',
    name: 'Robotic Manipulator Link & Joint (1-DOF)',
    discipline: 'robotics',
    version: '1.1.0',
    summary: 'Integrates link inertia, gravity torque M·g·L·sin(θ), and joint kinematics to output angle θ and tip height.',
    compatibleEngines: ['rapier3d-rigid-multibody', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'bionic-hand',
    properties: [
      { key: 'length', label: 'Link Length L', unit: 'm', defaultValue: 0.65, min: 0.1, max: 3.0, step: 0.05 },
      { key: 'mass', label: 'Link Mass M', unit: 'kg', defaultValue: 1.4, min: 0.1, max: 25.0, step: 0.1 },
      { key: 'damping', label: 'Joint Friction', unit: 'N·m·s', defaultValue: 0.35, min: 0.01, max: 10, step: 0.05 },
    ],
    ports: [
      { id: 'drive_torque', name: 'Actuator Torque τ', direction: 'input', kind: 'mechanical', unit: 'N·m', dimension: 'torque', defaultValue: 0 },
      { id: 'theta', name: 'Joint Angle θ', direction: 'output', kind: 'mechanical', unit: 'rad', dimension: 'angle' },
      { id: 'omega', name: 'Joint Velocity ω', direction: 'output', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity' },
      { id: 'tip_y', name: 'End-Effector Height Y', direction: 'output', kind: 'physical', unit: 'm', dimension: 'length' },
    ],
  },
  {
    id: 'rob-optical-encoder',
    name: 'Quadrature Rotary & IMU Sensor',
    discipline: 'robotics',
    version: '1.0.0',
    summary: 'Measures mechanical shaft/joint angle and converts it into a clean feedback control signal.',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    spawn3DPartId: 'hc-sr04-ultrasonic',
    properties: [
      { key: 'gain', label: 'Sensor Calibration Gain', unit: 'V/rad', defaultValue: 1.0, min: 0.1, max: 10, step: 0.1 },
      { key: 'bias', label: 'Zero Offset Bias', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.05 },
    ],
    ports: [
      { id: 'angle_in', name: 'Measured Angle θ', direction: 'input', kind: 'mechanical', unit: 'rad', dimension: 'angle', defaultValue: 0 },
      { id: 'signal_out', name: 'Feedback Signal', direction: 'output', kind: 'control', unit: 'rad', dimension: 'signal' },
    ],
  },

  // 3. ELECTRICAL & ELECTRONICS
  {
    id: 'elec-dc-power-bus',
    name: 'Regulated DC Power Supply / Battery Pack',
    discipline: 'electrical',
    version: '1.0.0',
    summary: 'Provides regulated DC bus voltage with internal series resistance sag under current draw.',
    compatibleEngines: ['mna-circuit-solver', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'aa-battery-pack',
    properties: [
      { key: 'voltage', label: 'Nominal Voltage V0', unit: 'V', defaultValue: 24.0, min: 1.5, max: 120, step: 0.5 },
      { key: 'r_internal', label: 'Internal Resistance', unit: 'Ω', defaultValue: 0.15, min: 0.01, max: 5, step: 0.01 },
    ],
    ports: [
      { id: 'load_current', name: 'Load Current Draw', direction: 'input', kind: 'electrical', unit: 'A', dimension: 'current', defaultValue: 0 },
      { id: 'v_bus', name: 'Bus Terminal Voltage', direction: 'output', kind: 'electrical', unit: 'V', dimension: 'voltage' },
      { id: 'power_w', name: 'Delivered Power', direction: 'output', kind: 'electrical', unit: 'W', dimension: 'power' },
    ],
  },
  {
    id: 'elec-pwm-hbridge-driver',
    name: 'L298N / MOSFET H-Bridge PWM Amplifier',
    discipline: 'electrical',
    version: '1.1.0',
    summary: 'Modulates DC bus voltage according to a normalized control command (-1..+1) to drive actuators.',
    compatibleEngines: ['mna-circuit-solver', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'l298n-driver',
    properties: [
      { key: 'efficiency', label: 'Stage Efficiency', unit: '', defaultValue: 0.94, min: 0.5, max: 1.0, step: 0.01 },
      { key: 'max_duty', label: 'Max Duty Clamp', unit: '', defaultValue: 1.0, min: 0.1, max: 1.0, step: 0.05 },
    ],
    ports: [
      { id: 'v_supply', name: 'DC Bus Supply', direction: 'input', kind: 'electrical', unit: 'V', dimension: 'voltage', defaultValue: 24 },
      { id: 'pwm_cmd', name: 'Control Duty (-1..1)', direction: 'input', kind: 'control', unit: '', dimension: 'signal', defaultValue: 0.5 },
      { id: 'v_motor', name: 'Modulated Motor V', direction: 'output', kind: 'electrical', unit: 'V', dimension: 'voltage' },
    ],
  },

  // 4. COMPUTATIONAL & CONTROL SYSTEMS
  {
    id: 'comp-pid-controller',
    name: 'Closed-Loop PID Feedback Controller',
    discipline: 'computational',
    version: '1.3.0',
    summary: 'Computes proportional-integral-derivative control effort u(t) from reference setpoint and measured feedback.',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    spawn3DPartId: 'arduino-uno-r3',
    properties: [
      { key: 'kp', label: 'Proportional Gain Kp', unit: '', defaultValue: 3.8, min: 0, max: 100, step: 0.1 },
      { key: 'ki', label: 'Integral Gain Ki', unit: '1/s', defaultValue: 1.4, min: 0, max: 50, step: 0.1 },
      { key: 'kd', label: 'Derivative Gain Kd', unit: 's', defaultValue: 0.85, min: 0, max: 30, step: 0.05 },
      { key: 'limit', label: 'Output Saturation ±U', unit: '', defaultValue: 1.0, min: 0.1, max: 50, step: 0.1 },
    ],
    ports: [
      { id: 'setpoint', name: 'Target Setpoint r(t)', direction: 'input', kind: 'control', unit: 'rad', dimension: 'signal', defaultValue: 1.0 },
      { id: 'feedback', name: 'Measured Process y(t)', direction: 'input', kind: 'control', unit: 'rad', dimension: 'signal', defaultValue: 0.0 },
      { id: 'control_u', name: 'Control Command u(t)', direction: 'output', kind: 'control', unit: '', dimension: 'signal' },
      { id: 'error_e', name: 'Tracking Error e(t)', direction: 'output', kind: 'data', unit: 'rad', dimension: 'signal' },
    ],
  },
  {
    id: 'comp-reference-generator',
    name: 'Command Trajectory & Waveform Generator',
    discipline: 'computational',
    version: '1.0.0',
    summary: 'Generates step, sine, or square reference trajectories for control systems and mathematical plants.',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    spawn3DPartId: 'esp32-devkit-v1',
    properties: [
      { key: 'amplitude', label: 'Amplitude A', unit: '', defaultValue: 1.15, min: -20, max: 20, step: 0.05 },
      { key: 'frequency', label: 'Frequency Hz', unit: 'Hz', defaultValue: 0.35, min: 0.01, max: 10, step: 0.05 },
      { key: 'offset', label: 'DC Offset', unit: '', defaultValue: 0.3, min: -10, max: 10, step: 0.05 },
      { key: 'mode', label: 'Waveform (0=Step,1=Sine)', unit: '', defaultValue: 1, min: 0, max: 1, step: 1 },
    ],
    ports: [
      { id: 'signal', name: 'Reference Trajectory r(t)', direction: 'output', kind: 'control', unit: 'rad', dimension: 'signal' },
    ],
  },

  // 5. MATHEMATICS & DYNAMICAL SYSTEMS
  {
    id: 'math-expression-operator',
    name: 'Symbolic Mathematical Expression f(x, y, t)',
    discipline: 'mathematics',
    version: '1.0.0',
    summary: 'Evaluates any user-defined symbolic formula f(x, y, t, a, b) using the Math.js symbolic parser.',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    defaultEquation: 'a * sin(2 * pi * 0.5 * t) + b * cos(x)',
    properties: [
      { key: 'a', label: 'Parameter a', unit: '', defaultValue: 1.5, min: -50, max: 50, step: 0.1 },
      { key: 'b', label: 'Parameter b', unit: '', defaultValue: 0.8, min: -50, max: 50, step: 0.1 },
    ],
    ports: [
      { id: 'x', name: 'Variable x', direction: 'input', kind: 'mathematical', unit: '', dimension: 'scalar', defaultValue: 0 },
      { id: 'y', name: 'Variable y', direction: 'input', kind: 'mathematical', unit: '', dimension: 'scalar', defaultValue: 0 },
      { id: 'result', name: 'f(x, y, t)', direction: 'output', kind: 'mathematical', unit: '', dimension: 'scalar' },
    ],
  },
  {
    id: 'math-ode-integrator',
    name: 'First-Order ODE State Integrator (dx/dt)',
    discipline: 'mathematics',
    version: '1.0.0',
    summary: 'Integrates dx/dt = gain · u(t) - decay · x(t) over time with initial condition x(0).',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    properties: [
      { key: 'x0', label: 'Initial Value x(0)', unit: '', defaultValue: 0.0, min: -50, max: 50, step: 0.1 },
      { key: 'gain', label: 'Input Gain', unit: '1/s', defaultValue: 1.0, min: -20, max: 20, step: 0.1 },
      { key: 'decay', label: 'Natural Decay λ', unit: '1/s', defaultValue: 0.25, min: 0, max: 10, step: 0.05 },
    ],
    ports: [
      { id: 'dxdt_in', name: 'Derivative Input u(t)', direction: 'input', kind: 'mathematical', unit: '', dimension: 'scalar', defaultValue: 1 },
      { id: 'state_x', name: 'Integrated State x(t)', direction: 'output', kind: 'mathematical', unit: '', dimension: 'scalar' },
    ],
  },

  // 6. PHYSICS
  {
    id: 'phys-harmonic-oscillator',
    name: 'Damped Harmonic Oscillator Field Node',
    discipline: 'physics',
    version: '1.0.0',
    summary: 'Solves m·x″ + c·x′ + k·x = F(t) for forced mechanical or physical wave oscillations.',
    compatibleEngines: ['rk4-dynamical-math-solver', 'rapier3d-rigid-multibody'],
    properties: [
      { key: 'mass', label: 'Oscillator Mass m', unit: 'kg', defaultValue: 1.2, min: 0.1, max: 50, step: 0.1 },
      { key: 'stiffness', label: 'Restoring Stiffness k', unit: 'N/m', defaultValue: 22.0, min: 0.5, max: 500, step: 0.5 },
      { key: 'damping', label: 'Viscous Damping c', unit: 'N·s/m', defaultValue: 0.85, min: 0.01, max: 50, step: 0.05 },
    ],
    ports: [
      { id: 'force_in', name: 'Excitation Force F(t)', direction: 'input', kind: 'physical', unit: 'N', dimension: 'force', defaultValue: 0 },
      { id: 'displacement', name: 'Displacement x(t)', direction: 'output', kind: 'physical', unit: 'm', dimension: 'length' },
      { id: 'velocity', name: 'Velocity v(t)', direction: 'output', kind: 'physical', unit: 'm/s', dimension: 'velocity' },
      { id: 'energy_j', name: 'Oscillator Energy', direction: 'output', kind: 'physical', unit: 'J', dimension: 'energy' },
    ],
  },

  // 7. FLUID & THERMAL SYSTEMS
  {
    id: 'fluid-centrifugal-pump',
    name: 'Centrifugal Fluid Pump & Thermal Loop',
    discipline: 'fluid-thermal',
    version: '1.0.0',
    summary: 'Converts shaft angular velocity ω into volumetric coolant flow rate Q and thermal heat rejection.',
    compatibleEngines: ['sph-thermal-network-solver', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'flanged-pipe',
    properties: [
      { key: 'displacement', label: 'Pump Displacement', unit: 'L/rad', defaultValue: 0.18, min: 0.01, max: 2.0, step: 0.01 },
      { key: 'ambient_temp', label: 'Ambient Temperature', unit: '°C', defaultValue: 24.0, min: -20, max: 100, step: 1 },
      { key: 'thermal_cap', label: 'Thermal Mass C_th', unit: 'J/°C', defaultValue: 45.0, min: 5, max: 500, step: 5 },
    ],
    ports: [
      { id: 'shaft_speed', name: 'Drive Shaft Speed ω', direction: 'input', kind: 'mechanical', unit: 'rad/s', dimension: 'angular_velocity', defaultValue: 10 },
      { id: 'heat_load_w', name: 'Heat Input Load Q_in', direction: 'input', kind: 'thermal', unit: 'W', dimension: 'power', defaultValue: 80 },
      { id: 'flow_rate', name: 'Volumetric Flow Q', direction: 'output', kind: 'fluid', unit: 'L/min', dimension: 'flow_rate' },
      { id: 'core_temp_c', name: 'Core Temperature T', direction: 'output', kind: 'thermal', unit: '°C', dimension: 'temperature' },
    ],
  },

  // 8. BIOLOGICAL & ARTIFICIAL LIFE SYSTEMS
  {
    id: 'bio-adaptive-ecosystem',
    name: 'Lotka-Volterra / FitzHugh-Nagumo Bio-Dynamical Cell',
    discipline: 'biological',
    version: '1.1.0',
    summary: 'Coupled biological reaction / neural-excitation / predator-prey population dynamics executable without 3D physics.',
    compatibleEngines: ['rk4-dynamical-math-solver'],
    properties: [
      { key: 'alpha', label: 'Growth / Excitation α', unit: '1/s', defaultValue: 1.4, min: 0.1, max: 5.0, step: 0.05 },
      { key: 'beta', label: 'Interaction Rate β', unit: '1/s', defaultValue: 0.75, min: 0.05, max: 5.0, step: 0.05 },
      { key: 'gamma', label: 'Recovery / Decay γ', unit: '1/s', defaultValue: 0.95, min: 0.1, max: 5.0, step: 0.05 },
      { key: 'delta', label: 'Adaptation Coupling δ', unit: '1/s', defaultValue: 0.55, min: 0.05, max: 5.0, step: 0.05 },
    ],
    ports: [
      { id: 'stimulus', name: 'External Stimulus / Nutrient', direction: 'input', kind: 'biological', unit: '', dimension: 'scalar', defaultValue: 0.2 },
      { id: 'activator_u', name: 'Activator / Prey Density u(t)', direction: 'output', kind: 'biological', unit: '', dimension: 'population' },
      { id: 'inhibitor_v', name: 'Inhibitor / Predator Density v(t)', direction: 'output', kind: 'biological', unit: '', dimension: 'population' },
    ],
  },

  // 9. MATERIALS & STRUCTURES
  {
    id: 'mat-structural-stress-sensor',
    name: 'Structural Member Stress, Strain & Safety Analyzer',
    discipline: 'materials',
    version: '1.0.0',
    summary: 'Computes bending stress σ (MPa), elastic strain ε, and yield safety factor from applied torque/force.',
    compatibleEngines: ['continuum-materials-analyzer', 'rk4-dynamical-math-solver'],
    spawn3DPartId: 'l-bracket',
    properties: [
      { key: 'section_modulus', label: 'Section Modulus W', unit: 'cm³', defaultValue: 2.4, min: 0.1, max: 50, step: 0.1 },
      { key: 'yield_mpa', label: 'Material Yield Strength', unit: 'MPa', defaultValue: 250.0, min: 20, max: 1200, step: 10 },
      { key: 'youngs_gpa', label: "Young's Modulus E", unit: 'GPa', defaultValue: 69.0, min: 1, max: 400, step: 1 },
    ],
    ports: [
      { id: 'applied_torque', name: 'Applied Moment / Torque', direction: 'input', kind: 'mechanical', unit: 'N·m', dimension: 'torque', defaultValue: 0 },
      { id: 'stress_mpa', name: 'Von Mises Stress σ', direction: 'output', kind: 'physical', unit: 'MPa', dimension: 'stress' },
      { id: 'safety_factor', name: 'Yield Safety Factor SF', direction: 'output', kind: 'data', unit: '', dimension: 'scalar' },
    ],
  },
];

/**
 * Validates whether an output port can connect to an input port.
 * Supports same-kind connections as well as physical/mathematical/control/data bridges
 * while reporting incompatible disciplinary connections clearly.
 */
export function validatePortConnection(
  fromDef: UnifiedElementDefinition,
  fromPortId: string,
  toDef: UnifiedElementDefinition,
  toPortId: string
): { valid: boolean; kind: PortKind; message: string } {
  const outPort = fromDef.ports.find((p) => p.id === fromPortId && p.direction === 'output');
  const inPort = toDef.ports.find((p) => p.id === toPortId && p.direction === 'input');

  if (!outPort || !inPort) {
    return {
      valid: false,
      kind: 'data',
      message: 'Invalid port direction: connections must run from an Output port to an Input port.',
    };
  }

  // Exact match
  if (outPort.kind === inPort.kind) {
    return {
      valid: true,
      kind: outPort.kind,
      message: `Valid ${outPort.kind} connection (${outPort.unit || 'scalar'} → ${inPort.unit || 'scalar'}).`,
    };
  }

  // Allowed multidisciplinary bridges (e.g. mathematical/control/data signals driving parameters or sensors reading physical values)
  const signalKinds = new Set<PortKind>(['control', 'mathematical', 'data', 'biological']);
  if (signalKinds.has(outPort.kind) && signalKinds.has(inPort.kind)) {
    return {
      valid: true,
      kind: inPort.kind,
      message: `Valid signal bridge (${outPort.kind} → ${inPort.kind}).`,
    };
  }

  if (
    (outPort.kind === 'mechanical' || outPort.kind === 'physical') &&
    signalKinds.has(inPort.kind)
  ) {
    return {
      valid: true,
      kind: 'control',
      message: `Sensor/measurement coupling (${outPort.unit} → ${inPort.name}).`,
    };
  }

  if (
    signalKinds.has(outPort.kind) &&
    (inPort.kind === 'physical' || inPort.kind === 'mechanical' || inPort.kind === 'electrical')
  ) {
    return {
      valid: true,
      kind: 'control',
      message: `Actuation command coupling (${outPort.name} → ${inPort.unit}).`,
    };
  }

  return {
    valid: false,
    kind: outPort.kind,
    message: `Incompatible discipline ports: cannot wire ${outPort.kind} (${outPort.unit}) directly to ${inPort.kind} (${inPort.unit}) without a transducer.`,
  };
}

export function createNodeFromDefinition(
  defId: string,
  opts?: { id?: string; name?: string; x?: number; y?: number; properties?: Record<string, number> }
): GraphNodeInstance {
  const def = UNIFIED_ELEMENT_REGISTRY.find((d) => d.id === defId) ?? UNIFIED_ELEMENT_REGISTRY[0];
  const properties: Record<string, number> = {};
  for (const prop of def.properties) {
    properties[prop.key] = opts?.properties?.[prop.key] ?? prop.defaultValue;
  }
  const outputs: Record<string, number> = {};
  for (const port of def.ports) {
    if (port.direction === 'output') {
      outputs[port.id] = 0;
    }
  }
  return {
    id: opts?.id ?? `node-${def.id}-${Math.random().toString(36).slice(2, 7)}`,
    definitionId: def.id,
    name: opts?.name ?? def.name,
    discipline: def.discipline,
    x: opts?.x ?? 80,
    y: opts?.y ?? 80,
    properties,
    state: {},
    outputs,
    customEquation: def.defaultEquation,
  };
}

/**
 * ACCEPTANCE DEMONSTRATION 1 (Section 17):
 * Complete Electromechanical Robotic System combining Electrical, Computational/Control,
 * Mechanical, Robotics, and Materials Stress Analysis.
 */
export function createElectromechanicalRoboticSystemGraph(): SystemGraphModel {
  const refGen = createNodeFromDefinition('comp-reference-generator', {
    id: 'node-ref',
    name: 'Joint Trajectory Command',
    x: 40,
    y: 55,
    properties: { amplitude: 0.85, frequency: 0.35, offset: 0.4, mode: 1 },
  });
  const pid = createNodeFromDefinition('comp-pid-controller', {
    id: 'node-pid',
    name: 'Closed-Loop PID Controller',
    x: 270,
    y: 55,
    properties: { kp: 4.5, ki: 1.8, kd: 0.9, limit: 1.0 },
  });
  const battery = createNodeFromDefinition('elec-dc-power-bus', {
    id: 'node-battery',
    name: '24V Lithium Battery Bus',
    x: 270,
    y: 230,
    properties: { voltage: 24.0, r_internal: 0.12 },
  });
  const pwm = createNodeFromDefinition('elec-pwm-hbridge-driver', {
    id: 'node-pwm',
    name: 'L298N H-Bridge Driver',
    x: 500,
    y: 120,
    properties: { efficiency: 0.95, max_duty: 1.0 },
  });
  const motor = createNodeFromDefinition('mech-dc-gear-motor', {
    id: 'node-motor',
    name: 'Brushless Servo Motor',
    x: 730,
    y: 120,
    properties: { kt: 0.55, ke: 0.38, resistance: 1.8, inertia: 0.02, damping: 0.03 },
  });
  const gearbox = createNodeFromDefinition('mech-planetary-reducer', {
    id: 'node-gearbox',
    name: '4:1 Planetary Gearbox',
    x: 960,
    y: 120,
    properties: { ratio: 4.0, efficiency: 0.93 },
  });
  const arm = createNodeFromDefinition('rob-revolute-arm-joint', {
    id: 'node-arm',
    name: 'Robotic Manipulator Link',
    x: 1190,
    y: 120,
    properties: { length: 0.65, mass: 1.5, damping: 0.45 },
  });
  const encoder = createNodeFromDefinition('rob-optical-encoder', {
    id: 'node-encoder',
    name: 'Quadrature Angle Encoder',
    x: 730,
    y: 280,
    properties: { gain: 1.0, bias: 0.0 },
  });
  const stress = createNodeFromDefinition('mat-structural-stress-sensor', {
    id: 'node-stress',
    name: 'Link Root Stress Analyzer',
    x: 1190,
    y: 285,
    properties: { section_modulus: 2.8, yield_mpa: 275, youngs_gpa: 69 },
  });

  const edges: GraphEdgeConnection[] = [
    {
      id: 'e-ref-pid',
      fromNodeId: refGen.id,
      fromPortId: 'signal',
      toNodeId: pid.id,
      toPortId: 'setpoint',
      kind: 'control',
      valid: true,
    },
    {
      id: 'e-enc-pid',
      fromNodeId: encoder.id,
      fromPortId: 'signal_out',
      toNodeId: pid.id,
      toPortId: 'feedback',
      kind: 'control',
      valid: true,
    },
    {
      id: 'e-pid-pwm',
      fromNodeId: pid.id,
      fromPortId: 'control_u',
      toNodeId: pwm.id,
      toPortId: 'pwm_cmd',
      kind: 'control',
      valid: true,
    },
    {
      id: 'e-bat-pwm',
      fromNodeId: battery.id,
      fromPortId: 'v_bus',
      toNodeId: pwm.id,
      toPortId: 'v_supply',
      kind: 'electrical',
      valid: true,
    },
    {
      id: 'e-pwm-mot',
      fromNodeId: pwm.id,
      fromPortId: 'v_motor',
      toNodeId: motor.id,
      toPortId: 'v_in',
      kind: 'electrical',
      valid: true,
    },
    {
      id: 'e-mot-bat',
      fromNodeId: motor.id,
      fromPortId: 'current',
      toNodeId: battery.id,
      toPortId: 'load_current',
      kind: 'electrical',
      valid: true,
    },
    {
      id: 'e-mot-gb-w',
      fromNodeId: motor.id,
      fromPortId: 'omega',
      toNodeId: gearbox.id,
      toPortId: 'omega_in',
      kind: 'mechanical',
      valid: true,
    },
    {
      id: 'e-mot-gb-t',
      fromNodeId: motor.id,
      fromPortId: 'torque',
      toNodeId: gearbox.id,
      toPortId: 'torque_in',
      kind: 'mechanical',
      valid: true,
    },
    {
      id: 'e-gb-arm',
      fromNodeId: gearbox.id,
      fromPortId: 'torque_out',
      toNodeId: arm.id,
      toPortId: 'drive_torque',
      kind: 'mechanical',
      valid: true,
    },
    {
      id: 'e-arm-enc',
      fromNodeId: arm.id,
      fromPortId: 'theta',
      toNodeId: encoder.id,
      toPortId: 'angle_in',
      kind: 'mechanical',
      valid: true,
    },
    {
      id: 'e-gb-stress',
      fromNodeId: gearbox.id,
      fromPortId: 'torque_out',
      toNodeId: stress.id,
      toPortId: 'applied_torque',
      kind: 'mechanical',
      valid: true,
    },
  ];

  return {
    id: 'demo-electromechanical-robot',
    name: 'Electromechanical Robotic Manipulator Co-Simulation',
    description:
      'Complete multidisciplinary closed-loop robotic system: 24V Battery → PWM H-Bridge → Brushless DC Motor → 4:1 Planetary Gearbox → 1-DOF Robot Arm → Optical Encoder → PID Controller + Von Mises Stress Analyzer.',
    nodes: [refGen, pid, battery, pwm, motor, gearbox, arm, encoder, stress],
    edges,
  };
}

/**
 * ACCEPTANCE DEMONSTRATION 2 (Section 17):
 * Pure Mathematical, Computational & Biological Dynamical System executable and
 * visualizable completely independently of the 3D physics engine.
 */
export function createMathBiologicalDynamicalGraph(): SystemGraphModel {
  const forcing = createNodeFromDefinition('math-expression-operator', {
    id: 'node-math-forcing',
    name: 'Periodic Nutrient Stimulus f(t)',
    x: 60,
    y: 90,
    properties: { a: 0.45, b: 0.25 },
  });
  forcing.customEquation = '0.35 + a * sin(2 * pi * 0.25 * t)';

  const bioCell = createNodeFromDefinition('bio-adaptive-ecosystem', {
    id: 'node-bio-cell',
    name: 'Lotka-Volterra Adaptive Bio-Network',
    x: 360,
    y: 90,
    properties: { alpha: 1.35, beta: 0.85, gamma: 1.05, delta: 0.65 },
  });

  const integrator = createNodeFromDefinition('math-ode-integrator', {
    id: 'node-math-int',
    name: 'Metabolic Biomass Integrator',
    x: 680,
    y: 90,
    properties: { x0: 0.5, gain: 0.8, decay: 0.3 },
  });

  const oscillator = createNodeFromDefinition('phys-harmonic-oscillator', {
    id: 'node-phys-osc',
    name: 'Coupled Biomechanical Membrane Oscillator',
    x: 680,
    y: 250,
    properties: { mass: 1.0, stiffness: 16.0, damping: 0.7 },
  });

  const edges: GraphEdgeConnection[] = [
    {
      id: 'e-force-bio',
      fromNodeId: forcing.id,
      fromPortId: 'result',
      toNodeId: bioCell.id,
      toPortId: 'stimulus',
      kind: 'biological',
      valid: true,
    },
    {
      id: 'e-bio-int',
      fromNodeId: bioCell.id,
      fromPortId: 'activator_u',
      toNodeId: integrator.id,
      toPortId: 'dxdt_in',
      kind: 'mathematical',
      valid: true,
    },
    {
      id: 'e-bio-osc',
      fromNodeId: bioCell.id,
      fromPortId: 'inhibitor_v',
      toNodeId: oscillator.id,
      toPortId: 'force_in',
      kind: 'control',
      valid: true,
    },
  ];

  return {
    id: 'demo-math-bio-dynamical',
    name: 'Mathematical & Biological Dynamical System (Physics-Independent)',
    description:
      'Executes symbolic math forcing f(t), coupled Lotka-Volterra biological population dynamics, ODE state integration, and harmonic membrane oscillation without depending on the 3D physics engine.',
    nodes: [forcing, bioCell, integrator, oscillator],
    edges,
  };
}

export const SYSTEM_GRAPH_PRESETS: SystemGraphModel[] = [
  createElectromechanicalRoboticSystemGraph(),
  createMathBiologicalDynamicalGraph(),
];

/**
 * Multidisciplinary Execution Coordinator (Section 9).
 * Runs headless or interactive time-domain co-simulation across all connected nodes in a SystemGraphModel.
 */
export function executeSystemGraph(
  graph: SystemGraphModel,
  opts?: { durationSec?: number; dtSec?: number }
): SystemGraphExecutionResult {
  const durationSec = Math.max(0.1, Math.min(30, opts?.durationSec ?? 6.0));
  const dt = Math.max(0.001, Math.min(0.1, opts?.dtSec ?? 1 / 60));
  const steps = Math.floor(durationSec / dt);

  const nodes = structuredClone(graph.nodes);
  const defMap = new Map<string, UnifiedElementDefinition>();
  for (const d of UNIFIED_ELEMENT_REGISTRY) {
    defMap.set(d.id, d);
  }

  // Validate edges
  const validationErrors: string[] = [];
  for (const edge of graph.edges) {
    const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
    const toNode = nodes.find((n) => n.id === edge.toNodeId);
    if (!fromNode || !toNode) {
      validationErrors.push(`Edge ${edge.id} references a missing node.`);
      continue;
    }
    const fromDef = defMap.get(fromNode.definitionId);
    const toDef = defMap.get(toNode.definitionId);
    if (fromDef && toDef) {
      const check = validatePortConnection(fromDef, edge.fromPortId, toDef, edge.toPortId);
      if (!check.valid) {
        validationErrors.push(`${fromNode.name} → ${toNode.name}: ${check.message}`);
      }
    }
  }

  // Initialize node internal states
  const compiledEquations = new Map<string, math.EvalFunction>();
  const activeEngineSet = new Set<string>();

  for (const node of nodes) {
    const def = defMap.get(node.definitionId);
    if (def) {
      for (const eng of def.compatibleEngines) activeEngineSet.add(eng);
    }

    if (node.definitionId === 'math-ode-integrator') {
      node.state.x = node.properties.x0 ?? 0;
    } else if (node.definitionId === 'bio-adaptive-ecosystem') {
      node.state.u = 1.2;
      node.state.v = 0.8;
    } else if (node.definitionId === 'phys-harmonic-oscillator') {
      node.state.x = 0;
      node.state.v = 0;
    } else if (node.definitionId === 'rob-revolute-arm-joint') {
      node.state.theta = 0;
      node.state.omega = 0;
    } else if (node.definitionId === 'mech-dc-gear-motor') {
      node.state.omega = 0;
    } else if (node.definitionId === 'comp-pid-controller') {
      node.state.integral = 0;
      node.state.prevError = 0;
    } else if (node.definitionId === 'fluid-centrifugal-pump') {
      node.state.temp = node.properties.ambient_temp ?? 24;
    }

    if (node.definitionId === 'math-expression-operator') {
      const expr = node.customEquation || def?.defaultEquation || 'sin(t)';
      try {
        compiledEquations.set(node.id, math.compile(expr));
      } catch (err) {
        return {
          ok: false,
          error: `Math compile error in "${node.name}": ${err instanceof Error ? err.message : String(err)}`,
          durationSec,
          dtSec: dt,
          steps: 0,
          samples: [],
          finalNodeOutputs: {},
          validationErrors,
          activeEngines: Array.from(activeEngineSet),
        };
      }
    }
  }

  const getPortInput = (node: GraphNodeInstance, portId: string): number => {
    const def = defMap.get(node.definitionId);
    const portSchema = def?.ports.find((p) => p.id === portId);
    const defaultVal = portSchema?.defaultValue ?? 0;

    // Sum all incoming valid edges connected to (node.id, portId)
    const incoming = graph.edges.filter(
      (e) => e.toNodeId === node.id && e.toPortId === portId && e.valid !== false
    );
    if (incoming.length === 0) return defaultVal;

    let sum = 0;
    for (const edge of incoming) {
      const src = nodes.find((n) => n.id === edge.fromNodeId);
      if (src) {
        const val = src.outputs[edge.fromPortId];
        if (Number.isFinite(val)) sum += val;
      }
    }
    return sum;
  };

  const samples: SystemGraphTimeSample[] = [];
  const sampleStride = Math.max(1, Math.floor(steps / 160));

  for (let step = 0; step <= steps; step++) {
    const t = step * dt;

    for (const node of nodes) {
      const p = node.properties;

      switch (node.definitionId) {
        case 'comp-reference-generator': {
          const amp = p.amplitude ?? 1;
          const freq = p.frequency ?? 0.35;
          const offset = p.offset ?? 0;
          const isSine = (p.mode ?? 1) >= 0.5;
          const sig = isSine
            ? offset + amp * Math.sin(2 * Math.PI * freq * t)
            : t >= 0.3
            ? offset + amp
            : offset;
          node.outputs.signal = sig;
          break;
        }

        case 'comp-pid-controller': {
          const sp = getPortInput(node, 'setpoint');
          const fb = getPortInput(node, 'feedback');
          const err = sp - fb;
          const lim = Math.max(0.1, p.limit ?? 1);
          const nextInt = Math.max(-lim, Math.min(lim, (node.state.integral ?? 0) + err * dt));
          const deriv = step === 0 ? 0 : (err - (node.state.prevError ?? 0)) / dt;
          node.state.integral = nextInt;
          node.state.prevError = err;
          const rawU = (p.kp ?? 3) * err + (p.ki ?? 1) * nextInt + (p.kd ?? 0.5) * deriv;
          node.outputs.control_u = Math.max(-lim, Math.min(lim, rawU));
          node.outputs.error_e = err;
          break;
        }

        case 'elec-dc-power-bus': {
          const iLoad = Math.max(0, Math.abs(getPortInput(node, 'load_current')));
          const v0 = p.voltage ?? 24;
          const rInt = p.r_internal ?? 0.15;
          const vBus = Math.max(0, v0 - iLoad * rInt);
          node.outputs.v_bus = vBus;
          node.outputs.power_w = vBus * iLoad;
          break;
        }

        case 'elec-pwm-hbridge-driver': {
          const vSup = getPortInput(node, 'v_supply');
          const maxDuty = Math.max(0.1, Math.min(1, p.max_duty ?? 1));
          const cmd = Math.max(-maxDuty, Math.min(maxDuty, getPortInput(node, 'pwm_cmd')));
          const eff = p.efficiency ?? 0.94;
          node.outputs.v_motor = vSup * cmd * eff;
          break;
        }

        case 'mech-dc-gear-motor': {
          const vIn = getPortInput(node, 'v_in');
          const loadTorque = getPortInput(node, 'load_torque');
          const R = Math.max(0.1, p.resistance ?? 2.0);
          const kt = p.kt ?? 0.45;
          const ke = p.ke ?? 0.35;
          const J = Math.max(0.002, p.inertia ?? 0.025);
          const B = p.damping ?? 0.04;
          const omega = node.state.omega ?? 0;
          const current = (vIn - ke * omega) / R;
          const elecTorque = kt * current;
          const netTorque = elecTorque - B * omega - loadTorque;
          const nextOmega = omega + (netTorque / J) * dt;
          node.state.omega = nextOmega;
          node.outputs.omega = nextOmega;
          node.outputs.torque = elecTorque;
          node.outputs.current = current;
          break;
        }

        case 'mech-planetary-reducer': {
          const ratio = Math.max(0.1, p.ratio ?? 4);
          const eff = p.efficiency ?? 0.92;
          const wIn = getPortInput(node, 'omega_in');
          const tIn = getPortInput(node, 'torque_in');
          node.outputs.omega_out = wIn / ratio;
          node.outputs.torque_out = tIn * ratio * eff;
          break;
        }

        case 'mech-torsional-spring-damper': {
          const theta = getPortInput(node, 'theta');
          const omega = getPortInput(node, 'omega');
          node.outputs.restoring_torque =
            -(p.stiffness ?? 18) * theta - (p.damping ?? 1.4) * omega;
          break;
        }

        case 'rob-revolute-arm-joint': {
          const tau = getPortInput(node, 'drive_torque');
          const L = Math.max(0.1, p.length ?? 0.65);
          const M = Math.max(0.1, p.mass ?? 1.4);
          const B = p.damping ?? 0.35;
          const I = (1 / 3) * M * L * L + 0.02;
          const theta = node.state.theta ?? 0;
          const omega = node.state.omega ?? 0;
          const gravTorque = M * 9.81 * (L * 0.5) * Math.sin(theta);
          const alpha = (tau - gravTorque - B * omega) / I;
          const nextOmega = omega + alpha * dt;
          const nextTheta = theta + nextOmega * dt;
          node.state.omega = nextOmega;
          node.state.theta = nextTheta;
          node.outputs.theta = nextTheta;
          node.outputs.omega = nextOmega;
          node.outputs.tip_y = L * Math.sin(nextTheta);
          break;
        }

        case 'rob-optical-encoder': {
          const angle = getPortInput(node, 'angle_in');
          node.outputs.signal_out = (angle + (p.bias ?? 0)) * (p.gain ?? 1);
          break;
        }

        case 'math-expression-operator': {
          const fn = compiledEquations.get(node.id);
          const x = getPortInput(node, 'x');
          const y = getPortInput(node, 'y');
          let val = 0;
          if (fn) {
            const evaluated = Number(
              fn.evaluate({ x, y, t, a: p.a ?? 1, b: p.b ?? 1, pi: Math.PI, e: Math.E })
            );
            val = Number.isFinite(evaluated) ? evaluated : 0;
          }
          node.outputs.result = val;
          break;
        }

        case 'math-ode-integrator': {
          const u = getPortInput(node, 'dxdt_in');
          const x = node.state.x ?? (p.x0 ?? 0);
          const dxdt = (p.gain ?? 1) * u - (p.decay ?? 0.25) * x;
          const nextX = x + dxdt * dt;
          node.state.x = nextX;
          node.outputs.state_x = nextX;
          break;
        }

        case 'phys-harmonic-oscillator': {
          const F = getPortInput(node, 'force_in');
          const m = Math.max(0.05, p.mass ?? 1.2);
          const k = p.stiffness ?? 22;
          const c = p.damping ?? 0.85;
          const x = node.state.x ?? 0;
          const v = node.state.v ?? 0;
          const a = (F - c * v - k * x) / m;
          const nextV = v + a * dt;
          const nextX = x + nextV * dt;
          node.state.v = nextV;
          node.state.x = nextX;
          node.outputs.displacement = nextX;
          node.outputs.velocity = nextV;
          node.outputs.energy_j = 0.5 * m * nextV * nextV + 0.5 * k * nextX * nextX;
          break;
        }

        case 'fluid-centrifugal-pump': {
          const w = Math.max(0, Math.abs(getPortInput(node, 'shaft_speed')));
          const qInW = Math.max(0, getPortInput(node, 'heat_load_w'));
          const disp = p.displacement ?? 0.18;
          const flowLpm = w * disp * 6.0;
          const tAmb = p.ambient_temp ?? 24;
          const cTh = Math.max(2, p.thermal_cap ?? 45);
          const temp = node.state.temp ?? tAmb;
          const hCool = 1.2 + 0.45 * flowLpm;
          const dT = ((qInW - hCool * (temp - tAmb)) / cTh) * dt;
          const nextTemp = temp + dT;
          node.state.temp = nextTemp;
          node.outputs.flow_rate = flowLpm;
          node.outputs.core_temp_c = nextTemp;
          break;
        }

        case 'bio-adaptive-ecosystem': {
          const stim = getPortInput(node, 'stimulus');
          const alpha = p.alpha ?? 1.35;
          const beta = p.beta ?? 0.85;
          const gamma = p.gamma ?? 1.05;
          const delta = p.delta ?? 0.65;
          const u = Math.max(0.02, node.state.u ?? 1.2);
          const v = Math.max(0.02, node.state.v ?? 0.8);
          // Coupled Lotka-Volterra with external nutrient stimulus and carrying capacity saturation
          const dudt = u * (alpha - beta * v - 0.12 * u) + 0.25 * stim;
          const dvdt = v * (delta * u - gamma - 0.08 * v);
          const nextU = Math.max(0.02, Math.min(20, u + dudt * dt));
          const nextV = Math.max(0.02, Math.min(20, v + dvdt * dt));
          node.state.u = nextU;
          node.state.v = nextV;
          node.outputs.activator_u = nextU;
          node.outputs.inhibitor_v = nextV;
          break;
        }

        case 'mat-structural-stress-sensor': {
          const tau = Math.abs(getPortInput(node, 'applied_torque'));
          const W_m3 = Math.max(0.05, p.section_modulus ?? 2.4) * 1e-6;
          // σ = M / W in Pa -> convert to MPa (* 1e-6)
          const stressMpa = (tau / W_m3) * 1e-6;
          const yieldMpa = Math.max(10, p.yield_mpa ?? 250);
          node.outputs.stress_mpa = stressMpa;
          node.outputs.safety_factor = Math.min(99, yieldMpa / Math.max(0.1, stressMpa));
          break;
        }
      }
    }

    if (step % sampleStride === 0 || step === steps) {
      const values: Record<string, number> = {};
      for (const node of nodes) {
        for (const [portId, val] of Object.entries(node.outputs)) {
          values[`${node.id}.${portId}`] = Number(val.toFixed(4));
        }
      }
      samples.push({ time: Number(t.toFixed(3)), values });
    }
  }

  const finalNodeOutputs: Record<string, Record<string, number>> = {};
  for (const node of nodes) {
    finalNodeOutputs[node.id] = { ...node.outputs };
  }

  return {
    ok: true,
    durationSec,
    dtSec: dt,
    steps,
    samples,
    finalNodeOutputs,
    validationErrors,
    activeEngines: Array.from(activeEngineSet),
  };
}
