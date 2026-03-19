const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let mainWindow = null;
let tray = null;
let serverProcess = null;
const PORT = 3000;

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function startServer() {
  return new Promise((resolve, reject) => {
    // Fork the server as a child process using ts-node
    const serverPath = path.join(__dirname, "src", "server", "index.ts");
    serverProcess = fork(serverPath, [], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(PORT) },
      execArgv: ["-r", "ts-node/register"],
      silent: true,
    });

    let started = false;

    serverProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[server]", msg.trim());
      if (!started && msg.includes("running at")) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      console.error("[server]", data.toString().trim());
    });

    serverProcess.on("error", (err) => {
      if (!started) reject(err);
    });

    serverProcess.on("exit", (code) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });

    // Timeout fallback — assume server is ready after 3s
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 3000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "SF Reels Generator",
    backgroundColor: "#0d1117",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}/dashboard`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (e) => {
    // On macOS, hide to tray instead of quitting
    if (process.platform === "darwin" && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Build menu
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        { label: "New Project", accelerator: "CmdOrCtrl+N", click: () => mainWindow?.webContents.executeJavaScript("showNewProject()") },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function createTray() {
  // Create a simple 16x16 tray icon
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVQ4y2P4////fwYKABMDlQCjAUzIHAYGBob/MAYyH10crQsiR0PgjwYMKgP+D1sDGNAN+A9j4JJH1oXMRhfHZQBJBjCRagBZGcmIIYknM1EjL44aQFUDAACsNBFR7nehAAAAAElFTkSuQmCC"
  );

  tray = new Tray(icon);
  tray.setToolTip("SF Reels Generator");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Window", click: () => mainWindow?.show() },
    { type: "separator" },
    { label: "Quit", click: () => { app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
    }
  });
}

app.whenReady().then(async () => {
  console.log("Starting SF Reels server...");
  await startServer();
  console.log("Server ready, opening window...");
  createWindow();
  createTray();

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
