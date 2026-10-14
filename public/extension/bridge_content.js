// Kyotei Analyzer Pro 5 - Chrome拡張機能 Webアプリ通信ブリッジ
// Kyotei Analyzer WebページとChrome拡張機能バックグラウンドを繋ぐ堅牢なコンテンツスクリプト
// iframe内、トップフレーム、クロスフレーム、DOMイベント、BroadcastChannel全対応

(function () {
  'use strict';

  const EXTENSION_VERSION = '1.1.0';
  const BRIDGE_ID = '__kyotei_pc_extension_bridge__';

  // 1. DOMへの即時マーカー注入（同期的に即座に検出可能にする）
  function markDomAsConnected() {
    try {
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-kyotei-extension-connected', 'true');
        document.documentElement.setAttribute('data-kyotei-extension-version', EXTENSION_VERSION);
        document.documentElement.dataset.kyoteiExtension = 'connected';
        document.documentElement.dataset.kyoteiExtensionVersion = EXTENSION_VERSION;

        let el = document.getElementById(BRIDGE_ID);
        if (!el) {
          el = document.createElement('div');
          el.id = BRIDGE_ID;
          el.setAttribute('data-version', EXTENSION_VERSION);
          el.setAttribute('data-status', 'ready');
          el.setAttribute('data-timestamp', String(Date.now()));
          el.style.setProperty('display', 'none', 'important');
          (document.body || document.documentElement).appendChild(el);
        } else {
          el.setAttribute('data-timestamp', String(Date.now()));
        }
      }
    } catch (e) {
      // DOM操作エラー抑制
    }
  }

  // 即時マーカー注入
  markDomAsConnected();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', markDomAsConnected);
    }
  }

  // 2. 全フレームおよび全通信チャンネルへのブロードキャスト送信ヘルパー
  function broadcastMessage(msg) {
    // A. カレントウィンドウ
    try {
      window.postMessage(msg, '*');
    } catch (e) {}

    // B. 親フレーム (iframe埋め込み時)
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (e) {}

    // C. トップフレーム
    try {
      if (window.top && window.top !== window && window.top !== window.parent) {
        window.top.postMessage(msg, '*');
      }
    } catch (e) {}

    // D. 子フレーム一覧
    try {
      if (window.frames && window.frames.length > 0) {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage(msg, '*');
          } catch (e) {}
        }
      }
    } catch (e) {}

    // E. BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('kyotei_extension_bus');
        bc.postMessage(msg);
        setTimeout(() => {
          try { bc.close(); } catch (e) {}
        }, 500);
      }
    } catch (e) {}

    // F. DOM CustomEvent (window & document)
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(msg.type, { detail: msg }));
      }
      if (typeof document !== 'undefined' && document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent(msg.type, { detail: msg }));
      }
    } catch (e) {}
  }

  // 3. 拡張機能の生存告知 (ANNOUNCE / HEARTBEAT)
  function announcePresence(eventType = 'KYOTEI_EXTENSION_INSTALLED') {
    markDomAsConnected();
    const payload = {
      type: eventType,
      version: EXTENSION_VERSION,
      status: 'READY',
      timestamp: Date.now(),
      isExtension: true,
      href: typeof location !== 'undefined' ? location.href : '',
    };
    broadcastMessage(payload);
  }

  // ページロード時と初期化フェーズでの段階的告知
  announcePresence('KYOTEI_EXTENSION_INSTALLED');
  setTimeout(() => announcePresence('KYOTEI_EXTENSION_INSTALLED'), 250);
  setTimeout(() => announcePresence('KYOTEI_EXTENSION_INSTALLED'), 800);
  setTimeout(() => announcePresence('KYOTEI_EXTENSION_INSTALLED'), 1800);
  setTimeout(() => announcePresence('KYOTEI_EXTENSION_INSTALLED'), 3500);

  // 定期ハートビート（3.5秒ごと）
  setInterval(() => {
    announcePresence('KYOTEI_EXTENSION_HEARTBEAT');
  }, 3500);

  // 4. Webアプリからの問い合わせ（PING・投票指図・リアルタイム診断プローブ）処理
  function handleQuery(data, sourceChannel = 'postMessage') {
    if (!data || typeof data !== 'object') return;

    // A. リアルタイム診断プローブ (KYOTEI_DIAGNOSTIC_PING)
    if (data.type === 'KYOTEI_DIAGNOSTIC_PING') {
      markDomAsConnected();
      const probeId = data.probeId || String(Date.now());
      const channel = data.channel || sourceChannel;
      const pongData = {
        type: 'KYOTEI_DIAGNOSTIC_PONG',
        probeId: probeId,
        channel: channel,
        sourceChannel: sourceChannel,
        version: EXTENSION_VERSION,
        status: 'READY',
        timestamp: Date.now(),
        echoTimestamp: data.timestamp || Date.now(),
      };

      // 該当チャンネルに応じた確実な返信
      if (sourceChannel === 'broadcast_channel' || channel === 'broadcast_channel') {
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('kyotei_extension_bus');
            bc.postMessage(pongData);
            setTimeout(() => { try { bc.close(); } catch(e) {} }, 100);
          }
        } catch (e) {}
      } else if (sourceChannel === 'custom_event' || channel === 'custom_event') {
        try {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('KYOTEI_DIAGNOSTIC_PONG', { detail: pongData }));
          }
          if (typeof document !== 'undefined' && document.dispatchEvent) {
            document.dispatchEvent(new CustomEvent('KYOTEI_DIAGNOSTIC_PONG', { detail: pongData }));
          }
        } catch (e) {}
      } else {
        // postMessage & 全体ブロードキャスト
        broadcastMessage(pongData);
      }

      // DOMブリッジ側のタイムスタンプ更新
      try {
        const el = document.getElementById(BRIDGE_ID);
        if (el) {
          el.setAttribute('data-last-probe-time', String(Date.now()));
          el.setAttribute('data-last-probe-id', probeId);
        }
      } catch (e) {}

      return;
    }

    // B. 拡張機能接続テスト (PING)
    if (
      data.type === 'KYOTEI_CHECK_EXTENSION' ||
      data.type === 'PING' ||
      data.type === 'PING_EXTENSION'
    ) {
      announcePresence('KYOTEI_EXTENSION_PONG');
      return;
    }

    // C. Webアプリからテレボート公式への実投票命令
    if (
      data.type === 'KYOTEI_ANALYZER_DISPATCH_VOTE' ||
      data.type === 'KYOTEI_VOTE' ||
      data.type === 'SEND_VOTE_TO_TELEBOAT'
    ) {
      const payload = data.payload || data;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: 'SEND_VOTE_TO_TELEBOAT',
            payload: payload,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Kyotei Extension Bridge] runtime.sendMessage warning:', chrome.runtime.lastError.message);
            }
            broadcastMessage({
              type: 'KYOTEI_EXTENSION_DISPATCH_RESPONSE',
              response: response || { success: true },
            });
          }
        );
      }
    }
  }

  // A. postMessage リスナー
  window.addEventListener('message', (event) => {
    handleQuery(event.data, 'postMessage');
  });

  // B. CustomEvent リスナー (window & document)
  if (typeof window !== 'undefined') {
    window.addEventListener('KYOTEI_CHECK_EXTENSION', () => {
      announcePresence('KYOTEI_EXTENSION_PONG');
    });
    window.addEventListener('KYOTEI_DIAGNOSTIC_PING', (ev) => {
      handleQuery(ev.detail, 'custom_event');
    });
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('KYOTEI_CHECK_EXTENSION', () => {
      announcePresence('KYOTEI_EXTENSION_PONG');
    });
    document.addEventListener('KYOTEI_DIAGNOSTIC_PING', (ev) => {
      handleQuery(ev.detail, 'custom_event');
    });
  }

  // C. BroadcastChannel リスナー
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const listenBc = new BroadcastChannel('kyotei_extension_bus');
      listenBc.onmessage = (ev) => {
        if (ev && ev.data) {
          handleQuery(ev.data, 'broadcast_channel');
        }
      };
    }
  } catch (e) {}

  // 5. バックグラウンドからのメッセージを受信し、Webページへ転送
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message) return;

      // 公式購入確定（受付番号取得）をWebアプリへ届ける
      if (message.type === 'KYOTEI_PURCHASE_CONFIRMED_BROADCAST') {
        const confirmPayload = {
          type: 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED',
          ...message.data,
        };
        broadcastMessage(confirmPayload);

        try {
          localStorage.setItem(
            '__kyotei_confirmed_vote__',
            JSON.stringify(message.data)
          );
        } catch (e) {}
      }
    });
  }
})();
