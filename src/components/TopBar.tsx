import React, { useRef, useState } from 'react';
import {
  Activity,
  Atom,
  Box,
  Cpu,
  Download,
  FlaskConical,
  Grid3x3,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sigma,
  Upload,
  Waves,
} from 'lucide-react';
import type { StageSettings, StudioMode } from '../types/studio';

interface TopBarProps {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  stage: StageSettings;
  onStageChange: (next: StageSettings) => void;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  onResetSim: () => void;
  onSaveScene: () => void;
  onLoadScene: (file: File) => void;
  onExportGLB: () => void;
  onExportSTL: () => void;
  onExportOBJ: () => void;
  onCapturePNG: () => void;
}

const MODES: { id: StudioMode; label: string; icon: React.ReactNode }[] = [
  { id: 'physics', label: 'Physics', icon: <Atom size={13} /> },
  { id: 'cad', label: 'CAD & CSG', icon: <Box size={13} /> },
  { id: 'math', label: 'Math', icon: <Sigma size={13} /> },
  { id: 'soft', label: 'Soft & Fluid', icon: <Waves size={13} /> },
  { id: 'experiments', label: 'Experiments', icon: <FlaskConical size={13} /> },
];

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  stage,
  onStageChange,
  telemetryOpen,
  onToggleTelemetry,
  zenMode,
  onToggleZenMode,
  onResetSim,
  onSaveScene,
  onLoadScene,
  onExportGLB,
  onExportSTL,
  onExportOBJ,
  onCapturePNG,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-chip">
          <div className="brand-mark">
            <Cpu size={14} />
          </div>
          <span className="brand-name">OUTERFLOW</span>
          <span className="brand-sub">Harboria Labs</span>
        </div>

        <nav className="mode-pills" aria-label="Studio Modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mode-pill ${mode === m.id ? 'active' : ''}`}
              onClick={() => onModeChange(m.id)}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="top-btn"
          onClick={onResetSim}
          title="Reset Active Simulation"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          className={`top-btn ${stage.showGrid ? 'active' : ''}`}
          onClick={() => onStageChange({ ...stage, showGrid: !stage.showGrid })}
          title="Toggle Studio Floor Grid"
        >
          <Grid3x3 size={13} />
        </button>

        <button
          type="button"
          className={`top-btn ${telemetryOpen ? 'active' : ''}`}
          onClick={onToggleTelemetry}
          title="Toggle Telemetry & Sweep Drawer"
        >
          <Activity size={13} />
          <span>Telemetry</span>
        </button>

        <button
          type="button"
          className={`top-btn ${zenMode ? 'active' : ''}`}
          onClick={onToggleZenMode}
          title="Toggle Full-Bleed Viewport (Hide Sidebars)"
        >
          {zenMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.outerflow.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoadScene(f);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="top-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Load .outerflow.json scene"
        >
          <Upload size={13} />
          <span>Load</span>
        </button>

        <button
          type="button"
          className="top-btn primary"
          onClick={() => setExportOpen((o) => !o)}
          title="Save & Export Scene or 3D Mesh"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        {exportOpen && (
          <div className="dropdown-menu" onMouseLeave={() => setExportOpen(false)}>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onSaveScene();
                setExportOpen(false);
              }}
            >
              <span>Save Scene JSON</span>
              <span className="hierarchy-tag">.json</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportGLB();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Scene (GLB)</span>
              <span className="hierarchy-tag">.glb</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportSTL();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Mesh (STL)</span>
              <span className="hierarchy-tag">.stl</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportOBJ();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Mesh (OBJ)</span>
              <span className="hierarchy-tag">.obj</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onCapturePNG();
                setExportOpen(false);
              }}
            >
              <span>Capture Snapshot PNG</span>
              <span className="hierarchy-tag">.png</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
