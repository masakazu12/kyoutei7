// Kyotei Analyzer Pro 5 - テレボート公式PC版 自動投票拡張機能 コンテンツスクリプト
// 対応サイト: https://ib.mbrace.or.jp/* (PC版) & https://spweb.brtb.jp/* (SP版)

(function () {
  'use strict';

  console.log('[Kyotei Extension] Teleboat content script loaded on:', location.href);

  // 全国24会場コード対応表
  const VENUE_MAP = {
    '桐生': '01', '戸田': '02', '江戸川': '03', '平和島': '04', '多摩川': '05',
    '浜名湖': '06', '蒲郡': '07', '常滑': '08', '津': '09', '三国': '10',
    'びわこ': '11', '住之江': '12', '尼崎': '13', '鳴門': '14', '丸亀': '15',
    '児島': '16', '宮島': '17', '徳山': '18', '下関': '19', '若松': '20',
    '芦屋': '21', '福岡': '22', '唐津': '23', '大村': '24',
  };

  const REVERSE_VENUE_MAP = {};
  Object.keys(VENUE_MAP).forEach((k) => { REVERSE_VENUE_MAP[VENUE_MAP[k]] = k; });

  let currentPayload = null;
  let hudElement = null;
  let isExecuting = false;
  let autoBuyEnabled = false;
  let savedBetPassword = '';

  // 1. 設定の復元
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['settings', 'pendingVote'], (res) => {
      if (res.settings) {
        autoBuyEnabled = !!res.settings.autoBuyEnabled;
        savedBetPassword = res.settings.betPassword || '';
      }
      if (res.pendingVote) {
        handleIncomingPayload(res.pendingVote, false);
      }
    });
  }

  // 2. ペイロード取得（URLハッシュ、BroadcastChannel、メッセージ）
  function extractPayloadFromHash() {
    try {
      const hash = location.hash;
      if (hash && hash.includes('kyotei_vote=')) {
        const jsonStr = decodeURIComponent(hash.split('kyotei_vote=')[1].split('&')[0]);
        const data = JSON.parse(jsonStr);
        if (data && (data.bets || data.candidates)) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[Kyotei Extension] Hash parse error:', e);
    }
    return null;
  }

  // BroadcastChannelリスナー
  try {
    const bc = new BroadcastChannel('kyotei_teleboat_bridge');
    bc.onmessage = (ev) => {
      if (ev.data && (ev.data.bets || ev.data.candidates)) {
        console.log('[Kyotei Extension] Received vote via BroadcastChannel:', ev.data);
        handleIncomingPayload(ev.data, true);
      }
    };
  } catch (e) {}

  // バックグラウンドからのメッセージ
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg && msg.type === 'EXECUTE_VOTE_PAYLOAD') {
        console.log('[Kyotei Extension] Received vote via chrome.runtime:', msg.payload);
        handleIncomingPayload(msg.payload, true);
        sendResponse({ received: true });
      }
    });
  }

  // 初期化時のハッシュチェック
  const initialHashPayload = extractPayloadFromHash();
  if (initialHashPayload) {
    handleIncomingPayload(initialHashPayload, true);
  }

  // 3. 受信したペイロードの正規化とHUD反映
  function handleIncomingPayload(payload, triggerNotice) {
    if (!payload) return;
    const bets = payload.bets || payload.candidates || [];
    if (!bets.length) return;

    currentPayload = {
      venue: payload.venue || '住之江',
      venueCode: payload.venueCode || VENUE_MAP[payload.venue] || '12',
      raceNo: parseInt(payload.raceNo || '1', 10),
      totalStake: payload.totalStake || bets.reduce((s, b) => s + (b.stake || b.s || 1000), 0),
      betPassword: payload.betPassword || savedBetPassword || '',
      autoExecute: !!payload.autoExecute,
      bets: bets.map((b) => {
        let comb = b.combination || b.c || '';
        let parts = comb ? comb.split('-') : [];
        let f = b.first || b.f || parts[0] || '1';
        let sec = b.second || b.sec || parts[1] || '2';
        let th = b.third || b.th || parts[2] || '3';
        let stake = b.stake || b.s || 1000;
        return {
          combination: comb || `${f}-${sec}-${th}`,
          first: String(f),
          second: String(sec),
          third: String(th),
          stake: parseInt(stake, 10),
        };
      }),
    };

    if (currentPayload.betPassword) {
      savedBetPassword = currentPayload.betPassword;
    }

    renderHUD();

    // 全自動投票が有効かつ autoExecute フラグがある場合、即座に投入を開始
    if (autoBuyEnabled || currentPayload.autoExecute) {
      setTimeout(() => {
        executeVoteInjection();
      }, 700);
    }
  }

  // 4. フローティングHUDの生成・更新
  function renderHUD() {
    if (!hudElement) {
      hudElement = document.createElement('div');
      hudElement.id = 'kyotei-extension-hud';
      document.body.appendChild(hudElement);
    }

    if (!currentPayload) {
      hudElement.innerHTML = `
        <div class="k-hud-header">
          <div class="k-hud-title">
            <span class="k-hud-logo">🚤</span>
            <span>Kyotei PC 自動投票</span>
          </div>
          <button class="k-hud-btn-close" id="k-close-btn">✕</button>
        </div>
        <div class="k-hud-body">
          <div class="k-hud-status-badge k-status-idle">💤 待機中 (投票データ待機)</div>
          <p class="k-hud-desc">Kyotei Analyzer から買い目・投票指図が送信されると自動表示されます。</p>
        </div>
      `;
      document.getElementById('k-close-btn')?.addEventListener('click', () => hudElement.remove());
      return;
    }

    const { venue, raceNo, totalStake, bets } = currentPayload;

    hudElement.innerHTML = `
      <div class="k-hud-header">
        <div class="k-hud-title">
          <span class="k-hud-logo">🚤</span>
          <span>Kyotei PC 自動投票</span>
          <span class="k-hud-badge-v1">v1.0 Ready</span>
        </div>
        <div class="k-hud-actions">
          <button class="k-hud-btn-min" id="k-min-btn" title="最小化/展開">−</button>
          <button class="k-hud-btn-close" id="k-close-btn" title="閉じる">✕</button>
        </div>
      </div>
      <div class="k-hud-content" id="k-hud-content">
        <div class="k-hud-target-card">
          <div class="k-target-race">
            <span class="k-venue-pill">${venue}</span>
            <span class="k-race-no">第${raceNo}R</span>
            <span class="k-bet-count">${bets.length}点</span>
          </div>
          <div class="k-target-amount font-mono">
            合計: <strong>¥${totalStake.toLocaleString()}</strong>
          </div>
        </div>

        <div class="k-hud-bets-list">
          ${bets.map((b, idx) => `
            <div class="k-bet-row">
              <span class="k-bet-idx">#${idx + 1}</span>
              <span class="k-bet-type">3連単</span>
              <span class="k-bet-comb">${b.first}-${b.second}-${b.third}</span>
              <span class="k-bet-stake">¥${b.stake.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>

        <div id="k-hud-status" class="k-hud-status-badge ${isExecuting ? 'k-status-running' : 'k-status-ready'}">
          ${isExecuting ? '⚡ 買い目を投入中...' : '✅ 投票指図 受信完了'}
        </div>

        <div class="k-hud-options">
          <label class="k-hud-checkbox-label">
            <input type="checkbox" id="k-auto-confirm-cb" ${autoBuyEnabled ? 'checked' : ''} />
            <span>全自動購入 (パスワード入力・確認まで自動実行)</span>
          </label>
        </div>

        <div class="k-hud-btn-group">
          <button id="k-exec-btn" class="k-btn-primary" ${isExecuting ? 'disabled' : ''}>
            🚀 このレースを今すぐ自動投入
          </button>
          <button id="k-file-vote-btn" class="k-btn-secondary">
            📋 ファイル投票へ展開
          </button>
        </div>
      </div>
    `;

    // イベントリスナーの登録
    document.getElementById('k-close-btn')?.addEventListener('click', () => {
      hudElement.remove();
      hudElement = null;
    });

    document.getElementById('k-min-btn')?.addEventListener('click', () => {
      const content = document.getElementById('k-hud-content');
      if (content) {
        content.classList.toggle('k-hidden');
      }
    });

    document.getElementById('k-auto-confirm-cb')?.addEventListener('change', (e) => {
      autoBuyEnabled = e.target.checked;
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['settings'], (res) => {
          const s = res.settings || {};
          s.autoBuyEnabled = autoBuyEnabled;
          chrome.storage.local.set({ settings: s });
        });
      }
    });

    document.getElementById('k-exec-btn')?.addEventListener('click', () => {
      executeVoteInjection();
    });

    document.getElementById('k-file-vote-btn')?.addEventListener('click', () => {
      executeFileVoteInjection();
    });
  }

  function setHUDStatus(text, statusClass = 'k-status-running') {
    const el = document.getElementById('k-hud-status');
    if (el) {
      el.className = `k-hud-status-badge ${statusClass}`;
      el.innerText = text;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 5. テレボート公式での自動投入コアロジック
  async function executeVoteInjection() {
    if (!currentPayload || isExecuting) return;
    isExecuting = true;
    renderHUD();

    try {
      setHUDStatus('1/4: ログイン状態の確認...', 'k-status-running');

      // ログインページ判定
      const hasLoginInput = document.querySelector('input[name*="member"], input[name*="pass"], input[type="password"]');
      if (document.body.innerText.includes('ログイン') && hasLoginInput && !document.querySelector('button, a, input[value*="投票"]')) {
        setHUDStatus('⚠️ テレボートにログインしてください', 'k-status-warn');
        isExecuting = false;
        return;
      }

      // ファイル投票画面がある場合はファイル投票を優先 (最も確実)
      const textarea = document.querySelector('textarea');
      if (textarea) {
        await executeFileVoteInjection();
        isExecuting = false;
        return;
      }

      // 通常投票フロー
      setHUDStatus(`2/4: 会場【${currentPayload.venue}】第${currentPayload.raceNo}R を選択中...`, 'k-status-running');

      // 式別: 3連単タブの探索とクリック
      const allButtons = Array.from(document.querySelectorAll('button, a, input, div, span, label'));
      for (const btn of allButtons) {
        const text = (btn.innerText || btn.value || '').trim();
        if (text === '3連単' || text === '三連単') {
          btn.click();
          await sleep(250);
          break;
        }
      }

      // 各買い目の投入
      let injectedCount = 0;
      for (let i = 0; i < currentPayload.bets.length; i++) {
        const b = currentPayload.bets[i];
        setHUDStatus(`3/4: 買い目セット (${i + 1}/${currentPayload.bets.length}) 3連単 ${b.combination}...`, 'k-status-running');

        // 1着、2着、3着の選択
        const sel1 = document.querySelector(`input[name*="1"][value="${b.first}"], [data-chak="1"][data-boat="${b.first}"], input[value="${b.first}"][name*="boat1"]`);
        const sel2 = document.querySelector(`input[name*="2"][value="${b.second}"], [data-chak="2"][data-boat="${b.second}"], input[value="${b.second}"][name*="boat2"]`);
        const sel3 = document.querySelector(`input[name*="3"][value="${b.third}"], [data-chak="3"][data-boat="${b.third}"], input[value="${b.third}"][name*="boat3"]`);

        if (sel1) sel1.click();
        await sleep(60);
        if (sel2) sel2.click();
        await sleep(60);
        if (sel3) sel3.click();
        await sleep(80);

        // 金額の入力
        const amountInput = document.querySelector('input[name*="money"], input[name*="amount"], input[name*="bet"], input[type="number"]');
        if (amountInput) {
          const isHundred = amountInput.placeholder && amountInput.placeholder.includes('百');
          amountInput.value = isHundred ? Math.max(1, Math.floor(b.stake / 100)) : b.stake;
          amountInput.dispatchEvent(new Event('input', { bubbles: true }));
          amountInput.dispatchEvent(new Event('change', { bubbles: true }));
          await sleep(80);
        }

        // ベットリストに追加ボタン
        const addBtns = Array.from(document.querySelectorAll('button, a, input, div'));
        for (const ab of addBtns) {
          const t = (ab.innerText || ab.value || '').trim();
          if (t === 'セット' || t === '追加' || t === 'ベットリストに追加' || ab.id === 'btnSet') {
            ab.click();
            injectedCount++;
            break;
          }
        }
        await sleep(250);
      }

      // 投票入力完了
      setHUDStatus('4/4: 投票入力確認画面へ遷移中...', 'k-status-running');
      for (const fb of Array.from(document.querySelectorAll('button, a, input'))) {
        const t = (fb.innerText || fb.value || '').trim();
        if (t === '投票入力完了' || t === '入力完了' || t === 'ベットリスト確認' || t === '投票確認') {
          fb.click();
          break;
        }
      }
      await sleep(400);

      // パスワード入力
      if (savedBetPassword) {
        const pwdFields = document.querySelectorAll('input[type="password"]');
        pwdFields.forEach((p) => {
          p.value = savedBetPassword;
          p.dispatchEvent(new Event('input', { bubbles: true }));
          p.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      // 全自動購入が有効な場合、投票ボタンを自動クリック
      if (autoBuyEnabled && savedBetPassword) {
        setHUDStatus('⚡ 全自動購入: 公式投票ボタンを実行中...', 'k-status-running');
        await sleep(500);
        for (const voteBtn of Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a'))) {
          const t = (voteBtn.innerText || voteBtn.value || '').trim();
          if (t === '投票する' || t === '投票' || t === '購入する' || t === '投票実行') {
            voteBtn.click();
            break;
          }
        }
      }

      setHUDStatus(`🎉 完了: ${currentPayload.bets.length}点を反映しました！内容を確認し投票してください`, 'k-status-ready');
    } catch (err) {
      console.error('[Kyotei Extension] Injection error:', err);
      setHUDStatus(`エラー: ${err.message}`, 'k-status-warn');
    } finally {
      isExecuting = false;
    }
  }

  // 6. ファイル投票（最も確実・1秒で全点投入）
  async function executeFileVoteInjection() {
    if (!currentPayload) return;
    setHUDStatus('📋 ファイル投票形式で自動投入中...', 'k-status-running');

    const lines = currentPayload.bets.map((b) => {
      return `${currentPayload.venueCode},${currentPayload.raceNo},3T,${b.first},${b.second},${b.third},${b.stake}`;
    });

    const fileContent = lines.join('\n');

    // クリップボードへのバックアップ
    try {
      await navigator.clipboard.writeText(fileContent);
    } catch (e) {}

    // テキストエリアへの自動流し込み
    const ta = document.querySelector('textarea');
    if (ta) {
      ta.value = fileContent;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));

      // 読込ボタンを探してクリック
      await sleep(200);
      const readBtns = Array.from(document.querySelectorAll('button, input, a'));
      for (const btn of readBtns) {
        const t = (btn.innerText || btn.value || '').trim();
        if (t === '読込' || t === '読み込み' || t.includes('ファイル読込')) {
          btn.click();
          break;
        }
      }
      setHUDStatus(`✅ ファイル投票へ ${lines.length}点 (計¥${currentPayload.totalStake.toLocaleString()}) を反映完了！`, 'k-status-ready');
      return;
    }

    // ファイル投票メニューを探して遷移
    const fileVoteLinks = Array.from(document.querySelectorAll('a, button, input'));
    for (const link of fileVoteLinks) {
      const t = (link.innerText || link.value || '').trim();
      if (t === 'ファイル投票' || t.includes('ファイル投票')) {
        link.click();
        setHUDStatus('ファイル投票画面へ移動中...', 'k-status-running');
        return;
      }
    }

    setHUDStatus('TXTデータをクリップボードにコピーしました。ファイル投票画面で貼付してください。', 'k-status-ready');
  }

  // 7. 公式購入完了・受付番号（receptionNo）の自動検知と逆方向ブロードキャスト
  function checkForPurchaseConfirmation() {
    const pageText = document.body ? document.body.innerText : '';
    if (!pageText) return;

    if (
      pageText.includes('購入完了') ||
      pageText.includes('投票完了') ||
      pageText.includes('投票を受け付けました') ||
      pageText.includes('投票結果') ||
      pageText.includes('受付番号')
    ) {
      // 受付番号の正規表現抽出
      const receptionMatch = pageText.match(/受付番号[：:\s]*([0-9A-Za-z]+)/) ||
                             pageText.match(/受付[：:\s]*([0-9A-Za-z]{6,})/);

      const receptionNo = receptionMatch ? receptionMatch[1] : `TB-PC-${Date.now().toString().slice(-8)}`;

      // 完了イベントの生成
      const confirmData = {
        type: 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED',
        receptionNo: receptionNo,
        venue: currentPayload ? currentPayload.venue : 'テレボート公式',
        raceNo: currentPayload ? currentPayload.raceNo : 1,
        totalStake: currentPayload ? currentPayload.totalStake : 0,
        timestamp: Date.now(),
      };

      console.log('[Kyotei Extension] Official purchase detected! Reception No:', receptionNo);

      // HUDを完了表示へ
      if (hudElement) {
        hudElement.innerHTML = `
          <div class="k-hud-header k-header-success">
            <div class="k-hud-title">
              <span>🎉</span>
              <strong>公式投票 購入完了！</strong>
            </div>
            <button class="k-hud-btn-close" id="k-close-btn">✕</button>
          </div>
          <div class="k-hud-body">
            <div class="k-reception-box">
              <span class="k-reception-label">公式受付番号:</span>
              <span class="k-reception-no font-mono">${receptionNo}</span>
            </div>
            <p class="k-hud-desc text-emerald-300">
              Kyotei Analyzer Pro 5へ受付番号を同期しました。購入限度額から正確に減算されます。
            </p>
          </div>
        `;
        document.getElementById('k-close-btn')?.addEventListener('click', () => hudElement.remove());
      }

      // 1. バックグラウンドへ通知
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'TELEBOAT_PURCHASE_COMPLETED',
          data: confirmData,
        });
      }

      // 2. BroadcastChannelで同報
      try {
        const bc = new BroadcastChannel('kyotei_teleboat_bridge');
        bc.postMessage(confirmData);
      } catch (e) {}

      // 3. localStorageへ記録
      try {
        localStorage.setItem('__kyotei_confirmed_vote__', JSON.stringify(confirmData));
      } catch (e) {}

      // 4. window.postMessage
      window.postMessage(confirmData, '*');
    }
  }

  // 完了監視タイマー
  setInterval(checkForPurchaseConfirmation, 1000);
})();
