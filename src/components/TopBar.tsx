import React, { useRef, useState } from 'react';
import {
  Activity,
  AlignVerticalJustifyEnd,
  Archive,
  ArrowDownToLine,
  ArrowRightToLine,
  Atom,
  Axis3d,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Download,
  Eye,
  FileCode2,
  FilePlus2,
  FlaskConical,
  GitBranch,
  Grid,
  Grid3x3,
  Info,
  Layers,
  Lock,
  Magnet,
  Moon,
  MoreHorizontal,
  PenTool,
  Redo2,
  RefreshCw,
  RotateCcw,
  Sigma,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Waves,
  Wrench,
} from 'lucide-react';
import type { LogoStudioConfig, StageSettings, StudioMode } from '../types/studio';
import type { PhysicsPreset } from '../engines/physics/presets';
import { OuterflowMark } from './OuterflowMark';

interface TopBarProps {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  stage: StageSettings;
  onStageChange: (next: StageSettings) => void;
  logoConfig: LogoStudioConfig;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  scriptOpen?: boolean;
  onToggleScript?: () => void;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
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
  onExportZip?: () => void;
  onImportZip?: (file: File) => void;
  onExportGLB: () => void;
  onExportSTL: () => void;
  onExportOBJ: () => void;
  onCapturePNG: () => void;
  onCaptureTransparentPNG: () => void;
  onPrintSheet: () => void;
  // Templates (separated from Elements/Libraries)
  physicsPresets?: PhysicsPreset[];
  activePhysicsPresetId?: string;
  onLoadPhysicsPreset?: (id: string) => void;
  // Horizontal Tools Bar actions
  snapToGrid?: boolean;
  onToggleSnapToGrid?: (v: boolean) => void;
  onAlignGround?: () => void;
  onAlignOnTop?: () => void;
  onAlignRight?: () => void;
  onDuplicateSelected?: () => void;
  onToggleLockSelected?: () => void;
  onDeleteSelected?: () => void;
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
  projectName,
  onProjectNameChange,
  telemetryOpen,
  onToggleTelemetry,
  scriptOpen = false,
  onToggleScript,
  infoOpen = true,
  onToggleInfo,
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
  onExportZip,
  onImportZip,
  onExportGLB,
  onExportSTL,
  onExportOBJ,
  onCapturePNG,
  onCaptureTransparentPNG,
  onPrintSheet,
  physicsPresets = [],
  activePhysicsPresetId,
  onLoadPhysicsPreset,
  snapToGrid = false,
  onToggleSnapToGrid,
  onAlignGround,
  onAlignOnTop,
  onAlignRight,
  onDuplicateSelected,
  onToggleLockSelected,
  onDeleteSelected,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [templatesSubOpen, setTemplatesSubOpen] = useState(false);
  const [modeListOpen, setModeListOpen] = useState(false);
  const [toolsBarOpen, setToolsBarOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);

  const activeIdx = Math.max(
    0,
    MODES.findIndex((m) => m.id === mode)
  );
  const activeModeMeta = MODES[activeIdx] ?? MODES[0];

  const handleCycleMode = (dir: -1 | 1) => {
    const nextIdx = (activeIdx + dir + MODES.length) % MODES.length;
    onModeChange(MODES[nextIdx].id);
  };

  const displayFileName = projectName.endsWith('.lifeforms')
    ? projectName
    : `${projectName}.lifeforms`;

  return (
    <div className="topbar-stack">
      <header className="topbar-transparent">
        {/* Left: Brand Identity + Active Project Filename + Visible Autosave */}
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
          </button>

          <span className="header-file-sep hide-sm">/</span>

          {editingName ? (
            <input
              type="text"
              className="project-filename-input"
              value={projectName}
              autoFocus
              onChange={(e) => onProjectNameChange(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="project-filename-btn hide-sm"
              onClick={() => setEditingName(true)}
              title={`Active Project File: ${displayFileName} — Click to rename`}
            >
              <FileCode2 size={12} color="#38bdf8" />
              <span>{displayFileName}</span>
            </button>
          )}

          <span
            className="page-status-chip hide-md"
            title={
              autosavedAt
                ? `Autosaved locally at ${autosavedAt}`
                : 'Local browser autosave enabled'
            }
          >
            <CheckCircle2 size={11} color="#34d399" />
            <span>{autosavedAt ? `Saved ${autosavedAt}` : 'Autosave On'}</span>
          </span>
        </div>

        {/* Center: Two Separate Top Dynamic Islands + Horizontal Tools Bar Toggle Beside Them */}
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

          {/* TOP DYNAMIC ISLAND 2: Studio Actions (Intro, Undo, Redo, Camera Record Circle+RedDot, Reset, IDE) */}
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
              <span className="hide-when-both-open hide-md">Intro</span>
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
              <span className={`cam-rec-ring ${videoRecording ? 'active' : ''}`}>
                <span className="cam-rec-dot" />
              </span>
              {videoRecording && (
                <span className="hide-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                  {videoElapsedSec}s
                </span>
              )}
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

          {/* Tools Dropdown Trigger BESIDE the Top Dynamic Bar */}
          <button
            type="button"
            className={`page-tools-trigger ${toolsBarOpen ? 'active' : ''}`}
            onClick={() => setToolsBarOpen((o) => !o)}
            title="Toggle Horizontal Engineering & Viewport Tools Bar"
          >
            <Wrench size={12} />
            <span className="hide-when-both-open hide-sm">Tools</span>
            <ChevronDown
              size={11}
              style={{
                transform: toolsBarOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
        </div>

        {/* Right: Floor Grid, Telemetry & Sweep Analyzer, Info Inspector Toggle, and Far-Right 3-Dots Menu */}
        <div className="topbar-right-page-controls">
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
            title="Toggle Telemetry & Sweep Analyzer"
          >
            <Activity size={13} />
          </button>

          {onToggleInfo && (
            <button
              type="button"
              className={`page-icon-btn ${infoOpen ? 'active' : ''}`}
              onClick={onToggleInfo}
              title="Toggle Info & Property Inspector Sidebar"
            >
              <Info size={14} />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".lifeforms,.json,.outerflow.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLoadScene(f);
              e.target.value = '';
            }}
          />

          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onImportZip) onImportZip(f);
              e.target.value = '';
            }}
          />

          {/* Far-Right 3-Dots Menu: New Blank, Templates, Import (.lifeforms / .zip), Save, Export .zip / 3D / Media */}
          <button
            type="button"
            className={`page-icon-btn three-dots-btn ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            title="Project Menu: New Blank, Templates, Import & Export (.lifeforms / .zip)"
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

              {physicsPresets.length > 0 && onLoadPhysicsPreset && (
                <>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => setTemplatesSubOpen((s) => !s)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={12} color="#a78bfa" />
                      <span>Starter Templates</span>
                    </span>
                    <span className="hierarchy-tag">
                      {templatesSubOpen ? '▾' : `${physicsPresets.length} ▸`}
                    </span>
                  </button>
                  {templatesSubOpen && (
                    <div className="submenu-list">
                      {physicsPresets.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`dropdown-item sub ${
                            activePhysicsPresetId === p.id ? 'active' : ''
                          }`}
                          onClick={() => {
                            onLoadPhysicsPreset(p.id);
                            setMenuOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div style={{ height: 1, background: 'var(--border)', margin: '3px 4px' }} />

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  fileInputRef.current?.click();
                  setMenuOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={12} color="#34d399" />
                  <span>Import Project</span>
                </span>
                <span className="hierarchy-tag">.lifeforms</span>
              </button>

              {onImportZip && (
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    zipInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Archive size={12} color="#34d399" />
                    <span>Import Archive</span>
                  </span>
                  <span className="hierarchy-tag">.zip</span>
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
                <span className="hierarchy-tag">.lifeforms</span>
              </button>

              {onExportZip && (
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onExportZip();
                    setMenuOpen(false);
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Archive size={12} color="#38bdf8" />
                    <span>Export Project Bundle</span>
                  </span>
                  <span className="hierarchy-tag">.zip</span>
                </button>
              )}

              <div style={{ height: 1, background: 'var(--border)', margin: '3px 4px' }} />

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

      {/* Normal Long Horizontal Engineering Toolbar (NOT a dynamic island) */}
      {toolsBarOpen && (
        <div
          className="horizontal-tools-bar"
          role="toolbar"
          aria-label="Engineering & Stage Tools Bar"
        >
          {onToggleSnapToGrid && (
            <button
              type="button"
              className={`hbar-btn ${snapToGrid ? 'active' : ''}`}
              onClick={() => onToggleSnapToGrid(!snapToGrid)}
              title="Snap to Grid (0.25m / 15° precision)"
            >
              <Magnet size={13} />
              <span>Snap Grid</span>
            </button>
          )}
          {onAlignGround && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onAlignGround}
              title="Drop Selected Object to Ground Floor (Y = 0)"
            >
              <ArrowDownToLine size={13} />
              <span>Ground</span>
            </button>
          )}
          {onAlignOnTop && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onAlignOnTop}
              title="Stack Selected Object On Top of Previous"
            >
              <AlignVerticalJustifyEnd size={13} />
              <span>Stack Top</span>
            </button>
          )}
          {onAlignRight && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onAlignRight}
              title="Align Selected Object Next To Previous (+X)"
            >
              <ArrowRightToLine size={13} />
              <span>Align Next</span>
            </button>
          )}

          <span className="hbar-sep" />

          {onDuplicateSelected && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onDuplicateSelected}
              title="Duplicate Selected Object"
            >
              <Copy size={13} />
              <span>Duplicate</span>
            </button>
          )}
          {onToggleLockSelected && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onToggleLockSelected}
              title="Fix / Lock Selected Object Position"
            >
              <Lock size={13} />
              <span>Lock</span>
            </button>
          )}
          {onDeleteSelected && (
            <button
              type="button"
              className="hbar-btn"
              onClick={onDeleteSelected}
              title="Delete Selected Object"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}

          <span className="hbar-sep" />

          <button
            type="button"
            className={`hbar-btn ${stage.wireframe ? 'active' : ''}`}
            onClick={() => onStageChange({ ...stage, wireframe: !stage.wireframe })}
            title="Toggle Mesh Wireframe Overlay"
          >
            <Grid size={13} />
            <span>Wireframe</span>
          </button>
          <button
            type="button"
            className={`hbar-btn ${stage.showColliders ? 'active' : ''}`}
            onClick={() => onStageChange({ ...stage, showColliders: !stage.showColliders })}
            title="Toggle Physics Collider Bounds"
          >
            <Eye size={13} />
            <span>Colliders</span>
          </button>
          <button
            type="button"
            className={`hbar-btn ${stage.explodedView ? 'active' : ''}`}
            onClick={() => onStageChange({ ...stage, explodedView: !stage.explodedView })}
            title="Toggle Exploded Assembly View"
          >
            <Layers size={13} />
            <span>Explode</span>
          </button>
          <button
            type="button"
            className={`hbar-btn ${stage.showAxes ? 'active' : ''}`}
            onClick={() => onStageChange({ ...stage, showAxes: !stage.showAxes })}
            title="Toggle World XYZ Coordinate Axes"
          >
            <Axis3d size={13} />
            <span>Axes</span>
          </button>
          <button
            type="button"
            className={`hbar-btn ${stage.autoSpin ? 'active' : ''}`}
            onClick={() => onStageChange({ ...stage, autoSpin: !stage.autoSpin })}
            title="Toggle Turntable Auto-Spin Camera"
          >
            <RefreshCw size={13} />
            <span>Spin</span>
          </button>
          <button
            type="button"
            className={`hbar-btn ${stage.theme === 'light' ? 'active' : ''}`}
            onClick={() =>
              onStageChange({
                ...stage,
                theme: stage.theme === 'dark' ? 'light' : 'dark',
              })
            }
            title="Toggle Dark / Light Studio Environment"
          >
            {stage.theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span>{stage.theme === 'dark' ? 'Light Stage' : 'Dark Stage'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
