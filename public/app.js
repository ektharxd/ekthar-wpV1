// --- Google Identity Services Login ---
const loginPage = document.getElementById('login-page');
const mainAppPage = document.getElementById('main-app-page');
const errorMsg = document.getElementById('error-msg');
const successMsg = document.getElementById('success-msg');
let user = null;

function showError(message) {
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
  }
  if (successMsg) successMsg.style.display = 'none';
}
function showSuccess(message) {
  if (successMsg) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
  }
  if (errorMsg) errorMsg.style.display = 'none';
}
function clearMessages() {
  if (errorMsg) errorMsg.style.display = 'none';
  if (successMsg) successMsg.style.display = 'none';
}

window.onload = function() {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.initialize({
      client_id: '772148919938-sjr2i8bi34ncr95tq9foa9ufhaask9cv.apps.googleusercontent.com',
      callback: handleCredentialResponse
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-login'),
      { theme: 'outline', size: 'large' }
    );
  }
};

function handleCredentialResponse(response) {
  // Decode JWT to get user info
  const base64Url = response.credential.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  user = JSON.parse(jsonPayload);
  localStorage.setItem('beesoft_google_user', JSON.stringify(user));
  showSuccess('Google login successful!');
  setTimeout(() => {
    if (loginPage) loginPage.style.display = 'none';
    if (mainAppPage) mainAppPage.style.display = 'flex';
    initMainUI();
  }, 800);
}

// --- Main UI Logic (from ekthar-wpV1) ---
function initMainUI() {
  // Element Selectors
  const qrContainer = document.getElementById('qr-container');
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
  let isConnected = false; // Will be set based on WhatsApp connection status
  // Logger Setup
  let logToUI = createLogger(logListEl);
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
    if (window.electronAPI && window.electronAPI.selectImage) {
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
    } else {
      showToast('Image selection not available in this environment', 'error');
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
${icon}
${number}
${time}
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
        sendButton.innerHTML = `Session in Progress...`;
        // Debug: log selectedImagePath
        logToUI(`Selected image path: ${selectedImagePath}`, 'info');
        if (window.electronAPI && window.electronAPI.startSession) {
          const sessionData = {
            numbers: phoneNumbers,
            message: messageInput.value.trim(),
            imagePath: selectedImagePath
          };
          logToUI('Calling startSession with: ' + JSON.stringify(sessionData), 'info');
          try {
            const response = await window.electronAPI.startSession(sessionData);
            logToUI('startSession response: ' + JSON.stringify(response), 'info');
          } catch (err) {
            logToUI('startSession error: ' + err.message, 'error');
          }
        } else {
          showToast('Sending not available in this environment', 'error');
        }
      } catch (error) {
        logToUI(`Error processing file: ${error.message}`, 'error');
        showToast(`Error processing file: ${error.message}`, 'error');
        sendButton.disabled = false;
        sendButton.innerHTML = `Send Message`;
      }
    };
    reader.onerror = () => {
      logToUI('Error reading file', 'error');
      showToast('Error reading file', 'error');
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
  });

  // --- Pause/Continue/Stop Controls ---
  const pauseButton = document.getElementById('pauseButton');
  const continueButton = document.getElementById('continueButton');
  const stopButton = document.getElementById('stopButton');

  if (pauseButton) {
    pauseButton.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.pauseSession) {
        logToUI('Pausing session...', 'info');
        await window.electronAPI.pauseSession();
      }
    });
  }
  if (continueButton) {
    continueButton.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.continueSession) {
        logToUI('Continuing session...', 'info');
        await window.electronAPI.continueSession();
      }
    });
  }
  if (stopButton) {
    stopButton.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.stopSession) {
        logToUI('Stopping session...', 'info');
        await window.electronAPI.stopSession();
      }
    });
  }

  // WhatsApp Connection Logic
  async function checkWhatsAppConnection() {
    if (window.electronAPI && window.electronAPI.connectWhatsApp) {
      const status = await window.electronAPI.connectWhatsApp();
      if (status.success) {
        isConnected = true;
        if (qrContainer) qrContainer.innerHTML = '';
        logToUI('WhatsApp connected!', 'success');
      } else {
        isConnected = false;
        logToUI(status.message, 'error');
      }
      validateForm();
    }
  }

  // Listen for backend updates (QR, log, status)
  if (window.electronAPI && window.electronAPI.onUpdate) {
    window.electronAPI.onUpdate((data) => {
      if (data.type === 'qr' && qrContainer) {
        // Show QR code in the UI (as an image using a QR code generator library or as text)
        qrContainer.innerHTML = '';
        const qrImg = document.createElement('img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.qr)}&size=200x200`;
        qrImg.alt = 'Scan this QR code to connect WhatsApp';
        qrContainer.appendChild(qrImg);
        logToUI('Scan the QR code above to connect WhatsApp.', 'info');
        isConnected = false;
        validateForm();
      }
      if (data.type === 'log') {
        logToUI(data.message, data.level || 'info');
        if (data.message && data.message.includes('WhatsApp Web client is ready')) {
          isConnected = true;
          if (qrContainer) qrContainer.innerHTML = '';
          validateForm();
        }
        if (data.message && data.message.includes('WhatsApp client disconnected')) {
          isConnected = false;
          validateForm();
        }
      }
      if (data.type === 'finished') {
        // Session finished, re-enable send button and reset text
        sendButton.disabled = false;
        sendButton.innerHTML = `Send Message`;
      }
    });
  }

  // Check WhatsApp connection on UI load
  checkWhatsAppConnection();

  // Initialize
  validateForm();
}
