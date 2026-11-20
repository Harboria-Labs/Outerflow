import React, { useEffect, useState } from 'react';
import {
  Activity,
  Box,
  ChevronDown,
  Code2,
  Command,
  FilePlus2,
  GitBranch,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { StudioMode, TelemetrySample } from '../types/studio';
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
  onResetSim: () => void;
  onNewBlankProject: () => void;
  onSpawnLibraryPart: (partId: string) => void;
  onAddSystemGraphElement: (def: UnifiedElementDefinition) => void;
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
  onResetSim,
  onNewBlankProject,
  onSpawnLibraryPart,
  onAddSystemGraphElement,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  // Global keyboard shortcut: Ctrl+K / Cmd+K toggles the Dynamic Island Command & Element Launcher
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
      className={`dynamic-island-container ${expanded ? 'expanded' : ''}`}
      aria-label="Outerflow Dynamic Island Command & Telemetry Hub"
    >
      {/* Collapsed / Header Pill */}
      <div className="dynamic-island-pill">
        <button
          type="button"
          className="dynamic-island-status-btn"
          onClick={onToggleRun}
          title={running ? 'Pause Active Engine Execution' : 'Start Active Engine Execution'}
        >
          <span className={`island-pulse-dot ${running ? 'live' : 'idle'}`} />
          {running ? <Pause size={11} /> : <Play size={11} />}
          <span>{running ? 'LIVE' : 'IDLE'}</span>
        </button>

        <span className="island-divider" />

        <div
          className="dynamic-island-metrics"
          onClick={() => setExpanded((e) => !e)}
          title="Click or press Ctrl+K to expand Dynamic Island Command & Element Launcher"
        >
          <span className="island-metric">
            <strong>{simTime.toFixed(1)}s</strong>
          </span>
          <span className="island-metric">
            <strong>{fps}</strong> fps
          </span>
          <span className="island-metric hide-sm">
            <strong>{entitiesCount}</strong> bodies · <strong>{cadCount}</strong> CAD ·{' '}
            <strong>{graphNodesCount}</strong> nodes
          </span>
          {latestTelemetry && (
            <span className="island-metric hide-md" style={{ color: '#38bdf8' }}>
              <strong>{latestTelemetry.totalEnergy.toFixed(1)}</strong> J
            </span>
          )}
        </div>

        <span className="island-divider" />

        <div className="dynamic-island-quick-actions">
          <button
            type="button"
            className="island-mini-btn"
            onClick={onNewBlankProject}
            title="Start Empty Project (Clear Template & Construct from Scratch)"
          >
            <FilePlus2 size={11} />
            <span className="hide-sm">Empty</span>
          </button>

          <button
            type="button"
            className={`island-mini-btn ${mode === 'system' ? 'active' : ''}`}
            onClick={() => onModeChange(mode === 'system' ? 'physics' : 'system')}
            title="Toggle Multidisciplinary System Graph & 9-Discipline Element Architecture"
          >
            <GitBranch size={11} />
            <span className="hide-sm">Graph</span>
          </button>

          <button
            type="button"
            className={`island-mini-btn ${scriptOpen ? 'active' : ''}`}
            onClick={onToggleScript}
            title="Toggle Programmable Engineering Script IDE (JS / Python / C++)"
          >
            <Code2 size={11} />
            <span className="hide-sm">IDE</span>
          </button>

          <button
            type="button"
            className="island-expand-trigger"
            onClick={() => setExpanded((e) => !e)}
            title="Expand Command Palette & 9-Discipline Element Launcher (Ctrl+K)"
          >
            <Command size={11} />
            <span className="hide-md">Ctrl+K</span>
            <ChevronDown
              size={11}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.18s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Expanded Dynamic Island Drawer */}
      {expanded && (
        <div className="dynamic-island-drawer">
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
              <span>Harboria Labs Multidisciplinary Construction Studio</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
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
              <button
                type="button"
                className="cat-pill"
                onClick={() => {
                  onResetSim();
                  setExpanded(false);
                }}
              >
                <RotateCcw size={10} style={{ display: 'inline', marginRight: 3 }} />
                Reset Solvers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
