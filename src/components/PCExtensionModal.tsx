import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Activity,
  Layers,
  Radio,
  MessageSquare,
  Terminal,
  RotateCcw,
  Wifi,
  WifiOff,
  Flame,
  ArrowRight,
  Info,
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

export type ChannelKey = 'dom' | 'broadcast' | 'custom_event' | 'post_message';

export interface ChannelDiagnostic {
  key: ChannelKey;
  name: string;
  shortName: string;
  description: string;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE';
  txCount: number;
  rxCount: number;
  successRate: number; // 0 - 100%
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  latencyHistory: number[];
  identifier: string;
  lastActiveTime: string;
}

export interface DiagnosticLogItem {
  id: string;
  timestamp: string;
  channel: 'DOM' | 'BC' | 'EVENT' | 'POST' | 'SYSTEM';
  direction: 'TX' | 'RX' | 'INFO';
  success: boolean;
  message: string;
  latencyMs?: number;
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
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [autoPulse, setAutoPulse] = useState<boolean>(true);

  // 4つの通信チャンネル診断ステート
  const [diagnostics, setDiagnostics] = useState<Record<ChannelKey, ChannelDiagnostic>>({
    dom: {
      key: 'dom',
      name: 'DOMブリッジ (Marker & Dataset)',
      shortName: 'DOM',
      description: 'HTML要素属性・DOMマーカーによる直接バインド同期',
      status: 'STANDBY',
      txCount: 0,
      rxCount: 0,
      successRate: 0,
      lastLatencyMs: null,
      avgLatencyMs: null,
      latencyHistory: [],
      identifier: '#__kyotei_pc_extension_bridge__',
      lastActiveTime: '--:--:--',
    },
    broadcast: {
      key: 'broadcast',
      name: 'BroadcastChannel (プロセス間通信)',
      shortName: 'BC',
      description: '拡張機能バックグラウンド・タブ間双方向バス通信',
      status: 'STANDBY',
      txCount: 0,
      rxCount: 0,
      successRate: 0,
      lastLatencyMs: null,
      avgLatencyMs: null,
      latencyHistory: [],
      identifier: 'kyotei_extension_bus',
      lastActiveTime: '--:--:--',
    },
    custom_event: {
      key: 'custom_event',
      name: 'カスタムイベント (CustomEvent)',
      shortName: 'EVENT',
      description: 'ブラウザDOM EventTargetを経由する高信頼同期ディスパッチ',
      status: 'STANDBY',
      txCount: 0,
      rxCount: 0,
      successRate: 0,
      lastLatencyMs: null,
      avgLatencyMs: null,
      latencyHistory: [],
      identifier: 'KYOTEI_DIAGNOSTIC_PONG',
      lastActiveTime: '--:--:--',
    },
    post_message: {
      key: 'post_message',
      name: 'postMessage (クロスフレーム通信)',
      shortName: 'POST',
      description: 'トップ・親・iframe境界を突破する標準メッセージパッシング',
      status: 'STANDBY',
      txCount: 0,
      rxCount: 0,
      successRate: 0,
      lastLatencyMs: null,
      avgLatencyMs: null,
      latencyHistory: [],
      identifier: 'window.postMessage',
      lastActiveTime: '--:--:--',
    },
  });

  // リアルタイム通信ログ
  const [logs, setLogs] = useState<DiagnosticLogItem[]>([
    {
      id: `init-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
      channel: 'SYSTEM',
      direction: 'INFO',
      success: true,
      message: '診断ダッシュボードを初期化しました (プローブ待機中)',
    },
  ]);

  // プローブ追跡用のRef
  const activeProbesRef = useRef<Map<string, { channel: ChannelKey; sentAt: number }>>(new Map());

  // ログ追加ヘルパー
  const addLog = useCallback(
    (
      channel: 'DOM' | 'BC' | 'EVENT' | 'POST' | 'SYSTEM',
      direction: 'TX' | 'RX' | 'INFO',
      success: boolean,
      message: string,
      latencyMs?: number
    ) => {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
          channel,
          direction,
          success,
          message,
          latencyMs,
        },
        ...prev.slice(0, 49), // 最新50件
      ]);
    },
    []
  );

  // 総合ヘルスレート計算
  const overallHealth = React.useMemo(() => {
    const list = Object.values(diagnostics);
    if (list.length === 0) return 0;
    const totalTx = list.reduce((sum, item) => sum + item.txCount, 0);
    const totalRx = list.reduce((sum, item) => sum + item.rxCount, 0);
    if (totalTx === 0) {
      return isExtensionConnected ? 100 : 0;
    }
    return Math.min(100, Math.round((totalRx / totalTx) * 100));
  }, [diagnostics, isExtensionConnected]);

  // チャンネルごとの成功レスポンス記録
  const recordChannelResponse = useCallback(
    (key: ChannelKey, latencyMs: number) => {
      const nowStr = new Date().toLocaleTimeString('ja-JP', { hour12: false });
      setDiagnostics((prev) => {
        const item = prev[key];
        const newRx = item.rxCount + 1;
        const newHistory = [...item.latencyHistory, latencyMs].slice(-20);
        const avg = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);
        const rate = item.txCount > 0 ? Math.min(100, Math.round((newRx / item.txCount) * 100)) : 100;

        return {
          ...prev,
          [key]: {
            ...item,
            rxCount: newRx,
            status: 'ONLINE',
            successRate: rate,
            lastLatencyMs: latencyMs,
            avgLatencyMs: avg,
            latencyHistory: newHistory,
            lastActiveTime: nowStr,
          },
        };
      });
    },
    []
  );

  // リアルタイム全チャンネル診断プローブ送出
  const runDiagnosticProbe = useCallback(() => {
    setIsProbing(true);
    const now = Date.now();
    const probeId = `probe-${now}-${Math.floor(Math.random() * 10000)}`;

    // 1. 各チャンネルのTX（送信）カウントを加算
    setDiagnostics((prev) => {
      const updated = { ...prev };
      (Object.keys(updated) as ChannelKey[]).forEach((key) => {
        const item = updated[key];
        const newTx = item.txCount + 1;
        const rate = Math.min(100, Math.round((item.rxCount / newTx) * 100));
        updated[key] = {
          ...item,
          txCount: newTx,
          successRate: rate,
        };
      });
      return updated;
    });

    // 2. DOMブリッジの直接検査 (同期的)
    const domStart = performance.now();
    const hasDom = !!(
      typeof document !== 'undefined' &&
      (document.getElementById('__kyotei_pc_extension_bridge__') ||
        document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
        document.documentElement.dataset.kyoteiExtension === 'connected' ||
        isSimulationMode)
    );
    const domLatency = Math.max(0, Math.round(performance.now() - domStart));

    if (hasDom) {
      recordChannelResponse('dom', domLatency);
      addLog('DOM', 'RX', true, `DOMブリッジを即時検出 (${domLatency}ms)`, domLatency);
    } else {
      addLog('DOM', 'TX', false, 'DOM要素・属性未検出 (待機中)');
    }

    // 3. BroadcastChannel プローブ送出
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('kyotei_extension_bus');
        activeProbesRef.current.set(`${probeId}-bc`, { channel: 'broadcast', sentAt: now });
        bc.postMessage({
          type: 'KYOTEI_DIAGNOSTIC_PING',
          channel: 'broadcast_channel',
          probeId: `${probeId}-bc`,
          timestamp: now,
        });
        addLog('BC', 'TX', true, `BroadcastChannel経由でプローブ送信 (ID: ${probeId.slice(-6)})`);
        setTimeout(() => {
          try {
            bc.close();
          } catch (e) {}
        }, 300);
      }
    } catch (e) {
      addLog('BC', 'TX', false, 'BroadcastChannel送出エラー');
    }

    // 4. カスタムイベント プローブ送出
    try {
      activeProbesRef.current.set(`${probeId}-event`, { channel: 'custom_event', sentAt: now });
      const evPayload = {
        type: 'KYOTEI_DIAGNOSTIC_PING',
        channel: 'custom_event',
        probeId: `${probeId}-event`,
        timestamp: now,
      };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('KYOTEI_DIAGNOSTIC_PING', { detail: evPayload }));
      }
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('KYOTEI_DIAGNOSTIC_PING', { detail: evPayload }));
      }
      addLog('EVENT', 'TX', true, 'CustomEvent (KYOTEI_DIAGNOSTIC_PING) 送出');
    } catch (e) {
      addLog('EVENT', 'TX', false, 'CustomEvent送出エラー');
    }

    // 5. postMessage プローブ送出
    try {
      activeProbesRef.current.set(`${probeId}-post`, { channel: 'post_message', sentAt: now });
      const msgPayload = {
        type: 'KYOTEI_DIAGNOSTIC_PING',
        channel: 'post_message',
        probeId: `${probeId}-post`,
        timestamp: now,
      };
      window.postMessage(msgPayload, '*');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msgPayload, '*');
      }
      addLog('POST', 'TX', true, 'postMessage (全フレーム) プローブ送信');
    } catch (e) {
      addLog('POST', 'TX', false, 'postMessage送出エラー');
    }

    // 6. シミュレーションモード有効時の擬似レスポンス
    if (isSimulationMode) {
      setTimeout(() => {
        const bcLat = Math.floor(12 + Math.random() * 18);
        const evLat = Math.floor(4 + Math.random() * 8);
        const postLat = Math.floor(6 + Math.random() * 10);
        recordChannelResponse('broadcast', bcLat);
        recordChannelResponse('custom_event', evLat);
        recordChannelResponse('post_message', postLat);
        addLog('BC', 'RX', true, `[シミュレーション] BroadcastChannel応答 (${bcLat}ms)`, bcLat);
        addLog('EVENT', 'RX', true, `[シミュレーション] CustomEvent応答 (${evLat}ms)`, evLat);
        addLog('POST', 'RX', true, `[シミュレーション] postMessage応答 (${postLat}ms)`, postLat);
      }, 50);
    }

    // プローブ終了フラグ
    setTimeout(() => {
      setIsProbing(false);
    }, 600);
  }, [addLog, recordChannelResponse, isSimulationMode]);

  // レスポンス受信リスナー (BroadcastChannel, CustomEvent, postMessage)
  useEffect(() => {
    // A. BroadcastChannel 受信
    let bcListener: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bcListener = new BroadcastChannel('kyotei_extension_bus');
        bcListener.onmessage = (ev) => {
          if (!ev || !ev.data) return;
          const data = ev.data;
          if (
            data.type === 'KYOTEI_DIAGNOSTIC_PONG' ||
            data.type === 'KYOTEI_EXTENSION_PONG' ||
            data.type === 'KYOTEI_EXTENSION_INSTALLED' ||
            data.type === 'KYOTEI_EXTENSION_HEARTBEAT'
          ) {
            const probeInfo = data.probeId ? activeProbesRef.current.get(data.probeId) : null;
            const latency = probeInfo ? Math.max(1, Date.now() - probeInfo.sentAt) : 2;
            recordChannelResponse('broadcast', latency);
            addLog(
              'BC',
              'RX',
              true,
              `BroadcastChannel 応答受信: ${data.type} (${latency}ms)`,
              latency
            );
          }
        };
      }
    } catch (e) {}

    // B. CustomEvent 受信
    const handleCustomPong = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const probeInfo = detail.probeId ? activeProbesRef.current.get(detail.probeId) : null;
      const latency = probeInfo ? Math.max(1, Date.now() - probeInfo.sentAt) : 1;
      recordChannelResponse('custom_event', latency);
      addLog(
        'EVENT',
        'RX',
        true,
        `CustomEvent 応答受信: ${detail.type || ev.type} (${latency}ms)`,
        latency
      );
    };

    window.addEventListener('KYOTEI_DIAGNOSTIC_PONG', handleCustomPong);
    window.addEventListener('KYOTEI_EXTENSION_PONG', handleCustomPong);
    window.addEventListener('KYOTEI_EXTENSION_INSTALLED', handleCustomPong);
    document.addEventListener('KYOTEI_DIAGNOSTIC_PONG', handleCustomPong);
    document.addEventListener('KYOTEI_EXTENSION_PONG', handleCustomPong);

    // C. postMessage 受信
    const handlePostMessage = (ev: MessageEvent) => {
      if (!ev.data) return;
      const data = ev.data;
      if (
        data.type === 'KYOTEI_DIAGNOSTIC_PONG' ||
        data.type === 'KYOTEI_EXTENSION_PONG' ||
        data.type === 'KYOTEI_EXTENSION_INSTALLED' ||
        data.type === 'KYOTEI_EXTENSION_HEARTBEAT'
      ) {
        const probeInfo = data.probeId ? activeProbesRef.current.get(data.probeId) : null;
        const latency = probeInfo ? Math.max(1, Date.now() - probeInfo.sentAt) : 3;
        recordChannelResponse('post_message', latency);
        addLog(
          'POST',
          'RX',
          true,
          `postMessage 応答受信: ${data.type} (${latency}ms)`,
          latency
        );
      }
    };

    window.addEventListener('message', handlePostMessage);

    return () => {
      if (bcListener) {
        try {
          bcListener.close();
        } catch (e) {}
      }
      window.removeEventListener('KYOTEI_DIAGNOSTIC_PONG', handleCustomPong);
      window.removeEventListener('KYOTEI_EXTENSION_PONG', handleCustomPong);
      window.removeEventListener('KYOTEI_EXTENSION_INSTALLED', handleCustomPong);
      document.removeEventListener('KYOTEI_DIAGNOSTIC_PONG', handleCustomPong);
      document.removeEventListener('KYOTEI_EXTENSION_PONG', handleCustomPong);
      window.removeEventListener('message', handlePostMessage);
    };
  }, [addLog, recordChannelResponse]);

  // 初回および定期リアルタイム監視 (Auto Pulse)
  useEffect(() => {
    runDiagnosticProbe();

    if (!autoPulse) return;
    const interval = setInterval(() => {
      runDiagnosticProbe();
    }, 2800);

    return () => clearInterval(interval);
  }, [autoPulse, runDiagnosticProbe]);

  // 統計カウンタリセット
  const handleResetCounters = () => {
    activeProbesRef.current.clear();
    setDiagnostics({
      dom: {
        key: 'dom',
        name: 'DOMブリッジ (Marker & Dataset)',
        shortName: 'DOM',
        description: 'HTML要素属性・DOMマーカーによる直接バインド同期',
        status: 'STANDBY',
        txCount: 0,
        rxCount: 0,
        successRate: 0,
        lastLatencyMs: null,
        avgLatencyMs: null,
        latencyHistory: [],
        identifier: '#__kyotei_pc_extension_bridge__',
        lastActiveTime: '--:--:--',
      },
      broadcast: {
        key: 'broadcast',
        name: 'BroadcastChannel (プロセス間通信)',
        shortName: 'BC',
        description: '拡張機能バックグラウンド・タブ間双方向バス通信',
        status: 'STANDBY',
        txCount: 0,
        rxCount: 0,
        successRate: 0,
        lastLatencyMs: null,
        avgLatencyMs: null,
        latencyHistory: [],
        identifier: 'kyotei_extension_bus',
        lastActiveTime: '--:--:--',
      },
      custom_event: {
        key: 'custom_event',
        name: 'カスタムイベント (CustomEvent)',
        shortName: 'EVENT',
        description: 'ブラウザDOM EventTargetを経由する高信頼同期ディスパッチ',
        status: 'STANDBY',
        txCount: 0,
        rxCount: 0,
        successRate: 0,
        lastLatencyMs: null,
        avgLatencyMs: null,
        latencyHistory: [],
        identifier: 'KYOTEI_DIAGNOSTIC_PONG',
        lastActiveTime: '--:--:--',
      },
      post_message: {
        key: 'post_message',
        name: 'postMessage (クロスフレーム通信)',
        shortName: 'POST',
        description: 'トップ・親・iframe境界を突破する標準メッセージパッシング',
        status: 'STANDBY',
        txCount: 0,
        rxCount: 0,
        successRate: 0,
        lastLatencyMs: null,
        avgLatencyMs: null,
        latencyHistory: [],
        identifier: 'window.postMessage',
        lastActiveTime: '--:--:--',
      },
    });
    setLogs([
      {
        id: `reset-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        channel: 'SYSTEM',
        direction: 'INFO',
        success: true,
        message: '診断統計カウンターをリセットしました',
      },
    ]);
  };

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
    addLog('SYSTEM', 'TX', true, `買い目テスト送信を実行: 3連単 ${candidates.length}点`);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100">
        {/* ヘッダー */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-100 text-sm">
                  PC版 専用拡張機能マネージャー & リアルタイム通信診断
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
                    ? `🟢 接続確立済 (${isSimulationMode ? 'シミュレーション' : 'READY v1.1.0'})`
                    : '⚪ 拡張機能 未検出'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Chrome / Edge 対応：テレボートPC版（ib.mbrace.or.jp）直結・全自動投票・マルチチャンネルリアルタイム診断
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

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs font-sans">
          {/* ========================================================= */}
          {/* 1. リアルタイム通信診断ダッシュボード (メイン新機能) */}
          {/* ========================================================= */}
          <div className="bg-slate-950 border border-blue-600/50 rounded-xl p-4 shadow-xl space-y-3.5">
            {/* ダッシュボードヘッダー */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600/20 text-cyan-400 border border-blue-500/30">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm flex items-center gap-2">
                    <span>テレボート接続状況 リアルタイム診断ダッシュボード</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      LIVE PROBE
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    DOMブリッジ、BroadcastChannel、カスタムイベント、postMessageの各チャンネル受信成功率とレイテンシをリアルタイム測定
                  </p>
                </div>
              </div>

              {/* 右側アクション群 */}
              <div className="flex items-center gap-2">
                {/* 自動パルストグル */}
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={autoPulse}
                    onChange={(e) => setAutoPulse(e.target.checked)}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <span>自動監視 (2.8秒毎)</span>
                </label>

                {/* 手動診断実行ボタン */}
                <button
                  type="button"
                  onClick={runDiagnosticProbe}
                  disabled={isProbing}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                  <span>{isProbing ? '計測中...' : '診断プローブ実行'}</span>
                </button>

                {/* リセットボタン */}
                <button
                  type="button"
                  onClick={handleResetCounters}
                  className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                  title="診断統計カウンタをリセット"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 総合ステータススコア & テレボート適格判定バー */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono font-black border shadow-inner ${
                    overallHealth >= 80
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/80'
                      : overallHealth > 0
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/80'
                      : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  <span className="text-sm">{overallHealth}%</span>
                  <span className="text-[8px] uppercase tracking-wider font-sans font-bold">Health</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">総合リンク健全度:</span>
                    <span
                      className={`font-black text-xs flex items-center gap-1 ${
                        overallHealth >= 80
                          ? 'text-emerald-400'
                          : overallHealth > 0
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {overallHealth >= 80 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>OPTIMAL (完全疎通・即時自動投票可能)</span>
                        </>
                      ) : overallHealth > 0 ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>DEGRADED (一部チャンネル応答あり)</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>OFFLINE (拡張機能未検出 / 待機中)</span>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    テレボートPC版公式（<span className="font-mono text-cyan-300">ib.mbrace.or.jp</span>）連携準備:{' '}
                    <strong className={isExtensionConnected ? 'text-emerald-300' : 'text-amber-400'}>
                      {isExtensionConnected ? '✅ 接続可能・ファイル投票READY' : '⚠️ 拡張機能接続待機中'}
                    </strong>
                  </p>
                </div>
              </div>

              {/* シミュレーションスイッチ */}
              {onToggleSimulationMode && (
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-300 font-bold">シミュレーション接続:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSimulationMode}
                      onChange={(e) => onToggleSimulationMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              )}
            </div>

            {/* 4つの通信チャンネル診断カード グリッド */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* カード1: DOMブリッジ */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  diagnostics.dom.rxCount > 0
                    ? 'bg-slate-900 border-emerald-500/60 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>DOMブリッジ</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                      diagnostics.dom.rxCount > 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {diagnostics.dom.rxCount > 0 ? 'ONLINE' : 'WAITING'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">受信成功率:</span>
                  <span
                    className={`font-mono text-base font-black ${
                      diagnostics.dom.rxCount > 0 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {diagnostics.dom.successRate}%
                  </span>
                </div>

                {/* ゲージバー */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden my-1.5 border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${diagnostics.dom.successRate}%` }}
                  />
                </div>

                <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>送信/受信:</span>
                    <span className="text-slate-200">
                      TX:{diagnostics.dom.txCount} / RX:{diagnostics.dom.rxCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>レイテンシ:</span>
                    <span className="text-cyan-300">
                      {diagnostics.dom.lastLatencyMs !== null
                        ? `${diagnostics.dom.lastLatencyMs}ms (即時)`
                        : '--'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate mt-1">
                    ID: {diagnostics.dom.identifier}
                  </div>
                </div>
              </div>

              {/* カード2: BroadcastChannel */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  diagnostics.broadcast.rxCount > 0
                    ? 'bg-slate-900 border-cyan-500/60 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>BroadcastChannel</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                      diagnostics.broadcast.rxCount > 0
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-600'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {diagnostics.broadcast.rxCount > 0 ? 'ONLINE' : 'WAITING'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">受信成功率:</span>
                  <span
                    className={`font-mono text-base font-black ${
                      diagnostics.broadcast.rxCount > 0 ? 'text-cyan-400' : 'text-slate-500'
                    }`}
                  >
                    {diagnostics.broadcast.successRate}%
                  </span>
                </div>

                {/* ゲージバー */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden my-1.5 border border-slate-800">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${diagnostics.broadcast.successRate}%` }}
                  />
                </div>

                <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>送信/受信:</span>
                    <span className="text-slate-200">
                      TX:{diagnostics.broadcast.txCount} / RX:{diagnostics.broadcast.rxCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>レイテンシ:</span>
                    <span className="text-cyan-300">
                      {diagnostics.broadcast.lastLatencyMs !== null
                        ? `${diagnostics.broadcast.lastLatencyMs}ms`
                        : '--'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate mt-1">
                    バス: {diagnostics.broadcast.identifier}
                  </div>
                </div>
              </div>

              {/* カード3: カスタムイベント (CustomEvent) */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  diagnostics.custom_event.rxCount > 0
                    ? 'bg-slate-900 border-amber-500/60 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>カスタムイベント</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                      diagnostics.custom_event.rxCount > 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {diagnostics.custom_event.rxCount > 0 ? 'ONLINE' : 'WAITING'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">受信成功率:</span>
                  <span
                    className={`font-mono text-base font-black ${
                      diagnostics.custom_event.rxCount > 0 ? 'text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {diagnostics.custom_event.successRate}%
                  </span>
                </div>

                {/* ゲージバー */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden my-1.5 border border-slate-800">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${diagnostics.custom_event.successRate}%` }}
                  />
                </div>

                <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>送信/受信:</span>
                    <span className="text-slate-200">
                      TX:{diagnostics.custom_event.txCount} / RX:{diagnostics.custom_event.rxCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>レイテンシ:</span>
                    <span className="text-cyan-300">
                      {diagnostics.custom_event.lastLatencyMs !== null
                        ? `${diagnostics.custom_event.lastLatencyMs}ms`
                        : '--'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate mt-1">
                    Event: {diagnostics.custom_event.identifier}
                  </div>
                </div>
              </div>

              {/* カード4: postMessage */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  diagnostics.post_message.rxCount > 0
                    ? 'bg-slate-900 border-purple-500/60 shadow-xs'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>postMessage</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono ${
                      diagnostics.post_message.rxCount > 0
                        ? 'bg-purple-950 text-purple-300 border border-purple-600'
                        : 'bg-slate-950 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {diagnostics.post_message.rxCount > 0 ? 'ONLINE' : 'WAITING'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400">受信成功率:</span>
                  <span
                    className={`font-mono text-base font-black ${
                      diagnostics.post_message.rxCount > 0 ? 'text-purple-400' : 'text-slate-500'
                    }`}
                  >
                    {diagnostics.post_message.successRate}%
                  </span>
                </div>

                {/* ゲージバー */}
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden my-1.5 border border-slate-800">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${diagnostics.post_message.successRate}%` }}
                  />
                </div>

                <div className="space-y-0.5 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>送信/受信:</span>
                    <span className="text-slate-200">
                      TX:{diagnostics.post_message.txCount} / RX:{diagnostics.post_message.rxCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>レイテンシ:</span>
                    <span className="text-cyan-300">
                      {diagnostics.post_message.lastLatencyMs !== null
                        ? `${diagnostics.post_message.lastLatencyMs}ms`
                        : '--'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate mt-1">
                    全フレーム / iframe対応
                  </div>
                </div>
              </div>
            </div>

            {/* 診断通信ログ コンソール */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-1 font-sans">
                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>リアルタイム通信プローブ ログストリーム (最新50件)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {isProbing ? '📡 送信・待機中...' : '🟢 待機中 (Active)'}
                </span>
              </div>

              <div className="h-28 overflow-y-auto space-y-1 pr-1 select-text">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2 py-0.5 text-[10px] border-b border-slate-900/60 leading-tight"
                  >
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        log.channel === 'DOM'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : log.channel === 'BC'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : log.channel === 'EVENT'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : log.channel === 'POST'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.channel}
                    </span>
                    <span
                      className={`font-bold shrink-0 ${
                        log.direction === 'TX'
                          ? 'text-cyan-400'
                          : log.direction === 'RX'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      [{log.direction}]
                    </span>
                    <span
                      className={`truncate flex-1 ${
                        log.success ? 'text-slate-300' : 'text-rose-400 font-bold'
                      }`}
                    >
                      {log.message}
                    </span>
                    {log.latencyMs !== undefined && (
                      <span className="text-cyan-300 shrink-0 font-bold">
                        +{log.latencyMs}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. トラブルシューティング & 特効薬（未検出時の即時解決ガイド） */}
          {/* ========================================================= */}
          {!isExtensionConnected && (
            <div className="bg-amber-950/40 border border-amber-500/50 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>拡張機能アイコンが「正常稼働中」なのに画面が「未検出」の場合の解決法</span>
                </h4>
                <span className="text-[10px] text-amber-200/80 font-bold">
                  Chromeセキュリティ仕様によるもの
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Chromeの仕様上、新しく拡張機能を追加した際、<strong>既存の開いていたタブには「F5再読み込み」を行うまで通信プログラムが注入されません</strong>。下のボタンで1クリック解決できます：
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReloadPage}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>① 今すぐページを再読み込み (F5)</span>
                </button>

                {onToggleSimulationMode && (
                  <button
                    type="button"
                    onClick={() => onToggleSimulationMode(true)}
                    className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>② 評価・テスト用シミュレーション接続をON</span>
                  </button>
                )}

                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer no-underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>③ 別タブで直接開く</span>
                </a>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. ダウンロード & テスト送信カード */}
          {/* ========================================================= */}
          <div className="bg-gradient-to-br from-blue-950/80 via-slate-950 to-slate-900 border border-blue-600/60 p-4 rounded-xl shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>PCブラウザ（Chrome / Edge / Brave）用 拡張機能 v1.1.0</span>
                </div>
                <h4 className="text-base font-black text-white">
                  テレボートPC 自動投票 拡張機能 最新パッケージ (マルチチャンネル診断対応)
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  iframe・全フレーム対応・文字化けゼロ。1クリックでZIPを解凍してChrome/Edgeに読み込むだけで、テレボートPC版への完全自動投入・全自動購入・受付番号同期が即座に有効化されます。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadPCExtensionZip}
                  className="px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4 stroke-[3]" />
                  <span>最新ZIPをダウンロード (v1.1.0)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDispatch}
                  className="px-4 py-3 rounded-lg bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="現在選択中の買い目をテレボートPCへ送信"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>{testSent ? '買い目送信完了！' : '買い目をテスト送信'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. インストール手順 (3ステップ) */}
          {/* ========================================================= */}
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
                  左上の「パッケージ化されていない拡張機能を読み込む」ボタンを押し、解凍したフォルダを選択します。本画面のF5（再読み込み）で即座に緑色で「接続中」になります！
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
