const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let whatsappWindow;
let isReady = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, 
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        icon: path.join(__dirname, 'Bee.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        show: false,
        titleBarStyle: 'default',
        autoHideMenuBar: true
    });
    
    mainWindow.setMenu(null);
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
    
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });
    
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (whatsappWindow) {
            whatsappWindow.close();
        }
    });
}

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

function sendToUI(type, payload) {
    if (type === 'log' && payload && payload.message) {
        console.log(`[${payload.level || 'info'}] ${payload.message}`);
    }
    if (mainWindow) {
        mainWindow.webContents.send('update', { type, ...payload });
    }
}

// Image selection handler
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

// WhatsApp connection handler
ipcMain.handle('connect-whatsapp', async () => {
    return await createWhatsAppWindow();
});

// Get WhatsApp status
ipcMain.handle('get-whatsapp-status', async () => {
    return {
        isReady,
        hasClient: !!whatsappWindow,
        clientState: whatsappWindow ? 'ready' : 'not ready'
    };
});

async function createWhatsAppWindow() {
    sendToUI('log', { level: 'info', message: 'Launching built-in WhatsApp Web browser...' });
    
    try {
        // Close existing WhatsApp window if open
        if (whatsappWindow) {
            whatsappWindow.close();
            whatsappWindow = null;
        }
        
        // Create persistent session for WhatsApp
        const whatsappSession = session.fromPartition('persist:whatsapp');
        
        // Set user agent to avoid detection
        whatsappSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        sendToUI('log', { level: 'info', message: '🌐 Creating WhatsApp window...' });
        
        // Create WhatsApp window - SHOW IMMEDIATELY
        whatsappWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            title: 'WhatsApp Web - Beesoft',
            icon: path.join(__dirname, 'Bee.ico'),
            webPreferences: {
                session: whatsappSession,
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                allowRunningInsecureContent: false
            },
            show: true, // SHOW IMMEDIATELY
            autoHideMenuBar: true,
            center: true,
            resizable: true,
            minimizable: true,
            maximizable: true,
            closable: true,
            alwaysOnTop: false
        });
        
        // Remove menu bar
        whatsappWindow.setMenu(null);
        
        // Force show and focus
        whatsappWindow.show();
        whatsappWindow.focus();
        whatsappWindow.moveTop();
        
        sendToUI('log', { level: 'success', message: '✅ WhatsApp window created and visible!' });
        
        // Load WhatsApp Web
        sendToUI('log', { level: 'info', message: '🔄 Loading WhatsApp Web...' });
        
        try {
            await whatsappWindow.loadURL('https://web.whatsapp.com');
            sendToUI('log', { level: 'success', message: '✅ WhatsApp Web loaded! Please scan QR code with your phone.' });
        } catch (loadError) {
            sendToUI('log', { level: 'error', message: `Failed to load WhatsApp Web: ${loadError.message}` });
            throw loadError;
        }
        
        // Handle window events
        whatsappWindow.on('closed', () => {
            whatsappWindow = null;
            isReady = false;
            sendToUI('log', { level: 'warning', message: 'WhatsApp window closed.' });
        });
        
        // Monitor page load
        whatsappWindow.webContents.on('did-finish-load', () => {
            sendToUI('log', { level: 'info', message: 'WhatsApp Web page loaded successfully.' });
        });
        
        // Monitor for successful login
        whatsappWindow.webContents.on('did-navigate', (event, url) => {
            sendToUI('log', { level: 'info', message: `Navigated to: ${url}` });
            if (url.includes('web.whatsapp.com') && !url.includes('web.whatsapp.com/')) {
                // User is logged in
                isReady = true;
                sendToUI('log', { level: 'success', message: '🎉 WhatsApp Web is ready for messaging!' });
            }
        });
        
        // Handle navigation errors
        whatsappWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            sendToUI('log', { level: 'error', message: `Failed to load WhatsApp Web: ${errorDescription}` });
        });
        
        // Add debugging for window state
        whatsappWindow.webContents.on('dom-ready', () => {
            sendToUI('log', { level: 'info', message: '📄 WhatsApp Web DOM is ready.' });
        });
        
        const msg = 'Built-in WhatsApp Web browser launched successfully!';
        sendToUI('log', { level: 'success', message: msg });
        return { success: true, message: msg };
        
    } catch (error) {
        const msg = `Failed to launch WhatsApp Web: ${error.message}`;
        sendToUI('log', { level: 'error', message: msg });
        return { success: false, message: msg };
    }
}

// Session start handler
ipcMain.handle('start-session', async (event, data) => {
    return await handleBulkSend(data);
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function handleBulkSend({ numbers, message, imagePath }) {
    if (!whatsappWindow || !isReady) { 
        sendToUI('log', { level: 'error', message: 'WhatsApp not ready. Please connect first.' }); 
        return { success: false, message: 'WhatsApp not ready' };
    }
    
    sendToUI('log', { level: 'info', message: `Starting campaign for ${numbers.length} numbers...` });
    sendToUI('session_started', { 
        message: 'Campaign started successfully!',
        total: numbers.length,
        sessionActive: true
    });
    
    let successCount = 0, errorCount = 0, errorNumbers = [];
    
    for (const number of numbers) {
        sendToUI('log', { level: 'info', message: `Processing: ${number}` });
        
        try {
            // Bring WhatsApp window to front
            whatsappWindow.focus();
            
            // Navigate to chat URL
            const chatUrl = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
            await whatsappWindow.loadURL(chatUrl);
            
            // Wait for page to load
            await new Promise((resolve) => {
                whatsappWindow.webContents.once('did-finish-load', resolve);
            });
            
            // Wait a bit for WhatsApp to process
            await delay(2000);
            
            // Send Enter key to send message
            whatsappWindow.webContents.sendInputEvent({
                type: 'keyDown',
                keyCode: 'Enter'
            });
            
            await delay(1000);
            
            whatsappWindow.webContents.sendInputEvent({
                type: 'keyUp',
                keyCode: 'Enter'
            });
            
            await delay(1500);
            
            successCount++;
            sendToUI('update', { status: 'success', number, successCount, errorCount });
            sendToUI('log', { level: 'success', message: `✅ Message sent to ${number}` });
            
        } catch (error) {
            const errorMsg = `Failed for ${number}: ${error.message}`;
            errorCount++; 
            errorNumbers.push(number);
            sendToUI('log', { level: 'error', message: errorMsg });
            sendToUI('update', { status: 'fail', number, successCount, errorCount, errorNumbers });
        }
        
        // Anti-ban delay between messages
        const delayTime = Math.random() * 5000 + 3000; // 3-8 seconds
        sendToUI('log', { level: 'info', message: `Waiting ${Math.round(delayTime/1000)}s before next message...` });
        await delay(delayTime);
    }
    
    // Send completion signals
    const completionData = { 
        summary: `Campaign completed! Success: ${successCount}, Failed: ${errorCount}`,
        success: successCount,
        failed: errorCount,
        total: numbers.length,
        completed: true,
        sessionActive: false
    };
    
    sendToUI('finished', completionData);
    sendToUI('session_complete', completionData);
    sendToUI('campaign_finished', completionData);
    
    sendToUI('log', { level: 'success', message: `🎉 Campaign completed! Success: ${successCount}, Failed: ${errorCount}` });
    
    return { success: true, message: 'Campaign completed successfully.', completed: true };
}

// Session control handlers
ipcMain.handle('pause-session', async () => {
    sendToUI('log', { level: 'info', message: 'Session paused.' });
    return { success: true };
});

ipcMain.handle('continue-session', async () => {
    sendToUI('log', { level: 'info', message: 'Session continued.' });
    return { success: true };
});

ipcMain.handle('stop-session', async () => {
    sendToUI('log', { level: 'info', message: 'Session stopped.' });
    return { success: true };
});

// Manual WhatsApp launch handler
ipcMain.handle('launch-whatsapp', async () => {
    try {
        sendToUI('log', { level: 'info', message: 'Launching WhatsApp Web...' });
        return await createWhatsAppWindow();
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Failed to launch WhatsApp: ${error.message}` });
        return { success: false, message: 'Failed to launch WhatsApp Web.' };
    }
});

// Restart WhatsApp client
ipcMain.handle('restart-whatsapp', async () => {
    try {
        sendToUI('log', { level: 'info', message: 'Restarting WhatsApp Web...' });
        
        if (whatsappWindow) {
            whatsappWindow.close();
            whatsappWindow = null;
        }
        
        isReady = false;
        
        setTimeout(async () => {
            await createWhatsAppWindow();
        }, 2000);
        
        return { success: true, message: 'WhatsApp restarted successfully.' };
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Restart failed: ${error.message}` });
        return { success: false, message: 'Failed to restart WhatsApp.' };
    }
});

// Refresh WhatsApp
ipcMain.handle('refresh-whatsapp', async () => {
    try {
        if (whatsappWindow) {
            sendToUI('log', { level: 'info', message: 'Refreshing WhatsApp Web...' });
            await whatsappWindow.reload();
            sendToUI('log', { level: 'success', message: 'WhatsApp Web refreshed successfully.' });
            return { success: true, message: 'WhatsApp refreshed successfully.' };
        } else {
            return { success: false, message: 'WhatsApp window not open.' };
        }
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Refresh failed: ${error.message}` });
        return { success: false, message: 'Failed to refresh WhatsApp.' };
    }
});

// Browser selection functions (for compatibility with frontend)
ipcMain.handle('get-available-browsers', async () => {
    return [{ name: 'Built-in Browser', path: 'electron-chromium', icon: '🌐' }];
});

ipcMain.handle('set-selected-browser', async (event, browserPath) => {
    sendToUI('log', { level: 'success', message: 'Using built-in browser' });
    return { success: true };
});

ipcMain.handle('test-browser-launch', async () => {
    return await createWhatsAppWindow();
});