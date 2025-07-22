const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// List of numbers in WhatsApp format (with country code, no +, and @c.us)
const numbers = [
    '919876543210@c.us', // Replace with your test numbers
    '918765432109@c.us'
];

// Message and image path
const message = 'Hello from whatsapp-web.js! This is a caption.';
const imagePath = './path/to/image.jpg'; // Replace with your image path

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: false }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with WhatsApp on your phone.');
});

client.on('ready', async () => {
    console.log('Client is ready! Sending messages...');
    let media;
    if (fs.existsSync(imagePath)) {
        media = MessageMedia.fromFilePath(imagePath);
    } else {
        console.log('Image file not found:', imagePath);
    }
    for (const number of numbers) {
        try {
            if (media) {
                await client.sendMessage(number, media, { caption: message });
                console.log(`Image with caption sent to ${number}`);
            } else {
                await client.sendMessage(number, message);
                console.log(`Text message sent to ${number}`);
            }
        } catch (err) {
            console.error(`Failed to send to ${number}:`, err.message);
        }
    }
    console.log('All messages attempted. You can close the app.');
    // Optionally, client.destroy();
});

client.initialize();
