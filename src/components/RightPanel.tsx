import React, { useState } from 'react';
import {
  ArrowRightCircle,
  Droplets,
  Link2,
  Play,
  Sliders,
  Terminal,
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

interface RightPanelProps {
  mode: StudioMode;
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
  const resolvedCsgB = cadParts.some((p) => p.id === csgB) ? csgB : cadParts[1]?.id ?? cadParts[0]?.id ?? '';
  const resolvedJointA = entities.some((e) => e.id === newJointA) ? newJointA : entities[0]?.id ?? '';
  const resolvedJointB = entities.some((e) => e.id === newJointB) ? newJointB : entities[1]?.id ?? entities[0]?.id ?? '';

  return (
    <aside className="side-panel right">
      <div className="panel-scroll">
        {mode === 'physics' && (
          <>
            {selectedEntity ? (
              <div className="section-card">
                <div className="section-header">
                  <span>Body Inspector</span>
                  <span className="hierarchy-tag">{selectedEntity.shape}</span>
                </div>

                <div className="field-row">
                  <span className="field-label">Name</span>
                  <input
                    className="input-text"
                    style={{ width: '65%' }}
                    value={selectedEntity.name}
                    onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })}
                  />
                </div>

                <div className="field-row">
                  <span className="field-label">Type</span>
                  <select
                    className="input-select"
                    style={{ width: '65%' }}
                    value={selectedEntity.bodyType}
                    onChange={(e) =>
                      onUpdateEntity(selectedEntity.id, { bodyType: e.target.value as BodyType })
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
                  onChange={(pos) => onUpdateEntity(selectedEntity.id, { position: pos })}
                />
                <Vec3Editor
                  label="Rotation (rad)"
                  value={selectedEntity.rotation}
                  onChange={(rot) => onUpdateEntity(selectedEntity.id, { rotation: rot })}
                />

                <div className="field-row">
                  <span className="field-label">Color</span>
                  <input
                    type="color"
                    value={selectedEntity.color}
                    onChange={(e) => onUpdateEntity(selectedEntity.id, { color: e.target.value })}
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Mass (kg)</span>
                    <span className="slider-val">{selectedEntity.physics.mass.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={40}
                    step={0.1}
                    value={selectedEntity.physics.mass}
                    onChange={(e) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, mass: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Restitution (Bounce)</span>
                    <span className="slider-val">
                      {selectedEntity.physics.restitution.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedEntity.physics.restitution}
                    onChange={(e) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, restitution: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Friction</span>
                    <span className="slider-val">{selectedEntity.physics.friction.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={selectedEntity.physics.friction}
                    onChange={(e) =>
                      onUpdateEntity(selectedEntity.id, {
                        physics: { ...selectedEntity.physics, friction: Number(e.target.value) },
                      })
                    }
                  />
                </div>

                {selectedEntity.bodyType === 'dynamic' && (
                  <div className="field-row" style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => onApplyImpulse(selectedEntity.id, [0, 8 * selectedEntity.physics.mass, 0])}
                    >
                      <Zap size={12} />
                      <span>Impulse +Y</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => onApplyImpulse(selectedEntity.id, [8 * selectedEntity.physics.mass, 2, 0])}
                    >
                      <Zap size={12} />
                      <span>Kick +X</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="section-card">
                <div className="section-header">
                  <span>Body Inspector</span>
                </div>
                <span className="field-label">Click any body in the viewport or hierarchy to inspect.</span>
              </div>
            )}

            <div className="section-card">
              <div className="section-header">
                <span>Joints &amp; Motors ({joints.length})</span>
                <Link2 size={12} />
              </div>

              {joints.map((j) => (
                <div
                  key={j.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 7,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div className="field-row">
                    <span style={{ fontWeight: 600 }}>{j.name}</span>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
                    <div className="slider-row">
                      <div className="slider-head">
                        <span className="field-label">Motor Speed</span>
                        <span className="slider-val">{j.motorSpeed.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.2}
                        value={j.motorSpeed}
                        onChange={(e) =>
                          onUpdateJointMotor(
                            j.id,
                            Number(e.target.value),
                            Math.max(12, j.motorMaxForce || 15)
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              ))}

              {entities.length >= 2 && (
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
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
                    className="icon-btn"
                    style={{ justifyContent: 'center' }}
                    onClick={() => {
                      if (!resolvedJointA || !resolvedJointB || resolvedJointA === resolvedJointB) return;
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
            </div>
          </>
        )}

        {mode === 'cad' && (
          <>
            {selectedCadPart ? (
              <div className="section-card">
                <div className="section-header">
                  <span>Parametric CAD</span>
                  <span className="hierarchy-tag">
                    {selectedCadPart.csgMesh ? 'CSG Solid' : selectedCadPart.kind}
                  </span>
                </div>

                <div className="field-row">
                  <span className="field-label">Name</span>
                  <input
                    className="input-text"
                    style={{ width: '65%' }}
                    value={selectedCadPart.name}
                    onChange={(e) => onUpdateCadPart(selectedCadPart.id, { name: e.target.value })}
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
                        <div className="slider-row">
                          <div className="slider-head">
                            <span className="field-label">Width</span>
                            <span className="slider-val">{selectedCadPart.width.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0.3}
                            max={4}
                            step={0.05}
                            value={selectedCadPart.width}
                            onChange={(e) =>
                              onUpdateCadPart(selectedCadPart.id, { width: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div className="slider-row">
                          <div className="slider-head">
                            <span className="field-label">Depth / Thickness</span>
                            <span className="slider-val">{selectedCadPart.depth.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min={0.15}
                            max={4}
                            step={0.05}
                            value={selectedCadPart.depth}
                            onChange={(e) =>
                              onUpdateCadPart(selectedCadPart.id, { depth: Number(e.target.value) })
                            }
                          />
                        </div>
                      </>
                    )}

                    <div className="slider-row">
                      <div className="slider-head">
                        <span className="field-label">Height</span>
                        <span className="slider-val">{selectedCadPart.height.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={4}
                        step={0.05}
                        value={selectedCadPart.height}
                        onChange={(e) =>
                          onUpdateCadPart(selectedCadPart.id, { height: Number(e.target.value) })
                        }
                      />
                    </div>

                    {selectedCadPart.kind !== 'box' && (
                      <div className="slider-row">
                        <div className="slider-head">
                          <span className="field-label">Outer Radius</span>
                          <span className="slider-val">
                            {selectedCadPart.outerRadius.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.25}
                          max={3}
                          step={0.05}
                          value={selectedCadPart.outerRadius}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, {
                              outerRadius: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    )}

                    {selectedCadPart.kind === 'pipe' && (
                      <div className="slider-row">
                        <div className="slider-head">
                          <span className="field-label">Inner Bore</span>
                          <span className="slider-val">
                            {selectedCadPart.innerRadius.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={2.4}
                          step={0.05}
                          value={selectedCadPart.innerRadius}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, {
                              innerRadius: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    )}

                    {selectedCadPart.kind === 'gear' && (
                      <div className="slider-row">
                        <div className="slider-head">
                          <span className="field-label">Gear Teeth</span>
                          <span className="slider-val">{selectedCadPart.teeth}</span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={36}
                          step={1}
                          value={selectedCadPart.teeth}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, { teeth: Number(e.target.value) })
                          }
                        />
                      </div>
                    )}

                    {selectedCadPart.kind === 'polygon' && (
                      <div className="slider-row">
                        <div className="slider-head">
                          <span className="field-label">Polygon Sides</span>
                          <span className="slider-val">{selectedCadPart.sides}</span>
                        </div>
                        <input
                          type="range"
                          min={3}
                          max={12}
                          step={1}
                          value={selectedCadPart.sides}
                          onChange={(e) =>
                            onUpdateCadPart(selectedCadPart.id, { sides: Number(e.target.value) })
                          }
                        />
                      </div>
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
                    onChange={(e) => onUpdateCadPart(selectedCadPart.id, { color: e.target.value })}
                  />
                </div>

                <button
                  type="button"
                  className="icon-btn primary"
                  style={{ justifyContent: 'center', marginTop: 4 }}
                  onClick={() => onSendCadToPhysics(selectedCadPart.id)}
                >
                  <ArrowRightCircle size={13} />
                  <span>Send Part to Physics World</span>
                </button>
              </div>
            ) : (
              <div className="section-card">
                <span className="field-label">Select a CAD part to inspect or transform.</span>
              </div>
            )}

            <div className="section-card">
              <div className="section-header">
                <span>CSG Boolean Operations</span>
              </div>
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
                  className="icon-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'union')}
                >
                  Union
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() =>
                    resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'subtract')
                  }
                >
                  Subtract
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() =>
                    resolvedCsgA && resolvedCsgB && onRunCsg(resolvedCsgA, resolvedCsgB, 'intersect')
                  }
                >
                  Intersect
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'math' && (
          <>
            <div className="section-card">
              <div className="section-header">
                <span>Formula &amp; Parameters</span>
                <span className="hierarchy-tag">{mathConfig.activeKind}</span>
              </div>

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
                  <div className="slider-row">
                    <div className="slider-head">
                      <span className="field-label">Mesh Scale</span>
                      <span className="slider-val">{mathConfig.parametric.scale.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.5}
                      step={0.05}
                      value={mathConfig.parametric.scale}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          parametric: {
                            ...mathConfig.parametric,
                            scale: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}

              {mathConfig.activeKind === 'explicit' && (
                <>
                  <div className="field-col">
                    <span className="field-label">Height z(x, y, t)</span>
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
                  <div className="field-row">
                    <span className="field-label">Animate Time (t)</span>
                    <input
                      type="checkbox"
                      checked={mathConfig.explicit.animate}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          explicit: { ...mathConfig.explicit, animate: e.target.checked },
                        })
                      }
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-head">
                      <span className="field-label">Time Speed</span>
                      <span className="slider-val">{mathConfig.explicit.speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.1}
                      value={mathConfig.explicit.speed}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          explicit: { ...mathConfig.explicit, speed: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                </>
              )}

              {mathConfig.activeKind === 'implicit' && (
                <>
                  <div className="field-col">
                    <span className="field-label">Implicit F(x, y, z) = isoLevel</span>
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
                  <div className="slider-row">
                    <div className="slider-head">
                      <span className="field-label">Iso-Level</span>
                      <span className="slider-val">{mathConfig.implicit.isoLevel.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={-1.5}
                      max={1.5}
                      step={0.05}
                      value={mathConfig.implicit.isoLevel}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          implicit: { ...mathConfig.implicit, isoLevel: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
                  <div className="slider-row">
                    <div className="slider-head">
                      <span className="field-label">Marching Grid Resolution</span>
                      <span className="slider-val">{mathConfig.implicit.resolution}</span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={38}
                      step={2}
                      value={mathConfig.implicit.resolution}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          implicit: {
                            ...mathConfig.implicit,
                            resolution: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
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
                    <div className="slider-row" key={k}>
                      <div className="slider-head">
                        <span className="field-label">Param {k}</span>
                        <span className="slider-val">{val.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={Math.max(40, val * 2)}
                        step={0.05}
                        value={val}
                        onChange={(e) =>
                          onUpdateMathConfig({
                            ...mathConfig,
                            ode: {
                              ...mathConfig.ode,
                              params: { ...mathConfig.ode.params, [k]: Number(e.target.value) },
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="slider-row">
                    <div className="slider-head">
                      <span className="field-label">Trajectory Bundle Count</span>
                      <span className="slider-val">{mathConfig.ode.bundleCount}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={mathConfig.ode.bundleCount}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          ode: { ...mathConfig.ode, bundleCount: Number(e.target.value) },
                        })
                      }
                    />
                  </div>
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
                  <div className="field-row">
                    <span className="field-label">Animate Flow Tracers</span>
                    <input
                      type="checkbox"
                      checked={mathConfig.vectorField.animateTracers}
                      onChange={(e) =>
                        onUpdateMathConfig({
                          ...mathConfig,
                          vectorField: {
                            ...mathConfig.vectorField,
                            animateTracers: e.target.checked,
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}

              <div className="field-row" style={{ marginTop: 4 }}>
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
                  <option value="harboria">Harboria (Cyan-Amber)</option>
                  <option value="viridis">Viridis</option>
                  <option value="plasma">Plasma</option>
                  <option value="coolwarm">Cool-Warm</option>
                </select>
              </div>

              {(mathConfig.activeKind === 'parametric' ||
                mathConfig.activeKind === 'explicit' ||
                mathConfig.activeKind === 'implicit') && (
                <>
                  <div className="field-row" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    <span>Vertices: {mathStats.vertices.toLocaleString()}</span>
                    <span>Triangles: {mathStats.triangles.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn primary"
                    style={{ justifyContent: 'center' }}
                    onClick={onSendMathToPhysics}
                  >
                    <ArrowRightCircle size={13} />
                    <span>Convert Surface to Physics Mesh</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {mode === 'soft' && (
          <div className="section-card">
            <div className="section-header">
              <span>Solver Controls</span>
              <Sliders size={12} />
            </div>

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
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Particle Count</span>
                    <span className="slider-val">{softConfig.particles.count}</span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={3000}
                    step={100}
                    value={softConfig.particles.count}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        particles: { ...softConfig.particles, count: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Central Mass / Field</span>
                    <span className="slider-val">{softConfig.particles.centralMass}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={60}
                    step={1}
                    value={softConfig.particles.centralMass}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        particles: {
                          ...softConfig.particles,
                          centralMass: Number(e.target.value),
                          fieldStrength: Number(e.target.value) * 0.1,
                        },
                      })
                    }
                  />
                </div>
              </>
            )}

            {softConfig.activeKind === 'cloth' && (
              <>
                <div className="field-row">
                  <span className="field-label">Pin Anchors</span>
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
                    <option value="topCorners">Top Two Corners</option>
                    <option value="topEdge">Full Top Edge</option>
                    <option value="fourCorners">Four Corners</option>
                  </select>
                </div>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Wind Force</span>
                    <span className="slider-val">{softConfig.cloth.windStrength.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={14}
                    step={0.5}
                    value={softConfig.cloth.windStrength}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        cloth: { ...softConfig.cloth, windStrength: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Stiffness</span>
                    <span className="slider-val">{softConfig.cloth.stiffness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.02}
                    value={softConfig.cloth.stiffness}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        cloth: { ...softConfig.cloth, stiffness: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="field-row">
                  <span className="field-label">Collision Sphere</span>
                  <input
                    type="checkbox"
                    checked={softConfig.cloth.obstacleEnabled}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        cloth: { ...softConfig.cloth, obstacleEnabled: e.target.checked },
                      })
                    }
                  />
                </div>
              </>
            )}

            {softConfig.activeKind === 'sphFluid' && (
              <>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Viscosity</span>
                    <span className="slider-val">{softConfig.sphFluid.viscosity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.2}
                    step={0.05}
                    value={softConfig.sphFluid.viscosity}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        sphFluid: { ...softConfig.sphFluid, viscosity: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Pressure Stiffness</span>
                    <span className="slider-val">{softConfig.sphFluid.stiffness}</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={50}
                    step={1}
                    value={softConfig.sphFluid.stiffness}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        sphFluid: { ...softConfig.sphFluid, stiffness: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn primary"
                  style={{ justifyContent: 'center' }}
                  onClick={onTriggerFluidSlosh}
                >
                  <Droplets size={13} />
                  <span>Slosh Tank Impulse</span>
                </button>
              </>
            )}

            {softConfig.activeKind === 'waveTank' && (
              <>
                <div className="slider-row">
                  <div className="slider-head">
                    <span className="field-label">Wave Speed c</span>
                    <span className="slider-val">{softConfig.waveTank.waveSpeed.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={10}
                    step={0.5}
                    value={softConfig.waveTank.waveSpeed}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        waveTank: { ...softConfig.waveTank, waveSpeed: Number(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="field-row">
                  <span className="field-label">Auto Rain Drops</span>
                  <input
                    type="checkbox"
                    checked={softConfig.waveTank.rainEnabled}
                    onChange={(e) =>
                      onUpdateSoftConfig({
                        ...softConfig,
                        waveTank: { ...softConfig.waveTank, rainEnabled: e.target.checked },
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn primary"
                  style={{ justifyContent: 'center' }}
                  onClick={onTriggerWaveDrop}
                >
                  <Droplets size={13} />
                  <span>Drop Pulse Ripple</span>
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'experiments' && (
          <div className="section-card">
            <div className="section-header">
              <span>Experiment Workbench</span>
              <Terminal size={12} />
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className={`icon-btn ${expTab === 'script' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setExpTab('script')}
              >
                Script Lab
              </button>
              <button
                type="button"
                className={`icon-btn ${expTab === 'sweep' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setExpTab('sweep')}
              >
                Parameter Sweep
              </button>
            </div>

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

                <button
                  type="button"
                  className="icon-btn primary"
                  style={{ justifyContent: 'center' }}
                  onClick={onRunExperimentScript}
                >
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
                  <span className="field-label">Sweep Experiment</span>
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
                  className="icon-btn primary"
                  style={{ justifyContent: 'center' }}
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
          </div>
        )}
      </div>
    </aside>
  );
};
