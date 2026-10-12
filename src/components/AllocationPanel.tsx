import React from 'react';
import { AllocationMode, AppSettings } from '../types/kyotei';
import { DollarSign, Sliders, ShieldAlert, ArrowDownUp, Wallet } from 'lucide-react';

interface AllocationPanelProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onRunAllocation: () => void;
  warningMessage?: string;
  isOverBudget: boolean;
  teleboatBalance?: number;
  onOpenBalanceSync?: () => void;
}

export const AllocationPanel: React.FC<AllocationPanelProps> = ({
  settings,
  onUpdateSettings,
  onRunAllocation,
  warningMessage,
  isOverBudget,
  teleboatBalance,
  onOpenBalanceSync,
}) => {
  const modes: { id: AllocationMode; label: string; desc: string }[] = [
    {
      id: 'equal',
      label: '均等配分',
      desc: '予算を候補点数で均等分割（100円単位）',
    },
    {
      id: 'target',
      label: '目標払戻配分',
      desc: '目標払戻額を満たす最小金額をオッズから逆算',
    },
    {
      id: 'fixed',
      label: '固定額',
      desc: '各買い目に同一の指定固定金額を配分',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 text-xs">資金配分パラメータ設定</span>
        </div>
        <button
          onClick={onRunAllocation}
          className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span>再計算</span>
        </button>
      </div>

      {/* 配分方式セレクター（タブスタイル） */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded border border-slate-800 mb-3">
        {modes.map((m) => {
          const isActive = settings.allocationMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                onUpdateSettings({ allocationMode: m.id });
              }}
              className={`py-1.5 px-2 rounded text-xs font-bold transition-all text-center ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div>{m.label}</div>
              <div className="text-[9px] font-normal opacity-80 truncate">{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 数値設定グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* 1レース上限額 */}
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 mb-1">1レース上限予算</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="500"
              min="500"
              max="100000"
              value={settings.maxRaceBudget}
              onChange={(e) =>
                onUpdateSettings({ maxRaceBudget: parseInt(e.target.value) || 1000 })
              }
              className="w-full bg-slate-900 border border-slate-700 text-right rounded px-2 py-1 font-mono font-bold text-emerald-400 text-sm focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <span className="text-slate-400 font-bold">円</span>
          </div>
        </div>

        {/* 目標払戻額（目標払戻配分時に主に使用） */}
        <div className={`p-2 rounded border flex flex-col justify-between transition-colors ${
          settings.allocationMode === 'target'
            ? 'bg-emerald-950/30 border-emerald-700'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="text-[11px] text-slate-400 mb-1">目標払戻額 (逆算基準)</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="500"
              min="500"
              max="500000"
              value={settings.targetReturn}
              onChange={(e) =>
                onUpdateSettings({ targetReturn: parseInt(e.target.value) || 3000 })
              }
              className="w-full bg-slate-900 border border-slate-700 text-right rounded px-2 py-1 font-mono font-bold text-yellow-400 text-sm focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <span className="text-slate-400 font-bold">円</span>
          </div>
        </div>

        {/* 1点あたり基準額（固定額配分時に主に使用） */}
        <div className={`p-2 rounded border flex flex-col justify-between transition-colors ${
          settings.allocationMode === 'fixed'
            ? 'bg-blue-950/30 border-blue-700'
            : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="text-[11px] text-slate-400 mb-1">1点あたり基準額</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="100"
              min="100"
              max="50000"
              value={settings.baseStake}
              onChange={(e) =>
                onUpdateSettings({ baseStake: parseInt(e.target.value) || 100 })
              }
              className="w-full bg-slate-900 border border-slate-700 text-right rounded px-2 py-1 font-mono font-bold text-slate-200 text-sm focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <span className="text-slate-400 font-bold">円</span>
          </div>
        </div>
      </div>

      {/* 自動縮小オプション */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300 px-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoScaleBudget}
            onChange={(e) => onUpdateSettings({ autoScaleBudget: e.target.checked })}
            className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
          />
          <span>予算上限超過時に自動で100円単位で比率縮小する</span>
        </label>

        {warningMessage && (
          <div className="flex items-center gap-1 text-amber-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{warningMessage}</span>
          </div>
        )}
      </div>

      {/* テレボート購入限度額 連動ステータス */}
      {teleboatBalance !== undefined && (
        <div className="mt-2.5 p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">購入限度額 (実残高):</span>
            <span className="font-mono font-bold text-amber-300">
              ¥{teleboatBalance.toLocaleString()}
            </span>
          </div>
          {onOpenBalanceSync && (
            <button
              type="button"
              onClick={onOpenBalanceSync}
              className="text-[10px] text-cyan-300 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500 cursor-pointer transition-colors"
            >
              限度額同期
            </button>
          )}
        </div>
      )}
    </div>
  );
};
