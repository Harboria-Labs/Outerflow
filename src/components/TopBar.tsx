import React, { useRef, useState } from 'react';
import {
  Activity,
  Atom,
  Box,
  Download,
  Film,
  FlaskConical,
  Grid3x3,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sigma,
  Sparkles,
  Upload,
  Waves,
} from 'lucide-react';
import type { LogoStudioConfig, StageSettings, StudioMode } from '../types/studio';
import { OuterflowMark } from './OuterflowMark';

interface TopBarProps {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  stage: StageSettings;
  onStageChange: (next: StageSettings) => void;
  logoConfig: LogoStudioConfig;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  videoRecording: boolean;
  videoElapsedSec: number;
  onToggleVideoRecord: () => void;
  onOpenLogoStudio: () => void;
  onReplayBootIntro: () => void;
  onResetSim: () => void;
  onSaveScene: () => void;
  onLoadScene: (file: File) => void;
  onExportGLB: () => void;
  onExportSTL: () => void;
  onExportOBJ: () => void;
  onCapturePNG: () => void;
  onCaptureTransparentPNG: () => void;
  onPrintSheet: () => void;
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
  logoConfig,
  telemetryOpen,
  onToggleTelemetry,
  zenMode,
  onToggleZenMode,
  videoRecording,
  videoElapsedSec,
  onToggleVideoRecord,
  onOpenLogoStudio,
  onReplayBootIntro,
  onResetSim,
  onSaveScene,
  onLoadScene,
  onExportGLB,
  onExportSTL,
  onExportOBJ,
  onCapturePNG,
  onCaptureTransparentPNG,
  onPrintSheet,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="brand-chip-btn"
          onClick={onOpenLogoStudio}
          title="Open 3D Logo & Motion Studio"
        >
          <OuterflowMark
            size={21}
            primaryColor={logoConfig.primaryColor}
            secondaryColor={logoConfig.secondaryColor}
          />
          <span className="brand-name">OUTERFLOW</span>
          <span className="brand-sub">Harboria Labs</span>
        </button>

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
          onClick={onReplayBootIntro}
          title="Replay 3D Fluid Intro"
        >
          <Sparkles size={13} />
          <span>Intro</span>
        </button>

        <button
          type="button"
          className={`top-btn ${videoRecording ? 'rec-active' : ''}`}
          onClick={onToggleVideoRecord}
          title="Record 60fps 3D Viewport Video (.webm)"
        >
          {videoRecording ? <span className="rec-dot" /> : <Film size={13} />}
          <span>{videoRecording ? `Stop ${videoElapsedSec}s` : 'Rec Video'}</span>
        </button>

        <button
          type="button"
          className="top-btn"
          onClick={onResetSim}
          title="Reset Active Simulation"
        >
          <RotateCcw size={13} />
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
          title="Save, Export Media/3D Print & Print Sheet"
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
              <span>Save Project</span>
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
              <span>Export 3D Scene</span>
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
              <span>Export 3D Print Mesh</span>
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
              <span>Export Wavefront</span>
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
              <span>Snapshot Image</span>
              <span className="hierarchy-tag">.png</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onCaptureTransparentPNG();
                setExportOpen(false);
              }}
            >
              <span>Transparent Image</span>
              <span className="hierarchy-tag">.png</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onToggleVideoRecord();
                setExportOpen(false);
              }}
            >
              <span>{videoRecording ? 'Stop Video Recording' : 'Record 60fps Video'}</span>
              <span className="hierarchy-tag">.webm</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onPrintSheet();
                setExportOpen(false);
              }}
            >
              <span>Print / Save PDF Sheet</span>
              <span className="hierarchy-tag">print</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onOpenLogoStudio();
                setExportOpen(false);
              }}
            >
              <span>3D Logo &amp; Motion Studio</span>
              <span className="hierarchy-tag">brand</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
