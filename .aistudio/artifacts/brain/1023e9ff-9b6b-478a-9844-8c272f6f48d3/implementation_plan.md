# 3D Hospital Surgery – Misi Dokter Cilik FPB & KPK (Tahap 1: Mesin Matematika & Sistem Permainan Dasar)

Membangun fondasi mesin matematika interaktif dan sistem permainan dasar untuk media pembelajaran FPB & KPK SDN 66 Banda Aceh menggunakan metode tabel pembagian bilangan prima (Sengkedan), dilengkapi validasi baris demi baris yang mendukung urutan pembagi alternatif, sistem 3 nyawa pasien, efek suara prosedural, pengujian otomatis 6 kasus wajib, serta latar dekorasi ruang operasi 3D ringan berbasis Three.js.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berikut adalah keputusan utama yang telah dikonfirmasi dari jawaban Anda dan siap diimplementasikan pada Tahap 1:

- **Deteksi Penyelesaian Tabel FPB Otomatis**: Sistem secara otomatis mendeteksi ketika kedua hasil pembagian pada baris terakhir sudah relatif prima ($\gcd(a, b) = 1$), mengunci penambahan baris baru, dan langsung membuka tahap pengisian nilai akhir FPB (perkalian seluruh pembagi prima bersama).
- **Mode Permainan Bertahap & Panel Uji 6 Soal Wajib**: Antarmuka menyediakan mode permainan bertahap (sesuai kelas 1–6 dan kategori FPB/KPK) sekaligus panel akses cepat ("Uji Kasus Wajib & Diagnostik Mesin") agar guru maupun siswa dapat langsung menguji dan memverifikasi keenam soal wajib (`FPB(24,36)=12`, `FPB(18,30)=6`, `FPB(48,60)=12`, `KPK(12,18)=36`, `KPK(8,12)=24`, `KPK(15,20)=60`) secara instan maupun interaktif baris demi baris.
- **Latar Dekorasi 3D Ringan Ruang Operasi (Three.js)**: Menyajikan latar ruang operasi medis 3D ringan (meja bedah, lampu operasi gantung, monitor detak jantung EKG yang merespons kondisi nyawa pasien) yang terisolasi dari pembaruan UI sehingga fokus utama tetap pada kejelasan tabel matematika FPB & KPK dan kesiapan untuk pengembangan Tahap 2.

---

## 1. Overview & Core Concept

- **What It Does**: Aplikasi permainan edukasi matematika berbasis skenario ruang operasi dokter cilik di mana keberhasilan tindakan medis ditentukan oleh ketepatan menyelesaikan tabel pembagian bilangan prima (metode sengkedan) untuk mencari Faktor Persekutuan Terbesar (FPB) dan Kelipatan Persekutuan Terkecil (KPK).
- **Target Audience / Persona**: Siswa kelas 1–6 dan guru di SDN 66 Banda Aceh yang membutuhkan media pembelajaran FPB & KPK yang terstruktur, memvalidasi proses berpikir langkah demi langkah (bukan sekadar menebak hasil akhir), dan memberikan umpan balik langsung yang mendidik.
- **Key Value**:
  - Menghilangkan hafalan buta dengan memeriksa setiap baris pembagian prima (`validatePrime` & `validateDivision`).
  - Mendukung fleksibilitas berpikir matematis siswa dengan menerima urutan pembagian bilangan prima alternatif (misalnya membagi dengan 3 terlebih dahulu sebelum 2 selama memenuhi syarat FPB/KPK).
  - Menyediakan penjelasan kesalahan spesifik (misalnya bukan bilangan prima, tidak membagi kedua angka pada FPB, atau lupa menurunkan angka yang tidak habis dibagi pada KPK).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Halaman Awal (Pendaftaran Dokter Cilik)**:
   - Pemain memasukkan **Nama Pemain**, **Asal Sekolah** (default terisi *SDN 66 Banda Aceh* dan dapat diubah), memilih **Kelas (1–6)**, serta memilih **Kategori Operasi (FPB atau KPK)**.
   - Tersedia tombol utama **Mulai Permainan** serta tombol akses langsung ke **Panel Pengujian 6 Soal Wajib**.
2. **Ruang Operasi Matematika (Tabel Pembagian Prima Bertahap)**:
   - Menampilkan identitas dokter cilik, indikator **3 Nyawa Pasien** (status vital pasien: *Stabil*, *Waspada*, *Kritis*), skor operasi, dan pasangan bilangan target $(A, B)$.
   - **Baris Demi Baris**: Hanya baris aktif saat ini yang terbuka untuk diisi (`Pembagi Prima`, `Hasil Bagi Pertama`, `Hasil Bagi Kedua`). Baris berikutnya baru terbuka setelah baris saat ini dinyatakan benar.
   - **Kategori FPB**: Pembagi prima wajib membagi habis kedua bilangan saat ini secara bersamaan. Saat kedua hasil bagi menjadi relatif prima ($\gcd(a,b) = 1$), tabel pembagian selesai dan pemain diminta menghitung hasil perkalian semua pembagi prima bersama.
   - **Kategori KPK**: Pembagi prima boleh membagi habis salah satu atau kedua bilangan. Jika salah satu bilangan tidak habis dibagi oleh bilangan prima tersebut, pemain wajib menurunkan bilangan tersebut tanpa mengubah nilainya. Proses berulang hingga baris terakhir menghasilkan $(1, 1)$, lalu pemain mengisi hasil perkalian seluruh pembagi prima.
3. **Validasi, Umpan Balik & Penanganan Kesalahan**:
   - **Benar**: Animasi konfirmasi baris hijau zambrud, efek suara sintetis Web Audio nada positif, dan pembukaan baris selanjutnya (atau kolom jawaban akhir).
   - **Salah**: Penjelasan edukatif yang spesifik mengenai letak kesalahan (di pembagi prima, hasil bagi pertama, atau hasil bagi kedua), efek getar halus, bunyi peringatan medis, dan pengurangan 1 nyawa.
4. **Hasil Akhir Operasi**:
   - **Operasi Berhasil (`completeOperation`)**: Saat seluruh baris tabel dan jawaban akhir benar, muncul layar **OPERASI BERHASIL – PASIEN SEMBUH**, rincian langkah perkalian faktor prima (`2 × 2 × 3 = 12`), perolehan skor dasar, serta tombol lanjut ke pasien berikutnya atau coba soal wajib lainnya.
   - **Operasi Gagal (`reduceLife` mencapai 0)**: Saat nyawa habis, muncul layar **OPERASI GAGAL – KONDISI PASIEN KRITIS**, penjelasan solusi matematis yang benar, serta tombol **Coba Lagi** dan **Kembali ke Menu**.

### Visual Identity & Theme

- **Aesthetic Direction**: *Clean Clinical EdTech & Tactile Surgical Monitor* — memadukan ketegasan instrumen medis modern yang bersih dan ramah anak sekolah dasar dengan kanvas ruang operasi 3D di latar belakang.
- **Color Palette & Mood (60-30-10 Discipline)**:
  - **60% Dominant Neutral Canvas**: Clinical Alabaster (`#F8FAFC`) untuk permukaan kartu kerja matematika dan Deep Surgical Slate (`#0F172A`) untuk pencahayaan kedalaman ruang operasi 3D.
  - **30% Structural Surfaces**: Crisp White (`#FFFFFF`) dengan garis batas tipis (`#E2E8F0`) untuk struktur tabel pembagian prima (sengkedan) agar angka dan garis pembagi terbaca sangat jelas.
  - **10% Semantic Focal Accents**:
    - Surgical Teal / Cyan (`#0284C7` / `#0EA5E9`) untuk fokus baris aktif dan aksi utama.
    - Vital Emerald (`#059669`) disertai label eksplisit `BENAR / STABIL` untuk baris tervalidasi dan kesembuhan pasien.
    - Alert Coral Red (`#DC2626`) disertai label eksplisit `KRITIS / SALAH` untuk pengurangan nyawa dan peringatan kesalahan.
- **Typography & Hierarchy**:
  - *Display & Headings*: `Plus Jakarta Sans` (SemiBold/Bold) untuk judul misi, status operasi, dan instruksi yang ramah dibaca siswa SD.
  - *Body Prose*: `Plus Jakarta Sans` (Regular/Medium) untuk penjelasan langkah matematika dan umpan balik validasi.
  - *Mathematical & Tabular Data*: `JetBrains Mono` dengan `tabular-nums` untuk seluruh input angka tabel pembagian, faktor prima, skor, dan perhitungan FPB/KPK agar sejajar sempurna secara vertikal.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Validasi Dinamis Berbasis Sifat Matematika (Bukan Kunci Jawaban Statis per Baris)**
  - *Chosen Approach*: `validatePrime()` dan `validateDivision()` mengevaluasi kebenaran matematis berdasarkan angka aktual pada baris saat ini $(a_i, b_i)$, bukan membandingkan dengan urutan array statis.
  - *Why*: Dalam matematika SD, siswa boleh membagi $24$ dan $36$ dengan $2$ terlebih dahulu maupun dengan $3$ terlebih dahulu. Validasi dinamis memastikan semua urutan pembagian alternatif yang sah secara matematis diterima 100% akurat dan tetap menghasilkan FPB/KPK akhir yang sama.
  - *Alternatives Considered*: Menyimpan satu tabel jawaban urut dariprima terkecil — ditolak karena akan menyalahkan siswa yang memilih bilangan prima pembagi valid dengan urutan berbeda.
- **Decision 2: Pemisahan Murni Mesin Matematika & Antarmuka (Modular Architecture)**
  - *Chosen Approach*: Memisahkan secara tegas seluruh fungsi inti yang disyaratkan (`generateQuestion`, `generateFPBTable`, `generateKPKTable`, `validatePrime`, `validateDivision`, `validateFinalAnswer`, `reduceLife`, `completeOperation`, `restartGame`) ke dalam modul mesin matematika murni yang juga diekspos untuk pengujian otomatis.
  - *Why*: Memenuhi syarat arsitektur modular Tahap 1 agar mudah dikembangkan ke Tahap 2 (animasi bedah 3D penuh, Firebase, toko rumah sakit) tanpa perlu menulis ulang logika FPB/KPK.
- **Decision 3: Sintesis Audio Web Audio API Tanpa Ketergantungan File Eksternal**
  - *Chosen Approach*: Menggunakan Web Audio API prosedural untuk menghasilkan suara *benar* (chime harmonis), *salah* (nada peringatan rendah), *operasi berhasil* (fanfare sembuh), dan *kondisi kritis* (alarm medis).
  - *Why*: Menjamin suara selalu berfungsi instan di semua perangkat tanpa risiko gagal muat (`404`) file audio eksternal, lengkap dengan tombol bisukan (*Mute*).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   3D HOSPITAL SURGERY – TAHAP 1 APPLICATION                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────────┐   ┌───────────────────────┐   ┌──────────────────────┐
│  3D SURGICAL STAGE   │   │   GAME STATE & UI     │   │  MATH ENGINE MODULE  │
│     (Three.js)       │   │     CONTROLLERS       │   │ (Pure Core Functions)│
├──────────────────────┤   ├───────────────────────┤   ├──────────────────────┤
│ • Operating Table &  │   │ • StartScreen         │   │ • generateQuestion() │
│   Overhead Lamps     │   │   (Nama, Sekolah,     │   │ • generateFPBTable() │
│ • Vital Monitor Prop │   │    Kelas 1-6, Mode)   │   │ • generateKPKTable() │
│   (Reacts to Lives)  │   │ • DivisionTableBoard  │   │ • validatePrime()    │
│ • Isolated Canvas    │   │   (Step-by-step Rows) │   │ • validateDivision() │
│   Loop (Zero UI Lag) │   │ • MandatoryTestSuite  │   │ • validateFinalAnswer│
└──────────────────────┘   │   (6 Kasus Wajib G)   │   │ • reduceLife()       │
                           │ • OperationResultModal│   │ • completeOperation()│
                           │   (Berhasil / Gagal)  │   │ • restartGame()      │
                           └───────────────────────┘   └──────────────────────┘
```

### Data Model & State

- **PlayerProfile**: `{ name: string, school: string, grade: 1|2|3|4|5|6, category: 'FPB' | 'KPK' }`
- **DivisionRowState**:
  - `rowIndex`: nomor baris pada tabel pembagian.
  - `dividendA`, `dividendB`: pasangan bilangan yang sedang dibagi pada baris tersebut.
  - `inputPrime`: input bilangan prima pembagi dari pemain.
  - `inputQuotientA`, `inputQuotientB`: input hasil pembagian bilangan pertama dan kedua dari pemain.
  - `isLocked`: status apakah baris sudah tervalidasi benar.
- **OperationSessionState**:
  - `numberA`, `numberB`: pasangan bilangan soal saat ini.
  - `expectedAnswer`: nilai FPB atau KPK yang dihitung secara eksak oleh mesin matematika.
  - `canonicalTable`: referensi langkah tabel pembagian prima dari `generateFPBTable()` atau `generateKPKTable()`.
  - `rows`: daftar baris pembagian yang sedang dikerjakan pemain.
  - `isTableComplete`: bernilai `true` saat $\gcd(a,b) = 1$ (untuk FPB) atau saat $(a,b) = (1,1)$ (untuk KPK).
  - `lives`: jumlah nyawa pemain (mulai dari `3`, berkurang `1` setiap validasi salah melalui `reduceLife()`).
  - `score`: skor operasi pemain.
  - `status`: `'MENU' | 'PLAYING' | 'SUCCESS' | 'FAILED'`.

### Interactive Component & State Mapping

1. **`generateQuestion(category, grade, customPair?)`**: Menghasilkan pasangan bilangan $(A, B)$ yang memiliki faktor persekutuan bermakna sesuai tingkat kelas 1–6 atau memuat soal uji wajib.
2. **`generateFPBTable(a, b)` & `generateKPKTable(a, b)`**: Menghasilkan struktur langkah tabel pembagian prima lengkap beserta nilai akhir FPB/KPK dan penjelasan faktorisasinya.
3. **`validatePrime(n)`**: Memastikan pembagi adalah bilangan bulat $\ge 2$ yang hanya memiliki dua faktor (bilangan prima murni).
4. **`validateDivision(category, currentA, currentB, prime, nextA, nextB)`**:
   - Memanggil `validatePrime(prime)` terlebih dahulu.
   - **Untuk FPB**: Memastikan `currentA % prime === 0 && currentB % prime === 0`, serta memeriksa apakah `nextA === currentA / prime` dan `nextB === currentB / prime`.
   - **Untuk KPK**: Memastikan setidaknya salah satu habis dibagi (`currentA % prime === 0 || currentB % prime === 0`). Jika habis dibagi, hasil harus `current / prime`; jika tidak habis dibagi, angka wajib diturunkan tetap (`next === current`).
5. **`validateFinalAnswer(category, divisors, userFinalAnswer, expectedAnswer)`**: Memastikan jawaban akhir pemain sama dengan hasil kali seluruh pembagi prima pada tabel (`divisors.reduce((acc, p) => acc * p, 1)`) dan sesuai dengan nilai FPB/KPK sebenarnya.
6. **Panel Verifikasi Otomatis 6 Kasus Wajib (Bagian G)**: Menjalankan uji otomatis dan menyediakan tombol "Muat ke Meja Operasi" untuk keenam kasus wajib:
   - `FPB(24, 36) = 12`
   - `FPB(18, 30) = 6`
   - `FPB(48, 60) = 12`
   - `KPK(12, 18) = 36`
   - `KPK(8, 12) = 24`
   - `KPK(15, 20) = 60`
