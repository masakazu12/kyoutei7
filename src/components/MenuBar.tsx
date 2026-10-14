import React, { useState } from 'react';
import { Download, RefreshCw, Trash2, Sliders, Info, BookOpen, AlertCircle, Play, DollarSign, Globe, Zap, Monitor, Sparkles, Wallet, ExternalLink } from 'lucide-react';
import { AllocationMode } from '../types/kyotei';
import { openTeleboatWebPortal } from '../services/teleboatService';

interface MenuBarProps {
  onExportCsv: () => void;
  onClearHistory: () => void;
  onRunPrediction: () => void;
  onRunAIPrediction?: () => void;
  onSimulateOdds: () => void;
  onChangeAllocationMode: (mode: AllocationMode) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenHistory: () => void;
  onResetToDefaultRace: () => void;
  onOpenFetchRace: () => void;
  onBatchFetchVenues?: () => void;
  onAutoFetchResult?: () => void;
  onOpenExeModal?: () => void;
  onOpenAutoVote?: () => void;
  onOpenRealVote?: () => void;
  onOpenBalanceSync?: () => void;
  onImportRealData?: () => void;
  onOpenAutoPilot?: () => void;
  onToggleAutoPilot?: () => void;
  isAutoPilotRunning?: boolean;
  onOpenPCExtension?: () => void;
  isExtensionConnected?: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onExportCsv,
  onClearHistory,
  onRunPrediction,
  onRunAIPrediction,
  onSimulateOdds,
  onChangeAllocationMode,
  onOpenSettings,
  onOpenHelp,
  onOpenHistory,
  onResetToDefaultRace,
  onOpenFetchRace,
  onBatchFetchVenues,
  onAutoFetchResult,
  onOpenExeModal,
  onOpenAutoVote,
  onOpenRealVote,
  onOpenBalanceSync,
  onImportRealData,
  onOpenAutoPilot,
  onToggleAutoPilot,
  isAutoPilotRunning = false,
  onOpenPCExtension,
  isExtensionConnected = false,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggle = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const close = () => setActiveMenu(null);

  return (
    <nav className="h-7 bg-slate-900 border-b border-slate-800 flex items-center px-2 text-[12px] text-slate-300 relative select-none">
      {/* メニュー1: ファイル */}
      <div className="relative">
        <button
          onClick={() => toggle('file')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'file' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          ファイル(F)
        </button>
        {activeMenu === 'file' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onExportCsv();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>履歴CSVエクスポート (UTF-8 BOM)</span>
            </button>
            <button
              onClick={() => {
                onOpenSettings();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>環境設定 (F12)</span>
            </button>
            {onOpenExeModal && (
              <button
                onClick={() => {
                  onOpenExeModal();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-bold"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Windows版 (EXE) 配布・インストール</span>
              </button>
            )}
            {onOpenPCExtension && (
              <button
                onClick={() => {
                  onOpenPCExtension();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-blue-300 font-bold"
              >
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span>PC版 専用拡張機能マネージャー (ZIP)</span>
              </button>
            )}
            <div className="border-t border-slate-800 my-1"></div>
            <button
              onClick={() => {
                onClearHistory();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red-950/60 text-rose-300 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>収支履歴全消去</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー2: レース */}
      <div className="relative">
        <button
          onClick={() => toggle('race')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'race' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          レース(R)
        </button>
        {activeMenu === 'race' && (
          <div className="absolute left-0 top-full mt-0.5 w-56 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onOpenFetchRace();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-blue-300 font-bold cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>開催レース情報を取得 (G)</span>
            </button>
            {onBatchFetchVenues && (
              <button
                onClick={() => {
                  onBatchFetchVenues();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>当日開催会場を一括取得 (B)</span>
              </button>
            )}
            {onImportRealData && (
              <button
                onClick={() => {
                  onImportRealData();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-emerald-300 font-bold cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>公式確定実データパック一括読込</span>
              </button>
            )}
            <div className="border-t border-slate-800 my-1"></div>
            <button
              onClick={() => {
                onResetToDefaultRace();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>出走表を既定値にリセット</span>
            </button>
            <button
              onClick={() => {
                onOpenHistory();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>過去レース履歴一覧表示</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー3: 予想 */}
      <div className="relative">
        <button
          onClick={() => toggle('prediction')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'prediction' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          予想(P)
        </button>
        {activeMenu === 'prediction' && (
          <div className="absolute left-0 top-full mt-0.5 w-56 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onRunPrediction();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>本命5点予想エンジン実行</span>
            </button>
            {onRunAIPrediction && (
              <button
                onClick={() => {
                  onRunAIPrediction();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-purple-950/60 flex items-center gap-2 text-purple-300 font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-current" />
                <span>AI予想・深層分析 (Gemini)</span>
              </button>
            )}
            <button
              onClick={() => {
                onSimulateOdds();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>実オッズ自動シミュレート</span>
            </button>
            {onAutoFetchResult && (
              <>
                <div className="border-t border-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    onAutoFetchResult();
                    close();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-amber-300 font-bold cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>公式確定結果を自動取得</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* メニュー4: 資金配分 */}
      <div className="relative">
        <button
          onClick={() => toggle('allocation')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'allocation' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          資金配分(M)
        </button>
        {activeMenu === 'allocation' && (
          <div className="absolute left-0 top-full mt-0.5 w-48 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onChangeAllocationMode('equal');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              <span>均等配分方式 (推奨)</span>
            </button>
            <button
              onClick={() => {
                onChangeAllocationMode('target');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>目標払戻配分方式</span>
            </button>
            <button
              onClick={() => {
                onChangeAllocationMode('fixed');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>固定額方式</span>
            </button>
          </div>
        )}
      </div>

      {/* メニュー4.5: 投票(V) */}
      <div className="relative">
        <button
          onClick={() => toggle('vote')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'vote' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          投票(V)
        </button>
        {activeMenu === 'vote' && (
          <div className="absolute left-0 top-full mt-0.5 w-72 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            {onOpenRealVote && (
              <button
                onClick={() => {
                  onOpenRealVote();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-emerald-300 font-bold cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>競輪公式 実投票マネージャー</span>
              </button>
            )}
            {onOpenPCExtension && (
              <button
                onClick={() => {
                  onOpenPCExtension();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-bold cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>PC版 専用拡張機能マネージャー (全自動投票)</span>
              </button>
            )}
            {onOpenAutoVote && (
              <button
                onClick={() => {
                  onOpenAutoVote();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>自動投票設定・ルール</span>
              </button>
            )}
            {onOpenBalanceSync && (
              <button
                onClick={() => {
                  onOpenBalanceSync();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-amber-300 font-bold cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span>投票購入限度額（実残高）同期・照合</span>
              </button>
            )}
            <div className="border-t border-slate-800 my-1"></div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.open('https://keirin.jp/', '_blank');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>KEIRIN.JP公式を開く (keirin.jp)</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.open('https://www.winticket.jp/', '_blank');
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-indigo-300 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Winticketを開く (winticket.jp)</span>
            </button>
            <div className="border-t border-slate-800 my-1"></div>
            <div className="px-3 py-1 text-[11px] text-slate-400">
              競輪公式互換・購入限度額完全一致＆3連単・2車単投票連携
            </div>
          </div>
        )}
      </div>

      {/* メニュー4.8: 自動運転(A) */}
      <div className="relative">
        <button
          onClick={() => toggle('autopilot')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 ${
            activeMenu === 'autopilot' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          <span>自動運転(A)</span>
          {isAutoPilotRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          )}
        </button>
        {activeMenu === 'autopilot' && (
          <div className="absolute left-0 top-full mt-0.5 w-64 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            {onToggleAutoPilot && (
              <button
                onClick={() => {
                  onToggleAutoPilot();
                  close();
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 font-bold cursor-pointer ${
                  isAutoPilotRunning ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isAutoPilotRunning ? '自動運転を停止 (STOP)' : '全自動運転を開始 (START)'}</span>
              </button>
            )}
            {onOpenAutoPilot && (
              <button
                onClick={() => {
                  onOpenAutoPilot();
                  close();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-cyan-300 font-bold cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>自動運転 設定・ライブログ</span>
              </button>
            )}
            <div className="border-t border-slate-800 my-1"></div>
            <div className="px-3 py-1 text-[11px] text-slate-400 leading-tight">
              全国43競輪場巡回・ライン予想・資金配分・自動投票・結果取得を全自動実行
            </div>
          </div>
        )}
      </div>

      {/* メニュー5: ヘルプ */}
      <div className="relative">
        <button
          onClick={() => toggle('help')}
          className={`px-2 py-0.5 rounded hover:bg-slate-800 transition-colors ${
            activeMenu === 'help' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          ヘルプ(H)
        </button>
        {activeMenu === 'help' && (
          <div className="absolute left-0 top-full mt-0.5 w-60 bg-slate-900 border border-slate-700 shadow-xl rounded py-1 z-50 text-xs">
            <button
              onClick={() => {
                onOpenHelp();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>仕様書・操作ガイド・計算式</span>
            </button>
            <button
              onClick={() => {
                onOpenHelp();
                close();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-slate-300"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>免責事項・テレボート実投票連携ガイド</span>
            </button>
          </div>
        )}
      </div>

      {/* 右端 クイック自動運転インジケーター */}
      {onToggleAutoPilot && (
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onToggleAutoPilot}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isAutoPilotRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
            title="自動運転のSTART/STOP"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isAutoPilotRunning ? 'bg-white' : 'bg-emerald-300'}`} />
            <span>{isAutoPilotRunning ? '自動運転 稼働中' : '自動運転 待機中'}</span>
          </button>
        </div>
      )}

      {/* オーバーレイ（メニュー外クリックで閉じる） */}
      {activeMenu && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}
    </nav>
  );
};
