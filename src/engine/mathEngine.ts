/**
 * MESIN MATEMATIKA & SISTEM PERMAINAN DASAR (TAHAP 1)
 * 3D HOSPITAL SURGERY – MISI DOKTER CILIK FPB & KPK
 * MEDIA PEMBELAJARAN SDN 66 BANDA ACEH
 *
 * Modul ini memuat seluruh fungsi wajib:
 * - generateQuestion()
 * - generateFPBTable()
 * - generateKPKTable()
 * - validatePrime()
 * - validateDivision()
 * - validateFinalAnswer()
 * - reduceLife()
 * - completeOperation()
 * - restartGame()
 */

export type MathCategory = 'FPB' | 'KPK';

export interface PlayerProfile {
  name: string;
  school: string;
  grade: number; // Kelas 1 - 6
  category: MathCategory;
}

export interface TableStep {
  stepNumber: number;
  dividendA: number;
  dividendB: number;
  primeDivisor: number;
  quotientA: number;
  quotientB: number;
  explanation: string;
}

export interface GeneratedTableResult {
  category: MathCategory;
  numberA: number;
  numberB: number;
  steps: TableStep[];
  finalPair: [number, number];
  primeDivisors: number[];
  finalAnswer: number;
  formulaText: string;
  summaryExplanation: string;
}

export interface PrimeValidationResult {
  isValid: boolean;
  reason: string;
}

export interface DivisionValidationResult {
  isValid: boolean;
  errorField?: 'prime' | 'quotientA' | 'quotientB' | 'bothQuotients';
  message: string;
  isTableFinishedAfterStep: boolean;
  nextA: number;
  nextB: number;
}

export interface FinalAnswerValidationResult {
  isValid: boolean;
  expectedAnswer: number;
  userAnswer: number;
  formulaText: string;
  message: string;
}

export interface QuestionData {
  id: string;
  category: MathCategory;
  grade: number;
  level: number;
  levelTierLabel: string;
  numberA: number;
  numberB: number;
  patientName: string;
  diagnosisTitle: string;
  clinicalContext: string;
  expectedAnswer: number;
  referenceTable: GeneratedTableResult;
  isMandatoryCase?: boolean;
  isSurpriseQuestion?: boolean;
}

export interface LifeReductionResult {
  previousLives: number;
  remainingLives: number;
  isGameOver: boolean;
  patientCondition: 'STABIL' | 'WASPADA' | 'LEMAH' | 'KRITIS';
  statusTitle: string;
  statusMessage: string;
}

export interface OperationCompletionResult {
  status: 'OPERASI BERHASIL';
  patientStatus: 'PASIEN SEMBUH';
  rowScoreAlreadyAwarded: number;
  finalAnswerScore: number; // +100 skor
  operationSuccessScore: number; // +500 skor
  threeLivesBonus: number; // +300 skor jika 3 nyawa tersisa
  flawlessBonus: number; // +200 skor jika tanpa kesalahan
  baseScore: number;
  lifeBonus: number;
  stepBonus: number;
  totalScoreAdded: number; // Skor yang ditambahkan pada penyelesaian akhir
  totalLevelScoreEarned: number; // Total seluruh skor pada level ini (termasuk baris)
  coinsAddedOnCompletion: number;
  totalLevelCoinsEarned: number;
  newTotalScore: number;
  explanation: string;
}

export interface GameSessionState {
  profile: PlayerProfile;
  lives: number;
  maxLives: number;
  score: number;
  operationsCompleted: number;
  currentQuestion: QuestionData;
  status: 'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED';
}

export interface MandatoryTestCaseReport {
  id: string;
  category: MathCategory;
  numberA: number;
  numberB: number;
  expectedAnswer: number;
  calculatedAnswer: number;
  alternateOrderAnswer: number;
  passedCanonical: boolean;
  passedAlternateOrder: boolean;
  passedRowByRowValidation: boolean;
  passedFinalValidation: boolean;
  tableResult: GeneratedTableResult;
  alternateTableResult: GeneratedTableResult;
}

/**
 * Menghitung Faktor Persekutuan Terbesar (GCD / FPB) secara matematis murni
 */
export function calculateGCD(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

/**
 * Menghitung Kelipatan Persekutuan Terkecil (LCM / KPK) secara matematis murni
 */
export function calculateLCM(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.trunc((a * b) / calculateGCD(a, b)));
}

/**
 * 1. validatePrime(n)
 * Memeriksa apakah suatu input adalah bilangan prima yang sah (>= 2).
 */
export function validatePrime(n: number): PrimeValidationResult {
  if (typeof n !== 'number' || Number.isNaN(n) || !Number.isFinite(n)) {
    return {
      isValid: false,
      reason: 'Masukkan angka bilangan bulat yang valid untuk pembagi prima.',
    };
  }

  if (!Number.isInteger(n)) {
    return {
      isValid: false,
      reason: `${n} bukan bilangan bulat. Bilangan prima harus berupa bilangan bulat positif.`,
    };
  }

  if (n < 2) {
    return {
      isValid: false,
      reason:
        n === 1
          ? 'Angka 1 bukan bilangan prima karena hanya memiliki satu faktor. Gunakan bilangan prima seperti 2, 3, 5, 7, dst.'
          : 'Bilangan prima harus lebih besar atau sama dengan 2 (contoh: 2, 3, 5, 7, 11).',
    };
  }

  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      return {
        isValid: false,
        reason: `Angka ${n} bukan bilangan prima karena habis dibagi ${i} (${n} = ${i} × ${n / i}). Pilih bilangan prima (2, 3, 5, 7, ...).`,
      };
    }
  }

  return {
    isValid: true,
    reason: `Angka ${n} adalah bilangan prima yang sah.`,
  };
}

/**
 * Mencari daftar seluruh faktor prima yang dapat membagi sesuai aturan FPB atau KPK
 */
export function getValidPrimeDivisorsForPair(
  category: MathCategory,
  a: number,
  b: number
): number[] {
  const maxVal = Math.max(a, b);
  const primes: number[] = [];
  for (let p = 2; p <= maxVal; p++) {
    if (!validatePrime(p).isValid) continue;
    if (category === 'FPB') {
      if (a % p === 0 && b % p === 0) {
        primes.push(p);
      }
    } else {
      if ((a > 1 && a % p === 0) || (b > 1 && b % p === 0)) {
        primes.push(p);
      }
    }
  }
  return primes;
}

/**
 * Memeriksa apakah tabel pembagian sudah selesai berdasarkan kategori
 * - FPB: Selesai apabila tidak ada lagi bilangan prima yang dapat membagi kedua bilangan secara bersamaan (gcd(a, b) === 1).
 * - KPK: Selesai apabila kedua bilangan sudah mencapai 1 dan 1.
 */
export function isDivisionTableComplete(
  category: MathCategory,
  currentA: number,
  currentB: number
): boolean {
  if (category === 'FPB') {
    return calculateGCD(currentA, currentB) === 1;
  }
  return currentA === 1 && currentB === 1;
}

/**
 * 2. generateFPBTable(a, b, preferLargestPrimeFirst)
 * Membangun tabel pembagian bilangan prima untuk kategori FPB.
 * Mendukung urutan prima terkecil (standar) maupun urutan alternatif (terbesar dulu) untuk membuktikan konsistensi matematis.
 */
export function generateFPBTable(
  a: number,
  b: number,
  preferLargestPrimeFirst = false
): GeneratedTableResult {
  let currA = Math.abs(Math.trunc(a));
  let currB = Math.abs(Math.trunc(b));
  const steps: TableStep[] = [];
  const primeDivisors: number[] = [];
  let stepCount = 1;

  while (calculateGCD(currA, currB) > 1) {
    const validPrimes = getValidPrimeDivisorsForPair('FPB', currA, currB);
    if (validPrimes.length === 0) break;

    const chosenPrime = preferLargestPrimeFirst
      ? validPrimes[validPrimes.length - 1]
      : validPrimes[0];

    const nextA = currA / chosenPrime;
    const nextB = currB / chosenPrime;

    steps.push({
      stepNumber: stepCount++,
      dividendA: currA,
      dividendB: currB,
      primeDivisor: chosenPrime,
      quotientA: nextA,
      quotientB: nextB,
      explanation: `${currA} ÷ ${chosenPrime} = ${nextA} dan ${currB} ÷ ${chosenPrime} = ${nextB} (keduanya habis dibagi ${chosenPrime})`,
    });

    primeDivisors.push(chosenPrime);
    currA = nextA;
    currB = nextB;
  }

  const finalAnswer = primeDivisors.reduce((acc, val) => acc * val, 1);
  const formulaText =
    primeDivisors.length > 0 ? `${primeDivisors.join(' × ')} = ${finalAnswer}` : `1`;

  return {
    category: 'FPB',
    numberA: a,
    numberB: b,
    steps,
    finalPair: [currA, currB],
    primeDivisors,
    finalAnswer,
    formulaText,
    summaryExplanation: `Tabel FPB dari ${a} dan ${b} selesai karena sisa hasil bagi (${currA} dan ${currB}) sudah tidak memiliki pembagi prima bersama lagi. FPB diperoleh dari perkalian semua pembagi prima bersama: ${formulaText}.`,
  };
}

/**
 * 3. generateKPKTable(a, b, preferLargestPrimeFirst)
 * Membangun tabel pembagian bilangan prima untuk kategori KPK sampai kedua bilangan menjadi 1.
 * Mendukung urutan prima standar maupun alternatif.
 */
export function generateKPKTable(
  a: number,
  b: number,
  preferLargestPrimeFirst = false
): GeneratedTableResult {
  let currA = Math.abs(Math.trunc(a));
  let currB = Math.abs(Math.trunc(b));
  const steps: TableStep[] = [];
  const primeDivisors: number[] = [];
  let stepCount = 1;

  while (currA > 1 || currB > 1) {
    const validPrimes = getValidPrimeDivisorsForPair('KPK', currA, currB);
    if (validPrimes.length === 0) break;

    const chosenPrime = preferLargestPrimeFirst
      ? validPrimes[validPrimes.length - 1]
      : validPrimes[0];

    const dividesA = currA % chosenPrime === 0;
    const dividesB = currB % chosenPrime === 0;

    const nextA = dividesA ? currA / chosenPrime : currA;
    const nextB = dividesB ? currB / chosenPrime : currB;

    let stepDesc = '';
    if (dividesA && dividesB) {
      stepDesc = `${currA} ÷ ${chosenPrime} = ${nextA} dan ${currB} ÷ ${chosenPrime} = ${nextB}`;
    } else if (dividesA && !dividesB) {
      stepDesc = `${currA} ÷ ${chosenPrime} = ${nextA}, sedangkan ${currB} tidak habis dibagi ${chosenPrime} sehingga diturunkan tetap ${currB}`;
    } else {
      stepDesc = `${currA} tidak habis dibagi ${chosenPrime} sehingga diturunkan tetap ${currA}, sedangkan ${currB} ÷ ${chosenPrime} = ${nextB}`;
    }

    steps.push({
      stepNumber: stepCount++,
      dividendA: currA,
      dividendB: currB,
      primeDivisor: chosenPrime,
      quotientA: nextA,
      quotientB: nextB,
      explanation: stepDesc,
    });

    primeDivisors.push(chosenPrime);
    currA = nextA;
    currB = nextB;
  }

  const finalAnswer = primeDivisors.reduce((acc, val) => acc * val, 1);
  const formulaText =
    primeDivisors.length > 0 ? `${primeDivisors.join(' × ')} = ${finalAnswer}` : `1`;

  return {
    category: 'KPK',
    numberA: a,
    numberB: b,
    steps,
    finalPair: [currA, currB],
    primeDivisors,
    finalAnswer,
    formulaText,
    summaryExplanation: `Tabel KPK dari ${a} dan ${b} selesai karena kedua baris akhir telah mencapai (1, 1). KPK diperoleh dari perkalian seluruh pembagi prima: ${formulaText}.`,
  };
}

/**
 * 4. validateDivision(category, currentA, currentB, primeInput, quotientAInput, quotientBInput)
 * Mesin validasi terpisah untuk FPB dan KPK pada setiap baris tabel.
 * Menerima urutan pembagian alternatif selama sah secara matematis.
 */
export function validateDivision(
  category: MathCategory,
  currentA: number,
  currentB: number,
  primeInput: number,
  quotientAInput: number,
  quotientBInput: number
): DivisionValidationResult {
  // Validasi keprimaan pembagi terlebih dahulu
  const primeCheck = validatePrime(primeInput);
  if (!primeCheck.isValid) {
    return {
      isValid: false,
      errorField: 'prime',
      message: primeCheck.reason,
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  if (
    !Number.isInteger(quotientAInput) ||
    quotientAInput < 1 ||
    !Number.isInteger(quotientBInput) ||
    quotientBInput < 1
  ) {
    return {
      isValid: false,
      errorField: 'bothQuotients',
      message: 'Hasil pembagian pada kolom pertama dan kedua harus berupa bilangan bulat positif.',
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  // MESIN VALIDASI KATEGORI FPB
  if (category === 'FPB') {
    const dividesA = currentA % primeInput === 0;
    const dividesB = currentB % primeInput === 0;

    if (!dividesA && !dividesB) {
      const validOptions = getValidPrimeDivisorsForPair('FPB', currentA, currentB);
      return {
        isValid: false,
        errorField: 'prime',
        message: `Pada metode FPB, bilangan prima pembagi wajib membagi habis kedua bilangan sekaligus. Angka ${currentA} dan ${currentB} keduanya tidak habis dibagi ${primeInput}. Gunakan pembagi prima bersama seperti: ${validOptions.join(', ')}.`,
        isTableFinishedAfterStep: false,
        nextA: currentA,
        nextB: currentB,
      };
    }

    if (!dividesA || !dividesB) {
      const validOptions = getValidPrimeDivisorsForPair('FPB', currentA, currentB);
      const failingNum = !dividesA ? currentA : currentB;
      const passingNum = dividesA ? currentA : currentB;
      return {
        isValid: false,
        errorField: 'prime',
        message: `Aturan FPB: Bilangan prima ${primeInput} memang membagi habis ${passingNum}, tetapi TIDAK membagi habis ${failingNum} (${failingNum} ÷ ${primeInput} bersisa ${failingNum % primeInput}). Pilih bilangan prima yang membagi habis keduanya sekaligus (${validOptions.join(' atau ')}).`,
        isTableFinishedAfterStep: false,
        nextA: currentA,
        nextB: currentB,
      };
    }

    const expectedA = currentA / primeInput;
    const expectedB = currentB / primeInput;
    const correctA = quotientAInput === expectedA;
    const correctB = quotientBInput === expectedB;

    if (!correctA && !correctB) {
      return {
        isValid: false,
        errorField: 'bothQuotients',
        message: `Kedua hasil pembagian belum tepat. Periksa kembali: ${currentA} ÷ ${primeInput} bukan ${quotientAInput}, dan ${currentB} ÷ ${primeInput} bukan ${quotientBInput}.`,
        isTableFinishedAfterStep: false,
        nextA: currentA,
        nextB: currentB,
      };
    }

    if (!correctA) {
      return {
        isValid: false,
        errorField: 'quotientA',
        message: `Hasil pembagian bilangan pertama kurang tepat: ${currentA} ÷ ${primeInput} bukan ${quotientAInput} (seharusnya ${expectedA}).`,
        isTableFinishedAfterStep: false,
        nextA: currentA,
        nextB: currentB,
      };
    }

    if (!correctB) {
      return {
        isValid: false,
        errorField: 'quotientB',
        message: `Hasil pembagian bilangan kedua kurang tepat: ${currentB} ÷ ${primeInput} bukan ${quotientBInput} (seharusnya ${expectedB}).`,
        isTableFinishedAfterStep: false,
        nextA: currentA,
        nextB: currentB,
      };
    }

    const finished = isDivisionTableComplete('FPB', expectedA, expectedB);
    return {
      isValid: true,
      message: finished
        ? `Benar! ${currentA} ÷ ${primeInput} = ${expectedA} dan ${currentB} ÷ ${primeInput} = ${expectedB}. Karena ${expectedA} dan ${expectedB} sudah tidak punya pembagi prima bersama lagi, tabel pembagian FPB selesai!`
        : `Tepat sekali! ${currentA} ÷ ${primeInput} = ${expectedA} dan ${currentB} ÷ ${primeInput} = ${expectedB}. Lanjutkan ke baris berikutnya.`,
      isTableFinishedAfterStep: finished,
      nextA: expectedA,
      nextB: expectedB,
    };
  }

  // MESIN VALIDASI KATEGORI KPK
  const dividesA = currentA % primeInput === 0;
  const dividesB = currentB % primeInput === 0;

  if (!dividesA && !dividesB) {
    const validOptions = getValidPrimeDivisorsForPair('KPK', currentA, currentB);
    return {
      isValid: false,
      errorField: 'prime',
      message: `Pada metode KPK, bilangan prima pembagi harus dapat membagi habis setidaknya salah satu dari ${currentA} atau ${currentB}. Angka ${primeInput} tidak membagi habis keduanya. Pilih pembagi prima seperti: ${validOptions.join(', ')}.`,
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  const expectedA = dividesA ? currentA / primeInput : currentA;
  const expectedB = dividesB ? currentB / primeInput : currentB;

  const correctA = quotientAInput === expectedA;
  const correctB = quotientBInput === expectedB;

  if (!correctA && !correctB) {
    return {
      isValid: false,
      errorField: 'bothQuotients',
      message: `Kedua kolom hasil pada baris ini belum tepat. Ingat aturan KPK: jika habis dibagi tuliskan hasil baginya, tetapi jika tidak habis dibagi turunkan angkanya tanpa diubah.`,
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  if (!correctA) {
    const explanationA = dividesA
      ? `Angka ${currentA} habis dibagi ${primeInput}, sehingga ${currentA} ÷ ${primeInput} seharusnya ${expectedA} (bukan ${quotientAInput}).`
      : `Aturan KPK: Karena ${currentA} tidak habis dibagi ${primeInput}, angka ${currentA} wajib diturunkan tetap sebagai ${currentA} (bukan diubah menjadi ${quotientAInput}).`;
    return {
      isValid: false,
      errorField: 'quotientA',
      message: explanationA,
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  if (!correctB) {
    const explanationB = dividesB
      ? `Angka ${currentB} habis dibagi ${primeInput}, sehingga ${currentB} ÷ ${primeInput} seharusnya ${expectedB} (bukan ${quotientBInput}).`
      : `Aturan KPK: Karena ${currentB} tidak habis dibagi ${primeInput}, angka ${currentB} wajib diturunkan tetap sebagai ${currentB} (bukan diubah menjadi ${quotientBInput}).`;
    return {
      isValid: false,
      errorField: 'quotientB',
      message: explanationB,
      isTableFinishedAfterStep: false,
      nextA: currentA,
      nextB: currentB,
    };
  }

  const finished = isDivisionTableComplete('KPK', expectedA, expectedB);
  const stepDetail =
    dividesA && dividesB
      ? `${currentA} ÷ ${primeInput} = ${expectedA} dan ${currentB} ÷ ${primeInput} = ${expectedB}`
      : dividesA
        ? `${currentA} ÷ ${primeInput} = ${expectedA}, dan ${currentB} diturunkan tetap ${expectedB}`
        : `${currentA} diturunkan tetap ${expectedA}, dan ${currentB} ÷ ${primeInput} = ${expectedB}`;

  return {
    isValid: true,
    message: finished
      ? `Benar! ${stepDetail}. Kedua bilangan kini sudah menjadi 1 dan 1. Saatnya menghitung nilai akhir KPK!`
      : `Bagus sekali! ${stepDetail}. Lanjutkan ke baris berikutnya sampai kedua bilangan menjadi 1.`,
    isTableFinishedAfterStep: finished,
    nextA: expectedA,
    nextB: expectedB,
  };
}

/**
 * 5. validateFinalAnswer(category, primeDivisors, userFinalAnswer, expectedAnswer)
 * Memeriksa apakah jawaban akhir FPB / KPK hasil perkalian seluruh pembagi prima sudah benar.
 */
export function validateFinalAnswer(
  category: MathCategory,
  primeDivisors: number[],
  userFinalAnswer: number,
  expectedAnswer?: number
): FinalAnswerValidationResult {
  const productFromDivisors = primeDivisors.reduce((acc, p) => acc * p, 1);
  const targetAnswer = expectedAnswer !== undefined ? expectedAnswer : productFromDivisors;
  const formulaText =
    primeDivisors.length > 0 ? `${primeDivisors.join(' × ')} = ${targetAnswer}` : `${targetAnswer}`;

  if (
    typeof userFinalAnswer !== 'number' ||
    Number.isNaN(userFinalAnswer) ||
    !Number.isInteger(userFinalAnswer)
  ) {
    return {
      isValid: false,
      expectedAnswer: targetAnswer,
      userAnswer: userFinalAnswer,
      formulaText,
      message: `Masukkan angka bilangan bulat yang valid untuk hasil akhir ${category}.`,
    };
  }

  if (userFinalAnswer !== targetAnswer || userFinalAnswer !== productFromDivisors) {
    return {
      isValid: false,
      expectedAnswer: targetAnswer,
      userAnswer: userFinalAnswer,
      formulaText,
      message: `Jawaban akhir ${userFinalAnswer} belum tepat. Nilai ${category} diperoleh dari hasil perkalian seluruh bilangan prima pembagi pada tabel: ${primeDivisors.join(' × ')}. Coba hitung kembali hasil perkaliannya!`,
    };
  }

  return {
    isValid: true,
    expectedAnswer: targetAnswer,
    userAnswer: userFinalAnswer,
    formulaText,
    message: `Luar biasa! Hasil akhir ${category} = ${formulaText} benar sepenuhnya!`,
  };
}

/**
 * 6. reduceLife(currentLives)
 * Mengurangi 1 nyawa setiap terjadi kesalahan dan mengevaluasi apakah kondisi pasien kritis (nyawa == 0).
 */
export function reduceLife(currentLives: number): LifeReductionResult {
  const previousLives = Math.max(0, Math.trunc(currentLives));
  const remainingLives = Math.max(0, previousLives - 1);
  const isGameOver = remainingLives === 0;

  if (remainingLives === 3) {
    return {
      previousLives,
      remainingLives,
      isGameOver: false,
      patientCondition: 'STABIL',
      statusTitle: 'KONDISI PASIEN STABIL',
      statusMessage: 'Tanda vital pasien dalam batas normal.',
    };
  }

  if (remainingLives === 2) {
    return {
      previousLives,
      remainingLives,
      isGameOver: false,
      patientCondition: 'WASPADA',
      statusTitle: 'PERINGATAN MEDIS – NYAWA TERSISA 2',
      statusMessage:
        'Detak jantung pasien meningkat! Periksa kembali pembagi bilangan prima dan hasil baginya dengan teliti.',
    };
  }

  if (remainingLives === 1) {
    return {
      previousLives,
      remainingLives,
      isGameOver: false,
      patientCondition: 'LEMAH',
      statusTitle: 'SIAGA MERAH – NYAWA TERSISA 1',
      statusMessage:
        'Kondisi pasien melemah! Hanya tersisa 1 kesempatan lagi sebelum operasi gagal.',
    };
  }

  return {
    previousLives,
    remainingLives: 0,
    isGameOver: true,
    patientCondition: 'KRITIS',
    statusTitle: 'OPERASI GAGAL – KONDISI PASIEN KRITIS',
    statusMessage:
      'Seluruh 3 nyawa telah habis. Kondisi pasien kritis! Pelajari penjelasan tabel pembagian di bawah ini dan coba lagi.',
  };
}

export const SCORE_RULES = {
  CORRECT_ROW: 50, // Setiap baris tabel benar: 50 skor
  FINAL_ANSWER: 100, // Jawaban benar: 100 skor
  OPERATION_SUCCESS: 500, // Operasi berhasil: 500 skor
  THREE_LIVES_BONUS: 300, // Tiga nyawa tersisa: bonus 300 skor
  NO_MISTAKE_BONUS: 200, // Menyelesaikan level tanpa kesalahan: bonus 200 skor
} as const;

/**
 * 7. completeOperation(currentScore, remainingLives, stepsCount, category, numberA, numberB, formulaText, mistakesCount)
 * Menyelesaikan operasi sesuai aturan skor Tahap 3 Bagian B & C:
 * - Jawaban benar: 100 skor
 * - Setiap baris tabel benar: 50 skor (diberikan saat baris benar)
 * - Operasi berhasil: 500 skor
 * - Tiga nyawa tersisa: bonus 300 skor
 * - Menyelesaikan level tanpa kesalahan: bonus 200 skor
 * Konversi Koin: 100 skor = 10 koin, 500 skor = 50 koin, 1.000 skor = 100 koin.
 */
export function completeOperation(
  currentScore: number,
  remainingLives: number,
  stepsCount: number,
  category: MathCategory,
  numberA: number,
  numberB: number,
  formulaText: string,
  mistakesCount = 3 - remainingLives
): OperationCompletionResult {
  const rowScoreAlreadyAwarded = Math.max(1, stepsCount) * SCORE_RULES.CORRECT_ROW;
  const finalAnswerScore = SCORE_RULES.FINAL_ANSWER; // 100
  const operationSuccessScore = SCORE_RULES.OPERATION_SUCCESS; // 500
  const threeLivesBonus =
    remainingLives >= 3 ? SCORE_RULES.THREE_LIVES_BONUS : 0; // 300
  const flawlessBonus =
    mistakesCount <= 0 && remainingLives >= 3 ? SCORE_RULES.NO_MISTAKE_BONUS : 0; // 200

  const totalScoreAdded =
    finalAnswerScore + operationSuccessScore + threeLivesBonus + flawlessBonus;
  const totalLevelScoreEarned = rowScoreAlreadyAwarded + totalScoreAdded;
  const newTotalScore = currentScore + totalScoreAdded;

  const coinsAddedOnCompletion = Math.floor(totalScoreAdded / 10);
  const totalLevelCoinsEarned = Math.floor(totalLevelScoreEarned / 10);

  return {
    status: 'OPERASI BERHASIL',
    patientStatus: 'PASIEN SEMBUH',
    rowScoreAlreadyAwarded,
    finalAnswerScore,
    operationSuccessScore,
    threeLivesBonus,
    flawlessBonus,
    baseScore: finalAnswerScore + operationSuccessScore,
    lifeBonus: threeLivesBonus,
    stepBonus: flawlessBonus,
    totalScoreAdded,
    totalLevelScoreEarned,
    coinsAddedOnCompletion,
    totalLevelCoinsEarned,
    newTotalScore,
    explanation: `OPERASI BERHASIL! Pasien sembuh total berkat perhitungan ${category} dari ${numberA} dan ${numberB} yang akurat (${formulaText}).`,
  };
}

/**
 * Daftar 6 Kasus Uji Wajib (Bagian G)
 */
export const MANDATORY_TEST_CASES: Array<{
  id: string;
  category: MathCategory;
  numberA: number;
  numberB: number;
  expectedAnswer: number;
  patientName: string;
  diagnosisTitle: string;
  clinicalContext: string;
}> = [
  {
    id: 'mandatory-fpb-24-36',
    category: 'FPB',
    numberA: 24,
    numberB: 36,
    expectedAnswer: 12,
    patientName: 'Pasien Ahmad (Ruang Bedah 01)',
    diagnosisTitle: 'Kalibrasi Dosis Antibiotik Presisi (FPB 24 & 36)',
    clinicalContext:
      'Dokter Cilik perlu membagi 24 ml serum vitamin dan 36 ml cairan infus ke dalam tabung suntik sama banyak dengan jumlah maksimal.',
  },
  {
    id: 'mandatory-fpb-18-30',
    category: 'FPB',
    numberA: 18,
    numberB: 30,
    expectedAnswer: 6,
    patientName: 'Pasien Siti (Ruang Bedah 02)',
    diagnosisTitle: 'Sterilisasi Paket Instrumen Bedah (FPB 18 & 30)',
    clinicalContext:
      'Tersedia 18 perban steril dan 30 kapas antiseptik yang harus dikemas rata ke dalam kotak medis darurat sebanyak-banyaknya.',
  },
  {
    id: 'mandatory-fpb-48-60',
    category: 'FPB',
    numberA: 48,
    numberB: 60,
    expectedAnswer: 12,
    patientName: 'Pasien Teuku Rizki (Ruang Bedah 03)',
    diagnosisTitle: 'Distribusi Kapsul Pemulihan Pasca-Operasi (FPB 48 & 60)',
    clinicalContext:
      'Tim medis SDN 66 Banda Aceh menyiapkan 48 tablet kalsium dan 60 kapsul zat besi untuk dibagi sama rata kepada pasien pemulihan.',
  },
  {
    id: 'mandatory-kpk-12-18',
    category: 'KPK',
    numberA: 12,
    numberB: 18,
    expectedAnswer: 36,
    patientName: 'Pasien Cut Nadia (Ruang ICU 01)',
    diagnosisTitle: 'Sinkronisasi Monitor Detak Jantung & Oksigen (KPK 12 & 18)',
    clinicalContext:
      'Sensor oksigen berbunyi setiap 12 detik dan sensor EKG memindai setiap 18 detik. Pada detik ke berapa kedua sensor memindai bersamaan?',
  },
  {
    id: 'mandatory-kpk-8-12',
    category: 'KPK',
    numberA: 8,
    numberB: 12,
    expectedAnswer: 24,
    patientName: 'Pasien Zaki (Ruang ICU 02)',
    diagnosisTitle: 'Jadwal Pemberian Infus Ganda (KPK 8 & 12)',
    clinicalContext:
      'Obat pereda nyeri diberikan setiap 8 jam dan vitamin pemulihan setiap 12 jam.Setiap berapa jam kedua obat diberikan secara bersamaan?',
  },
  {
    id: 'mandatory-kpk-15-20',
    category: 'KPK',
    numberA: 15,
    numberB: 20,
    expectedAnswer: 60,
    patientName: 'Pasien Meutia (Ruang ICU 03)',
    diagnosisTitle: 'Rotasi Tim Dokter Jaga & Perawat Bedah (KPK 15 & 20)',
    clinicalContext:
      'Pemeriksaan suhu tubuh dilakukan tiap 15 menit dan pemeriksaan tekanan darah tiap 20 menit. Setiap berapa menit keduanya diperiksa bersamaan?',
  },
];

export interface LevelTierMetadata {
  tierIndex: number;
  levelRange: [number, number];
  label: string;
  shortDesc: string;
}

/**
 * Informasi Tingkat Kesulitan 20 Level (Tahap 3 Bagian A):
 * - Level 1–3: bilangan 1 digit
 * - Level 4–6: bilangan 2 digit sederhana
 * - Level 7–9: bilangan 2 digit menengah
 * - Level 10–12: bilangan 2 digit lebih besar
 * - Level 13–15: bilangan 3 digit sederhana
 * - Level 16–18: bilangan 3 digit
 * - Level 19–20: tantangan ahli
 */
export function getLevelTierMetadata(level: number): LevelTierMetadata {
  const lvl = Math.min(20, Math.max(1, Math.trunc(level || 1)));
  if (lvl <= 3) {
    return {
      tierIndex: 1,
      levelRange: [1, 3],
      label: 'Bilangan 1 Digit',
      shortDesc: 'Level 1–3 · Dasar 1 Digit',
    };
  }
  if (lvl <= 6) {
    return {
      tierIndex: 2,
      levelRange: [4, 6],
      label: 'Bilangan 2 Digit Sederhana',
      shortDesc: 'Level 4–6 · 2 Digit Sederhana',
    };
  }
  if (lvl <= 9) {
    return {
      tierIndex: 3,
      levelRange: [7, 9],
      label: 'Bilangan 2 Digit Menengah',
      shortDesc: 'Level 7–9 · 2 Digit Menengah',
    };
  }
  if (lvl <= 12) {
    return {
      tierIndex: 4,
      levelRange: [10, 12],
      label: 'Bilangan 2 Digit Lebih Besar',
      shortDesc: 'Level 10–12 · 2 Digit Besar',
    };
  }
  if (lvl <= 15) {
    return {
      tierIndex: 5,
      levelRange: [13, 15],
      label: 'Bilangan 3 Digit Sederhana',
      shortDesc: 'Level 13–15 · 3 Digit Sederhana',
    };
  }
  if (lvl <= 18) {
    return {
      tierIndex: 6,
      levelRange: [16, 18],
      label: 'Bilangan 3 Digit',
      shortDesc: 'Level 16–18 · 3 Digit Menengah',
    };
  }
  return {
    tierIndex: 7,
    levelRange: [19, 20],
    label: 'Tantangan Ahli',
    shortDesc: 'Level 19–20 · Tantangan Ahli Bedah',
  };
}

/**
 * Bank Soal Kaya & Bervariasi untuk 7 Tier Kesulitan (Level 1–20)
 * Ditambah generator prosedural otomatis agar setiap sesi memberi kejutan soal baru!
 */
const LEVEL_TIER_POOLS: Record<
  MathCategory,
  Record<number, Array<[number, number]>>
> = {
  FPB: {
    // Tier 1 (Level 1-3): Bilangan 1 digit (memiliki FPB > 1 agar ada minimal 1 baris pembagian prima bersama)
    1: [
      [4, 6],
      [6, 8],
      [6, 9],
      [4, 8],
      [3, 6],
      [3, 9],
      [2, 6],
      [2, 8],
      [2, 4],
      [6, 6],
      [8, 8],
    ],
    // Tier 2 (Level 4-6): Bilangan 2 digit sederhana (10 - 28)
    2: [
      [10, 15],
      [12, 18],
      [12, 16],
      [14, 21],
      [16, 24],
      [12, 20],
      [15, 20],
      [15, 25],
      [18, 24],
      [14, 28],
      [20, 25],
      [18, 27],
      [16, 20],
      [20, 28],
    ],
    // Tier 3 (Level 7-9): Bilangan 2 digit menengah (18 - 54)
    3: [
      [18, 30],
      [24, 36],
      [20, 30],
      [24, 40],
      [28, 42],
      [32, 48],
      [27, 45],
      [30, 45],
      [36, 48],
      [35, 49],
      [36, 54],
      [24, 42],
      [30, 50],
      [32, 40],
    ],
    // Tier 4 (Level 10-12): Bilangan 2 digit lebih besar (45 - 98)
    4: [
      [48, 60],
      [45, 75],
      [54, 72],
      [60, 84],
      [56, 84],
      [64, 96],
      [63, 84],
      [50, 75],
      [60, 90],
      [72, 96],
      [48, 72],
      [56, 70],
      [66, 88],
      [70, 98],
    ],
    // Tier 5 (Level 13-15): Bilangan 3 digit sederhana (100 - 180)
    5: [
      [100, 120],
      [108, 144],
      [120, 150],
      [105, 140],
      [112, 168],
      [120, 160],
      [126, 168],
      [135, 180],
      [100, 150],
      [120, 180],
      [110, 165],
      [132, 176],
      [140, 175],
    ],
    // Tier 6 (Level 16-18): Bilangan 3 digit (180 - 420)
    6: [
      [180, 240],
      [192, 256],
      [210, 280],
      [216, 288],
      [225, 300],
      [240, 360],
      [252, 336],
      [270, 360],
      [300, 420],
      [196, 294],
      [240, 300],
      [280, 350],
    ],
    // Tier 7 (Level 19-20): Tantangan ahli (360 - 720)
    7: [
      [360, 480],
      [420, 560],
      [432, 576],
      [450, 600],
      [480, 640],
      [504, 672],
      [540, 720],
      [360, 540],
      [400, 600],
      [450, 675],
    ],
  },
  KPK: {
    // Tier 1 (Level 1-3): Bilangan 1 digit
    1: [
      [4, 6],
      [6, 8],
      [6, 9],
      [3, 6],
      [4, 8],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [3, 9],
      [2, 6],
      [8, 9],
    ],
    // Tier 2 (Level 4-6): Bilangan 2 digit sederhana
    2: [
      [8, 12],
      [10, 15],
      [12, 16],
      [12, 18],
      [14, 21],
      [15, 20],
      [10, 20],
      [12, 15],
      [16, 24],
      [18, 24],
      [15, 25],
      [12, 20],
      [14, 28],
    ],
    // Tier 3 (Level 7-9): Bilangan 2 digit menengah
    3: [
      [18, 30],
      [20, 30],
      [24, 36],
      [20, 25],
      [24, 32],
      [28, 42],
      [30, 45],
      [24, 40],
      [27, 36],
      [32, 48],
      [35, 50],
      [36, 48],
    ],
    // Tier 4 (Level 10-12): Bilangan 2 digit lebih besar
    4: [
      [40, 60],
      [45, 60],
      [48, 60],
      [48, 72],
      [50, 75],
      [54, 72],
      [60, 80],
      [60, 90],
      [56, 84],
      [64, 80],
      [72, 96],
      [45, 75],
    ],
    // Tier 5 (Level 13-15): Bilangan 3 digit sederhana
    5: [
      [100, 120],
      [100, 150],
      [108, 144],
      [120, 150],
      [120, 160],
      [120, 180],
      [105, 140],
      [112, 168],
      [126, 168],
      [135, 180],
    ],
    // Tier 6 (Level 16-18): Bilangan 3 digit
    6: [
      [180, 240],
      [200, 300],
      [210, 280],
      [216, 288],
      [225, 300],
      [240, 320],
      [240, 360],
      [250, 350],
      [270, 360],
      [300, 400],
    ],
    // Tier 7 (Level 19-20): Tantangan ahli
    7: [
      [360, 480],
      [400, 500],
      [420, 560],
      [450, 600],
      [480, 600],
      [480, 640],
      [500, 750],
      [540, 720],
    ],
  },
};

// Riwayat pasangan soal terakhir agar soal kejutan selalu bervariasi dan tidak berulang
const recentPairsHistory: string[] = [];

/**
 * Generator Prosedural Soal Kejutan Otomatis sesuai Tingkat Kesulitan Level 1–20
 */
export function generateProceduralPairForLevel(
  category: MathCategory,
  level: number
): [number, number] {
  const tierMeta = getLevelTierMetadata(level);
  const tierPool =
    LEVEL_TIER_POOLS[category][tierMeta.tierIndex] || LEVEL_TIER_POOLS[category][2];

  // Filter keluar pasangan yang baru saja muncul agar selalu segar dan memberi kejutan
  const freshCandidates = tierPool.filter(
    ([a, b]) => !recentPairsHistory.includes(`${category}-${a}-${b}`)
  );
  const activePool = freshCandidates.length > 0 ? freshCandidates : tierPool;

  // Tambahkan juga variasi prosedural murni berdasarkan faktor prima ramah SD (2, 3, 5, 7)
  const proceduralCandidates: Array<[number, number]> = [...activePool];

  if (tierMeta.tierIndex === 2) {
    const bases = [2, 3, 4, 5, 6, 7];
    const mults: Array<[number, number]> = [
      [2, 3],
      [2, 5],
      [3, 4],
      [3, 5],
      [4, 5],
    ];
    for (const g of bases) {
      for (const [m1, m2] of mults) {
        const a = g * m1;
        const b = g * m2;
        if (a >= 10 && b <= 29 && !recentPairsHistory.includes(`${category}-${a}-${b}`)) {
          proceduralCandidates.push([a, b]);
        }
      }
    }
  } else if (tierMeta.tierIndex === 3) {
    const bases = [6, 8, 9, 10, 12, 14, 15, 16];
    const mults: Array<[number, number]> = [
      [2, 3],
      [2, 5],
      [3, 4],
      [3, 5],
    ];
    for (const g of bases) {
      for (const [m1, m2] of mults) {
        const a = g * m1;
        const b = g * m2;
        if (a >= 18 && b <= 56 && !recentPairsHistory.includes(`${category}-${a}-${b}`)) {
          proceduralCandidates.push([a, b]);
        }
      }
    }
  } else if (tierMeta.tierIndex === 4) {
    const bases = [12, 15, 16, 18, 20, 21, 24, 25];
    const mults: Array<[number, number]> = [
      [2, 3],
      [3, 4],
      [3, 5],
      [2, 5],
    ];
    for (const g of bases) {
      for (const [m1, m2] of mults) {
        const a = g * m1;
        const b = g * m2;
        if (a >= 40 && b <= 99 && !recentPairsHistory.includes(`${category}-${a}-${b}`)) {
          proceduralCandidates.push([a, b]);
        }
      }
    }
  }

  const randomIndex = Math.floor(Math.random() * proceduralCandidates.length);
  const chosen = proceduralCandidates[randomIndex] || activePool[0];

  // Kadang tukar posisi (a, b) atau (b, a) untuk menambah variasi tampilan tabel
  const finalPair: [number, number] =
    Math.random() > 0.65 && chosen[0] !== chosen[1]
      ? [chosen[1], chosen[0]]
      : [chosen[0], chosen[1]];

  const key = `${category}-${Math.min(finalPair[0], finalPair[1])}-${Math.max(finalPair[0], finalPair[1])}`;
  recentPairsHistory.push(key);
  if (recentPairsHistory.length > 10) {
    recentPairsHistory.shift();
  }

  return finalPair;
}

const PATIENT_NAMES = [
  'Pasien Alif (Bangsal Melati)',
  'Pasien Rania (Bangsal Cempaka)',
  'Pasien Luthfi (Ruang Bedah Sentral)',
  'Pasien Keumala (Ruang Anak SDN 66)',
  'Pasien Farhan (Unit Gawat Darurat)',
  'Pasien Syifa (Ruang Observasi Medis)',
];

/**
 * 8. generateQuestion(category, grade, options)
 * Menghasilkan soal FPB atau KPK lengkap beserta tabel referensi yang tervalidasi.
 * Mendukung sistem 20 Level (Tahap 3) dan Kejutan Soal Acak.
 */
export function generateQuestion(
  category: MathCategory,
  grade = 4,
  options?: {
    customPair?: [number, number];
    questionIndex?: number;
    level?: number;
    surpriseRandom?: boolean;
  }
): QuestionData {
  const clampedGrade = Math.min(6, Math.max(1, Math.trunc(grade || 4)));
  const activeLevel = Math.min(20, Math.max(1, Math.trunc(options?.level || 1)));
  const tierMeta = getLevelTierMetadata(activeLevel);

  let numberA: number;
  let numberB: number;

  if (options?.customPair) {
    [numberA, numberB] = options.customPair;
  } else {
    [numberA, numberB] = generateProceduralPairForLevel(category, activeLevel);
  }

  const mandatoryMatch = MANDATORY_TEST_CASES.find(
    (m) =>
      m.category === category &&
      ((m.numberA === numberA && m.numberB === numberB) ||
        (m.numberA === numberB && m.numberB === numberA))
  );

  const referenceTable =
    category === 'FPB'
      ? generateFPBTable(numberA, numberB)
      : generateKPKTable(numberA, numberB);

  const expectedAnswer =
    category === 'FPB'
      ? calculateGCD(numberA, numberB)
      : calculateLCM(numberA, numberB);

  const randomPatient =
    PATIENT_NAMES[(numberA + numberB + clampedGrade) % PATIENT_NAMES.length];

  return {
    id:
      mandatoryMatch?.id ||
      `q-${category.toLowerCase()}-lvl${activeLevel}-${numberA}-${numberB}-${Date.now()}`,
    category,
    grade: clampedGrade,
    level: activeLevel,
    levelTierLabel: tierMeta.label,
    numberA,
    numberB,
    patientName: mandatoryMatch?.patientName || randomPatient,
    diagnosisTitle:
      mandatoryMatch?.diagnosisTitle ||
      (category === 'FPB'
        ? `Level ${activeLevel} (${tierMeta.label}) — Dosis Medis FPB(${numberA}, ${numberB})`
        : `Level ${activeLevel} (${tierMeta.label}) — Sinkronisasi Alat KPK(${numberA}, ${numberB})`),
    clinicalContext:
      mandatoryMatch?.clinicalContext ||
      (category === 'FPB'
        ? `Misi Level ${activeLevel} (${tierMeta.label}): Tentukan FPB dari ${numberA} dan ${numberB} menggunakan tabel pembagian bilangan prima agar dosis obat terbagi rata.`
        : `Misi Level ${activeLevel} (${tierMeta.label}): Tentukan KPK dari ${numberA} dan ${numberB} menggunakan tabel pembagian bilangan prima sampai kedua baris bernilai 1.`),
    expectedAnswer,
    referenceTable,
    isMandatoryCase: Boolean(mandatoryMatch),
    isSurpriseQuestion: !options?.customPair,
  };
}

/**
 * 9. restartGame(profile, customPair, level)
 * Mengatur ulang nyawa menjadi 3, skor operasi baru, dan menyiapkan soal kejutan sesuai level.
 */
export function restartGame(
  profile: PlayerProfile,
  customPair?: [number, number],
  level = 1
): GameSessionState {
  const initialQuestion = generateQuestion(profile.category, profile.grade, {
    customPair,
    level,
    surpriseRandom: !customPair,
  });

  return {
    profile,
    lives: 3,
    maxLives: 3,
    score: 0,
    operationsCompleted: 0,
    currentQuestion: initialQuestion,
    status: 'PLAYING',
  };
}

/**
 * Menjalankan Pengujian Wajib (Bagian G) pada seluruh 6 soal wajib:
 * - FPB 24 dan 36 = 12
 * - FPB 18 dan 30 = 6
 * - FPB 48 dan 60 = 12
 * - KPK 12 dan 18 = 36
 * - KPK 8 dan 12 = 24
 * - KPK 15 dan 20 = 60
 * Memvalidasi tabel urutan standar, tabel urutan alternatif, validasi baris demi baris, dan validasi jawaban akhir.
 */
export function runMandatoryTestSuite(): MandatoryTestCaseReport[] {
  return MANDATORY_TEST_CASES.map((testCase) => {
    const tableCanonical =
      testCase.category === 'FPB'
        ? generateFPBTable(testCase.numberA, testCase.numberB, false)
        : generateKPKTable(testCase.numberA, testCase.numberB, false);

    const tableAlternate =
      testCase.category === 'FPB'
        ? generateFPBTable(testCase.numberA, testCase.numberB, true)
        : generateKPKTable(testCase.numberA, testCase.numberB, true);

    // Uji setiap baris pada urutan standar dan urutan alternatif melalui validateDivision()
    const allStepsValidCanonical = tableCanonical.steps.every((step, idx) => {
      const res = validateDivision(
        testCase.category,
        step.dividendA,
        step.dividendB,
        step.primeDivisor,
        step.quotientA,
        step.quotientB
      );
      const isLast = idx === tableCanonical.steps.length - 1;
      return res.isValid && res.isTableFinishedAfterStep === isLast;
    });

    const allStepsValidAlternate = tableAlternate.steps.every((step, idx) => {
      const res = validateDivision(
        testCase.category,
        step.dividendA,
        step.dividendB,
        step.primeDivisor,
        step.quotientA,
        step.quotientB
      );
      const isLast = idx === tableAlternate.steps.length - 1;
      return res.isValid && res.isTableFinishedAfterStep === isLast;
    });

    const finalValidCanonical = validateFinalAnswer(
      testCase.category,
      tableCanonical.primeDivisors,
      testCase.expectedAnswer,
      testCase.expectedAnswer
    ).isValid;

    const finalValidAlternate = validateFinalAnswer(
      testCase.category,
      tableAlternate.primeDivisors,
      testCase.expectedAnswer,
      testCase.expectedAnswer
    ).isValid;

    return {
      id: testCase.id,
      category: testCase.category,
      numberA: testCase.numberA,
      numberB: testCase.numberB,
      expectedAnswer: testCase.expectedAnswer,
      calculatedAnswer: tableCanonical.finalAnswer,
      alternateOrderAnswer: tableAlternate.finalAnswer,
      passedCanonical: tableCanonical.finalAnswer === testCase.expectedAnswer,
      passedAlternateOrder: tableAlternate.finalAnswer === testCase.expectedAnswer,
      passedRowByRowValidation: allStepsValidCanonical && allStepsValidAlternate,
      passedFinalValidation: finalValidCanonical && finalValidAlternate,
      tableResult: tableCanonical,
      alternateTableResult: tableAlternate,
    };
  });
}

// Ekspos ke global window untuk kemudahan inspeksi & pengujian konsol
declare global {
  interface Window {
    MathSurgeryEngine?: {
      generateQuestion: typeof generateQuestion;
      generateFPBTable: typeof generateFPBTable;
      generateKPKTable: typeof generateKPKTable;
      validatePrime: typeof validatePrime;
      validateDivision: typeof validateDivision;
      validateFinalAnswer: typeof validateFinalAnswer;
      reduceLife: typeof reduceLife;
      completeOperation: typeof completeOperation;
      restartGame: typeof restartGame;
      runMandatoryTestSuite: typeof runMandatoryTestSuite;
    };
  }
}

if (typeof window !== 'undefined') {
  window.MathSurgeryEngine = {
    generateQuestion,
    generateFPBTable,
    generateKPKTable,
    validatePrime,
    validateDivision,
    validateFinalAnswer,
    reduceLife,
    completeOperation,
    restartGame,
    runMandatoryTestSuite,
  };
}
