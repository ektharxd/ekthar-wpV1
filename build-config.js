/**
 * Electron Builder Configuration for Beesoft 🐝
 * Desktop App Build Settings
 */

module.exports = {
  appId: "com.ekthar.beesoft",
  productName: "Beesoft 🐝 - WhatsApp Automation",
  copyright: "Copyright © 2024 Ekthar",
  
  directories: {
    output: "dist",
    buildResources: "build"
  },

  files: [
    "main.js",
    "preload.js",
    "package.json",
    "public/**/*",
    "node_modules/**/*",
    "Bee.ico"
  ],

  extraFiles: [
    {
      from: "Bee.ico",
      to: "resources/Bee.ico"
    }
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
    requestedExecutionLevel: "asInvoker",
    artifactName: "${productName}-${version}-${arch}.${ext}"
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
    installerHeaderIcon: "Bee.ico",
    
    // Custom installer graphics (if they exist)
    installerSidebar: "installer/welcome-bee.bmp",
    installerHeader: "installer/header-bee.bmp",
    
    // Finish page options
    runAfterFinish: true,
    menuCategory: "Productivity",
    
    // NSIS options
    unicode: true,
    deleteAppDataOnUninstall: false
  },

  portable: {
    artifactName: "${productName}-${version}-portable.${ext}"
  },

  mac: {
    target: "dmg",
    icon: "Bee.ico",
    category: "public.app-category.productivity"
  },

  linux: {
    target: "AppImage",
    icon: "Bee.ico",
    category: "Office"
  },

  publish: null
};