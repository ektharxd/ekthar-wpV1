/**
 * Simple Electron Builder Configuration for Beesoft 🐝
 * Basic build without custom graphics
 */

module.exports = {
  appId: "com.ekthar.beesoft",
  productName: "Beesoft 🐝",
  copyright: "Copyright © 2024 Ekthar",
  
  directories: {
    output: "dist"
  },

  files: [
    "main.js",
    "preload.js",
    "package.json",
    "public/**/*",
    "node_modules/**/*",
    "Bee.ico",
    "LICENSE"
  ],

  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ],
    icon: "Bee.ico",
    requestedExecutionLevel: "asInvoker"
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Beesoft 🐝",
    uninstallDisplayName: "Beesoft 🐝 - WhatsApp Automation",
    license: "LICENSE",
    installerIcon: "Bee.ico",
    uninstallerIcon: "Bee.ico",
    runAfterFinish: true,
    unicode: true
  },

  portable: {
    artifactName: "${productName}-${version}-portable.${ext}"
  },

  publish: null
};