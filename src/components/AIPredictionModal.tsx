import React from 'react';
import {
  Sparkles,
  Bot,
  Flame,
  CheckCircle2,
  TrendingUp,
  Wind,
  ShieldCheck,
  Send,
  Zap,
  Target,
  ArrowRight,
  Info,
} from 'lucide-react';
import { RaceInfo } from '../types/kyotei';
import { AIPredictionResult } from '../services/aiPredictionService';
import { BOAT_COLORS } from '../constants/venues';

interface AIPredictionModalProps {
  race: RaceInfo;
  aiResult: AIPredictionResult | null;
  isLoading: boolean;
  onApplyAICandidates: () => void;
  onReGenerate: () => void;
  onClose: () => void;
}

export const AIPredictionModal: React.FC<AIPredictionModalProps> = ({
  race,
  aiResult,
  isLoading,
  onApplyAICandidates,
  onReGenerate,
  onClose,
}) => {
  const renderBoatBadge = (num: number) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-purple-500/50 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-indigo-200 to-pink-300">
                  Gemini 競艇AI特選予想 (AI Analysis Pro)
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 font-mono">
                  Gemini 3.8 Flash
                </span>
                {aiResult && (
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded font-black border ${
                      aiResult.confidenceLevel === 'S'
                        ? 'bg-rose-950 text-rose-300 border-rose-500'
                        : aiResult.confidenceLevel === 'A'
                        ? 'bg-amber-950 text-amber-300 border-amber-500'
                        : 'bg-blue-950 text-blue-300 border-blue-500'
                    }`}
                  >
                    自信度: {aiResult.confidenceLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-400 rounded-full animate-spin"></div>
              <div className="font-bold text-slate-200 text-sm">
                AIが展示タイム・水面コンディション・選手機力を深層分析中...
              </div>
              <div className="text-slate-400 text-xs">
                全国24場のコース進入傾向とモーター勝率から最適買い目を計算しています
              </div>
            </div>
          ) : !aiResult ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/60 rounded border border-dashed border-slate-800">
              AI予想データがありません。「AI予想を実行」をクリックしてください。
            </div>
          ) : (
            <>
              {/* ヘッドライン & 総合展開見解カード */}
              <div className="p-3.5 rounded-lg bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-800/70 shadow-lg space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-black text-sm">
                  <Flame className="w-4 h-4 text-amber-400 fill-current" />
                  <span>{aiResult.headline}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {aiResult.analysisOverview}
                </p>
                <div className="pt-2 border-t border-purple-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    <span>展開キー:</span>
                    <strong className="text-slate-200">{aiResult.tacticalKey}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                    <span>水面環境: {aiResult.weatherImpact}</span>
                  </div>
                </div>
              </div>

              {/* 注目艇ピックアップ (軸艇・対抗艇・穴艇) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* 軸艇 */}
                <div className="bg-slate-950 p-3 rounded border border-purple-900/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800">
                        ◎ 本命軸艇
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {aiResult.axisBoat.boatNumber}号艇
                      </span>
                    </div>
                    <div className="flex items-center gap-2 my-1">
                      {renderBoatBadge(aiResult.axisBoat.boatNumber)}
                      <span className="font-bold text-slate-100 text-xs">
                        {aiResult.axisBoat.racerName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-1">
                      {aiResult.axisBoat.reason}
                    </p>
                  </div>
                </div>

                {/* 対抗艇 */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800">
                        ○ 対抗艇
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {aiResult.rivalBoat.boatNumber}号艇
                      </span>
                    </div>
                    <div className="flex items-center gap-2 my-1">
                      {renderBoatBadge(aiResult.rivalBoat.boatNumber)}
                      <span className="font-bold text-slate-100 text-xs">
                        {aiResult.rivalBoat.racerName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-1">
                      {aiResult.rivalBoat.reason}
                    </p>
                  </div>
                </div>

                {/* 穴艇 */}
                <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                        ▲ 穴・連下
                      </span>
                      {aiResult.holeBoat && (
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {aiResult.holeBoat.boatNumber}号艇
                        </span>
                      )}
                    </div>
                    {aiResult.holeBoat ? (
                      <>
                        <div className="flex items-center gap-2 my-1">
                          {renderBoatBadge(aiResult.holeBoat.boatNumber)}
                          <span className="font-bold text-slate-100 text-xs">
                            {aiResult.holeBoat.racerName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug mt-1">
                          {aiResult.holeBoat.reason}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-2">
                        本命決着が濃厚なため穴艇指定なし
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI厳選 本命5点 買い目テーブル */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>AI選定 3連単 本命5点買い目 (資金配分連動)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    計 5点 / 合計 ¥
                    {aiResult.aiCandidates
                      .reduce((sum, c) => sum + (c.stake || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 px-3 w-12 text-center">推奨</th>
                        <th className="py-1.5 px-3">3連単 買い目</th>
                        <th className="py-1.5 px-3 text-right">AIスコア</th>
                        <th className="py-1.5 px-3 text-right">予測確率</th>
                        <th className="py-1.5 px-3 text-right">オッズ</th>
                        <th className="py-1.5 px-3 text-right text-emerald-400">推奨金額</th>
                        <th className="py-1.5 px-3 text-right">想定払戻</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {aiResult.aiCandidates.map((c, index) => (
                        <tr key={c.combination} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 text-center">
                            <span className="font-bold text-purple-300">#{index + 1}</span>
                          </td>
                          <td className="py-1.5 px-3 font-sans">
                            <div className="flex items-center gap-1">
                              {renderBoatBadge(c.first)}
                              <span className="text-slate-500 font-bold">-</span>
                              {renderBoatBadge(c.second)}
                              <span className="text-slate-500 font-bold">-</span>
                              {renderBoatBadge(c.third)}
                              <span className="ml-2 font-mono text-xs font-bold text-slate-100">
                                {c.combination}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-300">
                            {c.score} pt
                          </td>
                          <td className="py-1.5 px-3 text-right text-cyan-300">
                            {c.relativeProb}%
                          </td>
                          <td className="py-1.5 px-3 text-right text-amber-300 font-bold">
                            {c.odds.toFixed(1)}倍
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                            ¥{c.stake.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-200">
                            ¥{(c.expectedReturn || Math.floor(c.stake * c.odds)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onReGenerate}
              disabled={isLoading}
              className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI再分析</span>
            </button>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              気象・展示変動に合わせてリアルタイム再計算
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              閉じる
            </button>
            <button
              onClick={onApplyAICandidates}
              disabled={isLoading || !aiResult}
              className="px-4 py-1.5 rounded text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>このAI買い目をメイン画面に適用</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
