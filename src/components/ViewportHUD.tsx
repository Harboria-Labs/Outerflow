import React, { useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  HelpCircle,
  Maximize2,
  Minimize2,
  MousePointer,
  Move,
  RotateCw,
  Scale,
} from 'lucide-react';
import type { CameraPreset, GizmoMode, StudioMode, TelemetrySample } from '../types/studio';

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
  onCameraPreset: (p: CameraPreset) => void;
  onFocusSelected: () => void;
  onCyclePreset: (dir: -1 | 1) => void;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
}

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
  onCameraPreset,
  onFocusSelected,
  onCyclePreset,
  telemetryOpen,
  onToggleTelemetry,
  zenMode,
  onToggleZenMode,
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const showGizmos = mode === 'physics' || mode === 'cad' || mode === 'experiments';

  // 4 clean floating KPI cards (Image 2 style)
  const kpiCards =
    mode === 'cad'
      ? [
          { label: 'CAD Parts', value: String(cadCount), unit: 'solids' },
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

      <div className="hud-top-right">
        {showGizmos && (
          <>
            <button
              type="button"
              className={`hud-btn ${gizmoMode === 'select' ? 'active' : ''}`}
              onClick={() => onGizmoChange('select')}
              title="Select (Q)"
            >
              <MousePointer size={12} />
            </button>
            <button
              type="button"
              className={`hud-btn ${gizmoMode === 'translate' ? 'active' : ''}`}
              onClick={() => onGizmoChange('translate')}
              title="Move (W)"
            >
              <Move size={12} />
            </button>
            <button
              type="button"
              className={`hud-btn ${gizmoMode === 'rotate' ? 'active' : ''}`}
              onClick={() => onGizmoChange('rotate')}
              title="Rotate (E)"
            >
              <RotateCw size={12} />
            </button>
            <button
              type="button"
              className={`hud-btn ${gizmoMode === 'scale' ? 'active' : ''}`}
              onClick={() => onGizmoChange('scale')}
              title="Scale (R)"
            >
              <Scale size={12} />
            </button>
            <span className="hud-divider" />
          </>
        )}

        {(['persp', 'top', 'front', 'iso'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            className="hud-btn"
            onClick={() => onCameraPreset(p)}
          >
            {p.toUpperCase()}
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
          <span>Plots</span>
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
            <span className="details-key">Orbit / Pan / Zoom</span>
            <span className="details-val">Drag / R-Drag / Wheel</span>
          </div>
        </div>
      )}
    </>
  );
};
