import * as THREE from 'three';
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

export function exportSceneJSON(scene: OuterflowSceneFile, filename = 'scene.outerflow.json'): void {
  const text = JSON.stringify(scene, null, 2);
  triggerDownload(new Blob([text], { type: 'application/json' }), filename);
}

export function parseSceneJSON(text: string): OuterflowSceneFile {
  const parsed = JSON.parse(text) as OuterflowSceneFile;
  if (!parsed || parsed.format !== 'outerflow-scene') {
    throw new Error('Invalid Outerflow scene file format');
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
