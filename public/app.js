// Element Selectors
const welcomeScreen = document.getElementById('welcome-screen');
const mainAppContainer = document.getElementById('main-app-container');
const qrContainer = document.getElementById('qr-container');
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
const attachImageBtn = document.getElementById('attachImageBtn');
const imageFileName = document.getElementById('imageFileName');

// State Management
let selectedImagePath = null;
let isConnected = false;

// UI State Management
function showMainApp() {
    welcomeScreen.style.display = 'none';
    mainAppContainer.classList.add('visible');
    logToUI = createLogger(logListEl);
}

// Logger Setup
let logToUI = createLogger(welcomeLogContainer);

// Toast Notification
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.position = 'fixed';
        toast.style.bottom = '32px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = type === 'error' ? '#FF5A5A' : '#32334a';
        toast.style.color = '#fff';
        toast.style.padding = '16px 32px';
        toast.style.borderRadius = '12px';
        toast.style.fontSize = '1.1em';
        toast.style.boxShadow = '0 2px 16px rgba(0,0,0,0.15)';
        toast.style.zIndex = '9999';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

function createLogger(container) {
    return (message, level = 'info') => {
        const item = document.createElement('li');
        item.className = `list-item log-entry ${level}`;
        const timestamp = new Date().toLocaleTimeString();
        item.innerHTML = `[${timestamp}] ${message}`;
        container.appendChild(item);
        container.scrollTop = container.scrollHeight;
    };
}

// Connection Handler
connectButton.addEventListener('click', async () => {
    if (connectButton.disabled) return;
    
    connectButton.disabled = true;
    connectButton.innerHTML = `
        <span class="material-symbols-outlined" slot="icon">sync</span>
        <span class="connecting">Connecting...</span>
    `;
    
    try {
        const result = await window.electronAPI.connectWhatsApp();
        if (result.success) {
            isConnected = true;
            showMainApp();
        } else {
            throw new Error(result.message || 'Connection failed');
        }
    } catch (error) {
        connectButton.disabled = false;
        connectButton.innerHTML = `
            <span class="material-symbols-outlined" slot="icon">hub</span>
            Retry Connection
        `;
        logToUI(error.message || 'Connection failed. Please try again.', 'error');
        showToast(error.message || 'Connection failed. Please try again.', 'error');
    }
});

// Message Handler
function handleServerMessage(data) {
    switch (data.type) {
        case 'qr':
            showQRCode(data.qr);
            break;
        case 'log':
            logToUI(data.message, data.level);
            break;
        case 'update':
            updateStats(data);
            break;
        case 'finished':
            handleSessionFinished(data);
            break;
    }
}

function showQRCode(qr) {
    qrContainer.style.display = 'block';
    qrContainer.innerHTML = '<canvas id="qr-canvas"></canvas><p>Scan this QR code with WhatsApp on your phone.</p>';
    const qrCanvas = document.getElementById('qr-canvas');
    new QRious({
        element: qrCanvas,
        value: qr,
        size: 256
    });
}

function updateStats(data) {
    successCountEl.textContent = data.successCount;
    failedCountEl.textContent = data.errorCount;
    
    if (data.status === 'success') {
        addResultToList(data.number, 'success');
    } else {
        addResultToList(data.number, 'fail');
    }
}

function handleSessionFinished(data) {
    logToUI(data.summary, 'info');
    sendButton.disabled = false;
    sendButton.innerHTML = `
        <span class="material-symbols-outlined" slot="icon">replay</span>
        Run Another Session
    `;
    qrContainer.style.display = 'none'; // Hide QR after session is ready
    // resetUI(); // Only reset when user clicks Reset Session
}

// File Handling
function handleFileSelect(file) {
    fileDropZone.classList.add('has-file');
    filePrompt.textContent = file.name;
    validateForm();
}

// Drag and Drop Handlers
fileDropZone.addEventListener('click', () => fileInput.click());
fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
});
fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('drag-over');
});
fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
        fileInput.files = e.dataTransfer.files;
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
    }
});

// Image Handling (Electron dialog)
attachImageBtn.addEventListener('click', async () => {
    const filePath = await window.electronAPI.selectImage();
    if (filePath) {
        selectedImagePath = filePath;
        const fileName = filePath.split(/[\\/]/).pop();
        imageFileName.textContent = fileName;
        imageFileName.title = filePath;
        logToUI(`Image selected: ${selectedImagePath}`, 'info');
    } else {
        selectedImagePath = null;
        imageFileName.textContent = 'No image selected';
        imageFileName.title = '';
        logToUI('Image selection cancelled or no file selected', 'error');
    }
});

// Form Validation
function validateForm() {
    const hasFile = fileInput.files.length > 0;
    const hasMessage = messageInput.value.trim().length > 0;
    sendButton.disabled = !(hasFile && hasMessage);
}

messageInput.addEventListener('input', validateForm);

// UI Reset
function resetUI() {
    [logListEl, resultsListEl].forEach(el => el.innerHTML = '');
    [successCountEl, failedCountEl, totalCountEl].forEach(el => el.textContent = '0');
    selectedImagePath = null;
    imageFileName.textContent = 'No image selected';
    imageFileName.title = '';
    validateForm();
}

// Results Display
function addResultToList(number, status) {
    const item = document.createElement('li');
    item.className = `list-item result-item ${status}`;
    const icon = status === 'success' ? 'check_circle' : 'error';
    const time = new Date().toLocaleTimeString();
    item.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <span class="number">${number}</span>
        <span class="time">${time}</span>
    `;
    resultsListEl.appendChild(item);
    resultsListEl.scrollTop = resultsListEl.scrollHeight;
}

// Session Start
sendButton.addEventListener('click', async () => {
    if (!isConnected) {
        logToUI('Please connect to WhatsApp first', 'error');
        showToast('Please connect to WhatsApp first', 'error');
        return;
    }

    if (fileInput.files.length === 0 || !messageInput.value.trim()) {
        logToUI('Please select a file and enter a message', 'error');
        showToast('Please select a file and enter a message', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const workbook = XLSX.read(reader.result, { type: 'array' });
            const phoneNumbers = [...new Set(
                XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })
                    .flat()
                    .filter(item => /^\d{10,}$/.test(String(item)))
            )];

            if (phoneNumbers.length === 0) {
                logToUI('No valid phone numbers found in the file', 'error');
                showToast('No valid phone numbers found in the file', 'error');
                return;
            }

            totalCountEl.textContent = phoneNumbers.length;
            sendButton.disabled = true;
            sendButton.innerHTML = `
                <span class="material-symbols-outlined" slot="icon">sync</span>
                Session in Progress...
            `;

            // Debug: log selectedImagePath
            logToUI(`Selected image path: ${selectedImagePath}`, 'info');

            await window.electronAPI.startSession({
                numbers: phoneNumbers,
                message: messageInput.value.trim(),
                imagePath: selectedImagePath
            });
        } catch (error) {
            logToUI(`Error processing file: ${error.message}`, 'error');
            showToast(`Error processing file: ${error.message}`, 'error');
            sendButton.disabled = false;
            sendButton.innerHTML = `
                <span class="material-symbols-outlined" slot="icon">rocket_launch</span>
                Launch Session
            `;
        }
    };

    reader.onerror = () => {
        logToUI('Error reading file', 'error');
        showToast('Error reading file', 'error');
    };

    reader.readAsArrayBuffer(fileInput.files[0]);
});

// Initialize
window.electronAPI.onUpdate(handleServerMessage);
validateForm();
