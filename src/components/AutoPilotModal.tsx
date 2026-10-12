import React, { useState, useMemo } from 'react';
import { AutoPilotConfig, AutoPilotLogItem, AutoPilotStage } from '../types/kyotei';
import { AutoVoteConfig } from '../services/teleboatService';
import { VENUES } from '../constants/venues';
import { AUTOPILOT_STAGE_META, buildPatrolQueue, PatrolRaceItem } from '../services/autopilotService';
import { ActiveVenueSchedule } from '../services/raceDataProvider';
import {
  Bot,
  Sliders,
  Play,
  Square,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  ListOrdered,
  FileText,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
  TrendingUp,
  Wallet,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface AutoPilotModalProps {
  config: AutoPilotConfig;
  stage: AutoPilotStage;
  logs: AutoPilotLogItem[];
  teleboatConfig?: AutoVoteConfig;
  activeVenues?: ActiveVenueSchedule[];
  patrolledKeys?: Set<string>;
  onResetPatrolledHistory?: () => void;
  onBatchFetchVenues?: () => Promise<void> | void;
  onOpenAutoVoteModal?: () => void;
  onOpenBalanceSync?: () => void;
  onUpdateConfig: (updated: Partial<AutoPilotConfig>) => void;
  onToggleAutoPilot: () => void;
  onClearLogs: () => void;
  onClose: () => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  config,
  stage,
  logs,
  teleboatConfig,
  activeVenues,
  patrolledKeys,
  onResetPatrolledHistory,
  onBatchFetchVenues,
  onOpenAutoVoteModal,
  onOpenBalanceSync,
  onUpdateConfig,
  onToggleAutoPilot,
  onClearLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'safety'>('settings');
  const isRunning = config.enabled && stage !== 'STOPPED' && stage !== 'SAFETY_STOP';
  const meta = AUTOPILOT_STAGE_META[stage] || AUTOPILOT_STAGE_META.STOPPED;

  const patrolQueue = useMemo(() => {
    return buildPatrolQueue({
      config,
      availableVenues: activeVenues ? activeVenues.map((v) => v.venueName) : undefined,
      alreadyVotedKeys: patrolledKeys,
    });
  }, [config, activeVenues, patrolledKeys]);

  const patrolledCount = useMemo(() => {
    return patrolQueue.filter((item) => item.isVoted).length;
  }, [patrolQueue]);

  const logTypeBadge = (type: AutoPilotLogItem['type']) => {
    switch (type) {
      case 'HIT':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold">★的中</span>;
      case 'MISS':
        return <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">不的中</span>;
      case 'VOTE':
        return <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600 font-bold">投票</span>;
      case 'PREDICT':
        return <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-600">予想</span>;
      case 'SKIP':
        return <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600">見送り</span>;
      case 'STOP':
        return <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-bold">停止</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">情報</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] select-none animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">全自動運転システム (Kyotei Autopilot Pro)</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                番組巡回・条件判定・予想・オッズ資金配分・自動投票・結果取得の全サイクル自動制御
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>自動運転設定</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'logs'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>運転ログ ({logs.length}件)</span>
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'safety'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>セーフティ安全装置</span>
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* 1. 巡回対象モード */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <ListOrdered className="w-4 h-4 text-cyan-400" />
                  <span>巡回対象・進行モード</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                      config.targetMode === 'single_venue'
                        ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-400'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      checked={config.targetMode === 'single_venue'}
                      onChange={() => onUpdateConfig({ targetMode: 'single_venue' })}
                      className="mt-0.5 text-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-200">単一会場 連続運転 (1R ➔ 12R)</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        選択中の開催場（例: 住之江）を第1Rから第12Rまで順次自動進行します。
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                      config.targetMode === 'all_venues'
                        ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-400'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      checked={config.targetMode === 'all_venues'}
                      onChange={() => onUpdateConfig({ targetMode: 'all_venues' })}
                      className="mt-0.5 text-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-200">全国24場 横断巡回</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        全国各場を1レースごとに順次巡回して分析・投票・確定結果取得を自動反復します。
                      </div>
                    </div>
                  </label>
                </div>

                {/* 全会場巡回時の対象会場カスタマイズ */}
                {config.targetMode === 'all_venues' && (
                  <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                        <span>巡回対象会場の選択</span>
                        <span className="text-[10px] text-slate-400">
                          ({config.targetVenues.length === 0 ? '全24場すべて巡回中' : `${config.targetVenues.length}場を選択中`})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {activeVenues && activeVenues.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateConfig({
                                targetVenues: activeVenues.map((v) => v.venueName),
                              })
                            }
                            className="text-[10px] px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-600 rounded transition-colors cursor-pointer font-bold flex items-center gap-1"
                          >
                            <span>本日開催 {activeVenues.length}場</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onUpdateConfig({ targetVenues: [] })}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            config.targetVenues.length === 0
                              ? 'bg-cyan-900 border-cyan-500 text-cyan-200 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          全24場すべて
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateConfig({
                              targetVenues: ['桐生', '蒲郡', '住之江', '丸亀', '下関', '若松', '大村'],
                            })
                          }
                          className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
                        >
                          ナイター (7場)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateConfig({
                              targetVenues: ['鳴門', '徳山', '芦屋', '唐津'],
                            })
                          }
                          className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors cursor-pointer"
                        >
                          モーニング (4場)
                        </button>
                        {onBatchFetchVenues && (
                          <button
                            type="button"
                            onClick={() => onBatchFetchVenues()}
                            className="text-[10px] px-2 py-0.5 bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-600 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold"
                            title="本日の開催会場スケジュールを一括同期取得"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>本日会場を一括取得</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 会場選択グリッド */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 pt-1">
                      {VENUES.map((v) => {
                        const isSelected =
                          config.targetVenues.length === 0 || config.targetVenues.includes(v.name);
                        return (
                          <button
                            key={v.code}
                            type="button"
                            onClick={() => {
                              const current = config.targetVenues.length === 0 ? VENUES.map((item) => item.name) : [...config.targetVenues];
                              const next = current.includes(v.name)
                                ? current.filter((n) => n !== v.name)
                                : [...current, v.name];
                              onUpdateConfig({
                                targetVenues: next.length === VENUES.length ? [] : next,
                              });
                            }}
                            className={`px-1.5 py-1 rounded text-center text-[11px] font-bold border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-950'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {v.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* レース範囲選択 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-850">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">開始レース番号:</label>
                    <select
                      value={config.startRaceNo}
                      onChange={(e) => onUpdateConfig({ startRaceNo: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>
                          第{r}R
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">終了レース番号:</label>
                    <select
                      value={config.endRaceNo}
                      onChange={(e) => onUpdateConfig({ endRaceNo: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>
                          第{r}R
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">進行タイミング:</label>
                    <select
                      value={config.minutesBeforeDeadline}
                      onChange={(e) => onUpdateConfig({ minutesBeforeDeadline: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 text-xs"
                    >
                      <option value={0}>即時進行 (高速シミュレーション)</option>
                      <option value={1}>締切1分前</option>
                      <option value={3}>締切3分前 (推奨)</option>
                      <option value={5}>締切5分前</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">次R待機秒数:</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={config.advanceDelaySeconds}
                      onChange={(e) => onUpdateConfig({ advanceDelaySeconds: Math.max(1, parseInt(e.target.value, 10) || 3) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* 巡回順序（プライオリティ）の選択 */}
                <div className="pt-2.5 border-t border-slate-850 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>巡回順序（プライオリティ）</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-normal">
                      ※ 締切時刻が早いレースから順次投票
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                        (config.patrolOrder || 'deadline_asc') === 'deadline_asc'
                          ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-400'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      <input
                        type="radio"
                        name="patrolOrder"
                        checked={(config.patrolOrder || 'deadline_asc') === 'deadline_asc'}
                        onChange={() => onUpdateConfig({ patrolOrder: 'deadline_asc' })}
                        className="mt-0.5 text-amber-500"
                      />
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>〆切時刻が早い順 (推奨)</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            公式時系列
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          対象会場の全番組を締切時刻が早い順（08:35 ➔ 09:00 ➔ 10:45 ... ➔ 20:45）に時系列巡回します。
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                        config.patrolOrder === 'venue_round_robin'
                          ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-400'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                      }`}
                    >
                      <input
                        type="radio"
                        name="patrolOrder"
                        checked={config.patrolOrder === 'venue_round_robin'}
                        onChange={() => onUpdateConfig({ patrolOrder: 'venue_round_robin' })}
                        className="mt-0.5 text-blue-500"
                      />
                      <div>
                        <div className="font-bold text-slate-200">会場順 (ラウンドロビン)</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          会場リスト順に1レースずつ交互に切り替えて巡回します。
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 巡回予定タイムライン（〆切順キュー）プレビュー */}
                <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                        <span>巡回予定スケジュールキュー (全{patrolQueue.length}レース)</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        進捗: {patrolledCount}/{patrolQueue.length}完了 (重複防止: 有効)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-300 font-mono font-bold">
                        {(config.patrolOrder || 'deadline_asc') === 'deadline_asc'
                          ? '★ 〆切時刻 昇順ソート済'
                          : '会場順ソート'}
                      </span>
                      {onResetPatrolledHistory && patrolledCount > 0 && (
                        <button
                          type="button"
                          onClick={onResetPatrolledHistory}
                          className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold"
                          title="巡回履歴をクリアして全レースを最初から再巡回できるようにします"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>巡回履歴リセット</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
                    {patrolQueue.slice(0, 20).map((item, idx) => {
                      const isFirstUnvoted = !item.isVoted && patrolQueue.findIndex((q) => !q.isVoted) === idx;
                      return (
                        <div
                          key={item.key}
                          className={`shrink-0 px-2 py-1.5 rounded border flex flex-col items-center min-w-[80px] transition-colors ${
                            item.isVoted
                              ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-200'
                              : isFirstUnvoted
                              ? 'bg-amber-950/70 border-amber-500 text-amber-200 ring-1 ring-amber-400 shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="text-[9px] text-slate-400 font-sans">
                            {item.isVoted ? (
                              <span className="text-emerald-400 font-bold">✓ 巡回済</span>
                            ) : isFirstUnvoted ? (
                              <span className="text-amber-300 font-bold">★ 次回</span>
                            ) : (
                              `#${idx + 1}`
                            )}
                          </span>
                          <span className="font-bold text-slate-100 font-sans mt-0.5">
                            {item.venue} {item.raceNo}R
                          </span>
                          <span
                            className={`text-[10px] font-bold font-mono ${
                              item.isVoted ? 'text-emerald-300 line-through opacity-75' : 'text-amber-300'
                            }`}
                          >
                            {item.deadlineTime}
                          </span>
                          <span
                            className={`text-[8px] px-1 rounded mt-0.5 font-sans ${
                              item.category === 'モーニング'
                                ? 'bg-yellow-950 text-yellow-300'
                                : item.category === 'ナイター'
                                ? 'bg-indigo-950 text-indigo-300'
                                : 'bg-blue-950 text-blue-300'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                      );
                    })}
                    {patrolQueue.length > 20 && (
                      <div className="shrink-0 px-2.5 py-1.5 rounded border border-dashed border-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-sans">
                        ほか {patrolQueue.length - 20}R
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. テレボート自動投票 & AI予想連携 */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>投票連携 & AI連携</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 自動投票ON/OFF */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div>
                      <div className="font-bold text-slate-200">テレボート自動投票連動</div>
                      <div className="text-[10px] text-slate-400">予想・配分計算後に自動で投票を実行</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.executeAutoVote}
                        onChange={(e) => onUpdateConfig({ executeAutoVote: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* テスト投票モード */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800">
                    <div>
                      <div className="font-bold text-slate-200">テスト投票 (シミュレーション)</div>
                      <div className="text-[10px] text-slate-400">実際の残高を引かずに安全にテスト実行</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.testMode}
                        onChange={(e) => onUpdateConfig({ testMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* テレボート口座連動状態バナー */}
                  {config.executeAutoVote && (
                    <div
                      className={`p-3 rounded border text-xs sm:col-span-2 ${
                        teleboatConfig?.connectionStatus === 'CONNECTED'
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                          : !config.testMode
                          ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              <span>テレボート口座連動:</span>
                              {teleboatConfig?.connectionStatus === 'CONNECTED' ? (
                                <span className="text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500 text-[11px]">
                                  連動中 (加入者: {teleboatConfig.teleboatAccount?.subscriberNo || '8桁連動'})
                                </span>
                              ) : (
                                <span className="text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-600 text-[11px]">
                                  未連動 {config.testMode ? '(テストモード実行可)' : '(実投票には連動必須)'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>
                                購入限度額（実残高）:{' '}
                                <span className="font-mono font-bold text-amber-300">
                                  ¥{(teleboatConfig?.accountBalance ?? 0).toLocaleString()}
                                </span>
                              </span>
                              {onOpenBalanceSync && (
                                <button
                                  type="button"
                                  onClick={onOpenBalanceSync}
                                  className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/60 text-[10px] font-bold cursor-pointer transition-colors"
                                  title="テレボート購入限度額を入力・照合"
                                >
                                  限度額同期
                                </button>
                              )}
                              {teleboatConfig?.accountHolderName && (
                                <span className="text-slate-400">名義: {teleboatConfig.accountHolderName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {onOpenAutoVoteModal && (
                          <button
                            type="button"
                            onClick={onOpenAutoVoteModal}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-600 text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                            <span>テレボート口座連動設定</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI深層予想連携 */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded border border-slate-800 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="font-bold text-slate-200">Gemini AI深層展開分析を自動運転に適用</div>
                        <div className="text-[10px] text-slate-400">各レースごとにLLMモデルでモーター気配と展開を多角的分析して買い目を最適化</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.useAIEnhanced}
                        onChange={(e) => onUpdateConfig({ useAIEnhanced: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. セーフティ安全装置リミット設定 */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>セーフティ停止リミット (安全装置)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">目標純利益で自動停止:</label>
                    <div className="relative">
                      <input
                        type="number"
                        step={1000}
                        value={config.dailyProfitTarget}
                        onChange={(e) => onUpdateConfig({ dailyProfitTarget: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono font-bold text-xs pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-slate-500 text-[10px]">円</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">許容損失上限で自動停止:</label>
                    <div className="relative">
                      <input
                        type="number"
                        step={1000}
                        value={config.dailyLossLimit}
                        onChange={(e) => onUpdateConfig({ dailyLossLimit: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-rose-400 font-mono font-bold text-xs pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-slate-500 text-[10px]">円</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">連続不的中リミット:</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={config.maxConsecutiveLosses}
                        onChange={(e) => onUpdateConfig({ maxConsecutiveLosses: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-amber-300 font-mono font-bold text-xs pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-slate-500 text-[10px]">連敗</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-slate-400 font-bold">自動運転イベント実行履歴</span>
                <button
                  onClick={onClearLogs}
                  className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer underline"
                >
                  ログ消去
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-950 rounded border border-slate-800">
                  <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p>まだ自動運転ログがありません。「全自動運転 START」で開始されます。</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 font-sans">
                      <tr>
                        <th className="p-2 w-24">時刻</th>
                        <th className="p-2 w-24">会場・R</th>
                        <th className="p-2 w-16">種別</th>
                        <th className="p-2">内容・メッセージ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-900/60">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-850">
                          <td className="p-2 text-slate-400">{log.timestamp}</td>
                          <td className="p-2 text-slate-300 font-sans">
                            {log.venue} {log.raceNo ? `${log.raceNo}R` : ''}
                          </td>
                          <td className="p-2">{logTypeBadge(log.type)}</td>
                          <td className="p-2 text-slate-200 font-sans">
                            <div>{log.message}</div>
                            {log.details && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.details}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-3 bg-slate-950 p-4 rounded border border-slate-800 text-xs leading-relaxed text-slate-300 font-sans">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span>全自動運転フェイルセーフ（安全規程アーキテクチャ）</span>
              </div>
              <p>
                Kyotei Analyzer Pro 5 の自動運転エンジンは、資金消失を防ぎ堅実な利益確定を実現するために、以下の安全規程が多重レイヤーで自動作動します。
              </p>

              <div className="space-y-2 mt-2">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="font-bold text-amber-300 block mb-0.5">1. 気象警報による自動見送り (SKIP)</span>
                  <p className="text-[11px] text-slate-400">
                    風速が設定値（既定 5.0m/s）以上、または波高（既定 5cm）以上の水面荒れ時は、投票を行わず自動見送り（SKIP）判定を下し、無駄な資金投下を回避して次レースへ待機・移行します。
                  </p>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="font-bold text-emerald-300 block mb-0.5">2. 目標利益到達による勝ち逃げ自動停止 (STOP)</span>
                  <p className="text-[11px] text-slate-400">
                    当日の純利益が目標額（例: +30,000円）に到達した瞬間に全自動運転を停止し、利益を確保します。
                  </p>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="font-bold text-rose-300 block mb-0.5">3. 許容損失リミットによる損切り自動停止 (STOP)</span>
                  <p className="text-[11px] text-slate-400">
                    当日の損失額が上限（例: -20,000円）に到達した場合、元本を保護するために即座に全自動運転を停止します。
                  </p>
                </div>

                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <span className="font-bold text-purple-300 block mb-0.5">4. 連続不的中防止リミット (連敗ストッパー)</span>
                  <p className="text-[11px] text-slate-400">
                    設定回数（例: 4連続）外れが発生した場合、水面相場の急激な変化に対応するため一時停止し、ユーザーに手動確認を促します。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoPilot}
              className={`flex items-center gap-1.5 px-4 py-2 rounded font-black text-xs transition-all shadow-md cursor-pointer ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>自動運転を今すぐ停止 (STOP)</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>全自動運転を開始 (START)</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-xs cursor-pointer transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
