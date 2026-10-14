import { BoatData, RacerGrade, RunningStyle, LineRole, RaceInfo, WeatherCondition, WindDirection, WeatherType, BankLength, LineComposition } from '../types/kyotei';
import { VENUES } from '../constants/venues';
import { checkRaceConfirmation } from './deadlineService';

export interface ActiveVenueSchedule {
  venueName: string;
  code: string;
  category: 'モーニング' | 'デイ' | 'ナイター' | 'ミッドナイト';
  grade: 'GP' | 'GI' | 'GII' | 'GIII' | 'FI' | 'FII' | 'ミッドナイト';
  title: string;
  status: '開催中' | '直前情報' | '発売中' | '終了';
  currentRaceNo: number;
}

export interface OfficialRaceResult {
  raceId: string;
  finishOrder: string; // e.g. "1-2-3"
  first: number;
  second: number;
  third: number;
  officialPayout: number; // 3連単確定払戻金 (100円あたり)
  popularityRank: number; // 人気順位
  winningTechnique: string; // 決まり手 (逃げ, 捲り, 差し, マーク)
  date: string;
  venueName: string;
  raceNo: number;
  weatherAtFinish: WeatherCondition;
  isConfirmed: boolean;
}

// 競輪選手マスターデータベース
const KEIRIN_RACER_POOL: {
  name: string;
  branch: string;
  era: number;
  grade: RacerGrade;
  score: number;
  style: RunningStyle;
  winRate: number;
  secondRate: number;
  bCount: number;
}[] = [
  { name: '脇本 雄太', branch: '福井', era: 94, grade: 'SS', score: 119.85, style: '逃', winRate: 68.5, secondRate: 82.1, bCount: 14 },
  { name: '古性 優作', branch: '大阪', era: 100, grade: 'SS', score: 118.92, style: '両', winRate: 54.2, secondRate: 75.0, bCount: 3 },
  { name: '松浦 悠士', branch: '広島', era: 98, grade: 'SS', score: 116.45, style: '両', winRate: 46.8, secondRate: 68.2, bCount: 2 },
  { name: '清水 裕友', branch: '山口', era: 105, grade: 'SS', score: 117.10, style: '逃', winRate: 48.0, secondRate: 67.5, bCount: 11 },
  { name: '眞杉 匠', branch: '栃木', era: 113, grade: 'SS', score: 117.80, style: '逃', winRate: 52.0, secondRate: 72.0, bCount: 15 },
  { name: '北井 佑季', branch: '神奈川', era: 119, grade: 'SS', score: 116.50, style: '逃', winRate: 58.0, secondRate: 76.0, bCount: 18 },
  { name: '新山 響平', branch: '青森', era: 107, grade: 'SS', score: 117.90, style: '逃', winRate: 45.0, secondRate: 65.0, bCount: 16 },
  { name: '深谷 知広', branch: '静岡', era: 96, grade: 'S1', score: 115.60, style: '逃', winRate: 42.5, secondRate: 63.0, bCount: 12 },
  { name: '郡司 浩平', branch: '神奈川', era: 99, grade: 'S1', score: 116.80, style: '両', winRate: 50.0, secondRate: 72.0, bCount: 4 },
  { name: '平原 康多', branch: '埼玉', era: 87, grade: 'SS', score: 115.40, style: '追', winRate: 40.0, secondRate: 68.0, bCount: 1 },
  { name: '佐藤 慎太郎', branch: '福島', era: 78, grade: 'S1', score: 114.20, style: '追', winRate: 22.0, secondRate: 54.0, bCount: 0 },
  { name: '守澤 太志', branch: '秋田', era: 96, grade: 'S1', score: 114.90, style: '追', winRate: 28.0, secondRate: 58.0, bCount: 0 },
  { name: '山口 拳矢', branch: '岐阜', era: 117, grade: 'SS', score: 115.20, style: '捲', winRate: 44.0, secondRate: 64.0, bCount: 6 },
  { name: '犬伏 湧也', branch: '徳島', era: 119, grade: 'S1', score: 115.20, style: '逃', winRate: 55.0, secondRate: 70.0, bCount: 16 },
  { name: '浅井 康太', branch: '三重', era: 90, grade: 'S1', score: 112.90, style: '両', winRate: 35.0, secondRate: 62.0, bCount: 1 },
  { name: '吉田 拓矢', branch: '茨城', era: 107, grade: 'S1', score: 114.80, style: '逃', winRate: 40.0, secondRate: 64.0, bCount: 9 },
  { name: '嘉永 泰斗', branch: '熊本', era: 113, grade: 'S1', score: 113.90, style: '逃', winRate: 44.0, secondRate: 62.0, bCount: 8 },
  { name: '寺崎 浩平', branch: '福井', era: 117, grade: 'S1', score: 113.50, style: '逃', winRate: 42.0, secondRate: 60.0, bCount: 11 },
  { name: '和田 健太郎', branch: '千葉', era: 87, grade: 'S1', score: 113.80, style: '追', winRate: 28.0, secondRate: 58.0, bCount: 0 },
  { name: '三谷 竜生', branch: '奈良', era: 101, grade: 'S1', score: 112.50, style: '両', winRate: 32.0, secondRate: 56.0, bCount: 3 },
  { name: '太田 海也', branch: '岡山', era: 121, grade: 'A1', score: 98.20, style: '逃', winRate: 72.0, secondRate: 84.0, bCount: 15 },
  { name: '中野 慎詞', branch: '岩手', era: 121, grade: 'A1', score: 98.50, style: '逃', winRate: 75.0, secondRate: 85.0, bCount: 16 },
  { name: '町田 太我', branch: '広島', era: 117, grade: 'A1', score: 95.40, style: '逃', winRate: 60.0, secondRate: 75.0, bCount: 15 },
  { name: '森田 優弥', branch: '埼玉', era: 113, grade: 'S1', score: 113.20, style: '逃', winRate: 38.0, secondRate: 60.0, bCount: 7 },
  { name: '窓場 千加頼', branch: '京都', era: 100, grade: 'S1', score: 113.90, style: '逃', winRate: 41.0, secondRate: 62.0, bCount: 8 },
  { name: '荒井 崇博', branch: '長崎', era: 82, grade: 'S1', score: 112.40, style: '追', winRate: 30.0, secondRate: 58.0, bCount: 0 },
  { name: '南 修二', branch: '大阪', era: 88, grade: 'S1', score: 111.80, style: '追', winRate: 24.0, secondRate: 52.0, bCount: 0 },
  { name: '諸橋 愛', branch: '新潟', era: 79, grade: 'S1', score: 110.80, style: '追', winRate: 20.0, secondRate: 48.0, bCount: 0 },
  { name: '香川 雄介', branch: '香川', era: 76, grade: 'S1', score: 110.40, style: '追', winRate: 21.0, secondRate: 50.0, bCount: 0 },
  { name: '小倉 竜二', branch: '徳島', era: 77, grade: 'S1', score: 110.50, style: '追', winRate: 20.0, secondRate: 50.0, bCount: 0 },
];

/**
 * 競輪レース番組表データの生成・取得
 */
export async function fetchRaceCard(params: {
  date: string;
  venueName: string;
  raceNo: number;
}): Promise<RaceInfo> {
  const { date, venueName, raceNo } = params;
  const targetVenue = VENUES.find((v) => v.name === venueName) || VENUES[0];

  // 擬似ネットワーク遅延
  await new Promise((resolve) => setTimeout(resolve, 350));

  // 7車立てまたは9車立ての決定
  const isNightOrMidnight = raceNo >= 8 || venueName === '小倉' || venueName === '前橋';
  const carCount: 7 | 9 = isNightOrMidnight ? 7 : 9;

  // 選手をプールからシャッフルして選出
  const seed = (venueName.charCodeAt(0) * 17 + raceNo * 31 + parseInt(date.replace(/-/g, '').slice(-4), 10)) % KEIRIN_RACER_POOL.length;
  const selectedRacers = [];
  for (let i = 0; i < carCount; i++) {
    const idx = (seed + i * 3) % KEIRIN_RACER_POOL.length;
    selectedRacers.push(KEIRIN_RACER_POOL[idx]);
  }

  // ライン並び予想の自動編成
  const lines: LineComposition[] = [];
  const boats: BoatData[] = [];

  if (carCount === 7) {
    // 7車立て: 3分戦 (1-4, 2-5, 3-7) + 単騎(6)
    lines.push(
      { group: 1, label: '近畿・中部', racers: [1, 4], tactics: '先行主導権' },
      { group: 2, label: '関東・南関', racers: [2, 5], tactics: '捲り・自在' },
      { group: 3, label: '中四国ライン', racers: [3, 7], tactics: '先行主導権' },
      { group: 4, label: '単騎一発', racers: [6], tactics: '単騎一発' }
    );
  } else {
    // 9車立て: 4分戦 (1-5-9, 2-7, 3-6, 4-8)
    lines.push(
      { group: 1, label: '東日本本線', racers: [1, 5, 9], tactics: '先行主導権' },
      { group: 2, label: '近畿ライン', racers: [2, 7], tactics: '捲り強襲' },
      { group: 3, label: '中四国ライン', racers: [3, 6], tactics: '先行主導権' },
      { group: 4, label: '九州ライン', racers: [4, 8], tactics: '捲り・自在' }
    );
  }

  for (let i = 1; i <= carCount; i++) {
    const r = selectedRacers[i - 1];
    let group = 1;
    let role: LineRole = '先頭';

    for (const l of lines) {
      const pos = l.racers.indexOf(i);
      if (pos !== -1) {
        group = l.group;
        role = pos === 0 ? (l.racers.length === 1 ? '単騎' : '先頭') : pos === 1 ? '番手' : '3番手';
        break;
      }
    }

    boats.push({
      boatNumber: i as any,
      name: r.name,
      branch: r.branch,
      era: r.era,
      age: 24 + ((i * 3) % 20),
      grade: r.grade,
      score: r.score,
      style: r.style,
      gear: 3.92,
      winRate: r.winRate,
      secondRate: r.secondRate,
      bCount: r.bCount,
      lineGroup: group,
      lineRole: role,
      course: i as any,
    });
  }

  const deadline = `${String(10 + Math.floor(raceNo / 2)).padStart(2, '0')}:${String((raceNo % 2) * 35).padStart(2, '0')}`;

  return {
    id: `keirin-${targetVenue.code}-${date}-${raceNo}`,
    date,
    venue: targetVenue.name,
    raceNo,
    raceTitle: `第${raceNo}R ${raceNo === 12 ? 'S級決勝' : raceNo >= 10 ? '特選' : '予選'}`,
    grade: targetVenue.bankLength === 500 ? 'GII' : raceNo === 12 ? 'GIII' : 'FI',
    carCount,
    bankLength: targetVenue.bankLength,
    straightLength: targetVenue.straightLength,
    deadlineTime: deadline,
    weather: {
      weather: '晴',
      windDirection: '追い風',
      windSpeed: 1.5,
      temperature: 21.0,
    },
    lines,
    boats,
  };
}

/**
 * 競輪レース公式確定結果の取得
 */
export async function fetchRaceResult(params: {
  date: string;
  venueName: string;
  raceNo: number;
  boats?: BoatData[];
  deadlineTime?: string;
}): Promise<OfficialRaceResult> {
  const { date, venueName, raceNo } = params;
  await new Promise((resolve) => setTimeout(resolve, 400));

  const confirmation = checkRaceConfirmation({ date, venueName, raceNo, deadlineTime: params.deadlineTime });
  if (!confirmation.isConfirmed) {
    throw new Error(confirmation.detail);
  }

  const first = 1;
  const second = 2;
  const third = 3;
  const payouts = [780, 1140, 1680, 2450, 4200, 6800, 12500];
  const payout = payouts[(raceNo + venueName.charCodeAt(0)) % payouts.length];
  const techniques = ['逃げ', '捲り', '差し', 'マーク'];
  const technique = techniques[(raceNo + 1) % techniques.length];

  return {
    raceId: `keirin-res-${venueName}-${raceNo}`,
    finishOrder: `${first}-${second}-${third}`,
    first,
    second,
    third,
    officialPayout: payout,
    popularityRank: 1,
    winningTechnique: technique,
    date,
    venueName,
    raceNo,
    weatherAtFinish: {
      weather: '晴',
      windDirection: '追い風',
      windSpeed: 1.5,
      temperature: 21.0,
    },
    isConfirmed: true,
  };
}

/**
 * 本日開催中の競輪場一覧取得
 */
export async function fetchActiveVenues(dateStr?: string): Promise<ActiveVenueSchedule[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return [
    { venueName: '平塚', code: '35', category: 'ナイター', grade: 'GI', title: '日本選手権競輪', status: '開催中', currentRaceNo: 11 },
    { venueName: '小田原', code: '36', category: 'デイ', grade: 'GIII', title: '開設記念', status: '開催中', currentRaceNo: 12 },
    { venueName: '宇都宮', code: '24', category: 'デイ', grade: 'GII', title: 'ウィナーズカップ', status: '開催中', currentRaceNo: 10 },
    { venueName: '前橋', code: '22', category: 'ナイター', grade: 'FI', title: 'ドームスーパーナイト', status: '開催中', currentRaceNo: 9 },
    { venueName: '松戸', code: '31', category: 'ナイター', grade: 'GIII', title: '燦燦ダイヤモンド滝澤杯', status: '開催中', currentRaceNo: 12 },
    { venueName: '小倉', code: '81', category: 'ミッドナイト', grade: 'ミッドナイト', title: 'ミッドナイト競輪', status: '発売中', currentRaceNo: 8 },
  ];
}

export interface BatchFetchVenuesResult {
  venues: ActiveVenueSchedule[];
  totalVenues: number;
  morningCount: number;
  dayCount: number;
  nighterCount: number;
}

export async function batchFetchTodayVenues(dateStr?: string): Promise<BatchFetchVenuesResult> {
  const venues = await fetchActiveVenues(dateStr);
  const morningCount = venues.filter((v) => v.category === 'モーニング').length;
  const dayCount = venues.filter((v) => v.category === 'デイ').length;
  const nighterCount = venues.filter((v) => v.category === 'ナイター' || v.category === 'ミッドナイト').length;
  return {
    venues,
    totalVenues: venues.length,
    morningCount,
    dayCount,
    nighterCount,
  };
}
