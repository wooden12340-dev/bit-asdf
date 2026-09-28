import { SongMetadata, Note, DifficultyLevel } from '../types/game';

// Professional chart generation engine with authentic arcade rhythm patterns
function generateArcadeChart(
  bpm: number,
  duration: number,
  difficulty: DifficultyLevel
): Note[] {
  const beatSec = 60 / bpm;
  const halfBeat = beatSec * 0.5; // 8th note
  const quarterBeat = beatSec * 0.25; // 16th note
  const notes: Note[] = [];
  let idCounter = 1;

  const colors = ['#f43f5e', '#06b6d4', '#f43f5e', '#06b6d4']; // Lane alternating colors (Pink / Cyan)

  // Start after 1.8s lead-in
  let t = 1.8;
  const endTime = duration - 1.5;

  let patternState = 0;

  while (t < endTime) {
    const progress = t / duration; // 0 to 1
    const isBuildUp = progress > 0.25 && progress < 0.45;
    const isDrop = progress >= 0.45 && progress < 0.85;
    const isOutro = progress >= 0.85;

    // Easy chart: steady 4th notes with occasional hold
    if (difficulty === 'Easy') {
      const lane = Math.floor(Math.random() * 4);
      const isHold = Math.random() < 0.2;
      if (isHold) {
        const holdDur = beatSec * 1.5;
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          duration: Number(holdDur.toFixed(3)),
          type: 'hold',
          color: colors[lane],
        });
        t += holdDur + beatSec;
      } else {
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[lane],
        });
        t += beatSec;
      }
      continue;
    }

    // Normal chart: 8th notes and syncopated holds
    if (difficulty === 'Normal') {
      const isHold = Math.random() < 0.25;
      const lane = Math.floor(Math.random() * 4);

      if (isHold) {
        const holdDur = beatSec * (Math.random() > 0.5 ? 2 : 1);
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          duration: Number(holdDur.toFixed(3)),
          type: 'hold',
          color: colors[lane],
        });
        t += holdDur + halfBeat;
      } else {
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[lane],
        });
        t += isDrop ? halfBeat : (Math.random() > 0.35 ? halfBeat : beatSec);
      }
      continue;
    }

    // Hard, Expert, Master charts:
    // Complex patterns: Stairs, Trills, Simultaneous Dual Chords, Hold with Simultaneous Taps, 16th Streams!
    patternState = (patternState + 1) % 5;

    if (isDrop && (difficulty === 'Expert' || difficulty === 'Master') && Math.random() < 0.35) {
      // 1. Dual Chord Tap (Simultaneous two lanes e.g. [0, 3], [1, 2], [0, 2])
      const chordPairs = [
        [0, 3],
        [1, 2],
        [0, 2],
        [1, 3],
        [0, 1],
        [2, 3],
      ];
      const pair = chordPairs[Math.floor(Math.random() * chordPairs.length)];
      pair.forEach((l) => {
        notes.push({
          id: `note-${idCounter++}`,
          lane: l,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[l],
        });
      });
      t += halfBeat;
    } else if (isDrop && difficulty === 'Master' && Math.random() < 0.3) {
      // 2. High-speed 16th note roll stream (4 ~ 6 notes in rapid succession)
      const streamLen = Math.floor(Math.random() * 3) + 4;
      let curLane = Math.floor(Math.random() * 4);
      for (let s = 0; s < streamLen && t < endTime; s++) {
        notes.push({
          id: `note-${idCounter++}`,
          lane: curLane,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[curLane],
        });
        t += quarterBeat;
        curLane = (curLane + 1) % 4;
      }
      t += halfBeat;
    } else if ((difficulty === 'Expert' || difficulty === 'Master') && Math.random() < 0.28) {
      // 3. Fast Trill (alternating two lanes back-and-forth)
      const l1 = Math.random() > 0.5 ? 0 : 2;
      const l2 = l1 + 1;
      const trillCount = difficulty === 'Master' ? 5 : 3;
      for (let tr = 0; tr < trillCount && t < endTime; tr++) {
        const lane = tr % 2 === 0 ? l1 : l2;
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[lane],
        });
        t += quarterBeat;
      }
    } else if (patternState === 0 || patternState === 2) {
      // 4. Ascending or Descending Staircase (e.g. 0 -> 1 -> 2 -> 3 or 3 -> 2 -> 1 -> 0)
      const ascending = Math.random() > 0.5;
      const stepTime = (difficulty === 'Master' || (difficulty === 'Expert' && isDrop)) ? quarterBeat : halfBeat;
      for (let s = 0; s < 4 && t < endTime; s++) {
        const lane = ascending ? s : 3 - s;
        notes.push({
          id: `note-${idCounter++}`,
          lane,
          time: Number(t.toFixed(3)),
          type: 'tap',
          color: colors[lane],
        });
        t += stepTime;
      }
    } else if (Math.random() < 0.25) {
      // 5. Hold note with concurrent tap on opposite side
      const holdLane = Math.random() > 0.5 ? 0 : 3;
      const tapLane = holdLane === 0 ? 2 : 1;
      const holdDur = beatSec * (difficulty === 'Master' ? 1.5 : 2);

      notes.push({
        id: `note-${idCounter++}`,
        lane: holdLane,
        time: Number(t.toFixed(3)),
        duration: Number(holdDur.toFixed(3)),
        type: 'hold',
        color: colors[holdLane],
      });

      // Tap midway through the hold
      notes.push({
        id: `note-${idCounter++}`,
        lane: tapLane,
        time: Number((t + halfBeat).toFixed(3)),
        type: 'tap',
        color: colors[tapLane],
      });

      t += holdDur + halfBeat;
    } else {
      // 6. Fast syncopated single taps
      const lane = Math.floor(Math.random() * 4);
      notes.push({
        id: `note-${idCounter++}`,
        lane,
        time: Number(t.toFixed(3)),
        type: 'tap',
        color: colors[lane],
      });

      if (difficulty === 'Master') {
        t += isDrop ? quarterBeat : halfBeat;
      } else if (difficulty === 'Expert') {
        t += (isDrop || isBuildUp) ? halfBeat : (Math.random() > 0.4 ? halfBeat : beatSec * 0.75);
      } else {
        // Hard
        t += Math.random() > 0.4 ? halfBeat : beatSec * 0.75;
      }
    }
  }

  // Sort notes strictly by time
  notes.sort((a, b) => a.time - b.time);
  return notes;
}

export const PRESET_SONGS: SongMetadata[] = [
  // --- Standard Tracks ---
  {
    id: 'neon',
    title: 'Neon Smile',
    artist: 'Smile Crew',
    bpm: 124,
    duration: 42,
    difficulty: 'Easy',
    coverGradient: 'from-amber-400 via-pink-500 to-purple-600',
    colorTheme: '#fbbf24',
    notes: generateArcadeChart(124, 42, 'Easy'),
  },
  {
    id: 'cyber',
    title: 'Cyber Blossom',
    artist: 'Pixel Pulse',
    bpm: 138,
    duration: 46,
    difficulty: 'Normal',
    coverGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    colorTheme: '#06b6d4',
    notes: generateArcadeChart(138, 46, 'Normal'),
  },
  {
    id: 'cosmic',
    title: 'Galactic Rush',
    artist: 'Nova Bass',
    bpm: 155,
    duration: 52,
    difficulty: 'Hard',
    coverGradient: 'from-fuchsia-500 via-purple-600 to-violet-900',
    colorTheme: '#a855f7',
    notes: generateArcadeChart(155, 52, 'Hard'),
  },

  // --- 10 NEW Challenging & Hard Tracks ---
  {
    id: 'supernova',
    title: 'Supernova Blitz',
    artist: 'Astral Drive',
    bpm: 175,
    duration: 54,
    difficulty: 'Hard',
    coverGradient: 'from-amber-500 via-orange-600 to-red-700',
    colorTheme: '#f97316',
    notes: generateArcadeChart(175, 54, 'Hard'),
  },
  {
    id: 'tokyo',
    title: 'Tokyo Overdrive',
    artist: 'Drift Horizon',
    bpm: 182,
    duration: 56,
    difficulty: 'Expert',
    coverGradient: 'from-pink-500 via-rose-600 to-purple-800',
    colorTheme: '#ec4899',
    notes: generateArcadeChart(182, 56, 'Expert'),
  },
  {
    id: 'valkyrie',
    title: 'Valkyrie Protocol',
    artist: 'Cyber Valkyrie',
    bpm: 190,
    duration: 58,
    difficulty: 'Expert',
    coverGradient: 'from-cyan-500 via-teal-600 to-slate-900',
    colorTheme: '#14b8a6',
    notes: generateArcadeChart(190, 58, 'Expert'),
  },
  {
    id: 'samurai',
    title: 'Cyber Samurai',
    artist: 'Ronin Sound',
    bpm: 188,
    duration: 56,
    difficulty: 'Expert',
    coverGradient: 'from-red-500 via-crimson-600 to-zinc-900',
    colorTheme: '#ef4444',
    notes: generateArcadeChart(188, 56, 'Expert'),
  },
  {
    id: 'inferno',
    title: 'Inferno Eclipse',
    artist: 'Hellfire FX',
    bpm: 200,
    duration: 60,
    difficulty: 'Expert',
    coverGradient: 'from-orange-600 via-red-600 to-amber-700',
    colorTheme: '#ea580c',
    notes: generateArcadeChart(200, 60, 'Expert'),
  },
  {
    id: 'chrono',
    title: 'Chrono Paradox',
    artist: 'Time Breaker',
    bpm: 210,
    duration: 62,
    difficulty: 'Expert',
    coverGradient: 'from-purple-600 via-indigo-600 to-cyan-700',
    colorTheme: '#8b5cf6',
    notes: generateArcadeChart(210, 62, 'Expert'),
  },
  {
    id: 'resonance',
    title: 'Final Resonance',
    artist: 'Psychedelic Mind',
    bpm: 195,
    duration: 60,
    difficulty: 'Master',
    coverGradient: 'from-violet-600 via-fuchsia-600 to-rose-700',
    colorTheme: '#c026d3',
    notes: generateArcadeChart(195, 60, 'Master'),
  },
  {
    id: 'quantum',
    title: 'Quantum Chaos',
    artist: 'Subatomic',
    bpm: 220,
    duration: 64,
    difficulty: 'Master',
    coverGradient: 'from-blue-600 via-cyan-500 to-emerald-600',
    colorTheme: '#0284c7',
    notes: generateArcadeChart(220, 64, 'Master'),
  },
  {
    id: 'apocalypse',
    title: 'Apocalypse 2099',
    artist: 'Dark Core Project',
    bpm: 205,
    duration: 65,
    difficulty: 'Master',
    coverGradient: 'from-rose-700 via-purple-900 to-black',
    colorTheme: '#be123c',
    notes: generateArcadeChart(205, 65, 'Master'),
  },
  {
    id: 'godspeed',
    title: 'Godspeed Smile',
    artist: 'Omega Sound Unit',
    bpm: 235,
    duration: 68,
    difficulty: 'Master',
    coverGradient: 'from-red-600 via-amber-500 to-yellow-300',
    colorTheme: '#f43f5e',
    notes: generateArcadeChart(235, 68, 'Master'),
  },
];
