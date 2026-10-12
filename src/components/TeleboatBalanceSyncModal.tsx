import React, { useState } from 'react';
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  Check,
  DollarSign,
  X,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { openTeleboatWebPortal } from '../services/teleboatService';

interface TeleboatBalanceSyncModalProps {
  currentBalance: number;
  onSaveBalance: (newBalance: number) => void;
  onClose: () => void;
}

export const TeleboatBalanceSyncModal: React.FC<TeleboatBalanceSyncModalProps> = ({
  currentBalance,
  onSaveBalance,
  onClose,
}) => {
  const [balanceInput, setBalanceInput] = useState<string>(
    currentBalance > 0 ? currentBalance.toString() : ''
  );
  const [notice, setNotice] = useState<string | null>(null);

  const numVal = Math.max(0, parseInt(balanceInput.replace(/,/g, ''), 10) || 0);
  const diff = numVal - currentBalance;

  const handleApplyPreset = (amount: number) => {
    const next = numVal + amount;
    setBalanceInput(next.toString());
    setNotice(`+¥${amount.toLocaleString()} 加算しました`);
    setTimeout(() => setNotice(null), 2000);
  };

  const handleSetExact = (amount: number) => {
    setBalanceInput(amount.toString());
    setNotice(`購入限度額を ¥${amount.toLocaleString()} に設定しました`);
    setTimeout(() => setNotice(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBalance(numVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-slate-100">
        {/* ヘッダー */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-100 text-sm">
                テレボート実残高（購入限度額）同期・照合
              </h3>
              <p className="text-[10px] text-slate-400">
                公式テレボート画面の「購入限度額」を入力し、アプリ内残高と1円単位で完全一致させます
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs font-sans">
          {/* 現在残高 & 公式Web照会カード */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  アプリ内 現在登録残高:
                </span>
                <span className="text-xl font-black font-mono text-amber-300">
                  ¥{currentBalance.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openTeleboatWebPortal('PC')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-950 hover:bg-blue-900 text-cyan-200 border border-blue-600 text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                  title="PC版テレボート（ib.mbrace.or.jp）を開く"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                  <span>PC版テレボートで確認</span>
                </button>

                <button
                  type="button"
                  onClick={() => openTeleboatWebPortal('SP')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-600 text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                  title="スマホ版テレボート（spweb.brtb.jp）を開く"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
                  <span>スマホ版で確認</span>
                </button>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                テレボートにログイン後、画面上部に表示される「<strong className="text-amber-300">購入限度額：￥〇〇,〇〇〇</strong>」が実際の投票可能残高です。その金額を下記に入力してください。
              </span>
            </div>
          </div>

          {/* 実残高（購入限度額）入力欄 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                <span>テレボート購入限度額（円）を入力:</span>
              </label>
              {diff !== 0 && (
                <span className={`text-[11px] font-mono font-bold ${
                  diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {diff > 0 ? `+¥${diff.toLocaleString()} 増額` : `-¥${Math.abs(diff).toLocaleString()} 減額`}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-bold font-mono text-xl">
                ¥
              </span>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="例: 25000"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border-2 border-amber-500/70 focus:border-amber-400 rounded-lg px-3 py-2.5 pl-9 text-amber-300 font-mono text-2xl font-black focus:outline-none focus:ring-2 focus:ring-amber-400/40 tabular-nums shadow-inner"
              />
            </div>
            {notice && (
              <p className="text-[11px] text-emerald-400 font-bold animate-in fade-in">
                {notice}
              </p>
            )}
          </div>

          {/* クイック増減ボタン */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block font-medium">クイック入金・加算プリセット:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1000, 3000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleApplyPreset(amt)}
                  className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono font-bold border border-slate-700 text-center cursor-pointer transition-colors"
                >
                  +{amt >= 10000 ? `${amt / 10000}万` : `${amt}`}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {[20000, 30000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleApplyPreset(amt)}
                  className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono font-bold border border-slate-700 text-center cursor-pointer transition-colors"
                >
                  +{amt / 10000}万
                </button>
              ))}
            </div>
          </div>

          {/* 定額一括設定プリセット */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block font-medium">即時設定・精算:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[10000, 30000, 50000].map((amt) => (
                <button
                  key={`set-${amt}`}
                  type="button"
                  onClick={() => handleSetExact(amt)}
                  className="py-1 px-1 bg-slate-850 hover:bg-slate-750 text-cyan-300 rounded text-[11px] font-mono border border-slate-700 text-center cursor-pointer transition-colors"
                >
                  {amt / 10000}万円
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSetExact(0)}
                className="py-1 px-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded text-[11px] font-bold border border-rose-800 text-center cursor-pointer transition-colors"
              >
                0円（精算）
              </button>
            </div>
          </div>

          {/* ガイド注記 */}
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-slate-300 text-[11px] leading-relaxed">
            <p className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>購入限度額の完全連動ルール:</span>
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>本画面で設定した金額が、全自動運転や資金配分の上限として即座に反映されます</li>
              <li>投票実行時に実際の投票合計金額が正確に減算されます</li>
              <li>レース的中時には公式払戻金が自動加算され、残高の一致が維持されます</li>
            </ul>
          </div>

          {/* アクションボタン */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer text-xs"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg flex items-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>購入限度額を確定・完全同期</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

