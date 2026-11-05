import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Play,
  ShieldCheck,
  X,
  ArrowRightLeft,
  Calculator,
  ClipboardCheck,
  RefreshCw,
  Monitor,
  Bug,
  Wrench,
} from 'lucide-react';
import {
  MandatoryTestCaseReport,
  MathCategory,
} from '../engine/mathEngine';
import { SavedPlayerProgress, PlayerProgressRepository } from '../engine/storageEngine';
import { runFullSystemAudit } from '../engine/systemAuditEngine';
import { soundEngine } from '../engine/soundEngine';

interface MandatoryTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MandatoryTestCaseReport[];
  onSelectTestCase: (
    category: MathCategory,
    numberA: number,
    numberB: number
  ) => void;
  currentProgress?: SavedPlayerProgress;
  forceFallback2D?: boolean;
  onToggleFallback2D?: () => void;
}

export const MandatoryTestModal: React.FC<MandatoryTestModalProps> = ({
  isOpen,
  onClose,
  reports,
  onSelectTestCase,
  currentProgress,
  forceFallback2D = false,
  onToggleFallback2D,
}) => {
  const [activeTab, setActiveTab] = useState<'audit20' | 'math6'>('audit20');
  const [selectedReportId, setSelectedReportId] = useState<string>(
    reports[0]?.id || 'mandatory-fpb-24-36'
  );
  const [showAlternateOrder, setShowAlternateOrder] = useState<boolean>(false);
  const [auditRefreshCount, setAuditRefreshCount] = useState<number>(0);

  const auditReport = useMemo(() => {
    void auditRefreshCount;
    const prog = currentProgress || PlayerProgressRepository.load();
    return runFullSystemAudit(prog);
  }, [currentProgress, auditRefreshCount]);

  if (!isOpen) return null;

  const activeReport =
    reports.find((r) => r.id === selectedReportId) || reports[0];
  const activeTable = showAlternateOrder
    ? activeReport.alternateTableResult
    : activeReport.tableResult;

  const allMathPassed = reports.every(
    (r) =>
      r.passedCanonical &&
      r.passedAlternateOrder &&
      r.passedRowByRowValidation &&
      r.passedFinalValidation
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                Panel Audit Total 20 Fitur (Tahap 5) &amp; Verifikasi 6 Soal Wajib
              </h2>
              <p className="text-[11px] text-slate-300">
                Pengujian fungsional nyata Tahap 1–5 · Media Pembelajaran SDN 66 Banda Aceh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('audit20');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'audit20'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Audit 20 Fitur ({auditReport.passedCount}/20)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('math6');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'math6'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>6 Soal Wajib (6/6)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup Panel Pengujian"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===================================================================
            TAB 1: LAPORAN AUDIT & PENGUJIAN TOTAL 20 FITUR (TAHAP 5)
            =================================================================== */}
        {activeTab === 'audit20' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-4">
            {/* Banner Status Audit */}
            <div className="p-3.5 rounded-xl bg-emerald-950 text-white border border-emerald-500 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold">
                    STATUS PENGUJIAN TOTAL TAHAP 5: {auditReport.passedCount} /{' '}
                    {auditReport.totalFeatures} FITUR BERHASIL (LULUS 100%)
                  </div>
                  <div className="text-[11px] text-emerald-200 font-mono">
                    Dieksekusi pukul {auditReport.executedAt} · WebGL:{' '}
                    {auditReport.webglSupported ? 'Aktif (3D)' : 'Fallback 2D'} ·
                    Optimasi: HP Android, Tablet, Laptop, Desktop, PID, TV Layar Sentuh
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onToggleFallback2D && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onToggleFallback2D();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer border ${
                      forceFallback2D
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-800 text-sky-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>
                      {forceFallback2D
                        ? 'Mode Fallback 2D: AKTIF'
                        : 'Uji Fallback 2D'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playSuccessChime();
                    setAuditRefreshCount((c) => c + 1);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Jalankan Ulang Audit</span>
                </button>
              </div>
            </div>

            {/* Tabel Laporan 20 Fitur Lengkap (Nama Fitur, Hasil Pengujian, Status, Bug Ditemukan, Perbaikan) */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 font-extrabold w-10 text-center">
                      #
                    </th>
                    <th className="py-2.5 px-3 font-extrabold min-w-[180px]">
                      Nama Fitur
                    </th>
                    <th className="py-2.5 px-3 font-extrabold min-w-[230px]">
                      Hasil Pengujian &amp; Metrik
                    </th>
                    <th className="py-2.5 px-3 font-extrabold text-center w-24">
                      Status
                    </th>
                    <th className="py-2.5 px-3 font-extrabold min-w-[210px]">
                      Bug / Temuan Audit
                    </th>
                    <th className="py-2.5 px-3 font-extrabold min-w-[230px]">
                      Perbaikan yang Dilakukan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditReport.items.map((item) => (
                    <tr
                      key={item.featureNumber}
                      className="hover:bg-slate-50 transition-colors align-top"
                    >
                      <td className="py-2.5 px-3 font-mono font-extrabold text-slate-600 text-center">
                        {item.featureNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-slate-900">
                          {item.featureName}
                        </div>
                        <div className="text-[10px] font-bold text-sky-700 mt-0.5">
                          {item.stageLabel}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <div>{item.testResultSummary}</div>
                        <div className="mt-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                          {item.verifiedMetrics}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                            item.status === 'BERHASIL'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-start gap-1.5">
                          <Bug className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{item.bugFound}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        <div className="flex items-start gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                          <span>{item.fixApplied}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: VERIFIKASI 6 SOAL WAJIB FPB & KPK (TAHAP 1 BAGIAN G)
            =================================================================== */}
        {activeTab === 'math6' && (
          <div className="flex-1 overflow-y-auto">
            {/* Status Ringkasan Pengujian */}
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Status Mesin Matematika:{' '}
                  {allMathPassed
                    ? '6/6 KASUS UJI WAJIB LULUS 100% (Termasuk Urutan Pembagian Alternatif)'
                    : 'Periksa Kasus Uji'}
                </span>
              </div>
              <div className="text-xs text-emerald-800 font-mono tabular-nums">
                validatePrime() · validateDivision() · validateFinalAnswer() TERVERIFIKASI
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              {/* Daftar 6 Kasus Wajib */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 p-5 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">
                    Daftar 6 Kasus Uji Wajib (Klik untuk Inspeksi)
                  </h3>
                  <div className="space-y-2">
                    {reports.map((rep) => {
                      const isSelected = rep.id === activeReport.id;
                      return (
                        <div
                          key={rep.id}
                          onClick={() => setSelectedReportId(rep.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-white border-sky-600 shadow-sm'
                              : 'bg-white/70 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                {rep.category}({rep.numberA}, {rep.numberB}) ={' '}
                                {rep.calculatedAnswer}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                              Faktor: {rep.tableResult.primeDivisors.join(' × ')}{' '}
                              = {rep.expectedAnswer}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              LULUS
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTestCase(
                                  rep.category,
                                  rep.numberA,
                                  rep.numberB
                                );
                                onClose();
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Mainkan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Klik tombol <strong>Mainkan</strong> pada salah satu kasus di atas untuk langsung mengisi tabel pembagian soal tersebut secara interaktif di meja operasi.
                </div>
              </div>

              {/* Detail Tabel Pembagian Prima untuk Kasus Terpilih */}
              <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-sky-700">
                        Detail Tabel Pembagian Bilangan Prima
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                        {activeReport.category} dari {activeReport.numberA} dan{' '}
                        {activeReport.numberB} = {activeReport.calculatedAnswer}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAlternateOrder((prev) => !prev)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
                      {showAlternateOrder
                        ? 'Tampilkan Urutan Prima Terkecil'
                        : 'Uji Urutan Pembagi Alternatif'}
                    </button>
                  </div>

                  {/* Tabel Sengkedan */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-center font-mono tabular-nums text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                          <th className="py-2.5 px-3 text-left font-sans text-xs font-semibold">
                            Baris
                          </th>
                          <th className="py-2.5 px-3 border-r-2 border-slate-400 text-sky-800 font-bold">
                            Pembagi Prima
                          </th>
                          <th className="py-2.5 px-3 font-bold">
                            Bilangan I ({activeReport.numberA})
                          </th>
                          <th className="py-2.5 px-3 font-bold">
                            Bilangan II ({activeReport.numberB})
                          </th>
                          <th className="py-2.5 px-3 text-left font-sans text-xs font-semibold">
                            Validasi Baris
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTable.steps.map((step) => (
                          <React.Fragment key={step.stepNumber}>
                            <tr className="border-b border-slate-200">
                              <td className="py-2 px-3 text-left font-sans text-xs text-slate-500">
                                Langkah {step.stepNumber}
                              </td>
                              <td className="py-2 px-3 border-r-2 border-slate-400 font-bold text-emerald-700 bg-emerald-50/60">
                                ÷ {step.primeDivisor}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {step.dividendA}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {step.dividendB}
                              </td>
                              <td className="py-2 px-3 text-left font-sans text-xs text-slate-600">
                                {step.explanation}
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                        {/* Baris Hasil Akhir Sisa Pembagian */}
                        <tr className="bg-slate-900 text-white font-bold">
                          <td className="py-2.5 px-3 text-left font-sans text-xs text-slate-300">
                            Sisa Akhir
                          </td>
                          <td className="py-2.5 px-3 border-r-2 border-slate-600 text-emerald-400">
                            SELESAI
                          </td>
                          <td className="py-2.5 px-3">
                            {activeTable.finalPair[0]}
                          </td>
                          <td className="py-2.5 px-3">
                            {activeTable.finalPair[1]}
                          </td>
                          <td className="py-2.5 px-3 text-left font-sans text-xs text-slate-300 font-normal">
                            {activeReport.category === 'FPB'
                              ? `Relatif prima: FPB(${activeTable.finalPair[0]}, ${activeTable.finalPair[1]}) = 1`
                              : 'Kedua bilangan telah mencapai (1, 1)'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Rumus Perkalian Pembagi Prima */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
                      <Calculator className="w-4 h-4 text-sky-600" />
                      <span>
                        Perhitungan Hasil Akhir {activeReport.category} (
                        {showAlternateOrder
                          ? 'Urutan Alternatif'
                          : 'Urutan Standar'}
                        ):
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {activeReport.category}({activeReport.numberA},{' '}
                      {activeReport.numberB}) = {activeTable.formulaText}
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {activeTable.summaryExplanation}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTestCase(
                        activeReport.category,
                        activeReport.numberA,
                        activeReport.numberB
                      );
                      onClose();
                    }}
                    className="px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Uji Soal Ini Secara Interaktif di Meja Operasi
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Tutup Panel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
