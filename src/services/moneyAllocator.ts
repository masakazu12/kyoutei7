import { AppSettings, BetCandidate } from '../types/kyotei';

/**
 * 8. 資金配分機能
 * 固定額・均等配分・目標払戻配分の計算ロジック
 */

export interface AllocationResult {
  updatedCandidates: BetCandidate[];
  totalStake: number;
  totalExpectedReturnMin: number;
  totalExpectedReturnMax: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  warningMessage?: string;
}

export function allocateMoney(
  candidates: BetCandidate[],
  settings: AppSettings
): AllocationResult {
  if (!candidates || candidates.length === 0) {
    return {
      updatedCandidates: [],
      totalStake: 0,
      totalExpectedReturnMin: 0,
      totalExpectedReturnMax: 0,
      isOverBudget: false,
      overBudgetAmount: 0,
    };
  }

  const updated: BetCandidate[] = candidates.map(c => ({ ...c }));
  const mode = settings.allocationMode;
  const budget = settings.maxRaceBudget;
  const targetReturn = settings.targetReturn;
  const baseStake = Math.max(Math.floor(settings.baseStake / 100) * 100, 100);

  // 1. 各方式に応じた暫定金額計算
  if (mode === 'fixed') {
    // 固定額方式: 各買い目に固定額
    updated.forEach(c => {
      if (c.odds > 0) {
        c.stake = baseStake;
      } else {
        c.stake = 0;
      }
    });
  } else if (mode === 'equal') {
    // 均等配分方式: レース予算を有効候補数で均等割（100円単位に切り捨て・最低100円）
    const validCount = updated.filter(c => c.odds > 0).length;
    if (validCount > 0) {
      const perBet = Math.max(Math.floor((budget / validCount) / 100) * 100, 100);
      updated.forEach(c => {
        c.stake = c.odds > 0 ? perBet : 0;
      });
    } else {
      updated.forEach(c => (c.stake = 0));
    }
  } else if (mode === 'target') {
    // 目標払戻配分: 購入金額 = ceil(目標払戻額 ÷ オッズ ÷ 100) × 100
    updated.forEach(c => {
      if (c.odds > 0) {
        const raw = targetReturn / c.odds;
        const rounded = Math.ceil(raw / 100) * 100;
        c.stake = Math.max(rounded, 100);
      } else {
        c.stake = 0;
      }
    });
  }

  // 2. 合計投資額の計算
  let currentTotal = updated.reduce((sum, c) => sum + (c.stake || 0), 0);
  let isOver = currentTotal > budget;
  let overAmount = isOver ? currentTotal - budget : 0;
  let warningMessage: string | undefined = undefined;

  // 3. 上限超過時の自動縮小オプション（設定でONの場合）
  if (isOver && settings.autoScaleBudget && currentTotal > 0) {
    const ratio = budget / currentTotal;
    updated.forEach(c => {
      if (c.stake > 0) {
        // 比率で圧縮して100円単位
        const scaled = Math.max(Math.floor((c.stake * ratio) / 100) * 100, 100);
        c.stake = scaled;
      }
    });

    currentTotal = updated.reduce((sum, c) => sum + c.stake, 0);
    // もしまだ端数で100円超えている場合は大きい順に100円ずつ減らす
    while (currentTotal > budget) {
      const maxStakeBet = updated.reduce((prev, curr) => (curr.stake > prev.stake ? curr : prev), updated[0]);
      if (maxStakeBet && maxStakeBet.stake > 100) {
        maxStakeBet.stake -= 100;
        currentTotal -= 100;
      } else {
        break;
      }
    }

    isOver = currentTotal > budget;
    overAmount = isOver ? currentTotal - budget : 0;
    warningMessage = `予算上限（${budget.toLocaleString()}円）に合わせて自動縮小配分しました。`;
  } else if (isOver) {
    warningMessage = `総投資額が1レース上限額（${budget.toLocaleString()}円）を${overAmount.toLocaleString()}円超過しています。`;
  }

  // 4. 想定払戻額と期待値の最終計算
  let minReturn = Infinity;
  let maxReturn = 0;

  updated.forEach(c => {
    c.expectedReturn = c.stake > 0 && c.odds > 0 ? Math.round(c.stake * c.odds) : 0;
    c.expectedValue = c.odds > 0 ? Number(((c.relativeProb / 100) * c.odds).toFixed(2)) : 0;

    if (c.stake > 0 && c.expectedReturn > 0) {
      if (c.expectedReturn < minReturn) minReturn = c.expectedReturn;
      if (c.expectedReturn > maxReturn) maxReturn = c.expectedReturn;
    }
  });

  return {
    updatedCandidates: updated,
    totalStake: currentTotal,
    totalExpectedReturnMin: minReturn === Infinity ? 0 : minReturn,
    totalExpectedReturnMax: maxReturn,
    isOverBudget: isOver,
    overBudgetAmount: overAmount,
    warningMessage,
  };
}
