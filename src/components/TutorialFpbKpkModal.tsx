import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Stethoscope,
  X,
  ArrowRight,
  Calculator,
  Award,
} from 'lucide-react';
import {
  MathCategory,
  QuestionData,
  getValidPrimeDivisorsForPair,
} from '../engine/mathEngine';
import { soundEngine } from '../engine/soundEngine';

interface TutorialFpbKpkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'KONSEP' | 'FPB' | 'KPK' | 'SOAL_AKTIF';
  currentQuestion: QuestionData;
  activeDividendA: number;
  activeDividendB: number;
  isTableFinished: boolean;
  completedPrimes: number[];
}

interface ExampleRow {
  row: number;
  prime: number;
  numA: number;
  numB: number;
  resA: number;
  resB: number;
  note: string;
}

const FPB_EXAMPLES: Record<
  string,
  {
    title: string;
    a: number;
    b: number;
    rows: ExampleRow[];
    endA: number;
    endB: number;
    endReason: string;
    formula: string;
    answer: number;
  }
> = {
  ex1: {
    title: 'Contoh 1: FPB dari 12 dan 18',
    a: 12,
    b: 18,
    rows: [
      {
        row: 1,
        prime: 2,
        numA: 12,
        numB: 18,
        resA: 6,
        resB: 9,
        note: '12 dan 18 sama-sama genap, bagi dengan prima 2 → (12÷2=6, 18÷2=9)',
      },
      {
        row: 2,
        prime: 3,
        numA: 6,
        numB: 9,
        resA: 2,
        resB: 3,
        note: '6 dan 9 sama-sama habis dibagi prima 3 → (6÷3=2, 9÷3=3)',
      },
    ],
    endA: 2,
    endB: 3,
    endReason:
      'Angka (2, 3) tidak punya pembagi prima bersama lagi. Tabel FPB selesai!',
    formula: '2 × 3 = 6',
    answer: 6,
  },
  ex2: {
    title: 'Contoh 2: FPB dari 24 dan 36',
    a: 24,
    b: 36,
    rows: [
      {
        row: 1,
        prime: 2,
        numA: 24,
        numB: 36,
        resA: 12,
        resB: 18,
        note: '24 dan 36 habis dibagi prima 2 → (24÷2=12, 36÷2=18)',
      },
      {
        row: 2,
        prime: 2,
        numA: 12,
        numB: 18,
        resA: 6,
        resB: 9,
        note: '12 dan 18 masih habis dibagi prima 2 → (12÷2=6, 18÷2=9)',
      },
      {
        row: 3,
        prime: 3,
        numA: 6,
        numB: 9,
        resA: 2,
        resB: 3,
        note: '6 dan 9 habis dibagi prima 3 → (6÷3=2, 9÷3=3)',
      },
    ],
    endA: 2,
    endB: 3,
    endReason:
      'Angka (2, 3) sudah tidak bisa dibagi prima yang sama. Tabel FPB selesai!',
    formula: '2 × 2 × 3 = 12',
    answer: 12,
  },
};

const KPK_EXAMPLES: Record<
  string,
  {
    title: string;
    a: number;
    b: number;
    rows: ExampleRow[];
    formula: string;
    answer: number;
  }
> = {
  ex1: {
    title: 'Contoh 1: KPK dari 4 dan 6',
    a: 4,
    b: 6,
    rows: [
      {
        row: 1,
        prime: 2,
        numA: 4,
        numB: 6,
        resA: 2,
        resB: 3,
        note: '4 dan 6 dibagi prima 2 → (4÷2=2, 6÷2=3)',
      },
      {
        row: 2,
        prime: 2,
        numA: 2,
        numB: 3,
        resA: 1,
        resB: 3,
        note: '2÷2=1. Karena 3 TIDAK HABIS dibagi 2, angka 3 DITURUNKAN TETAP 3!',
      },
      {
        row: 3,
        prime: 3,
        numA: 1,
        numB: 3,
        resA: 1,
        resB: 1,
        note: 'Angka 1 tetap 1, sedangkan 3÷3=1. Sudah mencapai (1, 1)!',
      },
    ],
    formula: '2 × 2 × 3 = 12',
    answer: 12,
  },
  ex2: {
    title: 'Contoh 2: KPK dari 12 dan 15',
    a: 12,
    b: 15,
    rows: [
      {
        row: 1,
        prime: 2,
        numA: 12,
        numB: 15,
        resA: 6,
        resB: 15,
        note: '12÷2=6. Karena 15 tidak habis dibagi 2, maka 15 DITURUNKAN TETAP 15!',
      },
      {
        row: 2,
        prime: 2,
        numA: 6,
        numB: 15,
        resA: 3,
        resB: 15,
        note: '6÷2=3. Karena 15 tidak habis dibagi 2, maka 15 DITURUNKAN TETAP 15!',
      },
      {
        row: 3,
        prime: 3,
        numA: 3,
        numB: 15,
        resA: 1,
        resB: 5,
        note: '3 dan 15 sama-sama dibagi prima 3 → (3÷3=1, 15÷3=5)',
      },
      {
        row: 4,
        prime: 5,
        numA: 1,
        numB: 5,
        resA: 1,
        resB: 1,
        note: 'Angka 1 tetap 1, dan 5÷5=1. Mencapai (1, 1), tabel KPK selesai!',
      },
    ],
    formula: '2 × 2 × 3 × 5 = 60',
    answer: 60,
  },
};

export const TutorialFpbKpkModal: React.FC<TutorialFpbKpkModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  currentQuestion,
  activeDividendA,
  activeDividendB,
  isTableFinished,
  completedPrimes,
}) => {
  const defaultTab =
    initialTab ?? (currentQuestion.category === 'KPK' ? 'KPK' : 'FPB');
  const [activeTab, setActiveTab] = useState<
    'KONSEP' | 'FPB' | 'KPK' | 'SOAL_AKTIF'
  >(defaultTab);
  const [fpbExKey, setFpbExKey] = useState<'ex1' | 'ex2'>('ex1');
  const [kpkExKey, setKpkExKey] = useState<'ex1' | 'ex2'>('ex1');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const fpbExample = FPB_EXAMPLES[fpbExKey];
  const kpkExample = KPK_EXAMPLES[kpkExKey];

  // Hitung petunjuk langkah aktif untuk soal yang sedang dihadapi pemain
  const validPrimesNow = getValidPrimeDivisorsForPair(
    currentQuestion.category,
    activeDividendA,
    activeDividendB
  );
  const recommendedPrime = validPrimesNow[0] ?? 2;
  const nextQuotientA =
    activeDividendA % recommendedPrime === 0
      ? activeDividendA / recommendedPrime
      : activeDividendA;
  const nextQuotientB =
    activeDividendB % recommendedPrime === 0
      ? activeDividendB / recommendedPrime
      : activeDividendB;

  const switchTab = (tab: 'KONSEP' | 'FPB' | 'KPK' | 'SOAL_AKTIF') => {
    soundEngine.playClick();
    setActiveTab(tab);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border-2 border-sky-400 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER MODAL TUTORIAL */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center font-extrabold shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                PANDUAN DOKTER CILIK · SDN 66 BANDA ACEH
              </div>
              <h2 className="text-sm sm:text-base font-extrabold">
                Tutorial &amp; Cara Pengerjaan Tabel FPB dan KPK
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Tutup</span>
          </button>
        </div>

        {/* BARIS TAB NAVIGASI (4 TAB INTERAKTIF) */}
        <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-1.5 shrink-0">
          {(
            [
              {
                id: 'FPB',
                label: '🩺 1. Cara FPB',
              },
              {
                id: 'KPK',
                label: '⚡ 2. Cara KPK',
              },
              {
                id: 'KONSEP',
                label: '📘 3. Bilangan Prima & Tabel',
              },
              {
                id: 'SOAL_AKTIF',
                label: `🎯 4. Bantu Soal Ini: ${currentQuestion.category}(${currentQuestion.numberA}, ${currentQuestion.numberB})`,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                activeTab === t.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ISI KONTEN TUTORIAL */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs sm:text-sm">
          {/* =========================================================
              TAB 1: CARA MENGERJAKAN FPB (FAKTOR PERSEKUTUAN TERBESAR)
              ========================================================= */}
          {activeTab === 'FPB' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-2">
                <div className="flex items-center gap-2 text-sky-900 font-extrabold text-sm sm:text-base">
                  <Stethoscope className="w-5 h-5 text-sky-600 shrink-0" />
                  <span>
                    Cara Mengerjakan FPB (Faktor Persekutuan Terbesar)
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Pada <strong>Kategori FPB</strong>, kamu mencari pembagi
                  bersama terbesar dari dua angka menggunakan{' '}
                  <strong>Metode Tabel Pembagian Bilangan Prima</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200">
                    <div className="font-extrabold text-sky-700 mb-0.5">
                      Langkah 1: Pilih Prima Bersama
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Pilih bilangan prima (<strong>2, 3, 5, 7, 11...</strong>)
                      yang <strong>HABIS MEMBAGI KEDUA ANGKA SEKALIGUS</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200">
                    <div className="font-extrabold text-sky-700 mb-0.5">
                      Langkah 2: Tulis Hasil Bagi
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Isi <strong>Hasil I</strong> (Angka I ÷ Prima) dan{' '}
                      <strong>Hasil II</strong> (Angka II ÷ Prima), lalu klik{' '}
                      <strong>Jawab Baris</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200">
                    <div className="font-extrabold text-sky-700 mb-0.5">
                      Langkah 3: Kalikan Semua Prima
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Tabel berhenti saat kedua angka tidak punya pembagi prima
                      yang sama lagi. <strong>Kalikan semua prima</strong> di
                      kolom kiri!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilihan Contoh Tabel FPB */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900">
                    Simulasi Tabel FPB Langkah demi Langkah:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setFpbExKey('ex1');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                        fpbExKey === 'ex1'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Contoh FPB(12, 18)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setFpbExKey('ex2');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                        fpbExKey === 'ex2'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Contoh FPB(24, 36)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                  <table className="w-full border-collapse text-center font-mono text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-2 text-left font-sans">Baris</th>
                        <th className="py-2 px-2 bg-sky-900 text-sky-200">
                          Prima Pembagi
                        </th>
                        <th className="py-2 px-2">Angka I ({fpbExample.a})</th>
                        <th className="py-2 px-2">Angka II ({fpbExample.b})</th>
                        <th className="py-2 px-3 text-left font-sans">
                          Cara Hitung
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fpbExample.rows.map((r) => (
                        <tr
                          key={r.row}
                          className="border-b border-slate-200 bg-white"
                        >
                          <td className="py-2 px-2 text-left font-sans font-bold text-slate-600">
                            #{r.row}
                          </td>
                          <td className="py-2 px-2 font-extrabold text-sky-800 bg-sky-100 border-r border-slate-200">
                            ÷ {r.prime}
                          </td>
                          <td className="py-2 px-2 font-bold">
                            {r.numA} →{' '}
                            <span className="text-emerald-700 font-extrabold">
                              {r.resA}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold">
                            {r.numB} →{' '}
                            <span className="text-emerald-700 font-extrabold">
                              {r.resB}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-left font-sans text-xs text-slate-700">
                            {r.note}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-2 px-2 text-left font-sans text-emerald-400">
                          Selesai
                        </td>
                        <td className="py-2 px-2 text-emerald-400 border-r border-slate-700">
                          BERHENTI
                        </td>
                        <td className="py-2 px-2">{fpbExample.endA}</td>
                        <td className="py-2 px-2">{fpbExample.endB}</td>
                        <td className="py-2 px-3 text-left font-sans text-xs text-amber-200 font-normal">
                          {fpbExample.endReason}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950 text-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>
                      <strong>Jawaban Akhir {fpbExample.title}:</strong> Kalikan
                      semua Prima Pembagi ={' '}
                      <span className="font-mono text-amber-300 font-extrabold">
                        {fpbExample.formula}
                      </span>
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono font-extrabold">
                    FPB = {fpbExample.answer}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: CARA MENGERJAKAN KPK (KELIPATAN PERSEKUTUAN TERKECIL)
              ========================================================= */}
          {activeTab === 'KPK' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Cara Mengerjakan KPK (Kelipatan Persekutuan Terkecil)
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Pada <strong>Kategori KPK</strong>, kamu membagi kedua angka
                  dengan bilangan prima sampai baris paling bawah menjadi{' '}
                  <strong>(1 dan 1)</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                    <div className="font-extrabold text-emerald-800 mb-0.5">
                      Langkah 1: Bagi Salah Satu/Keduanya
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Pilih bilangan prima terkecil (<strong>2, 3, 5...</strong>
                      ) yang bisa membagi habis{' '}
                      <strong>minimal salah satu angka</strong>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-amber-300">
                    <div className="font-extrabold text-amber-900 mb-0.5">
                      Langkah 2: Aturan Turun Tetap!
                    </div>
                    <p className="text-[11px] sm:text-xs text-amber-950">
                      Jika suatu angka <strong>TIDAK HABIS DIBAGI</strong> prima
                      tersebut, maka angkanya{' '}
                      <strong>DITURUNKAN TETAP SAMA</strong> ke baris bawah!
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200">
                    <div className="font-extrabold text-emerald-800 mb-0.5">
                      Langkah 3: Sampai (1, 1) &amp; Kalikan
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      Teruskan sampai kedua angka menjadi{' '}
                      <strong>1 dan 1</strong>, lalu{' '}
                      <strong>kalikan semua prima</strong> di kolom kiri!
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilihan Contoh Tabel KPK */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900">
                    Simulasi Tabel KPK Langkah demi Langkah:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setKpkExKey('ex1');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                        kpkExKey === 'ex1'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Contoh KPK(4, 6)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setKpkExKey('ex2');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                        kpkExKey === 'ex2'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Contoh KPK(12, 15)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                  <table className="w-full border-collapse text-center font-mono text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-2 text-left font-sans">Baris</th>
                        <th className="py-2 px-2 bg-emerald-900 text-emerald-200">
                          Prima Pembagi
                        </th>
                        <th className="py-2 px-2">Angka I ({kpkExample.a})</th>
                        <th className="py-2 px-2">Angka II ({kpkExample.b})</th>
                        <th className="py-2 px-3 text-left font-sans">
                          Cara Hitung
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpkExample.rows.map((r) => (
                        <tr
                          key={r.row}
                          className="border-b border-slate-200 bg-white"
                        >
                          <td className="py-2 px-2 text-left font-sans font-bold text-slate-600">
                            #{r.row}
                          </td>
                          <td className="py-2 px-2 font-extrabold text-emerald-800 bg-emerald-100 border-r border-slate-200">
                            ÷ {r.prime}
                          </td>
                          <td className="py-2 px-2 font-bold">
                            {r.numA} →{' '}
                            <span
                              className={
                                r.numA === r.resA
                                  ? 'text-amber-700 font-extrabold underline'
                                  : 'text-emerald-700 font-extrabold'
                              }
                            >
                              {r.resA}
                            </span>
                          </td>
                          <td className="py-2 px-2 font-bold">
                            {r.numB} →{' '}
                            <span
                              className={
                                r.numB === r.resB
                                  ? 'text-amber-700 font-extrabold underline'
                                  : 'text-emerald-700 font-extrabold'
                              }
                            >
                              {r.resB}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-left font-sans text-xs text-slate-700">
                            {r.note}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-2 px-2 text-left font-sans text-emerald-400">
                          Selesai
                        </td>
                        <td className="py-2 px-2 text-emerald-400 border-r border-slate-700">
                          SELESAI
                        </td>
                        <td className="py-2 px-2">1</td>
                        <td className="py-2 px-2">1</td>
                        <td className="py-2 px-3 text-left font-sans text-xs text-amber-200 font-normal">
                          Kedua angka sudah mencapai (1, 1). Tabel KPK selesai!
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950 text-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>
                      <strong>Jawaban Akhir {kpkExample.title}:</strong> Kalikan
                      semua Prima Pembagi ={' '}
                      <span className="font-mono text-amber-300 font-extrabold">
                        {kpkExample.formula}
                      </span>
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono font-extrabold">
                    KPK = {kpkExample.answer}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: MENGENAL BILANGAN PRIMA & PERBEDAAN FPB VS KPK
              ========================================================= */}
          {activeTab === 'KONSEP' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2">
                <div className="font-extrabold text-amber-950 text-sm sm:text-base flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Apa Itu Bilangan Prima Pembagi?</span>
                </div>
                <p className="text-slate-700">
                  <strong>Bilangan Prima</strong> adalah bilangan yang lebih
                  besar dari 1 dan hanya bisa dibagi oleh angka 1 dan dirinya
                  sendiri. Di ruang operasi, gunakan angka prima dari yang
                  paling kecil:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { p: 2, tip: 'Membagi semua angka genap (2, 4, 6, 8, 10...)' },
                    { p: 3, tip: 'Membagi kelipatan 3 (3, 6, 9, 12, 15, 18...)' },
                    { p: 5, tip: 'Membagi angka berakhiran 0 atau 5 (5, 10, 15, 20...)' },
                    { p: 7, tip: 'Membagi kelipatan 7 (7, 14, 21, 28, 35...)' },
                    { p: 11, tip: 'Membagi kelipatan 11 (11, 22, 33, 44...)' },
                    { p: 13, tip: 'Membagi kelipatan 13 (13, 26, 39...)' },
                  ].map((item) => (
                    <div
                      key={item.p}
                      className="flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-3 py-1.5"
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-300 font-mono font-extrabold flex items-center justify-center">
                        {item.p}
                      </span>
                      <span className="text-xs text-slate-700 font-medium">
                        {item.tip}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabel Perbandingan Cepat FPB vs KPK */}
              <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-2 px-3">Aturan Tabel</th>
                      <th className="py-2 px-3 bg-sky-900 text-sky-200">
                        Kategori FPB
                      </th>
                      <th className="py-2 px-3 bg-emerald-900 text-emerald-200">
                        Kategori KPK
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-2 px-3 font-bold">Syarat Prima Pembagi</td>
                      <td className="py-2 px-3">
                        Harus membagi habis{' '}
                        <strong>KEDUA angka sekaligus</strong>
                      </td>
                      <td className="py-2 px-3">
                        Membagi habis{' '}
                        <strong>salah satu atau kedua angka</strong>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="py-2 px-3 font-bold">
                        Jika Tidak Habis Dibagi
                      </td>
                      <td className="py-2 px-3">
                        Tidak boleh dipilih (cari prima lain yang membagi
                        keduanya)
                      </td>
                      <td className="py-2 px-3">
                        Angka yang tidak habis dibagi{' '}
                        <strong>diturunkan tetap sama</strong>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-2 px-3 font-bold">Kapan Tabel Selesai?</td>
                      <td className="py-2 px-3">
                        Saat kedua angka tidak punya pembagi prima bersama lagi
                      </td>
                      <td className="py-2 px-3">
                        Saat baris paling bawah mencapai <strong>(1, 1)</strong>
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/70">
                      <td className="py-2 px-3 font-bold">Jawaban Akhir</td>
                      <td className="py-2 px-3 font-bold text-sky-900">
                        Kalikan semua prima pembagi di kolom kiri
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-900">
                        Kalikan semua prima pembagi di kolom kiri
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 4: BANTUAN LANGSUNG UNTUK SOAL YANG SEDANG DIKERJAKAN
              ========================================================= */}
          {activeTab === 'SOAL_AKTIF' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-slate-900 text-white border-2 border-sky-400 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
                  <div>
                    <div className="text-[11px] font-bold text-sky-300 uppercase">
                      PANDUAN LANGKAH DEMI LANGKAH SOAL SAAT INI
                    </div>
                    <div className="text-base sm:text-lg font-extrabold font-mono text-amber-300">
                      {currentQuestion.category}({currentQuestion.numberA},{' '}
                      {currentQuestion.numberB}) — Level {currentQuestion.level}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-sky-500 text-slate-950 font-extrabold text-xs">
                    {isTableFinished
                      ? 'Tahap Jawaban Akhir'
                      : `Baris Aktif: (${activeDividendA}, ${activeDividendB})`}
                  </span>
                </div>

                {!isTableFinished ? (
                  <div className="space-y-2.5">
                    <p className="text-xs sm:text-sm text-slate-200">
                      Sekarang angka di meja operasi adalah{' '}
                      <strong className="text-amber-300 font-mono">
                        {activeDividendA}
                      </strong>{' '}
                      dan{' '}
                      <strong className="text-amber-300 font-mono">
                        {activeDividendB}
                      </strong>
                      . Ikuti 3 langkah tombol pilihan angka di bawah tabel:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-800 border border-sky-500/50">
                        <div className="text-xs font-extrabold text-sky-300 mb-1">
                          1. Pilih Prima Pembagi
                        </div>
                        <div className="text-lg font-mono font-extrabold text-white">
                          Pilih angka: {validPrimesNow.join(' atau ')}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {currentQuestion.category === 'FPB'
                            ? `Karena ${activeDividendA} dan ${activeDividendB} sama-sama habis dibagi ${recommendedPrime}.`
                            : `Karena minimal salah satu dari (${activeDividendA}, ${activeDividendB}) habis dibagi ${recommendedPrime}.`}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800 border border-amber-400/50">
                        <div className="text-xs font-extrabold text-amber-300 mb-1">
                          2. Pilih Hasil Bagi I (jika ÷{recommendedPrime})
                        </div>
                        <div className="text-lg font-mono font-extrabold text-white">
                          {activeDividendA % recommendedPrime === 0
                            ? `${activeDividendA} ÷ ${recommendedPrime} = ${nextQuotientA}`
                            : `Tetap ${activeDividendA} (tidak habis ÷${recommendedPrime})`}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Klik tombol angka{' '}
                          <strong className="text-amber-300">
                            {nextQuotientA}
                          </strong>{' '}
                          pada pilihan Hasil I.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800 border border-emerald-400/50">
                        <div className="text-xs font-extrabold text-emerald-300 mb-1">
                          3. Pilih Hasil Bagi II (jika ÷{recommendedPrime})
                        </div>
                        <div className="text-lg font-mono font-extrabold text-white">
                          {activeDividendB % recommendedPrime === 0
                            ? `${activeDividendB} ÷ ${recommendedPrime} = ${nextQuotientB}`
                            : `Tetap ${activeDividendB} (tidak habis ÷${recommendedPrime})`}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Klik tombol angka{' '}
                          <strong className="text-emerald-300">
                            {nextQuotientB}
                          </strong>{' '}
                          lalu tekan <strong>Jawab Baris (+50)</strong>!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-400 space-y-1.5">
                    <div className="font-extrabold text-emerald-300 text-sm flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      <span>
                        Tabel Pembagian Sudah Selesai! Saatnya Hitung Jawaban
                        Akhir:
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-white">
                      Kalikan semua bilangan prima pembagi yang sudah kamu
                      temukan di kolom kiri:{' '}
                      <strong className="font-mono text-amber-300">
                        {completedPrimes.join(' × ')} ={' '}
                        {currentQuestion.expectedAnswer}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL TUTORIAL */}
        <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Selama jendela tutorial ini dibuka, waktu hitung mundur 20 detik
              dijeda otomatis.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Mengerti, Lanjutkan Operasi!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
