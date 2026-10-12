import { AppSettings, AppStatus, BetCandidate, RaceInfo } from '../types/kyotei';

/**
 * 9. 見送り・停止判定サービス
 * 優先順位: STOP判定 > 見送り判定 > NG判定 > 待機/通常
 */

export interface JudgmentResult {
  status: AppStatus;
  isStopped: boolean;
  isSkipped: boolean;
  isNg: boolean;
  reasonTitle: string;
  reasonDetail: string;
}

export function evaluateRaceStatus(params: {
  race: RaceInfo;
  candidates: BetCandidate[];
  settings: AppSettings;
  dailyProfit: number;
  manualStop: boolean;
}): JudgmentResult {
  const { race, candidates, settings, dailyProfit, manualStop } = params;

  // 1. STOP条件判定 (最優先)
  if (manualStop) {
    return {
      status: 'Stop',
      isStopped: true,
      isSkipped: false,
      isNg: false,
      reasonTitle: '手動停止 (MANUAL STOP)',
      reasonDetail: 'ユーザー操作により自動処理を停止しています。解除するまで新規配分は実行されません。',
    };
  }

  if (settings.dailyProfitTarget > 0 && dailyProfit >= settings.dailyProfitTarget) {
    return {
      status: 'Stop',
      isStopped: true,
      isSkipped: false,
      isNg: false,
      reasonTitle: '利益目標達成による停止 (STOP)',
      reasonDetail: `本日の純利益が目標額（+${settings.dailyProfitTarget.toLocaleString()}円）に到達しました。利益確保のため終了を推奨します。`,
    };
  }

  if (settings.dailyLossLimit > 0 && dailyProfit <= -settings.dailyLossLimit) {
    return {
      status: 'Stop',
      isStopped: true,
      isSkipped: false,
      isNg: false,
      reasonTitle: '損失上限到達による停止 (STOP)',
      reasonDetail: `本日の損失が上限額（-${settings.dailyLossLimit.toLocaleString()}円）に到達しました。資金保護のため本日の運用を停止します。`,
    };
  }

  // 2. NG判定 (必須データ欠落・異常入力)
  if (!race.boats || race.boats.length < 6) {
    return {
      status: 'NG',
      isStopped: false,
      isSkipped: false,
      isNg: true,
      reasonTitle: 'データ不足 (NG)',
      reasonDetail: '出走艇データが6艇分揃っていません。艇データを入力または取得してください。',
    };
  }

  const invalidWinRates = race.boats.some(b => isNaN(b.winRate) || b.winRate < 0);
  if (invalidWinRates) {
    return {
      status: 'NG',
      isStopped: false,
      isSkipped: false,
      isNg: true,
      reasonTitle: '入力値エラー (NG)',
      reasonDetail: '全国勝率等の数値に未入力または異常値が含まれています。',
    };
  }

  // 3. 見送り判定 (環境・オッズ等)
  // 3.1 風速見送り
  if (race.weather.windSpeed >= settings.windSpeedThreshold) {
    return {
      status: 'Skip',
      isStopped: false,
      isSkipped: true,
      isNg: false,
      reasonTitle: '強風による見送り (SKIP)',
      reasonDetail: `風速が閾値（${settings.windSpeedThreshold}m/s）以上の強風（${race.weather.windSpeed}m/s）のため、水面荒れ警戒で見送ります。`,
    };
  }

  // 3.2 波高見送り
  if (race.weather.waveHeight >= settings.waveHeightThreshold) {
    return {
      status: 'Skip',
      isStopped: false,
      isSkipped: true,
      isNg: false,
      reasonTitle: '高波による見送り (SKIP)',
      reasonDetail: `波高が閾値（${settings.waveHeightThreshold}cm）以上の高波（${race.weather.waveHeight}cm）のため見送ります。`,
    };
  }

  // 3.3 最低オッズ見送り (候補が生成されている場合)
  if (candidates.length > 0) {
    const validOdds = candidates.filter(c => c.odds > 0);
    if (validOdds.length > 0 && validOdds.every(c => c.odds < settings.minOdds)) {
      return {
        status: 'Skip',
        isStopped: false,
        isSkipped: true,
        isNg: false,
        reasonTitle: '低オッズによる見送り (SKIP)',
        reasonDetail: `全買い目のオッズが最低閾値（${settings.minOdds}倍）を下回っているため、投資効率低下により見送ります。`,
      };
    }
  }

  // 3.4 展示タイム欠落チェック
  const missingExhibition = race.boats.filter(b => !b.exhibitionTime || b.exhibitionTime <= 5.0 || b.exhibitionTime >= 8.5);
  if (missingExhibition.length >= 3) {
    return {
      status: 'Skip',
      isStopped: false,
      isSkipped: true,
      isNg: false,
      reasonTitle: '展示データ不足による見送り (SKIP)',
      reasonDetail: '展示タイムが取得できていない艇が多数あるため、直前気配判定が困難です。',
    };
  }

  // 4. 正常・待機状態
  return {
    status: 'Taiki',
    isStopped: false,
    isSkipped: false,
    isNg: false,
    reasonTitle: '待機中 (TAIKI)',
    reasonDetail: 'レース条件適合中。予想生成または結果入力を待機しています。',
  };
}
