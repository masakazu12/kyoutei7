import { VENUES } from '../constants/venues';

/**
 * 競艇レース公式標準締切時刻 & 締切ステータス管理サービス
 */

export interface DeadlineStatus {
  status: 'active' | 'soon' | 'closed'; // active: 発売中, soon: まもなく締切, closed: 締切済
  remainingMinutes: number;
  formattedRemaining: string; // e.g. "あと 24分", "あと 3分", "締切済"
  label: string; // "発売中", "まもなく締切", "発売終了"
  isPast: boolean;
}

// モーニング場
export const MORNING_VENUES = ['鳴門', '芦屋', '唐津', '徳山'];

// ナイター場
export const NIGHTER_VENUES = ['桐生', '蒲郡', '住之江', '丸亀', '下関', '若松', '大村'];

/**
 * 開催場とレース番号に応じた公式標準締切時刻 (HH:mm)
 */
export function getStandardDeadlineTime(venueName: string, raceNo: number): string {
  const rIndex = Math.min(Math.max(raceNo - 1, 0), 11);

  if (MORNING_VENUES.includes(venueName)) {
    const morningTimes = [
      '08:35', '09:00', '09:25', '09:50', '10:20', '10:50',
      '11:20', '11:55', '12:30', '13:05', '13:45', '14:30'
    ];
    return morningTimes[rIndex] || '14:30';
  }

  if (NIGHTER_VENUES.includes(venueName)) {
    const nighterTimes = [
      '15:15', '15:40', '16:05', '16:30', '16:55', '17:25',
      '17:55', '18:25', '19:00', '19:35', '20:10', '20:45'
    ];
    return nighterTimes[rIndex] || '20:45';
  }

  // デイレース (一般)
  const dayTimes = [
    '10:45', '11:10', '11:35', '12:00', '12:30', '13:00',
    '13:30', '14:00', '14:35', '15:10', '15:50', '16:35'
  ];
  return dayTimes[rIndex] || '16:35';
}

/**
 * 締切時刻と現在時刻を比較して、締切までの残り時間とステータスを精密計算
 */
export function calculateDeadlineStatus(
  deadlineTime: string,
  raceDate?: string,
  referenceNow?: Date
): DeadlineStatus {
  if (!deadlineTime || !deadlineTime.includes(':')) {
    return {
      status: 'active',
      remainingMinutes: 30,
      formattedRemaining: '発売中',
      label: '発売中',
      isPast: false,
    };
  }

  const [hoursStr, minutesStr] = deadlineTime.split(':');
  const dHour = parseInt(hoursStr, 10);
  const dMin = parseInt(minutesStr, 10);

  const now = referenceNow || new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // レース日付が指定されている場合
  const isSameDay = !raceDate || raceDate === todayStr;

  if (!isSameDay) {
    // 過去日付の場合
    if (raceDate && raceDate < todayStr) {
      return {
        status: 'closed',
        remainingMinutes: -999,
        formattedRemaining: '締切済',
        label: '発売終了',
        isPast: true,
      };
    }
    // 未来日付の場合
    return {
      status: 'active',
      remainingMinutes: 999,
      formattedRemaining: '発売前/発売中',
      label: '発売中',
      isPast: false,
    };
  }

  // 本日のレースの場合：ミリ秒差分を計算
  const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dHour, dMin, 0);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffSeconds = Math.floor((diffMs % 60000) / 1000);

  if (diffMs <= 0) {
    return {
      status: 'closed',
      remainingMinutes: diffMinutes,
      formattedRemaining: '締切済',
      label: '発売終了',
      isPast: true,
    };
  }

  if (diffMinutes <= 10) {
    const secDisplay = diffSeconds >= 0 ? `${diffSeconds}秒` : '';
    return {
      status: 'soon',
      remainingMinutes: diffMinutes,
      formattedRemaining: `あと ${diffMinutes}分${secDisplay}`,
      label: 'まもなく締切',
      isPast: false,
    };
  }

  return {
    status: 'active',
    remainingMinutes: diffMinutes,
    formattedRemaining: `あと ${diffMinutes}分`,
    label: '発売中',
    isPast: false,
  };
}

export interface RaceConfirmationCheck {
  isConfirmed: boolean;
  statusText: '公式確定済' | '発売中 (未確定)' | 'まもなく締切 (未確定)' | '発走・審判確認中 (確定前)' | '開催前 (未確定)';
  detail: string;
  remainingMinutes: number;
}

/**
 * レースが公式に終了・確定しているか（的中判定を行ってよいか）を厳格に判定
 * 確定していないレース（発売中・締切前・発走待機中）での的中判定を防止
 */
export function checkRaceConfirmation(params: {
  date: string;
  deadlineTime?: string;
  venueName?: string;
  raceNo?: number;
  referenceNow?: Date;
}): RaceConfirmationCheck {
  const { date, deadlineTime, venueName, raceNo, referenceNow } = params;
  const now = referenceNow || new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. 過去日付のレースはすべて公式確定済み
  if (date && date < todayStr) {
    return {
      isConfirmed: true,
      statusText: '公式確定済',
      detail: '過去日付のレース（公式確定実績）です',
      remainingMinutes: -999,
    };
  }

  // 2. 未来日付のレースは未確定
  if (date && date > todayStr) {
    return {
      isConfirmed: false,
      statusText: '開催前 (未確定)',
      detail: `${date} 開催予定のレースです。着順はまだ確定していません。`,
      remainingMinutes: 999,
    };
  }

  // 3. 本日のレース：締切時刻および進行状況を判定
  const effectiveDeadline =
    deadlineTime && deadlineTime.includes(':')
      ? deadlineTime
      : venueName && raceNo
      ? getStandardDeadlineTime(venueName, raceNo)
      : '20:45';

  const [hoursStr, minutesStr] = effectiveDeadline.split(':');
  const dHour = parseInt(hoursStr, 10) || 0;
  const dMin = parseInt(minutesStr, 10) || 0;
  const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dHour, dMin, 0);

  // 競艇公式ルール：締切後、スタート展示〜ピット離れ〜周回(約1分45秒)〜着順審判・確定まで約5分を要する
  const confirmationDate = new Date(deadlineDate.getTime() + 5 * 60 * 1000);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  // 締切前（発売中）
  if (now.getTime() < deadlineDate.getTime()) {
    const isSoon = diffMinutes <= 10;
    return {
      isConfirmed: false,
      statusText: isSoon ? 'まもなく締切 (未確定)' : '発売中 (未確定)',
      detail: `締切時刻 ${effectiveDeadline} 前です（あと ${Math.max(0, diffMinutes)}分）。レースはまだ開催されていません。`,
      remainingMinutes: diffMinutes,
    };
  }

  // 締切直後〜着順審判中（締切から5分以内）
  if (now.getTime() < confirmationDate.getTime()) {
    return {
      isConfirmed: false,
      statusText: '発走・審判確認中 (確定前)',
      detail: `締切済み・現在レース発走中です。公式着順発表・確定まで約${Math.max(1, Math.ceil((confirmationDate.getTime() - now.getTime()) / 60000))}分お待ちください。`,
      remainingMinutes: diffMinutes,
    };
  }

  // 締切＋5分以上経過：公式結果確定
  return {
    isConfirmed: true,
    statusText: '公式確定済',
    detail: 'レース終了・公式着順が確定しています',
    remainingMinutes: diffMinutes,
  };
}

export interface RaceVoteEligibility {
  canVote: boolean;
  isPastDate: boolean;
  isToday: boolean;
  isPastDeadlineToday: boolean;
  reason?: string;
  effectiveDeadline: string;
}

/**
 * レースへの投票可否判定
 * 仕様:
 * - 過去開催日の場合: 締め切り後でも投票および判定を許可（バックテスト・過去レースシミュレーション）
 * - 開催日当日の場合: 締め切り時刻を過ぎているレースへの自動投票・即時投票を厳格に禁止
 * - 未来日の場合: 投票可能（事前投票）
 */
export function checkRaceVoteEligibility(params: {
  date: string;
  deadlineTime?: string;
  venueName?: string;
  raceNo?: number;
  referenceNow?: Date;
}): RaceVoteEligibility {
  const { date, deadlineTime, venueName, raceNo, referenceNow } = params;
  const now = referenceNow || new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const isPastDate = !!(date && date < todayStr);
  const isFutureDate = !!(date && date > todayStr);
  const isToday = !isPastDate && !isFutureDate;

  const effectiveDeadline =
    deadlineTime && deadlineTime.includes(':')
      ? deadlineTime
      : venueName && raceNo
      ? getStandardDeadlineTime(venueName, raceNo)
      : '20:45';

  // 1. 過去開催日の場合: 締め切り後でもシミュレーション投票・着順照合・判定を許可
  if (isPastDate) {
    return {
      canVote: true,
      isPastDate: true,
      isToday: false,
      isPastDeadlineToday: false,
      effectiveDeadline,
    };
  }

  // 2. 開催日当日の場合: 現在時刻が締切時刻を過ぎているか検査
  if (isToday) {
    const [hoursStr, minutesStr] = effectiveDeadline.split(':');
    const dHour = parseInt(hoursStr, 10) || 0;
    const dMin = parseInt(minutesStr, 10) || 0;
    const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dHour, dMin, 0);

    const isPastDeadline = now.getTime() >= deadlineDate.getTime();

    if (isPastDeadline) {
      return {
        canVote: false,
        isPastDate: false,
        isToday: true,
        isPastDeadlineToday: true,
        reason: `本日開催のレースは締切時刻 (${effectiveDeadline}) を過ぎているため投票できません`,
        effectiveDeadline,
      };
    }

    return {
      canVote: true,
      isPastDate: false,
      isToday: true,
      isPastDeadlineToday: false,
      effectiveDeadline,
    };
  }

  // 3. 未来日の場合
  return {
    canVote: true,
    isPastDate: false,
    isToday: false,
    isPastDeadlineToday: false,
    effectiveDeadline,
  };
}

/**
 * 本日開催かつ締切時刻経過かどうかを即時判定するショートハンド
 */
export function isRacePastDeadlineToday(params: {
  date: string;
  deadlineTime?: string;
  venueName?: string;
  raceNo?: number;
  referenceNow?: Date;
}): boolean {
  const res = checkRaceVoteEligibility(params);
  return res.isPastDeadlineToday;
}

