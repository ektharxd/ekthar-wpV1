const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer-core');

let mainWindow;
let browser;
let page;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'public', 'bee.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('connect-whatsapp', async () => {
    return await startAutomationEngine();
});
ipcMain.handle('start-session', async (event, data) => {
    return await handleBulkSend(data);
});

function sendToUI(type, payload) {
    if (mainWindow) {
        mainWindow.webContents.send('update', { type, ...payload });
    }
}

async function startAutomationEngine() {
    sendToUI('log', { level: 'info', message: 'Launching Automation Engine...' });
    let executablePath;
    try {
        if (os.platform() === 'win32') {
            const command = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
            const stdout = execSync(command).toString();
            const match = stdout.match(/REG_SZ\s+(.*)/);
            if (match && match[1]) executablePath = match[1].trim();
            else throw new Error('Could not parse registry query output.');
        } else { throw new Error('Unsupported platform.'); }
        if (!fs.existsSync(executablePath)) throw new Error('Detected Chrome path does not exist.');
    } catch (e) {
        const msg = `Error: Could not find Google Chrome. ${e.message}`;
        sendToUI('log', { level: 'error', message: 'Could not find Google Chrome. Please install it.' });
        return { success: false, message: msg };
    }

    try {
        // --- THIS IS THE DEFINITIVE FIX ---
        // Get Electron's official userData path, which is always writeable,
        // e.g., C:\Users\Ekthar\AppData\Roaming\Beesoft
        const userDataPath = app.getPath('userData');
        // Create a dedicated subfolder for our session data within that path.
        const sessionPath = path.join(userDataPath, 'whatsapp_session');
        console.log(`Using session data path: ${sessionPath}`);
        // ---------------------------------

        browser = await puppeteer.launch({ 
            headless: false, 
            userDataDir: sessionPath, // Use the new, correct, and always-writeable path
            args: ['--start-maximized'], 
            defaultViewport: null, 
            executablePath: executablePath 
        });

        page = (await browser.pages())[0];
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' });
        const msg = 'Engine connected to WhatsApp Web. Ready for your session.';
        sendToUI('log', { level: 'success', message: msg });
        return { success: true, message: msg };
    } catch (err) {
        const msg = `Failed to launch WhatsApp Web: ${err.message}`;
        sendToUI('log', { level: 'error', message: 'Failed to launch WhatsApp Web.' });
        return { success: false, message: msg };
    }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function handleBulkSend({ numbers, message }) {
    if (!page) { sendToUI('log', { level: 'error', message: 'WhatsApp page not ready.' }); return; }
    sendToUI('log', { level: 'info', message: `Starting session for ${numbers.length} numbers.` });
    let successCount = 0, errorCount = 0, errorNumbers = [];
    for (const number of numbers) {
        sendToUI('log', { level: 'info', message: `Processing: ${number}` });
        try {
            await page.bringToFront();
            const chatUrl = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
            await page.goto(chatUrl, { waitUntil: 'networkidle0' });
            const messageBoxSelector = 'div[contenteditable="true"][data-tab="10"]';
            await page.waitForSelector(messageBoxSelector, { timeout: 20000 });
            await delay(1200);
            await page.keyboard.press('Enter');
            await delay(1500);
            successCount++;
            sendToUI('update', { status: 'success', number, successCount, errorCount });
        } catch (error) {
            const errorMsg = `Failed for ${number}: ${error.message.split('\n')[0]}`;
            errorCount++; errorNumbers.push(number);
            sendToUI('update', { status: 'fail', number, successCount, errorCount, errorNumbers });
        }
    }
    sendToUI('finished', { summary: `Finished. Success: ${successCount}, Failed: ${errorCount}.` });
}