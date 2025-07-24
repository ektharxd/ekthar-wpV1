const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let mainWindow;
let waClient;
let isReady = false;

let whatsappWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900,
        icon: path.join(__dirname, 'public', 'Bee.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
    mainWindow.webContents.openDevTools();
}

// Open WhatsApp Web in a separate window with correct user agent
function openWhatsAppWindow() {
    if (whatsappWindow && !whatsappWindow.isDestroyed()) {
        whatsappWindow.focus();
        return;
    }
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
    whatsappWindow = new BrowserWindow({
        width: 1200, height: 800,
        title: 'WhatsApp Web',
        webPreferences: {
            contextIsolation: true
        }
    });
    whatsappWindow.setMenu(null);
    whatsappWindow.loadURL('https://web.whatsapp.com', { userAgent });
    whatsappWindow.on('closed', () => { whatsappWindow = null; });
}

app.whenReady().then(() => {
    createWindow();
    initWhatsAppClient();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// IPC handler to reset WhatsApp cache (LocalAuth session)
ipcMain.handle('reset-whatsapp-cache', async () => {
    try {
        const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            sendToUI('log', { level: 'info', message: 'WhatsApp cache reset. Please reconnect.' });
            return { success: true };
        } else {
            sendToUI('log', { level: 'info', message: 'No WhatsApp cache found to reset.' });
            return { success: false, message: 'No cache found.' };
        }
    } catch (e) {
        sendToUI('log', { level: 'error', message: 'Failed to reset WhatsApp cache.' });
        return { success: false, message: e.message };
    }
});

function sendToUI(type, payload) {
    if (type === 'log' && payload && payload.message) {
        console.log(`[${payload.level || 'info'}] ${payload.message}`);
    }
    if (mainWindow) {
        mainWindow.webContents.send('update', { type, ...payload });
    }
}

ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
        ]
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
});

function initWhatsAppClient() {
    waClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: false
    });

    waClient.on('qr', qr => {
        qrcode.generate(qr, { small: true });
        sendToUI('log', { level: 'info', message: 'Scan the QR code in the terminal to login to WhatsApp.' });
        sendToUI('qr', { qr });
    });

    waClient.on('ready', () => {
        isReady = true;
        sendToUI('log', { level: 'success', message: 'WhatsApp Web client is ready!' });
        sendToUI('whatsapp-connected', {});
    });

    waClient.on('auth_failure', (msg) => {
        isReady = false;
        sendToUI('log', { level: 'error', message: 'WhatsApp authentication failed. Please restart the app.' });
    });

    waClient.on('disconnected', (reason) => {
        isReady = false;
        sendToUI('log', { level: 'error', message: 'WhatsApp client disconnected. Please restart the app.' });
    });

    waClient.on('change_state', state => {
        console.log('[WA] State changed:', state);
    });

    waClient.on('error', err => {
        sendToUI('log', { level: 'error', message: `WhatsApp client error: ${err && err.message ? err.message : err}` });
    });

    waClient.initialize();
}

ipcMain.handle('connect-whatsapp', async () => {
    openWhatsAppWindow();
    if (isReady) {
        return { success: true, message: 'WhatsApp already connected.' };
    } else {
        return { success: false, message: 'Waiting for WhatsApp login. Scan the QR code in the terminal.' };
    }
});

let sessionControl = {
    paused: false,
    stopped: false,
    currentSession: null
};

ipcMain.handle('pause-session', async () => {
    sessionControl.paused = true;
    sendToUI('log', { level: 'info', message: 'Session paused.' });
    return { success: true };
});
ipcMain.handle('continue-session', async () => {
    sessionControl.paused = false;
    sendToUI('log', { level: 'info', message: 'Session continued.' });
    if (sessionControl.currentSession && typeof sessionControl.currentSession.resume === 'function') {
        sessionControl.currentSession.resume();
    }
    return { success: true };
});
ipcMain.handle('stop-session', async () => {
    sessionControl.stopped = true;
    sendToUI('log', { level: 'info', message: 'Session stopped.' });
    if (sessionControl.currentSession && typeof sessionControl.currentSession.resume === 'function') {
        sessionControl.currentSession.resume();
    }
    return { success: true };
});

ipcMain.handle('start-session', async (event, data) => {
    if (!isReady) {
        sendToUI('log', { level: 'error', message: 'WhatsApp is not connected. Please connect first.' });
        return { success: false, message: 'WhatsApp not connected.' };
    }
    sessionControl.paused = false;
    sessionControl.stopped = false;
    sessionControl.currentSession = null;
    const { numbers, message, imagePath } = data;
    sendToUI('log', { level: 'info', message: `Session handler entered. Numbers: ${JSON.stringify(numbers)}, message: ${message}, imagePath: ${imagePath}` });

    let successCount = 0, errorCount = 0, errorNumbers = [];
    sendToUI('log', { level: 'info', message: `Starting session for ${numbers.length} numbers.` });

    let media = null;
    let absImagePath = imagePath ? path.resolve(imagePath) : null;
    if (absImagePath && fs.existsSync(absImagePath)) {
        sendToUI('log', { level: 'info', message: `Image file found: ${absImagePath}` });
        try {
            media = MessageMedia.fromFilePath(absImagePath);
            sendToUI('log', { level: 'info', message: `Image loaded for sending.` });
        } catch (e) {
            sendToUI('log', { level: 'error', message: 'Failed to load image.' });
        }
    } else if (imagePath) {
        sendToUI('log', { level: 'error', message: `Image file not found: ${absImagePath}` });
    }

    sendToUI('log', { level: 'info', message: `About to enter for loop. Numbers: ${JSON.stringify(numbers)}` });

    let pausedPromiseResolve;
    function waitIfPaused() {
        if (sessionControl.stopped) return false;
        if (!sessionControl.paused) return true;
        return new Promise(resolve => {
            pausedPromiseResolve = () => resolve(true);
        });
    }
    sessionControl.currentSession = {
        resume: () => {
            if (pausedPromiseResolve) pausedPromiseResolve();
        }
    };

    let i = 0;
    while (i < numbers.length) {
        let canProceed = await waitIfPaused();
        if (sessionControl.stopped || !canProceed) break;
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (sessionControl.stopped) break;
        }
        const numberRaw = numbers[i];
        canProceed = await waitIfPaused();
        if (sessionControl.stopped || !canProceed) break;
        sendToUI('log', { level: 'info', message: `Processing number: ${numberRaw} (index ${i})` });
        let number = String(numberRaw).replace(/\D/g, '');
        if (number.length === 10) number = '91' + number;
        number = number + '@c.us';
        try {
            if (media) {
                sendToUI('log', { level: 'info', message: `Sending image with caption to ${number}` });
                await waClient.sendMessage(number, media, { caption: message });
                sendToUI('update', { status: 'success', number, successCount: ++successCount, errorCount });
            } else {
                sendToUI('log', { level: 'info', message: `Sending text message to ${number}` });
                await waClient.sendMessage(number, message);
                sendToUI('update', { status: 'success', number, successCount: ++successCount, errorCount });
            }
        } catch (err) {
            sendToUI('log', { level: 'error', message: `Failed to send to ${number}: ${err.message}` });
            errorCount++;
            errorNumbers.push(number);
            sendToUI('update', { status: 'fail', number, successCount, errorCount, errorNumbers });
        }
        i++;
    }
    sendToUI('log', { level: 'info', message: `For loop complete. Success: ${successCount}, Failed: ${errorCount}` });
    sendToUI('finished', { summary: `Finished. Success: ${successCount}, Failed: ${errorCount}.` });
    sessionControl.currentSession = null;
    return { success: true, message: 'Session complete.' };
});
