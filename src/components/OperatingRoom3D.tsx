import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MathCategory } from '../engine/mathEngine';
import { PatientCharacterProfile } from '../engine/patientCatalog';
import { soundEngine } from '../engine/soundEngine';

export type CameraPreset =
  | 'overview'
  | 'monitor'
  | 'table'
  | 'exterior'
  | 'doctor';

export type SurgeryFlowStage =
  | 'EXTERIOR_IDLE'
  | 'AMBULANCE_ARRIVING'
  | 'PATIENT_UNLOADING'
  | 'ENTERING_HOSPITAL'
  | 'DOCTOR_PREP'
  | 'MATH_SURGERY'
  | 'SURGERY_SUCCESS'
  | 'SURGERY_FAILED';

export type DoctorAnimationMode =
  | 'auto'
  | 'walk'
  | 'run'
  | 'prep'
  | 'celebrate'
  | 'shocked';

interface OperatingRoom3DProps {
  lives: number;
  status: 'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED';
  flowStage: SurgeryFlowStage;
  category: MathCategory;
  cameraPreset: CameraPreset;
  numberA?: number;
  numberB?: number;
  patient: PatientCharacterProfile;
  surgeryProgress: number; // 0 .. 100
  doctorReaction: 'normal' | 'happy' | 'shocked' | 'celebrate';
  doctorAnimOverride?: DoctorAnimationMode;
  onMonitorInteract?: () => void;
  forceFallback2D?: boolean;
}

// Pre-allocated math helpers outside render loop (Zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.5, 0);

interface CharacterRig {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  mouthMesh: THREE.Mesh;
  maskMesh?: THREE.Mesh;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  toolMesh?: THREE.Object3D;
}

export type PatientAnimationState =
  | 'wincing'
  | 'relaxed'
  | 'smiling'
  | 'critical';

export interface PatientRig {
  patientGroup: THREE.Group;
  upperBodyPivot: THREE.Group;
  torsoMesh: THREE.Mesh;
  headGroup: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  leftCheek: THREE.Mesh;
  rightCheek: THREE.Mesh;
  cheekMat: THREE.MeshStandardMaterial;
  mouthMesh: THREE.Mesh;
  waveArmPivot: THREE.Group;
  bellyCompressMesh: THREE.Mesh;
  currentState: PatientAnimationState;
}

/**
 * Menentukan state animasi pasien ('wincing' | 'relaxed' | 'smiling' | 'critical')
 * berdasarkan status permainan, sisa nyawa, dan progres penyelesaian tabel FPB/KPK.
 */
export function resolvePatientAnimationState(params: {
  status: 'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED';
  lives: number;
  surgeryProgress: number;
  doctorReaction: 'normal' | 'happy' | 'shocked' | 'celebrate';
  stateOverride?: PatientAnimationState;
}): PatientAnimationState {
  if (params.stateOverride) {
    return params.stateOverride;
  }
  if (params.status === 'FAILED' || params.lives <= 0) {
    return 'critical';
  }
  if (params.status === 'SUCCESS') {
    return 'smiling';
  }
  if (
    params.doctorReaction === 'shocked' ||
    params.lives === 1 ||
    params.surgeryProgress < 50
  ) {
    return 'wincing';
  }
  return 'relaxed';
}

/**
 * Mengatur animasi 3D karakter pasien berdasarkan state:
 * - 'wincing'  : Meringis / cemas / memegang pipi saat persiapan awal atau saat terjadi kesalahan
 * - 'relaxed'  : Tenang & bernapas stabil saat baris tabel matematika FPB/KPK mulai terpecahkan (>= 50%)
 * - 'smiling'  : Bangun duduk, tersenyum lebar, pipi merona sehat & melambai setelah operasi berhasil
 * - 'critical' : Lemas terkulai, wajah pucat, napas lemah & mata menyipit saat nyawa habis (0)
 */
export function updatePatientAnimation(
  rig: PatientRig,
  params: {
    status: 'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED';
    lives: number;
    surgeryProgress: number;
    initialExpression: PatientCharacterProfile['initialExpression'];
    doctorReaction: 'normal' | 'happy' | 'shocked' | 'celebrate';
    elapsed: number;
    dt: number;
    stateOverride?: PatientAnimationState;
  }
): PatientAnimationState {
  const {
    lives,
    surgeryProgress,
    initialExpression,
    doctorReaction,
    elapsed,
    dt,
  } = params;

  const animState = resolvePatientAnimationState(params);
  rig.currentState = animState;

  // 1. STATE: 'smiling' — Operasi Berhasil (Bangun duduk, tersenyum bahagia & melambai)
  if (animState === 'smiling') {
    rig.upperBodyPivot.rotation.z = THREE.MathUtils.lerp(
      rig.upperBodyPivot.rotation.z,
      1.08,
      dt * 4.5
    );
    // Napas dada tenang dan lega
    const calmBreath = 1 + Math.sin(elapsed * 2.2) * 0.035;
    rig.torsoMesh.scale.set(1, calmBreath, 1);

    // Kepala mengangguk bahagia & menoleh ramah
    rig.headGroup.rotation.x = THREE.MathUtils.lerp(
      rig.headGroup.rotation.x,
      0,
      dt * 5
    );
    rig.headGroup.rotation.y = Math.sin(elapsed * 2.4) * 0.2;
    rig.headGroup.rotation.z = Math.cos(elapsed * 1.8) * 0.05;

    // Mata terbuka cerah & berkedip sehat
    const blink = Math.sin(elapsed * 3.5) > 0.96 ? 0.18 : 1.12;
    rig.leftEye.scale.set(1, blink, 1);
    rig.rightEye.scale.set(1, blink, 1);

    // Alis terangkat ramah & ceria
    rig.leftBrow.position.y = THREE.MathUtils.lerp(
      rig.leftBrow.position.y,
      0.222,
      dt * 6
    );
    rig.rightBrow.position.y = THREE.MathUtils.lerp(
      rig.rightBrow.position.y,
      0.222,
      dt * 6
    );
    rig.leftBrow.rotation.x = THREE.MathUtils.lerp(
      rig.leftBrow.rotation.x,
      -0.14,
      dt * 6
    );
    rig.rightBrow.rotation.x = THREE.MathUtils.lerp(
      rig.rightBrow.rotation.x,
      0.14,
      dt * 6
    );

    // Pipi merona cerah sehat
    rig.cheekMat.color.setHex(0xf43f5e);
    rig.cheekMat.opacity = 0.65;
    rig.leftCheek.scale.setScalar(1.15);
    rig.rightCheek.scale.setScalar(1.15);

    // Mulut tersenyum lebar
    rig.mouthMesh.rotation.z = Math.PI / 2;
    rig.mouthMesh.scale.set(1.2, 1.2, 1);

    // Lengan melambai gembira ke arah pemain
    rig.waveArmPivot.rotation.x = -2.15 + Math.sin(elapsed * 6.5) * 0.38;
    rig.waveArmPivot.rotation.z = 0;
    return animState;
  }

  // 2. STATE: 'critical' — Nyawa Habis / Operasi Gagal (Lemas terkulai & pucat)
  if (animState === 'critical') {
    // Tubuh berbaring lemas
    rig.upperBodyPivot.rotation.z = THREE.MathUtils.lerp(
      rig.upperBodyPivot.rotation.z,
      0,
      dt * 5
    );
    // Napas sangat lemah dan lambat
    const weakBreath = 1 + Math.sin(elapsed * 1.1) * 0.012;
    rig.torsoMesh.scale.set(1, weakBreath, 1);

    // Kepala miring terkulai lemas ke samping
    rig.headGroup.rotation.x = THREE.MathUtils.lerp(
      rig.headGroup.rotation.x,
      0.38,
      dt * 3.5
    );
    rig.headGroup.rotation.y = THREE.MathUtils.lerp(
      rig.headGroup.rotation.y,
      -0.18,
      dt * 3.5
    );
    rig.headGroup.rotation.z = THREE.MathUtils.lerp(
      rig.headGroup.rotation.z,
      -0.08,
      dt * 3.5
    );

    // Mata terpejam / menyipit lemas
    rig.leftEye.scale.set(1, 0.2, 1);
    rig.rightEye.scale.set(1, 0.2, 1);

    // Alis turun sedih / lemas
    rig.leftBrow.position.y = THREE.MathUtils.lerp(
      rig.leftBrow.position.y,
      0.204,
      dt * 5
    );
    rig.rightBrow.position.y = THREE.MathUtils.lerp(
      rig.rightBrow.position.y,
      0.204,
      dt * 5
    );
    rig.leftBrow.rotation.x = THREE.MathUtils.lerp(
      rig.leftBrow.rotation.x,
      0.3,
      dt * 5
    );
    rig.rightBrow.rotation.x = THREE.MathUtils.lerp(
      rig.rightBrow.rotation.x,
      -0.3,
      dt * 5
    );

    // Pipi pucat kebiruan
    rig.cheekMat.color.setHex(0x94a3b8);
    rig.cheekMat.opacity = 0.35;
    rig.leftCheek.scale.setScalar(0.85);
    rig.rightCheek.scale.setScalar(0.85);

    // Mulut melengkung turun lemas
    rig.mouthMesh.rotation.z = -Math.PI / 2;
    rig.mouthMesh.scale.set(0.85, 0.72, 1);

    // Lengan terkulai lemas di samping tubuh
    rig.waveArmPivot.rotation.x = THREE.MathUtils.lerp(
      rig.waveArmPivot.rotation.x,
      0.16,
      dt * 4
    );
    rig.waveArmPivot.rotation.z = THREE.MathUtils.lerp(
      rig.waveArmPivot.rotation.z,
      0,
      dt * 4
    );
    return animState;
  }

  // 3. STATE: 'wincing' — Persiapan awal operasi (< 50% progres) atau saat baris salah / nyawa sisa 1
  if (animState === 'wincing') {
    const isAcuteShock = doctorReaction === 'shocked' || lives === 1;
    const calmRatio = THREE.MathUtils.clamp(surgeryProgress / 100, 0, 1);

    rig.upperBodyPivot.rotation.z = THREE.MathUtils.lerp(
      rig.upperBodyPivot.rotation.z,
      isAcuteShock ? 0.04 : 0,
      dt * 6
    );

    // Frekuensi napas lebih cepat saat meringis/tegang
    const breathFreq = isAcuteShock
      ? 7.5
      : THREE.MathUtils.lerp(5.0, 3.4, calmRatio);
    const breathAmp = isAcuteShock
      ? 0.055
      : THREE.MathUtils.lerp(0.048, 0.034, calmRatio);
    rig.torsoMesh.scale.set(1, 1 + Math.sin(elapsed * breathFreq) * breathAmp, 1);

    // Gerakan kepala meringis menahan keluhan
    const winceSpeed = isAcuteShock ? 9.5 : 3.8;
    const winceWave = Math.sin(elapsed * winceSpeed);
    const headShakeAmp = isAcuteShock ? 0.14 : 0.095 * (1 - calmRatio * 0.5);
    rig.headGroup.rotation.x = winceWave * headShakeAmp;
    rig.headGroup.rotation.y =
      Math.cos(elapsed * (isAcuteShock ? 6.0 : 2.3)) * 0.07;
    rig.headGroup.rotation.z = 0;

    // Mata menyipit meringis
    const eyeSquint = isAcuteShock
      ? 0.36
      : initialExpression === 'lemas'
        ? 0.42
        : 0.52 + Math.abs(winceWave) * 0.22;
    rig.leftEye.scale.set(1.08, eyeSquint, 1);
    rig.rightEye.scale.set(1.08, eyeSquint, 1);

    // Alis berkerut meringis
    const browTilt = isAcuteShock ? 0.35 : 0.26;
    rig.leftBrow.position.y = 0.199;
    rig.rightBrow.position.y = 0.199;
    rig.leftBrow.rotation.x = -browTilt;
    rig.rightBrow.rotation.x = browTilt;

    // Pipi merona tegang / demam ringan
    rig.cheekMat.color.setHex(0xfb7185);
    rig.cheekMat.opacity = isAcuteShock ? 0.58 : 0.42;
    rig.leftCheek.scale.setScalar(1.0);
    rig.rightCheek.scale.setScalar(1.0);

    // Mulut meringis bergetar halus
    rig.mouthMesh.rotation.z = -Math.PI / 2;
    rig.mouthMesh.scale.set(
      1.1,
      0.98 + Math.sin(elapsed * (isAcuteShock ? 12 : 4.5)) * 0.14,
      1
    );

    // Gerakan tangan menahan bagian yang sakit (pipi/perut)
    if (isAcuteShock) {
      rig.waveArmPivot.rotation.x = -0.55 + Math.sin(elapsed * 8) * 0.12;
      rig.waveArmPivot.rotation.z = 0.25;
    } else if (initialExpression === 'memegang_pipi') {
      rig.waveArmPivot.rotation.x = -0.95 + Math.sin(elapsed * 2.5) * 0.08;
      rig.waveArmPivot.rotation.z = 0.42;
    } else if (initialExpression === 'meringis') {
      rig.waveArmPivot.rotation.x = -0.35 + Math.sin(elapsed * 3.0) * 0.08;
      rig.waveArmPivot.rotation.z = 0.28;
    } else {
      rig.waveArmPivot.rotation.x = THREE.MathUtils.lerp(
        rig.waveArmPivot.rotation.x,
        -0.18,
        dt * 4
      );
      rig.waveArmPivot.rotation.z = THREE.MathUtils.lerp(
        rig.waveArmPivot.rotation.z,
        0.12,
        dt * 4
      );
    }

    if (rig.bellyCompressMesh.visible) {
      const pulse = 1 + Math.sin(elapsed * 4.5) * 0.07;
      rig.bellyCompressMesh.scale.set(pulse, 1, pulse);
    }
    return animState;
  }

  // 4. STATE: 'relaxed' — Progres operasi >= 50%, pasien tenang & nyaman menjelang sembuh
  rig.upperBodyPivot.rotation.z = THREE.MathUtils.lerp(
    rig.upperBodyPivot.rotation.z,
    0,
    dt * 5
  );

  // Napas teratur dan rileks
  const relaxedBreath = 1 + Math.sin(elapsed * 2.3) * 0.03;
  rig.torsoMesh.scale.set(1, relaxedBreath, 1);

  // Kepala rileks dan stabil di atas bantal
  rig.headGroup.rotation.x = THREE.MathUtils.lerp(
    rig.headGroup.rotation.x,
    0,
    dt * 4.5
  );
  rig.headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.035;
  rig.headGroup.rotation.z = 0;

  // Kedipan mata tenang dan nyaman
  const relaxedBlink = Math.sin(elapsed * 2.8) > 0.95 ? 0.2 : 0.96;
  rig.leftEye.scale.set(1, relaxedBlink, 1);
  rig.rightEye.scale.set(1, relaxedBlink, 1);

  // Alis netral dan rileks
  rig.leftBrow.position.y = THREE.MathUtils.lerp(
    rig.leftBrow.position.y,
    0.213,
    dt * 5
  );
  rig.rightBrow.position.y = THREE.MathUtils.lerp(
    rig.rightBrow.position.y,
    0.213,
    dt * 5
  );
  rig.leftBrow.rotation.x = THREE.MathUtils.lerp(
    rig.leftBrow.rotation.x,
    -0.04,
    dt * 5
  );
  rig.rightBrow.rotation.x = THREE.MathUtils.lerp(
    rig.rightBrow.rotation.x,
    0.04,
    dt * 5
  );

  // Pipi hangat lembut
  rig.cheekMat.color.setHex(0xfda4af);
  rig.cheekMat.opacity = 0.45;
  rig.leftCheek.scale.setScalar(1.04);
  rig.rightCheek.scale.setScalar(1.04);

  // Mulut tersenyum tipis penuh kelegaan
  rig.mouthMesh.rotation.z = Math.PI / 2;
  rig.mouthMesh.scale.set(0.92, 0.72, 1);

  // Lengan beristirahat tenang di samping
  rig.waveArmPivot.rotation.x = THREE.MathUtils.lerp(
    rig.waveArmPivot.rotation.x,
    0,
    dt * 4
  );
  rig.waveArmPivot.rotation.z = THREE.MathUtils.lerp(
    rig.waveArmPivot.rotation.z,
    0,
    dt * 4
  );

  if (rig.bellyCompressMesh.visible) {
    const pulse = 1 + Math.sin(elapsed * 3.2) * 0.045;
    rig.bellyCompressMesh.scale.set(pulse, 1, pulse);
  }

  return animState;
}

/**
 * Tekstur bayangan kontak radial lembut (Zero 404)
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 120);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.58)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.22)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tekstur lantai ruang operasi klinis yang terang, bersih, dan kontras tinggi
 */
function createClinicalFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dasar ubin porselen rumah sakit terang & bersih
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(0, 0, 512, 512);

  // Pola kotak ubin berselang-seling halus untuk kontras realistis
  const step = 128;
  for (let x = 0; x < 512; x += step) {
    for (let y = 0; y < 512; y += step) {
      const isAlt = ((x / step) + (y / step)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#f0f9ff' : '#dbeafe';
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
    }
  }

  // Nat ubin biru medis tegas
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Aksentuasi salib medis kecil di sudut ubin
  ctx.fillStyle = '#0284c7';
  for (let x = step; x < 512; x += step) {
    for (let y = step; y < 512; y += step) {
      ctx.fillRect(x - 7, y - 2, 14, 4);
      ctx.fillRect(x - 2, y - 7, 4, 14);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Tekstur papan lampu X-Ray (Rontgen) & anatomi medis di dinding ruang bedah
 */
function createXrayViewerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Background lightbox terang kebiruan
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(0, 0, 512, 256);

  // Panel Film Rontgen 1 (Tulang Rusuk / Toraks)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 20, 220, 216);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 220, 216);

  // Gambar tulang belakang & tulang rusuk
  ctx.strokeStyle = '#bae6fd';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(130, 42);
  ctx.lineTo(130, 210);
  ctx.stroke();

  for (let r = 0; r < 5; r++) {
    const ry = 62 + r * 28;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(100, ry, 28, -Math.PI * 0.7, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(160, ry, 28, Math.PI * 0.5, -Math.PI * 0.3);
    ctx.stroke();
  }

  // Indikator Jantung sehat merah muda/merah
  ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
  ctx.beginPath();
  ctx.arc(144, 118, 18, 0, Math.PI * 2);
  ctx.fill();

  // Panel Film Rontgen 2 (Scan Organ & Diagnostik Bedah)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(268, 20, 224, 216);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(268, 20, 224, 216);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillText('X-RAY DIAGNOSTIC', 288, 52);

  // Gelombang pulsa & lingkaran target bedah
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(380, 134, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(380, 134, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('RUANG BEDAH STERIL', 296, 216);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Tekstur papan nama gedung rumah sakit "HOSPITAL - SDN 66 BANDA ACEH"
 */
function createHospitalSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 256);

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 1010, 242);

  // Salib medis merah kontras tinggi kiri & kanan
  const drawCross = (cx: number, cy: number) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 52, cy - 18, 104, 36);
    ctx.fillRect(cx - 18, cy - 52, 36, 104);
  };
  drawCross(112, 128);
  drawCross(912, 128);

  ctx.fillStyle = '#dc2626';
  ctx.font = '900 110px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HOSPITAL', 512, 132);

  ctx.fillStyle = '#0369a1';
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('RS EDUKASI SDN 66 BANDA ACEH', 512, 208);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Membangun Gugusan Awan Putih 3D Cerah di Langit Rumah Sakit
 */
function createFluffyCloudGroup(scale = 1): THREE.Group {
  const cloud = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.28,
    roughness: 0.75,
    metalness: 0.0,
  });

  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 0.95],
    [-0.85, -0.12, 0.12, 0.72],
    [0.88, -0.1, 0.08, 0.76],
    [-0.38, 0.36, -0.08, 0.68],
    [0.42, 0.32, 0.1, 0.64],
    [1.45, -0.22, -0.05, 0.52],
  ];

  puffs.forEach(([px, py, pz, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), cloudMat);
    puff.position.set(px, py, pz);
    puff.scale.set(1.18, 0.88, 0.92);
    cloud.add(puff);
  });

  cloud.scale.setScalar(scale);
  return cloud;
}

/**
 * Membangun Karakter 3D Dokter / Perawat Proporsional dengan Stetoskop & Alat Bedah Lengkap
 */
function buildMedicalCharacterRig(options: {
  role: 'doctor' | 'nurse';
  skinColor?: number;
  coatColor?: number;
  scrubColor?: number;
  hairColor?: number;
  withStethoscope?: boolean;
  withSurgicalTool?: boolean;
  shadowMat: THREE.Material;
}): CharacterRig {
  const {
    role,
    skinColor = 0xfcd5b5,
    coatColor = role === 'doctor' ? 0xffffff : 0x38bdf8,
    scrubColor = role === 'doctor' ? 0x0d9488 : 0x0284c7,
    hairColor = role === 'doctor' ? 0x1c1917 : 0x5c3a21,
    withStethoscope = role === 'doctor',
    withSurgicalTool = role === 'doctor',
    shadowMat,
  } = options;

  const root = new THREE.Group();

  // Contact shadow di dasar kaki
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.95),
    shadowMat
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.015, 0);
  root.add(shadowPlane);

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.48,
    metalness: 0.04,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: coatColor,
    roughness: 0.35,
    metalness: 0.08,
  });
  const scrubMat = new THREE.MeshStandardMaterial({
    color: scrubColor,
    roughness: 0.42,
    metalness: 0.08,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.6,
    metalness: 0.05,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.2,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.14,
    metalness: 0.92,
  });
  const bloodAccentMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.25,
    metalness: 0.1,
  });

  // 1. Kaki Kiri & Kanan (Artikulasi Pangkal Paha)
  const makeLeg = (offsetX: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(offsetX, 0.52, 0);

    const trouser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.075, 0.44, 16),
      scrubMat
    );
    trouser.position.set(0, -0.22, 0);
    trouser.castShadow = true;
    legPivot.add(trouser);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.24),
      role === 'doctor'
        ? darkMat
        : new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.35 })
    );
    shoe.position.set(0, -0.46, 0.03);
    shoe.castShadow = true;
    legPivot.add(shoe);

    return legPivot;
  };

  const leftLegPivot = makeLeg(-0.13);
  const rightLegPivot = makeLeg(0.13);
  root.add(leftLegPivot);
  root.add(rightLegPivot);

  // 2. Tubuh / Torso (Baju Bedah Dalam + Jas Dokter Putih Luar)
  const innerTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.62, 20),
    scrubMat
  );
  innerTorso.position.set(0, 0.82, 0);
  innerTorso.castShadow = true;
  root.add(innerTorso);

  const outerCoat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.265, 0.64, 20),
    coatMat
  );
  outerCoat.position.set(0, 0.81, -0.01);
  outerCoat.castShadow = true;
  root.add(outerCoat);

  // Belahan kerah jas dokter di dada depan
  const frontVNeck = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.28, 0.06),
    scrubMat
  );
  frontVNeck.position.set(0, 0.96, 0.22);
  root.add(frontVNeck);

  // 3. Stetoskop 3D di Leher & Dada Dokter
  if (withStethoscope) {
    const stethoTubeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.3,
    });
    const stethoCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.022, 12, 28, Math.PI * 1.15),
      stethoTubeMat
    );
    stethoCollar.rotation.x = Math.PI / 2 + 0.35;
    stethoCollar.rotation.z = -0.22;
    stethoCollar.position.set(0, 1.1, 0.04);
    root.add(stethoCollar);

    const dropTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10),
      stethoTubeMat
    );
    dropTube.position.set(0.11, 0.96, 0.24);
    dropTube.rotation.z = -0.15;
    root.add(dropTube);

    const chestPiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.025, 18),
      silverMat
    );
    chestPiece.rotation.x = Math.PI / 2;
    chestPiece.position.set(0.12, 0.85, 0.255);
    root.add(chestPiece);
  }

  // 4. Lengan Kiri & Kanan (Artikulasi Bahu + Sarung Tangan Bedah Lateks Biru Terang)
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.28,
    metalness: 0.08,
  });

  const makeArm = (isRight: boolean) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(isRight ? 0.29 : -0.29, 1.05, 0);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.062, 0.38, 16),
      coatMat
    );
    sleeve.position.set(0, -0.17, 0);
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const gloveHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 16, 16),
      gloveMat
    );
    gloveHand.position.set(0, -0.39, 0.02);
    gloveHand.castShadow = true;
    armPivot.add(gloveHand);

    return { armPivot, gloveHand };
  };

  const leftArm = makeArm(false);
  const rightArm = makeArm(true);
  root.add(leftArm.armPivot);
  root.add(rightArm.armPivot);

  // ALAT BEDAH REALISTIS DI TANGAN DOKTER:
  // - Tangan Kanan: Scalpel / Pisau Bedah Stainless dengan sedikit bercak merah di ujung
  // - Tangan Kiri: Pinset Bedah (Forceps) yang memegang kapas/kasa steril dengan sedikit noda darah
  let toolMesh: THREE.Object3D | undefined;
  if (withSurgicalTool) {
    // 1. Pisau Bedah (Scalpel) di tangan kanan
    const scalpelGroup = new THREE.Group();
    scalpelGroup.position.set(0, -0.41, 0.11);
    scalpelGroup.rotation.x = Math.PI / 2.1;

    // Gagang pisau bedah ergonomis
    const scalpelHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.22, 0.014),
      silverMat
    );
    scalpelGroup.add(scalpelHandle);

    // Grip warna merah medis pada gagang
    const handleGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.031, 0.08, 0.016),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
    );
    handleGrip.position.set(0, -0.02, 0);
    scalpelGroup.add(handleGrip);

    // Mata pisau bedah perak mengilap
    const scalpelBlade = new THREE.Mesh(
      new THREE.ConeGeometry(0.018, 0.095, 4),
      silverMat
    );
    scalpelBlade.scale.set(0.35, 1, 1.1);
    scalpelBlade.position.set(0, 0.145, 0);
    scalpelGroup.add(scalpelBlade);

    // Sedikit aksen darah pada ujung mata pisau bedah (tidak berlebihan)
    const bladeBloodTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 10, 10),
      bloodAccentMat
    );
    bladeBloodTip.scale.set(0.7, 1.4, 0.7);
    bladeBloodTip.position.set(0, 0.175, 0.004);
    scalpelGroup.add(bladeBloodTip);

    rightArm.armPivot.add(scalpelGroup);
    toolMesh = scalpelGroup;

    // 2. Pinset Bedah (Forceps) + Kasa Steril di tangan kiri
    const forcepsGroup = new THREE.Group();
    forcepsGroup.position.set(0, -0.41, 0.1);
    forcepsGroup.rotation.x = Math.PI / 2.2;

    const prongLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.21, 0.012),
      silverMat
    );
    prongLeft.position.set(-0.01, 0, 0);
    prongLeft.rotation.z = -0.05;
    forcepsGroup.add(prongLeft);

    const prongRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.21, 0.012),
      silverMat
    );
    prongRight.position.set(0.01, 0, 0);
    prongRight.rotation.z = 0.05;
    forcepsGroup.add(prongRight);

    // Kasa steril kecil di ujung pinset dengan sedikit titik merah darah
    const gauzeSwab = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    );
    gauzeSwab.position.set(0, 0.115, 0);
    forcepsGroup.add(gauzeSwab);

    const gauzeBloodSpot = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 10, 10),
      bloodAccentMat
    );
    gauzeBloodSpot.position.set(0, 0.128, 0.008);
    forcepsGroup.add(gauzeBloodSpot);

    leftArm.armPivot.add(forcepsGroup);
  } else if (role === 'nurse') {
    // Perawat memegang nampan instrumen / bengkok medis perak
    const nurseTray = new THREE.Group();
    nurseTray.position.set(0, -0.39, 0.12);
    const trayDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.025, 16),
      silverMat
    );
    nurseTray.add(trayDish);
    rightArm.armPivot.add(nurseTray);
  }

  // 5. Kepala Proporsional, Wajah Ekspresif, Topi Medis & Masker
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.38, 0);

  const headSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 24, 24),
    skinMat
  );
  headSphere.scale.set(1, 1.04, 0.96);
  headSphere.castShadow = true;
  headGroup.add(headSphere);

  // Telinga kiri & kanan
  const earGeo = new THREE.SphereGeometry(0.055, 12, 12);
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.22, 0, 0);
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.22, 0, 0);
  headGroup.add(rightEar);

  // Rambut belakang / samping
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.238, 20, 20),
    hairMat
  );
  hairBack.position.set(0, 0.03, -0.03);
  headGroup.add(hairBack);

  // Topi Bedah + Loupe Pembesar Bedah untuk Dokter / Topi Perawat
  if (role === 'doctor') {
    const scrubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.235, 0.242, 0.16, 24),
      scrubMat
    );
    scrubCap.position.set(0, 0.14, 0);
    headGroup.add(scrubCap);

    const capTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      scrubMat
    );
    capTop.scale.set(1, 0.45, 1);
    capTop.position.set(0, 0.21, 0);
    headGroup.add(capTop);

    // Lampu Kepala Bedah (Headlamp Medis) di dahi dokter
    const headLampBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.242, 0.242, 0.03, 24),
      darkMat
    );
    headLampBand.position.set(0, 0.11, 0);
    headGroup.add(headLampBand);

    const headLampLight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.03, 0.04, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.8,
      })
    );
    headLampLight.rotation.x = Math.PI / 2;
    headLampLight.position.set(0, 0.11, 0.245);
    headGroup.add(headLampLight);
  } else {
    // Topi Perawat Putih / Pink dengan Salib Medis
    const nurseCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    nurseCap.position.set(0, 0.25, 0.05);
    headGroup.add(nurseCap);

    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.025, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    crossH.position.set(0, 0.25, 0.145);
    headGroup.add(crossH);

    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.08, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    crossV.position.set(0, 0.25, 0.145);
    headGroup.add(crossV);
  }

  // Mata Kiri & Kanan
  const eyeGeo = new THREE.SphereGeometry(0.034, 14, 14);
  const leftEye = new THREE.Mesh(eyeGeo, darkMat);
  leftEye.position.set(-0.08, 0.03, 0.205);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, darkMat);
  rightEye.position.set(0.08, 0.03, 0.205);
  headGroup.add(rightEye);

  // Alis Ekspresif Kiri & Kanan
  const browGeo = new THREE.BoxGeometry(0.075, 0.018, 0.02);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.position.set(-0.08, 0.095, 0.21);
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, hairMat);
  rightBrow.position.set(0.08, 0.095, 0.21);
  headGroup.add(rightBrow);

  // Mulut Ekspresif & Masker Medis
  const mouthMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.012, 8, 16, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xbe123c })
  );
  mouthMesh.rotation.x = Math.PI;
  mouthMesh.position.set(0, -0.055, 0.215);
  headGroup.add(mouthMesh);

  const maskMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.13, 0.1),
    new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.4,
    })
  );
  maskMesh.position.set(0, -0.065, 0.185);
  headGroup.add(maskMesh);

  root.add(headGroup);

  return {
    root,
    headGroup,
    leftBrow,
    rightBrow,
    leftEye,
    rightEye,
    mouthMesh,
    maskMesh,
    leftArmPivot: leftArm.armPivot,
    rightArmPivot: rightArm.armPivot,
    leftLegPivot,
    rightLegPivot,
    toolMesh,
  };
}

/**
 * Membangun Pohon Taman Rumah Sakit Poligonal Bertingkat (Composite 5-Part THREE.Group) dengan Kontras Warna Segar
 */
function createHospitalTree(scale = 1, shadowMat: THREE.Material): THREE.Group {
  const tree = new THREE.Group();

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.015, 0);
  tree.add(shadow);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.8,
  });
  const leavesMat1 = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.48,
  });
  const leavesMat2 = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.42,
  });
  const leavesMat3 = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 0.38,
  });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 0.95, 10),
    trunkMat
  );
  trunk.position.set(0, 0.47, 0);
  trunk.castShadow = true;
  tree.add(trunk);

  const crownBottom = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.72, 1),
    leavesMat1
  );
  crownBottom.position.set(0, 1.15, 0);
  crownBottom.castShadow = true;
  tree.add(crownBottom);

  const crownMid = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.56, 1),
    leavesMat2
  );
  crownMid.position.set(0.12, 1.66, -0.06);
  crownMid.castShadow = true;
  tree.add(crownMid);

  const crownTop = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 1),
    leavesMat3
  );
  crownTop.position.set(-0.08, 2.04, 0.06);
  crownTop.castShadow = true;
  tree.add(crownTop);

  tree.scale.setScalar(scale);
  return tree;
}

export const OperatingRoom3D: React.FC<OperatingRoom3DProps> = ({
  lives,
  status,
  flowStage,
  category,
  cameraPreset,
  numberA = 24,
  numberB = 36,
  patient,
  surgeryProgress,
  doctorReaction,
  doctorAnimOverride = 'auto',
  onMonitorInteract,
  forceFallback2D = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFallback, setWebglFallback] = useState<boolean>(false);
  const stateRef = useRef({
    lives,
    status,
    flowStage,
    category,
    cameraPreset,
    numberA,
    numberB,
    patient,
    surgeryProgress,
    doctorReaction,
    doctorAnimOverride,
    onMonitorInteract,
  });

  useEffect(() => {
    stateRef.current = {
      lives,
      status,
      flowStage,
      category,
      cameraPreset,
      numberA,
      numberB,
      patient,
      surgeryProgress,
      doctorReaction,
      doctorAnimOverride,
      onMonitorInteract,
    };
  }, [
    lives,
    status,
    flowStage,
    category,
    cameraPreset,
    numberA,
    numberB,
    patient,
    surgeryProgress,
    doctorReaction,
    doctorAnimOverride,
    onMonitorInteract,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Deteksi Software WebGL & Ketersediaan Konteks WebGL secara Aman
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl =
        (probeCanvas.getContext('webgl2') as WebGLRenderingContext | null) ||
        (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);
      if (!gl) {
        setWebglFallback(true);
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        gpu
      );
    } catch {
      setWebglFallback(true);
      return;
    }

    const scene = new THREE.Scene();
    // Langit Siang yang Cerah & Biru Segar
    const skyColor = new THREE.Color(0x38bdf8);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.011);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 110);
    camera.position.set(0, 4.5, 23);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Kontras dan eksposur ditingkatkan agar warna sangat eyecatching & realistis
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
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

    // Environment Map Prosedural untuk refleksi logam & kaca realistis
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const shadowTex = createContactShadowTexture();
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.52,
    });

    // Pencahayaan Global Cerah & Kontras Tinggi
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x38bdf8, 1.35);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.75);
    sunLight.position.set(8, 16, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 48;
    const d = 15;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Lampu Sorot Ruang Operasi Utama & Lampu Terang Ruangan Dalam
    const surgicalRoomLight = new THREE.PointLight(0xffffff, 3.2, 16);
    surgicalRoomLight.position.set(0, 3.4, 0.2);
    scene.add(surgicalRoomLight);

    const indoorFillLight = new THREE.PointLight(0xe0f2fe, 2.2, 18);
    indoorFillLight.position.set(0, 3.8, -1.8);
    scene.add(indoorFillLight);

    // Material Umum Berkualitas PBR Kontras Tinggi
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.92,
      roughness: 0.14,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.32,
    });
    const sterileWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.08,
      roughness: 0.32,
    });
    const hospitalRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.18,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.72,
      roughness: 0.12,
      transparent: true,
      opacity: 0.82,
    });
    const subtleBloodMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.22,
      metalness: 0.08,
    });

    // =========================================================================
    // ZONA 1: LINGKUNGAN EKSTERIOR RUMAH SAKIT MODERN, LANGIT CERAH, MATAHARI & AWAN (Z = 10 .. 26)
    // =========================================================================
    const exteriorGroup = new THREE.Group();
    exteriorGroup.position.set(0, 0, 14);
    scene.add(exteriorGroup);

    // MATAHARI BERSINAR CERAH DI LANGIT LUAR RUMAH SAKIT
    const sunSkyGroup = new THREE.Group();
    sunSkyGroup.position.set(9.2, 11.2, -9.5);
    exteriorGroup.add(sunSkyGroup);

    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    sunSkyGroup.add(sunCore);

    const sunGlowHalo = new THREE.Mesh(
      new THREE.SphereGeometry(2.15, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    sunSkyGroup.add(sunGlowHalo);

    const sunOuterCorona = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.1, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    sunSkyGroup.add(sunOuterCorona);

    // Sinar-sinar Matahari Poligonal yang Berputar Lembut
    const sunRaysGroup = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let r = 0; r < 12; r++) {
      const angle = (r / 12) * Math.PI * 2;
      const rayMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.35, 4),
        rayMat
      );
      rayMesh.position.set(Math.cos(angle) * 2.75, Math.sin(angle) * 2.75, 0);
      rayMesh.rotation.z = angle - Math.PI / 2;
      sunRaysGroup.add(rayMesh);
    }
    sunSkyGroup.add(sunRaysGroup);

    // GUGUSAN AWAN PUTIH 3D CERAH YANG BERGERAK HALUS DI LANGIT
    const skyClouds: Array<{
      group: THREE.Group;
      baseX: number;
      baseY: number;
      speed: number;
      amp: number;
    }> = [];
    const cloudConfigs: Array<[number, number, number, number, number]> = [
      [-10.5, 9.8, -8.5, 1.35, 0.35],
      [-3.8, 10.6, -9.2, 1.55, 0.28],
      [3.5, 9.6, -8.2, 1.25, 0.32],
      [-14.0, 8.4, -6.5, 1.1, 0.4],
      [13.2, 8.9, -7.5, 1.2, 0.3],
    ];
    cloudConfigs.forEach(([cx, cy, cz, sc, spd], idx) => {
      const cl = createFluffyCloudGroup(sc);
      cl.position.set(cx, cy, cz);
      exteriorGroup.add(cl);
      skyClouds.push({
        group: cl,
        baseX: cx,
        baseY: cy,
        speed: spd,
        amp: 1.8 + (idx % 3) * 0.6,
      });
    });

    // Hamparan Rumput Taman Rumah Sakit Hijau Segar & Kontras
    const grassGround = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 34),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.78 })
    );
    grassGround.rotation.x = -Math.PI / 2;
    grassGround.position.set(0, 0.01, 1);
    grassGround.receiveShadow = true;
    exteriorGroup.add(grassGround);

    // Taman Bunga Warna-Warni di Kiri & Kanan Lobi Rumah Sakit
    const flowerColors = [0xf43f5e, 0xfacc15, 0xa855f7, 0x38bdf8];
    [-4.8, -3.4, 3.4, 4.8].forEach((bx, idx) => {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
      );
      bush.scale.set(1.3, 0.75, 1);
      bush.position.set(bx, 0.25, 0.75);
      exteriorGroup.add(bush);

      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        new THREE.MeshBasicMaterial({
          color: flowerColors[idx % flowerColors.length],
        })
      );
      flower.position.set(bx, 0.56, 0.82);
      exteriorGroup.add(flower);
    });

    // Jalan Aspal Driveway Ambulans di Depan Lobi Rumah Sakit
    const driveway = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 9.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.68 })
    );
    driveway.rotation.x = -Math.PI / 2;
    driveway.position.set(0, 0.025, 3.2);
    driveway.receiveShadow = true;
    exteriorGroup.add(driveway);

    // Marka Jalan Putih & Kuning Kontras Tinggi
    for (let i = -9; i <= 9; i += 3) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i, 0.032, 4.5);
      exteriorGroup.add(stripe);
    }

    // Gedung Utama Rumah Sakit Modern (2 Lantai + Kanopi IGD + Helipad)
    const mainBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 5.5, 4.2),
      sterileWhiteMat
    );
    mainBuilding.position.set(0, 2.75, -2.2);
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    exteriorGroup.add(mainBuilding);

    // Sabuk Biru Cerah Fasad Gedung Rumah Sakit (Eyecatching)
    const facadeAccentBand = new THREE.Mesh(
      new THREE.BoxGeometry(14.6, 0.45, 4.26),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
    );
    facadeAccentBand.position.set(0, 5.25, -2.2);
    exteriorGroup.add(facadeAccentBand);

    // Lantai Atas / Menara Medis Belakang
    const upperTower = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 2.2, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.42 })
    );
    upperTower.position.set(0, 6.4, -2.5);
    upperTower.castShadow = true;
    exteriorGroup.add(upperTower);

    // Papan Nama Besar "HOSPITAL - RS EDUKASI SDN 66 BANDA ACEH"
    const signTex = createHospitalSignTexture(maxAnisotropy);
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 1.4, 0.24),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    signBoard.position.set(0, 4.15, -0.02);
    exteriorGroup.add(signBoard);

    // Jendela Kaca Biru Modern di Kiri & Kanan Gedung
    const windowPositions = [-4.8, -3.1, 3.1, 4.8];
    windowPositions.forEach((wx) => {
      const winPane = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 1.85, 0.12),
        glassMat
      );
      winPane.position.set(wx, 3.6, -0.08);
      exteriorGroup.add(winPane);
    });

    // Kanopi Merah IGD & Pilar Penyangga
    const canopyRoof = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.3, 3.2),
      hospitalRedMat
    );
    canopyRoof.position.set(0, 2.65, 1.2);
    canopyRoof.castShadow = true;
    exteriorGroup.add(canopyRoof);

    [-3.9, -1.8, 1.8, 3.9].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 2.65, 0.24),
        hospitalRedMat
      );
      pillar.position.set(px, 1.325, 2.6);
      pillar.castShadow = true;
      exteriorGroup.add(pillar);
    });

    // PINTU RUMAH SAKIT OTOMATIS (2 Daun Pintu Kaca Geser Kiri & Kanan)
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.4, 0.18),
      darkSteelMat
    );
    doorFrame.position.set(0, 1.2, -0.08);
    exteriorGroup.add(doorFrame);

    const autoDoorLeft = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 2.2, 0.12),
      glassMat
    );
    autoDoorLeft.position.set(-0.74, 1.15, 0.02);
    exteriorGroup.add(autoDoorLeft);

    const autoDoorRight = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 2.2, 0.12),
      glassMat
    );
    autoDoorRight.position.set(0.74, 1.15, 0.02);
    exteriorGroup.add(autoDoorRight);

    // Helipad & Helikopter Medis Kuning Cerah di Atap Gedung
    const helipadCircle = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
    );
    helipadCircle.position.set(0, 7.56, -2.5);
    exteriorGroup.add(helipadCircle);

    const helicopterGroup = new THREE.Group();
    helicopterGroup.position.set(0, 7.95, -2.5);
    const heliCabin = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 18, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.35,
        roughness: 0.25,
      })
    );
    heliCabin.scale.set(1.35, 0.9, 0.9);
    helicopterGroup.add(heliCabin);

    const heliTail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    heliTail.rotation.z = Math.PI / 2;
    heliTail.position.set(-0.85, 0.05, 0);
    helicopterGroup.add(heliTail);

    const heliRotor = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.03, 0.14),
      darkSteelMat
    );
    heliRotor.position.set(0, 0.48, 0);
    helicopterGroup.add(heliRotor);
    exteriorGroup.add(helicopterGroup);

    // Pepohonan Taman Rumah Sakit di Kiri & Kanan
    const treeCoords: Array<[number, number, number]> = [
      [-6.5, 1.8, 1.15],
      [-8.5, 3.4, 1.0],
      [-5.4, 5.2, 0.9],
      [6.5, 1.8, 1.15],
      [8.5, 3.4, 1.0],
      [5.4, 5.2, 0.9],
    ];
    treeCoords.forEach(([tx, tz, sc]) => {
      const tree = createHospitalTree(sc, contactShadowMat);
      tree.position.set(tx, 0, tz);
      exteriorGroup.add(tree);
    });

    // =========================================================================
    // AMBULANS 3D BERGERAK (Composite 10-Part THREE.Group)
    // =========================================================================
    const ambulanceGroup = new THREE.Group();
    ambulanceGroup.position.set(0, 0, 3.6);
    exteriorGroup.add(ambulanceGroup);

    const ambShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.1),
      contactShadowMat
    );
    ambShadow.rotation.x = -Math.PI / 2;
    ambShadow.position.set(0, 0.02, 0);
    ambulanceGroup.add(ambShadow);

    const ambBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.38, 1.38),
      sterileWhiteMat
    );
    ambBody.position.set(-0.25, 0.92, 0);
    ambBody.castShadow = true;
    ambulanceGroup.add(ambBody);

    const ambCab = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.05, 1.32),
      sterileWhiteMat
    );
    ambCab.position.set(1.35, 0.75, 0);
    ambCab.castShadow = true;
    ambulanceGroup.add(ambCab);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.48, 1.18),
      glassMat
    );
    windshield.position.set(1.8, 0.98, 0);
    windshield.rotation.z = 0.18;
    ambulanceGroup.add(windshield);

    const redStripeFront = new THREE.Mesh(
      new THREE.BoxGeometry(3.42, 0.2, 1.41),
      hospitalRedMat
    );
    redStripeFront.position.set(0.15, 0.62, 0);
    ambulanceGroup.add(redStripeFront);

    const sirenRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.2,
    });
    const sirenBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 2.2,
    });
    const sirenBarLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.36),
      sirenRedMat
    );
    sirenBarLeft.position.set(0.65, 1.68, 0.25);
    ambulanceGroup.add(sirenBarLeft);

    const sirenBarRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.14, 0.36),
      sirenBlueMat
    );
    sirenBarRight.position.set(0.65, 1.68, -0.25);
    ambulanceGroup.add(sirenBarRight);

    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 20);
    wheelGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
    });
    const wheels: THREE.Mesh[] = [];
    const wheelOffsets: Array<[number, number]> = [
      [-0.95, 0.68],
      [-0.95, -0.68],
      [1.25, 0.68],
      [1.25, -0.68],
    ];
    wheelOffsets.forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.32, wz);
      wheel.castShadow = true;
      ambulanceGroup.add(wheel);
      wheels.push(wheel);
    });

    // =========================================================================
    // BRANKAR PASIEN (STRETCHER) + KARAKTER PASIEN DI HALAMAN DEPAN
    // =========================================================================
    const exteriorStretcherGroup = new THREE.Group();
    exteriorStretcherGroup.position.set(-2.3, 0, 2.2);
    exteriorGroup.add(exteriorStretcherGroup);

    const stretcherFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.08, 0.62),
      chromeMat
    );
    stretcherFrame.position.set(0, 0.68, 0);
    exteriorStretcherGroup.add(stretcherFrame);

    const stretcherMattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.12, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 })
    );
    stretcherMattress.position.set(0, 0.78, 0);
    exteriorStretcherGroup.add(stretcherMattress);

    const stretcherLegs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.65, 10),
      chromeMat
    );
    stretcherLegs.position.set(-0.48, 0.34, 0);
    exteriorStretcherGroup.add(stretcherLegs);

    const stretcherLegs2 = stretcherLegs.clone();
    stretcherLegs2.position.set(0.48, 0.34, 0);
    exteriorStretcherGroup.add(stretcherLegs2);

    const stretcherPatientHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xfcd5b5, roughness: 0.45 })
    );
    stretcherPatientHead.position.set(0.42, 0.96, 0);
    exteriorStretcherGroup.add(stretcherPatientHead);

    const stretcherBlanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.18, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 })
    );
    stretcherBlanket.position.set(-0.14, 0.9, 0);
    exteriorStretcherGroup.add(stretcherBlanket);

    const exteriorDoctorRig = buildMedicalCharacterRig({
      role: 'doctor',
      withStethoscope: true,
      withSurgicalTool: false,
      shadowMat: contactShadowMat,
    });
    exteriorDoctorRig.root.position.set(-2.2, 0, 1.25);
    exteriorGroup.add(exteriorDoctorRig.root);

    const exteriorNurseRig = buildMedicalCharacterRig({
      role: 'nurse',
      withStethoscope: false,
      withSurgicalTool: false,
      shadowMat: contactShadowMat,
    });
    exteriorNurseRig.root.position.set(2.3, 0, 1.45);
    exteriorNurseRig.root.rotation.y = -0.35;
    exteriorGroup.add(exteriorNurseRig.root);

    // =========================================================================
    // ZONA 2: RUANG OPERASI 3D TERANG & PERALATAN BEDAH LENGKAP (Z = 0)
    // =========================================================================
    const surgeryRoomGroup = new THREE.Group();
    surgeryRoomGroup.position.set(0, 0, 0);
    scene.add(surgeryRoomGroup);

    // Lantai Keramik Ruang Bedah yang Terang & Bersih
    const floorTex = createClinicalFloorTexture(maxAnisotropy);
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 13),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.24,
        metalness: 0.1,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    surgeryRoomGroup.add(floorMesh);

    // Dinding Belakang & Samping Ruang Bedah yang Terang (Sterile Hospital Mint/White)
    const brightWallMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.38,
      metalness: 0.06,
    });
    const wallLowerPanelMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.34,
      metalness: 0.08,
    });
    const wallStripeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.15,
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(16, 5.6, 0.25),
      brightWallMat
    );
    backWall.position.set(0, 2.8, -3.15);
    backWall.receiveShadow = true;
    surgeryRoomGroup.add(backWall);

    const backWallLower = new THREE.Mesh(
      new THREE.BoxGeometry(15.9, 1.35, 0.28),
      wallLowerPanelMat
    );
    backWallLower.position.set(0, 0.68, -3.14);
    surgeryRoomGroup.add(backWallLower);

    const backWallStripe = new THREE.Mesh(
      new THREE.BoxGeometry(15.95, 0.14, 0.3),
      wallStripeMat
    );
    backWallStripe.position.set(0, 1.38, -3.13);
    surgeryRoomGroup.add(backWallStripe);

    // Dinding Samping Kiri & Kanan Terang agar Ruang Bedah Terasa Utuh & Cerah
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 5.6, 11),
      brightWallMat
    );
    leftWall.position.set(-5.6, 2.8, 1.2);
    surgeryRoomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 5.6, 11),
      brightWallMat
    );
    rightWall.position.set(5.6, 2.8, 1.2);
    surgeryRoomGroup.add(rightWall);

    // Papan Lampu X-Ray (Rontgen) Medis Menyala di Dinding Belakang Ruang Bedah
    const xrayTex = createXrayViewerTexture(maxAnisotropy);
    const xrayFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.92, 0.1),
      darkSteelMat
    );
    xrayFrame.position.set(-1.35, 2.28, -3.0);
    surgeryRoomGroup.add(xrayFrame);

    const xrayScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.64, 0.82),
      new THREE.MeshBasicMaterial({ map: xrayTex })
    );
    xrayScreen.position.set(-1.35, 2.28, -2.94);
    surgeryRoomGroup.add(xrayScreen);

    // Lemari Kabinet Instrumen & Obat Bedah Kaca Steril di Sisi Kiri Ruang Bedah
    const cabinetGroup = new THREE.Group();
    cabinetGroup.position.set(-3.35, 0, -2.65);
    surgeryRoomGroup.add(cabinetGroup);

    const cabinetBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 2.35, 0.55),
      sterileWhiteMat
    );
    cabinetBody.position.set(0, 1.18, 0);
    cabinetBody.castShadow = true;
    cabinetGroup.add(cabinetBody);

    const cabinetGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 1.45, 0.04),
      glassMat
    );
    cabinetGlass.position.set(0, 1.45, 0.28);
    cabinetGroup.add(cabinetGlass);

    // Botol-botol Obat, Antiseptik & Kotak Kasa Steril di Dalam Lemari Bedah
    const medBottleColors = [0xef4444, 0x0284c7, 0x10b981, 0xf59e0b, 0x8b5cf6];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const bottle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.22, 12),
          new THREE.MeshStandardMaterial({
            color: medBottleColors[(row * 4 + col) % medBottleColors.length],
            roughness: 0.25,
          })
        );
        bottle.position.set(-0.38 + col * 0.25, 1.12 + row * 0.48, 0.1);
        cabinetGroup.add(bottle);
      }
    }

    // Pintu Ruang Operasi Otomatis di Dinding Belakang Kanan
    const orDoorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.6, 0.3),
      darkSteelMat
    );
    orDoorFrame.position.set(3.2, 1.3, -3.02);
    surgeryRoomGroup.add(orDoorFrame);

    const orDoorLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 2.4, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
    );
    orDoorLeft.position.set(2.7, 1.25, -3.0);
    surgeryRoomGroup.add(orDoorLeft);

    const orDoorRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 2.4, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
    );
    orDoorRight.position.set(3.7, 1.25, -3.0);
    surgeryRoomGroup.add(orDoorRight);

    // Indikator Lampu "OPERASI BERLANGSUNG" di Atas Pintu Ruang Bedah
    const orSignBadge = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.28, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 1.4,
      })
    );
    orSignBadge.position.set(3.2, 2.78, -2.96);
    surgeryRoomGroup.add(orSignBadge);

    // =========================================================================
    // MESIN ANESTESI & VENTILATOR MEDIS (Peralatan Khas Ruang Bedah)
    // =========================================================================
    const anesthesiaGroup = new THREE.Group();
    anesthesiaGroup.position.set(1.15, 0, -1.55);
    anesthesiaGroup.rotation.y = -0.35;
    surgeryRoomGroup.add(anesthesiaGroup);

    const anesBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 1.25, 0.58),
      sterileWhiteMat
    );
    anesBody.position.set(0, 0.65, 0);
    anesBody.castShadow = true;
    anesthesiaGroup.add(anesBody);

    // Tabung Pompa Napas Ventilator (Bellows) yang Naik-Turun Saat Operasi
    const bellowsJar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.38, 18),
      glassMat
    );
    bellowsJar.position.set(-0.18, 1.46, 0.08);
    anesthesiaGroup.add(bellowsJar);

    const ventilatorBellows = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
    );
    ventilatorBellows.position.set(-0.18, 1.42, 0.08);
    anesthesiaGroup.add(ventilatorBellows);

    // 3 Tabung Gas Medis Berwarna (Oksigen Hijau, Udara Kuning, N2O Biru)
    const gasColors = [0x22c55e, 0x3b82f6, 0xfacc15];
    gasColors.forEach((col, idx) => {
      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.68, 14),
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.35,
        })
      );
      cylinder.position.set(-0.2 + idx * 0.2, 0.55, -0.32);
      anesthesiaGroup.add(cylinder);
    });

    // Layar Kecil Monitor Ventilator
    const anesScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.28, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
      })
    );
    anesScreen.position.set(0.14, 1.44, 0.12);
    anesthesiaGroup.add(anesScreen);

    // =========================================================================
    // MEJA OPERASI 3D DETAIL & KAIN DRAPE BEDAH STERIL
    // =========================================================================
    const operatingTableGroup = new THREE.Group();
    surgeryRoomGroup.add(operatingTableGroup);

    const tableShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.0),
      contactShadowMat
    );
    tableShadow.rotation.x = -Math.PI / 2;
    tableShadow.position.set(0, 0.015, 0);
    operatingTableGroup.add(tableShadow);

    const basePedestal = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.12, 0.78),
      darkSteelMat
    );
    basePedestal.position.set(0, 0.06, 0);
    operatingTableGroup.add(basePedestal);

    const hydraulicColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.74, 24),
      chromeMat
    );
    hydraulicColumn.position.set(0, 0.49, 0);
    operatingTableGroup.add(hydraulicColumn);

    const mainMattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.78, 0.14, 0.84),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    );
    mainMattress.position.set(0, 0.94, 0);
    mainMattress.castShadow = true;
    mainMattress.receiveShadow = true;
    operatingTableGroup.add(mainMattress);

    // Rel Samping Stainless Meja Bedah
    [-0.44, 0.44].forEach((rz) => {
      const sideRail = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.035, 0.03),
        chromeMat
      );
      sideRail.position.set(0, 0.95, rz);
      operatingTableGroup.add(sideRail);
    });

    // =========================================================================
    // KARAKTER PASIEN 3D DI ATAS MEJA OPERASI + AREA BEDAH DENGAN SEDIKIT DARAH (TIDAK BERLEBIHAN)
    // =========================================================================
    const patientGroup = new THREE.Group();
    patientGroup.position.set(0, 1.04, 0);
    operatingTableGroup.add(patientGroup);

    // Pivot tubuh bagian atas pasien (agar bisa duduk tegak saat sembuh!)
    const patientUpperBodyPivot = new THREE.Group();
    patientUpperBodyPivot.position.set(0.15, 0.05, 0);
    patientGroup.add(patientUpperBodyPivot);

    const patientPajamaMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      roughness: 0.48,
    });
    const patientSkinMat = new THREE.MeshStandardMaterial({
      color: 0xfcd5b5,
      roughness: 0.46,
    });
    const patientHairMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
    });

    // Torso Pasien
    const patientTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.24, 0.46),
      patientPajamaMat
    );
    patientTorso.position.set(0, 0.08, 0);
    patientTorso.castShadow = true;
    patientUpperBodyPivot.add(patientTorso);

    // AREA TINDAKAN BEDAH STERIL DI ATAS TORSO PASIEN (Tampak sedikit saja darah, sopan & tidak berlebihan)
    const surgicalSiteGroup = new THREE.Group();
    surgicalSiteGroup.position.set(-0.04, 0.205, 0);
    patientUpperBodyPivot.add(surgicalSiteGroup);

    // Kain Drape Operasi Hijau Medis Berlubang (Fenestrated Drape)
    const sterileDrapePatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.015, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.55 })
    );
    surgicalSiteGroup.add(sterileDrapePatch);

    // Area kulit terbuka kecil di tengah kain drape
    const skinWindowPatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.018, 18),
      patientSkinMat
    );
    skinWindowPatch.position.set(0, 0.002, 0);
    surgicalSiteGroup.add(skinWindowPatch);

    // Garis sayatan bedah kecil & tipis + 3 titik tetesan darah kecil (tidak berlebihan)
    const incisionLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.01, 0.014),
      subtleBloodMat
    );
    incisionLine.position.set(0, 0.012, 0);
    surgicalSiteGroup.add(incisionLine);

    const bloodDroplets: THREE.Mesh[] = [];
    const dropletOffsets: Array<[number, number, number]> = [
      [-0.025, 0.016, 0.018],
      [0.018, 0.016, -0.016],
      [0.032, 0.015, 0.012],
    ];
    dropletOffsets.forEach(([dx, dy, dz]) => {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 10, 10),
        subtleBloodMat
      );
      drop.scale.set(1, 0.55, 1);
      drop.position.set(dx, dy, dz);
      surgicalSiteGroup.add(drop);
      bloodDroplets.push(drop);
    });

    // Kasa steril putih kecil di tepi area operasi dengan sedikit noda darah
    const sideGauzePad = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.012, 0.05),
      sterileWhiteMat
    );
    sideGauzePad.position.set(-0.1, 0.012, 0.08);
    surgicalSiteGroup.add(sideGauzePad);

    const sideGauzeDab = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.014, 10),
      subtleBloodMat
    );
    sideGauzeDab.position.set(-0.1, 0.013, 0.08);
    surgicalSiteGroup.add(sideGauzeDab);

    // Plester Penutup Steril (Muncul saat operasi selesai / SUCCESS)
    const healedBandagePatch = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.018, 0.06),
      sterileWhiteMat
    );
    healedBandagePatch.position.set(0, 0.015, 0);
    healedBandagePatch.visible = false;
    surgicalSiteGroup.add(healedBandagePatch);

    // Kepala Pasien
    const patientHead = new THREE.Group();
    patientHead.position.set(0.46, 0.14, 0);
    patientUpperBodyPivot.add(patientHead);

    const patientHeadSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 22, 22),
      patientSkinMat
    );
    patientHeadSphere.castShadow = true;
    patientHead.add(patientHeadSphere);

    const patientHairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.218, 18, 18),
      patientHairMat
    );
    patientHairMesh.position.set(0.03, 0.03, 0);
    patientHead.add(patientHairMesh);

    const pEyeGeo = new THREE.SphereGeometry(0.028, 12, 12);
    const pLeftEye = new THREE.Mesh(pEyeGeo, darkSteelMat);
    pLeftEye.position.set(0.05, 0.19, 0.07);
    patientHead.add(pLeftEye);

    const pRightEye = new THREE.Mesh(pEyeGeo, darkSteelMat);
    pRightEye.position.set(0.05, 0.19, -0.07);
    patientHead.add(pRightEye);

    const pBrowGeo = new THREE.BoxGeometry(0.02, 0.015, 0.065);
    const pLeftBrow = new THREE.Mesh(pBrowGeo, patientHairMat);
    pLeftBrow.position.set(0.11, 0.205, 0.07);
    patientHead.add(pLeftBrow);

    const pRightBrow = new THREE.Mesh(pBrowGeo, patientHairMat);
    pRightBrow.position.set(0.11, 0.205, -0.07);
    patientHead.add(pRightBrow);

    const pSmileMouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    );
    pSmileMouth.position.set(-0.08, 0.195, 0);
    pSmileMouth.rotation.x = Math.PI / 2;
    pSmileMouth.rotation.z = Math.PI / 2;
    patientHead.add(pSmileMouth);

    const pCheekMat = new THREE.MeshStandardMaterial({
      color: 0xfb7185,
      roughness: 0.5,
      transparent: true,
      opacity: 0.45,
    });
    const pCheekGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const pLeftCheek = new THREE.Mesh(pCheekGeo, pCheekMat);
    pLeftCheek.scale.set(0.6, 0.35, 1);
    pLeftCheek.position.set(-0.01, 0.185, 0.115);
    patientHead.add(pLeftCheek);

    const pRightCheek = new THREE.Mesh(pCheekGeo, pCheekMat);
    pRightCheek.scale.set(0.6, 0.35, 1);
    pRightCheek.position.set(-0.01, 0.185, -0.115);
    patientHead.add(pRightCheek);

    // Aksesori Spesifik 7 Karakter Pasien:
    const headBandageMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.222, 0.222, 0.09, 20),
      sterileWhiteMat
    );
    headBandageMesh.rotation.z = Math.PI / 2;
    headBandageMesh.position.set(0.08, 0.02, 0);
    patientHead.add(headBandageMesh);

    const blueCapMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.228, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    );
    blueCapMesh.position.set(0.06, 0.02, 0);
    patientHead.add(blueCapMesh);

    const eyePatchMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16),
      new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.3 })
    );
    eyePatchMesh.position.set(0.05, 0.2, 0.075);
    patientHead.add(eyePatchMesh);

    const throatWrapMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.035, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 })
    );
    throatWrapMesh.rotation.y = Math.PI / 2;
    throatWrapMesh.position.set(0.26, 0.1, 0);
    patientUpperBodyPivot.add(throatWrapMesh);

    const rightArmSlingMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.06, 0.36, 14),
      sterileWhiteMat
    );
    rightArmSlingMesh.rotation.z = Math.PI / 2;
    rightArmSlingMesh.position.set(0.02, 0.14, 0.28);
    patientUpperBodyPivot.add(rightArmSlingMesh);

    const patientWaveArm = new THREE.Group();
    patientWaveArm.position.set(0.05, 0.12, -0.26);
    const waveArmMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.34, 12),
      patientSkinMat
    );
    waveArmMesh.position.set(0, 0.15, 0);
    patientWaveArm.add(waveArmMesh);
    patientUpperBodyPivot.add(waveArmMesh.parent!);

    const bellyCompressMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    const bellyCompressMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.06, 24),
      bellyCompressMat
    );
    bellyCompressMesh.position.set(-0.08, 0.22, 0);
    patientUpperBodyPivot.add(bellyCompressMesh);

    const lowerBlanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.22, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.5 })
    );
    lowerBlanket.position.set(-0.42, 0.1, 0);
    lowerBlanket.castShadow = true;
    patientGroup.add(lowerBlanket);

    // =========================================================================
    // KAIN PUTIH PENUTUP PASIEN + SEDIKIT DARAH (TAMPIL SAAT OPERASI GAGAL)
    // =========================================================================
    const failedWhiteSheetGroup = new THREE.Group();
    failedWhiteSheetGroup.visible = false;

    const whiteClothMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
      metalness: 0.02,
    });

    // Bagian utama kain putih yang menutup tubuh pasien dari kaki hingga dada
    const whiteSheetBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.28, 0.62),
      whiteClothMat
    );
    whiteSheetBody.position.set(0.06, 0.16, 0);
    whiteSheetBody.castShadow = true;
    whiteSheetBody.receiveShadow = true;
    failedWhiteSheetGroup.add(whiteSheetBody);

    // Lekukan kain putih yang menutup bagian kepala pasien
    const whiteSheetHeadDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.245, 22, 20),
      whiteClothMat
    );
    whiteSheetHeadDome.scale.set(1.08, 0.92, 1.05);
    whiteSheetHeadDome.position.set(0.61, 0.21, 0);
    whiteSheetHeadDome.castShadow = true;
    failedWhiteSheetGroup.add(whiteSheetHeadDome);

    // Lipatan juntai kain putih di sisi kiri dan kanan kasur operasi
    const sheetSideDrapeGeo = new THREE.BoxGeometry(1.52, 0.16, 0.04);
    const sheetDrapeFront = new THREE.Mesh(sheetSideDrapeGeo, whiteClothMat);
    sheetDrapeFront.position.set(0.06, 0.08, 0.31);
    failedWhiteSheetGroup.add(sheetDrapeFront);

    const sheetDrapeBack = new THREE.Mesh(sheetSideDrapeGeo, whiteClothMat);
    sheetDrapeBack.position.set(0.06, 0.08, -0.31);
    failedWhiteSheetGroup.add(sheetDrapeBack);

    // Sedikit bercak darah merah pada kain putih di area dada/perut (tidak berlebihan)
    const sheetBloodMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.085, 0.008, 18),
      subtleBloodMat
    );
    sheetBloodMain.scale.set(1.25, 1, 0.9);
    sheetBloodMain.position.set(0.08, 0.305, 0.02);
    failedWhiteSheetGroup.add(sheetBloodMain);

    const sheetBloodSpot1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.036, 0.008, 14),
      subtleBloodMat
    );
    sheetBloodSpot1.position.set(0.19, 0.305, -0.05);
    failedWhiteSheetGroup.add(sheetBloodSpot1);

    const sheetBloodSpot2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.008, 12),
      subtleBloodMat
    );
    sheetBloodSpot2.position.set(-0.02, 0.305, 0.07);
    failedWhiteSheetGroup.add(sheetBloodSpot2);

    patientGroup.add(failedWhiteSheetGroup);
    let failedSheetCoverProgress = 0;

    const patientRig: PatientRig = {
      patientGroup,
      upperBodyPivot: patientUpperBodyPivot,
      torsoMesh: patientTorso,
      headGroup: patientHead,
      leftEye: pLeftEye,
      rightEye: pRightEye,
      leftBrow: pLeftBrow,
      rightBrow: pRightBrow,
      leftCheek: pLeftCheek,
      rightCheek: pRightCheek,
      cheekMat: pCheekMat,
      mouthMesh: pSmileMouth,
      waveArmPivot: patientWaveArm,
      bellyCompressMesh,
      currentState: 'wincing',
    };

    // =========================================================================
    // ALAT SPESIALIS RAMAH ANAK: MIKROSKOP OPTIK (KATARAK) & SCANNER NEURO (HIDROSEFALUS)
    // =========================================================================
    const eyeMicroscopeGroup = new THREE.Group();
    eyeMicroscopeGroup.position.set(0.55, 1.0, -0.58);
    const scopeArm = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.055, 12, 24, Math.PI * 1.1),
      sterileWhiteMat
    );
    scopeArm.position.set(0, 0.45, 0.25);
    scopeArm.rotation.y = Math.PI / 2;
    eyeMicroscopeGroup.add(scopeArm);

    const scopeLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.22, 18),
      new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3 })
    );
    scopeLens.position.set(0, 0.48, 0.56);
    eyeMicroscopeGroup.add(scopeLens);
    surgeryRoomGroup.add(eyeMicroscopeGroup);

    const neuroScannerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.11, 16, 36),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.4,
        roughness: 0.25,
      })
    );
    neuroScannerRing.rotation.y = Math.PI / 2;
    neuroScannerRing.position.set(0.68, 1.25, 0);
    surgeryRoomGroup.add(neuroScannerRing);

    // Sorot Lampu Fokus Operasi di Atas Pasien
    const healingBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const healingBeamCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.52, 1.35, 24, 1, true),
      healingBeamMat
    );
    healingBeamCone.position.set(0.05, 1.78, 0);
    surgeryRoomGroup.add(healingBeamCone);

    // =========================================================================
    // KARAKTER DOKTER BEDAH UTAMA & PERAWAT DI RUANG OPERASI
    // =========================================================================
    const mainDoctorRig = buildMedicalCharacterRig({
      role: 'doctor',
      withStethoscope: true,
      withSurgicalTool: true,
      shadowMat: contactShadowMat,
    });
    mainDoctorRig.root.position.set(0.05, 0, -0.78);
    surgeryRoomGroup.add(mainDoctorRig.root);

    const scrubNurseRig = buildMedicalCharacterRig({
      role: 'nurse',
      withStethoscope: false,
      withSurgicalTool: false,
      shadowMat: contactShadowMat,
    });
    scrubNurseRig.root.position.set(-0.88, 0, -0.58);
    scrubNurseRig.root.rotation.y = 0.55;
    surgeryRoomGroup.add(scrubNurseRig.root);

    // =========================================================================
    // LAMPU OPERASI GANTUNG GANDA (SURGICAL SHADOWLESS LAMP)
    // =========================================================================
    const lampEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 2.2,
      roughness: 0.12,
    });

    const createSurgicalDome = (
      offsetX: number,
      offsetZ: number,
      tiltZ: number
    ) => {
      const domeUnit = new THREE.Group();
      domeUnit.position.set(offsetX, 2.58, offsetZ);
      domeUnit.rotation.z = tiltZ;

      const ceilingArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.85, 12),
        chromeMat
      );
      ceilingArm.position.set(0, 0.45, 0);
      domeUnit.add(ceilingArm);

      const domeShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.48, 0.15, 24),
        sterileWhiteMat
      );
      domeUnit.add(domeShell);

      const ledLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.03, 24),
        lampEmissiveMat
      );
      ledLens.position.set(0, -0.068, 0);
      domeUnit.add(ledLens);

      return domeUnit;
    };

    const leftDome = createSurgicalDome(-0.58, 0.05, -0.18);
    const rightDome = createSurgicalDome(0.58, -0.15, 0.18);
    surgeryRoomGroup.add(leftDome);
    surgeryRoomGroup.add(rightDome);

    // =========================================================================
    // MONITOR DETAK JANTUNG EKG LIVE & PROGRES OPERASI
    // =========================================================================
    const ekgCanvas = document.createElement('canvas');
    ekgCanvas.width = 512;
    ekgCanvas.height = 320;
    const ekgCtx = ekgCanvas.getContext('2d')!;
    const ekgTexture = new THREE.CanvasTexture(ekgCanvas);
    ekgTexture.colorSpace = THREE.SRGBColorSpace;
    ekgTexture.anisotropy = maxAnisotropy;

    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(-1.72, 0, -0.45);
    monitorGroup.rotation.y = 0.48;
    surgeryRoomGroup.add(monitorGroup);

    const cartPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 1.38, 16),
      chromeMat
    );
    cartPillar.position.set(0, 0.72, -0.08);
    monitorGroup.add(cartPillar);

    const monitorBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.64, 0.12),
      darkSteelMat
    );
    monitorBezel.position.set(0, 1.56, 0);
    monitorGroup.add(monitorBezel);

    const screenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 0.54),
      new THREE.MeshBasicMaterial({ map: ekgTexture })
    );
    screenPlane.position.set(0, 1.56, 0.065);
    monitorGroup.add(screenPlane);

    const statusBarMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.8,
    });
    const statusLightBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.04),
      statusBarMat
    );
    statusLightBar.position.set(0, 1.9, 0.03);
    monitorGroup.add(statusLightBar);

    let monitorPulseTimer = 0;

    // =========================================================================
    // MEJA INSTRUMEN BEDAH MAYO LENGKAP (Pisau Bedah Cadangan, Gunting, Bengkok & Kasa)
    // =========================================================================
    const mayoStandGroup = new THREE.Group();
    mayoStandGroup.position.set(1.22, 0, -0.25);
    surgeryRoomGroup.add(mayoStandGroup);

    const mayoPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.98, 12),
      chromeMat
    );
    mayoPole.position.set(0, 0.49, 0);
    mayoStandGroup.add(mayoPole);

    const mayoTray = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.04, 0.48),
      chromeMat
    );
    mayoTray.position.set(0, 0.98, 0);
    mayoStandGroup.add(mayoTray);

    const mayoSterileCloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.015, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.5 })
    );
    mayoSterileCloth.position.set(0, 1.005, 0);
    mayoStandGroup.add(mayoSterileCloth);

    // Instrumen bedah di atas meja Mayo (Scalpel, Gunting Bedah, Bengkok & Kasa sedikit bernoda darah)
    for (let i = 0; i < 3; i++) {
      const toolOnTray = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.015, 0.022),
        chromeMat
      );
      toolOnTray.position.set(-0.14, 1.02, -0.1 + i * 0.08);
      mayoStandGroup.add(toolOnTray);
    }

    const kidneyDish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.065, 0.035, 16),
      chromeMat
    );
    kidneyDish.position.set(0.15, 1.03, 0.06);
    mayoStandGroup.add(kidneyDish);

    const dishBloodDrop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.012, 12),
      subtleBloodMat
    );
    dishBloodDrop.position.set(0.15, 1.042, 0.06);
    mayoStandGroup.add(dishBloodDrop);

    // =========================================================================
    // TIANG INFUS GANDA (CAIRAN SALINE & KANTONG TRANSFUSI DARAH MEDIS) + SUCTION PUMP
    // =========================================================================
    const ivPoleGroup = new THREE.Group();
    ivPoleGroup.position.set(1.52, 0, -0.82);
    surgeryRoomGroup.add(ivPoleGroup);

    const ivPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 1.9, 12),
      chromeMat
    );
    ivPole.position.set(0, 0.95, 0);
    ivPoleGroup.add(ivPole);

    // Kantong Infus Saline Biru
    const ivBagSaline = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.24, 0.055),
      glassMat
    );
    ivBagSaline.position.set(-0.1, 1.72, 0.05);
    ivPoleGroup.add(ivBagSaline);

    // Kantong Transfusi Darah Medis Merah (Menambah nuansa ruang bedah autentik)
    const ivBagBlood = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.22, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9,
      })
    );
    ivBagBlood.position.set(0.1, 1.72, 0.05);
    ivPoleGroup.add(ivBagBlood);

    // Tabung Suction Bedah Kecil di Samping Meja Operasi
    const suctionCanister = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.34, 16),
      glassMat
    );
    suctionCanister.position.set(-0.65, 0.22, 0.55);
    surgeryRoomGroup.add(suctionCanister);

    const suctionFluid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.082, 0.14, 16),
      subtleBloodMat
    );
    suctionFluid.position.set(-0.65, 0.14, 0.55);
    surgeryRoomGroup.add(suctionFluid);

    // =========================================================================
    // FUNGSI ANIMASI KARAKTER DOKTER & PERAWAT (TERMASUK GERAKAN AKTIF MEMBEDAH)
    // =========================================================================
    const animateMedicalRig = (
      rig: CharacterRig,
      mode: 'idle' | 'walk' | 'run' | 'operating' | 'celebrate' | 'shocked',
      elapsed: number,
      isNurse = false
    ) => {
      // Reset dasar
      rig.leftBrow.rotation.z = 0;
      rig.rightBrow.rotation.z = 0;
      rig.leftBrow.position.y = 0.095;
      rig.rightBrow.position.y = 0.095;
      rig.headGroup.position.y = 1.38;
      rig.headGroup.rotation.set(0, 0, 0);
      rig.root.rotation.x = 0;

      if (mode === 'walk') {
        const w = elapsed * 5.5;
        rig.leftLegPivot.rotation.x = Math.sin(w) * 0.48;
        rig.rightLegPivot.rotation.x = -Math.sin(w) * 0.48;
        rig.leftArmPivot.rotation.x = -Math.sin(w) * 0.42;
        rig.rightArmPivot.rotation.x = Math.sin(w) * 0.42;
        rig.leftArmPivot.rotation.y = 0;
        rig.rightArmPivot.rotation.y = 0;
        rig.leftArmPivot.rotation.z = 0;
        rig.rightArmPivot.rotation.z = 0;
        rig.root.position.y = Math.abs(Math.sin(w)) * 0.04;
      } else if (mode === 'run') {
        const r = elapsed * 11.0;
        rig.leftLegPivot.rotation.x = Math.sin(r) * 0.82;
        rig.rightLegPivot.rotation.x = -Math.sin(r) * 0.82;
        rig.leftArmPivot.rotation.x = -Math.sin(r) * 0.78 - 0.3;
        rig.rightArmPivot.rotation.x = Math.sin(r) * 0.78 - 0.3;
        rig.leftArmPivot.rotation.y = 0;
        rig.rightArmPivot.rotation.y = 0;
        rig.leftArmPivot.rotation.z = 0;
        rig.rightArmPivot.rotation.z = 0;
        rig.root.position.y = Math.abs(Math.sin(r)) * 0.08;
      } else if (mode === 'operating') {
        const op = elapsed * 4.6;
        rig.leftLegPivot.rotation.x = 0;
        rig.rightLegPivot.rotation.x = 0;

        if (isNurse) {
          // Perawat aktif membantu menyodorkan instrumen bedah & memantau pasien
          rig.root.rotation.x = 0.06;
          rig.rightArmPivot.rotation.x = -1.05 + Math.sin(op * 0.7) * 0.16;
          rig.rightArmPivot.rotation.y = -0.22 + Math.cos(op * 0.7) * 0.12;
          rig.rightArmPivot.rotation.z = -0.15;
          rig.leftArmPivot.rotation.x = -0.65 + Math.cos(op * 0.5) * 0.1;
          rig.leftArmPivot.rotation.z = 0.12;
          rig.headGroup.rotation.x = 0.18;
          rig.headGroup.rotation.y = -0.18 + Math.sin(op * 0.4) * 0.08;
        } else {
          // Dokter menunduk fokus ke meja operasi sambil menggerakkan pisau bedah & pinset secara presisi!
          rig.root.rotation.x = 0.11 + Math.sin(op * 0.5) * 0.025;

          // Tangan kanan memegang Scalpel (gerakan menyayat / menjahit presisi di atas area bedah)
          rig.rightArmPivot.rotation.x = -1.18 + Math.sin(op * 1.4) * 0.24;
          rig.rightArmPivot.rotation.y = -0.18 + Math.cos(op * 1.1) * 0.22;
          rig.rightArmPivot.rotation.z = -0.22 + Math.sin(op * 0.9) * 0.14;

          if (rig.toolMesh) {
            rig.toolMesh.rotation.z = Math.sin(op * 2.2) * 0.28;
            rig.toolMesh.rotation.x =
              Math.PI / 2.1 + Math.cos(op * 1.8) * 0.18;
          }

          // Tangan kiri memegang Pinset & Kasa (gerakan menyeka darah & menahan jaringan secara bergantian)
          rig.leftArmPivot.rotation.x = -1.12 + Math.cos(op * 1.2) * 0.22;
          rig.leftArmPivot.rotation.y = 0.2 + Math.sin(op * 0.95) * 0.18;
          rig.leftArmPivot.rotation.z = 0.22 - Math.cos(op * 0.8) * 0.12;

          // Kepala dokter fokus menatap area operasi pasien
          rig.headGroup.rotation.x = 0.28 + Math.sin(op * 0.7) * 0.05;
          rig.headGroup.rotation.y = Math.sin(op * 0.55) * 0.14;
          rig.headGroup.rotation.z = Math.cos(op * 0.55) * 0.04;
        }
        rig.root.position.y = 0;
        if (rig.maskMesh) rig.maskMesh.visible = true;
      } else if (mode === 'celebrate') {
        const cel = elapsed * 6.0;
        rig.leftLegPivot.rotation.x = 0;
        rig.rightLegPivot.rotation.x = 0;
        rig.leftArmPivot.rotation.x = -2.75 + Math.sin(cel) * 0.18;
        rig.rightArmPivot.rotation.x = -2.75 - Math.sin(cel) * 0.18;
        rig.leftArmPivot.rotation.y = 0;
        rig.rightArmPivot.rotation.y = 0;
        rig.leftArmPivot.rotation.z = 0.32;
        rig.rightArmPivot.rotation.z = -0.32;
        rig.root.position.y = Math.abs(Math.sin(cel)) * 0.09;
        if (rig.maskMesh) rig.maskMesh.visible = false;
      } else if (mode === 'shocked') {
        const sh = elapsed * 18.0;
        rig.leftBrow.position.y = 0.135;
        rig.rightBrow.position.y = 0.135;
        rig.leftBrow.rotation.z = 0.28;
        rig.rightBrow.rotation.z = -0.28;
        rig.leftArmPivot.rotation.x = -1.6;
        rig.rightArmPivot.rotation.x = -1.6;
        rig.leftArmPivot.rotation.y = 0;
        rig.rightArmPivot.rotation.y = 0;
        rig.leftArmPivot.rotation.z = 0.55;
        rig.rightArmPivot.rotation.z = -0.55;
        rig.headGroup.rotation.y = Math.sin(sh) * 0.15;
        rig.root.position.y = 0.04;
      } else {
        const id = elapsed * 2.2;
        rig.leftLegPivot.rotation.x = 0;
        rig.rightLegPivot.rotation.x = 0;
        rig.leftArmPivot.rotation.x = Math.sin(id) * 0.06;
        rig.rightArmPivot.rotation.x = -Math.sin(id) * 0.06;
        rig.leftArmPivot.rotation.y = 0;
        rig.rightArmPivot.rotation.y = 0;
        rig.leftArmPivot.rotation.z = 0.08;
        rig.rightArmPivot.rotation.z = -0.08;
        rig.root.position.y = 0;
        if (rig.maskMesh) rig.maskMesh.visible = true;
      }
    };

    // Fungsi Menggambar Layar Monitor EKG & Progres Operasi
    const drawEkgMonitor = (elapsed: number) => {
      const {
        lives: currLives,
        status: currStatus,
        category: currCat,
        numberA: numA,
        numberB: numB,
        patient: currPatient,
        surgeryProgress: prog,
        doctorReaction: reaction,
      } = stateRef.current;

      const isFailedFlatline = currLives <= 0 || currStatus === 'FAILED';
      ekgCtx.fillStyle = isFailedFlatline
        ? '#2a0404'
        : reaction === 'shocked'
          ? '#450a0a'
          : '#020617';
      ekgCtx.fillRect(0, 0, 512, 320);

      // Grid Medis
      ekgCtx.strokeStyle = isFailedFlatline
        ? 'rgba(239, 68, 68, 0.22)'
        : 'rgba(56, 189, 248, 0.18)';
      ekgCtx.lineWidth = 1;
      for (let x = 0; x < 512; x += 32) {
        ekgCtx.beginPath();
        ekgCtx.moveTo(x, 0);
        ekgCtx.lineTo(x, 320);
        ekgCtx.stroke();
      }
      for (let y = 0; y < 320; y += 32) {
        ekgCtx.beginPath();
        ekgCtx.moveTo(0, y);
        ekgCtx.lineTo(512, y);
        ekgCtx.stroke();
      }

      let traceColor = '#10b981';
      let statusLabel = 'STABIL';
      let bpm = 76;

      if (currStatus === 'SUCCESS') {
        traceColor = '#10b981';
        statusLabel = 'SEMBUH';
        bpm = 72;
        statusBarMat.color.setHex(0x10b981);
        statusBarMat.emissive.setHex(0x10b981);
      } else if (isFailedFlatline) {
        traceColor = '#ef4444';
        statusLabel = 'GARIS DATAR';
        bpm = 0;
        statusBarMat.color.setHex(0xdc2626);
        statusBarMat.emissive.setHex(0xdc2626);
      } else if (reaction === 'shocked') {
        traceColor = '#ef4444';
        statusLabel = 'PERINGATAN!';
        bpm = 148;
        statusBarMat.color.setHex(0xef4444);
        statusBarMat.emissive.setHex(0xef4444);
      } else if (currLives === 2) {
        traceColor = '#f59e0b';
        statusLabel = 'WASPADA';
        bpm = 104;
        statusBarMat.color.setHex(0xf59e0b);
        statusBarMat.emissive.setHex(0xf59e0b);
      } else if (currLives === 1) {
        traceColor = '#ef4444';
        statusLabel = 'SIAGA';
        bpm = 136;
        statusBarMat.color.setHex(0xef4444);
        statusBarMat.emissive.setHex(0xef4444);
      } else {
        statusBarMat.color.setHex(0x10b981);
        statusBarMat.emissive.setHex(0x10b981);
      }

      ekgCtx.fillStyle = '#e2e8f0';
      ekgCtx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
      ekgCtx.fillText(
        `${currPatient.patientName.toUpperCase()} · ${currPatient.conditionName.slice(0, 18)}`,
        18,
        32
      );

      ekgCtx.fillStyle = traceColor;
      ekgCtx.font = 'bold 19px "JetBrains Mono", monospace';
      ekgCtx.fillText(`${statusLabel} [${currLives}/3]`, 285, 32);

      // Kurva EKG (Garis Datar / Flatline penuh saat operasi gagal)
      const baseY = 135;
      if (isFailedFlatline) {
        // Efek pendar garis datar merah (Flatline)
        ekgCtx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ekgCtx.lineWidth = 12;
        ekgCtx.beginPath();
        ekgCtx.moveTo(20, baseY);
        ekgCtx.lineTo(492, baseY);
        ekgCtx.stroke();

        ekgCtx.strokeStyle = '#ef4444';
        ekgCtx.lineWidth = 5;
        ekgCtx.beginPath();
        ekgCtx.moveTo(20, baseY);
        ekgCtx.lineTo(492, baseY);
        ekgCtx.stroke();

        // Titik pindai jalan pada garis datar
        const flatCursorX = 20 + ((elapsed * 180) % 472);
        ekgCtx.fillStyle = '#fecaca';
        ekgCtx.beginPath();
        ekgCtx.arc(flatCursorX, baseY, 6, 0, Math.PI * 2);
        ekgCtx.fill();

        ekgCtx.fillStyle = '#fca5a5';
        ekgCtx.font = 'bold 16px "JetBrains Mono", monospace';
        ekgCtx.fillText(
          '⚠ FLATLINE — GARIS DATAR (OPERASI GAGAL)',
          72,
          baseY - 22
        );
      } else {
        ekgCtx.strokeStyle = traceColor;
        ekgCtx.lineWidth = 4;
        ekgCtx.beginPath();
        const speed = bpm > 0 ? (bpm / 60) * 3.2 : 0;

        for (let x = 20; x < 492; x += 3) {
          let y = baseY;
          if (bpm > 0) {
            const phase = ((x / 95 + elapsed * speed) % 1 + 1) % 1;
            if (phase > 0.42 && phase < 0.46) y -= 14;
            else if (phase >= 0.48 && phase < 0.51) y += 18;
            else if (phase >= 0.51 && phase < 0.55) y -= 64;
            else if (phase >= 0.55 && phase < 0.59) y += 24;
            else if (phase >= 0.65 && phase < 0.74) y -= 18;
          }
          if (x === 20) ekgCtx.moveTo(x, y);
          else ekgCtx.lineTo(x, y);
        }
        ekgCtx.stroke();
      }

      // Bar Progres Operasi di Monitor
      ekgCtx.fillStyle = '#1e293b';
      ekgCtx.fillRect(20, 208, 472, 26);
      ekgCtx.fillStyle = isFailedFlatline ? '#dc2626' : '#0ea5e9';
      ekgCtx.fillRect(20, 208, Math.max(8, (472 * prog) / 100), 26);

      ekgCtx.fillStyle = '#ffffff';
      ekgCtx.font = 'bold 15px "JetBrains Mono", monospace';
      ekgCtx.fillText(
        isFailedFlatline
          ? 'STATUS PASIEN: TERTUTUP KAIN PUTIH · GARIS DATAR'
          : `PROGRES OPERASI: ${Math.round(prog)}% · ANIM: ${patientRig.currentState.toUpperCase()}`,
        30,
        226
      );

      ekgCtx.fillStyle = '#38bdf8';
      ekgCtx.font = 'bold 20px "JetBrains Mono", monospace';
      ekgCtx.fillText(
        numA > 0 && numB > 0
          ? `MISI ${currCat}(${numA}, ${numB})`
          : `MISI ${currCat} (KEJUTAN ? & ?)`,
        20,
        282
      );

      ekgCtx.fillStyle = traceColor;
      ekgCtx.fillText(
        isFailedFlatline ? 'HR: 0 BPM (FLAT)' : `HR: ${bpm} BPM`,
        305,
        282
      );

      if (monitorPulseTimer > 0) {
        ekgCtx.strokeStyle = '#38bdf8';
        ekgCtx.lineWidth = 6;
        ekgCtx.strokeRect(4, 4, 504, 312);
      }

      ekgTexture.needsUpdate = true;
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Loop Animasi
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
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      const {
        status: currStatus,
        flowStage: currStage,
        cameraPreset: preset,
        patient: currPatient,
        surgeryProgress: prog,
        doctorReaction: reaction,
        doctorAnimOverride: animOverride,
      } = stateRef.current;

      // 1. Update Penampilan Spesifik 7 Karakter Pasien 3D & Area Bedah
      const app = currPatient.appearance3D;
      patientSkinMat.color.setHex(app.skinHex);
      patientHairMat.color.setHex(app.hairHex);
      patientPajamaMat.color.setHex(app.pajamaHex);
      stretcherMattress.material.color.setHex(app.pajamaHex);
      headBandageMesh.visible = Boolean(app.hasHeadBandage);
      blueCapMesh.visible = Boolean(app.hasBlueCap);
      eyePatchMesh.visible =
        Boolean(app.hasEyePatch) && currStatus !== 'SUCCESS';
      throatWrapMesh.visible =
        Boolean(app.hasThroatWrap) && currStatus !== 'SUCCESS';
      rightArmSlingMesh.visible =
        Boolean(app.hasRightArmSling) && currStatus !== 'SUCCESS';
      bellyCompressMesh.visible =
        Boolean(app.hasBellyCompress) && currStatus !== 'SUCCESS';
      eyeMicroscopeGroup.visible = Boolean(app.usesEyeMicroscope);
      neuroScannerRing.visible = Boolean(app.usesNeuroScanner);

      // Update Area Bedah, Kain Putih Saat Gagal & Sedikit Tetesan Darah
      const isHealed = currStatus === 'SUCCESS';
      const isFailedSurgery =
        currStatus === 'FAILED' || stateRef.current.lives <= 0;

      if (isFailedSurgery) {
        failedWhiteSheetGroup.visible = true;
        failedSheetCoverProgress = Math.min(
          1,
          failedSheetCoverProgress + dt * 1.8
        );
        // Animasi kain putih ditarik menutup tubuh hingga kepala pasien dengan lembut
        const easeCover =
          1 - Math.pow(1 - failedSheetCoverProgress, 3);
        failedWhiteSheetGroup.scale.set(
          0.25 + easeCover * 0.75,
          0.85 + easeCover * 0.15,
          1
        );
        failedWhiteSheetGroup.position.set(
          -0.48 * (1 - easeCover),
          (1 - easeCover) * 0.12,
          0
        );
        // Sembunyikan tubuh pasien di bawah kain putih setelah kain menutup penuh
        patientUpperBodyPivot.visible = easeCover < 0.72;
        lowerBlanket.visible = easeCover < 0.72;
        incisionLine.visible = false;
        healedBandagePatch.visible = false;
        bloodDroplets.forEach((drop) => {
          drop.visible = false;
        });
        // Pompa ventilator berhenti saat garis datar (flatline)
        ventilatorBellows.scale.set(1, 0.35, 1);
      } else {
        failedSheetCoverProgress = 0;
        failedWhiteSheetGroup.visible = false;
        patientUpperBodyPivot.visible = true;
        lowerBlanket.visible = true;

        incisionLine.visible = !isHealed;
        healedBandagePatch.visible = isHealed;
        bloodDroplets.forEach((drop, idx) => {
          if (isHealed) {
            drop.visible = false;
          } else {
            drop.visible = true;
            // Denyut mikro pada titik darah saat dokter mengoperasi dan dibersihkan kasa
            const pulse =
              0.85 + Math.sin(elapsed * 4.2 + idx * 1.7) * 0.25;
            drop.scale.set(pulse, 0.55, pulse);
          }
        });

        // Animasi Pompa Ventilator Mesin Anestesi di Ruang Bedah
        const ventScale = 0.65 + (Math.sin(elapsed * 3.2) * 0.5 + 0.5) * 0.45;
        ventilatorBellows.scale.set(1, ventScale, 1);
      }

      // 2. Animasi Matahari, Awan Putih, Helikopter & Sirine Ambulans di Eksterior
      sunRaysGroup.rotation.z = elapsed * 0.22;
      const sunPulse = 1 + Math.sin(elapsed * 2.0) * 0.04;
      sunGlowHalo.scale.setScalar(sunPulse);

      skyClouds.forEach((c, idx) => {
        c.group.position.x =
          c.baseX + Math.sin(elapsed * c.speed + idx) * c.amp;
        c.group.position.y =
          c.baseY + Math.cos(elapsed * (c.speed * 0.8) + idx) * 0.18;
      });

      heliRotor.rotation.y = elapsed * 10;
      const sirenFlash = Math.sin(elapsed * 16) > 0;
      sirenRedMat.emissiveIntensity = sirenFlash ? 3.2 : 0.3;
      sirenBlueMat.emissiveIntensity = sirenFlash ? 0.3 : 3.2;

      // 3. Koreografi Alur Rumah Sakit 3D (Eksterior vs Alur Kedatangan vs Ruang Operasi)
      const isExteriorStage =
        currStatus === 'MENU' ||
        currStage === 'EXTERIOR_IDLE' ||
        currStage === 'AMBULANCE_ARRIVING' ||
        currStage === 'PATIENT_UNLOADING' ||
        currStage === 'ENTERING_HOSPITAL' ||
        preset === 'exterior';

      if (currStatus === 'MENU' || currStage === 'EXTERIOR_IDLE') {
        const loopCycle = (elapsed * 0.45) % (Math.PI * 2);
        ambulanceGroup.position.x = Math.sin(loopCycle) * 3.8;
        ambulanceGroup.position.z = 3.6;
        wheels.forEach((w) => {
          w.rotation.z = -elapsed * 4;
        });

        const doorOpenAmount = Math.max(0, Math.cos(loopCycle)) * 0.85;
        autoDoorLeft.position.x = -0.74 - doorOpenAmount;
        autoDoorRight.position.x = 0.74 + doorOpenAmount;

        exteriorStretcherGroup.visible = true;
        exteriorStretcherGroup.position.set(
          Math.cos(loopCycle * 0.5) * 1.1,
          0,
          1.65
        );

        exteriorDoctorRig.root.position.set(
          Math.cos(loopCycle * 0.5) * 1.1 - 0.85,
          0,
          1.65
        );
        exteriorDoctorRig.root.rotation.y =
          Math.sin(loopCycle * 0.5) > 0 ? -Math.PI / 2 : Math.PI / 2;
        animateMedicalRig(exteriorDoctorRig, 'walk', elapsed);
        animateMedicalRig(exteriorNurseRig, 'idle', elapsed, true);
      } else if (currStage === 'AMBULANCE_ARRIVING') {
        const targetX = 0.6;
        ambulanceGroup.position.x = THREE.MathUtils.lerp(
          ambulanceGroup.position.x,
          targetX,
          dt * 3.2
        );
        wheels.forEach((w) => {
          w.rotation.z -= dt * 9;
        });
        exteriorStretcherGroup.visible = false;
        autoDoorLeft.position.x = THREE.MathUtils.lerp(
          autoDoorLeft.position.x,
          -0.74,
          dt * 4
        );
        autoDoorRight.position.x = THREE.MathUtils.lerp(
          autoDoorRight.position.x,
          0.74,
          dt * 4
        );
        exteriorDoctorRig.root.position.set(-1.8, 0, 2.2);
        exteriorDoctorRig.root.rotation.y = Math.PI / 2;
        animateMedicalRig(exteriorDoctorRig, 'run', elapsed);
        animateMedicalRig(exteriorNurseRig, 'run', elapsed, true);
      } else if (currStage === 'PATIENT_UNLOADING') {
        ambulanceGroup.position.x = 0.6;
        exteriorStretcherGroup.visible = true;
        exteriorStretcherGroup.position.set(-1.35, 0, 2.8);
        exteriorStretcherGroup.rotation.y = Math.PI / 2;
        exteriorDoctorRig.root.position.set(-1.35, 0, 3.65);
        exteriorDoctorRig.root.rotation.y = Math.PI;
        animateMedicalRig(exteriorDoctorRig, 'walk', elapsed);
        animateMedicalRig(exteriorNurseRig, 'walk', elapsed, true);
      } else if (currStage === 'ENTERING_HOSPITAL') {
        autoDoorLeft.position.x = THREE.MathUtils.lerp(
          autoDoorLeft.position.x,
          -1.65,
          dt * 5
        );
        autoDoorRight.position.x = THREE.MathUtils.lerp(
          autoDoorRight.position.x,
          1.65,
          dt * 5
        );
        exteriorStretcherGroup.visible = true;
        exteriorStretcherGroup.rotation.y = Math.PI / 2;
        exteriorStretcherGroup.position.x = THREE.MathUtils.lerp(
          exteriorStretcherGroup.position.x,
          0,
          dt * 4
        );
        exteriorStretcherGroup.position.z = THREE.MathUtils.lerp(
          exteriorStretcherGroup.position.z,
          0.3,
          dt * 3.5
        );
        exteriorDoctorRig.root.position.set(
          exteriorStretcherGroup.position.x,
          0,
          exteriorStretcherGroup.position.z + 0.85
        );
        exteriorDoctorRig.root.rotation.y = Math.PI;
        animateMedicalRig(exteriorDoctorRig, 'run', elapsed);
      }

      // 4. Animasi Karakter Dokter, Perawat, Pasien & Pencahayaan di Ruang Operasi
      let activeDoctorMode:
        | 'idle'
        | 'walk'
        | 'run'
        | 'operating'
        | 'celebrate'
        | 'shocked' = 'operating';

      if (animOverride !== 'auto') {
        activeDoctorMode =
          animOverride === 'prep' ? 'operating' : animOverride;
      } else if (currStatus === 'SUCCESS' || reaction === 'celebrate') {
        activeDoctorMode = 'celebrate';
      } else if (currStatus === 'FAILED' || reaction === 'shocked') {
        activeDoctorMode = 'shocked';
      } else if (currStage === 'DOCTOR_PREP' || currStage === 'MATH_SURGERY') {
        activeDoctorMode = 'operating';
      }

      animateMedicalRig(mainDoctorRig, activeDoctorMode, elapsed, false);
      animateMedicalRig(
        scrubNurseRig,
        currStatus === 'SUCCESS'
          ? 'celebrate'
          : reaction === 'shocked' || currStatus === 'FAILED'
            ? 'shocked'
            : 'operating',
        elapsed,
        true
      );

      updatePatientAnimation(patientRig, {
        status: currStatus,
        lives: stateRef.current.lives,
        surgeryProgress: prog,
        initialExpression: currPatient.initialExpression,
        doctorReaction: reaction,
        elapsed,
        dt,
      });

      // Efek Pencahayaan Ruangan & Sorot Lampu Bedah sesuai kondisi Operasi
      if (currStatus === 'FAILED') {
        surgicalRoomLight.color.setHex(0xef4444);
        surgicalRoomLight.intensity = 2.8 + Math.sin(elapsed * 10) * 1.2;
        lampEmissiveMat.emissive.setHex(0xef4444);
        healingBeamMat.opacity = 0;
      } else if (reaction === 'shocked') {
        surgicalRoomLight.color.setHex(0xf97316);
        surgicalRoomLight.intensity = 3.4;
        lampEmissiveMat.emissive.setHex(0xf97316);
      } else if (currStatus === 'SUCCESS') {
        surgicalRoomLight.color.setHex(0x34d399);
        surgicalRoomLight.intensity = 3.4;
        lampEmissiveMat.emissive.setHex(0x6ee7b7);
        healingBeamMat.color.setHex(0x34d399);
        healingBeamMat.opacity = 0.25 + Math.sin(elapsed * 4) * 0.08;
      } else {
        surgicalRoomLight.color.setHex(0xffffff);
        surgicalRoomLight.intensity = 3.2;
        lampEmissiveMat.emissive.setHex(0xfef08a);
        healingBeamMat.color.setHex(0xfef08a);
        healingBeamMat.opacity =
          prog > 0 ? 0.1 + (prog / 100) * 0.22 : 0.08;
      }

      // 5. Penentuan Target Kamera (Responsif untuk Halaman Depan, Alur Ambulans, & Ruang Operasi)
      if (
        isExteriorStage &&
        preset !== 'table' &&
        preset !== 'monitor' &&
        preset !== 'doctor'
      ) {
        if (currStage === 'AMBULANCE_ARRIVING') {
          _targetCamPos.set(3.2, 3.2, 22.5);
          _targetLookAt.set(0.4, 1.3, 17.2);
        } else if (currStage === 'PATIENT_UNLOADING') {
          _targetCamPos.set(-2.6, 2.7, 21.2);
          _targetLookAt.set(-0.8, 1.1, 16.5);
        } else if (currStage === 'ENTERING_HOSPITAL') {
          _targetCamPos.set(0, 2.5, 19.5);
          _targetLookAt.set(0, 1.3, 14.0);
        } else {
          // Panorama Halaman Depan Rumah Sakit 3D (Menampilkan Gedung, Taman, Awan & Matahari Cerah)
          _targetCamPos.set(
            Math.sin(elapsed * 0.25) * 2.2,
            4.8,
            24.5 + Math.cos(elapsed * 0.25) * 0.8
          );
          _targetLookAt.set(0, 3.1, 13.5);
        }
      } else if (preset === 'monitor') {
        _targetCamPos.set(-0.9, 1.72, 1.45);
        _targetLookAt.set(-1.68, 1.52, -0.45);
      } else if (preset === 'doctor') {
        _targetCamPos.set(0.15, 1.68, 1.75);
        _targetLookAt.set(0.05, 1.28, -0.75);
      } else if (preset === 'table') {
        _targetCamPos.set(0.15, 2.35, 2.55);
        _targetLookAt.set(0.05, 0.72, 0);
      } else {
        // Sudut Ruang Operasi Utama: Memproyeksikan Dokter, Perawat, Monitor, Peralatan Bedah & Pasien di paruh atas layar
        const isPortraitMobile = container.clientWidth < 768;
        _targetCamPos.set(
          Math.sin(elapsed * 0.3) * 0.22 + (isPortraitMobile ? 1.55 : 1.75),
          isPortraitMobile ? 2.45 : 2.32,
          isPortraitMobile ? 4.25 : 3.65
        );
        _targetLookAt.set(-0.12, isPortraitMobile ? 0.58 : 0.8, -0.2);
      }

      if (monitorPulseTimer > 0) {
        monitorPulseTimer = Math.max(0, monitorPulseTimer - dt);
        const pulseScale = 1 + Math.sin(monitorPulseTimer * 18) * 0.045;
        monitorBezel.scale.set(pulseScale, pulseScale, 1);
        screenPlane.scale.set(pulseScale, pulseScale, 1);
        statusBarMat.emissiveIntensity = 3.2;
      } else {
        monitorBezel.scale.set(1, 1, 1);
        screenPlane.scale.set(1, 1, 1);
        statusBarMat.emissiveIntensity = 1.6;
      }

      const dampFactor = 1 - Math.exp(-3.8 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      drawEkgMonitor(elapsed);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    // Raycaster untuk interaksi langsung pada Monitor Detak Jantung 3D selama operasi
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const monitorInteractMeshes: THREE.Object3D[] = [
      monitorBezel,
      screenPlane,
      statusLightBar,
      cartPillar,
    ];

    const handlePointerDown = (ev: PointerEvent) => {
      if (!container || isDisposed) return;
      const targetEl = ev.target as HTMLElement | null;
      if (
        targetEl &&
        targetEl.closest('button, input, select, textarea, a, form')
      ) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(monitorInteractMeshes, false);
      if (hits.length > 0) {
        monitorPulseTimer = 0.65;
        const {
          status: currStatus,
          lives: currLives,
          surgeryProgress: prog,
          doctorReaction: reaction,
          onMonitorInteract,
        } = stateRef.current;

        if (currStatus === 'SUCCESS' || prog >= 100) {
          soundEngine.playSuccessChime();
        } else if (
          currStatus === 'FAILED' ||
          currLives <= 1 ||
          reaction === 'shocked'
        ) {
          soundEngine.playMedicalBleep('critical');
        } else if (currLives === 2) {
          soundEngine.playMedicalBleep('warning');
        } else {
          soundEngine.playMedicalBleep('normal');
        }

        if (onMonitorInteract) {
          onMonitorInteract();
        }
      }
    };

    const handleResize = () => {
      if (!container || isDisposed) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('pointerdown', handlePointerDown);
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
      floorTex.dispose();
      xrayTex.dispose();
      shadowTex.dispose();
      signTex.dispose();
      ekgTexture.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const showFallback2D = webglFallback || forceFallback2D;
  const fallbackAnimState = resolvePatientAnimationState({
    status,
    lives,
    surgeryProgress,
    doctorReaction,
  });

  const isExteriorView =
    status === 'MENU' ||
    flowStage === 'EXTERIOR_IDLE' ||
    flowStage === 'AMBULANCE_ARRIVING' ||
    flowStage === 'PATIENT_UNLOADING' ||
    flowStage === 'ENTERING_HOSPITAL' ||
    cameraPreset === 'exterior';

  return (
    <>
      <div
        ref={mountRef}
        className={`fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none z-0 ${
          showFallback2D ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* MODE FALLBACK 2D INTERAKTIF (Aktif otomatis jika perangkat tidak mendukung WebGL 3D atau saat diuji) */}
      {showFallback2D && (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0 bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 flex flex-col items-center justify-start pt-11 sm:pt-14 px-3 select-none">
          {isExteriorView ? (
            <div className="w-full max-w-3xl bg-slate-900/90 border-2 border-sky-500/40 rounded-2xl p-4 shadow-2xl text-white">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-extrabold tracking-wide text-sky-300">
                    RS PENDIDIKAN SDN 66 BANDA ACEH (MODE RINGAN 2D)
                  </span>
                </div>
                <span className="text-[11px] font-mono bg-sky-950 border border-sky-700 px-2 py-0.5 rounded text-sky-200">
                  Kompatibilitas Semua Perangkat
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center py-2">
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center">
                  <div className="text-2xl sm:text-3xl mb-1">🏥</div>
                  <div className="text-xs font-extrabold text-white">
                    Gedung IGD &amp; Helipad
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Pintu Otomatis Siaga
                  </div>
                </div>
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center">
                  <div className="text-2xl sm:text-3xl mb-1">🚑</div>
                  <div className="text-xs font-extrabold text-amber-300">
                    Ambulans Medis
                  </div>
                  <div className="text-[10px] text-slate-300">
                    {flowStage === 'AMBULANCE_ARRIVING'
                      ? 'Sedang Tiba di Lobi...'
                      : 'Siap Menjemput Pasien'}
                  </div>
                </div>
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 flex flex-col items-center justify-center">
                  <div className="text-2xl sm:text-3xl mb-1">👨‍⚕️👩‍⚕️</div>
                  <div className="text-xs font-extrabold text-emerald-300">
                    Tim Dokter Bedah
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Misi {category} Siap
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Monitor EKG 2D Interaktif */}
              <button
                type="button"
                onClick={() => {
                  if (status === 'SUCCESS' || surgeryProgress >= 100) {
                    soundEngine.playSuccessChime();
                  } else if (
                    status === 'FAILED' ||
                    lives <= 1 ||
                    doctorReaction === 'shocked'
                  ) {
                    soundEngine.playMedicalBleep('critical');
                  } else if (lives === 2) {
                    soundEngine.playMedicalBleep('warning');
                  } else {
                    soundEngine.playMedicalBleep('normal');
                  }
                  if (onMonitorInteract) onMonitorInteract();
                }}
                className="sm:col-span-5 bg-slate-950/95 border-2 border-sky-500/60 hover:border-sky-400 rounded-2xl p-3 text-left text-white shadow-xl cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="font-bold text-sky-300">
                    MONITOR EKG 2D (KLIK BUNYI)
                  </span>
                  <span
                    className={`font-extrabold px-1.5 py-0.5 rounded ${
                      status === 'SUCCESS'
                        ? 'bg-emerald-900 text-emerald-300'
                        : lives <= 1 || status === 'FAILED'
                          ? 'bg-rose-900 text-rose-300'
                          : lives === 2
                            ? 'bg-amber-900 text-amber-300'
                            : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    NYAWA {lives}/3
                  </span>
                </div>
                <div className="h-10 w-full bg-slate-900 rounded-lg border border-slate-800 flex items-center px-3 overflow-hidden">
                  <svg
                    viewBox="0 0 240 40"
                    className={`w-full h-8 stroke-current fill-none ${
                      status === 'FAILED' || lives <= 0
                        ? 'text-rose-500'
                        : 'text-emerald-400'
                    }`}
                  >
                    {status === 'FAILED' || lives <= 0 ? (
                      <polyline strokeWidth="3.5" points="0,20 240,20" />
                    ) : (
                      <polyline
                        strokeWidth="2.5"
                        points="0,20 35,20 45,10 55,32 65,4 75,35 85,18 110,20 145,20 155,10 165,32 175,4 185,35 195,18 240,20"
                      />
                    )}
                  </svg>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span>
                    MISI: {category}({numberA}, {numberB})
                  </span>
                  <span
                    className={`font-bold ${
                      status === 'FAILED' || lives <= 0
                        ? 'text-rose-400'
                        : 'text-sky-300'
                    }`}
                  >
                    {status === 'FAILED' || lives <= 0
                      ? 'GARIS DATAR (0 BPM)'
                      : `PROGRES: ${surgeryProgress}%`}
                  </span>
                </div>
              </button>

              {/* Area Karakter Dokter, Perawat & Pasien 2D */}
              <div className="sm:col-span-7 bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-3 text-white shadow-xl flex items-center justify-around gap-2">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl">
                    {doctorReaction === 'celebrate' || status === 'SUCCESS'
                      ? '🙌👨‍⚕️'
                      : doctorReaction === 'shocked' || status === 'FAILED'
                        ? '😮👨‍⚕️'
                        : '👨‍⚕️🩺'}
                  </div>
                  <div className="text-xs font-extrabold text-sky-300 mt-1">
                    Dokter Bedah
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {doctorReaction === 'celebrate' || status === 'SUCCESS'
                      ? 'Merayakan!'
                      : doctorReaction === 'shocked' || status === 'FAILED'
                        ? 'Terkejut!'
                        : 'Mengoperasi'}
                  </div>
                </div>

                <div className="text-center px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-600">
                  <div className="text-3xl sm:text-4xl">
                    {status === 'FAILED' || lives <= 0
                      ? '🏳️🩸'
                      : fallbackAnimState === 'smiling'
                        ? '😊👋'
                        : fallbackAnimState === 'critical'
                          ? '😵‍💫🚨'
                          : fallbackAnimState === 'relaxed'
                            ? '😌🛏️'
                            : '😣🩹'}
                  </div>
                  <div className="text-xs font-extrabold text-white mt-1">
                    {patient.patientName}
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold">
                    {status === 'FAILED' || lives <= 0
                      ? 'Tertutup Kain Putih (Sedikit Darah)'
                      : `${patient.conditionName} (${fallbackAnimState.toUpperCase()})`}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl sm:text-4xl">👩‍⚕️📋</div>
                  <div className="text-xs font-extrabold text-emerald-300 mt-1">
                    Perawat Medis
                  </div>
                  <div className="text-[10px] text-slate-400">Siaga Bantu</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
