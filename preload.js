const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startRecording: (screenInfo) =>
    ipcRenderer.send("start-recording", screenInfo),
  stopRecording: () => ipcRenderer.send("stop-recording"),
  getScreens: () => ipcRenderer.invoke("get-screens"),
  saveRecordingAs: (sourcePath) =>
    ipcRenderer.invoke("save-recording-as", sourcePath),
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  restoreWindow: () => ipcRenderer.send("restore-window"),
  onRecordingStarted: (callback) =>
    ipcRenderer.on("recording-started", callback),
  onRecordingComplete: (callback) =>
    ipcRenderer.on("recording-complete", callback),
  onRecordingError: (callback) => ipcRenderer.on("recording-error", callback),
});
