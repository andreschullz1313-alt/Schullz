import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw } from 'lucide-react';
import { MODELO_CORPO_360_BASE64 } from '../assets/modeloCorpo360Glb';
import { BODY_PAIN_ZONES, TIER_META } from '../data/studioData';
import { fmt, useLanguage } from '../i18n/LanguageContext';

interface PainMap3DProps {
  isDark: boolean;
  selectedZone: string | null;
  onSelectZone: (zoneName: string) => void;
  onUseInQuote: (zoneName: string) => void;
}

type CameraPreset = 'frente' | 'lado_dir' | 'costas' | 'lado_esq' | 'reset';
type FilterMode = 'all' | 'low' | 'moderate' | 'sensitive' | 'blank';
type PaintTier = 'low' | 'moderate' | 'high';

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  frente: { pos: [0, 1.04, 2.75], target: [0, 0.94, 0] },
  lado_dir: { pos: [2.75, 1.04, 0], target: [0, 0.94, 0] },
  costas: { pos: [0, 1.04, -2.75], target: [0, 0.94, 0] },
  lado_esq: { pos: [-2.75, 1.04, 0], target: [0, 0.94, 0] },
  reset: { pos: [0.56, 1.12, 2.78], target: [0, 0.94, 0] },
};

const PALETTE = {
  whiteClay: '#dad9d5',
  shortsHex: 0x525257,
  green: '#2fbf4f',
  yellow: '#e0c020',
  redDeep: '#d51f2b',
  selectedHex: 0xffd27a,
  hoverHex: 0xf3b64b,
  darkBg: 0x090909,
  lightBg: 0xf7f4ee,
  darkPedestalRing: 0x9c1f1f,
  lightPedestalRing: 0x80643b,
};

// Surface anchor points in GLB body coordinates (y: 0..1.78) for the gold selection ring
const ZONE_ANCHORS: Record<string, [number, number, number]> = {
  'Cabeça': [0, 1.66, 0.11],
  'Pescoço (lateral)': [0.055, 1.50, 0.045],
  'Pescoço posterior': [0, 1.48, -0.07],
  'Esterno': [0, 1.32, 0.12],
  'Peito': [0.09, 1.32, 0.115],
  'Costelas': [0.145, 1.21, 0.06],
  'Abdômen': [0, 1.11, 0.105],
  'Virilha / zona genital': [0, 0.99, 0.10],
  'Costas (parte alta)': [0.10, 1.30, -0.10],
  'Lombar': [0, 1.08, -0.095],
  'Axila': [0.185, 1.33, 0.02],
  'Ombro / deltoide': [0.225, 1.40, 0.02],
  'Braço externo': [0.28, 1.28, -0.01],
  'Braço interno': [0.25, 1.26, 0.03],
  'Cotovelo': [0.315, 1.19, -0.045],
  'Antebraço externo': [0.37, 1.07, 0.02],
  'Mãos e dedos': [0.45, 0.91, 0.03],
  'Coxa externa': [0.14, 0.67, 0.01],
  'Coxa interna': [0.075, 0.66, 0.03],
  'Joelho': [0.115, 0.50, 0.068],
  'Panturrilha externa': [0.125, 0.30, -0.05],
  'Pés e tornozelos': [0.13, 0.06, 0.10],
};

function tierColorForFilter(tier: PaintTier, filter: FilterMode): string {
  if (filter === 'blank') return PALETTE.whiteClay;
  if (filter === 'low' && tier !== 'low') return PALETTE.whiteClay;
  if (filter === 'moderate' && tier !== 'moderate') return PALETTE.whiteClay;
  if (filter === 'sensitive' && tier !== 'high') return PALETTE.whiteClay;
  if (tier === 'low') return PALETTE.green;
  if (tier === 'moderate') return PALETTE.yellow;
  return PALETTE.redDeep;
}

/**
 * Classifies any surface vertex/point on modelo_corpo_360_tatuagem.glb (y: 0..1.78)
 * into its anatomical BodyPainZone name and sensitivity tier matching the Schullz Ink Pain Map.
 */
function classifyAnatomicalPoint(
  x: number,
  y: number,
  z: number,
  nx: number,
  _ny: number,
  nz: number
): { zoneName: string; paintTier: PaintTier } {
  const ax = Math.abs(x);

  // 1. Head & Neck
  if (y >= 1.565) {
    if (y < 1.59 && z < -0.025 && nz < -0.22) {
      return { zoneName: 'Pescoço posterior', paintTier: 'high' };
    }
    return { zoneName: 'Cabeça', paintTier: 'low' };
  }
  if (y >= 1.47 && ax < 0.098) {
    if (nz < -0.18 || z < -0.015) {
      return { zoneName: 'Pescoço posterior', paintTier: 'high' };
    }
    return { zoneName: 'Pescoço (lateral)', paintTier: 'high' };
  }

  // 2. Arms & Hands (A-pose geometry separation)
  const isArm = (y >= 0.84 && y < 1.32 && ax > 0.202) || (y >= 1.32 && y <= 1.51 && ax > 0.172);
  if (isArm) {
    const dAxilla = Math.hypot(ax - 0.185, y - 1.325, z);
    if (dAxilla < 0.056) {
      return { zoneName: 'Axila', paintTier: 'high' };
    }
    if (y < 0.99 && ax > 0.365) {
      return {
        zoneName: 'Mãos e dedos',
        paintTier: nz > -0.18 || z > 0.008 ? 'high' : 'low',
      };
    }
    if (y < 1.145 && ax > 0.30) {
      return { zoneName: 'Antebraço externo', paintTier: 'low' };
    }
    if (y < 1.235 && ax > 0.245) {
      if (nz < -0.22 || z < -0.022) {
        return { zoneName: 'Cotovelo', paintTier: 'high' };
      }
      if (Math.sign(nx) !== Math.sign(x) && nz > 0.05) {
        return { zoneName: 'Braço interno', paintTier: 'moderate' };
      }
      return { zoneName: 'Antebraço externo', paintTier: 'low' };
    }
    if (y < 1.375 && ax > 0.195) {
      if (Math.sign(nx) !== Math.sign(x) && nz > -0.25) {
        return { zoneName: 'Braço interno', paintTier: 'moderate' };
      }
      return { zoneName: 'Braço externo', paintTier: 'low' };
    }
    if (y > 1.43 && z > 0.022 && ax < 0.24) {
      return { zoneName: 'Ombro / deltoide', paintTier: 'moderate' };
    }
    return { zoneName: 'Ombro / deltoide', paintTier: 'low' };
  }

  // 3. Torso (y: 0.90..1.48)
  if (y >= 0.90 && y < 1.48 && ax <= 0.21) {
    const dAxilla = Math.hypot(ax - 0.185, y - 1.325, z);
    if (dAxilla < 0.055) {
      return { zoneName: 'Axila', paintTier: 'high' };
    }
    if (y < 1.03 && z > 0.025 && ax < 0.13) {
      return { zoneName: 'Virilha / zona genital', paintTier: 'high' };
    }
    if (z >= -0.015) {
      if (y >= 1.20 && ax < 0.038 && z > 0.015) {
        return { zoneName: 'Esterno', paintTier: 'high' };
      }
      if (y >= 1.41 && ax < 0.068 && z > 0.01) {
        return { zoneName: 'Esterno', paintTier: 'high' };
      }
      if (y >= 1.385 && ax >= 0.04 && ax <= 0.165) {
        return { zoneName: 'Peito', paintTier: 'moderate' };
      }
      if (y >= 1.245 && y < 1.385 && ax >= 0.038 && ax <= 0.15 && z > 0.015) {
        return { zoneName: 'Peito', paintTier: 'low' };
      }
      if (y >= 1.155 && y < 1.33 && (ax >= 0.112 || y < 1.245) && z > -0.015) {
        return { zoneName: 'Costelas', paintTier: 'high' };
      }
      if (y >= 1.02 && y < 1.21) {
        return { zoneName: 'Abdômen', paintTier: 'moderate' };
      }
      return { zoneName: 'Lombar', paintTier: 'moderate' };
    } else {
      if (y >= 1.12 && ax < 0.036) {
        return { zoneName: 'Pescoço posterior', paintTier: 'high' };
      }
      if (y >= 1.175) {
        return { zoneName: 'Costas (parte alta)', paintTier: 'low' };
      }
      return { zoneName: 'Lombar', paintTier: 'moderate' };
    }
  }

  // 4. Legs & Feet (y < 0.90)
  if (y < 0.13) {
    return { zoneName: 'Pés e tornozelos', paintTier: 'high' };
  }
  if (y < 0.44) {
    if (z > 0.012 && nz > 0.2) {
      return { zoneName: 'Panturrilha externa', paintTier: 'moderate' };
    }
    return { zoneName: 'Panturrilha externa', paintTier: 'low' };
  }
  if (y < 0.56) {
    if (z > 0.012 || z < -0.022) {
      return { zoneName: 'Joelho', paintTier: 'high' };
    }
    return { zoneName: 'Coxa externa', paintTier: 'low' };
  }
  if (y >= 0.82 && z > 0.035 && ax < 0.11) {
    return { zoneName: 'Virilha / zona genital', paintTier: 'high' };
  }
  if (ax >= 0.11 && z > -0.035 && z < 0.045) {
    return { zoneName: 'Coxa externa', paintTier: 'low' };
  }
  return { zoneName: 'Coxa interna', paintTier: 'moderate' };
}

function classifyShortsHit(x: number, y: number, z: number): string {
  const ax = Math.abs(x);
  if (z > 0.035 && ax < 0.11 && y > 0.84) return 'Virilha / zona genital';
  if (z < -0.035 && y > 0.92) return 'Lombar';
  if (ax >= 0.105) return 'Coxa externa';
  return 'Coxa interna';
}

function decodeBase64GlbBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

function createPedestalTexture(isDark: boolean, maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.fillStyle = isDark ? '#100d0d' : '#efebe3';
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(c, c, 20, c, c, c - 10);
  grad.addColorStop(0, isDark ? '#1d1d1d' : '#ffffff');
  grad.addColorStop(0.7, isDark ? '#141414' : '#dedbd4');
  grad.addColorStop(1, isDark ? '#0a0a0a' : '#c9c4ba');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isDark ? '#9c1f1f' : '#80643b';
  ctx.lineWidth = 3;
  [c - 22, c - 70, c - 140].forEach((r) => {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.strokeStyle = isDark ? 'rgba(242, 41, 41, 0.32)' : 'rgba(128, 100, 59, 0.32)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60);
    ctx.lineTo(c + Math.cos(a) * (c - 22), c + Math.sin(a) * (c - 22));
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export const PainMap3D: React.FC<PainMap3DProps> = ({
  isDark,
  selectedZone,
  onSelectZone,
  onUseInQuote,
}) => {
  const { domain, tZoneName, tZoneDetail } = useLanguage();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [preset, setPreset] = useState<CameraPreset>('reset');
  const [autoSpin, setAutoSpin] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const selectedRef = useRef<string | null>(selectedZone);
  const hoveredRef = useRef<string | null>(hoveredZone);
  const filterRef = useRef<FilterMode>(filterMode);
  const isDarkRef = useRef<boolean>(isDark);
  const autoSpinRef = useRef<boolean>(autoSpin);
  const onSelectRef = useRef(onSelectZone);

  selectedRef.current = selectedZone;
  hoveredRef.current = hoveredZone;
  filterRef.current = filterMode;
  isDarkRef.current = isDark;
  autoSpinRef.current = autoSpin;
  onSelectRef.current = onSelectZone;

  const sceneSyncRef = useRef<((repaintVertices?: boolean) => void) | null>(null);
  const cameraJumpRef = useRef<((p: CameraPreset) => void) | null>(null);
  const autoSpinSyncRef = useRef<((spin: boolean) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const initialBg = isDarkRef.current ? PALETTE.darkBg : PALETTE.lightBg;
    scene.background = new THREE.Color(initialBg);
    scene.fog = new THREE.FogExp2(initialBg, 0.05);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 40);
    camera.position.set(...CAMERA_PRESETS.reset.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.reset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 0.9;
    controls.maxDistance = 4.6;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI * 0.64;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 1.6;
    controls.update();

    // Balanced studio lighting rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x383232, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.45);
    keyLight.position.set(2.4, 3.8, 3.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -1.6;
    keyLight.shadow.camera.right = 1.6;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -0.4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdce6f5, 0.58);
    fillLight.position.set(-2.6, 2.0, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd27a, 0.72);
    rimLight.position.set(-1.6, 2.6, -3.0);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    // Grounded studio pedestal (pivot at y = 0)
    let pedestalTex = createPedestalTexture(isDarkRef.current, maxAniso);
    const pedestalMat = new THREE.MeshStandardMaterial({
      map: pedestalTex,
      roughness: 0.72,
      metalness: 0.14,
    });
    const pedestalGeo = new THREE.CylinderGeometry(0.76, 0.84, 0.08, 48);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = 0.04;
    pedestalMesh.receiveShadow = true;
    scene.add(pedestalMesh);
    geometriesToDispose.push(pedestalGeo);
    materialsToDispose.push(pedestalMat);

    const ringGeo = new THREE.TorusGeometry(0.78, 0.014, 14, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? PALETTE.darkPedestalRing : PALETTE.lightPedestalRing,
      roughness: 0.35,
      metalness: 0.65,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.082;
    scene.add(ringMesh);
    geometriesToDispose.push(ringGeo);
    materialsToDispose.push(ringMat);

    // 360° GLB Mannequin container seated flush on pedestal at y = 0.08
    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.08;
    scene.add(bodyGroup);

    // Selection halo ring around currently inspected zone anchor
    const haloGeo = new THREE.TorusGeometry(0.085, 0.007, 10, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: PALETTE.selectedHex,
      transparent: true,
      opacity: 0.92,
      depthTest: true,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.visible = false;
    bodyGroup.add(haloMesh);
    geometriesToDispose.push(haloGeo);
    materialsToDispose.push(haloMat);

    // State references for the loaded GLB meshes
    let skinMesh: THREE.Mesh | null = null;
    let shortsMesh: THREE.Mesh | null = null;
    let skinVertexMeta: { zoneName: string; paintTier: PaintTier }[] = [];
    const pickableMeshes: THREE.Mesh[] = [];

    const baseColorCache: Record<string, THREE.Color> = {
      [PALETTE.whiteClay]: new THREE.Color(PALETTE.whiteClay),
      [PALETTE.green]: new THREE.Color(PALETTE.green),
      [PALETTE.yellow]: new THREE.Color(PALETTE.yellow),
      [PALETTE.redDeep]: new THREE.Color(PALETTE.redDeep),
    };
    const selectedColorCache: Record<string, THREE.Color> = {
      [PALETTE.whiteClay]: new THREE.Color(PALETTE.whiteClay).lerp(new THREE.Color(PALETTE.selectedHex), 0.32),
      [PALETTE.green]: new THREE.Color(PALETTE.green).lerp(new THREE.Color(PALETTE.selectedHex), 0.32),
      [PALETTE.yellow]: new THREE.Color(PALETTE.yellow).lerp(new THREE.Color(PALETTE.selectedHex), 0.32),
      [PALETTE.redDeep]: new THREE.Color(PALETTE.redDeep).lerp(new THREE.Color(PALETTE.selectedHex), 0.32),
    };
    const hoverColorCache: Record<string, THREE.Color> = {
      [PALETTE.whiteClay]: new THREE.Color(PALETTE.whiteClay).lerp(new THREE.Color(PALETTE.hoverHex), 0.25),
      [PALETTE.green]: new THREE.Color(PALETTE.green).lerp(new THREE.Color(PALETTE.hoverHex), 0.25),
      [PALETTE.yellow]: new THREE.Color(PALETTE.yellow).lerp(new THREE.Color(PALETTE.hoverHex), 0.25),
      [PALETTE.redDeep]: new THREE.Color(PALETTE.redDeep).lerp(new THREE.Color(PALETTE.hoverHex), 0.25),
    };

    const paintSkinVertices = () => {
      if (!skinMesh || skinVertexMeta.length === 0) return;
      const colorAttr = skinMesh.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
      if (!colorAttr) return;

      const curFilter = filterRef.current;
      const curSel = selectedRef.current;
      const curHov = hoveredRef.current;

      for (let i = 0; i < skinVertexMeta.length; i++) {
        const meta = skinVertexMeta[i];
        const baseHex = tierColorForFilter(meta.paintTier, curFilter);
        let c = baseColorCache[baseHex];
        if (curSel && meta.zoneName === curSel) {
          c = selectedColorCache[baseHex];
        } else if (curHov && meta.zoneName === curHov) {
          c = hoverColorCache[baseHex];
        }
        colorAttr.setXYZ(i, c.r, c.g, c.b);
      }
      colorAttr.needsUpdate = true;
    };

    const syncMaterialsAndTheme = (repaintVertices = false) => {
      const dark = isDarkRef.current;
      const bgHex = dark ? PALETTE.darkBg : PALETTE.lightBg;
      scene.background = new THREE.Color(bgHex);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(bgHex);
      }

      ringMat.color.setHex(dark ? PALETTE.darkPedestalRing : PALETTE.lightPedestalRing);

      const newTex = createPedestalTexture(dark, maxAniso);
      pedestalMat.map = newTex;
      pedestalMat.needsUpdate = true;
      pedestalTex.dispose();
      pedestalTex = newTex;

      if (repaintVertices) {
        paintSkinVertices();
      }

      const curSel = selectedRef.current;
      const anchor = curSel ? ZONE_ANCHORS[curSel] : null;
      if (anchor) {
        haloMesh.visible = true;
        haloMesh.position.set(anchor[0], anchor[1], anchor[2]);
        haloMesh.lookAt(camera.position.x, anchor[1] + 0.08, camera.position.z);
      } else {
        haloMesh.visible = false;
      }
    };

    // Mount the parsed GLTF scene (CorpoHumano360: PeleManequim + Shorts)
    const mountGltfMannequin = (root: THREE.Object3D) => {
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const geo = mesh.geometry;
        geometriesToDispose.push(geo);

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          const prevMat = mesh.material;
          prevMat.dispose();
        }

        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
        const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
        const isSkin = posAttr.count > 2000;

        if (isSkin) {
          const colors = new Float32Array(posAttr.count * 3);
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

          skinVertexMeta = new Array(posAttr.count);
          for (let i = 0; i < posAttr.count; i++) {
            skinVertexMeta[i] = classifyAnatomicalPoint(
              posAttr.getX(i),
              posAttr.getY(i),
              posAttr.getZ(i),
              normAttr.getX(i),
              normAttr.getY(i),
              normAttr.getZ(i)
            );
          }

          const skinMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            vertexColors: true,
            roughness: 0.62,
            metalness: 0.05,
            envMapIntensity: 0.85,
          });
          materialsToDispose.push(skinMat);
          mesh.material = skinMat;
          mesh.userData.isSkin = true;
          skinMesh = mesh;
        } else {
          const shortsMat = new THREE.MeshStandardMaterial({
            color: PALETTE.shortsHex,
            roughness: 0.85,
            metalness: 0.0,
            envMapIntensity: 0.65,
          });
          materialsToDispose.push(shortsMat);
          mesh.material = shortsMat;
          mesh.userData.isShorts = true;
          shortsMesh = mesh;
        }

        mesh.castShadow = !isSoftwareGl;
        mesh.receiveShadow = true;
        mesh.layers.enable(1);
        pickableMeshes.push(mesh);
      });

      bodyGroup.add(root);
      paintSkinVertices();
      syncMaterialsAndTheme(false);
      if (!isSoftwareGl) {
        renderer.shadowMap.needsUpdate = true;
      }
    };

    // Camera transition state & on-demand render loop
    let transitionActive = false;
    const camGoalPos = new THREE.Vector3(...CAMERA_PRESETS.reset.pos);
    const camGoalTarget = new THREE.Vector3(...CAMERA_PRESETS.reset.target);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        let needsMore = false;
        if (transitionActive) {
          const factor = isSoftwareGl ? 0.35 : 8.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, camGoalPos.x, factor, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, camGoalPos.y, factor, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, camGoalPos.z, factor, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, camGoalTarget.x, factor, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, camGoalTarget.y, factor, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, camGoalTarget.z, factor, dt);
          if (camera.position.distanceTo(camGoalPos) < 0.015) {
            camera.position.copy(camGoalPos);
            controls.target.copy(camGoalTarget);
            transitionActive = false;
          } else {
            needsMore = true;
          }
        }

        const controlsChanged = controls.update();
        if (controlsChanged || (!isSoftwareGl && autoSpinRef.current)) {
          needsMore = true;
        }

        if (haloMesh.visible) {
          haloMesh.lookAt(camera.position.x, haloMesh.position.y + 0.08, camera.position.z);
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if ((renderDirty || needsMore) && !disposed) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // Load the 360° GLB mannequin (parsed directly from bundled base64 for instant offline readiness)
    const gltfLoader = new GLTFLoader();
    try {
      const glbBuffer = decodeBase64GlbBuffer(MODELO_CORPO_360_BASE64);
      gltfLoader.parse(
        glbBuffer,
        '',
        (gltf) => {
          if (disposed) return;
          mountGltfMannequin(gltf.scene);
          if (!isSoftwareGl) {
            renderer.compile(scene, camera);
          }
          requestRender();
        },
        () => {
          setContextLost(true);
        }
      );
    } catch {
      setContextLost(true);
    }

    sceneSyncRef.current = (repaintVertices = false) => {
      syncMaterialsAndTheme(repaintVertices);
      requestRender();
    };

    cameraJumpRef.current = (p: CameraPreset) => {
      const target = CAMERA_PRESETS[p];
      camGoalPos.set(...target.pos);
      camGoalTarget.set(...target.target);
      transitionActive = true;
      requestRender();
    };

    autoSpinSyncRef.current = (spin: boolean) => {
      controls.autoRotate = !isSoftwareGl && spin;
      requestRender();
    };

    controls.addEventListener('start', () => {
      transitionActive = false;
      if (autoSpinRef.current) {
        controls.autoRotate = false;
        setAutoSpin(false);
      }
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    // Raycasting on layer 1 directly against the 360° GLB meshes (120Hz cached rect)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    const localPoint = new THREE.Vector3();
    let downX = 0;
    let downY = 0;
    let lastHoverTs = 0;
    let lastMoveX = -1;
    let lastMoveY = -1;
    let cachedRect: DOMRect | null = renderer.domElement.getBoundingClientRect();

    const invalidateRect = () => {
      cachedRect = null;
    };

    const getCanvasRect = () => {
      if (!cachedRect) {
        cachedRect = renderer.domElement.getBoundingClientRect();
      }
      return cachedRect;
    };

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = getCanvasRect();
      pointerNdc.x = ((clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    };

    const resolveZoneAtRay = (): string | null => {
      if (pickableMeshes.length === 0) return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickableMeshes, false);
      if (hits.length === 0) return null;

      const hit = hits[0];
      localPoint.copy(hit.point);
      bodyGroup.worldToLocal(localPoint);

      if (hit.object === shortsMesh) {
        return classifyShortsHit(localPoint.x, localPoint.y, localPoint.z);
      }
      const n = hit.face?.normal;
      return classifyAnatomicalPoint(
        localPoint.x,
        localPoint.y,
        localPoint.z,
        n ? n.x : 0,
        n ? n.y : 0,
        n ? n.z : 1
      ).zoneName;
    };

    const onPointerDown = (e: PointerEvent) => {
      invalidateRect();
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTs < 8) return;
      if (Math.abs(e.clientX - lastMoveX) < 2 && Math.abs(e.clientY - lastMoveY) < 2) return;
      lastHoverTs = now;
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;

      updateNdc(e.clientX, e.clientY);
      const hitZone = resolveZoneAtRay();

      renderer.domElement.style.cursor = hitZone ? 'pointer' : 'grab';
      if (hitZone !== hoveredRef.current) {
        hoveredRef.current = hitZone;
        setHoveredZone(hitZone);
        paintSkinVertices();
        requestRender();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 7) return;

      updateNdc(e.clientX, e.clientY);
      const zoneName = resolveZoneAtRay();
      if (zoneName) {
        onSelectRef.current(zoneName);
      }
    };

    window.addEventListener('scroll', invalidateRect, { passive: true });
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      invalidateRect();
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          requestRender();
        }
      }
    });
    resizeObserver.observe(container);

    syncMaterialsAndTheme(false);
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', invalidateRect);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      pedestalTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    sceneSyncRef.current?.(true);
  }, [isDark, selectedZone, filterMode]);

  useEffect(() => {
    autoSpinSyncRef.current?.(autoSpin);
  }, [autoSpin]);

  const activeZoneObj =
    BODY_PAIN_ZONES.find((z) => z.name === (selectedZone || hoveredZone)) || null;
  const inspectedZone = BODY_PAIN_ZONES.find((z) => z.name === selectedZone) || null;
  const activeTierLabel = activeZoneObj ? domain.tierLabels[activeZoneObj.tier] : null;
  const pm = domain.painMap;

  const handlePreset = (p: CameraPreset) => {
    setAutoSpin(false);
    setPreset(p);
    cameraJumpRef.current?.(p);
  };

  return (
    <div className="space-y-5">
      {/* Main 3D Stage */}
      <div
        className="relative rounded-lg overflow-hidden border"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'var(--bg-elevated)',
        }}
      >
        {/* Top Minimal HUD */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--card)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wider uppercase text-sm" style={{ color: 'var(--accent-gold)' }}>
              {pm.hudTitle}
            </span>
            {hoveredZone && (
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                · {tZoneName(hoveredZone)}
              </span>
            )}
          </div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {pm.hudHint}
          </span>
        </div>

        {/* Unobstructed 3D Canvas Container */}
        <div className="relative w-full h-[460px] sm:h-[520px]">
          <div ref={mountRef} className="w-full h-full" />

          {contextLost && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
              style={{ background: 'var(--card)', color: 'var(--text)' }}
            >
              <p className="text-lg font-bold mb-2">{pm.webglUnavailableTitle}</p>
              <p className="text-base max-w-md" style={{ color: 'var(--text-muted)' }}>
                {pm.webglUnavailableBody}
              </p>
            </div>
          )}
        </div>

        {/* Unified Bottom Dock Controls (360° Camera Views & Sensitivity Filter) */}
        <div
          className="flex flex-col gap-3 px-4 py-3 border-t"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--card)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={pm.view360Aria}>
              <span className="text-sm font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>
                {pm.view360Label}
              </span>
              {(
                [
                  ['frente', pm.presets.frente],
                  ['lado_dir', pm.presets.lado_dir],
                  ['costas', pm.presets.costas],
                  ['lado_esq', pm.presets.lado_esq],
                  ['reset', pm.presets.reset],
                ] as [CameraPreset, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePreset(key)}
                  className="px-3 py-1.5 text-sm font-bold rounded border cursor-pointer transition-colors whitespace-nowrap"
                  style={{
                    background: preset === key && !autoSpin ? 'var(--r)' : 'transparent',
                    color: preset === key && !autoSpin ? 'var(--btn-text)' : 'var(--text)',
                    borderColor: preset === key && !autoSpin ? 'var(--r)' : 'var(--border-strong)',
                    minHeight: '38px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAutoSpin((s) => !s)}
              aria-pressed={autoSpin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded border cursor-pointer transition-colors whitespace-nowrap"
              style={{
                background: autoSpin ? 'var(--r)' : 'transparent',
                color: autoSpin ? 'var(--btn-text)' : 'var(--text)',
                borderColor: autoSpin ? 'var(--r)' : 'var(--border-strong)',
                minHeight: '38px',
              }}
            >
              <RotateCw size={15} aria-hidden="true" />
              {autoSpin ? pm.autoSpinOn : pm.autoSpinOff}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={pm.highlightAria}>
            <span className="text-sm font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>
              {pm.highlightLabel}
            </span>
            {(
              [
                ['all', pm.filters.all],
                ['low', pm.filters.low],
                ['moderate', pm.filters.moderate],
                ['sensitive', pm.filters.sensitive],
                ['blank', pm.filters.blank],
              ] as [FilterMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className="px-3 py-1.5 text-sm font-bold rounded border cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  background: filterMode === mode ? 'var(--card-alt)' : 'transparent',
                  color: filterMode === mode ? 'var(--accent-gold)' : 'var(--text)',
                  borderColor: filterMode === mode ? 'var(--accent-gold)' : 'var(--border-strong)',
                  minHeight: '38px',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Legend matching the Schullz Ink Body Pain Map */}
      <div
        className="si-card flex flex-wrap items-center justify-between gap-3 py-3 px-4"
        aria-label={pm.legendAria}
      >
        <div className="flex flex-wrap items-center gap-5 text-base font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-full inline-block border" style={{ background: '#2fbf4f', borderColor: 'var(--border-strong)' }} />
            <span style={{ color: 'var(--pain-low-text)' }}>{domain.tierLabels.low.label}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-full inline-block border" style={{ background: '#e0c020', borderColor: 'var(--border-strong)' }} />
            <span style={{ color: 'var(--pain-mod-text)' }}>{domain.tierLabels.moderate.label}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded-full inline-block border" style={{ background: '#d51f2b', borderColor: 'var(--border-strong)' }} />
            <span style={{ color: 'var(--pain-ext-text)' }}>{domain.tierLabels.high.label}</span>
          </span>
        </div>
      </div>

      {/* Selected Zone Intensity Chart */}
      <div className="si-card space-y-3" id="pain-chart">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 style={{ color: 'var(--accent-gold)' }}>
            {activeZoneObj
              ? `${tZoneName(activeZoneObj.name)} — ${activeTierLabel?.badgeText}`
              : pm.selectPrompt}
          </h3>
          <strong className="text-2xl tabular-nums" style={{ color: 'var(--r)' }}>
            {activeZoneObj ? `${activeZoneObj.score}/100` : '—/100'}
          </strong>
        </div>

        <div
          className="w-full h-5 rounded-full overflow-hidden border"
          style={{ background: 'var(--card-alt)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="w-full h-full rounded-full origin-left transition-transform duration-150 ease-out will-change-transform"
            style={{
              transform: `scaleX(${(activeZoneObj ? activeZoneObj.score : 0) / 100})`,
              background: 'linear-gradient(90deg, #2fbf4f 0%, #e0c020 55%, #e34b36 80%, #d51f2b 100%)',
            }}
          />
        </div>

        <div className="flex justify-between text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          <span>{pm.scale0}</span>
          <span>{pm.scale50}</span>
          <span>{pm.scale100}</span>
        </div>

        <p className="text-base" style={{ color: 'var(--text)' }}>
          {activeZoneObj
            ? `${tZoneDetail(activeZoneObj.name, activeZoneObj.detail)} ${pm.detailDisclaimer}`
            : pm.emptyPrompt}
        </p>

        {inspectedZone && (
          <div className="pt-1">
            <button
              type="button"
              className="si-btn si-btn-sm"
              onClick={() => onUseInQuote(inspectedZone.name)}
            >
              {fmt(pm.useZoneBtn, { zone: tZoneName(inspectedZone.name) })}
            </button>
          </div>
        )}
      </div>

      {/* Accessible Region List / Comparison Bars */}
      <div className="si-card">
        <h3 className="mb-3" style={{ color: 'var(--accent-gold)' }}>
          {pm.allRegionsTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BODY_PAIN_ZONES.map((z) => {
            const isSelected = selectedZone === z.name;
            const meta = TIER_META[z.tier];
            return (
              <button
                key={z.name}
                type="button"
                onClick={() => onSelectZone(z.name)}
                className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded border cursor-pointer transition-colors"
                style={{
                  background: isSelected ? 'var(--card-alt)' : 'transparent',
                  borderColor: isSelected ? 'var(--accent-gold)' : 'var(--border-subtle)',
                  color: 'var(--text)',
                  minHeight: '44px',
                }}
              >
                <span className="w-36 sm:w-40 shrink-0 font-semibold text-base truncate">{tZoneName(z.name)}</span>
                <span
                  className="flex-1 h-3 rounded-sm overflow-hidden"
                  style={{ background: 'var(--card-alt)' }}
                >
                  <span
                    className="block h-full rounded-sm"
                    style={{ width: `${z.score}%`, background: meta.hex }}
                  />
                </span>
                <span className="w-12 text-right font-bold tabular-nums text-sm" style={{ color: meta.cssText }}>
                  {z.score}/100
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
