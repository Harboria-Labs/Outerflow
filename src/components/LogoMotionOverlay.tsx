import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Image as ImageIcon,
  Pause,
  Play,
  Printer,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import type { LogoStudioConfig, LogoVariant } from '../types/studio';
import {
  OuterflowLogoRenderer,
  computeIntroTimeline,
  createDefaultLogoConfig,
} from '../engines/brand/logoScene';
import { exportGLB, exportSTL } from '../engines/io/exporters';
import {
  downloadBlob,
  drawIntroOverlay2D,
  exportLogoSVG,
  printDesignSheet,
  recordLogoIntroVideo,
} from '../engines/io/mediaExporters';
import { OuterflowMark } from './OuterflowMark';
import {
  AccordionSection,
  SegmentedControl,
  StudioSlider,
  ToggleSwitch,
} from './StudioControls';

interface LogoMotionOverlayProps {
  viewMode: 'boot' | 'studio';
  config: LogoStudioConfig;
  onConfigChange: (next: LogoStudioConfig) => void;
  onSaveDefault: (cfg: LogoStudioConfig) => void;
  onFinish: () => void;
  onReplayBoot: () => void;
}

export const LogoMotionOverlay: React.FC<LogoMotionOverlayProps> = ({
  viewMode,
  config,
  onConfigChange,
  onSaveDefault,
  onFinish,
  onReplayBoot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<OuterflowLogoRenderer | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const [studioPlaying, setStudioPlaying] = useState(true);
  const [studioScrub, setStudioScrub] = useState<number | null>(null);
  const [showTextInStudio, setShowTextInStudio] = useState(true);
  const [progress, setProgress] = useState(viewMode === 'boot' ? 0 : 0.52);
  const [recordingPct, setRecordingPct] = useState<number | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const studioPlayingRef = useRef(studioPlaying);
  const studioScrubRef = useRef(studioScrub);
  studioPlayingRef.current = studioPlaying;
  studioScrubRef.current = studioScrub;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new OuterflowLogoRenderer(canvas, configRef.current);
    rendererRef.current = renderer;

    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas);

    let rafId = 0;
    const startTime = performance.now();
    let studioClock = 0;
    let lastNow = startTime;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      const cfg = configRef.current;

      if (viewMode === 'boot') {
        const elapsedSec = (now - startTime) / 1000;
        const p = Math.min(1, elapsedSec / Math.max(1.5, cfg.durationSec));
        setProgress(p);
        renderer.renderAt(elapsedSec, p);
        if (p >= 1) {
          cancelAnimationFrame(rafId);
          onFinish();
        }
      } else {
        if (studioPlayingRef.current && studioScrubRef.current === null) {
          studioClock += dt;
        }
        const scrubVal = studioScrubRef.current;
        if (scrubVal !== null) {
          setProgress(scrubVal);
          renderer.renderAt(scrubVal * cfg.durationSec, scrubVal);
        } else {
          setProgress(0.52);
          renderer.renderAt(studioClock, null);
        }
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [viewMode, onFinish]);

  useEffect(() => {
    rendererRef.current?.updateConfig(config);
  }, [config]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFinish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  const tl = computeIntroTimeline(progress);

  if (viewMode === 'boot') {
    return (
      <div
        className="intro-overlay"
        style={{ opacity: tl.exitFade }}
        onClick={onFinish}
        role="dialog"
        aria-label="Outerflow Studio Intro"
      >
        <canvas ref={canvasRef} className="intro-canvas" />

        <div
          className="intro-typography"
          style={{
            opacity: tl.textOpacity,
            transform: `translate(-50%, calc(-50% + ${tl.textSlideY}px))`,
          }}
        >
          <div className="intro-lab">{config.labLabel}</div>
          <h1 className="intro-title">{config.title}</h1>
          <div
            className="intro-divider"
            style={{
              width: `${Math.round(tl.dividerWidth * 260)}px`,
              background: `linear-gradient(90deg, transparent, ${config.secondaryColor}, transparent)`,
            }}
          />
          <p className="intro-tagline">{config.tagline}</p>
        </div>

        <div className="intro-footer">
          <div className="intro-progress-track">
            <div
              className="intro-progress-fill"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background: config.secondaryColor,
              }}
            />
          </div>
          <span className="intro-skip-hint">Click anywhere or press Esc to enter studio</span>
        </div>
      </div>
    );
  }

  // Interactive 3D Logo & Motion Studio Mode
  const handleExportTransparentPNG = () => {
    const r = rendererRef.current;
    if (!r) return;
    r.setTransparentBackground(true);
    r.renderAt(progress * config.durationSec, studioScrub);
    r.getCanvas().toBlob((blob) => {
      if (blob) downloadBlob(blob, 'outerflow-logo-transparent.png');
      r.setTransparentBackground(false);
    }, 'image/png');
  };

  const handleExportStagedPosterPNG = () => {
    const r = rendererRef.current;
    if (!r) return;
    const glCanvas = r.getCanvas();
    const w = 1280;
    const h = 720;
    const comp = document.createElement('canvas');
    comp.width = w;
    comp.height = h;
    const ctx = comp.getContext('2d');
    if (!ctx) return;

    r.setTransparentBackground(false);
    r.renderAt(progress * config.durationSec, studioScrub ?? 0.52);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0, w, h);
    if (showTextInStudio) {
      drawIntroOverlay2D(ctx, w, h, 0.52, config);
    }
    comp.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'outerflow-studio-poster.png');
    }, 'image/png');
  };

  const handleRecordIntro = async () => {
    const r = rendererRef.current;
    if (!r || recordingPct !== null) return;
    setRecordingPct(0);
    try {
      await recordLogoIntroVideo(r, config, (pct) => setRecordingPct(pct));
    } finally {
      setRecordingPct(null);
    }
  };

  const handlePrintBrandSheet = () => {
    const r = rendererRef.current;
    if (!r) return;
    const glCanvas = r.getCanvas();
    const comp = document.createElement('canvas');
    comp.width = 1280;
    comp.height = 720;
    const ctx = comp.getContext('2d');
    if (!ctx) return;
    r.setTransparentBackground(false);
    r.renderAt(progress * config.durationSec, 0.52);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.drawImage(glCanvas, 0, 0, 1280, 720);
    drawIntroOverlay2D(ctx, 1280, 720, 0.52, config);

    printDesignSheet({
      title: config.title,
      subtitle: config.tagline,
      imageDataUrl: comp.toDataURL('image/png'),
      metadata: [
        ['Organization', config.labLabel],
        ['3D Concept Variant', config.variant],
        ['Intro Duration', `${config.durationSec.toFixed(1)} s`],
        ['Fluidity / Turbulence', `${config.fluidity.toFixed(2)} / ${config.turbulence.toFixed(2)}`],
        ['Palette', `${config.primaryColor} · ${config.secondaryColor} · ${config.accentColor}`],
      ],
      notes: 'Generated in Outerflow Studio — 3D Motion & Prototyping Engine (Harboria Labs).',
    });
  };

  return (
    <div className="logo-studio-backdrop" role="dialog" aria-label="3D Logo and Motion Studio">
      <div className="logo-studio-topbar">
        <div className="panel-header-title">
          <OuterflowMark
            size={20}
            primaryColor={config.primaryColor}
            secondaryColor={config.secondaryColor}
          />
          <span style={{ fontWeight: 700, fontSize: 13 }}>
            Outerflow 3D Logo &amp; Motion Studio
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="top-btn"
            onClick={onReplayBoot}
            title="Play Fullscreen Boot Intro Sequence"
          >
            <Play size={12} />
            <span>Replay Intro</span>
          </button>
          <button
            type="button"
            className="top-btn primary"
            onClick={() => {
              onSaveDefault(config);
              setSavedNotice(true);
              setTimeout(() => setSavedNotice(false), 1800);
            }}
          >
            <Save size={12} />
            <span>{savedNotice ? 'Saved Default!' : 'Save as Startup Default'}</span>
          </button>
          <button
            type="button"
            className="top-btn"
            onClick={onFinish}
            title="Return to Simulation Studio (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="logo-studio-body">
        <div className="logo-studio-stage">
          <canvas ref={canvasRef} className="intro-canvas" />

          {showTextInStudio && (
            <div
              className="intro-typography"
              style={{
                opacity: studioScrub !== null ? tl.textOpacity : 1,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="intro-lab">{config.labLabel}</div>
              <h1 className="intro-title">{config.title}</h1>
              <div
                className="intro-divider"
                style={{
                  width: '240px',
                  background: `linear-gradient(90deg, transparent, ${config.secondaryColor}, transparent)`,
                }}
              />
              <p className="intro-tagline">{config.tagline}</p>
            </div>
          )}

          <div className="floating-playback-bar">
            <button
              type="button"
              className="play-pill-btn active"
              onClick={() => {
                setStudioScrub(null);
                setStudioPlaying((p) => !p);
              }}
            >
              {studioPlaying && studioScrub === null ? <Pause size={13} /> : <Play size={13} />}
            </button>

            <span className="field-label" style={{ paddingLeft: 4 }}>
              Timeline
            </span>
            <input
              type="range"
              className="studio-range"
              min={0}
              max={1}
              step={0.01}
              value={studioScrub ?? 0.52}
              onChange={(e) => setStudioScrub(Number(e.target.value))}
              style={{ width: 130 }}
            />
            {studioScrub !== null && (
              <button
                type="button"
                className="play-pill-btn active"
                onClick={() => setStudioScrub(null)}
              >
                Loop
              </button>
            )}

            <span className="hud-divider" />

            <button
              type="button"
              className={`play-pill-btn ${showTextInStudio ? 'active' : ''}`}
              onClick={() => setShowTextInStudio((t) => !t)}
            >
              Write-up
            </button>
          </div>
        </div>

        <aside className="side-panel right" style={{ width: 316, minWidth: 316 }}>
          <div className="panel-scroll">
            <AccordionSection
              title="Concept & Identity"
              defaultOpen
              rightAction={
                <button
                  type="button"
                  className="mini-icon-btn"
                  onClick={() => onConfigChange(createDefaultLogoConfig())}
                  title="Reset Logo Defaults"
                >
                  <RotateCcw size={12} />
                </button>
              }
            >
              <span className="field-label">3D Fluid Emblem</span>
              <SegmentedControl<LogoVariant>
                value={config.variant}
                columns={3}
                options={[
                  { value: 'morphogenesis', label: 'Genesis' },
                  { value: 'bioGyroid', label: 'Orbital' },
                  { value: 'ferroVortex', label: 'Vortex' },
                ]}
                onChange={(variant) => onConfigChange({ ...config, variant })}
              />

              <div className="field-col">
                <span className="field-label">Lab Label</span>
                <input
                  className="input-text"
                  value={config.labLabel}
                  onChange={(e) => onConfigChange({ ...config, labLabel: e.target.value })}
                />
              </div>
              <div className="field-col">
                <span className="field-label">Studio Title</span>
                <input
                  className="input-text"
                  value={config.title}
                  onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
                />
              </div>
              <div className="field-col">
                <span className="field-label">Tagline</span>
                <input
                  className="input-text"
                  value={config.tagline}
                  onChange={(e) => onConfigChange({ ...config, tagline: e.target.value })}
                />
              </div>
              <ToggleSwitch
                label="Play Intro on Startup"
                checked={config.showIntroOnLoad}
                onChange={(showIntroOnLoad) => onConfigChange({ ...config, showIntroOnLoad })}
              />
            </AccordionSection>

            <AccordionSection title="Fluid Shader & Motion" defaultOpen>
              <StudioSlider
                label="Duration (s)"
                value={config.durationSec}
                min={2.0}
                max={8.0}
                step={0.2}
                decimals={1}
                onChange={(durationSec) => onConfigChange({ ...config, durationSec })}
              />
              <StudioSlider
                label="Fluidity"
                value={config.fluidity}
                min={0.2}
                max={2.4}
                step={0.05}
                onChange={(fluidity) => onConfigChange({ ...config, fluidity })}
              />
              <StudioSlider
                label="Turbulence"
                value={config.turbulence}
                min={0.05}
                max={0.9}
                step={0.02}
                onChange={(turbulence) => onConfigChange({ ...config, turbulence })}
              />
              <StudioSlider
                label="Glow"
                value={config.glowIntensity}
                min={0.4}
                max={2.4}
                step={0.05}
                onChange={(glowIntensity) => onConfigChange({ ...config, glowIntensity })}
              />
              <StudioSlider
                label="Particles"
                value={config.particleCount}
                min={100}
                max={1400}
                step={40}
                decimals={0}
                onChange={(particleCount) => onConfigChange({ ...config, particleCount })}
              />

              <div className="field-row">
                <span className="field-label">Core / Flow / Rim</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => onConfigChange({ ...config, primaryColor: e.target.value })}
                  />
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) =>
                      onConfigChange({ ...config, secondaryColor: e.target.value })
                    }
                  />
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => onConfigChange({ ...config, accentColor: e.target.value })}
                  />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Download, Video & Print" defaultOpen>
              <button
                type="button"
                className="action-btn primary"
                disabled={recordingPct !== null}
                onClick={() => void handleRecordIntro()}
              >
                <Film size={13} />
                <span>
                  {recordingPct !== null
                    ? `Recording Intro (${recordingPct}%)...`
                    : 'Download Motion Video (.webm)'}
                </span>
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={handleExportTransparentPNG}
                >
                  <ImageIcon size={12} />
                  <span>Logo PNG</span>
                </button>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={handleExportStagedPosterPNG}
                >
                  <ImageIcon size={12} />
                  <span>Poster PNG</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={() => exportLogoSVG(config)}
                >
                  <Download size={12} />
                  <span>Vector SVG</span>
                </button>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const g = rendererRef.current?.getExportGroup();
                    if (g) void exportGLB(g, 'outerflow-logo.glb');
                  }}
                >
                  <Download size={12} />
                  <span>3D GLB</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const g = rendererRef.current?.getExportGroup();
                    if (g) exportSTL(g, 'outerflow-logo-print.stl');
                  }}
                >
                  <Download size={12} />
                  <span>3D Print STL</span>
                </button>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1 }}
                  onClick={handlePrintBrandSheet}
                >
                  <Printer size={12} />
                  <span>Print / PDF</span>
                </button>
              </div>
            </AccordionSection>
          </div>
        </aside>
      </div>
    </div>
  );
};
