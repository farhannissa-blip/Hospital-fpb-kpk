import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Eye,
  Home,
  Lock,
  Sparkles,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import {
  HOUSE_TIERS,
  HOUSE_UPGRADE_ITEMS,
  HouseTierId,
  HouseUpgradeItemId,
  SavedPlayerProgress,
} from '../engine/storageEngine';
import { soundEngine } from '../engine/soundEngine';

export type DreamHouseCameraPreset =
  | 'overview'
  | 'pool_garden'
  | 'garage_car'
  | 'sky_aviation'
  | 'orbit';

interface DreamHouse3DProps {
  progress: SavedPlayerProgress;
  onCloseToHospital: () => void;
  onPurchaseItem: (itemId: HouseUpgradeItemId) => {
    success: boolean;
    message: string;
  };
  onUpgradeHouseTier: (tier: HouseTierId) => {
    success: boolean;
    message: string;
  };
}

export const DreamHouse3D: React.FC<DreamHouse3DProps> = ({
  progress,
  onCloseToHospital,
  onPurchaseItem,
  onUpgradeHouseTier,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] =
    useState<DreamHouseCameraPreset>('overview');
  const [activeTab, setActiveTab] = useState<'items' | 'tiers'>('items');
  const [inspectOnly, setInspectOnly] = useState<boolean>(false);
  const [storeNotice, setStoreNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [newlyBuiltId, setNewlyBuiltId] = useState<string | null>(null);
  const [webglFallback, setWebglFallback] = useState<boolean>(false);

  const stateRef = useRef({
    houseTier: progress.houseTier,
    purchasedItems: progress.purchasedItems,
    cameraPreset,
    inspectOnly,
    buildPulseTime: 0,
  });

  useEffect(() => {
    stateRef.current.houseTier = progress.houseTier;
    stateRef.current.purchasedItems = progress.purchasedItems;
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.inspectOnly = inspectOnly;
  }, [progress.houseTier, progress.purchasedItems, cameraPreset, inspectOnly]);

  const triggerBuildAnimation = (id: string) => {
    setNewlyBuiltId(id);
    stateRef.current.buildPulseTime = performance.now();
    window.setTimeout(() => {
      setNewlyBuiltId((prev) => (prev === id ? null : prev));
    }, 2800);
  };

  const handleBuyItemClick = (itemId: HouseUpgradeItemId, focusCam: DreamHouseCameraPreset) => {
    const res = onPurchaseItem(itemId);
    if (res.success) {
      soundEngine.playHouseBuild();
      setCameraPreset(focusCam);
      triggerBuildAnimation(itemId);
      setStoreNotice({ type: 'success', text: res.message });
    } else {
      soundEngine.playWrongAnswer();
      setStoreNotice({ type: 'error', text: res.message });
    }
  };

  const handleUpgradeTierClick = (tier: HouseTierId) => {
    const res = onUpgradeHouseTier(tier);
    if (res.success) {
      soundEngine.playHouseBuild();
      setCameraPreset('overview');
      triggerBuildAnimation(`tier-${tier}`);
      setStoreNotice({ type: 'success', text: res.message });
    } else {
      soundEngine.playWrongAnswer();
      setStoreNotice({ type: 'error', text: res.message });
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8);
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0038);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 260);
    camera.position.set(16, 10, 22);

    const _targetCamPos = new THREE.Vector3(16, 10, 22);
    const _targetLookAt = new THREE.Vector3(0, 2.2, 0);
    const _currentLookAt = new THREE.Vector3(0, 2.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      const probeCanvas = document.createElement('canvas');
      const glProbe =
        probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!glProbe) {
        setWebglFallback(true);
        return;
      }
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    const glCtx = renderer.getContext();
    const debugInfo = glCtx.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? glCtx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(rendererStr);

    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglFallback(true);
    };
    const handleContextRestored = () => {
      setWebglFallback(false);
    };
    renderer.domElement.addEventListener(
      'webglcontextlost',
      handleContextLost,
      false
    );
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
      false
    );

    // Pencahayaan Tropis Cerah untuk Estate Rumah Mewah
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x15803d, 1.15);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    sunLight.position.set(18, 28, 20);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = isSoftwareGl ? 512 : 1024;
    sunLight.shadow.mapSize.height = isSoftwareGl ? 512 : 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 80;
    const d = 22;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Material Bersama
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.85,
    });
    const stoneDeckMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.4,
      metalness: 0.05,
    });
    const warmWoodMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.55,
    });
    const whiteLuxuryWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.08,
    });
    const darkSlateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.4,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.85,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
    });
    const warmWindowGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });

    // Grup Utama Estate Rumah Mewah
    const estateRoot = new THREE.Group();
    scene.add(estateRoot);

    // Pulau Rumput & Fondasi Marmer
    const islandBase = new THREE.Mesh(
      new THREE.BoxGeometry(38, 1.2, 32),
      grassMat
    );
    islandBase.position.set(0, -0.6, 0);
    islandBase.receiveShadow = true;
    estateRoot.add(islandBase);

    const terraceBase = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.35, 16),
      stoneDeckMat
    );
    terraceBase.position.set(0, 0.17, -1);
    terraceBase.receiveShadow = true;
    estateRoot.add(terraceBase);

    // =========================================================================
    // D. 5 TAHAPAN RUMAH MEWAH (Tier 1 -> Tier 5)
    // =========================================================================
    // Tier 1: Rumah Sederhana
    const tier1Group = new THREE.Group();
    estateRoot.add(tier1Group);

    const t1Body = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 2.8, 5.2),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 })
    );
    t1Body.position.set(0, 1.55, -2.5);
    t1Body.castShadow = true;
    tier1Group.add(t1Body);

    const t1Roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.8, 2.1, 4),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 })
    );
    t1Roof.position.set(0, 3.95, -2.5);
    t1Roof.rotation.y = Math.PI / 4;
    t1Roof.castShadow = true;
    tier1Group.add(t1Roof);

    const t1Door = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.9, 0.12),
      warmWoodMat
    );
    t1Door.position.set(0, 1.1, 0.12);
    tier1Group.add(t1Door);

    // Tier 2: Rumah Modern (2 Lantai Kaca & Kayu Minimalis sesuai gambar referensi 2)
    const tier2Group = new THREE.Group();
    estateRoot.add(tier2Group);

    const t2GroundFloor = new THREE.Mesh(
      new THREE.BoxGeometry(9.5, 3.0, 6.4),
      whiteLuxuryWallMat
    );
    t2GroundFloor.position.set(0, 1.65, -2.8);
    t2GroundFloor.castShadow = true;
    tier2Group.add(t2GroundFloor);

    const t2GroundGlass = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 2.5, 0.15),
      warmWindowGlowMat
    );
    t2GroundGlass.position.set(0, 1.6, 0.42);
    tier2Group.add(t2GroundGlass);

    const t2UpperFloor = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 2.8, 7.2),
      darkSlateMat
    );
    t2UpperFloor.position.set(0.4, 4.5, -2.4);
    t2UpperFloor.castShadow = true;
    tier2Group.add(t2UpperFloor);

    const t2WoodCeiling = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 0.28, 7.8),
      warmWoodMat
    );
    t2WoodCeiling.position.set(0.4, 5.95, -2.3);
    tier2Group.add(t2WoodCeiling);

    const t2BalconyGlass = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 1.0, 0.12),
      glassMat
    );
    t2BalconyGlass.position.set(0.4, 3.6, 1.15);
    tier2Group.add(t2BalconyGlass);

    // Pilar Modern Depan
    [-3.6, 0, 3.6].forEach((px) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 3.1, 0.45),
        stoneDeckMat
      );
      col.position.set(px, 1.65, 0.9);
      col.castShadow = true;
      tier2Group.add(col);
    });

    // Tier 3: Rumah Mewah (3 Lantai Putih Bertingkat + Tangga Teras Megah sesuai gambar referensi 1)
    const tier3Group = new THREE.Group();
    estateRoot.add(tier3Group);

    const t3ThirdFloor = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 2.5, 5.4),
      whiteLuxuryWallMat
    );
    t3ThirdFloor.position.set(-0.6, 7.2, -2.8);
    t3ThirdFloor.castShadow = true;
    tier3Group.add(t3ThirdFloor);

    const t3ThirdGlass = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 1.9, 0.15),
      glassMat
    );
    t3ThirdGlass.position.set(-0.6, 7.15, -0.05);
    tier3Group.add(t3ThirdGlass);

    const t3CrownRoof = new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.4, 6.2),
      whiteLuxuryWallMat
    );
    t3CrownRoof.position.set(-0.6, 8.55, -2.7);
    tier3Group.add(t3CrownRoof);

    // Tangga Teras Kayu Lebar
    for (let s = 0; s < 5; s++) {
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.22, 0.6),
        warmWoodMat
      );
      stepMesh.position.set(0, 0.25 + s * 0.18, 1.6 + (4 - s) * 0.45);
      tier3Group.add(stepMesh);
    }

    // Tier 4: Vila Premium (Sayap Kiri & Kanan + Skydeck Pergola)
    const tier4Group = new THREE.Group();
    estateRoot.add(tier4Group);

    const leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 4.4, 5.8),
      whiteLuxuryWallMat
    );
    leftWing.position.set(-6.8, 2.35, -2.2);
    leftWing.castShadow = true;
    tier4Group.add(leftWing);

    const leftWingGlass = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.2, 0.15),
      warmWindowGlowMat
    );
    leftWingGlass.position.set(-6.8, 2.35, 0.72);
    tier4Group.add(leftWingGlass);

    const rightWing = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 4.4, 5.8),
      whiteLuxuryWallMat
    );
    rightWing.position.set(6.8, 2.35, -2.2);
    rightWing.castShadow = true;
    tier4Group.add(rightWing);

    const rightWingGlass = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.2, 0.15),
      warmWindowGlowMat
    );
    rightWingGlass.position.set(6.8, 2.35, 0.72);
    tier4Group.add(rightWingGlass);

    // Tier 5: Mansion Kerajaan (Kubah Emas Megah, Menara Kembar & Pilar Istana)
    const tier5Group = new THREE.Group();
    estateRoot.add(tier5Group);

    const royalCentralDome = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      goldMat
    );
    royalCentralDome.position.set(-0.6, 8.7, -2.7);
    tier5Group.add(royalCentralDome);

    const spirePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.18, 1.6, 12),
      goldMat
    );
    spirePin.position.set(-0.6, 11.4, -2.7);
    tier5Group.add(spirePin);

    [-6.8, 6.8].forEach((tx) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.65, 3.4, 16),
        whiteLuxuryWallMat
      );
      tower.position.set(tx, 6.1, -2.2);
      tier5Group.add(tower);

      const towerDome = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        goldMat
      );
      towerDome.position.set(tx, 7.8, -2.2);
      tier5Group.add(towerDome);
    });

    // =========================================================================
    // E. 8 BARANG TOKO UPGRADE 3D
    // =========================================================================
    // 1. KOLAM RENANG (kolam_renang)
    const poolGroup = new THREE.Group();
    estateRoot.add(poolGroup);

    const poolFrame = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.9, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 })
    );
    poolFrame.position.set(0, 0.45, 5.8);
    poolFrame.castShadow = true;
    poolGroup.add(poolFrame);

    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.1,
    });
    const poolWater = new THREE.Mesh(
      new THREE.BoxGeometry(7.8, 0.2, 4.4),
      poolWaterMat
    );
    poolWater.position.set(0, 0.86, 5.8);
    poolGroup.add(poolWater);

    // Kursi Santai Tepi Kolam
    [-5.2, -3.9].forEach((lx) => {
      const lounger = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.3, 1.9),
        whiteLuxuryWallMat
      );
      lounger.position.set(lx, 0.48, 5.6);
      poolGroup.add(lounger);
    });

    // 2. GARASI (garasi)
    const garageGroup = new THREE.Group();
    estateRoot.add(garageGroup);

    const garageBox = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 3.2, 5.4),
      darkSlateMat
    );
    garageBox.position.set(11.2, 1.6, 1.2);
    garageBox.castShadow = true;
    garageGroup.add(garageBox);

    const garageRoof = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.3, 6.0),
      whiteLuxuryWallMat
    );
    garageRoof.position.set(11.2, 3.3, 1.2);
    garageGroup.add(garageRoof);

    const garageDoorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 2.4, 0.15),
      glassMat
    );
    garageDoorGlass.position.set(11.2, 1.3, 3.92);
    garageGroup.add(garageDoorGlass);

    const driveway = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.08, 8.5),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    driveway.position.set(11.2, 0.05, 8.2);
    garageGroup.add(driveway);

    // 3. MOBIL MEWAH (mobil_mewah)
    const luxuryCarsGroup = new THREE.Group();
    estateRoot.add(luxuryCarsGroup);

    // Supercar Merah Metalik
    const supercarGroup = new THREE.Group();
    supercarGroup.position.set(9.8, 0.38, 6.8);
    luxuryCarsGroup.add(supercarGroup);

    const carBodyMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.18,
      metalness: 0.75,
    });
    const carBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.48, 3.6),
      carBodyMat
    );
    carBase.castShadow = true;
    supercarGroup.add(carBase);

    const carCabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.42, 1.7),
      glassMat
    );
    carCabin.position.set(0, 0.42, -0.2);
    supercarGroup.add(carCabin);

    // Sedan Eksekutif Emas
    const goldCarGroup = new THREE.Group();
    goldCarGroup.position.set(12.4, 0.38, 7.4);
    luxuryCarsGroup.add(goldCarGroup);

    const goldCarBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.52, 3.7),
      goldMat
    );
    goldCarBase.castShadow = true;
    goldCarGroup.add(goldCarBase);

    const goldCarCabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.44, 1.85),
      darkSlateMat
    );
    goldCarCabin.position.set(0, 0.45, -0.1);
    goldCarGroup.add(goldCarCabin);

    // 4. TAMAN TROPIS & AIR MANCUR (taman)
    const gardenGroup = new THREE.Group();
    estateRoot.add(gardenGroup);

    const createPalmTree = (x: number, z: number, scale = 1) => {
      const palm = new THREE.Group();
      palm.position.set(x, 0, z);
      palm.scale.setScalar(scale);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 4.2, 10),
        warmWoodMat
      );
      trunk.position.set(0, 2.1, 0);
      trunk.castShadow = true;
      palm.add(trunk);

      const frondMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.6,
      });
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.12, 1.8),
          frondMat
        );
        const angle = (i * Math.PI) / 3;
        frond.position.set(
          Math.sin(angle) * 0.7,
          4.1,
          Math.cos(angle) * 0.7
        );
        frond.rotation.y = angle;
        frond.rotation.x = 0.35;
        palm.add(frond);
      }
      return palm;
    };

    gardenGroup.add(createPalmTree(-9.5, 4.5, 1.1));
    gardenGroup.add(createPalmTree(-11.2, -1.5, 1.25));
    gardenGroup.add(createPalmTree(6.2, 5.2, 1.0));
    gardenGroup.add(createPalmTree(-5.4, 8.8, 0.95));

    // Air Mancur Taman
    const fountainBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 0.45, 20),
      stoneDeckMat
    );
    fountainBasin.position.set(-7.5, 0.25, 6.8);
    gardenGroup.add(fountainBasin);

    const fountainJet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.55, 1.6, 16),
      poolWaterMat
    );
    fountainJet.position.set(-7.5, 1.1, 6.8);
    gardenGroup.add(fountainJet);

    // 5. DEKORASI & ORNAMEN (dekorasi)
    const decorGroup = new THREE.Group();
    estateRoot.add(decorGroup);

    // Monumen Emas Dokter Spesialis
    const statuePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.85, 1.1, 16),
      whiteLuxuryWallMat
    );
    statuePedestal.position.set(5.6, 0.6, 8.6);
    decorGroup.add(statuePedestal);

    const statueStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      goldMat
    );
    statueStar.position.set(5.6, 1.85, 8.6);
    decorGroup.add(statueStar);

    // Lampu Taman Berkilau Sepanjang Jalur
    [-4.2, -1.8, 1.8, 4.2].forEach((lx) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8),
        darkSlateMat
      );
      post.position.set(lx, 0.45, 9.2);
      decorGroup.add(post);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        warmWindowGlowMat
      );
      orb.position.set(lx, 0.98, 9.2);
      decorGroup.add(orb);
    });

    // 6. RUANG BERMAIN (ruang_bermain)
    const playgroundGroup = new THREE.Group();
    estateRoot.add(playgroundGroup);

    // Trampolin Biru-Kuning
    const trampolineBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.35, 20),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
    );
    trampolineBase.position.set(-12.2, 0.25, 4.2);
    playgroundGroup.add(trampolineBase);

    // Perosotan & Menara Bermain Ceria
    const playTower = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    playTower.position.set(-12.5, 1.1, 0.8);
    playgroundGroup.add(playTower);

    const slideRamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.14, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 })
    );
    slideRamp.position.set(-12.5, 0.85, 2.2);
    slideRamp.rotation.x = 0.52;
    playgroundGroup.add(slideRamp);

    // 7. HELIPAD & HELIKOPTER VIP (helipad)
    const helipadGroup = new THREE.Group();
    estateRoot.add(helipadGroup);

    const helipadPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.5, 0.4, 24),
      darkSlateMat
    );
    helipadPlatform.position.set(-11.8, 0.25, -7.2);
    helipadGroup.add(helipadPlatform);

    const helipadRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.45, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
      })
    );
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(-11.8, 0.47, -7.2);
    helipadGroup.add(helipadRing);

    const vipHeli = new THREE.Group();
    vipHeli.position.set(-11.8, 1.05, -7.2);
    helipadGroup.add(vipHeli);

    const heliCabin = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 14),
      goldMat
    );
    heliCabin.scale.set(1.35, 0.85, 0.85);
    vipHeli.add(heliCabin);

    const heliTail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.24, 2.2, 10),
      whiteLuxuryWallMat
    );
    heliTail.rotation.z = Math.PI / 2;
    heliTail.position.set(-1.6, 0.1, 0);
    vipHeli.add(heliTail);

    const heliRotor = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.05, 0.22),
      darkSlateMat
    );
    heliRotor.position.set(0, 0.92, 0);
    vipHeli.add(heliRotor);

    // 8. PESAWAT PRIBADI / JET EKSEKUTIF (pesawat_pribadi)
    const privateJetGroup = new THREE.Group();
    estateRoot.add(privateJetGroup);

    const runwayStrip = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.12, 4.4),
      darkSlateMat
    );
    runwayStrip.position.set(4.5, 0.06, -10.8);
    privateJetGroup.add(runwayStrip);

    const jetBodyGroup = new THREE.Group();
    jetBodyGroup.position.set(4.5, 1.15, -10.8);
    privateJetGroup.add(jetBodyGroup);

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 6.8, 18),
      whiteLuxuryWallMat
    );
    fuselage.rotation.z = Math.PI / 2;
    fuselage.castShadow = true;
    jetBodyGroup.add(fuselage);

    const noseCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 1.8, 18),
      goldMat
    );
    noseCone.rotation.z = -Math.PI / 2;
    noseCone.position.set(4.3, 0, 0);
    jetBodyGroup.add(noseCone);

    const mainWings = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.12, 7.6),
      whiteLuxuryWallMat
    );
    mainWings.position.set(0.2, -0.1, 0);
    jetBodyGroup.add(mainWings);

    const tailFin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.6, 0.14),
      goldMat
    );
    tailFin.position.set(-2.9, 0.9, 0);
    jetBodyGroup.add(tailFin);

    // =========================================================================
    // F. KUBAH LANGIT CERAH, MATAHARI BERSINAR, AWAN PUTIH, ALAM BUKIT & RUMAH SEKITAR
    // =========================================================================
    const skyDecorGroup = new THREE.Group();
    scene.add(skyDecorGroup);

    // Kubah Langit Gradasi Cerah (Biru Langit Atas -> Biru Muda Cakrawala Hangat)
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0.0, '#0284c7');
    skyGrad.addColorStop(0.38, '#38bdf8');
    skyGrad.addColorStop(0.68, '#bae6fd');
    skyGrad.addColorStop(0.85, '#fef9c3');
    skyGrad.addColorStop(1.0, '#bbf7d0');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 64, 256);
    const skyDomeTex = new THREE.CanvasTexture(skyCanvas);
    skyDomeTex.colorSpace = THREE.SRGBColorSpace;

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(130, 32, 24),
      new THREE.MeshBasicMaterial({
        map: skyDomeTex,
        side: THREE.BackSide,
        fog: false,
      })
    );
    skyDecorGroup.add(skyDome);

    // Lembah Rumput Luas & Jalan Raya Lingkungan di Sekitar Rumah Impian
    const valleyFloorMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.88,
    });
    const valleyFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(118, 118, 1.4, 48),
      valleyFloorMat
    );
    valleyFloor.position.set(0, -0.82, 0);
    valleyFloor.receiveShadow = true;
    estateRoot.add(valleyFloor);

    // Jalan Aspal Lingkungan di Depan Rumah & Menghubungkan Rumah Tetangga
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.75,
    });
    const neighborhoodRoad = new THREE.Mesh(
      new THREE.BoxGeometry(110, 0.12, 4.6),
      roadMat
    );
    neighborhoodRoad.position.set(0, -0.04, 14.5);
    neighborhoodRoad.receiveShadow = true;
    estateRoot.add(neighborhoodRoad);

    const roadLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    for (let rx = -48; rx <= 48; rx += 6) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.14, 0.22),
        roadLineMat
      );
      dash.position.set(rx, -0.02, 14.5);
      estateRoot.add(dash);
    }

    // Pemandangan Alam Bukit Hijau Berlapis & Pegunungan Asri di Sekeliling Rumah
    const hillDarkMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.82,
    });
    const hillMidMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.8,
    });
    const hillLightMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.78,
    });

    const createScenicHill = (
      x: number,
      z: number,
      radiusX: number,
      height: number,
      radiusZ: number,
      mat: THREE.Material
    ) => {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mat
      );
      hill.scale.set(radiusX, height, radiusZ);
      hill.position.set(x, -0.5, z);
      hill.receiveShadow = true;
      estateRoot.add(hill);
    };

    // Barisan Bukit Hijau di Belakang, Kiri, dan Kanan Rumah Impian
    createScenicHill(-28, -28, 19, 11.5, 14, hillMidMat);
    createScenicHill(-8, -32, 22, 14.2, 16, hillDarkMat);
    createScenicHill(16, -30, 20, 12.8, 15, hillMidMat);
    createScenicHill(36, -26, 18, 10.5, 14, hillLightMat);
    createScenicHill(-42, -10, 16, 9.2, 18, hillLightMat);
    createScenicHill(42, -8, 16, 9.6, 18, hillMidMat);
    createScenicHill(-38, 18, 15, 7.5, 14, hillLightMat);
    createScenicHill(38, 20, 15, 7.8, 14, hillLightMat);

    // Pohon Cemara & Pohon Rindang di Lereng Bukit
    const pineFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.7,
    });
    const createHillsideTree = (x: number, y: number, z: number, scale = 1) => {
      const tree = new THREE.Group();
      tree.position.set(x, y, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 1.4, 8),
        warmWoodMat
      );
      trunk.position.y = 0.7;
      tree.add(trunk);

      const cone1 = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 2.2, 10),
        pineFoliageMat
      );
      cone1.position.y = 2.0;
      tree.add(cone1);

      const cone2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.88, 1.8, 10),
        hillMidMat
      );
      cone2.position.y = 3.1;
      tree.add(cone2);

      estateRoot.add(tree);
    };

    [
      [-24, 3.8, -22, 1.15],
      [-18, 5.2, -25, 1.25],
      [-12, 6.8, -26, 1.3],
      [-3, 7.5, -27, 1.2],
      [6, 6.2, -26, 1.25],
      [14, 5.8, -24, 1.15],
      [22, 4.6, -23, 1.2],
      [30, 3.5, -21, 1.1],
      [-33, 2.5, -14, 1.15],
      [33, 2.6, -12, 1.15],
      [-29, 0.2, -16, 1.0],
      [28, 0.2, -15, 1.05],
    ].forEach(([tx, ty, tz, sc]) => createHillsideTree(tx, ty, tz, sc));

    // Pemandangan Rumah-Rumah Tetangga di Sekitar Rumah Impian (Kiri, Kanan & Kaki Bukit)
    const createNeighborHouse = (opts: {
      x: number;
      y: number;
      z: number;
      rotY: number;
      wallHex: number;
      roofHex: number;
      scale?: number;
      twoStory?: boolean;
    }) => {
      const nh = new THREE.Group();
      nh.position.set(opts.x, opts.y, opts.z);
      nh.rotation.y = opts.rotY;
      if (opts.scale) nh.scale.setScalar(opts.scale);

      const wallMat = new THREE.MeshStandardMaterial({
        color: opts.wallHex,
        roughness: 0.45,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: opts.roofHex,
        roughness: 0.5,
      });

      // Halaman Rumput & Pagar Putih Rumah Tetangga
      const yardPad = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.18, 6.4),
        stoneDeckMat
      );
      yardPad.position.set(0, 0.09, 0);
      nh.add(yardPad);

      const hHeight = opts.twoStory ? 3.8 : 2.5;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(4.8, hHeight, 4.0),
        wallMat
      );
      body.position.set(0, hHeight / 2 + 0.15, -0.3);
      body.castShadow = true;
      nh.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.9, 1.9, 4),
        roofMat
      );
      roof.position.set(0, hHeight + 1.05, -0.3);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      nh.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.6, 0.12),
        warmWoodMat
      );
      door.position.set(0, 0.95, 1.72);
      nh.add(door);

      [-1.35, 1.35].forEach((wx) => {
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.85, 0.12),
          warmWindowGlowMat
        );
        win.position.set(wx, 1.45, 1.72);
        nh.add(win);

        if (opts.twoStory) {
          const winTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.8, 0.12),
            warmWindowGlowMat
          );
          winTop.position.set(wx, 2.85, 1.72);
          nh.add(winTop);
        }
      });

      // Pohon Kecil di Halaman Rumah Tetangga
      const miniTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 1.1, 8),
        warmWoodMat
      );
      miniTrunk.position.set(2.6, 0.65, 1.8);
      nh.add(miniTrunk);

      const miniCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 12, 12),
        hillLightMat
      );
      miniCrown.position.set(2.6, 1.45, 1.8);
      nh.add(miniCrown);

      estateRoot.add(nh);
    };

    // 6 Rumah Tetangga di Kiri, Kanan, dan Lereng Bukit Sekitar Rumah Impian
    createNeighborHouse({
      x: -24.5,
      y: 0,
      z: 3.5,
      rotY: 0.18,
      wallHex: 0xfef3c7,
      roofHex: 0xea580c,
      scale: 0.95,
      twoStory: true,
    });
    createNeighborHouse({
      x: -25.8,
      y: 0,
      z: -6.5,
      rotY: 0.35,
      wallHex: 0xe0f2fe,
      roofHex: 0x0284c7,
      scale: 0.9,
    });
    createNeighborHouse({
      x: 24.5,
      y: 0,
      z: 3.8,
      rotY: -0.18,
      wallHex: 0xfce7f3,
      roofHex: 0xdb2777,
      scale: 0.95,
      twoStory: true,
    });
    createNeighborHouse({
      x: 26.0,
      y: 0,
      z: -6.2,
      rotY: -0.32,
      wallHex: 0xdcfce7,
      roofHex: 0x15803d,
      scale: 0.9,
    });
    createNeighborHouse({
      x: -16.5,
      y: 1.4,
      z: -17.5,
      rotY: 0.1,
      wallHex: 0xffffff,
      roofHex: 0xb91c1c,
      scale: 0.82,
    });
    createNeighborHouse({
      x: 17.5,
      y: 1.2,
      z: -17.8,
      rotY: -0.1,
      wallHex: 0xffedd5,
      roofHex: 0x4338ca,
      scale: 0.82,
      twoStory: true,
    });

    // Matahari 3D Bersinar Cerah dengan Sinar Berputar Tepat di Atas Bukit Belakang Rumah
    const sunGroup = new THREE.Group();
    sunGroup.position.set(10.5, 13.2, -33.0);
    skyDecorGroup.add(sunGroup);

    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
    );
    sunGroup.add(sunSphere);

    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(4.0, 28, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.38,
        fog: false,
      })
    );
    sunGroup.add(sunHalo);

    const sunRaysGroup = new THREE.Group();
    const sunRayMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.45,
      fog: false,
    });
    for (let r = 0; r < 8; r++) {
      const ray = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 10.5, 0.12),
        sunRayMat
      );
      ray.rotation.z = (r * Math.PI) / 8;
      sunRaysGroup.add(ray);
    }
    sunGroup.add(sunRaysGroup);

    // 8 Awan Putih 3D Empuk yang Berarak di Langit Atas Bukit & Rumah Impian
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      emissive: 0xf0f9ff,
      emissiveIntensity: 0.35,
      fog: false,
    });
    const houseClouds: {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      speed: number;
    }[] = [];
    [
      { x: -22, y: 11.5, z: -24, scale: 1.35, speed: 0.35 },
      { x: -10, y: 13.2, z: -27, scale: 1.55, speed: 0.28 },
      { x: 1, y: 11.8, z: -25, scale: 1.3, speed: 0.38 },
      { x: 17, y: 12.6, z: -26, scale: 1.4, speed: 0.31 },
      { x: 28, y: 10.8, z: -22, scale: 1.25, speed: 0.36 },
      { x: -28, y: 12.2, z: -8, scale: 1.2, speed: 0.29 },
      { x: 29, y: 12.0, z: -6, scale: 1.2, speed: 0.33 },
      { x: -4, y: 14.2, z: 22, scale: 1.35, speed: 0.27 },
    ].forEach((cfg) => {
      const cg = new THREE.Group();
      cg.position.set(cfg.x, cfg.y, cfg.z);
      cg.scale.setScalar(cfg.scale);
      const puff1 = new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 16, 16),
        cloudMat
      );
      const puff2 = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 16),
        cloudMat
      );
      puff2.position.set(1.35, -0.18, 0.15);
      const puff3 = new THREE.Mesh(
        new THREE.SphereGeometry(1.22, 16, 16),
        cloudMat
      );
      puff3.position.set(-1.3, -0.22, -0.1);
      const puff4 = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 14, 14),
        cloudMat
      );
      puff4.position.set(0.5, 0.55, -0.2);
      cg.add(puff1, puff2, puff3, puff4);
      skyDecorGroup.add(cg);
      houseClouds.push({
        group: cg,
        baseX: cfg.x,
        baseY: cfg.y,
        speed: cfg.speed,
      });
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Interaksi Geser Layar (Touch / Mouse Drag) untuk Memutar Rumah 3D
    let isDraggingScene = false;
    let prevPointerX = 0;
    let userYawOffset = 0;

    const handlePointerDown = (ev: PointerEvent) => {
      const targetEl = ev.target as HTMLElement | null;
      if (
        targetEl &&
        targetEl.closest('button, a, input, select, textarea, [data-ui-panel="true"]')
      ) {
        return;
      }
      isDraggingScene = true;
      prevPointerX = ev.clientX;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDraggingScene) return;
      const dx = ev.clientX - prevPointerX;
      prevPointerX = ev.clientX;
      userYawOffset += dx * 0.0075;
    };

    const handlePointerUp = () => {
      isDraggingScene = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync
        ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
        : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const {
        houseTier: tier,
        purchasedItems: items,
        cameraPreset: camMode,
        inspectOnly: isInspectMode,
      } = stateRef.current;

      // Visibilitas 5 Tahapan Rumah Mewah
      tier1Group.visible = tier === 1;
      tier2Group.visible = tier >= 2;
      tier3Group.visible = tier >= 3;
      tier4Group.visible = tier >= 4;
      tier5Group.visible = tier >= 5;

      // Visibilitas 8 Barang Toko Upgrade
      poolGroup.visible = items.includes('kolam_renang');
      garageGroup.visible = items.includes('garasi');
      luxuryCarsGroup.visible = items.includes('mobil_mewah');
      gardenGroup.visible = items.includes('taman');
      decorGroup.visible = items.includes('dekorasi');
      playgroundGroup.visible = items.includes('ruang_bermain');
      helipadGroup.visible = items.includes('helipad');
      privateJetGroup.visible = items.includes('pesawat_pribadi');

      // Animasi Hidup pada Estate 3D, Matahari Bersinar & Awan Berarak
      poolWater.position.y = 0.85 + Math.sin(elapsed * 3.2) * 0.03;
      fountainJet.scale.y = 0.9 + Math.sin(elapsed * 6) * 0.15;
      statueStar.rotation.y = elapsed * 1.4;
      heliRotor.rotation.y = elapsed * 11;
      jetBodyGroup.position.y = 1.15 + Math.sin(elapsed * 2.2) * 0.06;
      sunHalo.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.07);
      sunRaysGroup.rotation.z = elapsed * 0.24;
      houseClouds.forEach((c, idx) => {
        c.group.position.x =
          c.baseX + Math.sin(elapsed * c.speed + idx) * 2.6;
        c.group.position.y =
          c.baseY + Math.cos(elapsed * (c.speed * 0.8) + idx) * 0.22;
      });

      // Rotasi Halus dari Interaksi Geser Jari/Mouse Pemain
      estateRoot.rotation.y = THREE.MathUtils.lerp(
        estateRoot.rotation.y,
        userYawOffset,
        1 - Math.exp(-6 * dt)
      );

      // Penyesuaian Kamera Responsif agar Rumah 3D, Langit, Awan, Matahari, Bukit & Rumah Sekitar Tampak Jelas di Layar HP
      const isPortraitMobile = container.clientWidth < 768;
      const distScale = isPortraitMobile ? 1.26 : 1.04;
      // Saat panel toko di bawah terbuka (!isInspectMode), turunkan titik pandang Y kamera sehingga rumah 3D & pemandangan bukit/langit terangkat ke area atas layar
      const yFramingOffset = isInspectMode
        ? 0
        : isPortraitMobile
          ? -3.2
          : -1.9;

      if (camMode === 'orbit') {
        const angle = elapsed * 0.38;
        _targetCamPos.set(
          Math.sin(angle) * 24 * distScale,
          isPortraitMobile ? 9.6 : 8.8,
          Math.cos(angle) * 24 * distScale
        );
        _targetLookAt.set(0, 2.8 + yFramingOffset, 0);
      } else if (camMode === 'pool_garden') {
        _targetCamPos.set(
          -8.5 * distScale,
          isPortraitMobile ? 6.8 : 5.8,
          17.2 * distScale
        );
        _targetLookAt.set(-2.2, 1.8 + yFramingOffset * 0.78, 3.8);
      } else if (camMode === 'garage_car') {
        _targetCamPos.set(
          16.8 * distScale,
          isPortraitMobile ? 6.6 : 5.4,
          16.5 * distScale
        );
        _targetLookAt.set(9.8, 1.8 + yFramingOffset * 0.78, 3.8);
      } else if (camMode === 'sky_aviation') {
        _targetCamPos.set(
          -6.5 * distScale,
          isPortraitMobile ? 12.5 : 11.2,
          -21.5 * distScale
        );
        _targetLookAt.set(-1.8, 2.2 + yFramingOffset * 0.85, -8.2);
      } else {
        // Sudut Utama Panorama Rumah 3D: Menampilkan Rumah Impian + Rumah Tetangga + Alam Bukit + Langit, Awan & Matahari
        _targetCamPos.set(
          (12.2 + Math.sin(elapsed * 0.28) * 2.4) * distScale,
          isPortraitMobile ? 8.8 : 7.8,
          (22.0 + Math.cos(elapsed * 0.28) * 1.2) * distScale
        );
        _targetLookAt.set(0, 3.2 + yFramingOffset, -2.5);
      }

      const damp = 1 - Math.exp(-3.8 * dt);
      camera.position.lerp(_targetCamPos, damp);
      _currentLookAt.lerp(_targetLookAt, damp);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      skyDomeTex.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentTierMeta =
    HOUSE_TIERS.find((t) => t.tier === progress.houseTier) || HOUSE_TIERS[0];

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col justify-between text-slate-900 select-none">
      {/* Canvas 3D My Dream House */}
      <div
        ref={mountRef}
        className={`fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none z-0 ${
          webglFallback ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Fallback 2D My Dream House jika WebGL tidak didukung */}
      {webglFallback && (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0 bg-gradient-to-b from-sky-900 via-sky-800 to-emerald-950 flex flex-col items-center justify-start pt-20 px-4 select-none">
          <div className="w-full max-w-3xl bg-slate-900/90 border-2 border-amber-400/50 rounded-2xl p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="text-sm font-extrabold text-amber-300">
                🏡 {currentTierMeta.name.toUpperCase()} (MODE VISUAL 2D RINGAN)
              </div>
              <span className="text-xs font-mono text-sky-300">
                Tahap {progress.houseTier}/5 · {progress.purchasedItems.length}/8 Upgrade
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {HOUSE_UPGRADE_ITEMS.map((item) => {
                const owned = progress.purchasedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-xl border text-xs ${
                      owned
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div>{owned ? '✅ Terpasang' : '🔒 Belum Dibeli'}</div>
                    <div className="truncate mt-0.5 text-white">
                      {item.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BAR ATAS RINGKAS (Satu Baris Tipis Agar Area Rumah 3D di Layar HP Tetap Luas) */}
      <div data-ui-panel="true" className="relative z-20 shrink-0">
        <header className="flex items-center justify-between gap-1.5 px-2.5 sm:px-5 py-1.5 sm:py-2 bg-slate-950/95 border-b border-slate-800 text-white shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onCloseToHospital();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs font-extrabold text-white flex items-center gap-1 cursor-pointer shrink-0 border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Kembali ke RS 3D</span>
              <span className="sm:hidden">RS 3D</span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <Home className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <div className="text-[11px] sm:text-xs font-extrabold tracking-tight truncate">
                  {currentTierMeta.name.toUpperCase()} (TAHAP {progress.houseTier}/5)
                </div>
                <div className="text-[10px] text-amber-300 font-semibold truncate hidden sm:block">
                  Dokter {progress.playerName} · {progress.purchasedItems.length}/8 Barang Terpasang
                </div>
              </div>
            </div>
          </div>

          {/* Saldo Skor, Koin & Tombol Sembunyikan/Buka Toko */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden md:flex px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 items-center gap-1 font-mono text-xs font-extrabold">
              <Award className="w-3.5 h-3.5 text-sky-400" />
              <span>{progress.totalScore}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 flex items-center gap-1 font-mono text-[11px] sm:text-xs font-extrabold shadow">
              <Coins className="w-3.5 h-3.5" />
              <span>{progress.coins} Koin</span>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setInspectOnly((prev) => !prev);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                inspectOnly
                  ? 'bg-emerald-400 text-slate-950 shadow-md'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{inspectOnly ? 'Buka Toko' : 'Layar 3D Penuh'}</span>
            </button>
          </div>
        </header>

        {/* Bar Sudut Kamera Horizontal Ringkas (Bisa Digeser Kiri-Kanan di HP) */}
        <div className="px-2 sm:px-5 py-1 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-300 flex items-center gap-1 shrink-0 pr-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Kamera 3D:</span>
          </span>
          {(
            [
              { id: 'overview', label: '🏠 Rumah Utama' },
              { id: 'pool_garden', label: '🏊 Kolam & Taman' },
              { id: 'garage_car', label: '🚗 Garasi & Mobil' },
              { id: 'sky_aviation', label: '🚁 Helipad & Jet' },
              { id: 'orbit', label: '🔄 Putar 360°' },
            ] as const
          ).map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setCameraPreset(cam.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer shrink-0 ${
                cameraPreset === cam.id
                  ? 'bg-sky-400 text-slate-950 shadow'
                  : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>
      </div>

      {/* AREA TENGAH TERBUKA LEBAR: Menampilkan Animasi Rumah 3D Tanpa Terhalang Kotak */}
      <div className="relative z-10 flex-1 pointer-events-none flex flex-col justify-between px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/75 border border-slate-700/80 text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              🏡 {currentTierMeta.name} · {progress.purchasedItems.length}/{HOUSE_UPGRADE_ITEMS.length} Barang
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-700/70 text-sky-200 text-[10px] sm:text-[11px] font-semibold">
            👆 Geser area 3D untuk memutar rumah
          </div>
        </div>

        {newlyBuiltId && (
          <div className="self-center px-3.5 py-1.5 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xl animate-row-pop">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Pembangunan 3D Selesai! Objek baru telah muncul di Rumah Impian Anda!</span>
          </div>
        )}
      </div>

      {/* PANEL TOKO UPGRADE RINGKAS DI BAGIAN PALING BAWAH LAYAR (Tidak Menutupi Rumah 3D di Atasnya) */}
      {!inspectOnly && (
        <section
          data-ui-panel="true"
          className="relative z-20 shrink-0 w-full max-w-5xl mx-auto px-2 sm:px-4 pb-2 pointer-events-auto"
        >
          <div className="bg-white/95 backdrop-blur-md border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header Tab Toko Ringkas */}
            <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('items');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                    activeTab === 'items'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Beli Barang ({progress.purchasedItems.length}/8)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('tiers');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                    activeTab === 'tiers'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Tingkat Rumah ({progress.houseTier}/5)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] font-mono text-amber-300">
                  100 Skor = 10 Koin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setInspectOnly(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] sm:text-[11px] font-bold text-sky-300 cursor-pointer border border-slate-700"
                >
                  🔽 Sembunyikan Kotak
                </button>
              </div>
            </div>

            <div className="p-2 sm:p-3">
              {/* Notifikasi Pembelian / Peringatan Koin */}
              {storeNotice && (
                <div
                  className={`mb-2 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 ${
                    storeNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {storeNotice.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span className="truncate">{storeNotice.text}</span>
                </div>
              )}

              {activeTab === 'items' ? (
                /* Daftar 8 Barang Toko Upgrade (Tinggi Maksimal Dibatasi Agar Rumah 3D di Atas Terlihat Jelas di HP) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 max-h-[22vh] sm:max-h-[24vh] overflow-y-auto pr-1">
                  {HOUSE_UPGRADE_ITEMS.map((item) => {
                    const isOwned = progress.purchasedItems.includes(item.id);
                    const canAfford = progress.coins >= item.coinCost;

                    return (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                          isOwned
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono bg-amber-100 text-amber-900 shrink-0">
                              {item.coinCost} K
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setCameraPreset(item.cameraFocus);
                            }}
                            className="text-[10px] font-bold text-sky-700 hover:underline cursor-pointer shrink-0"
                          >
                            Lihat 3D
                          </button>

                          {isOwned ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Milikmu</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleBuyItemClick(item.id, item.cameraFocus)
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer ${
                                canAfford
                                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                              }`}
                            >
                              {!canAfford && <Lock className="w-2.5 h-2.5" />}
                              <span>{canAfford ? 'Beli' : 'Kurang'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Daftar 5 Tahapan Rumah Mewah Ringkas */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 max-h-[22vh] sm:max-h-[24vh] overflow-y-auto pr-1">
                  {HOUSE_TIERS.map((tierObj) => {
                    const isUnlocked = progress.houseTier >= tierObj.tier;
                    const isCurrent = progress.houseTier === tierObj.tier;
                    const canAfford = progress.coins >= tierObj.coinCost;

                    return (
                      <div
                        key={tierObj.tier}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                          isCurrent
                            ? 'bg-amber-50 border-amber-400'
                            : isUnlocked
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <img
                            src={tierObj.previewImage}
                            alt={tierObj.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-9 rounded-lg object-cover border border-slate-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-extrabold text-slate-900 truncate">
                                {tierObj.name}
                              </span>
                              {tierObj.coinCost > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold bg-amber-100 text-amber-900 shrink-0">
                                  {tierObj.coinCost} Koin
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 truncate">
                              {tierObj.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isCurrent ? (
                            <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                              Aktif
                            </span>
                          ) : isUnlocked ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold">
                              Selesai
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpgradeTierClick(tierObj.tier)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                                canAfford
                                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                              }`}
                            >
                              {!canAfford && <Lock className="w-3 h-3" />}
                              <span>
                                {canAfford
                                  ? `Bangun (${tierObj.coinCost}K)`
                                  : 'Terkunci'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
