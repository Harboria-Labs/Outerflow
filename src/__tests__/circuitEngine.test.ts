import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildCircuit3DPCBGroup,
  getCircuitPresets,
  solveCircuit,
} from '../engines/electronics/circuitEngine';
import {
  WORKBENCH_MISSIONS,
  buildWorkbench3DScene,
} from '../engines/electronics/workbench3D';
import type { CircuitSchematic } from '../types/studio';

describe('Proteus-style Electronics Circuit Engine', () => {
  it('exposes all 4 circuit presets with valid components and wires', () => {
    const presets = getCircuitPresets();
    expect(presets.map((p) => p.id)).toEqual([
      'ledLimiter',
      'voltageDivider',
      'dcMotorDrive',
      'rcPulse',
    ]);
    for (const p of presets) {
      expect(p.components.length).toBeGreaterThan(0);
      expect(p.wires.length).toBeGreaterThan(0);
    }
  });

  it('solves LED current-limiter when switch is closed and drops current when open', () => {
    const ledPreset = structuredClone(
      getCircuitPresets().find((p) => p.id === 'ledLimiter')!
    );
    const swClosed = solveCircuit(ledPreset);
    const ledCurrentClosed = swClosed.branchCurrents.led1 ?? 0;
    expect(ledCurrentClosed).toBeGreaterThan(0.015);
    expect(ledCurrentClosed).toBeLessThan(0.025);
    expect(swClosed.ledBrightness.led1).toBeGreaterThan(0.5);

    const swComp = ledPreset.components.find((c) => c.id === 'sw1')!;
    swComp.closed = false;
    const swOpen = solveCircuit(ledPreset);
    expect(Math.abs(swOpen.branchCurrents.led1 ?? 0)).toBeLessThan(1e-4);
    expect(swOpen.ledBrightness.led1).toBeLessThan(0.05);
  });

  it('computes Ohm law precision on 12V 2k/1k resistive divider and solves voltageDivider preset', () => {
    const pureDivider: CircuitSchematic = {
      id: 'pure-divider',
      name: 'Unloaded 12V Divider',
      description: 'Pure 2k / 1k divider',
      components: [
        { id: 'bat1', name: '12V', kind: 'battery', nodeA: 'VIN', nodeB: 'GND', value: 12, x: 80, y: 180 },
        { id: 'r1', name: 'R1', kind: 'resistor', nodeA: 'VIN', nodeB: 'VOUT', value: 2000, x: 240, y: 120 },
        { id: 'r2', name: 'R2', kind: 'resistor', nodeA: 'VOUT', nodeB: 'GND', value: 1000, x: 240, y: 240 },
      ],
      wires: [],
    };
    const pureSolved = solveCircuit(pureDivider);
    expect(pureSolved.nodeVoltages.VIN).toBeCloseTo(12.0, 2);
    expect(Math.abs((pureSolved.nodeVoltages.VOUT ?? 0) - 4.0)).toBeLessThan(0.05);

    const preset = getCircuitPresets().find((p) => p.id === 'voltageDivider')!;
    const presetSolved = solveCircuit(preset);
    for (const v of Object.values(presetSolved.nodeVoltages)) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(presetSolved.nodeVoltages.VIN).toBeCloseTo(12.0, 2);
  });

  it('produces an increasing RC transient response curve for rcPulse', () => {
    const rcPreset = getCircuitPresets().find((p) => p.id === 'rcPulse')!;
    const solved = solveCircuit(rcPreset);
    expect(solved.transientTrace.length).toBeGreaterThanOrEqual(20);
    const first = solved.transientTrace[0];
    const last = solved.transientTrace[solved.transientTrace.length - 1];
    expect(first.tMs).toBeLessThan(last.tMs);
    expect(last.voltage).toBeGreaterThan(first.voltage);
    expect(Number.isFinite(last.currentMa)).toBe(true);
  });

  it('builds 3D PCB group with spinning motor rotors and finite vertices for dcMotorDrive', () => {
    const motorPreset = getCircuitPresets().find((p) => p.id === 'dcMotorDrive')!;
    const solved = solveCircuit(motorPreset);
    const handle = buildCircuit3DPCBGroup(motorPreset, solved);

    expect(handle.rotors.length).toBeGreaterThanOrEqual(1);
    expect(handle.rotors[0].rpm).toBeGreaterThan(0);

    let meshCount = 0;
    handle.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshCount++;
        const pos = (obj as THREE.Mesh).geometry.getAttribute('position');
        expect(pos.count).toBeGreaterThan(0);
        for (let i = 0; i < pos.count; i++) {
          expect(Number.isFinite(pos.getX(i))).toBe(true);
          expect(Number.isFinite(pos.getY(i))).toBe(true);
          expect(Number.isFinite(pos.getZ(i))).toBe(true);
        }
      }
    });
    expect(meshCount).toBeGreaterThan(0);
    handle.dispose();
  });

  it('builds 3D Hardware Workbench scenes with curved DuPont jumper wires across all missions', () => {
    expect(WORKBENCH_MISSIONS).toHaveLength(4);
    for (const mission of WORKBENCH_MISSIONS) {
      const handle = buildWorkbench3DScene({
        boardId: mission.boardId,
        missionId: mission.id,
        modules: mission.modules,
        wires: mission.wires,
        exploded: 0.25,
        powered: true,
      });
      let meshCount = 0;
      handle.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          meshCount++;
          const pos = (obj as THREE.Mesh).geometry.getAttribute('position');
          expect(pos.count).toBeGreaterThan(0);
          for (let i = 0; i < pos.count; i++) {
            expect(Number.isFinite(pos.getX(i))).toBe(true);
            expect(Number.isFinite(pos.getY(i))).toBe(true);
            expect(Number.isFinite(pos.getZ(i))).toBe(true);
          }
        }
      });
      expect(meshCount).toBeGreaterThan(5);
      handle.dispose();
    }
  });
});
