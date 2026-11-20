import React, { useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  GripVertical,
  HelpCircle,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  RotateCw,
  Scale,
  Sparkles,
} from 'lucide-react';
import type {
  CameraPreset,
  GizmoMode,
  SculptBrushKind,
  StudioMode,
  TelemetrySample,
} from '../types/studio';

interface ViewportHUDProps {
  mode: StudioMode;
  fps: number;
  simTime: number;
  running: boolean;
  entitiesCount: number;
  cadCount: number;
  meshStats: { vertices: number; triangles: number };
  latestTelemetry?: TelemetrySample;
  gizmoMode: GizmoMode;
  onGizmoChange: (g: GizmoMode) => void;
  sculptBrush: SculptBrushKind;
  onSculptBrushChange: (b: SculptBrushKind) => void;
  onCameraPreset: (p: CameraPreset) => void;
  onFocusSelected: () => void;
  onCyclePreset: (dir: -1 | 1) => void;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
}

const GIZMO_TOOLS: { id: GizmoMode; label: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer size={13} /> },
  { id: 'translate', label: 'Move', icon: <Move size={13} /> },
  { id: 'rotate', label: 'Rotate', icon: <RotateCw size={13} /> },
  { id: 'scale', label: 'Scale', icon: <Scale size={13} /> },
];

const SCULPT_TOOLS: { id: SculptBrushKind; label: string }[] = [
  { id: 'pull', label: 'Pull' },
  { id: 'inflate', label: 'Inflate' },
  { id: 'carve', label: 'Carve' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'flatten', label: 'Flatten' },
];

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  mode,
  fps,
  simTime,
  running,
  entitiesCount,
  cadCount,
  meshStats,
  latestTelemetry,
  gizmoMode,
  onGizmoChange,
  sculptBrush,
  onSculptBrushChange,
  onCameraPreset,
  onFocusSelected,
  onCyclePreset,
  telemetryOpen,
  onToggleTelemetry,
  zenMode,
  onToggleZenMode,
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [toolExpanded, setToolExpanded] = useState(false);
  const [toolPos, setToolPos] = useState<{ x: number; y: number }>({ x: 14, y: 120 });
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const showGizmos = mode === 'physics' || mode === 'cad' || mode === 'experiments';
  const showBrush = mode === 'mesh';
  const showToolPill = showGizmos || showBrush;

  const activeGizmo = GIZMO_TOOLS.find((t) => t.id === gizmoMode) ?? GIZMO_TOOLS[1];
  const activeBrush = SCULPT_TOOLS.find((b) => b.id === sculptBrush) ?? SCULPT_TOOLS[0];

  const handlePillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button[data-tool-option]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: toolPos.x,
      origY: toolPos.y,
      moved: false,
    };
  };

  const handlePillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.hypot(dx, dy) > 4) st.moved = true;
    if (!st.moved) return;

    const parent = e.currentTarget.parentElement;
    const maxW = parent ? Math.max(120, parent.clientWidth - 150) : 800;
    const maxH = parent ? Math.max(120, parent.clientHeight - 70) : 500;
    setToolPos({
      x: Math.max(8, Math.min(maxW, st.origX + dx)),
      y: Math.max(8, Math.min(maxH, st.origY + dy)),
    });
  };

  const handlePillPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    dragStateRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (st && !st.moved) {
      setToolExpanded((exp) => !exp);
    }
  };

  const kpiCards =
    mode === 'cad' || mode === 'mesh'
      ? [
          {
            label: mode === 'mesh' ? 'Sculpt Mode' : 'CAD Solids',
            value: mode === 'mesh' ? activeBrush.label : String(cadCount),
            unit: mode === 'mesh' ? '' : 'parts',
          },
          { label: 'Vertices', value: meshStats.vertices.toLocaleString(), unit: '' },
          { label: 'Triangles', value: meshStats.triangles.toLocaleString(), unit: '' },
          { label: 'Frame Rate', value: String(fps), unit: 'fps' },
        ]
      : mode === 'electronics'
      ? [
          { label: 'Solver', value: 'MNA DC', unit: '' },
          { label: 'Vertices', value: meshStats.vertices.toLocaleString(), unit: '' },
          { label: 'Triangles', value: meshStats.triangles.toLocaleString(), unit: '' },
          { label: 'Frame Rate', value: String(fps), unit: 'fps' },
        ]
      : mode === 'math'
      ? [
          { label: 'Vertices', value: meshStats.vertices.toLocaleString(), unit: '' },
          { label: 'Triangles', value: meshStats.triangles.toLocaleString(), unit: '' },
          { label: 'Param Time', value: simTime.toFixed(1), unit: 's' },
          { label: 'Frame Rate', value: String(fps), unit: 'fps' },
        ]
      : mode === 'soft'
      ? [
          { label: 'Solver Time', value: simTime.toFixed(1), unit: 's' },
          { label: 'Vertices', value: meshStats.vertices.toLocaleString(), unit: '' },
          { label: 'State', value: running ? 'Live' : 'Paused', unit: '' },
          { label: 'Frame Rate', value: String(fps), unit: 'fps' },
        ]
      : [
          { label: 'Sim Time', value: simTime.toFixed(2), unit: 's' },
          { label: 'Active Bodies', value: String(entitiesCount), unit: 'rigid' },
          {
            label: 'Total Energy',
            value: (latestTelemetry?.totalEnergy ?? 0).toFixed(1),
            unit: 'J',
          },
          { label: 'Frame Rate', value: String(fps), unit: 'fps' },
        ];

  return (
    <>
      <div className="kpi-strip">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="kpi-card"
            onClick={onToggleTelemetry}
            title="Click to toggle Telemetry & Sweep Analyzer"
          >
            <span className="kpi-label">{c.label}</span>
            <div className="kpi-value">
              {c.value}
              {c.unit && <span className="kpi-unit">{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Draggable & Shrinkable Active Tool Pill */}
      {showToolPill && (
        <div
          className={`tool-dock-pill ${toolExpanded ? 'expanded' : ''}`}
          style={{ left: toolPos.x, top: toolPos.y }}
          onPointerDown={handlePillPointerDown}
          onPointerMove={handlePillPointerMove}
          onPointerUp={handlePillPointerUp}
          title="Drag to move anywhere · Click to expand tools"
        >
          <div className="tool-dock-active">
            <GripVertical size={12} color="#71717a" />
            {showBrush ? <Sparkles size={13} color="#2680eb" /> : activeGizmo.icon}
            <span>{showBrush ? activeBrush.label : activeGizmo.label}</span>
            <ChevronDown size={11} color="#71717a" />
          </div>

          {toolExpanded && (
            <div className="tool-dock-drawer">
              {showGizmos &&
                GIZMO_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-tool-option="1"
                    className={`hud-btn ${gizmoMode === t.id ? 'active' : ''}`}
                    onClick={() => {
                      onGizmoChange(t.id);
                      setToolExpanded(false);
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </button>
                ))}
              {showBrush &&
                SCULPT_TOOLS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    data-tool-option="1"
                    className={`hud-btn ${sculptBrush === b.id ? 'active' : ''}`}
                    onClick={() => {
                      onSculptBrushChange(b.id);
                      setToolExpanded(false);
                    }}
                  >
                    <span>{b.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Ghost-Transparent Hover-Reveal Camera View Bar */}
      <div className="ghost-camera-bar" role="group" aria-label="Camera Views">
        {(['persp', 'top', 'front', 'right', 'iso'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            className="hud-btn"
            onClick={() => onCameraPreset(p)}
          >
            {p === 'right' ? 'SIDE' : p.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          className="hud-btn"
          onClick={onFocusSelected}
          title="Focus Camera on Selection"
        >
          <Crosshair size={12} />
        </button>
      </div>

      {(mode === 'physics' || mode === 'math' || mode === 'soft') && (
        <>
          <button
            type="button"
            className="viewport-nav-arrow left"
            onClick={() => onCyclePreset(-1)}
            title="Previous Preset"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="viewport-nav-arrow right"
            onClick={() => onCyclePreset(1)}
            title="Next Preset"
          >
            <ChevronRight size={15} />
          </button>
        </>
      )}

      <div className="hud-bottom-right">
        <button
          type="button"
          className={`glass-icon-btn ${telemetryOpen ? 'active' : ''}`}
          onClick={onToggleTelemetry}
          title="Telemetry Plots & Sweep Results"
        >
          <Activity size={13} />
          <span className="hide-sm">Plots</span>
        </button>
        <button
          type="button"
          className={`glass-icon-btn ${zenMode ? 'active' : ''}`}
          onClick={onToggleZenMode}
          title="Toggle Side Panels"
        >
          {zenMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          className={`glass-icon-btn ${helpOpen ? 'active' : ''}`}
          onClick={() => setHelpOpen((o) => !o)}
          title="Keyboard Shortcuts"
        >
          <HelpCircle size={13} />
        </button>
      </div>

      {helpOpen && (
        <div className="shortcuts-popover">
          <div style={{ fontWeight: 600, fontSize: 11.5, marginBottom: 2 }}>
            Viewport Shortcuts
          </div>
          <div className="details-row">
            <span className="details-key">Play / Pause</span>
            <span className="details-val">Space</span>
          </div>
          <div className="details-row">
            <span className="details-key">Select / Move / Rotate / Scale</span>
            <span className="details-val">Q / W / E / R</span>
          </div>
          <div className="details-row">
            <span className="details-key">Sculpt Mesh</span>
            <span className="details-val">Left-Drag on Mesh</span>
          </div>
          <div className="details-row">
            <span className="details-key">Orbit / Pan / Zoom</span>
            <span className="details-val">Drag / R-Drag / Wheel</span>
          </div>
        </div>
      )}
    </>
  );
};
