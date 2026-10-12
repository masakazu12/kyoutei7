@echo off
chcp 65001 > nul
echo ========================================================
echo   Kyotei Analyzer Pro 5 - Windows EXE 生成ビルダー
echo   Windows 10 / 11 64bit 対応
echo ========================================================
echo.
echo [1/3] 依存関係の確認とインストール...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [エラー] npm install に失敗しました。Node.js がインストールされているか確認してください。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Web アプリケーションのビルド (Vite)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [エラー] ビルドに失敗しました。
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Windows 向け .EXE ファイルのパッケージング (Electron-Builder)...
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
