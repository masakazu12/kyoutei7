// Kyotei Analyzer Pro 5 - Extension Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const autoBuyCb = document.getElementById('auto-buy-cb');
  const betPasswordInput = document.getElementById('bet-password-input');
  const voteSummary = document.getElementById('vote-summary');
  const openTeleboatBtn = document.getElementById('open-teleboat-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');

  // 設定と最新情報の読み込み
  chrome.storage.local.get(['settings', 'pendingVote', 'lastConfirmedPurchase'], (res) => {
    if (res.settings) {
      autoBuyCb.checked = !!res.settings.autoBuyEnabled;
      betPasswordInput.value = res.settings.betPassword || '';
    }

    if (res.pendingVote) {
      const v = res.pendingVote;
      const count = (v.bets || []).length;
      voteSummary.innerHTML = `
        <strong>【${v.venue || 'レース'} 第${v.raceNo || '1'}R】</strong><br>
        3連単 ${count}点 (計 ¥${(v.totalStake || 0).toLocaleString()})
      `;
    } else if (res.lastConfirmedPurchase) {
      const c = res.lastConfirmedPurchase;
      voteSummary.innerHTML = `
        <strong>前回収支確定:</strong><br>
        受付番号: <span style="color:#34d399;font-family:monospace;">${c.receptionNo}</span>
      `;
    }
  });

  // 設定保存
  saveSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(['settings'], (res) => {
      const s = res.settings || {};
      s.autoBuyEnabled = autoBuyCb.checked;
      s.betPassword = betPasswordInput.value.trim();
      chrome.storage.local.set({ settings: s }, () => {
        saveSettingsBtn.innerText = '✅ 保存完了！';
        setTimeout(() => {
          saveSettingsBtn.innerText = '💾 設定を保存';
        }, 1500);
      });
    });
  });

  // テレボート公式PC版を開く
  openTeleboatBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ib.mbrace.or.jp/' });
  });
});
