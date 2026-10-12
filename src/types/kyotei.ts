/**
 * Kyotei Analyzer Pro 5
 * Type definitions matching the application specification (Ver 1.0)
 */

export type BoatGrade = 'A1' | 'A2' | 'B1' | 'B2';

export interface BoatData {
  boatNumber: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  registrationNumber?: string;
  branch: string; // 支部
  grade: BoatGrade;
  winRate: number; // 全国勝率 (%) e.g. 7.45
  secondRate: number; // 2連対率 (%) e.g. 54.2
  motorNumber: number; // モーター番号
  motorSecondRate: number; // モーター2連対率 (%) e.g. 38.6
  boatSecondRate: number; // ボート2連対率 (%) e.g. 35.0
  exhibitionTime: number; // 展示タイム (秒) e.g. 6.68
  course: 1 | 2 | 3 | 4 | 5 | 6; // 進入コース
  st?: number; // 平均スタートタイミング (秒) e.g. 0.14
}

export type WindDirection = '向かい風' | '追い風' | '左横風' | '右横風' | '無風';
export type WeatherType = '晴' | '曇' | '雨' | '雪';

export interface WeatherCondition {
  weather: WeatherType;
  windDirection: WindDirection;
  windSpeed: number; // m/s
  waveHeight: number; // cm
  temperature: number; // ℃
  waterTemperature: number; // ℃
}

export interface VenueInfo {
  code: string;
  name: string;
  region: '関東' | '東海' | '近畿' | '四国' | '中国' | '九州';
  waterType: '淡水' | '海水' | '汽水';
  characteristics: string;
}

export interface RaceInfo {
  id: string;
  date: string; // YYYY-MM-DD
  venue: string; // 開催場名 (e.g. "住之江")
  raceNo: number; // 1〜12
  raceTitle: string; // e.g. "第12R 優勝戦"
  deadlineTime: string; // HH:mm
  weather: WeatherCondition;
  boats: BoatData[];
}

export interface ScoredBoat extends BoatData {
  rawScore: number;
  rank: number;
}

export type BetType = '3t' | '3f' | '2t' | '2f' | '1t' | '1f' | 'wide';

export const BET_TYPE_LABELS: Record<BetType, { label: string; short: string; desc: string; maxPoints: number }> = {
  '3t': { label: '3連単', short: '3単', desc: '1着・2着・3着を着順通り的中', maxPoints: 12 },
  '3f': { label: '3連複', short: '3複', desc: '1着・2着・3着を着順問わず的中', maxPoints: 10 },
  '2t': { label: '2連単', short: '2単', desc: '1着・2着を着順通り的中', maxPoints: 10 },
  '2f': { label: '2連複', short: '2複', desc: '1着・2着を着順問わず的中', maxPoints: 8 },
  '1t': { label: '単勝', short: '単', desc: '1着艇を的中', maxPoints: 4 },
  '1f': { label: '複勝', short: '複', desc: '2着以内の艇を的中', maxPoints: 4 },
  'wide': { label: '拡連複', short: '拡', desc: '3着以内の2艇を着順問わず的中', maxPoints: 8 },
};

export interface BetCandidate {
  rank: number; // 1〜N
  combination: string; // e.g. "1-2-3", "1=2=3", "1-2", "1"
  betType?: BetType;
  first: number;
  second: number;
  third: number;
  score: number;
  relativeProb: number; // 予測確率 (%)
  odds: number; // オッズ (倍)
  stake: number; // 推奨金額 (100円単位)
  expectedReturn: number; // 想定払戻 (円)
  expectedValue: number; // 期待値 (EV)
  isExcludedByOdds?: boolean;
}

export type AllocationMode = 'equal' | 'target' | 'fixed';

export interface AppSettings {
  baseStake: number; // 1点あたり基準額 (円) 初期値 100
  maxRaceBudget: number; // 1レース上限 (円) 初期値 2000
  minOdds: number; // 最低オッズ (倍) 初期値 2.0
  maxOdds: number; // 最高オッズ (倍) 初期値 50.0
  targetReturn: number; // 目標払戻額 (円) 初期値 3000
  windSpeedThreshold: number; // 風速見送り (m/s) 初期値 8.0
  waveHeightThreshold: number; // 波高見送り (cm) 初期値 10
  dailyProfitTarget: number; // 日次利益目標 (円) 初期値 5000 (0で無効)
  dailyLossLimit: number; // 日次損失上限 (円) 初期値 5000 (0で無効)
  allocationMode: AllocationMode;
  autoScaleBudget: boolean; // 上限超過時に自動縮小するか
  defaultBetType: BetType; // デフォルト購入舟券種別
  defaultPointCount: number; // デフォルト購入点数 (1〜12)

  // 評価スコア重み (仕様書 7.3)
  winRateWeight: number; // 勝率重み (初期値 20)
  secondRateWeight: number; // 2連率重み (初期値 8)
  motorWeight: number; // モーター重み (初期値 5)
  exhibitionWeight: number; // 展示補正重み (初期値 15)
  courseWeights: [number, number, number, number, number, number]; // コース補正 [120, 35, 25, 20, 10, 0]
}

export type AppStatus = 'Taiki' | 'Skip' | 'Stop' | 'NG' | 'Teki2' | 'Hazure';

export interface RaceHistoryRecord {
  id: string;
  timestamp: string;
  date: string;
  venue: string;
  raceNo: number;
  raceTitle: string;
  status: AppStatus;
  betType?: BetType;
  pointCount?: number;
  skipReason?: string;
  stopReason?: string;
  bets: {
    combination: string;
    odds: number;
    stake: number;
    expectedReturn: number;
    isHit: boolean;
  }[];
  totalStake: number;
  finishOrder: string; // e.g. "1-2-3"
  officialPayout: number; // 確定払戻金 (100円あたり)
  totalReturn: number;
  profit: number;
  isHit: boolean;
}

export interface DayStatistics {
  totalStake: number;
  totalReturn: number;
  netProfit: number;
  hitCount: number;
  betCount: number;
  skipCount: number;
  totalRaces: number;
  hitRate: number; // %
  recoveryRate: number; // %
  skipRate: number; // %
}

export interface VenueStatistics {
  venueName: string;
  region: string;
  totalRaces: number;
  betRaces: number;
  hitCount: number;
  hitRate: number; // %
  totalStake: number; // 円
  totalReturn: number; // 円
  netProfit: number; // 円
  recoveryRate: number; // %
  maxPayout: number; // 最高払戻額 (円)
}

/**
 * 12. 全自動運転 (Autopilot) 関連型定義
 */
export type AutoPilotStage =
  | 'STOPPED'        // 停止中
  | 'FETCHING_CARD'  // 番組・出走表データ同期中
  | 'ANALYZING'      // 出走表・気象条件解析中
  | 'PREDICTING'     // 予想・オッズ配分計算中
  | 'VOTING'         // テレボート自動投票中
  | 'WAITING_RESULT' // 締切・レース発走・結果確定待ち
  | 'FETCHING_RESULT'// 公式確定結果取得中
  | 'NEXT_RACE_WAIT' // 次レースへの移行待機中
  | 'SAFETY_STOP';   // 安全停止（目標達成・損切り・連続外れ）

export interface AutoPilotLogItem {
  id: string;
  timestamp: string;
  venue: string;
  raceNo: number;
  type: 'INFO' | 'PREDICT' | 'VOTE' | 'HIT' | 'MISS' | 'SKIP' | 'STOP';
  message: string;
  details?: string;
}

export type PatrolOrderMode = 'deadline_asc' | 'venue_round_robin';

export interface AutoPilotConfig {
  enabled: boolean;                 // 自動運転稼働フラグ
  targetMode: 'single_venue' | 'all_venues'; // 単一場1〜12R連続 | 全場横断巡回
  patrolOrder?: PatrolOrderMode;    // 巡回順序 (deadline_asc: 〆切時刻が早い順 [推奨・既定] | venue_round_robin: 会場順)
  targetVenues: string[];           // 対象会場（空配列なら全場）
  startRaceNo: number;              // 開始レース番号 (1〜12)
  endRaceNo: number;                // 終了レース番号 (1〜12)
  minutesBeforeDeadline: number;    // 締切前何分に実行するか (0: 即時進行, 1〜10分)
  advanceDelaySeconds: number;      // レース完了から次レースへのインターバル秒数 (デフォルト4秒)
  executeAutoVote: boolean;         // テレボート自動投票連携を実行するか
  testMode: boolean;                // テスト投票（シミュレーション）か実投票か
  useAIEnhanced: boolean;           // Gemini AI深層予想を自動運転に適用するか
  maxConsecutiveLosses: number;     // 連続不的中での自動停止閾値 (0で無制限)
  dailyProfitTarget: number;        // 目標利益達成時自動停止額 (円)
  dailyLossLimit: number;           // 許容損失上限額 (円)
  soundAlert: boolean;              // 音声アラート
}

export const DEFAULT_AUTOPILOT_CONFIG: AutoPilotConfig = {
  enabled: false,
  targetMode: 'all_venues',
  patrolOrder: 'deadline_asc',
  targetVenues: [],
  startRaceNo: 1,
  endRaceNo: 12,
  minutesBeforeDeadline: 0,
  advanceDelaySeconds: 4,
  executeAutoVote: true,
  testMode: true,
  useAIEnhanced: false,
  maxConsecutiveLosses: 4,
  dailyProfitTarget: 30000,
  dailyLossLimit: 20000,
  soundAlert: true,
};
