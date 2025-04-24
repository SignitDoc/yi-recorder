const { contextBridge, ipcRenderer } = require("electron");
const electron = require("electron");

// 设置控制台输出编码
process.env.LANG = "zh_CN.UTF-8";

// 使用Buffer来确保正确的编码输出
const logWithEncoding = (message) => {
  if (typeof message === 'string') {
    console.log(Buffer.from(message, 'utf8').toString());
  } else {
    console.log(message);
  }
};

logWithEncoding("简化版preload脚本已加载");
logWithEncoding("electron对象: " + typeof electron);
logWithEncoding("electron中的desktopCapturer: " + typeof electron.desktopCapturer);

contextBridge.exposeInMainWorld("electronAPI", {
  captureScreen: async () => {
    logWithEncoding("captureScreen函数被调用");
    try {
      // 通过IPC调用主进程来获取屏幕源
      const sources = await ipcRenderer.invoke("get-sources");
      logWithEncoding("屏幕源: " + (sources ? sources.length : 0));
      return sources;
    } catch (error) {
      const errorMsg = "捕获屏幕时出错: " + (error.message || error);
      logWithEncoding(errorMsg);
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

  minimizeWindow: () => ipcRenderer.send("minimize-window"),

  // 显示主窗口
  showWindow: () => ipcRenderer.send("show-window"),
});
