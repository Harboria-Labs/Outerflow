import React from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  CadPartConfig,
  CadPrimitiveKind,
  MathConfig,
  MathModeKind,
  ShapeKind,
  SoftSimConfig,
  SoftSimKind,
  StudioEntity,
  StudioMode,
} from '../types/studio';
import type { PhysicsPreset } from '../engines/physics/presets';
import { PARAMETRIC_PRESETS } from '../engines/math/parametricSurface';
import { EXPLICIT_PRESETS } from '../engines/math/explicitSurface';
import { IMPLICIT_PRESETS } from '../engines/math/marchingTetrahedra';
import { ODE_PRESETS } from '../engines/math/odeSolver';
import { VECTOR_FIELD_PRESETS } from '../engines/math/vectorField';

interface LeftPanelProps {
  mode: StudioMode;
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
  { kind: 'pipe', label: 'Hollow Pipe', sub: 'Annular sleeve' },
  { kind: 'gear', label: 'Spur Gear', sub: 'Involute teeth' },
  { kind: 'bracket', label: 'L-Bracket', sub: 'With bolt holes' },
  { kind: 'lathe', label: 'Lathe Shell', sub: 'Revolved nozzle' },
  { kind: 'polygon', label: 'Hex Prism', sub: 'Bored polygon' },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  mode,
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
      <div className="panel-scroll">
        {(mode === 'physics' || mode === 'experiments') && (
          <>
            <div className="section-card">
              <div className="section-header">
                <span>Physics Presets</span>
                <Sparkles size={12} color="#22d3ee" />
              </div>
              <div className="preset-grid">
                {physicsPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`preset-btn ${activePhysicsPresetId === p.id ? 'active' : ''}`}
                    onClick={() => onLoadPhysicsPreset(p.id)}
                    title={p.description}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <span>Add Rigid Body</span>
                <Plus size={12} />
              </div>
              <div className="preset-grid">
                {PHYSICS_SHAPES.map((s) => (
                  <button
                    key={s.shape}
                    type="button"
                    className="preset-btn"
                    onClick={() => onAddPhysicsEntity(s.shape)}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <span>Scene Bodies ({entities.length})</span>
              </div>
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
                    <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="mini-icon-btn"
                        onClick={() => onToggleEntityVisible(ent.id)}
                        title="Toggle Visibility"
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
            </div>
          </>
        )}

        {mode === 'cad' && (
          <>
            <div className="section-card">
              <div className="section-header">
                <span>Parametric Primitives</span>
                <Plus size={12} />
              </div>
              <div className="preset-grid">
                {CAD_KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    className="preset-btn"
                    onClick={() => onAddCadPart(k.kind)}
                  >
                    <span>+ {k.label}</span>
                    <span className="preset-btn-sub">{k.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <span>CAD Parts ({cadParts.length})</span>
              </div>
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
                    <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
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
            </div>
          </>
        )}

        {mode === 'math' && (
          <>
            <div className="section-card">
              <div className="section-header">
                <span>Mathematical Domain</span>
              </div>
              <div className="hierarchy-list">
                {(
                  [
                    ['parametric', 'Parametric Surface r(u,v)', 'Möbius, Klein, Knots'],
                    ['explicit', 'Animated Wave z = f(x,y,t)', 'Interference & PDE modes'],
                    ['implicit', 'Implicit Iso-Surface F=0', 'Gyroid, Schwarz-P, SDF'],
                    ['ode', 'Dynamical ODE Attractor', 'Lorenz, Rössler, Chaos'],
                    ['vectorField', '3D Vector Field V(x,y,z)', 'Vortex, Dipole, Flow'],
                  ] as [MathModeKind, string, string][]
                ).map(([k, title, sub]) => (
                  <button
                    key={k}
                    type="button"
                    className={`preset-btn ${mathConfig.activeKind === k ? 'active' : ''}`}
                    onClick={() => onMathKindChange(k)}
                  >
                    <span>{title}</span>
                    <span className="preset-btn-sub">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <span>Gallery Presets</span>
              </div>
              <div className="hierarchy-list">
                {mathConfig.activeKind === 'parametric' &&
                  PARAMETRIC_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${mathConfig.parametric.presetId === p.id ? 'active' : ''}`}
                      onClick={() => onSelectMathPreset('parametric', p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="preset-btn-sub">{p.description}</span>
                    </button>
                  ))}

                {mathConfig.activeKind === 'explicit' &&
                  EXPLICIT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${mathConfig.explicit.presetId === p.id ? 'active' : ''}`}
                      onClick={() => onSelectMathPreset('explicit', p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="preset-btn-sub">{p.description}</span>
                    </button>
                  ))}

                {mathConfig.activeKind === 'implicit' &&
                  IMPLICIT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${mathConfig.implicit.presetId === p.id ? 'active' : ''}`}
                      onClick={() => onSelectMathPreset('implicit', p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="preset-btn-sub">{p.description}</span>
                    </button>
                  ))}

                {mathConfig.activeKind === 'ode' &&
                  ODE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${mathConfig.ode.presetId === p.id ? 'active' : ''}`}
                      onClick={() => onSelectMathPreset('ode', p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="preset-btn-sub">{p.description}</span>
                    </button>
                  ))}

                {mathConfig.activeKind === 'vectorField' &&
                  VECTOR_FIELD_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${mathConfig.vectorField.presetId === p.id ? 'active' : ''}`}
                      onClick={() => onSelectMathPreset('vectorField', p.id)}
                    >
                      <span>{p.name}</span>
                      <span className="preset-btn-sub">{p.description}</span>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}

        {mode === 'soft' && (
          <>
            <div className="section-card">
              <div className="section-header">
                <span>Continuous &amp; Field Solvers</span>
              </div>
              <div className="hierarchy-list">
                {(
                  [
                    ['particles', 'Particle & Force Fields', 'N-Body, Vortex, Lorentz'],
                    ['cloth', 'Verlet Cloth & Membrane', 'Wind, Pins, Sphere Collision'],
                    ['sphFluid', '3D SPH Particle Fluid', 'Dam-Break Tank & Viscosity'],
                    ['waveTank', 'Shallow-Water Wave PDE', 'Ripples & Rain Interference'],
                  ] as [SoftSimKind, string, string][]
                ).map(([k, title, sub]) => (
                  <button
                    key={k}
                    type="button"
                    className={`preset-btn ${softConfig.activeKind === k ? 'active' : ''}`}
                    onClick={() => onSoftKindChange(k)}
                  >
                    <span>{title}</span>
                    <span className="preset-btn-sub">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {softConfig.activeKind === 'particles' && (
              <div className="section-card">
                <div className="section-header">
                  <span>Force-Field Preset</span>
                </div>
                <div className="hierarchy-list">
                  {(
                    [
                      ['nbody', 'Orbital N-Body Disk', 'Central gravity + binary perturber'],
                      ['vortex', '3D Helical Vortex', 'Convection + curl field'],
                      ['lorentz', 'Lorentz Cyclotron', 'Charged spiral in B-field'],
                    ] as [SoftSimConfig['particles']['preset'], string, string][]
                  ).map(([id, title, sub]) => (
                    <button
                      key={id}
                      type="button"
                      className={`preset-btn ${softConfig.particles.preset === id ? 'active' : ''}`}
                      onClick={() => onSoftParticlePreset(id)}
                    >
                      <span>{title}</span>
                      <span className="preset-btn-sub">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
