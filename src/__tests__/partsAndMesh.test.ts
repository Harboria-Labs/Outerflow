import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  PART_LIBRARY,
  buildLibraryPartGeometry,
  computeSnapPosition,
  createCadPartFromLibrary,
} from '../engines/cad/partsLibrary';
import {
  SKETCH_2D_PRESETS,
  buildBlueprintSVGString,
  buildGeometryFrom2DSketch,
  projectGeometryTo2DBlueprint,
} from '../engines/cad/sketch2D';
import { DESIGN_CODE_TEMPLATES, executeDesignCode } from '../engines/cad/designCompiler';
import {
  MeshSculptEngine,
  createDefaultMeshSculptConfig,
} from '../engines/mesh/meshSculptEngine';

describe('3D Parts Library, 2D-3D CAD, Code DSL & Mesh Sculpting', () => {
  it('covers all 5 part categories and builds finite geometries for every library entry', () => {
    const categories = new Set(PART_LIBRARY.map((p) => p.category));
    expect(categories).toEqual(
      new Set(['robotics', 'electronics', 'mechanical', 'human', 'shapes'])
    );

    for (const meta of PART_LIBRARY) {
      const geom = buildLibraryPartGeometry(meta.id);
      const pos = geom.getAttribute('position');
      expect(pos).toBeDefined();
      expect(pos.count).toBeGreaterThan(0);
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i))).toBe(true);
        expect(Number.isFinite(pos.getY(i))).toBe(true);
        expect(Number.isFinite(pos.getZ(i))).toBe(true);
      }
      geom.dispose();
    }
  });

  it('snaps parts cleanly onTop of another part and onto the ground plane', () => {
    const basePart = createCadPartFromLibrary(PART_LIBRARY[0], 1);
    const topPart = createCadPartFromLibrary(PART_LIBRARY[1], 2);

    const groundPos = computeSnapPosition(basePart, null, 'ground');
    expect(groundPos[1]).toBeGreaterThan(0);

    basePart.position = groundPos;
    const stackedPos = computeSnapPosition(topPart, basePart, 'onTop');
    expect(stackedPos[0]).toBeCloseTo(basePart.position[0], 4);
    expect(stackedPos[1]).toBeGreaterThan(basePart.position[1]);
    expect(stackedPos[2]).toBeCloseTo(basePart.position[2], 4);
  });

  it('converts 2D profiles to 3D (extrude & lathe) and projects 3D geometry back to 2D SVG blueprint', () => {
    const extrudePreset = SKETCH_2D_PRESETS.find((p) => p.mode === 'extrude')!;
    const lathePreset = SKETCH_2D_PRESETS.find((p) => p.mode === 'lathe')!;

    const extruded = buildGeometryFrom2DSketch(
      extrudePreset.points,
      'extrude',
      extrudePreset.depth,
      0.02
    );
    expect(extruded.getAttribute('position').count).toBeGreaterThan(10);

    const lathed = buildGeometryFrom2DSketch(lathePreset.points, 'lathe', lathePreset.depth);
    expect(lathed.getAttribute('position').count).toBeGreaterThan(20);

    const proj = projectGeometryTo2DBlueprint(extruded);
    expect(proj.top.length).toBeGreaterThan(0);
    expect(proj.front.length).toBeGreaterThan(0);
    expect(proj.side.length).toBeGreaterThan(0);
    expect(proj.width).toBeGreaterThan(0);

    const svg = buildBlueprintSVGString(proj, 'Test Airfoil');
    expect(svg).toContain('<svg');
    expect(svg).toContain('TOP VIEW');
    expect(svg).toContain(String(proj.width));

    extruded.dispose();
    lathed.dispose();
  });

  it('compiles all programmable Design Code templates and catches syntax/runtime errors', () => {
    for (const tpl of DESIGN_CODE_TEMPLATES) {
      const res = executeDesignCode(tpl.code);
      expect(res.ok).toBe(true);
      expect(res.parts.length).toBeGreaterThanOrEqual(1);
    }

    const bad = executeDesignCode('const x = {{{ invalid_syntax;');
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });

  it('supports watertight MeshSculptEngine brushes with symmetryX, undo, and subdivision', () => {
    const cfg = { ...createDefaultMeshSculptConfig(), basePreset: 'humanHead' as const };
    const engine = new MeshSculptEngine(cfg.basePreset);
    const initialStats = engine.getStats();
    expect(initialStats.vertices).toBeGreaterThan(200);
    expect(initialStats.triangles).toBeGreaterThan(400);

    // Pick an existing vertex on +X side and find its mirrored -X partner
    const pos = engine.geometry.getAttribute('position') as THREE.BufferAttribute;
    let targetIdx = -1;
    let mirrorIdx = -1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (x > 0.35 && targetIdx === -1) {
        for (let j = 0; j < pos.count; j++) {
          if (
            Math.abs(pos.getX(j) + x) < 0.02 &&
            Math.abs(pos.getY(j) - y) < 0.02 &&
            Math.abs(pos.getZ(j) - z) < 0.02
          ) {
            targetIdx = i;
            mirrorIdx = j;
            break;
          }
        }
      }
      if (targetIdx !== -1) break;
    }

    expect(targetIdx).toBeGreaterThanOrEqual(0);
    expect(mirrorIdx).toBeGreaterThanOrEqual(0);

    const beforeX = pos.getX(targetIdx);
    const beforeMirrorX = pos.getX(mirrorIdx);

    engine.pushUndoSnapshot();
    const hitPt = new THREE.Vector3(beforeX, pos.getY(targetIdx), pos.getZ(targetIdx));
    const hitNrm = new THREE.Vector3(1, 0, 0);
    engine.applyBrushStroke(hitPt, hitNrm, { ...cfg, brush: 'pull', symmetryX: true, strength: 0.7 });

    const afterX = pos.getX(targetIdx);
    const afterMirrorX = pos.getX(mirrorIdx);
    expect(afterX).toBeGreaterThan(beforeX + 0.01);
    expect(afterMirrorX).toBeLessThan(beforeMirrorX - 0.01);

    const undone = engine.undo(cfg);
    expect(undone).toBe(true);
    expect(pos.getX(targetIdx)).toBeCloseTo(beforeX, 5);
    expect(pos.getX(mirrorIdx)).toBeCloseTo(beforeMirrorX, 5);

    const subdivided = engine.applySubdivide(cfg);
    expect(subdivided).toBe(true);
    const subStats = engine.getStats();
    expect(subStats.triangles).toBe(initialStats.triangles * 4);

    engine.dispose();
  });
});
