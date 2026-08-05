const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApp", {
  platform: process.platform,
  isElectron: true,
  showPet: () => ipcRenderer.send("pet:show"),
  hidePet: () => ipcRenderer.send("pet:hide"),
  isPetVisible: () => ipcRenderer.invoke("pet:is-visible"),
});
