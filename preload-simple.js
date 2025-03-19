const { contextBridge, ipcRenderer } = require("electron");
const electron = require("electron");

console.log("简化版preload脚本已加载");
console.log("electron对象:", typeof electron);
console.log("electron中的desktopCapturer:", typeof electron.desktopCapturer);

contextBridge.exposeInMainWorld("electronAPI", {
  captureScreen: async () => {
    console.log("captureScreen函数被调用");
    try {
      // 通过IPC调用主进程来获取屏幕源
      const sources = await ipcRenderer.invoke("get-sources");
      console.log("屏幕源:", sources ? sources.length : 0);
      return sources;
    } catch (error) {
      console.error("捕获屏幕时出错:", error);
      throw error;
    }
  },

  saveFile: (buffer) => ipcRenderer.send("save-recording", buffer),

  onSaveComplete: (callback) => {
    ipcRenderer.on("save-recording-response", (_event, response) =>
      callback(response)
    );
    return true;
  },
});
