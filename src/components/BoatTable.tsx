import React from 'react';
import { BoatData, ScoredBoat, BoatGrade } from '../types/kyotei';
import { BOAT_COLORS } from '../constants/venues';
import { Award, Zap } from 'lucide-react';

interface BoatTableProps {
  boats: BoatData[];
  scoredBoats: ScoredBoat[];
  onUpdateBoat: (boatNumber: number, fields: Partial<BoatData>) => void;
  onQuickSimulateExhibition: () => void;
}

export const BoatTable: React.FC<BoatTableProps> = ({
  boats,
  scoredBoats,
  onUpdateBoat,
  onQuickSimulateExhibition,
}) => {
  const scoredMap = new Map<number, ScoredBoat>();
  scoredBoats.forEach((sb) => scoredMap.set(sb.boatNumber, sb));

  const grades: BoatGrade[] = ['A1', 'A2', 'B1', 'B2'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 select-none">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-xs">出走表データ（1〜6号艇）</span>
          <span className="text-[11px] text-slate-400">※勝率・モーター・展示・進入コースを直接編集可能</span>
        </div>
        <button
          onClick={onQuickSimulateExhibition}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
          title="展示タイムを自動補正・ランダム更新"
        >
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>展示タイム一括更新</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
              <th className="py-1 px-1.5 w-12 text-center">艇番</th>
              <th className="py-1 px-2">選手名</th>
              <th className="py-1 px-1.5 w-14 text-center">級別</th>
              <th className="py-1 px-1.5 w-14 text-center">進入</th>
              <th className="py-1 px-2 text-right">勝率(%)</th>
              <th className="py-1 px-2 text-right">2連対率(%)</th>
              <th className="py-1 px-2 text-right">モータ2連(%)</th>
              <th className="py-1 px-2 text-right">ボート2連(%)</th>
              <th className="py-1 px-2 text-right">展示タイム</th>
              <th className="py-1 px-2 text-center w-16 bg-blue-950/30 text-blue-300">評価指数</th>
              <th className="py-1 px-1.5 text-center w-12 bg-amber-950/30 text-amber-300">順位</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {boats.map((boat) => {
              const color = BOAT_COLORS[boat.boatNumber];
              const scored = scoredMap.get(boat.boatNumber);
              const rank = scored?.rank || boat.boatNumber;
              const isAxis = rank === 1;

              return (
                <tr
                  key={boat.boatNumber}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isAxis ? 'bg-blue-950/20' : ''
                  }`}
                >
                  {/* 艇番公式バッジ */}
                  <td className="py-1 px-1.5 text-center">
                    <div
                      className={`w-6 h-6 mx-auto rounded flex items-center justify-center border text-xs font-black shadow-sm ${color.bg} ${color.text} ${color.border}`}
                    >
                      {boat.boatNumber}
                    </div>
                  </td>

                  {/* 選手名 & 支部 */}
                  <td className="py-1 px-2 font-sans font-medium text-slate-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={boat.name}
                        onChange={(e) => onUpdateBoat(boat.boatNumber, { name: e.target.value })}
                        className="bg-transparent text-slate-100 font-semibold focus:outline-none focus:border-b focus:border-blue-500 w-24 text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({boat.branch || '支部'})
                      </span>
                    </div>
                  </td>

                  {/* 級別 */}
                  <td className="py-1 px-1.5 text-center font-sans">
                    <select
                      value={boat.grade}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { grade: e.target.value as BoatGrade })}
                      className={`text-[10px] font-bold rounded px-1 py-0.5 bg-slate-950 border border-slate-700 ${
                        boat.grade === 'A1'
                          ? 'text-yellow-400'
                          : boat.grade === 'A2'
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {grades.map((g) => (
                        <option key={g} value={g} className="bg-slate-900 text-white">
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 進入コース */}
                  <td className="py-1 px-1.5 text-center">
                    <select
                      value={boat.course}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { course: parseInt(e.target.value) as any })}
                      className="bg-slate-950 text-slate-200 border border-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6].map((c) => (
                        <option key={c} value={c} className="bg-slate-900 text-white">
                          {c}コ
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 勝率 */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={boat.winRate}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { winRate: parseFloat(e.target.value) || 0 })}
                      className="w-14 bg-transparent text-right text-slate-200 focus:outline-none focus:border-b focus:border-blue-500 tabular-nums font-semibold"
                    />
                  </td>

                  {/* 2連対率 */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={boat.secondRate}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { secondRate: parseFloat(e.target.value) || 0 })}
                      className="w-14 bg-transparent text-right text-slate-200 focus:outline-none focus:border-b focus:border-blue-500 tabular-nums"
                    />
                  </td>

                  {/* モーター2連対率 */}
                  <td className="py-1 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-400">#{boat.motorNumber}</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={boat.motorSecondRate}
                        onChange={(e) => onUpdateBoat(boat.boatNumber, { motorSecondRate: parseFloat(e.target.value) || 0 })}
                        className="w-12 bg-transparent text-right text-slate-200 focus:outline-none focus:border-b focus:border-blue-500 tabular-nums"
                      />
                    </div>
                  </td>

                  {/* ボート2連対率 */}
                  <td className="py-1 px-2 text-right text-slate-400">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={boat.boatSecondRate}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { boatSecondRate: parseFloat(e.target.value) || 0 })}
                      className="w-12 bg-transparent text-right text-slate-400 focus:outline-none focus:border-b focus:border-blue-500 tabular-nums text-xs"
                    />
                  </td>

                  {/* 展示タイム */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="5.0"
                      max="8.5"
                      value={boat.exhibitionTime}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { exhibitionTime: parseFloat(e.target.value) || 0 })}
                      className="w-14 bg-transparent text-right text-amber-300 font-bold focus:outline-none focus:border-b focus:border-amber-400 tabular-nums"
                    />
                  </td>

                  {/* 評価指数 */}
                  <td className="py-1 px-2 text-center bg-blue-950/20 text-blue-300 font-bold tabular-nums">
                    {scored?.rawScore ?? '-'}
                  </td>

                  {/* 順位 */}
                  <td className="py-1 px-1.5 text-center bg-amber-950/20">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-black ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {rank}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
