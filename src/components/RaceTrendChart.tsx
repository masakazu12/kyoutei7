import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { RaceHistoryRecord } from '../types/kyotei';
import { TrendingUp, BarChart3, HelpCircle } from 'lucide-react';

interface RaceTrendChartProps {
  history: RaceHistoryRecord[];
}

export const RaceTrendChart: React.FC<RaceTrendChartProps> = ({ history }) => {
  const [viewMode, setViewMode] = useState<'cumulative' | 'perRace'>('cumulative');

  // 直近最大10レースを取得（古い順に並べ替えて時系列推移を作成）
  const last10 = [...history].slice(0, 10).reverse();

  let runningProfit = 0;
  let runningStake = 0;
  let runningReturn = 0;

  const chartData = last10.map((race, index) => {
    runningProfit += race.profit;
    runningStake += race.totalStake;
    runningReturn += race.totalReturn;
    const cumulativeRecoveryRate = runningStake > 0
      ? Number(((runningReturn / runningStake) * 100).toFixed(1))
      : 0;
    const perRaceRecoveryRate = race.totalStake > 0
      ? Number(((race.totalReturn / race.totalStake) * 100).toFixed(1))
      : 0;

    return {
      index: index + 1,
      raceLabel: `${race.venue}${race.raceNo}R`,
      fullTitle: `${race.venue} ${race.raceNo}R (${race.raceTitle})`,
      netProfit: viewMode === 'cumulative' ? runningProfit : race.profit,
      recoveryRate: viewMode === 'cumulative' ? cumulativeRecoveryRate : perRaceRecoveryRate,
      stake: race.totalStake,
      payout: race.totalReturn,
      status: race.status,
      isHit: race.isHit,
      finishOrder: race.finishOrder || '-',
    };
  });

  if (history.length === 0) {
    return (
      <div className="h-36 w-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded bg-slate-950/60 text-slate-500 text-xs px-4 text-center">
        <BarChart3 className="w-6 h-6 mb-1 text-slate-600" />
        <span className="font-medium text-slate-400">直近10走推移チャート（回収率・純利益）</span>
        <span className="text-[11px] text-slate-500 mt-0.5">
          レース結果を登録すると、ここに直近10レースの回収率推移（%）と純利益（円）のグラフが自動描画されます。
        </span>
      </div>
    );
  }

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 shadow-xl rounded p-2 text-xs text-slate-200 select-none">
          <div className="font-bold text-blue-300 border-b border-slate-800 pb-1 mb-1">
            #{data.index} {data.fullTitle}
          </div>
          <div className="space-y-0.5 font-mono text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">回収率:</span>
              <span
                className={`font-bold ${
                  data.recoveryRate >= 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {data.recoveryRate}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">
                {viewMode === 'cumulative' ? '累積純利益:' : 'レース純利益:'}
              </span>
              <span
                className={`font-bold ${
                  data.netProfit > 0
                    ? 'text-emerald-400'
                    : data.netProfit < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {data.netProfit > 0 ? `+${data.netProfit.toLocaleString()}` : data.netProfit.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>投資 / 払戻:</span>
              <span>{data.stake.toLocaleString()}円 / {data.payout.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-500">着順判定:</span>
              <span className={data.isHit ? 'text-yellow-400 font-bold' : 'text-slate-400'}>
                {data.isHit ? '★的中' : data.status === 'Skip' ? '見送り' : '不的中'} ({data.finishOrder})
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded p-2 flex flex-col gap-1 select-none">
      {/* チャート上部コントロール */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-300">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px]">直近{chartData.length}走 パフォーマンス推移</span>
          <span className="text-[10px] text-slate-500 font-mono">
            (回収率[%] & 純利益[円])
          </span>
        </div>

        {/* 累積 / 各走切り替えボタン */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              viewMode === 'cumulative'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            累積推移
          </button>
          <button
            onClick={() => setViewMode('perRace')}
            className={`px-2 py-0.5 rounded font-medium transition-colors ${
              viewMode === 'perRace'
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            各走単体
          </button>
        </div>
      </div>

      {/* Recharts グラフ本体 */}
      <div className="h-32 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 28, left: 10, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="raceLabel"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              stroke="#334155"
              tickLine={false}
            />
            {/* 左Y軸: 純利益 (円) */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fill: '#38bdf8', fontSize: 10 }}
              stroke="#0284c7"
              tickFormatter={(v) => `${v.toLocaleString()}円`}
              width={55}
            />
            {/* 右Y軸: 回収率 (%) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#f59e0b', fontSize: 10 }}
              stroke="#d97706"
              tickFormatter={(v) => `${v}%`}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 損益ゼロライン */}
            <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeDasharray="2 2" />
            {/* 回収率100%基準ライン */}
            <ReferenceLine
              yAxisId="right"
              y={100}
              stroke="#eab308"
              strokeDasharray="3 3"
              label={{
                value: '100%',
                fill: '#eab308',
                fontSize: 9,
                position: 'insideRight',
              }}
            />
            {/* 純利益 (Bar or Area/Line) */}
            <Bar
              yAxisId="left"
              dataKey="netProfit"
              name="純利益(円)"
              fill="#0284c7"
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
            />
            {/* 回収率 (Line) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="recoveryRate"
              name="回収率(%)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: '#fef08a' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 凡例・補助説明 */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 border-t border-slate-900 pt-0.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-sky-600 rounded-xs inline-block" />
            <span>純利益 (円)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" />
            <span>回収率 (%) [点線: 100%分岐点]</span>
          </div>
        </div>
        <span className="text-slate-500 font-mono">直近{chartData.length}/10走</span>
      </div>
    </div>
  );
};
