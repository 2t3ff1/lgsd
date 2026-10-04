// ── Early crash logger (runs before Electron APIs are available) ──────────────
const fs = require("fs");
const path = require("path");
const os = require("os");

const earlyLogPath = path.join(os.homedir(), "lgsd-debug.log");
function earlyLog(msg) {
  try { fs.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}
try { fs.writeFileSync(earlyLogPath, `=== lgsd-debug (${new Date().toISOString()}) ===\n`); } catch {}
earlyLog("require('electron') starting…");

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
earlyLog("electron loaded");
const http = require("http");

const isDev = !app.isPackaged;
earlyLog(`isDev=${isDev}  execPath=${process.execPath}  resourcesPath=${process.resourcesPath || "(none yet)"}`);
earlyLog(`__dirname=${__dirname}`);

// ── Error logging ─────────────────────────────────────────────────────────────

const logPath = path.join(app.getPath("userData"), "lgsd.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(logPath, line); } catch {}
  console.log(line.trim());
}

// Clear log on each fresh start so it doesn't grow unbounded
try { fs.writeFileSync(logPath, `=== LGSD started (isDev=${isDev}) ===\n`); } catch {}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err.stack || err}`);
});
process.on("unhandledRejection", (reason) => {
  log(`unhandledRejection: ${reason instanceof Error ? reason.stack : reason}`);
});
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

function waitForServer(port, retries = 40) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      // Use 127.0.0.1 explicitly — on Windows, "localhost" may resolve to ::1
      const req = http.get({ hostname: "127.0.0.1", port, path: "/" }, () => {
        earlyLog(`waitForServer: responded after ${attempts} attempts`);
        resolve();
      });
      req.setTimeout(1000, () => req.destroy());
      req.on("error", (err) => {
        if (++attempts < retries) {
          setTimeout(check, 500);
        } else {
          earlyLog(`waitForServer: timed out after ${attempts} attempts — ${err.message}`);
          reject(new Error(`Server did not start in time: ${err.message}`));
        }
      });
      req.end();
    };
    check();
  });
}

async function startNextServer() {
  serverPort = await findFreePort();
  earlyLog(`findFreePort done: port=${serverPort}`);

  const appDir = path.join(process.resourcesPath, "app");
  const serverScript = path.join(appDir, "server.js");

  earlyLog(`appDir=${appDir}  exists=${fs.existsSync(appDir)}`);
  earlyLog(`serverScript=${serverScript}  exists=${fs.existsSync(serverScript)}`);

  // List what's actually in resources/ to diagnose wrong paths
  try {
    const resDir = process.resourcesPath;
    earlyLog(`resources/ contents: ${fs.readdirSync(resDir).join(", ")}`);
    if (fs.existsSync(appDir)) {
      earlyLog(`resources/app/ contents: ${fs.readdirSync(appDir).join(", ")}`);
    }
  } catch (e) { earlyLog(`readdir error: ${e.message}`); }

  if (!fs.existsSync(serverScript)) {
    const msg = `server.js not found at:\n${serverScript}\n\nresourcesPath=${process.resourcesPath}`;
    earlyLog(`FATAL: ${msg}`);
    const { dialog } = require("electron");
    dialog.showErrorBox("LGSD – Server nicht gefunden", msg);
    app.quit();
    throw new Error(msg);
  }

  log(`port=${serverPort}  appDir=${appDir}  script=${serverScript}`);

  process.env.PORT = String(serverPort);
  process.env.NODE_ENV = "production";
  process.env.HOSTNAME = "127.0.0.1";
  earlyLog("calling require(serverScript)…");
  try {
    require(serverScript);
  } catch (e) {
    earlyLog(`require(serverScript) threw: ${e.stack || e}`);
    throw e;
  }
  earlyLog("require returned – waiting for server…");

  await waitForServer(serverPort);
  earlyLog(`server ready at port ${serverPort}`);
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

const PET_INIT_W = 96;   // 1 pet: SLOT_W(80) + GAP(0) + PAD(16)
const PET_INIT_H = 130;  // must match WIN_H in pet/page.tsx

function createPetWindow(baseUrl) {
  const saved = loadPetPosition();
  const { width: sw, height: sh } = require("electron").screen.getPrimaryDisplay().workAreaSize;
  let x = sw - PET_INIT_W - 16;
  let y = sh - PET_INIT_H - 8;
  if (saved) {
    const clamped = clampToWorkArea(saved.x, saved.y, PET_INIT_W, PET_INIT_H);
    x = clamped.x;
    y = clamped.y;
  }

  petWindow = new BrowserWindow({
    width: PET_INIT_W,
    height: PET_INIT_H,
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
    const [oldW, oldH] = petWindow.getSize();
    const { screen } = require("electron");
    const display = screen.getDisplayNearestPoint({ x: x + Math.floor(oldW / 2), y });
    const wa = display.workArea;
    // Keep horizontal center fixed, grow/shrink to both sides
    const centerX = x + Math.floor(oldW / 2);
    let newX = centerX - Math.floor(w / 2);
    // Keep bottom edge fixed, grow upward
    const bottomY = y + oldH;
    let newY = bottomY - h;
    // Clamp within work area
    newX = Math.max(wa.x, Math.min(wa.x + wa.width - w, newX));
    newY = Math.max(wa.y, newY);
    petWindow.setSize(w, h);
    petWindow.setPosition(newX, newY);
  });
}

// ── Auto-updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require("electron-updater");
    const { dialog } = require("electron");

    autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => log("updater: checking for update"));
    autoUpdater.on("update-available", (info) => log(`updater: update available — ${info.version}`));
    autoUpdater.on("update-not-available", () => log("updater: up to date"));
    autoUpdater.on("error", (err) => log(`updater error: ${err.message}`));
    autoUpdater.on("download-progress", (p) =>
      log(`updater: downloading ${Math.round(p.percent)}%`)
    );

    autoUpdater.on("update-downloaded", (info) => {
      log(`updater: downloaded ${info.version} — prompting user`);

      // Notify the renderer so it can show an in-app banner if desired
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(
          `window.dispatchEvent(new CustomEvent('electron-update-ready', { detail: '${info.version}' }))`
        );
      }

      // Show a native dialog asking whether to restart now
      dialog
        .showMessageBox({
          type: "info",
          title: "Update verfügbar",
          message: `Version ${info.version} wurde heruntergeladen.`,
          detail: "Soll die App jetzt neu gestartet werden um das Update zu installieren?",
          buttons: ["Jetzt neu starten", "Später"],
          defaultId: 0,
          cancelId: 1,
        })
        .then(({ response }) => {
          if (response === 0) {
            isQuitting = true;
            autoUpdater.quitAndInstall(false, true);
          }
        });
    });

    autoUpdater.checkForUpdates().catch((err) => log(`updater: checkForUpdates failed — ${err.message}`));
  } catch (err) {
    log(`setupAutoUpdater error: ${err.message}`);
  }
}

// ── Single-instance lock ──────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running — bring its window to front and exit
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    log("app ready");
    setupIPC();
    log("IPC ready");

    if (isDev) {
      appBaseUrl = "http://localhost:3000";
      log("dev mode – skipping server start");
    } else {
      log("starting Next.js server…");
      appBaseUrl = await startNextServer();
      log(`server ready at ${appBaseUrl}`);
    }

    log("creating windows…");
    createMainWindow(appBaseUrl);
    log("main window created");
    createPetWindow(appBaseUrl);
    log("pet window created");
    createTray(appBaseUrl);
    log("tray created");
    setupAutoUpdater();
    log("startup complete");
  } catch (err) {
    log(`FATAL in whenReady: ${err.stack || err}`);
    app.quit();
  }
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
