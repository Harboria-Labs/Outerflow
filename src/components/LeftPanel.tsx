import React from 'react';
import {
  Box,
  ChevronsLeft,
  Copy,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type {
  CadPartConfig,
  CadPrimitiveKind,
  MathConfig,
  MathModeKind,
  ShadingMode,
  ShapeKind,
  SoftSimConfig,
  SoftSimKind,
  StageSettings,
  StudioEntity,
  StudioMode,
} from '../types/studio';
import type { PhysicsPreset } from '../engines/physics/presets';
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
  onCollapse: () => void;
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
  onDuplicateEntity: (id: string) => void;
  onDeleteEntity: (id: string) => void;
  // CAD
  cadParts: CadPartConfig[];
  onAddCadPart: (kind: CadPrimitiveKind) => void;
  onToggleCadVisible: (id: string) => void;
  onDeleteCadPart: (id: string) => void;
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

const CAD_KINDS: { kind: CadPrimitiveKind; label: string; sub: string }[] = [
  { kind: 'box', label: 'Block', sub: 'Beveled cuboid' },
  { kind: 'cylinder', label: 'Cylinder', sub: 'Solid shaft' },
  { kind: 'pipe', label: 'Pipe', sub: 'Annular sleeve' },
  { kind: 'gear', label: 'Spur Gear', sub: 'Involute teeth' },
  { kind: 'bracket', label: 'L-Bracket', sub: 'Bolt holes' },
  { kind: 'lathe', label: 'Nozzle', sub: 'Revolved shell' },
  { kind: 'polygon', label: 'Hex Prism', sub: 'Bored polygon' },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  mode,
  onCollapse,
  stage,
  onStageChange,
  onResetStage,
  physicsPresets,
  activePhysicsPresetId,
  onLoadPhysicsPreset,
  entities,
  selectedId,
  onSelect,
  onAddPhysicsEntity,
  onToggleEntityVisible,
  onDuplicateEntity,
  onDeleteEntity,
  cadParts,
  onAddCadPart,
  onToggleCadVisible,
  onDeleteCadPart,
  mathConfig,
  onMathKindChange,
  onSelectMathPreset,
  softConfig,
  onSoftKindChange,
  onSoftParticlePreset,
}) => {
  return (
    <aside className="side-panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <Box size={14} color="#a1a1aa" />
          <span>Preview</span>
        </div>
        <button
          type="button"
          className="mini-icon-btn"
          onClick={onCollapse}
          title="Collapse Left Panel"
        >
          <ChevronsLeft size={15} />
        </button>
      </div>

      <div className="panel-scroll">
        {/* Mode-specific Presets & Creation */}
        {(mode === 'physics' || mode === 'experiments') && (
          <AccordionSection title="Physics Scenes & Spawn" defaultOpen>
            <div className="compact-grid">
              {physicsPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`compact-btn ${activePhysicsPresetId === p.id ? 'active' : ''}`}
                  onClick={() => onLoadPhysicsPreset(p.id)}
                  title={p.description}
                >
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <div className="compact-grid" style={{ marginTop: 4 }}>
              {PHYSICS_SHAPES.map((s) => (
                <button
                  key={s.shape}
                  type="button"
                  className="compact-btn"
                  onClick={() => onAddPhysicsEntity(s.shape)}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </AccordionSection>
        )}

        {mode === 'cad' && (
          <AccordionSection title="Parametric Primitives" defaultOpen>
            <div className="compact-grid">
              {CAD_KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  className="compact-btn"
                  onClick={() => onAddCadPart(k.kind)}
                >
                  <span>+ {k.label}</span>
                  <span className="compact-btn-sub">{k.sub}</span>
                </button>
              ))}
            </div>
          </AccordionSection>
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

        {/* Scene Section (Image 1 Style) */}
        <AccordionSection
          title="Scene"
          defaultOpen
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

        {/* Object / Display Section (Image 1 Style) */}
        <AccordionSection title="Object" defaultOpen>
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

        {/* Hierarchy List */}
        {(mode === 'physics' || mode === 'experiments') && (
          <AccordionSection title={`Hierarchy (${entities.length})`} defaultOpen={false}>
            <div className="hierarchy-list">
              {entities.map((ent) => (
                <div
                  key={ent.id}
                  className={`hierarchy-item ${selectedId === ent.id ? 'selected' : ''}`}
                  onClick={() => onSelect(ent.id)}
                >
                  <div className="hierarchy-label">
                    <span className="color-dot" style={{ background: ent.color }} />
                    <span className="hierarchy-name">{ent.name}</span>
                    <span className="hierarchy-tag">{ent.bodyType.slice(0, 3)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
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
            </div>
          </AccordionSection>
        )}

        {mode === 'cad' && (
          <AccordionSection title={`CAD Parts (${cadParts.length})`} defaultOpen>
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
                      {part.csgMesh ? 'CSG' : part.kind}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
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
