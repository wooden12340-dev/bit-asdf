import React, { useState, useEffect } from 'react';
import { GameSettings } from '../types/game';
import { audioEngine } from '../utils/audioEngine';
import { downloadPlanFile } from '../utils/planDocument';
import {
  X,
  Volume2,
  Music,
  Sliders,
  Keyboard,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  HelpCircle,
  FileText,
  Download,
} from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onSave: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const formatKeyLabel = (code: string, key: string): string => {
  if (code.startsWith('Key')) return code.replace('Key', '').toUpperCase();
  if (code.startsWith('Digit')) return code.replace('Digit', '');
  if (code.startsWith('Numpad')) return 'Num' + code.replace('Numpad', '');
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowRight') return '→';
  if (code === 'Space') return 'Space';
  if (code === 'Semicolon') return ';';
  if (code === 'Comma') return ',';
  if (code === 'Period') return '.';
  if (code === 'Slash') return '/';
  if (key && key.length === 1) return key.toUpperCase();
  return code;
};

const PRESET_KEYBOARDS: {
  name: string;
  desc: string;
  bindings: [string, string, string, string];
  labels: [string, string, string, string];
}[] = [
  {
    name: 'D · F · J · K',
    desc: '표준 리듬게임 기본 배치',
    bindings: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
    labels: ['D', 'F', 'J', 'K'],
  },
  {
    name: 'A · S · K · L',
    desc: 'DJMAX / 오투잼 와이드 배치',
    bindings: ['KeyA', 'KeyS', 'KeyK', 'KeyL'],
    labels: ['A', 'S', 'K', 'L'],
  },
  {
    name: 'Z · X · C · V',
    desc: '하단 4열 연속 배치',
    bindings: ['KeyZ', 'KeyX', 'KeyC', 'KeyV'],
    labels: ['Z', 'X', 'C', 'V'],
  },
  {
    name: 'Q · W · E · R',
    desc: 'MOBA / 상단 열 배치',
    bindings: ['KeyQ', 'KeyW', 'KeyE', 'KeyR'],
    labels: ['Q', 'W', 'E', 'R'],
  },
  {
    name: '← · ↓ · ↑ · →',
    desc: '방향키 4버튼',
    bindings: ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'],
    labels: ['←', '↓', '↑', '→'],
  },
  {
    name: '1 · 2 · 3 · 4',
    desc: '숫자키 4버튼',
    bindings: ['Digit1', 'Digit2', 'Digit3', 'Digit4'],
    labels: ['1', '2', '3', '4'],
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'KEYS' | 'GAMEPLAY'>('KEYS');
  const [current, setCurrent] = useState<GameSettings>({ ...settings });
  const [listeningLane, setListeningLane] = useState<number | null>(null);

  // Live test pad state
  const [testedLanes, setTestedLanes] = useState<boolean[]>([false, false, false, false]);

  // Global key listener for custom key mapping
  useEffect(() => {
    if (listeningLane === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListeningLane(null);
        return;
      }

      const code = e.code;
      const label = formatKeyLabel(code, e.key);

      const newBindings = [...current.keyBindings] as [string, string, string, string];
      const newLabels = [...current.keyLabels] as [string, string, string, string];

      // Check if this key is already used by another lane, and swap them if so
      const existingLane = newBindings.findIndex(
        (b) => b.toLowerCase() === code.toLowerCase()
      );
      if (existingLane !== -1 && existingLane !== listeningLane) {
        // Swap with old key
        newBindings[existingLane] = current.keyBindings[listeningLane];
        newLabels[existingLane] = current.keyLabels[listeningLane];
      }

      newBindings[listeningLane] = code;
      newLabels[listeningLane] = label;

      setCurrent((prev) => ({
        ...prev,
        keyBindings: newBindings,
        keyLabels: newLabels,
      }));

      // Sound feedback
      audioEngine.playHitSound(listeningLane, 'PERFECT');
      setListeningLane(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [listeningLane, current]);

  // Live key testing listener inside settings modal
  useEffect(() => {
    if (listeningLane !== null) return;

    const keyMap: Record<string, number> = {};
    current.keyBindings.forEach((binding, idx) => {
      keyMap[binding.toLowerCase()] = idx;
    });

    const onKeyDown = (e: KeyboardEvent) => {
      const lane = keyMap[e.code.toLowerCase()];
      if (lane !== undefined) {
        setTestedLanes((prev) => {
          const next = [...prev];
          next[lane] = true;
          return next;
        });
        audioEngine.playHitSound(lane, 'PERFECT');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const lane = keyMap[e.code.toLowerCase()];
      if (lane !== undefined) {
        setTestedLanes((prev) => {
          const next = [...prev];
          next[lane] = false;
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [current, listeningLane]);

  const applyPreset = (preset: (typeof PRESET_KEYBOARDS)[0]) => {
    setCurrent((prev) => ({
      ...prev,
      keyBindings: [...preset.bindings],
      keyLabels: [...preset.labels],
    }));
    audioEngine.playHitSound(1, 'PERFECT');
  };

  const laneColors = ['#f59e0b', '#06b6d4', '#ec4899', '#a855f7'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 outline-none select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl text-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">게임 및 키 설정</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 gap-2 my-4 bg-slate-950/60 p-1 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('KEYS')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'KEYS'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>키보드 조작키 설정</span>
          </button>
          <button
            onClick={() => setActiveTab('GAMEPLAY')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'GAMEPLAY'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>속도 & 사운드 싱크</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          {activeTab === 'KEYS' ? (
            <div className="space-y-5">
              {/* 4 Lanes Interactive Key Cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    4개 레인 키 변경 (버튼을 클릭 후 원하는 키를 누르세요)
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">1:1 실시간 매핑</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((lane) => {
                    const isListening = listeningLane === lane;
                    const isTested = testedLanes[lane];
                    const color = laneColors[lane];

                    return (
                      <button
                        key={lane}
                        type="button"
                        onClick={() => setListeningLane(lane)}
                        className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isListening
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 ring-2 ring-amber-400 animate-pulse'
                            : isTested
                            ? 'border-white bg-slate-700 text-white scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                            : 'border-slate-800 bg-slate-950/70 hover:border-slate-600 hover:bg-slate-800'
                        }`}
                        style={{
                          borderColor: isListening ? '#f59e0b' : isTested ? color : undefined,
                        }}
                      >
                        {/* Colored indicator dot */}
                        <div
                          className="w-4 h-1.5 rounded-full mb-1.5"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] text-slate-500 font-semibold mb-0.5">
                          {lane + 1}번 레인
                        </span>
                        <span className="text-lg font-black text-white font-mono tracking-tight">
                          {isListening ? '...' : current.keyLabels[lane]}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">
                          {isListening ? '키 입력...' : '클릭하여 변경'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Listening Overlay Notification */}
              {listeningLane !== null && (
                <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>
                      <strong className="text-amber-200">
                        {listeningLane + 1}번 레인
                      </strong>
                      에 할당할 키를 키보드로 눌러주세요!
                    </span>
                  </div>
                  <button
                    onClick={() => setListeningLane(null)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300"
                  >
                    취소 (ESC)
                  </button>
                </div>
              )}

              {/* Live Test Pad Preview */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>키보드 입력 실시간 테스트 존</span>
                  </div>
                  <span className="text-[10px] text-slate-500">키보드를 지금 눌러보세요</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[0, 1, 2, 3].map((lane) => (
                    <div
                      key={lane}
                      className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                        testedLanes[lane]
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {testedLanes[lane] ? 'PRESS! ✨' : current.keyLabels[lane]}
                    </div>
                  ))}
                </div>
              </div>

              {/* Preset Quick Selection */}
              <div>
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>원클릭 인기 키 프리셋</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_KEYBOARDS.map((preset) => {
                    const isCurrent =
                      current.keyBindings.join(',') === preset.bindings.join(',');
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-400/10 border-amber-400/50 text-amber-300 ring-1 ring-amber-400/30'
                            : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black font-mono flex items-center justify-between">
                          <span>{preset.name}</span>
                          {isCurrent && <Check className="w-3 h-3 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {preset.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 text-[11px] text-slate-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  모바일이나 태블릿에서는 언제든지 화면 하단의 4개 레인을 직접 터치하여 플레이할 수 있습니다.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Note Scroll Speed */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-300">노트 낙하 속도 (Scroll Speed)</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {current.scrollSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={current.scrollSpeed}
                  onChange={(e) =>
                    setCurrent({ ...current, scrollSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0.8x (초보자 권장)</span>
                  <span>1.5x (기본)</span>
                  <span>3.0x (고속)</span>
                </div>
              </div>

              {/* Audio Offset Calibration */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-300">판정 싱크 오프셋 (Audio Sync)</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {current.audioOffset > 0 ? `+${current.audioOffset}` : current.audioOffset} ms
                  </span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="5"
                  value={current.audioOffset}
                  onChange={(e) =>
                    setCurrent({ ...current, audioOffset: parseInt(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  음악보다 판정이 늦게 나오면 음수(-), 음악보다 빠르게 나오면 양수(+)로 조절하세요.
                </p>
              </div>

              {/* Volume Controls */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Music className="w-3.5 h-3.5 text-purple-400" /> 배경음악 볼륨 (BGM)
                    </span>
                    <span className="text-purple-400 font-mono font-bold">
                      {Math.round(current.bgmVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={current.bgmVolume}
                    onChange={(e) =>
                      setCurrent({ ...current, bgmVolume: parseFloat(e.target.value) })
                    }
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Volume2 className="w-3.5 h-3.5 text-pink-400" /> 타격 효과음 (SFX)
                    </span>
                    <span className="text-pink-400 font-mono font-bold">
                      {Math.round(current.sfxVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={current.sfxVolume}
                    onChange={(e) =>
                      setCurrent({ ...current, sfxVolume: parseFloat(e.target.value) })
                    }
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                </div>

                {/* Implementation Plan Specification Download */}
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">종합 구현 계획서</div>
                      <div className="text-[10px] text-slate-400">3D UI · 13트랙 · 판정 기획 명세</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => downloadPlanFile('markdown')}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer border border-amber-400/30"
                      title="마크다운 형식 다운로드"
                    >
                      <Download className="w-3 h-3" />
                      <span>.MD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPlanFile('txt')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer border border-slate-700"
                      title="텍스트 형식 다운로드"
                    >
                      <span>.TXT</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={() => {
              applyPreset(PRESET_KEYBOARDS[0]);
              setCurrent((prev) => ({
                ...prev,
                scrollSpeed: 1.5,
                audioOffset: 0,
                bgmVolume: 0.7,
                sfxVolume: 0.85,
              }));
            }}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값 초기화</span>
          </button>
          <button
            onClick={() => {
              onSave(current);
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98] cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>설정 저장 및 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
};
