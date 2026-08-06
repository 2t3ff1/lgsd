const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const isDev = !app.isPackaged;
let mainWindow = null;
let petWindow = null;
let tray = null;
let serverPort = 3000;
let isQuitting = false;
let popupWindow = null;
let appBaseUrl = null;

// ── Server startup ──────────────────────────────────────────────────────────

function findFreePort() {
  return new Promise((resolve) => {
    const server = require("net").createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function waitForServer(port, retries = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        resolve();
      });
      req.on("error", () => {
        if (++attempts < retries) setTimeout(check, 500);
        else reject(new Error("Server did not start in time"));
      });
      req.end();
    };
    check();
  });
}

async function startNextServer() {
  serverPort = await findFreePort();
  const appDir = path.join(process.resourcesPath, "app");
  const serverScript = path.join(appDir, "server.js");

  // Run the Next.js standalone server in-process — avoids spawning a child
  // process and eliminates all spawn ENOENT issues on Windows.
  process.env.PORT = String(serverPort);
  process.env.NODE_ENV = "production";
  process.env.HOSTNAME = "127.0.0.1";
  require(serverScript);

  await waitForServer(serverPort);
  return `http://localhost:${serverPort}`;
}

// ── Pet position persistence ─────────────────────────────────────────────────

function petPositionPath() {
  return path.join(app.getPath("userData"), "pet-position.json");
}

function loadPetPosition() {
  try {
    const raw = fs.readFileSync(petPositionPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePetPosition(pos) {
  try {
    fs.writeFileSync(petPositionPath(), JSON.stringify(pos));
  } catch {}
}

// ── Windows ──────────────────────────────────────────────────────────────────

function createMainWindow(baseUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Let's Get Shit Done",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(`${baseUrl}/dashboard`);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

function clampToWorkArea(x, y, w, h) {
  const { screen } = require("electron");
  const display = screen.getDisplayNearestPoint({ x: x + Math.floor(w / 2), y: y + Math.floor(h / 2) });
  const wa = display.workArea;
  // At least half the window must remain on screen
  return {
    x: Math.max(wa.x - Math.floor(w / 2), Math.min(wa.x + wa.width - Math.ceil(w / 2), x)),
    y: Math.max(wa.y - Math.floor(h / 2), Math.min(wa.y + wa.height - Math.ceil(h / 2), y)),
  };
}

function createPetWindow(baseUrl) {
  const saved = loadPetPosition();
  const { width: sw, height: sh } = require("electron").screen.getPrimaryDisplay().workAreaSize;
  let x = sw - 200;
  let y = sh - 260;
  if (saved) {
    const clamped = clampToWorkArea(saved.x, saved.y, 104, 120);
    x = clamped.x;
    y = clamped.y;
  }

  petWindow = new BrowserWindow({
    width: 104,
    height: 120,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-pet.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.loadURL(`${baseUrl}/pet`);
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

  petWindow.on("moved", () => {
    const [x, y] = petWindow.getPosition();
    savePetPosition({ x, y });
  });

  petWindow.on("closed", () => { petWindow = null; });
}

// ── Popup window ─────────────────────────────────────────────────────────────

function openPopupWindow() {
  if (!appBaseUrl || !petWindow) return;
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }
  const [petX, petY] = petWindow.getPosition();
  const [petW, petH] = petWindow.getSize();
  const popupW = 380, popupH = 500;
  const { screen } = require("electron");
  const display = screen.getDisplayNearestPoint({ x: petX + Math.floor(petW / 2), y: petY });
  const wa = display.workArea;

  // Center popup above pet; fall back to below if insufficient space
  let px = petX + Math.floor(petW / 2) - Math.floor(popupW / 2);
  let py = petY - popupH - 8;
  if (py < wa.y) py = petY + petH + 8;
  px = Math.max(wa.x, Math.min(wa.x + wa.width - popupW, px));
  py = Math.max(wa.y, Math.min(wa.y + wa.height - popupH, py));

  popupWindow = new BrowserWindow({
    width: popupW, height: popupH, x: px, y: py,
    transparent: true, frame: false, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload-popup.js"),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  popupWindow.loadURL(`${appBaseUrl}/pet-popup`);
  popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  popupWindow.on("closed", () => { popupWindow = null; });
}

function closePopupWindow() {
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
}

// ── Tray ─────────────────────────────────────────────────────────────────────

function buildTrayIcon() {
  // 16x16 purple square as fallback icon
  const icon = nativeImage.createEmpty();
  try {
    const iconPath = path.join(__dirname, "..", "build", "icon.png");
    if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {}
  return icon;
}

function createTray(baseUrl) {
  tray = new Tray(buildTrayIcon());
  tray.setToolTip("Let's Get Shit Done");

  const updateMenu = (working) => {
    const menu = Menu.buildFromTemplate([
      {
        label: "App öffnen",
        click: () => {
          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          else createMainWindow(baseUrl);
        },
      },
      {
        label: working ? "✅ Ich arbeite jetzt (aktiv)" : "☕ Ich arbeite jetzt",
        click: () => {
          if (petWindow) petWindow.webContents.send("tray:toggle-working");
        },
      },
      { type: "separator" },
      {
        label: "Beenden",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  };

  updateMenu(false);
  tray.on("click", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    else createMainWindow(baseUrl);
  });

  // Allow pet page to update tray working state
  ipcMain.on("pet:working-changed", (_, isWorking) => updateMenu(isWorking));
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle("pet:get-position", () => loadPetPosition());

  ipcMain.handle("pet:set-position", (_, { x, y }) => savePetPosition({ x, y }));

  ipcMain.handle("pet:get-window-pos", () => {
    if (!petWindow) return null;
    const [x, y] = petWindow.getPosition();
    return { x, y };
  });

  ipcMain.on("pet:move-window", (_, { x, y }) => {
    if (petWindow) petWindow.setPosition(Math.round(x), Math.round(y));
  });

  ipcMain.on("pet:move-delta", (_, { dx, dy }) => {
    if (!petWindow) return;
    const [x, y] = petWindow.getPosition();
    const [w, h] = petWindow.getSize();
    const clamped = clampToWorkArea(x + dx, y + dy, w, h);
    petWindow.setPosition(clamped.x, clamped.y);
  });

  ipcMain.on("pet:open-popup", () => openPopupWindow());
  ipcMain.on("popup:close", () => closePopupWindow());
  ipcMain.on("popup:todo-done", () => {
    if (petWindow) petWindow.webContents.send("pet:trigger-dance");
  });

  ipcMain.on("pet:show", () => {
    if (petWindow) petWindow.show();
  });

  ipcMain.on("pet:hide", () => {
    if (petWindow) petWindow.hide();
  });

  ipcMain.handle("pet:is-visible", () => {
    return petWindow ? petWindow.isVisible() : false;
  });

  ipcMain.handle("pet:resize", (_, { w, h }) => {
    if (!petWindow) return;
    const [x, y] = petWindow.getPosition();
    const screen = require("electron").screen;
    const display = screen.getDisplayNearestPoint({ x, y });
    const { height: sh } = display.workArea;
    // Keep bottom-anchored: resize upward
    const newY = Math.max(display.workArea.y, y - (h - petWindow.getSize()[1]));
    petWindow.setSize(w, h);
    petWindow.setPosition(x, newY);
  });
}

// ── Auto-updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on("update-downloaded", () => {
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('electron-update-ready'))`
        );
      }
    });
  } catch {}
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  setupIPC();

  if (isDev) {
    appBaseUrl = "http://localhost:3000";
  } else {
    try {
      appBaseUrl = await startNextServer();
    } catch (err) {
      console.error("Failed to start server:", err);
      app.quit();
      return;
    }
  }

  createMainWindow(appBaseUrl);
  createPetWindow(appBaseUrl);
  createTray(appBaseUrl);
  setupAutoUpdater();
});

app.on("window-all-closed", (e) => {
  // Never quit on window close — only from tray "Beenden"
  e.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
  // Next.js server runs in-process; it exits automatically when Electron quits.
});

app.on("activate", () => {
  if (mainWindow) mainWindow.show();
});
