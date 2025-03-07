const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// FFmpeg路径
const ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe";
// 添加备用路径，以防主路径不可用
const ffmpegPathAlt = path.join(process.resourcesPath, "ffmpeg", "ffmpeg.exe");
let mainWindow;
let ffmpegProcess = null;
let isRecording = false;

// 验证FFmpeg是否存在
function checkFFmpegExists() {
  // 首先检查主路径
  if (fs.existsSync(ffmpegPath)) {
    console.log(`FFmpeg存在于主路径: ${ffmpegPath}`);
    return ffmpegPath;
  }

  // 检查备用路径
  if (fs.existsSync(ffmpegPathAlt)) {
    console.log(`FFmpeg存在于备用路径: ${ffmpegPathAlt}`);
    return ffmpegPathAlt;
  }

  console.error(`FFmpeg不存在于任何已知路径`);
  return false;
}

// 测试FFmpeg是否能正常工作
function testFFmpeg() {
  const validPath = checkFFmpegExists();
  if (!validPath) {
    console.error("FFmpeg不存在，无法进行测试");
    return false;
  }

  console.log("正在测试FFmpeg...");
  const testProcess = spawn(validPath, ["-version"], {
    windowsHide: true,
  });

  testProcess.stdout.on("data", (data) => {
    console.log("FFmpeg版本信息:", data.toString());
  });

  testProcess.stderr.on("data", (data) => {
    console.error("FFmpeg测试错误:", data.toString());
  });

  testProcess.on("exit", (code) => {
    if (code === 0) {
      console.log("FFmpeg测试成功");
      return true;
    } else {
      console.error(`FFmpeg测试失败，退出码: ${code}`);
      return false;
    }
  });
}

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

  // 测试FFmpeg
  testFFmpeg();

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
  const primaryDisplay = screen.getPrimaryDisplay();

  console.log("所有显示器:", displays);
  console.log("主显示器:", primaryDisplay);

  return displays.map((display, index) => {
    return {
      id: index,
      name: `屏幕 ${index + 1}`,
      width: display.bounds.width,
      height: display.bounds.height,
      x: display.bounds.x,
      y: display.bounds.y,
      isPrimary: display.id === primaryDisplay.id,
    };
  });
});

// 处理开始录制
ipcMain.on("start-recording", (event, screenInfo) => {
  if (isRecording || ffmpegProcess) {
    console.log("Recording already in progress");
    return;
  }

  // 验证FFmpeg是否存在
  const validFFmpegPath = checkFFmpegExists();
  if (!validFFmpegPath) {
    event.sender.send(
      "recording-error",
      "FFmpeg不存在，请确保已正确安装FFmpeg"
    );
    return;
  }

  // 验证屏幕信息
  if (
    !screenInfo ||
    typeof screenInfo.width !== "number" ||
    typeof screenInfo.height !== "number" ||
    typeof screenInfo.x !== "number" ||
    typeof screenInfo.y !== "number"
  ) {
    console.error("无效的屏幕信息:", screenInfo);
    event.sender.send("recording-error", "无效的屏幕信息，请重新选择屏幕");
    return;
  }

  // 最小化窗口
  if (mainWindow) {
    mainWindow.minimize();
  }

  const timestamp = Date.now();
  const outputPath = path.join(recordingsDir, `recording-${timestamp}.mp4`);

  // 使用选定屏幕的信息
  const videoSize = `${screenInfo.width}x${screenInfo.height}`;
  const offsetX = screenInfo.x;
  const offsetY = screenInfo.y;

  // 为副屏幕录制添加调试信息
  console.log("开始录制屏幕:", screenInfo);
  console.log("视频尺寸:", videoSize);
  console.log("偏移量 X:", offsetX, "Y:", offsetY);

  // 优化FFmpeg参数，提高录制稳定性
  const ffmpegArgs = [
    // 输入选项
    "-f",
    "gdigrab",
    "-framerate",
    "30",
    "-offset_x",
    offsetX.toString(),
    "-offset_y",
    offsetY.toString(),
    "-video_size",
    videoSize,
    "-draw_mouse",
    "1", // 显示鼠标
    "-i",
    "desktop",

    // 视频编码选项
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast", // 使用最快的编码预设
    "-tune",
    "zerolatency", // 优化低延迟
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "28", // 稍微降低质量以提高性能
    "-r",
    "30", // 确保输出帧率
    "-g",
    "60", // 关键帧间隔

    // 确保视频尺寸是偶数
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",

    // 缓冲区设置
    "-bufsize",
    "5M",

    // 输出选项
    "-movflags",
    "+faststart", // 优化MP4文件结构
    "-y",
    outputPath,
  ];

  console.log("FFmpeg命令:", validFFmpegPath, ffmpegArgs.join(" "));

  // 确保FFmpeg进程有标准输入流，并设置更高的进程优先级
  ffmpegProcess = spawn(validFFmpegPath, ffmpegArgs, {
    detached: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    // 设置高优先级
    priority: "high",
  });

  isRecording = true;

  // 通知渲染进程录制已开始
  event.sender.send("recording-started");

  // 收集FFmpeg输出的错误信息
  let ffmpegErrorOutput = "";
  let ffmpegOutput = "";

  // 捕获标准输出
  ffmpegProcess.stdout.on("data", (data) => {
    const output = data.toString();
    ffmpegOutput += output;
    console.log("FFmpeg stdout:", output);
  });

  // 捕获错误输出
  ffmpegProcess.stderr.on("data", (data) => {
    const output = data.toString();
    ffmpegErrorOutput += output;
    console.log("FFmpeg stderr:", output);

    // 检查常见错误模式
    if (
      output.includes("Invalid argument") ||
      output.includes("Could not open encoder") ||
      output.includes("Error initializing output stream")
    ) {
      console.error("检测到FFmpeg编码器错误，可能是视频尺寸问题");
    }

    // 检查性能问题
    if (output.includes("speed=") && output.includes("x")) {
      const speedMatch = output.match(/speed=([0-9.]+)x/);
      if (speedMatch && parseFloat(speedMatch[1]) < 0.5) {
        console.warn("FFmpeg录制速度过慢，可能影响录制质量");
      }
    }
  });

  ffmpegProcess.on("exit", (code, signal) => {
    console.log(`FFmpeg exited with code ${code} and signal ${signal}`);
    isRecording = false;
    ffmpegProcess = null;

    // 恢复窗口（如果已最小化）
    if (mainWindow && mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    // 验证输出文件
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size === 0 || stats.size < 1000) {
        // 文件为空或太小
        fs.unlinkSync(outputPath);
        console.log("Removed empty or too small output file");

        // 分析错误信息
        let errorMsg = "录制文件为空或无效。";
        if (ffmpegErrorOutput) {
          // 检查特定错误模式
          if (
            ffmpegErrorOutput.includes("Invalid argument") ||
            ffmpegErrorOutput.includes("Could not open encoder")
          ) {
            errorMsg += `FFmpeg编码器错误: 可能是视频尺寸不是偶数或不支持的分辨率。详细信息: ${ffmpegErrorOutput.slice(
              -500
            )}`;
          } else {
            errorMsg += `FFmpeg错误: ${ffmpegErrorOutput.slice(-500)}`;
          }
        } else {
          errorMsg += "未收到FFmpeg错误信息";
        }

        // 通知渲染进程录制出错
        event.sender.send("recording-error", errorMsg);
      } else {
        // 通知渲染进程录制完成
        event.sender.send("recording-complete", outputPath);
      }
    } else {
      // 输出文件不存在
      let errorMsg = "未生成录制文件。";
      if (ffmpegErrorOutput) {
        // 检查特定错误模式
        if (
          ffmpegErrorOutput.includes("Invalid argument") ||
          ffmpegErrorOutput.includes("Could not open encoder")
        ) {
          errorMsg += `FFmpeg编码器错误: 可能是视频尺寸不是偶数或不支持的分辨率。详细信息: ${ffmpegErrorOutput.slice(
            -500
          )}`;
        } else {
          errorMsg += `FFmpeg错误: ${ffmpegErrorOutput.slice(-500)}`;
        }
      } else {
        errorMsg += "未收到FFmpeg错误信息";
      }

      event.sender.send("recording-error", errorMsg);
    }
  });

  ffmpegProcess.on("error", (error) => {
    console.error("FFmpeg spawn error:", error);
    isRecording = false;
    ffmpegProcess = null;

    // 恢复窗口（如果已最小化）
    if (mainWindow && mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    // 通知渲染进程录制出错
    event.sender.send("recording-error", `FFmpeg启动错误: ${error.toString()}`);
  });
});

// 处理停止录制
ipcMain.on("stop-recording", () => {
  if (!isRecording || !ffmpegProcess) {
    console.log("No recording in progress");
    return;
  }

  console.log("正在停止录制...");

  // 恢复窗口
  if (mainWindow && mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  try {
    // 设置一个标志，表示我们正在尝试停止录制
    const stoppingTime = Date.now();

    // 首先尝试发送 'q' 命令来优雅地停止 FFmpeg
    if (ffmpegProcess.stdin) {
      ffmpegProcess.stdin.write("q");
      ffmpegProcess.stdin.end();
      console.log("已发送停止命令到FFmpeg");
    }

    // 如果 5 秒后进程仍在运行，则强制终止
    const killTimeout = setTimeout(() => {
      if (ffmpegProcess) {
        console.log(
          `FFmpeg进程在 ${
            (Date.now() - stoppingTime) / 1000
          } 秒后仍在运行，强制终止`
        );
        try {
          ffmpegProcess.kill("SIGKILL");
        } catch (killError) {
          console.error("强制终止FFmpeg时出错:", killError);
        }
      }
    }, 5000);

    // 添加一个退出监听器，如果进程正常退出，清除超时
    ffmpegProcess.on("exit", () => {
      clearTimeout(killTimeout);
    });
  } catch (error) {
    console.error("Error stopping FFmpeg:", error);
    if (ffmpegProcess) {
      try {
        ffmpegProcess.kill("SIGKILL");
      } catch (killError) {
        console.error("强制终止FFmpeg时出错:", killError);
      }
    }
  }
});

// 处理保存录制文件到自定义目录
ipcMain.handle("save-recording-as", async (event, sourcePath) => {
  try {
    // 检查源文件是否存在
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: "源文件不存在" };
    }

    // 打开保存对话框
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "保存录制视频",
      defaultPath: path.join(app.getPath("videos"), path.basename(sourcePath)),
      filters: [
        { name: "视频文件", extensions: ["mp4"] },
        { name: "所有文件", extensions: ["*"] },
      ],
      properties: ["createDirectory"],
    });

    // 如果用户取消了对话框
    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const targetPath = result.filePath;

    // 复制文件到新位置
    fs.copyFileSync(sourcePath, targetPath);

    // 删除原始文件
    fs.unlinkSync(sourcePath);

    return {
      success: true,
      path: targetPath,
    };
  } catch (error) {
    console.error("保存文件时出错:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// 处理窗口最小化
ipcMain.on("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// 处理窗口恢复
ipcMain.on("restore-window", () => {
  if (mainWindow) {
    mainWindow.restore();
  }
});
