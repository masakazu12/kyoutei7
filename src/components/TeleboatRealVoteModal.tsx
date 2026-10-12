import React, { useState, useEffect } from 'react';
import {
  Send,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Zap,
  Info,
  Clock,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  Download,
  Monitor,
} from 'lucide-react';
import { RaceInfo, BetCandidate } from '../types/kyotei';
import {
  AutoVoteConfig,
  generateTeleboatBatchPayload,
  generateTeleboatAutoFillBookmarklet,
  generateTeleboatTicketSummary,
  generateTeleboatOfficialFileContent,
  downloadTeleboatOfficialFile,
  downloadPCExtensionZip,
  dispatchVoteToPCExtension,
  broadcastTeleboatPendingVote,
  openTeleboatWebPortal,
  openTeleboatWebPortalWithPayload,
} from '../services/teleboatService';

interface TeleboatRealVoteModalProps {
  race: RaceInfo;
  candidates: BetCandidate[];
  config: AutoVoteConfig;
  onConfirmRealVote: (officialReceptionNo?: string) => void;
  onOpenBalanceSync: () => void;
  onClose: () => void;
  onOpenPCExtensionModal?: () => void;
  isExtensionConnected?: boolean;
}

export const TeleboatRealVoteModal: React.FC<TeleboatRealVoteModalProps> = ({
  race,
  candidates,
  config,
  onConfirmRealVote,
  onOpenBalanceSync,
  onClose,
  onOpenPCExtensionModal,
  isExtensionConnected = false,
}) => {
  const [officialReceptionNo, setOfficialReceptionNo] = useState<string>('');
  const [hasConfirmedOnTeleboat, setHasConfirmedOnTeleboat] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedData, setCopiedData] = useState<boolean>(false);
  const [copiedOfficialTxt, setCopiedOfficialTxt] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedUserscript, setCopiedUserscript] = useState<boolean>(false);
  const [hasDispatchedToTeleboat, setHasDispatchedToTeleboat] = useState<boolean>(false);
  const [autoDetectedReception, setAutoDetectedReception] = useState<string | null>(null);

  const handleCopyUserscript = async () => {
    try {
      const res = await fetch('/kyotei-teleboat-autofill.user.js');
      const text = await res.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      await navigator.clipboard.writeText(cleanText);
      setCopiedUserscript(true);
      setTimeout(() => setCopiedUserscript(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // テレボート公式での購入完了・受付番号の自動同期
  useEffect(() => {
    const handlePurchaseSync = (ev: any) => {
      const data = ev.detail || (ev.data && ev.data.type === 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED' ? ev.data : null);
      if (data && data.receptionNo) {
        setOfficialReceptionNo(data.receptionNo);
        setAutoDetectedReception(data.receptionNo);
        setHasConfirmedOnTeleboat(true);
      }
    };

    window.addEventListener('KYOTEI_TELEBOAT_PURCHASE_CONFIRMED', handlePurchaseSync);
    window.addEventListener('message', handlePurchaseSync);

    const pollTimer = setInterval(() => {
      try {
        const raw = localStorage.getItem('__kyotei_confirmed_vote__');
        if (raw) {
          const item = JSON.parse(raw);
          if (item && item.receptionNo && Date.now() - item.timestamp < 120000) {
            setOfficialReceptionNo(item.receptionNo);
            setAutoDetectedReception(item.receptionNo);
            setHasConfirmedOnTeleboat(true);
          }
        }
      } catch (e) {}
    }, 1000);

    return () => {
      window.removeEventListener('KYOTEI_TELEBOAT_PURCHASE_CONFIRMED', handlePurchaseSync);
      window.removeEventListener('message', handlePurchaseSync);
      clearInterval(pollTimer);
    };
  }, []);

  const validBets = candidates.filter((c) => c.stake > 0);
  const totalStake = validBets.reduce((sum, c) => sum + c.stake, 0);
  const remainingBalance = config.accountBalance - totalStake;
  const isBalanceSufficient = remainingBalance >= 0;

  const handleOpenTeleboat = (portalType: 'SP' | 'PC' = 'SP') => {
    openTeleboatWebPortalWithPayload({
      race,
      candidates: validBets,
      portalType,
      autoExecute: true,
      betPassword: config.teleboatAccount?.betPassword,
    });
    setHasDispatchedToTeleboat(true);
  };

  const handleVoteViaExtension = () => {
    dispatchVoteToPCExtension({
      race,
      candidates: validBets,
      betPassword: config.teleboatAccount?.betPassword,
      autoExecute: true,
    });
    setHasDispatchedToTeleboat(true);
  };

  const handleCopyScript = () => {
    const script = generateTeleboatAutoFillBookmarklet(race, validBets, config.teleboatAccount?.betPassword);
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyOfficialTxt = () => {
    const content = generateTeleboatOfficialFileContent(race, validBets);
    navigator.clipboard.writeText(content);
    setCopiedOfficialTxt(true);
    setTimeout(() => setCopiedOfficialTxt(false), 2500);
  };

  const handleCopySummary = () => {
    const summary = generateTeleboatTicketSummary(race, validBets, config.accountBalance);
    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanceSufficient || !hasConfirmedOnTeleboat) return;
    onConfirmRealVote(officialReceptionNo.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* ヘッダー */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Send className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-100 text-sm">
                  テレボート公式 実投票マネージャー
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse">
                  実投票 連携モード
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                公式テレボート（spweb.brtb.jp / ib.mbrace.or.jp）への買い目反映・投票購入ガイド
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

        {/* コンテンツ本体 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* レース概要 & 残高比較カード */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-black text-xs">
                  {race.venue}
                </span>
                <span className="font-bold text-slate-200 text-sm">
                  第{race.raceNo}R {race.raceTitle}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>締切時刻: {race.deadlineTime || '発売中'}</span>
                <span>|</span>
                <span>日付: {race.date}</span>
              </div>
            </div>

            {/* 金額・残高カード */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">投票合計金額</span>
                <span className="font-mono text-base font-black text-emerald-400">
                  ¥{totalStake.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">({validBets.length}点)</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                  <span>購入限度額 (実残高)</span>
                </div>
                <span className="font-mono text-base font-black text-amber-300">
                  ¥{config.accountBalance.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={onOpenBalanceSync}
                  className="text-[10px] text-amber-400 hover:underline block mx-auto mt-0.5 cursor-pointer"
                >
                  [限度額を同期・変更]
                </button>
              </div>

              <div
                className={`p-2.5 rounded border ${
                  isBalanceSufficient
                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                    : 'bg-rose-950/60 border-rose-600 text-rose-300'
                }`}
              >
                <span className="text-[10px] text-slate-400 block mb-0.5">投票後 限度額</span>
                <span
                  className={`font-mono text-base font-black ${
                    isBalanceSufficient ? 'text-cyan-300' : 'text-rose-400'
                  }`}
                >
                  ¥{Math.max(0, remainingBalance).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isBalanceSufficient ? '残高充分' : '残高不足！'}
                </span>
              </div>
            </div>

            {/* 残高不足エラーバナー */}
            {!isBalanceSufficient && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500 rounded text-rose-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    テレボート購入限度額が不足しています (不足額: ¥{Math.abs(remainingBalance).toLocaleString()})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenBalanceSync}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] cursor-pointer shrink-0"
                >
                  実残高を同期・入金
                </button>
              </div>
            )}
          </div>

          {/* 重要説明バナー */}
          <div className="p-3 rounded-lg bg-blue-950/50 border border-blue-700/60 space-y-1.5 text-[11px] text-blue-200 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>テレボート公式側での「購入完了」までの流れについて</span>
            </div>
            <p className="text-slate-300">
              ボートレース公式テレボートの仕様上、外部サイトからの直接資金引き落としは行えません。
              下記の<strong className="text-yellow-300">【ステップ1】</strong>でテレボート画面へ買い目を転送・投入し、テレボート画面上で暗証番号を入力して【投票】ボタンを押すことで、実際の投票購入が完了します。
            </p>
          </div>

          {/* 自動検知バナー */}
          {autoDetectedReception && (
            <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-lg flex items-center gap-2.5 text-emerald-200 text-xs animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-black text-sm block text-emerald-300">
                  🎉 テレボート公式での購入完了を検知しました！
                </span>
                <span className="text-[11px] text-emerald-400">
                  受付番号: <strong className="font-mono text-white text-xs">{autoDetectedReception}</strong> を自動取得しました。「実投票完了を確定」ボタンを押して残高を減算してください。
                </span>
              </div>
            </div>
          )}

          {/* 買い目一覧表 (マークカード風) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>投票対象の3連単 買い目一覧 ({validBets.length}点)</span>
              </span>
              <button
                type="button"
                onClick={handleCopySummary}
                className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer font-normal"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedSummary ? '伝票コピー完了' : '投票指図伝票をコピー'}</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">式別 / 組み合わせ</th>
                    <th className="py-2 px-3 text-right">オッズ</th>
                    <th className="py-2 px-3 text-right">投票金額</th>
                    <th className="py-2 px-3 text-right">想定払戻</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {validBets.map((b, idx) => (
                    <tr key={b.combination} className="hover:bg-slate-800/40">
                      <td className="py-1.5 px-3">
                        <span className="text-[11px] text-slate-400 mr-2">#{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-200">3連単</span>
                        <span className="text-amber-300 font-bold text-sm ml-2">
                          {b.combination}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-300">
                        {b.odds.toFixed(1)}倍
                      </td>
                      <td className="py-1.5 px-3 text-right font-black text-emerald-400">
                        ¥{b.stake.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-300 font-bold">
                        ¥{(b.expectedReturn || Math.floor(b.stake * b.odds)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ステップ1: テレボート公式へ買い目を反映・開く */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>ステップ1: テレボート公式を開いて買い目を反映する</span>
              </h4>
              {hasDispatchedToTeleboat && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500">
                  ✓ 買い目送出・クリップボード転送済み
                </span>
              )}
            </div>

            {/* 特設: PC版 専用拡張機能（最も推奨・全自動・文字化けゼロ） */}
            <div className="p-3.5 rounded-lg bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/80 shadow-md space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] tracking-wide">
                    ★ 公式PC版 推奨・全自動
                  </span>
                  <span className="font-bold text-white text-xs">
                    PC版 専用拡張機能で自動投票 (ib.mbrace.or.jp)
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isExtensionConnected
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                  }`}
                >
                  {isExtensionConnected ? '🟢 拡張機能 接続中 (READY)' : '⚪ 拡張機能 未検出 (ZIP提供中)'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Chrome / Edge拡張機能がテレボートPC版と直結し、3連単全{validBets.length}点を1クリックで自動投入・暗証番号入力・受付番号の自動同期まで全自動実行します。
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleVoteViaExtension}
                  className="flex-1 py-2 px-3 rounded bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer hover:scale-[1.01]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>PC版 拡張機能で自動投票を実行（テレボートPC起動）</span>
                </button>

                {onOpenPCExtensionModal ? (
                  <button
                    type="button"
                    onClick={onOpenPCExtensionModal}
                    className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>拡張機能ZIP / ガイド</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={downloadPCExtensionZip}
                    className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>ZIPダウンロード</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2つの補助反映方法カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 方法A: PC版 ファイル投票 (最も確実) */}
              <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/60 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">
                      PC推奨・最速
                    </span>
                    <span className="text-blue-400 font-bold text-[11px]">方法A: 公式ファイル投票</span>
                  </div>
                  <h5 className="font-black text-white text-xs mb-1">
                    PC版 テレボート「ファイル投票」
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-normal mb-2">
                    公式のファイル投票画面で貼付するだけで、全{validBets.length}点が1秒でセットされます。
                  </p>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleCopyOfficialTxt();
                      handleOpenTeleboat('PC');
                    }}
                    className="w-full py-2 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>PC版 テレボートを開く (TXT自動コピー)</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyOfficialTxt}
                      className="flex-1 py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>{copiedOfficialTxt ? '貼付TXTコピー済' : '貼付TXTをコピー'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTeleboatOfficialFile(race, validBets)}
                      className="py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      title="ファイル投票用TXTをダウンロード"
                    >
                      <Download className="w-3 h-3" />
                      <span>TXT保存</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 方法B: スマホ版 (spweb) & 自動入力スクリプト */}
              <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/60 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      スマホ・拡張
                    </span>
                    <span className="text-emerald-400 font-bold text-[11px]">方法B: スマホ版 & HUD</span>
                  </div>
                  <h5 className="font-black text-white text-xs mb-1">
                    スマホ版 テレボート (spweb) 連携
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-normal mb-2">
                    spweb.brtb.jp を開き、専用HUDやブックマークレットから1クリックでベットリストへ投入。
                  </p>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenTeleboat('SP')}
                    className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>スマホ版 テレボートを開く (ハッシュ連携)</span>
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="flex-1 py-1.5 px-2 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      title="テレボート画面で実行すると1クリック投入されるブックマークレット"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>{copiedScript ? 'スクリプトコピー済' : '自動反映スクリプト'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyUserscript}
                      className="py-1.5 px-2.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      title="Tampermonkey連携スクリプトのコードをクリップボードにコピー（文字化け知らず）"
                    >
                      <Copy className="w-3 h-3 text-purple-400" />
                      <span>{copiedUserscript ? 'コードコピー完了！' : '拡張コードコピー'}</span>
                    </button>
                    <a
                      href="/kyotei-teleboat-autofill.user.js"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer no-underline"
                      title="スクリプトファイルを直接開く"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>開く</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ステップ2: テレボート公式での投票完了を確定 & 残高減算 */}
          <form onSubmit={handleSubmit} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ステップ2: テレボート公式での購入完了を確定 & 限度額減算</span>
            </h4>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold text-[11px]">
                公式受付番号（テレボートの購入完了画面に表示される番号・任意）:
              </label>
              <input
                type="text"
                placeholder="例: 88123456 (空欄の場合は現在時刻で公式受付参照番号を自動生成)"
                value={officialReceptionNo}
                onChange={(e) => setOfficialReceptionNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded border border-slate-800 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={hasConfirmedOnTeleboat}
                onChange={(e) => setHasConfirmedOnTeleboat(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
              />
              <span className="text-slate-200 font-bold">
                公式テレボート画面で投票内容（{validBets.length}点・計¥{totalStake.toLocaleString()}）を確認し、購入（投票実行）を完了しました
              </span>
            </label>

            {!hasConfirmedOnTeleboat && (
              <p className="text-[10px] text-amber-400 pl-1">
                ※ テレボート画面上で暗証番号を入力して【投票】ボタンを押し、購入が完了したら上のチェックボックスをONにしてください。
              </p>
            )}

            {/* 送信ボタンバー */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                キャンセル
              </button>

              <button
                type="submit"
                disabled={!isBalanceSufficient || !hasConfirmedOnTeleboat}
                className="px-5 py-2 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>実投票完了を確定（残高から ¥{totalStake.toLocaleString()} 減算）</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
