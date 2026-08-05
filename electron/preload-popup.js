const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPopup", {
  close: () => ipcRenderer.send("popup:close"),
  markDone: () => ipcRenderer.send("popup:todo-done"),
  platform: process.platform,
});
