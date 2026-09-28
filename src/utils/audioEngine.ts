/**
 * High-precision Web Audio Engine for Rhythm Game
 * Provides procedural synthesizer BGM locked to audioContext.currentTime
 * and responsive multi-voice hitsounds.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isPlayingBgm = false;
  private bgmStartTime = 0;
  private pauseTime = 0;
  private timerIds: number[] = [];
  private activeHoldSources: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  private bgmVolume = 0.65;
  private sfxVolume = 0.8;
  private offsetMs = 0;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(bgm: number, sfx: number) {
    this.bgmVolume = bgm;
    this.sfxVolume = sfx;
    if (this.ctx) {
      if (this.bgmGain) this.bgmGain.gain.setValueAtTime(bgm, this.ctx.currentTime);
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
  }

  public setOffset(offsetMs: number) {
    this.offsetMs = offsetMs;
  }

  public getCurrentSongTime(): number {
    if (!this.ctx || !this.isPlayingBgm) return 0;
    return Math.max(0, this.ctx.currentTime - this.bgmStartTime + this.offsetMs / 1000);
  }

  public playHitSound(lane: number, type: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS') {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    if (type === 'MISS') {
      // Dull low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    // Melodic sparkling tap hit sound per lane (Pentatonic scale: C5, D5, E5, G5)
    const pitches = [523.25, 587.33, 659.25, 783.99];
    const baseFreq = pitches[lane % pitches.length];

    // Main crystal pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type === 'PERFECT' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq * (type === 'PERFECT' ? 1.0 : 0.95), now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

    const hitVol = type === 'PERFECT' ? 0.6 : type === 'GREAT' ? 0.45 : 0.3;
    gain.gain.setValueAtTime(hitVol * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Filter to give high glossy pop
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);

    // Extra sparkle chirp for PERFECT
    if (type === 'PERFECT') {
      const sparkle = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(baseFreq * 2, now);
      sparkle.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 0.06);
      sGain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      sparkle.connect(sGain);
      sGain.connect(this.sfxGain);
      sparkle.start(now);
      sparkle.stop(now + 0.08);
    }
  }

  public startHoldSound(lane: number) {
    if (!this.ctx || !this.sfxGain || this.activeHoldSources.has(lane)) return;
    const now = this.ctx.currentTime;
    const pitches = [523.25, 587.33, 659.25, 783.99];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitches[lane % pitches.length] * 0.75, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);

    this.activeHoldSources.set(lane, { osc, gain });
  }

  public stopHoldSound(lane: number) {
    if (!this.ctx) return;
    const source = this.activeHoldSources.get(lane);
    if (source) {
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
      this.activeHoldSources.delete(lane);
    }
  }

  public startBgmTrack(songId: string, bpm: number, duration: number, onEnd?: () => void) {
    this.stopBgm();
    this.init();
    if (!this.ctx || !this.bgmGain) return;

    this.isPlayingBgm = true;
    this.bgmStartTime = this.ctx.currentTime;

    // Build procedural arrangement based on songId and bpm
    this.scheduleProceduralSong(songId, bpm, duration);

    // Schedule track completion
    const endTimeout = window.setTimeout(() => {
      if (this.isPlayingBgm && onEnd) {
        onEnd();
      }
    }, (duration + 1.5) * 1000);
    this.timerIds.push(endTimeout);
  }

  private scheduleProceduralSong(songId: string, bpm: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = Math.floor(duration / secondsPerBeat);
    const startAudioTime = this.ctx.currentTime;

    // Chord progressions for all 13 arcade tracks
    const chordProgressions: Record<string, number[][]> = {
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

    const chords = chordProgressions[songId] || chordProgressions.neon;
    const isHighSpeed = bpm >= 170;

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = startAudioTime + beat * secondsPerBeat;
      const measure = Math.floor(beat / 4);
      const chord = chords[measure % chords.length];

      // 1. Kick drum: 4-on-the-floor, and double kick for high-speed hardcore tracks
      this.synthesizeDrum(beatTime, 'kick');
      if (isHighSpeed && (songId === 'quantum' || songId === 'godspeed' || songId === 'apocalypse')) {
        this.synthesizeDrum(beatTime + secondsPerBeat * 0.5, 'kick');
      }

      // 2. Snare / Clap on beat 1 and 3 (2nd and 4th beats)
      if (beat % 2 === 1) {
        this.synthesizeDrum(beatTime, 'snare');
      }

      // 3. Hi-Hat every half beat or 16th for fast tracks
      this.synthesizeDrum(beatTime, 'hihat');
      this.synthesizeDrum(beatTime + secondsPerBeat * 0.5, 'hihat');
      if (isHighSpeed) {
        this.synthesizeDrum(beatTime + secondsPerBeat * 0.25, 'hihat');
        this.synthesizeDrum(beatTime + secondsPerBeat * 0.75, 'hihat');
      }

      // 4. Bass note on downbeats
      const root = chord[0] * 0.5;
      this.synthesizeBass(beatTime, root, secondsPerBeat * 0.4);
      if (beat % 2 === 1 || isHighSpeed) {
        this.synthesizeBass(beatTime + secondsPerBeat * 0.5, root * 1.5, secondsPerBeat * 0.3);
      }

      // 5. Synth pad / chord hit on beat 0 and beat 2
      if (beat % 2 === 0) {
        this.synthesizeChord(beatTime, chord, secondsPerBeat * 1.8);
      }

      // 6. Arpeggiated melody line
      const arpNote = chord[(beat * 2) % chord.length] * (isHighSpeed ? 2.5 : 2);
      this.synthesizeLead(beatTime + secondsPerBeat * 0.25, arpNote, secondsPerBeat * 0.2);
    }
  }

  private synthesizeDrum(time: number, type: 'kick' | 'snare' | 'hihat') {
    if (!this.ctx || !this.bgmGain) return;

    if (type === 'kick') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
      gain.gain.setValueAtTime(0.7 * this.bgmVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + 0.18);
    } else if (type === 'snare') {
      // Noise burst + tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
      gain.gain.setValueAtTime(0.4 * this.bgmVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + 0.14);
    } else if (type === 'hihat') {
      // Filtered high-pitched click
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(6500, time);
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, time);
      gain.gain.setValueAtTime(0.12 * this.bgmVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + 0.04);
    }
  }

  private synthesizeBass(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + dur);

    gain.gain.setValueAtTime(0.35 * this.bgmVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  private synthesizeChord(time: number, freqs: number[], dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    freqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.1 * this.bgmVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(time);
      osc.stop(time + dur);
    });
  }

  private synthesizeLead(time: number, freq: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.16 * this.bgmVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  public pauseBgm() {
    if (this.ctx && this.isPlayingBgm) {
      this.pauseTime = this.getCurrentSongTime();
      this.stopBgm();
    }
  }

  public stopBgm() {
    this.isPlayingBgm = false;
    this.timerIds.forEach((id) => clearTimeout(id));
    this.timerIds = [];
    this.activeHoldSources.forEach((_, lane) => {
      this.stopHoldSound(lane);
    });
    this.activeHoldSources.clear();
  }
}

export const audioEngine = new AudioEngine();
