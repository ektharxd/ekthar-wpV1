const express = require('express');
const puppeteer = require('puppeteer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs-extra'); // We need this to clear the session folder

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let browser;
let page;

async function startWhatsApp() {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
        headless: false,
        userDataDir: './whatsapp_session',
        args: ['--start-maximized']
    });
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); 
    await page.setViewport({ width: 0, height: 0 });
    console.log('Navigating to WhatsApp Web...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0' });
    console.log('WhatsApp Web loaded. Please scan the QR code if needed.');
}

const delay = ms => new Promise(res => setTimeout(res, ms));

app.post('/api/send-messages', async (req, res) => {
    const { numbers, message } = req.body;
    if (!numbers || !message) {
        return res.status(400).json({ success: false, message: 'Numbers and message are required.' });
    }
    if (!page) {
        return res.status(500).json({ success: false, message: 'WhatsApp is not initialized. Please restart the server.' });
    }

    console.log(`Request received for ${numbers.length} numbers.`);
    let successCount = 0;
    let errorCount = 0;
    let errorNumbers = [];

    for (const number of numbers) {
        try {
            console.log(`Processing: ${number}`);
            
            // 1. Construct the direct URL with the message pre-filled.
            const chatUrl = `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`;
            
            // 2. Navigate directly to the pre-filled chat
            await page.goto(chatUrl, { waitUntil: 'networkidle0' });

            // 3. Wait for the message box to exist and be ready. This confirms the page is loaded.
            const messageBoxSelector = 'div[contenteditable="true"][data-tab="10"]';
            await page.waitForSelector(messageBoxSelector, { timeout: 20000 });
            await delay(1000); // A brief, crucial pause for the UI to become stable.

            // 4. CRITICAL FIX: Simulate pressing 'Enter' to send the message.
            await page.keyboard.press('Enter');
            
            console.log(`Successfully sent to ${number}`);
            successCount++;
            await delay(2000 + Math.random() * 1000); // A human-like pause after sending.

        } catch (error) {
            console.error(`Failed for ${number}: ${error.message}`);
            errorCount++;
            errorNumbers.push(number);
        }
    }

    const summary = `Finished. Success: ${successCount}, Failed: ${errorCount}.`;
    console.log(summary);
    if(errorCount > 0) { console.log(`Failed numbers: ${errorNumbers.join(', ')}`); }
    res.json({ success: true, message: summary, details: { successCount, errorCount, errorNumbers }});
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startWhatsApp();
});