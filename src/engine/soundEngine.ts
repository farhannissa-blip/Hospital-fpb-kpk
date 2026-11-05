/**
 * MESIN AUDIO PROSEDURAL (WEB AUDIO API)
 * Menghasilkan efek suara medis, ambulans, pintu otomatis, & umpan balik validasi
 * (benar, salah, operasi berhasil, kritis) secara prosedural tanpa ketergantungan file eksternal.
 */

class SurgicalSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Suara sirine ambulans singkat saat ambulans tiba di rumah sakit
   */
  public playAmbulanceArrival(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    // Nada Hi-Lo khas ambulans ramah telinga
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.18);
    osc.frequency.setValueAtTime(660, now + 0.36);
    osc.frequency.setValueAtTime(880, now + 0.54);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.setValueAtTime(0.07, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  /**
   * Suara pintu rumah sakit / ruang operasi otomatis terbuka
   */
  public playDoorSlide(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Suara ketika baris tabel atau langkah dinyatakan BENAR
   */
  public playCorrectRow(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 chime medis bersih
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);

      gain.gain.setValueAtTime(0.001, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.065 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.065 + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.25);
    });
  }

  /**
   * Suara ketika terjadi kesalahan & pengurangan nyawa
   */
  public playWrongAnswer(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [240, 180];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.14 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.18);
    });
  }

  /**
   * Suara ketika OPERASI BERHASIL – PASIEN SEMBUH
   */
  public playOperationSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.09 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.46);
    });
  }

  /**
   * Suara ketika OPERASI GAGAL – KONDISI PASIEN KRITIS (nyawa == 0)
   */
  public playOperationCritical(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Nada monitor medis kritis
    const pulses = [440, 440, 311.13];
    pulses.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const startTime = now + idx * 0.22;
      const duration = idx === 2 ? 0.55 : 0.14;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    });
  }

  /**
   * Suara koin masuk ke saldo pemain (Tahap 3 Bagian C)
   */
  public playCoinEarned(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [987.77, 1318.51]; // B5 -> E6 sparkling coin clink
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.23);
    });
  }

  /**
   * Suara fanfare naik level & pembangunan rumah mewah (Tahap 3 Bagian D & G)
   */
  public playHouseBuild(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfare.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Suara bleep monitor detak jantung (EKG) 3D saat pemain berinteraksi dengan monitor
   * atau saat pemindaian tanda vital pasien selama operasi.
   */
  public playMedicalBleep(
    vitalState: 'normal' | 'warning' | 'critical' | number = 'normal'
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tentukan frekuensi dan pola bleep berdasarkan kondisi vital / BPM pasien
    let baseFreq = 987.77; // B5 - nada monitor EKG klinis standar
    let pulseCount = 1;
    let pulseSpacing = 0.12;

    if (typeof vitalState === 'number') {
      if (vitalState >= 130) {
        baseFreq = 1174.66; // D6 - detak cepat / siaga
        pulseCount = 2;
        pulseSpacing = 0.09;
      } else if (vitalState >= 95) {
        baseFreq = 1046.5; // C6 - waspada
      }
    } else if (vitalState === 'warning') {
      baseFreq = 1046.5; // C6
      pulseCount = 2;
      pulseSpacing = 0.11;
    } else if (vitalState === 'critical') {
      baseFreq = 1318.51; // E6 - bleep darurat intens
      pulseCount = 3;
      pulseSpacing = 0.085;
    }

    for (let i = 0; i < pulseCount; i++) {
      const startTime = now + i * pulseSpacing;
      const oscMain = ctx.createOscillator();
      const oscSub = ctx.createOscillator();
      const gain = ctx.createGain();

      oscMain.type = 'sine';
      oscSub.type = 'triangle';

      oscMain.frequency.setValueAtTime(baseFreq, startTime);
      // Sedikit modulasi frekuensi turun di ujung bleep seperti monitor ICU asli
      oscMain.frequency.exponentialRampToValueAtTime(
        baseFreq * 0.985,
        startTime + 0.075
      );

      oscSub.frequency.setValueAtTime(baseFreq * 2, startTime);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.18, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.008);
      gain.gain.setValueAtTime(0.1, startTime + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.085);

      oscMain.connect(gain);
      oscSub.connect(subGain);
      subGain.connect(gain);
      gain.connect(ctx.destination);

      oscMain.start(startTime);
      oscSub.start(startTime);
      oscMain.stop(startTime + 0.09);
      oscSub.stop(startTime + 0.09);
    }
  }

  /**
   * Suara chime harmonis saat monitor detak jantung 3D mengonfirmasi kondisi vital
   * pasien membaik, tabel pembagian selesai, atau interaksi sukses pada monitor.
   */
  public playSuccessChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Arpeggio kristal medis: C5 -> E5 -> G5 -> B5 -> C6
    const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1046.5];

    chimeNotes.forEach((freq, idx) => {
      const startTime = now + idx * 0.055;
      const duration = idx === chimeNotes.length - 1 ? 0.42 : 0.24;

      const oscSine = ctx.createOscillator();
      const oscOvertone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();

      oscSine.type = 'sine';
      oscOvertone.type = 'triangle';

      oscSine.frequency.setValueAtTime(freq, startTime);
      oscOvertone.frequency.setValueAtTime(freq * 2, startTime);

      overtoneGain.gain.setValueAtTime(0.22, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscSine.connect(gain);
      oscOvertone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(ctx.destination);

      oscSine.start(startTime);
      oscOvertone.start(startTime);
      oscSine.stop(startTime + duration + 0.02);
      oscOvertone.stop(startTime + duration + 0.02);
    });
  }

  /**
   * Suara klik tombol halus
   */
  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export const soundEngine = new SurgicalSoundEngine();

export const playMedicalBleep = (
  vitalState: 'normal' | 'warning' | 'critical' | number = 'normal'
): void => {
  soundEngine.playMedicalBleep(vitalState);
};

export const playSuccessChime = (): void => {
  soundEngine.playSuccessChime();
};

