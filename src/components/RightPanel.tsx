import React, { useState } from 'react';
import {
  ArrowRightCircle,
  ChevronsRight,
  Code2,
  Cpu,
  Download,
  Droplets,
  GitCompare,
  Info,
  Layers,
  Link2,
  Play,
  Plus,
  Ruler,
  Undo2,
  Zap,
} from 'lucide-react';
import type {
  BodyType,
  CadPartConfig,
  CircuitComponent,
  CircuitSchematic,
  CircuitSolveResult,
  ClothPinMode,
  ColormapName,
  CsgOperation,
  DesignExperimentRun,
  EntityInspectionMetrics,
  JointKind,
  MathConfig,
  MeshSculptConfig,
  ProjectParameter,
  SnapMode,
  SoftSimConfig,
  StudioEntity,
  StudioJoint,
  StudioMode,
  SweepConfig,
  SweepTemplateId,
  Vec3,
} from '../types/studio';
import { SCRIPT_TEMPLATES } from '../engines/experiments/scriptRunner';
import { SWEEP_TEMPLATES } from '../engines/experiments/sweepRunner';
import { DESIGN_CODE_TEMPLATES } from '../engines/cad/designCompiler';
import {
  SKETCH_2D_PRESETS,
  type BlueprintProjection,
} from '../engines/cad/sketch2D';
import {
  MATERIAL_DENSITY_PRESETS,
  computeEntityVolumeAndArea,
  type MaterialPresetKey,
} from '../engines/project/parameterAndTemplateEngine';
import { ROBOTICS_HARDWARE_CATALOG } from '../engines/electronics/roboticsHardwareLibrary';
import {
  WORKBENCH_MISSIONS,
  getHardwareSpec,
  type WorkbenchConfig,
  type WorkbenchWire,
} from '../engines/electronics/workbench3D';
import {
  AccordionSection,
  SegmentedControl,
  StudioSlider,
  ToggleSwitch,
} from './StudioControls';

interface RightPanelProps {
  mode: StudioMode;
  onCollapse: () => void;
  running: boolean;
  gravity: Vec3;
  meshStats: { vertices: number; triangles: number };
  // Physics
  entities: StudioEntity[];
  joints: StudioJoint[];
  selectedEntity: StudioEntity | null;
  onUpdateEntity: (id: string, patch: Partial<StudioEntity>) => void;
  onApplyImpulse: (id: string, impulse: Vec3) => void;
  onUpdateJointMotor: (id: string, motorSpeed: number, motorMaxForce: number) => void;
  onAddJoint: (joint: StudioJoint) => void;
  onDeleteJoint: (id: string) => void;
  // Linked Parameters, Manipulation, Measurement & A/B Comparison
  parameters?: ProjectParameter[];
  onUpdateParameter?: (id: string, value: number) => void;
  onAddCustomParameter?: (param: ProjectParameter) => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: (enabled: boolean) => void;
  onAlignEntity?: (entityId: string, targetId: string | null, snapMode: SnapMode) => void;
  measureTargetId?: string | null;
  onMeasureTargetChange?: (id: string | null) => void;
  inspectionMetrics?: EntityInspectionMetrics | null;
  designRuns?: DesignExperimentRun[];
  onRunDesignVariant?: () => void;
  onClearDesignRuns?: () => void;
  // CAD, Parts, 2D<->3D & Code CAD
  cadParts: CadPartConfig[];
  selectedCadPart: CadPartConfig | null;
  onUpdateCadPart: (id: string, patch: Partial<CadPartConfig>) => void;
  onSnapCadPart: (partId: string, targetId: string | null, snapMode: SnapMode) => void;
  onRunCsg: (idA: string, idB: string, op: CsgOperation) => void;
  onSendCadToPhysics: (id: string) => void;
  onBuildFrom2DSketch: (
    points: [number, number][],
    sketchMode: 'extrude' | 'lathe',
    depth: number,
    name: string
  ) => void;
  blueprintProjection: BlueprintProjection | null;
  onProjectSelected3DTo2D: () => void;
  onDownloadBlueprintSVG: () => void;
  designCode: string;
  onDesignCodeChange: (code: string) => void;
  onRunDesignCode: () => void;
  designCodeError: string | null;
  // Mesh Sculpt
  meshConfig: MeshSculptConfig;
  onUpdateMeshConfig: (next: MeshSculptConfig) => void;
  onSubdivideMesh: () => void;
  onUndoMesh: () => void;
  onSendMeshToPhysics: () => void;
  onSendMeshToCad: () => void;
  // Electronics
  electronicsSubMode?: 'workbench' | 'circuit';
  onElectronicsSubModeChange?: (sub: 'workbench' | 'circuit') => void;
  workbenchConfig?: WorkbenchConfig;
  onUpdateWorkbenchConfig?: (next: WorkbenchConfig) => void;
  onSelectWorkbenchMission?: (missionId: string) => void;
  onClearWorkbenchWires?: () => void;
  onAddWorkbenchWire?: (wire: WorkbenchWire) => void;
  onRemoveWorkbenchWire?: (wireId: string) => void;
  onRemoveWorkbenchModule?: (instanceId: string) => void;
  circuit: CircuitSchematic;
  circuitSolved: CircuitSolveResult;
  selectedCircuitCompId: string | null;
  onSelectCircuitComp: (id: string) => void;
  onUpdateCircuitComp: (id: string, patch: Partial<CircuitComponent>) => void;
  onDeleteCircuitComp: (id: string) => void;
  schematicOpen: boolean;
  onToggleSchematic: () => void;
  // Math
  mathConfig: MathConfig;
  mathErrors: string[];
  mathStats: { vertices: number; triangles: number };
  onUpdateMathConfig: (next: MathConfig) => void;
  onSendMathToPhysics: () => void;
  // Soft
  softConfig: SoftSimConfig;
  onUpdateSoftConfig: (next: SoftSimConfig) => void;
  onTriggerFluidSlosh: () => void;
  onTriggerWaveDrop: () => void;
  // Experiments
  experimentScript: string;
  onExperimentScriptChange: (code: string) => void;
  onRunExperimentScript: () => void;
  scriptLogs: string[];
  scriptError: string | null;
  sweepConfig: SweepConfig;
  onSweepConfigChange: (next: SweepConfig) => void;
  onRunSweep: () => void;
  sweepProgress: { running: boolean; completed: number; total: number };
}

const Vec3Editor: React.FC<{
  label: string;
  value: Vec3;
  step?: number;
  onChange: (next: Vec3) => void;
}> = ({ label, value, step = 0.1, onChange }) => {
  const axes = ['X', 'Y', 'Z'] as const;
  return (
    <div className="field-col">
      <span className="field-label">{label}</span>
      <div className="vec3-grid">
        {axes.map((ax, i) => (
          <div className="vec3-cell" key={ax}>
            <span className="vec3-axis">{ax}</span>
            <input
              type="number"
              step={step}
              value={Number(value[i].toFixed(2))}
              onChange={(e) => {
                const next: Vec3 = [...value];
                next[i] = Number(e.target.value) || 0;
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

function pointsToText(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x}, ${y}`).join('\n');
}

function parsePointsText(text: string): [number, number][] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [xs, ys] = line.split(/[,\s]+/);
      return [Number(xs) || 0, Number(ys) || 0] as [number, number];
    });
}

export const RightPanel: React.FC<RightPanelProps> = ({
  mode,
  onCollapse,
  running,
  gravity,
  meshStats,
  entities,
  joints,
  selectedEntity,
  onUpdateEntity,
  onApplyImpulse,
  onUpdateJointMotor,
  onAddJoint,
  onDeleteJoint,
  parameters = [],
  onUpdateParameter,
  onAddCustomParameter,
  snapToGrid = false,
  onToggleSnapToGrid,
  onAlignEntity,
  measureTargetId = null,
  onMeasureTargetChange,
  inspectionMetrics = null,
  designRuns = [],
  onRunDesignVariant,
  onClearDesignRuns,
  cadParts,
  selectedCadPart,
  onUpdateCadPart,
  onSnapCadPart,
  onRunCsg,
  onSendCadToPhysics,
  onBuildFrom2DSketch,
  blueprintProjection,
  onProjectSelected3DTo2D,
  onDownloadBlueprintSVG,
  designCode,
  onDesignCodeChange,
  onRunDesignCode,
  designCodeError,
  meshConfig,
  onUpdateMeshConfig,
  onSubdivideMesh,
  onUndoMesh,
  onSendMeshToPhysics,
  onSendMeshToCad,
  electronicsSubMode = 'workbench',
  onElectronicsSubModeChange,
  workbenchConfig,
  onUpdateWorkbenchConfig,
  onSelectWorkbenchMission,
  onClearWorkbenchWires,
  onAddWorkbenchWire,
  onRemoveWorkbenchWire,
  onRemoveWorkbenchModule,
  circuit,
  circuitSolved,
  selectedCircuitCompId,
  onSelectCircuitComp,
  onUpdateCircuitComp,
  onDeleteCircuitComp,
  schematicOpen,
  onToggleSchematic,
  mathConfig,
  mathErrors,
  mathStats,
  onUpdateMathConfig,
  onSendMathToPhysics,
  softConfig,
  onUpdateSoftConfig,
  onTriggerFluidSlosh,
  onTriggerWaveDrop,
  experimentScript,
  onExperimentScriptChange,
  onRunExperimentScript,
  scriptLogs,
  scriptError,
  sweepConfig,
  onSweepConfigChange,
  onRunSweep,
  sweepProgress,
}) => {
  const [csgA, setCsgA] = useState<string>(cadParts[0]?.id ?? '');
  const [csgB, setCsgB] = useState<string>(cadParts[1]?.id ?? '');
  const [snapTargetId, setSnapTargetId] = useState<string>(cadParts[0]?.id ?? '');
  const [cadSubTab, setCadSubTab] = useState<'assemble' | 'sketch2d' | 'code' | 'csg'>('assemble');

  // 2D <-> 3D Sketch Local Editor State
  const [sketchPresetId, setSketchPresetId] = useState(SKETCH_2D_PRESETS[0].id);
  const [sketchMode, setSketchMode] = useState<'extrude' | 'lathe'>(SKETCH_2D_PRESETS[0].mode);
  const [sketchDepth, setSketchDepth] = useState(SKETCH_2D_PRESETS[0].depth);
  const [sketchText, setSketchText] = useState(() => pointsToText(SKETCH_2D_PRESETS[0].points));

  const [newJointKind, setNewJointKind] = useState<JointKind>('spring');
  const [newJointA, setNewJointA] = useState<string>(entities[0]?.id ?? '');
  const [newJointB, setNewJointB] = useState<string>(entities[1]?.id ?? '');
  const [expTab, setExpTab] = useState<'script' | 'sweep'>('script');
  const [alignTargetId, setAlignTargetId] = useState<string>('');
  const [showAddParam, setShowAddParam] = useState(false);
  const [newParamName, setNewParamName] = useState('Custom Multiplier');
  const [newParamSymbol, setNewParamSymbol] = useState('custom_v');
  const [newParamFormula, setNewParamFormula] = useState('mass * 9.81');
  const [wbBoardPin, setWbBoardPin] = useState('D13');
  const [wbModuleId, setWbModuleId] = useState('');
  const [wbModPin, setWbModPin] = useState('');
  const [wbWireColor, setWbWireColor] = useState('#facc15');

  const resolvedCsgA = cadParts.some((p) => p.id === csgA) ? csgA : cadParts[0]?.id ?? '';
  const resolvedCsgB = cadParts.some((p) => p.id === csgB)
    ? csgB
    : cadParts[1]?.id ?? cadParts[0]?.id ?? '';
  const resolvedSnapTarget = cadParts.some(
    (p) => p.id === snapTargetId && p.id !== selectedCadPart?.id
  )
    ? snapTargetId
    : cadParts.find((p) => p.id !== selectedCadPart?.id)?.id ?? '';

  const resolvedJointA = entities.some((e) => e.id === newJointA)
    ? newJointA
    : entities[0]?.id ?? '';
  const resolvedJointB = entities.some((e) => e.id === newJointB)
    ? newJointB
    : entities[1]?.id ?? entities[0]?.id ?? '';

  const selectedComp =
    circuit.components.find((c) => c.id === selectedCircuitCompId) ??
    circuit.components[0] ??
    null;

  const resolvedAlignTarget = entities.some(
    (e) => e.id === alignTargetId && e.id !== selectedEntity?.id
  )
    ? alignTargetId
    : entities.find((e) => e.id !== selectedEntity?.id)?.id ?? '';

  const selectedVolArea = selectedEntity ? computeEntityVolumeAndArea(selectedEntity) : null;

  return (
    <aside className="side-panel right">
      <div className="panel-header">
        <div className="panel-header-title">
          <Info size={14} color="#a1a1aa" />
          <span>Info</span>
        </div>
        <button
          type="button"
          className="mini-icon-btn"
          onClick={onCollapse}
          title="Collapse Inspector"
        >
          <ChevronsRight size={15} />
        </button>
      </div>

      <div className="panel-scroll">
        {mode === 'physics' && (
          <>
            <AccordionSection title={`Linked Parameters & Equations (${parameters.length})`} defaultOpen>
              {parameters
                .filter((p) => !p.isCalculated)
                .map((p) => (
                  <StudioSlider
                    key={p.id}
                    label={`${p.name} (${p.symbol})`}
                    value={p.value}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    decimals={p.step < 0.1 ? 2 : p.step >= 1 ? 0 : 1}
                    onChange={(val) => onUpdateParameter?.(p.id, val)}
                  />
                ))}

              {parameters.some((p) => p.isCalculated) && (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span className="field-label" style={{ fontWeight: 600 }}>
                    Calculated Equations (Auto-Updated)
                  </span>
                  {parameters
                    .filter((p) => p.isCalculated)
                    .map((p) => (
                      <div key={p.id} className="details-row" style={{ fontSize: 10.5 }}>
                        <span className="details-key" title={p.formula || p.name}>
                          {p.symbol} = {p.formula}
                        </span>
                        <span className="details-val" style={{ color: '#38bdf8' }}>
                          {Math.abs(p.value) < 0.05 ? p.value.toFixed(5) : p.value.toFixed(3)} {p.unit}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {onAddCustomParameter && (
                <>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => setShowAddParam((s) => !s)}
                  >
                    <Plus size={12} />
                    <span>{showAddParam ? 'Hide Equation Builder' : 'Link Custom Equation'}</span>
                  </button>
                  {showAddParam && (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: 7,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                      }}
                    >
                      <div className="field-row">
                        <span className="field-label">Name</span>
                        <input
                          className="input-text"
                          style={{ width: '64%' }}
                          value={newParamName}
                          onChange={(e) => setNewParamName(e.target.value)}
                        />
                      </div>
                      <div className="field-row">
                        <span className="field-label">Symbol</span>
                        <input
                          className="input-text"
                          style={{ width: '64%' }}
                          value={newParamSymbol}
                          onChange={(e) => setNewParamSymbol(e.target.value)}
                        />
                      </div>
                      <div className="field-row">
                        <span className="field-label">Formula</span>
                        <input
                          className="input-text"
                          style={{ width: '64%', fontFamily: 'var(--font-mono)' }}
                          value={newParamFormula}
                          onChange={(e) => setNewParamFormula(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="action-btn primary"
                        onClick={() => {
                          const cleanSym = newParamSymbol.trim() || `p_${Date.now() % 100}`;
                          onAddCustomParameter({
                            id: `custom-${Date.now()}`,
                            name: newParamName.trim() || cleanSym,
                            symbol: cleanSym,
                            unit: 'u',
                            value: 0,
                            min: 0,
                            max: 1000,
                            step: 0.1,
                            isCalculated: true,
                            formula: newParamFormula.trim() || '1',
                          });
                          setShowAddParam(false);
                        }}
                      >
                        Add Calculated Equation
                      </button>
                    </div>
                  )}
                </>
              )}
            </AccordionSection>

            <AccordionSection
              title={`Experiment Comparison (Design A vs. B) (${designRuns.length})`}
              defaultOpen
            >
              <div style={{ display: 'flex', gap: 5 }}>
                <button
                  type="button"
                  className="action-btn primary"
                  style={{ flex: 1 }}
                  onClick={() => onRunDesignVariant?.()}
                >
                  <GitCompare size={12} />
                  <span>+ Run Variant {String.fromCharCode(65 + (designRuns.length % 26))}</span>
                </button>
                {designRuns.length > 0 && onClearDesignRuns && (
                  <button
                    type="button"
                    className="action-btn"
                    onClick={onClearDesignRuns}
                    title="Clear Design Variants"
                  >
                    Clear
                  </button>
                )}
              </div>
              {designRuns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {designRuns.map((run) => (
                    <div
                      key={run.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${run.color}`,
                        borderRadius: 5,
                        padding: '5px 7px',
                        fontSize: 10.5,
                      }}
                    >
                      <div className="details-row">
                        <strong style={{ color: run.color }}>{run.label}</strong>
                        <span className="details-val">
                          Mass {run.summaryMetrics.totalMassKg.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="details-row" style={{ marginTop: 2 }}>
                        <span className="details-key">
                          Peak {run.summaryMetrics.peakSpeed.toFixed(2)} m/s
                        </span>
                        <span className="details-key">
                          KE {run.summaryMetrics.peakKineticEnergy.toFixed(1)} J · Δ{' '}
                          {run.summaryMetrics.maxDisplacement.toFixed(2)} m
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="field-label">
                  Tweak parameters above, then capture Design A vs. Design B side-by-side.
                </span>
              )}
            </AccordionSection>

            <AccordionSection title="Body Inspector" defaultOpen>
              {onToggleSnapToGrid && (
                <ToggleSwitch
                  label="Snap to Grid (0.25m / 15°)"
                  checked={snapToGrid}
                  onChange={onToggleSnapToGrid}
                />
              )}

              {selectedEntity ? (
                <>
                  <div className="field-row">
                    <span className="field-label">Name</span>
                    <input
                      className="input-text"
                      style={{ width: '64%' }}
                      value={selectedEntity.name}
                      onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="field-row">
                    <span className="field-label">Body Type</span>
                    <select
                      className="input-select"
                      style={{ width: '64%' }}
                      value={selectedEntity.bodyType}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          bodyType: e.target.value as BodyType,
                        })
                      }
                    >
                      <option value="dynamic">Dynamic</option>
                      <option value="fixed">Fixed (Static)</option>
                      <option value="kinematic">Kinematic</option>
                    </select>
                  </div>

                  <div className="field-row">
                    <span className="field-label">Parent Group</span>
                    <select
                      className="input-select"
                      style={{ width: '64%' }}
                      value={selectedEntity.parentId ?? ''}
                      onChange={(e) =>
                        onUpdateEntity(selectedEntity.id, {
                          parentId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">None (Root)</option>
                      {entities
                        .filter((e) => e.id !== selectedEntity.id)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {onAlignEntity && (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                      }}
                    >
                      <div className="field-row">
                        <span className="field-label">Align To</span>
                        <select
                          className="input-select"
                          style={{ width: '62%' }}
                          value={resolvedAlignTarget}
                          onChange={(e) => setAlignTargetId(e.target.value)}
                        >
                          {entities
                            .filter((e) => e.id !== selectedEntity.id)
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(
                          [
                            ['onTop', 'Stack Top'],
                            ['centerAlign', 'Center'],
                            ['toRight', 'Beside'],
                            ['ground', 'Ground'],
                          ] as [SnapMode, string][]
                        ).map(([m, lbl]) => (
                          <button
                            key={m}
                            type="button"
                            className="action-btn"
                            style={{ flex: 1, fontSize: 10, padding: '4px 3px' }}
                            onClick={() =>
                              onAlignEntity(
                                selectedEntity.id,
                                m === 'ground' ? null : resolvedAlignTarget || null,
                                m
                              )
                            }
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="field-row">
                    <span className="field-label">Material</span>
                    <select
                      className="input-select"
                      style={{ width: '64%' }}
                      value={selectedEntity.materialPreset ?? 'custom'}
                      onChange={(e) => {
                        const key = e.target.value as MaterialPresetKey | 'custom';
                        if (key === 'custom') {
                          onUpdateEntity(selectedEntity.id, { materialPreset: 'custom' });
                          return;
                        }
                        const mat = MATERIAL_DENSITY_PRESETS[key];
                        const vol = computeEntityVolumeAndArea(selectedEntity).volumeM3;
                        const nextMass = Number(
                          Math.max(0.05, Math.min(5000, vol * mat.density)).toFixed(3)
                        );
                        onUpdateEntity(selectedEntity.id, {
                          materialPreset: key,
                          density: mat.density,
                          color: mat.color,
                          metalness: mat.metalness,
                          roughness: mat.roughness,
                          physics: { ...selectedEntity.physics, mass: nextMass },
                        });
                      }}
                    >
                      <option value="steel">Structural Steel (7800)</option>
                      <option value="aluminum">6061 Aluminum (2700)</option>
                      <option value="carbon">Carbon Fiber (1600)</option>
                      <option value="plastic">ABS Polymer (1050)</option>
                      <option value="wood">Hardwood Oak (700)</option>
                      <option value="custom">Custom Material</option>
                    </select>
                  </div>

                  <div className="field-row">
                    <span className="field-label">Density kg/m³</span>
                    <input
                      type="number"
                      step={50}
                      min={50}
                      className="input-number"
                      style={{ width: '64%' }}
                      value={selectedEntity.density ?? 2700}
                      onChange={(e) => {
                        const density = Math.max(10, Number(e.target.value) || 100);
                        const vol = computeEntityVolumeAndArea(selectedEntity).volumeM3;
                        const nextMass = Number(
                          Math.max(0.05, Math.min(5000, vol * density)).toFixed(3)
                        );
                        onUpdateEntity(selectedEntity.id, {
                          materialPreset: 'custom',
                          density,
                          physics: { ...selectedEntity.physics, mass: nextMass },
                        });
                      }}
                    />
                  </div>

                  {selectedVolArea && (
                    <div className="details-row" style={{ fontSize: 10.5 }}>
                      <span className="details-key">
                        Vol {selectedVolArea.volumeM3.toFixed(5)} m³
                      </span>
                      <span className="details-val" style={{ color: '#34d399' }}>
                        Mass = {selectedEntity.physics.mass.toFixed(2)} kg
                      </span>
                    </div>
                  )}

                  <Vec3Editor
                    label="Size W / H / D (dm)"
                    value={[
                      selectedEntity.size.width,
                      selectedEntity.size.height,
                      selectedEntity.size.depth,
                    ]}
                    onChange={([w, h, d]) => {
                      const nextEnt = {
                        ...selectedEntity,
                        size: {
                          ...selectedEntity.size,
                          width: Math.max(0.05, w),
                          height: Math.max(0.05, h),
                          depth: Math.max(0.05, d),
                          radius: Math.max(0.05, Math.min(w, d) * 0.5),
                        },
                      };
                      const vol = computeEntityVolumeAndArea(nextEnt).volumeM3;
                      const nextMass = selectedEntity.density
                        ? Number(
                            Math.max(0.05, Math.min(5000, vol * selectedEntity.density)).toFixed(3)
                          )
                        : selectedEntity.physics.mass;
                      onUpdateEntity(selectedEntity.id, {
                        size: nextEnt.size,
                        physics: { ...selectedEntity.physics, mass: nextMass },
                      });
                    }}
                  />

                  <Vec3Editor
                    label="Position (m)"
                    value={selectedEntity.position}
                    onChange={(position) => onUpdateEntity(selectedEntity.id, { position })}
                  />
                  <Vec3Editor
                    label="Rotation (rad)"
                    value={selectedEntity.rotation}
                    onChange={(rotation) => onUpdateEntity(selectedEntity.id, { rotation })}
                  />

                  <div className="field-row">
                    <span className="field-label">Color</span>
                    <input
                      type="color"
                      value={selectedEntity.color}
                      onChange={(e) => onUpdateEntity(selectedEntity.id, { color: e.target.value })}
                    />
                  </div>

                  <StudioSlider
                    label="Mass (kg)"
                    value={selectedEntity.physics.mass}
                    min={0.1}
                    max={40}
                    step={0.1}
                    onChange={(mass) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, mass },
                      })
                    }
                  />
                  <StudioSlider
                    label="Bounce"
                    value={selectedEntity.physics.restitution}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(restitution) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, restitution },
                      })
                    }
                  />
                  <StudioSlider
                    label="Friction"
                    value={selectedEntity.physics.friction}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(friction) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, friction },
                      })
                    }
                  />

                  {selectedEntity.bodyType === 'dynamic' && (
                    <div className="field-row" style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        className="action-btn"
                        style={{ flex: 1 }}
                        onClick={() =>
                          onApplyImpulse(selectedEntity.id, [
                            0,
                            8 * selectedEntity.physics.mass,
                            0,
                          ])
                        }
                      >
                        <Zap size={12} />
                        <span>Impulse +Y</span>
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        style={{ flex: 1 }}
                        onClick={() =>
                          onApplyImpulse(selectedEntity.id, [
                            8 * selectedEntity.physics.mass,
                            2,
                            0,
                          ])
                        }
                      >
                        <Zap size={12} />
                        <span>Kick +X</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <span className="field-label">Click any body in the viewport to inspect.</span>
              )}
            </AccordionSection>

            <AccordionSection
              title="3D Measurement & Inspection"
              defaultOpen={Boolean(measureTargetId)}
            >
              {inspectionMetrics ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="details-row" style={{ fontSize: 10.5 }}>
                    <span className="details-key">Volume</span>
                    <span className="details-val">{inspectionMetrics.volumeM3.toFixed(6)} m³</span>
                  </div>
                  <div className="details-row" style={{ fontSize: 10.5 }}>
                    <span className="details-key">Surface Area</span>
                    <span className="details-val">{inspectionMetrics.surfaceAreaM2.toFixed(4)} m²</span>
                  </div>
                  <div className="details-row" style={{ fontSize: 10.5 }}>
                    <span className="details-key">Density / Mass</span>
                    <span className="details-val">
                      {inspectionMetrics.densityKgM3.toFixed(0)} kg/m³ ·{' '}
                      {inspectionMetrics.massKg.toFixed(2)} kg
                    </span>
                  </div>
                  {onMeasureTargetChange && (
                    <div className="field-row" style={{ marginTop: 2 }}>
                      <span className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Ruler size={12} color="#22d3ee" />
                        Measure To
                      </span>
                      <select
                        className="input-select"
                        style={{ width: '58%' }}
                        value={measureTargetId ?? ''}
                        onChange={(e) => onMeasureTargetChange(e.target.value || null)}
                      >
                        <option value="">Off</option>
                        {entities
                          .filter((e) => e.id !== selectedEntity?.id)
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  {inspectionMetrics.centerToCenterDist !== null && (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div className="details-row" style={{ fontSize: 10.5 }}>
                        <span className="details-key">Center Distance</span>
                        <span className="details-val" style={{ color: '#22d3ee' }}>
                          {inspectionMetrics.centerToCenterDist.toFixed(3)} m
                        </span>
                      </div>
                      <div className="details-row" style={{ fontSize: 10.5 }}>
                        <span className="details-key">Surface Clearance</span>
                        <span className="details-val">
                          {inspectionMetrics.surfaceGapDist?.toFixed(3)} m
                        </span>
                      </div>
                      <div className="details-row" style={{ fontSize: 10.5 }}>
                        <span className="details-key">Elevation Angle</span>
                        <span className="details-val">
                          {inspectionMetrics.elevationAngleDeg?.toFixed(1)}°
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="field-label">Select an entity to measure volume &amp; gaps.</span>
              )}
            </AccordionSection>

            <AccordionSection title={`Joints & Motors (${joints.length})`} defaultOpen>
              {joints.map((j) => (
                <div
                  key={j.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 7,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}
                >
                  <div className="field-row">
                    <span style={{ fontWeight: 600 }}>{j.name}</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className="hierarchy-tag">{j.kind}</span>
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() => onDeleteJoint(j.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {(j.kind === 'revolute' || j.kind === 'prismatic') && (
                    <StudioSlider
                      label="Motor"
                      value={j.motorSpeed}
                      min={-12}
                      max={12}
                      step={0.2}
                      decimals={1}
                      onChange={(val) =>
                        onUpdateJointMotor(j.id, val, Math.max(12, j.motorMaxForce || 15))
                      }
                    />
                  )}
                </div>
              ))}

              {entities.length >= 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                  <span className="field-label" style={{ fontWeight: 600 }}>
                    Link Two Bodies
                  </span>
                  <select
                    className="input-select"
                    value={newJointKind}
                    onChange={(e) => setNewJointKind(e.target.value as JointKind)}
                  >
                    <option value="spring">Spring-Damper</option>
                    <option value="revolute">Revolute Hinge</option>
                    <option value="spherical">Ball Socket</option>
                    <option value="fixed">Fixed Weld</option>
                    <option value="prismatic">Linear Slider</option>
                  </select>
                  <div className="field-row">
                    <select
                      className="input-select"
                      value={resolvedJointA}
                      onChange={(e) => setNewJointA(e.target.value)}
                    >
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-select"
                      value={resolvedJointB}
                      onChange={(e) => setNewJointB(e.target.value)}
                    >
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      if (!resolvedJointA || !resolvedJointB || resolvedJointA === resolvedJointB)
                        return;
                      onAddJoint({
                        id: `joint-${Date.now()}`,
                        name: `${newJointKind} link`,
                        kind: newJointKind,
                        bodyA: resolvedJointA,
                        bodyB: resolvedJointB,
                        anchorA: [0, 0, 0],
                        anchorB: [0, 0, 0],
                        axis: [0, 0, 1],
                        motorSpeed: newJointKind === 'revolute' ? 2 : 0,
                        motorMaxForce: 15,
                        stiffness: 35,
                        damping: 0.4,
                        restLength: 2.0,
                      });
                    }}
                  >
                    <Link2 size={12} />
                    <span>Add Joint</span>
                  </button>
                </div>
              )}
            </AccordionSection>
          </>
        )}

        {mode === 'cad' && (
          <>
            <div style={{ padding: '8px 12px 4px 12px' }}>
              <SegmentedControl
                value={cadSubTab}
                columns={2}
                options={[
                  { value: 'assemble', label: 'Assemble & Fix' },
                  { value: 'sketch2d', label: '2D ↔ 3D' },
                  { value: 'code', label: 'Code CAD' },
                  { value: 'csg', label: 'CSG Booleans' },
                ]}
                onChange={setCadSubTab}
              />
            </div>

            {cadSubTab === 'assemble' && (
              <>
                <AccordionSection title="Part Inspector & Fix" defaultOpen>
                  {selectedCadPart ? (
                    <>
                      <div className="field-row">
                        <span className="field-label">Name</span>
                        <input
                          className="input-text"
                          style={{ width: '64%' }}
                          value={selectedCadPart.name}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, { name: e.target.value })
                          }
                        />
                      </div>

                      <ToggleSwitch
                        label="Fix / Lock in Place"
                        checked={Boolean(selectedCadPart.locked)}
                        onChange={(locked) => onUpdateCadPart(selectedCadPart.id, { locked })}
                      />

                      <Vec3Editor
                        label="Position (m)"
                        value={selectedCadPart.position}
                        onChange={(position) => onUpdateCadPart(selectedCadPart.id, { position })}
                      />
                      <Vec3Editor
                        label="Rotation (rad)"
                        value={selectedCadPart.rotation}
                        onChange={(rotation) => onUpdateCadPart(selectedCadPart.id, { rotation })}
                      />

                      {!selectedCadPart.csgMesh && (
                        <>
                          {(selectedCadPart.kind === 'box' ||
                            selectedCadPart.kind === 'bracket') && (
                            <>
                              <StudioSlider
                                label="Width"
                                value={selectedCadPart.width}
                                min={0.3}
                                max={4}
                                step={0.05}
                                onChange={(width) =>
                                  onUpdateCadPart(selectedCadPart.id, { width })
                                }
                              />
                              <StudioSlider
                                label="Thickness"
                                value={selectedCadPart.depth}
                                min={0.15}
                                max={4}
                                step={0.05}
                                onChange={(depth) =>
                                  onUpdateCadPart(selectedCadPart.id, { depth })
                                }
                              />
                            </>
                          )}
                          <StudioSlider
                            label="Height"
                            value={selectedCadPart.height}
                            min={0.15}
                            max={4}
                            step={0.05}
                            onChange={(height) => onUpdateCadPart(selectedCadPart.id, { height })}
                          />
                          {selectedCadPart.kind !== 'box' && (
                            <StudioSlider
                              label="Outer R"
                              value={selectedCadPart.outerRadius}
                              min={0.25}
                              max={3}
                              step={0.05}
                              onChange={(outerRadius) =>
                                onUpdateCadPart(selectedCadPart.id, { outerRadius })
                              }
                            />
                          )}
                          {selectedCadPart.kind === 'gear' && (
                            <StudioSlider
                              label="Teeth"
                              value={selectedCadPart.teeth}
                              min={6}
                              max={36}
                              step={1}
                              decimals={0}
                              onChange={(teeth) => onUpdateCadPart(selectedCadPart.id, { teeth })}
                            />
                          )}
                        </>
                      )}

                      <div className="field-row">
                        <span className="field-label">Color</span>
                        <input
                          type="color"
                          value={selectedCadPart.color}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, { color: e.target.value })
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="action-btn primary"
                        onClick={() => onSendCadToPhysics(selectedCadPart.id)}
                      >
                        <ArrowRightCircle size={13} />
                        <span>Send Part to Physics</span>
                      </button>
                    </>
                  ) : (
                    <span className="field-label">Select a CAD part to inspect or fix.</span>
                  )}
                </AccordionSection>

                {selectedCadPart && (
                  <AccordionSection title="Snap / Mount Part" defaultOpen>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => onSnapCadPart(selectedCadPart.id, null, 'ground')}
                    >
                      Snap Flush to Ground (Y=0)
                    </button>

                    {cadParts.length >= 2 && (
                      <>
                        <div className="field-col">
                          <span className="field-label">Mount Onto Target</span>
                          <select
                            className="input-select"
                            value={resolvedSnapTarget}
                            onChange={(e) => setSnapTargetId(e.target.value)}
                          >
                            {cadParts
                              .filter((p) => p.id !== selectedCadPart.id)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="compact-grid">
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              resolvedSnapTarget &&
                              onSnapCadPart(selectedCadPart.id, resolvedSnapTarget, 'onTop')
                            }
                          >
                            Fix On Top
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              resolvedSnapTarget &&
                              onSnapCadPart(selectedCadPart.id, resolvedSnapTarget, 'inFront')
                            }
                          >
                            Fix In Front
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              resolvedSnapTarget &&
                              onSnapCadPart(selectedCadPart.id, resolvedSnapTarget, 'toRight')
                            }
                          >
                            Fix Right
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              resolvedSnapTarget &&
                              onSnapCadPart(selectedCadPart.id, resolvedSnapTarget, 'centerAlign')
                            }
                          >
                            Center Align
                          </button>
                        </div>
                      </>
                    )}
                  </AccordionSection>
                )}
              </>
            )}

            {cadSubTab === 'sketch2d' && (
              <>
                <AccordionSection title="2D Sketch → 3D Solid" defaultOpen>
                  <div className="field-col">
                    <span className="field-label">2D Profile Preset</span>
                    <select
                      className="input-select"
                      value={sketchPresetId}
                      onChange={(e) => {
                        const pr = SKETCH_2D_PRESETS.find((x) => x.id === e.target.value);
                        if (!pr) return;
                        setSketchPresetId(pr.id);
                        setSketchMode(pr.mode);
                        setSketchDepth(pr.depth);
                        setSketchText(pointsToText(pr.points));
                      }}
                    >
                      {SKETCH_2D_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <SegmentedControl
                    value={sketchMode}
                    columns={2}
                    options={[
                      { value: 'extrude', label: 'Extrude 2D' },
                      { value: 'lathe', label: 'Revolve (Lathe)' },
                    ]}
                    onChange={setSketchMode}
                  />

                  {sketchMode === 'extrude' && (
                    <StudioSlider
                      label="Depth (m)"
                      value={sketchDepth}
                      min={0.1}
                      max={4.0}
                      step={0.05}
                      onChange={setSketchDepth}
                    />
                  )}

                  <div className="field-col">
                    <span className="field-label">2D Coordinates (x, y per line)</span>
                    <textarea
                      className="input-code"
                      style={{ minHeight: 110 }}
                      spellCheck={false}
                      value={sketchText}
                      onChange={(e) => setSketchText(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="action-btn primary"
                    onClick={() => {
                      const pts = parsePointsText(sketchText);
                      const pr = SKETCH_2D_PRESETS.find((x) => x.id === sketchPresetId);
                      onBuildFrom2DSketch(
                        pts,
                        sketchMode,
                        sketchDepth,
                        `${pr?.name ?? '2D Sketch'} 3D`
                      );
                    }}
                  >
                    <Layers size={13} />
                    <span>Generate 3D from 2D Sketch</span>
                  </button>
                </AccordionSection>

                <AccordionSection title="3D Part → 2D Blueprint" defaultOpen>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={onProjectSelected3DTo2D}
                  >
                    Project Selected 3D → 2D Views
                  </button>

                  {blueprintProjection && (
                    <>
                      <div className="blueprint-box">
                        <svg viewBox="0 0 300 130" style={{ width: '100%', display: 'block' }}>
                          <rect width="300" height="130" fill="#071324" rx="5" />
                          {(
                            [
                              ['TOP', blueprintProjection.top, 52],
                              ['FRONT', blueprintProjection.front, 150],
                              ['SIDE', blueprintProjection.side, 248],
                            ] as const
                          ).map(([lbl, segs, cx]) => {
                            const maxD = Math.max(
                              0.4,
                              blueprintProjection.width,
                              blueprintProjection.height,
                              blueprintProjection.depth
                            );
                            const sc = 64 / maxD;
                            return (
                              <g key={lbl}>
                                <g stroke="#38bdf8" strokeWidth="0.9">
                                  {segs.slice(0, 220).map(([x1, y1, x2, y2], idx) => (
                                    <line
                                      key={idx}
                                      x1={cx + x1 * sc}
                                      y1={60 + y1 * sc}
                                      x2={cx + x2 * sc}
                                      y2={60 + y2 * sc}
                                    />
                                  ))}
                                </g>
                                <text
                                  x={cx}
                                  y={118}
                                  textAnchor="middle"
                                  fill="#94a3b8"
                                  fontSize="8.5"
                                  fontFamily="monospace"
                                >
                                  {lbl}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      <div className="details-row" style={{ fontSize: 10.5 }}>
                        <span className="details-key">Dimensions</span>
                        <span className="details-val">
                          {blueprintProjection.width} × {blueprintProjection.height} ×{' '}
                          {blueprintProjection.depth} m
                        </span>
                      </div>
                      <button
                        type="button"
                        className="action-btn primary"
                        onClick={onDownloadBlueprintSVG}
                      >
                        <Download size={12} />
                        <span>Download 2D Blueprint (.svg)</span>
                      </button>
                    </>
                  )}
                </AccordionSection>
              </>
            )}

            {cadSubTab === 'code' && (
              <AccordionSection title="Programmable 3D Design DSL" defaultOpen>
                <div className="field-col">
                  <span className="field-label">Design Template</span>
                  <select
                    className="input-select"
                    onChange={(e) => {
                      const t = DESIGN_CODE_TEMPLATES.find((d) => d.id === e.target.value);
                      if (t) onDesignCodeChange(t.code);
                    }}
                    defaultValue={DESIGN_CODE_TEMPLATES[0].id}
                  >
                    {DESIGN_CODE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="input-code"
                  style={{ minHeight: 195 }}
                  spellCheck={false}
                  value={designCode}
                  onChange={(e) => onDesignCodeChange(e.target.value)}
                />

                <button type="button" className="action-btn primary" onClick={onRunDesignCode}>
                  <Code2 size={13} />
                  <span>Compile &amp; Build 3D</span>
                </button>

                {designCodeError && <div className="error-banner">{designCodeError}</div>}
              </AccordionSection>
            )}

            {cadSubTab === 'csg' && (
              <AccordionSection title="CSG Boolean Operations" defaultOpen>
                <div className="field-col">
                  <span className="field-label">Target A</span>
                  <select
                    className="input-select"
                    value={resolvedCsgA}
                    onChange={(e) => setCsgA(e.target.value)}
                  >
                    {cadParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-col">
                  <span className="field-label">Tool B</span>
                  <select
                    className="input-select"
                    value={resolvedCsgB}
                    onChange={(e) => setCsgB(e.target.value)}
                  >
                    {cadParts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ flex: 1 }}
                    onClick={() =>
                      resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'union')
                    }
                  >
                    Union
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ flex: 1 }}
                    onClick={() =>
                      resolvedCsgA &&
                      resolvedCsgB &&
                      onRunCsg(resolvedCsgA, resolvedCsgB, 'subtract')
                    }
                  >
                    Subtract
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ flex: 1 }}
                    onClick={() =>
                      resolvedCsgA &&
                      resolvedCsgB &&
                      onRunCsg(resolvedCsgA, resolvedCsgB, 'intersect')
                    }
                  >
                    Intersect
                  </button>
                </div>
              </AccordionSection>
            )}
          </>
        )}

        {mode === 'mesh' && (
          <>
            <AccordionSection title="Brush & Sculpt Controls" defaultOpen>
              <StudioSlider
                label="Radius"
                value={meshConfig.radius}
                min={0.12}
                max={1.4}
                step={0.02}
                onChange={(radius) => onUpdateMeshConfig({ ...meshConfig, radius })}
              />
              <StudioSlider
                label="Strength"
                value={meshConfig.strength}
                min={0.05}
                max={1.0}
                step={0.05}
                onChange={(strength) => onUpdateMeshConfig({ ...meshConfig, strength })}
              />
              <ToggleSwitch
                label="X-Mirror Symmetry"
                checked={meshConfig.symmetryX}
                onChange={(symmetryX) => onUpdateMeshConfig({ ...meshConfig, symmetryX })}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={onUndoMesh}
                >
                  <Undo2 size={12} />
                  <span>Undo Stroke</span>
                </button>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={onSubdivideMesh}
                >
                  <Layers size={12} />
                  <span>Subdivide 4×</span>
                </button>
              </div>
            </AccordionSection>

            <AccordionSection title="Procedural Modifiers" defaultOpen>
              <StudioSlider
                label="Twist"
                value={meshConfig.twist}
                min={-2.5}
                max={2.5}
                step={0.05}
                onChange={(twist) => onUpdateMeshConfig({ ...meshConfig, twist })}
              />
              <StudioSlider
                label="Taper"
                value={meshConfig.taper}
                min={-1.2}
                max={1.2}
                step={0.05}
                onChange={(taper) => onUpdateMeshConfig({ ...meshConfig, taper })}
              />
              <StudioSlider
                label="Noise"
                value={meshConfig.noise}
                min={0}
                max={1.5}
                step={0.05}
                onChange={(noise) => onUpdateMeshConfig({ ...meshConfig, noise })}
              />
              <button type="button" className="action-btn primary" onClick={onSendMeshToCad}>
                <ArrowRightCircle size={13} />
                <span>Send Mesh to CAD Assembly</span>
              </button>
              <button type="button" className="action-btn" onClick={onSendMeshToPhysics}>
                <ArrowRightCircle size={13} />
                <span>Drop Mesh into Physics</span>
              </button>
            </AccordionSection>
          </>
        )}

        {mode === 'electronics' && (
          <>
            {onElectronicsSubModeChange && (
              <div style={{ padding: '8px 12px 4px 12px' }}>
                <SegmentedControl
                  value={electronicsSubMode}
                  columns={2}
                  options={[
                    { value: 'workbench', label: '3D Bench & Wiring' },
                    { value: 'circuit', label: 'MNA Circuit Probes' },
                  ]}
                  onChange={onElectronicsSubModeChange}
                />
              </div>
            )}

            {electronicsSubMode === 'workbench' && workbenchConfig ? (
              (() => {
                const activeBoardSpec = getHardwareSpec(workbenchConfig.boardId);
                const resolvedBoardPin = activeBoardSpec.pins.some((p) => p.id === wbBoardPin)
                  ? wbBoardPin
                  : activeBoardSpec.pins[0]?.id ?? '';
                const resolvedMod =
                  workbenchConfig.modules.find((m) => m.instanceId === wbModuleId) ??
                  workbenchConfig.modules[0] ??
                  null;
                const resolvedModSpec = resolvedMod ? getHardwareSpec(resolvedMod.specId) : null;
                const resolvedModPin =
                  resolvedModSpec && resolvedModSpec.pins.some((p) => p.id === wbModPin)
                    ? wbModPin
                    : resolvedModSpec?.pins[0]?.id ?? '';
                const activeMission = WORKBENCH_MISSIONS.find(
                  (m) => m.id === workbenchConfig.missionId
                );

                return (
                  <>
                    <AccordionSection title="3D Workbench & Pin Wiring" defaultOpen>
                      <StudioSlider
                        label="Assemble / Explode"
                        value={workbenchConfig.exploded}
                        min={0}
                        max={1}
                        step={0.05}
                        decimals={2}
                        onChange={(exploded) =>
                          onUpdateWorkbenchConfig?.({ ...workbenchConfig, exploded })
                        }
                      />
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button
                          type="button"
                          className="action-btn primary"
                          style={{ flex: 1 }}
                          onClick={() => onSelectWorkbenchMission?.(workbenchConfig.missionId)}
                        >
                          Wire it for me
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          style={{ flex: 1 }}
                          onClick={() => onClearWorkbenchWires?.()}
                        >
                          Remove Wires
                        </button>
                      </div>

                      {resolvedMod && resolvedModSpec && (
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: 7,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                          }}
                        >
                          <span className="field-label" style={{ fontWeight: 600 }}>
                            Connect 3D Jumper Wire
                          </span>
                          <div className="field-row">
                            <span className="field-label">{activeBoardSpec.name.split(' ')[0]} Pin</span>
                            <select
                              className="input-select"
                              style={{ width: '58%' }}
                              value={resolvedBoardPin}
                              onChange={(e) => setWbBoardPin(e.target.value)}
                            >
                              {activeBoardSpec.pins.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label} ({p.kind})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-row">
                            <span className="field-label">Module</span>
                            <select
                              className="input-select"
                              style={{ width: '58%' }}
                              value={resolvedMod.instanceId}
                              onChange={(e) => setWbModuleId(e.target.value)}
                            >
                              {workbenchConfig.modules.map((m) => (
                                <option key={m.instanceId} value={m.instanceId}>
                                  {getHardwareSpec(m.specId).name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-row">
                            <span className="field-label">Target Pin</span>
                            <select
                              className="input-select"
                              style={{ width: '58%' }}
                              value={resolvedModPin}
                              onChange={(e) => setWbModPin(e.target.value)}
                            >
                              {resolvedModSpec.pins.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field-row">
                            <span className="field-label">Wire Color</span>
                            <div style={{ display: 'flex', gap: 5 }}>
                              {[
                                ['#facc15', 'Signal'],
                                ['#ef4444', 'Power'],
                                ['#18181b', 'GND'],
                                ['#22d3ee', 'Bus'],
                                ['#34d399', 'Data'],
                              ].map(([col, lbl]) => (
                                <button
                                  key={col}
                                  type="button"
                                  title={lbl}
                                  onClick={() => setWbWireColor(col)}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: col,
                                    border:
                                      wbWireColor === col
                                        ? '2px solid #ffffff'
                                        : '1px solid #52525b',
                                    cursor: 'pointer',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              onAddWorkbenchWire?.({
                                id: `wire-${Date.now()}`,
                                fromTarget: 'board',
                                fromPin: resolvedBoardPin,
                                toTarget: resolvedMod.instanceId,
                                toPin: resolvedModPin,
                                color: wbWireColor,
                              })
                            }
                          >
                            + Connect 3D Wire ({resolvedBoardPin} → {resolvedModPin})
                          </button>
                        </div>
                      )}

                      <div className="hierarchy-list" style={{ maxHeight: 110, overflowY: 'auto' }}>
                        {workbenchConfig.modules.map((m) => (
                          <div key={m.instanceId} className="hierarchy-item">
                            <div className="hierarchy-label">
                              <span
                                className="color-dot"
                                style={{ background: getHardwareSpec(m.specId).defaultColor }}
                              />
                              <span className="hierarchy-name">{getHardwareSpec(m.specId).name}</span>
                            </div>
                            <button
                              type="button"
                              className="mini-icon-btn"
                              onClick={() => onRemoveWorkbenchModule?.(m.instanceId)}
                              title="Remove Module"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {workbenchConfig.wires.map((w) => (
                          <div key={w.id} className="hierarchy-item">
                            <div className="hierarchy-label">
                              <span className="color-dot" style={{ background: w.color }} />
                              <span className="hierarchy-name" style={{ fontSize: 10.5 }}>
                                {w.fromPin} → {w.toPin}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="mini-icon-btn"
                              onClick={() => onRemoveWorkbenchWire?.(w.id)}
                              title="Disconnect Wire"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </AccordionSection>

                    <AccordionSection title={`${activeBoardSpec.name} Specs & Callouts`} defaultOpen>
                      <div className="details-table">
                        <div className="details-row">
                          <span className="details-key">MCU</span>
                          <span className="details-val">{activeBoardSpec.specs.mcu}</span>
                        </div>
                        <div className="details-row">
                          <span className="details-key">Clock</span>
                          <span className="details-val">{activeBoardSpec.specs.clock}</span>
                        </div>
                        <div className="details-row">
                          <span className="details-key">Flash / RAM</span>
                          <span className="details-val">
                            {activeBoardSpec.specs.flash} / {activeBoardSpec.specs.ram}
                          </span>
                        </div>
                        <div className="details-row">
                          <span className="details-key">GPIO / Analog</span>
                          <span className="details-val">
                            {activeBoardSpec.specs.gpio} · {activeBoardSpec.specs.analog}
                          </span>
                        </div>
                        <div className="details-row">
                          <span className="details-key">Logic Voltage</span>
                          <span className="details-val">{activeBoardSpec.logicVoltage}</span>
                        </div>
                      </div>

                      {activeBoardSpec.callouts && activeBoardSpec.callouts.length > 0 && (
                        <div className="hierarchy-list" style={{ maxHeight: 145, overflowY: 'auto' }}>
                          {activeBoardSpec.callouts.map((c) => (
                            <div
                              key={c.number}
                              style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 5,
                                padding: '4px 6px',
                                fontSize: 10.5,
                              }}
                            >
                              <strong>
                                #{c.number} {c.title}
                              </strong>
                              <div className="field-label" style={{ fontSize: 10 }}>
                                {c.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionSection>

                    <AccordionSection title="Firmware Sketch & Board Compare" defaultOpen={false}>
                      {activeMission && <pre className="console-box">{activeMission.code}</pre>}
                      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                        <table className="sweep-table">
                          <thead>
                            <tr>
                              <th>Board</th>
                              <th>MCU</th>
                              <th>Clock</th>
                              <th>Logic</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ROBOTICS_HARDWARE_CATALOG.filter((h) => h.group === 'boards').map(
                              (b) => (
                                <tr key={b.id}>
                                  <td>{b.name}</td>
                                  <td>{b.specs.mcu}</td>
                                  <td>{b.specs.clock}</td>
                                  <td>{b.logicVoltage}</td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </AccordionSection>
                  </>
                );
              })()
            ) : (
              <>
                <AccordionSection title="Proteus Schematic & Inspector" defaultOpen>
                  <button
                    type="button"
                    className={`action-btn ${schematicOpen ? 'primary' : ''}`}
                    onClick={onToggleSchematic}
                  >
                    <Cpu size={13} />
                    <span>{schematicOpen ? 'Hide 2D Schematic' : 'Open 2D Schematic Editor'}</span>
                  </button>

                  {circuitSolved.warnings.length > 0 && (
                    <div className="error-banner">{circuitSolved.warnings.join('\n')}</div>
                  )}

                  <div className="hierarchy-list" style={{ maxHeight: 135, overflowY: 'auto' }}>
                    {circuit.components.map((c) => {
                      const ma = (circuitSolved.branchCurrents[c.id] ?? 0) * 1000;
                      return (
                        <div
                          key={c.id}
                          className={`hierarchy-item ${selectedComp?.id === c.id ? 'selected' : ''}`}
                          onClick={() => onSelectCircuitComp(c.id)}
                        >
                          <div className="hierarchy-label">
                            <span className="hierarchy-name">{c.name}</span>
                            <span className="hierarchy-tag">{ma.toFixed(1)}mA</span>
                          </div>
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCircuitComp(c.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {selectedComp && (
                    <>
                      <div className="field-row">
                        <span className="field-label">Name</span>
                        <input
                          className="input-text"
                          style={{ width: '62%' }}
                          value={selectedComp.name}
                          onChange={(e) =>
                            onUpdateCircuitComp(selectedComp.id, { name: e.target.value })
                          }
                        />
                      </div>
                      <div className="field-row">
                        <span className="field-label">Node A / B</span>
                        <div style={{ display: 'flex', gap: 4, width: '62%' }}>
                          <input
                            className="input-text"
                            value={selectedComp.nodeA}
                            onChange={(e) =>
                              onUpdateCircuitComp(selectedComp.id, { nodeA: e.target.value })
                            }
                          />
                          <input
                            className="input-text"
                            value={selectedComp.nodeB}
                            onChange={(e) =>
                              onUpdateCircuitComp(selectedComp.id, { nodeB: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {selectedComp.kind === 'switch' ? (
                        <ToggleSwitch
                          label="Switch Closed"
                          checked={Boolean(selectedComp.closed)}
                          onChange={(closed) => onUpdateCircuitComp(selectedComp.id, { closed })}
                        />
                      ) : (
                        <StudioSlider
                          label={
                            selectedComp.kind === 'battery' || selectedComp.kind === 'mcu'
                              ? 'Voltage (V)'
                              : selectedComp.kind === 'led'
                              ? 'Drop Vf (V)'
                              : selectedComp.kind === 'capacitor'
                              ? 'Cap (µF)'
                              : 'Ohms (Ω)'
                          }
                          value={selectedComp.value}
                          min={
                            selectedComp.kind === 'battery' || selectedComp.kind === 'mcu'
                              ? 0
                              : selectedComp.kind === 'led'
                              ? 1.2
                              : 1
                          }
                          max={
                            selectedComp.kind === 'resistor'
                              ? 5000
                              : selectedComp.kind === 'capacitor'
                              ? 1000
                              : 24
                          }
                          step={selectedComp.kind === 'resistor' ? 10 : 0.1}
                          decimals={selectedComp.kind === 'resistor' ? 0 : 1}
                          onChange={(value) => onUpdateCircuitComp(selectedComp.id, { value })}
                        />
                      )}
                    </>
                  )}
                </AccordionSection>

                <AccordionSection title="Live Node Probes & RC Trace" defaultOpen>
                  <div className="details-table">
                    {Object.entries(circuitSolved.nodeVoltages).map(([node, volts]) => (
                      <div className="details-row" key={node}>
                        <span className="details-key">Node {node}</span>
                        <span className="details-val">{volts.toFixed(3)} V</span>
                      </div>
                    ))}
                    {Object.entries(circuitSolved.motorRpm).map(([mid, rpm]) => (
                      <div className="details-row" key={mid}>
                        <span className="details-key">Motor Speed</span>
                        <span className="details-val">{rpm} RPM</span>
                      </div>
                    ))}
                  </div>
                  {circuitSolved.transientTrace.length > 2 && (
                    <div className="blueprint-box" style={{ marginTop: 4 }}>
                      <svg viewBox="0 0 260 66" style={{ width: '100%', display: 'block' }}>
                        <rect width="260" height="66" fill="#09090d" rx="4" />
                        <polyline
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.8"
                          points={circuitSolved.transientTrace
                            .map((pt, idx) => {
                              const maxV = Math.max(
                                1,
                                ...circuitSolved.transientTrace.map((t) => t.voltage)
                              );
                              const x = 8 + (idx / (circuitSolved.transientTrace.length - 1)) * 244;
                              const y = 58 - (pt.voltage / maxV) * 48;
                              return `${x.toFixed(1)},${y.toFixed(1)}`;
                            })
                            .join(' ')}
                        />
                      </svg>
                    </div>
                  )}
                </AccordionSection>
              </>
            )}
          </>
        )}

        {mode === 'math' && (
          <AccordionSection title="Equations & Parameters" defaultOpen>
            {mathErrors.length > 0 && (
              <div className="error-banner">{mathErrors.join('\n')}</div>
            )}

            {mathConfig.activeKind === 'parametric' && (
              <>
                <div className="field-col">
                  <span className="field-label">x(u, v)</span>
                  <input
                    className="input-text"
                    value={mathConfig.parametric.xExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        parametric: { ...mathConfig.parametric, xExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">y(u, v)</span>
                  <input
                    className="input-text"
                    value={mathConfig.parametric.yExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        parametric: { ...mathConfig.parametric, yExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">z(u, v)</span>
                  <input
                    className="input-text"
                    value={mathConfig.parametric.zExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        parametric: { ...mathConfig.parametric, zExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <StudioSlider
                  label="Scale"
                  value={mathConfig.parametric.scale}
                  min={0.2}
                  max={3.5}
                  step={0.05}
                  onChange={(scale) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      parametric: { ...mathConfig.parametric, scale },
                    })
                  }
                />
              </>
            )}

            {mathConfig.activeKind === 'explicit' && (
              <>
                <div className="field-col">
                  <span className="field-label">z(x, y, t)</span>
                  <input
                    className="input-text"
                    value={mathConfig.explicit.expr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        explicit: { ...mathConfig.explicit, expr: e.target.value },
                      })
                    }
                  />
                </div>
                <ToggleSwitch
                  label="Animate Time (t)"
                  checked={mathConfig.explicit.animate}
                  onChange={(animate) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      explicit: { ...mathConfig.explicit, animate },
                    })
                  }
                />
                <StudioSlider
                  label="Speed"
                  value={mathConfig.explicit.speed}
                  min={0.1}
                  max={3}
                  step={0.1}
                  decimals={1}
                  onChange={(speed) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      explicit: { ...mathConfig.explicit, speed },
                    })
                  }
                />
              </>
            )}

            {mathConfig.activeKind === 'implicit' && (
              <>
                <div className="field-col">
                  <span className="field-label">F(x, y, z) = isoLevel</span>
                  <input
                    className="input-text"
                    value={mathConfig.implicit.expr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        implicit: { ...mathConfig.implicit, expr: e.target.value },
                      })
                    }
                  />
                </div>
                <StudioSlider
                  label="Iso-Level"
                  value={mathConfig.implicit.isoLevel}
                  min={-1.5}
                  max={1.5}
                  step={0.05}
                  onChange={(isoLevel) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      implicit: { ...mathConfig.implicit, isoLevel },
                    })
                  }
                />
                <StudioSlider
                  label="Resolution"
                  value={mathConfig.implicit.resolution}
                  min={14}
                  max={38}
                  step={2}
                  decimals={0}
                  onChange={(resolution) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      implicit: { ...mathConfig.implicit, resolution },
                    })
                  }
                />
              </>
            )}

            {mathConfig.activeKind === 'ode' && (
              <>
                <div className="field-col">
                  <span className="field-label">dx/dt</span>
                  <input
                    className="input-text"
                    value={mathConfig.ode.dxExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        ode: { ...mathConfig.ode, dxExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">dy/dt</span>
                  <input
                    className="input-text"
                    value={mathConfig.ode.dyExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        ode: { ...mathConfig.ode, dyExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">dz/dt</span>
                  <input
                    className="input-text"
                    value={mathConfig.ode.dzExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        ode: { ...mathConfig.ode, dzExpr: e.target.value },
                      })
                    }
                  />
                </div>
                {Object.entries(mathConfig.ode.params).map(([k, val]) => (
                  <StudioSlider
                    key={k}
                    label={`Param ${k}`}
                    value={val}
                    min={0.05}
                    max={Math.max(40, val * 2)}
                    step={0.05}
                    onChange={(v) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        ode: {
                          ...mathConfig.ode,
                          params: { ...mathConfig.ode.params, [k]: v },
                        },
                      })
                    }
                  />
                ))}
                <StudioSlider
                  label="Bundles"
                  value={mathConfig.ode.bundleCount}
                  min={1}
                  max={6}
                  step={1}
                  decimals={0}
                  onChange={(bundleCount) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      ode: { ...mathConfig.ode, bundleCount },
                    })
                  }
                />
              </>
            )}

            {mathConfig.activeKind === 'vectorField' && (
              <>
                <div className="field-col">
                  <span className="field-label">Vx(x, y, z)</span>
                  <input
                    className="input-text"
                    value={mathConfig.vectorField.vxExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        vectorField: { ...mathConfig.vectorField, vxExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">Vy(x, y, z)</span>
                  <input
                    className="input-text"
                    value={mathConfig.vectorField.vyExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        vectorField: { ...mathConfig.vectorField, vyExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="field-col">
                  <span className="field-label">Vz(x, y, z)</span>
                  <input
                    className="input-text"
                    value={mathConfig.vectorField.vzExpr}
                    onChange={(e) =>
                      onUpdateMathConfig({
                        ...mathConfig,
                        vectorField: { ...mathConfig.vectorField, vzExpr: e.target.value },
                      })
                    }
                  />
                </div>
                <ToggleSwitch
                  label="Flow Tracers"
                  checked={mathConfig.vectorField.animateTracers}
                  onChange={(animateTracers) =>
                    onUpdateMathConfig({
                      ...mathConfig,
                      vectorField: { ...mathConfig.vectorField, animateTracers },
                    })
                  }
                />
              </>
            )}

            <div className="field-row">
              <span className="field-label">Colormap</span>
              <select
                className="input-select"
                style={{ width: '58%' }}
                value={mathConfig[mathConfig.activeKind].colormap}
                onChange={(e) => {
                  const cm = e.target.value as ColormapName;
                  const k = mathConfig.activeKind;
                  onUpdateMathConfig({
                    ...mathConfig,
                    [k]: { ...mathConfig[k], colormap: cm },
                  });
                }}
              >
                <option value="harboria">Harboria</option>
                <option value="viridis">Viridis</option>
                <option value="plasma">Plasma</option>
                <option value="coolwarm">Cool-Warm</option>
              </select>
            </div>

            {(mathConfig.activeKind === 'parametric' ||
              mathConfig.activeKind === 'explicit' ||
              mathConfig.activeKind === 'implicit') && (
              <button
                type="button"
                className="action-btn primary"
                onClick={onSendMathToPhysics}
              >
                <ArrowRightCircle size={13} />
                <span>Send Mesh to Physics</span>
              </button>
            )}
          </AccordionSection>
        )}

        {mode === 'soft' && (
          <AccordionSection title="Solver Parameters" defaultOpen>
            <div className="field-row">
              <span className="field-label">Colormap</span>
              <select
                className="input-select"
                style={{ width: '58%' }}
                value={softConfig.colormap}
                onChange={(e) =>
                  onUpdateSoftConfig({ ...softConfig, colormap: e.target.value as ColormapName })
                }
              >
                <option value="harboria">Harboria</option>
                <option value="viridis">Viridis</option>
                <option value="plasma">Plasma</option>
                <option value="coolwarm">Cool-Warm</option>
              </select>
            </div>

            {softConfig.activeKind === 'particles' && (
              <>
                <StudioSlider
                  label="Particles"
                  value={softConfig.particles.count}
                  min={200}
                  max={3000}
                  step={100}
                  decimals={0}
                  onChange={(count) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      particles: { ...softConfig.particles, count },
                    })
                  }
                />
                <StudioSlider
                  label="Mass / B"
                  value={softConfig.particles.centralMass}
                  min={2}
                  max={60}
                  step={1}
                  decimals={0}
                  onChange={(centralMass) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      particles: {
                        ...softConfig.particles,
                        centralMass,
                        fieldStrength: centralMass * 0.1,
                      },
                    })
                  }
                />
              </>
            )}

            {softConfig.activeKind === 'cloth' && (
              <>
                <div className="field-row">
                  <span className="field-label">Pins</span>
                  <select
                    className="input-select"
                    style={{ width: '58%' }}
                    value={softConfig.cloth.pinMode}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        cloth: { ...softConfig.cloth, pinMode: e.target.value as ClothPinMode },
                      })
                    }
                  >
                    <option value="topCorners">Top Corners</option>
                    <option value="topEdge">Top Edge</option>
                    <option value="fourCorners">Four Corners</option>
                  </select>
                </div>
                <StudioSlider
                  label="Wind"
                  value={softConfig.cloth.windStrength}
                  min={0}
                  max={14}
                  step={0.5}
                  decimals={1}
                  onChange={(windStrength) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      cloth: { ...softConfig.cloth, windStrength },
                    })
                  }
                />
                <StudioSlider
                  label="Stiffness"
                  value={softConfig.cloth.stiffness}
                  min={0.2}
                  max={1}
                  step={0.02}
                  onChange={(stiffness) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      cloth: { ...softConfig.cloth, stiffness },
                    })
                  }
                />
                <ToggleSwitch
                  label="Obstacle Sphere"
                  checked={softConfig.cloth.obstacleEnabled}
                  onChange={(obstacleEnabled) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      cloth: { ...softConfig.cloth, obstacleEnabled },
                    })
                  }
                />
              </>
            )}

            {softConfig.activeKind === 'sphFluid' && (
              <>
                <StudioSlider
                  label="Viscosity"
                  value={softConfig.sphFluid.viscosity}
                  min={0.05}
                  max={1.2}
                  step={0.05}
                  onChange={(viscosity) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      sphFluid: { ...softConfig.sphFluid, viscosity },
                    })
                  }
                />
                <StudioSlider
                  label="Stiffness"
                  value={softConfig.sphFluid.stiffness}
                  min={6}
                  max={50}
                  step={1}
                  decimals={0}
                  onChange={(stiffness) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      sphFluid: { ...softConfig.sphFluid, stiffness },
                    })
                  }
                />
                <button type="button" className="action-btn primary" onClick={onTriggerFluidSlosh}>
                  <Droplets size={13} />
                  <span>Slosh Tank Impulse</span>
                </button>
              </>
            )}

            {softConfig.activeKind === 'waveTank' && (
              <>
                <StudioSlider
                  label="Wave Speed"
                  value={softConfig.waveTank.waveSpeed}
                  min={2}
                  max={10}
                  step={0.5}
                  decimals={1}
                  onChange={(waveSpeed) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      waveTank: { ...softConfig.waveTank, waveSpeed },
                    })
                  }
                />
                <ToggleSwitch
                  label="Auto Rain"
                  checked={softConfig.waveTank.rainEnabled}
                  onChange={(rainEnabled) =>
                    onUpdateSoftConfig({
                      ...softConfig,
                      waveTank: { ...softConfig.waveTank, rainEnabled },
                    })
                  }
                />
                <button type="button" className="action-btn primary" onClick={onTriggerWaveDrop}>
                  <Droplets size={13} />
                  <span>Drop Pulse Ripple</span>
                </button>
              </>
            )}
          </AccordionSection>
        )}

        {mode === 'experiments' && (
          <AccordionSection title="Experiment Workbench" defaultOpen>
            <SegmentedControl
              value={expTab}
              columns={2}
              options={[
                { value: 'script', label: 'Script Lab' },
                { value: 'sweep', label: 'Parameter Sweep' },
              ]}
              onChange={setExpTab}
            />

            {expTab === 'script' ? (
              <>
                <div className="field-col">
                  <span className="field-label">Template</span>
                  <select
                    className="input-select"
                    onChange={(e) => {
                      const t = SCRIPT_TEMPLATES.find((s) => s.id === e.target.value);
                      if (t) onExperimentScriptChange(t.code);
                    }}
                    defaultValue={SCRIPT_TEMPLATES[0].id}
                  >
                    {SCRIPT_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="input-code"
                  spellCheck={false}
                  value={experimentScript}
                  onChange={(e) => onExperimentScriptChange(e.target.value)}
                />

                <button type="button" className="action-btn primary" onClick={onRunExperimentScript}>
                  <Play size={13} />
                  <span>Execute &amp; Simulate Script</span>
                </button>

                {scriptError && <div className="error-banner">{scriptError}</div>}
                {scriptLogs.length > 0 && (
                  <div className="console-box">{scriptLogs.join('\n')}</div>
                )}
              </>
            ) : (
              <>
                <div className="field-col">
                  <span className="field-label">Sweep Template</span>
                  <select
                    className="input-select"
                    value={sweepConfig.templateId}
                    onChange={(e) => {
                      const id = e.target.value as SweepTemplateId;
                      const meta = SWEEP_TEMPLATES.find((t) => t.id === id)!;
                      onSweepConfigChange({
                        templateId: id,
                        paramMin: meta.defaultMin,
                        paramMax: meta.defaultMax,
                        steps: meta.defaultSteps,
                        durationSec: meta.defaultDuration,
                      });
                    }}
                  >
                    {SWEEP_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-row">
                  <div className="field-col" style={{ flex: 1 }}>
                    <span className="field-label">Min</span>
                    <input
                      type="number"
                      className="input-num"
                      value={sweepConfig.paramMin}
                      onChange={(e) =>
                        onSweepConfigChange({
                          ...sweepConfig,
                          paramMin: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="field-col" style={{ flex: 1 }}>
                    <span className="field-label">Max</span>
                    <input
                      type="number"
                      className="input-num"
                      value={sweepConfig.paramMax}
                      onChange={(e) =>
                        onSweepConfigChange({
                          ...sweepConfig,
                          paramMax: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-col" style={{ flex: 1 }}>
                    <span className="field-label">Trials</span>
                    <input
                      type="number"
                      min={2}
                      max={25}
                      className="input-num"
                      value={sweepConfig.steps}
                      onChange={(e) =>
                        onSweepConfigChange({
                          ...sweepConfig,
                          steps: Math.max(2, Math.min(25, Number(e.target.value))),
                        })
                      }
                    />
                  </div>
                  <div className="field-col" style={{ flex: 1 }}>
                    <span className="field-label">Duration (s)</span>
                    <input
                      type="number"
                      min={0.5}
                      max={8}
                      step={0.5}
                      className="input-num"
                      value={sweepConfig.durationSec}
                      onChange={(e) =>
                        onSweepConfigChange({
                          ...sweepConfig,
                          durationSec: Math.max(0.5, Number(e.target.value)),
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="action-btn primary"
                  disabled={sweepProgress.running}
                  onClick={onRunSweep}
                >
                  <Play size={13} />
                  <span>
                    {sweepProgress.running
                      ? `Sweeping (${sweepProgress.completed}/${sweepProgress.total})...`
                      : 'Run Parameter Sweep'}
                  </span>
                </button>
              </>
            )}
          </AccordionSection>
        )}

        {/* Details Table */}
        <AccordionSection title="Details" defaultOpen>
          <div className="details-table">
            <div className="details-row">
              <span className="details-key">Studio</span>
              <span className="details-val">Harboria Labs</span>
            </div>
            <div className="details-row">
              <span className="details-key">Mode</span>
              <span className="details-val" style={{ textTransform: 'capitalize' }}>
                {mode}
              </span>
            </div>
            <div className="details-row">
              <span className="details-key">Vertices</span>
              <span className="details-val">
                {(mode === 'math' ? mathStats.vertices : meshStats.vertices).toLocaleString()}
              </span>
            </div>
            <div className="details-row">
              <span className="details-key">Triangles</span>
              <span className="details-val">
                {(mode === 'math' ? mathStats.triangles : meshStats.triangles).toLocaleString()}
              </span>
            </div>
            <div className="details-row">
              <span className="details-key">Gravity</span>
              <span className="details-val">{gravity[1].toFixed(2)} m/s²</span>
            </div>
            <div className="details-row">
              <span className="details-key">Solver</span>
              <span className="details-val">{running ? 'Active' : 'Idle'}</span>
            </div>
          </div>
        </AccordionSection>
      </div>
    </aside>
  );
};
