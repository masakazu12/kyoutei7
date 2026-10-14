import { AppSettings, BetCandidate, BetType, BoatData, ScoredBoat, BankLength } from '../types/kyotei';

/**
 * 競輪（KEIRIN）予想エンジン
 * 競走得点・ライン並び展開・バンク周長(333m/400m/500m)特性・スジ車券重み付け
 * 3連単・3連複・2車単・2車複・単勝・ワイド対応
 */

export function calculateBoatScores(
  boats: BoatData[],
  settings: AppSettings,
  bankLength: BankLength = 400
): ScoredBoat[] {
  if (!boats || boats.length === 0) return [];

  // 全員の平均競走得点を算出
  const avgScore = boats.reduce((sum, b) => sum + (b.score || 100), 0) / boats.length;

  const scored: ScoredBoat[] = boats.map((b) => {
    // 1. 競走得点による基本スコア (80〜120点)
    // 競走得点1ポイントの差は大きい
    const scoreDiff = (b.score || 100) - avgScore;
    const scorePt = (b.score || 100) * (settings.scoreWeight / 20) + scoreDiff * 8;

    // 2. 勝率・2連対率補正
    const winRatePt = (b.winRate || 0) * (settings.winRateWeight / 15);
    const secondRatePt = (b.secondRate || 0) * 0.5;

    // 3. バック(B)本数・自力先行意欲補正
    const bCount = b.bCount || 0;
    const bPt = Math.min(bCount * 2.5, 30) * (settings.bWeight / 10);

    // 4. バンク周長と脚質の適性補正
    let bankStylePt = 0;
    if (bankLength <= 335) {
      // 333m短バンク: 先行(逃)が圧倒的有利
      if (b.style === '逃') bankStylePt += 35;
      else if (b.lineRole === '先頭') bankStylePt += 25;
      else if (b.style === '追') bankStylePt -= 10;
    } else if (bankLength >= 500) {
      // 500m長走路: 直線長く捲り・追込・番手差しが有利
      if (b.style === '追' || b.lineRole === '番手') bankStylePt += 30;
      else if (b.style === '捲') bankStylePt += 25;
      else if (b.style === '逃') bankStylePt -= 15;
    } else {
      // 400m標準バンク: バランス型
      if (b.lineRole === '番手') bankStylePt += 15;
      if (b.style === '両') bankStylePt += 10;
    }

    // 5. ライン上の役割ボーナス (先頭自力と番手は1着・2着候補として突出)
    let rolePt = 0;
    if (b.lineRole === '先頭') rolePt += 20;
    else if (b.lineRole === '番手') rolePt += 22;
    else if (b.lineRole === '3番手') rolePt += 5;
    else if (b.lineRole === '単騎') rolePt += 8;

    // 総合スコア
    const rawScore = Math.max(
      Math.round(scorePt + winRatePt + secondRatePt + bPt + bankStylePt + rolePt),
      10
    );

    return {
      ...b,
      rawScore,
      rank: 1,
    };
  });

  // スコア降順ソート
  scored.sort((a, b) => b.rawScore - a.rawScore);
  scored.forEach((boat, index) => {
    boat.rank = index + 1;
  });

  return scored;
}

/**
 * 車券種別および指定点数に応じた競輪買い目候補生成 (スジ車券重視アルゴリズム)
 */
export function generateBetsByType(
  scoredBoats: ScoredBoat[],
  betType: BetType = '3t',
  pointCount: number = 6,
  defaultOddsMap: Record<string, number> = {},
  bankLength: BankLength = 400
): BetCandidate[] {
  if (!scoredBoats || scoredBoats.length < 2) return [];

  const boatMap = new Map<number, ScoredBoat>();
  scoredBoats.forEach((b) => boatMap.set(b.boatNumber, b));
  const boatNumbers = scoredBoats.map((b) => b.boatNumber);

  interface RawCandidate {
    combination: string;
    first: number;
    second: number;
    third: number;
    score: number;
    isLineSuji: boolean;
    sujiType: 'スジ (本線)' | 'スジ (ズブズブ)' | 'スジ違い (別線)' | '中穴捲り';
  }

  const rawList: RawCandidate[] = [];

  // --- 1. 3連単 (3t) ---
  if (betType === '3t') {
    for (const b1 of boatNumbers) {
      for (const b2 of boatNumbers) {
        if (b2 === b1) continue;
        for (const b3 of boatNumbers) {
          if (b3 === b1 || b3 === b2) continue;

          const r1 = boatMap.get(b1)!;
          const r2 = boatMap.get(b2)!;
          const r3 = boatMap.get(b3)!;

          let comboScore = r1.rawScore * 0.52 + r2.rawScore * 0.32 + r3.rawScore * 0.16;

          // スジ判定: 1着と2着が同一ラインか？
          const isSuji = r1.lineGroup === r2.lineGroup && r1.lineGroup > 0;
          let sujiType: RawCandidate['sujiType'] = 'スジ違い (別線)';

          if (isSuji) {
            comboScore *= 1.35; // スジ車券に大きなボーナス！
            if (r1.lineRole === '先頭' && r2.lineRole === '番手') {
              sujiType = 'スジ (本線)'; // 先行逃げ粘り・番手追走
            } else if (r1.lineRole === '番手' && r2.lineRole === '先頭') {
              sujiType = 'スジ (ズブズブ)'; // 番手差し抜け
            } else {
              sujiType = 'スジ (本線)';
            }
            // 3着も同ラインなら完璧なライン独占
            if (r3.lineGroup === r1.lineGroup) {
              comboScore *= 1.15;
            }
          } else {
            if (r1.style === '捲' || r2.style === '捲') {
              sujiType = '中穴捲り';
            }
          }

          rawList.push({
            combination: `${b1}-${b2}-${b3}`,
            first: b1,
            second: b2,
            third: b3,
            score: Math.round(comboScore),
            isLineSuji: isSuji,
            sujiType,
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
          const r1 = boatMap.get(b1)!;
          const r2 = boatMap.get(b2)!;
          const r3 = boatMap.get(b3)!;

          let comboScore = (r1.rawScore + r2.rawScore + r3.rawScore) / 3;
          const isSuji = (r1.lineGroup === r2.lineGroup && r1.lineGroup > 0) || (r2.lineGroup === r3.lineGroup && r2.lineGroup > 0);
          if (isSuji) comboScore *= 1.25;

          rawList.push({
            combination: `${b1}=${b2}=${b3}`,
            first: b1,
            second: b2,
            third: b3,
            score: Math.round(comboScore),
            isLineSuji: isSuji,
            sujiType: isSuji ? 'スジ (本線)' : 'スジ違い (別線)',
          });
        }
      }
    }
  }

  // --- 3. 2車単 (2t) ---
  else if (betType === '2t') {
    for (const b1 of boatNumbers) {
      for (const b2 of boatNumbers) {
        if (b2 === b1) continue;
        const r1 = boatMap.get(b1)!;
        const r2 = boatMap.get(b2)!;
        let comboScore = r1.rawScore * 0.6 + r2.rawScore * 0.4;

        const isSuji = r1.lineGroup === r2.lineGroup && r1.lineGroup > 0;
        let sujiType: RawCandidate['sujiType'] = 'スジ違い (別線)';
        if (isSuji) {
          comboScore *= 1.4;
          sujiType = r1.lineRole === '先頭' ? 'スジ (本線)' : 'スジ (ズブズブ)';
        }

        rawList.push({
          combination: `${b1}-${b2}`,
          first: b1,
          second: b2,
          third: 0,
          score: Math.round(comboScore),
          isLineSuji: isSuji,
          sujiType,
        });
      }
    }
  }

  // --- 4. 2車複 (2f) ---
  else if (betType === '2f') {
    for (let i = 0; i < boatNumbers.length; i++) {
      for (let j = i + 1; j < boatNumbers.length; j++) {
        const b1 = boatNumbers[i];
        const b2 = boatNumbers[j];
        const r1 = boatMap.get(b1)!;
        const r2 = boatMap.get(b2)!;
        let comboScore = (r1.rawScore + r2.rawScore) / 2;

        const isSuji = r1.lineGroup === r2.lineGroup && r1.lineGroup > 0;
        if (isSuji) comboScore *= 1.35;

        rawList.push({
          combination: `${b1}=${b2}`,
          first: b1,
          second: b2,
          third: 0,
          score: Math.round(comboScore),
          isLineSuji: isSuji,
          sujiType: isSuji ? 'スジ (本線)' : 'スジ違い (別線)',
        });
      }
    }
  }

  // --- 5. 単勝 (1t) ---
  else if (betType === '1t') {
    for (const b1 of boatNumbers) {
      const r1 = boatMap.get(b1)!;
      rawList.push({
        combination: `${b1}`,
        first: b1,
        second: 0,
        third: 0,
        score: r1.rawScore,
        isLineSuji: false,
        sujiType: 'スジ (本線)',
      });
    }
  }

  // --- 6. ワイド (wide) ---
  else {
    for (let i = 0; i < boatNumbers.length; i++) {
      for (let j = i + 1; j < boatNumbers.length; j++) {
        const b1 = boatNumbers[i];
        const b2 = boatNumbers[j];
        const r1 = boatMap.get(b1)!;
        const r2 = boatMap.get(b2)!;
        let comboScore = (r1.rawScore + r2.rawScore) / 2;

        const isSuji = r1.lineGroup === r2.lineGroup && r1.lineGroup > 0;
        if (isSuji) comboScore *= 1.25;

        rawList.push({
          combination: `${b1}=${b2}`,
          first: b1,
          second: b2,
          third: 0,
          score: Math.round(comboScore),
          isLineSuji: isSuji,
          sujiType: isSuji ? 'スジ (本線)' : 'スジ違い (別線)',
        });
      }
    }
  }

  // スコア順にソート
  rawList.sort((a, b) => b.score - a.score);

  // 指定点数に絞り込み
  const topList = rawList.slice(0, Math.max(1, pointCount));
  const totalScore = topList.reduce((sum, item) => sum + item.score, 0);

  // 買い目オッズと確率の計算
  return topList.map((item, idx) => {
    const relativeProb = totalScore > 0 ? (item.score / totalScore) * 100 : 100 / topList.length;

    // オッズ決定
    let odds = defaultOddsMap[item.combination];
    if (!odds) {
      if (betType === '3t') {
        const baseOdds = [5.4, 8.8, 12.5, 18.0, 26.5, 38.0, 52.0, 75.0, 110.0, 160.0, 220.0, 310.0];
        odds = baseOdds[idx] || Number((15 + idx * 12 + (item.first * 2.3)).toFixed(1));
      } else if (betType === '2t') {
        const baseOdds = [3.2, 5.5, 8.4, 12.0, 17.5, 25.0, 35.0, 48.0];
        odds = baseOdds[idx] || Number((5 + idx * 4.5).toFixed(1));
      } else if (betType === '3f') {
        odds = Number((2.8 + idx * 3.2).toFixed(1));
      } else if (betType === '2f') {
        odds = Number((2.2 + idx * 2.5).toFixed(1));
      } else if (betType === '1t') {
        odds = Number((1.8 + idx * 1.5).toFixed(1));
      } else {
        odds = Number((1.5 + idx * 1.2).toFixed(1));
      }
    }

    const expectedValue = Number(((relativeProb / 100) * odds).toFixed(2));

    return {
      rank: idx + 1,
      combination: item.combination,
      betType,
      first: item.first,
      second: item.second,
      third: item.third,
      score: item.score,
      relativeProb: Number(relativeProb.toFixed(1)),
      odds,
      stake: 0,
      expectedReturn: 0,
      expectedValue,
      isLineSuji: item.isLineSuji,
      sujiType: item.sujiType,
      isExcludedByOdds: false,
    };
  });
}

/**
 * 競艇互換用ラッパー
 */
export function generateFivePointBets(
  scoredBoats: ScoredBoat[],
  defaultOddsMap: Record<string, number> = {}
): BetCandidate[] {
  return generateBetsByType(scoredBoats, '3t', 6, defaultOddsMap);
}

/**
 * リアルな競輪オッズシミュレーション
 */
export function simulateRealisticOdds(
  candidates: BetCandidate[],
  betType: BetType = '3t'
): Record<string, number> {
  const result: Record<string, number> = {};
  candidates.forEach((c, idx) => {
    let odds = 10.0;
    if (betType === '3t') {
      const base = [6.2, 9.5, 14.0, 19.5, 28.0, 42.0, 58.0, 85.0, 120.0];
      odds = base[idx] || Number((10 + idx * 8.5).toFixed(1));
    } else if (betType === '2t') {
      const base = [3.4, 5.8, 8.6, 13.0, 19.0, 27.0];
      odds = base[idx] || Number((4 + idx * 3.5).toFixed(1));
    } else {
      odds = Number((2.0 + idx * 2.2).toFixed(1));
    }
    result[c.combination] = odds;
  });
  return result;
}
