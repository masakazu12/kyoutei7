import React from 'react';
import { BookOpen, ShieldAlert, CheckCircle, Info } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl flex flex-col max-h-[88vh] select-none animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Keirin Analyzer Pro 5 操作説明書・システム仕様 (Ver 1.0 競輪)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 text-sm font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
          {/* 免責事項・安全性 */}
          <div className="p-3 bg-amber-950/40 border border-amber-600/70 rounded text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>重要：公式投票連携および利用上の注意</span>
            </div>
            <p>
              本アプリケーションは「競輪予想・ライン展開分析・資金配分・収支シミュレーション・公式投票支援ツール」です。
              全国43競輪場のバンク周長（333m/400m/500m）、みなし直線、競走得点、ライン並び予想を統合分析します。
              実際の車券購入はKEIRIN.JP公式等の投票システムを通じて行われます。車券購入は余裕資金の範囲内で自己責任において行ってください。
            </p>
          </div>

          {/* 1. 基本操作フロー */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>1. 基本的な操作手順</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
              <li>
                <strong className="text-white">開催場・レース選択：</strong>
                画面上部から全国43競輪場および1R〜12Rを選択、または上部「当日競輪場を一括取得」から本日開催中の番組を読み込みます。
              </li>
              <li>
                <strong className="text-white">出走表 & ライン並び確認：</strong>
                1〜7番車（または9番車）の競走得点、級班(SS/S1/S2/A1)、脚質(逃/捲/追/両)、ギヤ倍数、B数、ライン並び予想を確認します。
              </li>
              <li>
                <strong className="text-white">「予想実行」または「AI深層予想」：</strong>
                スジ車券・ライン連携を重視した競輪専用アルゴリズムが評価指数を計算し、推奨買い目を自動選抜します。Gemini搭載のAI深層予想では展開見解も出力されます。
              </li>
              <li>
                <strong className="text-white">オッズ取得 & 資金配分：</strong>
                車券種別（3連単・3連複・2車単・2車複・単勝・ワイド）と点数を選択後、「配分計算」をクリックして目標払戻額に応じた100円単位の推奨金額を算出します。
              </li>
              <li>
                <strong className="text-white">見送り・STOP判定確認：</strong>
                強風（バンク落車波乱警戒）や低オッズ、または利益目標・損失上限に達している場合は状態スタンプが「見送り」や「停止」に切り替わります。
              </li>
              <li>
                <strong className="text-white">結果取得・履歴保存：</strong>
                レース終了後、「結果取得」から確定着順と払戻金を反映し、的中判定・回収率・純利益をリアルタイム更新します。
              </li>
            </ol>
          </div>

          {/* 2. 競輪予想エンジンの仕様 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>2. 競輪（KEIRIN）予想エンジンの仕様</span>
            </h4>
            <p className="text-slate-300">
              競輪は「ライン戦」「スジ決着」が的中への最大の鍵となります。本システムは以下の要素を複合的にスコアリングします：
            </p>
            <div className="p-2 bg-slate-950 rounded font-mono text-cyan-300 text-[11px] border border-slate-800 space-y-1">
              <div>・競走得点指数（得点差×傾斜配点）</div>
              <div>・ライン連携ボーナス（同一ラインの先頭自力と番手選手のスジ買い目を最重視）</div>
              <div>・バンク周長補正（333m短バンクは先行「逃げ」圧倒的有利、500m長走路は「捲り・差し・追込」有利）</div>
              <div>・バック(B)数・主導権意欲補正</div>
            </div>
          </div>

          {/* 3. 資金配分方式 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>3. 資金配分方式の仕様</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">目標払戻配分（推奨）：</strong>どの買い目が的中しても目標金額（例: 3,000円）以上の払戻が得られるようオッズに応じて最適資金配分。</li>
              <li><strong className="text-white">均等配分：</strong>1レース上限予算を買い目点数で均等に割り振り（100円単位）。</li>
              <li><strong className="text-white">固定額：</strong>各買い目に指定基準額（例: 500円）を一律配分。</li>
              <li><strong className="text-white">自動縮小機能：</strong>上限予算を超過した場合は予算内に収まるよう自動圧縮。</li>
            </ul>
          </div>

          {/* 4. 状態スタンプの意味 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>4. 状態スタンプの意味</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-cyan-400">待機 (Taiki)</span>
                <p className="text-[10px] text-slate-400">条件適合中。予想または確定待ち。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-amber-400">見送り (Skip)</span>
                <p className="text-[10px] text-slate-400">強風・低オッズ等により除外。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-rose-500">停止 (Stop)</span>
                <p className="text-[10px] text-slate-400">日次利益目標達成または損失上限到達。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-yellow-300">的中 (Teki2)</span>
                <p className="text-[10px] text-slate-400">予想買い目が確定着順と一致。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-slate-400">不的中 (Hazure)</span>
                <p className="text-[10px] text-slate-400">確定着順が予想外。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-rose-400">NG</span>
                <p className="text-[10px] text-slate-400">出走選手データ欠落等の入力エラー。</p>
              </div>
            </div>
          </div>

          {/* 5. 多車券種対応 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-cyan-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>5. 多車券種・可変点数機能</span>
            </h4>
            <p className="text-slate-300">
              競輪公式の車券種別に対応しています：
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">3連単：</strong>1着・2着・3着を着順通り的中（高配当・スジ流し）</li>
              <li><strong className="text-white">3連複：</strong>1〜3着を着順問わず的中（手堅いライン決着）</li>
              <li><strong className="text-white">2車単：</strong>1着・2着を着順通り的中（本命ラインワンツー）</li>
              <li><strong className="text-white">2車複：</strong>1着・2着を着順問わず的中</li>
              <li><strong className="text-white">車番単勝：</strong>1着選手を的中</li>
              <li><strong className="text-white">ワイド：</strong>3着以内の2選手を着順問わず的中</li>
            </ul>
          </div>

          {/* 6. 全国43競輪場 分析マトリクス */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>6. 全国43競輪場 分析マトリクス</span>
            </h4>
            <p className="text-slate-300">
              各競輪場（平塚、小田原、前橋、松戸、立川、京王閣、名古屋、伊東温泉、四日市、小倉、熊本など）ごとのバンク周長、直線長、カント角度、回収率・的中率を集計・可視化します。
            </p>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
