/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.lgsd.app",
  productName: "Let's Get Shit Done",
  copyright: "Copyright © 2024",

  directories: {
    output: "dist",
    buildResources: "build",
  },

  files: [
    "electron/**/*",
    "package.json",
  ],

  extraResources: [
    { from: ".next/standalone", to: "app", filter: ["**/*"] },
    { from: ".next/static", to: "app/.next/static", filter: ["**/*"] },
    { from: "public", to: "app/public", filter: ["**/*"] },
  ],

  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "build/icon.ico",
  },

  mac: {
    target: [{ target: "dmg", arch: ["x64", "arm64"] }],
    icon: "build/icon.icns",
    category: "public.app-category.productivity",
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },

  publish: {
    provider: "github",
    owner: "2t3ff1",
    repo: "lgsd",
  },
};
