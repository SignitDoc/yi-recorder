const { contextBridge, ipcRenderer, desktopCapturer } = require("electron");

// 在控制台打印调试信息
console.log("Preload脚本已加载");

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld("electronAPI", {
  // 录制相关
  getDesktopSources: async () => {
    console.log("getDesktopSources被调用");
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 0, height: 0 },
      });
      console.log("获取到屏幕源:", sources.length);
      return sources;
    } catch (error) {
      console.error("获取屏幕源出错:", error);
      throw error;
    }
  },

  // IPC通信
  saveRecording: (buffer) => ipcRenderer.send("save-recording", buffer),
  onSaveRecordingResponse: (callback) =>
    ipcRenderer.on("save-recording-response", (event, response) =>
      callback(response)
    ),
});
