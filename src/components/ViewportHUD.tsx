import React, { useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Box,
  Compass,
  Copy,
  Crosshair,
  GripVertical,
  HelpCircle,
  Layers,
  Magnet,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  PanelLeft,
  PanelRight,
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
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: (v: boolean) => void;
  onAlignGround?: () => void;
  onDuplicateSelected?: () => void;
}

const GIZMO_TOOLS: {
  id: GizmoMode;
  label: string;
  desc: string;
  shortcut: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'select',
    label: 'Select & Inspect',
    desc: 'Pick objects in 3D space without moving them',
    shortcut: 'Q',
    icon: <MousePointer size={13} />,
  },
  {
    id: 'translate',
    label: 'Move / Translate',
    desc: 'Drag X/Y/Z axis handles to reposition object',
    shortcut: 'W',
    icon: <Move size={13} />,
  },
  {
    id: 'rotate',
    label: 'Rotate Orientation',
    desc: 'Spin object around X/Y/Z gimbal rings',
    shortcut: 'E',
    icon: <RotateCw size={13} />,
  },
  {
    id: 'scale',
    label: 'Scale Dimensions',
    desc: 'Resize width, height, and depth proportions',
    shortcut: 'R',
    icon: <Scale size={13} />,
  },
];

const SCULPT_TOOLS: {
  id: SculptBrushKind;
  label: string;
  desc: string;
}[] = [
  { id: 'pull', label: 'Pull Brush', desc: 'Draw mesh surface outward along normal' },
  { id: 'inflate', label: 'Inflate Brush', desc: 'Expand volume along vertex normals' },
  { id: 'carve', label: 'Carve / Crease', desc: 'Push inward to sculpt grooves' },
  { id: 'smooth', label: 'Smooth Brush', desc: 'Relax mesh surface smoothly' },
  { id: 'flatten', label: 'Flatten Brush', desc: 'Level region to tangent plane' },
];

const CAMERA_VIEWS: {
  id: CameraPreset;
  title: string;
  icon: React.ReactNode;
}[] = [
  { id: 'persp', title: 'Perspective 3D Orbit Camera', icon: <Compass size={13} /> },
  { id: 'top', title: 'Top Plan View (XZ Plane)', icon: <Layers size={13} /> },
  { id: 'front', title: 'Front Elevation View (XY Plane)', icon: <PanelLeft size={13} /> },
  { id: 'right', title: 'Side Profile View (YZ Plane)', icon: <PanelRight size={13} /> },
  { id: 'iso', title: 'Isometric Engineering View', icon: <Box size={13} /> },
];

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  mode,
  fps,
  simTime,
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
  onToggleTelemetry,
  zenMode,
  onToggleZenMode,
  snapToGrid = false,
  onToggleSnapToGrid,
  onAlignGround,
  onDuplicateSelected,
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [toolExpanded, setToolExpanded] = useState(true);
  const [toolPos, setToolPos] = useState<{ x: number; y: number }>({ x: 14, y: 18 });
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
    const maxW = parent ? Math.max(120, parent.clientWidth - 80) : 800;
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

  return (
    <>
      {/* 1. Draggable Icon-Only Active Tool Pill (Hover shows tool name & function) */}
      {showToolPill && (
        <div
          className={`tool-dock-pill icon-only ${toolExpanded ? 'expanded' : ''}`}
          style={{ left: toolPos.x, top: toolPos.y }}
          onPointerDown={handlePillPointerDown}
          onPointerMove={handlePillPointerMove}
          onPointerUp={handlePillPointerUp}
          title={
            showBrush
              ? `${activeBrush.label} — ${activeBrush.desc} (Drag to reposition · Click to collapse)`
              : `${activeGizmo.label} (${activeGizmo.shortcut}) — ${activeGizmo.desc} (Drag to reposition · Click to collapse)`
          }
        >
          <div className="tool-dock-active">
            <GripVertical size={12} color="#71717a" />
            {showBrush ? <Sparkles size={13} color="#38bdf8" /> : activeGizmo.icon}
          </div>

          {toolExpanded && (
            <div className="tool-dock-drawer vertical-icons">
              {showGizmos &&
                GIZMO_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-tool-option="1"
                    className={`hud-btn icon-only-btn ${gizmoMode === t.id ? 'active' : ''}`}
                    title={`${t.label} (${t.shortcut}) — ${t.desc}`}
                    onClick={() => onGizmoChange(t.id)}
                  >
                    {t.icon}
                  </button>
                ))}

              {showGizmos && onToggleSnapToGrid && (
                <button
                  type="button"
                  data-tool-option="1"
                  className={`hud-btn icon-only-btn ${snapToGrid ? 'active' : ''}`}
                  title="Snap to Grid (0.25m / 15°)"
                  onClick={() => onToggleSnapToGrid(!snapToGrid)}
                >
                  <Magnet size={13} />
                </button>
              )}

              {showGizmos && onAlignGround && (
                <button
                  type="button"
                  data-tool-option="1"
                  className="hud-btn icon-only-btn"
                  title="Drop Selected to Ground Plane (Y = 0)"
                  onClick={onAlignGround}
                >
                  <ArrowDownToLine size={13} />
                </button>
              )}

              {showGizmos && onDuplicateSelected && (
                <button
                  type="button"
                  data-tool-option="1"
                  className="hud-btn icon-only-btn"
                  title="Duplicate Selected Object"
                  onClick={onDuplicateSelected}
                >
                  <Copy size={13} />
                </button>
              )}

              {showBrush &&
                SCULPT_TOOLS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    data-tool-option="1"
                    className={`hud-btn icon-only-btn ${sculptBrush === b.id ? 'active' : ''}`}
                    title={`${b.label} — ${b.desc}`}
                    onClick={() => onSculptBrushChange(b.id)}
                  >
                    <Sparkles size={12} />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Vertical Ghost-Transparent Camera View & Focus Stack on the Right Edge */}
      <div
        className="ghost-camera-bar vertical"
        role="group"
        aria-label="Vertical Camera Views"
      >
        {CAMERA_VIEWS.map((cam) => (
          <button
            key={cam.id}
            type="button"
            className="hud-btn icon-only-btn"
            onClick={() => onCameraPreset(cam.id)}
            title={cam.title}
          >
            {cam.icon}
          </button>
        ))}
        <span className="camera-v-sep" />
        <button
          type="button"
          className="hud-btn icon-only-btn"
          onClick={onFocusSelected}
          title="Focus Camera on Selected Object (F)"
        >
          <Crosshair size={13} />
        </button>
      </div>

      {/* 3. Compact Colored Bottom-Left Simulation Readout Strip (Same Row Before the Bottom Dynamic Island) */}
      <div
        className="bottom-left-sim-readout"
        onClick={onToggleTelemetry}
        title="Live Simulation Readout — Click to open Telemetry Plots & Sweep Analyzer"
      >
        <span className="sim-chip" title="Simulation Elapsed Time (seconds)">
          <span className="sim-chip-tag">T</span>
          <strong style={{ color: '#38bdf8' }}>{simTime.toFixed(2)}s</strong>
        </span>
        <span className="sim-chip" title="Active Rigid Bodies / CAD Parts">
          <span className="sim-chip-tag">OBJ</span>
          <strong style={{ color: '#a78bfa' }}>
            {mode === 'cad' ? cadCount : entitiesCount}
          </strong>
        </span>
        <span
          className="sim-chip hide-when-both-open"
          title="Total Mechanical Energy (Kinetic + Potential Joules)"
        >
          <span className="sim-chip-tag">E</span>
          <strong style={{ color: '#facc15' }}>
            {(latestTelemetry?.totalEnergy ?? 0).toFixed(1)}J
          </strong>
        </span>
        <span className="sim-chip" title="Real-Time Viewport Rendering Speed (Frames/sec)">
          <span className="sim-chip-tag">FPS</span>
          <strong style={{ color: '#34d399' }}>{fps}</strong>
        </span>
        <span
          className="sim-chip hide-when-sidebars hide-md"
          title="Total 3D Mesh Triangles in Viewport"
        >
          <span className="sim-chip-tag">TRI</span>
          <strong style={{ color: '#fb923c' }}>
            {meshStats.triangles.toLocaleString()}
          </strong>
        </span>
      </div>

      {/* 4. Bottom-Right Viewport Controls (Sidebars Toggle + Shortcuts Help; Telemetry removed from bottom) */}
      <div className="hud-bottom-right">
        <button
          type="button"
          className={`glass-icon-btn ${zenMode ? 'active' : ''}`}
          onClick={onToggleZenMode}
          title="Toggle Side Panels (Full-Bleed Viewport)"
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
            <span className="details-key">Element Launcher</span>
            <span className="details-val">Ctrl + K</span>
          </div>
          <div className="details-row">
            <span className="details-key">Select / Move / Rotate / Scale</span>
            <span className="details-val">Q / W / E / R</span>
          </div>
          <div className="details-row">
            <span className="details-key">Undo / Redo</span>
            <span className="details-val">Ctrl+Z / Ctrl+Y</span>
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
