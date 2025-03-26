// DOM元素
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const saveBtn = document.getElementById("saveBtn");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");
const recordAudioCheckbox = document.getElementById("recordAudio");
const loadingOverlay = document.getElementById("loadingOverlay");
const screenSelector = document.getElementById("screenSelector");
const screenOptions = document.getElementById("screenOptions");
const confirmScreenBtn = document.getElementById("confirmScreenBtn");

let selectedSource = null;

// 录制状态变量
let mediaRecorder;
let recordedChunks = [];
let stream;
let startTime;
let timerInterval;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  // 检查API是否可用
  console.log("API可用性检查:", !!window.electronAPI);
  if (window.electronAPI) {
    console.log("可用的API:", Object.keys(window.electronAPI));
  }

  recordBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  saveBtn.addEventListener("click", saveRecording);

  // 设置保存响应处理
  window.electronAPI.onSaveComplete(handleSaveResponse);
});

// 启动录制
async function startRecording() {
  try {
    statusElement.textContent = "正在获取屏幕源...";

    // 获取可用的屏幕源
    const sources = await window.electronAPI.captureScreen();
    if (!sources || sources.length === 0) {
      throw new Error("找不到可用的屏幕源");
    }

    // 如果只有一个屏幕源，直接使用
    if (sources.length === 1) {
      selectedSource = sources[0];
    } else {
      // 显示屏幕选择界面
      recordBtn.disabled = true;
      screenSelector.style.display = "block";
      statusElement.textContent = "请选择要录制的屏幕";

      // 清空选项
      screenOptions.innerHTML = "";

      // 添加屏幕选项
      sources.forEach((source) => {
        const option = document.createElement("div");
        option.className = "screen-option";
        const previewBox = document.createElement("div");
        previewBox.className = "screen-preview-box";
        previewBox.textContent = source.displaySize || "未知分辨率";
        option.appendChild(previewBox);
        const nameDiv = document.createElement("div");
        nameDiv.className = "screen-name";
        nameDiv.textContent = source.name;
        option.appendChild(nameDiv);
        option.addEventListener("click", () => {
          document.querySelectorAll(".screen-option").forEach((el) => {
            el.classList.remove("selected");
          });
          option.classList.add("selected");
          selectedSource = source;
        });
        screenOptions.appendChild(option);
      });

      // 等待用户选择
      await new Promise((resolve) => {
        confirmScreenBtn.onclick = () => {
          if (!selectedSource) {
            statusElement.textContent = "请先选择一个屏幕";
            return;
          }
          screenSelector.style.display = "none";
          resolve();
        };
      });
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

    // 更新UI状态
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    saveBtn.disabled = true; // 录制中禁用保存按钮
    recordAudioCheckbox.disabled = true;
    recordBtn.classList.add("recording");
    recordBtn.textContent = "正在录制";
    statusElement.textContent = `正在录制屏幕${
      recordAudioCheckbox.checked ? "和系统声音" : ""
    }...`;

    // 最小化窗口并开始录制
    window.electronAPI.minimizeWindow();
  } catch (error) {
    console.error("启动录制时出错:", error);
    statusElement.textContent = `录制失败: ${error.message}`;
    recordAudioCheckbox.disabled = false;
  }
}

// 停止录制
function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return;
  }

  mediaRecorder.stop();
  stream.getTracks().forEach((track) => track.stop());

  // 更新UI状态
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  saveBtn.disabled = false;
  recordAudioCheckbox.disabled = false;
  recordBtn.classList.remove("recording");
  recordBtn.textContent = "开始录制";
}

// 保存录制
function saveRecording() {
  if (!recordedChunks.length) {
    statusElement.textContent = "没有录制内容可保存";
    return;
  }

  statusElement.textContent = "正在处理录制内容，请稍候...";
  loadingOverlay.style.display = "flex";

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
  } else {
    statusElement.textContent = response.message;
  }
}

// 计时器功能
function startTimer() {
  startTime = Date.now();
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimer() {
  const elapsedTime = Date.now() - startTime;
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
