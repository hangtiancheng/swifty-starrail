import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
  ipcMain,
} from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import icon from "../../build/pwa-512x512.png?asset";
import { registerIpcHandlers } from "./service";
import { settingService } from "./service/setting-service";

app.disableHardwareAcceleration();

if (!settingService.getSync().Debug) Menu.setApplicationMenu(null);

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createMainWindow(): void {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 1080,
    minHeight: 720,
    frame: false,
    icon,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (!settingService.getSync().CloseDirectly) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      input.control &&
      input.shift &&
      input.key.toLowerCase() === "i" &&
      settingService.getSync().Debug
    ) {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function createTray(): void {
  if (tray) return;

  // 512px is far too large for a macOS menu bar; scale it down to tray size
  tray = new Tray(
    nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }),
  );
  tray.setToolTip("Star Rail Toolbox");
  tray.on("click", () => {
    if (!mainWindow) return;
    mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
  });
  tray.on("right-click", () => {
    if (!mainWindow) return;
    const menu = Menu.buildFromTemplate([
      {
        label: mainWindow.isVisible() ? "Hide Window" : "Show Window",
        click: () => {
          mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show();
        },
      },
      { label: "Quit", click: () => app.exit(0) },
    ]);
    tray?.popUpContextMenu(menu);
  });
}

// Window control IPC
ipcMain.handle("window:control", (_ev, action: string) => {
  if (!mainWindow) return;
  switch (action) {
    case "close":
      if (settingService.getSync().CloseDirectly) {
        app.exit(0);
      } else {
        mainWindow.hide();
      }
      break;
    case "maximize":
      mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
      break;
    case "minimize":
      mainWindow.minimize();
      break;
    case "hide":
      mainWindow.hide();
      break;
  }
});

// Focus window on second instance
app.on("second-instance", () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
