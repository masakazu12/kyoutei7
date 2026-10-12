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
              Kyotei Analyzer Pro 5 操作説明書・システム仕様 (Ver 1.0)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 text-sm font-bold">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
          {/* 免責事項・安全性 */}
          <div className="p-3 bg-amber-950/40 border border-amber-600/70 rounded text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>重要：テレボート実投票連携および利用上の注意</span>
            </div>
            <p>
              本アプリケーションは「競艇予想・資金配分・収支シミュレーション・テレボート実投票支援ツール」です。
              テレボート公式Web（PC版 / スマホ版）への買い目自動転送・スクリプト連携、および購入限度額（実残高）の完全一致同期をサポートしています。
              実際の投票送信は、テレボート公式のセキュリティ（加入者番号・暗証番号・認証）を経て確定されます。舟券の購入は余裕資金の範囲内で自己責任において行ってください。
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
                画面上部から全国24場および1R〜12Rを選択、または上部メニューの「サンプル番組」を読み込みます。
              </li>
              <li>
                <strong className="text-white">出走表確認・編集：</strong>
                1〜6号艇の全国勝率、2連対率、モーター2連対率、進入コース、展示タイム等を確認します（直接編集も可能）。
              </li>
              <li>
                <strong className="text-white">「5点予想実行」：</strong>
                本命5点型エンジンが艇評価指数を計算し、1着軸・有力艇流し・逆転候補の合計最大5点を自動生成します。
              </li>
              <li>
                <strong className="text-white">オッズ入力 & 資金配分：</strong>
                オッズを確認・調整（または「オッズ生成」）後、「配分計算」をクリックして均等または目標払戻額に応じた100円単位の推奨金額を算出します。
              </li>
              <li>
                <strong className="text-white">見送り・STOP判定確認：</strong>
                風速（8.0m/s以上）や波高（10cm以上）、低オッズ、または利益目標・損失上限に達している場合は状態スタンプが「見送り」や「停止」に切り替わります。
              </li>
              <li>
                <strong className="text-white">結果入力・履歴保存：</strong>
                レース終了後、「結果入力(確定)」から確定着順と払戻金を入力すると、的中判定が行われ、純利益・回収率がリアルタイムに更新されます。
              </li>
            </ol>
          </div>

          {/* 2. 本命5点型予想エンジンロジック */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>2. 本命5点型予想エンジンの仕様 (仕様書 第7章)</span>
            </h4>
            <p className="text-slate-300">
              各艇の評価スコアは以下の標準式で算出されます（設定から重み変更可能）：
            </p>
            <div className="p-2 bg-slate-950 rounded font-mono text-cyan-300 text-[11px] border border-slate-800">
              Score = 勝率×20 + 2連対率×8 + モーター2連対率×5 + 展示補正 + コース補正
            </div>
            <p className="text-slate-300">
              コース補正はインが最も有利（1コース:+120pt, 2コース:+35pt, 3コース:+25pt, 4コース:+20pt, 5コース:+10pt, 6コース:0pt）とし、
              展示タイムが全体平均より速い艇にはボーナス点が加算されます。
              買い目は評価1位を軸とし、1-2-3, 1-2-4, 1-3-2, 1-3-4、および2位艇が差し抜ける逆転候補（2-1-3）の最大5点が生成されます。
            </p>
          </div>

          {/* 3. 資金配分方式 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>3. 資金配分方式の仕様 (仕様書 第8章)</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">均等配分：</strong>1レース上限予算を候補点数で均等に割り振り、100円単位に丸めます。</li>
              <li><strong className="text-white">目標払戻配分：</strong>各オッズに対し `ceil(目標払戻額 ÷ オッズ ÷ 100) × 100` で必要最小額を算出します。</li>
              <li><strong className="text-white">固定額：</strong>各買い目に指定基準額（例: 1,000円）を均一に配分します。</li>
              <li><strong className="text-white">自動縮小機能：</strong>目標払戻計算などで上限予算を超過した場合、予算内に収まるよう自動比率圧縮します。</li>
            </ul>
          </div>

          {/* 4. 状態スタンプの意味 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-blue-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>4. 状態スタンプの意味 (仕様書 付録C)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-cyan-400">待機 (Taiki)</span>
                <p className="text-[10px] text-slate-400">条件適合中。予想または確定待ち。</p>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="font-bold text-amber-400">見送り (Skip/Misyri)</span>
                <p className="text-[10px] text-slate-400">強風・高波・低オッズ等により除外。</p>
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
                <p className="text-[10px] text-slate-400">出走艇データ欠落等の入力エラー。</p>
              </div>
            </div>
          </div>

          {/* 5. テレボート自動投票機能について */}
          {/* 5. テレボート自動投票 & 実投票連携マネージャー機能 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-emerald-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>5. テレボート実投票連携 & 4通りの自動反映仕様</span>
            </h4>
            <p className="text-slate-300">
              算出された本命買い目と配分金額をテレボート公式規格へ自動転送し、テレボート画面上で確実にベットリストへ反映させる機能です。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">URLハッシュ直接連携（推奨）：</strong>「テレボート公式を開いて自動反映」を押すと、URLハッシュ（#kyotei_vote=...）経由でテレボート画面に買い目・金額データが即座に渡り、画面上の専用連携バーから1クリックでベットリストへ一括投入されます。</li>
              <li><strong className="text-white">自動反映ブックマークレット：</strong>テレボート画面（spweb.brtb.jp / ib.mbrace.or.jp）で実行するだけで、3連単タブ選択・艇番選択・金額入力・ベットリスト追加・入力完了画面遷移まで全自動で実行します。</li>
              <li><strong className="text-white">PC版公式ファイル投票TXT：</strong>テレボートPC版のメニュー【投票】➔【ファイル投票】へ貼り付け・読込できる公式TXT形式をワンクリックでコピー＆ダウンロード可能。</li>
              <li><strong className="text-white">Tampermonkey全自動拡張スクリプト：</strong>常時テレボート画面右下に「Kyotei Analyzer 連携バー」が自動稼働し、アプリ側で投票指示が出ると即座に検知してベットリストへ自動セットします。</li>
              <li><strong className="text-white">購入限度額の確定減算 & 台帳記録：</strong>テレボートでの投票完了後、公式受付番号を台帳に記録し、購入限度額から正確に投票金額を減算します。</li>
            </ul>
          </div>

          {/* 6. 全自動運転 (Autopilot) & 〆切時刻が早い順巡回仕様 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-cyan-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>6. 全自動運転 (Autopilot) & 〆切時刻が早い順 巡回仕様</span>
            </h4>
            <p className="text-slate-300">
              番組データ取得・気象判定・予想生成・オッズ資金配分・自動投票・結果取得の全サイクルを自動で循環実行するシステムです。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">〆切時刻が早い順巡回：</strong>全国の対象会場（モーニング 08:35〜、デイ 10:45〜、ナイター 15:15〜20:45）の全番組を締切時刻が早い順に時系列ソートして巡回投票します。</li>
              <li><strong className="text-white">多重投票抑止：</strong>投票済みのレースは自動記憶され、同一レースへの二重投票を完全防止して次の未投票レースへ自動スキップします。</li>
              <li><strong className="text-white">未確定保留ガード：</strong>発売中・審判中のレースは確定着順が出るまで的中判定を保留し、フライング誤判定を防止します。</li>
              <li><strong className="text-white">セーフティ安全装置：</strong>目標利益到達・許容損失到達・連続不的中リミットで作動し、自動停止します。</li>
            </ul>
          </div>

          {/* 7. 多券種・購入点数選択機能 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-cyan-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>7. 多券種・購入点数選択機能</span>
            </h4>
            <p className="text-slate-300">
              ユーザーの投資戦略に合わせて、舟券種別（7種類）および購入点数（1〜12点）を自由に選択・切り替え可能です。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">対応舟券種別：</strong>3連単、3連複、2連単、2連複、単勝、複勝、拡連複の全7種目に対応。</li>
              <li><strong className="text-white">可変点数：</strong>極選1点〜12点まで、艇評価指数に基づいて有力な買い目を自動選抜。</li>
              <li><strong className="text-white">リアル市場オッズ算出：</strong>選択した券種（例: 2連単、3連複など）に応じた適正オッズを自動シミュレート。</li>
            </ul>
          </div>

          {/* 8. 全国24場別 収支・的中率・回収率 分析 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>8. 全国24場別 収支・的中率・回収率 分析マトリクス</span>
            </h4>
            <p className="text-slate-300">
              各会場（住之江、大村、桐生、平和島、蒲郡、尼崎等）ごとのレース数、的中数・的中率(%)、総投資額、総払戻額、純利益・損益、回収率(%)を詳細に集計・可視化します。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li><strong className="text-white">最優秀会場ハイライト：</strong>回収率No.1、純利益トップ、的中率トップの会場を自動抽出。</li>
              <li><strong className="text-white">並び替え & 抽出：</strong>回収率順・損益順・的中率順のソートや、指定会場の履歴絞り込みに対応。</li>
              <li><strong className="text-white">公式確定実データ読込：</strong>過去の公式確定レース実績パックをワンクリックで一括インポートし、会場別相性を検証可能。</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
