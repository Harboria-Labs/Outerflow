import React from 'react';
import { Code2, Play, Sparkles, Terminal, Trash2, X } from 'lucide-react';
import { UNIVERSAL_SCRIPT_TEMPLATES } from '../engines/project/universalScriptEngine';
import { SCRIPT_TEMPLATES } from '../engines/experiments/scriptRunner';

interface ScriptConsoleDrawerProps {
  open: boolean;
  onClose: () => void;
  code: string;
  onCodeChange: (next: string) => void;
  onRun: (codeOverride?: string) => void;
  logs: string[];
  error: string | null;
  onClearLogs: () => void;
}

const QUICK_SNIPPETS: Array<{ label: string; title: string; snippet: string }> = [
  {
    label: '+ 3D Hardware',
    title: 'Spawn any 3D Robotics/Electronics part into physics',
    snippet: `\nconst hw = outerflow.spawnPart('arduino-uno-r3', {\n  name: 'Arduino Controller',\n  pos: [0, 1.8, 0],\n  density: 2700\n});\n`,
  },
  {
    label: '+ CSG Solid',
    title: 'Machine a 3D CSG boolean part and spawn as a physical body',
    snippet: `\nconst block = design.box(1.8, 1.1, 1.2);\nconst hole = design.rotate(design.cylinder(0.38, 1.6), Math.PI / 2, 0, 0);\nconst machined = design.paint(design.subtract(block, hole), '#38bdf8');\ndesign.spawnBody(machined, { name: 'CSG Housing', pos: [0, 2.2, 0], density: 7800 });\n`,
  },
  {
    label: '+ Motor Joint',
    title: 'Connect two bodies with a motorized revolute hinge or spring',
    snippet: `\nconst jid = outerflow.addJoint({\n  name: 'Servo Drive',\n  kind: 'revolute',\n  bodyA: 'body-1',\n  bodyB: 'body-2',\n  axis: [0, 0, 1],\n  motorSpeed: 3.5,\n  motorMaxForce: 28\n});\n`,
  },
  {
    label: '+ onStep Loop',
    title: 'Run 60Hz closed-loop control, forces, motor commands & telemetry',
    snippet: `\nouterflow.onStep((t, api) => {\n  api.logMetric('simWave', Math.sin(t * 3));\n});\n`,
  },
  {
    label: '+ 3D Bench Wire',
    title: 'Programmatically wire boards and modules on the 3D Electronics Workbench',
    snippet: `\nouterflow.setMode('electronics');\nbench.setBoard('arduino-uno-r3');\nconst mod = bench.addModule('oled-ssd1306', { pos: [1.4, 0.08, 0.2] });\nbench.wire('board', 'A4', mod, 'SDA', '#22d3ee');\nbench.wire('board', 'A5', mod, 'SCL', '#facc15');\n`,
  },
  {
    label: '+ Equation',
    title: 'Add a linked parameter or reactive formula to the project',
    snippet: `\nouterflow.addParameter({\n  name: 'Kinetic Ratio',\n  symbol: 'k_ratio',\n  unit: 'N/kg',\n  formula: '160 / max(0.5, mass)',\n  isCalculated: true\n});\n`,
  },
];

export const ScriptConsoleDrawer: React.FC<ScriptConsoleDrawerProps> = ({
  open,
  onClose,
  code,
  onCodeChange,
  onRun,
  logs,
  error,
  onClearLogs,
}) => {
  if (!open) return null;

  const allTemplates = [
    ...UNIVERSAL_SCRIPT_TEMPLATES.map((t) => ({
      id: t.id,
      name: `★ ${t.name}`,
      code: t.code,
    })),
    ...SCRIPT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
    })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${code.slice(0, start)}  ${code.slice(end)}`;
      onCodeChange(next);
      window.requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <section className="telemetry-drawer" aria-label="Programmable Engineering Script IDE">
      <div className="telemetry-header" style={{ gap: 8, flexWrap: 'wrap', height: 'auto', minHeight: 34, padding: '4px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Code2 size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: 11.5 }}>
            Programmable Engineering Script IDE
          </span>
          <select
            aria-label="Script Template"
            className="gravity-select-mini"
            style={{ minWidth: 210 }}
            defaultValue=""
            onChange={(e) => {
              const found = allTemplates.find((t) => t.id === e.target.value);
              if (found) {
                onCodeChange(found.code);
                onRun(found.code);
              }
            }}
          >
            <option value="" disabled>
              Load Engineering Script Template...
            </option>
            {allTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {QUICK_SNIPPETS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="cat-pill"
              title={s.title}
              onClick={() => onCodeChange(`${code.trimEnd()}\n${s.snippet}`)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <button
            type="button"
            className="top-btn primary"
            style={{ height: 25, padding: '0 10px' }}
            onClick={() => onRun()}
            title="Compile & Run Script (Ctrl+Enter)"
          >
            <Play size={12} />
            <span>Build &amp; Run (Ctrl+Enter)</span>
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={onClearLogs}
            title="Clear Console Output"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={onClose}
            title="Close Script IDE"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="telemetry-body" style={{ height: 210 }}>
        <div style={{ flex: 1.7, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <textarea
            aria-label="Engineering Script Editor"
            className="input-code"
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              resize: 'none',
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
            spellCheck={false}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="// Write JS using outerflow.*, design.*, world.*, and bench.* ..."
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: '#a1a1aa',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <Terminal size={12} color="#34d399" />
              Console &amp; API Reference
            </span>
            <span>Ctrl+Enter to Run</span>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="console-box" style={{ flex: 1, maxHeight: 'none' }}>
            {logs.length > 0
              ? logs.map((line, i) => <div key={i}>&gt; {line}</div>)
              : '> Ready. Use outerflow.*, design.*, or bench.* and press Build & Run.'}
          </div>

          <div
            style={{
              fontSize: 10,
              color: '#94a3b8',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '5px 8px',
              lineHeight: 1.4,
            }}
          >
            <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>
              <Sparkles size={10} style={{ display: 'inline', marginRight: 4 }} />
              Unified Namespaces:
            </div>
            <code>design.box/gear/library/union/subtract/spawnBody</code>
            <br />
            <code>outerflow.spawnPart/spawnBox/addJoint/addParameter/onStep</code>
            <br />
            <code>bench.setBoard/addModule/wire/setExploded</code>
          </div>
        </div>
      </div>
    </section>
  );
};
