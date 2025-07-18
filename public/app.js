// --- All Element Selectors ---
const welcomeScreen = document.getElementById('welcome-screen');
const mainAppContainer = document.getElementById('main-app-container');
const connectButton = document.getElementById('connectButton');
const welcomeLogContainer = document.getElementById('welcome-log-container');
const sendButton = document.getElementById('sendButton');
const fileInput = document.getElementById('excelFile');
const messageInput = document.getElementById('message');
const fileDropZone = document.getElementById('file-drop-zone');
const filePrompt = document.getElementById('file-prompt');
const logListEl = document.getElementById('live-log-list');
const successCountEl = document.getElementById('success-count');
const failedCountEl = document.getElementById('failed-count');
const totalCountEl = document.getElementById('total-count');
const resultsListEl = document.getElementById('results-list');

// --- Application State Management ---
function showMainApp() {
    welcomeScreen.style.display = 'none';
    mainAppContainer.classList.add('visible'); // Correctly shows the entire dashboard
    logToUI = createLogger(logListEl); // Switches the log output to the main panel
}

let logToUI = createLogger(welcomeLogContainer); // Start logging to the Welcome Screen

function createLogger(container) {
    return function(message, level) {
        const li = document.createElement('li');
        li.className = `list-item log-entry log-${level}`;
        li.textContent = `> ${message}`;
        container.appendChild(li);
        container.scrollTop = container.scrollHeight;
    }
}

// --- Listener for the Connect Button ---
connectButton.addEventListener('click', async () => {
    connectButton.disabled = true;
    connectButton.innerHTML = `Connecting... Please Wait`;
    
    // --- THE DEFINITIVE FIX ---
    // We now act DIRECTLY on the result of the connection attempt.
    const result = await window.electronAPI.connectWhatsApp();

    if (result.success) {
        // If the backend says it succeeded, we transition the UI.
        showMainApp();
    } else {
        // If it failed, we re-enable the button so the user can try again.
        connectButton.disabled = false;
        connectButton.innerHTML = `<span class="material-symbols-outlined" slot="icon">hub</span> Retry Connection`;
    }
});

// --- Main Message Handler from Backend to UI ---
function handleServerMessage(data) {
    // This handler's only job is to update the UI with logs and stats.
    // It NO LONGER controls the application state. This is much more robust.
    switch (data.type) {
        case 'log':
            logToUI(data.message, data.level);
            break;
        case 'update':
            successCountEl.textContent = data.successCount;
            failedCountEl.textContent = data.errorCount;
            if (data.status === 'success') {
                addResultToList(data.number, 'success');
            } else {
                addResultToList(data.number, 'fail');
            }
            break;
        case 'finished':
            logToUI(data.summary, 'info');
            sendButton.disabled = false;
            sendButton.innerHTML = `<span class="material-symbols-outlined" slot="icon">replay</span> Run Another Session`;
            if (data.logContent) downloadLog(data.logContent);
            break;
    }
}
window.electronAPI.onUpdate(handleServerMessage);

// --- All Other UI Functions and Event Listeners (File handling, lists, etc.) ---
function handleFileSelect(file) {
    fileDropZone.classList.add('has-file');
    filePrompt.textContent = file.name;
}
fileDropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files.length > 0) handleFileSelect(fileInput.files[0]); });
fileDropZone.addEventListener('dragover', (e) => e.preventDefault());
fileDropZone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]); });

function resetUI() {
    [logListEl, resultsListEl].forEach(el => el.innerHTML = '');
    [successCountEl, failedCountEl, totalCountEl].forEach(el => el.textContent = '0');
    sendButton.disabled = false;
    sendButton.innerHTML = `<span class="material-symbols-outlined" slot="icon">rocket_launch</span> Launch Session`;
}

function addResultToList(number, status) {
    const li = document.createElement('li');
    li.className = 'list-item result-item';
    const icon = status === 'success' ? 'check_circle' : 'cancel';
    const color = status === 'success' ? 'var(--m3-success)' : 'var(--m3-error)';
    li.innerHTML = `<span class="material-symbols-outlined" style="color: ${color}; font-size: 20px;">${icon}</span> ${number}`;
    resultsListEl.appendChild(li);
    resultsListEl.scrollTop = resultsListEl.scrollHeight;
}

function downloadLog(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `whatsapp-session-${Date.now()}.txt`;
    a.click();
}

sendButton.addEventListener('click', () => {
    if (fileInput.files.length === 0 || !messageInput.value) { alert('Please select a file and enter a message.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
        resetUI();
        const workbook = XLSX.read(reader.result, { type: 'array' });
        const phoneNumbers = [...new Set(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }).flat().filter(item => /^\d{10,}$/.test(String(item))))];
        if (phoneNumbers.length === 0) { alert('No valid, unique phone numbers found.'); return; }
        totalCountEl.textContent = phoneNumbers.length;
        sendButton.disabled = true;
        sendButton.innerHTML = `Session in Progress...`;
        window.electronAPI.startSession({ numbers: phoneNumbers, message: messageInput.value });
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
});