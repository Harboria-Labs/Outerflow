import React, { useRef, useState } from 'react';
import {
  Activity,
  Atom,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Cpu,
  Download,
  FilePlus2,
  Film,
  FlaskConical,
  GitBranch,
  Grid3x3,
  Maximize2,
  Minimize2,
  MoreHorizontal,
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
  onNewBlankProject?: () => void;
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
  { id: 'mesh', label: 'Mesh Sculpt', icon: <PenTool size={13} /> },
  { id: 'electronics', label: 'Electronics', icon: <Cpu size={13} /> },
  { id: 'math', label: 'Mathematics', icon: <Sigma size={13} /> },
  { id: 'soft', label: 'Soft & Fluid', icon: <Waves size={13} /> },
  { id: 'system', label: 'System Graph', icon: <GitBranch size={13} /> },
  { id: 'experiments', label: 'Lab & Sweeps', icon: <FlaskConical size={13} /> },
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
  onNewBlankProject,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [modeListOpen, setModeListOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeIdx = Math.max(
    0,
    MODES.findIndex((m) => m.id === mode)
  );
  const activeModeMeta = MODES[activeIdx] ?? MODES[0];

  const handleCycleMode = (dir: -1 | 1) => {
    const nextIdx = (activeIdx + dir + MODES.length) % MODES.length;
    onModeChange(MODES[nextIdx].id);
  };

  return (
    <header className="topbar-transparent">
      {/* Left: Brand Identity */}
      <div className="topbar-brand-zone">
        <button
          type="button"
          className="brand-chip-btn"
          onClick={onOpenLogoStudio}
          title="Open 3D Logo & Motion Studio"
        >
          <OuterflowMark
            size={20}
            primaryColor={logoConfig.primaryColor}
            secondaryColor={logoConfig.secondaryColor}
          />
          <span className="brand-name">OUTERFLOW</span>
          <span className="brand-sub hide-md">Harboria Labs</span>
        </button>
      </div>

      {/* Center: Two Separate Top Dynamic Islands */}
      <div className="topbar-islands-center">
        {/* TOP DYNAMIC ISLAND 1: Single-Mode Swappable Selector Pill */}
        <div
          className="top-dynamic-island mode-switcher-island"
          aria-label="Workspace Mode Dynamic Island"
        >
          <button
            type="button"
            className="island-swap-arrow"
            onClick={() => handleCycleMode(-1)}
            title="Previous Studio Workspace Mode"
          >
            <ChevronLeft size={13} />
          </button>

          <button
            type="button"
            className="island-active-mode-btn"
            onClick={() => setModeListOpen((o) => !o)}
            title="Click to pick workspace mode or use arrows to swap"
          >
            <span className="island-mode-icon">{activeModeMeta.icon}</span>
            <span className="island-mode-label">{activeModeMeta.label}</span>
            <span className="island-mode-index">
              {activeIdx + 1}/{MODES.length}
            </span>
            <ChevronDown size={11} style={{ opacity: 0.7 }} />
          </button>

          <button
            type="button"
            className="island-swap-arrow"
            onClick={() => handleCycleMode(1)}
            title="Next Studio Workspace Mode"
          >
            <ChevronRight size={13} />
          </button>

          {modeListOpen && (
            <div
              className="island-mode-dropdown"
              onMouseLeave={() => setModeListOpen(false)}
            >
              {MODES.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  className={`dropdown-item ${m.id === mode ? 'active' : ''}`}
                  onClick={() => {
                    onModeChange(m.id);
                    setModeListOpen(false);
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {m.icon}
                    <span>{m.label}</span>
                  </span>
                  <span className="hierarchy-tag">0{idx + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TOP DYNAMIC ISLAND 2: Studio Action & Media Island (Intro, Undo, Redo, Record, Reset, Script IDE) */}
        <div
          className="top-dynamic-island actions-island"
          aria-label="Studio Actions Dynamic Island"
        >
          <button
            type="button"
            className="island-action-btn"
            onClick={onReplayBootIntro}
            title="Replay 3D Fluid Intro"
          >
            <Sparkles size={12} />
            <span className="hide-md">Intro</span>
          </button>

          <span className="island-sep" />

          {onUndo && (
            <button
              type="button"
              className="island-action-btn"
              disabled={!canUndo}
              onClick={onUndo}
              title="Undo Project Edit (Ctrl+Z)"
              style={{ opacity: canUndo ? 1 : 0.4 }}
            >
              <Undo2 size={13} />
            </button>
          )}

          {onRedo && (
            <button
              type="button"
              className="island-action-btn"
              disabled={!canRedo}
              onClick={onRedo}
              title="Redo Project Edit (Ctrl+Y)"
              style={{ opacity: canRedo ? 1 : 0.4 }}
            >
              <Redo2 size={13} />
            </button>
          )}

          <span className="island-sep" />

          <button
            type="button"
            className={`island-action-btn ${videoRecording ? 'rec-active' : ''}`}
            onClick={onToggleVideoRecord}
            title="Record 60fps 3D Viewport Video (.webm)"
          >
            {videoRecording ? <span className="rec-dot" /> : <Film size={13} />}
            <span className="hide-sm">
              {videoRecording ? `${videoElapsedSec}s` : 'Rec'}
            </span>
          </button>

          <button
            type="button"
            className="island-action-btn"
            onClick={onResetSim}
            title="Reset Active Simulation"
          >
            <RotateCcw size={13} />
          </button>

          {onToggleScript && (
            <>
              <span className="island-sep" />
              <button
                type="button"
                className={`island-action-btn ${scriptOpen ? 'active' : ''}`}
                onClick={onToggleScript}
                title="Toggle Programmable Engineering Script IDE (JS / Python / C++)"
              >
                <Code2 size={13} />
                <span className="hide-sm">IDE</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right: Integrated Page Status & Far-Right 3-Dots Menu */}
      <div className="topbar-right-page-controls">
        {autosavedAt && (
          <span
            className="page-status-chip hide-md"
            title={`Project autosaved locally at ${autosavedAt}`}
          >
            <CheckCircle2 size={12} color="#34d399" />
            <span>Autosaved</span>
          </span>
        )}

        <button
          type="button"
          className={`page-icon-btn ${stage.showGrid ? 'active' : ''}`}
          onClick={() => onStageChange({ ...stage, showGrid: !stage.showGrid })}
          title="Toggle Studio Floor Grid"
        >
          <Grid3x3 size={13} />
        </button>

        <button
          type="button"
          className={`page-icon-btn ${telemetryOpen ? 'active' : ''}`}
          onClick={onToggleTelemetry}
          title="Toggle Telemetry & Sweep Drawer"
        >
          <Activity size={13} />
        </button>

        <button
          type="button"
          className={`page-icon-btn ${zenMode ? 'active' : ''}`}
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

        {/* Far-Right 3-Dots Dropdown Menu (New Blank, Save, Load, Export GLB/STL/OBJ/PNG/PDF) */}
        <button
          type="button"
          className={`page-icon-btn three-dots-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          title="Project Menu: New Blank Project, Load, Save & Export 3D/Media"
          aria-label="Project & Export Menu"
        >
          <MoreHorizontal size={16} />
        </button>

        {menuOpen && (
          <div className="dropdown-menu" onMouseLeave={() => setMenuOpen(false)}>
            {onNewBlankProject && (
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  onNewBlankProject();
                  setMenuOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FilePlus2 size={12} color="#38bdf8" />
                  <span>New Blank Project</span>
                </span>
                <span className="hierarchy-tag">empty</span>
              </button>
            )}
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onSaveScene();
                setMenuOpen(false);
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Download size={12} />
                <span>Save Project</span>
              </span>
              <span className="hierarchy-tag">.json</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                fileInputRef.current?.click();
                setMenuOpen(false);
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Upload size={12} />
                <span>Load Project</span>
              </span>
              <span className="hierarchy-tag">.json</span>
            </button>

            <div
              style={{
                height: 1,
                background: 'var(--border)',
                margin: '3px 4px',
              }}
            />

            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportGLB();
                setMenuOpen(false);
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
                setMenuOpen(false);
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
                setMenuOpen(false);
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
                setMenuOpen(false);
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
                setMenuOpen(false);
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
                setMenuOpen(false);
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
                setMenuOpen(false);
              }}
            >
              <span>Print / Save PDF Sheet</span>
              <span className="hierarchy-tag">print</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
