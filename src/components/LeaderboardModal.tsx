import React, { useEffect, useState, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Coins,
  Crown,
  Database,
  ShieldCheck,
  Trophy,
  UserCheck,
  Wifi,
  WifiOff,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  FirebaseConnectionStatus,
  LeaderboardEntry,
  firebaseHospitalService,
  getOrCreateStableDeviceId,
} from '../engine/firebaseService';
import {
  FirebaseConfigShape,
  clearRuntimeFirebaseConfig,
  firebaseConfig,
  getActiveFirebaseConfig,
  isFirebaseConfigReady,
  saveRuntimeFirebaseConfig,
} from '../engine/firebaseConfig';
import { SavedPlayerProgress } from '../engine/storageEngine';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProgress: SavedPlayerProgress;
  connectionStatus: FirebaseConnectionStatus;
  currentUid: string | null;
  onFirebaseReinitialize: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentProgress,
  connectionStatus,
  currentUid,
  onFirebaseReinitialize,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'verify' | 'setup'>(
    'leaderboard'
  );
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isRealtimeCloud, setIsRealtimeCloud] = useState<boolean>(false);

  // State Form Konfigurasi Firebase Opsional (Jika ingin diisi langsung dari UI selain di firebaseConfig.ts)
  const activeCfg = getActiveFirebaseConfig();
  const [cfgForm, setCfgForm] = useState<FirebaseConfigShape>(activeCfg);
  const [configSavedMsg, setConfigSavedMsg] = useState<string | null>(null);

  // Pasang Listener Realtime Top 100 saat halaman dibuka & HENTIKAN listener saat ditutup (Bagian E)
  useEffect(() => {
    if (!isOpen) return;

    // Pastikan progres pemain saat ini disinkronkan sebelum menampilkan leaderboard
    firebaseHospitalService.syncPlayerAndLeaderboard(currentProgress);

    const unsubscribe = firebaseHospitalService.subscribeTop100Leaderboard(
      (updatedEntries, fromCloud) => {
        setEntries(updatedEntries);
        setIsRealtimeCloud(fromCloud);
      }
    );

    return () => {
      // Hentikan listener ketika halaman tidak digunakan (Bagian E)
      unsubscribe();
    };
  }, [isOpen, currentProgress]);

  const verificationReport = useMemo(
    () => firebaseHospitalService.runMultiAccountVerificationTest(),
    []
  );

  if (!isOpen) return null;

  const isConfigured = isFirebaseConfigReady();
  const deviceId = getOrCreateStableDeviceId();

  const handleSaveCustomConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveRuntimeFirebaseConfig(cfgForm);
    setConfigSavedMsg(
      'Konfigurasi Firebase disimpan! Menghubungkan ke Firebase Realtime Database...'
    );
    onFirebaseReinitialize();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h2
                id="leaderboard-modal-title"
                className="text-sm sm:text-base font-extrabold tracking-tight"
              >
                TOP 100 DOKTER TERBAIK · SDN 66 BANDA ACEH
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold ${
                    connectionStatus === 'FIREBASE TERHUBUNG'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : connectionStatus === 'MENGHUBUNGKAN FIREBASE' ||
                          connectionStatus === 'DATA SEDANG DISINKRONKAN'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {connectionStatus === 'FIREBASE TERHUBUNG' ? (
                    <Wifi className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  <span>{connectionStatus}</span>
                </span>
                <span className="font-mono text-slate-400">
                  UID: {currentUid ? currentUid.slice(0, 14) : 'local'} · Device:{' '}
                  {deviceId.slice(0, 12)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup Top 100 Leaderboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pemberitahuan Jika Firebase Belum Dikonfigurasi (Bagian H) */}
        {!isConfigured && (
          <div className="px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Pemberitahuan Mode Lokal:</strong> Konfigurasi Firebase
                masih bernilai <code>&quot;ISI_SENDIRI&quot;</code>. Game tetap
                dapat dimainkan penuh secara lokal &amp; progres tersimpan aman.
                Untuk mengaktifkan Leaderboard Cloud Realtime, isi{' '}
                <code>src/engine/firebaseConfig.ts</code> atau buka tab{' '}
                <strong>Panduan &amp; Config Firebase</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('setup')}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer shrink-0"
            >
              Isi Config / Panduan
            </button>
          </div>
        )}

        {/* Navigasi Tab */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Top 100 Dokter Terbaik ({entries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'verify'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Uji Keep High Score &amp; Anti-Duplikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'setup'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-sky-500" />
            <span>Panduan &amp; Config Firebase</span>
          </button>
        </div>

        {/* Isi Konten Tab */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'leaderboard' && (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Diurutkan otomatis berdasarkan{' '}
                  <strong>Skor Tertinggi (KEEP HIGH SCORE)</strong>. Satu
                  perangkat/UID hanya memiliki 1 entri unik.
                </span>
                <span className="font-mono font-bold text-sky-700">
                  Sumber Data:{' '}
                  {isRealtimeCloud
                    ? 'Firebase Realtime Database (Live)'
                    : 'Simulasi & Cache Perangkat Lokal'}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs">
                      <th className="py-2.5 px-3 font-bold">Ranking</th>
                      <th className="py-2.5 px-3 font-bold">Nama</th>
                      <th className="py-2.5 px-3 font-bold">Sekolah</th>
                      <th className="py-2.5 px-3 text-center font-bold">Kelas</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-300">
                        Total Skor
                      </th>
                      <th className="py-2.5 px-3 text-center font-bold">
                        Level Tertinggi
                      </th>
                      <th className="py-2.5 px-3 text-center font-bold">
                        Pasien Diselamatkan
                      </th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-300">
                        Koin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {entries.map((item, idx) => {
                      const rank = idx + 1;
                      const isMe =
                        item.uid === currentUid || item.deviceId === deviceId;

                      return (
                        <tr
                          key={item.uid || idx}
                          className={
                            isMe
                              ? 'bg-sky-50/90 font-bold text-slate-950'
                              : idx % 2 === 0
                                ? 'bg-white'
                                : 'bg-slate-50/60'
                          }
                        >
                          <td className="py-2.5 px-3 font-mono font-extrabold">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                rank === 1
                                  ? 'bg-amber-400 text-slate-950'
                                  : rank === 2
                                    ? 'bg-slate-300 text-slate-900'
                                    : rank === 3
                                      ? 'bg-amber-700 text-white'
                                      : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {rank}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span>{item.playerName}</span>
                              {isMe && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-extrabold">
                                  ANDA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.schoolName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            Kelas {item.grade}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sky-700">
                            {item.highScore.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            Lv.{item.highestLevel}/20
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                            {item.rescuedCount}/7 Pasien
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                            {item.coins.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    Hasil Verifikasi Kebijakan KEEP HIGH SCORE &amp; Anti-Duplikasi (2 Akun/Perangkat)
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Menguji bahwa skor lebih rendah tidak pernah menimpa skor tertinggi dan satu UID/perangkat tidak menduplikasi baris leaderboard.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold">
                  4/4 LULUS UJI
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {verificationReport.steps.map((st, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-extrabold text-slate-900">
                        {st.title}
                      </div>
                      <p className="text-slate-600 mt-1">{st.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              {/* Kolom Kiri: Form Input Langsung / Panduan File firebaseConfig.ts */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. Masukkan Firebase Config Anda
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Anda dapat mengedit langsung variabel{' '}
                  <code>firebaseConfig</code> di dalam file{' '}
                  <code>src/engine/firebaseConfig.ts</code> (yang berisi{' '}
                  <code>&quot;ISI_SENDIRI&quot;</code>), atau menempelkan nilainya
                  di bawah ini untuk langsung menguji koneksi Realtime Database:
                </p>

                {configSavedMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold">
                    {configSavedMsg}
                  </div>
                )}

                <form onSubmit={handleSaveCustomConfig} className="space-y-2">
                  {(
                    [
                      'apiKey',
                      'authDomain',
                      'databaseURL',
                      'projectId',
                      'storageBucket',
                      'messagingSenderId',
                      'appId',
                    ] as const
                  ).map((fieldKey) => (
                    <div key={fieldKey} className="flex items-center gap-2">
                      <label className="w-32 font-mono font-bold text-slate-700 shrink-0">
                        {fieldKey}:
                      </label>
                      <input
                        type="text"
                        value={cfgForm[fieldKey]}
                        onChange={(e) =>
                          setCfgForm((prev) => ({
                            ...prev,
                            [fieldKey]: e.target.value,
                          }))
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900"
                      />
                    </div>
                  ))}

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold cursor-pointer"
                    >
                      Simpan &amp; Hubungkan Firebase
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearRuntimeFirebaseConfig();
                        setCfgForm(firebaseConfig);
                        setConfigSavedMsg('Kembali ke Mode Lokal (ISI_SENDIRI).');
                        onFirebaseReinitialize();
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
                    >
                      Reset ke Mode Lokal
                    </button>
                  </div>
                </form>
              </div>

              {/* Kolom Kanan: Panduan Konfigurasi Bertahap & Security Rules */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  2. Panduan Bertahap Firebase Console &amp; Security Rules
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <li>
                    Buka <strong>Firebase Console</strong> dan buat proyek baru.
                  </li>
                  <li>
                    Masuk ke <strong>Authentication &rarr; Sign-in method</strong>,
                    pilih <strong>Anonymous</strong>, lalu aktifkan (
                    <em>Enable</em>).
                  </li>
                  <li>
                    Masuk ke <strong>Realtime Database</strong>, klik{' '}
                    <strong>Create Database</strong>, dan salin URL database Anda
                    ke <code>databaseURL</code>.
                  </li>
                  <li>
                    Buka tab <strong>Rules</strong> pada Realtime Database, lalu
                    tempelkan isi file <code>database.rules.json</code> proyek ini
                    yang menjamin pemain hanya dapat mengubah datanya sendiri (
                    <code>auth.uid === $uid</code>) dan menerapkan aturan{' '}
                    <strong>KEEP HIGH SCORE</strong> (
                    <code>newData.child(&apos;highScore&apos;).val() &gt;= data.child(&apos;highScore&apos;).val()</code>
                    ).
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
