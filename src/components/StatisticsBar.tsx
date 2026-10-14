import React, { useState } from 'react';
import { DayStatistics, RaceHistoryRecord, VenueStatistics } from '../types/kyotei';
import {
  TrendingUp,
  Award,
  DollarSign,
  History,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Trash2,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { RaceTrendChart } from './RaceTrendChart';
import { VenueStatisticsPanel } from './VenueStatisticsPanel';

interface StatisticsBarProps {
  stats: DayStatistics;
  venueStats: VenueStatistics[];
  history: RaceHistoryRecord[];
  dailyProfitTarget: number;
  dailyLossLimit: number;
  onOpenHistory: () => void;
  onClearHistory?: () => void;
  onImportRealData?: () => void;
  selectedVenueFilter?: string | null;
  onSelectVenueFilter?: (venue: string | null) => void;
}

export const StatisticsBar: React.FC<StatisticsBarProps> = ({
  stats,
  venueStats,
  history,
  dailyProfitTarget,
  dailyLossLimit,
  onOpenHistory,
  onClearHistory,
  onImportRealData,
  selectedVenueFilter,
  onSelectVenueFilter,
}) => {
  const isProfit = stats.netProfit > 0;
  const isLoss = stats.netProfit < 0;

  // チャート・会場別収支の開閉ステート
  const [showChart, setShowChart] = useState<boolean>(false);
  const [showVenueStats, setShowVenueStats] = useState<boolean>(true);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded p-2.5 flex flex-col gap-2.5 text-xs select-none shadow-sm transition-all">
      {/* 1. 収支指標群 & 操作バー */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 収支指標群 */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6 font-mono">
          {/* 総投資額 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">総投資額</span>
            <span className="text-slate-200 font-bold text-sm tabular-nums">
              {stats.totalStake.toLocaleString()}
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">円</span>
            </span>
          </div>

          {/* 総払戻額 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">総払戻額</span>
            <span className="text-amber-300 font-bold text-sm tabular-nums">
              {stats.totalReturn.toLocaleString()}
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">円</span>
            </span>
          </div>

          {/* 当日純利益 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">純利益 (損益)</span>
            <span
              className={`font-black text-base tabular-nums ${
                isProfit
                  ? 'text-emerald-400'
                  : isLoss
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {isProfit ? `+${stats.netProfit.toLocaleString()}` : stats.netProfit.toLocaleString()}
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">円</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* 的中率 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">的中率</span>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-200 font-bold text-sm tabular-nums">
                {stats.hitRate}%
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({stats.hitCount}/{stats.betCount})
              </span>
            </div>
          </div>

          {/* 回収率 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">回収率</span>
            <span
              className={`font-bold text-sm tabular-nums ${
                stats.recoveryRate >= 100
                  ? 'text-emerald-400'
                  : stats.recoveryRate >= 75
                  ? 'text-yellow-400'
                  : 'text-slate-300'
              }`}
            >
              {stats.recoveryRate}%
            </span>
          </div>

          {/* 見送り率 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-sans">見送り</span>
            <span className="text-amber-400 font-bold text-sm tabular-nums">
              {stats.skipCount} <span className="text-[10px] text-slate-400 font-normal">({stats.skipRate}%)</span>
            </span>
          </div>
        </div>

        {/* コントロールボタングループ */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 会場別収支トグルボタン */}
          <button
            onClick={() => setShowVenueStats(!showVenueStats)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-bold text-xs border transition-colors cursor-pointer ${
              showVenueStats
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="各会場ごとの的中率・回収率・損益パネルを開閉"
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>会場別収支 ({venueStats.length}場)</span>
            {showVenueStats ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* チャートトグルボタン */}
          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-bold text-xs border transition-colors cursor-pointer ${
              showChart
                ? 'bg-blue-950/60 text-blue-300 border-blue-700'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="直近10走の回収率・純利益推移チャートを開閉"
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            <span>10走グラフ</span>
            {showChart ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* 実データ一括インポートボタン */}
          {onImportRealData && (
            <button
              onClick={onImportRealData}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-bold text-xs transition-colors shadow-xs cursor-pointer"
              title="公式確定実データ（全国43競輪場・過去実績）を一括インポート"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">実データ</span>読込
            </button>
          )}

          <div className="hidden xl:flex flex-col text-[10px] text-slate-400 text-right">
            <div>
              目標利益: <span className="text-emerald-400 font-mono">+{dailyProfitTarget.toLocaleString()}円</span>
            </div>
            <div>
              損失上限: <span className="text-rose-400 font-mono">-{dailyLossLimit.toLocaleString()}円</span>
            </div>
          </div>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>履歴一覧</span>
            <span className="px-1.5 py-0.2 bg-slate-900 rounded-full text-[10px] text-slate-300 font-mono">
              {stats.totalRaces}
            </span>
          </button>

          {onClearHistory && history.length > 0 && (
            <>
              {!showConfirmClear ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(true)}
                  className="flex items-center gap-1 px-2 py-1.5 bg-slate-900 hover:bg-rose-950/80 text-rose-300 border border-slate-800 hover:border-rose-700 rounded font-medium text-xs transition-colors cursor-pointer"
                  title="すべての履歴・収支集計を全消去"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>全消去</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-rose-950 border border-rose-600 rounded px-2 py-1 text-xs animate-in fade-in">
                  <span className="text-rose-200 font-bold text-[10px]">削除？</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setShowConfirmClear(false);
                    }}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded text-[11px] cursor-pointer"
                  >
                    削除
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(false)}
                    className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    戻る
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. 各会場ごとの的中率・回収率・損益パネル */}
      {showVenueStats && (
        <div className="pt-2 border-t border-slate-900 animate-in fade-in duration-200">
          <VenueStatisticsPanel
            venueStats={venueStats}
            selectedVenueFilter={selectedVenueFilter}
            onSelectVenueFilter={onSelectVenueFilter}
            onImportRealData={onImportRealData}
            onClose={() => setShowVenueStats(false)}
          />
        </div>
      )}

      {/* 3. 直近10レース推移チャート（Recharts） */}
      {showChart && (
        <div className="pt-1 border-t border-slate-900 animate-in fade-in duration-200">
          <RaceTrendChart history={history} />
        </div>
      )}
    </div>
  );
};
