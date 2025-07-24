# 🐝 Beesoft - Build Instructions

## 📦 Building the Desktop App

### Quick Build (Windows)
```bash
# Run the build script
./build-app.bat
```

### Manual Build Commands

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Build Options

**Windows Installer:**
```bash
npm run build:win
```

**Portable Version:**
```bash
npm run build:portable
```

**All Platforms:**
```bash
npm run build:all
```

#### 3. Development Mode
```bash
# Run with dev tools
npm run dev

# Regular run
npm start
```

## 📁 Output Files

After building, you'll find your app in the `dist/` folder:

- **Installer**: `Beesoft 🐝 - WhatsApp Automation-1.0.0-x64.exe`
- **Portable**: `Beesoft 🐝 - WhatsApp Automation-1.0.0-portable.exe`

## 🎯 App Features

✅ **Standalone Desktop App**
- No browser required
- Native Windows application
- Auto-updater ready
- Professional installer

✅ **WhatsApp Integration**
- QR code authentication
- Bulk message sending
- Image attachment support
- Real-time status tracking

✅ **User Interface**
- Material 3 design
- Dark/Light theme toggle
- Responsive layout
- Professional dashboard

## 🔧 Build Configuration

The build is configured in `build-config.js` with:
- NSIS installer for Windows
- Portable executable option
- Auto-update support
- Professional branding

## 📋 System Requirements

**Development:**
- Node.js 16+
- npm or yarn
- Windows 10/11

**Runtime:**
- Windows 10/11
- 4GB RAM minimum
- 500MB disk space

## 🚀 Distribution

The built app can be distributed as:
1. **Installer** - Full installation with shortcuts
2. **Portable** - Single executable, no installation needed

Both versions are code-signed ready and include all dependencies.