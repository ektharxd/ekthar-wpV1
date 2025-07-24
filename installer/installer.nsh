; Beesoft 🐝 - Material 3 Bee-Themed Installer
; Custom NSIS installer script with Material 3 design

!include "MUI2.nsh"
!include "FileFunc.nsh"

; Installer configuration
!define PRODUCT_NAME "Beesoft 🐝"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "Ekthar"
!define PRODUCT_WEB_SITE "https://github.com/ektharxd"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\Beesoft.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; Material 3 Color Scheme
!define MUI_BGCOLOR "0xFFFBFE"
!define MUI_TEXTCOLOR "0x1C1B1F"
!define MUI_HEADERCOLOR "0x6750A4"
!define MUI_ACCENTCOLOR "0xFFB000"

; Custom bee-themed graphics
!define MUI_ICON "Bee.ico"
!define MUI_UNICON "Bee.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "installer\header-bee.bmp"
!define MUI_HEADERIMAGE_UNBITMAP "installer\header-bee.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer\welcome-bee.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "installer\welcome-bee.bmp"

; Modern UI settings
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to Beesoft 🐝 Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Beesoft, your smart WhatsApp automation tool.$\r$\n$\r$\nBeesoft helps you automate WhatsApp messaging with a beautiful, modern interface.$\r$\n$\r$\nClick Next to continue."

; Finish page settings
!define MUI_FINISHPAGE_TITLE "Beesoft 🐝 Installation Complete!"
!define MUI_FINISHPAGE_TEXT "Beesoft has been successfully installed on your computer.$\r$\n$\r$\nYou can now start automating your WhatsApp messages with style!"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Beesoft.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Beesoft 🐝 now"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.md"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show README"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer details
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "Beesoft-Setup.exe"
InstallDir "$PROGRAMFILES64\Beesoft"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

; Version information
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "Comments" "Smart WhatsApp Automation Tool"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "© 2024 ${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Installer"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"

; Custom functions for Material 3 styling
Function .onGUIInit
  ; Set custom colors and fonts for Material 3 look
  SetCtlColors $mui.WelcomePage.Text ${MUI_TEXTCOLOR} ${MUI_BGCOLOR}
  SetCtlColors $mui.WelcomePage.Title ${MUI_HEADERCOLOR} ${MUI_BGCOLOR}
FunctionEnd

; Installation section
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; Install main application files
  File /r "dist\win-unpacked\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Beesoft"
  CreateShortCut "$SMPROGRAMS\Beesoft\Beesoft 🐝.lnk" "$INSTDIR\Beesoft.exe" "" "$INSTDIR\Beesoft.exe" 0
  CreateShortCut "$DESKTOP\Beesoft 🐝.lnk" "$INSTDIR\Beesoft.exe" "" "$INSTDIR\Beesoft.exe" 0
  
  ; Register application
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\Beesoft.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\Beesoft.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninst.exe"
SectionEnd

; Uninstaller section
Section Uninstall
  ; Remove files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\Beesoft 🐝.lnk"
  RMDir /r "$SMPROGRAMS\Beesoft"
  
  ; Remove registry entries
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd