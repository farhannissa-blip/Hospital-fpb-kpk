/**
 * SISTEM PENYIMPANAN PROGRES PEMAIN (TAHAP 3 - BAGIAN D, E, F)
 * Menyimpan progres ke localStorage dengan struktur dokumen yang siap dihubungkan ke Firebase Firestore:
 * - Nama dokter, Sekolah, Kelas
 * - Level FPB (1-20) & Level KPK (1-20)
 * - Skor & Koin (100 skor = 10 koin, 500 skor = 50 koin, 1.000 skor = 100 koin)
 * - Tahapan Rumah Mewah (1: Rumah Sederhana .. 5: Mansion Kerajaan)
 * - Barang Toko Upgrade yang sudah dibeli (8 item)
 * - Pasien yang sudah diselamatkan
 */

import { MathCategory } from './mathEngine';
import { PatientConditionId } from './patientCatalog';

export type HouseTierId = 1 | 2 | 3 | 4 | 5;

export type HouseUpgradeItemId =
  | 'kolam_renang'
  | 'mobil_mewah'
  | 'garasi'
  | 'taman'
  | 'dekorasi'
  | 'ruang_bermain'
  | 'helipad'
  | 'pesawat_pribadi';

export interface HouseTierDefinition {
  tier: HouseTierId;
  name: string;
  subtitle: string;
  coinCost: number;
  previewImage: string;
  badgeColor: string;
  description: string;
}

export interface HouseUpgradeItemDefinition {
  id: HouseUpgradeItemId;
  name: string;
  categoryLabel: string;
  coinCost: number;
  description: string;
  cameraFocus: 'overview' | 'pool_garden' | 'garage_car' | 'sky_aviation';
}

export const HOUSE_TIERS: HouseTierDefinition[] = [
  {
    tier: 1,
    name: '1. Rumah Sederhana',
    subtitle: 'Rumah Dinas Dokter Muda',
    coinCost: 0, // Terbuka sejak awal
    previewImage: '/assets/aistudio/upgrade_rumah_mewah_2_c332a23d.jpg',
    badgeColor: 'bg-slate-700 text-slate-100',
    description:
      'Rumah asri yang nyaman sebagai tempat tinggal awal Dokter Cilik SDN 66 Banda Aceh.',
  },
  {
    tier: 2,
    name: '2. Rumah Modern',
    subtitle: 'Hunian Kaca & Kayu Minimalis 2 Lantai',
    coinCost: 120,
    previewImage: '/assets/aistudio/upgrade_rumah_mewah_2_c332a23d.jpg',
    badgeColor: 'bg-sky-600 text-white',
    description:
      'Rumah modern 2 lantai dengan balkon kaca panoramik, pilar elegan, dan pencahayaan hangat.',
  },
  {
    tier: 3,
    name: '3. Rumah Mewah',
    subtitle: 'Kediaman Spesialis Bedah Bertingkat',
    coinCost: 280,
    previewImage: '/assets/aistudio/upgrade_rumah_mewah_1b4a033c.jpg',
    badgeColor: 'bg-emerald-600 text-white',
    description:
      'Rumah mewah putih bertingkat tiga dengan teras bertangga megah, dek santai, dan pohon palem.',
  },
  {
    tier: 4,
    name: '4. Vila Premium',
    subtitle: 'Vila Resor Tropis Eksklusif',
    coinCost: 500,
    previewImage: '/assets/aistudio/upgrade_rumah_mewah_1b4a033c.jpg',
    badgeColor: 'bg-purple-600 text-white',
    description:
      'Vila premium bergaya resor dengan sayap bangunan ganda, sky-lounge atap, dan taman tropis.',
  },
  {
    tier: 5,
    name: '5. Mansion Kerajaan',
    subtitle: 'Istana Megah Dokter Ahli Utama',
    coinCost: 850,
    previewImage: '/assets/aistudio/upgrade_rumah_mewah_1b4a033c.jpg',
    badgeColor: 'bg-amber-500 text-slate-950',
    description:
      'Mansion kerajaan termegah dengan kubah emas, pilar marmer, menara kembar, dan kompleks lengkap!',
  },
];

export const HOUSE_UPGRADE_ITEMS: HouseUpgradeItemDefinition[] = [
  {
    id: 'taman',
    name: 'Taman',
    categoryLabel: 'Eksterior Asri',
    coinCost: 60,
    description:
      'Taman tropis dengan pohon palem, semak bunga warna-warni, air mancur, dan jalur batu alam.',
    cameraFocus: 'pool_garden',
  },
  {
    id: 'dekorasi',
    name: 'Dekorasi',
    categoryLabel: 'Ornamen & Lampu',
    coinCost: 80,
    description:
      'Lampu taman kristal, kursi santai tepi teras, payung resor, dan patung monumen kesehatan.',
    cameraFocus: 'overview',
  },
  {
    id: 'garasi',
    name: 'Garasi',
    categoryLabel: 'Bangunan Otomotif',
    coinCost: 110,
    description:
      'Garasi modern berpintu kaca otomatis dengan kanopi LED di sisi kanan rumah mewah.',
    cameraFocus: 'garage_car',
  },
  {
    id: 'ruang_bermain',
    name: 'Ruang Bermain',
    categoryLabel: 'Wahana & Olahraga',
    coinCost: 140,
    description:
      'Area bermain ceria lengkap dengan perosotan, ayunan, trampolin, dan lapangan basket mini.',
    cameraFocus: 'pool_garden',
  },
  {
    id: 'kolam_renang',
    name: 'Kolam Renang',
    categoryLabel: 'Akuatik Mewah',
    coinCost: 180,
    description:
      'Kolam renang infinity biru berkilau dengan air beranimasi, papan loncat, dan lampu bawah air.',
    cameraFocus: 'pool_garden',
  },
  {
    id: 'mobil_mewah',
    name: 'Mobil Mewah',
    categoryLabel: 'Kendaraan Sultan',
    coinCost: 240,
    description:
      'Supercar sport merah metalik & sedan eksekutif emas yang terparkir gagah di depan garasi.',
    cameraFocus: 'garage_car',
  },
  {
    id: 'helipad',
    name: 'Helipad',
    categoryLabel: 'Landasan Udara',
    coinCost: 320,
    description:
      'Landasan helipad berlampu suar lengkap dengan helikopter pribadi Dokter Spesialis.',
    cameraFocus: 'sky_aviation',
  },
  {
    id: 'pesawat_pribadi',
    name: 'Pesawat Pribadi',
    categoryLabel: 'Jet Eksekutif',
    coinCost: 480,
    description:
      'Jet pribadi mewah putih-emas di landasan VIP samping mansion dengan mesin beranimasi!',
    cameraFocus: 'sky_aviation',
  },
];

export interface SavedPlayerProgress {
  version: number;
  updatedAt: string;
  // Identitas Pemain
  playerName: string;
  schoolName: string;
  grade: number;
  lastCategory: MathCategory;
  // Sistem Level Terpisah (Minimal 20 Level per Kategori)
  fpbCurrentLevel: number;
  fpbUnlockedLevel: number;
  fpbCompletedLevels: number[];
  kpkCurrentLevel: number;
  kpkUnlockedLevel: number;
  kpkCompletedLevels: number[];
  // Sistem Skor & Koin
  totalScore: number;
  coins: number;
  // My Dream House & Toko Upgrade
  houseTier: HouseTierId;
  purchasedItems: HouseUpgradeItemId[];
  // Daftar Pasien yang Sudah Diselamatkan
  rescuedPatients: PatientConditionId[];
  totalOperationsSucceeded: number;
}

const STORAGE_KEY = 'sdn66_hospital_surgery_progress_v3';

export const DEFAULT_PLAYER_PROGRESS: SavedPlayerProgress = {
  version: 3,
  updatedAt: new Date().toISOString(),
  playerName: 'Dokter Cilik Ahmad',
  schoolName: 'SDN 66 Banda Aceh',
  grade: 4,
  lastCategory: 'FPB',
  fpbCurrentLevel: 1,
  fpbUnlockedLevel: 1,
  fpbCompletedLevels: [],
  kpkCurrentLevel: 1,
  kpkUnlockedLevel: 1,
  kpkCompletedLevels: [],
  totalScore: 0,
  coins: 0,
  houseTier: 1,
  purchasedItems: [],
  rescuedPatients: [],
  totalOperationsSucceeded: 0,
};

/**
 * Konversi Skor ke Koin sesuai rumus Tahap 3 Bagian C:
 * 100 skor = 10 koin
 * 500 skor = 50 koin
 * 1.000 skor = 100 koin
 */
export function convertScoreToCoins(scoreAmount: number): number {
  if (scoreAmount <= 0) return 0;
  return Math.floor(scoreAmount / 10);
}

/**
 * Adapter Penyimpanan Terstruktur (LocalStorage + Siap Integrasi Firebase Firestore)
 */
export class PlayerProgressRepository {
  public static load(): SavedPlayerProgress {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_PLAYER_PROGRESS };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_PLAYER_PROGRESS };
      }
      const parsed = JSON.parse(raw) as Partial<SavedPlayerProgress>;
      return {
        ...DEFAULT_PLAYER_PROGRESS,
        ...parsed,
        fpbCurrentLevel: Math.min(20, Math.max(1, Number(parsed.fpbCurrentLevel) || 1)),
        fpbUnlockedLevel: Math.min(20, Math.max(1, Number(parsed.fpbUnlockedLevel) || 1)),
        fpbCompletedLevels: Array.isArray(parsed.fpbCompletedLevels)
          ? parsed.fpbCompletedLevels
          : [],
        kpkCurrentLevel: Math.min(20, Math.max(1, Number(parsed.kpkCurrentLevel) || 1)),
        kpkUnlockedLevel: Math.min(20, Math.max(1, Number(parsed.kpkUnlockedLevel) || 1)),
        kpkCompletedLevels: Array.isArray(parsed.kpkCompletedLevels)
          ? parsed.kpkCompletedLevels
          : [],
        totalScore: Math.max(0, Number(parsed.totalScore) || 0),
        coins: Math.max(0, Number(parsed.coins) || 0),
        houseTier: ([1, 2, 3, 4, 5].includes(Number(parsed.houseTier))
          ? Number(parsed.houseTier)
          : 1) as HouseTierId,
        purchasedItems: Array.isArray(parsed.purchasedItems)
          ? parsed.purchasedItems
          : [],
        rescuedPatients: Array.isArray(parsed.rescuedPatients)
          ? parsed.rescuedPatients
          : [],
        totalOperationsSucceeded: Math.max(
          0,
          Number(parsed.totalOperationsSucceeded) || 0
        ),
      };
    } catch {
      return { ...DEFAULT_PLAYER_PROGRESS };
    }
  }

  public static save(progress: SavedPlayerProgress): SavedPlayerProgress {
    const updated: SavedPlayerProgress = {
      ...progress,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Abaikan jika kuota localStorage penuh
      }
    }
    return updated;
  }

  /**
   * Mengekspor payload JSON terstruktur yang siap disimpan ke koleksi `players/{uid}` di Firebase Firestore
   */
  public static toFirebaseDocument(progress: SavedPlayerProgress): Record<string, unknown> {
    return {
      ...progress,
      syncedAt: new Date().toISOString(),
    };
  }
}

/**
 * Transaksi Pembelian Item Toko Upgrade (Atomik: tidak mengurangi koin jika gagal)
 */
export function purchaseUpgradeItemTransaction(
  currentProgress: SavedPlayerProgress,
  itemId: HouseUpgradeItemId
): {
  success: boolean;
  message: string;
  updatedProgress: SavedPlayerProgress;
} {
  const itemDef = HOUSE_UPGRADE_ITEMS.find((i) => i.id === itemId);
  if (!itemDef) {
    return {
      success: false,
      message: 'Barang tidak ditemukan di katalog toko.',
      updatedProgress: currentProgress,
    };
  }

  if (currentProgress.purchasedItems.includes(itemId)) {
    return {
      success: false,
      message: `${itemDef.name} sudah dimiliki dan terpasang pada rumah Anda!`,
      updatedProgress: currentProgress,
    };
  }

  if (currentProgress.coins < itemDef.coinCost) {
    const shortage = itemDef.coinCost - currentProgress.coins;
    return {
      success: false,
      message: `Koin belum mencukupi! Harga ${itemDef.name} adalah ${itemDef.coinCost} koin (kurang ${shortage} koin). Selesaikan operasi FPB/KPK untuk mendapatkan koin tambahan!`,
      updatedProgress: currentProgress,
    };
  }

  const nextProgress: SavedPlayerProgress = {
    ...currentProgress,
    coins: currentProgress.coins - itemDef.coinCost,
    purchasedItems: [...currentProgress.purchasedItems, itemId],
  };

  const saved = PlayerProgressRepository.save(nextProgress);
  return {
    success: true,
    message: `Pembelian berhasil! ${itemDef.name} telah dibangun di My Dream House Anda (-${itemDef.coinCost} Koin).`,
    updatedProgress: saved,
  };
}

/**
 * Transaksi Upgrade Tahapan Rumah Mewah (1 -> 5) (Atomik: tidak mengurangi koin jika gagal)
 */
export function upgradeHouseTierTransaction(
  currentProgress: SavedPlayerProgress,
  targetTier: HouseTierId
): {
  success: boolean;
  message: string;
  updatedProgress: SavedPlayerProgress;
} {
  const tierDef = HOUSE_TIERS.find((t) => t.tier === targetTier);
  if (!tierDef) {
    return {
      success: false,
      message: 'Tahapan rumah tidak valid.',
      updatedProgress: currentProgress,
    };
  }

  if (currentProgress.houseTier >= targetTier) {
    return {
      success: false,
      message: `Anda sudah memiliki ${tierDef.name} atau tahapan yang lebih tinggi!`,
      updatedProgress: currentProgress,
    };
  }

  if (currentProgress.coins < tierDef.coinCost) {
    const shortage = tierDef.coinCost - currentProgress.coins;
    return {
      success: false,
      message: `Koin belum mencukupi untuk membangun ${tierDef.name}! Butuh ${tierDef.coinCost} koin (kurang ${shortage} koin).`,
      updatedProgress: currentProgress,
    };
  }

  const nextProgress: SavedPlayerProgress = {
    ...currentProgress,
    coins: currentProgress.coins - tierDef.coinCost,
    houseTier: targetTier,
  };

  const saved = PlayerProgressRepository.save(nextProgress);
  return {
    success: true,
    message: `Selamat! Rumah Anda berhasil ditingkatkan menjadi ${tierDef.name} (-${tierDef.coinCost} Koin)!`,
    updatedProgress: saved,
  };
}
