import React, { useState, useEffect } from 'react';
import {
  ActiveVenueSchedule,
  fetchActiveVenues,
  fetchRaceCard,
  batchFetchTodayVenues,
  BatchFetchVenuesResult,
} from '../services/raceDataProvider';
import { VENUES } from '../constants/venues';
import { RaceInfo } from '../types/kyotei';
import { Globe, RefreshCw, CheckCircle2, ChevronRight, Zap, Clock, ShieldCheck, AlertCircle, Layers } from 'lucide-react';

interface FetchRaceModalProps {
  currentDate: string;
  currentVenue: string;
  currentRaceNo: number;
  onRaceFetched: (newRace: RaceInfo) => void;
  onClose: () => void;
}

export const FetchRaceModal: React.FC<FetchRaceModalProps> = ({
  currentDate,
  currentVenue,
  currentRaceNo,
  onRaceFetched,
  onClose,
}) => {
  const [activeVenues, setActiveVenues] = useState<ActiveVenueSchedule[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>(currentVenue);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(currentRaceNo);
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);
  const [isLoadingVenues, setIsLoadingVenues] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [fetchStep, setFetchStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchFetchVenuesResult | null>(null);

  // 本日開催場一括取得の実行
  const handleBatchFetch = async (targetDateStr: string) => {
    setIsLoadingVenues(true);
    setErrorMessage(null);
    try {
      const summary = await batchFetchTodayVenues(targetDateStr);
      setActiveVenues(summary.venues);
      setBatchSummary(summary);
      if (summary.venues.length > 0 && !summary.venues.some((v) => v.venueName === selectedVenue)) {
        setSelectedVenue(summary.venues[0].venueName);
      }
    } catch (e) {
      setErrorMessage('開催会場の一括取得に失敗しました。');
    } finally {
      setIsLoadingVenues(false);
    }
  };

  // 初回マウント時および日付変更時に開催場一括取得
  useEffect(() => {
    handleBatchFetch(selectedDate);
  }, [selectedDate]);

  // レース情報取得の実行
  const handleExecuteFetch = async () => {
    setIsFetching(true);
    setErrorMessage(null);

    try {
      setFetchStep('ボートレース公式番組データサーバーへ接続中...');
      await new Promise((r) => setTimeout(r, 200));

      setFetchStep(`【${selectedVenue}】第${selectedRaceNo}R 出走表・選手勝率データを取得中...`);
      await new Promise((r) => setTimeout(r, 250));

      setFetchStep('モーター番号・2連対率・抽選ボート成績を取得中...');
      await new Promise((r) => setTimeout(r, 200));

      setFetchStep('直前気配（進入コース・展示タイム）及び気象条件を取得中...');
      const raceData = await fetchRaceCard({
        date: selectedDate,
        venueName: selectedVenue,
        raceNo: selectedRaceNo,
      });

      setFetchStep('取得完了！番組表を反映しています...');
      await new Promise((r) => setTimeout(r, 150));

      onRaceFetched(raceData);
      onClose();
    } catch (err) {
      setErrorMessage('レース情報の取得中にエラーが発生しました。');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[88vh] select-none animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">
              開催レース情報取得 (Race Program Data Fetcher)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* メインエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* 日付と開催場一覧 */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950 rounded border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>開催日 & 会場一括取得</span>
                </span>
                {batchSummary && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-800 font-mono">
                    本日開催: {batchSummary.totalVenues}場 (朝:{batchSummary.morningCount} / 昼:{batchSummary.dayCount} / 夜:{batchSummary.nighterCount})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[11px]">日付:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[11px] font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleBatchFetch(selectedDate)}
                  disabled={isLoadingVenues}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[11px] shadow flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                  title="指定日の開催会場を一括再取得"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingVenues ? 'animate-spin' : ''}`} />
                  <span>当日会場を一括取得</span>
                </button>
              </div>
            </div>

            {/* 本日開催場カード一覧 */}
            {isLoadingVenues ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>本日の全国開催スケジュール・番組データを一括取得中...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeVenues.map((v) => {
                  const isSelected = selectedVenue === v.venueName;
                  return (
                    <button
                      key={v.code}
                      onClick={() => {
                        setSelectedVenue(v.venueName);
                        setSelectedRaceNo(v.currentRaceNo);
                      }}
                      className={`p-2 rounded border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/80 border-blue-500 ring-1 ring-blue-400 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-100">{v.venueName}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            v.grade === 'SG'
                              ? 'bg-amber-500 text-slate-950'
                              : v.grade === 'G1'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {v.grade}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mb-1">{v.title}</div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">{v.category}</span>
                        <span className="text-amber-400 font-bold">現在: {v.currentRaceNo}R</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 全24場からの手動選択（その他の開催場） */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1.5">
              全国24場から直接指定する場合:
            </span>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
              {VENUES.map((v) => (
                <button
                  key={v.code}
                  onClick={() => setSelectedVenue(v.name)}
                  className={`px-1.5 py-1 text-[11px] rounded transition-colors text-center ${
                    selectedVenue === v.name
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* レース番号選択 (1R〜12R) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-200 text-xs">
                取得対象レース番号（1R〜12R）
              </span>
              <span className="text-blue-400 font-bold font-mono">
                選択中: {selectedVenue} 第{selectedRaceNo}R
              </span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((rNo) => (
                <button
                  key={rNo}
                  onClick={() => setSelectedRaceNo(rNo)}
                  className={`py-1.5 rounded text-xs font-mono font-bold transition-all text-center ${
                    selectedRaceNo === rNo
                      ? 'bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/20'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {rNo}R
                </button>
              ))}
            </div>
          </div>

          {/* プログレス・取得ステータス表示 */}
          {isFetching && (
            <div className="p-3 bg-blue-950/40 border border-blue-600/60 rounded flex items-center gap-3 animate-in fade-in">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-blue-300 text-xs">データ同期実行中...</span>
                <p className="text-[11px] text-slate-300">{fetchStep}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-600 rounded text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              取得した出走表データ（勝率・モーター・展示・コース進入）をもとに、本命5点型予想およびオッズ配分が即時自動計算されます。
            </span>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            対象: <strong className="text-white">{selectedVenue}</strong>{' '}
            <strong className="text-amber-400 font-mono">第{selectedRaceNo}R</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isFetching}
              className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              キャンセル
            </button>
            <button
              onClick={handleExecuteFetch}
              disabled={isFetching}
              className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>データ取得中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                  <span>レース番組表を取得</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
