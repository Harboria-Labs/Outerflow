import * as THREE from 'three';
import type {
  CadPartConfig,
  PartCategory,
  SnapMode,
  Vec3,
} from '../../types/studio';
import { createParametricGeometry, serializeBufferGeometry } from './parametricGenerators';
import {
  ROBOTICS_HARDWARE_CATALOG,
  buildRoboticsHardwareGeometry,
} from '../electronics/roboticsHardwareLibrary';

export interface LibraryPartMeta {
  id: string;
  name: string;
  category: PartCategory;
  description: string;
  defaultColor: string;
}

const HARDWARE_LIBRARY_ITEMS: LibraryPartMeta[] = ROBOTICS_HARDWARE_CATALOG.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  description: `${item.summary} (${item.logicVoltage})`,
  defaultColor: item.defaultColor,
}));

const BASE_PART_LIBRARY: LibraryPartMeta[] = [
  // Robotics
  {
    id: 'servo-motor',
    name: 'Servo Actuator',
    category: 'robotics',
    description: 'Standard hobby/robotics servo with mounting tabs & spline horn',
    defaultColor: '#2563eb',
  },
  {
    id: 'robot-gripper',
    name: 'Dual-Jaw Gripper',
    category: 'robotics',
    description: 'Parallel actuator housing with dual articulated jaws',
    defaultColor: '#f59e0b',
  },
  {
    id: 'rover-wheel',
    name: 'Rover Tire & Hub',
    category: 'robotics',
    description: 'Treaded wheel rim with central hex hub',
    defaultColor: '#334155',
  },
  {
    id: 'chassis-plate',
    name: 'Slotted Chassis Deck',
    category: 'robotics',
    description: 'Lightweight multi-hole robotics mounting deck',
    defaultColor: '#1e293b',
  },
  {
    id: 'robot-arm-link',
    name: 'Robot Arm Link',
    category: 'robotics',
    description: 'Ribbed structural manipulator arm with bearing bosses',
    defaultColor: '#38bdf8',
  },
  {
    id: 'lidar-turret',
    name: '360° LiDAR Sensor',
    category: 'robotics',
    description: 'Spinning optical scanner puck for SLAM navigation',
    defaultColor: '#0ea5e9',
  },

  // Electronics
  {
    id: 'mcu-board',
    name: 'MCU Dev Board',
    category: 'electronics',
    description: 'ESP32 / microcontroller PCB with USB port, RF shield & pin headers',
    defaultColor: '#059669',
  },
  {
    id: 'lipo-pack',
    name: 'LiPo Battery Pack',
    category: 'electronics',
    description: 'Dual-cell LiPo brick with XT60 power leads',
    defaultColor: '#3b82f6',
  },
  {
    id: 'dc-motor',
    name: 'DC Geared Motor',
    category: 'electronics',
    description: 'Cylindrical brushed motor canister with gearbox & D-shaft',
    defaultColor: '#94a3b8',
  },
  {
    id: 'ultrasonic-sensor',
    name: 'Ultrasonic Module',
    category: 'electronics',
    description: 'Dual-transducer HC-SR04 rangefinder board',
    defaultColor: '#0284c7',
  },
  {
    id: 'led-dome',
    name: 'Power LED Emitter',
    category: 'electronics',
    description: 'Star heatsink base with domed optical lens',
    defaultColor: '#22d3ee',
  },
  {
    id: 'heatsink-fin',
    name: 'Finned Heatsink',
    category: 'electronics',
    description: 'Extruded aluminum multi-fin thermal dissipator',
    defaultColor: '#cbd5e1',
  },

  // Mechanical / CAD
  {
    id: 'spur-gear',
    name: 'Precision Spur Gear',
    category: 'mechanical',
    description: '16-tooth spur gear with bore',
    defaultColor: '#38bdf8',
  },
  {
    id: 'l-bracket',
    name: 'Bolted L-Bracket',
    category: 'mechanical',
    description: '90° mounting gusset with bolt clearances',
    defaultColor: '#f59e0b',
  },
  {
    id: 'vslot-rail',
    name: '2020 Extrusion Rail',
    category: 'mechanical',
    description: 'Structural aluminum T/V-slot frame beam',
    defaultColor: '#94a3b8',
  },
  {
    id: 'hex-bolt',
    name: 'M8 Hex Fastener',
    category: 'mechanical',
    description: 'Hexagonal head cap screw with threaded shank',
    defaultColor: '#cbd5e1',
  },
  {
    id: 'nozzle-cone',
    name: 'De Laval Nozzle',
    category: 'mechanical',
    description: 'Convergent-divergent propulsion thruster bell',
    defaultColor: '#a78bfa',
  },

  // Human & Bio
  {
    id: 'human-mannequin',
    name: 'Human Mannequin',
    category: 'human',
    description: 'Proportioned articulated ergonomic reference figure',
    defaultColor: '#cbd5e1',
  },
  {
    id: 'human-head',
    name: 'Human Head Bust',
    category: 'human',
    description: 'Anatomically proportioned head & neck reference bust',
    defaultColor: '#e2e8f0',
  },
  {
    id: 'bionic-hand',
    name: 'Bionic Prosthetic Hand',
    category: 'human',
    description: '5-digit articulated robotic palm and phalanges',
    defaultColor: '#38bdf8',
  },
  {
    id: 'exo-cuff',
    name: 'Exoskeleton Brace',
    category: 'human',
    description: 'Curved wearable limb cuff with pivot hinge',
    defaultColor: '#6366f1',
  },

  // 3D Shapes
  {
    id: 'enclosure-shell',
    name: 'Chamfered Enclosure',
    category: 'shapes',
    description: 'Smooth beveled project housing block',
    defaultColor: '#334155',
  },
  {
    id: 'geodesic-dome',
    name: 'Geodesic Dome',
    category: 'shapes',
    description: 'Triangulated architectural dome shell',
    defaultColor: '#22d3ee',
  },
  {
    id: 'structural-arch',
    name: 'Structural Arch',
    category: 'shapes',
    description: 'Curved rib arch segment',
    defaultColor: '#f59e0b',
  },
];

export const PART_LIBRARY: LibraryPartMeta[] = [
  ...HARDWARE_LIBRARY_ITEMS,
  ...BASE_PART_LIBRARY,
];

function mergeGeometriesList(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const cleanNonIndexed: THREE.BufferGeometry[] = [];
  let totalVerts = 0;

  for (const g of geoms) {
    const nonIdx = g.index ? g.toNonIndexed() : g;
    if (!nonIdx.getAttribute('normal')) {
      nonIdx.computeVertexNormals();
    }
    const pos = nonIdx.getAttribute('position');
    if (pos && pos.count > 0) {
      cleanNonIndexed.push(nonIdx);
      totalVerts += pos.count;
    }
    if (nonIdx !== g) g.dispose();
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;

  for (const g of cleanNonIndexed) {
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      const idx = (offset + i) * 3;
      positions[idx] = pos.getX(i);
      positions[idx + 1] = pos.getY(i);
      positions[idx + 2] = pos.getZ(i);
      if (nrm) {
        normals[idx] = nrm.getX(i);
        normals[idx + 1] = nrm.getY(i);
        normals[idx + 2] = nrm.getZ(i);
      } else {
        normals[idx] = 0;
        normals[idx + 1] = 1;
        normals[idx + 2] = 0;
      }
    }
    offset += pos.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function addPiece(
  list: THREE.BufferGeometry[],
  geom: THREE.BufferGeometry,
  tx = 0,
  ty = 0,
  tz = 0,
  rx = 0,
  ry = 0,
  rz = 0
): void {
  if (rx !== 0) geom.rotateX(rx);
  if (ry !== 0) geom.rotateY(ry);
  if (rz !== 0) geom.rotateZ(rz);
  if (tx !== 0 || ty !== 0 || tz !== 0) geom.translate(tx, ty, tz);
  list.push(geom);
}

export function buildLibraryPartGeometry(partId: string): THREE.BufferGeometry {
  if (ROBOTICS_HARDWARE_CATALOG.some((h) => h.id === partId)) {
    return buildRoboticsHardwareGeometry(partId);
  }
  const pieces: THREE.BufferGeometry[] = [];

  switch (partId) {
    case 'servo-motor': {
      addPiece(pieces, new THREE.BoxGeometry(0.9, 0.72, 0.45), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(1.25, 0.08, 0.45), 0, 0.14, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.16, 0.16, 0.22, 18), 0.2, 0.44, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.55, 0.06, 0.14), 0.35, 0.56, 0);
      break;
    }
    case 'robot-gripper': {
      addPiece(pieces, new THREE.BoxGeometry(0.95, 0.36, 0.55), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.16, 0.24, 0.75), -0.34, 0, 0.58);
      addPiece(pieces, new THREE.BoxGeometry(0.16, 0.24, 0.75), 0.34, 0, 0.58);
      addPiece(pieces, new THREE.BoxGeometry(0.12, 0.24, 0.35), -0.24, 0, 1.05, 0, 0.35, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.12, 0.24, 0.35), 0.24, 0, 1.05, 0, -0.35, 0);
      break;
    }
    case 'rover-wheel': {
      addPiece(pieces, new THREE.CylinderGeometry(0.62, 0.62, 0.36, 28), 0, 0, 0, Math.PI / 2, 0, 0);
      addPiece(pieces, new THREE.TorusGeometry(0.58, 0.09, 12, 28), 0, 0, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.2, 0.2, 0.44, 6), 0, 0, 0, Math.PI / 2, 0, 0);
      break;
    }
    case 'chassis-plate': {
      addPiece(pieces, new THREE.BoxGeometry(2.4, 0.12, 1.45), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(2.2, 0.08, 0.12), 0, 0.1, 0.62);
      addPiece(pieces, new THREE.BoxGeometry(2.2, 0.08, 0.12), 0, 0.1, -0.62);
      break;
    }
    case 'robot-arm-link': {
      addPiece(pieces, new THREE.CylinderGeometry(0.24, 0.24, 0.32, 20), -0.75, 0, 0, Math.PI / 2, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(1.5, 0.26, 0.22), 0, 0, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.24, 0.24, 0.32, 20), 0.75, 0, 0, Math.PI / 2, 0, 0);
      break;
    }
    case 'lidar-turret': {
      addPiece(pieces, new THREE.CylinderGeometry(0.52, 0.56, 0.18, 28), 0, -0.18, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.45, 0.45, 0.36, 28), 0, 0.09, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.47, 0.47, 0.06, 28), 0, 0.3, 0);
      break;
    }
    case 'mcu-board': {
      addPiece(pieces, new THREE.BoxGeometry(1.5, 0.08, 0.78), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.48, 0.14, 0.46), -0.35, 0.11, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.26, 0.12, 0.28), 0.64, 0.09, 0);
      addPiece(pieces, new THREE.BoxGeometry(1.2, 0.14, 0.08), 0, -0.09, 0.3);
      addPiece(pieces, new THREE.BoxGeometry(1.2, 0.14, 0.08), 0, -0.09, -0.3);
      break;
    }
    case 'lipo-pack': {
      addPiece(pieces, new THREE.BoxGeometry(1.45, 0.52, 0.72), 0, 0, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), 0.85, 0.1, 0.12, 0, 0, Math.PI / 2);
      addPiece(pieces, new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), 0.85, 0.1, -0.12, 0, 0, Math.PI / 2);
      break;
    }
    case 'dc-motor': {
      addPiece(pieces, new THREE.CylinderGeometry(0.36, 0.36, 1.05, 24), -0.15, 0, 0, 0, 0, Math.PI / 2);
      addPiece(pieces, new THREE.CylinderGeometry(0.28, 0.28, 0.3, 20), 0.52, 0, 0, 0, 0, Math.PI / 2);
      addPiece(pieces, new THREE.CylinderGeometry(0.065, 0.065, 0.45, 12), 0.88, 0, 0, 0, 0, Math.PI / 2);
      break;
    }
    case 'ultrasonic-sensor': {
      addPiece(pieces, new THREE.BoxGeometry(1.25, 0.55, 0.08), 0, 0, -0.1);
      addPiece(pieces, new THREE.CylinderGeometry(0.22, 0.22, 0.34, 22), -0.34, 0, 0.1, Math.PI / 2, 0, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.22, 0.22, 0.34, 22), 0.34, 0, 0.1, Math.PI / 2, 0, 0);
      break;
    }
    case 'led-dome': {
      addPiece(pieces, new THREE.CylinderGeometry(0.45, 0.45, 0.08, 6), 0, -0.15, 0);
      addPiece(pieces, new THREE.SphereGeometry(0.26, 20, 14), 0, 0.06, 0);
      break;
    }
    case 'heatsink-fin': {
      addPiece(pieces, new THREE.BoxGeometry(1.2, 0.14, 1.2), 0, -0.25, 0);
      for (let i = -3; i <= 3; i++) {
        addPiece(pieces, new THREE.BoxGeometry(0.07, 0.55, 1.2), i * 0.16, 0.08, 0);
      }
      break;
    }
    case 'spur-gear':
    case 'l-bracket':
    case 'nozzle-cone': {
      const dummy: CadPartConfig = {
        id: 'tmp',
        name: 'tmp',
        kind: partId === 'spur-gear' ? 'gear' : partId === 'l-bracket' ? 'bracket' : 'lathe',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        color: '#ffffff',
        visible: true,
        width: 1.8,
        height: partId === 'spur-gear' ? 0.35 : 1.6,
        depth: 0.35,
        outerRadius: 1.0,
        innerRadius: 0.4,
        bevel: 0.03,
        segments: 28,
        teeth: 16,
        holeRadius: 0.25,
        sides: 6,
        latheCurve: 'nozzle',
      };
      return createParametricGeometry(dummy);
    }
    case 'vslot-rail': {
      addPiece(pieces, new THREE.BoxGeometry(2.4, 0.32, 0.32), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(2.42, 0.1, 0.38), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(2.42, 0.38, 0.1), 0, 0, 0);
      break;
    }
    case 'hex-bolt': {
      addPiece(pieces, new THREE.CylinderGeometry(0.32, 0.32, 0.22, 6), 0, 0.45, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.16, 0.16, 0.9, 16), 0, -0.1, 0);
      break;
    }
    case 'human-mannequin': {
      // Head, neck, torso, pelvis, 2 arms, 2 legs
      addPiece(pieces, new THREE.SphereGeometry(0.22, 18, 14), 0, 1.55, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.08, 0.09, 0.18, 12), 0, 1.32, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.56, 0.68, 0.3), 0, 0.9, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.46, 0.24, 0.28), 0, 0.42, 0);
      // Arms
      addPiece(pieces, new THREE.CapsuleGeometry(0.08, 0.56, 6, 12), -0.4, 0.85, 0, 0, 0, 0.12);
      addPiece(pieces, new THREE.CapsuleGeometry(0.08, 0.56, 6, 12), 0.4, 0.85, 0, 0, 0, -0.12);
      // Legs
      addPiece(pieces, new THREE.CapsuleGeometry(0.1, 0.78, 6, 12), -0.16, -0.15, 0);
      addPiece(pieces, new THREE.CapsuleGeometry(0.1, 0.78, 6, 12), 0.16, -0.15, 0);
      break;
    }
    case 'human-head': {
      const cranium = new THREE.SphereGeometry(0.56, 24, 20);
      cranium.scale(0.86, 1.05, 0.95);
      addPiece(pieces, cranium, 0, 0.25, 0);
      const jaw = new THREE.CylinderGeometry(0.36, 0.24, 0.46, 18);
      addPiece(pieces, jaw, 0, -0.16, 0.1);
      addPiece(pieces, new THREE.BoxGeometry(0.12, 0.2, 0.16), 0, 0.05, 0.52); // Nose bridge
      addPiece(pieces, new THREE.CylinderGeometry(0.24, 0.3, 0.42, 18), 0, -0.58, -0.05); // Neck
      break;
    }
    case 'bionic-hand': {
      addPiece(pieces, new THREE.BoxGeometry(0.68, 0.72, 0.22), 0, 0, 0);
      // 4 fingers
      [-0.24, -0.08, 0.08, 0.24].forEach((x, idx) => {
        const len = idx === 1 || idx === 2 ? 0.58 : 0.48;
        addPiece(pieces, new THREE.CapsuleGeometry(0.06, len, 6, 10), x, 0.65, 0);
      });
      // Thumb
      addPiece(pieces, new THREE.CapsuleGeometry(0.065, 0.38, 6, 10), -0.46, 0.08, 0.06, 0, 0, 0.62);
      break;
    }
    case 'exo-cuff': {
      addPiece(pieces, new THREE.CylinderGeometry(0.48, 0.44, 0.65, 22, 1, true, 0.5, Math.PI * 1.5), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(0.18, 0.85, 0.16), 0.48, 0, 0);
      addPiece(pieces, new THREE.CylinderGeometry(0.14, 0.14, 0.24, 16), 0.48, 0.42, 0, 0, 0, Math.PI / 2);
      break;
    }
    case 'geodesic-dome': {
      addPiece(pieces, new THREE.IcosahedronGeometry(0.95, 1), 0, 0, 0);
      break;
    }
    case 'structural-arch': {
      addPiece(pieces, new THREE.TorusGeometry(0.95, 0.14, 12, 28, Math.PI), 0, -0.2, 0);
      break;
    }
    case 'enclosure-shell':
    default: {
      addPiece(pieces, new THREE.BoxGeometry(1.4, 0.85, 1.0), 0, 0, 0);
      addPiece(pieces, new THREE.BoxGeometry(1.46, 0.12, 1.06), 0, 0.36, 0);
      break;
    }
  }

  return mergeGeometriesList(pieces);
}

export function createCadPartFromLibrary(
  meta: LibraryPartMeta,
  index: number
): CadPartConfig {
  const geom = buildLibraryPartGeometry(meta.id);
  geom.computeBoundingBox();
  const box = geom.boundingBox!;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  // Center geometry around origin, elevate half height above floor
  geom.translate(-center.x, -center.y, -center.z);
  const serialized = serializeBufferGeometry(geom);
  geom.dispose();

  return {
    id: `cad-lib-${meta.id}-${Date.now()}-${index}`,
    name: `${meta.name}`,
    kind: 'box',
    libraryPartId: meta.id,
    position: [0, Math.max(0.5, size.y * 0.5), 0],
    rotation: [0, 0, 0],
    color: meta.defaultColor,
    visible: true,
    locked: false,
    width: size.x,
    height: size.y,
    depth: size.z,
    outerRadius: Math.max(size.x, size.z) * 0.5,
    innerRadius: 0.25,
    bevel: 0.03,
    segments: 24,
    teeth: 16,
    holeRadius: 0.25,
    sides: 6,
    latheCurve: 'nozzle',
    csgMesh: serialized,
  };
}

/**
 * Computes world position to snap/fix `partA` directly onto `partB` (or ground).
 */
export function computeSnapPosition(
  partA: CadPartConfig,
  partB: CadPartConfig | null,
  snapMode: SnapMode
): Vec3 {
  const gA = createParametricGeometry(partA);
  gA.computeBoundingBox();
  const boxA = new THREE.Box3().copy(gA.boundingBox!);
  gA.dispose();
  const sizeA = new THREE.Vector3();
  boxA.getSize(sizeA);

  if (snapMode === 'ground' || !partB) {
    return [partA.position[0], Math.max(0.05, sizeA.y * 0.5), partA.position[2]];
  }

  const gB = createParametricGeometry(partB);
  gB.computeBoundingBox();
  const boxB = new THREE.Box3().copy(gB.boundingBox!);
  gB.dispose();
  const sizeB = new THREE.Vector3();
  boxB.getSize(sizeB);

  const [bx, by, bz] = partB.position;

  switch (snapMode) {
    case 'onTop':
      return [bx, by + sizeB.y * 0.5 + sizeA.y * 0.5, bz];
    case 'inFront':
      return [bx, by, bz + sizeB.z * 0.5 + sizeA.z * 0.5];
    case 'toRight':
      return [bx + sizeB.x * 0.5 + sizeA.x * 0.5, by, bz];
    case 'centerAlign':
      return [bx, by, bz];
  }
}
