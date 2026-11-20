import * as THREE from 'three';
import type { LogoStudioConfig } from '../../types/studio';
import { computeIntroTimeline, type OuterflowLogoRenderer } from '../brand/logoScene';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function buildLogoSVGString(config: LogoStudioConfig): string {
  const p = escapeXml(config.primaryColor);
  const s = escapeXml(config.secondaryColor);
  const a = escapeXml(config.accentColor);
  const title = escapeXml(config.title || 'OUTERFLOW STUDIO');
  const tagline = escapeXml(config.tagline || 'Where engineering births lifeforms.');
  const lab = escapeXml(config.labLabel || 'HARBORIA LABS');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 420" width="960" height="420">
  <defs>
    <radialGradient id="coreGlow" cx="42%" cy="38%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="${s}" stop-opacity="0.9"/>
      <stop offset="72%" stop-color="${p}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${a}" stop-opacity="0.35"/>
    </radialGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3f4654"/>
      <stop offset="48%" stop-color="${s}"/>
      <stop offset="100%" stop-color="${p}"/>
    </linearGradient>
    <filter id="softBlur" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>

  <rect width="960" height="420" rx="20" fill="#070709"/>

  <!-- Emblem -->
  <g transform="translate(480, 150)">
    <circle cx="0" cy="0" r="88" fill="${p}" opacity="0.22" filter="url(#softBlur)"/>
    <ellipse cx="0" cy="0" rx="94" ry="44" transform="rotate(-28)" fill="none" stroke="url(#ringGrad)" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="0" cy="0" rx="94" ry="44" transform="rotate(34)" fill="none" stroke="${a}" stroke-opacity="0.72" stroke-width="5"/>
    <path d="M -38 -8 C -30 -44, 18 -52, 40 -20 C 56 4, 34 46, -4 44 C -36 42, -46 22, -38 -8 Z" fill="url(#coreGlow)"/>
  </g>

  <!-- Typography -->
  <text x="480" y="280" text-anchor="middle" fill="#a1a1aa" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="5">${lab}</text>
  <text x="480" y="324" text-anchor="middle" fill="#f4f4f5" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="7">${title}</text>
  <line x1="360" y1="342" x2="600" y2="342" stroke="${s}" stroke-opacity="0.55" stroke-width="1.5"/>
  <text x="480" y="372" text-anchor="middle" fill="#e2e8f0" font-family="'Cormorant Garamond', 'Playfair Display', Georgia, serif" font-style="italic" font-size="22" font-weight="600" letter-spacing="1.5">${tagline}</text>
</svg>`;
}

export function exportLogoSVG(
  config: LogoStudioConfig,
  filename = 'outerflow-studio-logo.svg'
): void {
  const svg = buildLogoSVGString(config);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export function drawIntroOverlay2D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  config: LogoStudioConfig
): void {
  const tl = computeIntroTimeline(progress);
  if (tl.textOpacity <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = tl.textOpacity * tl.exitFade;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = width * 0.5;
  const cy = height * 0.54 + tl.textSlideY;

  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText((config.labLabel || 'HARBORIA LABS').toUpperCase(), cx, cy - 42);

  ctx.fillStyle = '#f4f4f5';
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText((config.title || 'OUTERFLOW STUDIO').toUpperCase(), cx, cy);

  const lineHalf = 135 * tl.dividerWidth;
  if (lineHalf > 2) {
    const grad = ctx.createLinearGradient(cx - lineHalf, cy + 26, cx + lineHalf, cy + 26);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, config.secondaryColor);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - lineHalf, cy + 26);
    ctx.lineTo(cx + lineHalf, cy + 26);
    ctx.stroke();
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = "italic 600 22px 'Cormorant Garamond', 'Playfair Display', Georgia, serif";
  ctx.fillText(config.tagline || 'Where engineering births lifeforms.', cx, cy + 54);
  ctx.restore();
}

export class CanvasVideoRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stopPromise: Promise<Blob> | null = null;

  get isRecording(): boolean {
    return this.recorder !== null && this.recorder.state === 'recording';
  }

  start(canvas: HTMLCanvasElement, fps = 60): void {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser.');
    }
    const stream = canvas.captureStream(fps);
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    this.chunks = [];
    this.recorder = mimeType
      ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
      : new MediaRecorder(stream);

    this.stopPromise = new Promise<Blob>((resolve) => {
      if (!this.recorder) return;
      this.recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
      };
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: this.recorder?.mimeType || 'video/webm',
        });
        this.chunks = [];
        this.recorder = null;
        resolve(blob);
      };
    });

    this.recorder.start(100);
  }

  async stop(): Promise<Blob> {
    if (!this.recorder || !this.stopPromise) {
      throw new Error('No active recording');
    }
    const promise = this.stopPromise;
    if (this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    return promise;
  }
}

export async function recordLogoIntroVideo(
  renderer: OuterflowLogoRenderer,
  config: LogoStudioConfig,
  onProgress?: (pct: number) => void
): Promise<void> {
  const width = 1280;
  const height = 720;

  const glCanvas = renderer.getCanvas();
  const prevW = glCanvas.clientWidth || 1280;
  const prevH = glCanvas.clientHeight || 720;

  const compCanvas = document.createElement('canvas');
  compCanvas.width = width;
  compCanvas.height = height;
  const ctx = compCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D composite canvas');

  renderer.setTransparentBackground(false);
  renderer.resize(width, height);

  const rec = new CanvasVideoRecorder();
  rec.start(compCanvas, 60);

  const durationMs = Math.max(1500, config.durationSec * 1000);
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const elapsedMs = now - start;
      const progress = Math.min(1, elapsedMs / durationMs);
      const elapsedSec = elapsedMs / 1000;

      renderer.renderAt(elapsedSec, progress);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(glCanvas, 0, 0, width, height);
      drawIntroOverlay2D(ctx, width, height, progress, config);

      if (onProgress) onProgress(Math.round(progress * 100));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });

  const blob = await rec.stop();
  renderer.resize(prevW, prevH);
  downloadBlob(blob, 'outerflow-studio-intro.webm');
}

export function captureTransparentViewportPNG(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  hiddenObjects: THREE.Object3D[],
  filename = 'outerflow-transparent.png'
): void {
  const prevBg = scene.background;
  const prevFog = scene.fog;
  const prevVis = hiddenObjects.map((o) => o.visible);
  const prevAlpha = renderer.getClearAlpha();

  scene.background = null;
  scene.fog = null;
  hiddenObjects.forEach((o) => {
    o.visible = false;
  });
  renderer.setClearColor('#000000', 0);
  renderer.clear();
  renderer.render(scene, camera);

  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');

  hiddenObjects.forEach((o, i) => {
    o.visible = prevVis[i];
  });
  scene.background = prevBg;
  scene.fog = prevFog;
  renderer.setClearAlpha(prevAlpha);
  renderer.render(scene, camera);
}

export function printDesignSheet(opts: {
  title: string;
  subtitle: string;
  imageDataUrl: string;
  metadata: Array<[string, string]>;
  notes?: string;
}): void {
  const rows = opts.metadata
    .map(
      ([k, v]) =>
        `<tr><td style="color:#52525b;font-weight:600;padding:6px 10px;border-bottom:1px solid #e4e4e7;">${escapeXml(k)}</td><td style="font-family:monospace;padding:6px 10px;border-bottom:1px solid #e4e4e7;text-align:right;">${escapeXml(v)}</td></tr>`
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeXml(opts.title)} — Outerflow Studio</title>
<style>
  @page { size: auto; margin: 16mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #18181b; margin: 0; padding: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 20px; }
  .brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #52525b; }
  h1 { margin: 4px 0 0 0; font-size: 24px; letter-spacing: 0.5px; }
  .sub { font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif; font-style: italic; font-size: 16px; letter-spacing: 0.04em; color: #3f3f46; margin-top: 4px; }
  .preview { width: 100%; border-radius: 10px; overflow: hidden; border: 1px solid #d4d4d8; background: #050507; margin-bottom: 20px; }
  .preview img { width: 100%; max-height: 460px; object-fit: contain; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 16px; }
  .notes { font-size: 12px; color: #3f3f46; line-height: 1.5; background: #f4f4f5; padding: 12px; border-radius: 6px; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">Harboria Labs · Outerflow Studio</div>
      <h1>${escapeXml(opts.title)}</h1>
      <div class="sub">${escapeXml(opts.subtitle)}</div>
    </div>
    <div style="font-size:11px;color:#71717a;">${new Date().toLocaleString()}</div>
  </div>
  <div class="preview"><img src="${opts.imageDataUrl}" alt="3D Render" /></div>
  <table>${rows}</table>
  ${opts.notes ? `<div class="notes">${escapeXml(opts.notes)}</div>` : ''}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const trigger = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };

  setTimeout(trigger, 250);
}
