import React, { useRef, useState } from 'react';
import {
  Activity,
  Atom,
  Box,
  CheckCircle2,
  Code2,
  Cpu,
  Download,
  Film,
  FlaskConical,
  Grid3x3,
  Maximize2,
  Minimize2,
  PenTool,
  Redo2,
  RotateCcw,
  Sigma,
  Sparkles,
  Undo2,
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
  scriptOpen?: boolean;
  onToggleScript?: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  autosavedAt?: string | null;
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
  { id: 'cad', label: 'CAD & Parts', icon: <Box size={13} /> },
  { id: 'mesh', label: 'Mesh', icon: <PenTool size={13} /> },
  { id: 'electronics', label: 'Electronics', icon: <Cpu size={13} /> },
  { id: 'math', label: 'Math', icon: <Sigma size={13} /> },
  { id: 'soft', label: 'Soft', icon: <Waves size={13} /> },
  { id: 'experiments', label: 'Lab', icon: <FlaskConical size={13} /> },
];

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  stage,
  onStageChange,
  logoConfig,
  telemetryOpen,
  onToggleTelemetry,
  scriptOpen = false,
  onToggleScript,
  zenMode,
  onToggleZenMode,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  autosavedAt,
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
          <span className="brand-sub hide-md">Harboria Labs</span>
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
          className="top-btn hide-sm"
          onClick={onReplayBootIntro}
          title="Replay 3D Fluid Intro"
        >
          <Sparkles size={13} />
          <span className="hide-md">Intro</span>
        </button>

        <button
          type="button"
          className={`top-btn ${videoRecording ? 'rec-active' : ''}`}
          onClick={onToggleVideoRecord}
          title="Record 60fps 3D Viewport Video (.webm)"
        >
          {videoRecording ? <span className="rec-dot" /> : <Film size={13} />}
          <span className="hide-sm">
            {videoRecording ? `Stop ${videoElapsedSec}s` : 'Rec Video'}
          </span>
        </button>

        {onUndo && (
          <button
            type="button"
            className="top-btn hide-md"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo Project Edit (Ctrl+Z)"
            style={{ opacity: canUndo ? 1 : 0.45 }}
          >
            <Undo2 size={13} />
          </button>
        )}

        {onRedo && (
          <button
            type="button"
            className="top-btn hide-md"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo Project Edit (Ctrl+Y)"
            style={{ opacity: canRedo ? 1 : 0.45 }}
          >
            <Redo2 size={13} />
          </button>
        )}

        {autosavedAt && (
          <span
            className="top-btn hide-md"
            title={`Project autosaved locally at ${autosavedAt}`}
            style={{ cursor: 'default', borderColor: 'transparent', color: '#34d399', padding: '0 6px' }}
          >
            <CheckCircle2 size={12} />
            <span style={{ fontSize: 10.5 }}>Autosaved</span>
          </span>
        )}

        <button
          type="button"
          className="top-btn hide-sm"
          onClick={onResetSim}
          title="Reset Active Simulation"
        >
          <RotateCcw size={13} />
        </button>

        <button
          type="button"
          className={`top-btn hide-md ${stage.showGrid ? 'active' : ''}`}
          onClick={() => onStageChange({ ...stage, showGrid: !stage.showGrid })}
          title="Toggle Studio Floor Grid"
        >
          <Grid3x3 size={13} />
        </button>

        {onToggleScript && (
          <button
            type="button"
            className={`top-btn ${scriptOpen ? 'active' : ''}`}
            onClick={onToggleScript}
            title="Open Programmable Engineering Script IDE (CAD, Physics, Robotics & Workbench)"
          >
            <Code2 size={13} />
            <span className="hide-sm">Script IDE</span>
          </button>
        )}

        <button
          type="button"
          className={`top-btn hide-sm ${telemetryOpen ? 'active' : ''}`}
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
          className="top-btn hide-md"
          onClick={() => fileInputRef.current?.click()}
          title="Load .outerflow.json scene"
        >
          <Upload size={13} />
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
                fileInputRef.current?.click();
                setExportOpen(false);
              }}
            >
              <span>Load Project</span>
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
