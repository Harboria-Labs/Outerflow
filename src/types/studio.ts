export type StudioMode = 'physics' | 'cad' | 'math' | 'soft' | 'experiments';

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
  category: 'physics' | 'cad' | 'math';
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

export interface CadPartConfig {
  id: string;
  name: string;
  kind: CadPrimitiveKind;
  position: Vec3;
  rotation: Vec3;
  color: string;
  visible: boolean;
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
  // If produced by a CSG boolean operation
  csgMesh?: SerializedMeshData;
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

export interface ViewportOverlays {
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  showColliders: boolean;
  lighting: LightingPreset;
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
}
