import { AppSettings, VenueInfo } from '../types/kyotei';

export const VENUES: VenueInfo[] = [
  { code: '01', name: '桐生', region: '関東', waterType: '淡水', characteristics: '標高高く気圧低い・ドラキリュウナイター' },
  { code: '02', name: '戸田', region: '関東', waterType: '淡水', characteristics: '水面幅狭く1マーク遠い・捲り水面' },
  { code: '03', name: '江戸川', region: '関東', waterType: '汽水', characteristics: '荒潮・強風・日本一の難水面' },
  { code: '04', name: '平和島', region: '関東', waterType: '海水', characteristics: 'イン受難・差し捲り決まりやすい' },
  { code: '05', name: '多摩川', region: '関東', waterType: '淡水', characteristics: '日本一の静水面・スピード戦' },
  { code: '06', name: '浜名湖', region: '東海', waterType: '汽水', characteristics: '広大な水面・風の影響大' },
  { code: '07', name: '蒲郡', region: '東海', waterType: '汽水', characteristics: 'ナイター開催・穏やかな静水面' },
  { code: '08', name: '常滑', region: '東海', waterType: '海水', characteristics: '風向きの変化に注意・イン強め' },
  { code: '09', name: '津', region: '東海', waterType: '淡水', characteristics: '季節風強し・強風時は波高注意' },
  { code: '10', name: '三国', region: '近畿', waterType: '淡水', characteristics: 'モーニング・風向きで傾向激変' },
  { code: '11', name: 'びわこ', region: '近畿', waterType: '淡水', characteristics: '日本一高い水面・うねり発生' },
  { code: '12', name: '住之江', region: '近畿', waterType: '淡水', characteristics: 'ボートレースの聖地・イン圧倒的信頼' },
  { code: '13', name: '尼崎', region: '近畿', waterType: '淡水', characteristics: 'センタープール・広くて走りやすい' },
  { code: '14', name: '鳴門', region: '四国', waterType: '海水', characteristics: '激しい潮流・モーニング水面' },
  { code: '15', name: '丸亀', region: '四国', waterType: '海水', characteristics: '潮位差あり・ナイター水面' },
  { code: '16', name: '児島', region: '中国', waterType: '海水', characteristics: '瀬戸内海の潮位・満潮時イン有利' },
  { code: '17', name: '宮島', region: '中国', waterType: '海水', characteristics: '干満差大・厳島神社対岸' },
  { code: '18', name: '徳山', region: '中国', waterType: '海水', characteristics: 'モーニング・全国屈指のイン強水面' },
  { code: '19', name: '下関', region: '中国', waterType: '海水', characteristics: '海響ナイター・イン逃げ率高' },
  { code: '20', name: '若松', region: '九州', waterType: '海水', characteristics: 'パイナップルナイター・風の影響' },
  { code: '21', name: '芦屋', region: '九州', waterType: '淡水', characteristics: 'サンライズモーニング・企画レース多' },
  { code: '22', name: '福岡', region: '九州', waterType: '海水', characteristics: 'うねり難水面・1マーク独特形状' },
  { code: '23', name: '唐津', region: '九州', waterType: '淡水', characteristics: '広大なモーニング水面・風チェック必須' },
  { code: '24', name: '大村', region: '九州', waterType: '海水', characteristics: '発祥地・全国トップクラスのイン勝率' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  baseStake: 100, // 1点あたり100円
  maxRaceBudget: 2000, // 1レース上限2,000円
  minOdds: 2.0, // 最低オッズ2.0倍
  maxOdds: 50.0, // 最高オッズ50.0倍
  targetReturn: 3000, // 目標払戻額3,000円
  windSpeedThreshold: 8.0, // 風速見送り 8.0m/s
  waveHeightThreshold: 10, // 波高見送り 10cm
  dailyProfitTarget: 5000, // 日次利益目標 5,000円
  dailyLossLimit: 5000, // 日次損失上限 5,000円
  allocationMode: 'equal', // 均等配分
  autoScaleBudget: true, // 上限超過時に自動縮小
  defaultBetType: '3t', // デフォルト3連単
  defaultPointCount: 5, // デフォルト5点買い

  // 評価スコア重み (仕様書 7.3: Score = 勝率×20 + 2連対率×8 + モーター2連対率×5 + 展示補正 + コース補正)
  winRateWeight: 20,
  secondRateWeight: 8,
  motorWeight: 5,
  exhibitionWeight: 15,
  courseWeights: [120, 35, 25, 20, 10, 0], // 1コース〜6コース
};

export const BOAT_COLORS: Record<number, { bg: string; text: string; name: string; border: string }> = {
  1: { bg: 'bg-white', text: 'text-slate-950 font-bold', name: '白', border: 'border-slate-300' },
  2: { bg: 'bg-slate-950', text: 'text-white font-bold', name: '黒', border: 'border-slate-700' },
  3: { bg: 'bg-red-600', text: 'text-white font-bold', name: '赤', border: 'border-red-700' },
  4: { bg: 'bg-blue-600', text: 'text-white font-bold', name: '青', border: 'border-blue-700' },
  5: { bg: 'bg-yellow-400', text: 'text-slate-950 font-bold', name: '黄', border: 'border-yellow-500' },
  6: { bg: 'bg-emerald-600', text: 'text-white font-bold', name: '緑', border: 'border-emerald-700' },
};
