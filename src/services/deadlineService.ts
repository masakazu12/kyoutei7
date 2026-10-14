import { VENUES } from '../constants/venues';

/**
 * 競輪レース公式標準締切時刻 & 締切ステータス管理サービス
 * デイ・ナイター・ミッドナイト・モーニング競輪の4開催帯に対応
 */

export interface DeadlineStatus {
  status: 'active' | 'soon' | 'closed'; // active: 発売中, soon: まもなく締切, closed: 締切済
  remainingMinutes: number;
  formattedRemaining: string; // e.g. "あと 24分", "あと 3分", "締切済"
  label: string; // "発売中", "まもなく締切", "発売終了"
  isPast: boolean;
}

// ミッドナイト競輪場 (20:40〜23:25)
export const MIDNIGHT_VENUES = ['小倉', '前橋', '松戸', '伊東', '奈良', '玉野', '高知', '松山', '武雄', '佐世保', '別府', '宇都宮', '四日市', '岸和田'];

// ナイター競輪場 (15:30〜20:45)
export const NIGHTER_VENUES = ['平塚', '川崎', '京王閣', '函館', '青森', 'いわき平', '弥彦', '松阪', '四日市', '小倉', '別府', '武雄'];

// モーニング競輪場 (8:30〜11:30)
export const MORNING_VENUES = ['高知', '別府', '宇都宮', '松山'];

/**
 * 競輪場とレース番号に応じた公式標準締切時刻 (HH:mm)
 */
export function getStandardDeadlineTime(venueName: string, raceNo: number, isMidnight = false): string {
  const rIndex = Math.min(Math.max(raceNo - 1, 0), 11);

  if (isMidnight || (MIDNIGHT_VENUES.includes(venueName) && raceNo >= 8)) {
    // ミッドナイト競輪 (20:40〜23:25)
    const midnightTimes = [
      '20:50', '21:12', '21:34', '21:56', '22:18', '22:40', '23:02', '23:20', '23:25'
    ];
    return midnightTimes[Math.min(rIndex, midnightTimes.length - 1)] || '23:20';
  }

  if (NIGHTER_VENUES.includes(venueName)) {
    // ナイター競輪
    const nighterTimes = [
      '15:35', '16:00', '16:25', '16:50', '17:15', '17:45',
      '18:15', '18:45', '19:15', '19:45', '20:15', '20:45'
    ];
    return nighterTimes[rIndex] || '20:45';
  }

  // デイレース (一般)
  const dayTimes = [
    '10:55', '11:20', '11:45', '12:15', '12:45', '13:15',
    '13:45', '14:20', '14:55', '15:30', '16:05', '16:40'
  ];
  return dayTimes[rIndex] || '16:40';
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

  const isSameDay = !raceDate || raceDate === todayStr;

  if (!isSameDay) {
    if (raceDate && raceDate < todayStr) {
      return {
        status: 'closed',
        remainingMinutes: -999,
        formattedRemaining: '締切済',
        label: '発売終了',
        isPast: true,
      };
    }
    return {
      status: 'active',
      remainingMinutes: 999,
      formattedRemaining: '発売前/発売中',
      label: '発売中',
      isPast: false,
    };
  }

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

  if (date && date < todayStr) {
    return {
      isConfirmed: true,
      statusText: '公式確定済',
      detail: '過去日付のレース（公式確定実績）です',
      remainingMinutes: -999,
    };
  }

  if (date && date > todayStr) {
    return {
      isConfirmed: false,
      statusText: '開催前 (未確定)',
      detail: `${date} 開催予定のレースです。着順はまだ確定していません。`,
      remainingMinutes: 999,
    };
  }

  const effectiveDeadline =
    deadlineTime && deadlineTime.includes(':')
      ? deadlineTime
      : venueName && raceNo
      ? getStandardDeadlineTime(venueName, raceNo)
      : '16:40';

  const [hoursStr, minutesStr] = effectiveDeadline.split(':');
  const dHour = parseInt(hoursStr, 10) || 0;
  const dMin = parseInt(minutesStr, 10) || 0;
  const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dHour, dMin, 0);

  // 競輪公式ルール：締切後、選手入場・発走・周回(約3〜4分)・審判確定まで約5分
  const confirmationDate = new Date(deadlineDate.getTime() + 5 * 60 * 1000);
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (now.getTime() < deadlineDate.getTime()) {
    const isSoon = diffMinutes <= 10;
    return {
      isConfirmed: false,
      statusText: isSoon ? 'まもなく締切 (未確定)' : '発売中 (未確定)',
      detail: `締切時刻 ${effectiveDeadline} 前です（あと ${Math.max(0, diffMinutes)}分）。発走前です。`,
      remainingMinutes: diffMinutes,
    };
  }

  if (now.getTime() < confirmationDate.getTime()) {
    return {
      isConfirmed: false,
      statusText: '発走・審判確認中 (確定前)',
      detail: `締切済み・現在レース走行・審判着順写真判定中です。`,
      remainingMinutes: diffMinutes,
    };
  }

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
      : '16:40';

  if (isPastDate) {
    return {
      canVote: true,
      isPastDate: true,
      isToday: false,
      isPastDeadlineToday: false,
      effectiveDeadline,
    };
  }

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

  return {
    canVote: true,
    isPastDate: false,
    isToday: false,
    isPastDeadlineToday: false,
    effectiveDeadline,
  };
}

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
