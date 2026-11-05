/**
 * KATALOG 7 KARAKTER PASIEN & SIMULASI MEDIS RAMAH ANAK (TAHAP 2)
 * 3D HOSPITAL SURGERY – MISI DOKTER CILIK FPB & KPK
 * MEDIA PEMBELAJARAN SDN 66 BANDA ACEH
 */

export type PatientConditionId =
  | 'apendisitis'
  | 'batu_empedu'
  | 'hernia'
  | 'amandel'
  | 'katarak'
  | 'patah_tulang'
  | 'hidrosefalus';

export interface PatientCharacterProfile {
  id: PatientConditionId;
  orderNumber: number;
  conditionName: string;
  medicalTerm: string;
  patientName: string;
  fictionalAge: string;
  avatarUrl: string;
  actionReferenceUrl: string;
  symptomSummary: string;
  childFriendlyProcedure: string;
  initialExpression: 'meringis' | 'cemas' | 'lemas' | 'memegang_pipi';
  /** Warna piyama dan aksesori 3D untuk model karakter pasien 3D */
  appearance3D: {
    skinHex: number;
    hairHex: number;
    pajamaHex: number;
    accentHex: number;
    hasHeadBandage?: boolean;
    hasBlueCap?: boolean;
    hasRightArmSling?: boolean;
    hasEyePatch?: boolean;
    hasThroatWrap?: boolean;
    hasBellyCompress?: boolean;
    usesEyeMicroscope?: boolean;
    usesNeuroScanner?: boolean;
  };
  recommendedPairs: {
    FPB: [number, number];
    KPK: [number, number];
  };
}

export const PATIENT_CHARACTERS: PatientCharacterProfile[] = [
  {
    id: 'apendisitis',
    orderNumber: 1,
    conditionName: 'Apendisitis (Radang Usus Buntu)',
    medicalTerm: 'Appendicitis Akut Ringan',
    patientName: 'Pasien Rania',
    fictionalAge: '9 Tahun (Kelas 3 SD)',
    avatarUrl: '/assets/aistudio/pasien_apendisitis_bead5b1d.jpg',
    actionReferenceUrl: '/assets/aistudio/tindakan_bedah_5de9b088.jpg',
    symptomSummary:
      'Mengalami nyeri pada perut kanan bawah dan membutuhkan terapi sinar penyembuh usus buntu ramah anak.',
    childFriendlyProcedure:
      'Kalibrasi terapi gelombang ultrasonik lembut pada area perut kanan bawah.',
    initialExpression: 'meringis',
    appearance3D: {
      skinHex: 0xfcd5b5,
      hairHex: 0x5c3a21,
      pajamaHex: 0x5eead4,
      accentHex: 0xf472b6,
      hasBellyCompress: true,
    },
    recommendedPairs: {
      FPB: [24, 36],
      KPK: [12, 18],
    },
  },
  {
    id: 'batu_empedu',
    orderNumber: 2,
    conditionName: 'Batu Empedu',
    medicalTerm: 'Cholelithiasis',
    patientName: 'Pasien Pak Darmawan',
    fictionalAge: '42 Tahun (Wali Murid)',
    avatarUrl: '/assets/aistudio/pasien_batu_empedu_15c7424a.jpg',
    actionReferenceUrl: '/assets/aistudio/konsep_dokter_bedah_d68db962.jpg',
    symptomSummary:
      'Kantung empedu tersumbat kristal mineral kecil sehingga perlu dihancurkan dengan gelombang suara medis.',
    childFriendlyProcedure:
      'Peluruhan kristal empedu dengan sinar akustik presisi tanpa luka.',
    initialExpression: 'cemas',
    appearance3D: {
      skinHex: 0xf5cba7,
      hairHex: 0xd6d3d1,
      pajamaHex: 0x34d399,
      accentHex: 0xfacc15,
      hasBellyCompress: true,
    },
    recommendedPairs: {
      FPB: [18, 30],
      KPK: [8, 12],
    },
  },
  {
    id: 'hernia',
    orderNumber: 3,
    conditionName: 'Hernia',
    medicalTerm: 'Hernia Inguinalis Ringan',
    patientName: 'Pasien Dinda',
    fictionalAge: '11 Tahun (Kelas 5 SD)',
    avatarUrl: '/assets/aistudio/pasien_hernia_2c45a50b.jpg',
    actionReferenceUrl: '/assets/aistudio/dokter_membedah_pasien_2_567dcef3.jpg',
    symptomSummary:
      'Otot dinding perut melemah saat berolahraga sehingga perlu diperkuat dengan plester penyangga bio-medis.',
    childFriendlyProcedure:
      'Pemasangan sabuk penguat jaringan otot perut dengan robot medis.',
    initialExpression: 'cemas',
    appearance3D: {
      skinHex: 0xfde2c8,
      hairHex: 0xf59e0b,
      pajamaHex: 0xf472b6,
      accentHex: 0x38bdf8,
      hasBellyCompress: true,
    },
    recommendedPairs: {
      FPB: [48, 60],
      KPK: [15, 20],
    },
  },
  {
    id: 'amandel',
    orderNumber: 4,
    conditionName: 'Pembesaran Amandel',
    medicalTerm: 'Tonsilitis Kronis',
    patientName: 'Pasien Putri',
    fictionalAge: '7 Tahun (Kelas 1 SD)',
    avatarUrl: '/assets/aistudio/pasien_amandel_c8ad528d.jpg',
    actionReferenceUrl: '/assets/aistudio/dokter_membedah_pasien_3_90120849.jpg',
    symptomSummary:
      'Amandel di tenggorokan membengkak karena radang sehingga sulit menelan es krim dan makanan.',
    childFriendlyProcedure:
      'Penyemprotan kabut dingin antiseptik untuk mengecilkan amandel dengan nyaman.',
    initialExpression: 'memegang_pipi',
    appearance3D: {
      skinHex: 0xfcd5b5,
      hairHex: 0x451a03,
      pajamaHex: 0x60a5fa,
      accentHex: 0xf472b6,
      hasThroatWrap: true,
    },
    recommendedPairs: {
      FPB: [16, 24],
      KPK: [6, 9],
    },
  },
  {
    id: 'katarak',
    orderNumber: 5,
    conditionName: 'Katarak',
    medicalTerm: 'Katarak Kongenital / Lensa Keruh',
    patientName: 'Pasien Adik Lutfi',
    fictionalAge: '10 Tahun (Kelas 4 SD)',
    avatarUrl: '/assets/aistudio/pasien_katarak_7bf7be77.jpg',
    actionReferenceUrl: '/assets/aistudio/pasien_katarak_7bf7be77.jpg',
    symptomSummary:
      'Pandangan mata berkabut seperti jendela berembun sehingga memerlukan pembersihan lensa optik mikro.',
    childFriendlyProcedure:
      'Penyinaran mikroskop optik lembut agar lensa mata kembali bening bercahaya.',
    initialExpression: 'cemas',
    appearance3D: {
      skinHex: 0xf5cba7,
      hairHex: 0x292524,
      pajamaHex: 0x2dd4bf,
      accentHex: 0x38bdf8,
      hasEyePatch: true,
      usesEyeMicroscope: true,
    },
    recommendedPairs: {
      FPB: [20, 30],
      KPK: [10, 15],
    },
  },
  {
    id: 'patah_tulang',
    orderNumber: 6,
    conditionName: 'Patah Tulang',
    medicalTerm: 'Fraktur Radius Lengan Kanan',
    patientName: 'Pasien Budi',
    fictionalAge: '10 Tahun (Kelas 4 SD)',
    avatarUrl: '/assets/aistudio/pasien_patah_tulang_c1a304fa.jpg',
    actionReferenceUrl: '/assets/aistudio/pasien_patah_tulang_c1a304fa.jpg',
    symptomSummary:
      'Tulang lengan kanan retak setelah terjatuh saat bermain sepeda dan membutuhkan penyambung gips pintar.',
    childFriendlyProcedure:
      'Penyelarasan tulang lengan dengan gips kalsium pintar dan terapi cahaya.',
    initialExpression: 'meringis',
    appearance3D: {
      skinHex: 0xfde2c8,
      hairHex: 0x3f2305,
      pajamaHex: 0x86efac,
      accentHex: 0xffffff,
      hasHeadBandage: true,
      hasRightArmSling: true,
    },
    recommendedPairs: {
      FPB: [36, 54],
      KPK: [16, 24],
    },
  },
  {
    id: 'hidrosefalus',
    orderNumber: 7,
    conditionName: 'Hidrosefalus',
    medicalTerm: 'Hydrocephalus Terkontrol',
    patientName: 'Pasien Zaki',
    fictionalAge: '6 Tahun (Kelas 1 SD)',
    avatarUrl: '/assets/aistudio/pasien_hidrosefalus_93460424.jpg',
    actionReferenceUrl: '/assets/aistudio/dokter_membedah_pasien_3_90120849.jpg',
    symptomSummary:
      'Penumpukan cairan di rongga kepala yang perlu dialirkan secara teratur menggunakan katup pintar mikro.',
    childFriendlyProcedure:
      'Kalibrasi katup pintar pengatur aliran cairan pelindung otak secara presisi.',
    initialExpression: 'lemas',
    appearance3D: {
      skinHex: 0xfcd5b5,
      hairHex: 0x451a03,
      pajamaHex: 0xfef08a,
      accentHex: 0x38bdf8,
      hasBlueCap: true,
      usesNeuroScanner: true,
    },
    recommendedPairs: {
      FPB: [28, 42],
      KPK: [18, 24],
    },
  },
];

export function getPatientById(id: PatientConditionId): PatientCharacterProfile {
  return (
    PATIENT_CHARACTERS.find((p) => p.id === id) || PATIENT_CHARACTERS[0]
  );
}

export function getPatientByIndex(index: number): PatientCharacterProfile {
  const safeIdx = Math.abs(Math.trunc(index)) % PATIENT_CHARACTERS.length;
  return PATIENT_CHARACTERS[safeIdx];
}
