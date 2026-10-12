import React, { useState, useEffect } from 'react';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send,
  Zap,
  Monitor,
  X,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Sliders,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { RaceInfo, BetCandidate } from '../types/kyotei';
import {
  downloadPCExtensionZip,
  dispatchVoteToPCExtension,
} from '../services/teleboatService';

interface PCExtensionModalProps {
  race: RaceInfo;
  candidates: BetCandidate[];
  isExtensionConnected: boolean;
  betPassword?: string;
  isSimulationMode?: boolean;
  onClose: () => void;
  onPingExtension?: (showToast?: boolean) => void;
  onToggleSimulationMode?: (enabled: boolean) => void;
}

export const PCExtensionModal: React.FC<PCExtensionModalProps> = ({
  race,
  candidates,
  isExtensionConnected,
  betPassword,
  isSimulationMode = false,
  onClose,
  onPingExtension,
  onToggleSimulationMode,
}) => {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [testSent, setTestSent] = useState<boolean>(false);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    domBridgeFound: boolean;
    version: string;
    lastPingTime: string;
  }>({
    domBridgeFound: false,
    version: '1.1.0',
    lastPingTime: '',
  });

  // 診断情報の更新
  useEffect(() => {
    const checkDom = () => {
      const hasDomMarker = !!(
        document.getElementById('__kyotei_pc_extension_bridge__') ||
        document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
        document.documentElement.dataset.kyoteiExtension === 'connected'
      );
      const version =
        document.documentElement.getAttribute('data-kyotei-extension-version') ||
        document.documentElement.dataset.kyoteiExtensionVersion ||
        '1.1.0';

      setDiagnosticInfo({
        domBridgeFound: hasDomMarker,
        version: version,
        lastPingTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
      });
    };

    checkDom();
  }, [isExtensionConnected]);

  const handleCopyChromeUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTestDispatch = () => {
    dispatchVoteToPCExtension({
      race,
      candidates,
      betPassword,
      autoExecute: false,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handlePing = () => {
    setPingStatus('testing');

    if (onPingExtension) {
      onPingExtension(true);
    } else {
      window.postMessage({ type: 'KYOTEI_CHECK_EXTENSION', timestamp: Date.now() }, '*');
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'KYOTEI_CHECK_EXTENSION', timestamp: Date.now() }, '*');
        }
      } catch (e) {}
    }

    setTimeout(() => {
      const hasDomMarker = !!(
        document.getElementById('__kyotei_pc_extension_bridge__') ||
        document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
        document.documentElement.dataset.kyoteiExtension === 'connected'
      );
      if (isExtensionConnected || hasDomMarker || isSimulationMode) {
        setPingStatus('success');
      } else {
        setPingStatus('failed');
      }
      setTimeout(() => setPingStatus('idle'), 3500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* ヘッダー */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-100 text-sm">
                  PC版 専用拡張機能マネージャー
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                    isExtensionConnected
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isExtensionConnected ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  {isExtensionConnected
                    ? `🟢 拡張機能 接続中 (${isSimulationMode ? 'シミュレーション' : 'READY v1.1.0'})`
                    : '⚪ 拡張機能 未検出'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Chrome / Edge 対応：テレボートPC版（ib.mbrace.or.jp）直結・全自動投票・受付番号同期システム
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

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* ダウンロード & 接続ステータス メインカード */}
          <div className="bg-gradient-to-br from-blue-950/80 via-slate-950 to-slate-900 border border-blue-600/60 p-4 rounded-xl shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>PCブラウザ（Chrome / Edge / Brave）用 拡張機能 v1.1.0</span>
                </div>
                <h4 className="text-base font-black text-white">
                  テレボートPC 自動投票 拡張機能 最新パッケージ
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  iframe・全フレーム対応・文字化けゼロ。1クリックでZIPを解凍してChrome/Edgeに読み込むだけで、テレボートPC版への完全自動投入・全自動購入・受付番号同期が即座に有効化されます。
                </p>
              </div>

              <button
                type="button"
                onClick={downloadPCExtensionZip}
                className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
              >
                <Download className="w-4 h-4 stroke-[3]" />
                <span>最新ZIPをダウンロード (v1.1.0)</span>
              </button>
            </div>

            {/* 接続テスト・状態バー */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">通信リンク状態:</span>
                <span
                  className={`font-bold flex items-center gap-1.5 ${
                    isExtensionConnected ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {isExtensionConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>拡張機能と正常に双方向リンク確立済 (READY)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>未接続（拡張機能をインストール後、下の「接続テスト」を押してください）</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePing}
                  className={`px-3 py-1.5 rounded font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    pingStatus === 'success'
                      ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-600'
                      : pingStatus === 'failed'
                      ? 'bg-amber-900/80 text-amber-200 border border-amber-600'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
                  }`}
                >
                  {pingStatus === 'testing' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {pingStatus === 'testing'
                      ? 'シグナル確認中...'
                      : pingStatus === 'success'
                      ? '✅ 接続成功！'
                      : pingStatus === 'failed'
                      ? '⚠️ 未検出 (再確認)'
                      : '接続テスト (PING)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDispatch}
                  className="px-3 py-1.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                  title="現在選択中の買い目をテレボートPCへ送信"
                >
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span>{testSent ? '買い目送信完了！' : '買い目をテスト送信'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 診断・シミュレーション パネル */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>拡張機能 通信診断 & テストモード</span>
              </h4>

              {onToggleSimulationMode && (
                <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={isSimulationMode}
                    onChange={(e) => onToggleSimulationMode(e.target.checked)}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-300">
                    評価・テスト用シミュレーション接続
                  </span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80">
                <div className="text-slate-400">DOMブリッジ検出</div>
                <div className="font-bold mt-0.5 flex items-center gap-1">
                  {diagnosticInfo.domBridgeFound || isExtensionConnected ? (
                    <span className="text-emerald-400">🟢 正常検出 (Bridge Ready)</span>
                  ) : (
                    <span className="text-slate-400">⚪ 待機中</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80">
                <div className="text-slate-400">通信チャンネル規格</div>
                <div className="font-bold mt-0.5 text-cyan-300">
                  全フレーム・BroadcastChannel・DOM対応
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded border border-slate-800/80">
                <div className="text-slate-400">拡張機能パッケージ版</div>
                <div className="font-bold mt-0.5 text-slate-200">
                  v{diagnosticInfo.version} 最新版
                </div>
              </div>
            </div>

            {isSimulationMode && (
              <p className="text-[10px] text-cyan-300 bg-cyan-950/40 p-2 rounded border border-cyan-800/50">
                💡 <strong>シミュレーション接続が有効です:</strong> 拡張機能をインストールできない環境でも、PC拡張機能投票フロー、画面遷移、買い目ファイル生成、受付番号返信シミュレーションを完全にテストできます。
              </p>
            )}
          </div>

          {/* インストール手順 (3ステップ) */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>拡張機能のインストール手順（約1分で完了）</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* ステップ1 */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                  1
                </div>
                <h5 className="font-bold text-white text-xs">ZIPを展開（解凍）</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  上のボタンからダウンロードした <strong className="text-slate-200 font-mono">kyotei-teleboat-pc-extension.zip</strong> を右クリックし「すべて展開」で解凍します。
                </p>
              </div>

              {/* ステップ2 */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                  2
                </div>
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-white text-xs">拡張機能画面を開く</h5>
                  <button
                    type="button"
                    onClick={handleCopyChromeUrl}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl ? 'コピー済' : 'URLコピー'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Chromeのアドレスバーに <code className="text-cyan-300 font-mono bg-slate-950 px-1 py-0.5 rounded">chrome://extensions</code> を入力して移動し、右上の「デベロッパーモード」をONにします。
                </p>
              </div>

              {/* ステップ3 */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">
                  3
                </div>
                <h5 className="font-bold text-white text-xs">解凍先フォルダを読み込む</h5>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  左上の「パッケージ化されていない拡張機能を読み込む」ボタンを押し、手順1で解凍したフォルダを選択します。本画面の「接続テスト」を押すと即座に緑色で「接続中」になります！
                </p>
              </div>
            </div>
          </div>

          {/* トラブルシューティング / 接続しない場合の対処法 */}
          {!isExtensionConnected && !isSimulationMode && (
            <div className="bg-amber-950/30 border border-amber-600/40 p-3.5 rounded-lg space-y-2">
              <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>「未検出」のまま接続しない場合のチェックリスト</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 leading-relaxed pl-1">
                <li>
                  <strong>ZIPの解凍漏れ:</strong> ダウンロードしたZIPファイルを右クリックし「すべて展開」を行ってから読み込んでください（ZIPファイルのままだとChromeが読み込めません）。
                </li>
                <li>
                  <strong>デベロッパーモード:</strong> Chromeの <code className="font-mono text-cyan-300">chrome://extensions</code> 画面右上にある「デベロッパーモード」がONになっているか確認してください。
                </li>
                <li>
                  <strong>ページの再読み込み:</strong> 拡張機能を読み込んだ後、Kyotei Analyzerの画面を一度キーボードの「F5」またはブラウザの更新ボタンで再読み込みしてください。
                </li>
                <li>
                  <strong>今すぐ試したい場合:</strong> 上部の「評価・テスト用シミュレーション接続」をONにすると、即座に拡張機能連携モードを有効にして動作検証できます。
                </li>
              </ul>
            </div>
          )}

          {/* 拡張機能の主な機能 */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>拡張機能が提供するPC版自動化機能</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="font-bold text-emerald-400 block">⚡ 公式ファイル投票への1秒即時反映</span>
                <p className="text-slate-400 leading-relaxed">
                  テレボートPC公式のファイル投票規格に準拠。3連単の複数買い目を1クリックで一括セットします。
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="font-bold text-cyan-400 block">🤖 画面内フロートHUD連携</span>
                <p className="text-slate-400 leading-relaxed">
                  テレボート画面（ib.mbrace.or.jp）の右下に「Kyotei PC 自動投票」操作パネルが自動常駐。レースや買い目、合計金額をひと目で確認できます。
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="font-bold text-purple-400 block">🔐 全自動投票（Auto-Buy）オプション</span>
                <p className="text-slate-400 leading-relaxed">
                  暗証番号入力から投票確定まで完全自動化が可能。設定でいつでも手動確認・自動購入を切り替えられます。
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 space-y-1">
                <span className="font-bold text-amber-400 block">🔄 公式受付番号の自動同期</span>
                <p className="text-slate-400 leading-relaxed">
                  購入完了時に公式受付番号を自動検知してKyotei Analyzerへ即時フィードバック。実残高（購入限度額）から正確に減算されます。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <a
            href="https://ib.mbrace.or.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer no-underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>テレボート公式PC版を開く (ib.mbrace.or.jp)</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
