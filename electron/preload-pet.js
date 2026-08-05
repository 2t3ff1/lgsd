const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPet", {
  setPosition: (x, y) => ipcRenderer.invoke("pet:set-position", { x, y }),
  getPosition: () => ipcRenderer.invoke("pet:get-position"),
  getWindowPos: () => ipcRenderer.invoke("pet:get-window-pos"),
  resize: (w, h) => ipcRenderer.invoke("pet:resize", { w, h }),
  moveWindow: (x, y) => ipcRenderer.send("pet:move-window", { x, y }),
  moveDelta: (dx, dy) => ipcRenderer.send("pet:move-delta", { dx, dy }),
  platform: process.platform,
});
