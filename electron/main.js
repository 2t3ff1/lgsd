const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

const isDev = !app.isPackaged;
let mainWindow = null;
let petWindow = null;
let tray = null;
let nextProcess = null;
let serverPort = 3000;
let isQuitting = false;

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

  nextProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      PORT: String(serverPort),
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
    },
    cwd: appDir,
  });

  nextProcess.stdout.on("data", (d) => process.stdout.write(d));
  nextProcess.stderr.on("data", (d) => process.stderr.write(d));

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

function createPetWindow(baseUrl) {
  const saved = loadPetPosition();
  const { width: sw, height: sh } = require("electron").screen.getPrimaryDisplay().workAreaSize;
  const x = saved?.x ?? sw - 200;
  const y = saved?.y ?? sh - 260;

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

  ipcMain.on("pet:move-window", (_, { x, y }) => {
    if (petWindow) petWindow.setPosition(Math.round(x), Math.round(y));
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

  let baseUrl;
  if (isDev) {
    baseUrl = "http://localhost:3000";
  } else {
    try {
      baseUrl = await startNextServer();
    } catch (err) {
      console.error("Failed to start server:", err);
      app.quit();
      return;
    }
  }

  createMainWindow(baseUrl);
  createPetWindow(baseUrl);
  createTray(baseUrl);
  setupAutoUpdater();
});

app.on("window-all-closed", (e) => {
  // Never quit on window close — only from tray "Beenden"
  e.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (nextProcess) nextProcess.kill();
});

app.on("activate", () => {
  if (mainWindow) mainWindow.show();
});
