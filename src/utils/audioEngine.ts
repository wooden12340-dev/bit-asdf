/**
 * High-precision, Crash-proof Web Audio Engine for Rhythm Game
 * Features:
 * - Dynamic Lookahead Scheduler: Only creates audio nodes for the immediate future (prevents node exhaustion / audio thread freezing)
 * - Safe AudioParam ramping (strictly positive values preventing Web Audio DOMExceptions)
 * - Rock-solid Pause / Resume / Stop / Restart handling
 * - Fallback high-resolution clock guaranteeing notes never freeze even if browser audio glitches
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isPlayingBgm = false;
  private isPaused = false;
  private bgmStartTime = 0;
  private pauseElapsed = 0;
  private fallbackStartTime = 0;
  private schedulerIntervalId: number | null = null;
  private activeHoldSources: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  private bgmVolume = 0.65;
  private sfxVolume = 0.8;
  private offsetMs = 0;

  // Chord progressions for all 13 arcade tracks
  private chordProgressions: Record<string, number[][]> = {
    neon: [
      [261.63, 329.63, 392.0], // C
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
    ],
    cyber: [
      [164.81, 196.0, 246.94], // Em
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [246.94, 293.66, 369.99], // Bm
    ],
    cosmic: [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
    ],
    supernova: [
      [146.83, 174.61, 220.0], // Dm
      [116.54, 146.83, 174.61], // Bb
      [174.61, 220.0, 261.63], // F
      [130.81, 164.81, 196.0], // C
    ],
    tokyo: [
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
      [164.81, 196.0, 246.94], // Em
    ],
    valkyrie: [
      [185.0, 220.0, 277.18], // F#m
      [146.83, 185.0, 220.0], // D
      [220.0, 277.18, 329.63], // A
      [164.81, 207.65, 246.94], // E
    ],
    inferno: [
      [196.0, 233.08, 293.66], // Gm
      [155.56, 196.0, 233.08], // Eb
      [233.08, 293.66, 349.23], // Bb
      [174.61, 220.0, 261.63], // F
    ],
    chrono: [
      [130.81, 155.56, 196.0], // Cm
      [207.65, 261.63, 311.13], // Ab
      [155.56, 196.0, 233.08], // Eb
      [233.08, 293.66, 349.23], // Bb
    ],
    quantum: [
      [164.81, 196.0, 246.94], // Em
      [130.81, 164.81, 196.0], // C
      [196.0, 246.94, 293.66], // G
      [146.83, 185.0, 220.0], // D
    ],
    samurai: [
      [220.0, 261.63, 329.63], // Am
      [146.83, 174.61, 220.0], // Dm
      [164.81, 207.65, 246.94], // E7
      [220.0, 261.63, 329.63], // Am
    ],
    resonance: [
      [174.61, 207.65, 261.63], // Fm
      [138.59, 174.61, 207.65], // Db
      [207.65, 261.63, 311.13], // Ab
      [155.56, 196.0, 233.08], // Eb
    ],
    apocalypse: [
      [233.08, 277.18, 349.23], // Bbm
      [185.0, 233.08, 277.18], // Gb
      [138.59, 174.61, 207.65], // Db
      [207.65, 261.63, 311.13], // Ab
    ],
    godspeed: [
      [155.56, 185.0, 233.08], // D#m
      [123.47, 155.56, 185.0], // B
      [185.0, 233.08, 277.18], // F#
      [138.59, 174.61, 207.65], // C#
    ],
  };

  public init() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx && !this.sfxGain) {
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(Math.max(0.0001, this.sfxVolume), this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (err) {
      console.warn('AudioContext init error:', err);
    }
  }

  public setVolumes(bgm: number, sfx: number) {
    this.bgmVolume = Math.max(0, Math.min(1, bgm));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.bgmGain) this.bgmGain.gain.setValueAtTime(Math.max(0.0001, this.bgmVolume), now);
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(Math.max(0.0001, this.sfxVolume), now);
    }
  }

  public setOffset(offsetMs: number) {
    this.offsetMs = offsetMs;
  }

  /**
   * Get current track position in seconds.
   * If AudioContext suspended or audio thread stalls, seamlessly falls back to performance.now
   * so that canvas and notes NEVER freeze!
   */
  public getCurrentSongTime(): number {
    if (!this.isPlayingBgm) return 0;
    if (this.isPaused) return Math.max(0, this.pauseElapsed);

    let calculated = 0;
    if (this.ctx && this.ctx.state === 'running' && this.bgmStartTime > 0) {
      calculated = this.ctx.currentTime - this.bgmStartTime + this.offsetMs / 1000;
    } else if (this.fallbackStartTime > 0) {
      calculated = (performance.now() - this.fallbackStartTime) / 1000 + this.offsetMs / 1000;
    }

    return Math.max(0, calculated);
  }

  /**
   * Start BGM using an efficient dynamic Lookahead Scheduler.
   * Only creates Web Audio nodes 0.4s in advance, keeping node count to ~10-20 at all times.
   */
  public startBgmTrack(songId: string, bpm: number, duration: number, onEnd?: () => void) {
    this.stopBgm();
    this.init();

    this.isPlayingBgm = true;
    this.isPaused = false;
    this.pauseElapsed = 0;

    const ctx = this.ctx;
    if (!ctx) {
      this.fallbackStartTime = performance.now();
      return;
    }

    // Create fresh isolated bgmGain node
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(Math.max(0.0001, this.bgmVolume), ctx.currentTime);
    this.bgmGain.connect(ctx.destination);

    this.bgmStartTime = ctx.currentTime;
    this.fallbackStartTime = performance.now();

    const secondsPerBeat = 60 / bpm;
    const totalBeats = Math.floor(duration / secondsPerBeat);
    const chords = this.chordProgressions[songId] || this.chordProgressions.neon;
    const isHighSpeed = bpm >= 170;

    let nextBeatToSchedule = 0;
    const lookahead = 0.45; // Schedule 450ms into the future

    const scheduleLoop = () => {
      if (!this.isPlayingBgm || this.isPaused || !this.ctx || !this.bgmGain) return;

      const currentSongTime = this.getCurrentSongTime();

      // Check if song has finished
      if (currentSongTime >= duration) {
        this.stopBgm();
        if (onEnd) onEnd();
        return;
      }

      // Schedule beats up to currentSongTime + lookahead
      while (
        nextBeatToSchedule < totalBeats &&
        nextBeatToSchedule * secondsPerBeat < currentSongTime + lookahead
      ) {
        const beatAudioTime = this.bgmStartTime + nextBeatToSchedule * secondsPerBeat;
        const measure = Math.floor(nextBeatToSchedule / 4);
        const chord = chords[measure % chords.length];

        // Only schedule if audio time is in the future or within 0.05s
        if (beatAudioTime >= this.ctx.currentTime - 0.05) {
          try {
            // 1. Kick drum
            this.synthesizeDrum(beatAudioTime, 'kick');
            if (isHighSpeed && (songId === 'quantum' || songId === 'godspeed' || songId === 'apocalypse')) {
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.5, 'kick');
            }

            // 2. Snare on beat 1 and 3
            if (nextBeatToSchedule % 2 === 1) {
              this.synthesizeDrum(beatAudioTime, 'snare');
            }

            // 3. Hi-Hats
            this.synthesizeDrum(beatAudioTime, 'hihat');
            this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.5, 'hihat');
            if (isHighSpeed) {
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.25, 'hihat');
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.75, 'hihat');
            }

            // 4. Bass
            const root = chord[0] * 0.5;
            this.synthesizeBass(beatAudioTime, root, secondsPerBeat * 0.4);
            if (nextBeatToSchedule % 2 === 1 || isHighSpeed) {
              this.synthesizeBass(beatAudioTime + secondsPerBeat * 0.5, root * 1.5, secondsPerBeat * 0.3);
            }

            // 5. Synth Chord Pad
            if (nextBeatToSchedule % 2 === 0) {
              this.synthesizeChord(beatAudioTime, chord, secondsPerBeat * 1.8);
            }

            // 6. Arpeggiated Melody
            const arpNote = chord[(nextBeatToSchedule * 2) % chord.length] * (isHighSpeed ? 2.5 : 2);
            this.synthesizeLead(beatAudioTime + secondsPerBeat * 0.25, arpNote, secondsPerBeat * 0.2);
          } catch {
            // Prevent any single note error from breaking the schedule loop
          }
        }

        nextBeatToSchedule++;
      }
    };

    // Run scheduler every 35ms
    this.schedulerIntervalId = window.setInterval(scheduleLoop, 35);
    scheduleLoop();
  }

  public pauseBgm() {
    if (!this.isPlayingBgm || this.isPaused) return;
    this.pauseElapsed = this.getCurrentSongTime();
    this.isPaused = true;

    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }

    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      } catch {
        // ignore
      }
    }
  }

  public resumeBgm(songId: string, bpm: number, duration: number, onEnd?: () => void) {
    if (!this.isPlayingBgm || !this.isPaused) return;
    this.init();

    if (this.ctx) {
      this.bgmStartTime = this.ctx.currentTime - this.pauseElapsed;
    }
    this.fallbackStartTime = performance.now() - this.pauseElapsed * 1000;
    this.isPaused = false;

    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.setValueAtTime(Math.max(0.0001, this.bgmVolume), this.ctx.currentTime);
      } catch {
        // ignore
      }
    }

    // Restart lookahead scheduler
    const secondsPerBeat = 60 / bpm;
    const totalBeats = Math.floor(duration / secondsPerBeat);
    const chords = this.chordProgressions[songId] || this.chordProgressions.neon;
    const isHighSpeed = bpm >= 170;
    let nextBeatToSchedule = Math.max(0, Math.floor(this.pauseElapsed / secondsPerBeat));
    const lookahead = 0.45;

    const scheduleLoop = () => {
      if (!this.isPlayingBgm || this.isPaused || !this.ctx || !this.bgmGain) return;
      const currentSongTime = this.getCurrentSongTime();

      if (currentSongTime >= duration) {
        this.stopBgm();
        if (onEnd) onEnd();
        return;
      }

      while (
        nextBeatToSchedule < totalBeats &&
        nextBeatToSchedule * secondsPerBeat < currentSongTime + lookahead
      ) {
        const beatAudioTime = this.bgmStartTime + nextBeatToSchedule * secondsPerBeat;
        const measure = Math.floor(nextBeatToSchedule / 4);
        const chord = chords[measure % chords.length];

        if (beatAudioTime >= this.ctx.currentTime - 0.05) {
          try {
            this.synthesizeDrum(beatAudioTime, 'kick');
            if (isHighSpeed && (songId === 'quantum' || songId === 'godspeed' || songId === 'apocalypse')) {
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.5, 'kick');
            }
            if (nextBeatToSchedule % 2 === 1) {
              this.synthesizeDrum(beatAudioTime, 'snare');
            }
            this.synthesizeDrum(beatAudioTime, 'hihat');
            this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.5, 'hihat');
            if (isHighSpeed) {
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.25, 'hihat');
              this.synthesizeDrum(beatAudioTime + secondsPerBeat * 0.75, 'hihat');
            }
            const root = chord[0] * 0.5;
            this.synthesizeBass(beatAudioTime, root, secondsPerBeat * 0.4);
            if (nextBeatToSchedule % 2 === 1 || isHighSpeed) {
              this.synthesizeBass(beatAudioTime + secondsPerBeat * 0.5, root * 1.5, secondsPerBeat * 0.3);
            }
            if (nextBeatToSchedule % 2 === 0) {
              this.synthesizeChord(beatAudioTime, chord, secondsPerBeat * 1.8);
            }
            const arpNote = chord[(nextBeatToSchedule * 2) % chord.length] * (isHighSpeed ? 2.5 : 2);
            this.synthesizeLead(beatAudioTime + secondsPerBeat * 0.25, arpNote, secondsPerBeat * 0.2);
          } catch {
            // ignore
          }
        }
        nextBeatToSchedule++;
      }
    };

    if (this.schedulerIntervalId !== null) clearInterval(this.schedulerIntervalId);
    this.schedulerIntervalId = window.setInterval(scheduleLoop, 35);
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    this.isPaused = false;
    this.pauseElapsed = 0;
    this.bgmStartTime = 0;
    this.fallbackStartTime = 0;

    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }

    if (this.bgmGain) {
      try {
        this.bgmGain.disconnect();
      } catch {
        // ignore
      }
      this.bgmGain = null;
    }

    this.activeHoldSources.forEach((_, lane) => {
      this.stopHoldSound(lane);
    });
    this.activeHoldSources.clear();
  }

  // --- Hitsound Synthesizer ---
  public playHitSound(lane: number, type: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS') {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const vol = Math.max(0.0001, this.sfxVolume);

      if (type === 'MISS') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.3 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
        return;
      }

      const pitches = [523.25, 587.33, 659.25, 783.99];
      const safeLane = Math.abs(lane || 0) % pitches.length;
      const baseFreq = pitches[safeLane] || 523.25;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === 'PERFECT' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq * (type === 'PERFECT' ? 1.0 : 0.95), now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      const hitVol = (type === 'PERFECT' ? 0.6 : type === 'GREAT' ? 0.45 : 0.3) * vol;
      gain.gain.setValueAtTime(hitVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(600, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);

      if (type === 'PERFECT') {
        const sparkle = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.setValueAtTime(baseFreq * 2, now);
        sparkle.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.06);
        sGain.gain.setValueAtTime(0.25 * vol, now);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        sparkle.connect(sGain);
        sGain.connect(this.sfxGain);
        sparkle.start(now);
        sparkle.stop(now + 0.08);
      }
    } catch {
      // ignore
    }
  }

  public startHoldSound(lane: number) {
    if (!this.ctx || !this.sfxGain || this.activeHoldSources.has(lane)) return;
    try {
      const now = this.ctx.currentTime;
      const pitches = [523.25, 587.33, 659.25, 783.99];
      const safeLane = Math.abs(lane || 0) % pitches.length;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime((pitches[safeLane] || 523.25) * 0.75, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.2 * Math.max(0.0001, this.sfxVolume), now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);

      this.activeHoldSources.set(lane, { osc, gain });
    } catch {
      // ignore
    }
  }

  public stopHoldSound(lane: number) {
    if (!this.ctx) return;
    const source = this.activeHoldSources.get(lane);
    if (source) {
      try {
        const now = this.ctx.currentTime;
        source.gain.gain.cancelScheduledValues(now);
        source.gain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
        setTimeout(() => {
          try {
            source.osc.stop();
            source.osc.disconnect();
          } catch {
            // ignore
          }
        }, 50);
      } catch {
        // ignore
      }
      this.activeHoldSources.delete(lane);
    }
  }

  // --- Procedural Synth Components ---
  private synthesizeDrum(time: number, type: 'kick' | 'snare' | 'hihat') {
    if (!this.ctx || !this.bgmGain) return;
    const vol = Math.max(0.0001, this.bgmVolume);

    try {
      if (type === 'kick') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
        gain.gain.setValueAtTime(0.7 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.18);
      } else if (type === 'snare') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
        gain.gain.setValueAtTime(0.4 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.14);
      } else if (type === 'hihat') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(6500, time);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000, time);
        gain.gain.setValueAtTime(0.12 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch {
      // ignore
    }
  }

  private synthesizeBass(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const vol = Math.max(0.0001, this.bgmVolume);

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, time);
      filter.frequency.exponentialRampToValueAtTime(140, time + dur);

      gain.gain.setValueAtTime(0.35 * vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(time);
      osc.stop(time + dur);
    } catch {
      // ignore
    }
  }

  private synthesizeChord(time: number, freqs: number[], dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const vol = Math.max(0.0001, this.bgmVolume);

    try {
      freqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(this.bgmGain!);
        osc.start(time);
        osc.stop(time + dur);
      });
    } catch {
      // ignore
    }
  }

  private synthesizeLead(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const vol = Math.max(0.0001, this.bgmVolume);

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.16 * vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + dur);
    } catch {
      // ignore
    }
  }
}

export const audioEngine = new AudioEngine();
