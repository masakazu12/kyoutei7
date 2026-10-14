import React, { useState, useEffect } from 'react';
import { VENUES } from '../constants/venues';
import { RaceInfo, WeatherCondition, WindDirection, WeatherType, BankLength } from '../types/kyotei';
import {
  Wind,
  Sun,
  Clock,
  Calendar,
  AlertTriangle,
  Globe,
  RefreshCw,
  Zap,
  Sparkles,
  RotateCcw,
  Flag,
  Gauge,
} from 'lucide-react';
import {
  calculateDeadlineStatus,
  getStandardDeadlineTime,
  DeadlineStatus,
} from '../services/deadlineService';
import { ActiveVenueSchedule, fetchActiveVenues } from '../services/raceDataProvider';

interface RaceHeaderSectionProps {
  race: RaceInfo;
  onUpdateRace: (updated: Partial<RaceInfo>) => void;
  onUpdateWeather: (updated: Partial<WeatherCondition>) => void;
  onFetchRace?: (venueName: string, raceNo: number) => Promise<void> | void;
  onBatchFetchVenues?: () => Promise<void> | void;
  activeVenuesList?: ActiveVenueSchedule[];
  onOpenFetchRace?: () => void;
  onAutoFetchResult?: () => void;
  isFetchingRace?: boolean;
  isFetchingResult?: boolean;
  windThreshold: number;
  waveThreshold?: number;
}

export const RaceHeaderSection: React.FC<RaceHeaderSectionProps> = ({
  race,
  onUpdateRace,
  onUpdateWeather,
  onFetchRace,
  onBatchFetchVenues,
  activeVenuesList,
  onOpenFetchRace,
  onAutoFetchResult,
  isFetchingRace = false,
  isFetchingResult = false,
  windThreshold,
}) => {
  const [showVenueSelector, setShowVenueSelector] = useState(false);
  const [activeVenues, setActiveVenues] = useState<ActiveVenueSchedule[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(false);

  // 締切カウントダウンの毎秒自動更新
  const [deadlineInfo, setDeadlineInfo] = useState<DeadlineStatus>(() =>
    calculateDeadlineStatus(race.deadlineTime, race.date)
  );

  useEffect(() => {
    const updateCountdown = () => {
      setDeadlineInfo(calculateDeadlineStatus(race.deadlineTime, race.date));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [race.deadlineTime, race.date]);

  // 本日開催競輪場一覧をロード
  useEffect(() => {
    if (activeVenuesList && activeVenuesList.length > 0) {
      setActiveVenues(activeVenuesList);
      return;
    }
    let isMounted = true;
    async function loadVenues() {
      setIsLoadingVenues(true);
      try {
        const venues = await fetchActiveVenues(race.date);
        if (isMounted) setActiveVenues(venues);
      } catch (e) {
        console.error('Failed to load active Keirin velodromes:', e);
      } finally {
        if (isMounted) setIsLoadingVenues(false);
      }
    }
    loadVenues();
    return () => {
      isMounted = false;
    };
  }, [race.date, activeVenuesList]);

  const windDirections: WindDirection[] = ['向かい風', '追い風', '左横風', '右横風', '無風'];
  const weatherTypes: WeatherType[] = ['晴', '曇', '雨', '小雨', '雪'];
  const grades: RaceInfo['grade'][] = ['GP', 'GI', 'GII', 'GIII', 'FI', 'FII', 'ミッドナイト', 'ガールズ'];

  const isWindOver = race.weather.windSpeed >= windThreshold;
  const currentVenueInfo = VENUES.find((v) => v.name === race.venue);

  // 会場変更ハンドラ
  const handleSelectVenue = (venueName: string) => {
    const target = VENUES.find((v) => v.name === venueName);
    const newDeadline = getStandardDeadlineTime(venueName, race.raceNo);
    onUpdateRace({
      venue: venueName,
      bankLength: (target?.bankLength as BankLength) || 400,
      straightLength: target?.straightLength || 54.0,
      deadlineTime: newDeadline,
    });
    setShowVenueSelector(false);
    if (onFetchRace) {
      onFetchRace(venueName, race.raceNo);
    }
  };

  // レース番号変更ハンドラ
  const handleSelectRaceNo = (newRaceNo: number) => {
    const newDeadline = getStandardDeadlineTime(race.venue, newRaceNo);
    onUpdateRace({
      raceNo: newRaceNo,
      raceTitle: `第${newRaceNo}R ${newRaceNo === 12 ? '決勝' : newRaceNo >= 10 ? '特選' : '予選'}`,
      deadlineTime: newDeadline,
    });
    if (onFetchRace) {
      onFetchRace(race.venue, newRaceNo);
    }
  };

  const handleResetDeadline = () => {
    const std = getStandardDeadlineTime(race.venue, race.raceNo);
    onUpdateRace({ deadlineTime: std });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded p-3 select-none space-y-2.5">
      {/* 1. 本日開催中 競輪場クイック選択バー */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>開催競輪場:</span>
        </span>

        <div className="flex items-center gap-1.5 flex-nowrap">
          {VENUES.slice(0, 10).map((v) => {
            const isSelected = race.venue === v.name;
            return (
              <button
                key={v.code}
                onClick={() => handleSelectVenue(v.name)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm scale-102'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{v.name}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-cyan-300 font-mono">
                  {v.bankLength}m
                </span>
              </button>
            );
          })}
        </div>

        {onOpenFetchRace && (
          <button
            onClick={onOpenFetchRace}
            className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 shrink-0 cursor-pointer underline"
          >
            <span>全43場一覧</span>
          </button>
        )}
      </div>

      {/* 2. メインヘッダー領域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* エリア A-1: 開催場 & レースタイトル & 日時 & 締切 */}
        <div className="lg:col-span-5 flex items-center gap-3">
          {/* 開催場バッジ */}
          <div className="relative">
            <button
              onClick={() => setShowVenueSelector(!showVenueSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/90 hover:bg-blue-900 border border-blue-500 rounded text-blue-100 font-black text-base shadow-sm transition-colors cursor-pointer"
              title="開催競輪場を変更"
            >
              <span>{race.venue}競輪</span>
              <span className="text-[10px] text-blue-400">▼</span>
            </button>

            {/* 43場クイックセレクター */}
            {showVenueSelector && (
              <div className="absolute left-0 top-full mt-1 w-96 bg-slate-900 border border-slate-700 shadow-2xl rounded p-2.5 z-50 animate-in fade-in zoom-in-95 max-h-80 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 px-1 flex justify-between">
                  <span>全国43競輪場を選択</span>
                  <button
                    onClick={() => setShowVenueSelector(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {VENUES.map((v) => (
                    <button
                      key={v.code}
                      onClick={() => handleSelectVenue(v.name)}
                      className={`px-2 py-1 text-xs rounded text-center transition-colors cursor-pointer flex flex-col items-center ${
                        race.venue === v.name
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="text-[9px] font-mono text-cyan-300">{v.bankLength}m</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={race.raceTitle}
                onChange={(e) => onUpdateRace({ raceTitle: e.target.value })}
                className="bg-transparent font-bold text-slate-100 text-sm border-b border-dashed border-slate-700 hover:border-blue-400 focus:outline-none focus:border-blue-500 w-44"
                placeholder="第12R 決勝"
              />

              {/* グレード選択 */}
              <select
                value={race.grade || 'FI'}
                onChange={(e) => onUpdateRace({ grade: e.target.value as RaceInfo['grade'] })}
                className="bg-slate-950 text-amber-300 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-bold"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* 車立て切替 (7車 / 9車) */}
              <button
                type="button"
                onClick={() => onUpdateRace({ carCount: race.carCount === 7 ? 9 : 7 })}
                className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 text-[10px] font-bold font-mono hover:border-slate-500 cursor-pointer"
                title="7車立て / 9車立ての切り替え"
              >
                {race.carCount || 7}車
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <input
                  type="date"
                  value={race.date}
                  onChange={(e) => onUpdateRace({ date: e.target.value })}
                  className="bg-transparent border-0 text-slate-300 text-[11px] focus:outline-none cursor-pointer"
                />
              </div>

              {/* 締切時刻・電光盤表示 */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                  deadlineInfo.status === 'soon'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : deadlineInfo.status === 'closed'
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 ${
                    deadlineInfo.status === 'soon'
                      ? 'text-amber-400 animate-pulse'
                      : deadlineInfo.status === 'closed'
                      ? 'text-slate-500'
                      : 'text-amber-400'
                  }`}
                />
                <span className="text-[10px] font-sans font-bold text-slate-400">締切</span>

                <input
                  type="text"
                  value={race.deadlineTime}
                  onChange={(e) => onUpdateRace({ deadlineTime: e.target.value })}
                  className="w-14 bg-transparent text-center text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-b focus:border-amber-400 tabular-nums"
                  placeholder="16:35"
                />

                <span
                  className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded border ${
                    deadlineInfo.status === 'soon'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse font-black'
                      : deadlineInfo.status === 'closed'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {deadlineInfo.status === 'soon'
                    ? `まもなく締切 (${deadlineInfo.formattedRemaining})`
                    : deadlineInfo.status === 'closed'
                    ? '締切済'
                    : `発売中 (${deadlineInfo.formattedRemaining})`}
                </span>

                <button
                  type="button"
                  onClick={handleResetDeadline}
                  className="text-slate-500 hover:text-slate-300 text-[10px] p-0.5 cursor-pointer"
                  title="公式標準締切時刻にリセット"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* エリア A-2: 1R〜12R レース番号ボタン */}
        <div className="lg:col-span-3 flex items-center justify-center gap-1 overflow-x-auto py-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((rNo) => (
            <button
              key={rNo}
              onClick={() => handleSelectRaceNo(rNo)}
              className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                race.raceNo === rNo
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105 ring-1 ring-amber-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
              title={`第${rNo}Rの出走表番組データを表示`}
            >
              {rNo}
            </button>
          ))}
        </div>

        {/* エリア D: バンク周長特性 & 天候条件 & 結果自動取得 */}
        <div className="lg:col-span-4 flex items-center justify-end gap-2 text-xs">
          {/* バンク情報バッジ (周長・みなし直線) */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200">{race.bankLength || 400}mバンク</span>
            <span className="text-[10px] text-slate-400 font-mono">
              (直線{race.straightLength || 54}m)
            </span>
          </div>

          {/* 天候選択 */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            <select
              value={race.weather.weather}
              onChange={(e) => onUpdateWeather({ weather: e.target.value as WeatherType })}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {weatherTypes.map((w) => (
                <option key={w} value={w} className="bg-slate-900 text-white">
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* 風速入力 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              isWindOver
                ? 'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
            title={`風速見送り閾値: ${windThreshold}m/s 以上`}
          >
            <Wind className={`w-3.5 h-3.5 ${isWindOver ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="text-[11px] text-slate-400">風:</span>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={race.weather.windSpeed}
              onChange={(e) => onUpdateWeather({ windSpeed: parseFloat(e.target.value) || 0 })}
              className="w-9 bg-transparent text-right font-mono font-bold focus:outline-none text-xs tabular-nums"
            />
            <span className="text-[10px] text-slate-400">m</span>
          </div>

          {/* 結果取得ボタン */}
          {onAutoFetchResult && (
            <button
              onClick={onAutoFetchResult}
              disabled={isFetchingResult}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-black text-[11px] shadow flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
              title="公式レース確定着順・払戻金を反映"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isFetchingResult ? '取得中...' : '結果取得'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
