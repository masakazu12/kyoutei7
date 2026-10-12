const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#020617',
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    title: 'Kyotei Analyzer Pro 5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set Windows application menu
  const menuTemplate = [
    {
      label: 'ファイル',
      submenu: [
        { label: '最新情報に更新', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: '終了', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: '表示',
      submenu: [
        { label: 'ズームイン', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'ズームアウト', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'ズームリセット', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'フルスクリーン切替', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'バージョン情報',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Kyotei Analyzer Pro 5',
              message: 'Kyotei Analyzer Pro 5 (Ver. 1.0)',
              detail: 'Windows 10 / 11 対応 競艇予想・資金配分・収支シミュレーション投票支援アプリケーション\n(C) 2026 Kyotei Analyzer Project',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
