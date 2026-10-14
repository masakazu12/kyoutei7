/**
 * 12. 全自動運転 (Autopilot) 制御サービス
 * 番組巡回・条件判定・予想・オッズ配分・自動投票・結果取得・安全停止の自動サイクル制御
 */

import { AutoPilotConfig, AutoPilotStage, AutoPilotLogItem, DayStatistics } from '../types/kyotei';
import { VENUES } from '../constants/venues';
import {
  getStandardDeadlineTime,
  MIDNIGHT_VENUES,
  NIGHTER_VENUES,
  MORNING_VENUES,
} from './deadlineService';

export interface StageMeta {
  stage: AutoPilotStage;
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

export const AUTOPILOT_STAGE_META: Record<AutoPilotStage, StageMeta> = {
  STOPPED: {
    stage: 'STOPPED',
    label: '停止中',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-500',
    description: '自動運転は待機しています。STARTボタンで開始します。',
  },
  FETCHING_CARD: {
    stage: 'FETCHING_CARD',
    label: '番組同期中',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-600',
    dotClass: 'bg-teal-400 animate-spin',
    description: '次会場の出走表・展示・番組データを受信・解析準備中...',
  },
  ANALYZING: {
    stage: 'ANALYZING',
    label: '番組・気象解析',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600',
    dotClass: 'bg-cyan-400 animate-ping',
    description: '出走表・展示タイム・気象条件（風速・波高）を取得・検査中...',
  },
  PREDICTING: {
    stage: 'PREDICTING',
    label: '予想・資金配分',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-600',
    dotClass: 'bg-blue-400 animate-pulse',
    description: '指定券種・点数に応じた買い目選定および最適資金配分を計算中...',
  },
  VOTING: {
    stage: 'VOTING',
    label: '公式投票連携',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600',
    dotClass: 'bg-purple-400 animate-ping',
    description: '競輪投票システムへ投票指図を送信中...',
  },
  WAITING_RESULT: {
    stage: 'WAITING_RESULT',
    label: 'レース発走・結果待機',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600',
    dotClass: 'bg-amber-400 animate-pulse',
    description: 'レース発走および公式確定着順の発表を待機中...',
  },
  FETCHING_RESULT: {
    stage: 'FETCHING_RESULT',
    label: '確定結果取得・照合',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-600',
    dotClass: 'bg-indigo-400 animate-ping',
    description: '公式確定結果を取得し、的中判定・払戻収支を自動登録中...',
  },
  NEXT_RACE_WAIT: {
    stage: 'NEXT_RACE_WAIT',
    label: '次レース移行準備',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600',
    dotClass: 'bg-emerald-400 animate-pulse',
    description: 'インターバル待機中。次の対象レースへ自動移行します...',
  },
  SAFETY_STOP: {
    stage: 'SAFETY_STOP',
    label: '安全停止 (セーフティ作動)',
    badgeClass: 'bg-rose-950/90 text-rose-300 border-rose-600',
    dotClass: 'bg-rose-500 animate-ping',
    description: '目標利益達成または損失限度・連続不的中安全装置が作動し停止しました。',
  },
};

/**
 * Web Audio API 音声効果音（ブラウザネイティブ、外部ファイル不要）
 */
export function playAutoPilotSound(type: 'start' | 'vote' | 'hit' | 'miss' | 'stop' | 'skip') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'start') {
      // 起動音: 上昇アルペジオ (440 -> 660 -> 880Hz)
      [440, 660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.12);
      });
    } else if (type === 'vote') {
      // 投票音: 2トーンピピッ (780 -> 1040Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      osc.frequency.setValueAtTime(1040, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'hit') {
      // 的中ファンファーレ (523 -> 659 -> 783 -> 1046Hz)
      [523, 659, 783, 1046].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.25);
      });
    } else if (type === 'stop') {
      // 停止警告音: 下降トーン (600 -> 300Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    }
  } catch (e) {
    // AudioContext政策等で制限された場合は静かに無視
  }
}

/**
 * 自動運転セーフティ判定
 */
export function evaluateAutoPilotSafety(params: {
  stats: DayStatistics;
  config: AutoPilotConfig;
  consecutiveLosses: number;
  currentBalance: number;
}): { shouldStop: boolean; reason: string } {
  const { stats, config, consecutiveLosses, currentBalance } = params;

  // 1. 目標利益達成チェック
  if (config.dailyProfitTarget > 0 && stats.netProfit >= config.dailyProfitTarget) {
    return {
      shouldStop: true,
      reason: `目標利益達成 (+${stats.netProfit.toLocaleString()}円 / 目標 ${config.dailyProfitTarget.toLocaleString()}円)。利益確保のため自動停止しました。`,
    };
  }

  // 2. 損失上限到達チェック
  if (config.dailyLossLimit > 0 && stats.netProfit <= -config.dailyLossLimit) {
    return {
      shouldStop: true,
      reason: `許容損失上限到達 (${stats.netProfit.toLocaleString()}円 / 限度 -${config.dailyLossLimit.toLocaleString()}円)。資産保護のため自動停止しました。`,
    };
  }

  // 3. 連続不的中チェック
  if (config.maxConsecutiveLosses > 0 && consecutiveLosses >= config.maxConsecutiveLosses) {
    return {
      shouldStop: true,
      reason: `連続不的中リミット到達 (${consecutiveLosses}回連続不的中)。トレンド転換まで一時停止しました。`,
    };
  }

  // 4. 残高不足チェック (実投票時)
  if (!config.testMode && currentBalance < 1000) {
    return {
      shouldStop: true,
      reason: `テレボート口座残高不足 (現在残高: ${currentBalance.toLocaleString()}円)。入金が必要です。`,
    };
  }

  return { shouldStop: false, reason: '' };
}

/**
 * 全国43競輪場 完全巡回リスト
 */
export const ALL_24_VENUES: string[] = VENUES.map((v) => v.name);

export const DEFAULT_PATROL_VENUES: string[] = ALL_24_VENUES;

export interface PatrolRaceItem {
  venue: string;
  raceNo: number;
  deadlineTime: string;
  deadlineMinutes: number;
  category: 'モーニング' | 'デイ' | 'ナイター' | 'ミッドナイト';
  key: string;
  isVoted: boolean;
}

export interface NextPatrolTargetResult {
  nextVenue: string;
  nextRaceNo: number;
  nextDeadlineTime: string;
  isRoundComplete: boolean;
  queueIndex?: number;
  totalQueueCount: number;
  completedQueueCount: number;
  remainingQueueCount: number;
  isRepeatPrevented?: boolean;
  candidate?: PatrolRaceItem;
}

/**
 * 巡回対象全レースのスケジュールキューを構築
 * 〆切時刻が早い順 (deadline_asc) または 会場順 (venue_round_robin) にソート
 */
export function buildPatrolQueue(params: {
  config: AutoPilotConfig;
  availableVenues?: string[];
  alreadyVotedKeys?: Set<string>;
  currentVenue?: string;
}): PatrolRaceItem[] {
  const { config, availableVenues, alreadyVotedKeys, currentVenue } = params;

  // 1. 会場プールの決定
  let venuePool: string[] = [];
  if (config.targetMode === 'single_venue') {
    venuePool = [currentVenue || '平塚'];
  } else {
    venuePool =
      config.targetVenues && config.targetVenues.length > 0
        ? config.targetVenues
        : availableVenues && availableVenues.length > 0
        ? availableVenues
        : ALL_24_VENUES;
  }

  const startR = Math.min(12, Math.max(1, config.startRaceNo || 1));
  const endR = Math.min(12, Math.max(startR, config.endRaceNo || 12));

  const toMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 720;
    const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
    return (h || 0) * 60 + (m || 0);
  };

  const getCategory = (v: string): 'モーニング' | 'デイ' | 'ナイター' | 'ミッドナイト' => {
    if (MIDNIGHT_VENUES.includes(v)) return 'ミッドナイト';
    if (NIGHTER_VENUES.includes(v)) return 'ナイター';
    if (MORNING_VENUES.includes(v)) return 'モーニング';
    return 'デイ';
  };

  const items: PatrolRaceItem[] = [];

  for (const venue of venuePool) {
    for (let r = startR; r <= endR; r++) {
      const deadline = getStandardDeadlineTime(venue, r);
      const key = `${venue}-${r}`;
      items.push({
        venue,
        raceNo: r,
        deadlineTime: deadline,
        deadlineMinutes: toMinutes(deadline),
        category: getCategory(venue),
        key,
        isVoted: alreadyVotedKeys ? alreadyVotedKeys.has(key) : false,
      });
    }
  }

  // 2. ソート順序の決定 (既定: 〆切時刻が早い順)
  const patrolOrder = config.patrolOrder || 'deadline_asc';

  if (patrolOrder === 'deadline_asc') {
    // 〆切時刻が早い順（08:35 -> 09:00 -> 10:45 ... -> 20:45）に昇順ソート
    items.sort((a, b) => {
      if (a.deadlineMinutes !== b.deadlineMinutes) {
        return a.deadlineMinutes - b.deadlineMinutes;
      }
      if (a.raceNo !== b.raceNo) {
        return a.raceNo - b.raceNo;
      }
      return a.venue.localeCompare(b.venue, 'ja');
    });
  } else {
    // 会場順 (ラウンドロビン)
    items.sort((a, b) => {
      if (a.raceNo !== b.raceNo) {
        return a.raceNo - b.raceNo;
      }
      return venuePool.indexOf(a.venue) - venuePool.indexOf(b.venue);
    });
  }

  return items;
}

/**
 * 次の巡回対象レースおよび会場を決定
 * 1. 〆切時刻が早い順 (deadline_asc) で常にソート・巡回
 * 2. 同一レースの重複巡回・多重投票を完全抑止（すでに巡回済みのレースは絶対に再訪しない）
 * 3. 全対象レースを巡回し終えたら isRoundComplete: true かつ remainingQueueCount: 0 を返し、先頭ループを防止して停止
 */
export function getNextPatrolTarget(params: {
  currentVenue: string;
  currentRaceNo: number;
  config: AutoPilotConfig;
  availableVenues?: string[];
  alreadyVotedKeys?: Set<string>;
  raceDate?: string;
  includeCurrentRace?: boolean;
}): NextPatrolTargetResult {
  const {
    currentVenue,
    currentRaceNo,
    config,
    availableVenues,
    alreadyVotedKeys,
    raceDate,
    includeCurrentRace = false,
  } = params;

  // 1. 巡回対象の全レースキューを構築（〆切時刻昇順にソート）
  const queue = buildPatrolQueue({
    config,
    availableVenues,
    alreadyVotedKeys,
    currentVenue,
  });

  const currentKey = `${currentVenue}-${currentRaceNo}`;

  if (queue.length === 0) {
    const fallbackDeadline = getStandardDeadlineTime(currentVenue, currentRaceNo);
    return {
      nextVenue: currentVenue,
      nextRaceNo: currentRaceNo,
      nextDeadlineTime: fallbackDeadline,
      isRoundComplete: true,
      totalQueueCount: 0,
      completedQueueCount: 0,
      remainingQueueCount: 0,
    };
  }

  // 2. 未巡回レース（重複防止）の抽出
  // alreadyVotedKeys に含まれているレースは絶対に除外！
  // また次レース探索時は、現在レース自身も除外！
  const unpatrolledQueue = queue.filter((item) => {
    if (alreadyVotedKeys && alreadyVotedKeys.has(item.key)) {
      return false;
    }
    if (!includeCurrentRace && item.key === currentKey) {
      return false;
    }
    return true;
  });

  const completedCount = queue.length - unpatrolledQueue.length;

  // 3. 全レースの巡回がすでに完了している場合（未巡回ゼロ）
  // ★重要: 先頭レースへループバックせず、isRoundComplete: true で正常終了させる（重複巡回完全防止）
  if (unpatrolledQueue.length === 0) {
    return {
      nextVenue: currentVenue,
      nextRaceNo: currentRaceNo,
      nextDeadlineTime: getStandardDeadlineTime(currentVenue, currentRaceNo),
      isRoundComplete: true,
      queueIndex: -1,
      totalQueueCount: queue.length,
      completedQueueCount: queue.length,
      remainingQueueCount: 0,
      isRepeatPrevented: true,
    };
  }

  // 4. 本日開催の場合の締切時刻判定
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = !raceDate || raceDate === todayStr;
  const currentMinutesToday = now.getHours() * 60 + now.getMinutes();

  const patrolOrder = config.patrolOrder || 'deadline_asc';

  let selectedCandidate: PatrolRaceItem | undefined;

  if (patrolOrder === 'deadline_asc') {
    // 〆切時刻が早い順 (deadline_asc) の場合:
    // unpatrolledQueue は既に deadlineMinutes 昇順（08:35 -> 09:00 -> ...）に完全ソートされている。
    // 本番実投票モード（!config.testMode）の場合のみ、締切前（現在時刻以降または直近3分前以内）のレースを優先。
    // テスト投票（シミュレーション）モードまたは指定時は、未巡回キューの先頭（最も〆切時刻が早いレース）から順次確実に巡回。
    if (!config.testMode && isToday) {
      selectedCandidate = unpatrolledQueue.find(
        (item) => item.deadlineMinutes >= currentMinutesToday - 3
      );
    }

    if (!selectedCandidate) {
      selectedCandidate = unpatrolledQueue[0];
    }
  } else {
    // 会場順 (ラウンドロビン) の場合
    const currentQueueIdx = queue.findIndex((item) => item.key === currentKey);
    if (currentQueueIdx >= 0) {
      selectedCandidate = unpatrolledQueue.find(
        (item) => queue.indexOf(item) > currentQueueIdx
      );
    }
    if (!selectedCandidate) {
      selectedCandidate = unpatrolledQueue[0];
    }
  }

  const finalTarget = selectedCandidate || unpatrolledQueue[0];
  const targetIdx = queue.findIndex((item) => item.key === finalTarget.key);

  return {
    nextVenue: finalTarget.venue,
    nextRaceNo: finalTarget.raceNo,
    nextDeadlineTime: finalTarget.deadlineTime,
    isRoundComplete: false,
    queueIndex: targetIdx,
    totalQueueCount: queue.length,
    completedQueueCount: completedCount,
    remainingQueueCount: unpatrolledQueue.length,
    candidate: finalTarget,
  };
}
