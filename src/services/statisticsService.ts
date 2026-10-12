import { DayStatistics, RaceHistoryRecord, VenueStatistics } from '../types/kyotei';
import { VENUES } from '../constants/venues';

/**
 * 10. 統計管理サービス
 * 収支・的中率・回収率の集計ロジック
 */

export function calculateStatistics(history: RaceHistoryRecord[]): DayStatistics {
  if (!history || history.length === 0) {
    return {
      totalStake: 0,
      totalReturn: 0,
      netProfit: 0,
      hitCount: 0,
      betCount: 0,
      skipCount: 0,
      totalRaces: 0,
      hitRate: 0,
      recoveryRate: 0,
      skipRate: 0,
    };
  }

  let totalStake = 0;
  let totalReturn = 0;
  let hitCount = 0;
  let betCount = 0;
  let skipCount = 0;

  history.forEach(item => {
    if (item.status === 'Skip') {
      skipCount++;
    }

    if (item.totalStake > 0) {
      betCount++;
      totalStake += item.totalStake;
      totalReturn += item.totalReturn;
      if (item.isHit) {
        hitCount++;
      }
    }
  });

  const netProfit = totalReturn - totalStake;
  const hitRate = betCount > 0 ? Number(((hitCount / betCount) * 100).toFixed(1)) : 0;
  const recoveryRate = totalStake > 0 ? Number(((totalReturn / totalStake) * 100).toFixed(1)) : 0;
  const skipRate = history.length > 0 ? Number(((skipCount / history.length) * 100).toFixed(1)) : 0;

  return {
    totalStake,
    totalReturn,
    netProfit,
    hitCount,
    betCount,
    skipCount,
    totalRaces: history.length,
    hitRate,
    recoveryRate,
    skipRate,
  };
}

/**
 * 会場別 収支・的中率・回収率 集計ロジック
 */
export function calculateVenueStatistics(history: RaceHistoryRecord[]): VenueStatistics[] {
  if (!history || history.length === 0) return [];

  const venueMap = new Map<string, {
    totalRaces: number;
    betRaces: number;
    hitCount: number;
    totalStake: number;
    totalReturn: number;
    maxPayout: number;
  }>();

  history.forEach((record) => {
    const venue = record.venue || '未設定';
    const current = venueMap.get(venue) || {
      totalRaces: 0,
      betRaces: 0,
      hitCount: 0,
      totalStake: 0,
      totalReturn: 0,
      maxPayout: 0,
    };

    current.totalRaces += 1;
    if (record.totalStake > 0) {
      current.betRaces += 1;
      current.totalStake += record.totalStake;
      current.totalReturn += record.totalReturn;
      if (record.isHit) {
        current.hitCount += 1;
      }
      if (record.totalReturn > current.maxPayout) {
        current.maxPayout = record.totalReturn;
      }
    }

    venueMap.set(venue, current);
  });

  const venueRegionMap = new Map<string, string>();
  VENUES.forEach((v) => venueRegionMap.set(v.name, v.region));

  const list: VenueStatistics[] = Array.from(venueMap.entries()).map(([venueName, data]) => {
    const hitRate = data.betRaces > 0 ? Number(((data.hitCount / data.betRaces) * 100).toFixed(1)) : 0;
    const recoveryRate = data.totalStake > 0 ? Number(((data.totalReturn / data.totalStake) * 100).toFixed(1)) : 0;
    const netProfit = data.totalReturn - data.totalStake;

    return {
      venueName,
      region: venueRegionMap.get(venueName) || 'その他',
      totalRaces: data.totalRaces,
      betRaces: data.betRaces,
      hitCount: data.hitCount,
      hitRate,
      totalStake: data.totalStake,
      totalReturn: data.totalReturn,
      netProfit,
      recoveryRate,
      maxPayout: data.maxPayout,
    };
  });

  // レース数・損益順にデフォルトソート
  return list.sort((a, b) => b.totalRaces - a.totalRaces || b.netProfit - a.netProfit);
}

