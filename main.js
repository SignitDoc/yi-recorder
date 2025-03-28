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
const { exec } = require("child_process");
const os = require("os");
const ffmpegPath = require("ffmpeg-static");

// 获取FFmpeg可执行文件路径
function getFfmpegPath() {
  return ffmpegPath;
}

// 隐藏菜单栏
Menu.setApplicationMenu(null);

let mainWindow;

function createWindow() {
  // 检查preload脚本是否存在
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Preload脚本路径:", preloadPath);
  console.log("Preload脚本存在:", fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 600,
    height: 380,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // 禁用沙盒以允许更多功能
      // 允许访问媒体设备和捕获系统音频
      audioCapturerEnabled: true,
    },
    icon: path.join(__dirname, "assets/logo.ico"),
  });

  mainWindow.loadFile("index.html");

  // 开发时打开开发者工具
  // mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 添加应用启动参数，允许录制系统音频
app.commandLine.appendSwitch("enable-features", "WebRTCAudioCapturing");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

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
    const { screen } = require("electron");
    const displays = screen.getAllDisplays();
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 100, height: 100 },
    });
    
    sources.forEach((source,index) => {
      source.displaySize = `${displays[index].size.width}x${displays[index].size.height}`;
     
      
    })
    
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
    defaultPath: `recording-${Date.now()}.mp4`,
    filters: [{ name: "MP4 文件", extensions: ["mp4"] }],
  });

  if (filePath) {
    // 创建临时WebM文件
    const tempDir = os.tmpdir();
    const tempWebmPath = path.join(tempDir, `temp-${Date.now()}.webm`);
    const tempMp4Path = path.join(tempDir, `temp-${Date.now()}.mp4`);

    // 先保存WebM文件
    fs.writeFile(tempWebmPath, buffer, async (err) => {
      if (err) {
        console.error("保存临时WebM文件失败:", err);
        event.reply("save-recording-response", {
          success: false,
          message: "保存失败",
        });
        return;
      }

      try {
        console.log("使用的FFmpeg路径:", getFfmpegPath());
        const ffmpegPath = getFfmpegPath();
        if (!fs.existsSync(ffmpegPath)) {
          throw new Error("找不到FFmpeg可执行文件: " + ffmpegPath);
        }

        // 使用FFmpeg转换WebM为MP4
        await new Promise((resolve, reject) => {
          exec(
            `"${ffmpegPath}" -i "${tempWebmPath}" -c:v libx264 -preset medium -crf 23 "${tempMp4Path}"`,
            (error, stdout, stderr) => {
              if (error) {
                console.error("FFmpeg错误:", error);
                console.error("FFmpeg输出:", stderr);
                reject(error);
                return;
              }
              resolve();
            }
          );
        });

        // 将转换后的MP4文件移动到目标位置
        fs.renameSync(tempMp4Path, filePath);

        // 清理临时文件
        fs.unlinkSync(tempWebmPath);

        event.reply("save-recording-response", {
          success: true,
          message: "保存成功",
          filePath,
        });
      } catch (error) {
        console.error("转换视频格式失败:", error);
        // 清理临时文件
        try {
          fs.unlinkSync(tempWebmPath);
          if (fs.existsSync(tempMp4Path)) {
            fs.unlinkSync(tempMp4Path);
          }
        } catch (cleanupError) {
          console.error("清理临时文件失败:", cleanupError);
        }
        event.reply("save-recording-response", {
          success: false,
          message: "转换视频格式失败: " + error.message,
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

// 处理最小化窗口请求
ipcMain.on("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});
