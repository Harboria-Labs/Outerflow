import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type {
  CadPartConfig,
  CameraPreset,
  GizmoMode,
  LightingPreset,
  StudioEntity,
  StudioMode,
  Vec3,
  ViewportOverlays,
} from '../types/studio';
import { createParametricGeometry, deserializeMeshData } from '../engines/cad/parametricGenerators';
import type { JointVisualSegment } from '../engines/physics/rapierEngine';

export interface ViewportCallbacks {
  onSelectObject?: (id: string | null) => void;
  onTransformObject?: (
    id: string,
    kind: 'physics' | 'cad',
    position: Vec3,
    rotation: Vec3,
    scale: Vec3
  ) => void;
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
  readonly mathGroup = new THREE.Group();
  readonly softGroup = new THREE.Group();

  private gridHelper: THREE.GridHelper;
  private axesHelper: THREE.AxesHelper;
  private floorMesh: THREE.Mesh;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  private entityMeshes = new Map<string, THREE.Mesh>();
  private cadMeshes = new Map<string, THREE.Mesh>();
  private selectedId: string | null = null;
  private gizmoMode: GizmoMode = 'translate';
  private activeMode: StudioMode = 'physics';
  private wireframeEnabled = false;
  private callbacks: ViewportCallbacks;
  private resizeObserver: ResizeObserver;
  private pointerDownPos = { x: 0, y: 0 };
  private isDraggingGizmo = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(container: HTMLElement, callbacks: ViewportCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0f18');
    this.scene.fog = new THREE.Fog('#0a0f18', 28, 75);

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.camera.position.set(8.5, 6.2, 10.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

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
      this.callbacks.onTransformObject?.(
        id,
        kind,
        [obj.position.x, obj.position.y, obj.position.z],
        [obj.rotation.x, obj.rotation.y, obj.rotation.z],
        [obj.scale.x, obj.scale.y, obj.scale.z]
      );
    });

    // Studio lighting
    this.hemiLight = new THREE.HemisphereLight('#b8d4ff', '#1e293b', 0.65);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#ffffff', 1.8);
    this.keyLight.position.set(10, 16, 11);
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

    this.rimLight = new THREE.DirectionalLight('#38bdf8', 0.65);
    this.rimLight.position.set(-10, 7, -9);
    this.scene.add(this.rimLight);

    // Ground + grid + axes
    const floorGeom = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0e1522',
      roughness: 0.92,
      metalness: 0.05,
    });
    this.floorMesh = new THREE.Mesh(floorGeom, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = -0.005;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    this.gridHelper = new THREE.GridHelper(40, 40, '#22d3ee', '#1e293b');
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.45;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(2.2);
    this.axesHelper.position.set(0, 0.01, 0);
    this.scene.add(this.axesHelper);

    this.scene.add(this.physicsGroup);
    this.scene.add(this.colliderDebugGroup);
    this.scene.add(this.jointDebugGroup);
    this.scene.add(this.cadGroup);
    this.scene.add(this.mathGroup);
    this.scene.add(this.softGroup);

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    // Selection pointer handlers
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.isDraggingGizmo) return;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 5) return; // Was an orbit drag

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
    this.cadGroup.visible = mode === 'cad';
    this.mathGroup.visible = mode === 'math';
    this.softGroup.visible = mode === 'soft';

    this.refreshGizmoAttachment();
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
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(id === this.selectedId ? 0x164e63 : 0x000000);
      mat.emissiveIntensity = id === this.selectedId ? 0.45 : 0;
    }
    for (const [id, mesh] of this.cadMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(id === this.selectedId ? 0x164e63 : 0x000000);
      mat.emissiveIntensity = id === this.selectedId ? 0.45 : 0;
    }
  }

  private refreshGizmoAttachment(): void {
    if (this.gizmoMode === 'select' || !this.selectedId) {
      this.transform.detach();
      return;
    }
    if (this.activeMode === 'cad') {
      const mesh = this.cadMeshes.get(this.selectedId);
      if (mesh && mesh.visible) this.transform.attach(mesh);
      else this.transform.detach();
    } else if (this.activeMode === 'physics' || this.activeMode === 'experiments') {
      const mesh = this.entityMeshes.get(this.selectedId);
      if (mesh && mesh.visible) this.transform.attach(mesh);
      else this.transform.detach();
    } else {
      this.transform.detach();
    }
  }

  setOverlays(overlays: ViewportOverlays): void {
    this.gridHelper.visible = overlays.showGrid;
    this.axesHelper.visible = overlays.showAxes;
    this.colliderDebugGroup.visible =
      overlays.showColliders && (this.activeMode === 'physics' || this.activeMode === 'experiments');
    this.wireframeEnabled = overlays.showWireframe;

    for (const mesh of this.entityMeshes.values()) {
      (mesh.material as THREE.MeshStandardMaterial).wireframe = overlays.showWireframe;
    }
    for (const mesh of this.cadMeshes.values()) {
      (mesh.material as THREE.MeshStandardMaterial).wireframe = overlays.showWireframe;
    }
    this.mathGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && 'wireframe' in mat) {
          mat.wireframe = overlays.showWireframe;
        }
      }
    });

    this.applyLightingPreset(overlays.lighting);
  }

  private applyLightingPreset(preset: LightingPreset): void {
    const floorMat = this.floorMesh.material as THREE.MeshStandardMaterial;
    if (preset === 'studio') {
      this.scene.background = new THREE.Color('#0a0f18');
      this.scene.fog = new THREE.Fog('#0a0f18', 28, 75);
      floorMat.color.set('#0e1522');
      this.hemiLight.color.set('#b8d4ff');
      this.hemiLight.intensity = 0.65;
      this.keyLight.color.set('#ffffff');
      this.keyLight.intensity = 1.8;
      this.rimLight.color.set('#38bdf8');
      this.rimLight.intensity = 0.65;
    } else if (preset === 'blueprint') {
      this.scene.background = new THREE.Color('#061a33');
      this.scene.fog = new THREE.Fog('#061a33', 30, 75);
      floorMat.color.set('#072142');
      this.hemiLight.color.set('#7dd3fc');
      this.hemiLight.intensity = 0.8;
      this.keyLight.color.set('#e0f2fe');
      this.keyLight.intensity = 1.5;
      this.rimLight.color.set('#22d3ee');
      this.rimLight.intensity = 0.85;
    } else if (preset === 'lab') {
      this.scene.background = new THREE.Color('#111317');
      this.scene.fog = new THREE.Fog('#111317', 26, 70);
      floorMat.color.set('#181c22');
      this.hemiLight.color.set('#ffffff');
      this.hemiLight.intensity = 0.9;
      this.keyLight.color.set('#fffbeb');
      this.keyLight.intensity = 2.0;
      this.rimLight.color.set('#94a3b8');
      this.rimLight.intensity = 0.45;
    } else {
      // aerospace
      this.scene.background = new THREE.Color('#100c18');
      this.scene.fog = new THREE.Fog('#100c18', 28, 75);
      floorMat.color.set('#171224');
      this.hemiLight.color.set('#fde68a');
      this.hemiLight.intensity = 0.6;
      this.keyLight.color.set('#ffedd5');
      this.keyLight.intensity = 1.95;
      this.rimLight.color.set('#818cf8');
      this.rimLight.intensity = 0.85;
    }
  }

  setCameraPreset(preset: CameraPreset): void {
    const target = new THREE.Vector3(0, 1.4, 0);
    if (preset === 'persp') {
      this.camera.position.set(8.5, 6.2, 10.5);
    } else if (preset === 'top') {
      this.camera.position.set(0.01, 14, 0.01);
    } else if (preset === 'front') {
      this.camera.position.set(0, 2.5, 13.5);
    } else if (preset === 'right') {
      this.camera.position.set(13.5, 2.5, 0);
    } else {
      this.camera.position.set(9.5, 8.5, 9.5);
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
      (mesh.material as THREE.Material).dispose();
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
        wireframe: this.wireframeEnabled,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...ent.position);
      mesh.rotation.set(...ent.rotation);
      mesh.scale.set(...ent.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = ent.visible;
      mesh.userData = { id: ent.id, kind: 'physics' };
      this.physicsGroup.add(mesh);
      this.entityMeshes.set(ent.id, mesh);

      // Build wireframe collider debug overlay
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: ent.bodyType === 'fixed' ? '#94a3b8' : '#22d3ee',
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
      const pts = [
        new THREE.Vector3(...seg.start),
        new THREE.Vector3(...seg.end),
      ];
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const color =
        seg.kind === 'spring'
          ? '#f59e0b'
          : seg.kind === 'revolute'
          ? '#22d3ee'
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
      (mesh.material as THREE.Material).dispose();
    }
    this.cadMeshes.clear();
    this.cadGroup.clear();

    for (const part of parts) {
      const geom = createParametricGeometry(part);
      const mat = new THREE.MeshStandardMaterial({
        color: part.color,
        metalness: 0.35,
        roughness: 0.32,
        wireframe: this.wireframeEnabled,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(...part.position);
      mesh.rotation.set(...part.rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = part.visible;
      mesh.userData = { id: part.id, kind: 'cad' };
      this.cadGroup.add(mesh);
      this.cadMeshes.set(part.id, mesh);
    }

    this.refreshSelectionHighlight();
    this.refreshGizmoAttachment();
  }

  getCadMesh(id: string): THREE.Mesh | undefined {
    return this.cadMeshes.get(id);
  }

  updateCadTransform(id: string, position: Vec3, rotation: Vec3): void {
    const mesh = this.cadMeshes.get(id);
    if (!mesh) return;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }

  getExportTarget(mode: StudioMode): THREE.Object3D {
    if (mode === 'cad') return this.cadGroup;
    if (mode === 'math') return this.mathGroup;
    if (mode === 'soft') return this.softGroup;
    return this.physicsGroup;
  }

  render(): void {
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.transform.dispose();
    this.orbit.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
