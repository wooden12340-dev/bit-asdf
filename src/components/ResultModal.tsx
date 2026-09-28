import React from 'react';
import { GameStats, SongMetadata } from '../types/game';
import { RotateCcw, ArrowLeft, Sparkles, Flame, CheckCircle2 } from 'lucide-react';

interface ResultModalProps {
  stats: GameStats;
  song: SongMetadata;
  onRetry: () => void;
  onSongSelect: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ stats, song, onRetry, onSongSelect }) => {
  const totalNotes = stats.perfect + stats.great + stats.good + stats.miss;
  const isFullCombo = stats.miss === 0 && stats.maxCombo > 0;
  const isAllPerfect = isFullCombo && stats.great === 0 && stats.good === 0;

  // Determine Grade based on accuracy
  let grade = 'C';
  let gradeColor = 'text-slate-400';
  let gradeBg = 'bg-slate-800/80 border-slate-700';

  if (stats.accuracy >= 98 && isFullCombo) {
    grade = 'SSS';
    gradeColor = 'text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.9)]';
    gradeBg = 'bg-amber-400/10 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]';
  } else if (stats.accuracy >= 95) {
    grade = 'SS';
    gradeColor = 'text-cyan-300 drop-shadow-[0_0_12px_rgba(103,232,249,0.8)]';
    gradeBg = 'bg-cyan-400/10 border-cyan-400/50';
  } else if (stats.accuracy >= 90) {
    grade = 'S';
    gradeColor = 'text-purple-300 drop-shadow-[0_0_10px_rgba(216,180,254,0.8)]';
    gradeBg = 'bg-purple-400/10 border-purple-400/50';
  } else if (stats.accuracy >= 80) {
    grade = 'A';
    gradeColor = 'text-emerald-400';
    gradeBg = 'bg-emerald-400/10 border-emerald-400/50';
  } else if (stats.accuracy >= 70) {
    grade = 'B';
    gradeColor = 'text-blue-400';
    gradeBg = 'bg-blue-400/10 border-blue-400/50';
  } else {
    grade = 'C';
    gradeColor = 'text-rose-400';
    gradeBg = 'bg-rose-400/10 border-rose-400/50';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Track Title & Clear Status */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>STAGE CLEAR</span>
        </div>
        <h2 className="text-xl font-black text-white">{song.title}</h2>
        <p className="text-xs text-slate-400 mb-4">{song.difficulty} · {song.artist}</p>

        {/* Big Rank Badge */}
        <div className={`mx-auto w-24 h-24 rounded-2xl border flex flex-col items-center justify-center mb-3 shadow-inner ${gradeBg}`}>
          <span className={`text-5xl font-black font-mono tracking-tighter ${gradeColor}`}>
            {grade}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">GRADE</span>
        </div>

        {/* Special Achievement Badges: All Perfect or Full Combo */}
        <div className="h-6 flex items-center justify-center mb-3">
          {isAllPerfect ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-black tracking-wide animate-pulse">
              <Sparkles className="w-3 h-3" /> ALL PERFECT
            </span>
          ) : isFullCombo ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-black tracking-wide">
              <CheckCircle2 className="w-3 h-3" /> FULL COMBO
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">
              TOTAL NOTES: {totalNotes}
            </span>
          )}
        </div>

        {/* Score, Accuracy & Max Combo Display */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-mono">FINAL SCORE</div>
          <div className="text-3xl font-black text-white font-mono tracking-wider mb-3">
            {stats.score.toLocaleString()}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="bg-slate-900/60 p-2 rounded-xl">
              <span className="text-slate-400 block text-[10px]">정확도 (ACC)</span>
              <span className="font-bold text-cyan-300 font-mono text-base">{stats.accuracy.toFixed(1)}%</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-xl">
              <span className="text-slate-400 block text-[10px] flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> 최대 콤보 (MAX)
              </span>
              <span className="font-bold text-amber-400 font-mono text-base">{stats.maxCombo}</span>
            </div>
          </div>
        </div>

        {/* Judgment Breakdown */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-slate-800/60 rounded-xl p-2 border border-amber-400/10">
            <span className="block text-[10px] text-amber-400 font-bold">PERFECT</span>
            <span className="text-sm font-bold text-white font-mono">{stats.perfect}</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2 border border-cyan-400/10">
            <span className="block text-[10px] text-cyan-400 font-bold">GREAT</span>
            <span className="text-sm font-bold text-white font-mono">{stats.great}</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2 border border-purple-400/10">
            <span className="block text-[10px] text-purple-400 font-bold">GOOD</span>
            <span className="text-sm font-bold text-white font-mono">{stats.good}</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-2 border border-rose-500/10">
            <span className="block text-[10px] text-rose-500 font-bold">MISS</span>
            <span className="text-sm font-bold text-white font-mono">{stats.miss}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSongSelect}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>곡 선택</span>
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>다시하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
