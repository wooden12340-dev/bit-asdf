import React, { useState } from 'react';
import { IMPLEMENTATION_PLAN_MARKDOWN, downloadPlanFile } from '../utils/planDocument';
import { X, Download, Copy, Check, FileText, Sparkles, FileCode } from 'lucide-react';

interface PlanModalProps {
  onClose: () => void;
}

export const PlanModal: React.FC<PlanModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(IMPLEMENTATION_PLAN_MARKDOWN);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = IMPLEMENTATION_PLAN_MARKDOWN;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (format: 'markdown' | 'txt') => {
    downloadPlanFile(format);
    setDownloadSuccess(format === 'markdown' ? '.md' : '.txt');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl text-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5 font-mono">
                <span>BEAT ARCADE 구현 계획서</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-sans font-bold">
                  v2.0 종합본
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">3D UI · 13트랙 풀버전 · 정밀 판정 및 조작계 종합 명세</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Download Buttons Bar */}
        <div className="grid grid-cols-3 gap-2 my-3 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl shrink-0">
          <button
            onClick={() => handleDownload('markdown')}
            className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.MD 다운로드</span>
          </button>

          <button
            onClick={() => handleDownload('txt')}
            className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 border border-slate-700 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>.TXT 다운로드</span>
          </button>

          <button
            onClick={handleCopy}
            className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 border border-slate-700 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-black">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>클립보드 복사</span>
              </>
            )}
          </button>
        </div>

        {/* Download notification banner */}
        {downloadSuccess && (
          <div className="mb-2 py-1.5 px-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span><strong>BEAT_ARCADE_구현계획서{downloadSuccess}</strong> 파일 다운로드가 시작되었습니다!</span>
          </div>
        )}

        {/* Document Content Viewer */}
        <div className="flex-1 overflow-y-auto pr-1.5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed select-text whitespace-pre-wrap scrollbar-thin">
          {IMPLEMENTATION_PLAN_MARKDOWN}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 text-[11px] text-slate-400 mt-2">
          <span>마크다운 문서 형식으로 저장하여 로컬에 보관하거나 공유할 수 있습니다.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
