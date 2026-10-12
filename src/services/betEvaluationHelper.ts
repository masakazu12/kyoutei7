import { BetType } from '../types/kyotei';

/**
 * 舟券種別に応じた的中判定および払戻金算出ユーティリティ
 */

export function parseFinishOrder(finishOrder: string): { first: number; second: number; third: number } {
  const parts = finishOrder.split('-').map((s) => parseInt(s.trim(), 10));
  return {
    first: parts[0] || 1,
    second: parts[1] || 2,
    third: parts[2] || 3,
  };
}

/**
 * 確定着順（例: "1-2-3"）に対する買い目の的中判定
 */
export function isBetHit(combination: string, betType: BetType = '3t', finishOrder: string): boolean {
  if (!combination || !finishOrder) return false;
  const { first, second, third } = parseFinishOrder(finishOrder);

  // 1. 3連単 (3t) - 例: "1-2-3"
  if (betType === '3t') {
    return combination === `${first}-${second}-${third}`;
  }

  // 2. 3連複 (3f) - 例: "1=2=3"
  if (betType === '3f') {
    const rawClean = combination.replace(/[^0-9=]/g, '');
    const nums = rawClean.split('=').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    if (nums.length !== 3) return false;
    const targetSet = new Set([first, second, third]);
    return nums.every((n) => targetSet.has(n));
  }

  // 3. 2連単 (2t) - 例: "1-2"
  if (betType === '2t') {
    return combination === `${first}-${second}`;
  }

  // 4. 2連複 (2f) - 例: "1=2"
  if (betType === '2f') {
    const rawClean = combination.replace(/[^0-9=]/g, '');
    const nums = rawClean.split('=').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    if (nums.length !== 2) return false;
    const targetSet = new Set([first, second]);
    return nums.every((n) => targetSet.has(n));
  }

  // 5. 単勝 (1t) - 例: "1"
  if (betType === '1t') {
    const boat = parseInt(combination.replace(/[^0-9]/g, ''), 10);
    return boat === first;
  }

  // 6. 複勝 (1f) - 例: "1 [複]" (競艇では1着または2着で的中)
  if (betType === '1f') {
    const boat = parseInt(combination.replace(/[^0-9]/g, ''), 10);
    return boat === first || boat === second;
  }

  // 7. 拡連複 (wide) - 例: "1=2 [拡]" (1-2着, 1-3着, 2-3着のいずれかで的中)
  if (betType === 'wide') {
    const rawClean = combination.replace(/\[拡\]/g, '').replace(/[^0-9=]/g, '');
    const nums = rawClean.split('=').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
    if (nums.length !== 2) return false;
    const top3 = new Set([first, second, third]);
    return nums[0] !== nums[1] && top3.has(nums[0]) && top3.has(nums[1]);
  }

  return false;
}

/**
 * 舟券種別および確定オッズに応じた確定払戻金の計算 (100円あたり)
 */
export function getEstimatedOfficialPayout(
  official3tPayout: number,
  betType: BetType,
  hitOdds: number
): number {
  if (hitOdds > 0) {
    return Math.round(hitOdds * 100);
  }

  // フォールバック計算
  switch (betType) {
    case '3t':
      return official3tPayout;
    case '3f':
      return Math.max(Math.round(official3tPayout * 0.38), 120);
    case '2t':
      return Math.max(Math.round(official3tPayout * 0.42), 150);
    case '2f':
      return Math.max(Math.round(official3tPayout * 0.25), 110);
    case '1t':
      return Math.max(Math.round(official3tPayout * 0.18), 110);
    case '1f':
      return Math.max(Math.round(official3tPayout * 0.12), 100);
    case 'wide':
      return Math.max(Math.round(official3tPayout * 0.16), 110);
    default:
      return official3tPayout;
  }
}
