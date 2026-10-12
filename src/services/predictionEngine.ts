import { AppSettings, BetCandidate, BetType, BoatData, ScoredBoat } from '../types/kyotei';

/**
 * 7. 多券種・任意点数対応 競艇予想エンジン
 * 3連単・3連複・2連単・2連複・単勝・複勝・拡連複 および 1〜12点数可変対応
 */

export function calculateBoatScores(boats: BoatData[], settings: AppSettings): ScoredBoat[] {
  if (!boats || boats.length === 0) return [];

  // 展示タイムの平均と差分を計算（展示タイムが速い＝数値が小さいほど高評価）
  const validExhibitionTimes = boats.filter(b => b.exhibitionTime > 5.0 && b.exhibitionTime < 8.0);
  const avgExhibition = validExhibitionTimes.length > 0
    ? validExhibitionTimes.reduce((acc, b) => acc + b.exhibitionTime, 0) / validExhibitionTimes.length
    : 6.75;

  const scored: ScoredBoat[] = boats.map((b) => {
    // 1. 勝率補正 (全国勝率 × winRateWeight)
    const winRatePt = (b.winRate || 0) * settings.winRateWeight;

    // 2. 2連対率補正 (2連対率 × secondRateWeight)
    const secondRatePt = (b.secondRate || 0) * settings.secondRateWeight;

    // 3. モーター2連対率補正 (モーター2連対率 × motorWeight)
    const motorPt = (b.motorSecondRate || 0) * settings.motorWeight;

    // 4. 展示タイム補正 (基準タイムからの速さに応じて加減点)
    let exhibitionPt = 0;
    if (b.exhibitionTime > 5.0 && b.exhibitionTime < 8.0) {
      const diff = avgExhibition - b.exhibitionTime;
      exhibitionPt = Math.round(diff * 100 * (settings.exhibitionWeight / 10));
    }

    // 5. コース補正 (1コース〜6コース)
    const courseIndex = Math.min(Math.max((b.course || b.boatNumber) - 1, 0), 5);
    const coursePt = settings.courseWeights[courseIndex] ?? 0;

    // トータルスコア
    const rawScore = Math.max(Math.round(winRatePt + secondRatePt + motorPt + exhibitionPt + coursePt), 10);

    return {
      ...b,
      rawScore,
      rank: 1, // 後でソートして設定
    };
  });

  // スコア降順にソートして順位付け
  scored.sort((a, b) => b.rawScore - a.rawScore);
  scored.forEach((boat, index) => {
    boat.rank = index + 1;
  });

  return scored;
}

/**
 * 舟券種別および指定点数に応じた買い目候補生成
 */
export function generateBetsByType(
  scoredBoats: ScoredBoat[],
  betType: BetType = '3t',
  pointCount: number = 5,
  defaultOddsMap: Record<string, number> = {}
): BetCandidate[] {
  if (!scoredBoats || scoredBoats.length < 2) return [];

  const boatMap = new Map<number, ScoredBoat>();
  scoredBoats.forEach(b => boatMap.set(b.boatNumber, b));

  const boatNumbers = scoredBoats.map(b => b.boatNumber);
  const candidates: { combination: string; first: number; second: number; third: number; score: number }[] = [];

  // --- 1. 3連単 (3t) ---
  if (betType === '3t') {
    for (const b1 of boatNumbers) {
      for (const b2 of boatNumbers) {
        if (b2 === b1) continue;
        for (const b3 of boatNumbers) {
          if (b3 === b1 || b3 === b2) continue;
          const s1 = boatMap.get(b1)?.rawScore || 100;
          const s2 = boatMap.get(b2)?.rawScore || 80;
          const s3 = boatMap.get(b3)?.rawScore || 60;
          // 1着艇の重みが最も高い
          const score = Math.round(s1 * 0.55 + s2 * 0.30 + s3 * 0.15);
          candidates.push({
            combination: `${b1}-${b2}-${b3}`,
            first: b1,
            second: b2,
            third: b3,
            score,
          });
        }
      }
    }
  }

  // --- 2. 3連複 (3f) ---
  else if (betType === '3f') {
    for (let i = 0; i < boatNumbers.length; i++) {
      for (let j = i + 1; j < boatNumbers.length; j++) {
        for (let k = j + 1; k < boatNumbers.length; k++) {
          const b1 = boatNumbers[i];
          const b2 = boatNumbers[j];
          const b3 = boatNumbers[k];
          const s1 = boatMap.get(b1)?.rawScore || 100;
          const s2 = boatMap.get(b2)?.rawScore || 80;
          const s3 = boatMap.get(b3)?.rawScore || 60;
          const score = Math.round(s1 * 0.38 + s2 * 0.34 + s3 * 0.28);
          const sorted = [b1, b2, b3].sort((x, y) => x - y);
          candidates.push({
            combination: `${sorted[0]}=${sorted[1]}=${sorted[2]}`,
            first: sorted[0],
            second: sorted[1],
            third: sorted[2],
            score,
          });
        }
      }
    }
  }

  // --- 3. 2連単 (2t) ---
  else if (betType === '2t') {
    for (const b1 of boatNumbers) {
      for (const b2 of boatNumbers) {
        if (b2 === b1) continue;
        const s1 = boatMap.get(b1)?.rawScore || 100;
        const s2 = boatMap.get(b2)?.rawScore || 80;
        const score = Math.round(s1 * 0.65 + s2 * 0.35);
        candidates.push({
          combination: `${b1}-${b2}`,
          first: b1,
          second: b2,
          third: 0,
          score,
        });
      }
    }
  }

  // --- 4. 2連複 (2f) ---
  else if (betType === '2f') {
    for (let i = 0; i < boatNumbers.length; i++) {
      for (let j = i + 1; j < boatNumbers.length; j++) {
        const b1 = boatNumbers[i];
        const b2 = boatNumbers[j];
        const s1 = boatMap.get(b1)?.rawScore || 100;
        const s2 = boatMap.get(b2)?.rawScore || 80;
        const score = Math.round(s1 * 0.52 + s2 * 0.48);
        const sorted = [b1, b2].sort((x, y) => x - y);
        candidates.push({
          combination: `${sorted[0]}=${sorted[1]}`,
          first: sorted[0],
          second: sorted[1],
          third: 0,
          score,
        });
      }
    }
  }

  // --- 5. 単勝 (1t) ---
  else if (betType === '1t') {
    for (const b of boatNumbers) {
      const s = boatMap.get(b)?.rawScore || 100;
      candidates.push({
        combination: `${b}`,
        first: b,
        second: 0,
        third: 0,
        score: s,
      });
    }
  }

  // --- 6. 複勝 (1f) ---
  else if (betType === '1f') {
    for (const b of boatNumbers) {
      const s = boatMap.get(b)?.rawScore || 100;
      candidates.push({
        combination: `${b} [複]`,
        first: b,
        second: 0,
        third: 0,
        score: Math.round(s * 0.95),
      });
    }
  }

  // --- 7. 拡連複 (wide) ---
  else if (betType === 'wide') {
    for (let i = 0; i < boatNumbers.length; i++) {
      for (let j = i + 1; j < boatNumbers.length; j++) {
        const b1 = boatNumbers[i];
        const b2 = boatNumbers[j];
        const s1 = boatMap.get(b1)?.rawScore || 100;
        const s2 = boatMap.get(b2)?.rawScore || 80;
        const score = Math.round(s1 * 0.50 + s2 * 0.50);
        const sorted = [b1, b2].sort((x, y) => x - y);
        candidates.push({
          combination: `${sorted[0]}=${sorted[1]} [拡]`,
          first: sorted[0],
          second: sorted[1],
          third: 0,
          score,
        });
      }
    }
  }

  // スコア順にソート
  candidates.sort((a, b) => b.score - a.score);

  // 指定点数に絞り込み
  const effectivePoints = Math.max(1, Math.min(pointCount, candidates.length));
  const selected = candidates.slice(0, effectivePoints);

  // 相対確率（確率配分）の算出
  const totalScore = selected.reduce((sum, c) => sum + c.score, 0);

  return selected.map((c, index) => {
    const odds = defaultOddsMap[c.combination] ?? 0;
    const relativeProb = totalScore > 0 ? Number(((c.score / totalScore) * 100).toFixed(1)) : 20.0;
    const expectedValue = odds > 0 ? Number(((relativeProb / 100) * odds).toFixed(2)) : 0;

    return {
      rank: index + 1,
      combination: c.combination,
      betType,
      first: c.first,
      second: c.second,
      third: c.third,
      score: c.score,
      relativeProb,
      odds,
      stake: 0,
      expectedReturn: 0,
      expectedValue,
    };
  });
}

/**
 * 互換性のための従来ラッパー（本命5点型 3連単）
 */
export function generateFivePointBets(
  scoredBoats: ScoredBoat[],
  defaultOddsMap: Record<string, number> = {}
): BetCandidate[] {
  return generateBetsByType(scoredBoats, '3t', 5, defaultOddsMap);
}

/**
 * 舟券種別に応じたリアル市場オッズシミュレーション
 */
export function simulateRealisticOdds(
  candidates: BetCandidate[],
  betType: BetType = '3t'
): Record<string, number> {
  const result: Record<string, number> = {};

  // 券種に応じた基準オッズレンジ
  const oddsBases: Record<BetType, number[]> = {
    '3t': [5.6, 9.8, 12.4, 18.2, 24.5, 32.0, 42.0, 56.0, 72.0, 95.0, 120.0, 150.0],
    '3f': [3.4, 5.2, 7.8, 11.0, 15.5, 21.0, 28.0, 36.0, 48.0, 62.0],
    '2t': [3.6, 5.8, 8.4, 12.2, 16.5, 22.0, 28.0, 36.0, 48.0, 64.0],
    '2f': [2.2, 3.8, 5.5, 7.8, 11.2, 15.0, 20.0, 27.0],
    '1t': [1.8, 3.4, 5.6, 9.2],
    '1f': [1.2, 1.8, 2.5, 3.8],
    'wide': [1.6, 2.4, 3.5, 5.0, 7.2, 9.5, 13.0, 18.0],
  };

  const bases = oddsBases[betType] || oddsBases['3t'];

  candidates.forEach((c, idx) => {
    const base = bases[idx] ?? (bases[bases.length - 1] + (idx - bases.length + 1) * 3);
    const variation = Math.sin((c.first * 3 + c.second * 7 + c.third) || idx) * (base * 0.12);
    const minVal = betType === '1f' ? 1.1 : betType === 'wide' ? 1.2 : 1.5;
    const finalOdds = Math.max(Number((base + variation).toFixed(1)), minVal);
    result[c.combination] = finalOdds;
  });

  return result;
}
