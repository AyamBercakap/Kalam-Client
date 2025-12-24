const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');
const { protocol } = require('electron');

let mainWindow;
let tray = null;
const userDataPath = path.join(__dirname, 'user_data.json');

const ribbonPath = path.resolve(__dirname, 'ribbon.js');
console.log('Looking for ribbon at:', ribbonPath);

let ribbonModule;
try {
  ribbonModule = require(ribbonPath);
  console.log('Ribbon module loaded successfully');
} catch (err) {
  console.error('Failed to load ribbon module:', err);
  ribbonModule = {
    injectPersistentRibbon: () => console.log('Ribbon injection skipped'),
  };
}
const { injectPersistentRibbon } = ribbonModule;

// Initialize user data file if it doesn't exist
function initUserData() {
  if (!fs.existsSync(userDataPath)) {
    const defaultData = {
      password: '',
      image: '',
      username: 'rc24175',
    };
    fs.writeFileSync(userDataPath, JSON.stringify(defaultData, null, 2));
  }
}

// Handle Username n password update
ipcMain.on('update-username', (event, newUsername) => {
  try {
    const data = JSON.parse(fs.readFileSync(userDataPath));
    data.username = newUsername;
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
    console.log('Username updated to:', newUsername);
  } catch (err) {
    console.error('Error updating username:', err);
  }
});
ipcMain.on('update-password', (event, newPass) => {
  try {
    const data = JSON.parse(fs.readFileSync(userDataPath));
    data.password = newPass;
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
    console.log('Password updated');
  } catch (err) {
    console.error('Error updating password:', err);
  }
});

// Handle profile image update
ipcMain.on('update-image', (event, base64Image) => {
  try {
    console.log('Received image update request');

    // Extract base64 data
    const matches = base64Image.match(
      /^data:image\/([A-Za-z-+\/]+);base64,(.+)$/
    );
    if (!matches || matches.length !== 3) {
      console.error('Invalid base64 image data');
      return;
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Save to file
    const imgDir = path.join(__dirname, 'build');
    const savePath = path.join(imgDir, 'profile.png');

    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
    }

    // Save the image
    fs.writeFileSync(savePath, buffer);

    // Update user data
    const data = JSON.parse(fs.readFileSync(userDataPath));
    data.image = savePath;
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    console.log('Image saved to:', savePath);

    // Update profile image in current window
    if (mainWindow) {
      updateProfileImage(savePath);
    }
  } catch (err) {
    console.error('Error updating image:', err);
  }
});

// Open settings modal
ipcMain.on('open-settings', () => {
  openSettingsModal();
});

function openSettingsModal() {
  const modal = new BrowserWindow({
    width: 400,
    height: 500,
    frame: true,
    resizable: false,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const settingsPath = path.join(__dirname, 'settings.html');
  modal.loadFile(settingsPath);
}

function createWindow() {
  // Initialize user data
  initUserData();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    frame: false,
    icon: path.join(__dirname, 'build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setTitle('Kalam Client');
  mainWindow.loadURL('https://kalam.umpsa.edu.my/login/index.php');
  createTray();

  mainWindow.webContents.on('did-finish-load', () => {
    // Read user data
    let userData;
    try {
      userData = JSON.parse(fs.readFileSync(userDataPath));
    } catch (err) {
      console.error('Error reading user data:', err);
      userData = { password: '', image: '' };
    }

    // Inject ribbon
    injectRibbon();

    // autologin
    setTimeout(() => {
      attemptLogin(userData);
    }, 500);

    // Update profile image if exists
    if (userData.image && fs.existsSync(userData.image)) {
      setTimeout(() => {
        updateProfileImage(userData.image);
      }, 1000);
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

// override profile image in Kalam
function updateProfileImage() {
  const jsCode = `
    (function () {
      const imgPath = "kalam://profile.png?v=" + Date.now();

      const tryUpdate = () => {
        // <img> avatar
        const img =
          document.querySelector('img.userpicture') ||
          document.querySelector('.useravatar img') ||
          document.querySelector('img[alt*="Picture"]');

        if (img && img.src !== imgPath) {
          img.src = imgPath;
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          img.dataset.customProfile = 'true';
          return true;
        }

        // initials avatar
        const avatar = document.querySelector('.avatar.current');
        if (avatar && !avatar.dataset.customProfile) {
          avatar.style.backgroundImage = \`url("\${imgPath}")\`;
          avatar.style.backgroundSize = 'cover';
          avatar.style.backgroundPosition = 'center';
          avatar.style.borderRadius = '50%';
          avatar.style.width = '35px';
          avatar.style.height = '35px';
          avatar.style.display = 'inline-flex';
          avatar.style.alignItems = 'center';
          avatar.style.justifyContent = 'center';

          const initials = avatar.querySelector('.userinitials');
          if (initials) initials.style.display = 'hidden';
          initials.style.opacity = '0';

          avatar.dataset.customProfile = 'true';
          return true;
        }

        return false;
      };

      if (tryUpdate()) return;

      const observer = new MutationObserver(tryUpdate);
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => observer.disconnect(), 30000);
    })();
  `;

  mainWindow.webContents.executeJavaScript(jsCode);
}

// Tray
function createTray() {
  const iconPath = path.join(__dirname, 'build/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show app', click: () => mainWindow.show() },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Kalam Client');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}

// Inject Ribbon
function injectRibbon() {
  injectPersistentRibbon(mainWindow);
}
// Auto login attempt
function attemptLogin(userData) {
  if (!userData.password) return;

  const loginJS = `
    (function() {
      setTimeout(() => {
        const user = document.querySelector('#username');
        const pass = document.querySelector('#password');
        const btn = document.querySelector('#loginbtn');
        
        if (user && pass && btn) {
          user.value = 'rc24175';
          pass.value = '${userData.password.replace(/'/g, "\\'")}';
          btn.click();
        }
      }, 100);
    })();
  `;

  mainWindow.webContents.executeJavaScript(loginJS).catch((err) => {
    console.log('Auto-login attempt:', err);
  });
}

// Menu
const menuTemplate = [
  {
    label: 'App',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => mainWindow.reload(),
      },
      {
        label: 'Toggle DevTools',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: () => mainWindow.webContents.openDevTools(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ],
  },
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'kalam',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.whenReady().then(() => {
  protocol.handle('kalam', async (request) => {
    const url = request.url.replace('kalam://', '').split('?')[0];
    const filePath = path.join(__dirname, 'build', url);

    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }

    const data = fs.readFileSync(filePath);

    return new Response(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app running in background in tray
  }
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
// debug ipc handler
ipcMain.on('minimize', () => {
  console.log('Test minimize received');
  mainWindow.minimize();
});

ipcMain.on('close', () => {
  console.log('Test close received');
  mainWindow.close();
});
ipcMain.on('settings-saved', () => {
  // Reload the main window
  if (mainWindow) {
    mainWindow.webContents.reload();
  }
});
