import React, { useState, useEffect } from 'react';
import { VENUES } from '../constants/venues';
import { RaceInfo, WeatherCondition, WindDirection, WeatherType } from '../types/kyotei';
import {
  Wind,
  Waves,
  Sun,
  Clock,
  Calendar,
  Compass,
  AlertTriangle,
  Globe,
  RefreshCw,
  Zap,
  Sparkles,
  RotateCcw,
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
  waveThreshold: number;
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
  waveThreshold,
}) => {
  const [showVenueSelector, setShowVenueSelector] = useState(false);
  const [activeVenues, setActiveVenues] = useState<ActiveVenueSchedule[]>([]);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(false);
  const [isBatchFetching, setIsBatchFetching] = useState<boolean>(false);

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

  // 本日開催場一覧をロード（propsで渡されたものがあれば優先）
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
        console.error('Failed to load active venues:', e);
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
  const weatherTypes: WeatherType[] = ['晴', '曇', '雨', '雪'];

  const isWindOver = race.weather.windSpeed >= windThreshold;
  const isWaveOver = race.weather.waveHeight >= waveThreshold;

  // 当日開催会場の一括取得ハンドラ
  const handleTriggerBatchFetch = async () => {
    setIsBatchFetching(true);
    try {
      if (onBatchFetchVenues) {
        await onBatchFetchVenues();
      } else {
        const venues = await fetchActiveVenues(race.date);
        setActiveVenues(venues);
      }
    } finally {
      setIsBatchFetching(false);
    }
  };

  // 開催場選択ハンドラ（出走表データも直接取得）
  const handleSelectVenue = (venueName: string) => {
    setShowVenueSelector(false);
    if (onFetchRace) {
      onFetchRace(venueName, race.raceNo);
    } else {
      const updatedDeadline = getStandardDeadlineTime(venueName, race.raceNo);
      onUpdateRace({
        venue: venueName,
        deadlineTime: updatedDeadline,
      });
    }
  };

  // レース番号選択ハンドラ（出走表データも直接取得）
  const handleSelectRaceNo = (rNo: number) => {
    if (onFetchRace) {
      onFetchRace(race.venue, rNo);
    } else {
      const updatedDeadline = getStandardDeadlineTime(race.venue, rNo);
      let title = `第${rNo}R 一般戦`;
      if (rNo === 12) title = `第12R 優勝戦`;
      else if (rNo === 11) title = `第11R 準優勝戦`;
      else if (rNo === 10) title = `第10R 特別選抜戦`;
      else if (rNo === 9) title = `第9R 予選特選`;
      else if (rNo === 1) title = `第1R 朝ガチ予選`;

      onUpdateRace({
        raceNo: rNo,
        raceTitle: title,
        deadlineTime: updatedDeadline,
      });
    }
  };

  // 締切時刻を公式標準タイムテーブルにリセット
  const handleResetDeadline = () => {
    const stdTime = getStandardDeadlineTime(race.venue, race.raceNo);
    onUpdateRace({ deadlineTime: stdTime });
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded p-3 select-none flex flex-col gap-2.5 shadow-md">
      {/* 1. 本日開催場クイックセレクターバー */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>本日開催場:</span>
          </div>

          {/* 当日会場一括取得ボタン */}
          <button
            type="button"
            onClick={handleTriggerBatchFetch}
            disabled={isBatchFetching}
            className="px-2 py-0.5 rounded bg-blue-900/90 hover:bg-blue-800 border border-blue-500 text-cyan-200 hover:text-white font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all shadow-xs disabled:opacity-50"
            title="全国24場から本日の全開催場を一括取得・同期"
          >
            <RefreshCw className={`w-3 h-3 text-cyan-300 ${isBatchFetching ? 'animate-spin' : ''}`} />
            <span>{isBatchFetching ? '一括取得中...' : '当日会場を一括取得'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap">
          {activeVenues.map((v) => {
            const isCurrent = race.venue === v.venueName;
            return (
              <button
                key={v.code}
                onClick={() => handleSelectVenue(v.venueName)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
                title={`${v.venueName} ${v.title} (${v.category})`}
              >
                <span>{v.venueName}</span>
                <span
                  className={`text-[9px] px-1 rounded font-normal ${
                    v.grade === 'SG'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : v.grade === 'G1'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {v.grade}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">{v.currentRaceNo}R</span>
              </button>
            );
          })}
        </div>

        {onOpenFetchRace && (
          <button
            onClick={onOpenFetchRace}
            className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 shrink-0 cursor-pointer underline"
          >
            <span>全24場一覧</span>
          </button>
        )}
      </div>

      {/* 2. メインヘッダー領域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* エリア A-1: 開催場 & レースタイトル & 日時 & 締切電光盤 */}
        <div className="lg:col-span-5 flex items-center gap-3">
          {/* 開催場バッジ */}
          <div className="relative">
            <button
              onClick={() => setShowVenueSelector(!showVenueSelector)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/90 hover:bg-blue-900 border border-blue-500 rounded text-blue-100 font-black text-base shadow-sm transition-colors cursor-pointer"
              title="開催場を変更"
            >
              <span>{race.venue}</span>
              <span className="text-[10px] text-blue-400">▼</span>
            </button>

            {/* 24場クイックセレクター */}
            {showVenueSelector && (
              <div className="absolute left-0 top-full mt-1 w-80 bg-slate-900 border border-slate-700 shadow-2xl rounded p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 px-1 flex justify-between">
                  <span>全国24ボートレース場を選択</span>
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
                      className={`px-2 py-1 text-xs rounded text-center transition-colors cursor-pointer ${
                        race.venue === v.name
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {v.name}
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
                placeholder="第12R 優勝戦"
              />

              {/* 番組表再取得ボタン */}
              {onFetchRace && (
                <button
                  onClick={() => onFetchRace(race.venue, race.raceNo)}
                  disabled={isFetchingRace}
                  className="px-2 py-0.5 rounded bg-blue-900 hover:bg-blue-800 border border-blue-600 text-blue-200 hover:text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="出走表・選手勝率・モーター・展示を再取得"
                >
                  <RefreshCw className={`w-3 h-3 text-cyan-400 ${isFetchingRace ? 'animate-spin' : ''}`} />
                  <span>{isFetchingRace ? '取得中' : '番組取得'}</span>
                </button>
              )}
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

              {/* 締切時刻・電光盤表示（見やすく正確なカウントダウン & 状態表示） */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                  deadlineInfo.status === 'soon'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                    : deadlineInfo.status === 'closed'
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-slate-950 border-slate-800 text-slate-200'
                }`}
                title="締切時刻（直接編集可能 / 毎秒リアルタイム計算）"
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

                {/* HH:mm 入力 (横幅をw-16に拡張して20:45等が見切れず完璧に収まる) */}
                <input
                  type="text"
                  value={race.deadlineTime}
                  onChange={(e) => onUpdateRace({ deadlineTime: e.target.value })}
                  className="w-14 bg-transparent text-center text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-b focus:border-amber-400 tabular-nums"
                  placeholder="20:45"
                  title="締切時刻 (HH:mm)"
                />

                {/* 状態バッジ & 残り時間 */}
                <span
                  className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded border ${
                    deadlineInfo.status === 'soon'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse font-black'
                      : deadlineInfo.status === 'closed'
                      ? race.date < new Date().toISOString().slice(0, 10)
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                        : 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {deadlineInfo.status === 'soon'
                    ? `まもなく締切 (${deadlineInfo.formattedRemaining})`
                    : deadlineInfo.status === 'closed'
                    ? race.date < new Date().toISOString().slice(0, 10)
                      ? '過去レース (投票・判定可)'
                      : '締切済 (本日投票不可)'
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
              title={`第${rNo}Rの出走表番組データを取得`}
            >
              {rNo}
            </button>
          ))}
        </div>

        {/* エリア D & クイックアクション: 天候条件 & 結果自動取得 */}
        <div className="lg:col-span-4 flex items-center justify-end gap-2 text-xs">
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

          {/* 波高入力 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              isWaveOver
                ? 'bg-amber-950/60 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
            title={`波高見送り閾値: ${waveThreshold}cm 以上`}
          >
            <Waves className={`w-3.5 h-3.5 ${isWaveOver ? 'text-amber-400' : 'text-blue-400'}`} />
            <span className="text-[11px] text-slate-400">波:</span>
            <input
              type="number"
              step="1"
              min="0"
              max="50"
              value={race.weather.waveHeight}
              onChange={(e) => onUpdateWeather({ waveHeight: parseInt(e.target.value) || 0 })}
              className="w-7 bg-transparent text-right font-mono font-bold focus:outline-none text-xs tabular-nums"
            />
            <span className="text-[10px] text-slate-400">cm</span>
          </div>

          {/* 結果自動取得ボタン */}
          {onAutoFetchResult && (
            <button
              onClick={onAutoFetchResult}
              disabled={isFetchingResult}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-black text-[11px] shadow flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shrink-0"
              title="公式レース確定結果（確定着順・払戻金・決まり手）を自動取得"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isFetchingResult ? '取得中...' : '結果自動取得'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
