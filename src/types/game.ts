export type NoteType = 'tap' | 'hold';

export interface Note {
  id: string;
  lane: number; // 0, 1, 2, 3
  time: number; // target time in seconds
  type: NoteType; // 'tap' | 'hold'
  duration?: number; // for hold notes, in seconds
  color?: string; // hex or preset color
  isHoldEnd?: boolean;
}

export type JudgmentType = 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';

export interface JudgmentFeedback {
  type: JudgmentType;
  lane: number;
  time: number;
  diffMs?: number;
}

export interface HitEffect {
  x: number;
  y: number;
  color: string;
  birth: number;
  maxRadius: number;
  duration: number; // ms
  type: 'ring' | 'sparkle' | 'holdTick' | 'starRing';
  stars?: { angle: number; speed: number; size: number }[];
}

export type DifficultyLevel = 'Easy' | 'Normal' | 'Hard' | 'Expert' | 'Master';

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  difficulty: DifficultyLevel;
  coverGradient: string;
  colorTheme: string;
  notes: Note[];
}

export interface GameSettings {
  scrollSpeed: number; // e.g. 1.0 to 3.0
  audioOffset: number; // in milliseconds (-200 to +200)
  bgmVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  keyBindings: [string, string, string, string]; // default: ['KeyD', 'KeyF', 'KeyJ', 'KeyK']
  keyLabels: [string, string, string, string]; // ['D', 'F', 'J', 'K']
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  health: number; // 0 - 100
  accuracy: number; // 0 - 100%
}
