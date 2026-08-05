const { contextBridge, ipcRenderer } = require("electron");

// Forward dance trigger from main process as a DOM CustomEvent
ipcRenderer.on("pet:trigger-dance", () => {
  window.dispatchEvent(new CustomEvent("pet-trigger-dance"));
});

contextBridge.exposeInMainWorld("electronPet", {
  setPosition: (x, y) => ipcRenderer.invoke("pet:set-position", { x, y }),
  getPosition: () => ipcRenderer.invoke("pet:get-position"),
  getWindowPos: () => ipcRenderer.invoke("pet:get-window-pos"),
  resize: (w, h) => ipcRenderer.invoke("pet:resize", { w, h }),
  moveWindow: (x, y) => ipcRenderer.send("pet:move-window", { x, y }),
  moveDelta: (dx, dy) => ipcRenderer.send("pet:move-delta", { dx, dy }),
  openPopup: () => ipcRenderer.send("pet:open-popup"),
  platform: process.platform,
});
