import React from 'react';
import { X } from 'lucide-react';
import type { CircuitSchematic, CircuitSolveResult } from '../types/studio';

interface ElectronicsSchematicViewProps {
  open: boolean;
  schematic: CircuitSchematic;
  solved: CircuitSolveResult;
  selectedCompId: string | null;
  onSelectComp: (id: string) => void;
  onToggleSwitch: (id: string) => void;
  onClose: () => void;
}

export const ElectronicsSchematicView: React.FC<ElectronicsSchematicViewProps> = ({
  open,
  schematic,
  solved,
  selectedCompId,
  onSelectComp,
  onToggleSwitch,
  onClose,
}) => {
  if (!open) return null;
  const byId = new Map(schematic.components.map((c) => [c.id, c]));

  return (
    <div className="schematic-overlay-panel">
      <div className="schematic-header">
        <span style={{ fontWeight: 600, fontSize: 11.5 }}>
          2D Schematic &amp; Live Probes — {schematic.name}
        </span>
        <button type="button" className="mini-icon-btn" onClick={onClose} title="Hide 2D Schematic">
          <X size={14} />
        </button>
      </div>

      <svg viewBox="0 0 680 390" className="schematic-svg">
        <defs>
          <pattern id="pcb-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#18181f" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="680" height="390" fill="#09090d" />
        <rect width="680" height="390" fill="url(#pcb-grid)" />

        {/* Wires & Live Voltage Probes */}
        {schematic.wires.map((w) => {
          const c1 = byId.get(w.fromCompId);
          const c2 = byId.get(w.toCompId);
          if (!c1 || !c2) return null;
          const x1 = c1.x + (w.fromPin === 'A' ? -24 : 24);
          const y1 = c1.y;
          const x2 = c2.x + (w.toPin === 'A' ? -24 : 24);
          const y2 = c2.y;
          const v = solved.nodeVoltages[w.nodeName] ?? 0;
          const active = Math.abs(v) > 0.1;

          return (
            <g key={w.id}>
              <polyline
                points={`${x1},${y1} ${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                fill="none"
                stroke={active ? '#22d3ee' : '#3f3f46'}
                strokeWidth="2.2"
                strokeDasharray={active ? '6 4' : undefined}
              />
              <rect
                x={(x1 + x2) / 2 - 26}
                y={(y1 + y2) / 2 - 9}
                width="52"
                height="16"
                rx="4"
                fill="#111116"
                stroke="#27272e"
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 + 2}
                textAnchor="middle"
                fill={active ? '#38bdf8' : '#71717a'}
                fontFamily="monospace"
                fontSize="9.5"
              >
                {v.toFixed(2)}V
              </text>
            </g>
          );
        })}

        {/* Components */}
        {schematic.components.map((c) => {
          const sel = c.id === selectedCompId;
          const iMa = (solved.branchCurrents[c.id] ?? 0) * 1000;
          const ledLit = (solved.ledBrightness[c.id] ?? 0) > 0.1;

          return (
            <g
              key={c.id}
              transform={`translate(${c.x}, ${c.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                onSelectComp(c.id);
                if (c.kind === 'switch') onToggleSwitch(c.id);
              }}
            >
              <rect
                x="-38"
                y="-26"
                width="76"
                height="52"
                rx="7"
                fill="#141419"
                stroke={sel ? '#2680eb' : ledLit ? c.color || '#22d3ee' : '#2e2e36'}
                strokeWidth={sel ? 2 : 1.3}
              />
              <text
                x="0"
                y="-8"
                textAnchor="middle"
                fill="#f4f4f5"
                fontFamily="sans-serif"
                fontSize="10.5"
                fontWeight="600"
              >
                {c.name}
              </text>
              <text
                x="0"
                y="6"
                textAnchor="middle"
                fill="#a1a1aa"
                fontFamily="monospace"
                fontSize="9"
              >
                {c.kind === 'switch'
                  ? c.closed
                    ? 'CLOSED'
                    : 'OPEN'
                  : c.kind === 'battery' || c.kind === 'mcu'
                  ? `${c.value}V`
                  : c.kind === 'resistor' || c.kind === 'motor'
                  ? `${c.value}Ω`
                  : c.kind === 'capacitor'
                  ? `${c.value}µF`
                  : `Vf ${c.value}V`}
              </text>
              <text
                x="0"
                y="19"
                textAnchor="middle"
                fill={Math.abs(iMa) > 0.05 ? '#34d399' : '#71717a'}
                fontFamily="monospace"
                fontSize="9"
              >
                {iMa.toFixed(1)} mA
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
