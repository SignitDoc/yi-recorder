// DOM元素
const recordBtn = document.getElementById("recordBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const saveBtn = document.getElementById("saveBtn");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");
const recordAudioCheckbox = document.getElementById("recordAudio");
const maxDurationInput = document.getElementById("maxDuration");
const loadingOverlay = document.getElementById("loadingOverlay");
const videoPreviewContainer = document.getElementById("videoPreviewContainer");
const videoPreview = document.getElementById("videoPreview");
let selectedSource = null;

// 录制状态变量
let mediaRecorder;
let recordedChunks = [];
let stream;
let startTime;
let pausedTime = 0;
let totalPausedTime = 0;
let lastPauseTime = 0;
let isPaused = false;
let timerInterval;
let maxDurationMs = 0; // 最大录制时长（毫秒）
let maxDurationTimer = null; // 最大录制时长定时器

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // 检查API是否可用
  console.log("API可用性检查:", !!window.electronAPI);
  if (window.electronAPI) {
    console.log("可用的API:", Object.keys(window.electronAPI));
  }

  recordBtn.addEventListener("click", startRecording);
  pauseBtn.addEventListener("click", togglePauseRecording);
  stopBtn.addEventListener("click", stopRecording);
  saveBtn.addEventListener("click", saveRecording);

  // 设置保存响应处理
  window.electronAPI.onSaveComplete(handleSaveResponse);
});

// 启动录制
async function startRecording() {
  try {
    // 隐藏视频预览
    videoPreviewContainer.style.display = "none";

    // 获取最大录制时长设置（分钟）
    const maxDurationMinutes = parseInt(maxDurationInput.value, 10) || 0;
    maxDurationMs = maxDurationMinutes * 60 * 1000; // 转换为毫秒

    // 清除之前的最大时长定时器（如果有）
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }

    statusElement.textContent = "正在获取屏幕源...";

    // 获取可用的屏幕源
    const sources = await window.electronAPI.captureScreen();
    if (!sources || sources.length === 0) {
      throw new Error("找不到可用的屏幕源");
    }

    // 只有一个屏幕时自动选择，多个屏幕时显示前端对话框
    recordBtn.disabled = true;
    if (sources.length === 1) {
      statusElement.textContent = "检测到单个屏幕，自动选择...";
      selectedSource = sources[0];
    } else {
      statusElement.textContent = "请选择要录制的屏幕";
      selectedSource = await showScreenSelectionDialog(sources);
      if (!selectedSource) {
        statusElement.textContent = "已取消屏幕选择";
        recordBtn.disabled = false;
        return;
      }
    }

    statusElement.textContent = "准备开始录制...";
    await showCountdown(3);

    // 设置媒体约束
    const constraints = {
      audio: recordAudioCheckbox.checked
        ? {
            mandatory: {
              chromeMediaSource: "desktop",
            },
          }
        : false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: selectedSource.id,
        },
      },
    };

    console.log("使用的媒体约束:", JSON.stringify(constraints));

    // 获取媒体流
    stream = await navigator.mediaDevices.getUserMedia(constraints);

    // 创建MediaRecorder实例
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });

    // 收集录制的数据
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    // 录制结束处理
    mediaRecorder.onstop = () => {
      stopTimer();
      statusElement.textContent = `录制已完成。${
        recordAudioCheckbox.checked ? "包含系统声音。" : ""
      }可以保存录制内容。`;
    };

    // 开始录制
    mediaRecorder.start(100);
    startTimer();

    // 设置最大录制时长定时器（如果设置了最大时长）
    if (maxDurationMs > 0) {
      maxDurationTimer = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          // 显示应用窗口
          window.electronAPI.showWindow();

          // 停止录制
          stopRecording();

          // 提示用户已达到最大录制时长
          statusElement.textContent = `已达到最大录制时长 ${maxDurationMinutes} 分钟，录制已自动停止。`;
        }
      }, maxDurationMs);
    }

    // 更新UI状态
    recordBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
    saveBtn.disabled = true; // 录制中禁用保存按钮
    recordAudioCheckbox.disabled = true;
    maxDurationInput.disabled = true; // 录制中禁用最大时长设置
    recordBtn.classList.add("recording");
    recordBtn.textContent = "正在录制";
    pauseBtn.textContent = "暂停录制";
    pauseBtn.classList.remove("paused");
    isPaused = false;
    totalPausedTime = 0;

    // 更新状态信息，包括最大录制时长
    let statusText = `正在录制屏幕${recordAudioCheckbox.checked ? "和系统声音" : ""}`;
    if (maxDurationMs > 0) {
      statusText += `，最大录制时长: ${maxDurationMinutes} 分钟`;
    }
    statusElement.textContent = statusText + "...";

    // 最小化窗口并开始录制
    window.electronAPI.minimizeWindow();
  } catch (error) {
    console.error("启动录制时出错:", error);
    statusElement.textContent = `录制失败: ${error.message}`;
    recordAudioCheckbox.disabled = false;
    maxDurationInput.disabled = false;
  }
}

// 暂停/继续录制
function togglePauseRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return;
  }

  if (isPaused) {
    // 继续录制
    resumeRecording();
  } else {
    // 暂停录制
    pauseRecording();
  }
}

// 暂停录制
function pauseRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") {
    return;
  }

  // 暂停 MediaRecorder
  mediaRecorder.pause();

  // 记录暂停时间
  lastPauseTime = Date.now();

  // 暂停计时器
  stopTimer();

  // 如果设置了最大录制时长，暂停定时器
  if (maxDurationTimer) {
    clearTimeout(maxDurationTimer);
    // 计算剩余时间
    const elapsedTime = Date.now() - startTime - totalPausedTime;
    const remainingTime = Math.max(0, maxDurationMs - elapsedTime);
    // 保存剩余时间
    maxDurationMs = remainingTime;
  }

  // 更新UI状态
  pauseBtn.textContent = "继续录制";
  pauseBtn.classList.add("paused");
  statusElement.textContent = "录制已暂停";
  isPaused = true;
}

// 继续录制
function resumeRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "paused") {
    return;
  }

  // 继续 MediaRecorder
  mediaRecorder.resume();

  // 计算暂停时间
  const currentTime = Date.now();
  const pauseDuration = currentTime - lastPauseTime;
  totalPausedTime += pauseDuration;

  // 继续计时器
  startTimer();

  // 如果设置了最大录制时长，重新设置定时器
  if (maxDurationMs > 0) {
    maxDurationTimer = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        // 显示应用窗口
        window.electronAPI.showWindow();

        // 停止录制
        stopRecording();

        // 提示用户已达到最大录制时长
        const maxDurationMinutes = Math.ceil(maxDurationMs / (60 * 1000));
        statusElement.textContent = `已达到最大录制时长 ${maxDurationMinutes} 分钟，录制已自动停止。`;
      }
    }, maxDurationMs);
  }

  // 更新UI状态
  pauseBtn.textContent = "暂停录制";
  pauseBtn.classList.remove("paused");

  // 更新状态信息，包括最大录制时长
  let statusText = `继续录制屏幕${recordAudioCheckbox.checked ? "和系统声音" : ""}`;
  if (maxDurationMs > 0) {
    const maxDurationMinutes = Math.ceil(maxDurationMs / (60 * 1000));
    statusText += `，剩余时间: 约 ${maxDurationMinutes} 分钟`;
  }
  statusElement.textContent = statusText + "...";

  isPaused = false;
}

// 停止录制
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return;
  }

  // 清除最大录制时长定时器
  if (maxDurationTimer) {
    clearTimeout(maxDurationTimer);
    maxDurationTimer = null;
  }

  mediaRecorder.stop();
  stream.getTracks().forEach((track) => track.stop());

  // 更新UI状态
  recordBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
  saveBtn.disabled = false;
  recordAudioCheckbox.disabled = false;
  maxDurationInput.disabled = false; // 重新启用最大时长设置
  recordBtn.classList.remove("recording");
  pauseBtn.classList.remove("paused");
  recordBtn.textContent = "开始录制";
  pauseBtn.textContent = "暂停录制";
  isPaused = false;

  // 创建并显示视频预览
  createVideoPreview();
}

// 创建视频预览
function createVideoPreview() {
  if (!recordedChunks.length) {
    return;
  }

  // 创建视频Blob
  const blob = new Blob(recordedChunks, { type: "video/webm" });

  // 创建视频URL
  const videoURL = URL.createObjectURL(blob);

  // 设置视频源
  videoPreview.src = videoURL;

  // 显示视频预览容器
  videoPreviewContainer.style.display = "block";

  // 视频加载完成后自动播放
  videoPreview.onloadedmetadata = () => {
    videoPreview.play();
  };
}

// 保存录制
function saveRecording() {
  if (!recordedChunks.length) {
    statusElement.textContent = "没有录制内容可保存";
    return;
  }

  statusElement.textContent = "正在处理录制内容，请稍候...";
  loadingOverlay.style.display = "flex";

  // 隐藏视频预览
  videoPreviewContainer.style.display = "none";

  // 合并所有录制的片段
  const blob = new Blob(recordedChunks, { type: "video/webm" });

  // 将Blob转换为Buffer
  const reader = new FileReader();
  reader.onload = () => {
    const buffer = new Uint8Array(reader.result);

    // 通过IPC发送到主进程保存
    window.electronAPI.saveFile(buffer);
    statusElement.textContent = "正在保存...";
  };

  reader.readAsArrayBuffer(blob);
}

// 处理保存录制文件的响应
function handleSaveResponse(response) {
  loadingOverlay.style.display = "none";

  if (response.success) {
    statusElement.textContent = `${response.message}：${response.filePath}`;
    // 清除录制的数据
    recordedChunks = [];
    saveBtn.disabled = true;

    // 清除视频预览
    videoPreview.src = "";
    videoPreviewContainer.style.display = "none";

    // 释放视频URL资源
    if (videoPreview.src) {
      URL.revokeObjectURL(videoPreview.src);
    }
  } else {
    statusElement.textContent = response.message;
  }
}

// 计时器功能
function startTimer() {
  if (!isPaused) {
    // 如果是第一次开始录制
    startTime = Date.now();
  }
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimer() {
  // 计算实际录制时间，减去暂停的时间
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime - totalPausedTime;

  const seconds = Math.floor((elapsedTime / 1000) % 60);
  const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
  const hours = Math.floor(elapsedTime / (1000 * 60 * 60));

  timerElement.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(
    seconds
  )}`;
}

function padZero(num) {
  return num.toString().padStart(2, "0");
}

// 显示屏幕选择对话框
function showScreenSelectionDialog(sources) {
  return new Promise((resolve) => {
    const modal = document.getElementById('screenModal');
    const screenList = document.getElementById('screenList');
    const confirmBtn = document.getElementById('confirmScreenSelect');
    const cancelBtn = document.getElementById('cancelScreenSelect');

    // 清空并重新填充屏幕列表
    screenList.innerHTML = '';
    let selectedSource = null;

    sources.forEach(source => {
      const item = document.createElement('div');
      item.className = 'screen-item';
      item.innerHTML = `
        <div class="screen-thumbnail" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; font-size: 14px; color: #666;">${source.displaySize}</div>
        </div>
        <div class="screen-name">${source.name}</div>
      `;

      item.addEventListener('click', () => {
        // 更新选中状态
        document.querySelectorAll('.screen-item').forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
        selectedSource = source;
        confirmBtn.disabled = false;
      });

      screenList.appendChild(item);
    });

    // 确认按钮点击处理
    confirmBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      resolve(selectedSource);
    }, { once: true });

    // 取消按钮点击处理
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      resolve(null);
    }, { once: true });

    // 显示对话框
    modal.style.display = 'flex';
    confirmBtn.disabled = true;
  });
}

// 显示倒计时动画
async function showCountdown(seconds) {
  return new Promise((resolve) => {
    const countdownOverlay = document.createElement("div");
    countdownOverlay.style.position = "fixed";
    countdownOverlay.style.top = "0";
    countdownOverlay.style.left = "0";
    countdownOverlay.style.width = "100%";
    countdownOverlay.style.height = "100%";
    countdownOverlay.style.backgroundColor = "rgba(0,0,0,0.7)";
    countdownOverlay.style.display = "flex";
    countdownOverlay.style.justifyContent = "center";
    countdownOverlay.style.alignItems = "center";
    countdownOverlay.style.zIndex = "2000";
    countdownOverlay.style.fontSize = "120px";
    countdownOverlay.style.color = "white";
    countdownOverlay.style.fontWeight = "bold";
    countdownOverlay.style.textShadow = "0 0 20px #3498db";

    document.body.appendChild(countdownOverlay);

    let count = seconds;
    countdownOverlay.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        document.body.removeChild(countdownOverlay);
        resolve();
      } else {
        countdownOverlay.textContent = count;
      }
    }, 1000);
  });
}
