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
        show: false, // Don't show until ready
        titleBarStyle: 'default',
        autoHideMenuBar: true
    });
    
    // Remove menu bar
    mainWindow.setMenu(null);
    
    // Load the app
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Only open dev tools in development
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });
    
    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
    
    // Delay WhatsApp initialization to ensure window is ready
    setTimeout(() => {
        initWhatsAppClient();
        startAntibanMechanisms();
    }, 3000);
});

// Anti-ban mechanisms
let refreshInterval;
let activityInterval;

function startAntibanMechanisms() {
    // Refresh WhatsApp Web every 30 minutes to avoid detection
    refreshInterval = setInterval(() => {
        if (waClient && isReady) {
            sendToUI('log', { level: 'info', message: 'Refreshing WhatsApp Web to avoid detection...' });
            refreshWhatsAppWeb();
        }
    }, 30 * 60 * 1000); // 30 minutes

    // Simulate human activity every 5-10 minutes
    activityInterval = setInterval(() => {
        if (waClient && isReady) {
            simulateHumanActivity();
        }
    }, Math.random() * 5 * 60 * 1000 + 5 * 60 * 1000); // 5-10 minutes
}

async function refreshWhatsAppWeb() {
    try {
        if (waClient && waClient.pupPage) {
            await waClient.pupPage.reload({ waitUntil: 'networkidle0' });
            sendToUI('log', { level: 'success', message: 'WhatsApp Web refreshed successfully.' });
        }
    } catch (error) {
        sendToUI('log', { level: 'warning', message: `Refresh failed: ${error.message}` });
    }
}

async function simulateHumanActivity() {
    try {
        if (waClient && waClient.pupPage) {
            // Random mouse movements and clicks to simulate human behavior
            const page = waClient.pupPage;
            
            // Move mouse randomly
            await page.mouse.move(
                Math.random() * 800 + 100,
                Math.random() * 600 + 100
            );
            
            // Scroll randomly
            await page.evaluate(() => {
                window.scrollBy(0, Math.random() * 200 - 100);
            });
            
            sendToUI('log', { level: 'info', message: 'Simulated human activity to avoid detection.' });
        }
    } catch (error) {
        // Silently handle errors in activity simulation
        console.log('Activity simulation error:', error.message);
    }
}

async function simulateTyping() {
    try {
        if (waClient && waClient.pupPage) {
            const page = waClient.pupPage;
            
            // Simulate typing in the message input
            await page.evaluate(() => {
                const messageInput = document.querySelector('[data-tab="10"]');
                if (messageInput) {
                    messageInput.focus();
                    // Simulate typing and deleting
                    messageInput.textContent = 'typing...';
                    setTimeout(() => {
                        messageInput.textContent = '';
                    }, 1000);
                }
            });
            
            sendToUI('log', { level: 'info', message: 'Simulated typing activity.' });
        }
    } catch (error) {
        console.log('Typing simulation error:', error.message);
    }
}

async function simulateRandomActivity() {
    try {
        if (waClient && waClient.pupPage) {
            const page = waClient.pupPage;
            
            const activities = [
                // Click on different areas
                () => page.click('body', { delay: Math.random() * 100 }),
                // Random scrolling
                () => page.evaluate(() => window.scrollBy(0, Math.random() * 100 - 50)),
                // Mouse movements
                () => page.mouse.move(Math.random() * 500, Math.random() * 500),
                // Focus different elements
                () => page.evaluate(() => {
                    const elements = document.querySelectorAll('div, span, input');
                    if (elements.length > 0) {
                        const randomElement = elements[Math.floor(Math.random() * elements.length)];
                        if (randomElement.focus) randomElement.focus();
                    }
                })
            ];
            
            // Execute random activity
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            await randomActivity();
            
            sendToUI('log', { level: 'info', message: 'Performed random activity simulation.' });
        }
    } catch (error) {
        console.log('Random activity simulation error:', error.message);
    }
}

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
    // Destroy existing client if it exists
    if (waClient) {
        try {
            waClient.destroy();
        } catch (e) {
            console.log('Error destroying previous client:', e);
        }
    }
    
    // Enhanced browser detection that finds ALL available browsers
    function findAllAvailableBrowsers() {
        const browsers = [
            {
                name: 'Google Chrome',
                paths: [
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
                ],
                icon: '🌐'
            },
            {
                name: 'Microsoft Edge',
                paths: [
                    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
                ],
                icon: '🔷'
            },
            {
                name: 'Brave Browser',
                paths: [
                    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
                ],
                icon: '🦁'
            },
            {
                name: 'Opera',
                paths: [
                    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Opera\\opera.exe'
                ],
                icon: '🎭'
            },
            {
                name: 'Chromium',
                paths: [
                    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
                ],
                icon: '⚙️'
            }
        ];

        const availableBrowsers = [];
        
        console.log('🔍 Scanning for available browsers...');
        sendToUI('log', { level: 'info', message: 'Scanning for available browsers...' });
        
        browsers.forEach(browser => {
            for (const browserPath of browser.paths) {
                try {
                    if (fs.existsSync(browserPath)) {
                        console.log(`✅ Found ${browser.name} at: ${browserPath}`);
                        availableBrowsers.push({
                            name: browser.name,
                            path: browserPath,
                            icon: browser.icon
                        });
                        break; // Only add once per browser type
                    }
                } catch (error) {
                    console.log(`❌ Error checking ${browser.name}:`, error.message);
                }
            }
        });

        console.log(`Found ${availableBrowsers.length} available browsers`);
        sendToUI('log', { level: 'info', message: `Found ${availableBrowsers.length} compatible browsers` });
        
        return availableBrowsers;
    }

    // Get available browsers for selection
    const availableBrowsers = findAllAvailableBrowsers();
    let selectedBrowser = null;

    // Auto-select first browser if any available (FIXED: was === 1, now >= 1)
    if (availableBrowsers.length >= 1) {
        selectedBrowser = availableBrowsers[0].path;
        console.log(`Auto-selected: ${availableBrowsers[0].name}`);
        sendToUI('log', { level: 'success', message: `Auto-selected: ${availableBrowsers[0].name}` });
    } else {
        console.log('❌ No compatible browsers found');
        sendToUI('log', { level: 'error', message: '❌ No compatible browsers found! Please install Chrome or Edge.' });
        sendToUI('log', { level: 'info', message: 'Download Chrome: https://www.google.com/chrome/' });
        selectedBrowser = null;
    }
    
    // Enhanced puppeteer configuration for packaged apps
    const puppeteerConfig = {
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-translate',
            '--disable-sync',
            '--disable-background-networking',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    };
    
    // Only set executablePath if we found a browser
    if (selectedBrowser) {
        puppeteerConfig.executablePath = selectedBrowser;
        console.log(`Using browser: ${selectedBrowser}`);
        sendToUI('log', { level: 'info', message: `Using browser: ${path.basename(selectedBrowser)}` });
    } else {
        console.log('Using system default browser');
        sendToUI('log', { level: 'info', message: 'Using system default browser (this may not work)' });
    }

    waClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(__dirname, '.wwebjs_auth')
        }),
        puppeteer: puppeteerConfig
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

    try {
        console.log('🚀 Starting WhatsApp client initialization...');
        sendToUI('log', { level: 'info', message: 'Starting WhatsApp client initialization...' });
        waClient.initialize();
    } catch (error) {
        console.error('❌ Failed to initialize WhatsApp client:', error);
        sendToUI('log', { level: 'error', message: `Failed to initialize WhatsApp client: ${error.message}` });
    }
}

// Function to initialize WhatsApp client with a specific browser
function initWhatsAppClientWithBrowser(browserPath) {
    // Destroy existing client if it exists
    if (waClient) {
        try {
            waClient.destroy();
        } catch (e) {
            console.log('Error destroying previous client:', e);
        }
    }
    
    console.log(`🚀 Initializing WhatsApp with browser: ${browserPath}`);
    sendToUI('log', { level: 'info', message: `Launching WhatsApp with ${path.basename(browserPath)}...` });
    
    // Verify browser exists
    if (browserPath && !fs.existsSync(browserPath)) {
        console.error(`❌ Browser not found at: ${browserPath}`);
        sendToUI('log', { level: 'error', message: `Browser not found at: ${browserPath}` });
        return;
    }
    
    // Enhanced puppeteer configuration for packaged apps
    const puppeteerConfig = {
        headless: false,
        devtools: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-translate',
            '--disable-sync',
            '--disable-background-networking',
            '--disable-blink-features=AutomationControlled',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    };
    
    // Set the specific browser path
    if (browserPath) {
        puppeteerConfig.executablePath = browserPath;
        console.log(`✅ Using browser: ${browserPath}`);
        sendToUI('log', { level: 'success', message: `Using browser: ${path.basename(browserPath)}` });
    } else {
        console.log('⚠️ No browser path provided, using system default');
        sendToUI('log', { level: 'warning', message: 'No browser path provided, using system default' });
    }

    console.log('📋 Puppeteer config:', JSON.stringify(puppeteerConfig, null, 2));
    sendToUI('log', { level: 'info', message: 'Creating WhatsApp client with enhanced configuration...' });

    try {
        waClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: path.join(__dirname, '.wwebjs_auth')
            }),
            puppeteer: puppeteerConfig
        });

        console.log('✅ WhatsApp client created successfully');
        sendToUI('log', { level: 'success', message: 'WhatsApp client created successfully' });

        waClient.on('loading_screen', (percent, message) => {
            console.log(`[WA] Loading: ${percent}% - ${message}`);
            sendToUI('log', { level: 'info', message: `Loading WhatsApp: ${percent}% - ${message}` });
        });

        waClient.on('qr', qr => {
            console.log('[WA] QR event received');
            qrcode.generate(qr, { small: true });
            sendToUI('log', { level: 'info', message: '📱 QR code generated. Scan with your WhatsApp mobile app.' });
            sendToUI('qr', { qr });
        });

        waClient.on('authenticated', () => {
            console.log('[WA] Authenticated successfully');
            sendToUI('log', { level: 'success', message: '✅ WhatsApp authenticated successfully!' });
        });

        waClient.on('ready', () => {
            console.log('[WA] Client is ready');
            isReady = true;
            sendToUI('log', { level: 'success', message: '🎉 WhatsApp Web client is ready!' });
        });

        waClient.on('auth_failure', (msg) => {
            console.log('[WA] Auth failure:', msg);
            isReady = false;
            sendToUI('log', { level: 'error', message: `WhatsApp authentication failed: ${msg}` });
        });

        waClient.on('disconnected', (reason) => {
            console.log('[WA] Disconnected:', reason);
            isReady = false;
            sendToUI('log', { level: 'error', message: `WhatsApp client disconnected: ${reason}` });
        });

        waClient.on('change_state', state => {
            console.log('[WA] State changed:', state);
            sendToUI('log', { level: 'info', message: `WhatsApp state: ${state}` });
        });

        waClient.on('error', err => {
            console.error('[WA] Client error:', err);
            sendToUI('log', { level: 'error', message: `WhatsApp client error: ${err.message}` });
        });

        console.log('🚀 Starting WhatsApp client initialization...');
        sendToUI('log', { level: 'info', message: '🚀 Starting WhatsApp client initialization...' });
        
        waClient.initialize().then(() => {
            console.log('✅ WhatsApp client initialization completed');
            sendToUI('log', { level: 'success', message: '✅ WhatsApp client initialization completed' });
        }).catch((error) => {
            console.error('❌ WhatsApp client initialization failed:', error);
            sendToUI('log', { level: 'error', message: `❌ WhatsApp initialization failed: ${error.message}` });
            
            // Try to provide more specific error information
            if (error.message.includes('Could not find browser')) {
                sendToUI('log', { level: 'error', message: '💡 Solution: Please install Google Chrome or Microsoft Edge' });
            } else if (error.message.includes('spawn')) {
                sendToUI('log', { level: 'error', message: '💡 Solution: Browser executable may be corrupted or inaccessible' });
            }
        });

    } catch (error) {
        console.error('❌ Failed to create WhatsApp client:', error);
        sendToUI('log', { level: 'error', message: `Failed to create WhatsApp client: ${error.message}` });
    }
}

// Global variable to store available browsers
let globalAvailableBrowsers = [];
let globalSelectedBrowser = null;

// Shared function to scan for available browsers
async function scanForAvailableBrowsers() {
    const browsers = [
        {
            name: 'Google Chrome',
            paths: [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
            ],
            icon: '🌐'
        },
        {
            name: 'Microsoft Edge',
            paths: [
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
            ],
            icon: '🔷'
        },
        {
            name: 'Brave Browser',
            paths: [
                'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
            ],
            icon: '🦁'
        },
        {
            name: 'Opera',
            paths: [
                'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Opera\\opera.exe'
            ],
            icon: '🎭'
        },
        {
            name: 'Chromium',
            paths: [
                'C:\\Program Files\\Chromium\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
            ],
            icon: '⚙️'
        }
    ];

    const availableBrowsers = [];
    
    browsers.forEach(browser => {
        for (const browserPath of browser.paths) {
            try {
                if (fs.existsSync(browserPath)) {
                    availableBrowsers.push({
                        name: browser.name,
                        path: browserPath,
                        icon: browser.icon
                    });
                    break; // Only add once per browser type
                }
            } catch (error) {
                console.log(`Error checking ${browser.name}:`, error.message);
            }
        }
    });

    return availableBrowsers;
}

// Get available browsers for frontend
ipcMain.handle('get-available-browsers', async () => {
    const browsers = [
        {
            name: 'Google Chrome',
            paths: [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
            ],
            icon: '🌐'
        },
        {
            name: 'Microsoft Edge',
            paths: [
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
            ],
            icon: '🔷'
        },
        {
            name: 'Brave Browser',
            paths: [
                'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
                'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
            ],
            icon: '🦁'
        },
        {
            name: 'Opera',
            paths: [
                'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Opera\\opera.exe'
            ],
            icon: '🎭'
        },
        {
            name: 'Chromium',
            paths: [
                'C:\\Program Files\\Chromium\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
            ],
            icon: '⚙️'
        }
    ];

    const availableBrowsers = [];
    
    browsers.forEach(browser => {
        for (const browserPath of browser.paths) {
            try {
                if (fs.existsSync(browserPath)) {
                    availableBrowsers.push({
                        name: browser.name,
                        path: browserPath,
                        icon: browser.icon
                    });
                    break; // Only add once per browser type
                }
            } catch (error) {
                console.log(`Error checking ${browser.name}:`, error.message);
            }
        }
    });

    globalAvailableBrowsers = availableBrowsers;
    return availableBrowsers;
});

// Set selected browser
ipcMain.handle('set-selected-browser', async (event, browserPath) => {
    globalSelectedBrowser = browserPath;
    console.log(`Browser selected: ${browserPath}`);
    sendToUI('log', { level: 'success', message: `Browser selected: ${path.basename(browserPath)}` });
    return { success: true };
});

// Test browser launch
ipcMain.handle('test-browser-launch', async () => {
    const { spawn } = require('child_process');
    
    try {
        // Get the first available browser
        const browsers = await ipcMain.handle('get-available-browsers')();
        if (browsers.length === 0) {
            sendToUI('log', { level: 'error', message: 'No browsers found for testing' });
            return { success: false, message: 'No browsers found' };
        }
        
        const testBrowser = browsers[0];
        sendToUI('log', { level: 'info', message: `Testing browser launch: ${testBrowser.name}` });
        
        // Try to launch browser with a simple page
        const browserProcess = spawn(testBrowser.path, ['--new-window', 'https://web.whatsapp.com'], {
            detached: true,
            stdio: 'ignore'
        });
        
        browserProcess.unref();
        
        sendToUI('log', { level: 'success', message: `✅ Browser launched successfully: ${testBrowser.name}` });
        return { success: true, message: 'Browser launched successfully' };
        
    } catch (error) {
        console.error('Browser test failed:', error);
        sendToUI('log', { level: 'error', message: `Browser test failed: ${error.message}` });
        return { success: false, message: error.message };
    }
});

ipcMain.handle('connect-whatsapp', async () => {
    if (isReady) {
        return { success: true, message: 'WhatsApp already connected.' };
    } else {
        // Check if we have browsers available
        if (globalAvailableBrowsers.length === 0) {
            // Scan for browsers directly instead of calling the handler
            globalAvailableBrowsers = await scanForAvailableBrowsers();
        }
        
        // If no browser selected and multiple available, ask user to select
        if (!globalSelectedBrowser && globalAvailableBrowsers.length > 1) {
            sendToUI('browser_selection_needed', { browsers: globalAvailableBrowsers });
            return { success: false, message: 'Please select a browser to continue.' };
        }
        
        // Auto-select if only one browser available (FIXED: was === 1, now >= 1)
        if (!globalSelectedBrowser && globalAvailableBrowsers.length >= 1) {
            globalSelectedBrowser = globalAvailableBrowsers[0].path;
            sendToUI('log', { level: 'success', message: `Auto-selected: ${globalAvailableBrowsers[0].name}` });
        }
        
        // If no browsers found
        if (globalAvailableBrowsers.length === 0) {
            sendToUI('log', { level: 'error', message: '❌ No compatible browsers found! Please install Chrome or Edge.' });
            return { success: false, message: 'No compatible browsers found.' };
        }
        
        // Try to reinitialize if not ready
        if (!waClient || waClient.info === undefined) {
            sendToUI('log', { level: 'info', message: 'Initializing WhatsApp client...' });
            initWhatsAppClientWithBrowser(globalSelectedBrowser);
        }
        return { success: false, message: 'Waiting for WhatsApp login. Scan the QR code.' };
    }
});

// Add manual WhatsApp launch handler
ipcMain.handle('launch-whatsapp', async () => {
    try {
        sendToUI('log', { level: 'info', message: 'Launching WhatsApp Web...' });
        initWhatsAppClient();
        return { success: true, message: 'WhatsApp Web launched successfully.' };
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Failed to launch WhatsApp: ${error.message}` });
        return { success: false, message: 'Failed to launch WhatsApp Web.' };
    }
});

// Manual refresh handler
ipcMain.handle('refresh-whatsapp', async () => {
    try {
        sendToUI('log', { level: 'info', message: 'Manually refreshing WhatsApp Web...' });
        await refreshWhatsAppWeb();
        return { success: true, message: 'WhatsApp Web refreshed successfully.' };
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Manual refresh failed: ${error.message}` });
        return { success: false, message: 'Failed to refresh WhatsApp Web.' };
    }
});

// Get WhatsApp status
ipcMain.handle('get-whatsapp-status', async () => {
    return {
        isReady,
        hasClient: !!waClient,
        clientState: waClient ? waClient.info : null
    };
});

// Restart WhatsApp client
ipcMain.handle('restart-whatsapp', async () => {
    try {
        sendToUI('log', { level: 'info', message: 'Restarting WhatsApp client...' });
        
        // Clear intervals
        if (refreshInterval) clearInterval(refreshInterval);
        if (activityInterval) clearInterval(activityInterval);
        
        // Destroy and reinitialize
        if (waClient) {
            await waClient.destroy();
        }
        
        isReady = false;
        
        setTimeout(() => {
            initWhatsAppClient();
            startAntibanMechanisms();
        }, 2000);
        
        return { success: true, message: 'WhatsApp client restarted successfully.' };
    } catch (error) {
        sendToUI('log', { level: 'error', message: `Restart failed: ${error.message}` });
        return { success: false, message: 'Failed to restart WhatsApp client.' };
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
    
    // FORCE session reset before starting
    sessionControl.paused = false;
    sessionControl.stopped = false;
    sessionControl.currentSession = null;
    
    const { numbers, message, imagePath } = data;
    sendToUI('log', { level: 'info', message: `Session handler entered. Numbers: ${JSON.stringify(numbers)}, message: ${message}, imagePath: ${imagePath}` });

    // Send session started notification immediately
    sendToUI('session_started', { 
        message: 'Campaign started successfully!',
        total: numbers.length,
        sessionActive: true
    });

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

        // Enhanced Anti-ban delay: Random delay between 4-12 seconds
        if (i > 0) {
            const delay = Math.random() * 8000 + 4000; // 4-12 seconds
            sendToUI('log', { level: 'info', message: `Waiting ${Math.round(delay/1000)}s before next message (anti-ban)...` });
            await new Promise(resolve => setTimeout(resolve, delay));
            // Only break if stopped, not if canProceed is false
            if (sessionControl.stopped) break;
        }
        
        // Enhanced anti-ban measures
        if (i > 0) {
            // Refresh WhatsApp every 8 messages to avoid detection
            if (i % 8 === 0) {
                sendToUI('log', { level: 'info', message: 'Refreshing WhatsApp Web after 8 messages...' });
                await refreshWhatsAppWeb();
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s after refresh
            }
            
            // Simulate typing every 5 messages
            if (i % 5 === 0) {
                await simulateTyping();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Random activity simulation every 3 messages
            if (i % 3 === 0) {
                await simulateRandomActivity();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Long break every 30-40 messages (1-2 minutes)
            const breakInterval = Math.random() * 10 + 30; // 30-40 messages
            if (i > 0 && i % Math.floor(breakInterval) === 0) {
                const longBreak = Math.random() * 60000 + 60000; // 1-2 minutes
                sendToUI('log', { level: 'info', message: `Taking long break for ${Math.round(longBreak/1000)} seconds (anti-ban)...` });
                await new Promise(resolve => setTimeout(resolve, longBreak));
            }
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
    
    // Mark session as stopped and clear session control
    sessionControl.stopped = true;
    sessionControl.paused = false;
    sessionControl.currentSession = null;
    
    // Send multiple completion signals to ensure frontend receives it
    const completionData = { 
        type: 'finished',
        summary: `Campaign completed! Success: ${successCount}, Failed: ${errorCount}, Total: ${numbers.length}`,
        success: successCount,
        failed: errorCount,
        total: numbers.length,
        completed: true,
        sessionActive: false
    };
    
    // Send completion notification multiple times to ensure delivery
    sendToUI('finished', completionData);
    sendToUI('session_complete', completionData);
    sendToUI('campaign_finished', completionData);
    
    sendToUI('log', { level: 'success', message: `Campaign completed successfully! Processed ${numbers.length} contacts.` });
    
    // Force a small delay then send final completion
    setTimeout(() => {
        sendToUI('force_stop', { 
            completed: true, 
            message: 'Campaign finished - forcing UI reset',
            sessionActive: false
        });
    }, 1000);
    
    // Send additional completion signals with delays to ensure delivery
    setTimeout(() => {
        sendToUI('session_ended', { 
            completed: true, 
            sessionActive: false,
            success: successCount,
            failed: errorCount,
            total: numbers.length
        });
    }, 1500);
    
    setTimeout(() => {
        sendToUI('campaign_complete', { 
            completed: true, 
            sessionActive: false,
            forceReset: true
        });
    }, 2000);
    
    return { success: true, message: 'Campaign completed successfully.', completed: true };
});