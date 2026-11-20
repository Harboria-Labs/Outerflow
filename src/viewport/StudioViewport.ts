import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type {
  CadPartConfig,
  CameraPreset,
  GizmoMode,
  StageSettings,
  StudioEntity,
  StudioMode,
  Vec3,
} from '../types/studio';
import { createParametricGeometry, deserializeMeshData } from '../engines/cad/parametricGenerators';
import type { JointVisualSegment } from '../engines/physics/rapierEngine';
import { captureTransparentViewportPNG } from '../engines/io/mediaExporters';

export interface ViewportCallbacks {
  onSelectObject?: (id: string | null) => void;
  onTransformObject?: (
    id: string,
    kind: 'physics' | 'cad',
    position: Vec3,
    rotation: Vec3,
    scale: Vec3
  ) => void;
  onSculptStart?: (point: THREE.Vector3, normal: THREE.Vector3) => void;
  onSculptMove?: (point: THREE.Vector3, normal: THREE.Vector3) => void;
  onSculptEnd?: () => void;
}

export function createDefaultStageSettings(): StageSettings {
  return {
    theme: 'dark',
    intensity: 1.0,
    reflection: 0.55,
    shadows: true,
    showFloor: true,
    exposure: 1.08,
    rimLight: 0.8,
    shading: 'original',
    wireframe: false,
    showColliders: false,
    showGrid: true,
    showAxes: false,
    explodedView: false,
    autoSpin: false,
  };
}

export class StudioViewport {
  readonly container: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly orbit: OrbitControls;
  readonly transform: TransformControls;

  readonly physicsGroup = new THREE.Group();
  readonly colliderDebugGroup = new THREE.Group();
  readonly jointDebugGroup = new THREE.Group();
  readonly cadGroup = new THREE.Group();
  readonly meshGroup = new THREE.Group();
  readonly electronicsGroup = new THREE.Group();
  readonly mathGroup = new THREE.Group();
  readonly softGroup = new THREE.Group();
  readonly measurementGroup = new THREE.Group();

  private envRenderTarget: THREE.WebGLRenderTarget;
  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;
  private floorMesh: THREE.Mesh;
  private reflector: Reflector;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  private solidMaterial: THREE.MeshStandardMaterial;
  private normalMaterial: THREE.MeshNormalMaterial;

  private entityMeshes = new Map<string, THREE.Mesh>();
  private cadMeshes = new Map<string, THREE.Mesh>();
  private selectedId: string | null = null;
  private gizmoMode: GizmoMode = 'translate';
  private activeMode: StudioMode = 'physics';
  private stage: StageSettings = createDefaultStageSettings();
  private callbacks: ViewportCallbacks;
  private resizeObserver: ResizeObserver;
  private pointerDownPos = { x: 0, y: 0 };
  private isDraggingGizmo = false;
  private isSculpting = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(container: HTMLElement, callbacks: ViewportCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#000000');
    this.scene.fog = new THREE.Fog('#000000', 18, 62);

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 200);
    this.camera.position.set(8.2, 5.4, 9.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    // RoomEnvironment IBL for realistic metallic/rough studio shading
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.85;
    roomEnv.dispose();
    pmrem.dispose();

    this.solidMaterial = new THREE.MeshStandardMaterial({
      color: '#c7ccd4',
      roughness: 0.62,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this.normalMaterial = new THREE.MeshNormalMaterial({
      side: THREE.DoubleSide,
    });

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.target.set(0, 1.4, 0);
    this.orbit.update();

    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.setSize(0.75);
    this.scene.add(this.transform.getHelper());

    this.transform.addEventListener('dragging-changed', (ev) => {
      const dragging = Boolean((ev as { value?: unknown }).value);
      this.isDraggingGizmo = dragging;
      this.orbit.enabled = !dragging;
    });

    this.transform.addEventListener('objectChange', () => {
      const obj = this.transform.object;
      if (!obj) return;
      const id = obj.userData.id as string | undefined;
      const kind = obj.userData.kind as 'physics' | 'cad' | undefined;
      if (!id || !kind) return;
      obj.userData.basePos = [obj.position.x, obj.position.y, obj.position.z];
      this.callbacks.onTransformObject?.(
        id,
        kind,
        [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    });

    // Studio lighting rig
    this.hemiLight = new THREE.HemisphereLight('#e2e8f0', '#18181b', 0.45);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#ffffff', 1.65);
    this.keyLight.position.set(9, 15, 10);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 45;
    const d = 14;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight('#cbd5e1', 0.8);
    this.rimLight.position.set(-10, 7, -9);
    this.scene.add(this.rimLight);

    // Glossy Reflective Studio Floor
    const reflectorGeom = new THREE.PlaneGeometry(70, 70);
    this.reflector = new Reflector(reflectorGeom, {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x626670,
      clipBias: 0.003,
      multisample: 0,
    });
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.position.y = -0.008;
    this.scene.add(this.reflector);

    const floorGeom = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#1b1d22',
      roughness: 0.45,
      metalness: 0.1,
      transparent: true,
      opacity: 0.62,
    });
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -0.002;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.gridHelper = new THREE.GridHelper(36, 36, '#3f3f46', '#27272a');
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.28;
    this.gridHelper.position.y = 0.002;
    this.scene.add(this.gridHelper);

    // Wrap Reflector onBeforeRender so floorMesh/gridHelper do not occlude mirror pass
    const origReflectorRender = this.reflector.onBeforeRender;
    this.reflector.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      const prevFloor = this.floorMesh.visible;
      const prevGrid = this.gridHelper.visible;
      this.floorMesh.visible = false;
      this.gridHelper.visible = false;
      origReflectorRender.call(this.reflector, renderer, scene, camera, geometry, material, group);
      this.floorMesh.visible = prevFloor;
      this.gridHelper.visible = prevGrid;
    };

    this.axesHelper = new THREE.AxesHelper(2.2);
    this.axesHelper.position.set(0, 0.01, 0);
    this.axesHelper.visible = false;
    this.scene.add(this.axesHelper);

    this.scene.add(this.physicsGroup);
    this.scene.add(this.colliderDebugGroup);
    this.scene.add(this.jointDebugGroup);
    this.scene.add(this.cadGroup);
    this.scene.add(this.meshGroup);
    this.scene.add(this.electronicsGroup);
    this.scene.add(this.mathGroup);
    this.scene.add(this.softGroup);
    this.scene.add(this.measurementGroup);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
  }

  private raycastMeshGroup(e: PointerEvent): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.meshGroup.children, true);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const normal = hit.face
      ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
      : new THREE.Vector3(0, 1, 0);
    return { point: hit.point.clone(), normal };
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    if (this.activeMode === 'mesh' && e.button === 0) {
      const hit = this.raycastMeshGroup(e);
      if (hit) {
        this.isSculpting = true;
        this.orbit.enabled = false;
        this.callbacks.onSculptStart?.(hit.point, hit.normal);
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isSculpting) return;
    const hit = this.raycastMeshGroup(e);
    if (hit) {
      this.callbacks.onSculptMove?.(hit.point, hit.normal);
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isSculpting) {
      this.isSculpting = false;
      this.orbit.enabled = true;
      this.callbacks.onSculptEnd?.();
      return;
    }
    if (this.isDraggingGizmo) return;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 5) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const targets: THREE.Object3D[] =
      this.activeMode === 'cad'
        ? Array.from(this.cadMeshes.values())
        : this.activeMode === 'physics' || this.activeMode === 'experiments'
        ? Array.from(this.entityMeshes.values())
        : [];

    if (targets.length === 0) return;
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.id as string | undefined;
      this.callbacks.onSelectObject?.(id ?? null);
    } else {
      this.callbacks.onSelectObject?.(null);
    }
  };

  resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setModeVisibility(mode: StudioMode): void {
    this.activeMode = mode;
    const showPhysics = mode === 'physics' || mode === 'experiments';
    this.physicsGroup.visible = showPhysics;
    this.jointDebugGroup.visible = showPhysics;
    this.colliderDebugGroup.visible = showPhysics && this.stage.showColliders;
    this.cadGroup.visible = mode === 'cad';
    this.meshGroup.visible = mode === 'mesh';
    this.electronicsGroup.visible = mode === 'electronics';
    this.mathGroup.visible = mode === 'math';
    this.softGroup.visible = mode === 'soft';

    this.refreshGizmoAttachment();
    this.applyStageToDomainGroups();
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
    this.refreshSelectionHighlight();
    this.refreshGizmoAttachment();
  }

  setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode = mode;
    if (mode !== 'select') {
      this.transform.setMode(mode);
    }
    this.refreshGizmoAttachment();
  }

  private refreshSelectionHighlight(): void {
    for (const [id, mesh] of this.entityMeshes) {
      const base = mesh.userData.baseMaterial as THREE.MeshStandardMaterial | undefined;
      if (base && 'emissive' in base) {
        base.emissive.setHex(id === this.selectedId ? 0x1d4ed8 : 0x000000);
        base.emissiveIntensity = id === this.selectedId ? 0.32 : 0;
      }
    }
    for (const [id, mesh] of this.cadMeshes) {
      const base = mesh.userData.baseMaterial as THREE.MeshStandardMaterial | undefined;
      if (base && 'emissive' in base) {
        base.emissive.setHex(id === this.selectedId ? 0x1d4ed8 : 0x000000);
        base.emissiveIntensity = id === this.selectedId ? 0.32 : 0;
      }
    }
  }

  private refreshGizmoAttachment(): void {
    if (this.gizmoMode === 'select' || !this.selectedId) {
      this.transform.detach();
      return;
    }
    if (this.activeMode === 'cad') {
      const mesh = this.cadMeshes.get(this.selectedId);
      if (mesh && mesh.visible && !mesh.userData.locked) this.transform.attach(mesh);
      else this.transform.detach();
    } else if (this.activeMode === 'physics' || this.activeMode === 'experiments') {
      const mesh = this.entityMeshes.get(this.selectedId);
      if (mesh && mesh.visible) this.transform.attach(mesh);
      else this.transform.detach();
    } else {
      this.transform.detach();
    }
  }

  setStageSettings(next: StageSettings): void {
    const prevExploded = this.stage.explodedView;
    this.stage = { ...next };

    this.gridHelper.visible = next.showGrid;
    this.axesHelper.visible = next.showAxes;
    this.colliderDebugGroup.visible =
      next.showColliders && (this.activeMode === 'physics' || this.activeMode === 'experiments');

    // Theme & Glossy Studio Stage
    const isLight = next.theme === 'light';
    const bgHex = isLight ? '#e4e7ed' : '#000000';
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.Fog(bgHex, 20, 64);

    const floorMat = this.floorMesh.material as THREE.MeshStandardMaterial;
    floorMat.color.set(isLight ? '#d5d9e2' : '#181a1f');
    floorMat.opacity = Math.max(0.16, 1 - next.reflection * 0.72);
    this.floorMesh.visible = next.showFloor;
    this.reflector.visible = next.showFloor && next.reflection > 0.02;

    const reflMat = this.reflector.material as THREE.ShaderMaterial;
    if (reflMat.uniforms?.color) {
      reflMat.uniforms.color.value.set(isLight ? '#b8beca' : '#5e636e');
    }

    // Update grid colors subtly
    const gridMat = this.gridHelper.material as THREE.Material;
    gridMat.opacity = isLight ? 0.22 : 0.24;

    // Lights & Exposure
    this.renderer.toneMappingExposure = next.exposure;
    this.renderer.shadowMap.enabled = next.shadows;
    this.keyLight.castShadow = next.shadows;
    this.keyLight.intensity = 1.65 * next.intensity;
    this.hemiLight.intensity = (isLight ? 0.85 : 0.45) * next.intensity;
    this.scene.environmentIntensity = 0.85 * next.intensity;
    this.rimLight.intensity = next.rimLight;

    // Orbit Auto-Spin
    this.orbit.autoRotate = next.autoSpin;
    this.orbit.autoRotateSpeed = 1.6;

    this.applyStageToDomainGroups();

    if (prevExploded !== next.explodedView) {
      this.applyExplodedOffset(next.explodedView);
    }
  }

  applyStageToDomainGroups(): void {
    const groups = [this.physicsGroup, this.cadGroup, this.meshGroup, this.mathGroup];
    this.solidMaterial.wireframe = this.stage.wireframe;
    this.normalMaterial.wireframe = this.stage.wireframe;

    for (const grp of groups) {
      grp.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        if (!mesh.userData.baseMaterial) {
          mesh.userData.baseMaterial = mesh.material;
        }
        const base = mesh.userData.baseMaterial as THREE.MeshStandardMaterial;

        if (this.stage.shading === 'original') {
          if ('wireframe' in base) base.wireframe = this.stage.wireframe;
          mesh.material = base;
        } else if (this.stage.shading === 'solid') {
          mesh.material = this.solidMaterial;
        } else if (this.stage.shading === 'normal') {
          mesh.material = this.normalMaterial;
        } else {
          // albedo: unlit flat color preserving base color / vertexColors
          let albedo = mesh.userData.albedoMaterial as THREE.MeshBasicMaterial | undefined;
          if (!albedo) {
            albedo = new THREE.MeshBasicMaterial({
              color: base.color ? base.color.clone() : new THREE.Color('#ffffff'),
              vertexColors: Boolean(base.vertexColors),
              side: base.side,
            });
            mesh.userData.albedoMaterial = albedo;
          } else if (base.color) {
            albedo.color.copy(base.color);
          }
          albedo.wireframe = this.stage.wireframe;
          mesh.material = albedo;
        }
      });
    }
  }

  private applyExplodedOffset(active: boolean): void {
    const targetMeshes =
      this.activeMode === 'cad'
        ? Array.from(this.cadMeshes.values())
        : Array.from(this.entityMeshes.values());
    if (targetMeshes.length === 0) return;

    const centroid = new THREE.Vector3();
    let count = 0;
    for (const m of targetMeshes) {
      if (!m.visible) continue;
      const base = (m.userData.basePos as Vec3 | undefined) ?? [
        m.position.x,
        m.position.y,
        m.position.z,
      ];
      centroid.x += base[0];
      centroid.y += base[1];
      centroid.z += base[2];
      count++;
    }
    if (count > 0) centroid.divideScalar(count);

    for (const m of targetMeshes) {
      const base = (m.userData.basePos as Vec3 | undefined) ?? [
        m.position.x,
        m.position.y,
        m.position.z,
      ];
      if (!active) {
        m.position.set(base[0], base[1], base[2]);
      } else {
        const dx = base[0] - centroid.x;
        const dy = Math.max(0, base[1] - centroid.y);
        const dz = base[2] - centroid.z;
        m.position.set(base[0] + dx * 0.45, base[1] + dy * 0.45, base[2] + dz * 0.45);
      }
    }
  }

  getSceneMeshStats(mode: StudioMode): { vertices: number; triangles: number } {
    const root = this.getExportTarget(mode);
    let vertices = 0;
    let triangles = 0;
    root.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh || !obj.visible) return;
      const m = obj as THREE.Mesh;
      const geom = m.geometry;
      if (!geom) return;
      const pos = geom.getAttribute('position');
      if (!pos) return;
      const mult = (m as THREE.InstancedMesh).isInstancedMesh
        ? (m as THREE.InstancedMesh).count
        : 1;
      vertices += pos.count * mult;
      triangles += (geom.index ? geom.index.count / 3 : pos.count / 3) * mult;
    });
    return { vertices: Math.round(vertices), triangles: Math.round(triangles) };
  }

  setCameraPreset(preset: CameraPreset): void {
    const target = new THREE.Vector3(0, 1.4, 0);
    if (preset === 'persp') {
      this.camera.position.set(8.2, 5.4, 9.8);
    } else if (preset === 'top') {
      this.camera.position.set(0.01, 14, 0.01);
    } else if (preset === 'front') {
      this.camera.position.set(0, 2.5, 13.5);
    } else if (preset === 'right') {
      this.camera.position.set(13.5, 2.5, 0);
    } else {
      this.camera.position.set(9.2, 8.2, 9.2);
    }
    this.orbit.target.copy(target);
    this.orbit.update();
  }

  focusSelected(): void {
    if (!this.selectedId) {
      this.setCameraPreset('persp');
      return;
    }
    const obj =
      this.activeMode === 'cad'
        ? this.cadMeshes.get(this.selectedId)
        : this.entityMeshes.get(this.selectedId);
    if (!obj) return;
    this.orbit.target.copy(obj.position);
    this.orbit.update();
  }

  syncPhysicsEntities(entities: StudioEntity[]): void {
    this.transform.detach();
    for (const mesh of this.entityMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.userData.baseMaterial as THREE.Material | undefined)?.dispose();
      (mesh.userData.albedoMaterial as THREE.Material | undefined)?.dispose();
    }
    this.entityMeshes.clear();
    this.physicsGroup.clear();

    for (const child of this.colliderDebugGroup.children) {
      const ls = child as THREE.LineSegments;
      ls.geometry?.dispose();
      (ls.material as THREE.Material)?.dispose();
    }
    this.colliderDebugGroup.clear();

    for (const ent of entities) {
      const geom = this.createEntityGeometry(ent);
      const mat = new THREE.MeshStandardMaterial({
        color: ent.color,
        metalness: ent.metalness,
        roughness: ent.roughness,
        transparent: ent.opacity < 1,
        opacity: ent.opacity,
        wireframe: this.stage.wireframe,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...ent.position);
      mesh.rotation.set(...ent.rotation);
      mesh.scale.set(...ent.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = ent.visible;
      mesh.userData = {
        id: ent.id,
        kind: 'physics',
        locked: Boolean(ent.locked),
        baseMaterial: mat,
        basePos: [...ent.position] as Vec3,
      };
      this.physicsGroup.add(mesh);
      this.entityMeshes.set(ent.id, mesh);

      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: ent.bodyType === 'fixed' ? '#94a3b8' : '#2680eb',
        transparent: true,
        opacity: 0.75,
      });
      const wire = new THREE.LineSegments(edges, lineMat);
      wire.position.copy(mesh.position);
      wire.rotation.copy(mesh.rotation);
      wire.scale.copy(mesh.scale);
      wire.visible = ent.visible;
      wire.userData = { id: ent.id };
      this.colliderDebugGroup.add(wire);
    }

    this.refreshSelectionHighlight();
    this.refreshGizmoAttachment();
    this.applyStageToDomainGroups();
    if (this.stage.explodedView) this.applyExplodedOffset(true);
  }

  private createEntityGeometry(ent: StudioEntity): THREE.BufferGeometry {
    switch (ent.shape) {
      case 'box':
        return new THREE.BoxGeometry(ent.size.width, ent.size.height, ent.size.depth);
      case 'sphere':
        return new THREE.SphereGeometry(ent.size.radius, 28, 20);
      case 'cylinder':
        return new THREE.CylinderGeometry(ent.size.radius, ent.size.radius, ent.size.height, 28);
      case 'capsule':
        return new THREE.CapsuleGeometry(ent.size.radius, ent.size.height, 12, 24);
      case 'cone':
        return new THREE.ConeGeometry(ent.size.radius, ent.size.height, 28);
      case 'custom':
        if (ent.serializedMesh) {
          return deserializeMeshData(ent.serializedMesh);
        }
        return new THREE.BoxGeometry(ent.size.width, ent.size.height, ent.size.depth);
    }
  }

  updateEntityTransform(
    id: string,
    position: Vec3,
    quaternion: [number, number, number, number]
  ): void {
    const mesh = this.entityMeshes.get(id);
    if (mesh) {
      mesh.position.set(position[0], position[1], position[2]);
      mesh.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
      mesh.userData.basePos = [position[0], position[1], position[2]];
    }
    const wire = this.colliderDebugGroup.children.find((c) => c.userData.id === id);
    if (wire) {
      wire.position.set(position[0], position[1], position[2]);
      wire.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    }
  }

  updateJointDebug(segments: JointVisualSegment[]): void {
    for (const c of this.jointDebugGroup.children) {
      const obj = c as THREE.Line | THREE.Mesh;
      obj.geometry?.dispose();
      (obj.material as THREE.Material)?.dispose();
    }
    this.jointDebugGroup.clear();

    for (const seg of segments) {
      const pts = [new THREE.Vector3(...seg.start), new THREE.Vector3(...seg.end)];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const color =
        seg.kind === 'spring'
          ? '#f59e0b'
          : seg.kind === 'revolute'
          ? '#2680eb'
          : '#a78bfa';
      const mat = new THREE.LineBasicMaterial({ color });
      this.jointDebugGroup.add(new THREE.Line(geom, mat));

      const dotGeom = new THREE.SphereGeometry(0.06, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.set(...seg.start);
      this.jointDebugGroup.add(dot);
    }
  }

  syncCadParts(parts: CadPartConfig[]): void {
    this.transform.detach();
    for (const mesh of this.cadMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.userData.baseMaterial as THREE.Material | undefined)?.dispose();
      (mesh.userData.albedoMaterial as THREE.Material | undefined)?.dispose();
    }
    this.cadMeshes.clear();
    this.cadGroup.clear();

    for (const part of parts) {
      const geom = createParametricGeometry(part);
      const mat = new THREE.MeshStandardMaterial({
        color: part.color,
        metalness: 0.35,
        roughness: 0.32,
        wireframe: this.stage.wireframe,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...part.position);
      mesh.rotation.set(...part.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = part.visible;
      mesh.userData = {
        id: part.id,
        kind: 'cad',
        locked: Boolean(part.locked),
        baseMaterial: mat,
        basePos: [...part.position] as Vec3,
      };
      this.cadGroup.add(mesh);
      this.cadMeshes.set(part.id, mesh);
    }

    this.refreshSelectionHighlight();
    this.refreshGizmoAttachment();
    this.applyStageToDomainGroups();
    if (this.stage.explodedView) this.applyExplodedOffset(true);
  }

  getCadMesh(id: string): THREE.Mesh | undefined {
    return this.cadMeshes.get(id);
  }

  updateCadTransform(id: string, position: Vec3, rotation: Vec3): void {
    const mesh = this.cadMeshes.get(id);
    if (!mesh) return;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.userData.basePos = [...position] as Vec3;
  }

  getExportTarget(mode: StudioMode): THREE.Object3D {
    if (mode === 'cad') return this.cadGroup;
    if (mode === 'mesh') return this.meshGroup;
    if (mode === 'electronics') return this.electronicsGroup;
    if (mode === 'math') return this.mathGroup;
    if (mode === 'soft') return this.softGroup;
    return this.physicsGroup;
  }

  captureTransparentPNG(filename = 'outerflow-transparent.png'): void {
    const prevGizmoVis = this.transform.getHelper().visible;
    this.transform.getHelper().visible = false;
    captureTransparentViewportPNG(
      this.renderer,
      this.scene,
      this.camera,
      [this.floorMesh, this.reflector, this.gridHelper, this.axesHelper],
      filename
    );
    this.transform.getHelper().visible = prevGizmoVis;
  }

  setSnapToGrid(
    enabled: boolean,
    translationSnap = 0.25,
    rotationSnapRad = Math.PI / 12
  ): void {
    this.transform.setTranslationSnap(enabled ? translationSnap : null);
    this.transform.setRotationSnap(enabled ? rotationSnapRad : null);
    this.transform.setScaleSnap(enabled ? 0.1 : null);
  }

  updateMeasurementOverlay(ptA: Vec3 | null, ptB: Vec3 | null): void {
    for (const c of this.measurementGroup.children) {
      const obj = c as THREE.Line | THREE.Mesh;
      obj.geometry?.dispose();
      (obj.material as THREE.Material)?.dispose();
    }
    this.measurementGroup.clear();
    if (!ptA || !ptB) return;

    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...ptA),
      new THREE.Vector3(...ptB),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: '#22d3ee',
      dashSize: 0.18,
      gapSize: 0.1,
    });
    const line = new THREE.Line(lineGeom, lineMat);
    line.computeLineDistances();
    this.measurementGroup.add(line);

    const endGeomA = new THREE.SphereGeometry(0.08, 12, 10);
    const endMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
    const dotA = new THREE.Mesh(endGeomA, endMat);
    dotA.position.set(...ptA);
    const dotB = new THREE.Mesh(endGeomA.clone(), endMat);
    dotB.position.set(...ptB);
    this.measurementGroup.add(dotA, dotB);
  }

  render(): void {
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.transform.dispose();
    this.orbit.dispose();
    this.envRenderTarget.dispose();
    this.solidMaterial.dispose();
    this.normalMaterial.dispose();
    this.reflector.geometry.dispose();
    (this.reflector.material as THREE.Material).dispose();
    this.reflector.dispose();
    this.floorMesh.geometry.dispose();
    (this.floorMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
