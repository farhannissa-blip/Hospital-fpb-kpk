/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Dices,
  Eye,
  FastForward,
  Heart,
  HelpCircle,
  Home,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  Timer,
  UserCheck,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  Ambulance,
  BookOpen,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  MathCategory,
  PlayerProfile,
  QuestionData,
  OperationCompletionResult,
  MANDATORY_TEST_CASES,
  SCORE_RULES,
  generateQuestion,
  getLevelTierMetadata,
  validateDivision,
  validateFinalAnswer,
  reduceLife,
  completeOperation,
  restartGame,
  runMandatoryTestSuite,
  getValidPrimeDivisorsForPair,
} from './engine/mathEngine';
import {
  PATIENT_CHARACTERS,
  PatientCharacterProfile,
  PatientConditionId,
  getPatientById,
  getPatientByIndex,
} from './engine/patientCatalog';
import {
  HOUSE_TIERS,
  HouseTierId,
  HouseUpgradeItemId,
  PlayerProgressRepository,
  SavedPlayerProgress,
  convertScoreToCoins,
  purchaseUpgradeItemTransaction,
  upgradeHouseTierTransaction,
} from './engine/storageEngine';
import {
  FirebaseConnectionStatus,
  firebaseHospitalService,
} from './engine/firebaseService';
import { soundEngine } from './engine/soundEngine';
import {
  OperatingRoom3D,
  CameraPreset,
  SurgeryFlowStage,
  DoctorAnimationMode,
} from './components/OperatingRoom3D';
import { DreamHouse3D } from './components/DreamHouse3D';
import { MandatoryTestModal } from './components/MandatoryTestModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { TutorialFpbKpkModal } from './components/TutorialFpbKpkModal';

interface CompletedRow {
  rowNumber: number;
  dividendA: number;
  dividendB: number;
  primeDivisor: number;
  quotientA: number;
  quotientB: number;
}

interface FeedbackBanner {
  type: 'success' | 'error' | 'info';
  title: string;
  detail: string;
}

interface CoinRewardPopup {
  id: number;
  scoreAdded: number;
  coinsAdded: number;
  label: string;
}

const FLOW_STAGE_LABELS: Record<
  SurgeryFlowStage,
  { step: number; title: string; subtitle: string }
> = {
  EXTERIOR_IDLE: {
    step: 0,
    title: 'Halaman Depan Rumah Sakit 3D',
    subtitle:
      'Ambulans siaga, dokter & perawat bersiap di lobi IGD SDN 66 Banda Aceh.',
  },
  AMBULANCE_ARRIVING: {
    step: 1,
    title: 'Tahap 1/4: Ambulans Darurat Datang!',
    subtitle: 'Ambulans tiba membawa pasien dengan Soal Kejutan Medis.',
  },
  PATIENT_UNLOADING: {
    step: 2,
    title: 'Tahap 2/4: Pasien Turun di Atas Brankar',
    subtitle: 'Dokter dan perawat menyambut brankar pasien dengan sigap.',
  },
  ENTERING_HOSPITAL: {
    step: 3,
    title: 'Tahap 3/4: Pintu Otomatis Terbuka – Menuju Ruang Operasi',
    subtitle: 'Pasien dibawa melewati pintu otomatis menuju Ruang Operasi 3D.',
  },
  DOCTOR_PREP: {
    step: 4,
    title: 'Tahap 4/4: Dokter Mempersiapkan Operasi & Membuka Soal Kejutan!',
    subtitle:
      'Instrumen medis siap! Soal FPB/KPK kejutan kini dibuka di meja operasi.',
  },
  MATH_SURGERY: {
    step: 5,
    title: 'Tindakan Operasi Matematika Berlangsung',
    subtitle:
      'Setiap baris benar memberi +50 Skor (+5 Koin) & meningkatkan kesembuhan pasien.',
  },
  SURGERY_SUCCESS: {
    step: 10,
    title: 'OPERASI BERHASIL – PASIEN SEMBUH!',
    subtitle:
      'Dokter mengangkat tangan gembira, pasien bangun dan tersenyum sehat!',
  },
  SURGERY_FAILED: {
    step: 10,
    title: 'OPERASI GAGAL – PASIEN TERTUTUP KAIN PUTIH & EKG GARIS DATAR!',
    subtitle:
      'Monitor EKG menunjukkan garis datar (0 BPM) dan pasien ditutup kain putih. Pelajari kunci tabel dan coba lagi!',
  },
};

export default function App() {
  // Muat Progres Tersimpan dari LocalStorage (Tahap 3 & 4)
  const [savedProgress, setSavedProgress] = useState<SavedPlayerProgress>(() =>
    PlayerProgressRepository.load()
  );

  // Status Koneksi Firebase Realtime Database & Auth UID (Tahap 4)
  const [firebaseStatus, setFirebaseStatus] =
    useState<FirebaseConnectionStatus>('BELUM DIKONFIGURASI (MODE LOKAL)');
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  // Mode Layar Utama: Rumah Sakit 3D vs My Dream House 3D
  const [viewMode, setViewMode] = useState<'HOSPITAL' | 'DREAM_HOUSE'>(
    'HOSPITAL'
  );

  // Paginasi Halaman Pertama Per Bagian (1: Identitas, 2: Kategori & Level, 3: Pasien & Mulai)
  // Agar tampilan di layar HP dan PID tidak penuh dan 3D Rumah Sakit tetap terlihat jelas!
  const [menuStep, setMenuStep] = useState<1 | 2 | 3>(1);

  // Profil Pemain
  const [playerName, setPlayerName] = useState<string>(
    savedProgress.playerName
  );
  const [schoolName, setSchoolName] = useState<string>(
    savedProgress.schoolName
  );
  const [selectedGrade, setSelectedGrade] = useState<number>(
    savedProgress.grade
  );
  const [selectedCategory, setSelectedCategory] = useState<MathCategory>(
    savedProgress.lastCategory
  );

  // Level Aktif sesuai Kategori (2 Jalur Terpisah: Level FPB 1-20 & Level KPK 1-20)
  const [selectedFpbLevel, setSelectedFpbLevel] = useState<number>(
    savedProgress.fpbCurrentLevel
  );
  const [selectedKpkLevel, setSelectedKpkLevel] = useState<number>(
    savedProgress.kpkCurrentLevel
  );

  const activeLevel =
    selectedCategory === 'FPB' ? selectedFpbLevel : selectedKpkLevel;
  const activeUnlockedLevel =
    selectedCategory === 'FPB'
      ? savedProgress.fpbUnlockedLevel
      : savedProgress.kpkUnlockedLevel;
  const activeLevelTierMeta = useMemo(
    () => getLevelTierMetadata(activeLevel),
    [activeLevel]
  );

  // Pilihan 7 Karakter Pasien (Tahap 2 Bagian D)
  const [selectedPatientId, setSelectedPatientId] =
    useState<PatientConditionId>('apendisitis');
  const activePatient: PatientCharacterProfile = useMemo(
    () => getPatientById(selectedPatientId),
    [selectedPatientId]
  );

  // Status Sesi Permainan & Alur Animasi Operasi
  const [gameStatus, setGameStatus] = useState<
    'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED'
  >('MENU');
  const [flowStage, setFlowStage] = useState<SurgeryFlowStage>('EXTERIOR_IDLE');
  const [lives, setLives] = useState<number>(3);
  const [mistakesInLevel, setMistakesInLevel] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData>(() =>
    generateQuestion(savedProgress.lastCategory, savedProgress.grade, {
      level:
        savedProgress.lastCategory === 'FPB'
          ? savedProgress.fpbCurrentLevel
          : savedProgress.kpkCurrentLevel,
      surpriseRandom: true,
    })
  );

  // State Tabel Pembagian Bilangan Prima (Baris demi Baris)
  const [completedRows, setCompletedRows] = useState<CompletedRow[]>([]);
  const [activeDividendA, setActiveDividendA] = useState<number>(
    currentQuestion.numberA
  );
  const [activeDividendB, setActiveDividendB] = useState<number>(
    currentQuestion.numberB
  );
  const [isTableFinished, setIsTableFinished] = useState<boolean>(false);

  // Input Baris Aktif
  const [primeInput, setPrimeInput] = useState<string>('');
  const [quotientAInput, setQuotientAInput] = useState<string>('');
  const [quotientBInput, setQuotientBInput] = useState<string>('');
  const [finalAnswerInput, setFinalAnswerInput] = useState<string>('');

  // Umpan Balik Validasi, Ekspresi Dokter 3D & Animasi Koin/Level Up
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);
  const [errorField, setErrorField] = useState<
    'prime' | 'quotientA' | 'quotientB' | 'bothQuotients' | 'final' | null
  >(null);
  const [shakeTrigger, setShakeTrigger] = useState<number>(0);
  const [lastCompletionReport, setLastCompletionReport] =
    useState<OperationCompletionResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [doctorReaction, setDoctorReaction] = useState<
    'normal' | 'happy' | 'shocked' | 'celebrate'
  >('normal');
  const [doctorAnimOverride, setDoctorAnimOverride] =
    useState<DoctorAnimationMode>('auto');
  const [coinPopup, setCoinPopup] = useState<CoinRewardPopup | null>(null);
  const [levelUpBanner, setLevelUpBanner] = useState<string | null>(null);

  // Kontrol Kamera 3D, Audio, Fallback 2D, NumPad Sentuh PID/TV & Modal Audit
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);
  const [isTableMinimizedOnMobile, setIsTableMinimizedOnMobile] =
    useState<boolean>(false);
  const [inspect3DOnly, setInspect3DOnly] = useState<boolean>(false);
  const [forceFallback2D, setForceFallback2D] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [tutorialInitialTab, setTutorialInitialTab] = useState<
    'KONSEP' | 'FPB' | 'KPK' | 'SOAL_AKTIF'
  >('FPB');
  const [activeNumpadField, setActiveNumpadField] = useState<
    'prime' | 'quotientA' | 'quotientB' | 'final'
  >('prime');

  // Timer Menjawab 20 Detik (Apabila habis waktu maka nyawa pemain berkurang 1)
  const ANSWER_TIME_LIMIT = 20;
  const [timeLeft, setTimeLeft] = useState<number>(ANSWER_TIME_LIMIT);

  // Guard Anti-Klik Ganda agar Skor & Koin TIDAK dihitung dua kali (Tahap 3 Bagian B)
  const scoredRowsSetRef = useRef<Set<number>>(new Set());
  const isOperationScoredRef = useRef<boolean>(false);

  // Referensi Input, Auto-Scroll Tabel & Timer Alur Sinematik
  const primeInputRef = useRef<HTMLInputElement | null>(null);
  const quotientAInputRef = useRef<HTMLInputElement | null>(null);
  const quotientBInputRef = useRef<HTMLInputElement | null>(null);
  const finalInputRef = useRef<HTMLInputElement | null>(null);
  const activeRowEndRef = useRef<HTMLDivElement | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);

  // Jalankan Pengujian Wajib 6 Kasus (Bagian G) secara otomatis
  const mandatoryReports = useMemo(() => runMandatoryTestSuite(), []);

  // Inisialisasi Firebase Modular SDK & Listener Status Koneksi (Tahap 4)
  const initFirebaseConnection = () => {
    firebaseHospitalService.initialize((cloudData) => {
      // Pulihkan progres tertinggi dari Cloud dengan kebijakan KEEP HIGH SCORE
      setSavedProgress((prev) => {
        const merged: SavedPlayerProgress = {
          ...prev,
          totalScore: Math.max(prev.totalScore, cloudData.totalScore || 0),
          coins: Math.max(prev.coins, cloudData.coins || 0),
          fpbUnlockedLevel: Math.max(
            prev.fpbUnlockedLevel,
            cloudData.fpbUnlockedLevel || 1
          ),
          kpkUnlockedLevel: Math.max(
            prev.kpkUnlockedLevel,
            cloudData.kpkUnlockedLevel || 1
          ),
          houseTier: Math.max(
            prev.houseTier,
            (cloudData.houseTier as HouseTierId) || 1
          ) as HouseTierId,
          purchasedItems: Array.from(
            new Set([
              ...prev.purchasedItems,
              ...(cloudData.purchasedItems || []),
            ])
          ),
          rescuedPatients: Array.from(
            new Set([
              ...prev.rescuedPatients,
              ...(cloudData.rescuedPatients || []),
            ])
          ),
        };
        return PlayerProgressRepository.save(merged);
      });
    });
  };

  useEffect(() => {
    const unsub = firebaseHospitalService.subscribeStatus((st, uid) => {
      setFirebaseStatus(st);
      setFirebaseUid(uid);
    });
    initFirebaseConnection();
    return () => unsub();
  }, []);

  // Simpan perubahan progres ke LocalStorage sekaligus sinkronkan ke Firebase (KEEP HIGH SCORE)
  const persistProgress = (
    updater: (prev: SavedPlayerProgress) => SavedPlayerProgress
  ) => {
    setSavedProgress((prev) => {
      const next = updater(prev);
      const saved = PlayerProgressRepository.save(next);
      firebaseHospitalService.syncPlayerAndLeaderboard(saved);
      return saved;
    });
  };

  // Trigger animasi koin masuk ke saldo pemain (Tahap 3 Bagian C)
  const triggerCoinRewardAnimation = (
    scoreAdded: number,
    coinsAdded: number,
    label: string
  ) => {
    soundEngine.playCoinEarned();
    setCoinPopup({
      id: Date.now(),
      scoreAdded,
      coinsAdded,
      label,
    });
    window.setTimeout(() => {
      setCoinPopup((prev) => (prev && prev.label === label ? null : prev));
    }, 2400);
  };

  // Bersihkan timer transisi saat unmount
  const clearSequenceTimers = () => {
    sequenceTimersRef.current.forEach((id) => window.clearTimeout(id));
    sequenceTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearSequenceTimers();
  }, []);

  // Hitung Progres Operasi (%) berdasarkan langkah tabel pembagian yang sudah diselesaikan
  const surgeryProgress = useMemo(() => {
    if (gameStatus === 'SUCCESS') return 100;
    const expectedTotalSteps = Math.max(
      1,
      currentQuestion.referenceTable.steps.length
    );
    if (isTableFinished) return 85;
    const stepRatio = Math.min(1, completedRows.length / expectedTotalSteps);
    return Math.round(stepRatio * 80);
  }, [
    gameStatus,
    isTableFinished,
    completedRows.length,
    currentQuestion.referenceTable.steps.length,
  ]);

  // Fokus otomatis & auto-scroll ke baris aktif saat baris bertambah atau tabel selesai
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || flowStage !== 'MATH_SURGERY') return;
    if (isTableFinished) {
      setActiveNumpadField('final');
    } else {
      setActiveNumpadField('prime');
    }
    activeRowEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [completedRows.length, isTableFinished, gameStatus, flowStage]);

  // Handler saat waktu menjawab 20 detik habis -> kurangi 1 nyawa pemain
  const handleAnswerTimeoutRef = useRef<() => void>(() => {});
  handleAnswerTimeoutRef.current = () => {
    if (gameStatus !== 'PLAYING' || flowStage !== 'MATH_SURGERY') return;

    const lifeResult = reduceLife(lives);
    setLives(lifeResult.remainingLives);
    setMistakesInLevel((prev) => prev + 1);
    setShakeTrigger((prev) => prev + 1);
    setDoctorReaction('shocked');

    if (lifeResult.isGameOver) {
      soundEngine.playOperationCritical();
      setGameStatus('FAILED');
      setFlowStage('SURGERY_FAILED');
      setFeedback({
        type: 'error',
        title: `WAKTU 20 DETIK HABIS! ${lifeResult.statusTitle}`,
        detail: `Waktu menjawab 20 detik telah habis dan seluruh 3 nyawa habis. Monitor EKG garis datar & pasien tertutup kain putih.`,
      });
    } else {
      soundEngine.playWrongAnswer();
      setTimeLeft(ANSWER_TIME_LIMIT);
      setFeedback({
        type: 'error',
        title: `Waktu 20 Detik Habis! Nyawa Berkurang 1 (Sisa: ${lifeResult.remainingLives}/3)`,
        detail:
          'Waktu menjawab 20 detik telah habis! Ayo pilih angka jawaban yang benar sebelum timer habis lagi.',
      });
      window.setTimeout(() => {
        setDoctorReaction((prev) => (prev === 'shocked' ? 'normal' : prev));
      }, 2000);
    }
  };

  // Interval Countdown 20 Detik selama operasi aktif
  useEffect(() => {
    if (
      gameStatus !== 'PLAYING' ||
      flowStage !== 'MATH_SURGERY' ||
      viewMode !== 'HOSPITAL' ||
      isLeaderboardOpen ||
      isTestModalOpen ||
      isTutorialOpen
    ) {
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            handleAnswerTimeoutRef.current();
          }, 0);
          return ANSWER_TIME_LIMIT;
        }
        const nextVal = prev - 1;
        if (nextVal <= 5) {
          soundEngine.playMedicalBleep('warning');
        }
        return nextVal;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [
    gameStatus,
    flowStage,
    viewMode,
    isLeaderboardOpen,
    isTestModalOpen,
    isTutorialOpen,
  ]);

  /**
   * Menyiapkan meja operasi untuk soal & karakter pasien tertentu
   */
  const setupQuestionOnTable = (
    question: QuestionData,
    patientProfile: PatientCharacterProfile,
    options?: {
      resetLivesToFull?: boolean;
      playAmbulanceIntro?: boolean;
    }
  ) => {
    const resetLives = options?.resetLivesToFull ?? true;
    const playIntro = options?.playAmbulanceIntro ?? false;

    clearSequenceTimers();
    scoredRowsSetRef.current.clear();
    isOperationScoredRef.current = false;

    setCurrentQuestion(question);
    setCompletedRows([]);
    setActiveDividendA(question.numberA);
    setActiveDividendB(question.numberB);
    setIsTableFinished(false);
    setPrimeInput('');
    setQuotientAInput('');
    setQuotientBInput('');
    setFinalAnswerInput('');
    setErrorField(null);
    setShowHint(false);
    setLastCompletionReport(null);
    setLevelUpBanner(null);
    setDoctorReaction('normal');
    setDoctorAnimOverride('auto');
    setMistakesInLevel(0);
    setIsTableMinimizedOnMobile(false);
    setTimeLeft(ANSWER_TIME_LIMIT);

    if (resetLives) {
      setLives(3);
    }
    setGameStatus('PLAYING');

    const readyFeedback: FeedbackBanner = {
      type: 'info',
      title: `Soal Kejutan Lv.${question.level} (${question.levelTierLabel}) — ${question.category}(${question.numberA}, ${question.numberB})`,
      detail:
        question.category === 'FPB'
          ? `Pasien: ${patientProfile.patientName}. Pilih angka prima & hasil bagi sebelum 20 detik habis!`
          : `Pasien: ${patientProfile.patientName}. Pilih angka prima sampai (1, 1) sebelum 20 detik habis!`,
    };
    setFeedback(readyFeedback);

    if (playIntro) {
      setFlowStage('AMBULANCE_ARRIVING');
      setCameraPreset('exterior');
      soundEngine.playAmbulanceArrival();

      const t1 = window.setTimeout(() => {
        setFlowStage('PATIENT_UNLOADING');
      }, 1300);

      const t2 = window.setTimeout(() => {
        setFlowStage('ENTERING_HOSPITAL');
        soundEngine.playDoorSlide();
      }, 2500);

      const t3 = window.setTimeout(() => {
        setFlowStage('DOCTOR_PREP');
        setCameraPreset('overview');
      }, 3700);

      const t4 = window.setTimeout(() => {
        setTimeLeft(ANSWER_TIME_LIMIT);
        setFlowStage('MATH_SURGERY');
        setCameraPreset('overview');
      }, 4800);

      sequenceTimersRef.current = [t1, t2, t3, t4];
    } else {
      setTimeLeft(ANSWER_TIME_LIMIT);
      setFlowStage('MATH_SURGERY');
      setCameraPreset('overview');
    }
  };

  /**
   * Lewati intro sinematik ambulans untuk langsung mengisi tabel matematika
   */
  const handleSkipIntroToTable = () => {
    clearSequenceTimers();
    soundEngine.playClick();
    setTimeLeft(ANSWER_TIME_LIMIT);
    setFlowStage('MATH_SURGERY');
    setCameraPreset('overview');
  };

  /**
   * Tombol Mulai Permainan dari Halaman Depan 3D Hospital
   * Menghasilkan SOAL KEJUTAN ACAK sesuai Level FPB/KPK tanpa pernah membocorkan soal di layar depan!
   */
  const handleStartGame = (
    e?: React.FormEvent,
    withAmbulanceIntro = true,
    overrideLevel?: number,
    overrideCategory?: MathCategory
  ) => {
    if (e) e.preventDefault();
    soundEngine.playClick();

    const cat = overrideCategory || selectedCategory;
    const lvl =
      overrideLevel ||
      (cat === 'FPB' ? selectedFpbLevel : selectedKpkLevel);

    const cleanName = playerName.trim() || 'Dokter Cilik';
    const cleanSchool = schoolName.trim() || 'SDN 66 Banda Aceh';
    setPlayerName(cleanName);
    setSchoolName(cleanSchool);

    persistProgress((prev) => ({
      ...prev,
      playerName: cleanName,
      schoolName: cleanSchool,
      grade: selectedGrade,
      lastCategory: cat,
      fpbCurrentLevel: cat === 'FPB' ? lvl : prev.fpbCurrentLevel,
      kpkCurrentLevel: cat === 'KPK' ? lvl : prev.kpkCurrentLevel,
    }));

    const profile: PlayerProfile = {
      name: cleanName,
      school: cleanSchool,
      grade: selectedGrade,
      category: cat,
    };

    const session = restartGame(profile, undefined, lvl);
    setLives(session.lives);
    setViewMode('HOSPITAL');
    setupQuestionOnTable(session.currentQuestion, activePatient, {
      resetLivesToFull: true,
      playAmbulanceIntro: withAmbulanceIntro,
    });
  };

  /**
   * Tombol "Acak Soal Kejutan Baru" di Ruang Operasi
   */
  const handleSurpriseNewQuestion = () => {
    soundEngine.playClick();
    const surpriseQ = generateQuestion(
      currentQuestion.category,
      selectedGrade,
      {
        level: currentQuestion.level,
        surpriseRandom: true,
      }
    );
    setupQuestionOnTable(surpriseQ, activePatient, {
      resetLivesToFull: true,
      playAmbulanceIntro: false,
    });
  };

  /**
   * Memuat salah satu dari 6 Kasus Uji Wajib (Bagian G) langsung ke Meja Operasi
   */
  const handleLoadMandatoryCase = (
    category: MathCategory,
    numA: number,
    numB: number
  ) => {
    soundEngine.playClick();
    setSelectedCategory(category);
    setViewMode('HOSPITAL');
    const q = generateQuestion(category, selectedGrade, {
      customPair: [numA, numB],
      level: category === 'FPB' ? selectedFpbLevel : selectedKpkLevel,
    });
    setupQuestionOnTable(q, activePatient, {
      resetLivesToFull: true,
      playAmbulanceIntro: false,
    });
  };

  /**
   * Validasi Setiap Baris Tabel Pembagian (Tahap 1, 2 & 3)
   * Setiap baris tabel benar memberikan +50 Skor (+5 Koin) dan dijamin tidak dihitung dua kali!
   */
  const handleValidateCurrentRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameStatus !== 'PLAYING' || isTableFinished) return;

    if (flowStage !== 'MATH_SURGERY') {
      handleSkipIntroToTable();
    }

    const pVal = Number(primeInput.trim());
    const qAVal = Number(quotientAInput.trim());
    const qBVal = Number(quotientBInput.trim());

    if (
      primeInput.trim() === '' ||
      quotientAInput.trim() === '' ||
      quotientBInput.trim() === ''
    ) {
      setErrorField('bothQuotients');
      setShakeTrigger((prev) => prev + 1);
      setFeedback({
        type: 'error',
        title: 'Kolom Baris Belum Lengkap',
        detail:
          'Isi ketiga kolom: (1) Bilangan Prima Pembagi, (2) Hasil Bagi Pertama, dan (3) Hasil Bagi Kedua.',
      });
      return;
    }

    const validation = validateDivision(
      currentQuestion.category,
      activeDividendA,
      activeDividendB,
      pVal,
      qAVal,
      qBVal
    );

    if (validation.isValid) {
      const nextRowIndex = completedRows.length + 1;
      if (scoredRowsSetRef.current.has(nextRowIndex)) {
        return;
      }
      scoredRowsSetRef.current.add(nextRowIndex);

      soundEngine.playCorrectRow();
      setDoctorReaction('happy');

      const rowScoreDelta = SCORE_RULES.CORRECT_ROW; // 50
      const rowCoinDelta = convertScoreToCoins(rowScoreDelta); // 5 koin
      persistProgress((prev) => ({
        ...prev,
        totalScore: prev.totalScore + rowScoreDelta,
        coins: prev.coins + rowCoinDelta,
      }));
      triggerCoinRewardAnimation(
        rowScoreDelta,
        rowCoinDelta,
        `Baris Ke-${nextRowIndex} Benar`
      );

      const newRow: CompletedRow = {
        rowNumber: nextRowIndex,
        dividendA: activeDividendA,
        dividendB: activeDividendB,
        primeDivisor: pVal,
        quotientA: validation.nextA,
        quotientB: validation.nextB,
      };

      const updatedRows = [...completedRows, newRow];
      setCompletedRows(updatedRows);
      setActiveDividendA(validation.nextA);
      setActiveDividendB(validation.nextB);
      setPrimeInput('');
      setQuotientAInput('');
      setQuotientBInput('');
      setErrorField(null);
      setShowHint(false);
      setTimeLeft(ANSWER_TIME_LIMIT);

      if (validation.isTableFinishedAfterStep) {
        soundEngine.playSuccessChime();
        setIsTableFinished(true);
        setFeedback({
          type: 'success',
          title: `Baris Ke-${nextRowIndex} Benar (+${rowScoreDelta} Skor / +${rowCoinDelta} Koin) — Tabel Selesai!`,
          detail: validation.message,
        });
      } else {
        soundEngine.playMedicalBleep('normal');
        setFeedback({
          type: 'success',
          title: `Baris Ke-${nextRowIndex} Benar! (+${rowScoreDelta} Skor / +${rowCoinDelta} Koin)`,
          detail: validation.message,
        });
      }
    } else {
      const lifeResult = reduceLife(lives);
      setLives(lifeResult.remainingLives);
      setMistakesInLevel((prev) => prev + 1);
      setErrorField(validation.errorField || 'bothQuotients');
      setShakeTrigger((prev) => prev + 1);
      setDoctorReaction('shocked');

      if (lifeResult.isGameOver) {
        soundEngine.playOperationCritical();
        setGameStatus('FAILED');
        setFlowStage('SURGERY_FAILED');
        setFeedback({
          type: 'error',
          title: lifeResult.statusTitle,
          detail: `${validation.message} — ${lifeResult.statusMessage}`,
        });
      } else {
        soundEngine.playWrongAnswer();
        setTimeLeft(ANSWER_TIME_LIMIT);
        setFeedback({
          type: 'error',
          title: `Dokter Terkejut! Kesalahan Terdeteksi (Nyawa: ${lifeResult.remainingLives}/3)`,
          detail: validation.message,
        });
        window.setTimeout(() => {
          setDoctorReaction((prev) => (prev === 'shocked' ? 'normal' : prev));
        }, 2200);
      }
    }
  };

  /**
   * Validasi Jawaban Akhir FPB / KPK setelah tabel selesai
   */
  const handleValidateFinalAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      gameStatus !== 'PLAYING' ||
      !isTableFinished ||
      isOperationScoredRef.current
    ) {
      return;
    }

    if (finalAnswerInput.trim() === '') {
      setErrorField('final');
      setShakeTrigger((prev) => prev + 1);
      setFeedback({
        type: 'error',
        title: 'Jawaban Akhir Belum Diisi',
        detail: `Masukkan hasil perkalian seluruh pembagi prima untuk nilai akhir ${currentQuestion.category}.`,
      });
      return;
    }

    const userFinal = Number(finalAnswerInput.trim());
    const divisors = completedRows.map((r) => r.primeDivisor);

    const finalCheck = validateFinalAnswer(
      currentQuestion.category,
      divisors,
      userFinal,
      currentQuestion.expectedAnswer
    );

    if (finalCheck.isValid) {
      isOperationScoredRef.current = true;
      soundEngine.playOperationSuccess();

      const completion = completeOperation(
        savedProgress.totalScore,
        lives,
        completedRows.length,
        currentQuestion.category,
        currentQuestion.numberA,
        currentQuestion.numberB,
        finalCheck.formulaText,
        mistakesInLevel
      );

      const curLvl = currentQuestion.level;
      const nextLvl = Math.min(20, curLvl + 1);
      const cat = currentQuestion.category;

      persistProgress((prev) => {
        const updatedRescued = prev.rescuedPatients.includes(activePatient.id)
          ? prev.rescuedPatients
          : [...prev.rescuedPatients, activePatient.id];

        if (cat === 'FPB') {
          const completedSet = Array.from(
            new Set([...prev.fpbCompletedLevels, curLvl])
          );
          return {
            ...prev,
            totalScore: prev.totalScore + completion.totalScoreAdded,
            coins: prev.coins + completion.coinsAddedOnCompletion,
            fpbUnlockedLevel: Math.max(prev.fpbUnlockedLevel, nextLvl),
            fpbCurrentLevel: nextLvl,
            fpbCompletedLevels: completedSet,
            rescuedPatients: updatedRescued,
            totalOperationsSucceeded: prev.totalOperationsSucceeded + 1,
          };
        } else {
          const completedSet = Array.from(
            new Set([...prev.kpkCompletedLevels, curLvl])
          );
          return {
            ...prev,
            totalScore: prev.totalScore + completion.totalScoreAdded,
            coins: prev.coins + completion.coinsAddedOnCompletion,
            kpkUnlockedLevel: Math.max(prev.kpkUnlockedLevel, nextLvl),
            kpkCurrentLevel: nextLvl,
            kpkCompletedLevels: completedSet,
            rescuedPatients: updatedRescued,
            totalOperationsSucceeded: prev.totalOperationsSucceeded + 1,
          };
        }
      });

      if (cat === 'FPB') {
        setSelectedFpbLevel(nextLvl);
      } else {
        setSelectedKpkLevel(nextLvl);
      }

      triggerCoinRewardAnimation(
        completion.totalScoreAdded,
        completion.coinsAddedOnCompletion,
        `Operasi Level ${curLvl} Berhasil!`
      );

      if (curLvl < 20) {
        setLevelUpBanner(
          `NAIK LEVEL! ${cat} Level ${nextLvl} (${getLevelTierMetadata(nextLvl).label}) Terbuka!`
        );
      } else {
        setLevelUpBanner(
          `LUAR BIASA! Anda Menamatkan Seluruh 20 Level ${cat}!`
        );
      }

      setLastCompletionReport(completion);
      setDoctorReaction('celebrate');
      setGameStatus('SUCCESS');
      setFlowStage('SURGERY_SUCCESS');
      setErrorField(null);
      setFeedback({
        type: 'success',
        title: `${completion.status} – ${completion.patientStatus}`,
        detail: `${completion.explanation} Total +${completion.totalLevelScoreEarned} Skor (+${completion.totalLevelCoinsEarned} Koin)!`,
      });
    } else {
      const lifeResult = reduceLife(lives);
      setLives(lifeResult.remainingLives);
      setMistakesInLevel((prev) => prev + 1);
      setErrorField('final');
      setShakeTrigger((prev) => prev + 1);
      setDoctorReaction('shocked');

      if (lifeResult.isGameOver) {
        soundEngine.playOperationCritical();
        setGameStatus('FAILED');
        setFlowStage('SURGERY_FAILED');
        setFeedback({
          type: 'error',
          title: lifeResult.statusTitle,
          detail: `${finalCheck.message} — ${lifeResult.statusMessage}`,
        });
      } else {
        soundEngine.playWrongAnswer();
        setTimeLeft(ANSWER_TIME_LIMIT);
        setFeedback({
          type: 'error',
          title: `Jawaban Akhir Belum Tepat (Nyawa Tersisa: ${lifeResult.remainingLives}/3)`,
          detail: finalCheck.message,
        });
        window.setTimeout(() => {
          setDoctorReaction((prev) => (prev === 'shocked' ? 'normal' : prev));
        }, 2200);
      }
    }
  };

  /**
   * Ulangi operasi dengan Soal Kejutan Baru pada level yang sama
   */
  const handleRetrySameQuestion = () => {
    soundEngine.playClick();
    const freshQuestion = generateQuestion(
      currentQuestion.category,
      selectedGrade,
      {
        level: currentQuestion.level,
        surpriseRandom: true,
      }
    );
    setupQuestionOnTable(freshQuestion, activePatient, {
      resetLivesToFull: true,
      playAmbulanceIntro: false,
    });
  };

  /**
   * Lanjut ke Level Berikutnya & Karakter Pasien Berikutnya dengan Soal Kejutan Baru
   */
  const handleNextLevelAndPatient = () => {
    soundEngine.playClick();
    const nextLvl = Math.min(20, currentQuestion.level + 1);
    const nextPatient = getPatientByIndex(
      savedProgress.totalOperationsSucceeded
    );
    setSelectedPatientId(nextPatient.id);

    if (currentQuestion.category === 'FPB') {
      setSelectedFpbLevel(nextLvl);
    } else {
      setSelectedKpkLevel(nextLvl);
    }

    const nextQ = generateQuestion(currentQuestion.category, selectedGrade, {
      level: nextLvl,
      surpriseRandom: true,
    });
    setupQuestionOnTable(nextQ, nextPatient, {
      resetLivesToFull: true,
      playAmbulanceIntro: true,
    });
  };

  /**
   * Handler Pembelian Barang Toko Upgrade (Tahap 3 Bagian E)
   */
  const handlePurchaseStoreItem = (itemId: HouseUpgradeItemId) => {
    const result = purchaseUpgradeItemTransaction(savedProgress, itemId);
    if (result.success) {
      setSavedProgress(result.updatedProgress);
      firebaseHospitalService.syncPlayerAndLeaderboard(result.updatedProgress);
    }
    return {
      success: result.success,
      message: result.message,
    };
  };

  /**
   * Handler Upgrade Tahapan Rumah Mewah (1 -> 5) (Tahap 3 Bagian D)
   */
  const handleUpgradeHouseTier = (targetTier: HouseTierId) => {
    const result = upgradeHouseTierTransaction(savedProgress, targetTier);
    if (result.success) {
      setSavedProgress(result.updatedProgress);
      firebaseHospitalService.syncPlayerAndLeaderboard(result.updatedProgress);
    }
    return {
      success: result.success,
      message: result.message,
    };
  };

  // Petunjuk pembagi prima valid untuk baris saat ini
  const validPrimesForActiveRow = useMemo(
    () =>
      getValidPrimeDivisorsForPair(
        currentQuestion.category,
        activeDividendA,
        activeDividendB
      ),
    [currentQuestion.category, activeDividendA, activeDividendB]
  );

  // Pilihan Angka Prima Pembagi (Tanpa Keypad)
  const primeNumberChoices = useMemo(
    () =>
      Array.from(
        new Set([2, 3, 5, 7, 11, 13, ...validPrimesForActiveRow])
      ).sort((a, b) => a - b),
    [validPrimesForActiveRow]
  );

  // Pilihan Angka Cerdas untuk Hasil Bagi Pertama (activeDividendA ÷ prima)
  const quotientAChoices = useMemo(() => {
    const chosenP = Number(primeInput) || validPrimesForActiveRow[0] || 2;
    const set = new Set<number>();

    // Masukkan jawaban yang benar berdasarkan prima terpilih & semua prima valid
    const primesToInclude = Array.from(
      new Set([chosenP, ...validPrimesForActiveRow])
    );
    primesToInclude.forEach((p) => {
      if (p >= 2 && activeDividendA % p === 0) {
        set.add(activeDividendA / p);
      }
    });
    if (currentQuestion.category === 'KPK') {
      set.add(activeDividendA); // Aturan KPK: turunkan angka jika tidak habis dibagi
    }

    const baseTarget =
      activeDividendA % chosenP === 0
        ? activeDividendA / chosenP
        : currentQuestion.category === 'KPK'
          ? activeDividendA
          : Math.max(1, Math.floor(activeDividendA / chosenP));

    set.add(Math.max(1, baseTarget));
    const offsets = [-2, -1, 1, 2, 3, -3, 4, 5, 6];
    for (const off of offsets) {
      if (set.size >= 6) break;
      const cand = baseTarget + off;
      if (cand >= 1) set.add(cand);
    }
    return Array.from(set)
      .slice(0, 6)
      .sort((a, b) => a - b);
  }, [
    activeDividendA,
    primeInput,
    validPrimesForActiveRow,
    currentQuestion.category,
  ]);

  // Pilihan Angka Cerdas untuk Hasil Bagi Kedua (activeDividendB ÷ prima)
  const quotientBChoices = useMemo(() => {
    const chosenP = Number(primeInput) || validPrimesForActiveRow[0] || 2;
    const set = new Set<number>();

    const primesToInclude = Array.from(
      new Set([chosenP, ...validPrimesForActiveRow])
    );
    primesToInclude.forEach((p) => {
      if (p >= 2 && activeDividendB % p === 0) {
        set.add(activeDividendB / p);
      }
    });
    if (currentQuestion.category === 'KPK') {
      set.add(activeDividendB);
    }

    const baseTarget =
      activeDividendB % chosenP === 0
        ? activeDividendB / chosenP
        : currentQuestion.category === 'KPK'
          ? activeDividendB
          : Math.max(1, Math.floor(activeDividendB / chosenP));

    set.add(Math.max(1, baseTarget));
    const offsets = [-2, -1, 1, 2, 3, -3, 4, 5, 6];
    for (const off of offsets) {
      if (set.size >= 6) break;
      const cand = baseTarget + off;
      if (cand >= 1) set.add(cand);
    }
    return Array.from(set)
      .slice(0, 6)
      .sort((a, b) => a - b);
  }, [
    activeDividendB,
    primeInput,
    validPrimesForActiveRow,
    currentQuestion.category,
  ]);

  // Pilihan Angka Cerdas untuk Jawaban Akhir FPB / KPK (Tanpa Keypad)
  const finalAnswerChoices = useMemo(() => {
    const target = currentQuestion.expectedAnswer;
    const sumDivisors = completedRows.reduce((acc, r) => acc + r.primeDivisor, 0);
    const candidates = [
      target,
      sumDivisors > 0 ? sumDivisors : target + 2,
      Math.max(1, Math.floor(target / 2)),
      target * 2,
      Math.max(1, target - 2),
      target + 2,
      target + 4,
      target + 6,
      Math.max(1, target - 3),
    ];
    const unique = new Set<number>();
    for (const c of candidates) {
      if (unique.size >= 6) break;
      if (c >= 1) unique.add(c);
    }
    let step = 1;
    while (unique.size < 6) {
      unique.add(target + step++);
    }
    return Array.from(unique).sort((a, b) => a - b);
  }, [currentQuestion.expectedAnswer, completedRows]);

  const stageMeta = FLOW_STAGE_LABELS[flowStage];
  const isIntroTransition =
    gameStatus === 'PLAYING' &&
    (flowStage === 'AMBULANCE_ARRIVING' ||
      flowStage === 'PATIENT_UNLOADING' ||
      flowStage === 'ENTERING_HOSPITAL' ||
      flowStage === 'DOCTOR_PREP');

  // Jika pemain sedang membuka fitur MY DREAM HOUSE 3D & TOKO UPGRADE
  if (viewMode === 'DREAM_HOUSE') {
    return (
      <DreamHouse3D
        progress={savedProgress}
        onCloseToHospital={() => setViewMode('HOSPITAL')}
        onPurchaseItem={handlePurchaseStoreItem}
        onUpgradeHouseTier={handleUpgradeHouseTier}
      />
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col justify-between text-slate-900 select-none">
      {/* LINGKUNGAN 3D RUMAH SAKIT & RUANG OPERASI (Three.js Full-Viewport Canvas) */}
      {/* Di halaman depan (MENU), nomor soal disembunyikan (0, 0) sebagai Kejutan Soal! */}
      <OperatingRoom3D
        lives={lives}
        status={gameStatus}
        flowStage={gameStatus === 'MENU' ? 'EXTERIOR_IDLE' : flowStage}
        category={
          gameStatus === 'MENU' ? selectedCategory : currentQuestion.category
        }
        cameraPreset={cameraPreset}
        numberA={gameStatus === 'MENU' ? 0 : currentQuestion.numberA}
        numberB={gameStatus === 'MENU' ? 0 : currentQuestion.numberB}
        patient={activePatient}
        surgeryProgress={surgeryProgress}
        doctorReaction={doctorReaction}
        doctorAnimOverride={doctorAnimOverride}
        forceFallback2D={forceFallback2D}
        onMonitorInteract={() => {
          setCameraPreset((prev) =>
            prev === 'monitor' ? 'overview' : 'monitor'
          );
        }}
      />

      {/* ANIMASI POPUP KOIN MASUK KE SALDO PEMAIN (Tahap 3 Bagian C) */}
      {coinPopup && (
        <div className="fixed top-12 right-3 z-50 bg-amber-400 text-slate-950 border-2 border-white px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 font-extrabold text-xs animate-row-pop pointer-events-none">
          <Coins className="w-4 h-4 text-slate-950 shrink-0" />
          <div>
            <span>{coinPopup.label}: </span>
            <span className="font-mono">
              +{coinPopup.scoreAdded} Skor (+{coinPopup.coinsAdded} Koin)
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          HUD SATU BARIS TIPIS DI BAGIAN PALING ATAS LAYAR
          Menggabungkan Nama Dokter, Level, Nyawa (3 Hati), Skor, Koin, Progress,
          Top 100 Leaderboard & My Dream House dalam 1 baris tipis agar ruang
          vertikal untuk area 3D (Pasien & Dokter) maksimal di layar HP & PID!
          ===================================================================== */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 bg-slate-950/95 border-b border-slate-800 text-white shrink-0">
        {/* Kiri: Tombol Menu / Judul & Identitas Dokter + Level Aktif */}
        <div className="flex items-center gap-2 min-w-0">
          {gameStatus !== 'MENU' ? (
            <button
              type="button"
              onClick={() => {
                clearSequenceTimers();
                soundEngine.playClick();
                setGameStatus('MENU');
                setFlowStage('EXTERIOR_IDLE');
                setCameraPreset('exterior');
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              title="Kembali ke Halaman Depan"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          ) : (
            <Stethoscope className="w-4 h-4 text-sky-400 shrink-0" />
          )}

          <div className="truncate text-xs font-extrabold tracking-tight flex items-center gap-1.5">
            <span className="truncate max-w-[115px] sm:max-w-[180px]">
              {playerName}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-[10px] sm:text-xs shrink-0">
              {gameStatus === 'MENU'
                ? `${selectedCategory} Lv.${activeLevel}`
                : `${currentQuestion.category} Lv.${currentQuestion.level}`}
            </span>
          </div>
        </div>

        {/* Tengah: Satu Baris Kompak untuk NYAWA, TIMER 10 DETIK, SKOR, KOIN & PROGRES */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs">
          {/* Komponen Nyawa (3 Hati) */}
          <div
            className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-1"
            title={`Nyawa tersisa ${lives} dari 3`}
          >
            {[1, 2, 3].map((h) => (
              <Heart
                key={h}
                className={`w-3.5 h-3.5 ${
                  h <= lives
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-slate-600 fill-slate-800'
                }`}
              />
            ))}
            <span className="font-extrabold text-rose-300 ml-0.5">
              {lives}/3
            </span>
          </div>

          {/* Indikator Timer 20 Detik saat bermain */}
          {gameStatus === 'PLAYING' && flowStage === 'MATH_SURGERY' && (
            <div
              className={`px-2 py-0.5 rounded-lg border font-extrabold flex items-center gap-1 ${
                timeLeft <= 5
                  ? 'bg-rose-600 text-white border-rose-300 animate-pulse'
                  : timeLeft <= 10
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600'
              }`}
              title="Waktu menjawab 20 detik. Jika habis, nyawa berkurang 1!"
            >
              <Timer className="w-3.5 h-3.5 shrink-0" />
              <span>{timeLeft}d</span>
            </div>
          )}

          {/* Komponen Skor */}
          <div className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 flex items-center gap-1 font-extrabold text-white">
            <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{savedProgress.totalScore}</span>
          </div>

          {/* Komponen Koin */}
          <div className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-extrabold flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span>{savedProgress.coins}</span>
          </div>

          {/* Mini Bar Progres Operasi saat bermain */}
          {gameStatus !== 'MENU' && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg">
              <span className="text-[10px] text-slate-400 font-sans font-bold">
                Operasi:
              </span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${surgeryProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-300 font-bold">
                {surgeryProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Kanan: Tombol Top 100 Leaderboard, My Dream House & Audit 20 Fitur */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              const cleanName = playerName.trim() || 'Dokter Cilik';
              const cleanSchool = schoolName.trim() || 'SDN 66 Banda Aceh';
              persistProgress((prev) => ({
                ...prev,
                playerName: cleanName,
                schoolName: cleanSchool,
                grade: selectedGrade,
              }));
              setIsLeaderboardOpen(true);
            }}
            className="px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title={`Status: ${firebaseStatus}`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Top 100</span>
            {firebaseStatus === 'FIREBASE TERHUBUNG' ? (
              <Wifi className="w-3 h-3 text-emerald-300 hidden sm:inline" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-200 hidden sm:inline" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setViewMode('DREAM_HOUSE');
            }}
            className="px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Rumah 3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTutorialInitialTab(
                gameStatus === 'PLAYING'
                  ? 'SOAL_AKTIF'
                  : selectedCategory === 'KPK'
                    ? 'KPK'
                    : 'FPB'
              );
              setIsTutorialOpen(true);
            }}
            className="px-2.5 py-1 text-[11px] sm:text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Buka Petunjuk & Tutorial Pengerjaan FPB dan KPK"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span>Tutorial</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsTestModalOpen(true);
            }}
            className="px-2 py-1 text-[11px] font-extrabold text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Laporan Audit 20 Fitur (Tahap 5) & Verifikasi 6 Soal Wajib"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline">Uji 20 Fitur</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          AREA UTAMA PERMAINAN (Menyisakan Ruang Visual 3D Luas di Bagian Atas!)
          ===================================================================== */}
      {!inspect3DOnly && (
        <main className="relative z-10 flex-1 flex flex-col justify-end px-2.5 pb-11 pt-2 sm:px-5 sm:pb-12 pointer-events-none overflow-hidden">
          {gameStatus === 'MENU' ? (
            /* =================================================================
               A. HALAMAN PERTAMA PER BAGIAN PER HALAMAN (STEP 1/3, 2/3, 3/3)
               Ditempatkan kompak di bagian bawah agar Gedung RS 3D, Ambulans,
               Pintu Otomatis, Dokter & Perawat terlihat jelas di layar HP & PID!
               ================================================================= */
            <div className="w-full max-w-2xl mx-auto mt-auto pointer-events-auto">
              <div className="bg-white/95 border-2 border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xl">
                {/* Header Wizard Halaman Pertama + Tab Indikator Bagian 1, 2, 3 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-extrabold text-sky-700 uppercase tracking-wider">
                      3D HOSPITAL SURGERY · SDN 66 BANDA ACEH
                    </div>
                    <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {menuStep === 1 && 'Bagian 1/3: Identitas Dokter Cilik'}
                      {menuStep === 2 &&
                        'Bagian 2/3: Pilih Kategori & Level (1–20)'}
                      {menuStep === 3 &&
                        'Bagian 3/3: Pilih Pasien & Mulai Operasi'}
                    </h1>
                  </div>

                  {/* Tombol Navigasi Cepat Antar Halaman (1, 2, 3) */}
                  <div className="flex items-center gap-1">
                    {([1, 2, 3] as const).map((stepNum) => (
                      <button
                        key={stepNum}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMenuStep(stepNum);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                          menuStep === stepNum
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Hal {stepNum}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ISI PER BAGIAN PER HALAMAN */}
                {menuStep === 1 && (
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="input-player-name"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Nama Dokter Cilik
                        </label>
                        <input
                          id="input-player-name"
                          type="text"
                          required
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Nama Dokter..."
                          className="w-full px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="input-school-name"
                          className="block text-xs font-bold text-slate-700 mb-1"
                        >
                          Asal Sekolah
                        </label>
                        <input
                          id="input-school-name"
                          type="text"
                          required
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          placeholder="SDN 66 Banda Aceh"
                          className="w-full px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Pilih Kelas (Kelas 1 – 6 SD)
                      </label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setSelectedGrade(g);
                            }}
                            className={`py-1.5 text-xs font-extrabold rounded-lg border cursor-pointer ${
                              selectedGrade === g
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Kls {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500">
                        Rumah Impian:{' '}
                        <strong className="text-slate-800">
                          {
                            HOUSE_TIERS.find(
                              (t) => t.tier === savedProgress.houseTier
                            )?.name
                          }
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          const cleanName =
                            playerName.trim() || 'Dokter Cilik';
                          const cleanSchool =
                            schoolName.trim() || 'SDN 66 Banda Aceh';
                          setPlayerName(cleanName);
                          setSchoolName(cleanSchool);
                          persistProgress((prev) => ({
                            ...prev,
                            playerName: cleanName,
                            schoolName: cleanSchool,
                            grade: selectedGrade,
                          }));
                          setMenuStep(2);
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Lanjut: Pilih Kategori &amp; Level</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {menuStep === 2 && (
                  <div className="mt-3 space-y-2.5">
                    {/* Pilihan Kategori FPB vs KPK */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedCategory('FPB');
                        }}
                        className={`p-2 rounded-xl border text-left cursor-pointer ${
                          selectedCategory === 'FPB'
                            ? 'bg-sky-50 border-sky-600 ring-2 ring-sky-500/20'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            Kategori FPB
                          </span>
                          <span className="text-[10px] font-mono font-bold text-sky-700">
                            Terbuka Lv.{savedProgress.fpbUnlockedLevel}/20
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Pembagi prima membagi habis kedua angka.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedCategory('KPK');
                        }}
                        className={`p-2 rounded-xl border text-left cursor-pointer ${
                          selectedCategory === 'KPK'
                            ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            Kategori KPK
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-700">
                            Terbuka Lv.{savedProgress.kpkUnlockedLevel}/20
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Bagi prima sampai kedua angka menjadi (1, 1).
                        </p>
                      </button>
                    </div>

                    {/* Grid 20 Level Kompak */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700">
                          Pilih Level {selectedCategory} (1–20):
                        </span>
                        <span className="font-extrabold text-sky-700 text-[11px]">
                          {activeLevelTierMeta.shortDesc} · Soal Kejutan (? &amp; ?)
                        </span>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {Array.from({ length: 20 }, (_, i) => i + 1).map(
                          (lvlNum) => {
                            const isSel = activeLevel === lvlNum;
                            const isDone =
                              selectedCategory === 'FPB'
                                ? savedProgress.fpbCompletedLevels.includes(
                                    lvlNum
                                  )
                                : savedProgress.kpkCompletedLevels.includes(
                                    lvlNum
                                  );
                            return (
                              <button
                                key={lvlNum}
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  if (selectedCategory === 'FPB') {
                                    setSelectedFpbLevel(lvlNum);
                                  } else {
                                    setSelectedKpkLevel(lvlNum);
                                  }
                                }}
                                className={`py-1.5 rounded-lg text-xs font-mono font-extrabold border cursor-pointer ${
                                  isSel
                                    ? 'bg-sky-600 text-white border-sky-700'
                                    : isDone
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                      : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {lvlNum}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setMenuStep(1);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          &larr; Kembali
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setTutorialInitialTab(
                              selectedCategory === 'KPK' ? 'KPK' : 'FPB'
                            );
                            setIsTutorialOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                          <span>Cara {selectedCategory}</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMenuStep(3);
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Lanjut: Pilih Pasien &amp; Mulai</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {menuStep === 3 && (
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Pilih 1 dari 7 Karakter Pasien:
                      </span>
                      <span className="font-bold text-emerald-700 text-[11px]">
                        Soal {selectedCategory} Lv.{activeLevel} Rahasia (? &amp; ?)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {PATIENT_CHARACTERS.map((pat) => {
                        const isSelected = pat.id === selectedPatientId;
                        return (
                          <button
                            key={pat.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setSelectedPatientId(pat.id);
                            }}
                            className={`p-1.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 border-sky-600 ring-2 ring-sky-500/20'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <img
                              src={pat.avatarUrl}
                              alt={pat.conditionName}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-300"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-extrabold text-slate-900 truncate">
                                {pat.orderNumber}. {pat.conditionName.split(' ')[0]}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {pat.patientName}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMenuStep(2);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        &larr; Level
                      </button>

                      <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                        <button
                          type="button"
                          onClick={() => handleStartGame(undefined, false)}
                          className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer whitespace-nowrap"
                        >
                          Langsung Meja Operasi
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleStartGame(e, true)}
                          className="px-4 py-2 text-xs sm:text-sm font-extrabold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <Ambulance className="w-4 h-4" />
                          <span>
                            Mulai {selectedCategory} Lv.{activeLevel}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =================================================================
               G. PANEL TABEL MATEMATIKA KOMPAK DI BAGIAN BAWAH LAYAR (mt-auto)
               Memberikan 55%-60% ruang terbuka di bagian atas layar agar animasi
               3D Pasien, Dokter, Perawat & Monitor terlihat jelas di HP & PID!
               ================================================================= */
            <div className="w-full max-w-4xl mx-auto mt-auto pointer-events-auto">
              {/* Banner Intro Animasi Ambulans (Tahap 1-4) */}
              {isIntroTransition && (
                <div className="mb-2 bg-slate-950/90 text-white border border-slate-700 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-xl">
                  <div className="text-xs">
                    <span className="font-extrabold text-sky-400">
                      {stageMeta.title}
                    </span>
                    <span className="hidden sm:inline text-slate-300">
                      {' '}
                      — {stageMeta.subtitle}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipIntroToTable}
                    className="px-2.5 py-1 text-[11px] font-extrabold bg-sky-600 hover:bg-sky-500 text-white rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <FastForward className="w-3 h-3" />
                    <span>Lewati Animasi</span>
                  </button>
                </div>
              )}

              {/* KARTU KOMPAK TABEL PEMBAGIAN BILANGAN PRIMA (Berada Lebih Rendah di Layar) */}
              <div className="bg-white/95 border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden">
                {/* Bar Judul Soal Kompak + Tombol Minimize untuk Layar HP */}
                <div className="px-3.5 py-2 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-mono text-xs font-extrabold">
                      {currentQuestion.category} LV.{currentQuestion.level}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold">
                      {isIntroTransition ? (
                        <span className="text-amber-300">
                          Membuka Soal Kejutan...
                        </span>
                      ) : (
                        <>
                          Soal:{' '}
                          <span className="font-mono text-amber-300 text-sm sm:text-base">
                            {currentQuestion.category}({currentQuestion.numberA},{' '}
                            {currentQuestion.numberB})
                          </span>
                        </>
                      )}
                    </span>
                    <span className="hidden md:inline text-[11px] text-slate-300">
                      · Pasien: {activePatient.patientName} ({activePatient.conditionName})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Timer Hitung Mundur 20 Detik di Header Tabel */}
                    {gameStatus === 'PLAYING' && flowStage === 'MATH_SURGERY' && (
                      <div
                        className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-extrabold flex items-center gap-1 border ${
                          timeLeft <= 5
                            ? 'bg-rose-600 text-white border-white animate-pulse'
                            : timeLeft <= 10
                              ? 'bg-amber-400 text-slate-950 border-amber-200'
                              : 'bg-emerald-500 text-slate-950 border-emerald-300'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>Waktu: {timeLeft}d</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setTutorialInitialTab('SOAL_AKTIF');
                        setIsTutorialOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                      title="Lihat Petunjuk & Cara Mengerjakan Soal Ini"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-200" />
                      <span>Petunjuk {currentQuestion.category}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSurpriseNewQuestion}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                      title="Ganti dengan soal kejutan acak baru"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Soal Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextCat: MathCategory =
                          currentQuestion.category === 'FPB' ? 'KPK' : 'FPB';
                        setSelectedCategory(nextCat);
                        const nextLvl =
                          nextCat === 'FPB'
                            ? selectedFpbLevel
                            : selectedKpkLevel;
                        const q = generateQuestion(nextCat, selectedGrade, {
                          level: nextLvl,
                          surpriseRandom: true,
                        });
                        setupQuestionOnTable(q, activePatient, {
                          resetLivesToFull: true,
                          playAmbulanceIntro: false,
                        });
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold cursor-pointer"
                    >
                      Ke {currentQuestion.category === 'FPB' ? 'KPK' : 'FPB'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsTableMinimizedOnMobile((prev) => !prev)
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {isTableMinimizedOnMobile ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Buka Tabel</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden sm:inline">Kecilkan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!isTableMinimizedOnMobile && (
                  <div className="p-2.5 sm:p-3.5 max-h-[38vh] sm:max-h-[42vh] overflow-y-auto">
                    {/* Umpan Balik Baris Satu Baris Ringkas */}
                    {feedback && (
                      <div
                        key={shakeTrigger}
                        className={`mb-2 px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 animate-row-pop'
                            : feedback.type === 'error'
                              ? 'bg-rose-50 border-rose-300 text-rose-950 animate-row-shake'
                              : 'bg-sky-50 border-sky-200 text-sky-950'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : feedback.type === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        ) : (
                          <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold">
                            {feedback.title}:{' '}
                          </span>
                          <span className="opacity-90">{feedback.detail}</span>
                        </div>
                      </div>
                    )}

                    {/* Tabel Pembagian Bilangan Prima Kompak & Ramah Sentuh HP/PID */}
                    <div className="overflow-x-auto border border-slate-300 rounded-xl">
                      <table className="w-full border-collapse text-center font-mono tabular-nums text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[11px] sm:text-xs">
                            <th className="py-1.5 px-2 text-left font-sans font-bold">
                              Baris
                            </th>
                            <th className="py-1.5 px-2 border-r border-slate-600 text-sky-300 font-bold">
                              1. Prima Pembagi
                            </th>
                            <th className="py-1.5 px-2 font-bold">
                              Angka I ({currentQuestion.numberA})
                            </th>
                            <th className="py-1.5 px-2 font-bold">
                              Angka II ({currentQuestion.numberB})
                            </th>
                            <th className="py-1.5 px-2 text-left font-sans font-bold">
                              Aksi &amp; Skor
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedRows.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className="border-b border-slate-200 bg-emerald-50/60"
                            >
                              <td className="py-1 px-2 text-left font-sans text-[11px] font-bold text-slate-600">
                                #{row.rowNumber}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-300 font-extrabold text-emerald-700 bg-emerald-100/60">
                                ÷ {row.primeDivisor}
                              </td>
                              <td className="py-1 px-2 font-bold text-slate-800">
                                {row.dividendA}
                              </td>
                              <td className="py-1 px-2 font-bold text-slate-800">
                                {row.dividendB}
                              </td>
                              <td className="py-1 px-2 text-left font-sans text-[11px] font-bold text-emerald-800">
                                ({row.quotientA}, {row.quotientB}) · +50
                              </td>
                            </tr>
                          ))}

                          {gameStatus === 'PLAYING' && !isTableFinished && (
                            <>
                              <tr className="border-b border-slate-200 bg-sky-50/70">
                                <td className="py-1.5 px-2 text-left font-sans text-xs font-bold text-sky-900">
                                  #{completedRows.length + 1}
                                </td>
                                <td className="py-1.5 px-2 border-r border-slate-300 bg-sky-100/70">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-xs font-bold text-sky-800">
                                      ÷
                                    </span>
                                    <input
                                      ref={primeInputRef}
                                      type="number"
                                      inputMode="numeric"
                                      min={2}
                                      value={primeInput}
                                      onFocus={() =>
                                        setActiveNumpadField('prime')
                                      }
                                      onChange={(e) =>
                                        setPrimeInput(e.target.value)
                                      }
                                      placeholder="Prima"
                                      aria-label="Bilangan prima pembagi"
                                      className={`w-16 sm:w-20 px-1.5 py-1 text-center font-mono font-bold text-xs sm:text-sm bg-white border-2 rounded-lg focus:outline-none ${
                                        errorField === 'prime'
                                          ? 'border-rose-500 bg-rose-50 text-rose-900'
                                          : activeNumpadField === 'prime'
                                            ? 'border-sky-600 ring-2 ring-sky-200 text-slate-900'
                                            : 'border-sky-500 text-slate-900'
                                      }`}
                                    />
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 font-extrabold text-sm sm:text-base text-slate-900">
                                  {activeDividendA}
                                </td>
                                <td className="py-1.5 px-2 font-extrabold text-sm sm:text-base text-slate-900">
                                  {activeDividendB}
                                </td>
                                <td className="py-1.5 px-2 text-left font-sans text-[11px] text-slate-600">
                                  {currentQuestion.category === 'FPB'
                                    ? `Bagi habis keduanya`
                                    : `Bagi salah satu/keduanya`}
                                </td>
                              </tr>

                              <tr className="bg-amber-50/60">
                                <td className="py-1.5 px-2 text-left font-sans text-[11px] font-bold text-slate-700">
                                  Hasil ↓
                                </td>
                                <td className="py-1.5 px-2 border-r border-slate-300 font-sans text-[11px] font-semibold text-slate-600">
                                  Hasil Bagi
                                </td>
                                <td className="py-1.5 px-2">
                                  <input
                                    ref={quotientAInputRef}
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    value={quotientAInput}
                                    onFocus={() =>
                                      setActiveNumpadField('quotientA')
                                    }
                                    onChange={(e) =>
                                      setQuotientAInput(e.target.value)
                                    }
                                    placeholder={`${activeDividendA}÷p`}
                                    aria-label="Hasil pembagian bilangan pertama"
                                    className={`w-20 sm:w-24 px-1.5 py-1 text-center font-mono font-bold text-xs sm:text-sm bg-white border-2 rounded-lg focus:outline-none ${
                                      errorField === 'quotientA' ||
                                      errorField === 'bothQuotients'
                                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                                        : activeNumpadField === 'quotientA'
                                          ? 'border-sky-600 ring-2 ring-sky-200 text-slate-900'
                                          : 'border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input
                                    ref={quotientBInputRef}
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    value={quotientBInput}
                                    onFocus={() =>
                                      setActiveNumpadField('quotientB')
                                    }
                                    onChange={(e) =>
                                      setQuotientBInput(e.target.value)
                                    }
                                    placeholder={`${activeDividendB}÷p`}
                                    aria-label="Hasil pembagian bilangan kedua"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleValidateCurrentRow(e);
                                      }
                                    }}
                                    className={`w-20 sm:w-24 px-1.5 py-1 text-center font-mono font-bold text-xs sm:text-sm bg-white border-2 rounded-lg focus:outline-none ${
                                      errorField === 'quotientB' ||
                                      errorField === 'bothQuotients'
                                        ? 'border-rose-500 bg-rose-50 text-rose-900'
                                        : activeNumpadField === 'quotientB'
                                          ? 'border-sky-600 ring-2 ring-sky-200 text-slate-900'
                                          : 'border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-left font-sans">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={handleValidateCurrentRow}
                                      className="px-2.5 py-1 text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm cursor-pointer whitespace-nowrap"
                                    >
                                      Periksa (+50)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowHint((prev) => !prev)
                                      }
                                      className="p-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                      title="Bantuan Prima"
                                    >
                                      <HelpCircle className="w-4 h-4 text-sky-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </>
                          )}

                          {isTableFinished && (
                            <tr className="bg-slate-900 text-white font-bold text-xs">
                              <td className="py-1.5 px-2 text-left font-sans text-emerald-400">
                                Akhir
                              </td>
                              <td className="py-1.5 px-2 border-r border-slate-700 text-emerald-400">
                                SELESAI
                              </td>
                              <td className="py-1.5 px-2">{activeDividendA}</td>
                              <td className="py-1.5 px-2">{activeDividendB}</td>
                              <td className="py-1.5 px-2 text-left font-sans text-slate-300 font-normal">
                                {currentQuestion.category === 'FPB'
                                  ? `Relatif prima (${activeDividendA}, ${activeDividendB})`
                                  : 'Mencapai (1, 1)'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* =========================================================
                        PILIHAN ANGKA LANGSUNG (TANPA KEYPAD) UNTUK LAYAR HP KECIL
                        Pemain cukup memilih angka untuk:
                        1. Pembagi Prima -> 2. Hasil Bagi I -> 3. Hasil Bagi II
                        ========================================================= */}
                    {gameStatus === 'PLAYING' && !isTableFinished && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-900 text-white border border-slate-700 space-y-1.5">
                        {/* Tab Pemilihan Kolom Baris + Petunjuk */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            {(
                              [
                                {
                                  id: 'prime',
                                  label: `1. Prima (${primeInput || '?'})`,
                                },
                                {
                                  id: 'quotientA',
                                  label: `2. Hasil I (${quotientAInput || '?'})`,
                                },
                                {
                                  id: 'quotientB',
                                  label: `3. Hasil II (${quotientBInput || '?'})`,
                                },
                              ] as const
                            ).map((col) => (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick();
                                  setActiveNumpadField(col.id);
                                }}
                                className={`px-2 py-0.5 rounded-lg font-extrabold cursor-pointer transition-colors ${
                                  activeNumpadField === col.id
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {col.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setShowHint((prev) => !prev);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                              showHint
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-400/40'
                            }`}
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>
                              {showHint ? 'Tutup Bantuan' : 'Bantuan Baris Ini'}
                            </span>
                          </button>
                        </div>

                        {/* Kotak Petunjuk Langkah Baris Aktif (Jika Tombol Bantuan Diklik) */}
                        {showHint && (
                          <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/90 border border-amber-400/60 text-amber-100 text-[11px] flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-extrabold text-amber-300">
                                Petunjuk Langkah #{completedRows.length + 1}:{' '}
                              </span>
                              <span>
                                1. Pilih Prima{' '}
                                <strong className="font-mono text-white">
                                  {validPrimesForActiveRow.join(' / ')}
                                </strong>{' '}
                                &rarr; 2. Hasil I:{' '}
                                <strong className="font-mono text-white">
                                  {(() => {
                                    const p =
                                      Number(primeInput) ||
                                      validPrimesForActiveRow[0] ||
                                      2;
                                    return activeDividendA % p === 0
                                      ? `${activeDividendA}÷${p}=${activeDividendA / p}`
                                      : `tetap ${activeDividendA}`;
                                  })()}
                                </strong>{' '}
                                &rarr; 3. Hasil II:{' '}
                                <strong className="font-mono text-white">
                                  {(() => {
                                    const p =
                                      Number(primeInput) ||
                                      validPrimesForActiveRow[0] ||
                                      2;
                                    return activeDividendB % p === 0
                                      ? `${activeDividendB}÷${p}=${activeDividendB / p}`
                                      : `tetap ${activeDividendB}`;
                                  })()}
                                </strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setTutorialInitialTab('SOAL_AKTIF');
                                setIsTutorialOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[10px] cursor-pointer shrink-0"
                            >
                              Buka Tutorial Lengkap
                            </button>
                          </div>
                        )}

                        {/* Barisan Tombol Pilihan Angka Sesuai Kolom Aktif */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-bold text-sky-300 mr-0.5">
                              {activeNumpadField === 'prime'
                                ? 'Pilih Prima:'
                                : activeNumpadField === 'quotientA'
                                  ? `Pilih Hasil ${activeDividendA}÷${primeInput || 'p'}:`
                                  : `Pilih Hasil ${activeDividendB}÷${primeInput || 'p'}:`}
                            </span>

                            {activeNumpadField === 'prime' &&
                              primeNumberChoices.map((p) => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    setPrimeInput(String(p));
                                    setActiveNumpadField('quotientA');
                                  }}
                                  className={`min-w-[36px] px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs sm:text-sm border cursor-pointer transition-transform active:scale-95 ${
                                    Number(primeInput) === p
                                      ? 'bg-sky-500 text-slate-950 border-white'
                                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}

                            {activeNumpadField === 'quotientA' &&
                              quotientAChoices.map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    setQuotientAInput(String(val));
                                    setActiveNumpadField('quotientB');
                                  }}
                                  className={`min-w-[38px] px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs sm:text-sm border cursor-pointer transition-transform active:scale-95 ${
                                    quotientAInput !== '' &&
                                    Number(quotientAInput) === val
                                      ? 'bg-amber-400 text-slate-950 border-white'
                                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}

                            {activeNumpadField === 'quotientB' &&
                              quotientBChoices.map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick();
                                    setQuotientBInput(String(val));
                                  }}
                                  className={`min-w-[38px] px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs sm:text-sm border cursor-pointer transition-transform active:scale-95 ${
                                    quotientBInput !== '' &&
                                    Number(quotientBInput) === val
                                      ? 'bg-emerald-400 text-slate-950 border-white'
                                      : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleValidateCurrentRow}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md shrink-0"
                          >
                            Jawab Baris (+50)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Form & Pilihan Angka Jawaban Akhir FPB / KPK (Tanpa Keypad) */}
                    {gameStatus === 'PLAYING' && isTableFinished && (
                      <form
                        onSubmit={handleValidateFinalAnswer}
                        className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white border-2 border-sky-500 space-y-2 animate-row-pop"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-bold">
                            <span className="text-sky-300 uppercase font-extrabold mr-1.5">
                              Pilih Jawaban Akhir {currentQuestion.category}:
                            </span>
                            <span className="font-mono text-amber-300">
                              {completedRows
                                .map((r) => r.primeDivisor)
                                .join(' × ')}{' '}
                              = {finalAnswerInput || '?'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              ref={finalInputRef}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              value={finalAnswerInput}
                              onFocus={() => setActiveNumpadField('final')}
                              onChange={(e) =>
                                setFinalAnswerInput(e.target.value)
                              }
                              placeholder="Hasil"
                              className={`w-20 px-2 py-1 text-center font-mono font-extrabold text-xs sm:text-sm bg-white border-2 rounded-lg focus:outline-none ${
                                errorField === 'final'
                                  ? 'border-rose-500 bg-rose-50 text-rose-900'
                                  : 'border-sky-400 text-slate-900'
                              }`}
                            />
                            <button
                              type="submit"
                              className="px-3.5 py-1.5 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-md cursor-pointer whitespace-nowrap"
                            >
                              Selesaikan Operasi
                            </button>
                          </div>
                        </div>

                        {/* Tombol Pilihan Angka Jawaban Akhir */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                          <span className="text-[11px] font-bold text-slate-300">
                            Pilihan Angka:
                          </span>
                          {finalAnswerChoices.map((ans) => (
                            <button
                              key={ans}
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setFinalAnswerInput(String(ans));
                              }}
                              className={`min-w-[44px] px-3 py-1 rounded-lg font-mono font-extrabold text-xs sm:text-sm border cursor-pointer transition-transform active:scale-95 ${
                                finalAnswerInput !== '' &&
                                Number(finalAnswerInput) === ans
                                  ? 'bg-emerald-400 text-slate-950 border-white'
                                  : 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
                              }`}
                            >
                              {ans}
                            </button>
                          ))}
                        </div>
                      </form>
                    )}

                    <div ref={activeRowEndRef} />

                    {/* =========================================================
                        HASIL OPERASI BERHASIL – KOMPAK & LANGSUNG TERLIHAT 3D
                        ========================================================= */}
                    {gameStatus === 'SUCCESS' && lastCompletionReport && (
                      <div className="mt-2.5 p-3 rounded-xl bg-emerald-950 text-white border-2 border-emerald-400 shadow-xl animate-row-pop">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-extrabold text-emerald-300 uppercase">
                              {lastCompletionReport.status} ·{' '}
                              {lastCompletionReport.patientStatus}{' '}
                              {levelUpBanner ? `· ${levelUpBanner}` : ''}
                            </div>
                            <div className="text-sm font-extrabold text-white">
                              {activePatient.patientName} Sembuh!{' '}
                              <span className="font-mono text-amber-300">
                                (+{lastCompletionReport.totalLevelScoreEarned}{' '}
                                Skor / +
                                {lastCompletionReport.totalLevelCoinsEarned}{' '}
                                Koin)
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setIsLeaderboardOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Trophy className="w-3.5 h-3.5 text-amber-300" />
                              <span>Top 100</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                setViewMode('DREAM_HOUSE');
                              }}
                              className="px-2.5 py-1.5 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Home className="w-3.5 h-3.5" />
                              <span>Rumah 3D</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleNextLevelAndPatient}
                              className="px-3 py-1.5 text-xs font-extrabold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                Lanjut Lv.
                                {Math.min(20, currentQuestion.level + 1)}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* =========================================================
                        OPERASI GAGAL – KONDISI PASIEN KRITIS
                        ========================================================= */}
                    {gameStatus === 'FAILED' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-rose-950 text-white border-2 border-rose-500 shadow-xl flex flex-wrap items-center justify-between gap-2 animate-row-shake">
                        <div className="text-xs">
                          <div className="font-extrabold text-rose-300 uppercase">
                            OPERASI GAGAL — PASIEN TERTUTUP KAIN PUTIH &amp; EKG GARIS DATAR (0 BPM)
                          </div>
                          <div>
                            Kunci {currentQuestion.category}(
                            {currentQuestion.numberA}, {currentQuestion.numberB}
                            ) ={' '}
                            <strong className="font-mono text-amber-300">
                              {currentQuestion.referenceTable.formulaText}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              setGameStatus('MENU');
                              setFlowStage('EXTERIOR_IDLE');
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
                          >
                            Menu
                          </button>
                          <button
                            type="button"
                            onClick={handleRetrySameQuestion}
                            className="px-3 py-1.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Coba Lagi</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK (Kamera 3D, Animasi Dokter 3D & Audio) */}
      <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-2 pointer-events-none">
        <div className="flex flex-col items-center pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsDockCollapsed((prev) => !prev)}
            className="px-3 py-0.5 text-[11px] font-bold text-slate-200 bg-slate-900/95 hover:bg-slate-800 border border-slate-700 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3 text-sky-400" />
                <span>Kamera 3D &amp; Suara</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-sky-400" />
                <span>Tutup Kontrol 3D</span>
              </>
            )}
          </button>

          {!isDockCollapsed && (
            <div className="mt-1 w-full bg-slate-900/95 border border-slate-700 rounded-xl px-3 py-1.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] text-white">
              {/* Kamera 3D Presets */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-slate-400 font-semibold mr-1">
                  Kamera:
                </span>
                {(
                  [
                    { id: 'overview', label: 'Ruang Operasi' },
                    { id: 'exterior', label: 'Depan RS' },
                    { id: 'doctor', label: 'Dokter' },
                    { id: 'monitor', label: 'Monitor' },
                    { id: 'table', label: 'Pasien' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => {
                      if (cam.id === 'monitor') {
                        if (gameStatus === 'SUCCESS' || isTableFinished) {
                          soundEngine.playSuccessChime();
                        } else {
                          soundEngine.playMedicalBleep(
                            lives === 3
                              ? 'normal'
                              : lives === 2
                                ? 'warning'
                                : 'critical'
                          );
                        }
                      } else {
                        soundEngine.playClick();
                      }
                      setCameraPreset(cam.id);
                    }}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Uji Gerakan Karakter Dokter 3D */}
              <div className="flex flex-wrap items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                {(
                  [
                    { id: 'auto', label: 'Auto' },
                    { id: 'walk', label: 'Jalan' },
                    { id: 'run', label: 'Lari' },
                    { id: 'prep', label: 'Operasi' },
                    { id: 'celebrate', label: 'Berhasil' },
                  ] as const
                ).map((anim) => (
                  <button
                    key={anim.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setDoctorAnimOverride(anim.id);
                    }}
                    className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                      doctorAnimOverride === anim.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>

              {/* Mode Inspeksi 3D & Suara */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setInspect3DOnly((prev) => !prev);
                  }}
                  className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 cursor-pointer ${
                    inspect3DOnly
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{inspect3DOnly ? 'Tampilkan UI' : '3D Penuh'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const muted = soundEngine.toggleMute();
                    setIsMuted(muted);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Top 100 Dokter Terbaik & Konfigurasi Firebase (Tahap 4) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentProgress={savedProgress}
        connectionStatus={firebaseStatus}
        currentUid={firebaseUid}
        onFirebaseReinitialize={initFirebaseConnection}
      />

      {/* Modal Laporan Audit Total 20 Fitur (Tahap 5) & Pengujian 6 Soal Wajib */}
      <MandatoryTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        reports={mandatoryReports}
        currentProgress={savedProgress}
        forceFallback2D={forceFallback2D}
        onToggleFallback2D={() => setForceFallback2D((prev) => !prev)}
        onSelectTestCase={(cat, a, b) => {
          setIsTestModalOpen(false);
          handleLoadMandatoryCase(cat, a, b);
        }}
      />

      {/* Modal Petunjuk & Tutorial Pengerjaan Tabel FPB dan KPK */}
      <TutorialFpbKpkModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        initialTab={tutorialInitialTab}
        currentQuestion={currentQuestion}
        activeDividendA={activeDividendA}
        activeDividendB={activeDividendB}
        isTableFinished={isTableFinished}
        completedPrimes={completedRows.map((r) => r.primeDivisor)}
      />
    </div>
  );
}
