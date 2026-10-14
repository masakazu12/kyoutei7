import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Key,
  Wallet,
  CheckCircle2,
  Lock,
  Download,
  Copy,
  Clock,
  History,
  Info,
  DollarSign,
  Zap,
  RefreshCw,
  ExternalLink,
  Check,
  PlusCircle,
} from 'lucide-react';
import { RaceInfo, BetCandidate, BET_TYPE_LABELS } from '../types/kyotei';
import { checkRaceVoteEligibility } from '../services/deadlineService';
import {
  AutoVoteConfig,
  VoteLogItem,
  buildTeleboatTickets,
  generateTeleboatBatchPayload,
  generateTeleboatAutoFillBookmarklet,
  generateTeleboatOfficialFileContent,
  downloadTeleboatOfficialFile,
  broadcastTeleboatPendingVote,
  linkTeleboatAccount,
  unlinkTeleboatAccount,
  refreshTeleboatBalance,
  openTeleboatWebPortal,
  openTeleboatRaceVotingPage,
  openTeleboatWebPortalWithPayload,
} from '../services/teleboatService';
import { TeleboatBalanceSyncModal } from './TeleboatBalanceSyncModal';

interface AutoVoteModalProps {
  race: RaceInfo;
  candidates: BetCandidate[];
  config: AutoVoteConfig;
  onUpdateConfig: (newConfig: AutoVoteConfig) => void;
  onExecuteVote: () => void;
  onOpenRealVoteModal?: () => void;
  onOpenBalanceSync?: () => void;
  onOpenPCExtensionModal?: () => void;
  isVoting: boolean;
  voteLogs: VoteLogItem[];
  onClose: () => void;
}

export const AutoVoteModal: React.FC<AutoVoteModalProps> = ({
  race,
  candidates,
  config,
  onUpdateConfig,
  onExecuteVote,
  onOpenRealVoteModal,
  onOpenBalanceSync,
  onOpenPCExtensionModal,
  isVoting,
  voteLogs,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'teleboat' | 'logs'>('status');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [showBalanceSync, setShowBalanceSync] = useState(false);

  const validBets = candidates.filter((c) => c.stake > 0);
  const totalStake = validBets.reduce((sum, c) => sum + c.stake, 0);

  const voteEligibility = checkRaceVoteEligibility({
    date: race.date,
    deadlineTime: race.deadlineTime,
    venueName: race.venue,
    raceNo: race.raceNo,
  });

  const handleCopyPayload = () => {
    const payload = generateTeleboatBatchPayload(race, candidates);
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleDownloadPayload = () => {
    const payload = generateTeleboatBatchPayload(race, candidates);
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TELEBOAT_VOTE_${race.venue}_${race.raceNo}R.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // テレボート口座連動ハンドラ
  const handleLinkAccount = async () => {
    setIsLinking(true);
    setLinkNotice(null);
    try {
      const res = await linkTeleboatAccount(config.teleboatAccount, config.accountBalance);
      if (res.success) {
        onUpdateConfig({
          ...config,
          connectionStatus: 'CONNECTED',
          accountHolderName: res.accountHolderName,
          accountBalance: res.balance,
          lastSyncTime: res.syncTime,
          sessionToken: res.sessionToken,
        });
        setLinkNotice(res.message);
      } else {
        onUpdateConfig({
          ...config,
          connectionStatus: 'ERROR',
        });
        setLinkNotice(res.message);
      }
    } catch (e: any) {
      setLinkNotice(e?.message || 'テレボート連動エラー');
    } finally {
      setIsLinking(false);
    }
  };

  // 口座残高の再同期
  const handleRefreshBalance = () => {
    if (onOpenBalanceSync) {
      onOpenBalanceSync();
    } else {
      setShowBalanceSync(true);
    }
  };

  // 連動解除
  const handleUnlink = () => {
    const res = unlinkTeleboatAccount();
    onUpdateConfig({
      ...config,
      connectionStatus: 'DISCONNECTED',
      sessionToken: undefined,
    });
    setLinkNotice(res.message);
  };

  // 入金チャージシミュレーション
  const handleAddBalance = (amount: number) => {
    const next = config.accountBalance + amount;
    onUpdateConfig({
      ...config,
      accountBalance: next,
      lastSyncTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    });
    setLinkNotice(`¥${amount.toLocaleString()} 入金連動しました (現在残高: ¥${next.toLocaleString()})`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  競輪公式自動投票マネージャー (KEIRIN.JP / ネット投票連携)
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    config.enabled
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {config.enabled ? '自動投票 [有効/監視中]' : '自動投票 [停止中]'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    config.testMode
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-rose-300 border border-red-800 font-bold'
                  }`}
                >
                  {config.testMode ? 'テスト投票モード' : '実投票本番モード'}
                </span>
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

        {/* タブナビゲーション */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs px-3">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            本レース投票実行 (即時/自動)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            自動投票ルール・安全制御
          </button>
          <button
            onClick={() => setActiveTab('teleboat')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer ${
              activeTab === 'teleboat'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            テレボート口座・認証連携
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>投票ログ・受付番号</span>
            {voteLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono">
                {voteLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* 1. 本レース投票実行タブ */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* 本日開催 締切超過警告バナー */}
              {voteEligibility.isPastDeadlineToday && (
                <div className="p-3 bg-rose-950/80 border border-rose-500 rounded flex items-center justify-between gap-3 text-xs text-rose-200">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-sm">【本日開催】締切時刻超過（投票受付終了）</span>
                      <span className="text-[11px] text-rose-300/90">
                        本日（{race.date}）の第{race.raceNo}Rは締切時刻（{voteEligibility.effectiveDeadline}）を過ぎているため投票できません。
                        （※過去開催日の場合はシミュレーション投票および確定結果照合が可能です）
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 過去開催日 インフォメーションバナー */}
              {voteEligibility.isPastDate && (
                <div className="p-2.5 bg-blue-950/60 border border-blue-600/60 rounded flex items-center gap-2 text-xs text-blue-200">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    過去開催日（{race.date}）のレースです。締切後でもシミュレーション投票・着順照合・収支判定を実行できます。
                  </span>
                </div>
              )}

              {/* テレボート未連動警告バナー (実投票モード時) */}
              {!config.testMode && config.connectionStatus !== 'CONNECTED' && (
                <div className="p-3 bg-amber-950/70 border border-amber-500 rounded flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block">テレボート口座が連動されていません</span>
                      <span className="text-[11px] text-amber-300/90">
                        実口座と連動して投票を実行するには、「テレボート口座・認証連携」タブから認証を行ってください。
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('teleboat')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shrink-0 cursor-pointer shadow"
                  >
                    今すぐ口座連動
                  </button>
                </div>
              )}

              {/* レース情報 & 投票概要カード */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-950 text-blue-300 font-black px-2.5 py-1.5 rounded border border-blue-800 text-sm">
                    {race.venue}
                  </div>
                  <div>
                    <div className="text-slate-200 font-bold text-sm">
                      {race.raceTitle} ({race.raceNo}R)
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono flex items-center gap-2 mt-0.5">
                      <span>締切時刻: {race.deadlineTime}</span>
                      <span>|</span>
                      <span>日付: {race.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-900 px-3 py-2 rounded border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">対象点数</div>
                    <div className="text-base font-bold font-mono text-cyan-400">
                      {validBets.length} <span className="text-xs text-slate-400 font-normal">点</span>
                    </div>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <div className="text-[10px] text-slate-400">投票合計金額</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      ¥{totalStake.toLocaleString()}
                    </div>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1">
                      <span>口座実残高</span>
                      <span className={`w-2 h-2 rounded-full ${config.connectionStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="text-base font-bold font-mono text-amber-300">
                        ¥{config.accountBalance.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBalanceSync(true)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/60 text-[10px] font-bold cursor-pointer transition-colors"
                        title="テレボート実残高を入力・同期"
                      >
                        実残高同期
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 買い目プレビュー一覧 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-200">
                    投票対象の3連単買い目 (資金配分連動)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        broadcastTeleboatPendingVote({
                          race,
                          candidates: validBets,
                          betPassword: config.teleboatAccount.betPassword,
                        });
                        const script = generateTeleboatAutoFillBookmarklet(
                          race,
                          validBets,
                          config.teleboatAccount.betPassword
                        );
                        navigator.clipboard.writeText(script);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                      className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 cursor-pointer"
                      title="テレボートWeb自動入力スクリプトをコピー"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>{copiedScript ? 'スクリプトコピー済' : '自動反映スクリプト'}</span>
                    </button>
                    <button
                      onClick={() => downloadTeleboatOfficialFile(race, validBets)}
                      className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 cursor-pointer"
                      title="テレボート公式の「ファイル投票」にそのまま読み込めるTXTファイルを保存"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>一括投票TXT</span>
                    </button>
                    <button
                      onClick={handleCopyPayload}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                      title="テレボート用CSVバッチデータをクリップボードにコピー"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedPayload ? 'コピー完了' : '送信データコピー'}</span>
                    </button>
                  </div>
                </div>

                {validBets.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 bg-slate-950/60 rounded border border-dashed border-slate-800">
                    投票対象の買い目または配分金額がありません。メイン画面で「5点予想実行」または「配分計算」を行ってください。
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded overflow-hidden">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                        <tr>
                          <th className="py-1.5 px-3">買い目 (3連単)</th>
                          <th className="py-1.5 px-3 text-right">オッズ</th>
                          <th className="py-1.5 px-3 text-right">投票金額</th>
                          <th className="py-1.5 px-3 text-right">想定払戻</th>
                          <th className="py-1.5 px-3 text-center">テレボート規格</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {validBets.map((b) => (
                          <tr key={b.combination} className="hover:bg-slate-800/40">
                            <td className="py-1.5 px-3 font-bold text-slate-100">
                              3連単 <span className="text-amber-300 font-mono text-sm ml-1">{b.combination}</span>
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-300">
                              {b.odds.toFixed(1)}倍
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                              ¥{b.stake.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-300">
                              ¥{(b.expectedReturn || Math.floor(b.stake * b.odds)).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                              3T / {b.first}-{b.second}-{b.third}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 投票アクションボタン */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    安全制御: 1R上限 ¥{config.maxStakePerRace.toLocaleString()} / 残高 ¥{config.accountBalance.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })}
                    className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                      config.enabled
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {config.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{config.enabled ? '自動投票を停止' : '自動投票を常時ON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!config.testMode && onOpenRealVoteModal) {
                        onOpenRealVoteModal();
                      } else {
                        onExecuteVote();
                      }
                    }}
                    disabled={isVoting || validBets.length === 0 || (!voteEligibility.canVote && voteEligibility.isToday)}
                    className={`px-4 py-1.5 rounded font-black text-xs text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                      config.testMode
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-400'
                    }`}
                    title={
                      voteEligibility.isPastDeadlineToday
                        ? '本日のレースは締切時刻を過ぎているため投票できません'
                        : config.testMode
                        ? 'テスト投票（仮想残高内でのシミュレーション）を実行'
                        : 'テレボート公式Webへ買い目データを転送・実投票を実行'
                    }
                  >
                    <Send className={`w-3.5 h-3.5 ${isVoting ? 'animate-spin' : ''}`} />
                    <span>
                      {voteEligibility.isPastDeadlineToday
                        ? '締切時刻超過 (本日投票不可)'
                        : isVoting
                        ? '投票処理中...'
                        : config.testMode
                        ? 'テスト仮想投票を実行'
                        : 'テレボート公式へ実投票を実行'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 投票モード説明注記 */}
              <div className="px-3 py-2 bg-slate-950/70 rounded border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      config.testMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  {config.testMode ? (
                    <span className="text-amber-300">
                      現在【テスト仮想投票モード】です。実残高からの出金はなく、シミュレーションで受付・収支判定を行います。
                    </span>
                  ) : (
                    <span className="text-emerald-300">
                      現在【テレボート実投票連携モード】です。投票実行時にテレボート公式Webへ買い目・配分金額データを送信・展開します。
                    </span>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {onOpenPCExtensionModal && (
                    <button
                      type="button"
                      onClick={onOpenPCExtensionModal}
                      className="flex items-center gap-1 text-[11px] text-blue-300 hover:text-white px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/80 font-bold cursor-pointer transition-colors"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>PC版 拡張機能</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openTeleboatWebPortal()}
                    className="flex items-center gap-1 text-[11px] text-cyan-300 hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>テレボート公式Web</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. 自動投票ルール・安全制御設定タブ */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-3">
                <h4 className="text-slate-200 font-bold border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>自動投票のトリガー・タイミング条件</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      投票実行タイミング (締切何分前)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.minMinutesBeforeDeadline}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            minMinutesBeforeDeadline: parseInt(e.target.value) || 3,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                      />
                      <span className="text-slate-400 font-bold shrink-0">分前</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ※直前展示タイム・確定オッズを反映した後に自動投票します
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      1レースあたり投票上限金額 (円)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="500"
                        min="500"
                        value={config.maxStakePerRace}
                        onChange={(e) =>
                          onUpdateConfig({
                            ...config,
                            maxStakePerRace: parseInt(e.target.value) || 3000,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                      />
                      <span className="text-slate-400 font-bold shrink-0">円</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ※安全上限。この金額を超える買い目は誤操作防止のため投票を拒否します
                    </span>
                  </div>
                </div>
              </div>

              {/* セーフティ・スイッチ */}
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-3">
                <h4 className="text-slate-200 font-bold border-b border-slate-800 pb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>セーフティ & モード切替</span>
                </h4>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.testMode}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, testMode: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">
                        シミュレーション・テスト投票モード (推奨)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        実際のテレボート口座から出金せず、仮想投票で受付番号の発行と投票履歴の記録を行います。
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.confirmBeforeVote}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, confirmBeforeVote: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">
                        投票実行直前の確認ダイアログ表示
                      </div>
                      <div className="text-[10px] text-slate-400">
                        意図しない自動送信を防ぐため、送信直前に買い目・金額の最終確認ポップアップを表示します。
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 rounded bg-slate-900 hover:bg-slate-850 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.soundAlert}
                      onChange={(e) =>
                        onUpdateConfig({ ...config, soundAlert: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-bold text-slate-200">投票完了時のサウンド通知</div>
                      <div className="text-[10px] text-slate-400">
                        投票が成功した際に通知音（Web Audio チャイム）を再生します。
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. テレボート口座・認証連携タブ */}
          {activeTab === 'teleboat' && (
            <div className="space-y-4">
              {/* 口座連携ステータスカード */}
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h4 className="text-slate-100 font-bold text-sm">
                      テレボート公式 会員アカウント口座連動
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded font-bold border flex items-center gap-1 ${
                        config.connectionStatus === 'CONNECTED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : config.connectionStatus === 'CONNECTING'
                          ? 'bg-blue-950 text-blue-300 border-blue-500 animate-pulse'
                          : 'bg-rose-950 text-rose-300 border-rose-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          config.connectionStatus === 'CONNECTED'
                            ? 'bg-emerald-400 animate-ping'
                            : config.connectionStatus === 'CONNECTING'
                            ? 'bg-blue-400 animate-spin'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span>
                        {config.connectionStatus === 'CONNECTED'
                          ? '口座連動中 (認証完了)'
                          : config.connectionStatus === 'CONNECTING'
                          ? '接続認証中...'
                          : '未連動 (認証待機中)'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* 連動通知メッセージ */}
                {linkNotice && (
                  <div className="p-2.5 bg-blue-950/60 border border-blue-500/70 rounded text-blue-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{linkNotice}</span>
                    </div>
                    <button
                      onClick={() => setLinkNotice(null)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* 会員情報・認証入力フィールド */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      加入者番号 (8桁数字)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={config.teleboatAccount.subscriberNo}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            subscriberNo: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono tracking-wider"
                      placeholder="88123456"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      暗証番号 (4桁数字)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={config.teleboatAccount.passcode}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            passcode: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                      placeholder="••••"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      認証用パスワード
                    </label>
                    <input
                      type="password"
                      value={config.teleboatAccount.authPassword}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            authPassword: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      投票用パスワード
                    </label>
                    <input
                      type="password"
                      value={config.teleboatAccount.betPassword}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          teleboatAccount: {
                            ...config.teleboatAccount,
                            betPassword: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-100 font-mono"
                      placeholder="••••"
                    />
                  </div>
                </div>

                {/* 口座連動アクションボタンバー */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLinkAccount}
                      disabled={isLinking}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {isLinking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                      )}
                      <span>テレボート口座と連動する（接続認証）</span>
                    </button>

                    {config.connectionStatus === 'CONNECTED' && (
                      <button
                        type="button"
                        onClick={handleRefreshBalance}
                        disabled={isLinking}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="テレボート残高を照会"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLinking ? 'animate-spin' : ''}`} />
                        <span>残高照会・再同期</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openTeleboatWebPortal()}
                      className="px-3 py-1.5 bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600 rounded text-xs flex items-center gap-1 cursor-pointer"
                      title="テレボート公式投票サイトを別タブで開く"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                      <span>テレボート公式WEBを開く</span>
                    </button>

                    {config.connectionStatus === 'CONNECTED' && (
                      <button
                        type="button"
                        onClick={handleUnlink}
                        className="text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 cursor-pointer"
                      >
                        連動解除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 口座残高 & 入金・資金管理カード */}
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <h4 className="text-slate-100 font-bold text-sm">
                      テレボート連携 口座残高
                    </h4>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    最終照会: {config.lastSyncTime || '未照会'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">
                      利用可能残高 (投票減算・的中払戻金自動反映)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-amber-300">
                        ¥{config.accountBalance.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 font-sans">
                        {config.connectionStatus === 'CONNECTED' ? '（連動済）' : '（未連動）'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">クイック入金連動:</span>
                    <button
                      type="button"
                      onClick={() => handleAddBalance(10000)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700 cursor-pointer"
                    >
                      +1万円
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBalance(30000)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700 cursor-pointer"
                    >
                      +3万円
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBalance(50000)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-bold border border-slate-700 cursor-pointer"
                    >
                      +5万円
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">残高を直接入力して更新:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="5000"
                      value={config.accountBalance}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          accountBalance: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono font-bold text-right"
                    />
                    <span className="text-slate-400 font-bold">円</span>
                  </div>
                </div>
              </div>

              {/* 投票モード選択 (実口座連動 vs テスト) */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-200 block">
                  投票実行モード切替
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ ...config, testMode: false })}
                    className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                      !config.testMode
                        ? 'bg-emerald-950/90 border-emerald-500 ring-1 ring-emerald-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-300 text-xs">
                        実口座連動モード (本番)
                      </span>
                      {!config.testMode && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      テレボート口座と完全連動。投票時に残高から自動減算され、的中時に払戻金が自動反映されます。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ ...config, testMode: true })}
                    className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
                      config.testMode
                        ? 'bg-amber-950/80 border-amber-500 ring-1 ring-amber-400 shadow-sm'
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 text-xs">
                        シミュレーション・テストモード
                      </span>
                      {config.testMode && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      仮想残高を用いて投票受付番号を発行し、実際の出金を伴わずに自動投票サイクルをテストします。
                    </p>
                  </button>
                </div>
              </div>

              {/* テレボート公式側への実投票反映方法ガイド */}
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-slate-100 font-bold text-xs">
                      テレボート公式側への買い目・金額の実反映方法
                    </h4>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-bold">
                    4通りの直接反映
                  </span>
                </div>

                {/* ワンクリック即時反映ボタン */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-950 border border-emerald-500/80 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                      <span>🚀 テレボート公式を開いて買い目を自動反映（推奨）</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      公式テレボート（spweb.brtb.jp）を開き、URLハッシュ＆クリップボード経由で全{validBets.length}点を即時反映します
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        openTeleboatWebPortalWithPayload({
                          race,
                          candidates: validBets,
                          portalType: 'SP',
                          autoExecute: true,
                          betPassword: config.teleboatAccount.betPassword,
                        });
                        setLinkNotice('テレボート公式を開きました！画面右下の【連携バー】またはブックマークレットで自動投入されます');
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>スマホ版で反映</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openTeleboatWebPortalWithPayload({
                          race,
                          candidates: validBets,
                          portalType: 'PC',
                          autoExecute: true,
                          betPassword: config.teleboatAccount.betPassword,
                        });
                        setLinkNotice('PC版テレボートを開きました！ファイル投票へ買い目を自動展開します');
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>PC版で反映</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1">
                        <span>① 自動反映ブックマークレット</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                        テレボート公式画面を開いた状態で実行すると、画面上に専用HUDを展開しベットリストへ一瞬で投入します。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        broadcastTeleboatPendingVote({
                          race,
                          candidates: validBets,
                          betPassword: config.teleboatAccount.betPassword,
                        });
                        const script = generateTeleboatAutoFillBookmarklet(
                          race,
                          validBets,
                          config.teleboatAccount.betPassword
                        );
                        navigator.clipboard.writeText(script);
                        setLinkNotice('自動反映スクリプトをコピーしました！テレボート画面で実行してください');
                      }}
                      className="w-full py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded font-bold text-[10px] cursor-pointer"
                    >
                      スクリプトをコピー
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                        <span>② 公式ファイル投票 (PC版)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                        テレボートPC版の公式機能「ファイル投票」メニューに貼り付け、またはダウンロードしたTXTを読込可能です。
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const txt = generateTeleboatOfficialFileContent(race, validBets);
                          navigator.clipboard.writeText(txt);
                          setLinkNotice('公式ファイル投票TXTをコピーしました！PC版ファイル投票に貼付してください');
                        }}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded font-bold text-[10px] cursor-pointer"
                      >
                        TXTコピー
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTeleboatOfficialFile(race, validBets)}
                        className="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded font-bold text-[10px] cursor-pointer"
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-purple-300 mb-1 flex items-center gap-1">
                        <span>③ 全自動ユーザースクリプト</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                        Tampermonkey等に導入すると、テレボート画面上に専用連携バーが常時表示され、完全自動でセットします。
                      </p>
                    </div>
                    <a
                      href="/kyotei-teleboat-autofill.user.js"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-200 rounded font-bold text-[10px] cursor-pointer no-underline"
                    >
                      全自動拡張スクリプト導入
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 投票ログ・受付番号タブ */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  テレボート投票履歴ログ (直近{voteLogs.length}件)
                </span>
                <span className="text-[11px] text-slate-400">
                  ※各投票の受付番号と確定ログを保持
                </span>
              </div>

              {voteLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-950/60 rounded border border-dashed border-slate-800">
                  まだ投票ログがありません。「今すぐテレボートへ投票実行」を押すとここに受付番号が記録されます。
                </div>
              ) : (
                <div className="border border-slate-800 rounded overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">時刻</th>
                        <th className="py-1.5 px-3">場・R</th>
                        <th className="py-1.5 px-3">買い目</th>
                        <th className="py-1.5 px-3 text-right">金額</th>
                        <th className="py-1.5 px-3">受付番号</th>
                        <th className="py-1.5 px-3 text-center">結果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {voteLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 text-slate-400">{log.timestamp}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-200">
                            {log.venue} {log.raceNo}R
                          </td>
                          <td className="py-1.5 px-3 text-amber-300 font-bold">
                            3連単 {log.combination}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                            ¥{log.stake.toLocaleString()}
                          </td>
                          <td className="py-1.5 px-3 text-cyan-300 text-[11px]">
                            {log.receptionNo || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>
              テレボート公式API互換フォーマット | 3連単専用自動投票エンジン
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* 実残高同期・設定ポップアップ */}
      {showBalanceSync && (
        <TeleboatBalanceSyncModal
          currentBalance={config.accountBalance}
          onSaveBalance={(newBalance) => {
            onUpdateConfig({
              ...config,
              accountBalance: newBalance,
              lastSyncTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
              connectionStatus: 'CONNECTED',
            });
          }}
          onClose={() => setShowBalanceSync(false)}
        />
      )}
    </div>
  );
};
