import React, { useMemo } from 'react';
import { Code2, Play, Sparkles, Terminal, Trash2, X } from 'lucide-react';
import {
  type ScriptLanguage,
  UNIVERSAL_SCRIPT_TEMPLATES,
  detectScriptLanguage,
} from '../engines/project/universalScriptEngine';
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

const SNIPPETS_BY_LANG: Record<
  ScriptLanguage,
  Array<{ label: string; title: string; snippet: string }>
> = {
  javascript: [
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
  ],
  python: [
    {
      label: '+ 3D Hardware (.py)',
      title: 'Spawn a 3D Robotics/Electronics hardware board in Python',
      snippet: `\nhw_id = outerflow.spawn_part('arduino-uno-r3', name='Python Uno R3', pos=[0, 1.8, 0], density=2700)\n`,
    },
    {
      label: '+ CSG Solid (.py)',
      title: 'Machine a 3D CSG boolean part in Python',
      snippet: `\nblock = design.box(1.8, 1.1, 1.2)\nhole = design.rotate(design.cylinder(0.38, 1.6), math.pi / 2, 0, 0)\nmachined = design.paint(design.subtract(block, hole), '#38bdf8')\ndesign.spawn_body(machined, name='Python CSG Housing', pos=[0, 2.2, 0], density=7800)\n`,
    },
    {
      label: '+ Motor Joint (.py)',
      title: 'Connect two bodies with a motorized revolute hinge in Python',
      snippet: `\njid = outerflow.add_joint(name='Servo Drive', kind='revolute', body_a=mount_id, body_b=rotor_id, axis=[0, 0, 1], motor_speed=3.5, motor_max_force=28)\n`,
    },
    {
      label: '+ def on_step (.py)',
      title: 'Define a 60Hz closed-loop Python controller callback',
      snippet: `\ndef on_step(t, api):\n  api.log_metric('pyWave', math.sin(t * 3.0))\n`,
    },
    {
      label: '+ 3D Bench Wire (.py)',
      title: 'Wire the 3D Electronics Workbench in Python',
      snippet: `\nouterflow.set_mode('electronics')\nbench.set_board('esp32-devkit-v1')\nmod = bench.add_module('oled-ssd1306', pos=[1.4, 0.08, 0.2])\nbench.wire('board', 'D21', mod, 'SDA', '#22d3ee')\nbench.wire('board', 'D22', mod, 'SCL', '#facc15')\n`,
    },
  ],
  cpp: [
    {
      label: '+ 3D Hardware (C++)',
      title: 'Spawn a 3D Robotics/Electronics hardware board in C++',
      snippet: `\n  auto hwId = outerflow::spawnPart("arduino-uno-r3", { name: "C++ Uno R3", pos: {0.0f, 1.8f, 0.0f}, density: 2700.0f });\n`,
    },
    {
      label: '+ CSG Solid (C++)',
      title: 'Machine a 3D CSG boolean part in C++',
      snippet: `\n  auto block = design::box(1.8f, 1.1f, 1.2f);\n  auto hole = design::rotate(design::cylinder(0.38f, 1.6f), HALF_PI, 0.0f, 0.0f);\n  auto machined = design::paint(design::subtract(block, hole), "#38bdf8");\n  design::spawnBody(machined, { name: "C++ CSG Housing", pos: {0.0f, 2.2f, 0.0f}, density: 7800.0f });\n`,
    },
    {
      label: '+ Motor Joint (C++)',
      title: 'Connect two bodies with a motorized revolute hinge in C++',
      snippet: `\n  auto jid = outerflow::addJoint({ name: "C++ Servo", kind: "revolute", bodyA: baseId, bodyB: turretId, axis: {0.0f, 1.0f, 0.0f}, motorSpeed: 3.5f, motorMaxForce: 28.0f });\n`,
    },
    {
      label: '+ void loop() (C++)',
      title: 'Add a 60Hz C++ / Arduino loop(float t, StepApi& api) callback',
      snippet: `\nvoid loop(float t, StepApi& api) {\n  digitalWrite(13, (std::sin(t * 5.0f) >= 0.0f) ? HIGH : LOW);\n  api.logMetric("cppWave", std::sin(t * 2.5f));\n}\n`,
    },
  ],
};

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
  const activeLanguage = useMemo<ScriptLanguage>(() => detectScriptLanguage(code), [code]);

  if (!open) return null;

  const allTemplates = [
    ...UNIVERSAL_SCRIPT_TEMPLATES.map((t) => ({
      id: t.id,
      name: `★ ${t.name}`,
      language: t.language ?? ('javascript' as ScriptLanguage),
      code: t.code,
    })),
    ...SCRIPT_TEMPLATES.map((t) => ({
      id: t.id,
      name: `[JS] ${t.name}`,
      language: 'javascript' as ScriptLanguage,
      code: t.code,
    })),
  ];

  const handleSwitchLanguage = (targetLang: ScriptLanguage) => {
    if (targetLang === activeLanguage) return;
    const defaultTpl =
      UNIVERSAL_SCRIPT_TEMPLATES.find((t) => (t.language ?? 'javascript') === targetLang) ??
      UNIVERSAL_SCRIPT_TEMPLATES[0];
    onCodeChange(defaultTpl.code);
    onRun(defaultTpl.code);
  };

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

  const activeSnippets = SNIPPETS_BY_LANG[activeLanguage] ?? SNIPPETS_BY_LANG.javascript;

  return (
    <section className="telemetry-drawer" aria-label="Programmable Engineering Script IDE">
      <div
        className="telemetry-header"
        style={{
          gap: 8,
          flexWrap: 'wrap',
          height: 'auto',
          minHeight: 34,
          padding: '4px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Code2 size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: 11.5 }}>Script IDE</span>

          {/* Language Selector Pills: JavaScript | Python | C++ / Arduino */}
          <div
            role="group"
            aria-label="Script Language Selector"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '2px 4px',
              borderRadius: 6,
              border: '1px solid var(--border)',
            }}
          >
            {(
              [
                { id: 'javascript', label: 'JS (ES6)' },
                { id: 'python', label: 'Python (.py)' },
                { id: 'cpp', label: 'C++ / Arduino (.cpp)' },
              ] as Array<{ id: ScriptLanguage; label: string }>
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                className={`cat-pill ${activeLanguage === lang.id ? 'active' : ''}`}
                style={{ padding: '2px 8px', fontSize: 10.5 }}
                onClick={() => handleSwitchLanguage(lang.id)}
                title={`Switch Script IDE to ${lang.label}`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Script Template"
            className="gravity-select-mini"
            style={{ minWidth: 225 }}
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
              Load JS / Python / C++ Template...
            </option>
            {allTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {activeSnippets.map((s) => (
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

      <div className="telemetry-body" style={{ height: 215 }}>
        <div style={{ flex: 1.75, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            placeholder={
              activeLanguage === 'python'
                ? '# Write Python (.py) using outerflow.*, design.*, bench.*, def on_step(t, api): ...'
                : activeLanguage === 'cpp'
                ? '// Write C++ / Arduino (.cpp / .ino) using void setup(), void loop(float t, StepApi& api), design::*, outerflow::* ...'
                : '// Write JavaScript (ES6+) using outerflow.*, design.*, world.*, and bench.* ...'
            }
          />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 230,
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
              Console ({activeLanguage.toUpperCase()})
            </span>
            <span>Ctrl+Enter to Run</span>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="console-box" style={{ flex: 1, maxHeight: 'none' }}>
            {logs.length > 0
              ? logs.map((line, i) => <div key={i}>&gt; {line}</div>)
              : `> Ready (${activeLanguage.toUpperCase()}). Write JS, Python, or C++ / Arduino and press Build & Run.`}
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
              {activeLanguage === 'python'
                ? 'Python (.py) Syntax Supported:'
                : activeLanguage === 'cpp'
                ? 'C++ / Arduino (.cpp / .ino) Syntax Supported:'
                : 'JavaScript (ES6+) Namespaces:'}
            </div>
            {activeLanguage === 'python' ? (
              <>
                <code>design.box/gear/library/union/subtract/spawn_body</code>
                <br />
                <code>outerflow.spawn_part/spawn_box/add_joint(k=v)</code>
                <br />
                <code>def on_step(t, api): api.set_motor(...)</code>
              </>
            ) : activeLanguage === 'cpp' ? (
              <>
                <code>void setup() &#123; design::subtract(...); &#125;</code>
                <br />
                <code>void loop(float t, StepApi&amp; api) &#123; ... &#125;</code>
                <br />
                <code>pinMode / digitalWrite / analogWrite / Serial</code>
              </>
            ) : (
              <>
                <code>design.box/gear/library/union/subtract/spawnBody</code>
                <br />
                <code>outerflow.spawnPart/spawnBox/addJoint/onStep</code>
                <br />
                <code>bench.setBoard/addModule/wire/setExploded</code>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
