/**
 * Keirin Analyzer Pro 5
 * 競輪予想・ライン展開分析・資金配分・投票支援アプリケーション データ型定義
 */

// 級班 (SS: S級S班, S1: S級1班, S2: S級2班, A1: A級1班, A2: A級2班, A3: A級3班, L1: ガールズ)
export type RacerGrade = 'SS' | 'S1' | 'S2' | 'A1' | 'A2' | 'A3' | 'L1';

// 脚質 (逃: 先行, 捲: 捲り, 追: 追い込み・マーク, 両: 先行捲り両用)
export type RunningStyle = '逃' | '捲' | '追' | '両';

// ライン上の役割 (自力先行, 番手, 3番手, 4番手, 単騎)
export type LineRole = '先頭' | '番手' | '3番手' | '4番手' | '単騎';

export interface BoatData {
  boatNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 車番 (1〜9)
  name: string; // 選手名
  registrationNumber?: string; // 登録番号
  branch: string; // 府県・支部 (例: "神奈川", "静岡", "東京")
  era?: number; // 期別 (例: 88期, 117期, 121期)
  age?: number; // 年齢
  grade: RacerGrade; // 級班 (SS, S1, S2, A1, A2, A3, L1)
  score: number; // 競走得点 (例: 114.82, 107.50, 89.20)
  style: RunningStyle; // 脚質 (逃, 捲, 追, 両)
  gear: number; // ギヤ倍数 (例: 3.92, 3.93)
  winRate: number; // 勝率 (%)
  secondRate: number; // 2連対率 (%)
  thirdRate?: number; // 3連対率 (%)
  bCount: number; // B (バック本数)
  hCount?: number; // H (ホーム本数)
  sCount?: number; // S (先頭員後位・初手S本数)
  // 決まり手
  nigeCount?: number; // 逃げ
  makuriCount?: number; // 捲り
  sashiCount?: number; // 差し
  markCount?: number; // マーク
  lineGroup: number; // 所属ライン番号 (1, 2, 3...)
  lineRole: LineRole; // ライン内役割
  course: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 車番/位置
}

export type WindDirection = '向かい風' | '追い風' | '左横風' | '右横風' | '無風';
export type WeatherType = '晴' | '曇' | '雨' | '小雨' | '雪';

export interface WeatherCondition {
  weather: WeatherType;
  windDirection: WindDirection;
  windSpeed: number; // m/s
  waveHeight?: number; // 競艇互換用 (0)
  temperature: number; // ℃
  waterTemperature?: number; // 気温同等
}

export type BankLength = 333 | 335 | 400 | 500;

export interface VenueInfo {
  code: string;
  name: string; // 競輪場名 (e.g. "平塚", "前橋", "立川", "松戸")
  region: '北日本' | '関東' | '南関東' | '中部' | '近畿' | '中国' | '四国' | '九州';
  bankLength: BankLength; // 周長 (333m, 335m, 400m, 500m)
  straightLength: number; // みなし直線距離 (m) (例: 54.2m)
  cantAngle: number; // カント・最大傾斜角 (度) (例: 31.5°)
  waterType?: '短走路' | '標準走路' | '長走路' | 'ドーム'; // バンク特性
  characteristics: string; // バンク特徴解説
}

// ライン並び予想情報
export interface LineComposition {
  group: number;
  label: string; // 例: "関東ライン", "南関ライン", "近畿ライン", "単騎"
  racers: number[]; // 例: [1, 5, 9]
  tactics: '先行主導権' | '捲り強襲' | '捲り・自在' | '単騎一発';
}

export interface RaceInfo {
  id: string;
  date: string; // YYYY-MM-DD
  venue: string; // 競輪場名 (e.g. "平塚")
  raceNo: number; // 1〜12
  raceTitle: string; // e.g. "第12R S級決勝"
  grade: 'GP' | 'GI' | 'GII' | 'GIII' | 'FI' | 'FII' | 'ミッドナイト' | 'ガールズ';
  roundCount?: number; // 周回数 (例: 5周, 6周)
  carCount: 7 | 9; // 7車立て / 9車立て
  bankLength: BankLength; // 周長
  straightLength: number; // みなし直線 (m)
  deadlineTime: string; // HH:mm
  weather: WeatherCondition;
  lines: LineComposition[]; // ライン並び予想
  boats: BoatData[]; // 出走選手データ (車番1〜7または1〜9)
}

export interface ScoredBoat extends BoatData {
  rawScore: number;
  rank: number;
}

export type BetType = '3t' | '3f' | '2t' | '2f' | '1t' | '1f' | 'wide';

export const BET_TYPE_LABELS: Record<BetType, { label: string; short: string; desc: string; maxPoints: number }> = {
  '3t': { label: '3連単', short: '3単', desc: '1着・2着・3着を着順通り的中', maxPoints: 18 },
  '3f': { label: '3連複', short: '3複', desc: '1着・2着・3着を着順問わず的中', maxPoints: 12 },
  '2t': { label: '2車単', short: '2単', desc: '1着・2着を着順通り的中', maxPoints: 12 },
  '2f': { label: '2車複', short: '2複', desc: '1着・2着を着順問わず的中', maxPoints: 10 },
  '1t': { label: '車番単勝', short: '単', desc: '1着選手を的中', maxPoints: 5 },
  '1f': { label: '複勝', short: '複', desc: '2着以内に入着する選手を的中', maxPoints: 5 },
  'wide': { label: 'ワイド', short: '拡', desc: '3着以内の2選手を着順問わず的中', maxPoints: 10 },
};

export interface BetCandidate {
  rank: number; // 1〜N
  combination: string; // e.g. "1-5-9", "1=5", "1-5", "1"
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
  isLineSuji?: boolean; // スジ車券（同ラインワンツー）判定
  sujiType?: 'スジ (本線)' | 'スジ (ズブズブ)' | 'スジ違い (別線)' | '中穴捲り';
  isExcludedByOdds?: boolean;
}

export type AllocationMode = 'equal' | 'target' | 'fixed';

export interface AppSettings {
  baseStake: number; // 1点あたり基準額 (円) 初期値 100
  maxRaceBudget: number; // 1レース上限 (円) 初期値 2000
  minOdds: number; // 最低オッズ (倍) 初期値 2.0
  maxOdds: number; // 最高オッズ (倍) 初期値 80.0
  targetReturn: number; // 目標払戻額 (円) 初期値 3000
  windSpeedThreshold: number; // 風速見送り (m/s) 初期値 9.0
  waveHeightThreshold?: number; // 競艇互換
  dailyProfitTarget: number; // 日次利益目標 (円) 初期値 5000 (0で無効)
  dailyLossLimit: number; // 日次損失上限 (円) 初期値 5000 (0で無効)
  allocationMode: AllocationMode;
  autoScaleBudget: boolean; // 上限超過時に自動縮小するか
  defaultBetType: BetType; // デフォルト購入車券種別
  defaultPointCount: number; // デフォルト購入点数 (1〜18)

  // 競輪評価スコア重み
  scoreWeight: number; // 競走得点重み (初期値 25)
  winRateWeight: number; // 勝率・2連対率重み (初期値 15)
  lineWeight: number; // ライン連携・位置取り重み (初期値 30)
  bankWeight: number; // バンク特性適合重み (初期値 20)
  bWeight: number; // B (バック数) 先行意欲重み (初期値 10)
  courseWeights?: [number, number, number, number, number, number, number, number, number];
}

export type AppStatus = 'Taiki' | 'Skip' | 'Stop' | 'NG' | 'Teki2' | 'Hazure';

export interface RaceHistoryRecord {
  id: string;
  timestamp: string;
  date: string;
  venue: string;
  raceNo: number;
  raceTitle: string;
  grade?: string;
  bankLength?: number;
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
  finishOrder: string; // e.g. "1-5-9"
  winningTechnique?: string; // 決まり手 (逃げ, 捲り, 差し, マーク)
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
  bankLength?: number;
  totalRaces: number;
  betRaces: number;
  hitCount: number;
  totalStake: number;
  totalReturn: number;
  netProfit: number;
  hitRate: number; // %
  recoveryRate: number; // %
  maxPayout?: number;
}

export type AutoPilotStage =
  | 'STOPPED'
  | 'FETCHING_CARD'
  | 'ANALYZING'
  | 'PREDICTING'
  | 'VOTING'
  | 'WAITING_RESULT'
  | 'FETCHING_RESULT'
  | 'NEXT_RACE_WAIT'
  | 'SAFETY_STOP';

export interface AutoPilotConfig {
  enabled: boolean;
  targetMode: 'single_venue' | 'all_venues';
  targetVenues: string[];
  startRaceNo: number;
  endRaceNo: number;
  patrolOrder: 'deadline_asc' | 'venue_round_robin';
  advanceDelaySeconds: number;
  executeAutoVote: boolean;
  testMode: boolean;
  useAIEnhanced: boolean;
  dailyProfitTarget: number;
  dailyLossLimit: number;
  maxConsecutiveLosses: number;
  soundAlert: boolean;

  // 競輪固有フィルタ
  targetGrades?: ('ALL' | 'GI_GIII' | 'FI_FII' | 'MIDNIGHT')[];
  minScoreGap?: number; // 競走得点差フィルタ
  preferBankType?: 'ALL' | '333' | '400' | '500'; // 好みバンク
  minOdds?: number;
  maxOdds?: number;
  betType?: BetType;
  pointCount?: number;
  minutesBeforeDeadline?: number; // 締切何分前 (例: 3分前)
  allocationMode?: AllocationMode;
  raceBudget?: number;
  dailyStopLoss?: number;
  dailyTakeProfit?: number;
  useAIAssist?: boolean; // Gemini 3.8 Flash 併用
  autoExecuteVote?: boolean; // 投票自動実行
  soundEffect?: boolean;
}

export const DEFAULT_AUTOPILOT_CONFIG: AutoPilotConfig = {
  enabled: false,
  targetMode: 'all_venues',
  targetVenues: [],
  startRaceNo: 1,
  endRaceNo: 12,
  patrolOrder: 'deadline_asc',
  advanceDelaySeconds: 4,
  executeAutoVote: true,
  testMode: true,
  useAIEnhanced: true,
  dailyProfitTarget: 5000,
  dailyLossLimit: 5000,
  maxConsecutiveLosses: 4,
  soundAlert: true,
  targetGrades: ['ALL'],
  minScoreGap: 3.0,
  preferBankType: 'ALL',
  minOdds: 2.0,
  maxOdds: 90.0,
  betType: '3t',
  pointCount: 6,
  minutesBeforeDeadline: 3,
  allocationMode: 'target',
  raceBudget: 2000,
  dailyStopLoss: 5000,
  dailyTakeProfit: 5000,
  useAIAssist: true,
  autoExecuteVote: true,
  soundEffect: true,
};

export interface AutoPilotLogItem {
  id: string;
  timestamp: string;
  venue: string;
  raceNo: number;
  type?: 'SCAN' | 'EVALUATE' | 'PREDICT' | 'SKIP' | 'VOTE' | 'HIT' | 'MISS' | 'STOP' | 'INFO';
  action?: 'SCAN' | 'EVALUATE' | 'PREDICT' | 'SKIP' | 'VOTE' | 'HIT' | 'MISS' | 'STOP';
  message: string;
  detail?: string;
  details?: string;
  stake?: number;
  returnAmount?: number;
}
