import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any stale service workers in dev mode to avoid white screen caching issues
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  } catch (e) {}
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Kyotei Analyzer Pro 5] Caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 text-2xl font-bold shadow-lg">
            !
          </div>
          <h1 className="text-xl font-bold text-white mb-2">予期せぬエラーが発生しました</h1>
          <p className="text-sm text-slate-400 max-w-md mb-4 leading-relaxed">
            競艇 Analyzer Pro 5 の実行中に問題が発生しました。ブラウザのローカル設定を初期化して再読み込みしてください。
          </p>
          {this.state.error && (
            <div className="max-w-lg w-full mb-6 p-3 rounded bg-slate-900 border border-rose-900/50 text-left font-mono text-xs text-rose-300 break-all select-text">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg cursor-pointer transition-colors"
            >
              再読み込み
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (e) {}
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg border border-slate-700 cursor-pointer transition-colors"
            >
              初期化して復旧
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (err: any) {
  console.error('Fatal Mount Error:', err);
  const rootEl = document.getElementById('root') || document.body;
  rootEl.innerHTML = `
    <div style="min-height: 100vh; background: #020617; color: #f87171; padding: 24px; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
      <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">初期化エラー</h2>
      <pre style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #ef4444; max-width: 90vw; word-break: break-all; color: #fca5a5; font-size: 12px;">${err?.message || err}</pre>
      <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="margin-top: 16px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold;">設定を初期化して再読込</button>
    </div>
  `;
}
