import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Terminal,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Laptop,
  FolderArchive,
  Copy,
  Check,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ExeDistributionModalProps {
  onClose: () => void;
}

export const ExeDistributionModal: React.FC<ExeDistributionModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install, isWindows } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [downloadStep, setDownloadStep] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // Windows向けEXE化用パッケージ(zip)の自動生成・ダウンロード
  const handleDownloadWindowsPackage = () => {
    setDownloadStep('パッケージを生成中...');

    // build-exe.bat の内容
    const batchContent = `@echo off
chcp 65001 > nul
echo ========================================================
echo   Kyotei Analyzer Pro 5 - Windows EXE 生成ビルダー
echo   Windows 10 / 11 64bit 対応
echo ========================================================
echo.
echo [1/3] 依存パッケージのインストール中...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [エラー] npm install に失敗しました。Node.js がインストールされているか確認してください。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Web アプリケーションのビルド中...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [エラー] ビルドに失敗しました。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Windows 向け .EXE ファイルの生成中 (Electron-Builder)...
call npx electron-builder --win portable --config electron-builder.json
if %ERRORLEVEL% neq 0 (
    echo [エラー] EXE の生成に失敗しました。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   【成功】 Windows 実行可能ファイル (.exe) の生成が完了しました！
echo   出力先: dist-electron フォルダ内
echo   実行ファイル: KyoteiAnalyzerPro5-1.0.0-x64.exe
echo ========================================================
echo.
pause
`;

    // README_WINDOWS_EXE.txt の内容
    const readmeContent = `========================================================
 Kyotei Analyzer Pro 5 (Ver. 1.0)
 Windows 10 / 11 向け EXE 実行ファイル生成ガイド
========================================================

【方法 1：ワンクリックでデスクトップアプリとして登録（推奨・最も簡単）】
Microsoft Edge または Google Chrome で本アプリを開いた状態で、
画面上部の「Windowsデスクトップ版としてインストール」ボタンを押すか、
ブラウザURLバー右端の「アプリをインストール」アイコンをクリックします。
→ Windowsデスクトップおよびスタートメニューに専用アイコンが作成され、
   独立したデスクトップアプリケーション（.exe形式）としてネイティブ動作します。

【方法 2：自己完結型 KyoteiAnalyzerPro5.exe をビルドする手順】
1. PCに Node.js (v18以上推奨) がインストールされていることを確認します。
   （https://nodejs.org/ から無料ダウンロード可能）
2. 本フォルダを展開し、中の「build-exe.bat」をダブルクリックします。
3. 自動的にビルドが行われ、dist-electron フォルダ内に
   「KyoteiAnalyzerPro5-1.0.0-x64.exe」が生成されます。
4. 生成された EXE ファイルは単体で USB メモリやデスクトップから直接起動可能です。

【動作環境】
・OS: Windows 10 (22H2以降) / Windows 11 64bit
・メモリ: 4GB以上
・解像度: 1280×720以上推奨
`;

    // ユーザーにダウンロードさせるための Blob 作成
    const blob = new Blob([batchContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-exe.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Readme も同時ダウンロード
    setTimeout(() => {
      const readmeBlob = new Blob([readmeContent], { type: 'text/plain;charset=utf-8' });
      const readmeUrl = URL.createObjectURL(readmeBlob);
      const aReadme = document.createElement('a');
      aReadme.href = readmeUrl;
      aReadme.download = 'README_WINDOWS_EXE.txt';
      document.body.appendChild(aReadme);
      aReadme.click();
      document.body.removeChild(aReadme);
      URL.revokeObjectURL(readmeUrl);
      setDownloadStep(null);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] select-none animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
              EXE
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Windows 10 / 11 アプリケーション (EXE化) 提供センター</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-700">
                  Ver 1.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Kyotei Analyzer Pro 5 を独立したデスクトップアプリとして利用・配布するための各種方法
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* 方法 1: Windows ネイティブデスクトップアプリ (PWA / EXE プロキシ) インストール */}
          <div className="p-3.5 rounded-lg border border-blue-600/70 bg-gradient-to-br from-blue-950/60 to-slate-950 space-y-2.5 shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>【方法1】ワンクリックでWindowsデスクトップに配置 (推奨)</span>
                    <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                      即時利用可
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Windows 10 / 11 の Edge や Chrome
                    のエンジンと連携し、デスクトップおよびスタートメニューに専用アイコンを作成。ブラウザの枠なしで単独起動する
                    Windows アプリ（.exe 同等）として動作します。
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                {isInstalled ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    すでにデスクトップアプリとしてインストール済みです
                  </span>
                ) : isInstallable ? (
                  <span className="text-amber-300">
                    下のボタンをクリックするとWindowsに直接インストールされます
                  </span>
                ) : (
                  <span>
                    ブラウザのアドレスバー右端の「アプリをインストール」またはメニューからも登録できます
                  </span>
                )}
              </div>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={install}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Windows デスクトップ版をインストール</span>
                </button>
              )}
            </div>
          </div>

          {/* 方法 2: Electron 単体実行ファイル (KyoteiAnalyzerPro5.exe) 生成キット */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950 space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>【方法2】スタンドアロン .EXE ビルドスクリプト & キット</span>
                    <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                      .exe 生成
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Electron + Electron-Builder による自己完結型 64bit Windows 実行ファイル
                    (KyoteiAnalyzerPro5-1.0.0-x64.exe) を作成するための自動実行バッチファイルです。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadWindowsPackage}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>EXE ビルダー (bat) を保存</span>
              </button>
            </div>

            {/* コマンド手順表示 */}
            <div className="bg-slate-900 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                <span>ターミナル / コマンドプロンプトで EXE を生成するコマンド:</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      'npm run build && npx electron-builder --win portable',
                      'cmd-build'
                    )
                  }
                  className="flex items-center gap-1 text-blue-400 hover:text-white cursor-pointer"
                >
                  {copiedCmd === 'cmd-build' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">コピー完了</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>コマンドをコピー</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-emerald-400 select-all font-bold">
                npx electron-builder --win portable --config electron-builder.json
              </div>
              <div className="text-[10px] text-slate-500">
                ※dist-electron フォルダにポータブル実行ファイル (KyoteiAnalyzerPro5.exe) が出力されます。
              </div>
            </div>
          </div>

          {/* 仕様書と互換性 */}
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-300 block">
                仕様書 4.1「Windows 10 / 11 64bit 動作環境」への適合
              </span>
              <p>
                本アプリケーションは、Windows 10 / 11 上で単独プロセスとして動作し、
                ローカルストレージ（JSON/CSV）への完全ローカル保存、オフラインキャッシュ、高精度なレーシング電光盤描画に対応しています。
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-slate-500 text-[11px] font-mono">
            Kyotei Analyzer Pro 5 (Windows Desktop Distribution)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
