import React from 'react';
import { BoatData, ScoredBoat, RacerGrade, RunningStyle, LineRole } from '../types/kyotei';
import { BOAT_COLORS } from '../constants/venues';
import { Award, Zap, Shield, Flag } from 'lucide-react';

interface BoatTableProps {
  boats: BoatData[];
  scoredBoats: ScoredBoat[];
  onUpdateBoat: (boatNumber: number, fields: Partial<BoatData>) => void;
  onQuickSimulateExhibition?: () => void;
}

export const BoatTable: React.FC<BoatTableProps> = ({
  boats,
  scoredBoats,
  onUpdateBoat,
  onQuickSimulateExhibition,
}) => {
  const scoredMap = new Map<number, ScoredBoat>();
  scoredBoats.forEach((sb) => scoredMap.set(sb.boatNumber, sb));

  const grades: RacerGrade[] = ['SS', 'S1', 'S2', 'A1', 'A2', 'A3', 'L1'];
  const styles: RunningStyle[] = ['逃', '捲', '追', '両'];
  const roles: LineRole[] = ['先頭', '番手', '3番手', '4番手', '単騎'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 select-none">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-xs">出走表データ（1〜{boats.length}番車）</span>
          <span className="text-[11px] text-slate-400">※競走得点・脚質・ギヤ・ライン役割を直接編集・シミュレーション可能</span>
        </div>
        {onQuickSimulateExhibition && (
          <button
            onClick={onQuickSimulateExhibition}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
            title="直近調子・B数をランダム補正"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>直近調子を再計算</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
              <th className="py-1 px-1.5 w-12 text-center">車番</th>
              <th className="py-1 px-2">選手名 / 府県(期別)</th>
              <th className="py-1 px-1.5 w-14 text-center">級班</th>
              <th className="py-1 px-2 text-right">競走得点</th>
              <th className="py-1 px-1.5 w-12 text-center">脚質</th>
              <th className="py-1 px-1.5 text-center">ギヤ</th>
              <th className="py-1 px-2 text-right">勝率(%)</th>
              <th className="py-1 px-2 text-right">2連対率</th>
              <th className="py-1 px-1.5 text-center">B数</th>
              <th className="py-1 px-2 text-center">ライン並び</th>
              <th className="py-1 px-2 text-center w-16 bg-blue-950/30 text-blue-300">評価指数</th>
              <th className="py-1 px-1.5 text-center w-12 bg-amber-950/30 text-amber-300">順位</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {boats.map((boat) => {
              const color = BOAT_COLORS[boat.boatNumber] || BOAT_COLORS[1];
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
                  {/* 車番公式カラーバッジ (1白〜9紫) */}
                  <td className="py-1 px-1.5 text-center">
                    <div
                      className={`w-6 h-6 mx-auto rounded flex items-center justify-center border text-xs font-black shadow-sm ${color.bg} ${color.text} ${color.border}`}
                    >
                      {boat.boatNumber}
                    </div>
                  </td>

                  {/* 選手名 & 府県 (期別) */}
                  <td className="py-1 px-2 font-sans font-medium text-slate-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={boat.name}
                        onChange={(e) => onUpdateBoat(boat.boatNumber, { name: e.target.value })}
                        className="bg-transparent text-slate-100 font-semibold focus:outline-none focus:border-b focus:border-blue-500 w-24 text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({boat.branch} {boat.era ? `${boat.era}期` : ''})
                      </span>
                    </div>
                  </td>

                  {/* 級班 (SS, S1, S2, A1等) */}
                  <td className="py-1 px-1.5 text-center font-sans">
                    <select
                      value={boat.grade}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { grade: e.target.value as RacerGrade })}
                      className={`bg-slate-950 text-[10px] font-bold rounded px-1 py-0.5 border ${
                        boat.grade === 'SS'
                          ? 'border-amber-400 text-amber-300 bg-amber-950/40'
                          : boat.grade === 'S1'
                          ? 'border-rose-500 text-rose-300'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    >
                      {grades.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* 競走得点 (例: 118.50) */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={boat.score}
                      onChange={(e) =>
                        onUpdateBoat(boat.boatNumber, { score: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-transparent text-right text-emerald-400 font-bold focus:outline-none focus:border-b focus:border-blue-500 w-16"
                    />
                  </td>

                  {/* 脚質 (逃, 捲, 追, 両) */}
                  <td className="py-1 px-1.5 text-center font-sans">
                    <select
                      value={boat.style}
                      onChange={(e) => onUpdateBoat(boat.boatNumber, { style: e.target.value as RunningStyle })}
                      className="bg-slate-950 text-slate-200 text-[11px] font-bold rounded px-1 py-0.5 border border-slate-700"
                    >
                      {styles.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* ギヤ倍数 */}
                  <td className="py-1 px-1.5 text-center text-slate-300">
                    <input
                      type="number"
                      step="0.01"
                      value={boat.gear}
                      onChange={(e) =>
                        onUpdateBoat(boat.boatNumber, { gear: parseFloat(e.target.value) || 3.92 })
                      }
                      className="bg-transparent text-center text-slate-300 focus:outline-none focus:border-b focus:border-blue-500 w-12 text-[11px]"
                    />
                  </td>

                  {/* 勝率 (%) */}
                  <td className="py-1 px-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      value={boat.winRate}
                      onChange={(e) =>
                        onUpdateBoat(boat.boatNumber, { winRate: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-transparent text-right text-slate-200 focus:outline-none focus:border-b focus:border-blue-500 w-12"
                    />
                  </td>

                  {/* 2連対率 (%) */}
                  <td className="py-1 px-2 text-right text-slate-300">
                    <input
                      type="number"
                      step="0.1"
                      value={boat.secondRate}
                      onChange={(e) =>
                        onUpdateBoat(boat.boatNumber, { secondRate: parseFloat(e.target.value) || 0 })
                      }
                      className="bg-transparent text-right text-slate-300 focus:outline-none focus:border-b focus:border-blue-500 w-12"
                    />
                  </td>

                  {/* B (バック本数) */}
                  <td className="py-1 px-1.5 text-center">
                    <input
                      type="number"
                      value={boat.bCount}
                      onChange={(e) =>
                        onUpdateBoat(boat.boatNumber, { bCount: parseInt(e.target.value, 10) || 0 })
                      }
                      className={`bg-transparent text-center font-bold focus:outline-none focus:border-b focus:border-blue-500 w-8 ${
                        boat.bCount >= 10 ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                  </td>

                  {/* ライン並び・役割 */}
                  <td className="py-1 px-2 text-center font-sans">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        L{boat.lineGroup}
                      </span>
                      <select
                        value={boat.lineRole}
                        onChange={(e) =>
                          onUpdateBoat(boat.boatNumber, { lineRole: e.target.value as LineRole })
                        }
                        className="bg-slate-950 text-[10px] font-bold rounded px-1 py-0.5 border border-slate-700 text-cyan-300"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* 評価指数 */}
                  <td className="py-1 px-2 text-center bg-blue-950/20 font-bold text-cyan-300">
                    {scored?.rawScore || '--'}
                  </td>

                  {/* 順位 */}
                  <td className="py-1 px-1.5 text-center bg-amber-950/20">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        rank === 1
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
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
