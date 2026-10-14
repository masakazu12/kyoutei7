import React from 'react';
import { AutoPilotConfig, AutoPilotStage } from '../types/kyotei';
import { AUTOPILOT_STAGE_META } from '../services/autopilotService';
import {
  Play,
  Square,
  Sliders,
  Radio,
  Clock,
  TrendingUp,
  ShieldCheck,
  Zap,
  RotateCw,
  Sparkles,
  Bot,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';

interface AutoPilotControlBarProps {
  config: AutoPilotConfig;
  stage: AutoPilotStage;
  currentMessage: string;
  countdownSeconds: number;
  autoSessionRaces: number;
  autoSessionHits: number;
  autoSessionProfit: number;
  currentVenue?: string;
  currentRaceNo?: number;
  nextTargetVenue?: string;
  nextTargetRaceNo?: number;
  nextDeadlineTime?: string;
  teleboatBalance?: number;
  patrolledCount?: number;
  totalPatrolQueueCount?: number;
  onOpenBalanceSync?: () => void;
  onToggleAutoPilot: () => void;
  onToggleTargetMode?: () => void;
  onOpenAutoPilotModal: () => void;
  onForceNextRace?: () => void;
  onToggleSound?: () => void;
}

export const AutoPilotControlBar: React.FC<AutoPilotControlBarProps> = ({
  config,
  stage,
  currentMessage,
  countdownSeconds,
  autoSessionRaces,
  autoSessionHits,
  autoSessionProfit,
  currentVenue,
  currentRaceNo,
  nextTargetVenue,
  nextTargetRaceNo,
  nextDeadlineTime,
  teleboatBalance,
  patrolledCount = 0,
  totalPatrolQueueCount,
  onOpenBalanceSync,
  onToggleAutoPilot,
  onToggleTargetMode,
  onOpenAutoPilotModal,
  onForceNextRace,
  onToggleSound,
}) => {
  const isRunning = config.enabled && stage !== 'STOPPED' && stage !== 'SAFETY_STOP';
  const meta = AUTOPILOT_STAGE_META[stage] || AUTOPILOT_STAGE_META.STOPPED;
  const isProfit = autoSessionProfit > 0;
  const isLoss = autoSessionProfit < 0;
  const hitRate = autoSessionRaces > 0 ? ((autoSessionHits / autoSessionRaces) * 100).toFixed(1) : '0.0';
  const isAllVenues = config.targetMode === 'all_venues';

  return (
    <div
      className={`border rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5 transition-all select-none shadow-md ${
        isRunning
          ? 'bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-cyan-500/80 ring-1 ring-cyan-500/40'
          : stage === 'SAFETY_STOP'
          ? 'bg-rose-950/50 border-rose-600 ring-1 ring-rose-500/50'
          : 'bg-slate-950 border-slate-800'
      }`}
    >
      {/* 左エリア: メイン切替スイッチ & ステージバッジ */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* 自動運転 START / STOP ボタン */}
        <button
          onClick={onToggleAutoPilot}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-black text-xs transition-all shadow-md cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white hover:scale-[1.02]'
          }`}
          title={isRunning ? '自動運転を緊急停止します' : '全自動運転（予想・配分・投票・結果取得サイクル）を開始'}
        >
          {isRunning ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>停止 (STOP)</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>全自動運転 START</span>
            </>
          )}
        </button>

        {/* 巡回モード ワンクリック切替ボタン */}
        {onToggleTargetMode && (
          <button
            onClick={onToggleTargetMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold transition-all cursor-pointer ${
              isAllVenues
                ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-200 hover:bg-cyan-900/80 shadow-sm shadow-cyan-950'
                : 'bg-amber-950/70 border-amber-500/80 text-amber-200 hover:bg-amber-900/80 shadow-sm shadow-amber-950'
            }`}
            title="クリックで【全国43競輪場巡回】と【単一会場連続】を即座に切り替え"
          >
            <RotateCw className="w-3 h-3 text-current" />
            <span>{isAllVenues ? '全国43競輪場 横断巡回' : `単一競輪場連続 (${currentVenue || '現会場'})`}</span>
            <span className="text-[9px] opacity-75 ml-0.5 underline">切替</span>
          </button>
        )}

        {/* 稼働ステータスインジケーター */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
            <span>{meta.label}</span>
          </div>

          {/* カウントダウン表示 (秒) */}
          {isRunning && countdownSeconds > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-mono font-bold bg-cyan-950/60 border border-cyan-800 rounded px-2 py-0.5">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>次回: {countdownSeconds}秒後</span>
            </div>
          )}
        </div>

        {/* 巡回先プレビュー（全会場巡回時） */}
        {nextTargetVenue && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-900 border border-slate-800 rounded px-2.5 py-0.5 font-sans">
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              {config.patrolOrder === 'venue_round_robin' ? '会場順' : '〆切早い順'}
            </span>
            {patrolledCount > 0 && totalPatrolQueueCount ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold" title="同一レースの複数回巡回を防止中">
                巡回進捗: {patrolledCount}/{totalPatrolQueueCount} (重複防止)
              </span>
            ) : null}
            <span className="text-slate-500">次回:</span>
            <span className="text-cyan-300 font-bold">
              {nextTargetVenue} {nextTargetRaceNo ? `${nextTargetRaceNo}R` : ''}
              {nextDeadlineTime ? (
                <span className="text-amber-300 ml-1 font-mono">(締切 {nextDeadlineTime})</span>
              ) : null}
            </span>
          </div>
        )}

        {/* 進行中メッセージ */}
        <div className="text-xs text-slate-300 max-w-xs md:max-w-md truncate font-sans">
          <span className="text-slate-400 mr-1 text-[11px]">現在:</span>
          <span className="font-medium text-slate-100">{currentMessage || meta.description}</span>
        </div>
      </div>

      {/* 右エリア: 自動運転実績カウンター & コントロール */}
      <div className="flex items-center gap-3 flex-wrap ml-auto">
        {/* セッション成績表示 */}
        <div className="flex items-center gap-3 text-xs font-mono bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1">
          <div className="flex items-center gap-1">
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[10px] font-sans">運転成績:</span>
            <span className="font-bold text-slate-200">
              {autoSessionRaces}戦 {autoSessionHits}勝 ({hitRate}%)
            </span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px] font-sans">自動運転損益:</span>
            <span
              className={`font-black ${
                isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {isProfit ? `+${autoSessionProfit.toLocaleString()}` : autoSessionProfit.toLocaleString()}円
            </span>
          </div>
        </div>

        {/* テレボート残高クイック表示 */}
        {teleboatBalance !== undefined && (
          <button
            onClick={onOpenBalanceSync || onOpenAutoPilotModal}
            className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-amber-500/50 rounded text-xs transition-colors cursor-pointer"
            title="テレボート購入限度額（実残高）（クリックで照合・同期）"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400">購入限度額:</span>
            <span className="font-mono font-bold text-amber-300">¥{teleboatBalance.toLocaleString()}</span>
          </button>
        )}

        {/* スキップ / 次レース強制実行ボタン */}
        {isRunning && onForceNextRace && (
          <button
            onClick={onForceNextRace}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-xs font-bold transition-colors cursor-pointer"
            title="現在の待機をスキップして即座に次工程へ進む"
          >
            <RotateCw className="w-3 h-3 text-cyan-400" />
            <span>スキップ</span>
          </button>
        )}

        {/* 音声切替 */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              config.soundAlert
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={config.soundAlert ? '音声アラート有効' : '音声アラート消音中'}
          >
            {config.soundAlert ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* 詳細設定 & ログモーダルボタン */}
        <button
          onClick={onOpenAutoPilotModal}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs font-bold transition-colors cursor-pointer"
          title="自動運転の詳細設定・セーフティ・実行ログを開く"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>設定・ログ</span>
        </button>
      </div>
    </div>
  );
};
