import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bookmark,
  Box,
  ChevronUp,
  Circle,
  Code2,
  Command,
  FilePlus2,
  GitBranch,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  StepBack,
  StepForward,
} from 'lucide-react';
import type {
  SimulationCheckpoint,
  StudioMode,
  TelemetrySample,
  Vec3,
} from '../types/studio';
import {
  DISCIPLINE_META,
  UNIFIED_ELEMENT_REGISTRY,
  type UnifiedElementDefinition,
} from '../engines/project/systemGraphEngine';
import { PART_LIBRARY } from '../engines/cad/partsLibrary';

interface DynamicIslandHUDProps {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  running: boolean;
  simTime: number;
  fps: number;
  entitiesCount: number;
  cadCount: number;
  graphNodesCount: number;
  latestTelemetry?: TelemetrySample;
  scriptOpen: boolean;
  onToggleScript: () => void;
  telemetryOpen: boolean;
  onToggleTelemetry: () => void;
  onToggleRun: () => void;
  onStep: () => void;
  onStepBack?: () => void;
  onResetSim: () => void;
  timeScale: number;
  onTimeScaleChange: (s: number) => void;
  gravity: Vec3;
  onGravityChange: (g: Vec3) => void;
  recording: boolean;
  onToggleRecord: () => void;
  recordedFramesCount: number;
  playbackIndex: number | null;
  onScrubFrame: (idx: number | null) => void;
  checkpoints?: SimulationCheckpoint[];
  onSaveCheckpoint?: () => void;
  onRestoreCheckpoint?: (cpId: string) => void;
  onNewBlankProject: () => void;
  onSpawnLibraryPart: (partId: string) => void;
  onAddSystemGraphElement: (def: UnifiedElementDefinition) => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const DynamicIslandHUD: React.FC<DynamicIslandHUDProps> = ({
  mode,
  onModeChange,
  running,
  simTime,
  fps,
  entitiesCount,
  cadCount,
  graphNodesCount,
  latestTelemetry,
  scriptOpen,
  onToggleScript,
  telemetryOpen,
  onToggleTelemetry,
  onToggleRun,
  onStep,
  onStepBack,
  onResetSim,
  timeScale,
  onTimeScaleChange,
  gravity,
  onGravityChange,
  recording,
  onToggleRecord,
  recordedFramesCount,
  playbackIndex,
  onScrubFrame,
  checkpoints = [],
  onSaveCheckpoint,
  onRestoreCheckpoint,
  onNewBlankProject,
  onSpawnLibraryPart,
  onAddSystemGraphElement,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  // Global keyboard shortcut: Ctrl+K / Cmd+K toggles the Bottom Dynamic Island Command & Element Launcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setExpanded((prev) => !prev);
      } else if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const gravityKey =
    Math.abs(gravity[1] + 9.81) < 0.05
      ? 'earth'
      : Math.abs(gravity[1] + 1.62) < 0.05
      ? 'moon'
      : Math.abs(gravity[1] + 3.72) < 0.05
      ? 'mars'
      : 'zerog';

  const q = query.trim().toLowerCase();

  const matchingSysElements = UNIFIED_ELEMENT_REGISTRY.filter(
    (d) =>
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.discipline.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q)
  ).slice(0, 5);

  const matching3DParts = PART_LIBRARY.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  ).slice(0, 5);

  return (
    <div
      className={`dynamic-island-container bottom-docked ${expanded ? 'expanded' : ''}`}
      aria-label="Outerflow Bottom Dynamic Island Transport & Command Hub"
    >
      {/* Expanded Command & 9-Discipline Launcher Drawer (opens UPWARD from the bottom island) */}
      {expanded && (
        <div className="dynamic-island-drawer upward">
          <div className="island-search-row">
            <Search size={13} color="#38bdf8" />
            <input
              type="text"
              className="island-search-input"
              placeholder="Search commands, 9-discipline system elements, 46 3D parts & hardware (Arduino, ESP32, PID, Bio, Gear)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="cat-pill"
              onClick={() => {
                onNewBlankProject();
                setExpanded(false);
              }}
            >
              <FilePlus2 size={11} style={{ display: 'inline', marginRight: 4 }} />
              New Blank Project
            </button>
          </div>

          <div className="island-columns">
            {/* Column 1: 9-Discipline System Graph Elements */}
            <div className="island-col">
              <div className="island-col-title">
                <GitBranch size={11} color="#38bdf8" />
                <span>9-Discipline System Elements</span>
              </div>
              {matchingSysElements.map((def) => {
                const meta = DISCIPLINE_META[def.discipline];
                return (
                  <button
                    key={def.id}
                    type="button"
                    className="island-result-item"
                    onClick={() => {
                      onAddSystemGraphElement(def);
                      onModeChange('system');
                      setExpanded(false);
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="color-dot" style={{ background: meta.color }} />
                      <span>{def.name}</span>
                    </span>
                    <span className="hierarchy-tag" style={{ color: meta.color }}>
                      + {meta.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Column 2: 46 3D CAD & Robotics Hardware Models */}
            <div className="island-col">
              <div className="island-col-title">
                <Box size={11} color="#34d399" />
                <span>3D CAD &amp; Robotics Hardware (46)</span>
              </div>
              {matching3DParts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className="island-result-item"
                  onClick={() => {
                    onSpawnLibraryPart(part.id);
                    setExpanded(false);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="color-dot" style={{ background: part.defaultColor }} />
                    <span>{part.name}</span>
                  </span>
                  <span className="hierarchy-tag">+ Spawn 3D</span>
                </button>
              ))}
            </div>
          </div>

          <div className="island-footer-bar">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={11} color="#38bdf8" />
              <span>
                {entitiesCount} bodies · {cadCount} CAD · {graphNodesCount} graph nodes ·{' '}
                {fps} fps
                {latestTelemetry
                  ? ` · ${latestTelemetry.totalEnergy.toFixed(1)} J`
                  : ''}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className={`cat-pill ${mode === 'system' ? 'active' : ''}`}
                onClick={() => {
                  onModeChange(mode === 'system' ? 'physics' : 'system');
                  setExpanded(false);
                }}
              >
                <GitBranch size={10} style={{ display: 'inline', marginRight: 3 }} />
                System Graph
              </button>
              <button
                type="button"
                className={`cat-pill ${scriptOpen ? 'active' : ''}`}
                onClick={() => {
                  onToggleScript();
                  setExpanded(false);
                }}
              >
                <Code2 size={10} style={{ display: 'inline', marginRight: 3 }} />
                Script IDE
              </button>
              <button
                type="button"
                className={`cat-pill ${telemetryOpen ? 'active' : ''}`}
                onClick={() => {
                  onToggleTelemetry();
                  setExpanded(false);
                }}
              >
                <Activity size={10} style={{ display: 'inline', marginRight: 3 }} />
                Telemetry &amp; A/B Runs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Dynamic Island Pill: Unified Transport, Speed, Checkpoints, Gravity & Command Trigger */}
      <div className="dynamic-island-pill">
        <button
          type="button"
          className="play-pill-btn"
          onClick={onResetSim}
          title="Reset Simulation"
        >
          <RotateCcw size={13} />
        </button>

        {onStepBack && recordedFramesCount > 0 && (
          <button
            type="button"
            className="play-pill-btn"
            onClick={onStepBack}
            title="Step Back 1 Recorded Frame"
          >
            <StepBack size={13} />
          </button>
        )}

        <button
          type="button"
          className={`play-pill-btn ${running ? 'running' : 'active'}`}
          onClick={onToggleRun}
          title="Play / Pause Simulation (Space)"
        >
          <span className={`island-pulse-dot ${running ? 'live' : 'idle'}`} />
          {running ? <Pause size={12} /> : <Play size={12} />}
        </button>

        <button
          type="button"
          className="play-pill-btn"
          onClick={onStep}
          title="Step 1 Frame (1/60s)"
        >
          <StepForward size={13} />
        </button>

        {onSaveCheckpoint && (
          <button
            type="button"
            className="play-pill-btn"
            onClick={onSaveCheckpoint}
            title="Save Simulation Checkpoint at Current Time"
          >
            <Bookmark size={12} />
            <span className="hide-sm">+CP</span>
          </button>
        )}

        {checkpoints.slice(-2).map((cp) => (
          <button
            key={cp.id}
            type="button"
            className="play-pill-btn hide-md"
            onClick={() => onRestoreCheckpoint?.(cp.id)}
            title={`Restore ${cp.label} at ${cp.simTime.toFixed(2)}s`}
          >
            <span>
              {cp.label} {cp.simTime.toFixed(1)}s
            </span>
          </button>
        ))}

        <span className="island-divider" />

        {SPEED_OPTIONS.map((spd) => (
          <button
            key={spd}
            type="button"
            className={`play-pill-btn ${Math.abs(timeScale - spd) < 0.05 ? 'active' : ''}`}
            onClick={() => onTimeScaleChange(spd)}
          >
            {spd}x
          </button>
        ))}

        <span className="island-divider" />

        <button
          type="button"
          className={`play-pill-btn ${recording ? 'recording' : ''}`}
          onClick={onToggleRecord}
          title="Record Frames for Timeline Scrubbing"
        >
          <Circle size={10} fill={recording ? '#fb7185' : 'none'} />
          {recording && <span>{recordedFramesCount}</span>}
        </button>

        {recordedFramesCount > 1 && (
          <>
            <input
              type="range"
              className="studio-range"
              min={0}
              max={recordedFramesCount - 1}
              value={playbackIndex ?? recordedFramesCount - 1}
              onChange={(e) => onScrubFrame(Number(e.target.value))}
              style={{ width: 70 }}
              title="Scrub Recorded Frames"
            />
            {playbackIndex !== null && (
              <button
                type="button"
                className="play-pill-btn active"
                onClick={() => onScrubFrame(null)}
              >
                Live
              </button>
            )}
          </>
        )}

        <select
          aria-label="Gravity Preset"
          className="gravity-select-mini"
          value={gravityKey}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'earth') onGravityChange([0, -9.81, 0]);
            else if (v === 'moon') onGravityChange([0, -1.62, 0]);
            else if (v === 'mars') onGravityChange([0, -3.72, 0]);
            else onGravityChange([0, 0, 0]);
          }}
        >
          <option value="earth">Earth g</option>
          <option value="moon">Moon g</option>
          <option value="mars">Mars g</option>
          <option value="zerog">Zero-G</option>
        </select>

        <span className="playback-clock">{formatClock(simTime)}</span>

        <span className="island-divider" />

        <button
          type="button"
          className="island-expand-trigger"
          onClick={() => setExpanded((e) => !e)}
          title="Open 9-Discipline Element & 3D Part Launcher (Ctrl+K)"
        >
          <Command size={11} />
          <span className="hide-sm">+ Elements</span>
          <ChevronUp
            size={11}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.18s ease',
            }}
          />
        </button>
      </div>
    </div>
  );
};
