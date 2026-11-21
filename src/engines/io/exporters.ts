import * as THREE from 'three';
import JSZip from 'jszip';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import type {
  OuterflowSceneFile,
  SweepTrialResult,
  TelemetrySample,
} from '../../types/studio';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportGLB(root: THREE.Object3D, filename = 'outerflow-scene.glb'): Promise<void> {
  const exporter = new GLTFExporter();
  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      root,
      (res) => {
        if (res instanceof ArrayBuffer) resolve(res);
        else resolve(new TextEncoder().encode(JSON.stringify(res)).buffer);
      },
      (err) => reject(err),
      { binary: true }
    );
  });
  triggerDownload(new Blob([result], { type: 'model/gltf-binary' }), filename);
}

export function exportSTL(root: THREE.Object3D, filename = 'outerflow-model.stl'): void {
  const exporter = new STLExporter();
  const data = exporter.parse(root, { binary: true });
  const blobPart =
    data instanceof DataView
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : data;
  triggerDownload(
    new Blob([blobPart as BlobPart], { type: 'application/octet-stream' }),
    filename
  );
}

export function exportOBJ(root: THREE.Object3D, filename = 'outerflow-model.obj'): void {
  const exporter = new OBJExporter();
  const objText = exporter.parse(root);
  triggerDownload(new Blob([objText], { type: 'text/plain;charset=utf-8' }), filename);
}

export function capturePNG(canvas: HTMLCanvasElement, filename = 'outerflow-snapshot.png'): void {
  canvas.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename);
  }, 'image/png');
}

export function exportSceneJSON(
  scene: OuterflowSceneFile,
  filename = 'outerflow-project.lifeforms'
): void {
  const text = JSON.stringify(scene, null, 2);
  triggerDownload(new Blob([text], { type: 'application/json' }), filename);
}

export function parseSceneJSON(text: string): OuterflowSceneFile {
  const parsed = JSON.parse(text) as OuterflowSceneFile;
  if (
    !parsed ||
    (parsed.format !== 'outerflow-scene' &&
      (parsed as unknown as { format?: string }).format !== 'outerflow-lifeforms')
  ) {
    throw new Error('Invalid Outerflow .lifeforms file format');
  }
  return parsed;
}

export function formatTelemetryCSV(samples: TelemetrySample[]): string {
  const customKeys = new Set<string>();
  for (const s of samples) {
    Object.keys(s.customMetrics).forEach((k) => customKeys.add(k));
  }
  const extraCols = Array.from(customKeys);
  const headers = [
    'time',
    'kineticEnergy',
    'potentialEnergy',
    'totalEnergy',
    'selectedPosY',
    'selectedSpeed',
    ...extraCols,
  ];
  const lines = [headers.join(',')];
  for (const s of samples) {
    const row = [
      s.time.toFixed(4),
      s.kineticEnergy.toFixed(4),
      s.potentialEnergy.toFixed(4),
      s.totalEnergy.toFixed(4),
      s.selectedPosY.toFixed(4),
      s.selectedSpeed.toFixed(4),
      ...extraCols.map((k) => (s.customMetrics[k] ?? '').toString()),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export function exportTelemetryCSV(samples: TelemetrySample[], filename = 'outerflow-telemetry.csv'): void {
  const csv = formatTelemetryCSV(samples);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportSweepCSV(results: SweepTrialResult[], filename = 'outerflow-sweep.csv'): void {
  if (results.length === 0) return;
  const r0 = results[0];
  const headers = [
    'trialIndex',
    r0.paramName,
    r0.primaryMetricName,
    r0.secondaryMetricName,
    'peakHeight',
    'finalEnergy',
  ];
  const lines = [headers.join(',')];
  for (const r of results) {
    lines.push(
      [
        r.trialIndex,
        r.paramValue,
        r.primaryMetricValue,
        r.secondaryMetricValue,
        r.peakHeight,
        r.finalEnergy,
      ].join(',')
    );
  }
  triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), filename);
}

/**
 * Bundles the full Outerflow project (.lifeforms), engineering script, telemetry CSV,
 * sweep CSV, and 3D OBJ mesh into a downloadable .zip archive.
 */
export async function exportProjectAsZip(opts: {
  projectName: string;
  scene: OuterflowSceneFile;
  rootObject?: THREE.Object3D | null;
  telemetrySamples?: TelemetrySample[];
  sweepResults?: SweepTrialResult[];
  scriptCode?: string;
}): Promise<void> {
  const zip = new JSZip();
  const baseName =
    opts.projectName
      .replace(/\.lifeforms$/i, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'outerflow-project';

  zip.file(`${baseName}.lifeforms`, JSON.stringify(opts.scene, null, 2));

  if (opts.scriptCode && opts.scriptCode.trim()) {
    zip.file(`${baseName}-script.txt`, opts.scriptCode);
  }
  if (opts.telemetrySamples && opts.telemetrySamples.length > 0) {
    zip.file(`${baseName}-telemetry.csv`, formatTelemetryCSV(opts.telemetrySamples));
  }
  if (opts.sweepResults && opts.sweepResults.length > 0) {
    const r0 = opts.sweepResults[0];
    const headers = [
      'trialIndex',
      r0.paramName,
      r0.primaryMetricName,
      r0.secondaryMetricName,
      'peakHeight',
      'finalEnergy',
    ];
    const rows = [
      headers.join(','),
      ...opts.sweepResults.map((r) =>
        [
          r.trialIndex,
          r.paramValue,
          r.primaryMetricValue,
          r.secondaryMetricValue,
          r.peakHeight,
          r.finalEnergy,
        ].join(',')
      ),
    ];
    zip.file(`${baseName}-sweep.csv`, rows.join('\n'));
  }
  if (opts.rootObject) {
    try {
      const objText = new OBJExporter().parse(opts.rootObject);
      zip.file(`${baseName}.obj`, objText);
    } catch {
      // Skip OBJ if active scene has no exportable meshes
    }
  }

  zip.file(
    'README.txt',
    `Outerflow Studio Project Archive — Harboria Labs\nProject: ${baseName}.lifeforms\nSaved At: ${opts.scene.savedAt}\nMode: ${opts.scene.mode}\nEntities: ${opts.scene.entities.length}\nCAD Parts: ${opts.scene.cadParts.length}\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${baseName}.zip`);
}

/**
 * Extracts and parses a .lifeforms / .json project from an imported .zip archive.
 */
export async function importProjectFromZip(
  file: File
): Promise<{ scene: OuterflowSceneFile; fileName: string }> {
  const zip = await JSZip.loadAsync(file);
  const candidates = Object.keys(zip.files).filter(
    (name) =>
      !zip.files[name].dir &&
      (/\.(lifeforms|json)$/i.test(name) || /\.outerflow\.json$/i.test(name))
  );
  if (candidates.length === 0) {
    throw new Error('No .lifeforms or .json project file found inside the .zip archive.');
  }
  const preferred =
    candidates.find((n) => /\.lifeforms$/i.test(n)) ?? candidates[0];
  const text = await zip.files[preferred].async('string');
  const scene = parseSceneJSON(text);
  const fileName = preferred.split('/').pop() || `${file.name.replace(/\.zip$/i, '')}.lifeforms`;
  return { scene, fileName };
}
