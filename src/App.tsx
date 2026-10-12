/**
 * Kyotei Analyzer Pro 5
 * Windows 10 / 11 競艇予想・資金配分・収支シミュレーション・投票支援アプリケーション
 * Ver. 1.0 (Clean-room implementation based on official specification)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { RaceHeaderSection } from './components/RaceHeaderSection';
import { BoatTable } from './components/BoatTable';
import { PredictionSection } from './components/PredictionSection';
import { AllocationPanel } from './components/AllocationPanel';
import { StatusStamp } from './components/StatusStamp';
import { StatisticsBar } from './components/StatisticsBar';
import { ResultModal } from './components/ResultModal';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { FetchRaceModal } from './components/FetchRaceModal';
import { ExeDistributionModal } from './components/ExeDistributionModal';
import { AutoVoteModal } from './components/AutoVoteModal';
import { AIPredictionModal } from './components/AIPredictionModal';
import { AutoPilotControlBar } from './components/AutoPilotControlBar';
import { AutoPilotModal } from './components/AutoPilotModal';
import { TeleboatBalanceSyncModal } from './components/TeleboatBalanceSyncModal';
import { TeleboatRealVoteModal } from './components/TeleboatRealVoteModal';
import { PCExtensionModal } from './components/PCExtensionModal';
import { generateAIPrediction, AIPredictionResult } from './services/aiPredictionService';
import {
  AutoVoteConfig,
  VoteLogItem,
  DEFAULT_AUTOVOTE_CONFIG,
  executeAutoVote,
  recordRealVoteConfirmation,
} from './services/teleboatService';
import {
  playAutoPilotSound,
  evaluateAutoPilotSafety,
  AUTOPILOT_STAGE_META,
  getNextPatrolTarget,
} from './services/autopilotService';

import {
  RaceInfo,
  BoatData,
  WeatherCondition,
  BetCandidate,
  AppSettings,
  RaceHistoryRecord,
  AllocationMode,
  AppStatus,
  BetType,
  BET_TYPE_LABELS,
  VenueStatistics,
  AutoPilotConfig,
  AutoPilotStage,
  AutoPilotLogItem,
  DEFAULT_AUTOPILOT_CONFIG,
} from './types/kyotei';
import { DEFAULT_SETTINGS, VENUES } from './constants/venues';
import { PRESET_RACES } from './data/presetRaces';
import { REAL_OFFICIAL_HISTORY_PACK } from './data/realRaceDataset';
import {
  calculateBoatScores,
  generateFivePointBets,
  generateBetsByType,
  simulateRealisticOdds,
} from './services/predictionEngine';
import { allocateMoney, AllocationResult } from './services/moneyAllocator';
import { evaluateRaceStatus, JudgmentResult } from './services/judgmentEngine';
import { calculateStatistics, calculateVenueStatistics } from './services/statisticsService';
import { isBetHit, getEstimatedOfficialPayout } from './services/betEvaluationHelper';
import { exportHistoryToCsv } from './services/csvExportService';
import {
  fetchRaceCard,
  fetchRaceResult,
  batchFetchTodayVenues,
  ActiveVenueSchedule,
} from './services/raceDataProvider';
import {
  checkRaceConfirmation,
  getStandardDeadlineTime,
  checkRaceVoteEligibility,
} from './services/deadlineService';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Award,
  ArrowRight,
  Trash2,
  Zap,
  RefreshCw,
  X,
  Clock,
} from 'lucide-react';

export interface LatestResultNotice {
  venue: string;
  raceNo: number;
  raceTitle: string;
  finishOrder: string;
  first: number;
  second: number;
  third: number;
  winningTechnique: string;
  officialPayout: number;
  popularityRank: number;
  isHit: boolean;
  isConfirmed: boolean;
  statusMessage?: string;
  totalStake: number;
  totalReturn: number;
  profit: number;
  hitCombination?: string;
}

export default function App() {
  // 1. 設定の永続化ステート
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('kyotei_analyzer_settings_v1');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // 2. 履歴の永続化ステート（公式確定実データパックを標準搭載）
  const [history, setHistory] = useState<RaceHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_analyzer_history_v2');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      const savedV1 = localStorage.getItem('kyotei_analyzer_history_v1');
      if (savedV1 !== null) {
        const parsed = JSON.parse(savedV1);
        if (parsed.length >= 8) return parsed;
      }
    } catch (e) {
      console.error('History load error:', e);
    }
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify(REAL_OFFICIAL_HISTORY_PACK));
    } catch (e) {}
    return REAL_OFFICIAL_HISTORY_PACK;
  });

  // 履歴変更時の自動永続化
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify(history));
    } catch (e) {
      console.error('History sync error:', e);
    }
  }, [history]);

  // 3. 現在のレースデータ (当日の公式日付で初期化)
  const [race, setRace] = useState<RaceInfo>(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      ...PRESET_RACES[0],
      date: todayStr,
    };
  });

  // 4. 手動STOPフラグ
  const [manualStop, setManualStop] = useState<boolean>(false);

  // 5. 買い目候補とオッズ・券種・点数
  const [selectedBetType, setSelectedBetType] = useState<BetType>(() => settings.defaultBetType || '3t');
  const [selectedPointCount, setSelectedPointCount] = useState<number>(() => settings.defaultPointCount || 5);
  const [selectedVenueFilter, setSelectedVenueFilter] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<BetCandidate[]>([]);
  const [allocationInfo, setAllocationInfo] = useState<AllocationResult>({
    updatedCandidates: [],
    totalStake: 0,
    totalExpectedReturnMin: 0,
    totalExpectedReturnMax: 0,
    isOverBudget: false,
    overBudgetAmount: 0,
  });

  // 6. 直前の確定ステータス
  const [lastFinishedStatus, setLastFinishedStatus] = useState<AppStatus | null>(null);

  // 7. ローディング & 結果速報ステート
  const [isFetchingRace, setIsFetchingRace] = useState<boolean>(false);
  const [isFetchingResult, setIsFetchingResult] = useState<boolean>(false);
  const [latestResultNotice, setLatestResultNotice] = useState<LatestResultNotice | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);

  // 7.5 本日開催会場一覧ステート
  const [activeVenues, setActiveVenues] = useState<ActiveVenueSchedule[]>([]);
  const activeVenueNames = useMemo(() => activeVenues.map((v) => v.venueName), [activeVenues]);

  // トースト表示ヘルパー
  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  }, []);

  // 8. テレボート自動投票ステート
  const [autoVoteConfig, setAutoVoteConfig] = useState<AutoVoteConfig>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autovote_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 残高が0円かつテストモードの場合は10万円のテスト資金を設定して即座に投票可能にする
        const balance = parsed.accountBalance > 0 ? parsed.accountBalance : 100000;
        return {
          ...DEFAULT_AUTOVOTE_CONFIG,
          ...parsed,
          accountBalance: balance,
          connectionStatus: parsed.connectionStatus || 'CONNECTED',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AUTOVOTE_CONFIG;
  });
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [voteLogs, setVoteLogs] = useState<VoteLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autovote_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // 自動投票設定の保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autovote_config_v1', JSON.stringify(autoVoteConfig));
    } catch (e) {}
  }, [autoVoteConfig]);

  // 投票ログの保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autovote_logs_v1', JSON.stringify(voteLogs));
    } catch (e) {}
  }, [voteLogs]);

  // 8.5 AI予想ステート (Gemini 3.8 Flash)
  const [aiPredictionResult, setAiPredictionResult] = useState<AIPredictionResult | null>(null);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // 8.8 全自動運転 (Autopilot) ステート
  const [autoPilotConfig, setAutoPilotConfig] = useState<AutoPilotConfig>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autopilot_config_v1');
      if (saved) return { ...DEFAULT_AUTOPILOT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_AUTOPILOT_CONFIG;
  });

  const [autoPilotStage, setAutoPilotStage] = useState<AutoPilotStage>('STOPPED');
  const [autoPilotMessage, setAutoPilotMessage] = useState<string>('');
  const [autoPilotCountdown, setAutoPilotCountdown] = useState<number>(0);
  const [autoPilotLogs, setAutoPilotLogs] = useState<AutoPilotLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('kyotei_autopilot_logs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [autoSessionRaces, setAutoSessionRaces] = useState<number>(0);
  const [autoSessionHits, setAutoSessionHits] = useState<number>(0);
  const [autoSessionProfit, setAutoSessionProfit] = useState<number>(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
  // 同一セッションにおける投票済みレース追跡（多重投票防止・巡回スキップ判定）
  const votedRacesRef = useRef<Set<string>>(new Set());
  // 同一セッションにおける巡回済みレース追跡（複数回同じレースを巡回しない完全防止機能）
  const patrolledRacesRef = useRef<Set<string>>(new Set());
  const [patrolledCount, setPatrolledCount] = useState<number>(0);
  // 自動運転における投票買い目退避Ref（状態バッチ更新の非同期遅延・即時投票保証）
  const autopilotCandidatesRef = useRef<BetCandidate[]>([]);

  const markRaceAsPatrolled = useCallback((key: string) => {
    if (!patrolledRacesRef.current.has(key)) {
      patrolledRacesRef.current.add(key);
      setPatrolledCount(patrolledRacesRef.current.size);
    }
  }, []);

  // 自動運転設定の保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autopilot_config_v1', JSON.stringify(autoPilotConfig));
    } catch (e) {}
  }, [autoPilotConfig]);

  // 自動運転ログの保存
  useEffect(() => {
    try {
      localStorage.setItem('kyotei_autopilot_logs_v1', JSON.stringify(autoPilotLogs));
    } catch (e) {}
  }, [autoPilotLogs]);

  // 8.9 PC版 Chrome拡張機能連携ステート
  const [isExtensionSimulation, setIsExtensionSimulation] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kyotei_extension_simulation_enabled') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isRealExtensionDetected, setIsRealExtensionDetected] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!(
        document.getElementById('__kyotei_pc_extension_bridge__') ||
        document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
        document.documentElement.dataset.kyoteiExtension === 'connected'
      );
    }
    return false;
  });

  const isExtensionConnected = isRealExtensionDetected || isExtensionSimulation;

  const handleToggleExtensionSimulation = useCallback(
    (enabled: boolean) => {
      setIsExtensionSimulation(enabled);
      try {
        localStorage.setItem('kyotei_extension_simulation_enabled', String(enabled));
      } catch (e) {}
      showToast(
        enabled
          ? '【PC拡張機能】評価・テスト用シミュレーション接続を有効にしました'
          : '【PC拡張機能】シミュレーション接続を無効にしました（実拡張機能検出待機）',
        'info'
      );
    },
    [showToast]
  );

  const sendExtensionPing = useCallback(
    (showNotice = false) => {
      const hasDom = !!(
        typeof document !== 'undefined' &&
        (document.getElementById('__kyotei_pc_extension_bridge__') ||
          document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
          document.documentElement.dataset.kyoteiExtension === 'connected')
      );

      if (hasDom) {
        setIsRealExtensionDetected(true);
        if (showNotice) {
          showToast('【PC拡張機能】DOMブリッジを検出・接続を確立しました (v1.1.0 Ready)', 'success');
        }
        return;
      }

      const pingPayload = { type: 'KYOTEI_CHECK_EXTENSION', timestamp: Date.now() };

      // 1. window.postMessage
      try {
        window.postMessage(pingPayload, '*');
      } catch (e) {}

      // 2. 親フレーム (iframe時)
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(pingPayload, '*');
        }
      } catch (e) {}

      // 3. トップフレーム
      try {
        if (window.top && window.top !== window && window.top !== window.parent) {
          window.top.postMessage(pingPayload, '*');
        }
      } catch (e) {}

      // 4. 子フレーム一覧
      try {
        if (window.frames && window.frames.length > 0) {
          for (let i = 0; i < window.frames.length; i++) {
            try {
              window.frames[i].postMessage(pingPayload, '*');
            } catch (e) {}
          }
        }
      } catch (e) {}

      // 5. BroadcastChannel
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('kyotei_extension_bus');
          bc.postMessage(pingPayload);
          setTimeout(() => {
            try {
              bc.close();
            } catch (e) {}
          }, 500);
        }
      } catch (e) {}

      // 6. CustomEvents
      try {
        window.dispatchEvent(new CustomEvent('KYOTEI_CHECK_EXTENSION', { detail: pingPayload }));
        document.dispatchEvent(new CustomEvent('KYOTEI_CHECK_EXTENSION', { detail: pingPayload }));
      } catch (e) {}

      if (showNotice) {
        if (isExtensionConnected) {
          showToast('【PC拡張機能】双方向リンク確認シグナルを送出しました (接続中)', 'success');
        } else {
          showToast('【PC拡張機能】接続シグナルを送出しました (拡張機能の応答を待機中)', 'info');
        }
      }
    },
    [showToast, isExtensionConnected]
  );

  useEffect(() => {
    // A. postMessage リスナー
    const handleExtensionMsg = (ev: MessageEvent) => {
      if (!ev.data) return;
      if (
        ev.data.type === 'KYOTEI_EXTENSION_INSTALLED' ||
        ev.data.type === 'KYOTEI_EXTENSION_PONG' ||
        ev.data.type === 'KYOTEI_EXTENSION_HEARTBEAT' ||
        ev.data.type === 'KYOTEI_EXTENSION_READY'
      ) {
        setIsRealExtensionDetected(true);
      }
      if (ev.data.type === 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED' && ev.data.receptionNo) {
        showToast(
          `【PC拡張機能】テレボート公式の投票受付を検知しました (受付番号: ${ev.data.receptionNo})`,
          'success'
        );
      }
    };

    window.addEventListener('message', handleExtensionMsg);

    // B. CustomEvent リスナー
    const onCustomEvent = () => {
      setIsRealExtensionDetected(true);
    };
    window.addEventListener('KYOTEI_EXTENSION_INSTALLED', onCustomEvent);
    window.addEventListener('KYOTEI_EXTENSION_PONG', onCustomEvent);
    window.addEventListener('KYOTEI_EXTENSION_HEARTBEAT', onCustomEvent);
    document.addEventListener('KYOTEI_EXTENSION_INSTALLED', onCustomEvent);
    document.addEventListener('KYOTEI_EXTENSION_PONG', onCustomEvent);
    document.addEventListener('KYOTEI_EXTENSION_HEARTBEAT', onCustomEvent);

    // C. BroadcastChannel リスナー
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('kyotei_extension_bus');
        bc.onmessage = (ev) => {
          if (
            ev &&
            ev.data &&
            (ev.data.type === 'KYOTEI_EXTENSION_INSTALLED' ||
              ev.data.type === 'KYOTEI_EXTENSION_PONG' ||
              ev.data.type === 'KYOTEI_EXTENSION_HEARTBEAT')
          ) {
            setIsRealExtensionDetected(true);
          }
        };
      }
    } catch (e) {}

    // D. DOM変更監視 (MutationObserver)
    let observer: MutationObserver | null = null;
    try {
      if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        observer = new MutationObserver(() => {
          const hasDom = !!(
            document.getElementById('__kyotei_pc_extension_bridge__') ||
            document.documentElement.getAttribute('data-kyotei-extension-connected') === 'true' ||
            document.documentElement.dataset.kyoteiExtension === 'connected'
          );
          if (hasDom) {
            setIsRealExtensionDetected(true);
          }
        });
        observer.observe(document.documentElement, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      }
    } catch (e) {}

    // 初回・定期PING
    sendExtensionPing();
    const t1 = setTimeout(() => sendExtensionPing(), 300);
    const t2 = setTimeout(() => sendExtensionPing(), 1000);
    const interval = setInterval(() => sendExtensionPing(), 3000);

    return () => {
      window.removeEventListener('message', handleExtensionMsg);
      window.removeEventListener('KYOTEI_EXTENSION_INSTALLED', onCustomEvent);
      window.removeEventListener('KYOTEI_EXTENSION_PONG', onCustomEvent);
      window.removeEventListener('KYOTEI_EXTENSION_HEARTBEAT', onCustomEvent);
      document.removeEventListener('KYOTEI_EXTENSION_INSTALLED', onCustomEvent);
      document.removeEventListener('KYOTEI_EXTENSION_PONG', onCustomEvent);
      document.removeEventListener('KYOTEI_EXTENSION_HEARTBEAT', onCustomEvent);
      if (bc) {
        try {
          bc.close();
        } catch (e) {}
      }
      if (observer) {
        try {
          observer.disconnect();
        } catch (e) {}
      }
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [sendExtensionPing, showToast]);

  // 9. モーダル表示管理
  const [activeModal, setActiveModal] = useState<
    'result' | 'history' | 'settings' | 'help' | 'fetchRace' | 'exe' | 'autoVote' | 'aiPrediction' | 'autoPilot' | 'balanceSync' | 'realVote' | 'pcExtension' | null
  >(null);

  // 統計集計 (全体および全国24場別)
  const stats = useMemo(() => calculateStatistics(history), [history]);
  const venueStats = useMemo(() => calculateVenueStatistics(history), [history]);

  // 実データ一括インポート機能
  const handleImportRealData = useCallback(() => {
    setHistory((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const toAdd = REAL_OFFICIAL_HISTORY_PACK.filter((r) => !existingIds.has(r.id));
      return [...toAdd, ...prev];
    });
    showToast('全国主要場の公式確定実データパックをインポートしました！会場別統計に即時反映されています');
  }, [showToast]);

  // 艇スコア計算 (仕様 7.3)
  const scoredBoats = useMemo(() => {
    return calculateBoatScores(race.boats, settings);
  }, [race.boats, settings]);

  // 見送り・停止・NG判定 (仕様 9)
  const judgment: JudgmentResult = useMemo(() => {
    if (lastFinishedStatus) {
      return {
        status: lastFinishedStatus,
        isStopped: false,
        isSkipped: false,
        isNg: false,
        reasonTitle: lastFinishedStatus === 'Teki2' ? 'レース的中！' : '不的中',
        reasonDetail:
          lastFinishedStatus === 'Teki2'
            ? '予想買い目が的中しました。確定払戻金が集計に反映されています。'
            : '確定着順が予想外でした。次レースへ向けて準備します。',
      };
    }
    return evaluateRaceStatus({
      race,
      candidates,
      settings,
      dailyProfit: stats.netProfit,
      manualStop,
    });
  }, [race, candidates, settings, stats.netProfit, manualStop, lastFinishedStatus]);

  // 予想実行処理 (可変券種・可変点数対応)
  const handleRunPrediction = useCallback(() => {
    setLastFinishedStatus(null);
    const existingOddsMap: Record<string, number> = {};
    candidates.forEach((c) => {
      if (c.odds > 0) existingOddsMap[c.combination] = c.odds;
    });

    const generated = generateBetsByType(scoredBoats, selectedBetType, selectedPointCount, existingOddsMap);

    // オッズが未設定の場合はリアルな市場オッズを自動シミュレート
    const oddsMap = simulateRealisticOdds(generated, selectedBetType);
    generated.forEach((c) => {
      if (!c.odds || c.odds <= 0) {
        c.odds = oddsMap[c.combination] || 5.0;
      }
    });

    // 直ちに資金配分も初期実行
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
  }, [scoredBoats, selectedBetType, selectedPointCount, candidates, settings]);

  // 券種切り替えハンドラ
  const handleChangeBetType = useCallback((newType: BetType) => {
    setSelectedBetType(newType);
    const maxPts = BET_TYPE_LABELS[newType]?.maxPoints ?? 12;
    const newPts = Math.min(selectedPointCount, maxPts);
    setSelectedPointCount(newPts);
    setLastFinishedStatus(null);

    const generated = generateBetsByType(scoredBoats, newType, newPts);
    const oddsMap = simulateRealisticOdds(generated, newType);
    generated.forEach((c) => {
      c.odds = oddsMap[c.combination] || 5.0;
    });
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    showToast(`舟券種別を【${BET_TYPE_LABELS[newType].label}】(${newPts}点) に設定しました`);
  }, [scoredBoats, selectedPointCount, settings, showToast]);

  // 購入点数切り替えハンドラ
  const handleChangePointCount = useCallback((newPts: number) => {
    setSelectedPointCount(newPts);
    setLastFinishedStatus(null);

    const generated = generateBetsByType(scoredBoats, selectedBetType, newPts);
    const oddsMap = simulateRealisticOdds(generated, selectedBetType);
    generated.forEach((c) => {
      c.odds = oddsMap[c.combination] || 5.0;
    });
    const alloc = allocateMoney(generated, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    showToast(`購入点数を【${newPts}点】に変更しました`);
  }, [scoredBoats, selectedBetType, settings, showToast]);

  // 初回マウント時に自動予想生成
  useEffect(() => {
    if (candidates.length === 0 && scoredBoats.length > 0) {
      handleRunPrediction();
    }
  }, []);

  // オッズ手動・ステップ変更 (F04)
  const handleUpdateOdds = useCallback(
    (combination: string, odds: number) => {
      setCandidates((prev) => {
        const next = prev.map((c) => {
          if (c.combination === combination) {
            return { ...c, odds };
          }
          return c;
        });
        const alloc = allocateMoney(next, settings);
        setAllocationInfo(alloc);
        return alloc.updatedCandidates;
      });
    },
    [settings]
  );

  // オッズ自動シミュレート実行
  const handleSimulateOdds = useCallback(() => {
    if (candidates.length === 0) return;
    const simMap = simulateRealisticOdds(candidates, selectedBetType);
    setCandidates((prev) => {
      const next = prev.map((c) => ({
        ...c,
        odds: simMap[c.combination] || c.odds,
      }));
      const alloc = allocateMoney(next, settings);
      setAllocationInfo(alloc);
      return alloc.updatedCandidates;
    });
  }, [candidates, selectedBetType, settings]);

  // 資金配分実行 (F05)
  const handleCalculateAllocation = useCallback(() => {
    if (candidates.length === 0) return;
    const alloc = allocateMoney(candidates, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
  }, [candidates, settings]);

  // レース情報・天候更新
  const handleUpdateRace = (updated: Partial<RaceInfo>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({ ...prev, ...updated }));
  };

  const handleUpdateWeather = (updated: Partial<WeatherCondition>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      weather: { ...prev.weather, ...updated },
    }));
  };

  // 出走艇データ更新 (F02)
  const handleUpdateBoat = (boatNumber: number, fields: Partial<BoatData>) => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      boats: prev.boats.map((b) => (b.boatNumber === boatNumber ? { ...b, ...fields } : b)),
    }));
  };

  // 展示タイム一括補正
  const handleQuickSimulateExhibition = () => {
    setLastFinishedStatus(null);
    setRace((prev) => ({
      ...prev,
      boats: prev.boats.map((b) => {
        const base = 6.65 + (b.boatNumber - 1) * 0.02;
        const rand = Number((Math.random() * 0.08 - 0.04).toFixed(2));
        return {
          ...b,
          exhibitionTime: Number((base + rand).toFixed(2)),
        };
      }),
    }));
  };

  // プリセット番組選択 (F14)
  const handleSelectPreset = (presetId: string) => {
    setLastFinishedStatus(null);
    const target = PRESET_RACES.find((p) => p.id === presetId);
    if (target) {
      const cloned = JSON.parse(JSON.stringify(target));
      const d = new Date();
      cloned.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setRace(cloned);
      // 新規番組読み込み後に自動予想を再計算
      setTimeout(() => {
        const newScored = calculateBoatScores(target.boats, settings);
        const generated = generateFivePointBets(newScored);
        const oddsMap = simulateRealisticOdds(generated);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }, 50);
    }
  };

  // 既定値レースへリセット
  const handleResetToDefaultRace = () => {
    handleSelectPreset(PRESET_RACES[0].id);
  };

  // レース結果確定登録 (F08)
  const handleConfirmResult = (resultData: {
    finishOrder: string;
    officialPayout: number;
    isHit: boolean;
    hitCombination?: string;
    totalStake: number;
    totalReturn: number;
    profit: number;
  }) => {
    const newRecord: RaceHistoryRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toLocaleString('ja-JP'),
      date: race.date,
      venue: race.venue,
      raceNo: race.raceNo,
      raceTitle: race.raceTitle,
      status: resultData.isHit ? 'Teki2' : 'Hazure',
      betType: selectedBetType,
      pointCount: selectedPointCount,
      bets: candidates.map((c) => ({
        combination: c.combination,
        odds: c.odds,
        stake: c.stake,
        expectedReturn: c.expectedReturn,
        isHit: isBetHit(c.combination, c.betType || selectedBetType, resultData.finishOrder),
      })),
      totalStake: resultData.totalStake,
      finishOrder: resultData.finishOrder,
      officialPayout: resultData.officialPayout,
      totalReturn: resultData.totalReturn,
      profit: resultData.profit,
      isHit: resultData.isHit,
    };

    // 的中払戻金をテレボート口座残高に自動反映・入金連動
    if (resultData.isHit && resultData.totalReturn > 0) {
      setAutoVoteConfig((prev) => ({
        ...prev,
        accountBalance: prev.accountBalance + resultData.totalReturn,
      }));
    }

    setHistory((prev) => [newRecord, ...prev]);
    setLastFinishedStatus(resultData.isHit ? 'Teki2' : 'Hazure');
    setActiveModal(null);
  };

  // CSVエクスポート (F11)
  const handleExportCsv = () => {
    exportHistoryToCsv(history, race.date);
  };

  // 外部開催レースデータ取得完了時ハンドラ (F14)
  const handleRaceFetched = (newRace: RaceInfo) => {
    setLastFinishedStatus(null);
    setLatestResultNotice(null);
    setRace(newRace);
    setTimeout(() => {
      const newScored = calculateBoatScores(newRace.boats, settings);
      const generated = generateBetsByType(newScored, selectedBetType, selectedPointCount);
      const oddsMap = simulateRealisticOdds(generated, selectedBetType);
      generated.forEach((c) => {
        c.odds = oddsMap[c.combination] || 5.0;
      });
      const alloc = allocateMoney(generated, settings);
      setCandidates(alloc.updatedCandidates);
      setAllocationInfo(alloc);
      showToast(`【${newRace.venue}】第${newRace.raceNo}R の出走表・番組データを反映しました`);
    }, 50);
  };

  // 指定開催場・レース番号の出走表番組データを取得 (F14)
  const handleFetchRace = useCallback(
    async (venueName: string, raceNo: number) => {
      setIsFetchingRace(true);
      try {
        const newRace = await fetchRaceCard({
          date: race.date,
          venueName,
          raceNo,
        });
        setLastFinishedStatus(null);
        setLatestResultNotice(null);
        setRace(newRace);

        const newScored = calculateBoatScores(newRace.boats, settings);
        const generated = generateBetsByType(newScored, selectedBetType, selectedPointCount);
        const oddsMap = simulateRealisticOdds(generated, selectedBetType);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
        showToast(`【${venueName}】第${raceNo}R の出走表番組データを取得しました`);
      } catch (err) {
        console.error('Fetch race error:', err);
        showToast('番組データの取得に失敗しました', 'error');
      } finally {
        setIsFetchingRace(false);
      }
    },
    [race.date, selectedBetType, selectedPointCount, settings, showToast]
  );

  // 本日開催会場の一括取得ハンドラ
  const handleBatchFetchVenues = useCallback(async () => {
    try {
      const res = await batchFetchTodayVenues(race.date);
      setActiveVenues(res.venues);
      if (res.venues.length > 0 && !res.venues.some((v) => v.venueName === race.venue)) {
        const premier = res.venues[0];
        handleFetchRace(premier.venueName, premier.currentRaceNo);
      }
      showToast(
        `本日開催中の${res.totalVenues}会場を一括取得しました（朝:${res.morningCount}場 / 昼:${res.dayCount}場 / 夜:${res.nighterCount}場）`,
        'success'
      );
    } catch (e) {
      showToast('本日開催会場の一括取得に失敗しました', 'error');
    }
  }, [race.date, race.venue, handleFetchRace, showToast]);

  // 初回マウント時に当日開催会場を自動一括取得
  useEffect(() => {
    let isMounted = true;
    async function initTodayVenues() {
      try {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const res = await batchFetchTodayVenues(todayStr);
        if (isMounted && res.venues.length > 0) {
          setActiveVenues(res.venues);
          if (!res.venues.some((v) => v.venueName === race.venue)) {
            const premier = res.venues[0];
            const stdDeadline = getStandardDeadlineTime(premier.venueName, premier.currentRaceNo);
            setRace((prev) => ({
              ...prev,
              venue: premier.venueName,
              raceNo: premier.currentRaceNo,
              deadlineTime: stdDeadline,
            }));
          }
        }
      } catch (e) {
        console.error('Initial venue load error:', e);
      }
    }
    initTodayVenues();
    return () => {
      isMounted = false;
    };
  }, []);

  // 次のレースへ進むハンドラ
  const handleNextRace = () => {
    const nextR = race.raceNo < 12 ? race.raceNo + 1 : 1;
    handleFetchRace(race.venue, nextR);
  };

  // 履歴クリア (F10)
  const handleClearHistory = () => {
    setHistory([]);
    setLastFinishedStatus(null);
    setLatestResultNotice(null);
    setShowClearHistoryConfirm(false);
    votedRacesRef.current.clear();
    setAutoSessionRaces(0);
    setAutoSessionHits(0);
    setAutoSessionProfit(0);
    setConsecutiveLosses(0);
    try {
      localStorage.setItem('kyotei_analyzer_history_v2', JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
    showToast('すべての収支履歴を消去しました（0件）');
  };

  // 履歴1件削除
  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
    showToast('指定した履歴レコードを削除しました');
  };

  // テレボート投票実行ハンドラ
  const handleExecuteVote = async () => {
    // 締切時刻・開催日判定:
    // 過去開催日の場合は締め切り後でも投票・判定を許可するが、
    // 開催日当日の場合は締め切り時間後のレースには投票を行わない
    const voteEligibility = checkRaceVoteEligibility({
      date: race.date,
      deadlineTime: race.deadlineTime,
      venueName: race.venue,
      raceNo: race.raceNo,
    });

    if (!voteEligibility.canVote && voteEligibility.isToday && voteEligibility.isPastDeadlineToday) {
      showToast(
        `【締切超過】本日(${race.date})の第${race.raceNo}Rは締切時刻 (${voteEligibility.effectiveDeadline}) を過ぎているため投票できません`,
        'error'
      );
      return;
    }

    if (judgment.isStopped) {
      showToast('STOP判定発令中のため投票できません (手動または日次限度)', 'error');
      return;
    }
    if (judgment.isSkipped) {
      showToast('見送り判定発令中のため投票できません (強風・高波・低オッズ)', 'error');
      return;
    }

    // 実投票モード時は専用の実投票送出マネージャーを開く
    if (!autoVoteConfig.testMode) {
      setActiveModal('realVote');
      return;
    }

    setIsVoting(true);
    try {
      // 買い目・配分が未設定の場合は自動配分
      let currentCandidates = candidates;
      if (currentCandidates.length === 0 || currentCandidates.every((c) => c.stake === 0)) {
        const scored = calculateBoatScores(race.boats, settings);
        const generated = generateFivePointBets(scored);
        const oddsMap = simulateRealisticOdds(generated);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }

      const result = await executeAutoVote({
        race,
        candidates: currentCandidates,
        config: autoVoteConfig,
      });

      if (!result.success) {
        showToast(result.error || '投票処理に失敗しました', 'error');
        return;
      }

      // ログ追加
      setVoteLogs((prev) => [...result.logs, ...prev]);

      // 残高更新 (シミュレーション時)
      setAutoVoteConfig((prev) => ({
        ...prev,
        accountBalance: result.newBalance,
      }));

      // サウンド再生 (Web Audio API)
      if (autoVoteConfig.soundAlert && typeof window !== 'undefined') {
        try {
          const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }
        } catch (e) {
          console.error(e);
        }
      }

      showToast(
        `【テスト仮想投票】${race.venue} 第${race.raceNo}R 3連単${result.logs.length}点 (計¥${result.totalVoted.toLocaleString()}) を仮想受付しました (仮想残高: ¥${result.newBalance.toLocaleString()})`,
        'info'
      );
    } catch (err) {
      console.error('Vote execute error:', err);
      showToast('投票処理中にエラーが発生しました', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // 実投票確定ハンドラ (テレボート公式Webでの投票完了を購入限度額へ反映)
  const handleConfirmRealVote = useCallback(
    (officialReceptionNo?: string) => {
      let currentCandidates = candidates;
      if (currentCandidates.length === 0 || currentCandidates.every((c) => c.stake === 0)) {
        const scored = calculateBoatScores(race.boats, settings);
        const generated = generateFivePointBets(scored);
        const oddsMap = simulateRealisticOdds(generated);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }

      const res = recordRealVoteConfirmation({
        race,
        candidates: currentCandidates,
        config: autoVoteConfig,
        officialReceptionNo,
      });

      setVoteLogs((prev) => [...res.logs, ...prev]);
      setAutoVoteConfig((prev) => ({
        ...prev,
        accountBalance: res.newBalance,
        lastSyncTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        connectionStatus: 'CONNECTED',
        ledger: [res.ledgerItem, ...(prev.ledger || [])],
      }));

      // サウンド再生 (Web Audio API)
      if (autoVoteConfig.soundAlert && typeof window !== 'undefined') {
        try {
          const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }
        } catch (e) {
          console.error(e);
        }
      }

      showToast(
        `【テレボート実投票 確定】${race.venue} 第${race.raceNo}R 3連単${res.logs.length}点 (計¥${res.totalVoted.toLocaleString()}) を反映しました (購入限度額: ¥${res.newBalance.toLocaleString()})`,
        'success'
      );

      // 全自動運転がVOTINGステージで待機中だった場合は結果待ちへ前進
      if (autoPilotStage === 'VOTING') {
        setAutoPilotCountdown(3);
        setAutoPilotStage('WAITING_RESULT');
        setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】実投票完了。着順確定待機中...`);
      }

      setActiveModal(null);
    },
    [race, candidates, settings, autoVoteConfig, showToast, autoPilotStage]
  );

  // テレボート公式側での実投票購入完了を自動検知して残高・台帳を同期
  useEffect(() => {
    const handlePurchaseSync = (ev: any) => {
      const data = ev.detail || (ev.data && ev.data.type === 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED' ? ev.data : null);
      if (data && data.receptionNo) {
        handleConfirmRealVote(data.receptionNo);
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
            localStorage.removeItem('__kyotei_confirmed_vote__');
            handleConfirmRealVote(item.receptionNo);
          }
        }
      } catch (e) {}
    }, 1200);

    return () => {
      window.removeEventListener('KYOTEI_TELEBOAT_PURCHASE_CONFIRMED', handlePurchaseSync);
      window.removeEventListener('message', handlePurchaseSync);
      clearInterval(pollTimer);
    };
  }, [handleConfirmRealVote]);

  // AI予想実行ハンドラ (Gemini 3.8 Flash)
  const handleRunAIPrediction = async () => {
    setIsAILoading(true);
    setActiveModal('aiPrediction');
    try {
      const res = await generateAIPrediction({
        race,
        scoredBoats,
        settings,
      });
      setAiPredictionResult(res);
      showToast(`【${race.venue} ${race.raceNo}R】Gemini AI予想・水面展開分析が完了しました`, 'success');
    } catch (err) {
      console.error('AI prediction error:', err);
      showToast('AI予想の生成に失敗しました', 'error');
    } finally {
      setIsAILoading(false);
    }
  };

  // AI予想買い目をメイン買い目テーブルに反映
  const handleApplyAICandidates = () => {
    if (!aiPredictionResult || aiPredictionResult.aiCandidates.length === 0) return;
    setCandidates(aiPredictionResult.aiCandidates);
    const alloc = allocateMoney(aiPredictionResult.aiCandidates, settings);
    setCandidates(alloc.updatedCandidates);
    setAllocationInfo(alloc);
    setActiveModal(null);
    showToast(`AI特選買い目（5点）をメイン画面に適用しました`, 'success');
  };

  // レース確定結果の自動取得 (F08 + 自動データ取得)
  const handleAutoFetchResult = async () => {
    setIsFetchingResult(true);
    try {
      // 予想買い目が未生成の場合は自動実行
      let currentCandidates = candidates;
      if (currentCandidates.length === 0) {
        const scored = calculateBoatScores(race.boats, settings);
        const generated = generateBetsByType(scored, selectedBetType, selectedPointCount);
        const oddsMap = simulateRealisticOdds(generated, selectedBetType);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
      }

      // 資金配分が0円の場合は標準配分を即時補填
      let totalStake = currentCandidates.reduce((sum, c) => sum + (c.stake || 0), 0);
      if (totalStake === 0) {
        const alloc = allocateMoney(currentCandidates, settings);
        currentCandidates = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);
        totalStake = alloc.totalStake;
      }

      // 公式レース確定状態チェック（未確定・発売中レースでの誤った的中判定を完全防止）
      const confirmation = checkRaceConfirmation({
        date: race.date,
        deadlineTime: race.deadlineTime,
        venueName: race.venue,
        raceNo: race.raceNo,
      });

      if (!confirmation.isConfirmed) {
        showToast(
          `【未確定】第${race.raceNo}Rはまだ確定していません（${confirmation.statusText} / 締切: ${race.deadlineTime}）。公式レース確定前のため的中判定は行いません`,
          'info'
        );
        setLatestResultNotice({
          venue: race.venue,
          raceNo: race.raceNo,
          raceTitle: race.raceTitle,
          finishOrder: '未確定（着順待機中）',
          first: 0,
          second: 0,
          third: 0,
          winningTechnique: confirmation.statusText,
          officialPayout: 0,
          popularityRank: 0,
          isHit: false,
          isConfirmed: false,
          statusMessage: `【${confirmation.statusText}】締切時刻（${race.deadlineTime}）前、または着順審判中のため公式確定着順は発表されていません。レース終了・着順確定後に的中判定が行われます。`,
          totalStake,
          totalReturn: 0,
          profit: 0,
        });
        setIsFetchingResult(false);
        return;
      }

      const res = await fetchRaceResult({
        date: race.date,
        venueName: race.venue,
        raceNo: race.raceNo,
        boats: race.boats,
        deadlineTime: race.deadlineTime,
      });

      const matchedCandidate = currentCandidates.find(
        (c) => isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder) && c.stake > 0
      );
      const isHit = !!matchedCandidate;

      // 券種に応じた確定払戻金の計算
      let payout100 = res.officialPayout;
      if (selectedBetType !== '3t' && matchedCandidate) {
        payout100 = getEstimatedOfficialPayout(res.officialPayout, selectedBetType, matchedCandidate.odds);
      }

      const totalReturn = isHit && matchedCandidate
        ? Math.floor((matchedCandidate.stake * payout100) / 100)
        : 0;
      const profit = totalReturn - totalStake;

      const newRecord: RaceHistoryRecord = {
        id: `rec-${Date.now()}`,
        timestamp: new Date().toLocaleString('ja-JP'),
        date: race.date,
        venue: race.venue,
        raceNo: race.raceNo,
        raceTitle: race.raceTitle,
        status: isHit ? 'Teki2' : 'Hazure',
        betType: selectedBetType,
        pointCount: selectedPointCount,
        bets: currentCandidates.map((c) => ({
          combination: c.combination,
          odds: c.odds,
          stake: c.stake,
          expectedReturn: c.expectedReturn,
          isHit: isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder),
        })),
        totalStake,
        finishOrder: res.finishOrder,
        officialPayout: payout100,
        totalReturn,
        profit,
        isHit,
      };

      // 的中払戻金をテレボート口座残高に自動反映・入金連動
      if (isHit && totalReturn > 0) {
        setAutoVoteConfig((prev) => ({
          ...prev,
          accountBalance: prev.accountBalance + totalReturn,
        }));
      }

      setHistory((prev) => [newRecord, ...prev]);
      setLastFinishedStatus(isHit ? 'Teki2' : 'Hazure');

      setLatestResultNotice({
        venue: race.venue,
        raceNo: race.raceNo,
        raceTitle: race.raceTitle,
        finishOrder: res.finishOrder,
        first: res.first,
        second: res.second,
        third: res.third,
        winningTechnique: res.winningTechnique,
        officialPayout: res.officialPayout,
        popularityRank: res.popularityRank,
        isHit,
        isConfirmed: true,
        totalStake,
        totalReturn,
        profit,
        hitCombination: matchedCandidate?.combination,
      });

      showToast(
        isHit
          ? `★ 的中！ 確定着順 ${res.finishOrder} (${res.officialPayout}円)`
          : `確定着順 ${res.finishOrder} (${res.officialPayout}円) - 不的中`,
        isHit ? 'success' : 'info'
      );
    } catch (e: any) {
      console.warn('Auto fetch result notice:', e);
      showToast(e?.message || '公式確定結果の取得に失敗しました', 'error');
    } finally {
      setIsFetchingResult(false);
    }
  };

  // 8.9 全自動運転 (Autopilot) ログ追加ヘルパー
  const addAutoPilotLog = useCallback(
    (type: AutoPilotLogItem['type'], message: string, details?: string) => {
      const item: AutoPilotLogItem = {
        id: `ap-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
        venue: race.venue,
        raceNo: race.raceNo,
        type,
        message,
        details,
      };
      setAutoPilotLogs((prev) => [item, ...prev.slice(0, 199)]);
    },
    [race.venue, race.raceNo]
  );

  // 8.9 全自動運転 (Autopilot) 実行ガード用Ref
  const stageExecutionKeyRef = useRef<string>('');
  const isProcessingStageRef = useRef<boolean>(false);

  // 巡回履歴リセット（全レース再巡回可能化）
  const handleResetPatrolHistory = useCallback(() => {
    patrolledRacesRef.current.clear();
    votedRacesRef.current.clear();
    autopilotCandidatesRef.current = [];
    setPatrolledCount(0);
    addAutoPilotLog('INFO', '巡回履歴をリセットしました（全レースを再巡回可能）');
    showToast('巡回履歴をリセットしました（全レースを再巡回可能）', 'info');
  }, [addAutoPilotLog, showToast]);

  // 巡回先レースの確実な番組同期 & ステージ遷移
  const transitionToPatrolRace = useCallback(
    async (targetVenue: string, targetRaceNo: number) => {
      stageExecutionKeyRef.current = '';
      isProcessingStageRef.current = false;
      markRaceAsPatrolled(`${targetVenue}-${targetRaceNo}`);
      setAutoPilotCountdown(0);
      setAutoPilotStage('FETCHING_CARD');
      setAutoPilotMessage(`【${targetVenue} 第${targetRaceNo}R】番組・出走表データを取得中...`);
      addAutoPilotLog(
        'INFO',
        `次レース巡回: 【${race.venue} 第${race.raceNo}R】➔【${targetVenue} 第${targetRaceNo}R】へ移行 (重複巡回防止)`
      );

      try {
        const newRace = await fetchRaceCard({
          date: race.date,
          venueName: targetVenue,
          raceNo: targetRaceNo,
        });

        setLastFinishedStatus(null);
        setLatestResultNotice(null);
        setRace(newRace);

        const newScored = calculateBoatScores(newRace.boats, settings);
        const generated = generateBetsByType(newScored, selectedBetType, selectedPointCount);
        const oddsMap = simulateRealisticOdds(generated, selectedBetType);
        generated.forEach((c) => {
          c.odds = oddsMap[c.combination] || 5.0;
        });
        const alloc = allocateMoney(generated, settings);
        autopilotCandidatesRef.current = alloc.updatedCandidates;
        setCandidates(alloc.updatedCandidates);
        setAllocationInfo(alloc);

        stageExecutionKeyRef.current = '';
        isProcessingStageRef.current = false;
        setAutoPilotCountdown(0);
        setAutoPilotStage('ANALYZING');
        setAutoPilotMessage(`【${targetVenue} 第${targetRaceNo}R】(締切: ${newRace.deadlineTime}) 出走表同期完了。条件判定中...`);
        addAutoPilotLog(
          'INFO',
          `次レース巡回: 【${targetVenue} 第${targetRaceNo}R (締切: ${newRace.deadlineTime})】出走表同期完了 (〆切順)`
        );
        showToast(`【${targetVenue} 第${targetRaceNo}R (締切 ${newRace.deadlineTime})】へ巡回移行しました`);
      } catch (err) {
        console.error('Patrol transition error:', err);
        setAutoPilotStage('SAFETY_STOP');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage(`巡回同期失敗: 【${targetVenue} 第${targetRaceNo}R】取得エラー`);
        addAutoPilotLog('STOP', `【${targetVenue} 第${targetRaceNo}R】データ取得失敗により安全停止`);
        showToast('番組データの同期に失敗したため自動運転を停止しました', 'error');
      }
    },
    [
      race.venue,
      race.raceNo,
      race.date,
      settings,
      selectedBetType,
      selectedPointCount,
      markRaceAsPatrolled,
      addAutoPilotLog,
      showToast,
    ]
  );

  // 全自動運転 START / STOP 切替
  const handleToggleAutoPilot = useCallback(() => {
    stageExecutionKeyRef.current = '';
    isProcessingStageRef.current = false;
    if (autoPilotConfig.enabled) {
      setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
      setAutoPilotStage('STOPPED');
      setAutoPilotCountdown(0);
      setAutoPilotMessage('全自動運転を停止しました');
      if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
      addAutoPilotLog('STOP', '手動操作により全自動運転を停止しました');
      showToast('全自動運転を停止しました', 'info');
    } else {
      setAutoPilotConfig((prev) => ({ ...prev, enabled: true }));
      setConsecutiveLosses(0);
      if (autoPilotConfig.soundAlert) playAutoPilotSound('start');

      const currentKey = `${race.venue}-${race.raceNo}`;
      const isCurrentPatrolled = patrolledRacesRef.current.has(currentKey);

      // 最も締切時刻が早い未巡回レースを探索
      const next = getNextPatrolTarget({
        currentVenue: race.venue,
        currentRaceNo: race.raceNo,
        config: autoPilotConfig,
        availableVenues: activeVenueNames.length > 0 ? activeVenueNames : undefined,
        alreadyVotedKeys: patrolledRacesRef.current,
        raceDate: race.date,
        includeCurrentRace: !isCurrentPatrolled,
      });

      if (next.isRoundComplete && next.remainingQueueCount === 0) {
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        showToast('対象レースはすべて巡回済みです。再巡回するには「設定・ログ」から巡回履歴をリセットしてください', 'info');
        addAutoPilotLog('STOP', '巡回対象レースがすべて完了しているため自動運転を開始しませんでした');
        return;
      }

      const orderLabel = autoPilotConfig.patrolOrder === 'venue_round_robin' ? '会場順' : '〆切時刻が早い順';
      addAutoPilotLog(
        'INFO',
        `全自動運転を開始しました (${autoPilotConfig.targetMode === 'single_venue' ? `単一会場連続 (${race.venue})` : `全国24場 ${orderLabel}`}) [重複巡回防止: 有効]`
      );
      showToast(
        `全自動運転を開始しました！(${autoPilotConfig.targetMode === 'single_venue' ? `${race.venue}連続` : orderLabel} / 重複巡回防止)`,
        'success'
      );

      // 画面のレースと最も早い未巡回レースが異なる場合は、直ちに移動して開始 (〆切順の徹底)
      if (next.nextVenue !== race.venue || next.nextRaceNo !== race.raceNo) {
        markRaceAsPatrolled(`${next.nextVenue}-${next.nextRaceNo}`);
        transitionToPatrolRace(next.nextVenue, next.nextRaceNo);
      } else {
        markRaceAsPatrolled(currentKey);
        setAutoPilotStage('ANALYZING');
        setAutoPilotCountdown(0);
        setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】(締切: ${race.deadlineTime}) 条件判定・番組解析中...`);
      }
    }
  }, [
    autoPilotConfig,
    race.venue,
    race.raceNo,
    race.deadlineTime,
    race.date,
    activeVenueNames,
    markRaceAsPatrolled,
    transitionToPatrolRace,
    addAutoPilotLog,
    showToast,
  ]);

  // 巡回モード（全国24場巡回 ⇄ 単一会場連続）ワンクリック切替
  const handleToggleAutoPilotTargetMode = useCallback(() => {
    setAutoPilotConfig((prev) => {
      const nextMode = prev.targetMode === 'all_venues' ? 'single_venue' : 'all_venues';
      showToast(
        nextMode === 'all_venues'
          ? '全国24場 横断巡回モードに切り替えました'
          : `単一会場連続モード (${race.venue}) に切り替えました`,
        'info'
      );
      addAutoPilotLog(
        'INFO',
        `巡回モード切替: ${nextMode === 'all_venues' ? '全国24場 横断巡回' : `単一会場連続 (${race.venue})`}`
      );
      return { ...prev, targetMode: nextMode };
    });
  }, [race.venue, showToast, addAutoPilotLog]);

  // 次回巡回予定のプレビュー (〆切時刻が早い順・重複防止反映)
  const nextPatrolPreview = useMemo(() => {
    return getNextPatrolTarget({
      currentVenue: race.venue,
      currentRaceNo: race.raceNo,
      config: autoPilotConfig,
      availableVenues: activeVenueNames.length > 0 ? activeVenueNames : undefined,
      alreadyVotedKeys: patrolledRacesRef.current,
      raceDate: race.date,
      includeCurrentRace: false,
    });
  }, [race.venue, race.raceNo, autoPilotConfig, activeVenueNames, race.date, patrolledCount]);

  // 次レース・待機の強制スキップ
  const handleForceNextRace = useCallback(() => {
    stageExecutionKeyRef.current = '';
    isProcessingStageRef.current = false;
    markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);

    if (autoPilotStage === 'WAITING_RESULT') {
      setAutoPilotCountdown(0);
      setAutoPilotStage('FETCHING_RESULT');
    } else {
      setAutoPilotCountdown(0);
      const next = getNextPatrolTarget({
        currentVenue: race.venue,
        currentRaceNo: race.raceNo,
        config: autoPilotConfig,
        availableVenues: activeVenueNames.length > 0 ? activeVenueNames : undefined,
        alreadyVotedKeys: patrolledRacesRef.current,
        raceDate: race.date,
        includeCurrentRace: false,
      });

      if (next.isRoundComplete && next.remainingQueueCount === 0) {
        setAutoPilotStage('STOPPED');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage('全対象レースの巡回が完了しました（重複巡回防止のため自動停止）');
        addAutoPilotLog('STOP', '【全巡回完了】設定レースをすべて巡回したため自動運転を終了しました');
        showToast('全対象レースの巡回が完了しました', 'info');
        return;
      }

      markRaceAsPatrolled(`${next.nextVenue}-${next.nextRaceNo}`);
      transitionToPatrolRace(next.nextVenue, next.nextRaceNo);
    }
  }, [
    autoPilotStage,
    race.venue,
    race.raceNo,
    race.date,
    autoPilotConfig,
    activeVenueNames,
    markRaceAsPatrolled,
    transitionToPatrolRace,
    addAutoPilotLog,
    showToast,
  ]);

  // グローバルショートカットキー (F9: 自動運転, F12: 設定, Escape: モーダル閉じる)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleToggleAutoPilot();
      } else if (e.key === 'F12') {
        e.preventDefault();
        setActiveModal((prev) => (prev === 'settings' ? null : 'settings'));
      } else if (e.key === 'Escape') {
        setActiveModal(null);
        setShowClearHistoryConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleAutoPilot]);

  // 全自動運転: タイマー制御 & ステージ移行（WAITING_RESULT および NEXT_RACE_WAIT）
  useEffect(() => {
    if (!autoPilotConfig.enabled || autoPilotStage === 'STOPPED' || autoPilotStage === 'SAFETY_STOP') {
      return;
    }

    if (autoPilotStage !== 'WAITING_RESULT' && autoPilotStage !== 'NEXT_RACE_WAIT') {
      return;
    }

    // カウントダウンが0に達した際のステージ進行
    if (autoPilotCountdown <= 0) {
      if (autoPilotStage === 'WAITING_RESULT') {
        setAutoPilotStage('FETCHING_RESULT');
        setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】公式確定結果を取得・照合中...`);
      } else if (autoPilotStage === 'NEXT_RACE_WAIT') {
        // 次の巡回対象会場およびレースを計算し、確実に新番組データを取得して進行 (〆切時刻が早い順・重複巡回完全防止)
        const next = getNextPatrolTarget({
          currentVenue: race.venue,
          currentRaceNo: race.raceNo,
          config: autoPilotConfig,
          availableVenues: activeVenueNames.length > 0 ? activeVenueNames : undefined,
          alreadyVotedKeys: patrolledRacesRef.current,
          raceDate: race.date,
          includeCurrentRace: false,
        });

        if (next.isRoundComplete && next.remainingQueueCount === 0) {
          // 全対象レース巡回完了！重複巡回を完全に防止し自動終了
          setAutoPilotCountdown(0);
          setAutoPilotStage('STOPPED');
          setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
          setAutoPilotMessage(`全対象レース（${next.totalQueueCount}レース）の巡回完了。重複巡回防止のため自動停止しました。`);
          addAutoPilotLog(
            'STOP',
            `【全日程巡回完了】設定された全${next.totalQueueCount}レースの投票・巡回が完了しました。重複巡回防止のため自動終了しました。`
          );
          if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
          showToast(`全対象レースの巡回投票が完了しました（重複巡回防止のため自動終了）`, 'success');
          return;
        }

        markRaceAsPatrolled(`${next.nextVenue}-${next.nextRaceNo}`);
        transitionToPatrolRace(next.nextVenue, next.nextRaceNo);
      }
      return;
    }

    // 1秒刻みのカウントダウン
    const timer = setInterval(() => {
      setAutoPilotCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    autoPilotConfig.enabled,
    autoPilotStage,
    autoPilotCountdown,
    race.venue,
    race.raceNo,
    race.date,
    autoPilotConfig,
    activeVenueNames,
    markRaceAsPatrolled,
    transitionToPatrolRace,
    addAutoPilotLog,
    showToast,
  ]);

  // 全自動運転: アクション実行エンジン（ANALYZING / PREDICTING / VOTING / FETCHING_RESULT）
  useEffect(() => {
    if (!autoPilotConfig.enabled || autoPilotStage === 'STOPPED' || autoPilotStage === 'SAFETY_STOP') {
      return;
    }

    // カウントダウン待機ステージおよび番組同期ステージは別処理
    if (
      autoPilotStage === 'WAITING_RESULT' ||
      autoPilotStage === 'NEXT_RACE_WAIT' ||
      autoPilotStage === 'FETCHING_CARD'
    ) {
      return;
    }

    // 同一レース・同一ステージでの多重実行（複数繰り返し）を完全に防止
    const actionKey = `${race.venue}-${race.raceNo}-${autoPilotStage}`;
    if (stageExecutionKeyRef.current === actionKey || isProcessingStageRef.current) {
      return;
    }
    stageExecutionKeyRef.current = actionKey;

    let isCancelled = false;

    // ステージ 1: ANALYZING (条件判定・気象基準チェック)
    if (autoPilotStage === 'ANALYZING') {
      const currentKey = `${race.venue}-${race.raceNo}`;
      markRaceAsPatrolled(currentKey);

      const safety = evaluateAutoPilotSafety({
        stats,
        config: autoPilotConfig,
        consecutiveLosses,
        currentBalance: autoVoteConfig.accountBalance,
      });

      if (safety.shouldStop) {
        setAutoPilotStage('SAFETY_STOP');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage(`安全停止: ${safety.reason}`);
        if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
        addAutoPilotLog('STOP', `安全停止: ${safety.reason}`);
        showToast(`安全装置作動: ${safety.reason}`, 'error');
        return;
      }

      if (judgment.isStopped) {
        setAutoPilotStage('SAFETY_STOP');
        setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
        setAutoPilotMessage(`STOP発令: ${judgment.reasonTitle}`);
        if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
        addAutoPilotLog('STOP', `STOP発令: ${judgment.reasonTitle}`);
        return;
      }

      if (judgment.isSkipped) {
        setAutoPilotMessage(`気象見送り (${race.weather.windSpeed}m/s, ${race.weather.waveHeight}cm)。次会場へ巡回移行`);
        addAutoPilotLog('SKIP', `【${race.venue} 第${race.raceNo}R】${judgment.reasonTitle} により見送り。次会場へスキップ`);
        markRaceAsPatrolled(currentKey);
        votedRacesRef.current.add(currentKey);
        setAutoPilotCountdown(2);
        setAutoPilotStage('NEXT_RACE_WAIT');
        return;
      }

      // 締切時刻・開催日の厳格判定:
      // 本番実投票モード（!autoPilotConfig.testMode）の場合は、当日締切時間後のレースをスキップ
      // テスト（シミュレーション）モードの場合は、全日程・過去締切レースでもシミュレーション投票を確実に実行
      if (!autoPilotConfig.testMode) {
        const voteEligibility = checkRaceVoteEligibility({
          date: race.date,
          deadlineTime: race.deadlineTime,
          venueName: race.venue,
          raceNo: race.raceNo,
        });

        if (!voteEligibility.canVote && voteEligibility.isToday && voteEligibility.isPastDeadlineToday) {
          setAutoPilotMessage(`本日締切超過 (${voteEligibility.effectiveDeadline}) のため本番投票スキップ。次レースへ巡回移行`);
          addAutoPilotLog(
            'SKIP',
            `【締切超過スキップ】${race.venue} 第${race.raceNo}R (締切: ${voteEligibility.effectiveDeadline})`,
            `本日開催レースで締切時刻を経過しているため実投票を見送り、次レースへスキップします`
          );
          showToast(`【締切超過】本日 ${race.venue} 第${race.raceNo}R は締切済みのため実投票をスキップします`, 'info');
          markRaceAsPatrolled(currentKey);
          votedRacesRef.current.add(currentKey);
          setAutoPilotCountdown(2);
          setAutoPilotStage('NEXT_RACE_WAIT');
          return;
        }
      }

      const timer = setTimeout(() => {
        if (!isCancelled) {
          setAutoPilotStage('PREDICTING');
          setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】予想生成・資金配分を計算中...`);
        }
      }, 500);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }

    // ステージ 2: PREDICTING (予想生成・資金配分)
    if (autoPilotStage === 'PREDICTING') {
      isProcessingStageRef.current = true;
      const timer = setTimeout(async () => {
        if (isCancelled) {
          isProcessingStageRef.current = false;
          return;
        }
        try {
          let currentCands: BetCandidate[] = [];
          if (autoPilotConfig.useAIEnhanced) {
            setAutoPilotMessage(`Gemini AI深層展開分析を実行中...`);
            const aiRes = await generateAIPrediction({ race, scoredBoats, settings });
            if (aiRes && aiRes.aiCandidates.length > 0) {
              setAiPredictionResult(aiRes);
              currentCands = aiRes.aiCandidates;
            }
          }

          if (currentCands.length === 0) {
            const scored = calculateBoatScores(race.boats, settings);
            const generated = generateBetsByType(scored, selectedBetType, selectedPointCount);
            const oddsMap = simulateRealisticOdds(generated, selectedBetType);
            generated.forEach((c) => {
              c.odds = oddsMap[c.combination] || 5.0;
            });
            currentCands = generated;
          }

          const alloc = allocateMoney(currentCands, settings);
          autopilotCandidatesRef.current = alloc.updatedCandidates;
          setCandidates(alloc.updatedCandidates);
          setAllocationInfo(alloc);

          addAutoPilotLog(
            'PREDICT',
            `【${race.venue} 第${race.raceNo}R】予想生成: ${BET_TYPE_LABELS[selectedBetType].label} ${selectedPointCount}点`,
            `総投資予定: ¥${alloc.totalStake.toLocaleString()} (本命: ${alloc.updatedCandidates[0]?.combination || '-'})`
          );

          isProcessingStageRef.current = false;

          if (autoPilotConfig.executeAutoVote) {
            setAutoPilotStage('VOTING');
            setAutoPilotMessage(`テレボートへ自動投票リクエスト送信中...`);
          } else {
            markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);
            setAutoPilotCountdown(3);
            setAutoPilotStage('WAITING_RESULT');
            setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】レース発走待機中...`);
          }
        } catch (e) {
          console.error('Autopilot predict error:', e);
          markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);
          isProcessingStageRef.current = false;
          setAutoPilotCountdown(3);
          setAutoPilotStage('NEXT_RACE_WAIT');
        }
      }, 500);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        isProcessingStageRef.current = false;
      };
    }

    // ステージ 3: VOTING (テレボート自動投票) - 多重投票を完全に防止
    if (autoPilotStage === 'VOTING') {
      const raceVoteKey = `${race.venue}-${race.raceNo}`;
      markRaceAsPatrolled(raceVoteKey);

      // 同一会場・同一レースへの多重投票を完全抑止
      if (votedRacesRef.current.has(raceVoteKey)) {
        addAutoPilotLog('INFO', `【${race.venue} 第${race.raceNo}R】は投票済みです。結果待ちへ移行`);
        setAutoPilotCountdown(2);
        setAutoPilotStage('WAITING_RESULT');
        setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】レース発走・確定着順待機中...`);
        return;
      }
      votedRacesRef.current.add(raceVoteKey);
      isProcessingStageRef.current = true;

      const timer = setTimeout(async () => {
        if (isCancelled) {
          isProcessingStageRef.current = false;
          return;
        }
        try {
          // 買い目候補が未配分または空の場合は直前予想から確実に補完
          let betsToVote = autopilotCandidatesRef.current && autopilotCandidatesRef.current.length > 0 && autopilotCandidatesRef.current.some((c) => (c.stake || 0) > 0)
            ? autopilotCandidatesRef.current
            : candidates;

          if (betsToVote.length === 0 || betsToVote.every((c) => (c.stake || 0) === 0)) {
            const scored = calculateBoatScores(race.boats, settings);
            const generated = generateBetsByType(scored, selectedBetType, selectedPointCount);
            const oddsMap = simulateRealisticOdds(generated, selectedBetType);
            generated.forEach((c) => {
              c.odds = oddsMap[c.combination] || 5.0;
            });
            const alloc = allocateMoney(generated, settings);
            betsToVote = alloc.updatedCandidates;
            setCandidates(alloc.updatedCandidates);
            setAllocationInfo(alloc);
            autopilotCandidatesRef.current = alloc.updatedCandidates;
          }

          if (!autoPilotConfig.testMode) {
            // 本番実投票モード: テレボート実投票マネージャーを開き、ユーザーに公式購入を実行・確定させる
            setActiveModal('realVote');
            setAutoPilotMessage(`【実投票待機】第${race.raceNo}Rの買い目をテレボートへ反映・購入してください`);
            const totalBetSum = betsToVote.reduce((s, b) => s + (b.stake || 0), 0);
            addAutoPilotLog(
              'VOTE',
              `実投票待機: テレボート実投票マネージャーを開きました`,
              `【${race.venue} 第${race.raceNo}R】${betsToVote.length}点 計¥${totalBetSum.toLocaleString()} (購入完了後に「実投票完了を確定」)`
            );
            isProcessingStageRef.current = false;
            return;
          }

          // テスト仮想投票（シミュレーション）モード
          const effectiveConfig: AutoVoteConfig = {
            ...autoVoteConfig,
            testMode: true,
          };
          const voteResult = await executeAutoVote({
            race,
            candidates: betsToVote,
            config: effectiveConfig,
          });

          if (!isCancelled) {
            if (voteResult.success) {
              setVoteLogs((prev) => [...voteResult.logs, ...prev]);
              // テスト仮想残高を減算・連動更新
              setAutoVoteConfig((prev) => ({
                ...prev,
                accountBalance: voteResult.newBalance,
                lastSyncTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
              }));
              if (autoPilotConfig.soundAlert) playAutoPilotSound('vote');
              addAutoPilotLog(
                'VOTE',
                `【テスト仮想投票】シミュレーション投票完了 (実テレボートへの出金なし)`,
                `【${race.venue} 第${race.raceNo}R】${betsToVote.length}点 計¥${voteResult.totalVoted.toLocaleString()} (仮想残高: ¥${voteResult.newBalance.toLocaleString()})`
              );
              showToast(
                `【テスト仮想投票】${race.venue} 第${race.raceNo}R 計¥${voteResult.totalVoted.toLocaleString()} 仮想投票しました (シミュレーション)`,
                'success'
              );
            } else {
              addAutoPilotLog('VOTE', `投票エラー: ${voteResult.error}`);
              showToast(`投票エラー: ${voteResult.error}`, 'error');
            }

            isProcessingStageRef.current = false;
            setAutoPilotCountdown(3);
            setAutoPilotStage('WAITING_RESULT');
            setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】レース発走・確定着順待機中...`);
          }
        } catch (e) {
          console.error('Autopilot vote error:', e);
          isProcessingStageRef.current = false;
          setAutoPilotCountdown(3);
          setAutoPilotStage('WAITING_RESULT');
        }
      }, 500);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        isProcessingStageRef.current = false;
      };
    }

    // ステージ 5: FETCHING_RESULT (確定結果取得 & 的中照合)
    if (autoPilotStage === 'FETCHING_RESULT') {
      isProcessingStageRef.current = true;
      const timer = setTimeout(async () => {
        if (isCancelled) {
          isProcessingStageRef.current = false;
          return;
        }

        // 1. 公式レース確定チェック（未確定レースでのフライング的中判定を完全防止）
        const confirmation = checkRaceConfirmation({
          date: race.date,
          deadlineTime: race.deadlineTime,
          venueName: race.venue,
          raceNo: race.raceNo,
        });

        // 確定していないレース（発売中・締切前・審判中）の場合は的中判定を絶対に行わない！
        if (!confirmation.isConfirmed) {
          isProcessingStageRef.current = false;
          markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);
          addAutoPilotLog(
            'INFO',
            `【未確定保留】${race.venue} 第${race.raceNo}R（${confirmation.statusText}）`,
            `締切: ${race.deadlineTime}。公式着順確定前のため的中判断・収支集計は行わず、投票完了として次レースへ巡回を進めます。`
          );
          showToast(
            `【投票受付済】第${race.raceNo}Rは未確定（${confirmation.statusText}）のため的中判定は保留し、次レースへ進みます`,
            'info'
          );
          setLatestResultNotice({
            venue: race.venue,
            raceNo: race.raceNo,
            raceTitle: race.raceTitle,
            finishOrder: '未確定（着順待機中）',
            first: 0,
            second: 0,
            third: 0,
            winningTechnique: confirmation.statusText,
            officialPayout: 0,
            popularityRank: 0,
            isHit: false,
            isConfirmed: false,
            statusMessage: `【${confirmation.statusText}】締切: ${race.deadlineTime}。公式レース着順確定前のため的中判断は保留されました。`,
            totalStake: candidates.reduce((sum, c) => sum + (c.stake || 0), 0),
            totalReturn: 0,
            profit: 0,
          });

          const delay = autoPilotConfig.advanceDelaySeconds || 4;
          setAutoPilotCountdown(delay);
          setAutoPilotStage('NEXT_RACE_WAIT');
          setAutoPilotMessage(`【${race.venue} 第${race.raceNo}R】未確定のため判定保留。次レースへ巡回待機中 (${delay}秒)...`);
          return;
        }

        try {
          const res = await fetchRaceResult({
            date: race.date,
            venueName: race.venue,
            raceNo: race.raceNo,
            boats: race.boats,
            deadlineTime: race.deadlineTime,
          });

          if (isCancelled) {
            isProcessingStageRef.current = false;
            return;
          }

          const currentBets = autopilotCandidatesRef.current && autopilotCandidatesRef.current.length > 0
            ? autopilotCandidatesRef.current
            : candidates;

          const matchedCandidate = currentBets.find(
            (c) => isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder) && c.stake > 0
          );
          const isHit = !!matchedCandidate;

          let payout100 = res.officialPayout;
          if (selectedBetType !== '3t' && matchedCandidate) {
            payout100 = getEstimatedOfficialPayout(res.officialPayout, selectedBetType, matchedCandidate.odds);
          }

          const totalStake = currentBets.reduce((sum, c) => sum + (c.stake || 0), 0);
          const totalReturn = isHit && matchedCandidate ? Math.floor((matchedCandidate.stake * payout100) / 100) : 0;
          const profit = totalReturn - totalStake;

          const newRecord: RaceHistoryRecord = {
            id: `ap-rec-${Date.now()}`,
            timestamp: new Date().toLocaleString('ja-JP'),
            date: race.date,
            venue: race.venue,
            raceNo: race.raceNo,
            raceTitle: race.raceTitle,
            status: isHit ? 'Teki2' : 'Hazure',
            betType: selectedBetType,
            pointCount: selectedPointCount,
            bets: currentBets.map((c) => ({
              combination: c.combination,
              odds: c.odds,
              stake: c.stake,
              expectedReturn: c.expectedReturn,
              isHit: isBetHit(c.combination, c.betType || selectedBetType, res.finishOrder),
            })),
            totalStake,
            finishOrder: res.finishOrder,
            officialPayout: payout100,
            totalReturn,
            profit,
            isHit,
          };

          setHistory((prev) => [newRecord, ...prev]);
          setLastFinishedStatus(isHit ? 'Teki2' : 'Hazure');
          markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);

          // 的中払戻金をテレボート口座残高に自動反映・入金連動
          if (isHit && totalReturn > 0) {
            setAutoVoteConfig((prev) => ({
              ...prev,
              accountBalance: prev.accountBalance + totalReturn,
            }));
          }

          setLatestResultNotice({
            venue: race.venue,
            raceNo: race.raceNo,
            raceTitle: race.raceTitle,
            finishOrder: res.finishOrder,
            first: res.first,
            second: res.second,
            third: res.third,
            winningTechnique: res.winningTechnique,
            officialPayout: res.officialPayout,
            popularityRank: res.popularityRank,
            isHit,
            isConfirmed: true,
            totalStake,
            totalReturn,
            profit,
            hitCombination: matchedCandidate?.combination,
          });

          setAutoSessionRaces((prev) => prev + 1);
          setAutoSessionProfit((prev) => prev + profit);

          if (isHit) {
            setAutoSessionHits((prev) => prev + 1);
            setConsecutiveLosses(0);
            if (autoPilotConfig.soundAlert) playAutoPilotSound('hit');
            addAutoPilotLog('HIT', `★ 的中！ 着順 ${res.finishOrder} (${payout100}円)`, `純利益 +¥${profit.toLocaleString()}`);
            showToast(`★ 的中！【${race.venue} 第${race.raceNo}R】着順 ${res.finishOrder} (+¥${profit.toLocaleString()})`, 'success');
          } else {
            setConsecutiveLosses((prev) => prev + 1);
            addAutoPilotLog('MISS', `不的中 着順 ${res.finishOrder}`, `投資損 -¥${totalStake.toLocaleString()}`);
            showToast(`確定着順 ${res.finishOrder} - 不的中 (-¥${totalStake.toLocaleString()})`, 'info');
          }

          const safetyAfter = evaluateAutoPilotSafety({
            stats: calculateStatistics([newRecord, ...history]),
            config: autoPilotConfig,
            consecutiveLosses: isHit ? 0 : consecutiveLosses + 1,
            currentBalance: autoVoteConfig.accountBalance,
          });

          isProcessingStageRef.current = false;

          if (safetyAfter.shouldStop) {
            setAutoPilotStage('SAFETY_STOP');
            setAutoPilotConfig((prev) => ({ ...prev, enabled: false }));
            setAutoPilotMessage(`安全停止: ${safetyAfter.reason}`);
            if (autoPilotConfig.soundAlert) playAutoPilotSound('stop');
            addAutoPilotLog('STOP', `安全停止: ${safetyAfter.reason}`);
            showToast(`セーフティ安全装置作動: ${safetyAfter.reason}`, 'error');
            return;
          }

          const delay = autoPilotConfig.advanceDelaySeconds || 4;
          setAutoPilotCountdown(delay);
          setAutoPilotStage('NEXT_RACE_WAIT');
          setAutoPilotMessage(`次レースへ移行待機中 (${delay}秒)...`);
        } catch (e) {
          console.error('Autopilot fetch result error:', e);
          markRaceAsPatrolled(`${race.venue}-${race.raceNo}`);
          isProcessingStageRef.current = false;
          setAutoPilotCountdown(3);
          setAutoPilotStage('NEXT_RACE_WAIT');
        }
      }, 500);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        isProcessingStageRef.current = false;
      };
    }
  }, [
    autoPilotConfig.enabled,
    autoPilotStage,
    race.venue,
    race.raceNo,
    stats,
    judgment,
    race,
    candidates,
    selectedBetType,
    selectedPointCount,
    settings,
    autoVoteConfig,
    consecutiveLosses,
    history,
    scoredBoats,
    addAutoPilotLog,
    showToast,
  ]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none relative">
      {/* グローバルトースト通知 */}
      {toast && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-2xl text-xs font-bold flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-rose-200'
              : toast.type === 'info'
              ? 'bg-slate-900 border-blue-500 text-blue-200'
              : 'bg-emerald-950 border-emerald-500 text-emerald-200'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 履歴全削除確認モーダル（グローバル） */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400" />
              <h4 className="text-sm font-bold text-white">収支履歴の全件削除確認</h4>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                現在記録されているすべてのレース予想・収支シミュレーション履歴（全{' '}
                <strong className="text-amber-300 font-mono text-sm">{history.length}件</strong>
                ）を完全に消去しますか？
              </p>
              <p className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded border border-rose-900">
                ※削除を実行すると、投資額・払戻額・回収率・純利益の集計データおよび推移グラフもすべて初期化（0件）されます。この操作は取り消せません。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-4 py-1.5 rounded text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>完全に全消去する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Windows 11 Fluent タイトルバー */}
      <TitleBar
        currentVenue={race.venue}
        currentRaceNo={race.raceNo}
        manualStop={manualStop}
        onToggleManualStop={() => setManualStop(!manualStop)}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenHelp={() => setActiveModal('help')}
        onExportCsv={handleExportCsv}
        onSelectPreset={handleSelectPreset}
        onOpenFetchRace={() => setActiveModal('fetchRace')}
        onOpenExeModal={() => setActiveModal('exe')}
        onOpenAutoVote={() => setActiveModal('autoVote')}
        isAutoVoteEnabled={autoVoteConfig.enabled}
        isTeleboatConnected={autoVoteConfig.connectionStatus === 'CONNECTED'}
        teleboatBalance={autoVoteConfig.accountBalance}
        onOpenBalanceSync={() => setActiveModal('balanceSync')}
        onOpenAIPrediction={handleRunAIPrediction}
        onOpenAutoPilot={() => setActiveModal('autoPilot')}
        isAutoPilotRunning={autoPilotConfig.enabled && autoPilotStage !== 'STOPPED' && autoPilotStage !== 'SAFETY_STOP'}
        onOpenPCExtension={() => setActiveModal('pcExtension')}
        isExtensionConnected={isExtensionConnected}
      />

      {/* 2. メニューバー */}
      <MenuBar
        onExportCsv={handleExportCsv}
        onClearHistory={() => setShowClearHistoryConfirm(true)}
        onRunPrediction={handleRunPrediction}
        onRunAIPrediction={handleRunAIPrediction}
        onSimulateOdds={handleSimulateOdds}
        onChangeAllocationMode={(mode: AllocationMode) => {
          setSettings((prev) => ({ ...prev, allocationMode: mode }));
          const alloc = allocateMoney(candidates, { ...settings, allocationMode: mode });
          setCandidates(alloc.updatedCandidates);
          setAllocationInfo(alloc);
        }}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenHelp={() => setActiveModal('help')}
        onOpenHistory={() => setActiveModal('history')}
        onResetToDefaultRace={handleResetToDefaultRace}
        onOpenFetchRace={() => setActiveModal('fetchRace')}
        onAutoFetchResult={handleAutoFetchResult}
        onOpenExeModal={() => setActiveModal('exe')}
        onOpenAutoVote={() => setActiveModal('autoVote')}
        onOpenRealVote={() => setActiveModal('realVote')}
        onOpenBalanceSync={() => setActiveModal('balanceSync')}
        onImportRealData={handleImportRealData}
        onOpenAutoPilot={() => setActiveModal('autoPilot')}
        onToggleAutoPilot={handleToggleAutoPilot}
        isAutoPilotRunning={autoPilotConfig.enabled && autoPilotStage !== 'STOPPED' && autoPilotStage !== 'SAFETY_STOP'}
        onOpenPCExtension={() => setActiveModal('pcExtension')}
        isExtensionConnected={isExtensionConnected}
      />

      {/* 3. 状態アラートバナー (見送り / STOP / NG 時のトップ案内) */}
      {(judgment.isStopped || judgment.isSkipped || judgment.isNg) && (
        <div
          className={`px-4 py-1.5 flex items-center justify-between text-xs font-medium border-b select-none transition-colors ${
            judgment.isStopped
              ? 'bg-red-950/80 border-red-700 text-red-200'
              : judgment.isSkipped
              ? 'bg-amber-950/80 border-amber-700 text-amber-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
            <strong className="font-bold">{judgment.reasonTitle}:</strong>
            <span>{judgment.reasonDetail}</span>
          </div>

          <div className="flex items-center gap-2">
            {judgment.isStopped && (
              <button
                onClick={() => setManualStop(false)}
                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
              >
                STOP解除
              </button>
            )}
            <button
              onClick={() => setActiveModal('settings')}
              className="text-[11px] underline text-slate-300 hover:text-white"
            >
              閾値設定確認
            </button>
          </div>
        </div>
      )}

      {/* 4. メインコンテンツ領域（スクロール可能） */}
      <main className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {/* 全自動運転 コックピットHUDバー */}
        <AutoPilotControlBar
          config={autoPilotConfig}
          stage={autoPilotStage}
          currentMessage={autoPilotMessage}
          countdownSeconds={autoPilotCountdown}
          autoSessionRaces={autoSessionRaces}
          autoSessionHits={autoSessionHits}
          autoSessionProfit={autoSessionProfit}
          currentVenue={race.venue}
          currentRaceNo={race.raceNo}
          nextTargetVenue={nextPatrolPreview.nextVenue}
          nextTargetRaceNo={nextPatrolPreview.nextRaceNo}
          nextDeadlineTime={nextPatrolPreview.nextDeadlineTime}
          teleboatBalance={autoVoteConfig.accountBalance}
          patrolledCount={patrolledCount}
          totalPatrolQueueCount={nextPatrolPreview.totalQueueCount}
          onOpenBalanceSync={() => setActiveModal('balanceSync')}
          onToggleAutoPilot={handleToggleAutoPilot}
          onToggleTargetMode={handleToggleAutoPilotTargetMode}
          onOpenAutoPilotModal={() => setActiveModal('autoPilot')}
          onForceNextRace={handleForceNextRace}
          onToggleSound={() =>
            setAutoPilotConfig((prev) => ({ ...prev, soundAlert: !prev.soundAlert }))
          }
        />

        {/* エリア A & D: 開催・レース情報 & 気象条件 (本日開催場クイックバー & 正確な締切電光盤) */}
        <RaceHeaderSection
          race={race}
          onUpdateRace={handleUpdateRace}
          onUpdateWeather={handleUpdateWeather}
          onFetchRace={handleFetchRace}
          onOpenFetchRace={() => setActiveModal('fetchRace')}
          onAutoFetchResult={handleAutoFetchResult}
          isFetchingRace={isFetchingRace}
          isFetchingResult={isFetchingResult}
          windThreshold={settings.windSpeedThreshold}
          waveThreshold={settings.waveHeightThreshold}
        />

        {/* 確定結果 / 未確定案内速報カード (結果取得後に自動表示) */}
        {latestResultNotice && (
          <div
            className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 shadow-lg select-none animate-in fade-in slide-in-from-top-2 ${
              !latestResultNotice.isConfirmed
                ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border-amber-600/70 text-amber-100'
                : latestResultNotice.isHit
                ? 'bg-gradient-to-r from-amber-950/90 via-yellow-950/60 to-slate-900 border-amber-500 text-yellow-100'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded font-black text-sm flex items-center gap-1.5 shadow-sm ${
                  !latestResultNotice.isConfirmed
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : latestResultNotice.isHit
                    ? 'bg-amber-400 text-slate-950 animate-bounce'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {!latestResultNotice.isConfirmed ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>【公式結果 未確定】</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>{latestResultNotice.isHit ? '★ レース的中！' : '不的中'}</span>
                  </>
                )}
              </div>

              {!latestResultNotice.isConfirmed ? (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      {latestResultNotice.venue} {latestResultNotice.raceTitle}
                    </span>
                    <span className="text-[11px] text-amber-300 font-bold">
                      {latestResultNotice.winningTechnique}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {latestResultNotice.statusMessage ||
                      '公式レース終了・着順確定前のため、的中判断は保留されています。レース終了後に再度結果取得を行ってください。'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      {latestResultNotice.venue} {latestResultNotice.raceTitle}
                    </span>
                    <span className="text-[11px] text-slate-300">確定着順:</span>
                    <span className="font-mono font-black text-amber-300 text-base tracking-wider">
                      {latestResultNotice.finishOrder}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({latestResultNotice.winningTechnique} / {latestResultNotice.popularityRank}番人気)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                    3連単確定払戻:{' '}
                    <strong className="text-amber-300">
                      {latestResultNotice.officialPayout.toLocaleString()}円
                    </strong>
                    <span className="mx-2 text-slate-600">|</span>
                    投資:{' '}
                    <strong>{latestResultNotice.totalStake.toLocaleString()}円</strong> → 払戻:{' '}
                    <strong className="text-amber-300">
                      {latestResultNotice.totalReturn.toLocaleString()}円
                    </strong>
                    <span className="mx-2 text-slate-600">|</span>
                    純利益:{' '}
                    <span
                      className={`font-black ${
                        latestResultNotice.profit > 0
                          ? 'text-emerald-400'
                          : latestResultNotice.profit < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {latestResultNotice.profit > 0
                        ? `+${latestResultNotice.profit.toLocaleString()}`
                        : latestResultNotice.profit.toLocaleString()}
                      円
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNextRace}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-md flex items-center gap-1 cursor-pointer transition-colors"
                title="次のレースの番組表を取得して自動予想"
              >
                <span>次のレースへ進む</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLatestResultNotice(null)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
                title="通知を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2カラムレイアウト: 左 艇データ(エリアB) / 右 状態スタンプ(エリアE) & 配分設定 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
          {/* 左カラム: 出走表 1〜6号艇データ */}
          <div className="lg:col-span-8">
            <BoatTable
              boats={race.boats}
              scoredBoats={scoredBoats}
              onUpdateBoat={handleUpdateBoat}
              onQuickSimulateExhibition={handleQuickSimulateExhibition}
            />
          </div>

          {/* 右カラム: 状態スタンプ(付録C) & 資金配分設定パネル */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {/* エリア E: 状態画像・スタンプ表示 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 flex items-center justify-around select-none">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">システム判定状態</span>
                <span className="font-bold text-slate-200 text-xs">{judgment.reasonTitle}</span>
              </div>
              <StatusStamp
                status={judgment.status}
                size="md"
                reason={judgment.reasonDetail}
                showTextLabel={false}
              />
            </div>

            {/* 資金配分設定パネル */}
            <AllocationPanel
              settings={settings}
              onUpdateSettings={(updated) => {
                const next = { ...settings, ...updated };
                setSettings(next);
                if (candidates.length > 0) {
                  const alloc = allocateMoney(candidates, next);
                  setCandidates(alloc.updatedCandidates);
                  setAllocationInfo(alloc);
                }
              }}
              onRunAllocation={handleCalculateAllocation}
              warningMessage={allocationInfo.warningMessage}
              isOverBudget={allocationInfo.isOverBudget}
            />
          </div>
        </div>

        {/* エリア C: 可変券種・可変点数対応 予想候補 & 資金配分テーブル */}
        <PredictionSection
          candidates={candidates}
          currentBetType={selectedBetType}
          pointCount={selectedPointCount}
          onChangeBetType={handleChangeBetType}
          onChangePointCount={handleChangePointCount}
          onUpdateOdds={handleUpdateOdds}
          onRunPrediction={handleRunPrediction}
          onRunAIPrediction={handleRunAIPrediction}
          isAILoading={isAILoading}
          onSimulateOdds={handleSimulateOdds}
          onCalculateAllocation={handleCalculateAllocation}
          onOpenResultModal={() => setActiveModal('result')}
          onAutoFetchResult={handleAutoFetchResult}
          onOpenAutoVote={() => setActiveModal('autoVote')}
          onOpenRealVoteModal={() => setActiveModal('realVote')}
          isAutoVoteEnabled={autoVoteConfig.enabled}
          isSkipped={judgment.isSkipped}
          isStopped={judgment.isStopped}
          minOdds={settings.minOdds}
          maxOdds={settings.maxOdds}
        />
      </main>

      {/* 5. エリア F: 収支・統計管理バー (固定フッター & 全国24場別収支 & 10走推移グラフ) */}
      <footer className="p-2 border-t border-slate-800 bg-slate-950">
        <StatisticsBar
          stats={stats}
          venueStats={venueStats}
          history={history}
          dailyProfitTarget={settings.dailyProfitTarget}
          dailyLossLimit={settings.dailyLossLimit}
          onOpenHistory={() => setActiveModal('history')}
          onClearHistory={() => setShowClearHistoryConfirm(true)}
          onImportRealData={handleImportRealData}
          selectedVenueFilter={selectedVenueFilter}
          onSelectVenueFilter={setSelectedVenueFilter}
        />
      </footer>

      {/* モーダル群 */}
      {activeModal === 'result' && (
        <ResultModal
          race={race}
          candidates={candidates}
          onConfirmResult={handleConfirmResult}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'history' && (
        <HistoryModal
          history={history}
          onExportCsv={handleExportCsv}
          onClearHistory={handleClearHistory}
          onDeleteRecord={handleDeleteRecord}
          onImportRealData={handleImportRealData}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            const alloc = allocateMoney(candidates, newSettings);
            setCandidates(alloc.updatedCandidates);
            setAllocationInfo(alloc);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'help' && (
        <HelpModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'fetchRace' && (
        <FetchRaceModal
          currentDate={race.date}
          currentVenue={race.venue}
          currentRaceNo={race.raceNo}
          onRaceFetched={handleRaceFetched}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'exe' && (
        <ExeDistributionModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'autoVote' && (
        <AutoVoteModal
          race={race}
          candidates={candidates}
          config={autoVoteConfig}
          onUpdateConfig={setAutoVoteConfig}
          onExecuteVote={handleExecuteVote}
          onOpenRealVoteModal={() => setActiveModal('realVote')}
          onOpenBalanceSync={() => setActiveModal('balanceSync')}
          onOpenPCExtensionModal={() => setActiveModal('pcExtension')}
          isVoting={isVoting}
          voteLogs={voteLogs}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'aiPrediction' && (
        <AIPredictionModal
          race={race}
          aiResult={aiPredictionResult}
          isLoading={isAILoading}
          onApplyAICandidates={handleApplyAICandidates}
          onReGenerate={handleRunAIPrediction}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'autoPilot' && (
        <AutoPilotModal
          config={autoPilotConfig}
          stage={autoPilotStage}
          logs={autoPilotLogs}
          teleboatConfig={autoVoteConfig}
          activeVenues={activeVenues}
          patrolledKeys={patrolledRacesRef.current}
          onResetPatrolledHistory={handleResetPatrolHistory}
          onBatchFetchVenues={handleBatchFetchVenues}
          onOpenAutoVoteModal={() => setActiveModal('autoVote')}
          onOpenBalanceSync={() => setActiveModal('balanceSync')}
          onUpdateConfig={(updated) => setAutoPilotConfig((prev) => ({ ...prev, ...updated }))}
          onToggleAutoPilot={handleToggleAutoPilot}
          onClearLogs={() => setAutoPilotLogs([])}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'realVote' && (
        <TeleboatRealVoteModal
          race={race}
          candidates={candidates}
          config={autoVoteConfig}
          onConfirmRealVote={handleConfirmRealVote}
          onOpenBalanceSync={() => setActiveModal('balanceSync')}
          onOpenPCExtensionModal={() => setActiveModal('pcExtension')}
          isExtensionConnected={isExtensionConnected}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'balanceSync' && (
        <TeleboatBalanceSyncModal
          currentBalance={autoVoteConfig.accountBalance}
          onSaveBalance={(newBalance) => {
            setAutoVoteConfig((prev) => ({
              ...prev,
              accountBalance: newBalance,
              lastSyncTime: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
              connectionStatus: 'CONNECTED',
            }));
            showToast(`テレボート実残高を ¥${newBalance.toLocaleString()} に同期・設定しました`, 'success');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'pcExtension' && (
        <PCExtensionModal
          race={race}
          candidates={candidates}
          isExtensionConnected={isExtensionConnected}
          isSimulationMode={isExtensionSimulation}
          betPassword={autoVoteConfig.teleboatAccount?.betPassword}
          onClose={() => setActiveModal(null)}
          onPingExtension={(showNotice) => {
            sendExtensionPing(showNotice ?? true);
          }}
          onToggleSimulationMode={handleToggleExtensionSimulation}
        />
      )}
    </div>
  );
}
