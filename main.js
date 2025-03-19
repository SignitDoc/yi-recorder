const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  desktopCapturer,
} = require("electron");
const path = require("path");
const fs = require("fs");

// 隐藏菜单栏
Menu.setApplicationMenu(null);

let mainWindow;

function createWindow() {
  // 检查preload脚本是否存在
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Preload脚本路径:", preloadPath);
  console.log("Preload脚本存在:", fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // 禁用沙盒以允许更多功能
    },
    icon: path.join(__dirname, "assets/logo.ico"),
  });

  mainWindow.loadFile("index.html");

  // 开发时打开开发者工具
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理获取屏幕源
ipcMain.handle("get-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 100, height: 100 },
    });
    return sources;
  } catch (error) {
    console.error("获取屏幕源出错：", error);
    throw error;
  }
});

// 处理保存录制文件
ipcMain.on("save-recording", async (event, buffer) => {
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "保存视频",
    defaultPath: `recording-${Date.now()}.webm`,
    filters: [{ name: "WebM 文件", extensions: ["webm"] }],
  });

  if (filePath) {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error("保存录像失败:", err);
        event.reply("save-recording-response", {
          success: false,
          message: "保存失败",
        });
      } else {
        event.reply("save-recording-response", {
          success: true,
          message: "保存成功",
          filePath,
        });
      }
    });
  } else {
    event.reply("save-recording-response", {
      success: false,
      message: "保存取消",
    });
  }
});
