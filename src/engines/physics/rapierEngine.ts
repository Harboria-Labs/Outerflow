import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type {
  BodyDynamicSnapshot,
  StudioEntity,
  StudioJoint,
  TelemetrySample,
  Vec3,
} from '../../types/studio';

let rapierInitPromise: Promise<typeof RAPIER> | null = null;

export function ensureRapier(): Promise<typeof RAPIER> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init().then(() => RAPIER);
  }
  return rapierInitPromise;
}

export interface PhysicsBodyEntry {
  entity: StudioEntity;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

export interface JointVisualSegment {
  id: string;
  kind: StudioJoint['kind'];
  start: Vec3;
  end: Vec3;
}

export class RapierPhysicsEngine {
  private world: RAPIER.World | null = null;
  private bodies = new Map<string, PhysicsBodyEntry>();
  private joints = new Map<string, { spec: StudioJoint; handle?: RAPIER.ImpulseJoint }>();
  private springJoints: StudioJoint[] = [];
  private simTime = 0;
  private gravity: Vec3 = [0, -9.81, 0];
  private stepHooks: Array<(t: number, dt: number) => void> = [];

  get time(): number {
    return this.simTime;
  }

  get isReady(): boolean {
    return this.world !== null;
  }

  setGravity(g: Vec3): void {
    this.gravity = [...g];
    if (this.world) {
      this.world.gravity = { x: g[0], y: g[1], z: g[2] };
    }
  }

  getGravity(): Vec3 {
    return [...this.gravity];
  }

  registerStepHook(hook: (t: number, dt: number) => void): void {
    this.stepHooks.push(hook);
  }

  clearStepHooks(): void {
    this.stepHooks = [];
  }

  async rebuild(
    entities: StudioEntity[],
    joints: StudioJoint[],
    gravity: Vec3
  ): Promise<void> {
    await ensureRapier();
    this.dispose();

    this.gravity = [...gravity];
    this.simTime = 0;
    this.world = new RAPIER.World({ x: gravity[0], y: gravity[1], z: gravity[2] });

    // Built-in solid studio floor at y = 0 (top surface)
    const floorBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
    );
    const floorCollider = RAPIER.ColliderDesc.cuboid(80, 0.5, 80)
      .setFriction(0.75)
      .setRestitution(0.3);
    this.world.createCollider(floorCollider, floorBody);

    for (const ent of entities) {
      if (!ent.visible) continue;
      this.addEntityBody(ent);
    }

    for (const j of joints) {
      this.addJoint(j);
    }
  }

  private addEntityBody(ent: StudioEntity): void {
    if (!this.world) return;

    const euler = new THREE.Euler(ent.rotation[0], ent.rotation[1], ent.rotation[2], 'XYZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);

    let desc: RAPIER.RigidBodyDesc;
    if (ent.bodyType === 'fixed') {
      desc = RAPIER.RigidBodyDesc.fixed();
    } else if (ent.bodyType === 'kinematic') {
      desc = RAPIER.RigidBodyDesc.kinematicPositionBased();
    } else {
      desc = RAPIER.RigidBodyDesc.dynamic();
    }

    desc
      .setTranslation(ent.position[0], ent.position[1], ent.position[2])
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setLinearDamping(ent.physics.linearDamping)
      .setAngularDamping(ent.physics.angularDamping);

    if (ent.bodyType === 'dynamic') {
      desc.setLinvel(
        ent.physics.initialVelocity[0],
        ent.physics.initialVelocity[1],
        ent.physics.initialVelocity[2]
      );
    }

    const body = this.world.createRigidBody(desc);
    const colDesc = this.buildColliderDesc(ent);
    colDesc
      .setFriction(ent.physics.friction)
      .setRestitution(ent.physics.restitution);

    if (ent.bodyType === 'dynamic') {
      colDesc.setMass(Math.max(0.05, ent.physics.mass));
    }

    const collider = this.world.createCollider(colDesc, body);
    this.bodies.set(ent.id, { entity: ent, body, collider });
  }

  private buildColliderDesc(ent: StudioEntity): RAPIER.ColliderDesc {
    const sx = Math.abs(ent.scale[0]) || 1;
    const sy = Math.abs(ent.scale[1]) || 1;
    const sz = Math.abs(ent.scale[2]) || 1;

    switch (ent.shape) {
      case 'box':
        return RAPIER.ColliderDesc.cuboid(
          Math.max(0.02, (ent.size.width * sx) / 2),
          Math.max(0.02, (ent.size.height * sy) / 2),
          Math.max(0.02, (ent.size.depth * sz) / 2)
        );
      case 'sphere': {
        const r = Math.max(0.02, ent.size.radius * Math.max(sx, sy, sz));
        return RAPIER.ColliderDesc.ball(r);
      }
      case 'cylinder': {
        const r = Math.max(0.02, ent.size.radius * Math.max(sx, sz));
        const hh = Math.max(0.02, (ent.size.height * sy) / 2);
        return RAPIER.ColliderDesc.cylinder(hh, r);
      }
      case 'capsule': {
        const r = Math.max(0.02, ent.size.radius * Math.max(sx, sz));
        const hh = Math.max(0.02, (ent.size.height * sy) / 2);
        return RAPIER.ColliderDesc.capsule(hh, r);
      }
      case 'cone': {
        const r = Math.max(0.02, ent.size.radius * Math.max(sx, sz));
        const hh = Math.max(0.02, (ent.size.height * sy) / 2);
        return RAPIER.ColliderDesc.cone(hh, r);
      }
      case 'custom': {
        if (ent.serializedMesh && ent.serializedMesh.positions.length >= 9) {
          const verts = new Float32Array(ent.serializedMesh.positions.length);
          for (let i = 0; i < verts.length; i += 3) {
            verts[i] = ent.serializedMesh.positions[i] * sx;
            verts[i + 1] = ent.serializedMesh.positions[i + 1] * sy;
            verts[i + 2] = ent.serializedMesh.positions[i + 2] * sz;
          }

          if (
            ent.bodyType === 'fixed' ||
            ent.physics.colliderKind === 'trimesh'
          ) {
            const idxArr = ent.serializedMesh.indices
              ? new Uint32Array(ent.serializedMesh.indices)
              : Uint32Array.from({ length: verts.length / 3 }, (_, i) => i);
            if (idxArr.length >= 3) {
              return RAPIER.ColliderDesc.trimesh(verts, idxArr);
            }
          }

          const hull = RAPIER.ColliderDesc.convexHull(verts);
          if (hull) return hull;
        }
        return RAPIER.ColliderDesc.cuboid(
          Math.max(0.05, (ent.size.width * sx) / 2),
          Math.max(0.05, (ent.size.height * sy) / 2),
          Math.max(0.05, (ent.size.depth * sz) / 2)
        );
      }
    }
  }

  private addJoint(spec: StudioJoint): void {
    if (!this.world) return;
    const entryA = this.bodies.get(spec.bodyA);
    const entryB = this.bodies.get(spec.bodyB);
    if (!entryA || !entryB) return;

    if (spec.kind === 'spring') {
      this.springJoints.push(spec);
      this.joints.set(spec.id, { spec });
      return;
    }

    const a1 = { x: spec.anchorA[0], y: spec.anchorA[1], z: spec.anchorA[2] };
    const a2 = { x: spec.anchorB[0], y: spec.anchorB[1], z: spec.anchorB[2] };
    const axLen = Math.hypot(spec.axis[0], spec.axis[1], spec.axis[2]) || 1;
    const ax = {
      x: spec.axis[0] / axLen,
      y: spec.axis[1] / axLen,
      z: spec.axis[2] / axLen,
    };

    let data: RAPIER.JointData;
    switch (spec.kind) {
      case 'revolute':
        data = RAPIER.JointData.revolute(a1, a2, ax);
        break;
      case 'prismatic':
        data = RAPIER.JointData.prismatic(a1, a2, ax);
        break;
      case 'spherical':
        data = RAPIER.JointData.spherical(a1, a2);
        break;
      case 'fixed': {
        const idRot = { x: 0, y: 0, z: 0, w: 1 };
        data = RAPIER.JointData.fixed(a1, idRot, a2, idRot);
        break;
      }
    }

    const handle = this.world.createImpulseJoint(data, entryA.body, entryB.body, true);
    handle.setContactsEnabled(false);

    if (
      (spec.kind === 'revolute' || spec.kind === 'prismatic') &&
      Math.abs(spec.motorSpeed) > 1e-4
    ) {
      (handle as RAPIER.RevoluteImpulseJoint).configureMotorVelocity(
        spec.motorSpeed,
        Math.max(0.1, spec.motorMaxForce)
      );
    }

    this.joints.set(spec.id, { spec, handle });
  }

  updateJointMotor(jointId: string, motorSpeed: number, motorMaxForce: number): void {
    const rec = this.joints.get(jointId);
    if (!rec) return;
    rec.spec.motorSpeed = motorSpeed;
    rec.spec.motorMaxForce = motorMaxForce;
    if (rec.handle && (rec.spec.kind === 'revolute' || rec.spec.kind === 'prismatic')) {
      (rec.handle as RAPIER.RevoluteImpulseJoint).configureMotorVelocity(
        motorSpeed,
        Math.max(0, motorMaxForce)
      );
    }
  }

  applyImpulse(entityId: string, impulse: Vec3): void {
    const rec = this.bodies.get(entityId);
    if (!rec) return;
    rec.body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
  }

  getBody(entityId: string): RAPIER.RigidBody | undefined {
    return this.bodies.get(entityId)?.body;
  }

  step(dt: number): void {
    if (!this.world) return;
    const clampedDt = Math.max(0.001, Math.min(0.05, dt));
    this.world.timestep = clampedDt;

    // Clear user forces from previous step, then apply spring-damper forces
    for (const entry of this.bodies.values()) {
      if (entry.body.isDynamic()) {
        entry.body.resetForces(false);
      }
    }

    this.applySpringForces();

    for (const hook of this.stepHooks) {
      hook(this.simTime, clampedDt);
    }

    this.world.step();
    this.simTime += clampedDt;
  }

  private applySpringForces(): void {
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const qB = new THREE.Quaternion();
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const dir = new THREE.Vector3();

    for (const sp of this.springJoints) {
      const eA = this.bodies.get(sp.bodyA);
      const eB = this.bodies.get(sp.bodyB);
      if (!eA || !eB) continue;

      const tA = eA.body.translation();
      const rA = eA.body.rotation();
      const tB = eB.body.translation();
      const rB = eB.body.rotation();

      qA.set(rA.x, rA.y, rA.z, rA.w);
      qB.set(rB.x, rB.y, rB.z, rB.w);

      pA.set(sp.anchorA[0], sp.anchorA[1], sp.anchorA[2]).applyQuaternion(qA).add(new THREE.Vector3(tA.x, tA.y, tA.z));
      pB.set(sp.anchorB[0], sp.anchorB[1], sp.anchorB[2]).applyQuaternion(qB).add(new THREE.Vector3(tB.x, tB.y, tB.z));

      dir.subVectors(pB, pA);
      const dist = dir.length();
      if (dist < 1e-5) continue;
      dir.divideScalar(dist);

      const lvA = eA.body.linvel();
      const lvB = eB.body.linvel();
      vA.set(lvA.x, lvA.y, lvA.z);
      vB.set(lvB.x, lvB.y, lvB.z);

      const relVel = vB.sub(vA).dot(dir);
      const stretch = dist - sp.restLength;
      const forceMag = sp.stiffness * stretch + sp.damping * relVel;

      const fx = dir.x * forceMag;
      const fy = dir.y * forceMag;
      const fz = dir.z * forceMag;

      if (eA.body.isDynamic()) {
        eA.body.addForceAtPoint({ x: fx, y: fy, z: fz }, { x: pA.x, y: pA.y, z: pA.z }, true);
      }
      if (eB.body.isDynamic()) {
        eB.body.addForceAtPoint({ x: -fx, y: -fy, z: -fz }, { x: pB.x, y: pB.y, z: pB.z }, true);
      }
    }
  }

  getBodyTransform(entityId: string): {
    position: Vec3;
    quaternion: [number, number, number, number];
  } | null {
    const rec = this.bodies.get(entityId);
    if (!rec) return null;
    const t = rec.body.translation();
    const r = rec.body.rotation();
    return {
      position: [t.x, t.y, t.z],
      quaternion: [r.x, r.y, r.z, r.w],
    };
  }

  setKinematicTarget(entityId: string, pos: Vec3, rotEuler: Vec3): void {
    const rec = this.bodies.get(entityId);
    if (!rec) return;
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotEuler[0], rotEuler[1], rotEuler[2], 'XYZ')
    );
    if (rec.body.isKinematic()) {
      rec.body.setNextKinematicTranslation({ x: pos[0], y: pos[1], z: pos[2] });
      rec.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    } else {
      rec.body.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true);
      rec.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      rec.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rec.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  captureSnapshots(): Record<string, BodyDynamicSnapshot> {
    const out: Record<string, BodyDynamicSnapshot> = {};
    for (const [id, entry] of this.bodies.entries()) {
      const t = entry.body.translation();
      const r = entry.body.rotation();
      const lv = entry.body.linvel();
      const av = entry.body.angvel();
      out[id] = {
        position: [t.x, t.y, t.z],
        quaternion: [r.x, r.y, r.z, r.w],
        linvel: [lv.x, lv.y, lv.z],
        angvel: [av.x, av.y, av.z],
      };
    }
    return out;
  }

  restoreSnapshots(snapshots: Record<string, BodyDynamicSnapshot>, simTime: number): void {
    if (!this.world) return;
    for (const [id, snap] of Object.entries(snapshots)) {
      const entry = this.bodies.get(id);
      if (!entry) continue;
      entry.body.setTranslation(
        { x: snap.position[0], y: snap.position[1], z: snap.position[2] },
        true
      );
      entry.body.setRotation(
        {
          x: snap.quaternion[0],
          y: snap.quaternion[1],
          z: snap.quaternion[2],
          w: snap.quaternion[3],
        },
        true
      );
      if (entry.body.isDynamic()) {
        entry.body.setLinvel(
          { x: snap.linvel[0], y: snap.linvel[1], z: snap.linvel[2] },
          true
        );
        entry.body.setAngvel(
          { x: snap.angvel[0], y: snap.angvel[1], z: snap.angvel[2] },
          true
        );
        entry.body.wakeUp();
      }
    }
    this.simTime = simTime;
  }

  getJointWorldSegments(): JointVisualSegment[] {
    const segs: JointVisualSegment[] = [];
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const qA = new THREE.Quaternion();
    const qB = new THREE.Quaternion();

    for (const { spec } of this.joints.values()) {
      const eA = this.bodies.get(spec.bodyA);
      const eB = this.bodies.get(spec.bodyB);
      if (!eA || !eB) continue;

      const tA = eA.body.translation();
      const rA = eA.body.rotation();
      const tB = eB.body.translation();
      const rB = eB.body.rotation();

      qA.set(rA.x, rA.y, rA.z, rA.w);
      qB.set(rB.x, rB.y, rB.z, rB.w);

      pA.set(spec.anchorA[0], spec.anchorA[1], spec.anchorA[2]).applyQuaternion(qA).add(new THREE.Vector3(tA.x, tA.y, tA.z));
      pB.set(spec.anchorB[0], spec.anchorB[1], spec.anchorB[2]).applyQuaternion(qB).add(new THREE.Vector3(tB.x, tB.y, tB.z));

      segs.push({
        id: spec.id,
        kind: spec.kind,
        start: [pA.x, pA.y, pA.z],
        end: [pB.x, pB.y, pB.z],
      });
    }
    return segs;
  }

  computeTelemetry(
    selectedEntityId: string | null,
    customMetrics: Record<string, number> = {}
  ): TelemetrySample {
    let kinetic = 0;
    let potential = 0;
    const gMag = Math.abs(this.gravity[1]);

    for (const entry of this.bodies.values()) {
      if (!entry.body.isDynamic()) continue;
      const m = entry.body.mass();
      const v = entry.body.linvel();
      const speedSq = v.x * v.x + v.y * v.y + v.z * v.z;
      const w = entry.body.angvel();
      const wSq = w.x * w.x + w.y * w.y + w.z * w.z;
      kinetic += 0.5 * m * speedSq + 0.1 * m * wSq;
      const pos = entry.body.translation();
      potential += m * gMag * Math.max(0, pos.y);
    }

    // Add elastic spring energy
    for (const seg of this.getJointWorldSegments()) {
      const rec = this.joints.get(seg.id);
      if (rec && rec.spec.kind === 'spring') {
        const d = Math.hypot(
          seg.end[0] - seg.start[0],
          seg.end[1] - seg.start[1],
          seg.end[2] - seg.start[2]
        );
        const dx = d - rec.spec.restLength;
        potential += 0.5 * rec.spec.stiffness * dx * dx;
      }
    }

    let selectedPosY = 0;
    let selectedSpeed = 0;
    if (selectedEntityId) {
      const sel = this.bodies.get(selectedEntityId);
      if (sel) {
        selectedPosY = sel.body.translation().y;
        const lv = sel.body.linvel();
        selectedSpeed = Math.hypot(lv.x, lv.y, lv.z);
      }
    }

    return {
      time: this.simTime,
      kineticEnergy: kinetic,
      potentialEnergy: potential,
      totalEnergy: kinetic + potential,
      selectedPosY,
      selectedSpeed,
      customMetrics: { ...customMetrics },
    };
  }

  dispose(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.bodies.clear();
    this.joints.clear();
    this.springJoints = [];
  }
}
