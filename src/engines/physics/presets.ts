import type { StudioEntity, StudioJoint } from '../../types/studio';

export interface PhysicsPreset {
  id: string;
  name: string;
  description: string;
  entities: StudioEntity[];
  joints: StudioJoint[];
}

function makeEntity(
  partial: Partial<StudioEntity> & { id: string; name: string; shape: StudioEntity['shape'] }
): StudioEntity {
  return {
    category: 'physics',
    bodyType: 'dynamic',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    size: { width: 1, height: 1, depth: 1, radius: 0.5 },
    color: '#38bdf8',
    metalness: 0.25,
    roughness: 0.4,
    opacity: 1,
    visible: true,
    ...partial,
    physics: {
      mass: 1,
      friction: 0.5,
      restitution: 0.3,
      linearDamping: 0.02,
      angularDamping: 0.05,
      initialVelocity: [0, 0, 0],
      ...(partial.physics ?? {}),
    },
  };
}

export function getPhysicsPresets(): PhysicsPreset[] {
  return [
    buildSuspensionRigPreset(),
    buildCatapultPreset(),
    buildDoublePendulumPreset(),
    buildRoboticArmPreset(),
    buildRoverPreset(),
    buildSandboxDropPreset(),
    buildDominoPreset(),
  ];
}

function buildSuspensionRigPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'susp-pad',
      name: 'Test Rig Baseplate',
      shape: 'box',
      bodyType: 'fixed',
      position: [0, 0.14, 0],
      size: { width: 4.2, height: 0.28, depth: 2.2, radius: 0.2 },
      color: '#334155',
      metalness: 0.55,
      roughness: 0.45,
      density: 7800,
      materialPreset: 'steel',
    }),
    makeEntity({
      id: 'susp-mount',
      name: 'Upper Chassis Strut Mount',
      shape: 'box',
      bodyType: 'fixed',
      position: [0, 3.85, 0],
      size: { width: 2.4, height: 0.36, depth: 1.2, radius: 0.2 },
      color: '#64748b',
      metalness: 0.7,
      roughness: 0.32,
      density: 7800,
      materialPreset: 'steel',
    }),
    makeEntity({
      id: 'susp-hub',
      name: 'Sprung Hub Assembly',
      shape: 'box',
      bodyType: 'dynamic',
      position: [0, 2.45, 0],
      size: { width: 1.8, height: 0.55, depth: 0.9, radius: 0.3 },
      color: '#38bdf8',
      metalness: 0.65,
      roughness: 0.28,
      density: 7800,
      materialPreset: 'steel',
      computedVolumeM3: 1.8 * 0.55 * 0.9 * 0.001,
      computedAreaM2: 2 * (1.8 * 0.55 + 1.8 * 0.9 + 0.55 * 0.9) * 0.01,
      physics: {
        mass: Number((1.8 * 0.55 * 0.9 * 0.001 * 7800).toFixed(3)),
        friction: 0.4,
        restitution: 0.2,
        linearDamping: 0.02,
        angularDamping: 0.05,
        initialVelocity: [0, -2.6, 0],
      },
    }),
    makeEntity({
      id: 'susp-wheel',
      name: 'Rolling Bump Flywheel',
      shape: 'cylinder',
      bodyType: 'dynamic',
      position: [0, 1.55, 0],
      rotation: [Math.PI / 2, 0, 0],
      size: { width: 1.1, height: 0.5, depth: 1.1, radius: 0.55 },
      color: '#f59e0b',
      metalness: 0.35,
      roughness: 0.55,
      parentId: 'susp-hub',
      density: 2700,
      materialPreset: 'aluminum',
      physics: {
        mass: 2.6,
        friction: 0.8,
        restitution: 0.45,
        linearDamping: 0.02,
        angularDamping: 0.04,
        initialVelocity: [0, -2.6, 0],
      },
    }),
  ];

  const joints: StudioJoint[] = [
    {
      id: 'susp-guide',
      name: 'Telescoping Strut Guide',
      kind: 'prismatic',
      bodyA: 'susp-mount',
      bodyB: 'susp-hub',
      anchorA: [0, -0.18, 0],
      anchorB: [0, 0.28, 0],
      axis: [0, 1, 0],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'susp-spring',
      name: 'Main Coilover Spring-Damper',
      kind: 'spring',
      bodyA: 'susp-mount',
      bodyB: 'susp-hub',
      anchorA: [0, -0.18, 0],
      anchorB: [0, 0.28, 0],
      axis: [0, 1, 0],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 160,
      damping: 14,
      restLength: 0.95,
    },
    {
      id: 'susp-axle',
      name: 'Hub-to-Wheel Bearing',
      kind: 'fixed',
      bodyA: 'susp-hub',
      bodyB: 'susp-wheel',
      anchorA: [0, -0.9, 0],
      anchorB: [0, 0, 0],
      axis: [0, 1, 0],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
  ];

  return {
    id: 'suspension-rig',
    name: 'Coilover Suspension Rig',
    description:
      'Playable telescoping coilover strut: slide Length, Density, Spring Stiffness & Damping live',
    entities,
    joints,
  };
}

function buildSandboxDropPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'ramp-1',
      name: 'Launch Ramp',
      shape: 'box',
      bodyType: 'fixed',
      position: [-3.4, 1.4, 0],
      rotation: [0, 0, -0.38],
      size: { width: 4.8, height: 0.25, depth: 1.8, radius: 0.5 },
      color: '#475569',
      metalness: 0.4,
      roughness: 0.6,
    }),
    makeEntity({
      id: 'striker-ball',
      name: 'Brass Striker Sphere',
      shape: 'sphere',
      position: [-5.1, 2.7, 0],
      size: { width: 1, height: 1, depth: 1, radius: 0.55 },
      color: '#f59e0b',
      metalness: 0.75,
      roughness: 0.2,
      physics: {
        mass: 5.5,
        friction: 0.3,
        restitution: 0.55,
        linearDamping: 0.01,
        angularDamping: 0.01,
        initialVelocity: [2.2, 0, 0],
      },
    }),
  ];

  // 3x3 block pyramid target
  const colors = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8'];
  let idx = 0;
  for (let row = 0; row < 3; row++) {
    const count = 3 - row;
    for (let col = 0; col < count; col++) {
      const z = (col - (count - 1) / 2) * 0.92;
      const y = 0.42 + row * 0.84;
      entities.push(
        makeEntity({
          id: `tower-blk-${idx}`,
          name: `Target Block ${idx + 1}`,
          shape: 'box',
          position: [2.2, y, z],
          size: { width: 0.8, height: 0.8, depth: 0.8, radius: 0.4 },
          color: colors[row % colors.length],
          physics: {
            mass: 0.9,
            friction: 0.55,
            restitution: 0.25,
            linearDamping: 0.03,
            angularDamping: 0.05,
            initialVelocity: [0, 0, 0],
          },
        })
      );
      idx++;
    }
  }

  entities.push(
    makeEntity({
      id: 'bouncer-orb',
      name: 'High-Bounce Capsule',
      shape: 'capsule',
      position: [0.2, 4.5, 1.4],
      size: { width: 0.6, height: 0.8, depth: 0.6, radius: 0.32 },
      color: '#34d399',
      physics: {
        mass: 1.2,
        friction: 0.3,
        restitution: 0.88,
        linearDamping: 0.01,
        angularDamping: 0.02,
        initialVelocity: [0, 0, 0],
      },
    })
  );

  return {
    id: 'sandboxDrop',
    name: 'Sandbox Impact Lab',
    description: 'Inclined striker sphere impacting a 3-tier block target stack',
    entities,
    joints: [],
  };
}

function buildDoublePendulumPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'dp-pivot',
      name: 'Fixed Overhead Pivot',
      shape: 'cylinder',
      bodyType: 'fixed',
      position: [0, 5.2, 0],
      rotation: [Math.PI / 2, 0, 0],
      size: { width: 0.5, height: 0.4, depth: 0.5, radius: 0.22 },
      color: '#94a3b8',
      metalness: 0.7,
    }),
    makeEntity({
      id: 'dp-arm1',
      name: 'Upper Pendulum Arm',
      shape: 'box',
      position: [1.0, 5.2, 0],
      size: { width: 2.0, height: 0.24, depth: 0.24, radius: 0.12 },
      color: '#22d3ee',
      physics: {
        mass: 1.8,
        friction: 0.1,
        restitution: 0.2,
        linearDamping: 0,
        angularDamping: 0,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'dp-arm2',
      name: 'Lower Pendulum Arm',
      shape: 'box',
      position: [2.9, 5.2, 0],
      size: { width: 1.8, height: 0.22, depth: 0.22, radius: 0.11 },
      color: '#f59e0b',
      physics: {
        mass: 1.4,
        friction: 0.1,
        restitution: 0.2,
        linearDamping: 0,
        angularDamping: 0,
        initialVelocity: [0, 1.5, 0],
      },
    }),
    makeEntity({
      id: 'dp-bob',
      name: 'Tip Mass Bob',
      shape: 'sphere',
      position: [3.8, 5.2, 0],
      size: { width: 0.6, height: 0.6, depth: 0.6, radius: 0.3 },
      color: '#fb7185',
      metalness: 0.7,
      roughness: 0.2,
      physics: {
        mass: 2.2,
        friction: 0.1,
        restitution: 0.3,
        linearDamping: 0,
        angularDamping: 0,
        initialVelocity: [0, 0, 0],
      },
    }),
  ];

  const joints: StudioJoint[] = [
    {
      id: 'dp-j1',
      name: 'Primary Hinge',
      kind: 'revolute',
      bodyA: 'dp-pivot',
      bodyB: 'dp-arm1',
      anchorA: [0, 0, 0],
      anchorB: [-1.0, 0, 0],
      axis: [0, 0, 1],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'dp-j2',
      name: 'Elbow Hinge',
      kind: 'revolute',
      bodyA: 'dp-arm1',
      bodyB: 'dp-arm2',
      anchorA: [1.0, 0, 0],
      anchorB: [-0.9, 0, 0],
      axis: [0, 0, 1],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'dp-j3',
      name: 'Bob Weld',
      kind: 'fixed',
      bodyA: 'dp-arm2',
      bodyB: 'dp-bob',
      anchorA: [0.9, 0, 0],
      anchorB: [0, 0, 0],
      axis: [0, 1, 0],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
  ];

  return {
    id: 'doublePendulum',
    name: 'Chaotic Double Pendulum',
    description: 'Low-damping 2-link pendulum demonstrating nonlinear chaos & energy exchange',
    entities,
    joints,
  };
}

function buildCatapultPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'cat-base',
      name: 'Catapult Fulcrum Base',
      shape: 'box',
      bodyType: 'fixed',
      position: [-2.0, 0.75, 0],
      size: { width: 1.0, height: 1.5, depth: 1.4, radius: 0.4 },
      color: '#475569',
    }),
    makeEntity({
      id: 'cat-arm',
      name: 'Throwing Lever Arm',
      shape: 'box',
      position: [-1.2, 1.7, 0],
      rotation: [0, 0, 0.25],
      size: { width: 4.8, height: 0.2, depth: 0.45, radius: 0.2 },
      color: '#38bdf8',
      physics: {
        mass: 2.0,
        friction: 0.4,
        restitution: 0.2,
        linearDamping: 0.01,
        angularDamping: 0.01,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'cat-counterweight',
      name: 'Heavy Counterweight',
      shape: 'box',
      position: [-3.4, 1.35, 0],
      size: { width: 0.85, height: 0.85, depth: 0.85, radius: 0.4 },
      color: '#f59e0b',
      metalness: 0.8,
      roughness: 0.25,
      physics: {
        mass: 26,
        friction: 0.5,
        restitution: 0.1,
        linearDamping: 0.01,
        angularDamping: 0.01,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'cat-projectile',
      name: 'Payload Sphere',
      shape: 'sphere',
      position: [1.0, 2.55, 0],
      size: { width: 0.7, height: 0.7, depth: 0.7, radius: 0.35 },
      color: '#fb7185',
      physics: {
        mass: 1.1,
        friction: 0.3,
        restitution: 0.5,
        linearDamping: 0,
        angularDamping: 0.01,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'cat-stop',
      name: 'Release Stopper',
      shape: 'box',
      bodyType: 'fixed',
      position: [-0.8, 3.3, 0],
      size: { width: 0.25, height: 0.25, depth: 1.4, radius: 0.2 },
      color: '#94a3b8',
    }),
  ];

  const joints: StudioJoint[] = [
    {
      id: 'cat-hinge',
      name: 'Fulcrum Pivot',
      kind: 'revolute',
      bodyA: 'cat-base',
      bodyB: 'cat-arm',
      anchorA: [0, 0.95, 0],
      anchorB: [-0.8, 0, 0],
      axis: [0, 0, 1],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'cat-cw-hinge',
      name: 'Counterweight Hinge',
      kind: 'revolute',
      bodyA: 'cat-arm',
      bodyB: 'cat-counterweight',
      anchorA: [-2.2, 0, 0],
      anchorB: [0, 0.55, 0],
      axis: [0, 0, 1],
      motorSpeed: 0,
      motorMaxForce: 0,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
  ];

  return {
    id: 'catapult',
    name: 'Trebuchet / Catapult Rig',
    description: 'Gravity-driven counterweight lever launching a free payload',
    entities,
    joints,
  };
}

function buildRoverPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'rover-chassis',
      name: 'Rover Chassis',
      shape: 'box',
      position: [-4.5, 1.15, 0],
      size: { width: 2.4, height: 0.42, depth: 1.25, radius: 0.3 },
      color: '#22d3ee',
      metalness: 0.45,
      physics: {
        mass: 5.0,
        friction: 0.5,
        restitution: 0.1,
        linearDamping: 0.04,
        angularDamping: 0.08,
        initialVelocity: [0, 0, 0],
      },
    }),
  ];

  const wheelPositions: { id: string; name: string; pos: [number, number, number]; anchorA: [number, number, number] }[] = [
    { id: 'wheel-fl', name: 'Wheel Front-Left', pos: [-3.65, 0.72, -0.82], anchorA: [0.85, -0.43, -0.82] },
    { id: 'wheel-fr', name: 'Wheel Front-Right', pos: [-3.65, 0.72, 0.82], anchorA: [0.85, -0.43, 0.82] },
    { id: 'wheel-rl', name: 'Wheel Rear-Left', pos: [-5.35, 0.72, -0.82], anchorA: [-0.85, -0.43, -0.82] },
    { id: 'wheel-rr', name: 'Wheel Rear-Right', pos: [-5.35, 0.72, 0.82], anchorA: [-0.85, -0.43, 0.82] },
  ];

  const joints: StudioJoint[] = [];

  for (const w of wheelPositions) {
    entities.push(
      makeEntity({
        id: w.id,
        name: w.name,
        shape: 'cylinder',
        position: w.pos,
        rotation: [Math.PI / 2, 0, 0],
        size: { width: 0.9, height: 0.32, depth: 0.9, radius: 0.45 },
        color: '#f59e0b',
        roughness: 0.7,
        physics: {
          mass: 1.2,
          friction: 1.25,
          restitution: 0.15,
          linearDamping: 0.02,
          angularDamping: 0.02,
          initialVelocity: [0, 0, 0],
        },
      })
    );

    joints.push({
      id: `drive-${w.id}`,
      name: `Motor ${w.name}`,
      kind: 'revolute',
      bodyA: 'rover-chassis',
      bodyB: w.id,
      anchorA: w.anchorA,
      anchorB: [0, 0, 0],
      axis: [0, 1, 0], // Cylinder was rotated 90deg around X so its local Y is world Z!
      motorSpeed: -5.5,
      motorMaxForce: 14,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    });
  }

  // Speed bumps along rover path
  [
    { x: -1.2, h: 0.22 },
    { x: 1.1, h: 0.3 },
    { x: 3.4, h: 0.26 },
  ].forEach((b, i) => {
    entities.push(
      makeEntity({
        id: `bump-${i}`,
        name: `Terrain Bump ${i + 1}`,
        shape: 'box',
        bodyType: 'fixed',
        position: [b.x, b.h / 2, 0],
        rotation: [0, 0, 0.08],
        size: { width: 0.9, height: b.h, depth: 2.6, radius: 0.2 },
        color: '#64748b',
        physics: {
          mass: 1,
          friction: 1.1,
          restitution: 0.1,
          linearDamping: 0,
          angularDamping: 0,
          initialVelocity: [0, 0, 0],
        },
      })
    );
  });

  return {
    id: 'rover',
    name: '4WD Motorized Rover',
    description: 'Four-wheel motorized test rover traversing uneven terrain obstacles',
    entities,
    joints,
  };
}

function buildRoboticArmPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'arm-base',
      name: 'Pedestal Base',
      shape: 'cylinder',
      bodyType: 'fixed',
      position: [0, 0.4, 0],
      size: { width: 1.2, height: 0.8, depth: 1.2, radius: 0.65 },
      color: '#475569',
      metalness: 0.7,
    }),
    makeEntity({
      id: 'arm-turret',
      name: 'Yaw Turret',
      shape: 'cylinder',
      position: [0, 1.05, 0],
      size: { width: 0.9, height: 0.5, depth: 0.9, radius: 0.48 },
      color: '#22d3ee',
      physics: {
        mass: 2.5,
        friction: 0.4,
        restitution: 0.1,
        linearDamping: 0.1,
        angularDamping: 0.2,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'arm-upper',
      name: 'Shoulder Link',
      shape: 'box',
      position: [0, 2.25, 0],
      size: { width: 0.34, height: 1.9, depth: 0.34, radius: 0.2 },
      color: '#38bdf8',
      physics: {
        mass: 1.8,
        friction: 0.4,
        restitution: 0.1,
        linearDamping: 0.1,
        angularDamping: 0.2,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'arm-forearm',
      name: 'Forearm Link',
      shape: 'box',
      position: [0.85, 3.15, 0],
      size: { width: 1.7, height: 0.28, depth: 0.28, radius: 0.15 },
      color: '#f59e0b',
      physics: {
        mass: 1.2,
        friction: 0.4,
        restitution: 0.1,
        linearDamping: 0.1,
        angularDamping: 0.2,
        initialVelocity: [0, 0, 0],
      },
    }),
    makeEntity({
      id: 'arm-payload',
      name: 'Workspace Target Cube',
      shape: 'box',
      position: [1.8, 0.4, 1.2],
      size: { width: 0.6, height: 0.6, depth: 0.6, radius: 0.3 },
      color: '#34d399',
    }),
  ];

  const joints: StudioJoint[] = [
    {
      id: 'arm-j-yaw',
      name: 'Base Yaw Motor',
      kind: 'revolute',
      bodyA: 'arm-base',
      bodyB: 'arm-turret',
      anchorA: [0, 0.4, 0],
      anchorB: [0, -0.25, 0],
      axis: [0, 1, 0],
      motorSpeed: 0.85,
      motorMaxForce: 20,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'arm-j-shoulder',
      name: 'Shoulder Pitch Motor',
      kind: 'revolute',
      bodyA: 'arm-turret',
      bodyB: 'arm-upper',
      anchorA: [0, 0.25, 0],
      anchorB: [0, -0.95, 0],
      axis: [0, 0, 1],
      motorSpeed: 0.3,
      motorMaxForce: 24,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
    {
      id: 'arm-j-elbow',
      name: 'Elbow Pitch Motor',
      kind: 'revolute',
      bodyA: 'arm-upper',
      bodyB: 'arm-forearm',
      anchorA: [0, 0.9, 0],
      anchorB: [-0.85, 0, 0],
      axis: [0, 0, 1],
      motorSpeed: -0.6,
      motorMaxForce: 18,
      stiffness: 0,
      damping: 0,
      restLength: 0,
    },
  ];

  return {
    id: 'robotArm',
    name: '3-DOF Robotic Arm',
    description: 'Articulated manipulator with interactive yaw, shoulder, and elbow motor sliders',
    entities,
    joints,
  };
}

function buildDominoPreset(): PhysicsPreset {
  const entities: StudioEntity[] = [
    makeEntity({
      id: 'dom-ramp',
      name: 'Trigger Chute',
      shape: 'box',
      bodyType: 'fixed',
      position: [-4.6, 1.35, 0],
      rotation: [0, 0, -0.45],
      size: { width: 2.8, height: 0.2, depth: 1.0, radius: 0.2 },
      color: '#475569',
    }),
    makeEntity({
      id: 'dom-ball',
      name: 'Trigger Sphere',
      shape: 'sphere',
      position: [-5.5, 2.25, 0],
      size: { width: 0.7, height: 0.7, depth: 0.7, radius: 0.35 },
      color: '#f59e0b',
      metalness: 0.75,
      physics: {
        mass: 3.0,
        friction: 0.3,
        restitution: 0.4,
        linearDamping: 0.01,
        angularDamping: 0.01,
        initialVelocity: [2.5, 0, 0],
      },
    }),
  ];

  const count = 16;
  const palette = ['#22d3ee', '#38bdf8', '#818cf8', '#a78bfa'];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = -0.35 + t * 1.45;
    const x = -2.8 + Math.sin(angle) * 3.8 + t * 2.2;
    const z = (1 - Math.cos(angle)) * 3.6;
    entities.push(
      makeEntity({
        id: `domino-${i}`,
        name: `Domino ${i + 1}`,
        shape: 'box',
        position: [x, 0.72, z],
        rotation: [0, -angle * 0.7, 0],
        size: { width: 0.16, height: 1.4, depth: 0.65, radius: 0.2 },
        color: palette[i % palette.length],
        physics: {
          mass: 0.6,
          friction: 0.55,
          restitution: 0.15,
          linearDamping: 0.02,
          angularDamping: 0.02,
          initialVelocity: [0, 0, 0],
        },
      })
    );
  }

  return {
    id: 'dominoes',
    name: 'Curved Domino Cascade',
    description: 'Chain reaction of 16 rigid domino tiles triggered by an inclined sphere',
    entities,
    joints: [],
  };
}
