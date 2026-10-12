// Kyotei Analyzer Pro 5 - Chrome拡張機能 バックグラウンド サービスワーカー
// Teleboat PC (ib.mbrace.or.jp) と Kyotei Analyzer Webアプリ間の通信ブリッジ

console.log('[Kyotei Extension] Background service worker initialized.');

// 初期設定の保持
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings'], (res) => {
    if (!res.settings) {
      chrome.storage.local.set({
        settings: {
          autoBuyEnabled: false,
          betPassword: '',
          autoNavigate: true,
          inputDelayMs: 150,
        },
      });
    }
  });
});

// メッセージディスパッチャー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  // 1. Kyotei Analyzer からの拡張機能生存確認 (PING)
  if (message.type === 'PING_EXTENSION' || message.type === 'KYOTEI_CHECK_EXTENSION') {
    sendResponse({
      status: 'OK',
      version: '1.1.0',
      name: 'Kyotei Analyzer Pro PC Extension',
      timestamp: Date.now(),
    });
    return true;
  }

  // 2. Kyotei Analyzer からの投票データ送信
  if (message.type === 'SEND_VOTE_TO_TELEBOAT') {
    const payload = message.payload;
    if (!payload) {
      sendResponse({ success: false, error: 'No payload provided' });
      return true;
    }

    // 最新の投票指示をローカルストレージへ保存
    chrome.storage.local.set({
      pendingVote: payload,
      lastDispatchTime: Date.now(),
    }, () => {
      // 既存のテレボートPCタブを検索
      chrome.tabs.query({ url: '*://ib.mbrace.or.jp/*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          // 既存タブをアクティブ化し、投票実行シグナルを送る
          const targetTab = tabs[0];
          chrome.tabs.update(targetTab.id, { active: true }, () => {
            chrome.tabs.sendMessage(targetTab.id, {
              type: 'EXECUTE_VOTE_PAYLOAD',
              payload: payload,
            }, (tabResponse) => {
              sendResponse({
                success: true,
                mode: 'EXISTING_TAB_FOCUSED',
                tabId: targetTab.id,
                response: tabResponse,
              });
            });
          });
        } else {
          // テレボートタブが存在しない場合、新規タブを開く
          const encoded = encodeURIComponent(JSON.stringify(payload));
          const targetUrl = `https://ib.mbrace.or.jp/#kyotei_vote=${encoded}`;
          chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
            sendResponse({
              success: true,
              mode: 'NEW_TAB_OPENED',
              tabId: newTab.id,
            });
          });
        }
      });
    });
    return true; // 非同期レスポンス
  }

  // 3. テレボート公式側で購入完了した際の受付番号ブロードキャスト通知
  if (message.type === 'TELEBOAT_PURCHASE_COMPLETED') {
    const confirmationData = message.data;
    chrome.storage.local.set({
      lastConfirmedPurchase: confirmationData,
    });

    // すべてのタブ（特にKyotei Analyzerのタブ）へ購入確定シグナルを同報
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        try {
          chrome.tabs.sendMessage(tab.id, {
            type: 'KYOTEI_PURCHASE_CONFIRMED_BROADCAST',
            data: confirmationData,
          });
        } catch (e) {
          // 無視
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }

  // 4. ステータス取得
  if (message.type === 'GET_EXTENSION_STATUS') {
    chrome.storage.local.get(['pendingVote', 'settings', 'lastConfirmedPurchase'], (data) => {
      sendResponse({
        success: true,
        version: '1.1.0',
        pendingVote: data.pendingVote || null,
        settings: data.settings || {},
        lastConfirmedPurchase: data.lastConfirmedPurchase || null,
      });
    });
    return true;
  }

  return false;
});
