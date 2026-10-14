import React from 'react';
import { BetCandidate, BetType, BET_TYPE_LABELS, LineComposition } from '../types/kyotei';
import { BOAT_COLORS } from '../constants/venues';
import {
  Play,
  Calculator,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  Zap,
  Sparkles,
  Ticket,
  Hash,
  Send,
  Flag,
} from 'lucide-react';

interface PredictionSectionProps {
  candidates: BetCandidate[];
  currentBetType: BetType;
  pointCount: number;
  lines?: LineComposition[]; // 競輪ライン並び予想
  onChangeBetType: (type: BetType) => void;
  onChangePointCount: (points: number) => void;
  onUpdateOdds: (combination: string, odds: number) => void;
  onRunPrediction: () => void;
  onRunAIPrediction?: () => void;
  isAILoading?: boolean;
  onSimulateOdds: () => void;
  onCalculateAllocation: () => void;
  onOpenResultModal: () => void;
  onAutoFetchResult?: () => void;
  onOpenAutoVote?: () => void;
  onOpenRealVoteModal?: () => void;
  isAutoVoteEnabled?: boolean;
  isSkipped: boolean;
  isStopped: boolean;
  minOdds: number;
  maxOdds: number;
}

export const PredictionSection: React.FC<PredictionSectionProps> = ({
  candidates,
  currentBetType = '3t',
  pointCount = 6,
  lines,
  onChangeBetType,
  onChangePointCount,
  onUpdateOdds,
  onRunPrediction,
  onRunAIPrediction,
  isAILoading = false,
  onSimulateOdds,
  onCalculateAllocation,
  onOpenResultModal,
  onAutoFetchResult,
  onOpenAutoVote,
  onOpenRealVoteModal,
  isAutoVoteEnabled = false,
  isSkipped,
  isStopped,
  minOdds,
  maxOdds,
}) => {
  const renderBoatBadge = (num: number) => {
    if (!num || num <= 0) return null;
    const color = BOAT_COLORS[num] || BOAT_COLORS[1];
    return (
      <span
        key={num}
        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-black border shadow-xs ${color.bg} ${color.text} ${color.border}`}
      >
        {num}
      </span>
    );
  };

  const totalStake = candidates.reduce((sum, c) => sum + (c.stake || 0), 0);
  const hasBets = candidates.length > 0;

  const betTypeOptions: BetType[] = ['3t', '3f', '2t', '2f', '1t', 'wide'];
  const maxAllowedPoints = BET_TYPE_LABELS[currentBetType]?.maxPoints ?? 18;
  const pointOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 18].filter((p) => p <= maxAllowedPoints);
  const activeLabel = BET_TYPE_LABELS[currentBetType]?.label || '3連単';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-3 select-none space-y-2.5">
      {/* 0. 競輪ライン並び展開図バー */}
      {lines && lines.length > 0 && (
        <div className="bg-slate-950 p-2.5 rounded border border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span>ライン並び予想 (展開図)</span>
            </div>
            <span className="text-[10px] text-slate-400">
              ※先頭(自力) ← 番手 ← 3番手の隊列構成
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lines.map((line, idx) => (
              <div
                key={line.group}
                className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800"
              >
                <span className="text-[10px] font-bold text-cyan-300 mr-0.5">
                  {line.label}:
                </span>
                <div className="flex items-center gap-1">
                  {line.racers.map((carNo, rIdx) => (
                    <React.Fragment key={carNo}>
                      {rIdx > 0 && <span className="text-slate-600 font-mono text-xs">-</span>}
                      {renderBoatBadge(carNo)}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 ml-1">
                  {line.tactics}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. 車券種別・点数 選択コントロールバー */}
      <div className="bg-slate-950 p-2 rounded border border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        {/* 車券種別選択 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 mr-1">
            <Ticket className="w-3.5 h-3.5 text-blue-400" />
            <span>車券種別:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            {betTypeOptions.map((type) => {
              const info = BET_TYPE_LABELS[type];
              const isSelected = currentBetType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChangeBetType(type)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={info?.desc}
                >
                  {info?.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 点数選択 */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <Hash className="w-3.5 h-3.5 text-amber-400" />
            <span>点数:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            {pointOptions.map((pts) => {
              const isSelected = pointCount === pts;
              return (
                <button
                  key={pts}
                  type="button"
                  onClick={() => onChangePointCount(pts)}
                  className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {pts}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. アクションボタンバー */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {/* AI予想ボタン */}
          {onRunAIPrediction && (
            <button
              onClick={onRunAIPrediction}
              disabled={isAILoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-600 hover:from-purple-600 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded shadow-md transition-all cursor-pointer hover:scale-[1.02]"
              title="Gemini 3.8 Flash 搭載 競輪AI予想 (ライン展開・深層分析)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current animate-pulse" />
              <span>{isAILoading ? 'AI予想分析中...' : '競輪AI予想実行'}</span>
            </button>
          )}

          {/* 予想実行ボタン */}
          <button
            onClick={onRunPrediction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
            title="ライン展開・競走得点・バンク周長から推奨買い目を生成"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>買い目生成 ({activeLabel} {pointCount}点)</span>
          </button>

          {/* オッズ再取得 */}
          <button
            onClick={onSimulateOdds}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded border border-slate-700 transition-colors cursor-pointer"
            title="最新オッズをシミュレーション更新"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>オッズ同期</span>
          </button>

          {/* 資金配分計算 */}
          <button
            onClick={onCalculateAllocation}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
            title="設定に基づき目標払戻・オッズ均等配分を計算"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>資金配分</span>
          </button>
        </div>

        {/* 投票 & 結果ボタン */}
        <div className="flex items-center gap-2">
          {onOpenRealVoteModal && (
            <button
              onClick={onOpenRealVoteModal}
              disabled={!hasBets || isSkipped || isStopped}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:hover:from-emerald-600 text-white text-xs font-bold rounded shadow cursor-pointer transition-all hover:scale-[1.02]"
              title="競輪公式 (KEIRIN.JP / Winticket) へ買い目を送出"
            >
              <Send className="w-3.5 h-3.5" />
              <span>競輪投票へ送出</span>
            </button>
          )}

          {onOpenAutoVote && (
            <button
              onClick={onOpenAutoVote}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer border ${
                isAutoVoteEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>{isAutoVoteEnabled ? '自動投票[ON]' : '自動投票設定'}</span>
            </button>
          )}

          <button
            onClick={onOpenResultModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded shadow transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>着順入力・結果判定</span>
          </button>
        </div>
      </div>

      {/* 3. 買い目テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
              <th className="py-1 px-2 w-10 text-center">推奨</th>
              <th className="py-1 px-2">買い目 (車番)</th>
              <th className="py-1 px-2 text-center w-24">スジ判定</th>
              <th className="py-1 px-2 text-right w-20">オッズ</th>
              <th className="py-1 px-2 text-right w-24">配分金額</th>
              <th className="py-1 px-2 text-right w-24">想定払戻</th>
              <th className="py-1 px-2 text-right w-20">期待値(EV)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {candidates.map((c) => {
              const isOddsExcluded = c.odds < minOdds || c.odds > maxOdds;
              const parts = c.combination.split(/[-=]/).map((numStr) => parseInt(numStr, 10));

              return (
                <tr
                  key={c.combination}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isOddsExcluded ? 'opacity-40 bg-rose-950/10' : ''
                  }`}
                >
                  <td className="py-1 px-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold ${
                        c.rank === 1
                          ? 'bg-amber-500 text-slate-950'
                          : c.rank <= 3
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.rank}
                    </span>
                  </td>

                  {/* 買い目車番バッジ表示 */}
                  <td className="py-1 px-2">
                    <div className="flex items-center gap-1 font-bold">
                      {parts.map((p, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && (
                            <span className="text-slate-500 font-mono text-xs">
                              {c.combination.includes('=') ? '=' : '-'}
                            </span>
                          )}
                          {renderBoatBadge(p)}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>

                  {/* スジ判定バッジ */}
                  <td className="py-1 px-2 text-center font-sans">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        c.sujiType === 'スジ (本線)'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                          : c.sujiType === 'スジ (ズブズブ)'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600'
                          : c.sujiType === '中穴捲り'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-600'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {c.sujiType || (c.isLineSuji ? 'スジ' : '別線')}
                    </span>
                  </td>

                  {/* オッズ */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={c.odds}
                      onChange={(e) =>
                        onUpdateOdds(c.combination, parseFloat(e.target.value) || 1.0)
                      }
                      className={`bg-transparent text-right font-bold focus:outline-none focus:border-b focus:border-blue-500 w-16 ${
                        isOddsExcluded ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    />
                  </td>

                  {/* 配分金額 */}
                  <td className="py-1 px-2 text-right text-slate-100 font-bold">
                    ¥{c.stake.toLocaleString()}
                  </td>

                  {/* 想定払戻 */}
                  <td className="py-1 px-2 text-right text-emerald-400 font-bold">
                    ¥{c.expectedReturn.toLocaleString()}
                  </td>

                  {/* 期待値 */}
                  <td className="py-1 px-2 text-right text-slate-300">
                    <span
                      className={
                        c.expectedValue >= 1.5
                          ? 'text-emerald-400 font-bold'
                          : c.expectedValue >= 1.0
                          ? 'text-cyan-300'
                          : 'text-slate-400'
                      }
                    >
                      {c.expectedValue.toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* フッター合計金額表示 */}
      {hasBets && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            {activeLabel} {candidates.length}点 (スジ車券重点分析)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-300">
              合計投票額:{' '}
              <strong className="text-white font-mono font-bold text-sm">
                ¥{totalStake.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
