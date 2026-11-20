import React, { useEffect, useRef, useState } from 'react';
import { Activity, Download, GitCompare, Play, Trash2, X } from 'lucide-react';
import type {
  DesignExperimentRun,
  SweepTrialResult,
  TelemetrySample,
} from '../types/studio';

interface TelemetryDrawerProps {
  open: boolean;
  onClose: () => void;
  samples: TelemetrySample[];
  sweepResults: SweepTrialResult[];
  designRuns?: DesignExperimentRun[];
  onRunDesignVariant?: () => void;
  onClearDesignRuns?: () => void;
  onClearTelemetry: () => void;
  onExportTelemetryCSV: () => void;
  onExportSweepCSV: () => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  open,
  onClose,
  samples,
  sweepResults,
  designRuns = [],
  onRunDesignVariant,
  onClearDesignRuns,
  onClearTelemetry,
  onExportTelemetryCSV,
  onExportSweepCSV,
}) => {
  const [tab, setTab] = useState<'live' | 'sweep' | 'compare'>('live');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (sweepResults.length > 0) {
      setTab('sweep');
    }
  }, [sweepResults]);

  useEffect(() => {
    if (designRuns.length > 0) {
      setTab('compare');
    }
  }, [designRuns.length]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 150;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const pad = { l: 42, r: 14, t: 18, b: 22 };
    const pw = Math.max(20, w - pad.l - pad.r);
    const ph = Math.max(20, h - pad.t - pad.b);

    if (tab === 'live') {
      if (samples.length < 2) {
        ctx.fillStyle = '#71717a';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('Press Play in the viewport to stream telemetry...', 16, h / 2);
        return;
      }

      const customKeys = Object.keys(samples[samples.length - 1]?.customMetrics ?? {});
      const series = [
        { label: 'KE (J)', color: '#2680eb', values: samples.map((s) => s.kineticEnergy) },
        { label: 'PE (J)', color: '#f59e0b', values: samples.map((s) => s.potentialEnergy) },
        { label: 'Speed', color: '#34d399', values: samples.map((s) => s.selectedSpeed) },
      ];

      if (customKeys[0]) {
        series.push({
          label: customKeys[0],
          color: '#a78bfa',
          values: samples.map((s) => s.customMetrics[customKeys[0]] ?? 0),
        });
      }

      let minV = 0;
      let maxV = 1;
      for (const s of series) {
        for (const v of s.values) {
          if (Number.isFinite(v)) {
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
          }
        }
      }
      const span = Math.max(1e-3, maxV - minV);

      for (const s of series) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        s.values.forEach((v, idx) => {
          const x = pad.l + (idx / (s.values.length - 1)) * pw;
          const y = pad.t + ph - ((v - minV) / span) * ph;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#71717a';
      ctx.fillText(maxV.toFixed(1), 4, pad.t + 6);
      ctx.fillText(minV.toFixed(1), 4, pad.t + ph);

      let lx = pad.l;
      for (const s of series) {
        ctx.fillStyle = s.color;
        ctx.fillText(`● ${s.label}`, lx, 12);
        lx += 86;
      }
    } else if (tab === 'sweep') {
      if (sweepResults.length === 0) {
        ctx.fillStyle = '#71717a';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('Run a Parameter Sweep in Experiments mode to plot results...', 16, h / 2);
        return;
      }

      const xs = sweepResults.map((r) => r.paramValue);
      const ys1 = sweepResults.map((r) => r.primaryMetricValue);
      const ys2 = sweepResults.map((r) => r.secondaryMetricValue);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const allY = [...ys1, ...ys2];
      const minY = Math.min(0, ...allY);
      const maxY = Math.max(1, ...allY);
      const spanX = Math.max(1e-4, maxX - minX);
      const spanY = Math.max(1e-4, maxY - minY);

      const drawCurve = (vals: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        vals.forEach((v, i) => {
          const x = pad.l + ((xs[i] - minX) / spanX) * pw;
          const y = pad.t + ph - ((v - minY) / spanY) * ph;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = color;
        vals.forEach((v, i) => {
          const x = pad.l + ((xs[i] - minX) / spanX) * pw;
          const y = pad.t + ph - ((v - minY) / spanY) * ph;
          ctx.beginPath();
          ctx.arc(x, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        });
      };

      drawCurve(ys1, '#2680eb');
      drawCurve(ys2, '#f59e0b');

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#71717a';
      ctx.fillText(maxY.toFixed(1), 4, pad.t + 6);
      ctx.fillText(minY.toFixed(1), 4, pad.t + ph);
      ctx.fillStyle = '#2680eb';
      ctx.fillText(`● ${sweepResults[0].primaryMetricName}`, pad.l, 12);
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`● ${sweepResults[0].secondaryMetricName}`, pad.l + 150, 12);
    } else {
      if (designRuns.length === 0) {
        ctx.fillStyle = '#71717a';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('Click "+ Run Variant" to snapshot parameters & compare Design A vs B...', 16, h / 2);
        return;
      }

      let maxT = 1;
      let minV = 0;
      let maxV = 1;
      for (const r of designRuns) {
        for (const s of r.samples) {
          if (s.time > maxT) maxT = s.time;
          if (s.selectedSpeed < minV) minV = s.selectedSpeed;
          if (s.selectedSpeed > maxV) maxV = s.selectedSpeed;
        }
      }
      const spanY = Math.max(0.2, maxV - minV);

      let lx = pad.l;
      ctx.font = '10px JetBrains Mono, monospace';
      for (const r of designRuns) {
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        r.samples.forEach((s, idx) => {
          const x = pad.l + (s.time / Math.max(0.1, maxT)) * pw;
          const y = pad.t + ph - ((s.selectedSpeed - minV) / spanY) * ph;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = r.color;
        ctx.fillText(`● ${r.label} (m=${r.summaryMetrics.totalMassKg.toFixed(1)}kg)`, lx, 12);
        lx += 135;
      }

      ctx.fillStyle = '#71717a';
      ctx.fillText(`${maxV.toFixed(1)} m/s`, 4, pad.t + 6);
      ctx.fillText(`${minV.toFixed(1)}`, 4, pad.t + ph);
    }
  }, [open, tab, samples, sweepResults, designRuns]);

  if (!open) return null;

  const latest = samples[samples.length - 1];

  return (
    <section className="telemetry-drawer">
      <div className="telemetry-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={13} color="#2680eb" />
          <span style={{ fontWeight: 600, fontSize: 11.5 }}>Telemetry &amp; Sweep Analyzer</span>
          {latest && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#a1a1aa' }}>
              KE {latest.kineticEnergy.toFixed(2)} J · PE {latest.potentialEnergy.toFixed(2)} J
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button
            type="button"
            className={`hud-btn ${tab === 'live' ? 'active' : ''}`}
            onClick={() => setTab('live')}
          >
            Live ({samples.length})
          </button>
          <button
            type="button"
            className={`hud-btn ${tab === 'sweep' ? 'active' : ''}`}
            onClick={() => setTab('sweep')}
          >
            Sweep ({sweepResults.length})
          </button>
          <button
            type="button"
            className={`hud-btn ${tab === 'compare' ? 'active' : ''}`}
            onClick={() => setTab('compare')}
          >
            <GitCompare size={11} />
            <span>Compare ({designRuns.length})</span>
          </button>
          {onRunDesignVariant && (
            <button
              type="button"
              className="hud-btn active"
              onClick={() => {
                setTab('compare');
                onRunDesignVariant();
              }}
              title="Snapshot current parameters and run variant benchmark"
            >
              <Play size={11} />
              <span>+ Run Variant</span>
            </button>
          )}
          <button
            type="button"
            className="mini-icon-btn"
            onClick={tab === 'live' ? onExportTelemetryCSV : onExportSweepCSV}
            title="Export CSV"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={() => {
              if (tab === 'compare' && onClearDesignRuns) onClearDesignRuns();
              else onClearTelemetry();
            }}
            title={tab === 'compare' ? 'Clear Comparison Runs' : 'Clear Telemetry'}
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={onClose}
            title="Close Drawer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="telemetry-body">
        <div className="telemetry-chart-wrap">
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        <div className="telemetry-table-wrap">
          {tab === 'compare' && designRuns.length > 0 ? (
            <table className="sweep-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Mass (kg)</th>
                  <th>Peak Spd</th>
                  <th>Peak KE</th>
                  <th>Disp (m)</th>
                </tr>
              </thead>
              <tbody>
                {designRuns.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: r.color, fontWeight: 600 }}>{r.label}</td>
                    <td>{r.summaryMetrics.totalMassKg.toFixed(2)}</td>
                    <td>{r.summaryMetrics.peakSpeed.toFixed(2)}</td>
                    <td>{r.summaryMetrics.peakKineticEnergy.toFixed(1)}</td>
                    <td>{r.summaryMetrics.maxDisplacement.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'sweep' && sweepResults.length > 0 ? (
            <table className="sweep-table">
              <thead>
                <tr>
                  <th>{sweepResults[0].paramName}</th>
                  <th>{sweepResults[0].primaryMetricName}</th>
                  <th>{sweepResults[0].secondaryMetricName}</th>
                </tr>
              </thead>
              <tbody>
                {sweepResults.map((r) => (
                  <tr key={r.trialIndex}>
                    <td>{r.paramValue}</td>
                    <td>{r.primaryMetricValue}</td>
                    <td>{r.secondaryMetricValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="sweep-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>KE (J)</th>
                  <th>PE (J)</th>
                  <th>Sel Y</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {samples
                  .slice(-12)
                  .reverse()
                  .map((s, idx) => (
                    <tr key={idx}>
                      <td>{s.time.toFixed(2)}s</td>
                      <td>{s.kineticEnergy.toFixed(2)}</td>
                      <td>{s.potentialEnergy.toFixed(2)}</td>
                      <td>{s.selectedPosY.toFixed(2)}</td>
                      <td>{s.selectedSpeed.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};
