const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const puppeteer = require('puppeteer-core'); // Changed from 'puppeteer'
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process'); // For finding Chrome
const os = require('os'); // For checking the operating system

// --- Setup Servers ---
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let browser;
let page;
let globalWs; // Store the single WebSocket connection

// --- WebSocket Communication Handler ---
wss.on('connection', (ws) => {
    console.log('Client connected.');
    sendToClient('log', { level: 'info', message: 'UI connected. Ready to start.' });
    globalWs = ws; // Store the connection

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        if (data.type === 'start') {
            await handleBulkSend(data);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
        globalWs = null; // Clear connection
    });
});

// Helper to send structured data to the client
function sendToClient(type, payload) {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify({ type, ...payload }));
    }
}

// --- Browser & Main Logic ---
async function startWhatsApp() {
    console.log('Finding local Google Chrome installation...');
    let executablePath;

    try {
        if (os.platform() === 'win32') {
            const command = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
            const stdout = execSync(command).toString();
            // Parse the command output to find the path
            const match = stdout.match(/REG_SZ\s+(.*)/);
            if (match && match[1]) {
                executablePath = match[1].trim();
            } else {
                throw new Error('Could not parse registry query output.');
            }
        } else {
            // This is a placeholder for Mac/Linux if you ever expand.
            // On Mac, it's usually '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            // On Linux, it's often 'google-chrome'
            throw new Error('Unsupported platform. Only Windows is automatically configured.');
        }

        if (!fs.existsSync(executablePath)) {
            throw new Error('Detected Chrome path does not exist.');
        }

    } catch (e) {
        console.error("Error: Could not find Google Chrome installed on this computer. Please install Google Chrome to use this program.");
        console.error(`Detailed error: ${e.message}`);
        if(globalWs) sendToClient('log', { level: 'error', message: 'Error: Google Chrome is not installed. Please install it to continue.' });
        return; // Stop the function if Chrome is not found
    }

    console.log(`Launching browser from: ${executablePath}`);
    if(globalWs) sendToClient('log', { level: 'info', message: 'Found Google Chrome. Launching browser...' });

    browser = await puppeteer.launch({
        headless: false,
        userDataDir: './whatsapp_session',
        args: ['--start-maximized'],
        // CRITICAL: Use the automatically found Chrome executable
        executablePath: executablePath
    });
    
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    console.log('Navigating to WhatsApp Web...');
    if(globalWs) sendToClient('log', { level: 'info', message: 'Navigating to WhatsApp Web...' });
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' });
    console.log('WhatsApp Web loaded. Please scan the QR code if needed.');
    if(globalWs) sendToClient('log', { level: 'info', message: 'WhatsApp Web loaded. Scan QR code if prompted.' });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function handleBulkSend({ numbers, message }) {
    if (!page) {
        sendToClient('log', { level: 'error', message: 'WhatsApp is not ready. Please restart the server.' });
        return;
    }

    sendToClient('log', { level: 'info', message: `Starting session for ${numbers.length} numbers.` });
    
    let successCount = 0;
    let errorCount = 0;
    let errorNumbers = [];
    const sessionLog = [`Session Start: ${new Date().toLocaleString()}`, `Message: "${message}"`, '---'];

    for (const number of numbers) {
        const logMsg = `Processing: ${number}`;
        console.log(logMsg);
        sendToClient('log', { level: 'info', message: logMsg });
        
        try {
            const chatUrl = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
            await page.goto(chatUrl, { waitUntil: 'networkidle0' });

            const messageBoxSelector = 'div[contenteditable="true"][data-tab="10"]';
            await page.waitForSelector(messageBoxSelector, { timeout: 20000 });
            await delay(1200);

            await page.keyboard.press('Enter');
            await delay(1500); // CRITICAL: Wait for the send to process

            const successMsg = `Successfully sent to ${number}`;
            console.log(successMsg);
            sessionLog.push(`[SUCCESS] ${successMsg}`);
            successCount++;
            sendToClient('update', { status: 'success', number, successCount });
            
            await delay(500);

        } catch (error) {
            const errorMsg = `Failed for ${number}: ${error.message.split('\n')[0]}`;
            console.error(errorMsg);
            sessionLog.push(`[FAIL] ${errorMsg}`);
            errorCount++;
            errorNumbers.push(number);
            sendToClient('update', { status: 'fail', number, errorCount, errorNumbers });
        }
    }
    
    sessionLog.push('---', `Session End: ${new Date().toLocaleString()}`, `Summary: ${successCount} sent, ${errorCount} failed.`);
    sendToClient('finished', { 
        logContent: sessionLog.join('\n'), 
        summary: `Finished. Success: ${successCount}, Failed: ${errorCount}.`
    });
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start the process
    startWhatsApp();
});