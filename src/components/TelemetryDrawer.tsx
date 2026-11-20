import React, { useEffect, useRef, useState } from 'react';
import { Activity, Download, Trash2, X } from 'lucide-react';
import type { SweepTrialResult, TelemetrySample } from '../types/studio';

interface TelemetryDrawerProps {
  open: boolean;
  onClose: () => void;
  samples: TelemetrySample[];
  sweepResults: SweepTrialResult[];
  onClearTelemetry: () => void;
  onExportTelemetryCSV: () => void;
  onExportSweepCSV: () => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  open,
  onClose,
  samples,
  sweepResults,
  onClearTelemetry,
  onExportTelemetryCSV,
  onExportSweepCSV,
}) => {
  const [tab, setTab] = useState<'live' | 'sweep'>('live');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (sweepResults.length > 0) {
      setTab('sweep');
    }
  }, [sweepResults]);

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
    } else {
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
    }
  }, [open, tab, samples, sweepResults]);

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
            className="mini-icon-btn"
            onClick={tab === 'live' ? onExportTelemetryCSV : onExportSweepCSV}
            title="Export CSV"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={onClearTelemetry}
            title="Clear Telemetry"
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
          {tab === 'sweep' && sweepResults.length > 0 ? (
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
