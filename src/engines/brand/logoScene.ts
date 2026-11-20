import * as THREE from 'three';
import type { LogoStudioConfig } from '../../types/studio';

const STORAGE_KEY = 'outerflow-logo-config-v1';

export function createDefaultLogoConfig(): LogoStudioConfig {
  return {
    variant: 'morphogenesis',
    title: 'OUTERFLOW STUDIO',
    tagline: 'Where engineering births lifeforms.',
    labLabel: 'HARBORIA LABS',
    durationSec: 4.2,
    fluidity: 1.1,
    turbulence: 0.36,
    glowIntensity: 1.25,
    primaryColor: '#2680eb',
    secondaryColor: '#22d3ee',
    accentColor: '#a78bfa',
    particleCount: 520,
    showIntroOnLoad: true,
  };
}

export function loadSavedLogoConfig(): LogoStudioConfig {
  const defaults = createDefaultLogoConfig();
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<LogoStudioConfig>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveLogoConfig(config: LogoStudioConfig): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface IntroTimelineSample {
  morph: number;
  textOpacity: number;
  textSlideY: number;
  dividerWidth: number;
  exitFade: number;
  cameraZ: number;
}

export function computeIntroTimeline(progressRaw: number): IntroTimelineSample {
  const p = Math.max(0, Math.min(1, Number.isFinite(progressRaw) ? progressRaw : 0));
  const morph = smoothstep(0.0, 0.38, p);
  const textIn = smoothstep(0.18, 0.34, p);
  const textOut = 1 - smoothstep(0.76, 0.92, p);
  const textOpacity = Math.max(0, Math.min(1, textIn * textOut));
  const textSlideY = (1 - textIn) * 16;
  const dividerWidth = Math.max(0, Math.min(1, smoothstep(0.22, 0.44, p) * textOut));
  const exitFade = Math.max(0, Math.min(1, 1 - smoothstep(0.84, 1.0, p)));
  const cameraZ = 7.6 - 2.0 * smoothstep(0.0, 0.8, p);
  return { morph, textOpacity, textSlideY, dividerWidth, exitFade, cameraZ };
}

function createRingGeometries(variant: LogoStudioConfig['variant']): THREE.BufferGeometry[] {
  if (variant === 'morphogenesis') {
    return [new THREE.TorusKnotGeometry(1.18, 0.085, 110, 16, 2, 3)];
  }
  if (variant === 'bioGyroid') {
    const g1 = new THREE.TorusGeometry(1.32, 0.06, 20, 96);
    const g2 = new THREE.TorusGeometry(1.32, 0.06, 20, 96);
    g2.rotateX(Math.PI / 3);
    g2.rotateY(Math.PI / 4);
    const g3 = new THREE.TorusGeometry(1.06, 0.045, 16, 84);
    g3.rotateY(Math.PI / 2);
    return [g1, g2, g3];
  }
  // ferroVortex
  const outer = new THREE.TorusGeometry(1.38, 0.095, 24, 120);
  const inner = new THREE.TorusGeometry(1.02, 0.042, 18, 96);
  inner.rotateX(Math.PI / 5);
  return [outer, inner];
}

/**
 * Pure Three.js mesh builder for GLB / STL / OBJ export and 3D printing.
 * Displaces an icosahedron core deterministically with organic fluid harmonics.
 */
export function buildExportableEmblemGroup(config: LogoStudioConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OuterflowEmblem';

  const ringMat = new THREE.MeshStandardMaterial({
    color: '#1b1e26',
    metalness: 0.88,
    roughness: 0.22,
  });

  const ringGeoms = createRingGeometries(config.variant);
  ringGeoms.forEach((geom, idx) => {
    const mesh = new THREE.Mesh(geom, ringMat);
    mesh.name = `OuterflowRing_${idx}`;
    group.add(mesh);
  });

  const coreGeom = new THREE.IcosahedronGeometry(0.68, 4);
  const pos = coreGeom.getAttribute('position');
  const turb = Math.max(0.05, Math.min(1.0, config.turbulence));
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const wave =
      Math.sin(n.x * 3.8 + n.y * 2.4) * Math.cos(n.z * 3.5 - n.x * 1.9) * 0.55 +
      Math.sin(n.y * 6.2 - n.z * 4.1) * 0.25;
    const scale = 1 + wave * turb * 0.65;
    v.multiplyScalar(scale);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  coreGeom.computeVertexNormals();

  const coreMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor,
    emissive: config.primaryColor,
    emissiveIntensity: 0.45 * config.glowIntensity,
    metalness: 0.65,
    roughness: 0.18,
  });
  const coreMesh = new THREE.Mesh(coreGeom, coreMat);
  coreMesh.name = 'OuterflowFluidCore';
  group.add(coreMesh);

  return group;
}

const FLUID_VERT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uFluidity;
  uniform float uTurbulence;

  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying float vDisplacement;

  float fieldWave(vec3 p, float t) {
    float w1 = sin(p.x * 3.2 + t * 1.7) * cos(p.y * 3.0 - t * 1.3) * sin(p.z * 3.4 + t * 1.1);
    float w2 = sin(p.y * 5.8 - t * 2.4 + p.z * 4.1) * cos(p.x * 5.2 + t * 1.9) * 0.45;
    float w3 = cos((p.x + p.y + p.z) * 7.2 - t * 2.9) * 0.2;
    return w1 + w2 + w3;
  }

  vec3 displacePos(vec3 basePos, vec3 baseNrm, float t, out float dispOut) {
    float n = fieldWave(baseNrm, t);
    float amp = mix(0.45, 0.24, uMorph) * (0.4 + uTurbulence * 1.35);
    float scale = mix(0.28, 1.0, uMorph);
    dispOut = n * amp;
    return basePos * scale + baseNrm * dispOut;
  }

  void main() {
    float t = uTime * (0.45 + uFluidity * 0.75);
    vec3 nrm = normalize(normal);

    float disp;
    vec3 p0 = displacePos(position, nrm, t, disp);

    // Analytic tangent-space finite difference for smooth fluid highlights
    vec3 up = abs(nrm.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 tan1 = normalize(cross(up, nrm));
    vec3 tan2 = cross(nrm, tan1);
    float eps = 0.04;
    float d1;
    float d2;
    vec3 p1 = displacePos(position + tan1 * eps, normalize(nrm + tan1 * eps), t, d1);
    vec3 p2 = displacePos(position + tan2 * eps, normalize(nrm + tan2 * eps), t, d2);

    vec3 perturbedNrm = normalize(cross(p1 - p0, p2 - p0));
    if (dot(perturbedNrm, nrm) < 0.0) perturbedNrm = -perturbedNrm;

    vec4 worldPos = modelMatrix * vec4(p0, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * perturbedNrm);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vDisplacement = disp;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FLUID_FRAG_SHADER = /* glsl */ `
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform float uGlow;
  uniform float uTime;

  varying vec3 vNormalWorld;
  varying vec3 vViewDir;
  varying float vDisplacement;

  void main() {
    vec3 N = normalize(vNormalWorld);
    vec3 V = normalize(vViewDir);
    float ndotv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.6);

    // Dark obsidian metallic core with liquid iridescent ridges
    vec3 darkMetal = vec3(0.04, 0.05, 0.08);
    float ridge = clamp(vDisplacement * 3.0 + 0.5, 0.0, 1.0);
    vec3 fluidTint = mix(uPrimary, uSecondary, ridge);
    fluidTint = mix(fluidTint, uAccent, smoothstep(0.35, 0.95, fresnel) * 0.65);

    vec3 L1 = normalize(vec3(0.7, 0.9, 0.6));
    vec3 L2 = normalize(vec3(-0.8, 0.3, -0.5));
    vec3 H1 = normalize(L1 + V);
    vec3 H2 = normalize(L2 + V);

    float diff = max(dot(N, L1), 0.0) * 0.65 + max(dot(N, L2), 0.0) * 0.35;
    float spec1 = pow(max(dot(N, H1), 0.0), 42.0);
    float spec2 = pow(max(dot(N, H2), 0.0), 28.0);

    vec3 color = darkMetal + fluidTint * (0.28 + diff * 0.55) * uGlow;
    color += fluidTint * fresnel * (1.25 * uGlow);
    color += vec3(0.92, 0.96, 1.0) * spec1 * 0.85;
    color += uSecondary * spec2 * 0.45;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const PARTICLE_VERT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uFluidity;
  attribute float aPhase;
  attribute float aRadius;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float speed = 0.35 + uFluidity * 0.55;
    float angle = aPhase + uTime * speed * (1.5 / (0.6 + aRadius));
    float radial = mix(aRadius * 2.7 + 1.5, aRadius, uMorph);

    vec3 pos;
    pos.x = cos(angle) * radial;
    pos.z = sin(angle) * radial * 0.85;
    pos.y = sin(angle * 2.0 + aPhase) * (0.35 + (1.0 - uMorph) * 1.1) + cos(uTime * 0.9 + aPhase) * 0.25;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = clamp((16.0 / max(1.0, -mvPos.z)) * (0.65 + 0.55 * sin(aPhase * 3.0)), 1.5, 9.0);
    vAlpha = mix(0.25, 0.85, uMorph);
    vMix = 0.5 + 0.5 * sin(aPhase + uTime);
  }
`;

const PARTICLE_FRAG_SHADER = /* glsl */ `
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform float uGlow;
  varying float vAlpha;
  varying float vMix;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r2 = dot(cxy, cxy);
    if (r2 > 1.0) discard;
    float soft = exp(-r2 * 2.8);
    vec3 col = mix(uPrimary, uSecondary, vMix) * (0.9 + 0.45 * uGlow);
    gl_FragColor = vec4(col, soft * vAlpha);
  }
`;

export class OuterflowLogoRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rootGroup: THREE.Group;
  private ringGroup: THREE.Group;
  private coreMesh: THREE.Mesh;
  private coreMat: THREE.ShaderMaterial;
  private ringMat: THREE.MeshStandardMaterial;
  private points: THREE.Points;
  private pointsMat: THREE.ShaderMaterial;
  private config: LogoStudioConfig;
  private currentVariant: LogoStudioConfig['variant'];
  private currentParticleCount: number;
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLightA: THREE.PointLight;
  private rimLightB: THREE.PointLight;

  constructor(canvas: HTMLCanvasElement, initialConfig: LogoStudioConfig) {
    this.config = { ...initialConfig };
    this.currentVariant = initialConfig.variant;
    this.currentParticleCount = initialConfig.particleCount;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#000000');

    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 0.15, 5.8);

    this.hemiLight = new THREE.HemisphereLight('#cbd5e1', '#09090b', 0.9);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
    this.keyLight.position.set(4, 6, 5);
    this.scene.add(this.keyLight);

    this.rimLightA = new THREE.PointLight(initialConfig.secondaryColor, 8, 16);
    this.rimLightA.position.set(-3.2, 2.1, 2.5);
    this.scene.add(this.rimLightA);

    this.rimLightB = new THREE.PointLight(initialConfig.accentColor, 6, 16);
    this.rimLightB.position.set(3.2, -1.8, 2.0);
    this.scene.add(this.rimLightB);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // Sculpted outer ring
    this.ringMat = new THREE.MeshStandardMaterial({
      color: '#252b38',
      metalness: 0.85,
      roughness: 0.22,
    });
    this.ringGroup = new THREE.Group();
    this.rebuildRingMeshes(initialConfig.variant);
    this.rootGroup.add(this.ringGroup);

    // Living fluid core (subdivision 4 = 5,120 tris for locked 60fps on all GPUs)
    const coreGeom = new THREE.IcosahedronGeometry(0.68, 4);
    this.coreMat = new THREE.ShaderMaterial({
      vertexShader: FLUID_VERT_SHADER,
      fragmentShader: FLUID_FRAG_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 1 },
        uFluidity: { value: initialConfig.fluidity },
        uTurbulence: { value: initialConfig.turbulence },
        uGlow: { value: initialConfig.glowIntensity },
        uPrimary: { value: new THREE.Color(initialConfig.primaryColor) },
        uSecondary: { value: new THREE.Color(initialConfig.secondaryColor) },
        uAccent: { value: new THREE.Color(initialConfig.accentColor) },
      },
    });
    this.coreMesh = new THREE.Mesh(coreGeom, this.coreMat);
    this.rootGroup.add(this.coreMesh);

    // Swirling filament particles
    this.pointsMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT_SHADER,
      fragmentShader: PARTICLE_FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 1 },
        uFluidity: { value: initialConfig.fluidity },
        uGlow: { value: initialConfig.glowIntensity },
        uPrimary: { value: new THREE.Color(initialConfig.primaryColor) },
        uSecondary: { value: new THREE.Color(initialConfig.secondaryColor) },
      },
    });
    this.points = new THREE.Points(this.buildParticlesGeometry(initialConfig.particleCount), this.pointsMat);
    this.rootGroup.add(this.points);

    this.resize();
  }

  private rebuildRingMeshes(variant: LogoStudioConfig['variant']): void {
    for (const child of this.ringGroup.children) {
      (child as THREE.Mesh).geometry?.dispose();
    }
    this.ringGroup.clear();

    const geoms = createRingGeometries(variant);
    for (const g of geoms) {
      this.ringGroup.add(new THREE.Mesh(g, this.ringMat));
    }
  }

  private buildParticlesGeometry(countRaw: number): THREE.BufferGeometry {
    const count = Math.max(80, Math.min(2000, Math.round(countRaw)));
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const radii = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      phases[i] = (i * 2.39996) % (Math.PI * 2);
      radii[i] = 1.25 + ((i * 17) % 100) / 100 * 1.45;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    return geom;
  }

  updateConfig(next: LogoStudioConfig): void {
    this.config = { ...next };

    if (next.variant !== this.currentVariant) {
      this.currentVariant = next.variant;
      this.rebuildRingMeshes(next.variant);
    }

    if (next.particleCount !== this.currentParticleCount) {
      this.currentParticleCount = next.particleCount;
      this.points.geometry.dispose();
      this.points.geometry = this.buildParticlesGeometry(next.particleCount);
    }

    this.coreMat.uniforms.uFluidity.value = next.fluidity;
    this.coreMat.uniforms.uTurbulence.value = next.turbulence;
    this.coreMat.uniforms.uGlow.value = next.glowIntensity;
    this.coreMat.uniforms.uPrimary.value.set(next.primaryColor);
    this.coreMat.uniforms.uSecondary.value.set(next.secondaryColor);
    this.coreMat.uniforms.uAccent.value.set(next.accentColor);

    this.pointsMat.uniforms.uFluidity.value = next.fluidity;
    this.pointsMat.uniforms.uGlow.value = next.glowIntensity;
    this.pointsMat.uniforms.uPrimary.value.set(next.primaryColor);
    this.pointsMat.uniforms.uSecondary.value.set(next.secondaryColor);

    this.rimLightA.color.set(next.secondaryColor);
    this.rimLightB.color.set(next.accentColor);
  }

  setTransparentBackground(transparent: boolean): void {
    this.scene.background = transparent ? null : new THREE.Color('#000000');
    this.renderer.setClearColor('#000000', transparent ? 0 : 1);
  }

  resize(width?: number, height?: number): void {
    const canvas = this.renderer.domElement;
    const w = Math.max(1, width ?? canvas.clientWidth ?? 1280);
    const h = Math.max(1, height ?? canvas.clientHeight ?? 720);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  renderAt(elapsedSec: number, introProgress: number | null = null): void {
    let morph = 1.0;
    let camZ = 5.65;

    if (introProgress !== null) {
      const tl = computeIntroTimeline(introProgress);
      morph = tl.morph;
      camZ = tl.cameraZ;
    }

    // Automatically adapt camera distance for portrait / narrow screens
    const aspect = this.camera.aspect || 1;
    const responsiveZ = aspect < 1 ? camZ / Math.max(0.55, aspect) : camZ;

    this.camera.position.z = responsiveZ;
    this.camera.lookAt(0, 0, 0);

    const spin = 0.25 + this.config.fluidity * 0.28;
    this.ringGroup.rotation.y = elapsedSec * spin;
    this.ringGroup.rotation.x = Math.sin(elapsedSec * 0.45) * 0.22;
    this.ringGroup.scale.setScalar(0.5 + 0.5 * morph);

    this.coreMesh.rotation.y = -elapsedSec * spin * 0.7;

    this.coreMat.uniforms.uTime.value = elapsedSec;
    this.coreMat.uniforms.uMorph.value = morph;
    this.pointsMat.uniforms.uTime.value = elapsedSec;
    this.pointsMat.uniforms.uMorph.value = morph;

    this.renderer.render(this.scene, this.camera);
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  getExportGroup(): THREE.Group {
    return buildExportableEmblemGroup(this.config);
  }

  dispose(): void {
    for (const child of this.ringGroup.children) {
      (child as THREE.Mesh).geometry?.dispose();
    }
    this.ringMat.dispose();
    this.coreMesh.geometry.dispose();
    this.coreMat.dispose();
    this.points.geometry.dispose();
    this.pointsMat.dispose();
    this.renderer.dispose();
  }
}
