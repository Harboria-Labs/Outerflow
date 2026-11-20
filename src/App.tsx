import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type {
  CadPartConfig,
  CadPrimitiveKind,
  CameraPreset,
  CircuitComponent,
  CircuitComponentKind,
  CircuitSchematic,
  CsgOperation,
  DesignExperimentRun,
  GizmoMode,
  LogoStudioConfig,
  MathConfig,
  MathModeKind,
  MeshSculptConfig,
  OuterflowSceneFile,
  ProjectParameter,
  RecordedFrame,
  SculptBasePreset,
  SculptBrushKind,
  ShapeKind,
  SimulationCheckpoint,
  SnapMode,
  SoftSimConfig,
  SoftSimKind,
  StageSettings,
  StudioEntity,
  StudioJoint,
  StudioMode,
  SweepConfig,
  SweepTrialResult,
  TelemetrySample,
  Vec3,
} from './types/studio';
import { StudioViewport, createDefaultStageSettings } from './viewport/StudioViewport';
import { RapierPhysicsEngine } from './engines/physics/rapierEngine';
import { getPhysicsPresets } from './engines/physics/presets';
import {
  createCadPartTemplate,
  createDefaultCadParts,
  createParametricGeometry,
  serializeBufferGeometry,
} from './engines/cad/parametricGenerators';
import { csgIntersect, csgSubtract, csgUnion } from './engines/cad/csg';
import {
  computeSnapPosition,
  createCadPartFromLibrary,
  type LibraryPartMeta,
} from './engines/cad/partsLibrary';
import {
  buildBlueprintSVGString,
  buildGeometryFrom2DSketch,
  projectGeometryTo2DBlueprint,
  type BlueprintProjection,
} from './engines/cad/sketch2D';
import { DESIGN_CODE_TEMPLATES, executeDesignCode } from './engines/cad/designCompiler';
import { MeshSculptEngine, createDefaultMeshSculptConfig } from './engines/mesh/meshSculptEngine';
import {
  buildCircuit3DPCBGroup,
  createComponentTemplate,
  getCircuitPresets,
  solveCircuit,
  type Circuit3DSceneHandle,
} from './engines/electronics/circuitEngine';
import {
  WORKBENCH_MISSIONS,
  buildWorkbench3DScene,
  createInitialWorkbenchConfig,
  type Workbench3DHandle,
  type WorkbenchConfig,
  type WorkbenchWire,
} from './engines/electronics/workbench3D';
import {
  PARAMETRIC_PRESETS,
  buildParametricSurface,
  createDefaultParametricConfig,
} from './engines/math/parametricSurface';
import {
  EXPLICIT_PRESETS,
  buildExplicitSurface,
  createDefaultExplicitConfig,
  updateExplicitSurface,
} from './engines/math/explicitSurface';
import {
  IMPLICIT_PRESETS,
  buildImplicitSurface,
  createDefaultImplicitConfig,
} from './engines/math/marchingTetrahedra';
import {
  ODE_PRESETS,
  buildOdeGroup,
  createDefaultOdeConfig,
  solveOdeSystem,
  type OdeTrajectoryData,
} from './engines/math/odeSolver';
import {
  VECTOR_FIELD_PRESETS,
  buildVectorFieldScene,
  createDefaultVectorFieldConfig,
  type VectorFieldSceneHandle,
} from './engines/math/vectorField';
import {
  ParticleFieldEngine,
  createDefaultSoftConfig,
} from './engines/soft/particleFieldEngine';
import { ClothSolver } from './engines/soft/clothSolver';
import { SphFluidSolver, WaveTankSolver } from './engines/soft/fluidSolver';
import {
  SCRIPT_TEMPLATES,
  executeExperimentScript,
  type StepRuntimeApi,
} from './engines/experiments/scriptRunner';
import { SWEEP_TEMPLATES, runParameterSweep } from './engines/experiments/sweepRunner';
import {
  capturePNG,
  exportGLB,
  exportOBJ,
  exportSTL,
  exportSceneJSON,
  exportSweepCSV,
  exportTelemetryCSV,
  parseSceneJSON,
} from './engines/io/exporters';
import {
  CanvasVideoRecorder,
  downloadBlob,
  printDesignSheet,
} from './engines/io/mediaExporters';
import { loadSavedLogoConfig, saveLogoConfig } from './engines/brand/logoScene';
import {
  evaluateProjectParameters,
  getDefaultParametersForPreset,
  inspectEntities,
  runDesignVariantExperiment,
  syncEntityPhysicalMass,
} from './engines/project/parameterAndTemplateEngine';
import { LogoMotionOverlay } from './components/LogoMotionOverlay';
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ViewportHUD } from './components/ViewportHUD';
import { TransportBar } from './components/TransportBar';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { ElectronicsSchematicView } from './components/ElectronicsSchematicView';

function createInitialMathConfig(): MathConfig {
  return {
    activeKind: 'parametric',
    parametric: createDefaultParametricConfig(),
    explicit: createDefaultExplicitConfig(),
    implicit: createDefaultImplicitConfig(),
    ode: createDefaultOdeConfig(),
    vectorField: createDefaultVectorFieldConfig(),
  };
}

const AUTOSAVE_KEY = 'outerflow-unified-project-v2';
const VARIANT_COLORS = ['#38bdf8', '#f59e0b', '#34d399', '#a78bfa', '#fb7185'];

interface ProjectSnapshot {
  entities: StudioEntity[];
  joints: StudioJoint[];
  cadParts: CadPartConfig[];
  parameters: ProjectParameter[];
}

function loadAutosavedProject(): {
  activePhysicsPresetId?: string;
  entities?: StudioEntity[];
  joints?: StudioJoint[];
  cadParts?: CadPartConfig[];
  parameters?: ProjectParameter[];
  designRuns?: DesignExperimentRun[];
  gravity?: Vec3;
} | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.format !== AUTOSAVE_KEY || !Array.isArray(parsed.entities)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const App: React.FC = () => {
  const physicsPresets = useMemo(() => getPhysicsPresets(), []);
  const initialPreset = physicsPresets[0];
  const savedProj = useMemo(() => loadAutosavedProject(), []);

  const [mode, setMode] = useState<StudioMode>('physics');
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1.0);
  const [gravity, setGravity] = useState<Vec3>(() => savedProj?.gravity ?? [0, -9.81, 0]);
  const [fps, setFps] = useState(60);
  const [simTime, setSimTime] = useState(0);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [stage, setStage] = useState<StageSettings>(() => createDefaultStageSettings());
  const [leftCollapsed, setLeftCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [rightCollapsed, setRightCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [meshStats, setMeshStats] = useState({ vertices: 0, triangles: 0 });
  const [logoConfig, setLogoConfig] = useState<LogoStudioConfig>(() => loadSavedLogoConfig());
  const [introOverlayMode, setIntroOverlayMode] = useState<'boot' | 'studio' | null>(() =>
    loadSavedLogoConfig().showIntroOnLoad ? 'boot' : null
  );
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoElapsedSec, setVideoElapsedSec] = useState(0);
  const videoRecorderRef = useRef<CanvasVideoRecorder>(new CanvasVideoRecorder());

  // Physics & Unified Project State
  const [activePhysicsPresetId, setActivePhysicsPresetId] = useState(
    () => savedProj?.activePhysicsPresetId ?? initialPreset.id
  );
  const [entities, setEntities] = useState<StudioEntity[]>(() =>
    savedProj?.entities ? structuredClone(savedProj.entities) : structuredClone(initialPreset.entities)
  );
  const [joints, setJoints] = useState<StudioJoint[]>(() =>
    savedProj?.joints ? structuredClone(savedProj.joints) : structuredClone(initialPreset.joints)
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      (savedProj?.entities ?? initialPreset.entities).find((e) => e.bodyType === 'dynamic')?.id ??
      initialPreset.entities[0]?.id ??
      null
  );
  const [parameters, setParameters] = useState<ProjectParameter[]>(() =>
    savedProj?.parameters
      ? structuredClone(savedProj.parameters)
      : getDefaultParametersForPreset(
          initialPreset.id,
          initialPreset.entities,
          initialPreset.joints
        )
  );
  const [checkpoints, setCheckpoints] = useState<SimulationCheckpoint[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [measureTargetId, setMeasureTargetId] = useState<string | null>(null);
  const [designRuns, setDesignRuns] = useState<DesignExperimentRun[]>(
    () => savedProj?.designRuns ?? []
  );
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<ProjectSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectSnapshot[]>([]);
  const lastHistoryTsRef = useRef(0);

  // CAD State + 2D<->3D & Design Code
  const [cadParts, setCadParts] = useState<CadPartConfig[]>(() =>
    savedProj?.cadParts ? structuredClone(savedProj.cadParts) : createDefaultCadParts()
  );
  const [blueprintProjection, setBlueprintProjection] = useState<BlueprintProjection | null>(null);
  const [designCode, setDesignCode] = useState<string>(DESIGN_CODE_TEMPLATES[0].code);
  const [designCodeError, setDesignCodeError] = useState<string | null>(null);

  // Mesh Sculpt State
  const [meshConfig, setMeshConfig] = useState<MeshSculptConfig>(() => createDefaultMeshSculptConfig());

  // Electronics Workbench & Circuit State
  const [electronicsSubMode, setElectronicsSubMode] = useState<'workbench' | 'circuit'>(
    'workbench'
  );
  const [workbenchConfig, setWorkbenchConfig] = useState<WorkbenchConfig>(() =>
    createInitialWorkbenchConfig()
  );
  const circuitPresets = useMemo(() => getCircuitPresets(), []);
  const [circuit, setCircuit] = useState<CircuitSchematic>(() =>
    structuredClone(circuitPresets[0])
  );
  const circuitSolved = useMemo(() => solveCircuit(circuit), [circuit]);
  const [selectedCircuitCompId, setSelectedCircuitCompId] = useState<string | null>(
    () => circuitPresets[0].components[0]?.id ?? null
  );
  const [schematicOpen, setSchematicOpen] = useState(false);

  // Math State
  const [mathConfig, setMathConfig] = useState<MathConfig>(() => createInitialMathConfig());
  const [mathErrors, setMathErrors] = useState<string[]>([]);
  const [mathStats, setMathStats] = useState({ vertices: 0, triangles: 0 });

  // Soft / Fields State
  const [softConfig, setSoftConfig] = useState<SoftSimConfig>(() => createDefaultSoftConfig());

  // Experiments State
  const [experimentScript, setExperimentScript] = useState<string>(SCRIPT_TEMPLATES[0].code);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [sweepConfig, setSweepConfig] = useState<SweepConfig>({
    templateId: SWEEP_TEMPLATES[0].id,
    paramMin: SWEEP_TEMPLATES[0].defaultMin,
    paramMax: SWEEP_TEMPLATES[0].defaultMax,
    steps: SWEEP_TEMPLATES[0].defaultSteps,
    durationSec: SWEEP_TEMPLATES[0].defaultDuration,
  });
  const [sweepResults, setSweepResults] = useState<SweepTrialResult[]>([]);
  const [sweepProgress, setSweepProgress] = useState({ running: false, completed: 0, total: 0 });

  // Telemetry & Recording State
  const [telemetrySamples, setTelemetrySamples] = useState<TelemetrySample[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<RecordedFrame[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null);

  // Imperative refs
  const viewportHostRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<StudioViewport | null>(null);
  const rapierRef = useRef<RapierPhysicsEngine>(new RapierPhysicsEngine());

  const modeRef = useRef(mode);
  const runningRef = useRef(running);
  const timeScaleRef = useRef(timeScale);
  const recordingRef = useRef(recording);
  const playbackIndexRef = useRef(playbackIndex);
  const selectedIdRef = useRef(selectedId);
  const entitiesRef = useRef(entities);
  const jointsRef = useRef(joints);
  const gravityRef = useRef(gravity);
  const mathConfigRef = useRef(mathConfig);
  const softConfigRef = useRef(softConfig);
  const meshConfigRef = useRef(meshConfig);
  const introOverlayModeRef = useRef(introOverlayMode);

  modeRef.current = mode;
  runningRef.current = running;
  timeScaleRef.current = timeScale;
  recordingRef.current = recording;
  playbackIndexRef.current = playbackIndex;
  selectedIdRef.current = selectedId;
  entitiesRef.current = entities;
  jointsRef.current = joints;
  gravityRef.current = gravity;
  mathConfigRef.current = mathConfig;
  softConfigRef.current = softConfig;
  meshConfigRef.current = meshConfig;
  introOverlayModeRef.current = introOverlayMode;

  const mathRuntimeRef = useRef<{
    explicitGeom?: THREE.BufferGeometry;
    explicitMesh?: THREE.Mesh;
    odeHeads?: THREE.Mesh[];
    odeTrajectories?: OdeTrajectoryData[];
    odeCursor: number;
    vectorHandle?: VectorFieldSceneHandle;
    surfaceGeomForExport?: THREE.BufferGeometry;
  }>({ odeCursor: 0 });

  const softRuntimeRef = useRef<{
    particles?: ParticleFieldEngine;
    cloth?: ClothSolver;
    sph?: SphFluidSolver;
    wave?: WaveTankSolver;
  }>({});

  const sculptEngineRef = useRef<MeshSculptEngine | null>(null);
  const sculptMeshRef = useRef<THREE.Mesh | null>(null);
  const circuit3DHandleRef = useRef<Circuit3DSceneHandle | null>(null);

  const scriptStepCallbackRef = useRef<((t: number, api: StepRuntimeApi) => void) | null>(null);
  const customMetricsRef = useRef<Record<string, number>>({});
  const physicsRebuildPendingRef = useRef(false);
  const skipCadRebuildRef = useRef(false);

  const refreshStats = useCallback((activeMode: StudioMode) => {
    if (activeMode === 'mesh' && sculptEngineRef.current) {
      setMeshStats(sculptEngineRef.current.getStats());
      return;
    }
    const vp = viewportRef.current;
    if (!vp) return;
    setMeshStats(vp.getSceneMeshStats(activeMode));
  }, []);

  const syncMeshViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (!sculptEngineRef.current) {
      sculptEngineRef.current = new MeshSculptEngine(meshConfigRef.current.basePreset);
    }
    const engine = sculptEngineRef.current;
    vp.meshGroup.traverse((obj) => {
      const m = obj as THREE.Mesh;
      const base = m.userData?.baseMaterial as THREE.Material | undefined;
      base?.dispose();
    });
    vp.meshGroup.clear();

    const mat = new THREE.MeshStandardMaterial({
      color: '#a8b3cf',
      metalness: 0.22,
      roughness: 0.42,
    });
    const mesh = new THREE.Mesh(engine.geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id: 'sculpt-mesh', kind: 'mesh', baseMaterial: mat };
    vp.meshGroup.add(mesh);
    sculptMeshRef.current = mesh;
    if (modeRef.current === 'mesh') {
      setMeshStats(engine.getStats());
    }
  }, []);

  const rebuildElectronicsViewport = useCallback(
    (
      subMode: 'workbench' | 'circuit',
      wbCfg: WorkbenchConfig,
      sch: CircuitSchematic,
      solved: ReturnType<typeof solveCircuit>
    ) => {
      const vp = viewportRef.current;
      if (!vp) return;
      circuit3DHandleRef.current?.dispose();
      vp.electronicsGroup.clear();
      const handle: Circuit3DSceneHandle | Workbench3DHandle =
        subMode === 'workbench'
          ? buildWorkbench3DScene(wbCfg)
          : buildCircuit3DPCBGroup(sch, solved);
      vp.electronicsGroup.add(handle.group);
      circuit3DHandleRef.current = handle;
      if (modeRef.current === 'electronics') {
        refreshStats('electronics');
      }
    },
    [refreshStats]
  );

  const syncPhysicsWorldAndViewport = useCallback(
    async (nextEntities: StudioEntity[], nextJoints: StudioJoint[], nextGravity: Vec3) => {
      const vp = viewportRef.current;
      if (!vp) return;
      vp.syncPhysicsEntities(nextEntities);
      refreshStats(modeRef.current);
      await rapierRef.current.rebuild(nextEntities, nextJoints, nextGravity);
      vp.updateJointDebug(rapierRef.current.getJointWorldSegments());
      setSimTime(0);
      setTelemetrySamples([]);
      setRecordedFrames([]);
      setPlaybackIndex(null);
    },
    [refreshStats]
  );

  const rebuildMathViewport = useCallback(
    (cfg: MathConfig) => {
      const vp = viewportRef.current;
      if (!vp) return;

      mathRuntimeRef.current.vectorHandle?.dispose();
      vp.mathGroup.traverse((obj) => {
        const m = obj as THREE.Mesh | THREE.Line;
        if (m.geometry) m.geometry.dispose();
        const base = m.userData?.baseMaterial as THREE.Material | undefined;
        const albedo = m.userData?.albedoMaterial as THREE.Material | undefined;
        base?.dispose();
        albedo?.dispose();
        if (m.material && m.material !== base && m.material !== albedo) {
          if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
          else m.material.dispose();
        }
      });
      vp.mathGroup.clear();
      mathRuntimeRef.current = { odeCursor: 0 };

      if (cfg.activeKind === 'parametric') {
        const res = buildParametricSurface(cfg.parametric);
        setMathErrors(res.errors);
        setMathStats({ vertices: res.vertexCount, triangles: res.triangleCount });
        if (res.vertexCount > 0) {
          const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.3,
            metalness: 0.15,
            wireframe: cfg.parametric.wireframe,
          });
          const mesh = new THREE.Mesh(res.geometry, mat);
          mesh.position.set(0, 2.5, 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.baseMaterial = mat;
          vp.mathGroup.add(mesh);
          mathRuntimeRef.current.surfaceGeomForExport = res.geometry;
        }
      } else if (cfg.activeKind === 'explicit') {
        const res = buildExplicitSurface(cfg.explicit, 0);
        setMathErrors(res.error ? [res.error] : []);
        setMathStats({ vertices: res.vertexCount, triangles: res.triangleCount });
        if (res.vertexCount > 0) {
          const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.25,
            metalness: 0.2,
            wireframe: cfg.explicit.wireframe,
          });
          const mesh = new THREE.Mesh(res.geometry, mat);
          mesh.position.set(0, 2.2, 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.baseMaterial = mat;
          vp.mathGroup.add(mesh);
          mathRuntimeRef.current.explicitGeom = res.geometry;
          mathRuntimeRef.current.explicitMesh = mesh;
          mathRuntimeRef.current.surfaceGeomForExport = res.geometry;
        }
      } else if (cfg.activeKind === 'implicit') {
        const res = buildImplicitSurface(cfg.implicit);
        setMathErrors(res.error ? [res.error] : []);
        setMathStats({ vertices: res.vertexCount, triangles: res.triangleCount });
        if (res.vertexCount > 0) {
          const mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            roughness: 0.28,
            metalness: 0.2,
            wireframe: cfg.implicit.wireframe,
          });
          const mesh = new THREE.Mesh(res.geometry, mat);
          mesh.position.set(0, cfg.implicit.bound + 0.3, 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.baseMaterial = mat;
          vp.mathGroup.add(mesh);
          mathRuntimeRef.current.surfaceGeomForExport = res.geometry;
        }
      } else if (cfg.activeKind === 'ode') {
        const res = solveOdeSystem(cfg.ode);
        setMathErrors(res.errors);
        const totalVerts = res.trajectories.reduce((acc, t) => acc + t.rawStates.length, 0);
        setMathStats({ vertices: totalVerts, triangles: 0 });
        const { group, heads } = buildOdeGroup(res);
        vp.mathGroup.add(group);
        mathRuntimeRef.current.odeHeads = heads;
        mathRuntimeRef.current.odeTrajectories = res.trajectories;
        mathRuntimeRef.current.odeCursor = 0;
      } else if (cfg.activeKind === 'vectorField') {
        const handle = buildVectorFieldScene(cfg.vectorField);
        setMathErrors(handle.errors);
        setMathStats({ vertices: 0, triangles: 0 });
        vp.mathGroup.add(handle.group);
        mathRuntimeRef.current.vectorHandle = handle;
      }

      vp.applyStageToDomainGroups();
      refreshStats(modeRef.current);
    },
    [refreshStats]
  );

  const rebuildSoftViewport = useCallback(
    (cfg: SoftSimConfig) => {
      const vp = viewportRef.current;
      if (!vp) return;

      softRuntimeRef.current.particles?.dispose();
      softRuntimeRef.current.cloth?.dispose();
      softRuntimeRef.current.sph?.dispose();
      softRuntimeRef.current.wave?.dispose();
      softRuntimeRef.current = {};
      vp.softGroup.clear();

      if (cfg.activeKind === 'particles') {
        const eng = new ParticleFieldEngine(cfg.particles.count, cfg.particles.preset);
        softRuntimeRef.current.particles = eng;
        vp.softGroup.add(eng.createMesh(cfg.colormap));
      } else if (cfg.activeKind === 'cloth') {
        const cloth = new ClothSolver(22, 22, 4.0, 3.4);
        cloth.setPinMode(cfg.cloth.pinMode);
        softRuntimeRef.current.cloth = cloth;
        vp.softGroup.add(cloth.createMesh(cfg.cloth, cfg.colormap));
      } else if (cfg.activeKind === 'sphFluid') {
        const sph = new SphFluidSolver(cfg.sphFluid.particleCount, cfg.sphFluid.tankHalfWidth);
        softRuntimeRef.current.sph = sph;
        vp.softGroup.add(sph.createMesh(cfg.sphFluid, cfg.colormap));
      } else {
        const wave = new WaveTankSolver(56, 7.2);
        softRuntimeRef.current.wave = wave;
        vp.softGroup.add(wave.createMesh(cfg.colormap));
      }
      refreshStats(modeRef.current);
    },
    [refreshStats]
  );

  // Initialize Viewport & Main Render/Simulation Loop
  useEffect(() => {
    const host = viewportHostRef.current;
    if (!host) return;

    const vp = new StudioViewport(host, {
      onSelectObject: (id) => {
        setSelectedId(id);
        vp.setSelectedId(id);
      },
      onTransformObject: (id, kind, pos, rot, scale) => {
        if (kind === 'physics') {
          const snapshotList = entitiesRef.current;
          const orig = snapshotList.find((e) => e.id === id);
          const dx = orig ? pos[0] - orig.position[0] : 0;
          const dy = orig ? pos[1] - orig.position[1] : 0;
          const dz = orig ? pos[2] - orig.position[2] : 0;

          const descendants = new Set<string>();
          if (orig && (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6 || Math.abs(dz) > 1e-6)) {
            let added = true;
            while (added) {
              added = false;
              for (const item of snapshotList) {
                if (
                  item.parentId &&
                  (item.parentId === id || descendants.has(item.parentId)) &&
                  !descendants.has(item.id)
                ) {
                  descendants.add(item.id);
                  added = true;
                }
              }
            }
          }

          const updated = snapshotList.map((e) => {
            if (e.id === id) return { ...e, position: pos, rotation: rot, scale };
            if (descendants.has(e.id)) {
              const childPos: Vec3 = [e.position[0] + dx, e.position[1] + dy, e.position[2] + dz];
              if (!runningRef.current) {
                const q = new THREE.Quaternion().setFromEuler(
                  new THREE.Euler(e.rotation[0], e.rotation[1], e.rotation[2], 'XYZ')
                );
                vp.updateEntityTransform(e.id, childPos, [q.x, q.y, q.z, q.w]);
                rapierRef.current.setKinematicTarget(e.id, childPos, e.rotation);
              }
              return { ...e, position: childPos };
            }
            return e;
          });
          setEntities(updated);

          if (!runningRef.current) {
            rapierRef.current.setKinematicTarget(id, pos, rot);
            vp.updateJointDebug(rapierRef.current.getJointWorldSegments());
          }
        } else {
          skipCadRebuildRef.current = true;
          setCadParts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, position: pos, rotation: rot } : p))
          );
        }
      },
      onSculptStart: (worldPt, worldNrm) => {
        const engine = sculptEngineRef.current;
        const mesh = sculptMeshRef.current;
        if (!engine || !mesh) return;
        engine.pushUndoSnapshot();
        mesh.updateMatrixWorld();
        const invMat = mesh.matrixWorld.clone().invert();
        const localPt = worldPt.clone().applyMatrix4(invMat);
        const localNrm = worldNrm.clone().transformDirection(invMat).normalize();
        engine.applyBrushStroke(localPt, localNrm, meshConfigRef.current);
      },
      onSculptMove: (worldPt, worldNrm) => {
        const engine = sculptEngineRef.current;
        const mesh = sculptMeshRef.current;
        if (!engine || !mesh) return;
        const invMat = mesh.matrixWorld.clone().invert();
        const localPt = worldPt.clone().applyMatrix4(invMat);
        const localNrm = worldNrm.clone().transformDirection(invMat).normalize();
        engine.applyBrushStroke(localPt, localNrm, meshConfigRef.current);
      },
      onSculptEnd: () => {
        if (sculptEngineRef.current && modeRef.current === 'mesh') {
          setMeshStats(sculptEngineRef.current.getStats());
        }
      },
    });

    viewportRef.current = vp;
    vp.setModeVisibility(modeRef.current);
    vp.setSelectedId(selectedIdRef.current);
    vp.setStageSettings(stage);

    void syncPhysicsWorldAndViewport(entitiesRef.current, jointsRef.current, gravityRef.current);
    vp.syncCadParts(cadParts);
    syncMeshViewport();
    rebuildMathViewport(mathConfigRef.current);
    rebuildSoftViewport(softConfigRef.current);
    refreshStats(modeRef.current);

    let rafId = 0;
    let lastTs = performance.now();
    let fpsFrames = 0;
    let fpsAccum = 0;
    let telemetryAccum = 0;
    let mathTime = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      fpsFrames++;
      fpsAccum += rawDt;
      if (fpsAccum >= 0.5) {
        setFps(Math.round(fpsFrames / fpsAccum));
        fpsFrames = 0;
        fpsAccum = 0;
      }

      const activeMode = modeRef.current;
      const isRunning = runningRef.current;
      const scaledDt = rawDt * timeScaleRef.current;

      if (isRunning && playbackIndexRef.current === null) {
        if (activeMode === 'physics' || activeMode === 'experiments') {
          const stepDt = (1 / 60) * Math.min(5, timeScaleRef.current);
          const engine = rapierRef.current;
          if (engine.isReady) {
            if (scriptStepCallbackRef.current) {
              const stepApi: StepRuntimeApi = {
                getState: (eid) => {
                  const b = engine.getBody(eid);
                  if (!b) return null;
                  const p = b.translation();
                  const v = b.linvel();
                  return {
                    pos: [p.x, p.y, p.z],
                    vel: [v.x, v.y, v.z],
                    mass: b.mass(),
                  };
                },
                applyImpulse: (eid, imp) => engine.applyImpulse(eid, imp),
                applyForce: (eid, f) => {
                  const b = engine.getBody(eid);
                  if (b && b.isDynamic()) {
                    b.applyImpulse(
                      { x: f[0] * stepDt, y: f[1] * stepDt, z: f[2] * stepDt },
                      true
                    );
                  }
                },
                logMetric: (name, val) => {
                  if (Number.isFinite(val)) customMetricsRef.current[name] = val;
                },
              };
              try {
                scriptStepCallbackRef.current(engine.time, stepApi);
              } catch {
                // Keep loop resilient
              }
            }

            engine.step(stepDt);

            const frameTransforms: RecordedFrame['transforms'] = {};
            for (const ent of entitiesRef.current) {
              const tr = engine.getBodyTransform(ent.id);
              if (tr) {
                vp.updateEntityTransform(ent.id, tr.position, tr.quaternion);
                if (recordingRef.current) {
                  frameTransforms[ent.id] = tr;
                }
              }
            }
            vp.updateJointDebug(engine.getJointWorldSegments());

            if (recordingRef.current) {
              setRecordedFrames((prev) =>
                prev.length >= 900
                  ? prev
                  : [...prev, { time: engine.time, transforms: frameTransforms }]
              );
            }

            telemetryAccum += rawDt;
            if (telemetryAccum >= 0.08) {
              telemetryAccum = 0;
              setSimTime(engine.time);
              const sample = engine.computeTelemetry(
                selectedIdRef.current,
                customMetricsRef.current
              );
              setTelemetrySamples((prev) =>
                prev.length > 260 ? [...prev.slice(-240), sample] : [...prev, sample]
              );
            }
          }
        } else if (activeMode === 'math') {
          const mc = mathConfigRef.current;
          mathTime += scaledDt;
          setSimTime(mathTime);

          if (
            mc.activeKind === 'explicit' &&
            mc.explicit.animate &&
            mathRuntimeRef.current.explicitGeom
          ) {
            updateExplicitSurface(
              mathRuntimeRef.current.explicitGeom,
              mc.explicit,
              mathTime * mc.explicit.speed
            );
          } else if (
            mc.activeKind === 'ode' &&
            mathRuntimeRef.current.odeHeads &&
            mathRuntimeRef.current.odeTrajectories
          ) {
            const trajs = mathRuntimeRef.current.odeTrajectories;
            if (trajs.length > 0 && trajs[0].rawStates.length > 0) {
              const len = trajs[0].rawStates.length;
              mathRuntimeRef.current.odeCursor =
                (mathRuntimeRef.current.odeCursor + Math.max(1, Math.round(scaledDt * 180))) % len;
              const c = mathRuntimeRef.current.odeCursor;
              mathRuntimeRef.current.odeHeads.forEach((head, idx) => {
                const pts = trajs[idx]?.points;
                if (pts) {
                  head.position.set(pts[c * 3], pts[c * 3 + 1], pts[c * 3 + 2]);
                }
              });
            }
          } else if (mc.activeKind === 'vectorField') {
            mathRuntimeRef.current.vectorHandle?.stepTracers(scaledDt);
          }
        } else if (activeMode === 'soft') {
          const sc = softConfigRef.current;
          mathTime += scaledDt;
          setSimTime(mathTime);

          if (sc.activeKind === 'particles' && softRuntimeRef.current.particles) {
            softRuntimeRef.current.particles.step(scaledDt, sc.particles);
            softRuntimeRef.current.particles.syncMesh(sc.colormap);
          } else if (sc.activeKind === 'cloth' && softRuntimeRef.current.cloth) {
            softRuntimeRef.current.cloth.step(scaledDt, sc.cloth, gravityRef.current[1]);
            softRuntimeRef.current.cloth.syncMesh(sc.cloth, sc.colormap);
          } else if (sc.activeKind === 'sphFluid' && softRuntimeRef.current.sph) {
            softRuntimeRef.current.sph.step(scaledDt, sc.sphFluid);
            softRuntimeRef.current.sph.syncMesh(sc.colormap);
          } else if (sc.activeKind === 'waveTank' && softRuntimeRef.current.wave) {
            softRuntimeRef.current.wave.step(scaledDt, sc.waveTank);
            softRuntimeRef.current.wave.syncMesh(sc.colormap);
          }
        }
      }

      if (activeMode === 'electronics' && circuit3DHandleRef.current) {
        for (const rotor of circuit3DHandleRef.current.rotors) {
          if (Math.abs(rotor.rpm) > 0.1) {
            rotor.mesh.rotation.y += (rotor.rpm / 60) * Math.PI * 2 * scaledDt;
          }
        }
      }

      if (introOverlayModeRef.current === null) {
        vp.render();
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      rapierRef.current.dispose();
      mathRuntimeRef.current.vectorHandle?.dispose();
      softRuntimeRef.current.particles?.dispose();
      softRuntimeRef.current.cloth?.dispose();
      softRuntimeRef.current.sph?.dispose();
      softRuntimeRef.current.wave?.dispose();
      sculptEngineRef.current?.dispose();
      circuit3DHandleRef.current?.dispose();
      vp.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live 3D Workbench & PCB sync when board, modules, wires, or schematic change
  useEffect(() => {
    rebuildElectronicsViewport(electronicsSubMode, workbenchConfig, circuit, circuitSolved);
  }, [electronicsSubMode, workbenchConfig, circuit, circuitSolved, rebuildElectronicsViewport]);

  // Sync mode visibility & stage settings
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.setModeVisibility(mode);
    vp.setStageSettings(stage);
    refreshStats(mode);
  }, [mode, stage, refreshStats]);

  useEffect(() => {
    viewportRef.current?.setGizmoMode(gizmoMode);
  }, [gizmoMode]);

  useEffect(() => {
    viewportRef.current?.setSelectedId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (skipCadRebuildRef.current) {
      skipCadRebuildRef.current = false;
      return;
    }
    viewportRef.current?.syncCadParts(cadParts);
    if (modeRef.current === 'cad') refreshStats('cad');
  }, [cadParts, refreshStats]);

  useEffect(() => {
    viewportRef.current?.setSnapToGrid(snapToGrid);
  }, [snapToGrid]);

  const inspectionMetrics = useMemo(
    () => inspectEntities(entities, selectedId, measureTargetId),
    [entities, selectedId, measureTargetId]
  );

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    if (mode !== 'physics' || !selectedId || !measureTargetId) {
      vp.updateMeasurementOverlay(null, null);
      return;
    }
    const a = entities.find((e) => e.id === selectedId);
    const b = entities.find((e) => e.id === measureTargetId);
    vp.updateMeasurementOverlay(a && b ? a.position : null, a && b ? b.position : null);
  }, [mode, entities, selectedId, measureTargetId]);

  // Client-side Autosave & Recovery
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const payload = {
          format: AUTOSAVE_KEY,
          activePhysicsPresetId,
          gravity,
          entities,
          joints,
          cadParts,
          parameters,
          designRuns,
        };
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        setAutosavedAt(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch {
        // Ignore storage quota issues
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [activePhysicsPresetId, gravity, entities, joints, cadParts, parameters, designRuns]);

  const pushHistorySnapshot = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastHistoryTsRef.current < 650) return;
      lastHistoryTsRef.current = now;
      const snap: ProjectSnapshot = {
        entities: structuredClone(entities),
        joints: structuredClone(joints),
        cadParts: structuredClone(cadParts),
        parameters: structuredClone(parameters),
      };
      setUndoStack((prev) => [...prev.slice(-24), snap]);
      setRedoStack([]);
    },
    [entities, joints, cadParts, parameters]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1];
      const currentSnap: ProjectSnapshot = {
        entities: structuredClone(entities),
        joints: structuredClone(joints),
        cadParts: structuredClone(cadParts),
        parameters: structuredClone(parameters),
      };
      setRedoStack((r) => [...r.slice(-24), currentSnap]);
      setEntities(target.entities);
      setJoints(target.joints);
      setCadParts(target.cadParts);
      setParameters(target.parameters);
      setRunning(false);
      void syncPhysicsWorldAndViewport(target.entities, target.joints, gravity);
      return prev.slice(0, -1);
    });
  }, [entities, joints, cadParts, parameters, gravity, syncPhysicsWorldAndViewport]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1];
      const currentSnap: ProjectSnapshot = {
        entities: structuredClone(entities),
        joints: structuredClone(joints),
        cadParts: structuredClone(cadParts),
        parameters: structuredClone(parameters),
      };
      setUndoStack((u) => [...u.slice(-24), currentSnap]);
      setEntities(target.entities);
      setJoints(target.joints);
      setCadParts(target.cadParts);
      setParameters(target.parameters);
      setRunning(false);
      void syncPhysicsWorldAndViewport(target.entities, target.joints, gravity);
      return prev.slice(0, -1);
    });
  }, [entities, joints, cadParts, parameters, gravity, syncPhysicsWorldAndViewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setRunning((r) => !r);
      } else if (e.key === 'q' || e.key === 'Q') {
        setGizmoMode('select');
      } else if (e.key === 'w' || e.key === 'W') {
        setGizmoMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        setGizmoMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        setGizmoMode('scale');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const handleModeChange = (nextMode: StudioMode) => {
    setMode(nextMode);
    if (nextMode === 'cad') {
      setSelectedId(cadParts[0]?.id ?? null);
    } else if (nextMode === 'mesh') {
      syncMeshViewport();
    } else if (nextMode === 'electronics') {
      rebuildElectronicsViewport(electronicsSubMode, workbenchConfig, circuit, circuitSolved);
      if (
        electronicsSubMode === 'circuit' &&
        typeof window !== 'undefined' &&
        window.innerWidth >= 900
      ) {
        setSchematicOpen(true);
      }
    } else if (nextMode === 'physics') {
      setSelectedId(entities[0]?.id ?? null);
      if (physicsRebuildPendingRef.current) {
        physicsRebuildPendingRef.current = false;
        void syncPhysicsWorldAndViewport(entities, joints, gravity);
      }
    } else if (nextMode === 'soft') {
      setRunning(true);
    }
  };

  // Physics & Unified Project actions
  const handleLoadPhysicsPreset = (presetId: string) => {
    const p = physicsPresets.find((x) => x.id === presetId);
    if (!p) return;
    pushHistorySnapshot(true);
    setRunning(false);
    setActivePhysicsPresetId(p.id);
    scriptStepCallbackRef.current = null;
    customMetricsRef.current = {};
    const clonedEnts = structuredClone(p.entities);
    const clonedJoints = structuredClone(p.joints);
    const nextParams = getDefaultParametersForPreset(p.id, clonedEnts, clonedJoints);
    const evalRes = evaluateProjectParameters(nextParams, clonedEnts, clonedJoints);
    setEntities(evalRes.entities);
    setJoints(evalRes.joints);
    setParameters(evalRes.parameters);
    setCheckpoints([]);
    setDesignRuns([]);
    setMeasureTargetId(null);
    setSelectedId(
      evalRes.entities.find((e) => e.bodyType === 'dynamic')?.id ?? evalRes.entities[0]?.id ?? null
    );
    void syncPhysicsWorldAndViewport(evalRes.entities, evalRes.joints, gravity);
  };

  const handleAddPhysicsEntity = (shape: ShapeKind) => {
    pushHistorySnapshot(true);
    const idx = entities.length + 1;
    const colors = ['#38bdf8', '#f59e0b', '#34d399', '#a78bfa', '#fb7185'];
    const rawEnt: StudioEntity = {
      id: `body-${shape}-${Date.now()}`,
      name: `${shape.charAt(0).toUpperCase() + shape.slice(1)} ${idx}`,
      category: 'physics',
      shape,
      bodyType: 'dynamic',
      position: [(Math.random() - 0.5) * 2.5, 4.2, (Math.random() - 0.5) * 2.5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: { width: 1, height: 1, depth: 1, radius: 0.5 },
      color: colors[idx % colors.length],
      metalness: 0.3,
      roughness: 0.38,
      opacity: 1,
      visible: true,
      density: 2700,
      materialPreset: 'aluminum',
      physics: {
        mass: 1.5,
        friction: 0.5,
        restitution: 0.45,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, 0, 0],
      },
    };
    const ent = syncEntityPhysicalMass(rawEnt);
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleUpdateEntity = (id: string, patch: Partial<StudioEntity>) => {
    pushHistorySnapshot();
    const orig = entities.find((e) => e.id === id);
    const nextPos = patch.position;
    let next = entities.map((e) => (e.id === id ? { ...e, ...patch } : e));

    if (orig && nextPos) {
      const dx = nextPos[0] - orig.position[0];
      const dy = nextPos[1] - orig.position[1];
      const dz = nextPos[2] - orig.position[2];
      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6 || Math.abs(dz) > 1e-6) {
        const descendants = new Set<string>();
        let added = true;
        while (added) {
          added = false;
          for (const item of next) {
            if (
              item.parentId &&
              (item.parentId === id || descendants.has(item.parentId)) &&
              !descendants.has(item.id)
            ) {
              descendants.add(item.id);
              added = true;
            }
          }
        }
        next = next.map((e) =>
          descendants.has(e.id)
            ? {
                ...e,
                position: [e.position[0] + dx, e.position[1] + dy, e.position[2] + dz],
              }
            : e
        );
      }
    }

    setEntities(next);
    if (!running) {
      void syncPhysicsWorldAndViewport(next, joints, gravity);
    }
  };

  const handleToggleEntityVisible = (id: string) => {
    pushHistorySnapshot(true);
    const next = entities.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e));
    setEntities(next);
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleToggleEntityLocked = (id: string) => {
    pushHistorySnapshot(true);
    const next = entities.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e));
    setEntities(next);
    viewportRef.current?.syncPhysicsEntities(next);
  };

  const handleAlignEntity = (entityId: string, targetId: string | null, snapMode: SnapMode) => {
    const entA = entities.find((e) => e.id === entityId);
    if (!entA) return;
    const ext = (e: StudioEntity): Vec3 => {
      const w =
        e.shape === 'sphere' || e.shape === 'cylinder' || e.shape === 'capsule' || e.shape === 'cone'
          ? e.size.radius * 2
          : e.size.width;
      const h = e.shape === 'sphere' ? e.size.radius * 2 : e.size.height;
      const d =
        e.shape === 'sphere' || e.shape === 'cylinder' || e.shape === 'capsule' || e.shape === 'cone'
          ? e.size.radius * 2
          : e.size.depth;
      return [
        w * Math.abs(e.scale[0]),
        h * Math.abs(e.scale[1]),
        d * Math.abs(e.scale[2]),
      ];
    };
    const sA = ext(entA);
    const entB = targetId ? entities.find((e) => e.id === targetId) ?? null : null;
    if (snapMode === 'ground' || !entB) {
      handleUpdateEntity(entityId, {
        position: [entA.position[0], Math.max(0.05, sA[1] * 0.5), entA.position[2]],
      });
      return;
    }
    const sB = ext(entB);
    const [bx, by, bz] = entB.position;
    let nextPos: Vec3 = [bx, by, bz];
    if (snapMode === 'onTop') nextPos = [bx, by + sB[1] * 0.5 + sA[1] * 0.5, bz];
    else if (snapMode === 'toRight') nextPos = [bx + sB[0] * 0.5 + sA[0] * 0.5, by, bz];
    else if (snapMode === 'inFront') nextPos = [bx, by, bz + sB[2] * 0.5 + sA[2] * 0.5];
    handleUpdateEntity(entityId, { position: nextPos });
  };

  const handleSyncCadPartToPhysics = (cadPartId: string) => {
    const part = cadParts.find((p) => p.id === cadPartId);
    if (!part) return;
    pushHistorySnapshot(true);
    const geom = createParametricGeometry(part);
    const serialized = serializeBufferGeometry(geom);
    geom.dispose();

    const ent = syncEntityPhysicalMass({
      id: `cad-live-${part.id}-${Date.now()}`,
      name: part.name,
      category: 'cad',
      cadLinkId: part.id,
      shape: 'custom',
      bodyType: 'dynamic',
      position: [part.position[0], Math.max(1.8, part.position[1]), part.position[2]],
      rotation: [...part.rotation],
      scale: [1, 1, 1],
      size: { width: part.width, height: part.height, depth: part.depth, radius: part.outerRadius },
      color: part.color,
      metalness: 0.4,
      roughness: 0.35,
      opacity: 1,
      visible: true,
      density: 2700,
      materialPreset: 'aluminum',
      serializedMesh: serialized,
      physics: {
        mass: 2.2,
        friction: 0.5,
        restitution: 0.35,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, 0, 0],
        colliderKind: 'convexHull',
      },
    });
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    setMode('physics');
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleUpdateParameter = (id: string, value: number) => {
    pushHistorySnapshot();
    const changedParam = parameters.find((p) => p.id === id);
    const rawNext = parameters.map((p) => (p.id === id ? { ...p, value } : p));
    const evalRes = evaluateProjectParameters(rawNext, entities, joints);
    setParameters(evalRes.parameters);
    setEntities(evalRes.entities);
    setJoints(evalRes.joints);

    if (
      running &&
      changedParam?.targetJointId &&
      changedParam.targetJointField === 'motorSpeed'
    ) {
      const j = evalRes.joints.find((x) => x.id === changedParam.targetJointId);
      if (j) {
        rapierRef.current.updateJointMotor(j.id, j.motorSpeed, Math.max(12, j.motorMaxForce || 20));
        return;
      }
    }

    if (!running) {
      void syncPhysicsWorldAndViewport(evalRes.entities, evalRes.joints, gravity);
    } else {
      viewportRef.current?.syncPhysicsEntities(evalRes.entities);
      void rapierRef.current.rebuild(evalRes.entities, evalRes.joints, gravity);
    }
  };

  const handleAddCustomParameter = (param: ProjectParameter) => {
    pushHistorySnapshot(true);
    const evalRes = evaluateProjectParameters([...parameters, param], entities, joints);
    setParameters(evalRes.parameters);
    setEntities(evalRes.entities);
    setJoints(evalRes.joints);
  };

  const handleDuplicateEntity = (id: string) => {
    const orig = entities.find((e) => e.id === id);
    if (!orig) return;
    pushHistorySnapshot(true);
    const copy = structuredClone(orig);
    copy.id = `copy-${Date.now()}`;
    copy.name = `${orig.name} Copy`;
    copy.position = [orig.position[0] + 1.1, orig.position[1] + 0.4, orig.position[2]];
    const next = [...entities, copy];
    setEntities(next);
    setSelectedId(copy.id);
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleDeleteEntity = (id: string) => {
    pushHistorySnapshot(true);
    const nextEnts = entities.filter((e) => e.id !== id);
    const nextJoints = joints.filter((j) => j.bodyA !== id && j.bodyB !== id);
    setEntities(nextEnts);
    setJoints(nextJoints);
    if (selectedId === id) setSelectedId(nextEnts[0]?.id ?? null);
    void syncPhysicsWorldAndViewport(nextEnts, nextJoints, gravity);
  };

  const handleSaveCheckpoint = () => {
    if (!rapierRef.current.isReady) return;
    const snap: SimulationCheckpoint = {
      id: `cp-${Date.now()}`,
      label: `CP${checkpoints.length + 1}`,
      simTime: rapierRef.current.time,
      createdAt: new Date().toISOString(),
      bodyStates: rapierRef.current.captureSnapshots(),
      parameters: structuredClone(parameters),
    };
    setCheckpoints((prev) => [...prev.slice(-7), snap]);
  };

  const handleRestoreCheckpoint = async (cpId: string) => {
    const cp = checkpoints.find((c) => c.id === cpId);
    if (!cp) return;
    setRunning(false);
    setPlaybackIndex(null);
    const evalRes = evaluateProjectParameters(structuredClone(cp.parameters), entities, joints);
    setParameters(evalRes.parameters);
    setEntities(evalRes.entities);
    setJoints(evalRes.joints);
    await rapierRef.current.rebuild(evalRes.entities, evalRes.joints, gravity);
    rapierRef.current.restoreSnapshots(cp.bodyStates, cp.simTime);

    const vp = viewportRef.current;
    if (vp) {
      vp.syncPhysicsEntities(evalRes.entities);
      for (const ent of evalRes.entities) {
        const tr = rapierRef.current.getBodyTransform(ent.id);
        if (tr) vp.updateEntityTransform(ent.id, tr.position, tr.quaternion);
      }
      vp.updateJointDebug(rapierRef.current.getJointWorldSegments());
    }
    setSimTime(cp.simTime);
  };

  const handleDeleteCheckpoint = (cpId: string) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== cpId));
  };

  const handleRunDesignVariant = async () => {
    const idx = designRuns.length;
    const label = `Design ${String.fromCharCode(65 + (idx % 26))}`;
    const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
    const run = await runDesignVariantExperiment({
      label,
      color,
      entities,
      joints,
      gravity,
      parameters,
      durationSec: 3.0,
    });
    setDesignRuns((prev) => [...prev, run]);
    setTelemetryOpen(true);
  };

  const handleAddJoint = (j: StudioJoint) => {
    const next = [...joints, j];
    setJoints(next);
    void syncPhysicsWorldAndViewport(entities, next, gravity);
  };

  const handleDeleteJoint = (id: string) => {
    const next = joints.filter((j) => j.id !== id);
    setJoints(next);
    void syncPhysicsWorldAndViewport(entities, next, gravity);
  };

  // CAD actions
  const handleAddCadPart = (kind: CadPrimitiveKind) => {
    const part = createCadPartTemplate(kind, cadParts.length + 1);
    const next = [...cadParts, part];
    setCadParts(next);
    setSelectedId(part.id);
  };

  const handleAddLibraryPart = (meta: LibraryPartMeta) => {
    const part = createCadPartFromLibrary(meta, cadParts.length + 1);
    setCadParts((prev) => [...prev, part]);
    setSelectedId(part.id);
  };

  const handleUpdateCadPart = (id: string, patch: Partial<CadPartConfig>) => {
    const keys = Object.keys(patch);
    const transformOnly = keys.every((k) => k === 'position' || k === 'rotation');
    if (transformOnly) {
      skipCadRebuildRef.current = true;
    }
    setCadParts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        if (transformOnly) {
          viewportRef.current?.updateCadTransform(id, next.position, next.rotation);
        }
        return next;
      })
    );
  };

  const handleToggleCadVisible = (id: string) => {
    setCadParts((prev) => prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));
  };

  const handleToggleCadLocked = (id: string) => {
    setCadParts((prev) => prev.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p)));
  };

  const handleDeleteCadPart = (id: string) => {
    setCadParts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const handleSnapCadPart = (partId: string, targetId: string | null, snapMode: SnapMode) => {
    const partA = cadParts.find((p) => p.id === partId);
    if (!partA) return;
    const partB = targetId ? cadParts.find((p) => p.id === targetId) ?? null : null;
    const snappedPos = computeSnapPosition(partA, partB, snapMode);
    handleUpdateCadPart(partId, { position: snappedPos, locked: true });
  };

  const handleBuildFrom2DSketch = (
    points: [number, number][],
    sketchMode: 'extrude' | 'lathe',
    depth: number,
    name: string
  ) => {
    const geom = buildGeometryFrom2DSketch(points, sketchMode, depth, 0.03);
    const serialized = serializeBufferGeometry(geom);
    geom.dispose();
    const part: CadPartConfig = {
      ...createCadPartTemplate('box', cadParts.length + 1),
      id: `cad-2d-${Date.now()}`,
      name: name || '2D Profile Mesh',
      position: [0, 1.0, 0],
      rotation: [0, 0, 0],
      color: '#22d3ee',
      sketch2D: { mode: sketchMode, depth, points },
      csgMesh: serialized,
    };
    setCadParts((prev) => [...prev, part]);
    setSelectedId(part.id);
  };

  const handleProjectSelected3DTo2D = () => {
    const part = selectedCadPart ?? cadParts[0];
    if (!part) return;
    const geom = createParametricGeometry(part);
    const proj = projectGeometryTo2DBlueprint(geom);
    geom.dispose();
    setBlueprintProjection(proj);
  };

  const handleDownloadBlueprintSVG = () => {
    if (!blueprintProjection) return;
    const name = (selectedCadPart ?? cadParts[0])?.name ?? 'Part';
    const svg = buildBlueprintSVGString(blueprintProjection, `Outerflow Blueprint — ${name}`);
    downloadBlob(
      new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
      'outerflow-2d-blueprint.svg'
    );
  };

  const handleRunDesignCode = () => {
    const res = executeDesignCode(designCode);
    if (!res.ok) {
      setDesignCodeError(res.error ?? 'Failed to compile design script');
      return;
    }
    setDesignCodeError(null);
    if (res.parts.length > 0) {
      setCadParts((prev) => [...prev, ...res.parts]);
      setSelectedId(res.parts[0].id);
    }
  };

  // Mesh Sculpt actions
  const handleSelectSculptPreset = (preset: SculptBasePreset) => {
    const next: MeshSculptConfig = { ...meshConfig, basePreset: preset };
    setMeshConfig(next);
    if (sculptEngineRef.current) {
      sculptEngineRef.current.reset(preset);
      sculptEngineRef.current.applyModifiers(next);
      if (sculptMeshRef.current) {
        sculptMeshRef.current.geometry = sculptEngineRef.current.geometry;
      }
      if (modeRef.current === 'mesh') {
        setMeshStats(sculptEngineRef.current.getStats());
      }
    }
  };

  const handleUpdateMeshConfig = (next: MeshSculptConfig) => {
    setMeshConfig(next);
    if (
      next.twist !== meshConfig.twist ||
      next.taper !== meshConfig.taper ||
      next.noise !== meshConfig.noise
    ) {
      sculptEngineRef.current?.applyModifiers(next);
      if (modeRef.current === 'mesh' && sculptEngineRef.current) {
        setMeshStats(sculptEngineRef.current.getStats());
      }
    }
  };

  const handleSubdivideMesh = () => {
    const engine = sculptEngineRef.current;
    if (!engine) return;
    if (engine.applySubdivide(meshConfig) && sculptMeshRef.current) {
      sculptMeshRef.current.geometry = engine.geometry;
      if (modeRef.current === 'mesh') {
        setMeshStats(engine.getStats());
      }
    }
  };

  const handleUndoMesh = () => {
    const engine = sculptEngineRef.current;
    if (!engine) return;
    if (engine.undo(meshConfig) && modeRef.current === 'mesh') {
      setMeshStats(engine.getStats());
    }
  };

  const handleSendMeshToPhysics = () => {
    const engine = sculptEngineRef.current;
    if (!engine) return;
    const serialized = engine.serialize();
    const ent: StudioEntity = {
      id: `sculpt-phys-${Date.now()}`,
      name: `Sculpted (${meshConfig.basePreset})`,
      category: 'cad',
      shape: 'custom',
      bodyType: 'dynamic',
      position: [0, 2.2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: { width: 1, height: 1, depth: 1, radius: 0.5 },
      color: '#a8b3cf',
      metalness: 0.25,
      roughness: 0.4,
      opacity: 1,
      visible: true,
      serializedMesh: serialized,
      physics: {
        mass: 2.0,
        friction: 0.55,
        restitution: 0.3,
        linearDamping: 0.03,
        angularDamping: 0.05,
        initialVelocity: [0, 0, 0],
        colliderKind: 'convexHull',
      },
    };
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    setMode('physics');
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleSendMeshToCad = () => {
    const engine = sculptEngineRef.current;
    if (!engine) return;
    const serialized = engine.serialize();
    const part: CadPartConfig = {
      ...createCadPartTemplate('box', cadParts.length + 1),
      id: `sculpt-cad-${Date.now()}`,
      name: `Sculpt (${meshConfig.basePreset})`,
      position: [0, 0.2, 0],
      rotation: [0, 0, 0],
      color: '#a8b3cf',
      csgMesh: serialized,
    };
    setCadParts((prev) => [...prev, part]);
    setSelectedId(part.id);
    setMode('cad');
  };

  // Electronics Workbench & Circuit actions
  const handleSelectWorkbenchBoard = (boardId: string) => {
    setWorkbenchConfig((prev) => ({ ...prev, boardId }));
  };

  const handleSelectWorkbenchMission = (missionId: string) => {
    const m = WORKBENCH_MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    setWorkbenchConfig((prev) => ({
      ...prev,
      boardId: m.boardId,
      missionId: m.id,
      modules: structuredClone(m.modules),
      wires: structuredClone(m.wires),
    }));
  };

  const handleAddWorkbenchModule = (specId: string) => {
    setWorkbenchConfig((prev) => {
      const idx = prev.modules.length;
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const nextMod = {
        instanceId: `mod-${specId}-${Date.now()}`,
        specId,
        position: [1.35 + col * 1.15, 0.08, -0.75 + row * 0.9] as Vec3,
        rotationY: 0,
      };
      return { ...prev, modules: [...prev.modules, nextMod] };
    });
  };

  const handleClearWorkbenchWires = () => {
    setWorkbenchConfig((prev) => ({ ...prev, wires: [] }));
  };

  const handleAddWorkbenchWire = (wire: WorkbenchWire) => {
    setWorkbenchConfig((prev) => ({ ...prev, wires: [...prev.wires, wire] }));
  };

  const handleRemoveWorkbenchWire = (wireId: string) => {
    setWorkbenchConfig((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
  };

  const handleRemoveWorkbenchModule = (instanceId: string) => {
    setWorkbenchConfig((prev) => ({
      ...prev,
      modules: prev.modules.filter((m) => m.instanceId !== instanceId),
      wires: prev.wires.filter((w) => w.fromTarget !== instanceId && w.toTarget !== instanceId),
    }));
  };

  const handleLoadCircuitPreset = (id: string) => {
    const found = circuitPresets.find((c) => c.id === id);
    if (!found) return;
    const cloned = structuredClone(found);
    setCircuit(cloned);
    setSelectedCircuitCompId(cloned.components[0]?.id ?? null);
  };

  const handleAddCircuitComponent = (kind: CircuitComponentKind) => {
    const comp = createComponentTemplate(kind, circuit.components.length + 1);
    setCircuit((prev) => ({ ...prev, components: [...prev.components, comp] }));
    setSelectedCircuitCompId(comp.id);
  };

  const handleUpdateCircuitComp = (id: string, patch: Partial<CircuitComponent>) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const handleDeleteCircuitComp = (id: string) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== id),
      wires: prev.wires.filter((w) => w.fromCompId !== id && w.toCompId !== id),
    }));
    if (selectedCircuitCompId === id) setSelectedCircuitCompId(null);
  };

  const handleToggleCircuitSwitch = (id: string) => {
    setCircuit((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, closed: !c.closed } : c)),
    }));
  };

  const handleRunCsg = (idA: string, idB: string, op: CsgOperation) => {
    const pA = cadParts.find((p) => p.id === idA);
    const pB = cadParts.find((p) => p.id === idB);
    if (!pA || !pB) return;

    const gA = createParametricGeometry(pA);
    const gB = createParametricGeometry(pB);

    const mA = new THREE.Matrix4().compose(
      new THREE.Vector3(...pA.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...pA.rotation)),
      new THREE.Vector3(1, 1, 1)
    );
    const mB = new THREE.Matrix4().compose(
      new THREE.Vector3(...pB.position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...pB.rotation)),
      new THREE.Vector3(1, 1, 1)
    );

    const resultGeom =
      op === 'union'
        ? csgUnion(gA, mA, gB, mB)
        : op === 'subtract'
        ? csgSubtract(gA, mA, gB, mB)
        : csgIntersect(gA, mA, gB, mB);

    gA.dispose();
    gB.dispose();

    const posAttr = resultGeom.getAttribute('position');
    if (!posAttr || posAttr.count === 0) {
      resultGeom.dispose();
      return;
    }

    resultGeom.computeBoundingBox();
    const center = new THREE.Vector3();
    resultGeom.boundingBox?.getCenter(center);
    resultGeom.translate(-center.x, -center.y, -center.z);

    const csgPart: CadPartConfig = {
      ...pA,
      id: `cad-csg-${Date.now()}`,
      name: `${pA.name} ${op} ${pB.name}`,
      position: [center.x, center.y, center.z],
      rotation: [0, 0, 0],
      color: '#38bdf8',
      visible: true,
      csgMesh: serializeBufferGeometry(resultGeom),
    };
    resultGeom.dispose();

    setCadParts((prev) => [
      ...prev.map((p) => (p.id === idA || p.id === idB ? { ...p, visible: false } : p)),
      csgPart,
    ]);
    setSelectedId(csgPart.id);
  };

  const handleSendCadToPhysics = (id: string) => {
    const part = cadParts.find((p) => p.id === id);
    if (!part) return;
    const geom = createParametricGeometry(part);
    const serialized = serializeBufferGeometry(geom);
    geom.dispose();

    const ent: StudioEntity = {
      id: `cad-phys-${Date.now()}`,
      name: `${part.name} (CAD)`,
      category: 'cad',
      shape: 'custom',
      bodyType: 'dynamic',
      position: [part.position[0], Math.max(1.8, part.position[1]), part.position[2]],
      rotation: [...part.rotation],
      scale: [1, 1, 1],
      size: { width: 1, height: 1, depth: 1, radius: 0.5 },
      color: part.color,
      metalness: 0.4,
      roughness: 0.35,
      opacity: 1,
      visible: true,
      serializedMesh: serialized,
      physics: {
        mass: 2.2,
        friction: 0.5,
        restitution: 0.35,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, 0, 0],
        colliderKind: 'convexHull',
      },
    };
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    setMode('physics');
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  // Math actions
  const handleUpdateMathConfig = (next: MathConfig) => {
    setMathConfig(next);
    rebuildMathViewport(next);
  };

  const handleMathKindChange = (kind: MathModeKind) => {
    const next: MathConfig = { ...mathConfig, activeKind: kind };
    setMathConfig(next);
    rebuildMathViewport(next);
    if (kind === 'explicit' || kind === 'ode' || kind === 'vectorField') {
      setRunning(true);
    }
  };

  const handleSelectMathPreset = (kind: MathModeKind, presetId: string) => {
    const next = { ...mathConfig, activeKind: kind };
    if (kind === 'parametric') {
      const p = PARAMETRIC_PRESETS.find((x) => x.id === presetId);
      if (p) next.parametric = { ...next.parametric, presetId: p.id, ...p.config };
    } else if (kind === 'explicit') {
      const p = EXPLICIT_PRESETS.find((x) => x.id === presetId);
      if (p) next.explicit = { ...next.explicit, presetId: p.id, ...p.config };
    } else if (kind === 'implicit') {
      const p = IMPLICIT_PRESETS.find((x) => x.id === presetId);
      if (p) next.implicit = { ...next.implicit, presetId: p.id, ...p.config };
    } else if (kind === 'ode') {
      const p = ODE_PRESETS.find((x) => x.id === presetId);
      if (p) {
        next.ode = {
          ...next.ode,
          presetId: p.id,
          ...p.config,
          params: { ...p.config.params },
          initialState: [...p.config.initialState],
        };
      }
    } else if (kind === 'vectorField') {
      const p = VECTOR_FIELD_PRESETS.find((x) => x.id === presetId);
      if (p) next.vectorField = { ...next.vectorField, presetId: p.id, ...p.config };
    }
    setMathConfig(next);
    rebuildMathViewport(next);
  };

  const handleSendMathToPhysics = () => {
    const geom = mathRuntimeRef.current.surfaceGeomForExport;
    if (!geom) return;
    const serialized = serializeBufferGeometry(geom);
    const ent: StudioEntity = {
      id: `math-phys-${Date.now()}`,
      name: `Math Surface (${mathConfig.activeKind})`,
      category: 'math',
      shape: 'custom',
      bodyType: 'dynamic',
      position: [0, 2.8, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      size: { width: 1, height: 1, depth: 1, radius: 0.5 },
      color: '#38bdf8',
      metalness: 0.35,
      roughness: 0.3,
      opacity: 1,
      visible: true,
      serializedMesh: serialized,
      physics: {
        mass: 2.5,
        friction: 0.5,
        restitution: 0.4,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, 0, 0],
        colliderKind: 'convexHull',
      },
    };
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    setMode('physics');
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  // Soft / Fields actions
  const handleSoftKindChange = (kind: SoftSimKind) => {
    const next = { ...softConfig, activeKind: kind };
    setSoftConfig(next);
    rebuildSoftViewport(next);
    setRunning(true);
  };

  const handleSoftParticlePreset = (preset: SoftSimConfig['particles']['preset']) => {
    const next: SoftSimConfig = {
      ...softConfig,
      activeKind: 'particles',
      particles: { ...softConfig.particles, preset },
    };
    setSoftConfig(next);
    rebuildSoftViewport(next);
    setRunning(true);
  };

  const handleUpdateSoftConfig = (next: SoftSimConfig) => {
    const prev = softConfig;
    setSoftConfig(next);
    if (next.activeKind === 'particles' && next.particles.count !== prev.particles.count) {
      rebuildSoftViewport(next);
      return;
    }
    if (next.activeKind === 'cloth' && next.cloth.pinMode !== prev.cloth.pinMode) {
      softRuntimeRef.current.cloth?.setPinMode(next.cloth.pinMode);
    }
    softRuntimeRef.current.particles?.syncMesh(next.colormap);
    softRuntimeRef.current.cloth?.syncMesh(next.cloth, next.colormap);
    softRuntimeRef.current.sph?.syncMesh(next.colormap);
    softRuntimeRef.current.wave?.syncMesh(next.colormap);
  };

  // Preset Cycler (< and > arrows in viewport)
  const handleCyclePreset = (dir: -1 | 1) => {
    if (mode === 'physics') {
      const idx = physicsPresets.findIndex((p) => p.id === activePhysicsPresetId);
      const nextIdx = (idx + dir + physicsPresets.length) % physicsPresets.length;
      handleLoadPhysicsPreset(physicsPresets[nextIdx].id);
    } else if (mode === 'math') {
      const k = mathConfig.activeKind;
      const list =
        k === 'parametric'
          ? PARAMETRIC_PRESETS
          : k === 'explicit'
          ? EXPLICIT_PRESETS
          : k === 'implicit'
          ? IMPLICIT_PRESETS
          : k === 'ode'
          ? ODE_PRESETS
          : VECTOR_FIELD_PRESETS;
      const currId = mathConfig[k].presetId;
      const idx = list.findIndex((p) => p.id === currId);
      const nextIdx = (idx + dir + list.length) % list.length;
      handleSelectMathPreset(k, list[nextIdx].id);
    } else if (mode === 'soft') {
      const kinds: SoftSimKind[] = ['particles', 'cloth', 'sphFluid', 'waveTank'];
      const idx = kinds.indexOf(softConfig.activeKind);
      const nextIdx = (idx + dir + kinds.length) % kinds.length;
      handleSoftKindChange(kinds[nextIdx]);
    } else if (mode === 'mesh') {
      const sculptPresets: SculptBasePreset[] = [
        'humanHead',
        'sphere',
        'organicPod',
        'torus',
        'cube',
        'terrain',
      ];
      const idx = sculptPresets.indexOf(meshConfig.basePreset);
      const nextIdx = (idx + dir + sculptPresets.length) % sculptPresets.length;
      handleSelectSculptPreset(sculptPresets[nextIdx]);
    } else if (mode === 'electronics') {
      const idx = circuitPresets.findIndex((c) => c.id === circuit.id);
      const nextIdx = (idx + dir + circuitPresets.length) % circuitPresets.length;
      handleLoadCircuitPreset(circuitPresets[nextIdx].id);
    }
  };

  // Experiments actions
  const handleRunExperimentScript = () => {
    const res = executeExperimentScript(experimentScript);
    setScriptLogs(res.logs);
    setScriptError(res.ok ? null : res.error ?? 'Unknown script error');
    if (!res.ok) return;

    scriptStepCallbackRef.current = res.stepCallback;
    customMetricsRef.current = {};
    setGravity(res.gravity);
    setEntities(res.entities);
    setJoints(res.joints);
    setSelectedId(res.entities[res.entities.length - 1]?.id ?? null);
    void syncPhysicsWorldAndViewport(res.entities, res.joints, res.gravity).then(() => {
      setRunning(true);
    });
  };

  const handleRunSweep = async () => {
    setSweepProgress({ running: true, completed: 0, total: sweepConfig.steps });
    try {
      const results = await runParameterSweep(sweepConfig, (completed, total) => {
        setSweepProgress({ running: true, completed, total });
      });
      setSweepResults(results);
      setTelemetryOpen(true);
    } finally {
      setSweepProgress((p) => ({ ...p, running: false }));
    }
  };

  // Transport controls
  const handleStep = () => {
    setRunning(false);
    setPlaybackIndex(null);
    const vp = viewportRef.current;
    if (!vp) return;

    if (mode === 'physics' || mode === 'experiments') {
      const dt = 1 / 60;
      rapierRef.current.step(dt);
      for (const ent of entities) {
        const tr = rapierRef.current.getBodyTransform(ent.id);
        if (tr) vp.updateEntityTransform(ent.id, tr.position, tr.quaternion);
      }
      vp.updateJointDebug(rapierRef.current.getJointWorldSegments());
      setSimTime(rapierRef.current.time);
      const sample = rapierRef.current.computeTelemetry(selectedId, customMetricsRef.current);
      setTelemetrySamples((prev) => [...prev, sample]);
    } else if (mode === 'soft') {
      const sc = softConfig;
      if (sc.activeKind === 'particles' && softRuntimeRef.current.particles) {
        softRuntimeRef.current.particles.step(1 / 60, sc.particles);
        softRuntimeRef.current.particles.syncMesh(sc.colormap);
      } else if (sc.activeKind === 'cloth' && softRuntimeRef.current.cloth) {
        softRuntimeRef.current.cloth.step(1 / 60, sc.cloth, gravity[1]);
        softRuntimeRef.current.cloth.syncMesh(sc.cloth, sc.colormap);
      } else if (sc.activeKind === 'sphFluid' && softRuntimeRef.current.sph) {
        softRuntimeRef.current.sph.step(1 / 60, sc.sphFluid);
        softRuntimeRef.current.sph.syncMesh(sc.colormap);
      } else if (sc.activeKind === 'waveTank' && softRuntimeRef.current.wave) {
        softRuntimeRef.current.wave.step(1 / 60, sc.waveTank);
        softRuntimeRef.current.wave.syncMesh(sc.colormap);
      }
    }
  };

  const handleReset = () => {
    setRunning(false);
    setPlaybackIndex(null);
    if (mode === 'physics' || mode === 'experiments') {
      void syncPhysicsWorldAndViewport(entities, joints, gravity);
    } else if (mode === 'soft') {
      rebuildSoftViewport(softConfig);
    } else if (mode === 'math') {
      rebuildMathViewport(mathConfig);
    } else if (mode === 'mesh') {
      handleSelectSculptPreset(meshConfig.basePreset);
    } else if (mode === 'electronics') {
      handleLoadCircuitPreset(circuit.id);
    }
  };

  const handleScrubFrame = (idx: number | null) => {
    setPlaybackIndex(idx);
    if (idx === null) return;
    setRunning(false);
    const frame = recordedFrames[idx];
    const vp = viewportRef.current;
    if (!frame || !vp) return;
    setSimTime(frame.time);
    for (const [id, tr] of Object.entries(frame.transforms)) {
      vp.updateEntityTransform(id, tr.position, tr.quaternion);
    }
  };

  const handleStepBack = () => {
    if (recordedFrames.length === 0) return;
    const curr = playbackIndex ?? recordedFrames.length - 1;
    const nextIdx = Math.max(0, curr - 1);
    handleScrubFrame(nextIdx);
  };

  const handleGravityChange = (g: Vec3) => {
    setGravity(g);
    rapierRef.current.setGravity(g);
  };

  const handleSaveScene = () => {
    const file: OuterflowSceneFile = {
      format: 'outerflow-scene',
      version: 1,
      savedAt: new Date().toISOString(),
      mode,
      gravity,
      entities,
      joints,
      cadParts,
      mathConfig,
      softConfig,
      experimentScript,
      logoConfig,
      parameters,
      designRuns,
    };
    exportSceneJSON(file, 'outerflow-project.outerflow.json');
  };

  const handleLoadScene = async (file: File) => {
    const text = await file.text();
    const parsed = parseSceneJSON(text);
    pushHistorySnapshot(true);
    setRunning(false);
    setMode(parsed.mode);
    setGravity(parsed.gravity);
    setEntities(parsed.entities);
    setJoints(parsed.joints);
    setCadParts(parsed.cadParts);
    setMathConfig(parsed.mathConfig);
    setSoftConfig(parsed.softConfig);
    setExperimentScript(parsed.experimentScript);
    if (parsed.parameters) setParameters(parsed.parameters);
    if (parsed.designRuns) setDesignRuns(parsed.designRuns);
    if (parsed.logoConfig) setLogoConfig(parsed.logoConfig);
    void syncPhysicsWorldAndViewport(parsed.entities, parsed.joints, parsed.gravity);
    rebuildMathViewport(parsed.mathConfig);
    rebuildSoftViewport(parsed.softConfig);
  };

  const handleToggleVideoRecord = async () => {
    const rec = videoRecorderRef.current;
    if (rec.isRecording) {
      const blob = await rec.stop();
      setVideoRecording(false);
      setVideoElapsedSec(0);
      downloadBlob(blob, `outerflow-${mode}-recording.webm`);
      return;
    }
    const canvas = viewportRef.current?.renderer.domElement;
    if (!canvas) return;
    rec.start(canvas, 60);
    setVideoElapsedSec(0);
    setVideoRecording(true);
  };

  useEffect(() => {
    if (!videoRecording) return;
    const id = window.setInterval(() => {
      setVideoElapsedSec((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [videoRecording]);

  const handlePrintDesignSheet = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.render();
    const imageDataUrl = vp.renderer.domElement.toDataURL('image/png');
    const activeStats = mode === 'math' ? mathStats : meshStats;
    printDesignSheet({
      title: `Outerflow Studio — ${mode.toUpperCase()} Snapshot`,
      subtitle: logoConfig.tagline,
      imageDataUrl,
      metadata: [
        ['Organization', logoConfig.labLabel],
        ['Active Mode', mode],
        ['Vertices / Triangles', `${activeStats.vertices.toLocaleString()} / ${activeStats.triangles.toLocaleString()}`],
        ['Simulation Time', `${simTime.toFixed(2)} s`],
        ['Gravity', `${gravity[1].toFixed(2)} m/s²`],
        ['Rigid Bodies / CAD Parts', `${entities.length} / ${cadParts.length}`],
      ],
      notes: latestTelemetry
        ? `Latest Energy Readout — KE: ${latestTelemetry.kineticEnergy.toFixed(2)} J, PE: ${latestTelemetry.potentialEnergy.toFixed(2)} J, Total: ${latestTelemetry.totalEnergy.toFixed(2)} J.`
        : 'Generated from Outerflow Studio (Harboria Labs).',
    });
  };

  const zenMode = leftCollapsed && rightCollapsed;
  const handleToggleZenMode = () => {
    if (zenMode) {
      setLeftCollapsed(false);
      setRightCollapsed(false);
    } else {
      setLeftCollapsed(true);
      setRightCollapsed(true);
    }
  };

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? null,
    [entities, selectedId]
  );
  const selectedCadPart = useMemo(
    () => cadParts.find((p) => p.id === selectedId) ?? null,
    [cadParts, selectedId]
  );
  const latestTelemetry = telemetrySamples[telemetrySamples.length - 1];

  return (
    <div className="studio-shell">
      <TopBar
        mode={mode}
        onModeChange={handleModeChange}
        stage={stage}
        onStageChange={setStage}
        logoConfig={logoConfig}
        telemetryOpen={telemetryOpen}
        onToggleTelemetry={() => setTelemetryOpen((o) => !o)}
        zenMode={zenMode}
        onToggleZenMode={handleToggleZenMode}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        autosavedAt={autosavedAt}
        videoRecording={videoRecording}
        videoElapsedSec={videoElapsedSec}
        onToggleVideoRecord={() => void handleToggleVideoRecord()}
        onOpenLogoStudio={() => setIntroOverlayMode('studio')}
        onReplayBootIntro={() => setIntroOverlayMode('boot')}
        onResetSim={handleReset}
        onSaveScene={handleSaveScene}
        onLoadScene={handleLoadScene}
        onExportGLB={() => {
          const t = viewportRef.current?.getExportTarget(mode);
          if (t) void exportGLB(t, `outerflow-${mode}.glb`);
        }}
        onExportSTL={() => {
          const t = viewportRef.current?.getExportTarget(mode);
          if (t) exportSTL(t, `outerflow-${mode}.stl`);
        }}
        onExportOBJ={() => {
          const t = viewportRef.current?.getExportTarget(mode);
          if (t) exportOBJ(t, `outerflow-${mode}.obj`);
        }}
        onCapturePNG={() => {
          const canvas = viewportRef.current?.renderer.domElement;
          if (canvas) capturePNG(canvas, `outerflow-${mode}.png`);
        }}
        onCaptureTransparentPNG={() => {
          viewportRef.current?.captureTransparentPNG(`outerflow-${mode}-transparent.png`);
        }}
        onPrintSheet={handlePrintDesignSheet}
      />

      <div className="workspace-body">
        {!leftCollapsed && (
          <LeftPanel
            mode={mode}
            onCollapse={() => setLeftCollapsed(true)}
            stage={stage}
            onStageChange={setStage}
            onResetStage={() => setStage(createDefaultStageSettings())}
            physicsPresets={physicsPresets}
            activePhysicsPresetId={activePhysicsPresetId}
            onLoadPhysicsPreset={handleLoadPhysicsPreset}
            entities={entities}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddPhysicsEntity={handleAddPhysicsEntity}
            onToggleEntityVisible={handleToggleEntityVisible}
            onToggleEntityLocked={handleToggleEntityLocked}
            onDuplicateEntity={handleDuplicateEntity}
            onDeleteEntity={handleDeleteEntity}
            onSyncCadPartToPhysics={handleSyncCadPartToPhysics}
            checkpoints={checkpoints}
            onSaveCheckpoint={handleSaveCheckpoint}
            onRestoreCheckpoint={(cpId) => void handleRestoreCheckpoint(cpId)}
            onDeleteCheckpoint={handleDeleteCheckpoint}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            cadParts={cadParts}
            onAddCadPart={handleAddCadPart}
            onAddLibraryPart={handleAddLibraryPart}
            onToggleCadVisible={handleToggleCadVisible}
            onToggleCadLocked={handleToggleCadLocked}
            onDeleteCadPart={handleDeleteCadPart}
            meshConfig={meshConfig}
            onSelectSculptPreset={handleSelectSculptPreset}
            onSelectSculptBrush={(b: SculptBrushKind) => setMeshConfig((m) => ({ ...m, brush: b }))}
            electronicsSubMode={electronicsSubMode}
            onElectronicsSubModeChange={setElectronicsSubMode}
            workbenchConfig={workbenchConfig}
            onSelectWorkbenchBoard={handleSelectWorkbenchBoard}
            onSelectWorkbenchMission={handleSelectWorkbenchMission}
            onAddWorkbenchModule={handleAddWorkbenchModule}
            circuitPresets={circuitPresets}
            activeCircuitId={circuit.id}
            onLoadCircuitPreset={handleLoadCircuitPreset}
            onAddCircuitComponent={handleAddCircuitComponent}
            mathConfig={mathConfig}
            onMathKindChange={handleMathKindChange}
            onSelectMathPreset={handleSelectMathPreset}
            softConfig={softConfig}
            onSoftKindChange={handleSoftKindChange}
            onSoftParticlePreset={handleSoftParticlePreset}
          />
        )}

        <main className="center-column">
          <div className="viewport-wrap">
            <div ref={viewportHostRef} className="viewport-canvas-host" />

            {leftCollapsed && (
              <button
                type="button"
                className="panel-reopen-btn left"
                style={{ top: 82 }}
                onClick={() => setLeftCollapsed(false)}
                title="Expand Left Studio Panel"
              >
                <ChevronsRight size={14} />
              </button>
            )}

            {rightCollapsed && (
              <button
                type="button"
                className="panel-reopen-btn right"
                onClick={() => setRightCollapsed(false)}
                title="Expand Info Inspector"
              >
                <ChevronsLeft size={14} />
              </button>
            )}

            <ViewportHUD
              mode={mode}
              fps={fps}
              simTime={simTime}
              running={running}
              entitiesCount={entities.length}
              cadCount={cadParts.filter((c) => c.visible).length}
              meshStats={mode === 'math' ? mathStats : meshStats}
              latestTelemetry={latestTelemetry}
              gizmoMode={gizmoMode}
              onGizmoChange={setGizmoMode}
              sculptBrush={meshConfig.brush}
              onSculptBrushChange={(b: SculptBrushKind) =>
                setMeshConfig((m) => ({ ...m, brush: b }))
              }
              onCameraPreset={(p: CameraPreset) => viewportRef.current?.setCameraPreset(p)}
              onFocusSelected={() => viewportRef.current?.focusSelected()}
              onCyclePreset={handleCyclePreset}
              telemetryOpen={telemetryOpen}
              onToggleTelemetry={() => setTelemetryOpen((o) => !o)}
              zenMode={zenMode}
              onToggleZenMode={handleToggleZenMode}
            />

            <ElectronicsSchematicView
              open={schematicOpen && mode === 'electronics' && electronicsSubMode === 'circuit'}
              schematic={circuit}
              solved={circuitSolved}
              selectedCompId={selectedCircuitCompId}
              onSelectComp={setSelectedCircuitCompId}
              onToggleSwitch={handleToggleCircuitSwitch}
              onClose={() => setSchematicOpen(false)}
            />

            <TransportBar
              simTime={simTime}
              running={running}
              onToggleRun={() => {
                setPlaybackIndex(null);
                setRunning((r) => {
                  const next = !r;
                  if (next && stage.explodedView) {
                    setStage((s) => ({ ...s, explodedView: false }));
                  }
                  return next;
                });
              }}
              onStep={handleStep}
              onStepBack={handleStepBack}
              onReset={handleReset}
              timeScale={timeScale}
              onTimeScaleChange={setTimeScale}
              gravity={gravity}
              onGravityChange={handleGravityChange}
              recording={recording}
              onToggleRecord={() => setRecording((r) => !r)}
              recordedFramesCount={recordedFrames.length}
              playbackIndex={playbackIndex}
              onScrubFrame={handleScrubFrame}
              checkpoints={checkpoints}
              onSaveCheckpoint={handleSaveCheckpoint}
              onRestoreCheckpoint={(cpId) => void handleRestoreCheckpoint(cpId)}
            />
          </div>

          <TelemetryDrawer
            open={telemetryOpen}
            onClose={() => setTelemetryOpen(false)}
            samples={telemetrySamples}
            sweepResults={sweepResults}
            designRuns={designRuns}
            onRunDesignVariant={() => void handleRunDesignVariant()}
            onClearDesignRuns={() => setDesignRuns([])}
            onClearTelemetry={() => setTelemetrySamples([])}
            onExportTelemetryCSV={() => exportTelemetryCSV(telemetrySamples)}
            onExportSweepCSV={() => exportSweepCSV(sweepResults)}
          />
        </main>

        {!rightCollapsed && (
          <RightPanel
            mode={mode}
            onCollapse={() => setRightCollapsed(true)}
            running={running}
            gravity={gravity}
            meshStats={meshStats}
            entities={entities}
            joints={joints}
            selectedEntity={selectedEntity}
            onUpdateEntity={handleUpdateEntity}
            onApplyImpulse={(id, imp) => rapierRef.current.applyImpulse(id, imp)}
            onUpdateJointMotor={(id, speed, maxForce) => {
              setJoints((prev) =>
                prev.map((j) =>
                  j.id === id ? { ...j, motorSpeed: speed, motorMaxForce: maxForce } : j
                )
              );
              rapierRef.current.updateJointMotor(id, speed, maxForce);
            }}
            onAddJoint={handleAddJoint}
            onDeleteJoint={handleDeleteJoint}
            parameters={parameters}
            onUpdateParameter={handleUpdateParameter}
            onAddCustomParameter={handleAddCustomParameter}
            snapToGrid={snapToGrid}
            onToggleSnapToGrid={setSnapToGrid}
            onAlignEntity={handleAlignEntity}
            measureTargetId={measureTargetId}
            onMeasureTargetChange={setMeasureTargetId}
            inspectionMetrics={inspectionMetrics}
            designRuns={designRuns}
            onRunDesignVariant={() => void handleRunDesignVariant()}
            onClearDesignRuns={() => setDesignRuns([])}
            cadParts={cadParts}
            selectedCadPart={selectedCadPart}
            onUpdateCadPart={handleUpdateCadPart}
            onSnapCadPart={handleSnapCadPart}
            onRunCsg={handleRunCsg}
            onSendCadToPhysics={handleSendCadToPhysics}
            onBuildFrom2DSketch={handleBuildFrom2DSketch}
            blueprintProjection={blueprintProjection}
            onProjectSelected3DTo2D={handleProjectSelected3DTo2D}
            onDownloadBlueprintSVG={handleDownloadBlueprintSVG}
            designCode={designCode}
            onDesignCodeChange={setDesignCode}
            onRunDesignCode={handleRunDesignCode}
            designCodeError={designCodeError}
            meshConfig={meshConfig}
            onUpdateMeshConfig={handleUpdateMeshConfig}
            onSubdivideMesh={handleSubdivideMesh}
            onUndoMesh={handleUndoMesh}
            onSendMeshToPhysics={handleSendMeshToPhysics}
            onSendMeshToCad={handleSendMeshToCad}
            electronicsSubMode={electronicsSubMode}
            onElectronicsSubModeChange={setElectronicsSubMode}
            workbenchConfig={workbenchConfig}
            onUpdateWorkbenchConfig={setWorkbenchConfig}
            onSelectWorkbenchMission={handleSelectWorkbenchMission}
            onClearWorkbenchWires={handleClearWorkbenchWires}
            onAddWorkbenchWire={handleAddWorkbenchWire}
            onRemoveWorkbenchWire={handleRemoveWorkbenchWire}
            onRemoveWorkbenchModule={handleRemoveWorkbenchModule}
            circuit={circuit}
            circuitSolved={circuitSolved}
            selectedCircuitCompId={selectedCircuitCompId}
            onSelectCircuitComp={setSelectedCircuitCompId}
            onUpdateCircuitComp={handleUpdateCircuitComp}
            onDeleteCircuitComp={handleDeleteCircuitComp}
            schematicOpen={schematicOpen}
            onToggleSchematic={() => setSchematicOpen((o) => !o)}
            mathConfig={mathConfig}
            mathErrors={mathErrors}
            mathStats={mathStats}
            onUpdateMathConfig={handleUpdateMathConfig}
            onSendMathToPhysics={handleSendMathToPhysics}
            softConfig={softConfig}
            onUpdateSoftConfig={handleUpdateSoftConfig}
            onTriggerFluidSlosh={() => softRuntimeRef.current.sph?.sloshImpulse()}
            onTriggerWaveDrop={() =>
              softRuntimeRef.current.wave?.dropRipple(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                0.9
              )
            }
            experimentScript={experimentScript}
            onExperimentScriptChange={setExperimentScript}
            onRunExperimentScript={handleRunExperimentScript}
            scriptLogs={scriptLogs}
            scriptError={scriptError}
            sweepConfig={sweepConfig}
            onSweepConfigChange={setSweepConfig}
            onRunSweep={handleRunSweep}
            sweepProgress={sweepProgress}
          />
        )}
      </div>

      {introOverlayMode && (
        <LogoMotionOverlay
          viewMode={introOverlayMode}
          config={logoConfig}
          onConfigChange={setLogoConfig}
          onSaveDefault={(cfg) => saveLogoConfig(cfg)}
          onFinish={() => setIntroOverlayMode(null)}
          onReplayBoot={() => setIntroOverlayMode('boot')}
        />
      )}
    </div>
  );
};
export default App;
