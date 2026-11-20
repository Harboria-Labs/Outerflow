import { describe, expect, it } from 'vitest';
import {
  DISCIPLINE_META,
  ENGINE_CONTRACTS,
  UNIFIED_ELEMENT_REGISTRY,
  createElectromechanicalRoboticSystemGraph,
  createMathBiologicalDynamicalGraph,
  createNodeFromDefinition,
  executeSystemGraph,
  validatePortConnection,
  type ElementDiscipline,
  type SystemGraphModel,
} from '../engines/project/systemGraphEngine';

describe('Outerflow Master Directive: Unified 9-Discipline Element Ecosystem & System Graph', () => {
  it('registers elements across all 9 required engineering & scientific disciplines with typed ports and engine contracts', () => {
    const requiredDisciplines: ElementDiscipline[] = [
      'mechanical',
      'robotics',
      'electrical',
      'mathematics',
      'physics',
      'fluid-thermal',
      'computational',
      'biological',
      'materials',
    ];

    expect(ENGINE_CONTRACTS.length).toBeGreaterThanOrEqual(5);

    for (const disc of requiredDisciplines) {
      expect(DISCIPLINE_META[disc]).toBeDefined();
      const defs = UNIFIED_ELEMENT_REGISTRY.filter((d) => d.discipline === disc);
      expect(defs.length, `Missing element definitions for discipline: ${disc}`).toBeGreaterThan(0);

      for (const def of defs) {
        expect(def.ports.length).toBeGreaterThan(0);
        expect(def.compatibleEngines.length).toBeGreaterThan(0);
      }
    }
  });

  it('supports starting from an empty project graph, instantiating individual elements, and validating port compatibility', () => {
    const blankGraph: SystemGraphModel = {
      id: 'blank',
      name: 'Blank Project',
      description: 'Started from scratch',
      nodes: [],
      edges: [],
    };
    expect(blankGraph.nodes.length).toBe(0);

    const batteryNode = createNodeFromDefinition('elec-dc-power-bus', { id: 'b1' });
    const motorNode = createNodeFromDefinition('mech-dc-gear-motor', { id: 'm1' });
    const bioNode = createNodeFromDefinition('bio-adaptive-ecosystem', { id: 'bio1' });

    const batteryDef = UNIFIED_ELEMENT_REGISTRY.find((d) => d.id === 'elec-dc-power-bus')!;
    const motorDef = UNIFIED_ELEMENT_REGISTRY.find((d) => d.id === 'mech-dc-gear-motor')!;
    const bioDef = UNIFIED_ELEMENT_REGISTRY.find((d) => d.id === 'bio-adaptive-ecosystem')!;

    // Valid electrical connection: battery v_bus (V) -> motor v_in (V)
    const validCheck = validatePortConnection(batteryDef, 'v_bus', motorDef, 'v_in');
    expect(validCheck.valid).toBe(true);

    // Invalid cross-discipline connection without transducer: battery v_bus (electrical) -> bio stimulus (biological)
    const invalidCheck = validatePortConnection(batteryDef, 'v_bus', bioDef, 'stimulus');
    expect(invalidCheck.valid).toBe(false);

    blankGraph.nodes.push(batteryNode, motorNode, bioNode);
    blankGraph.edges.push({
      id: 'e1',
      fromNodeId: batteryNode.id,
      fromPortId: 'v_bus',
      toNodeId: motorNode.id,
      toPortId: 'v_in',
      kind: 'electrical',
      valid: true,
    });

    const res = executeSystemGraph(blankGraph, { durationSec: 2.0, dtSec: 1 / 60 });
    expect(res.ok).toBe(true);
    expect(res.validationErrors.length).toBe(0);
    expect(res.finalNodeOutputs[motorNode.id].omega).toBeGreaterThan(10);
  });

  it('executes Acceptance Demonstration 1: Complete Electromechanical Robotic System Co-Simulation', () => {
    const robotGraph = createElectromechanicalRoboticSystemGraph();
    expect(robotGraph.nodes.length).toBe(9);
    expect(robotGraph.edges.length).toBe(11);

    const res = executeSystemGraph(robotGraph, { durationSec: 4.0, dtSec: 1 / 60 });
    expect(res.ok).toBe(true);
    expect(res.validationErrors.length).toBe(0);
    expect(res.samples.length).toBeGreaterThan(20);

    // Verify electrical, mechanical, robotic, control, and materials nodes all computed non-zero responses
    const armOut = res.finalNodeOutputs['node-arm'];
    const stressOut = res.finalNodeOutputs['node-stress'];
    const batOut = res.finalNodeOutputs['node-battery'];

    expect(armOut).toBeDefined();
    expect(Number.isFinite(armOut.theta)).toBe(true);
    expect(Math.abs(armOut.theta)).toBeGreaterThan(0.05);
    expect(batOut.v_bus).toBeGreaterThan(20);
    expect(stressOut.safety_factor).toBeGreaterThan(1);
  });

  it('executes Acceptance Demonstration 2: Physics-Independent Mathematical & Biological Dynamical System', () => {
    const mathBioGraph = createMathBiologicalDynamicalGraph();
    const res = executeSystemGraph(mathBioGraph, { durationSec: 5.0, dtSec: 1 / 60 });

    expect(res.ok).toBe(true);
    expect(res.validationErrors.length).toBe(0);

    const bioOut = res.finalNodeOutputs['node-bio-cell'];
    const intOut = res.finalNodeOutputs['node-math-int'];
    const oscOut = res.finalNodeOutputs['node-phys-osc'];

    expect(bioOut.activator_u).toBeGreaterThan(0.1);
    expect(bioOut.inhibitor_v).toBeGreaterThan(0.1);
    expect(intOut.state_x).toBeGreaterThan(0.2);
    expect(Number.isFinite(oscOut.displacement)).toBe(true);
  });
});
