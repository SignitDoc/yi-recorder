const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe";
let mainWindow;
let ffmpegProcess = null;
let isRecording = false;

// 确保录制目录存在
const recordingsDir = path.join(__dirname, "recordings");
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
    title: "易录屏",
    icon: path.join(__dirname, "assets/logo.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 移除菜单栏
  mainWindow.setMenu(null);

  mainWindow.loadFile("index.html");
  // 开发时打开开发者工具
  mainWindow.webContents.openDevTools(); // 启用开发者工具以查看错误
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// 处理获取屏幕信息的请求
ipcMain.handle("get-screens", () => {
  const displays = screen.getAllDisplays();
  return displays.map((display, index) => {
    return {
      id: index,
      name: `屏幕 ${index + 1}`,
      width: display.bounds.width,
      height: display.bounds.height,
      x: display.bounds.x,
      y: display.bounds.y,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    };
  });
});

// 处理开始录制
ipcMain.on("start-recording", (event, screenInfo) => {
  if (isRecording || ffmpegProcess) {
    console.log("Recording already in progress");
    return;
  }

  const timestamp = Date.now();
  const outputPath = path.join(recordingsDir, `recording-${timestamp}.mp4`);

  // 使用选定屏幕的信息
  const videoSize = `${screenInfo.width}x${screenInfo.height}`;
  const offsetX = screenInfo.x;
  const offsetY = screenInfo.y;

  const ffmpegArgs = [
    "-f",
    "gdigrab",
    "-framerate",
    "30",
    "-video_size",
    videoSize,
    "-offset_x",
    offsetX.toString(),
    "-offset_y",
    offsetY.toString(),
    "-i",
    "desktop",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "baseline",
    "-level",
    "3.0",
    "-bufsize",
    "512k",
    "-maxrate",
    "2000k",
    "-crf",
    "28",
    "-g",
    "60",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
    detached: false,
    windowsHide: true,
  });

  isRecording = true;

  // 通知渲染进程录制已开始
  event.sender.send("recording-started");

  ffmpegProcess.stderr.on("data", (data) => {
    console.log("FFmpeg stderr:", data.toString());
  });

  ffmpegProcess.on("error", (error) => {
    console.error("FFmpeg error:", error);
    isRecording = false;
    ffmpegProcess = null;

    // 通知渲染进程录制出错
    event.sender.send("recording-error", error.toString());
  });

  ffmpegProcess.on("exit", (code, signal) => {
    console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
    isRecording = false;
    ffmpegProcess = null;

    // 验证输出文件
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        fs.unlinkSync(outputPath);
        console.log("Removed empty output file");
        // 通知渲染进程录制出错
        event.sender.send("recording-error", "录制文件为空");
      } else {
        // 通知渲染进程录制完成
        event.sender.send("recording-complete", outputPath);
      }
    }
  });
});

// 处理停止录制
ipcMain.on("stop-recording", () => {
  if (!isRecording || !ffmpegProcess) {
    console.log("No recording in progress");
    return;
  }

  try {
    // 首先尝试发送 'q' 命令来优雅地停止 FFmpeg
    if (ffmpegProcess.stdin) {
      ffmpegProcess.stdin.write("q");
    }

    // 如果 5 秒后进程仍在运行，则强制终止
    setTimeout(() => {
      if (ffmpegProcess) {
        ffmpegProcess.kill("SIGKILL");
      }
    }, 5000);
  } catch (error) {
    console.error("Error stopping FFmpeg:", error);
    if (ffmpegProcess) {
      ffmpegProcess.kill("SIGKILL");
    }
  }
});
