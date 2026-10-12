import React from 'react';
import { AppStatus } from '../types/kyotei';

interface StatusStampProps {
  status: AppStatus;
  size?: 'sm' | 'md' | 'lg';
  reason?: string;
  showTextLabel?: boolean;
}

export const StatusStamp: React.FC<StatusStampProps> = ({
  status,
  size = 'md',
  reason,
  showTextLabel = true,
}) => {
  // サイズ別設定
  const sizeConfig = {
    sm: { box: 'w-24 h-16', iconSize: 18, text: 'text-xs', subText: 'text-[9px]' },
    md: { box: 'w-36 h-24', iconSize: 24, text: 'text-sm font-bold', subText: 'text-[11px]' },
    lg: { box: 'w-48 h-32', iconSize: 32, text: 'text-base font-extrabold', subText: 'text-xs' },
  }[size];

  // 状態ごとの配色と和文・英文表記（付録C準拠）
  const statusDetails: Record<
    AppStatus,
    {
      titleJa: string;
      titleEn: string;
      sub: string;
      borderClass: string;
      bgClass: string;
      textClass: string;
      accentBg: string;
      icon: string;
    }
  > = {
    Taiki: {
      titleJa: '待　機',
      titleEn: 'TAIKI',
      sub: 'レース準備中',
      borderClass: 'border-cyan-500/80',
      bgClass: 'bg-cyan-950/40',
      textClass: 'text-cyan-300',
      accentBg: 'bg-cyan-500',
      icon: '⏳',
    },
    Skip: {
      titleJa: '見送り',
      titleEn: 'SKIP / MISYRI',
      sub: '条件不適合除外',
      borderClass: 'border-amber-500/80',
      bgClass: 'bg-amber-950/40',
      textClass: 'text-amber-300',
      accentBg: 'bg-amber-500',
      icon: '⚠',
    },
    Stop: {
      titleJa: '停　止',
      titleEn: 'STOP',
      sub: '目標/上限停止',
      borderClass: 'border-red-600',
      bgClass: 'bg-red-950/50',
      textClass: 'text-red-400',
      accentBg: 'bg-red-600',
      icon: '⛔',
    },
    NG: {
      titleJa: 'Ｎ　Ｇ',
      titleEn: 'ERROR',
      sub: '入力条件不備',
      borderClass: 'border-rose-500',
      bgClass: 'bg-rose-950/40',
      textClass: 'text-rose-300',
      accentBg: 'bg-rose-500',
      icon: '✖',
    },
    Teki2: {
      titleJa: '的　中',
      titleEn: 'HIT / TEKI2',
      sub: '払戻金確定',
      borderClass: 'border-yellow-400',
      bgClass: 'bg-yellow-950/60',
      textClass: 'text-yellow-300',
      accentBg: 'bg-yellow-400',
      icon: '🎯',
    },
    Hazure: {
      titleJa: '不的中',
      titleEn: 'HAZURE',
      sub: '結果不一致',
      borderClass: 'border-slate-500',
      bgClass: 'bg-slate-900/60',
      textClass: 'text-slate-400',
      accentBg: 'bg-slate-600',
      icon: '✕',
    },
  };

  const current = statusDetails[status] || statusDetails.Taiki;

  return (
    <div className="flex flex-col items-center select-none">
      {/* スタンプ外枠（競艇投票端末・検定印スタイルの二重枠スタンプ） */}
      <div
        className={`relative ${sizeConfig.box} rounded-lg border-2 ${current.borderClass} ${current.bgClass} flex flex-col items-center justify-center p-1.5 shadow-md shadow-black/40 overflow-hidden transition-all duration-200`}
        title={reason || current.sub}
      >
        {/* 背景装飾のウォーターマーク効果 */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center text-4xl font-black pointer-events-none">
          {current.titleEn}
        </div>

        {/* 内側の細線（スタンプ印判風の二重罫線） */}
        <div className={`w-full h-full border border-dashed ${current.borderClass} opacity-60 rounded flex flex-col items-center justify-between p-1`}>
          <div className="flex items-center justify-between w-full px-1">
            <span className={`text-[9px] tracking-wider font-mono font-semibold ${current.textClass}`}>
              PRO-5
            </span>
            <span className={`text-[8px] font-mono tracking-widest ${current.textClass} opacity-80`}>
              {current.titleEn}
            </span>
          </div>

          {/* メイン漢字スタンプ表示 */}
          <div className="flex items-center gap-1.5 my-auto">
            <span className="text-sm">{current.icon}</span>
            <span className={`font-black tracking-widest ${sizeConfig.text} ${current.textClass} drop-shadow-sm`}>
              {current.titleJa}
            </span>
          </div>

          <div className="w-full text-center">
            <span className={`block font-mono ${sizeConfig.subText} ${current.textClass} opacity-90 truncate`}>
              {current.sub}
            </span>
          </div>
        </div>
      </div>

      {showTextLabel && reason && (
        <p className="mt-1 text-[11px] text-slate-300 max-w-[220px] text-center leading-tight truncate" title={reason}>
          {reason}
        </p>
      )}
    </div>
  );
};
