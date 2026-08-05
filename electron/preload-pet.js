const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronPet", {
  setPosition: (x, y) => ipcRenderer.invoke("pet:set-position", { x, y }),
  getPosition: () => ipcRenderer.invoke("pet:get-position"),
  resize: (w, h) => ipcRenderer.invoke("pet:resize", { w, h }),
  moveWindow: (x, y) => ipcRenderer.send("pet:move-window", { x, y }),
  platform: process.platform,
});
