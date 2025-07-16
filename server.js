const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra'); // For file system operations

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
    console.log('Launching browser...');
    browser = await puppeteer.launch({
        headless: false,
        userDataDir: './whatsapp_session',
        args: ['--start-maximized']
    });
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    console.log('Navigating to WhatsApp Web...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' });
    console.log('WhatsApp Web loaded. Please scan the QR code if needed.');
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// --- In server.js ---

async function handleBulkSend({ numbers, message }) {
    if (!page) {
        sendToClient('log', { level: 'error', message: 'WhatsApp is not ready. Please restart the server.' });
        return;
    }

    sendToClient('log', { level: 'info', message: `Request received for ${numbers.length} numbers.` });
    
    let successCount = 0;
    let errorCount = 0;
    let errorNumbers = []; // Fixed: defined errorNumbers here
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
            
            // Give the UI a moment to stabilize before sending
            await delay(1200);

            // Send by pressing Enter
            await page.keyboard.press('Enter');

            // --- THE CRITICAL FIX ---
            // Add a static delay AFTER sending to ensure the message is processed by WhatsApp's servers
            // before we navigate away. This prevents the "phantom send" issue.
            await delay(1500); 
            // ------------------------

            const successMsg = `Successfully sent to ${number}`;
            console.log(successMsg);
            sessionLog.push(`[SUCCESS] ${successMsg}`);
            successCount++;
            sendToClient('update', { status: 'success', number, successCount });
            
            await delay(500); // Short delay before starting the next loop

        } catch (error) {
            const errorMsg = `Failed for ${number}: ${error.message.split('\n')[0]}`;
            console.error(errorMsg);
            sessionLog.push(`[FAIL] ${errorMsg}`);
            errorCount++;
            errorNumbers.push(number);
            sendToClient('update', { status: 'fail', number, errorCount });
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
    startWhatsApp();
});