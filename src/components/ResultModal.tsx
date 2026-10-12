import React, { useState } from 'react';
import { BetCandidate, RaceInfo } from '../types/kyotei';
import { BOAT_COLORS } from '../constants/venues';
import { Award, CheckCircle, XCircle, ArrowRight, Zap, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { fetchRaceResult } from '../services/raceDataProvider';
import { checkRaceConfirmation } from '../services/deadlineService';
import { isBetHit } from '../services/betEvaluationHelper';

interface ResultModalProps {
  race: RaceInfo;
  candidates: BetCandidate[];
  onConfirmResult: (params: {
    finishOrder: string;
    officialPayout: number;
    isHit: boolean;
    hitCombination?: string;
    totalStake: number;
    totalReturn: number;
    profit: number;
  }) => void;
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  race,
  candidates,
  onConfirmResult,
  onClose,
}) => {
  const [first, setFirst] = useState<number>(1);
  const [second, setSecond] = useState<number>(2);
  const [third, setThird] = useState<number>(3);
  const [payoutInput, setPayoutInput] = useState<string>('1240');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoFetching, setIsAutoFetching] = useState<boolean>(false);

  // レースの公式確定チェック
  const confirmation = checkRaceConfirmation({
    date: race.date,
    deadlineTime: race.deadlineTime,
    venueName: race.venue,
    raceNo: race.raceNo,
  });
  const isRaceConfirmed = confirmation.isConfirmed;

  const finishOrder = `${first}-${second}-${third}`;
  const totalStake = candidates.reduce((sum, c) => sum + (c.stake || 0), 0);

  // 的中判定 (券種対応)
  const matchedCandidate = candidates.find(
    (c) => isBetHit(c.combination, c.betType || '3t', finishOrder) && c.stake > 0
  );
  const isHit = !!matchedCandidate;
  const officialPayout = parseInt(payoutInput, 10) || 0;

  // 払戻金計算: 購入金額 × (確定払戻 / 100)
  const totalReturn = isHit && matchedCandidate
    ? Math.floor((matchedCandidate.stake * officialPayout) / 100)
    : 0;

  const profit = totalReturn - totalStake;

  // 結果自動取得ハンドラ
  const handleAutoFetchInModal = async () => {
    setIsAutoFetching(true);
    setErrorMessage(null);
    try {
      const res = await fetchRaceResult({
        date: race.date,
        venueName: race.venue,
        raceNo: race.raceNo,
        boats: race.boats,
        deadlineTime: race.deadlineTime,
      });
      setFirst(res.first);
      setSecond(res.second);
      setThird(res.third);
      setPayoutInput(String(res.officialPayout));
    } catch (e: any) {
      setErrorMessage(e?.message || '結果の自動取得に失敗しました。');
    } finally {
      setIsAutoFetching(false);
    }
  };

  const handleRegister = () => {
    if (first === second || second === third || first === third) {
      setErrorMessage('1着・2着・3着は重複しない異なる艇を選択してください。');
      return;
    }
    if (officialPayout <= 0) {
      setErrorMessage('確定払戻金を入力してください。');
      return;
    }
    setErrorMessage(null);

    onConfirmResult({
      finishOrder,
      officialPayout,
      isHit,
      hitCombination: matchedCandidate?.combination,
      totalStake,
      totalReturn,
      profit,
    });
  };

  const renderBoatSelector = (
    label: string,
    currentValue: number,
    setValue: (v: number) => void
  ) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-bold text-slate-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((num) => {
          const color = BOAT_COLORS[num];
          const isSelected = currentValue === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => setValue(num)}
              className={`w-7 h-7 rounded text-xs font-black border transition-all ${
                color.bg
              } ${color.text} ${color.border} ${
                isSelected
                  ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 scale-110 shadow-md'
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-lg shadow-2xl p-4 select-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              レース結果入力・的中確定判定
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* レース情報 */}
        <div className="mt-2 text-xs text-slate-300 bg-slate-950 p-2 rounded flex justify-between">
          <span className="font-bold text-blue-400">{race.venue}</span>
          <span>{race.raceTitle}</span>
          <span className="font-mono text-slate-400">{race.date}</span>
        </div>

        {/* レース未確定警告バナー */}
        {!isRaceConfirmed && (
          <div className="mt-2.5 p-2.5 bg-amber-950/70 border border-amber-600/70 rounded text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <span>【公式結果 未確定】現在「{confirmation.statusText}」です</span>
              </div>
              <div className="text-[11px] text-amber-300/80">
                {confirmation.detail} 公式確定前のため、自動取得および的中判定は保留されます。
              </div>
            </div>
          </div>
        )}

        {/* 公式結果ワンクリック自動取得ボタン */}
        <div className="mt-2.5 p-2 bg-blue-950/40 border border-blue-700/60 rounded flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-200 text-xs">
            <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span>公式確定データをワンクリックで取得できます</span>
          </div>
          <button
            type="button"
            onClick={handleAutoFetchInModal}
            disabled={isAutoFetching}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-black text-xs shadow transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="公式確定着順と払戻金を自動同期"
          >
            {isAutoFetching ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>取得中...</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 fill-current" />
                <span>公式結果を自動取得</span>
              </>
            )}
          </button>
        </div>

        {/* 着順選択 */}
        <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
          {renderBoatSelector('1着', first, setFirst)}
          {renderBoatSelector('2着', second, setSecond)}
          {renderBoatSelector('3着', third, setThird)}
        </div>

        {/* 確定払戻金入力 */}
        <div className="mt-4 flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
          <div className="text-xs">
            <div className="text-slate-300 font-bold">3連単 確定払戻金</div>
            <div className="text-[10px] text-slate-500">100円あたりの払戻金額</div>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="10"
              min="100"
              value={payoutInput}
              onChange={(e) => setPayoutInput(e.target.value)}
              className="w-28 bg-slate-900 border border-slate-700 text-right font-mono font-bold text-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-400 tabular-nums"
              placeholder="1240"
            />
            <span className="text-slate-300 text-xs font-bold">円</span>
          </div>
        </div>

        {/* リアルタイム結果プレビュー */}
        <div className="mt-4 p-3 rounded border text-xs flex items-center justify-between bg-slate-950/70 border-slate-800">
          <div className="flex items-center gap-2">
            {!isRaceConfirmed ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>【未確定プレビュー】</span>
              </div>
            ) : isHit ? (
              <div className="flex items-center gap-1.5 text-yellow-300 font-black text-sm">
                <CheckCircle className="w-5 h-5 text-yellow-400" />
                <span>【的中！】</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-sm">
                <XCircle className="w-5 h-5 text-slate-500" />
                <span>【不的中】</span>
              </div>
            )}
            <span className="font-mono font-bold text-slate-200 text-sm">
              選択着順: {finishOrder}
            </span>
          </div>

          <div className="text-right font-mono">
            {isRaceConfirmed ? (
              <>
                <div className="text-[11px] text-slate-400">
                  投資: {totalStake.toLocaleString()}円 → 払戻: {totalReturn.toLocaleString()}円
                </div>
                <div
                  className={`font-black text-sm tabular-nums ${
                    profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  損益: {profit > 0 ? `+${profit.toLocaleString()}` : profit.toLocaleString()} 円
                </div>
              </>
            ) : (
              <div className="text-[11px] text-amber-300/80">
                公式レース確定後に的中・収支が確定します
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mt-2 p-2 rounded bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* ボタン */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleRegister}
            className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1"
          >
            <span>確定登録・収支反映</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
