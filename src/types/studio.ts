export type StudioMode =
  | 'physics'
  | 'cad'
  | 'mesh'
  | 'electronics'
  | 'math'
  | 'soft'
  | 'experiments';

export type Vec3 = [number, number, number];

export type ShapeKind = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'cone' | 'custom';

export type BodyType = 'dynamic' | 'fixed' | 'kinematic';

export type JointKind = 'revolute' | 'prismatic' | 'spherical' | 'fixed' | 'spring';

export type ColormapName = 'harboria' | 'viridis' | 'plasma' | 'coolwarm';

export type LightingPreset = 'studio' | 'blueprint' | 'lab' | 'aerospace';

export type CameraPreset = 'persp' | 'top' | 'front' | 'right' | 'iso';

export type GizmoMode = 'select' | 'translate' | 'rotate' | 'scale';

export interface EntitySize {
  width: number;
  height: number;
  depth: number;
  radius: number;
}

export interface EntityPhysics {
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  initialVelocity: Vec3;
  colliderKind?: 'primitive' | 'convexHull' | 'trimesh';
}

export interface SerializedMeshData {
  positions: number[];
  normals: number[];
  indices?: number[];
}

export interface StudioEntity {
  id: string;
  name: string;
  category: 'physics' | 'cad' | 'math' | 'mesh' | 'electronics';
  shape: ShapeKind;
  bodyType: BodyType;
  position: Vec3;
  rotation: Vec3; // Euler XYZ in radians
  scale: Vec3;
  size: EntitySize;
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  visible: boolean;
  physics: EntityPhysics;
  serializedMesh?: SerializedMeshData;
  parentId?: string | null;
  locked?: boolean;
  density?: number;
  materialPreset?: 'steel' | 'aluminum' | 'carbon' | 'plastic' | 'wood' | 'custom';
  computedVolumeM3?: number;
  computedAreaM2?: number;
  cadLinkId?: string;
}

export interface StudioJoint {
  id: string;
  name: string;
  kind: JointKind;
  bodyA: string;
  bodyB: string;
  anchorA: Vec3;
  anchorB: Vec3;
  axis: Vec3;
  motorSpeed: number;
  motorMaxForce: number;
  stiffness: number;
  damping: number;
  restLength: number;
}

// ---------- CAD Types ----------
export type CadPrimitiveKind =
  | 'box'
  | 'cylinder'
  | 'pipe'
  | 'gear'
  | 'bracket'
  | 'lathe'
  | 'polygon';

export type CsgOperation = 'union' | 'subtract' | 'intersect';

export type PartCategory =
  | 'robotics'
  | 'electronics'
  | 'mechanical'
  | 'human'
  | 'shapes';

export type SnapMode = 'onTop' | 'inFront' | 'toRight' | 'centerAlign' | 'ground';

export interface Sketch2DConfig {
  points: [number, number][];
  mode: 'extrude' | 'lathe';
  depth: number;
}

export interface CadPartConfig {
  id: string;
  name: string;
  kind: CadPrimitiveKind;
  position: Vec3;
  rotation: Vec3;
  color: string;
  visible: boolean;
  locked?: boolean;
  libraryPartId?: string;
  sketch2D?: Sketch2DConfig;
  // Shared / parametric dimensions
  width: number;
  height: number;
  depth: number;
  outerRadius: number;
  innerRadius: number;
  bevel: number;
  segments: number;
  teeth: number;
  holeRadius: number;
  sides: number;
  latheCurve: 'nozzle' | 'bell' | 'hourglass' | 'coneCup';
  // If produced by a CSG boolean operation, Code CAD, or Library part
  csgMesh?: SerializedMeshData;
}

// ---------- Mesh Sculpting Types ----------
export type SculptBrushKind = 'pull' | 'inflate' | 'carve' | 'smooth' | 'flatten';

export type SculptBasePreset =
  | 'sphere'
  | 'humanHead'
  | 'organicPod'
  | 'cube'
  | 'torus'
  | 'terrain';

export interface MeshSculptConfig {
  basePreset: SculptBasePreset;
  brush: SculptBrushKind;
  radius: number;
  strength: number;
  symmetryX: boolean;
  twist: number;
  taper: number;
  noise: number;
}

// ---------- Proteus-Style Electronics Types ----------
export type CircuitComponentKind =
  | 'battery'
  | 'resistor'
  | 'led'
  | 'capacitor'
  | 'switch'
  | 'motor'
  | 'mcu';

export interface CircuitComponent {
  id: string;
  name: string;
  kind: CircuitComponentKind;
  nodeA: string; // + or terminal A
  nodeB: string; // - or terminal B
  value: number; // V for battery/mcu, Ohms for resistor/motor, uF for capacitor, Vf for LED
  closed?: boolean; // for switch
  x: number; // 2D schematic X (0..700)
  y: number; // 2D schematic Y (0..420)
  color?: string;
}

export interface CircuitWire {
  id: string;
  fromCompId: string;
  fromPin: 'A' | 'B';
  toCompId: string;
  toPin: 'A' | 'B';
  nodeName: string;
}

export interface CircuitSchematic {
  id: string;
  name: string;
  description: string;
  components: CircuitComponent[];
  wires: CircuitWire[];
}

export interface CircuitSolveResult {
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>; // Amps
  componentPower: Record<string, number>; // Watts
  ledBrightness: Record<string, number>; // 0..1
  motorRpm: Record<string, number>;
  warnings: string[];
  transientTrace: Array<{ tMs: number; voltage: number; currentMa: number }>;
}

// ---------- Math Types ----------
export type MathModeKind = 'parametric' | 'explicit' | 'implicit' | 'ode' | 'vectorField';

export interface ParametricSurfaceConfig {
  presetId: string;
  xExpr: string;
  yExpr: string;
  zExpr: string;
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
  uSteps: number;
  vSteps: number;
  scale: number;
  colormap: ColormapName;
  wireframe: boolean;
}

export interface ExplicitSurfaceConfig {
  presetId: string;
  expr: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  resolution: number;
  animate: boolean;
  speed: number;
  colormap: ColormapName;
  wireframe: boolean;
}

export interface ImplicitSurfaceConfig {
  presetId: string;
  expr: string;
  bound: number;
  resolution: number;
  isoLevel: number;
  colormap: ColormapName;
  wireframe: boolean;
}

export interface OdeSystemConfig {
  presetId: string;
  dxExpr: string;
  dyExpr: string;
  dzExpr: string;
  params: Record<string, number>;
  initialState: Vec3;
  dt: number;
  steps: number;
  bundleCount: number;
  perturbation: number;
  scale: number;
  colormap: ColormapName;
}

export interface VectorFieldConfig {
  presetId: string;
  vxExpr: string;
  vyExpr: string;
  vzExpr: string;
  bound: number;
  gridCount: number;
  arrowScale: number;
  animateTracers: boolean;
  colormap: ColormapName;
}

export interface MathConfig {
  activeKind: MathModeKind;
  parametric: ParametricSurfaceConfig;
  explicit: ExplicitSurfaceConfig;
  implicit: ImplicitSurfaceConfig;
  ode: OdeSystemConfig;
  vectorField: VectorFieldConfig;
}

// ---------- Soft / Particles / Fluids Types ----------
export type SoftSimKind = 'particles' | 'cloth' | 'sphFluid' | 'waveTank';

export type ParticleFieldPreset = 'nbody' | 'vortex' | 'lorentz';
export type ClothPinMode = 'topCorners' | 'topEdge' | 'fourCorners';

export interface SoftSimConfig {
  activeKind: SoftSimKind;
  colormap: ColormapName;
  particles: {
    preset: ParticleFieldPreset;
    count: number;
    centralMass: number;
    perturberMass: number;
    fieldStrength: number;
    damping: number;
  };
  cloth: {
    pinMode: ClothPinMode;
    stiffness: number;
    damping: number;
    windStrength: number;
    windDirectionDeg: number;
    obstacleEnabled: boolean;
    obstacleRadius: number;
    obstaclePos: Vec3;
  };
  sphFluid: {
    particleCount: number;
    restDensity: number;
    stiffness: number;
    viscosity: number;
    gravity: number;
    tankHalfWidth: number;
    tankHeight: number;
  };
  waveTank: {
    waveSpeed: number;
    damping: number;
    rainEnabled: boolean;
    rainRate: number;
  };
}

// ---------- Experiments, Telemetry & Recording ----------
export interface TelemetrySample {
  time: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  selectedPosY: number;
  selectedSpeed: number;
  customMetrics: Record<string, number>;
}

export interface RecordedFrame {
  time: number;
  transforms: Record<string, { position: Vec3; quaternion: [number, number, number, number] }>;
}

export type SweepTemplateId =
  | 'projectileAngle'
  | 'restitutionBounce'
  | 'springStiffness'
  | 'catapultCounterweight';

export interface SweepConfig {
  templateId: SweepTemplateId;
  paramMin: number;
  paramMax: number;
  steps: number;
  durationSec: number;
}

export interface SweepTrialResult {
  trialIndex: number;
  paramName: string;
  paramValue: number;
  primaryMetricName: string;
  primaryMetricValue: number;
  secondaryMetricName: string;
  secondaryMetricValue: number;
  peakHeight: number;
  finalEnergy: number;
}

export type StageTheme = 'dark' | 'light';

export type ShadingMode = 'original' | 'albedo' | 'solid' | 'normal';

export interface StageSettings {
  theme: StageTheme;
  intensity: number;
  reflection: number;
  shadows: boolean;
  showFloor: boolean;
  exposure: number;
  rimLight: number;
  shading: ShadingMode;
  wireframe: boolean;
  showColliders: boolean;
  showGrid: boolean;
  showAxes: boolean;
  explodedView: boolean;
  autoSpin: boolean;
}

export type LogoVariant = 'morphogenesis' | 'bioGyroid' | 'ferroVortex';

export interface LogoStudioConfig {
  variant: LogoVariant;
  title: string;
  tagline: string;
  labLabel: string;
  durationSec: number;
  fluidity: number;
  turbulence: number;
  glowIntensity: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  particleCount: number;
  showIntroOnLoad: boolean;
}

export interface ViewportOverlays {
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  lighting: LightingPreset;
}

// ---------- Unified Project, Linked Parameters, Checkpoints & Comparison ----------
export interface ProjectParameter {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formula?: string;
  isCalculated?: boolean;
  targetEntityId?: string;
  targetField?:
    | 'size.width'
    | 'size.height'
    | 'size.depth'
    | 'size.radius'
    | 'density'
    | 'physics.mass'
    | 'physics.restitution'
    | 'position.y';
  targetJointId?: string;
  targetJointField?: 'stiffness' | 'damping' | 'restLength' | 'motorSpeed' | 'motorMaxForce';
}

export interface BodyDynamicSnapshot {
  position: Vec3;
  quaternion: [number, number, number, number];
  linvel: Vec3;
  angvel: Vec3;
}

export interface SimulationCheckpoint {
  id: string;
  label: string;
  simTime: number;
  createdAt: string;
  bodyStates: Record<string, BodyDynamicSnapshot>;
  parameters: ProjectParameter[];
}

export interface DesignExperimentRun {
  id: string;
  label: string;
  color: string;
  createdAt: string;
  durationSec: number;
  parameterSnapshot: Record<string, number>;
  summaryMetrics: {
    peakSpeed: number;
    peakKineticEnergy: number;
    maxDisplacement: number;
    finalPosY: number;
    totalMassKg: number;
  };
  samples: TelemetrySample[];
}

export interface EntityInspectionMetrics {
  volumeM3: number;
  surfaceAreaM2: number;
  densityKgM3: number;
  massKg: number;
  centerToCenterDist: number | null;
  surfaceGapDist: number | null;
  elevationAngleDeg: number | null;
}

export interface OuterflowSceneFile {
  format: 'outerflow-scene';
  version: 1;
  savedAt: string;
  mode: StudioMode;
  gravity: Vec3;
  entities: StudioEntity[];
  joints: StudioJoint[];
  cadParts: CadPartConfig[];
  mathConfig: MathConfig;
  softConfig: SoftSimConfig;
  experimentScript: string;
  logoConfig?: LogoStudioConfig;
  parameters?: ProjectParameter[];
  designRuns?: DesignExperimentRun[];
}
