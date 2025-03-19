// DOM元素
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const saveBtn = document.getElementById("saveBtn");
const timerElement = document.getElementById("timer");
const statusElement = document.getElementById("status");

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
    statusElement.textContent = "正在准备录制...";

    // 获取可用的屏幕源（全屏）
    console.log("开始获取屏幕源");
    const sources = await window.electronAPI.captureScreen();
    console.log("获取到的屏幕源:", sources);

    if (!sources || sources.length === 0) {
      throw new Error("找不到可用的屏幕源");
    }

    // 捕获整个屏幕（第一个屏幕源）
    const source = sources[0];

    // 设置媒体约束
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: source.id,
        },
      },
    };

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
      statusElement.textContent = "录制已完成。可以保存录制内容。";
    };

    // 开始录制
    mediaRecorder.start(100);
    startTimer();

    // 更新UI状态
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    recordBtn.classList.add("recording");
    recordBtn.textContent = "正在录制";
    statusElement.textContent = "正在录制屏幕...";
  } catch (error) {
    console.error("启动录制时出错:", error);
    statusElement.textContent = `录制失败: ${error.message}`;
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
