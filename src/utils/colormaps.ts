import type { ColormapName } from '../types/studio';

export type RGB = [number, number, number];

type ColorStop = [number, RGB];

const STOPS: Record<ColormapName, ColorStop[]> = {
  harboria: [
    [0.0, [0.06, 0.16, 0.36]],
    [0.25, [0.05, 0.56, 0.78]],
    [0.55, [0.13, 0.83, 0.93]],
    [0.8, [0.96, 0.62, 0.04]],
    [1.0, [0.99, 0.88, 0.55]],
  ],
  viridis: [
    [0.0, [0.267, 0.005, 0.329]],
    [0.25, [0.23, 0.322, 0.545]],
    [0.5, [0.129, 0.569, 0.549]],
    [0.75, [0.369, 0.788, 0.384]],
    [1.0, [0.992, 0.906, 0.145]],
  ],
  plasma: [
    [0.0, [0.051, 0.031, 0.529]],
    [0.25, [0.494, 0.012, 0.659]],
    [0.5, [0.796, 0.278, 0.471]],
    [0.75, [0.973, 0.584, 0.255]],
    [1.0, [0.941, 0.976, 0.129]],
  ],
  coolwarm: [
    [0.0, [0.23, 0.298, 0.753]],
    [0.25, [0.439, 0.569, 0.949]],
    [0.5, [0.867, 0.867, 0.867]],
    [0.75, [0.957, 0.604, 0.486]],
    [1.0, [0.706, 0.016, 0.149]],
  ],
};

export function sampleColormap(name: ColormapName, tRaw: number): RGB {
  const t = Number.isFinite(tRaw) ? Math.max(0, Math.min(1, tRaw)) : 0.5;
  const stops = STOPS[name] ?? STOPS.harboria;

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / Math.max(1e-6, t1 - t0);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return stops[stops.length - 1][1];
}
