import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type {
  CadPartConfig,
  CadPrimitiveKind,
  CameraPreset,
  CsgOperation,
  GizmoMode,
  MathConfig,
  MathModeKind,
  OuterflowSceneFile,
  RecordedFrame,
  ShapeKind,
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
import { TopBar } from './components/TopBar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ViewportHUD } from './components/ViewportHUD';
import { TransportBar } from './components/TransportBar';
import { TelemetryDrawer } from './components/TelemetryDrawer';

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

export const App: React.FC = () => {
  const physicsPresets = useMemo(() => getPhysicsPresets(), []);
  const initialPreset = physicsPresets[0];

  const [mode, setMode] = useState<StudioMode>('physics');
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState(1.0);
  const [gravity, setGravity] = useState<Vec3>([0, -9.81, 0]);
  const [fps, setFps] = useState(60);
  const [simTime, setSimTime] = useState(0);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [stage, setStage] = useState<StageSettings>(() => createDefaultStageSettings());
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [meshStats, setMeshStats] = useState({ vertices: 0, triangles: 0 });

  // Physics State
  const [activePhysicsPresetId, setActivePhysicsPresetId] = useState(initialPreset.id);
  const [entities, setEntities] = useState<StudioEntity[]>(() =>
    structuredClone(initialPreset.entities)
  );
  const [joints, setJoints] = useState<StudioJoint[]>(() =>
    structuredClone(initialPreset.joints)
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPreset.entities[1]?.id ?? null
  );

  // CAD State
  const [cadParts, setCadParts] = useState<CadPartConfig[]>(() => createDefaultCadParts());

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

  const scriptStepCallbackRef = useRef<((t: number, api: StepRuntimeApi) => void) | null>(null);
  const customMetricsRef = useRef<Record<string, number>>({});
  const physicsRebuildPendingRef = useRef(false);
  const skipCadRebuildRef = useRef(false);

  const refreshStats = useCallback((activeMode: StudioMode) => {
    const vp = viewportRef.current;
    if (!vp) return;
    setMeshStats(vp.getSceneMeshStats(activeMode));
  }, []);

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
          setEntities((prev) =>
            prev.map((e) => (e.id === id ? { ...e, position: pos, rotation: rot, scale } : e))
          );
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
    });

    viewportRef.current = vp;
    vp.setModeVisibility(modeRef.current);
    vp.setSelectedId(selectedIdRef.current);
    vp.setStageSettings(stage);

    void syncPhysicsWorldAndViewport(entitiesRef.current, jointsRef.current, gravityRef.current);
    vp.syncCadParts(cadParts);
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

      vp.render();
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
      vp.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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
  }, []);

  const handleModeChange = (nextMode: StudioMode) => {
    setMode(nextMode);
    if (nextMode === 'cad') {
      setSelectedId(cadParts[0]?.id ?? null);
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

  // Physics actions
  const handleLoadPhysicsPreset = (presetId: string) => {
    const p = physicsPresets.find((x) => x.id === presetId);
    if (!p) return;
    setRunning(false);
    setActivePhysicsPresetId(p.id);
    scriptStepCallbackRef.current = null;
    customMetricsRef.current = {};
    const clonedEnts = structuredClone(p.entities);
    const clonedJoints = structuredClone(p.joints);
    setEntities(clonedEnts);
    setJoints(clonedJoints);
    setSelectedId(clonedEnts[0]?.id ?? null);
    void syncPhysicsWorldAndViewport(clonedEnts, clonedJoints, gravity);
  };

  const handleAddPhysicsEntity = (shape: ShapeKind) => {
    const idx = entities.length + 1;
    const colors = ['#38bdf8', '#f59e0b', '#34d399', '#a78bfa', '#fb7185'];
    const ent: StudioEntity = {
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
      physics: {
        mass: 1.5,
        friction: 0.5,
        restitution: 0.45,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, 0, 0],
      },
    };
    const next = [...entities, ent];
    setEntities(next);
    setSelectedId(ent.id);
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleUpdateEntity = (id: string, patch: Partial<StudioEntity>) => {
    const next = entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEntities(next);
    if (!running) {
      void syncPhysicsWorldAndViewport(next, joints, gravity);
    }
  };

  const handleToggleEntityVisible = (id: string) => {
    const next = entities.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e));
    setEntities(next);
    void syncPhysicsWorldAndViewport(next, joints, gravity);
  };

  const handleDuplicateEntity = (id: string) => {
    const orig = entities.find((e) => e.id === id);
    if (!orig) return;
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
    const nextEnts = entities.filter((e) => e.id !== id);
    const nextJoints = joints.filter((j) => j.bodyA !== id && j.bodyB !== id);
    setEntities(nextEnts);
    setJoints(nextJoints);
    if (selectedId === id) setSelectedId(nextEnts[0]?.id ?? null);
    void syncPhysicsWorldAndViewport(nextEnts, nextJoints, gravity);
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

  const handleDeleteCadPart = (id: string) => {
    setCadParts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
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
    };
    exportSceneJSON(file, 'outerflow-project.outerflow.json');
  };

  const handleLoadScene = async (file: File) => {
    const text = await file.text();
    const parsed = parseSceneJSON(text);
    setRunning(false);
    setMode(parsed.mode);
    setGravity(parsed.gravity);
    setEntities(parsed.entities);
    setJoints(parsed.joints);
    setCadParts(parsed.cadParts);
    setMathConfig(parsed.mathConfig);
    setSoftConfig(parsed.softConfig);
    setExperimentScript(parsed.experimentScript);
    void syncPhysicsWorldAndViewport(parsed.entities, parsed.joints, parsed.gravity);
    rebuildMathViewport(parsed.mathConfig);
    rebuildSoftViewport(parsed.softConfig);
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
        telemetryOpen={telemetryOpen}
        onToggleTelemetry={() => setTelemetryOpen((o) => !o)}
        zenMode={zenMode}
        onToggleZenMode={handleToggleZenMode}
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
            onDuplicateEntity={handleDuplicateEntity}
            onDeleteEntity={handleDeleteEntity}
            cadParts={cadParts}
            onAddCadPart={handleAddCadPart}
            onToggleCadVisible={handleToggleCadVisible}
            onDeleteCadPart={handleDeleteCadPart}
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
              onCameraPreset={(p: CameraPreset) => viewportRef.current?.setCameraPreset(p)}
              onFocusSelected={() => viewportRef.current?.focusSelected()}
              onCyclePreset={handleCyclePreset}
              telemetryOpen={telemetryOpen}
              onToggleTelemetry={() => setTelemetryOpen((o) => !o)}
              zenMode={zenMode}
              onToggleZenMode={handleToggleZenMode}
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
            />
          </div>

          <TelemetryDrawer
            open={telemetryOpen}
            onClose={() => setTelemetryOpen(false)}
            samples={telemetrySamples}
            sweepResults={sweepResults}
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
            cadParts={cadParts}
            selectedCadPart={selectedCadPart}
            onUpdateCadPart={handleUpdateCadPart}
            onRunCsg={handleRunCsg}
            onSendCadToPhysics={handleSendCadToPhysics}
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
    </div>
  );
};
export default App;
