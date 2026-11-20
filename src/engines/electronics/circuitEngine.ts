import * as THREE from 'three';
import type {
  CircuitComponent,
  CircuitComponentKind,
  CircuitSchematic,
  CircuitSolveResult,
} from '../../types/studio';

export function getCircuitPresets(): CircuitSchematic[] {
  return [
    {
      id: 'ledLimiter',
      name: 'LED Current-Limiter',
      description: '5V supply driving an LED through a toggle switch and current-limiting resistor',
      components: [
        { id: 'bat1', name: '5V Supply', kind: 'battery', nodeA: 'VCC', nodeB: 'GND', value: 5.0, x: 90, y: 210 },
        { id: 'sw1', name: 'Power SW', kind: 'switch', nodeA: 'VCC', nodeB: 'N1', value: 0, closed: true, x: 240, y: 110 },
        { id: 'r1', name: 'R1 (150Ω)', kind: 'resistor', nodeA: 'N1', nodeB: 'N2', value: 150, x: 420, y: 110 },
        { id: 'led1', name: 'Cyan LED', kind: 'led', nodeA: 'N2', nodeB: 'GND', value: 2.0, x: 560, y: 210, color: '#22d3ee' },
      ],
      wires: [
        { id: 'w1', fromCompId: 'bat1', fromPin: 'A', toCompId: 'sw1', toPin: 'A', nodeName: 'VCC' },
        { id: 'w2', fromCompId: 'sw1', fromPin: 'B', toCompId: 'r1', toPin: 'A', nodeName: 'N1' },
        { id: 'w3', fromCompId: 'r1', fromPin: 'B', toCompId: 'led1', toPin: 'A', nodeName: 'N2' },
        { id: 'w4', fromCompId: 'led1', fromPin: 'B', toCompId: 'bat1', toPin: 'B', nodeName: 'GND' },
      ],
    },
    {
      id: 'voltageDivider',
      name: 'Precision Voltage Divider',
      description: '12V rail stepped down across R1 (2kΩ) and R2 (1kΩ) to 4.00V probe output',
      components: [
        { id: 'bat1', name: '12V Rail', kind: 'battery', nodeA: 'VIN', nodeB: 'GND', value: 12.0, x: 110, y: 210 },
        { id: 'r1', name: 'R1 Top', kind: 'resistor', nodeA: 'VIN', nodeB: 'VOUT', value: 2000, x: 350, y: 120 },
        { id: 'r2', name: 'R2 Bottom', kind: 'resistor', nodeA: 'VOUT', nodeB: 'GND', value: 1000, x: 350, y: 290 },
        { id: 'led1', name: 'Sense LED', kind: 'led', nodeA: 'VOUT', nodeB: 'GND', value: 2.0, x: 560, y: 210, color: '#f59e0b' },
      ],
      wires: [
        { id: 'w1', fromCompId: 'bat1', fromPin: 'A', toCompId: 'r1', toPin: 'A', nodeName: 'VIN' },
        { id: 'w2', fromCompId: 'r1', fromPin: 'B', toCompId: 'r2', toPin: 'A', nodeName: 'VOUT' },
        { id: 'w3', fromCompId: 'r1', fromPin: 'B', toCompId: 'led1', toPin: 'A', nodeName: 'VOUT' },
        { id: 'w4', fromCompId: 'r2', fromPin: 'B', toCompId: 'bat1', toPin: 'B', nodeName: 'GND' },
      ],
    },
    {
      id: 'dcMotorDrive',
      name: 'DC Motor Speed Rig',
      description: '9V source with inline control resistor driving a 3D spinning DC motor',
      components: [
        { id: 'bat1', name: '9V LiPo', kind: 'battery', nodeA: 'VCC', nodeB: 'GND', value: 9.0, x: 100, y: 210 },
        { id: 'sw1', name: 'Drive SW', kind: 'switch', nodeA: 'VCC', nodeB: 'N1', value: 0, closed: true, x: 250, y: 110 },
        { id: 'r1', name: 'Throttle Ω', kind: 'resistor', nodeA: 'N1', nodeB: 'VM', value: 6, x: 410, y: 110 },
        { id: 'm1', name: 'DC Motor', kind: 'motor', nodeA: 'VM', nodeB: 'GND', value: 12, x: 560, y: 210 },
      ],
      wires: [
        { id: 'w1', fromCompId: 'bat1', fromPin: 'A', toCompId: 'sw1', toPin: 'A', nodeName: 'VCC' },
        { id: 'w2', fromCompId: 'sw1', fromPin: 'B', toCompId: 'r1', toPin: 'A', nodeName: 'N1' },
        { id: 'w3', fromCompId: 'r1', fromPin: 'B', toCompId: 'm1', toPin: 'A', nodeName: 'VM' },
        { id: 'w4', fromCompId: 'm1', fromPin: 'B', toCompId: 'bat1', toPin: 'B', nodeName: 'GND' },
      ],
    },
    {
      id: 'rcPulse',
      name: 'MCU & RC Filter Circuit',
      description: '3.3V MCU output feeding an RC filter bank and status LED',
      components: [
        { id: 'mcu1', name: 'ESP32 GPIO', kind: 'mcu', nodeA: 'GPIO', nodeB: 'GND', value: 3.3, x: 100, y: 210 },
        { id: 'r1', name: 'R_filter', kind: 'resistor', nodeA: 'GPIO', nodeB: 'VC', value: 100, x: 290, y: 120 },
        { id: 'c1', name: 'C_smooth', kind: 'capacitor', nodeA: 'VC', nodeB: 'GND', value: 470, x: 430, y: 280 },
        { id: 'led1', name: 'Status LED', kind: 'led', nodeA: 'VC', nodeB: 'GND', value: 1.9, x: 560, y: 190, color: '#34d399' },
      ],
      wires: [
        { id: 'w1', fromCompId: 'mcu1', fromPin: 'A', toCompId: 'r1', toPin: 'A', nodeName: 'GPIO' },
        { id: 'w2', fromCompId: 'r1', fromPin: 'B', toCompId: 'c1', toPin: 'A', nodeName: 'VC' },
        { id: 'w3', fromCompId: 'r1', fromPin: 'B', toCompId: 'led1', toPin: 'A', nodeName: 'VC' },
        { id: 'w4', fromCompId: 'c1', fromPin: 'B', toCompId: 'mcu1', toPin: 'B', nodeName: 'GND' },
      ],
    },
  ];
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const mat = A.map((row, r) => [...row, b[r]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(mat[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(mat[r][col]) > maxAbs) {
        maxAbs = Math.abs(mat[r][col]);
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = mat[col];
      mat[col] = mat[pivotRow];
      mat[pivotRow] = tmp;
    }
    const diag = Math.abs(mat[col][col]) < 1e-12 ? 1e-12 : mat[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = mat[r][col] / diag;
      for (let c = col; c <= n; c++) {
        mat[r][c] -= factor * mat[col][c];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = mat[r][n];
    for (let c = r + 1; c < n; c++) {
      sum -= mat[r][c] * x[c];
    }
    const diag = Math.abs(mat[r][r]) < 1e-12 ? 1e-12 : mat[r][r];
    x[r] = sum / diag;
  }
  return x;
}

/**
 * Modified Nodal Analysis (MNA) DC + RC Transient Solver.
 */
export function solveCircuit(schematic: CircuitSchematic): CircuitSolveResult {
  const nodeSet = new Set<string>();
  for (const c of schematic.components) {
    if (c.nodeA !== 'GND') nodeSet.add(c.nodeA);
    if (c.nodeB !== 'GND') nodeSet.add(c.nodeB);
  }
  const nodes = Array.from(nodeSet);
  const nodeIndex = new Map<string, number>();
  nodes.forEach((name, idx) => nodeIndex.set(name, idx));

  const voltageSources = schematic.components.filter(
    (c) => c.kind === 'battery' || c.kind === 'mcu'
  );
  const N = nodes.length;
  const M = voltageSources.length;
  const dim = N + M;

  const nodeVoltages: Record<string, number> = { GND: 0 };
  const branchCurrents: Record<string, number> = {};
  const componentPower: Record<string, number> = {};
  const ledBrightness: Record<string, number> = {};
  const motorRpm: Record<string, number> = {};
  const warnings: string[] = [];

  if (dim === 0) {
    return {
      nodeVoltages,
      branchCurrents,
      componentPower,
      ledBrightness,
      motorRpm,
      warnings,
      transientTrace: [],
    };
  }

  // Track LED forward-conducting state iteratively (4 iterations)
  const ledConducting = new Map<string, boolean>();
  schematic.components.forEach((c) => {
    if (c.kind === 'led') ledConducting.set(c.id, true);
  });

  let solution = new Array(dim).fill(0);

  for (let iter = 0; iter < 5; iter++) {
    const A: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
    const b: number[] = new Array(dim).fill(0);

    // Small leakage stabilization to ground on every node
    for (let i = 0; i < N; i++) {
      A[i][i] += 1e-8;
    }

    const stampResistor = (nA: string, nB: string, ohms: number) => {
      const g = 1 / Math.max(0.01, ohms);
      const ia = nA === 'GND' ? -1 : nodeIndex.get(nA) ?? -1;
      const ib = nB === 'GND' ? -1 : nodeIndex.get(nB) ?? -1;
      if (ia >= 0) A[ia][ia] += g;
      if (ib >= 0) A[ib][ib] += g;
      if (ia >= 0 && ib >= 0) {
        A[ia][ib] -= g;
        A[ib][ia] -= g;
      }
    };

    const stampCurrentSource = (nA: string, nB: string, amps: number) => {
      // Current enters nB and leaves nA (matches resistor current convention)
      const ia = nA === 'GND' ? -1 : nodeIndex.get(nA) ?? -1;
      const ib = nB === 'GND' ? -1 : nodeIndex.get(nB) ?? -1;
      if (ia >= 0) b[ia] -= amps;
      if (ib >= 0) b[ib] += amps;
    };

    for (const comp of schematic.components) {
      if (comp.kind === 'resistor') {
        stampResistor(comp.nodeA, comp.nodeB, Math.max(0.1, comp.value));
      } else if (comp.kind === 'motor') {
        stampResistor(comp.nodeA, comp.nodeB, Math.max(1, comp.value));
      } else if (comp.kind === 'switch') {
        stampResistor(comp.nodeA, comp.nodeB, comp.closed ? 0.05 : 1e8);
      } else if (comp.kind === 'capacitor') {
        stampResistor(comp.nodeA, comp.nodeB, 1e8); // Steady-state DC open
      } else if (comp.kind === 'led') {
        if (ledConducting.get(comp.id)) {
          const rLed = 22;
          stampResistor(comp.nodeA, comp.nodeB, rLed);
          // Model forward voltage drop Vf as series source: I = (Va - Vb - Vf) / rLed
          stampCurrentSource(comp.nodeA, comp.nodeB, -comp.value / rLed);
        } else {
          stampResistor(comp.nodeA, comp.nodeB, 1e7);
        }
      }
    }

    voltageSources.forEach((vs, k) => {
      const row = N + k;
      const ia = vs.nodeA === 'GND' ? -1 : nodeIndex.get(vs.nodeA) ?? -1;
      const ib = vs.nodeB === 'GND' ? -1 : nodeIndex.get(vs.nodeB) ?? -1;
      if (ia >= 0) {
        A[ia][row] += 1;
        A[row][ia] += 1;
      }
      if (ib >= 0) {
        A[ib][row] -= 1;
        A[row][ib] -= 1;
      }
      b[row] = vs.value;
    });

    solution = solveLinearSystem(A, b);

    // Update LED diode state for next iteration
    let changed = false;
    for (const comp of schematic.components) {
      if (comp.kind !== 'led') continue;
      const va = comp.nodeA === 'GND' ? 0 : solution[nodeIndex.get(comp.nodeA)!];
      const vb = comp.nodeB === 'GND' ? 0 : solution[nodeIndex.get(comp.nodeB)!];
      const shouldConduct = va - vb > comp.value * 0.92;
      if (shouldConduct !== ledConducting.get(comp.id)) {
        ledConducting.set(comp.id, shouldConduct);
        changed = true;
      }
    }
    if (!changed) break;
  }

  nodes.forEach((name, idx) => {
    nodeVoltages[name] = Number(solution[idx].toFixed(4));
  });

  // Compute branch currents, power, LED brightness, motor RPM
  const vSrcIndex = new Map<string, number>();
  voltageSources.forEach((vs, k) => vSrcIndex.set(vs.id, k));

  for (const comp of schematic.components) {
    const va = nodeVoltages[comp.nodeA] ?? 0;
    const vb = nodeVoltages[comp.nodeB] ?? 0;
    const dv = va - vb;
    let current = 0;

    if (comp.kind === 'battery' || comp.kind === 'mcu') {
      const k = vSrcIndex.get(comp.id)!;
      current = -solution[N + k]; // Supplied current out of positive terminal
    } else if (comp.kind === 'resistor' || comp.kind === 'motor') {
      current = dv / Math.max(0.1, comp.value);
      if (comp.kind === 'motor') {
        motorRpm[comp.id] = Math.round(Math.abs(dv) * 420);
      }
    } else if (comp.kind === 'switch') {
      current = dv / (comp.closed ? 0.05 : 1e8);
    } else if (comp.kind === 'led') {
      if (ledConducting.get(comp.id) && dv > comp.value) {
        current = (dv - comp.value) / 22;
      } else {
        current = dv / 1e7;
      }
      const ma = current * 1000;
      ledBrightness[comp.id] = Math.max(0, Math.min(1, ma / 20));
      if (ma > 35) {
        warnings.push(`${comp.name}: High current (${ma.toFixed(1)} mA > 35 mA rating)`);
      }
    } else if (comp.kind === 'capacitor') {
      current = 0;
    }

    branchCurrents[comp.id] = Number(current.toFixed(5));
    componentPower[comp.id] = Number(Math.abs(dv * current).toFixed(5));
  }

  // Generate 50-point transient RC / step waveform
  const primaryCap = schematic.components.find((c) => c.kind === 'capacitor');
  const primaryRes = schematic.components.find((c) => c.kind === 'resistor');
  const primarySrc = voltageSources[0];
  const vTarget = primaryCap
    ? Math.max(0.1, nodeVoltages[primaryCap.nodeA] ?? primarySrc?.value ?? 5)
    : primarySrc?.value ?? 5;
  const rVal = primaryRes ? Math.max(10, primaryRes.value) : 150;
  const cFarads = primaryCap ? Math.max(1e-6, primaryCap.value * 1e-6) : 100e-6;
  const tau = rVal * cFarads;
  const totalMs = Math.max(20, Math.min(500, tau * 4.5 * 1000));

  const transientTrace: CircuitSolveResult['transientTrace'] = [];
  for (let i = 0; i <= 40; i++) {
    const tMs = (i / 40) * totalMs;
    const tSec = tMs / 1000;
    const vCap = primaryCap
      ? vTarget * (1 - Math.exp(-tSec / Math.max(1e-4, tau)))
      : vTarget;
    const iMa = primaryCap
      ? ((vTarget - vCap) / rVal) * 1000
      : (branchCurrents[primaryRes?.id ?? primarySrc?.id ?? ''] ?? 0) * 1000;
    transientTrace.push({
      tMs: Number(tMs.toFixed(1)),
      voltage: Number(vCap.toFixed(3)),
      currentMa: Number(Math.abs(iMa).toFixed(2)),
    });
  }

  return {
    nodeVoltages,
    branchCurrents,
    componentPower,
    ledBrightness,
    motorRpm,
    warnings,
    transientTrace,
  };
}

export function createComponentTemplate(
  kind: CircuitComponentKind,
  index: number
): CircuitComponent {
  const defaults: Record<CircuitComponentKind, { name: string; value: number }> = {
    battery: { name: `Source ${index}`, value: 5.0 },
    resistor: { name: `R${index}`, value: 220 },
    led: { name: `LED${index}`, value: 2.0 },
    capacitor: { name: `C${index}`, value: 220 },
    switch: { name: `SW${index}`, value: 0 },
    motor: { name: `M${index}`, value: 12 },
    mcu: { name: `MCU${index}`, value: 3.3 },
  };
  return {
    id: `comp-${kind}-${Date.now()}-${index}`,
    name: defaults[kind].name,
    kind,
    nodeA: 'VCC',
    nodeB: 'GND',
    value: defaults[kind].value,
    closed: kind === 'switch' ? true : undefined,
    x: 160 + ((index * 95) % 380),
    y: 120 + ((index * 70) % 200),
    color: kind === 'led' ? '#22d3ee' : undefined,
  };
}

export interface Circuit3DSceneHandle {
  group: THREE.Group;
  rotors: Array<{ mesh: THREE.Object3D; rpm: number }>;
  dispose: () => void;
}

/**
 * Builds a live 3D PCB Assembly synced directly to schematic & MNA solver outputs.
 */
export function buildCircuit3DPCBGroup(
  schematic: CircuitSchematic,
  solved: CircuitSolveResult
): Circuit3DSceneHandle {
  const group = new THREE.Group();
  const rotors: Array<{ mesh: THREE.Object3D; rpm: number }> = [];
  const disposables: Array<{ dispose: () => void }> = [];

  // PCB Substrate & Standoffs
  const pcbGeom = new THREE.BoxGeometry(7.2, 0.16, 4.6);
  const pcbMat = new THREE.MeshStandardMaterial({
    color: '#064e3b',
    roughness: 0.42,
    metalness: 0.18,
  });
  const pcb = new THREE.Mesh(pcbGeom, pcbMat);
  pcb.position.set(0, 0.38, 0);
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  group.add(pcb);
  disposables.push(pcbGeom, pcbMat);

  const standoffGeom = new THREE.CylinderGeometry(0.11, 0.11, 0.32, 12);
  const standoffMat = new THREE.MeshStandardMaterial({
    color: '#d4af37',
    metalness: 0.85,
    roughness: 0.25,
  });
  disposables.push(standoffGeom, standoffMat);
  [
    [-3.3, 0.16, -2.0],
    [3.3, 0.16, -2.0],
    [-3.3, 0.16, 2.0],
    [3.3, 0.16, 2.0],
  ].forEach(([sx, sy, sz]) => {
    const st = new THREE.Mesh(standoffGeom, standoffMat);
    st.position.set(sx, sy, sz);
    group.add(st);
  });

  // Map 2D schematic coordinates (0..700, 0..420) onto PCB top (-3.0..3.0, -1.7..1.7)
  const mapPos = (cx: number, cy: number): [number, number] => [
    ((cx / 700) - 0.5) * 5.8,
    ((cy / 420) - 0.5) * 3.5,
  ];

  // Copper trace bars between wired components
  const traceMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    metalness: 0.8,
    roughness: 0.25,
  });
  disposables.push(traceMat);

  const compById = new Map(schematic.components.map((c) => [c.id, c]));
  for (const w of schematic.wires) {
    const c1 = compById.get(w.fromCompId);
    const c2 = compById.get(w.toCompId);
    if (!c1 || !c2) continue;
    const [x1, z1] = mapPos(c1.x, c1.y);
    const [x2, z2] = mapPos(c2.x, c2.y);
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) continue;
    const tGeom = new THREE.BoxGeometry(len, 0.025, 0.07);
    const trace = new THREE.Mesh(tGeom, traceMat);
    trace.position.set((x1 + x2) * 0.5, 0.475, (z1 + z2) * 0.5);
    trace.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(trace);
    disposables.push(tGeom);
  }

  // 3D Components
  for (const comp of schematic.components) {
    const [px, pz] = mapPos(comp.x, comp.y);
    const py = 0.46;

    if (comp.kind === 'battery') {
      const g = new THREE.BoxGeometry(1.1, 0.48, 0.68);
      const m = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.35, metalness: 0.3 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(px, py + 0.24, pz);
      mesh.castShadow = true;
      group.add(mesh);
      disposables.push(g, m);
    } else if (comp.kind === 'mcu') {
      const g = new THREE.BoxGeometry(1.3, 0.2, 0.85);
      const m = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.3, metalness: 0.65 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(px, py + 0.1, pz);
      mesh.castShadow = true;
      group.add(mesh);
      disposables.push(g, m);
    } else if (comp.kind === 'resistor') {
      const g = new THREE.CylinderGeometry(0.14, 0.14, 0.72, 16);
      g.rotateZ(Math.PI / 2);
      const m = new THREE.MeshStandardMaterial({ color: '#d6b48a', roughness: 0.45 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(px, py + 0.2, pz);
      mesh.castShadow = true;
      group.add(mesh);
      disposables.push(g, m);
    } else if (comp.kind === 'capacitor') {
      const g = new THREE.CylinderGeometry(0.24, 0.24, 0.68, 20);
      const m = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.5, roughness: 0.3 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(px, py + 0.34, pz);
      mesh.castShadow = true;
      group.add(mesh);
      disposables.push(g, m);
    } else if (comp.kind === 'switch') {
      const baseG = new THREE.BoxGeometry(0.55, 0.18, 0.45);
      const baseM = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });
      const base = new THREE.Mesh(baseG, baseM);
      base.position.set(px, py + 0.09, pz);
      group.add(base);
      const leverG = new THREE.BoxGeometry(0.12, 0.38, 0.12);
      const leverM = new THREE.MeshStandardMaterial({
        color: comp.closed ? '#34d399' : '#fb7185',
        metalness: 0.4,
      });
      const lever = new THREE.Mesh(leverG, leverM);
      lever.position.set(px, py + 0.3, pz);
      lever.rotation.z = comp.closed ? -0.35 : 0.45;
      group.add(lever);
      disposables.push(baseG, baseM, leverG, leverM);
    } else if (comp.kind === 'led') {
      const bright = solved.ledBrightness[comp.id] ?? 0;
      const ledColor = comp.color || '#22d3ee';
      const g = new THREE.SphereGeometry(0.24, 20, 16);
      const m = new THREE.MeshStandardMaterial({
        color: ledColor,
        emissive: ledColor,
        emissiveIntensity: bright * 2.4,
        roughness: 0.15,
        transparent: true,
        opacity: 0.45 + bright * 0.55,
      });
      const bulb = new THREE.Mesh(g, m);
      bulb.position.set(px, py + 0.28, pz);
      group.add(bulb);
      disposables.push(g, m);
    } else if (comp.kind === 'motor') {
      const bodyG = new THREE.CylinderGeometry(0.36, 0.36, 0.78, 22);
      const bodyM = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.28 });
      const body = new THREE.Mesh(bodyG, bodyM);
      body.position.set(px, py + 0.39, pz);
      body.castShadow = true;
      group.add(body);

      const propGroup = new THREE.Group();
      propGroup.position.set(px, py + 0.84, pz);
      const bladeG = new THREE.BoxGeometry(1.1, 0.04, 0.14);
      const bladeM = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.35 });
      const blade = new THREE.Mesh(bladeG, bladeM);
      propGroup.add(blade);
      group.add(propGroup);

      rotors.push({ mesh: propGroup, rpm: solved.motorRpm[comp.id] ?? 0 });
      disposables.push(bodyG, bodyM, bladeG, bladeM);
    }
  }

  return {
    group,
    rotors,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
