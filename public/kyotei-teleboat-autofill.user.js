// ==UserScript==
// @name         Kyotei Analyzer Pro 5 - テレボート公式自動反映・購入連携ブリッジ
// @name:ja      Kyotei Analyzer Pro 5 - テレボート公式自動反映・購入連携ブリッジ
// @namespace    https://kyotei-analyzer.local/
// @version      3.0.3
// @description  Kyotei Analyzer Pro 5 の買い目・資金配分をテレボート公式Web（spweb.brtb.jp / ib.mbrace.or.jp）へリアルタイム自動反映し、購入完了・受付番号をアプリへ自動同期
// @description:ja Kyotei Analyzer Pro 5 の買い目・資金配分をテレボート公式Web（spweb.brtb.jp / ib.mbrace.or.jp）へリアルタイム自動反映し、購入完了・受付番号をアプリへ自動同期
// @author       Kyotei Analyzer Project
// @match        https://*.mbrace.or.jp/*
// @match        https://*.brtb.jp/*
// @match        https://*.run.app/*
// @match        http://localhost:*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var SCRIPT_VERSION = '3.0.3';
  var isTeleboat =
    location.hostname.indexOf('brtb.jp') !== -1 ||
    location.hostname.indexOf('mbrace.or.jp') !== -1;
  var isAppSite = !isTeleboat;

  // 全国24会場名と公式場コード対応表
  var VENUE_CODES = {
    '桐生': '01', '戸田': '02', '江戸川': '03', '平和島': '04', '多摩川': '05', '浜名湖': '06',
    '蒲郡': '07', '常滑': '08', '津': '09', '三国': '10', 'びわこ': '11', '住之江': '12',
    '尼崎': '13', '鳴門': '14', '丸亀': '15', '児島': '16', '宮島': '17', '徳山': '18',
    '下関': '19', '若松': '20', '芦屋': '21', '福岡': '22', '唐津': '23', '大村': '24'
  };

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  // =========================================================================
  // 1. Kyotei Analyzer アプリ側での動作
  // =========================================================================
  if (isAppSite) {
    console.log('🚤 [Kyotei Analyzer] テレボート連携スクリプト待機中 (v' + SCRIPT_VERSION + ')');

    function saveVotePayload(data) {
      if (!data) return;
      try {
        var str = typeof data === 'string' ? data : JSON.stringify(data);
        if (typeof GM_setValue !== 'undefined') {
          GM_setValue('kyotei_pending_vote', str);
          GM_setValue('kyotei_pending_timestamp', Date.now());
        }
        localStorage.setItem('__kyotei_teleboat_pending_vote__', str);
        console.log('🚤 [Kyotei Analyzer] テレボート投票データを共有保存しました:', data);
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
    }

    // カスタムイベント受信
    window.addEventListener('KYOTEI_ANALYZER_VOTE', function (ev) {
      if (ev.detail) saveVotePayload(ev.detail);
    });

    // postMessage 受信
    window.addEventListener('message', function (ev) {
      if (ev.data && (ev.data.type === 'VOTE_SUBMISSION' || ev.data.type === 'KYOTEI_VOTE')) {
        saveVotePayload(ev.data);
      }
    });

    // テレボート側で購入が完了した際のコールバック通知受信
    if (typeof GM_addValueChangeListener !== 'undefined') {
      GM_addValueChangeListener('kyotei_confirmed_vote', function (name, oldVal, newVal, remote) {
        if (newVal) {
          try {
            var data = typeof newVal === 'string' ? JSON.parse(newVal) : newVal;
            console.log('🎉 [Kyotei Analyzer] テレボート公式での購入完了を検知:', data);
            window.dispatchEvent(new CustomEvent('KYOTEI_TELEBOAT_PURCHASE_CONFIRMED', { detail: data }));
            window.postMessage({ type: 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED', ...data }, '*');
            localStorage.setItem('__kyotei_confirmed_vote__', JSON.stringify(data));
          } catch (e) {}
        }
      });
    }

    window.__KYOTEI_TELEBOAT_SCRIPT_INSTALLED__ = true;
    return;
  }

  // =========================================================================
  // 2. テレボート公式側 (brtb.jp / mbrace.or.jp) での動作
  // =========================================================================
  console.log('🚤 [Kyotei Analyzer] テレボート公式自動反映・購入エンジン稼働 (v' + SCRIPT_VERSION + ')');

  // 保留中データの取得 (URL hash -> GM_getValue -> localStorage)
  function getPendingVoteData() {
    // A. URL hash (#kyotei_vote=...)
    try {
      var hash = location.hash || '';
      var match = hash.match(/#kyotei_vote=([^&]+)/) || hash.match(/#kyotei_data=([^&]+)/);
      if (match && match[1]) {
        var decoded = decodeURIComponent(match[1]);
        var parsed = JSON.parse(decoded);
        if (parsed && (parsed.bets || parsed.candidates)) {
          return normalizePayload(parsed);
        }
      }
    } catch (e) {
      console.warn('Hash parse error:', e);
    }

    // B. GM_getValue (Tampermonkey クロスドメイン共有)
    try {
      if (typeof GM_getValue !== 'undefined') {
        var gmVal = GM_getValue('kyotei_pending_vote');
        var gmTime = GM_getValue('kyotei_pending_timestamp') || 0;
        if (gmVal && Date.now() - gmTime < 60 * 60 * 1000) {
          var parsedGM = typeof gmVal === 'string' ? JSON.parse(gmVal) : gmVal;
          if (parsedGM && (parsedGM.bets || parsedGM.candidates)) {
            return normalizePayload(parsedGM);
          }
        }
      }
    } catch (e) {
      console.warn('GM_getValue error:', e);
    }

    // C. localStorage
    try {
      var localVal = localStorage.getItem('__kyotei_teleboat_pending_vote__');
      if (localVal) {
        var parsedLocal = JSON.parse(localVal);
        if (parsedLocal && (parsedLocal.bets || parsedLocal.candidates)) {
          return normalizePayload(parsedLocal);
        }
      }
    } catch (e) {}

    return null;
  }

  // ペイロード正規化
  function normalizePayload(raw) {
    var bets = raw.bets || raw.candidates || [];
    var normalizedBets = bets.map(function (b) {
      var combo = b.combination || b.c || (b.first + '-' + b.second + '-' + b.third) || '';
      var parts = combo.split('-');
      var first = b.first || b.f || parseInt(parts[0], 10) || 1;
      var second = b.second || b.sec || parseInt(parts[1], 10) || 2;
      var third = b.third || b.th || parseInt(parts[2], 10) || 3;
      var stake = b.stake || b.s || 100;
      var betType = b.betType || b.t || '3t';
      return {
        first: first,
        second: second,
        third: third,
        combination: combo || (first + '-' + second + '-' + third),
        stake: stake,
        betType: betType,
        odds: b.odds || 0,
      };
    });

    var totalStake = raw.totalStake || normalizedBets.reduce(function (sum, b) { return sum + b.stake; }, 0);

    return {
      venue: raw.venue || '',
      venueCode: raw.venueCode || (VENUE_CODES[raw.venue] || '00'),
      raceNo: raw.raceNo || 1,
      totalStake: totalStake,
      bets: normalizedBets,
      subscriberNo: raw.subscriberNo || '',
      passcode: raw.passcode || '',
      authPassword: raw.authPassword || '',
      betPassword: raw.betPassword || '',
      timestamp: raw.timestamp || Date.now(),
      autoExecute: !!raw.autoExecute,
    };
  }

  // テレボート公式の投票完了画面から受付番号・契約番号を自動検出してアプリへ送信
  function checkAndBroadcastPurchaseCompletion() {
    var bodyText = document.body ? document.body.innerText || '' : '';
    if (
      bodyText.indexOf('投票を受け付けました') !== -1 ||
      bodyText.indexOf('投票完了') !== -1 ||
      bodyText.indexOf('受付番号') !== -1 ||
      bodyText.indexOf('契約番号') !== -1
    ) {
      var match = bodyText.match(/(?:受付番号|契約番号|番号)[^\d]*(\d{6,12})/);
      var receptionNo = match ? match[1] : ('TB-' + Date.now().toString().slice(-8));

      console.log('🎉 [Kyotei Analyzer] テレボート投票購入完了を検知！受付番号:', receptionNo);

      var payload = getPendingVoteData() || {};
      var confirmObj = {
        type: 'KYOTEI_TELEBOAT_PURCHASE_CONFIRMED',
        receptionNo: receptionNo,
        venue: payload.venue || '',
        raceNo: payload.raceNo || 1,
        totalStake: payload.totalStake || 0,
        timestamp: Date.now(),
      };

      try {
        if (typeof GM_setValue !== 'undefined') {
          GM_setValue('kyotei_confirmed_vote', JSON.stringify(confirmObj));
        }
        localStorage.setItem('__kyotei_confirmed_vote__', JSON.stringify(confirmObj));
      } catch (e) {}

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(confirmObj, '*');
        }
      } catch (e) {}

      showTopBanner(
        '🎉 【Kyotei Analyzer】テレボート公式での投票購入が完了しました！<br>' +
        '受付番号: <strong style="color:#fde047;font-size:16px;letter-spacing:1px;">' + receptionNo + '</strong> をアプリへ自動同期しました。'
      );
      return true;
    }
    return false;
  }

  // =========================================================================
  // 3. テレボート画面上へのスマート HUD UI 生成
  // =========================================================================
  var currentPayload = getPendingVoteData();
  var isMinimized = false;

  function renderHUD(payload) {
    var existing = document.getElementById('kyotei-teleboat-hud-root');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.id = 'kyotei-teleboat-hud-root';
    container.style.cssText =
      'position: fixed; bottom: 18px; right: 18px; z-index: 2147483647; ' +
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "BIZ UDPGothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; ' +
      'color: #f8fafc; font-size: 12px; line-height: 1.4; user-select: none;';

    var inner = document.createElement('div');
    inner.id = 'kyotei-teleboat-hud-panel';
    inner.style.cssText =
      'background: #090d16; border: 2px solid #0284c7; border-radius: 12px; ' +
      'padding: 12px 14px; box-shadow: 0 16px 40px rgba(0,0,0,0.85); ' +
      'width: 350px; max-width: calc(100vw - 32px); transition: all 0.2s ease;';

    if (isMinimized) {
      inner.style.width = 'auto';
      inner.style.padding = '8px 12px';
      inner.innerHTML =
        '<div style="display:flex; align-items:center; gap:8px; cursor:pointer;" id="kyotei-hud-expand">' +
        '  <span style="font-size:16px;">🚤</span>' +
        '  <span style="font-weight:900; color:#38bdf8;">Kyotei Analyzer 連携</span>' +
        (payload ? '  <span style="background:#0369a1; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px;">' + payload.venue + ' ' + payload.raceNo + 'R</span>' : '') +
        '</div>';
      container.appendChild(inner);
      document.body.appendChild(container);
      document.getElementById('kyotei-hud-expand').onclick = function () {
        isMinimized = false;
        renderHUD(currentPayload);
      };
      return;
    }

    var titleHtml = payload
      ? '【' + payload.venue + ' 第' + payload.raceNo + 'R】' + payload.bets.length + '点 (¥' + payload.totalStake.toLocaleString() + ')'
      : '買い目待機中（アプリで投票を実行してください）';

    var betsHtml = '';
    if (payload && payload.bets && payload.bets.length > 0) {
      betsHtml = payload.bets
        .map(function (b, idx) {
          return (
            '<div style="display:flex; justify-content:space-between; align-items:center; font-family:monospace; padding:3px 0; border-bottom:1px solid #1e293b66;">' +
            '  <span style="color:#94a3b8;">#' + (idx + 1) + '</span>' +
            '  <span style="font-weight:bold; color:#f8fafc; font-size:13px;">3連単 <span style="color:#fde047;">' + b.combination + '</span></span>' +
            '  <span style="color:#34d399; font-weight:bold;">¥' + b.stake.toLocaleString() + '</span>' +
            '</div>'
          );
        })
        .join('');
    } else {
      betsHtml =
        '<div style="color:#94a3b8; text-align:center; padding:10px 0; font-size:11px;">' +
        '現在、保留中の買い目はありません。<br>Kyotei Analyzer から「実投票」を実行してください。' +
        '</div>';
    }

    var isLoginPage =
      document.querySelector('input[type="password"]') &&
      (document.body.innerText.indexOf('加入者番号') !== -1 || document.body.innerText.indexOf('認証番号') !== -1);

    inner.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:8px; margin-bottom:8px;">' +
      '  <div style="font-weight:900; color:#38bdf8; display:flex; align-items:center; gap:6px; font-size:13px;">' +
      '    <span>🚤 Kyotei Analyzer 連携マネージャー</span>' +
      '  </div>' +
      '  <div style="display:flex; gap:6px;">' +
      '    <button id="kyotei-hud-min" title="最小化" style="background:#1e293b; border:none; color:#cbd5e1; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">−</button>' +
      '    <button id="kyotei-hud-close" title="閉じる" style="background:#1e293b; border:none; color:#cbd5e1; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer;">✕</button>' +
      '  </div>' +
      '</div>' +
      '<div style="font-weight:bold; font-size:12px; color:#f1f5f9; margin-bottom:6px;">' + titleHtml + '</div>' +
      '<div style="background:#0f172a; padding:6px 8px; border-radius:6px; border:1px solid #1e293b; margin-bottom:10px; max-height:120px; overflow-y:auto;">' + betsHtml + '</div>' +
      '<div id="kyotei-hud-status" style="font-size:11px; color:#a7f3d0; background:#064e3b; padding:6px 8px; border-radius:6px; font-weight:bold; text-align:center; margin-bottom:8px;">' +
      (payload ? '⚡ 反映準備完了（下のボタンでベットリストへ投入）' : '待機中') +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:6px;">' +
      (isLoginPage && payload && (payload.subscriberNo || payload.passcode)
        ? '<button id="kyotei-hud-login-btn" style="background:#0d9488; border:none; color:#ffffff; font-weight:bold; font-size:12px; padding:8px 10px; border-radius:6px; cursor:pointer;">' +
          '🔑 保存された認証情報で自動入力ログイン' +
          '</button>'
        : '') +
      (payload
        ? '<button id="kyotei-hud-inject-btn" style="background:linear-gradient(135deg, #0284c7, #0d9488); border:none; color:#ffffff; font-weight:900; font-size:13px; padding:10px 12px; border-radius:6px; cursor:pointer; box-shadow:0 4px 14px rgba(2,132,199,0.4); text-align:center;">' +
          '🚀 ベットリストへ自動入力 & 購入へ進む' +
          '</button>' +
          '<button id="kyotei-hud-submit-btn" style="background:#059669; border:none; color:#ffffff; font-weight:bold; font-size:12px; padding:8px 10px; border-radius:6px; cursor:pointer; display:none;">' +
          '🗳️ 最終【投票（購入）】を実行' +
          '</button>'
        : '') +
      '<div style="display:flex; gap:6px;">' +
      '  <button id="kyotei-hud-clip-btn" style="flex:1; background:#1e293b; border:1px solid #334155; color:#cbd5e1; font-weight:bold; font-size:11px; padding:6px 8px; border-radius:6px; cursor:pointer;">' +
      '    📋 クリップボード貼付' +
      '  </button>' +
      '  <button id="kyotei-hud-nav-btn" style="flex:1; background:#1e293b; border:1px solid #334155; color:#cbd5e1; font-weight:bold; font-size:11px; padding:6px 8px; border-radius:6px; cursor:pointer;">' +
      '    📍 ' + (payload ? payload.venue + payload.raceNo + 'Rへ移動' : 'レース選択') +
      '  </button>' +
      '</div>' +
      '</div>';

    container.appendChild(inner);
    document.body.appendChild(container);

    document.getElementById('kyotei-hud-min').onclick = function () {
      isMinimized = true;
      renderHUD(currentPayload);
    };

    document.getElementById('kyotei-hud-close').onclick = function () {
      container.remove();
    };

    var loginBtn = document.getElementById('kyotei-hud-login-btn');
    if (loginBtn && payload) {
      loginBtn.onclick = function () {
        handleAutoLogin(payload);
      };
    }

    var injectBtn = document.getElementById('kyotei-hud-inject-btn');
    if (injectBtn) {
      injectBtn.onclick = function () {
        executeFullAutoFlow(currentPayload);
      };
    }

    var submitBtn = document.getElementById('kyotei-hud-submit-btn');
    if (submitBtn) {
      submitBtn.onclick = function () {
        executeFinalVoteSubmission(currentPayload);
      };
    }

    document.getElementById('kyotei-hud-clip-btn').onclick = async function () {
      try {
        var text = await navigator.clipboard.readText();
        var parsed = parseFromClipboard(text);
        if (parsed) {
          currentPayload = parsed;
          renderHUD(currentPayload);
          updateHUDStatus('✅ クリップボードから買い目を読み込みました！', '#065f46', '#6ee7b7');
        } else {
          updateHUDStatus('⚠️ 有効な買い目データが見つかりません', '#7f1d1d', '#fca5a5');
        }
      } catch (err) {
        updateHUDStatus('⚠️ クリップボードの読取が許可されていません', '#7f1d1d', '#fca5a5');
      }
    };

    var navBtn = document.getElementById('kyotei-hud-nav-btn');
    if (navBtn && payload) {
      navBtn.onclick = function () {
        navigateToVenueAndRace(payload);
      };
    }
  }

  function handleAutoLogin(payload) {
    if (!payload) return;
    var allInputs = document.querySelectorAll('input');
    allInputs.forEach(function (inp) {
      var name = (inp.name || inp.id || '').toLowerCase();
      var type = (inp.type || '').toLowerCase();
      if ((name.indexOf('kno') !== -1 || name.indexOf('kanyusha') !== -1 || name.indexOf('user') !== -1) && payload.subscriberNo) {
        inp.value = payload.subscriberNo;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if ((name.indexOf('pass') !== -1 || name.indexOf('pin') !== -1) && type === 'password') {
        if (inp.maxLength === 4 && payload.passcode) {
          inp.value = payload.passcode;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (payload.authPassword) {
          inp.value = payload.authPassword;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
    updateHUDStatus('認証情報を入力しました。ログインボタンを押してください', '#065f46', '#6ee7b7');
  }

  function parseFromClipboard(text) {
    if (!text || typeof text !== 'string') return null;
    var trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try { return normalizePayload(JSON.parse(trimmed)); } catch (e) {}
    }
    var lines = trimmed.split(/\r?\n/).filter(function (l) { return l && !l.startsWith('#'); });
    if (lines.length > 0) {
      var bets = [];
      var vCode = '00';
      var rNo = 1;
      lines.forEach(function (l) {
        var parts = l.split(',').map(function (p) { return p.trim(); });
        if (parts.length >= 7) {
          vCode = parts[0];
          rNo = parseInt(parts[1], 10) || 1;
          bets.push({
            first: parseInt(parts[3], 10) || 1,
            second: parseInt(parts[4], 10) || 2,
            third: parseInt(parts[5], 10) || 3,
            combination: parts[3] + '-' + parts[4] + '-' + parts[5],
            stake: parseInt(parts[6], 10) || 100,
            betType: '3t',
          });
        }
      });
      if (bets.length > 0) {
        var venueName = Object.keys(VENUE_CODES).find(function (k) { return VENUE_CODES[k] === vCode; }) || '会場' + vCode;
        return {
          venue: venueName,
          venueCode: vCode,
          raceNo: rNo,
          bets: bets,
          totalStake: bets.reduce(function (s, b) { return s + b.stake; }, 0),
          betPassword: '',
          timestamp: Date.now(),
        };
      }
    }
    return null;
  }

  function updateHUDStatus(text, bg, color) {
    var el = document.getElementById('kyotei-hud-status');
    if (el) {
      el.innerText = text;
      if (bg) el.style.background = bg;
      if (color) el.style.color = color;
    }
  }

  async function navigateToVenueAndRace(payload) {
    if (!payload) return;
    updateHUDStatus('【' + payload.venue + '】を探索中...', '#1e3a8a', '#93c5fd');

    var allLinks = document.querySelectorAll('a, button, div, span, li');
    for (var i = 0; i < allLinks.length; i++) {
      var el = allLinks[i];
      var txt = (el.innerText || el.textContent || '').trim();
      if (txt === payload.venue || txt.indexOf(payload.venue) !== -1 || (payload.venueCode && txt.indexOf(payload.venueCode + '#') !== -1)) {
        var clickable = el.closest('a, button') || el;
        clickable.click();
        updateHUDStatus('【' + payload.venue + '】を開きました。レース番号へ移動中...', '#1e3a8a', '#93c5fd');
        await sleep(500);
        break;
      }
    }

    var targetRaceText = payload.raceNo + 'R';
    var raceButtons = document.querySelectorAll('a, button, div, span, li');
    for (var j = 0; j < raceButtons.length; j++) {
      var rEl = raceButtons[j];
      var rTxt = (rEl.innerText || rEl.textContent || '').trim();
      if (rTxt === targetRaceText || rTxt === '第' + payload.raceNo + 'R' || rTxt === '第' + payload.raceNo + 'レース') {
        var rClickable = rEl.closest('a, button') || rEl;
        rClickable.click();
        updateHUDStatus('【第' + payload.raceNo + 'R】投票画面へ移動しました！', '#065f46', '#6ee7b7');
        await sleep(400);
        break;
      }
    }
  }

  async function executeFullAutoFlow(payload) {
    if (!payload || !payload.bets || payload.bets.length === 0) {
      alert('【Kyotei Analyzer】自動入力対象の買い目がありません');
      return;
    }

    var injectBtn = document.getElementById('kyotei-hud-inject-btn');
    if (injectBtn) {
      injectBtn.disabled = true;
      injectBtn.innerText = '⚡ 自動入力中...';
      injectBtn.style.opacity = '0.6';
    }

    try {
      var fileTextArea = document.querySelector('textarea');
      if (fileTextArea && location.hostname.indexOf('mbrace.or.jp') !== -1) {
        updateHUDStatus('PC版ファイル投票へ全展開中...', '#1e3a8a', '#93c5fd');
        var vCode = payload.venueCode || VENUE_CODES[payload.venue] || '00';
        var lines = payload.bets.map(function (b) {
          return vCode + ',' + payload.raceNo + ',3T,' + b.first + ',' + b.second + ',' + b.third + ',' + b.stake;
        });
        fileTextArea.value = lines.join('\n');
        fileTextArea.dispatchEvent(new Event('input', { bubbles: true }));
        fileTextArea.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);

        var loadBtns = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        for (var lb = 0; lb < loadBtns.length; lb++) {
          var lbTxt = (loadBtns[lb].innerText || loadBtns[lb].value || '').trim();
          if (lbTxt.indexOf('読込') !== -1 || lbTxt.indexOf('展開') !== -1 || lbTxt.indexOf('反映') !== -1) {
            loadBtns[lb].click();
            break;
          }
        }
        updateHUDStatus('✅ PC版ファイル投票へ反映完了！暗証番号を入力し投票してください', '#065f46', '#6ee7b7');
        return;
      }

      updateHUDStatus('1/4: 式別（3連単）を選択中...', '#1e3a8a', '#93c5fd');
      var clickables = document.querySelectorAll('button, a, input, div, span, label, li');
      for (var i = 0; i < clickables.length; i++) {
        var el = clickables[i];
        var text = (el.innerText || el.value || el.textContent || '').trim();
        if (
          text === '3連単' ||
          text === '三連単' ||
          text.indexOf('3連単') !== -1 ||
          el.getAttribute('data-bet-type') === '3T'
        ) {
          el.click();
          break;
        }
      }
      await sleep(350);

      var successCount = 0;
      var totalBets = payload.bets.length;

      for (var idx = 0; idx < payload.bets.length; idx++) {
        var b = payload.bets[idx];
        updateHUDStatus('2/4: 買い目投入 (' + (idx + 1) + '/' + totalBets + ') 3連単 ' + b.combination + '...', '#1e3a8a', '#93c5fd');

        var sel1 = findBoatSelector(1, b.first);
        var sel2 = findBoatSelector(2, b.second);
        var sel3 = findBoatSelector(3, b.third);

        if (sel1) sel1.click();
        await sleep(120);
        if (sel2) sel2.click();
        await sleep(120);
        if (sel3) sel3.click();
        await sleep(140);

        var amtInput = findAmountInput();
        if (amtInput) {
          var isHundredUnit =
            (amtInput.placeholder && amtInput.placeholder.indexOf('百') !== -1) ||
            amtInput.getAttribute('data-unit') === '100' ||
            amtInput.getAttribute('maxlength') === '4';
          var val = isHundredUnit ? Math.max(1, Math.floor(b.stake / 100)) : b.stake;
          amtInput.value = val;
          amtInput.dispatchEvent(new Event('input', { bubbles: true }));
          amtInput.dispatchEvent(new Event('change', { bubbles: true }));
          await sleep(120);
        }

        var addBtn = findAddBetButton();
        if (addBtn) {
          addBtn.click();
          successCount++;
          await sleep(350);
        }
      }

      updateHUDStatus('3/4: ベットリスト確認画面へ遷移中...', '#1e3a8a', '#93c5fd');
      var finishBtn = findFinishInputButton();
      if (finishBtn) {
        finishBtn.click();
        await sleep(450);
      }

      if (payload.betPassword) {
        updateHUDStatus('4/4: 投票暗証番号を入力中...', '#1e3a8a', '#93c5fd');
        var pwdInputs = document.querySelectorAll('input[type="password"]');
        pwdInputs.forEach(function (inp) {
          inp.value = payload.betPassword;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateHUDStatus(
        '🎉 ベットリスト投入完了 (' + successCount + '点 / ¥' + payload.totalStake.toLocaleString() + ')！購入を実行してください',
        '#065f46',
        '#6ee7b7'
      );

      var submitBtn = document.getElementById('kyotei-hud-submit-btn');
      if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.innerText = '🗳️ 最終【投票（購入）】を実行する (¥' + payload.totalStake.toLocaleString() + ')';
      }

      showTopBanner(
        '🚤 【Kyotei Analyzer ➔ テレボート投入完了】 ' +
        payload.venue + ' 第' + payload.raceNo + 'R (' + successCount + '点 / ¥' + payload.totalStake.toLocaleString() + ') をベットリストへ反映しました！<br>' +
        '<span style="color:#fde047;font-weight:bold;">投票用暗証番号を確認し、画面の【投票】ボタンを押して購入を完了してください。</span>'
      );

    } catch (e) {
      console.error('Auto injection error:', e);
      updateHUDStatus('⚠️ 入力エラー: ' + e.message, '#7f1d1d', '#fca5a5');
    } finally {
      if (injectBtn) {
        injectBtn.disabled = false;
        injectBtn.innerText = '🚀 ベットリストへ自動入力 & 購入へ進む';
        injectBtn.style.opacity = '1';
      }
    }
  }

  async function executeFinalVoteSubmission(payload) {
    updateHUDStatus('テレボートへ投票（購入）を送信中...', '#1e3a8a', '#93c5fd');

    if (payload && payload.betPassword) {
      var pwds = document.querySelectorAll('input[type="password"]');
      pwds.forEach(function (p) {
        p.value = payload.betPassword;
        p.dispatchEvent(new Event('input', { bubbles: true }));
        p.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(150);
    }

    var allButtons = document.querySelectorAll('button, a, input[type="submit"], input[type="button"]');
    var voteBtnClicked = false;
    for (var i = 0; i < allButtons.length; i++) {
      var b = allButtons[i];
      var txt = (b.innerText || b.value || '').trim();
      if (txt === '投票' || txt === '投票する' || txt === '投票実行' || b.id === 'btnVote') {
        b.click();
        voteBtnClicked = true;
        break;
      }
    }

    if (voteBtnClicked) {
      updateHUDStatus('投票リクエスト送信完了。公式受付番号を確認中...', '#065f46', '#6ee7b7');
      var checkCount = 0;
      var poll = setInterval(function () {
        checkCount++;
        var finished = checkAndBroadcastPurchaseCompletion();
        if (finished || checkCount > 15) {
          clearInterval(poll);
        }
      }, 800);
    } else {
      updateHUDStatus('⚠️ 画面上の【投票】ボタンを押して購入を確定してください', '#7f1d1d', '#fca5a5');
    }
  }

  function findBoatSelector(rank, boatNumber) {
    var selectors = [
      'input[name*="' + rank + '着"][value="' + boatNumber + '"]',
      'input[name*="r' + rank + '"][value="' + boatNumber + '"]',
      'input[name*="boat' + rank + '"][value="' + boatNumber + '"]',
      'input[name*="chak' + rank + '"][value="' + boatNumber + '"]',
      '[data-rank="' + rank + '"][data-boat="' + boatNumber + '"]',
      '[data-chak="' + rank + '"][data-boat="' + boatNumber + '"]',
      '#btn_' + rank + '_' + boatNumber
    ];

    for (var s = 0; s < selectors.length; s++) {
      var found = document.querySelector(selectors[s]);
      if (found) {
        var labelOrParent = found.closest('label') || found;
        return labelOrParent;
      }
    }

    var rows = document.querySelectorAll('tr, [class*="rank' + rank + '"], [class*="chak' + rank + '"], .row');
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var rowText = (row.innerText || '').slice(0, 15);
      if (rowText.indexOf(rank + '着') !== -1 || rowText.indexOf(rank + '位') !== -1) {
        var btns = row.querySelectorAll('button, input, a, div, span, label');
        for (var b = 0; b < btns.length; b++) {
          var btn = btns[b];
          if ((btn.innerText || btn.value || '').trim() === String(boatNumber)) return btn;
        }
      }
    }

    return document.querySelector('button[value="' + boatNumber + '"], input[value="' + boatNumber + '"]');
  }

  function findAmountInput() {
    return document.querySelector(
      'input[name*="money"], input[name*="amount"], input[name*="bet"], input[name*="kingaku"], input[type="number"], input[placeholder*="金額"], #betAmount, input.amount'
    );
  }

  function findAddBetButton() {
    var candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], div, span');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var txt = (el.innerText || el.value || el.textContent || '').trim();
      if (
        txt === 'ベットリストに追加' ||
        txt.indexOf('ベットリストに追加') !== -1 ||
        txt === 'リストに追加' ||
        txt === 'ベットリストへ' ||
        txt === '追加' ||
        txt === 'セット' ||
        el.id === 'btnSet' ||
        el.id === 'btnAdd' ||
        el.classList.contains('btn-betlist')
      ) {
        return el;
      }
    }
    return null;
  }

  function findFinishInputButton() {
    var candidates = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var txt = (el.innerText || el.value || el.textContent || '').trim();
      if (
        txt === '投票入力完了' ||
        txt.indexOf('投票入力完了') !== -1 ||
        txt === '入力完了' ||
        txt === 'ベットリスト確認' ||
        txt === '投票へ進む'
      ) {
        return el;
      }
    }
    return null;
  }

  function showTopBanner(htmlContent) {
    var banner = document.createElement('div');
    banner.style.cssText =
      'position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483647; ' +
      'background: #020617; color: #38bdf8; border: 2px solid #06b6d4; padding: 14px 24px; border-radius: 10px; ' +
      'font-weight: bold; font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,0.85); text-align: center; max-width: 90vw; line-height: 1.5;';
    banner.innerHTML = htmlContent;
    document.body.appendChild(banner);
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 12000);
  }

  checkAndBroadcastPurchaseCompletion();
  renderHUD(currentPayload);

  if (currentPayload && currentPayload.autoExecute) {
    setTimeout(function () {
      executeFullAutoFlow(currentPayload);
    }, 1200);
  }

  window.addEventListener('hashchange', function () {
    var newPayload = getPendingVoteData();
    if (newPayload) {
      currentPayload = newPayload;
      renderHUD(currentPayload);
    }
  });
})();
