/**
 * ============================================================================
 * KONFIGURASI FIREBASE (TAHAP 4 – BAGIAN A)
 * 3D HOSPITAL SURGERY – SDN 66 BANDA ACEH
 * ============================================================================
 *
 * PETUNJUK PENGISIAN:
 * Silakan ganti nilai "ISI_SENDIRI" di bawah ini dengan konfigurasi proyek
 * Firebase Anda dari Firebase Console (Project Settings -> General -> Your apps).
 *
 * Jika masih bernilai "ISI_SENDIRI", game akan otomatis berjalan dalam
 * MODE LOKAL (Offline-First) menggunakan localStorage sehingga permainan
 * tetap dapat dimainkan sepenuhnya tanpa error.
 */

export interface FirebaseConfigShape {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseConfigShape = {
  apiKey: "AIzaSyChb1EiHSjeb4bTUcmx-fXBGbRC4K5BCKs",
  authDomain: "hospital-fpb-kpk.firebaseapp.com",
  databaseURL: "https://hospital-fpb-kpk-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hospital-fpb-kpk",
  storageBucket: "hospital-fpb-kpk.firebasestorage.app",
  messagingSenderId: "714411930641",
  appId: "1:714411930641:web:2c9393e6e3451e0a3c2db0",
  measurementId: "G-CE4WRYTNRT"
};

const RUNTIME_CONFIG_STORAGE_KEY = 'sdn66_custom_firebase_config_v4';

/**
 * Mengambil konfigurasi Firebase aktif (mendukung pengisian langsung di kode
 * maupun pengujian konfigurasi melalui panel UI aplikasi).
 */
export function getActiveFirebaseConfig(): FirebaseConfigShape {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FirebaseConfigShape>;
        if (
          parsed.apiKey &&
          parsed.apiKey !== 'ISI_SENDIRI' &&
          parsed.databaseURL &&
          parsed.databaseURL !== 'ISI_SENDIRI' &&
          parsed.projectId &&
          parsed.projectId !== 'ISI_SENDIRI'
        ) {
          return {
            apiKey: parsed.apiKey,
            authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
            databaseURL: parsed.databaseURL,
            projectId: parsed.projectId,
            storageBucket: parsed.storageBucket || `${parsed.projectId}.appspot.com`,
            messagingSenderId: parsed.messagingSenderId || '',
            appId: parsed.appId || '',
            measurementId: parsed.measurementId || firebaseConfig.measurementId,
          };
        }
      }
    } catch {
      // Abaikan jika gagal membaca localStorage
    }
  }
  return firebaseConfig;
}

export function saveRuntimeFirebaseConfig(config: FirebaseConfigShape): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
}

export function clearRuntimeFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
  }
}

/**
 * Memeriksa apakah Firebase sudah dikonfigurasi dengan kredensial asli
 * (bukan placeholder "ISI_SENDIRI").
 */
export function isFirebaseConfigReady(
  cfg: FirebaseConfigShape = getActiveFirebaseConfig()
): boolean {
  return Boolean(
    cfg.apiKey &&
      cfg.apiKey.trim() !== '' &&
      cfg.apiKey !== 'ISI_SENDIRI' &&
      cfg.databaseURL &&
      cfg.databaseURL.trim() !== '' &&
      cfg.databaseURL !== 'ISI_SENDIRI' &&
      cfg.projectId &&
      cfg.projectId.trim() !== '' &&
      cfg.projectId !== 'ISI_SENDIRI'
  );
}
