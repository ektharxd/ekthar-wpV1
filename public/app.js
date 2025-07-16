// --- Element Selectors ---
const sendButton = document.getElementById('sendMessageBtn');
const fileInput = document.getElementById('excelFile');
const messageInput = document.getElementById('message');
const fileNameSpan = document.getElementById('fileName');
const logContainer = document.getElementById('live-log-container');
const successCountEl = document.getElementById('success-count');
const failedCountEl = document.getElementById('failed-count');
const totalCountEl = document.getElementById('total-count');
const progressBarFillEl = document.getElementById('progress-bar-fill');
const successListEl = document.getElementById('success-list');
const failedListEl = document.getElementById('failed-list');

// Track numbers in UI to prevent visual duplicates
let numbersInSuccessList = new Set();
let numbersInFailedList = new Set();

// --- WebSocket Connection ---
let ws;
function connectWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.onopen = () => logToUI('Connected to server.', 'info');
    ws.onclose = () => logToUI('Connection lost. Please refresh the page.', 'error');
    ws.onmessage = handleServerMessage;
}
connectWebSocket(); // Connect on page load

// --- UI Logic ---
fileInput.addEventListener('change', () => fileNameSpan.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'No file selected.');

function resetUI() {
    [logContainer, successListEl, failedListEl].forEach(el => el.innerHTML = '');
    [successCountEl, failedCountEl, totalCountEl].forEach(el => el.textContent = '0');
    progressBarFillEl.style.width = '0%';
    numbersInSuccessList.clear();
    numbersInFailedList.clear();
    sendButton.disabled = false;
    sendButton.textContent = 'Send Messages';
}

function logToUI(message, level = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    logEntry.textContent = `> ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function downloadLog(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `whatsapp-session-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- Main Message Handler ---
function handleServerMessage(event) {
    const data = JSON.parse(event.data);
    const { successCount, errorCount, number } = data;

    switch (data.type) {
        case 'log':
            logToUI(data.message, data.level);
            break;

        case 'update':
            const total = parseInt(totalCountEl.textContent);
            const processedCount = (successCount || parseInt(successCountEl.textContent)) + (errorCount || parseInt(failedCountEl.textContent));
            progressBarFillEl.style.width = `${(processedCount / total) * 100}%`;
            
            if (data.status === 'success') {
                successCountEl.textContent = successCount;
                // --- FIX: Prevent duplicate list items ---
                if (!numbersInSuccessList.has(number)) {
                    const li = document.createElement('li');
                    li.textContent = number;
                    successListEl.appendChild(li);
                    numbersInSuccessList.add(number);
                }
            } else {
                failedCountEl.textContent = errorCount;
                if (!numbersInFailedList.has(number)) {
                    const li = document.createElement('li');
                    li.textContent = number;
                    failedListEl.appendChild(li);
                    numbersInFailedList.add(number);
                }
            }
            break;

        case 'finished':
            logToUI(data.summary, 'info');
            sendButton.disabled = false;
            sendButton.textContent = 'Run Another Session';
            downloadLog(data.logContent);
            break;
    }
}

// --- Button Click to Start Process ---
sendButton.addEventListener('click', () => {
    if (fileInput.files.length === 0 || !messageInput.value) {
        alert('Please select a file and enter a message.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        resetUI();
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).flat();
        const phoneNumbers = allData.filter(item => /^\d{10,}$/.test(String(item)));

        if (phoneNumbers.length === 0) {
            alert('No valid phone numbers found in the file.');
            return;
        }

        totalCountEl.textContent = phoneNumbers.length;
        sendButton.disabled = true;
        sendButton.textContent = 'Session in Progress...';
        
        ws.send(JSON.stringify({
            type: 'start',
            numbers: phoneNumbers,
            message: messageInput.value,
        }));
    };
    reader.readAsArrayBuffer(file);
});