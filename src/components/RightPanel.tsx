import React, { useState } from 'react';
import {
  ArrowRightCircle,
  ChevronsRight,
  Droplets,
  Info,
  Link2,
  Play,
  Zap,
} from 'lucide-react';
import type {
  BodyType,
  CadPartConfig,
  ClothPinMode,
  ColormapName,
  CsgOperation,
  JointKind,
  MathConfig,
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
  // CAD
  cadParts: CadPartConfig[];
  selectedCadPart: CadPartConfig | null;
  onUpdateCadPart: (id: string, patch: Partial<CadPartConfig>) => void;
  onRunCsg: (idA: string, idB: string, op: CsgOperation) => void;
  onSendCadToPhysics: (id: string) => void;
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
  cadParts,
  selectedCadPart,
  onUpdateCadPart,
  onRunCsg,
  onSendCadToPhysics,
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
  const [newJointKind, setNewJointKind] = useState<JointKind>('spring');
  const [newJointA, setNewJointA] = useState<string>(entities[0]?.id ?? '');
  const [newJointB, setNewJointB] = useState<string>(entities[1]?.id ?? '');
  const [expTab, setExpTab] = useState<'script' | 'sweep'>('script');

  const resolvedCsgA = cadParts.some((p) => p.id === csgA) ? csgA : cadParts[0]?.id ?? '';
  const resolvedCsgB = cadParts.some((p) => p.id === csgB)
    ? csgB
    : cadParts[1]?.id ?? cadParts[0]?.id ?? '';
  const resolvedJointA = entities.some((e) => e.id === newJointA)
    ? newJointA
    : entities[0]?.id ?? '';
  const resolvedJointB = entities.some((e) => e.id === newJointB)
    ? newJointB
    : entities[1]?.id ?? entities[0]?.id ?? '';

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
            <AccordionSection title="Body Inspector" defaultOpen>
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
            <AccordionSection title="Parametric CAD" defaultOpen>
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
                      {(selectedCadPart.kind === 'box' || selectedCadPart.kind === 'bracket') && (
                        <>
                          <StudioSlider
                            label="Width"
                            value={selectedCadPart.width}
                            min={0.3}
                            max={4}
                            step={0.05}
                            onChange={(width) => onUpdateCadPart(selectedCadPart.id, { width })}
                          />
                          <StudioSlider
                            label="Thickness"
                            value={selectedCadPart.depth}
                            min={0.15}
                            max={4}
                            step={0.05}
                            onChange={(depth) => onUpdateCadPart(selectedCadPart.id, { depth })}
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

                      {selectedCadPart.kind === 'pipe' && (
                        <StudioSlider
                          label="Inner R"
                          value={selectedCadPart.innerRadius}
                          min={0.1}
                          max={2.4}
                          step={0.05}
                          onChange={(innerRadius) =>
                            onUpdateCadPart(selectedCadPart.id, { innerRadius })
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

                      {selectedCadPart.kind === 'polygon' && (
                        <StudioSlider
                          label="Sides"
                          value={selectedCadPart.sides}
                          min={3}
                          max={12}
                          step={1}
                          decimals={0}
                          onChange={(sides) => onUpdateCadPart(selectedCadPart.id, { sides })}
                        />
                      )}

                      {selectedCadPart.kind === 'lathe' && (
                        <div className="field-row">
                          <span className="field-label">Profile</span>
                          <select
                            className="input-select"
                            style={{ width: '60%' }}
                            value={selectedCadPart.latheCurve}
                            onChange={(e) =>
                              onUpdateCadPart(selectedCadPart.id, {
                                latheCurve: e.target.value as CadPartConfig['latheCurve'],
                              })
                            }
                          >
                            <option value="nozzle">De Laval Nozzle</option>
                            <option value="bell">Aerospace Bell</option>
                            <option value="hourglass">Venturi Hourglass</option>
                            <option value="coneCup">Conical Funnel</option>
                          </select>
                        </div>
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
                <span className="field-label">Select a CAD part to inspect.</span>
              )}
            </AccordionSection>

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
                    resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'subtract')
                  }
                >
                  Subtract
                </button>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={() =>
                    resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'intersect')
                  }
                >
                  Intersect
                </button>
              </div>
            </AccordionSection>
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

        {/* Image 1 Style Bottom Details Table */}
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
