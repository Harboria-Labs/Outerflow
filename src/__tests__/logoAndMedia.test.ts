import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildExportableEmblemGroup,
  computeIntroTimeline,
  createDefaultLogoConfig,
} from '../engines/brand/logoScene';
import { buildLogoSVGString } from '../engines/io/mediaExporters';
import type { LogoVariant } from '../types/studio';

describe('Outerflow 3D Logo, Motion Timeline & SVG Export', () => {
  it('provides grammatical default config with Harboria Labs & tagline', () => {
    const cfg = createDefaultLogoConfig();
    expect(cfg.title).toBe('OUTERFLOW STUDIO');
    expect(cfg.tagline).toBe('Where engineering births lifeforms.');
    expect(cfg.labLabel).toBe('HARBORIA LABS');
    expect(cfg.showIntroOnLoad).toBe(true);
    expect(cfg.durationSec).toBeGreaterThan(2);
  });

  it('computes bounded smoothstep timeline curves for fluid morph, text reveal, and exit fade', () => {
    const t0 = computeIntroTimeline(0);
    const tMid = computeIntroTimeline(0.5);
    const tEnd = computeIntroTimeline(1.0);

    expect(t0.morph).toBe(0);
    expect(t0.textOpacity).toBe(0);
    expect(t0.exitFade).toBe(1);

    expect(tMid.morph).toBe(1);
    expect(tMid.textOpacity).toBeGreaterThan(0.95);
    expect(tMid.dividerWidth).toBeGreaterThan(0.95);
    expect(tMid.exitFade).toBe(1);

    expect(tEnd.textOpacity).toBe(0);
    expect(tEnd.exitFade).toBe(0);
    expect(tEnd.cameraZ).toBeLessThan(t0.cameraZ);
  });

  it('generates valid escaped SVG vector logo containing title and tagline', () => {
    const cfg = createDefaultLogoConfig();
    cfg.tagline = 'Where engineering & math birth lifeforms.';
    const svg = buildLogoSVGString(cfg);

    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('OUTERFLOW STUDIO');
    expect(svg).toContain('Where engineering &amp; math birth lifeforms.');
    expect(svg).toContain('HARBORIA LABS');
  });

  it('builds exportable finite 3D emblem geometry across all variants', () => {
    const cfg = createDefaultLogoConfig();
    const variants: LogoVariant[] = ['morphogenesis', 'bioGyroid', 'ferroVortex'];

    for (const v of variants) {
      cfg.variant = v;
      const group = buildExportableEmblemGroup(cfg);
      expect(group.children.length).toBeGreaterThanOrEqual(2);

      let totalVerts = 0;
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const pos = mesh.geometry.getAttribute('position');
          expect(pos.count).toBeGreaterThan(20);
          totalVerts += pos.count;
          for (let i = 0; i < pos.count; i++) {
            expect(Number.isFinite(pos.getX(i))).toBe(true);
            expect(Number.isFinite(pos.getY(i))).toBe(true);
            expect(Number.isFinite(pos.getZ(i))).toBe(true);
          }
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      expect(totalVerts).toBeGreaterThan(500);
    }
  });
});
