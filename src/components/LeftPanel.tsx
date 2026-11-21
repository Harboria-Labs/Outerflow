import React, { useState } from 'react';
import {
  Bookmark,
  Box,
  ChevronsLeft,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Pin,
  PinOff,
  Play,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
  Unlock,
} from 'lucide-react';
import type {
  CadPartConfig,
  CadPrimitiveKind,
  CircuitComponentKind,
  CircuitSchematic,
  MathConfig,
  MathModeKind,
  MeshSculptConfig,
  PartCategory,
  SculptBasePreset,
  SculptBrushKind,
  ShadingMode,
  ShapeKind,
  SimulationCheckpoint,
  SoftSimConfig,
  SoftSimKind,
  StageSettings,
  StudioEntity,
  StudioMode,
} from '../types/studio';
import type { PhysicsPreset } from '../engines/physics/presets';
import { PART_LIBRARY, type LibraryPartMeta } from '../engines/cad/partsLibrary';
import { ROBOTICS_HARDWARE_CATALOG } from '../engines/electronics/roboticsHardwareLibrary';
import {
  WORKBENCH_MISSIONS,
  type WorkbenchConfig,
} from '../engines/electronics/workbench3D';
import { PARAMETRIC_PRESETS } from '../engines/math/parametricSurface';
import { EXPLICIT_PRESETS } from '../engines/math/explicitSurface';
import { IMPLICIT_PRESETS } from '../engines/math/marchingTetrahedra';
import { ODE_PRESETS } from '../engines/math/odeSolver';
import { VECTOR_FIELD_PRESETS } from '../engines/math/vectorField';
import {
  AccordionSection,
  SegmentedControl,
  StudioSlider,
  ToggleSwitch,
} from './StudioControls';

interface LeftPanelProps {
  mode: StudioMode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onExpand?: () => void;
  onCollapse: () => void;
  onSpawnHardwareInPhysics?: (meta: LibraryPartMeta) => void;
  stage: StageSettings;
  onStageChange: (next: StageSettings) => void;
  onResetStage: () => void;
  // Physics
  physicsPresets: PhysicsPreset[];
  activePhysicsPresetId: string;
  onLoadPhysicsPreset: (id: string) => void;
  entities: StudioEntity[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddPhysicsEntity: (shape: ShapeKind) => void;
  onToggleEntityVisible: (id: string) => void;
  onToggleEntityLocked?: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  // Unified Project & Checkpoints
  onSyncCadPartToPhysics?: (cadPartId: string) => void;
  checkpoints?: SimulationCheckpoint[];
  onSaveCheckpoint?: () => void;
  onRestoreCheckpoint?: (id: string) => void;
  onDeleteCheckpoint?: (id: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // CAD & Library
  cadParts: CadPartConfig[];
  onAddCadPart: (kind: CadPrimitiveKind) => void;
  onAddLibraryPart: (meta: LibraryPartMeta) => void;
  onToggleCadVisible: (id: string) => void;
  onToggleCadLocked: (id: string) => void;
  onDeleteCadPart: (id: string) => void;
  // Mesh Sculpt
  meshConfig: MeshSculptConfig;
  onSelectSculptPreset: (preset: SculptBasePreset) => void;
  onSelectSculptBrush: (brush: SculptBrushKind) => void;
  // Electronics
  electronicsSubMode?: 'workbench' | 'circuit';
  onElectronicsSubModeChange?: (sub: 'workbench' | 'circuit') => void;
  workbenchConfig?: WorkbenchConfig;
  onSelectWorkbenchBoard?: (boardId: string) => void;
  onSelectWorkbenchMission?: (missionId: string) => void;
  onAddWorkbenchModule?: (specId: string) => void;
  circuitPresets: CircuitSchematic[];
  activeCircuitId: string;
  onLoadCircuitPreset: (id: string) => void;
  onAddCircuitComponent: (kind: CircuitComponentKind) => void;
  // Math
  mathConfig: MathConfig;
  onMathKindChange: (kind: MathModeKind) => void;
  onSelectMathPreset: (kind: MathModeKind, presetId: string) => void;
  // Soft
  softConfig: SoftSimConfig;
  onSoftKindChange: (kind: SoftSimKind) => void;
  onSoftParticlePreset: (preset: SoftSimConfig['particles']['preset']) => void;
}

const PHYSICS_SHAPES: { shape: ShapeKind; label: string }[] = [
  { shape: 'box', label: '+ Box' },
  { shape: 'sphere', label: '+ Sphere' },
  { shape: 'cylinder', label: '+ Cylinder' },
  { shape: 'capsule', label: '+ Capsule' },
  { shape: 'cone', label: '+ Cone' },
];

const CAD_KINDS: { kind: CadPrimitiveKind; label: string }[] = [
  { kind: 'box', label: '+ Block' },
  { kind: 'cylinder', label: '+ Cylinder' },
  { kind: 'pipe', label: '+ Pipe' },
  { kind: 'gear', label: '+ Gear' },
  { kind: 'bracket', label: '+ Bracket' },
  { kind: 'lathe', label: '+ Nozzle' },
  { kind: 'polygon', label: '+ Hex' },
];

const PART_CATEGORIES: { id: PartCategory; label: string }[] = [
  { id: 'robotics', label: 'Robotics' },
  { id: 'electronics', label: 'Elec' },
  { id: 'mechanical', label: 'Mech' },
  { id: 'human', label: 'Human' },
  { id: 'shapes', label: 'Shapes' },
];

const SCULPT_BASE_PRESETS: { id: SculptBasePreset; label: string; sub: string }[] = [
  { id: 'humanHead', label: 'Human Head Bust', sub: 'Anatomical clay base' },
  { id: 'sphere', label: 'Clay Sphere', sub: 'Watertight subdivided orb' },
  { id: 'organicPod', label: 'Organic Bio-Pod', sub: 'Biomorphic organism base' },
  { id: 'cube', label: 'Subdivided Cube', sub: 'Hard-surface sculpting block' },
  { id: 'torus', label: 'Sculpt Torus', sub: 'Continuous ring mesh' },
  { id: 'terrain', label: 'Terrain Mesh', sub: '42×42 landscape surface' },
];

const SCULPT_BRUSHES: { id: SculptBrushKind; label: string; sub: string }[] = [
  { id: 'pull', label: 'Pull / Grab', sub: 'Draw surface outward along normal' },
  { id: 'inflate', label: 'Inflate / Blob', sub: 'Expand along vertex normals' },
  { id: 'carve', label: 'Carve / Crease', sub: 'Push inward to sculpt grooves' },
  { id: 'smooth', label: 'Smooth', sub: 'Relax mesh surface smoothly' },
  { id: 'flatten', label: 'Flatten', sub: 'Level region to tangent plane' },
];

const CIRCUIT_PALETTE: { kind: CircuitComponentKind; label: string }[] = [
  { kind: 'battery', label: '+ Battery' },
  { kind: 'resistor', label: '+ Resistor' },
  { kind: 'led', label: '+ LED' },
  { kind: 'capacitor', label: '+ Cap' },
  { kind: 'switch', label: '+ Switch' },
  { kind: 'motor', label: '+ Motor' },
  { kind: 'mcu', label: '+ MCU' },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  mode,
  collapsed = false,
  onToggleCollapse,
  onExpand,
  onCollapse,
  onSpawnHardwareInPhysics,
  stage,
  onStageChange,
  onResetStage,
  entities,
  selectedId,
  onSelect,
  onAddPhysicsEntity,
  onToggleEntityVisible,
  onToggleEntityLocked,
  onDuplicateEntity,
  onDeleteEntity,
  onSyncCadPartToPhysics,
  checkpoints = [],
  onSaveCheckpoint,
  onRestoreCheckpoint,
  onDeleteCheckpoint,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  cadParts,
  onAddCadPart,
  onAddLibraryPart,
  onToggleCadVisible,
  onToggleCadLocked,
  onDeleteCadPart,
  meshConfig,
  onSelectSculptPreset,
  onSelectSculptBrush,
  electronicsSubMode = 'workbench',
  onElectronicsSubModeChange,
  workbenchConfig,
  onSelectWorkbenchBoard,
  onSelectWorkbenchMission,
  onAddWorkbenchModule,
  circuitPresets,
  activeCircuitId,
  onLoadCircuitPreset,
  onAddCircuitComponent,
  mathConfig,
  onMathKindChange,
  onSelectMathPreset,
  softConfig,
  onSoftKindChange,
  onSoftParticlePreset,
}) => {
  const [partCat, setPartCat] = useState<PartCategory>('robotics');
  const [partQuery, setPartQuery] = useState('');
  const [partKindFilter, setPartKindFilter] = useState<'all' | 'object' | 'component'>('all');
  const [leftTab, setLeftTab] = useState<'elements' | 'tree'>('elements');
  const [pinned, setPinned] = useState(false);

  const isComponentCategory = (cat: PartCategory) =>
    cat === 'robotics' || cat === 'electronics';

  const filteredLibrary = PART_LIBRARY.filter((p) => {
    if (partKindFilter === 'component' && !isComponentCategory(p.category)) return false;
    if (partKindFilter === 'object' && isComponentCategory(p.category)) return false;

    if (partQuery.trim()) {
      const q = partQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (partKindFilter !== 'all') return true;
    return p.category === partCat;
  });

  if (collapsed) {
    return (
      <aside
        className="side-panel collapsed-rail"
        aria-label="Collapsed Elements & Library Dock"
        onMouseEnter={() => onExpand?.()}
      >
        <button
          type="button"
          className="rail-expand-btn"
          onClick={() => (onToggleCollapse ? onToggleCollapse() : onExpand?.())}
          title="Hover or click to expand Elements & Scene Tree"
        >
          <Box size={14} color="#38bdf8" />
        </button>
        <button
          type="button"
          className={`rail-icon-btn ${leftTab === 'elements' ? 'active' : ''}`}
          onMouseEnter={() => {
            setLeftTab('elements');
            onExpand?.();
          }}
          title="Elements, 3D Objects & Components Library"
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>+</span>
        </button>
        <button
          type="button"
          className={`rail-icon-btn ${leftTab === 'tree' ? 'active' : ''}`}
          onMouseEnter={() => {
            setLeftTab('tree');
            onExpand?.();
          }}
          title="Project Scene Tree & Stage Settings"
        >
          <Eye size={13} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="side-panel"
      onMouseLeave={() => {
        if (!pinned) onCollapse();
      }}
    >
      <div className="panel-header">
        <div className="panel-header-title">
          <Box size={14} color="#38bdf8" />
          <span>Elements &amp; Tree</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <button
            type="button"
            className={`mini-icon-btn ${pinned ? 'active' : ''}`}
            onClick={() => setPinned((p) => !p)}
            title={pinned ? 'Unpin Sidebar (Auto-collapse on hover out)' : 'Pin Sidebar Open'}
          >
            {pinned ? <Pin size={13} color="#38bdf8" /> : <PinOff size={13} />}
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={() => {
              setPinned(false);
              onCollapse();
            }}
            title="Collapse Left Sidebar"
          >
            <ChevronsLeft size={15} />
          </button>
        </div>
      </div>

      {/* Clean 2-Tab Separation: Elements & Objects/Components | Scene Tree (Templates live in ⋯ menu) */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
        <SegmentedControl
          value={leftTab}
          columns={2}
          options={[
            { value: 'elements', label: 'Elements & Library' },
            { value: 'tree', label: 'Scene Tree' },
          ]}
          onChange={setLeftTab}
        />
      </div>

      <div className="panel-scroll">
        {leftTab === 'elements' && (mode === 'physics' || mode === 'experiments') && (
          <>
            <AccordionSection title="Spawn Physics Primitives" defaultOpen>
              <div className="compact-grid">
                {PHYSICS_SHAPES.map((s) => (
                  <button
                    key={s.shape}
                    type="button"
                    className="compact-btn"
                    onClick={() => onAddPhysicsEntity(s.shape)}
                    title={`Import ${s.label} rigid body into active scene`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="3D Objects & Components (46)" defaultOpen>
              <input
                className="input-text"
                placeholder="Search Arduino, ESP32, gears, limbs..."
                value={partQuery}
                onChange={(e) => setPartQuery(e.target.value)}
              />

              {/* Object vs Component Filter */}
              <div className="cat-pill-row">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'object', label: 'Objects' },
                    { id: 'component', label: 'Components' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`cat-pill ${partKindFilter === f.id ? 'active' : ''}`}
                    onClick={() => setPartKindFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {!partQuery.trim() && partKindFilter === 'all' && (
                <div className="cat-pill-row">
                  {PART_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat-pill ${partCat === c.id ? 'active' : ''}`}
                      onClick={() => setPartCat(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="hierarchy-list" style={{ maxHeight: 230, overflowY: 'auto' }}>
                {filteredLibrary.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="compact-btn"
                    onClick={() =>
                      onSpawnHardwareInPhysics
                        ? onSpawnHardwareInPhysics(item)
                        : onAddLibraryPart(item)
                    }
                    title={`Import ${item.name} directly into scene — ${item.description}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span className="color-dot" style={{ background: item.defaultColor }} />
                      <span>+ {item.name}</span>
                      <span className="hierarchy-tag" style={{ marginLeft: 'auto' }}>
                        {isComponentCategory(item.category) ? 'comp' : 'obj'}
                      </span>
                    </div>
                    <span className="compact-btn-sub">{item.description}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>
          </>
        )}

        {mode === 'cad' && (
          <>
            <AccordionSection title="3D Parts Library" defaultOpen>
              <input
                className="input-text"
                placeholder="Search robotics, human, electronics..."
                value={partQuery}
                onChange={(e) => setPartQuery(e.target.value)}
              />
              {!partQuery.trim() && (
                <div className="cat-pill-row">
                  {PART_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cat-pill ${partCat === c.id ? 'active' : ''}`}
                      onClick={() => setPartCat(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="hierarchy-list" style={{ maxHeight: 195, overflowY: 'auto' }}>
                {filteredLibrary.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="compact-btn"
                    onClick={() => onAddLibraryPart(item)}
                    title={item.description}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span className="color-dot" style={{ background: item.defaultColor }} />
                      <span>+ {item.name}</span>
                    </div>
                    <span className="compact-btn-sub">{item.description}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="Quick Parametric Shapes" defaultOpen={false}>
              <div className="compact-grid">
                {CAD_KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    className="compact-btn"
                    onClick={() => onAddCadPart(k.kind)}
                  >
                    <span>{k.label}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>
          </>
        )}

        {mode === 'mesh' && (
          <>
            <AccordionSection title="Base Mesh Presets" defaultOpen>
              <div className="compact-grid">
                {SCULPT_BASE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${meshConfig.basePreset === p.id ? 'active' : ''}`}
                    onClick={() => onSelectSculptPreset(p.id)}
                    title={p.sub}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>

            <AccordionSection title="Sculpt Brushes" defaultOpen>
              <div className="hierarchy-list">
                {SCULPT_BRUSHES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`compact-btn ${meshConfig.brush === b.id ? 'active' : ''}`}
                    onClick={() => onSelectSculptBrush(b.id)}
                  >
                    <span>{b.label}</span>
                    <span className="compact-btn-sub">{b.sub}</span>
                  </button>
                ))}
              </div>
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
                    { value: 'workbench', label: '3D Workbench' },
                    { value: 'circuit', label: 'Circuit Solver' },
                  ]}
                  onChange={onElectronicsSubModeChange}
                />
              </div>
            )}

            {electronicsSubMode === 'workbench' && workbenchConfig ? (
              <>
                <AccordionSection title="Guided Build Missions" defaultOpen>
                  <div className="hierarchy-list">
                    {WORKBENCH_MISSIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`compact-btn ${
                          workbenchConfig.missionId === m.id ? 'active' : ''
                        }`}
                        onClick={() => onSelectWorkbenchMission?.(m.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>{m.name}</span>
                          <span className="hierarchy-tag">{m.level}</span>
                        </div>
                        <span className="compact-btn-sub">{m.summary}</span>
                      </button>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="3D Boards (8)" defaultOpen>
                  <div className="hierarchy-list" style={{ maxHeight: 190, overflowY: 'auto' }}>
                    {ROBOTICS_HARDWARE_CATALOG.filter((h) => h.group === 'boards').map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`compact-btn ${workbenchConfig.boardId === b.id ? 'active' : ''}`}
                        onClick={() => onSelectWorkbenchBoard?.(b.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                          <span className="color-dot" style={{ background: b.defaultColor }} />
                          <span>{b.name}</span>
                          <span className="hierarchy-tag" style={{ marginLeft: 'auto' }}>
                            {b.logicVoltage}
                          </span>
                        </div>
                        <span className="compact-btn-sub">
                          {b.specs.mcu} · {b.specs.clock}
                        </span>
                      </button>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="Outputs, Sensors & Actuators (14)" defaultOpen>
                  <div className="hierarchy-list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {ROBOTICS_HARDWARE_CATALOG.filter((h) => h.group !== 'boards').map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="compact-btn"
                        onClick={() => onAddWorkbenchModule?.(item.id)}
                        title={item.summary}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                          <span className="color-dot" style={{ background: item.defaultColor }} />
                          <span>+ {item.name}</span>
                          <span className="hierarchy-tag" style={{ marginLeft: 'auto' }}>
                            {item.group}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </AccordionSection>
              </>
            ) : (
              <>
                <AccordionSection title="Circuit Templates" defaultOpen>
                  <div className="hierarchy-list">
                    {circuitPresets.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`compact-btn ${activeCircuitId === c.id ? 'active' : ''}`}
                        onClick={() => onLoadCircuitPreset(c.id)}
                      >
                        <span>{c.name}</span>
                        <span className="compact-btn-sub">{c.description}</span>
                      </button>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="Add Component" defaultOpen>
                  <div className="compact-grid">
                    {CIRCUIT_PALETTE.map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        className="compact-btn"
                        onClick={() => onAddCircuitComponent(item.kind)}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </AccordionSection>
              </>
            )}
          </>
        )}

        {mode === 'math' && (
          <AccordionSection title="Math System & Presets" defaultOpen>
            <div className="hierarchy-list">
              {(
                [
                  ['parametric', 'Parametric r(u,v)', 'Möbius, Klein, Knots'],
                  ['explicit', 'Explicit Wave z(x,y,t)', 'Interference & eigenmodes'],
                  ['implicit', 'Implicit Iso-Surface F=0', 'Gyroid, Schwarz-P, SDF'],
                  ['ode', 'ODE Attractor (RK4)', 'Lorenz, Rössler, Chaos'],
                  ['vectorField', '3D Vector Field V(x,y,z)', 'Vortex, Dipole, Flow'],
                ] as [MathModeKind, string, string][]
              ).map(([k, title, sub]) => (
                <button
                  key={k}
                  type="button"
                  className={`compact-btn ${mathConfig.activeKind === k ? 'active' : ''}`}
                  onClick={() => onMathKindChange(k)}
                >
                  <span>{title}</span>
                  <span className="compact-btn-sub">{sub}</span>
                </button>
              ))}
            </div>

            <span className="field-label" style={{ marginTop: 4 }}>
              Presets
            </span>
            <div className="hierarchy-list">
              {mathConfig.activeKind === 'parametric' &&
                PARAMETRIC_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${
                      mathConfig.parametric.presetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => onSelectMathPreset('parametric', p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              {mathConfig.activeKind === 'explicit' &&
                EXPLICIT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${
                      mathConfig.explicit.presetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => onSelectMathPreset('explicit', p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              {mathConfig.activeKind === 'implicit' &&
                IMPLICIT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${
                      mathConfig.implicit.presetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => onSelectMathPreset('implicit', p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              {mathConfig.activeKind === 'ode' &&
                ODE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${
                      mathConfig.ode.presetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => onSelectMathPreset('ode', p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              {mathConfig.activeKind === 'vectorField' &&
                VECTOR_FIELD_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`compact-btn ${
                      mathConfig.vectorField.presetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => onSelectMathPreset('vectorField', p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
            </div>
          </AccordionSection>
        )}

        {mode === 'soft' && (
          <AccordionSection title="Continuous & Field Solvers" defaultOpen>
            <div className="hierarchy-list">
              {(
                [
                  ['particles', 'Particle Force Fields', 'N-Body, Vortex, Lorentz'],
                  ['cloth', 'Verlet Cloth & Membrane', 'Wind, Pins, Collision'],
                  ['sphFluid', '3D SPH Particle Fluid', 'Dam-Break Tank & Viscosity'],
                  ['waveTank', 'Shallow-Water Wave PDE', 'Ripples & Rain Interference'],
                ] as [SoftSimKind, string, string][]
              ).map(([k, title, sub]) => (
                <button
                  key={k}
                  type="button"
                  className={`compact-btn ${softConfig.activeKind === k ? 'active' : ''}`}
                  onClick={() => onSoftKindChange(k)}
                >
                  <span>{title}</span>
                  <span className="compact-btn-sub">{sub}</span>
                </button>
              ))}
            </div>

            {softConfig.activeKind === 'particles' && (
              <div className="hierarchy-list" style={{ marginTop: 4 }}>
                {(
                  [
                    ['nbody', 'Orbital N-Body Disk'],
                    ['vortex', '3D Helical Vortex'],
                    ['lorentz', 'Lorentz Cyclotron'],
                  ] as [SoftSimConfig['particles']['preset'], string][]
                ).map(([id, title]) => (
                  <button
                    key={id}
                    type="button"
                    className={`compact-btn ${
                      softConfig.particles.preset === id ? 'active' : ''
                    }`}
                    onClick={() => onSoftParticlePreset(id)}
                  >
                    <span>{title}</span>
                  </button>
                ))}
              </div>
            )}
          </AccordionSection>
        )}

        {/* Scene Section */}
        <AccordionSection
          title="Scene"
          defaultOpen={false}
          rightAction={
            <button
              type="button"
              className="mini-icon-btn"
              onClick={onResetStage}
              title="Reset Stage Lighting"
            >
              <RotateCcw size={12} />
            </button>
          }
        >
          <span className="field-label">Theme</span>
          <SegmentedControl
            value={stage.theme}
            columns={2}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
            onChange={(theme) => onStageChange({ ...stage, theme })}
          />
          <StudioSlider
            label="Intensity"
            value={stage.intensity}
            min={0.2}
            max={2.4}
            step={0.05}
            onChange={(intensity) => onStageChange({ ...stage, intensity })}
          />
          <StudioSlider
            label="Reflection"
            value={stage.reflection}
            min={0}
            max={1}
            step={0.05}
            onChange={(reflection) => onStageChange({ ...stage, reflection })}
          />
          <ToggleSwitch
            label="Shadows"
            checked={stage.shadows}
            onChange={(shadows) => onStageChange({ ...stage, shadows })}
          />
          <ToggleSwitch
            label="Show Floor"
            checked={stage.showFloor}
            onChange={(showFloor) => onStageChange({ ...stage, showFloor })}
          />
          <StudioSlider
            label="Exposure"
            value={stage.exposure}
            min={0.5}
            max={2.0}
            step={0.05}
            onChange={(exposure) => onStageChange({ ...stage, exposure })}
          />
          <StudioSlider
            label="Rim Light"
            value={stage.rimLight}
            min={0}
            max={2.0}
            step={0.05}
            onChange={(rimLight) => onStageChange({ ...stage, rimLight })}
          />
        </AccordionSection>

        {/* Object Display Section */}
        <AccordionSection title="Object Display" defaultOpen={false}>
          <span className="field-label">Material</span>
          <SegmentedControl<ShadingMode>
            value={stage.shading}
            columns={2}
            options={[
              { value: 'original', label: 'Original' },
              { value: 'albedo', label: 'Albedo' },
              { value: 'solid', label: 'Solid' },
              { value: 'normal', label: 'Normal' },
            ]}
            onChange={(shading) => onStageChange({ ...stage, shading })}
          />
          <ToggleSwitch
            label="Wireframe"
            checked={stage.wireframe}
            onChange={(wireframe) => onStageChange({ ...stage, wireframe })}
          />
          <ToggleSwitch
            label="Colliders"
            checked={stage.showColliders}
            onChange={(showColliders) => onStageChange({ ...stage, showColliders })}
          />
          <ToggleSwitch
            label="Exploded View"
            checked={stage.explodedView}
            onChange={(explodedView) => onStageChange({ ...stage, explodedView })}
          />
          <ToggleSwitch
            label="Show Axes"
            checked={stage.showAxes}
            onChange={(showAxes) => onStageChange({ ...stage, showAxes })}
          />
          <ToggleSwitch
            label="Auto-Spin"
            checked={stage.autoSpin}
            onChange={(autoSpin) => onStageChange({ ...stage, autoSpin })}
          />
        </AccordionSection>

        {/* Unified Project Scene Tree & Checkpoints */}
        {(mode === 'physics' || mode === 'experiments') && leftTab === 'tree' && (
          <>
            <AccordionSection
              title={`Unified Project Scene Tree (${entities.length + cadParts.length})`}
              defaultOpen
            >
              <div className="hierarchy-list">
                {entities.map((ent) => (
                  <div
                    key={ent.id}
                    className={`hierarchy-item ${selectedId === ent.id ? 'selected' : ''}`}
                    onClick={() => onSelect(ent.id)}
                    style={ent.parentId ? { paddingLeft: 18 } : undefined}
                  >
                    <div className="hierarchy-label">
                      <span className="color-dot" style={{ background: ent.color }} />
                      <span className="hierarchy-name">
                        {ent.parentId ? '↳ ' : ''}
                        {ent.name}
                      </span>
                      <span className="hierarchy-tag">
                        {ent.locked ? 'FIX' : ent.bodyType.slice(0, 3)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                      {onToggleEntityLocked && (
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => onToggleEntityLocked(ent.id)}
                          title={ent.locked ? 'Unlock' : 'Lock Position'}
                        >
                          {ent.locked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} />}
                        </button>
                      )}
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() => onToggleEntityVisible(ent.id)}
                        title="Visibility"
                      >
                        {ent.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() => onDuplicateEntity(ent.id)}
                        title="Duplicate"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() => onDeleteEntity(ent.id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {cadParts.length > 0 && (
                  <>
                    <div
                      className="field-label"
                      style={{ marginTop: 6, marginBottom: 2, fontWeight: 600 }}
                    >
                      Project CAD Parts ({cadParts.length})
                    </div>
                    {cadParts.map((part) => (
                      <div key={part.id} className="hierarchy-item">
                        <div className="hierarchy-label">
                          <span className="color-dot" style={{ background: part.color }} />
                          <span className="hierarchy-name">{part.name}</span>
                        </div>
                        {onSyncCadPartToPhysics && (
                          <button
                            type="button"
                            className="cat-pill"
                            onClick={() => onSyncCadPartToPhysics(part.id)}
                            title="Add CAD part into active Physics mechanism"
                          >
                            ⇄ Live
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </AccordionSection>

            <AccordionSection
              title={`Checkpoints & History (${checkpoints.length})`}
              defaultOpen={checkpoints.length > 0}
            >
              {(onUndo || onRedo) && (
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ flex: 1, opacity: canUndo ? 1 : 0.45 }}
                    disabled={!canUndo}
                    onClick={onUndo}
                  >
                    <Undo2 size={12} />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ flex: 1, opacity: canRedo ? 1 : 0.45 }}
                    disabled={!canRedo}
                    onClick={onRedo}
                  >
                    <Redo2 size={12} />
                    <span>Redo</span>
                  </button>
                </div>
              )}
              {onSaveCheckpoint && (
                <button type="button" className="action-btn primary" onClick={onSaveCheckpoint}>
                  <Bookmark size={12} />
                  <span>Save State Checkpoint</span>
                </button>
              )}
              {checkpoints.length > 0 && (
                <div className="hierarchy-list">
                  {checkpoints.map((cp) => (
                    <div key={cp.id} className="hierarchy-item">
                      <div className="hierarchy-label">
                        <span className="hierarchy-name">{cp.label}</span>
                        <span className="hierarchy-tag">{cp.simTime.toFixed(2)}s</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {onRestoreCheckpoint && (
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => onRestoreCheckpoint(cp.id)}
                            title="Restore Checkpoint"
                          >
                            <Play size={11} color="#34d399" />
                          </button>
                        )}
                        {onDeleteCheckpoint && (
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => onDeleteCheckpoint(cp.id)}
                            title="Delete Checkpoint"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>
          </>
        )}

        {mode === 'cad' && (
          <AccordionSection title={`CAD Assembly (${cadParts.length})`} defaultOpen>
            <div className="hierarchy-list">
              {cadParts.map((part) => (
                <div
                  key={part.id}
                  className={`hierarchy-item ${selectedId === part.id ? 'selected' : ''}`}
                  onClick={() => onSelect(part.id)}
                >
                  <div className="hierarchy-label">
                    <span className="color-dot" style={{ background: part.color }} />
                    <span className="hierarchy-name">{part.name}</span>
                    <span className="hierarchy-tag">
                      {part.locked ? 'FIX' : part.csgMesh ? 'MESH' : part.kind}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="mini-icon-btn"
                      onClick={() => onToggleCadLocked(part.id)}
                      title={part.locked ? 'Unlock Part' : 'Fix / Lock Part in Place'}
                    >
                      {part.locked ? <Lock size={12} color="#f59e0b" /> : <Unlock size={12} />}
                    </button>
                    <button
                      type="button"
                      className="mini-icon-btn"
                      onClick={() => onToggleCadVisible(part.id)}
                    >
                      {part.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                      type="button"
                      className="mini-icon-btn"
                      onClick={() => onDeleteCadPart(part.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionSection>
        )}
      </div>
    </aside>
  );
};
