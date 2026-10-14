import React, { useState } from 'react';
import { RaceHistoryRecord } from '../types/kyotei';
import { Download, Trash2, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Building2, CheckCircle2 } from 'lucide-react';
import { StatusStamp } from './StatusStamp';
import { BET_TYPE_LABELS, BetType } from '../types/kyotei';

interface HistoryModalProps {
  history: RaceHistoryRecord[];
  onExportCsv: () => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onImportRealData?: () => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onExportCsv,
  onClearHistory,
  onDeleteRecord,
  onImportRealData,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'hit' | 'miss' | 'skip'>('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [showClearConfirmDialog, setShowClearConfirmDialog] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // 全履歴に存在する会場一覧
  const availableVenues = Array.from(new Set(history.map((h) => h.venue))).filter(Boolean);

  const filtered = history.filter((item) => {
    if (venueFilter !== 'all' && item.venue !== venueFilter) return false;
    if (filter === 'hit') return item.isHit;
    if (filter === 'miss') return item.totalStake > 0 && !item.isHit;
    if (filter === 'skip') return item.status === 'Skip';
    return true;
  });

  const handleExecuteClear = () => {
    onClearHistory();
    setShowClearConfirmDialog(false);
    setNotificationMsg('すべての収支履歴を消去しました（0件）');
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-lg shadow-2xl flex flex-col max-h-[85vh] select-none animate-in fade-in zoom-in-95 duration-150 relative">
        {/* 通知トースト */}
        {notificationMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* 全履歴削除 確認ダイアログ (モーダル内ポップアップ) */}
        {showClearConfirmDialog && (
          <div className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-6 rounded-lg backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-slate-900 border-2 border-rose-600 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
                <h4 className="text-sm font-bold text-white">収支履歴の全件削除確認</h4>
              </div>

              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>
                  現在記録されているすべてのレース結果・収支シミュレーション履歴（全{' '}
                  <strong className="text-amber-300 font-mono text-sm">{history.length}件</strong>
                  ）を完全に消去しますか？
                </p>
                <p className="text-[11px] text-rose-300 bg-rose-950/50 p-2 rounded border border-rose-900">
                  ※削除を実行すると、投資額・払戻額・回収率・純利益の集計データおよび推移グラフもすべて初期化（0件）されます。この操作は取り消せません。
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmDialog(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClear}
                  className="px-4 py-1.5 rounded text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>完全に全消去する</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* モーダルヘッダー */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              レース予想・収支シミュレーション履歴一覧
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filtered.length}件 / 全{history.length}件)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
              title="Excel対応 UTF-8 BOM付きCSVとして保存"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV出力</span>
            </button>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirmDialog(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-600 hover:border-rose-500 rounded text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="全履歴を消去"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>履歴全削除</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* フィルタータブ & 会場絞り込み */}
        <div className="px-3 py-2 bg-slate-950 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">状態:</span>
            {(
              [
                { id: 'all', label: 'すべて' },
                { id: 'hit', label: '的中のみ' },
                { id: 'miss', label: '不的中のみ' },
                { id: 'skip', label: '見送り' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filter === t.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* 会場絞り込みセレクター */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">会場:</span>
              <select
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">全会場 ({history.length}件)</option>
                {availableVenues.map((v) => {
                  const count = history.filter((h) => h.venue === v).length;
                  return (
                    <option key={v} value={v} className="bg-slate-900 text-white">
                      {v} ({count}件)
                    </option>
                  );
                })}
              </select>
            </div>

            {onImportRealData && (
              <button
                onClick={() => {
                  onImportRealData();
                  setNotificationMsg('公式確定実データパックをインポートしました');
                  setTimeout(() => setNotificationMsg(null), 3000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] rounded transition-colors shadow-xs cursor-pointer"
                title="全国43競輪場の公式過去レース確定実データを一括インポート"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>実データ読込</span>
              </button>
            )}
          </div>
        </div>

        {/* テーブル表示領域 */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              該当する履歴データがありません。
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                  <th className="py-1.5 px-2">日時 / 開催</th>
                  <th className="py-1.5 px-2 text-center">状態</th>
                  <th className="py-1.5 px-2">購入買い目・配分</th>
                  <th className="py-1.5 px-2 text-right">総投資額</th>
                  <th className="py-1.5 px-2 text-center">確定着順</th>
                  <th className="py-1.5 px-2 text-right">払戻額</th>
                  <th className="py-1.5 px-2 text-right">純利益</th>
                  <th className="py-1.5 px-2 text-center">判定</th>
                  <th className="py-1.5 px-2 text-center w-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* 日時 / 開催場 */}
                    <td className="py-2 px-2">
                      <div className="font-bold text-slate-200">
                        {item.venue} {item.raceNo}R
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {item.raceTitle}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {item.timestamp.split(' ')[0]}
                      </div>
                    </td>

                    {/* 状態ミニバッジ */}
                    <td className="py-2 px-2 text-center font-sans">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Teki2'
                            ? 'bg-yellow-950 text-yellow-300 border border-yellow-600'
                            : item.status === 'Hazure'
                            ? 'bg-slate-800 text-slate-400'
                            : item.status === 'Skip'
                            ? 'bg-amber-950 text-amber-300 border border-amber-600'
                            : 'bg-red-950 text-red-300 border border-red-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* 購入買い目詳細 */}
                    <td className="py-2 px-2 font-sans">
                      {item.status === 'Skip' ? (
                        <span className="text-[11px] text-amber-400">
                          {item.skipReason || '見送り'}
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-cyan-400 font-bold">
                            [{BET_TYPE_LABELS[item.betType || '3t']?.label || '3連単'} {item.bets.length}点]
                          </div>
                          <div className="flex flex-wrap gap-1">
                          {item.bets.map((b) => (
                            <span
                              key={b.combination}
                              className={`inline-block text-[11px] mr-1.5 font-mono ${
                                b.isHit ? 'text-yellow-300 font-black' : 'text-slate-300'
                              }`}
                            >
                              {b.combination} ({b.odds}倍/{b.stake}円)
                              {b.isHit && '★'}
                            </span>
                          ))}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 総投資額 */}
                    <td className="py-2 px-2 text-right tabular-nums text-slate-300">
                      {item.totalStake > 0 ? `${item.totalStake.toLocaleString()}円` : '-'}
                    </td>

                    {/* 確定着順 */}
                    <td className="py-2 px-2 text-center font-bold text-slate-200">
                      {item.finishOrder || '-'}
                    </td>

                    {/* 払戻額 */}
                    <td className="py-2 px-2 text-right tabular-nums text-amber-300 font-bold">
                      {item.totalReturn > 0 ? `${item.totalReturn.toLocaleString()}円` : '-'}
                    </td>

                    {/* 純利益 */}
                    <td className="py-2 px-2 text-right tabular-nums font-black">
                      {item.totalStake > 0 ? (
                        <span
                          className={
                            item.profit > 0
                              ? 'text-emerald-400'
                              : item.profit < 0
                              ? 'text-rose-400'
                              : 'text-slate-300'
                          }
                        >
                          {item.profit > 0
                            ? `+${item.profit.toLocaleString()}`
                            : item.profit.toLocaleString()}
                          円
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* 判定 */}
                    <td className="py-2 px-2 text-center">
                      {item.isHit ? (
                        <span className="text-yellow-400 font-black text-xs">的中</span>
                      ) : item.totalStake > 0 ? (
                        <span className="text-slate-500 text-xs">ハズレ</span>
                      ) : (
                        <span className="text-amber-500 text-[11px]">見送り</span>
                      )}
                    </td>

                    {/* 削除ボタン */}
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => onDeleteRecord(item.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors"
                        title="この記録を削除"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirmDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-rose-950/80 text-rose-300 border border-slate-800 hover:border-rose-700 rounded text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>履歴一覧を全件削除</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
