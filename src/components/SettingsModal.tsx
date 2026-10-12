import React, { useState } from 'react';
import { AppSettings, AllocationMode, BetType, BET_TYPE_LABELS } from '../types/kyotei';
import { DEFAULT_SETTINGS } from '../constants/venues';
import { Sliders, RotateCcw, Save, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'basic' | 'weights'>('basic');

  const updateNumber = (key: keyof AppSettings, val: number) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const updateCourseWeight = (index: number, val: number) => {
    setForm((prev) => {
      const nextCourse = [...prev.courseWeights] as [number, number, number, number, number, number];
      nextCourse[index] = val;
      return { ...prev, courseWeights: nextCourse };
    });
  };

  const handleReset = () => {
    if (confirm('設定をすべて初期値に戻しますか？')) {
      setForm({ ...DEFAULT_SETTINGS });
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(form, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'KyoteiAnalyzer_Settings.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setForm({ ...DEFAULT_SETTINGS, ...parsed });
        alert('設定ファイルを読み込みました。');
      } catch (err) {
        alert('設定ファイルの解析に失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] select-none animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">
              環境設定 (Kyotei Analyzer Pro 5 Configuration)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 text-sm font-bold">
            ✕
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-slate-800 bg-slate-950 text-xs px-3">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            基本パラメータ・見送り・STOP条件
          </button>
          <button
            onClick={() => setActiveTab('weights')}
            className={`py-2 px-3 border-b-2 font-bold transition-colors ${
              activeTab === 'weights'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            本命5点 評価エンジン重み設定 (7.3)
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
          {activeTab === 'basic' ? (
            <div className="space-y-4 font-sans">
              {/* 購入舟券種別・点数デフォルト設定 */}
              <div>
                <h4 className="text-slate-200 font-bold mb-2 pb-1 border-b border-slate-800 flex justify-between">
                  <span>購入舟券種別・点数 デフォルト設定</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">既定の購入舟券種別</label>
                    <select
                      value={form.defaultBetType || '3t'}
                      onChange={(e) => setForm((prev) => ({ ...prev, defaultBetType: e.target.value as BetType }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-sans cursor-pointer focus:outline-none focus:border-blue-500"
                    >
                      {(['3t', '3f', '2t', '2f', '1t', '1f', 'wide'] as BetType[]).map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-white">
                          {BET_TYPE_LABELS[t].label} ({BET_TYPE_LABELS[t].desc})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">既定の購入点数 (1〜12点)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={form.defaultPointCount || 5}
                      onChange={(e) => updateNumber('defaultPointCount', parseInt(e.target.value) || 5)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 資金配分・予算 */}
              <div>
                <h4 className="text-slate-200 font-bold mb-2 pb-1 border-b border-slate-800 flex justify-between">
                  <span>資金配分・オッズ条件</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">1レース上限予算 (円)</label>
                    <input
                      type="number"
                      step="500"
                      value={form.maxRaceBudget}
                      onChange={(e) => updateNumber('maxRaceBudget', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">目標払戻額 (円)</label>
                    <input
                      type="number"
                      step="500"
                      value={form.targetReturn}
                      onChange={(e) => updateNumber('targetReturn', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">最低オッズ見送り閾値 (倍)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.minOdds}
                      onChange={(e) => updateNumber('minOdds', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">最高オッズ除外閾値 (倍)</label>
                    <input
                      type="number"
                      step="5"
                      value={form.maxOdds}
                      onChange={(e) => updateNumber('maxOdds', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              {/* 環境見送り条件 */}
              <div>
                <h4 className="text-slate-200 font-bold mb-2 pb-1 border-b border-slate-800">
                  環境見送り条件 (風・波)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">風速見送り閾値 (m/s 以上)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.windSpeedThreshold}
                      onChange={(e) => updateNumber('windSpeedThreshold', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">波高見送り閾値 (cm 以上)</label>
                    <input
                      type="number"
                      step="1"
                      value={form.waveHeightThreshold}
                      onChange={(e) => updateNumber('waveHeightThreshold', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              {/* 日次STOP条件 */}
              <div>
                <h4 className="text-slate-200 font-bold mb-2 pb-1 border-b border-slate-800">
                  日次STOP条件 (利益目標 / 損失上限)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      日次利益目標 (円、到達でSTOP、0で無効)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={form.dailyProfitTarget}
                      onChange={(e) => updateNumber('dailyProfitTarget', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      日次損失上限 (円、到達でSTOP、0で無効)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={form.dailyLossLimit}
                      onChange={(e) => updateNumber('dailyLossLimit', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-sans">
              <div className="p-2.5 bg-blue-950/30 border border-blue-800/60 rounded text-slate-300 text-xs">
                式：Score = 勝率×重み + 2連対率×重み + モーター2連対率×重み + 展示補正 + コース補正
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">勝率重み (規定: 20)</label>
                  <input
                    type="number"
                    value={form.winRateWeight}
                    onChange={(e) => updateNumber('winRateWeight', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">2連率重み (規定: 8)</label>
                  <input
                    type="number"
                    value={form.secondRateWeight}
                    onChange={(e) => updateNumber('secondRateWeight', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">モーター重み (規定: 5)</label>
                  <input
                    type="number"
                    value={form.motorWeight}
                    onChange={(e) => updateNumber('motorWeight', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">展示補正係数 (規定: 15)</label>
                  <input
                    type="number"
                    value={form.exhibitionWeight}
                    onChange={(e) => updateNumber('exhibitionWeight', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-slate-200 font-bold mb-2 pb-1 border-b border-slate-800">
                  コース進入加算補正 (pt)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((cNum, idx) => (
                    <div key={cNum}>
                      <label className="text-slate-400 text-[10px] block mb-1 text-center font-bold">
                        {cNum}コース
                      </label>
                      <input
                        type="number"
                        value={form.courseWeights[idx]}
                        onChange={(e) => updateCourseWeight(idx, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200 font-mono text-right text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>既定値に戻す</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 text-xs"
            >
              <Download className="w-3 h-3" />
              <span>エクスポート</span>
            </button>
            <label className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-white rounded bg-slate-900 border border-slate-800 text-xs cursor-pointer">
              <Upload className="w-3 h-3" />
              <span>インポート</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onSaveSettings(form);
                onClose();
              }}
              className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存して適用</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
