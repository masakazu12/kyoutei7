/**
 * 競輪AI予想エンジン (Gemini 3.8 Flash 搭載)
 * 競輪場のバンク周長・カント・直線長、ライン並び予想、競走得点・脚質・直近成績を深層分析し、
 * 本命ライン・対抗別線・穴捲りの買い目と展開予測を導出します。
 */

import { GoogleGenAI } from '@google/genai';
import { RaceInfo, ScoredBoat, BetCandidate, AppSettings } from '../types/kyotei';
import { VENUES } from '../constants/venues';
import { simulateRealisticOdds } from './predictionEngine';
import { allocateMoney } from './moneyAllocator';

export interface AIPredictionResult {
  headline: string; // 例:「近畿ライン主導権で番手抜け出し濃厚。別線捲りの強襲に警戒」
  analysisOverview: string; // 総合展開見解
  confidenceLevel: 'S' | 'A' | 'B' | 'C'; // 自信度
  weatherImpact: string; // バンク特性・風速影響
  axisBoat: {
    boatNumber: number;
    racerName: string;
    reason: string;
  };
  rivalBoat: {
    boatNumber: number;
    racerName: string;
    reason: string;
  };
  holeBoat?: {
    boatNumber: number;
    racerName: string;
    reason: string;
  };
  aiCandidates: BetCandidate[]; // AIが導き出した厳選買い目（オッズ・資金配分付き）
  tacticalKey: string; // 展開の鍵（例:「赤板からの主導権争いで突っ張り先行なら番手差し」）
  rawResponse?: string;
  isAiPowered: boolean;
}

export async function generateAIPrediction({
  race,
  scoredBoats,
  settings,
}: {
  race: RaceInfo;
  scoredBoats: ScoredBoat[];
  settings: AppSettings;
}): Promise<AIPredictionResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GEMINI_API_KEY
      : '');

  const venueInfo = VENUES.find((v) => v.name === race.venue);

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const linesText = (race.lines || [])
        .map((l) => `・${l.label}: 車番 [${l.racers.join(' - ')}] (戦法: ${l.tactics})`)
        .join('\n');

      const racersText = race.boats
        .map(
          (b) =>
            `・${b.boatNumber}番車: ${b.name} (${b.branch} ${b.era || ''}期 / ${b.grade}) / 競走得点 ${b.score} / 脚質 ${b.style} / ギヤ ${b.gear} / 勝率 ${b.winRate}% / B数 ${b.bCount} / ライン役割: ${b.lineRole}`
        )
        .join('\n');

      const prompt = `あなたはプロの競輪専属AI予想評論家・データアナリストです。
以下のレース情報、出走選手データ、ライン構成、バンク特性を精査し、3連単の推奨買い目6点とライン展開予想をJSON形式で出力してください。

【対象レース】
・競輪場: ${race.venue} (${venueInfo?.region || ''} / 周長 ${race.bankLength}m / みなし直線 ${race.straightLength}m / 特徴: ${venueInfo?.characteristics || '標準バンク'})
・レース: 第${race.raceNo}R ${race.raceTitle} (${race.grade})
・車立て: ${race.carCount}車立て
・天候: ${race.weather.weather} / 風向 ${race.weather.windDirection} / 風速 ${race.weather.windSpeed}m/s

【ライン並び予想】
${linesText || '細切れ戦'}

【出走選手データ】
${racersText}

【出力フォーマット要求】
必ず以下のJSON形式のみを出力してください:
{
  "headline": "1行の見出し（例: 近畿ラインの主導権濃厚。別線捲り強襲と番手差しの攻防）",
  "analysisOverview": "このレースのライン展開予想・主導権争いとバンク特性に関する見解（200文字以内）",
  "confidenceLevel": "S" | "A" | "B" | "C",
  "weatherImpact": "バンク周長(${race.bankLength}m)と直線距離がスジ決着またはスジ違い捲りに与える影響の解説",
  "axisBoat": { "boatNumber": 1, "racerName": "選手名", "reason": "本命軸に推す理由" },
  "rivalBoat": { "boatNumber": 2, "racerName": "選手名", "reason": "対抗の理由" },
  "holeBoat": { "boatNumber": 3, "racerName": "選手名", "reason": "穴・別線一発の理由" },
  "tacticalKey": "赤板〜打鐘(ジャン)〜最終バックの展開の鍵",
  "top5Combos": [
    { "first": 1, "second": 2, "third": 3, "score": 95, "prob": 26 },
    { "first": 2, "second": 1, "third": 3, "score": 88, "prob": 22 },
    { "first": 1, "second": 2, "third": 5, "score": 82, "prob": 18 },
    { "first": 4, "second": 3, "third": 1, "score": 75, "prob": 14 },
    { "first": 1, "second": 3, "third": 2, "score": 70, "prob": 12 },
    { "first": 2, "second": 1, "third": 5, "score": 65, "prob": 8 }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const combos = parsed.top5Combos || [];
      const oddsMap = simulateRealisticOdds(
        combos.map((c: any) => ({
          rank: 1,
          combination: `${c.first}-${c.second}-${c.third}`,
          first: c.first,
          second: c.second,
          third: c.third,
          score: c.score || 80,
          relativeProb: c.prob || 20,
          odds: 10,
          stake: 0,
          expectedReturn: 0,
          expectedValue: 1,
        })),
        settings.defaultBetType || '3t'
      );

      const rawCandidates: BetCandidate[] = combos.map((c: any, index: number) => {
        const comb = `${c.first}-${c.second}-${c.third}`;
        const odds = oddsMap[comb] || Number((6 + index * 4.5).toFixed(1));
        const r1 = race.boats.find((b) => b.boatNumber === c.first);
        const r2 = race.boats.find((b) => b.boatNumber === c.second);
        const isLineSuji = !!(r1 && r2 && r1.lineGroup === r2.lineGroup && r1.lineGroup > 0);

        return {
          rank: index + 1,
          combination: comb,
          betType: '3t',
          first: c.first,
          second: c.second,
          third: c.third,
          score: c.score || 80,
          relativeProb: c.prob || 20,
          odds,
          stake: 0,
          expectedReturn: 0,
          expectedValue: Number((((c.prob || 20) / 100) * odds).toFixed(2)),
          isLineSuji,
          sujiType: isLineSuji ? 'スジ (本線)' : 'スジ違い (別線)',
        };
      });

      const alloc = allocateMoney(rawCandidates, settings);

      return {
        headline: parsed.headline || 'ライン本線と別線の激戦。番手差しと捲りの二面作戦',
        analysisOverview: parsed.analysisOverview || '競走得点上位ラインが主導権を握る構図。',
        confidenceLevel: parsed.confidenceLevel || 'A',
        weatherImpact: parsed.weatherImpact || `${race.bankLength}mバンクの直線攻防に注目。`,
        axisBoat: parsed.axisBoat || {
          boatNumber: scoredBoats[0]?.boatNumber || 1,
          racerName: scoredBoats[0]?.name || '本命選手',
          reason: '競走得点トップ・ラインの絶対的軸',
        },
        rivalBoat: parsed.rivalBoat || {
          boatNumber: scoredBoats[1]?.boatNumber || 2,
          racerName: scoredBoats[1]?.name || '対抗選手',
          reason: '自力捲り一発または絶好の番手回り',
        },
        holeBoat: parsed.holeBoat,
        tacticalKey: parsed.tacticalKey || '赤板先行争いと最終バックの仕掛けタイミング',
        aiCandidates: alloc.updatedCandidates,
        rawResponse: text,
        isAiPowered: true,
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local heuristic:', err);
    }
  }

  // APIキー未設定またはエラー時の高精度ローカルヒューリスティック予想
  const b1 = scoredBoats[0] || race.boats[0];
  const b2 = scoredBoats[1] || race.boats[1];
  const b3 = scoredBoats[2] || race.boats[2];
  const b4 = scoredBoats[3] || race.boats[3];

  const localCandidates: BetCandidate[] = [
    { rank: 1, combination: `${b1.boatNumber}-${b2.boatNumber}-${b3.boatNumber}`, first: b1.boatNumber, second: b2.boatNumber, third: b3.boatNumber, score: 92, relativeProb: 26, odds: 6.8, stake: 0, expectedReturn: 0, expectedValue: 1.77, isLineSuji: true, sujiType: 'スジ (本線)' },
    { rank: 2, combination: `${b2.boatNumber}-${b1.boatNumber}-${b3.boatNumber}`, first: b2.boatNumber, second: b1.boatNumber, third: b3.boatNumber, score: 86, relativeProb: 22, odds: 9.4, stake: 0, expectedReturn: 0, expectedValue: 2.07, isLineSuji: true, sujiType: 'スジ (ズブズブ)' },
    { rank: 3, combination: `${b1.boatNumber}-${b2.boatNumber}-${b4.boatNumber}`, first: b1.boatNumber, second: b2.boatNumber, third: b4.boatNumber, score: 78, relativeProb: 18, odds: 12.5, stake: 0, expectedReturn: 0, expectedValue: 2.25, isLineSuji: true, sujiType: 'スジ (本線)' },
    { rank: 4, combination: `${b3.boatNumber}-${b1.boatNumber}-${b2.boatNumber}`, first: b3.boatNumber, second: b1.boatNumber, third: b2.boatNumber, score: 72, relativeProb: 14, odds: 18.0, stake: 0, expectedReturn: 0, expectedValue: 2.52, isLineSuji: false, sujiType: '中穴捲り' },
    { rank: 5, combination: `${b1.boatNumber}-${b3.boatNumber}-${b2.boatNumber}`, first: b1.boatNumber, second: b3.boatNumber, third: b2.boatNumber, score: 66, relativeProb: 12, odds: 15.0, stake: 0, expectedReturn: 0, expectedValue: 1.80, isLineSuji: false, sujiType: 'スジ違い (別線)' },
    { rank: 6, combination: `${b2.boatNumber}-${b3.boatNumber}-${b1.boatNumber}`, first: b2.boatNumber, second: b3.boatNumber, third: b1.boatNumber, score: 60, relativeProb: 8, odds: 28.0, stake: 0, expectedReturn: 0, expectedValue: 2.24, isLineSuji: false, sujiType: '中穴捲り' },
  ];

  const alloc = allocateMoney(localCandidates, settings);

  return {
    headline: `【${race.venue} ${race.raceNo}R】競走得点トップ ${b1.name} のライン中心。番手 ${b2.name} とのワンツー有力`,
    analysisOverview: `${race.venue}(${race.bankLength}mバンク)の特性上、主導権を握るラインが優位。${b1.name}が先行または捲りで展開を作り、番手の${b2.name}が追走から抜け出すスジ車券が本線。`,
    confidenceLevel: 'A',
    weatherImpact: `${race.bankLength}mバンク(直線${race.straightLength}m): ${race.bankLength === 333 ? '短走路のため先行前残りに注目' : race.bankLength === 500 ? '長走路のため最後の直線での差し強襲に要警戒' : '標準的走路でスジ決着の信頼度高い'}。`,
    axisBoat: {
      boatNumber: b1.boatNumber,
      racerName: b1.name,
      reason: `競走得点${b1.score}。脚質「${b1.style}」で主導権または強力捲りを放つ絶対的本命軸。`,
    },
    rivalBoat: {
      boatNumber: b2.boatNumber,
      racerName: b2.name,
      reason: `番手からの差し脚鋭く、ワンツー折り返しまで対応可能な強力対抗。`,
    },
    holeBoat: {
      boatNumber: b3.boatNumber,
      racerName: b3.name,
      reason: `別線からの一撃捲りでスジ違い波乱を演出する穴選手。`,
    },
    tacticalKey: `赤板での突っ張り先行か、鐘(ジャン)前後の叩き合いかによるペース変化`,
    aiCandidates: alloc.updatedCandidates,
    isAiPowered: false,
  };
}
