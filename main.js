const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let mainWindow;
let waClient;
let isReady = false;

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
    // Load from local file instead of server
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
    mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
    initWhatsAppClient();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

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
        puppeteer: { headless: false }
    });

    waClient.on('qr', qr => {
        console.log('[WA] QR event received');
        // Show QR in terminal and send to UI as text (optionally render as image in UI)
        qrcode.generate(qr, { small: true });
        sendToUI('log', { level: 'info', message: 'Scan the QR code in the terminal to login to WhatsApp.' });
        sendToUI('qr', { qr }); // Send QR to renderer
    });

    waClient.on('ready', () => {
        console.log('[WA] Client is ready');
        isReady = true;
        sendToUI('log', { level: 'success', message: 'WhatsApp Web client is ready!' });
    });

    waClient.on('auth_failure', (msg) => {
        console.log('[WA] Auth failure:', msg);
        isReady = false;
        sendToUI('log', { level: 'error', message: 'WhatsApp authentication failed. Please restart the app.' });
    });

    waClient.on('disconnected', (reason) => {
        console.log('[WA] Disconnected:', reason);
        isReady = false;
        sendToUI('log', { level: 'error', message: 'WhatsApp client disconnected. Please restart the app.' });
    });

    waClient.on('change_state', state => {
        console.log('[WA] State changed:', state);
    });

    waClient.on('error', err => {
        console.error('[WA] Client error:', err);
    });

    waClient.initialize();
}

ipcMain.handle('connect-whatsapp', async () => {
    if (isReady) {
        return { success: true, message: 'WhatsApp already connected.' };
    } else {
        return { success: false, message: 'Waiting for WhatsApp login. Scan the QR code in the terminal.' };
    }
});

// --- Session Control State ---
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

    // --- Pause/Continue/Stop Logic ---
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
        // Pause/stop before processing
        let canProceed = await waitIfPaused();
        if (sessionControl.stopped || !canProceed) break;

        // Delay before sending (so pause always happens before sending)
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Only break if stopped, not if canProceed is false
            if (sessionControl.stopped) break;
        }

        const numberRaw = numbers[i];
        // Pause/stop right before sending
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
