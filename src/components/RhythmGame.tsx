import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SongMetadata, GameSettings, GameStats, Note, JudgmentFeedback, HitEffect } from '../types/game';
import { audioEngine } from '../utils/audioEngine';
import { Pause, Play, RotateCcw, ArrowLeft, Sliders, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RhythmGameProps {
  song: SongMetadata;
  settings: GameSettings;
  highScore?: number;
  onExit: () => void;
  onFinish: (stats: GameStats) => void;
  onOpenSettings?: () => void;
}

export const RhythmGame: React.FC<RhythmGameProps> = ({
  song,
  settings,
  highScore = 0,
  onExit,
  onFinish,
  onOpenSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game state
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [fever, setFever] = useState(0); // 0 to 100
  const [isFeverActive, setIsFeverActive] = useState(false);

  // Synchronous stats reference to avoid React closure staleness
  const statsRef = useRef<GameStats>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    health: 75,
    accuracy: 100,
  });

  const [stats, setStats] = useState<GameStats>({ ...statsRef.current });

  // Input states per lane (0..3)
  const activeLanesRef = useRef<boolean[]>([false, false, false, false]);
  const [activeLanesDisplay, setActiveLanesDisplay] = useState<boolean[]>([false, false, false, false]);
  const activeTouchesRef = useRef<Map<number, number>>(new Map());

  // Game loop references
  const animFrameIdRef = useRef<number | null>(null);
  const notesRef = useRef<(Note & { hit?: boolean; isHolding?: boolean; holdProgress?: number; missed?: boolean })[]>([]);
  const effectsRef = useRef<HitEffect[]>([]);
  const recentJudgmentsRef = useRef<JudgmentFeedback[]>([]);
  const isGameRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const hasFinishedRef = useRef(false);

  // Warp stars for cosmic background
  const warpStarsRef = useRef<{ x: number; y: number; length: number; speed: number; angle: number; color: string }[]>([]);

  // Sync settings with audio engine
  useEffect(() => {
    audioEngine.setVolumes(settings.bgmVolume, settings.sfxVolume);
    audioEngine.setOffset(settings.audioOffset);
  }, [settings]);

  // Initialize song notes & stats
  useEffect(() => {
    hasFinishedRef.current = false;
    statsRef.current = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      health: 75,
      accuracy: 100,
    };
    setStats({ ...statsRef.current });
    setFever(0);
    setIsFeverActive(false);

    notesRef.current = song.notes.map((n) => ({
      ...n,
      hit: false,
      missed: false,
      isHolding: false,
      holdProgress: 0,
    }));

    // Initialize cosmic warp stars
    const stars = [];
    const colors = ['#f43f5e', '#fb923c', '#06b6d4', '#e879f9', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        length: 20 + Math.random() * 60,
        speed: 0.008 + Math.random() * 0.02,
        angle: Math.random() > 0.5 ? 0.35 : -0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    warpStarsRef.current = stars;
  }, [song]);

  // Judgment trigger with sound, score, fever and star ring hit feedback
  const triggerJudgment = useCallback(
    (type: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS', lane: number, targetX?: number, targetY?: number) => {
      audioEngine.playHitSound(lane, type);

      const now = performance.now();
      recentJudgmentsRef.current.push({
        type,
        lane,
        time: now,
      });

      // Spawn star burst effect matching the screenshot!
      if (type !== 'MISS' && targetX !== undefined && targetY !== undefined) {
        const laneColors = ['#f43f5e', '#06b6d4', '#ec4899', '#38bdf8'];
        const hitColor = laneColors[lane % laneColors.length];

        // 8 orbiting star particles
        const stars = [];
        const numStars = type === 'PERFECT' ? 8 : 5;
        for (let i = 0; i < numStars; i++) {
          stars.push({
            angle: (i / numStars) * Math.PI * 2 + Math.random() * 0.4,
            speed: 35 + Math.random() * 30,
            size: 6 + Math.random() * 4,
          });
        }

        effectsRef.current.push({
          x: targetX,
          y: targetY,
          color: hitColor,
          birth: now,
          maxRadius: type === 'PERFECT' ? 75 : 55,
          duration: 420,
          type: 'starRing',
          stars,
        });
      }

      const prev = statsRef.current;
      let scoreAdd = 0;
      let newCombo = prev.combo;
      let newHealth = prev.health;

      const feverMult = isFeverActive ? 1.5 : 1.0;

      if (type === 'PERFECT') {
        scoreAdd = Math.round((1000 + Math.min(newCombo * 15, 450)) * feverMult);
        newCombo += 1;
        newHealth = Math.min(100, newHealth + 3);
        setFever((f) => Math.min(100, f + 4));
      } else if (type === 'GREAT') {
        scoreAdd = Math.round((700 + Math.min(newCombo * 8, 200)) * feverMult);
        newCombo += 1;
        newHealth = Math.min(100, newHealth + 1.5);
        setFever((f) => Math.min(100, f + 2.5));
      } else if (type === 'GOOD') {
        scoreAdd = Math.round(400 * feverMult);
        newCombo += 1;
        newHealth = Math.max(0, newHealth - 1);
      } else {
        // MISS
        newCombo = 0;
        newHealth = Math.max(0, newHealth - 8);
        setFever((f) => Math.max(0, f - 15));
      }

      const perfect = prev.perfect + (type === 'PERFECT' ? 1 : 0);
      const great = prev.great + (type === 'GREAT' ? 1 : 0);
      const good = prev.good + (type === 'GOOD' ? 1 : 0);
      const miss = prev.miss + (type === 'MISS' ? 1 : 0);
      const totalJudged = perfect + great + good + miss;

      const accuracy = totalJudged > 0
        ? ((perfect * 100 + great * 75 + good * 40) / (totalJudged * 100)) * 100
        : 100;

      const updatedStats: GameStats = {
        score: prev.score + scoreAdd,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        perfect,
        great,
        good,
        miss,
        health: newHealth,
        accuracy: Number(accuracy.toFixed(1)),
      };

      statsRef.current = updatedStats;
      setStats({ ...updatedStats });
    },
    [isFeverActive]
  );

  // Trigger Fever mode when bar reaches 100%
  useEffect(() => {
    if (fever >= 100 && !isFeverActive) {
      setIsFeverActive(true);
      const timeout = window.setTimeout(() => {
        setIsFeverActive(false);
        setFever(0);
      }, 7000);
      return () => clearTimeout(timeout);
    }
  }, [fever, isFeverActive]);

  // Clean game completion handler
  const finishGame = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    isGameRunningRef.current = false;
    audioEngine.stopBgm();

    // Mark unhit notes as MISS
    let unhitMissCount = 0;
    for (const note of notesRef.current) {
      if (!note.hit && !note.missed) {
        note.missed = true;
        unhitMissCount++;
      }
    }

    if (unhitMissCount > 0) {
      const cur = statsRef.current;
      const totalMiss = cur.miss + unhitMissCount;
      const totalJudged = cur.perfect + cur.great + cur.good + totalMiss;
      const finalAcc = totalJudged > 0
        ? ((cur.perfect * 100 + cur.great * 75 + cur.good * 40) / (totalJudged * 100)) * 100
        : 0;

      statsRef.current = {
        ...cur,
        combo: 0,
        miss: totalMiss,
        accuracy: Number(finalAcc.toFixed(1)),
      };
      setStats({ ...statsRef.current });
    }

    confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });
    setTimeout(() => {
      onFinish({ ...statsRef.current });
    }, 1100);
  }, [onFinish]);

  // Helper to project 3D coordinate at judge line for lane
  const getJudgeTargetCoords = useCallback((lane: number) => {
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width / (window.devicePixelRatio || 1) : 600;
    const height = canvas ? canvas.height / (window.devicePixelRatio || 1) : 400;

    const judgeY = height * 0.83;
    const bottomWidth = Math.min(width * 0.94, 760);
    const centerX = width / 2;
    const trackLeft = centerX - bottomWidth / 2;
    const laneWidth = bottomWidth / 4;
    const targetX = trackLeft + (lane + 0.5) * laneWidth;
    return { x: targetX, y: judgeY };
  }, []);

  // Lane input press handler
  const handleLaneDown = useCallback(
    (lane: number) => {
      if (lane < 0 || lane > 3) return;
      activeLanesRef.current[lane] = true;
      setActiveLanesDisplay([...activeLanesRef.current]);

      if (!isGameRunningRef.current || isPausedRef.current) return;

      const songTime = audioEngine.getCurrentSongTime();
      const coords = getJudgeTargetCoords(lane);

      const windowMs = 160;
      let bestNote: (typeof notesRef.current)[0] | null = null;
      let minDiff = Infinity;

      for (const note of notesRef.current) {
        if (note.lane === lane && !note.hit && !note.missed) {
          const diff = Math.abs(songTime - note.time) * 1000;
          if (diff < windowMs && diff < minDiff) {
            minDiff = diff;
            bestNote = note;
          }
        }
      }

      if (bestNote) {
        if (bestNote.type === 'tap') {
          bestNote.hit = true;
          let judgment: 'PERFECT' | 'GREAT' | 'GOOD' = 'GOOD';
          if (minDiff <= 55) judgment = 'PERFECT';
          else if (minDiff <= 100) judgment = 'GREAT';

          triggerJudgment(judgment, lane, coords.x, coords.y);
        } else if (bestNote.type === 'hold') {
          bestNote.isHolding = true;
          audioEngine.startHoldSound(lane);

          let judgment: 'PERFECT' | 'GREAT' | 'GOOD' = 'GOOD';
          if (minDiff <= 65) judgment = 'PERFECT';
          else if (minDiff <= 115) judgment = 'GREAT';

          triggerJudgment(judgment, lane, coords.x, coords.y);
        }
      }
    },
    [triggerJudgment, getJudgeTargetCoords]
  );

  // Lane input release handler
  const handleLaneUp = useCallback(
    (lane: number) => {
      if (lane < 0 || lane > 3) return;
      activeLanesRef.current[lane] = false;
      setActiveLanesDisplay([...activeLanesRef.current]);
      audioEngine.stopHoldSound(lane);

      const songTime = audioEngine.getCurrentSongTime();
      for (const note of notesRef.current) {
        if (note.lane === lane && note.type === 'hold' && note.isHolding && !note.hit) {
          note.isHolding = false;
          const endTime = note.time + (note.duration || 1);

          if (songTime < endTime - 0.25) {
            // Early break! Reset combo
            const cur = statsRef.current;
            statsRef.current = {
              ...cur,
              combo: 0,
            };
            setStats({ ...statsRef.current });
          } else {
            note.hit = true;
          }
        }
      }
    },
    []
  );

  // 1. Keyboard event listeners (matching custom keys)
  useEffect(() => {
    const keyMap: Record<string, number> = {};
    settings.keyBindings.forEach((binding, idx) => {
      if (binding) keyMap[binding.toLowerCase()] = idx;
      if (settings.keyLabels[idx]) keyMap[settings.keyLabels[idx].toLowerCase()] = idx;
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }

      const lane = keyMap[e.code.toLowerCase()] ?? keyMap[e.key.toLowerCase()];
      if (lane !== undefined) {
        e.preventDefault();
        handleLaneDown(lane);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const lane = keyMap[e.code.toLowerCase()] ?? keyMap[e.key.toLowerCase()];
      if (lane !== undefined) {
        e.preventDefault();
        handleLaneUp(lane);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [settings, handleLaneDown, handleLaneUp]);

  // 2. Touch / Pointer Events for Responsive Touchscreen
  const getLaneFromPointer = (clientX: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right) return null;

    const relativeX = clientX - rect.left;
    const bottomWidth = Math.min(rect.width * 0.94, 760);
    const centerX = rect.width / 2;
    const trackLeft = centerX - bottomWidth / 2;

    if (relativeX < trackLeft || relativeX > trackLeft + bottomWidth) {
      // Outside track boundaries, partition whole screen into 4
      return Math.min(3, Math.max(0, Math.floor((relativeX / rect.width) * 4)));
    }

    const laneWidth = bottomWidth / 4;
    return Math.min(3, Math.max(0, Math.floor((relativeX - trackLeft) / laneWidth)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const lane = getLaneFromPointer(e.clientX);
    if (lane !== null) {
      activeTouchesRef.current.set(e.pointerId, lane);
      handleLaneDown(lane);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeTouchesRef.current.has(e.pointerId)) return;
    const currentLane = activeTouchesRef.current.get(e.pointerId);
    const newLane = getLaneFromPointer(e.clientX);
    if (newLane !== null && newLane !== currentLane) {
      if (currentLane !== undefined) handleLaneUp(currentLane);
      activeTouchesRef.current.set(e.pointerId, newLane);
      handleLaneDown(newLane);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const lane = activeTouchesRef.current.get(e.pointerId);
    if (lane !== undefined) {
      handleLaneUp(lane);
      activeTouchesRef.current.delete(e.pointerId);
    }
  };

  // Start sequence with 3..2..1 countdown
  useEffect(() => {
    let timer: number;
    if (countdown !== null && countdown > 0) {
      timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 700);
    } else if (countdown === 0) {
      setCountdown(null);
      isGameRunningRef.current = true;
      audioEngine.startBgmTrack(song.id, song.bpm, song.duration, finishGame);
    }
    return () => clearTimeout(timer);
  }, [countdown, song, finishGame]);

  const togglePause = () => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      audioEngine.init();
    } else {
      isPausedRef.current = true;
      setIsPaused(true);
      audioEngine.pauseBgm();
    }
  };

  // Helper to draw a glowing 5-pointed star
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  // Helper to draw rounded rectangle
  const drawCapsule = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Main 3D Perspective Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const render = () => {
      if (!ctx || !canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // 1. Draw Cosmic Warp Speed Background (Orange, magenta, red radial streaks)
      ctx.fillStyle = '#0a0512';
      ctx.fillRect(0, 0, width, height);

      // Render cosmic nebula gradients on the sides
      const leftGrad = ctx.createLinearGradient(0, height * 0.4, width * 0.35, height * 0.4);
      leftGrad.addColorStop(0, 'rgba(234, 88, 12, 0.45)');
      leftGrad.addColorStop(0.5, 'rgba(217, 70, 239, 0.35)');
      leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, width * 0.4, height);

      const rightGrad = ctx.createLinearGradient(width, height * 0.4, width * 0.65, height * 0.4);
      rightGrad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
      rightGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.35)');
      rightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(width * 0.6, 0, width * 0.4, height);

      // Draw streaming warp stars
      const now = performance.now();
      for (const star of warpStarsRef.current) {
        star.y += star.speed;
        if (star.y > 1) {
          star.y = 0;
          star.x = Math.random();
        }
        const sx = star.x * width;
        const sy = star.y * height;
        ctx.save();
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + star.angle * star.length, sy + star.length);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Compute 3D Perspective Projection Geometry
      const topY = height * 0.08;
      const judgeY = height * 0.83;
      const topWidth = Math.min(width * 0.32, 220);
      const bottomWidth = Math.min(width * 0.94, 760);
      const centerX = width / 2;

      const topTrackLeft = centerX - topWidth / 2;
      const topTrackRight = centerX + topWidth / 2;
      const bottomTrackLeft = centerX - bottomWidth / 2;
      const bottomTrackRight = centerX + bottomWidth / 2;

      // Draw 3D Highway Stage (Trapezoid floor with cosmic galaxy pattern)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(topTrackLeft, topY);
      ctx.lineTo(topTrackRight, topY);
      ctx.lineTo(bottomTrackRight, judgeY + 30);
      ctx.lineTo(bottomTrackLeft, judgeY + 30);
      ctx.closePath();

      // Deep space highway gradient
      const highwayGrad = ctx.createLinearGradient(0, topY, 0, judgeY);
      highwayGrad.addColorStop(0, '#0c1024');
      highwayGrad.addColorStop(0.6, '#0f172a');
      highwayGrad.addColorStop(1, '#050816');
      ctx.fillStyle = highwayGrad;
      ctx.fill();

      // Metallic border framing the 3D Highway (matching screenshot)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Draw the 4 Lanes & Metallic Dividers with perspective
      for (let i = 0; i <= 4; i++) {
        const topLaneX = topTrackLeft + (i / 4) * topWidth;
        const bottomLaneX = bottomTrackLeft + (i / 4) * bottomWidth;

        ctx.save();
        ctx.strokeStyle = i === 0 || i === 4 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = i === 0 || i === 4 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(topLaneX, topY);
        ctx.lineTo(bottomLaneX, judgeY + 25);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Active Lane Light Beams (when user presses a lane)
      for (let i = 0; i < 4; i++) {
        if (activeLanesRef.current[i]) {
          const tL = topTrackLeft + (i / 4) * topWidth;
          const tR = topTrackLeft + ((i + 1) / 4) * topWidth;
          const bL = bottomTrackLeft + (i / 4) * bottomWidth;
          const bR = bottomTrackLeft + ((i + 1) / 4) * bottomWidth;

          const isPink = i === 0 || i === 2;
          const beamGrad = ctx.createLinearGradient(0, judgeY, 0, topY);
          beamGrad.addColorStop(0, isPink ? 'rgba(244, 63, 94, 0.45)' : 'rgba(6, 182, 212, 0.45)');
          beamGrad.addColorStop(0.7, isPink ? 'rgba(244, 63, 94, 0.12)' : 'rgba(6, 182, 212, 0.12)');
          beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(tL, topY);
          ctx.lineTo(tR, topY);
          ctx.lineTo(bR, judgeY);
          ctx.lineTo(bL, judgeY);
          ctx.closePath();
          ctx.fillStyle = beamGrad;
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Top Horizon Center Arrow / Pulse (like in screenshot)
      ctx.save();
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX, topY - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Render 3D Perspective Notes
      const songTime = audioEngine.getCurrentSongTime();
      const lookAhead = 1.35 / settings.scrollSpeed; // Look ahead duration in seconds

      // Perspective projection helper for a given note time
      const getNote3D = (lane: number, time: number) => {
        const timeDiff = time - songTime;
        // Progress: 0 at horizon, 1 at judgment line
        const p = 1 - timeDiff / lookAhead;
        if (p < 0 || p > 1.3) return null;

        // Apply slight power curve for realistic 3D perspective depth
        const depthP = Math.pow(Math.max(0, p), 1.25);

        const curY = topY + (judgeY - topY) * depthP;
        const curTrackW = topWidth + (bottomWidth - topWidth) * depthP;
        const curTrackLeft = centerX - curTrackW / 2;
        const curLaneW = curTrackW / 4;
        const curLaneX = curTrackLeft + (lane + 0.5) * curLaneW;

        const noteW = curLaneW * 0.86;
        const noteH = 10 + 18 * depthP;

        return { x: curLaneX, y: curY, w: noteW, h: noteH, p: depthP };
      };

      const notes = notesRef.current;
      for (const note of notes) {
        if (note.hit) continue;

        // Auto MISS check if note fallen past judgment line
        if (!note.missed && !note.isHolding && songTime > note.time + 0.16) {
          note.missed = true;
          const coords = getJudgeTargetCoords(note.lane);
          triggerJudgment('MISS', note.lane, coords.x, coords.y);
        }

        const isCyan = note.lane % 2 === 1;
        const mainColor = isCyan ? '#06b6d4' : '#f43f5e';
        const lightColor = isCyan ? '#67e8f9' : '#fda4af';

        // 3A. Render Hold Note Rail and Top Orb
        if (note.type === 'hold' && note.duration) {
          const head3D = getNote3D(note.lane, Math.max(songTime, note.time));
          const tail3D = getNote3D(note.lane, note.time + note.duration);

          if (head3D || tail3D) {
            const hY = head3D ? head3D.y : judgeY;
            const hX = head3D ? head3D.x : getJudgeTargetCoords(note.lane).x;
            const tY = tail3D ? tail3D.y : topY;
            const tX = tail3D ? tail3D.x : topTrackLeft + (note.lane + 0.5) * (topWidth / 4);

            // Glowing Dual Rail Lines
            ctx.save();
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 6 * (head3D ? head3D.p : 0.8);
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(hX, hY);
            ctx.lineTo(tX, tY);
            ctx.stroke();

            // Inner bright core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * (head3D ? head3D.p : 0.8);
            ctx.beginPath();
            ctx.moveTo(hX, hY);
            ctx.lineTo(tX, tY);
            ctx.stroke();

            // Top Glowing Orb (as in screenshot)
            if (tail3D && tail3D.y > topY) {
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(tX, tY, 8 * tail3D.p + 3, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = mainColor;
              ctx.beginPath();
              ctx.arc(tX, tY, 5 * tail3D.p + 2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Continuous hold sparks
            if (note.isHolding) {
              const holdProgress = Math.min(1, (songTime - note.time) / note.duration);
              note.holdProgress = holdProgress;

              // Periodic hold spark generator
              if (Math.random() < 0.4) {
                effectsRef.current.push({
                  x: hX + (Math.random() - 0.5) * 20,
                  y: judgeY + (Math.random() - 0.5) * 8,
                  color: mainColor,
                  birth: performance.now(),
                  maxRadius: 15,
                  duration: 220,
                  type: 'holdTick',
                });
              }

              // Check if hold note reached end successfully
              const endTime = note.time + (note.duration || 1);
              if (songTime >= endTime) {
                note.hit = true;
                note.isHolding = false;
                audioEngine.stopHoldSound(note.lane);

                const coords = getJudgeTargetCoords(note.lane);
                effectsRef.current.push({
                  x: coords.x,
                  y: coords.y,
                  color: mainColor,
                  birth: performance.now(),
                  maxRadius: 65,
                  duration: 350,
                  type: 'starRing',
                  stars: [
                    { angle: 0, speed: 30, size: 6 },
                    { angle: Math.PI * 0.5, speed: 30, size: 6 },
                    { angle: Math.PI, speed: 30, size: 6 },
                    { angle: Math.PI * 1.5, speed: 30, size: 6 },
                  ],
                });
              }
            }
          }
        }

        // 3B. Render Glossy Capsule Note with Chevron Arrow 'v'
        const note3D = getNote3D(note.lane, note.time);
        if (note3D) {
          const { x: nx, y: ny, w: nw, h: nh, p: np } = note3D;

          ctx.save();
          // Glow shadow
          ctx.shadowColor = mainColor;
          ctx.shadowBlur = note.isHolding ? 20 : 12;

          // Note capsule background gradient
          const noteGrad = ctx.createLinearGradient(0, ny - nh / 2, 0, ny + nh / 2);
          noteGrad.addColorStop(0, lightColor);
          noteGrad.addColorStop(0.5, mainColor);
          noteGrad.addColorStop(1, isCyan ? '#0284c7' : '#be123c');

          ctx.fillStyle = noteGrad;
          drawCapsule(ctx, nx - nw / 2, ny - nh / 2, nw, nh, nh / 2);
          ctx.fill();

          // Beveled rim border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, 2 * np);
          ctx.stroke();

          // White glossy highlight reflection on upper half
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          drawCapsule(ctx, nx - nw * 0.45, ny - nh * 0.42, nw * 0.9, nh * 0.35, nh * 0.2);
          ctx.fill();

          // Iconic Downward Chevron Arrow (v) inside the note
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1.5, 2.5 * np);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const chevronW = Math.max(4, 7 * np);
          const chevronH = Math.max(3, 4.5 * np);

          ctx.beginPath();
          ctx.moveTo(nx - chevronW, ny - chevronH * 0.3);
          ctx.lineTo(nx, ny + chevronH * 0.7);
          ctx.lineTo(nx + chevronW, ny - chevronH * 0.3);
          ctx.stroke();

          ctx.restore();
        }
      }

      // 4. Draw Bottom Judgment Line & 4 Capsule Targets (as in screenshot)
      // Metallic base bar
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(bottomTrackLeft - 10, judgeY - 14, bottomWidth + 20, 28);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(bottomTrackLeft - 10, judgeY - 14, bottomWidth + 20, 28);
      ctx.restore();

      const laneW = bottomWidth / 4;
      for (let i = 0; i < 4; i++) {
        const targetX = bottomTrackLeft + (i + 0.5) * laneW;
        const targetY = judgeY;
        const targetW = laneW * 0.88;
        const targetH = 26;
        const isCyan = i % 2 === 1;
        const rimColor = isCyan ? '#06b6d4' : '#f43f5e';
        const isPressed = activeLanesRef.current[i];

        ctx.save();
        // Target pill slot
        ctx.fillStyle = isPressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.85)';
        drawCapsule(ctx, targetX - targetW / 2, targetY - targetH / 2, targetW, targetH, targetH / 2);
        ctx.fill();

        // Glowing neon outline
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = isPressed ? 3.5 : 2;
        ctx.shadowColor = rimColor;
        ctx.shadowBlur = isPressed ? 18 : 8;
        ctx.stroke();

        // White decorative star inside target
        ctx.fillStyle = '#ffffff';
        drawStar(ctx, targetX - targetW * 0.32, targetY, 5, 4, 2);
        ctx.fill();

        // Key Label in center of target
        ctx.fillStyle = isPressed ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(settings.keyLabels[i], targetX, targetY);

        ctx.restore();
      }

      // 5. Render Hit Effects (Star Ring Burst & Shockwaves matching screenshot)
      effectsRef.current = effectsRef.current.filter((effect) => {
        const progress = (now - effect.birth) / effect.duration;
        if (progress >= 1) return false;

        const currentRadius = effect.maxRadius * Math.sin(progress * (Math.PI / 2));
        const alpha = 1 - progress;

        ctx.save();
        if (effect.type === 'starRing') {
          // Multiple concentric glowing shockwave rings
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 3.5 * (1 - progress * 0.6);
          ctx.shadowColor = effect.color;
          ctx.shadowBlur = 20;
          ctx.globalAlpha = alpha;

          ctx.beginPath();
          ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Outer secondary ring
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, currentRadius * 1.35, 0, Math.PI * 2);
          ctx.stroke();

          // Orbiting sparkling star particles (matching screenshot!)
          if (effect.stars) {
            for (const s of effect.stars) {
              const starDist = currentRadius + progress * s.speed;
              const sx = effect.x + Math.cos(s.angle) * starDist;
              const sy = effect.y + Math.sin(s.angle) * starDist;

              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = effect.color;
              ctx.shadowBlur = 10;
              drawStar(ctx, sx, sy, 5, s.size * (1 - progress * 0.4), s.size * 0.45);
              ctx.fill();
            }
          }
        } else if (effect.type === 'holdTick') {
          ctx.fillStyle = effect.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 4 * (1 - progress), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        return true;
      });

      // 6. Floating Judgments
      recentJudgmentsRef.current = recentJudgmentsRef.current.filter((j) => {
        return now - j.time <= 650;
      });

      // Check if song duration finished
      if (isGameRunningRef.current && songTime >= song.duration + 0.6) {
        finishGame();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [settings.scrollSpeed, settings.keyLabels, triggerJudgment, finishGame, song.duration, getJudgeTargetCoords]);

  const latestJudgment = recentJudgmentsRef.current[recentJudgmentsRef.current.length - 1];

  // HP Bar segment rendering helper (diagonal striped cells matching screenshot)
  const renderHpSegments = () => {
    const totalSegments = 24;
    const activeSegments = Math.round((stats.health / 100) * totalSegments);
    const segments = [];

    for (let i = 0; i < totalSegments; i++) {
      const isActive = i < activeSegments;
      // Gradient from green to yellow to red
      const ratio = i / totalSegments;
      const color =
        ratio < 0.35 ? 'bg-amber-400' : ratio < 0.7 ? 'bg-yellow-300' : 'bg-emerald-400';

      segments.push(
        <div
          key={i}
          className={`h-full w-1.5 -skew-x-[25deg] transition-all duration-100 ${
            isActive ? `${color} shadow-[0_0_6px_rgba(251,191,36,0.6)]` : 'bg-slate-800/80'
          }`}
        />
      );
    }
    return segments;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden touch-none font-sans">
      {/* Arcade Landscape Container matching the user's uploaded screenshot */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-full max-w-5xl max-h-[860px] bg-[#0a0512] shadow-2xl flex flex-col overflow-hidden border-x border-slate-900"
      >
        {/* ================= TOP HUD UI (Exactly matching screenshot!) ================= */}
        <div className="absolute top-0 left-0 right-0 z-30 px-3 sm:px-6 py-2.5 flex items-start justify-between pointer-events-none">
          {/* Top Left: FEVER Bar + HP Slanted Meter + Arcade Badge */}
          <div className="flex flex-col gap-1.5">
            {/* FEVER Meter Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black italic tracking-widest text-pink-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">
                FEVER
              </span>
              <div className="relative w-36 sm:w-48 h-2.5 bg-slate-900/90 rounded-full border border-pink-500/40 overflow-hidden shadow-inner">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    isFeverActive
                      ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 animate-pulse'
                      : 'bg-gradient-to-r from-amber-400 to-pink-500'
                  }`}
                  style={{ width: `${fever}%` }}
                />
              </div>
              {isFeverActive && (
                <span className="text-[10px] font-black italic text-amber-300 animate-bounce">
                  x1.5!
                </span>
              )}
            </div>

            {/* HP Segmented Diagonal Meter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black italic tracking-wider text-white font-mono">
                HP
              </span>
              <div className="flex items-center gap-0.5 h-3.5 px-1 py-0.5 bg-black/80 rounded-md border border-slate-700/80 shadow-inner">
                {renderHpSegments()}
              </div>
            </div>

            {/* Arcade Badge: LINE 4 | MODE E/N/H | SPEED x1.5 */}
            <div className="flex items-center gap-1 mt-0.5 bg-slate-900/90 border border-slate-700/80 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300 shadow-md backdrop-blur-md w-fit">
              <span className="text-slate-400">LINE</span>
              <span className="text-white font-black">4</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">MODE</span>
              <span className="text-amber-400 font-black">
                {song.difficulty === 'Easy'
                  ? 'E'
                  : song.difficulty === 'Normal'
                  ? 'N'
                  : song.difficulty === 'Hard'
                  ? 'H'
                  : song.difficulty === 'Expert'
                  ? 'EX'
                  : 'MAS'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">SPEED</span>
              <span className="text-cyan-400 font-black">x{settings.scrollSpeed.toFixed(1)}</span>
            </div>
          </div>

          {/* Top Right: RECORD + SCORE + Song Info + Pause Button */}
          <div className="flex items-start gap-2.5 pointer-events-auto">
            <div className="flex flex-col items-end">
              {/* Previous High Record */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono italic">
                <span>RECORD▶</span>
                <span className="text-slate-200 font-bold font-mono">
                  {highScore > 0 ? highScore.toLocaleString() : '---'}
                </span>
              </div>

              {/* Current SCORE Display (Metallic arcade italic font) */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-black italic tracking-widest text-slate-300 font-mono">
                  SCORE▶
                </span>
                <span className="text-2xl sm:text-3xl font-black italic tracking-wider text-amber-300 font-mono drop-shadow-[0_0_12px_rgba(252,211,77,0.7)]">
                  {stats.score.toLocaleString()}
                </span>
              </div>

              {/* Song Album / Track Title Badge */}
              <div className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 font-mono truncate max-w-[160px]">
                {song.artist} · {song.title}
              </div>
            </div>

            {/* Arcade Beveled Pause Button */}
            <button
              onClick={togglePause}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
              aria-label="Pause"
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* ================= 3D HIGHWAY CANVAS ================= */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 block pointer-events-none" />

        {/* ================= CENTER / RIGHT IN-GAME HUD ================= */}
        {/* Big Glowing Arcade Judgment (PERFECT, GREAT, etc.) in Upper Center */}
        <div className="absolute top-[17%] sm:top-[19%] left-0 right-0 z-20 flex flex-col items-center pointer-events-none">
          {latestJudgment && (
            <div
              key={latestJudgment.time}
              className="animate-bounce flex flex-col items-center select-none"
            >
              <span
                className={`text-3xl sm:text-4xl font-black italic tracking-widest ${
                  latestJudgment.type === 'PERFECT'
                    ? 'text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,0.9)] stroke-white'
                    : latestJudgment.type === 'GREAT'
                    ? 'text-cyan-300 drop-shadow-[0_0_16px_rgba(103,232,249,0.9)]'
                    : latestJudgment.type === 'GOOD'
                    ? 'text-purple-300 drop-shadow-[0_0_12px_rgba(216,180,254,0.8)]'
                    : 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                }`}
                style={{
                  textShadow: '0 0 16px currentColor, 0 2px 4px #000',
                  WebkitTextStroke: '1px rgba(255,255,255,0.7)',
                }}
              >
                {latestJudgment.type}
              </span>
            </div>
          )}
        </div>

        {/* Right Side COMBO Display (Exactly as in screenshot!) */}
        <div className="absolute top-[28%] sm:top-[30%] right-4 sm:right-10 z-20 flex flex-col items-end pointer-events-none select-none">
          <span className="text-xs sm:text-sm font-black italic tracking-widest text-slate-300 drop-shadow">
            COMBO
          </span>
          <span
            className="text-4xl sm:text-6xl font-black italic tracking-tighter text-pink-400 font-mono"
            style={{
              textShadow: '0 0 20px rgba(244,63,94,0.9), 0 2px 4px #000',
              WebkitTextStroke: '1.5px #ffffff',
            }}
          >
            {stats.combo}
          </span>
        </div>

        {/* Bottom Interactive Touch Area for 4 Lanes (Responsive on all screens) */}
        <div className="absolute bottom-2 left-0 right-0 z-30 px-3 sm:px-6 flex justify-center pointer-events-auto">
          <div className="w-full max-w-[760px] grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((laneIndex) => {
              const isPressed = activeLanesDisplay[laneIndex];
              const isCyan = laneIndex % 2 === 1;
              const rimColor = isCyan ? '#06b6d4' : '#f43f5e';

              return (
                <button
                  key={laneIndex}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    handleLaneDown(laneIndex);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handleLaneUp(laneIndex);
                  }}
                  onPointerCancel={(e) => {
                    e.preventDefault();
                    handleLaneUp(laneIndex);
                  }}
                  className={`h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-75 select-none active:scale-95 border cursor-pointer ${
                    isPressed
                      ? 'bg-slate-700/80 border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                  style={{
                    borderColor: isPressed ? '#ffffff' : rimColor,
                    boxShadow: isPressed ? `0 0 20px ${rimColor}` : undefined,
                  }}
                >
                  <span className="text-xs sm:text-sm font-black text-white font-mono tracking-wider">
                    {settings.keyLabels[laneIndex]}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest">
                    TOUCH
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3..2..1 Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <span className="text-7xl sm:text-8xl font-black text-amber-400 animate-ping font-mono italic">
              {countdown > 0 ? countdown : 'START!'}
            </span>
            <span className="text-sm text-slate-300 mt-6 tracking-widest font-mono">
              KEYBOARD [{settings.keyLabels.join(' · ')}] OR TOUCH LANES
            </span>
          </div>
        )}

        {/* Pause Modal */}
        {isPaused && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">일시 정지</h2>
              <p className="text-xs text-slate-400 mb-6">게임이 멈추었습니다.</p>

              <div className="space-y-3">
                <button
                  onClick={togglePause}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>계속하기</span>
                </button>

                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-sm flex items-center justify-center gap-2 transition-all border border-amber-400/20 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>키 설정 및 싱크 조절</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    audioEngine.stopBgm();
                    setIsPaused(false);
                    isPausedRef.current = false;
                    setCountdown(3);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>처음부터 다시하기</span>
                </button>

                <button
                  onClick={onExit}
                  className="w-full py-2.5 rounded-xl text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                >
                  곡 선택으로 나가기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
