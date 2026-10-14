import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  Square,
  Settings as SettingsIcon,
  HelpCircle,
  FileSpreadsheet,
  RefreshCw,
  Globe,
  Monitor,
  Sparkles,
  Bot,
  Wallet,
} from 'lucide-react';
import { PRESET_RACES } from '../data/presetRaces';

interface TitleBarProps {
  currentVenue: string;
  currentRaceNo: number;
  manualStop: boolean;
  onToggleManualStop: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onExportCsv: () => void;
  onSelectPreset: (presetId: string) => void;
  onOpenFetchRace: () => void;
  onBatchFetchVenues?: () => void;
  onOpenExeModal?: () => void;
  onOpenAutoVote?: () => void;
  isAutoVoteEnabled?: boolean;
  isTeleboatConnected?: boolean;
  teleboatBalance?: number;
  onOpenBalanceSync?: () => void;
  onOpenAIPrediction?: () => void;
  onOpenAutoPilot?: () => void;
  isAutoPilotRunning?: boolean;
  onOpenPCExtension?: () => void;
  isExtensionConnected?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentVenue,
  currentRaceNo,
  manualStop,
  onToggleManualStop,
  onOpenSettings,
  onOpenHelp,
  onExportCsv,
  onSelectPreset,
  onOpenFetchRace,
  onBatchFetchVenues,
  onOpenExeModal,
  onOpenAutoVote,
  isAutoVoteEnabled = false,
  isTeleboatConnected = false,
  teleboatBalance = 0,
  onOpenBalanceSync,
  onOpenAIPrediction,
  onOpenAutoPilot,
  isAutoPilotRunning = false,
  onOpenPCExtension,
  isExtensionConnected = false,
}) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-10 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 text-xs select-none">
      {/* 左エリア: アプリアイコン・名称・現在選択中レース */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
            K5
          </div>
          <span className="tracking-tight text-slate-100 font-semibold">Keirin Analyzer Pro 5</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-blue-400 rounded font-mono border border-slate-700">
            Ver 1.0 (競輪)
          </span>
        </div>

        <span className="text-slate-600">|</span>

        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span className="text-emerald-400 font-bold">{currentVenue}競輪</span>
          <span className="font-mono text-amber-300 font-bold">{currentRaceNo}R</span>
        </div>

        {/* 開催レース情報取得ボタン & 当日会場一括取得 & Windows EXEボタン */}
        <div className="flex items-center gap-1.5 ml-2">
          {onBatchFetchVenues && (
            <button
              onClick={onBatchFetchVenues}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors shadow-sm cursor-pointer"
              title="本日開催中の全競輪場スケジュールを一括同期"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-200" />
              <span>当日競輪場を一括取得</span>
            </button>
          )}

          <button
            onClick={onOpenFetchRace}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-600 font-bold text-[11px] transition-colors shadow-sm cursor-pointer"
            title="開催レース番組表・出走表詳細モーダルを開く"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" />
            <span>番組表詳細</span>
          </button>

          {onOpenExeModal && (
            <button
              onClick={onOpenExeModal}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500 font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
              title="Windows 10 / 11 向け EXEファイル化 / デスクトップアプリ インストール"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXE</span>
            </button>
          )}

          {/* PC版 専用拡張機能ボタン */}
          {onOpenPCExtension && (
            <button
              onClick={onOpenPCExtension}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] transition-all shadow-xs cursor-pointer border ${
                isExtensionConnected
                  ? 'bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border-emerald-500 shadow-emerald-950/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-slate-700 hover:border-blue-400'
              }`}
              title="PC版 Chrome拡張機能マネージャー (競輪公式投票連携)"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isExtensionConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{isExtensionConnected ? 'PC拡張: 接続中' : 'PC拡張機能'}</span>
            </button>
          )}

          {/* 競輪投票口座連動ステータス & 自動投票ボタン */}
          {onOpenAutoVote && (
            <button
              onClick={onOpenAutoVote}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] transition-all shadow-xs cursor-pointer border ${
                isTeleboatConnected
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-500'
                  : 'bg-amber-950/80 hover:bg-amber-900 text-amber-200 border-amber-500'
              }`}
              title="競輪公式投票口座連動マネージャー (クリックして残高照会・自動投票設定)"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isTeleboatConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>
                {isTeleboatConnected
                  ? `競輪投票連動中 (¥${teleboatBalance.toLocaleString()})`
                  : '競輪口座未連動'}
              </span>
            </button>
          )}

          {onOpenAIPrediction && (
            <button
              onClick={onOpenAIPrediction}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-500 font-bold text-[11px] transition-all shadow-xs cursor-pointer"
              title="Gemini 3.8 Flash 搭載 競輪AI予想・ライン展開深層分析"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current" />
              <span>競輪AI予想</span>
            </button>
          )}

          {onOpenAutoPilot && (
            <button
              onClick={onOpenAutoPilot}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[11px] transition-all shadow-xs cursor-pointer border ${
                isAutoPilotRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 hover:scale-[1.02]'
              }`}
              title="全自動運転（番組巡回・予想・資金配分・自動投票・結果取得サイクル）の開始・設定"
            >
              <Bot className="w-3.5 h-3.5 text-white" />
              <span>{isAutoPilotRunning ? '自動運転[稼働中]' : '自動運転'}</span>
            </button>
          )}

          {/* テレボート実残高（購入限度額）表示 & 同期ボタン */}
          <button
            onClick={onOpenBalanceSync || onOpenAutoVote}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] transition-all cursor-pointer border ${
              isTeleboatConnected
                ? 'bg-amber-950/70 border-amber-500/80 text-amber-200 hover:bg-amber-900/80 shadow-xs'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="テレボート購入限度額（実残高）の確認・同期・修正（クリックで実残高を設定）"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">購入限度額:</span>
            <span className="font-mono text-amber-300 font-bold">
              ¥{teleboatBalance.toLocaleString()}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {isTeleboatConnected ? '限度額一致' : '残高設定'}
            </span>
          </button>

          <div className="hidden xl:flex items-center gap-1">
            <span className="text-slate-500 text-[11px]">番組:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onSelectPreset(e.target.value);
                }
              }}
              defaultValue=""
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            >
              <option value="" disabled>
                サンプル出走表を選択
              </option>
              {PRESET_RACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.venue} {p.raceTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 中央エリア: STOP緊急制御 & ステータスインジケーター */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleManualStop}
          className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[11px] transition-colors border ${
            manualStop
              ? 'bg-red-600 text-white border-red-500 shadow-sm shadow-red-900/50 animate-pulse'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
          }`}
          title={manualStop ? '手動停止中。クリックで解除' : '手動で即座にSTOP（処理中断）します'}
        >
          {manualStop ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>停止中 (STOP解除)</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3 h-3 text-red-400" />
              <span>緊急STOP切替</span>
            </>
          )}
        </button>

        <div className="hidden md:flex items-center text-slate-400 font-mono text-[11px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800 tabular-nums">
          {currentTime}
        </div>
      </div>

      {/* 右エリア: クイックアクション & Windowsコントロールボタン */}
      <div className="flex items-center gap-1">
        <button
          onClick={onExportCsv}
          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors"
          title="履歴をCSV出力 (UTF-8 BOM)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors"
          title="設定 (F12)"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
          title="仕様書・ヘルプ"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <span className="text-slate-700 mx-1">|</span>

        {/* Windows 11 ウィンドウ最小化・最大化・閉じるボタンのシミュレーション */}
        <div className="flex items-center text-slate-400">
          <div className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 cursor-default" title="最小化">
            ―
          </div>
          <div className="w-7 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 cursor-default text-[10px]" title="最大化">
            □
          </div>
          <div className="w-7 h-6 flex items-center justify-center hover:bg-red-600 hover:text-white rounded text-slate-400 cursor-default text-xs" title="終了">
            ✕
          </div>
        </div>
      </div>
    </header>
  );
};
