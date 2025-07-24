document.addEventListener('DOMContentLoaded', function() {
  // --- THEME SWITCHER ---
  const themeCheckbox = document.getElementById('theme-checkbox');
  const currentTheme = localStorage.getItem('theme');

  if (currentTheme) {
      document.documentElement.setAttribute('data-theme', currentTheme);
    
      if (currentTheme === 'dark') {
          themeCheckbox.checked = true;
      }
  }

  themeCheckbox.addEventListener('change', function() {
      if(this.checked) {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.setAttribute('data-theme', 'light');
          localStorage.setItem('theme', 'light');
      }
  });

  // --- Page Elements ---
  const welcomePage = document.getElementById('welcome-page');
  const mainAppPage = document.getElementById('main-app-page');
  const trialLockPage = document.getElementById('trial-lock-page');

  // --- Trial/Admin Elements ---
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminAuthBtn = document.getElementById('admin-auth-btn');
  const adminLoginError = document.getElementById('admin-login-error');
  const trialInfo = document.getElementById('trial-info');
  const statusAlert = document.getElementById('status-alert');

  // --- Modal Elements ---
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalOk = document.getElementById('modal-ok');
  const modalCancel = document.getElementById('modal-cancel');
  const modalError = document.getElementById('modal-error');

  // --- Utility Functions ---
  function encrypt(str) { return btoa(unescape(encodeURIComponent(str))); }
  function decrypt(str) { try { return decodeURIComponent(escape(atob(str))); } catch { return ''; } }

  function getTrialData() {
    const data = localStorage.getItem('beesoft_trial');
    if (!data) return null;
    try { return JSON.parse(decrypt(data)); } catch { return null; }
  }
  function setTrialData(obj) {
    localStorage.setItem('beesoft_trial', encrypt(JSON.stringify(obj)));
  }
  function getAdminData() {
    const data = localStorage.getItem('beesoft_admin');
    if (!data) return null;
    try { return JSON.parse(decrypt(data)); } catch { return null; }
  }
  function setAdminData(obj) {
    localStorage.setItem('beesoft_admin', encrypt(JSON.stringify(obj)));
  }

  // --- Page Display Logic ---
  function showPage(pageToShow) {
    console.log(`Attempting to show page: ${pageToShow}`);
    [welcomePage, mainAppPage, trialLockPage].forEach(page => {
      if (page) page.style.display = 'none';
    });
    const pageElement = document.getElementById(pageToShow);
    if (pageElement) {
      pageElement.style.display = 'flex';
      console.log(`Successfully displayed page: ${pageToShow}`);
    } else {
      console.error(`Page element not found: ${pageToShow}`);
    }
  }

  // --- Modal Dialog for Input ---
  function showModal({title, bodyHTML, okText, cancelText, onOk, onCancel, validate}) {
    if (!modal) return;
    modalTitle.textContent = title || '';
    modalBody.innerHTML = bodyHTML || '';
    modalOk.textContent = okText || 'OK';
    modalCancel.textContent = cancelText || 'Cancel';
    modal.style.display = 'flex';
    modalError.textContent = '';

    modalOk.onclick = () => {
      if (validate && !validate()) return;
      modal.style.display = 'none';
      if (onOk) onOk();
    };
    modalCancel.onclick = () => {
      modal.style.display = 'none';
      if (onCancel) onCancel();
    };
  }

  // --- Trial Check Logic ---
  function checkTrial() {
    console.log("Checking trial status...");
    const trial = getTrialData();

    if (!trial) {
      console.log("No trial data found. App is locked.");
      showPage('trial-lock-page');
      if(trialInfo) trialInfo.textContent = 'This software is not activated. Please contact an administrator.';
      return;
    }

    if (trial.activated) {
      console.log("App is activated.");
      if(statusAlert) {
        statusAlert.textContent = "Application is permanently activated.";
        statusAlert.style.display = 'block';
        setTimeout(() => { statusAlert.style.display = 'none'; }, 5000);
      }
      showPage('welcome-page');
      return;
    }

    const now = Date.now();
    const expiryDate = trial.start + (trial.days * 24 * 60 * 60 * 1000);
    if (now > expiryDate) {
      console.log("Trial has expired.");
      showPage('trial-lock-page');
      if(trialInfo) trialInfo.textContent = `Trial expired on ${new Date(expiryDate).toLocaleDateString()}.`;
      return;
    }

    const daysLeft = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
    console.log(`Trial is active. ${daysLeft} days left.`);
    if(statusAlert) {
      statusAlert.textContent = `Trial active. You have ${daysLeft} days left.`
      statusAlert.style.display = 'block';
      setTimeout(() => { statusAlert.style.display = 'none'; }, 5000);
    }
    showPage('welcome-page');
  }

  // --- Admin Login Logic ---
  if (adminLoginBtn) {
    adminLoginBtn.onclick = () => {
      console.log("Admin login button clicked.");
      const form = document.getElementById('admin-login-form');
      if (form) {
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
      }
      const errorEl = document.getElementById('admin-login-error');
      if(errorEl) errorEl.textContent = '';
    };
  }

  if (adminAuthBtn) {
    adminAuthBtn.onclick = () => {
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value.trim();
      let admin = getAdminData();

      if (!admin) {
        admin = { username: 'admin', password: 'beesoft@2025' };
      }

      if (admin.username === username && admin.password === password) {
        console.log("Admin authenticated successfully.");
        showModal({
          title: 'Admin Actions',
          bodyHTML: '<div class="input-group"><input id="trial-days-input" type="number" min="1" max="365" placeholder="Set new trial days"></div>' + 
                    '<button id="test-expiry-btn" class="btn m3-outlined">Test Trial Expiry</button>',
          okText: 'Update Trial',
          cancelText: 'Activate App',
          validate: () => {
            const val = document.getElementById('trial-days-input').value;
            if (!val || isNaN(val) || val < 1) {
              const modalError = document.getElementById('modal-error');
              if(modalError) modalError.textContent = 'Please enter valid days.';
              return false;
            }
            return true;
          },
          onOk: () => {
            const days = parseInt(document.getElementById('trial-days-input').value);
            setTrialData({ start: Date.now(), days, activated: false });
            alert('Trial period updated. The app will now reload.');
            location.reload();
          },
          onCancel: () => {
            setTrialData({ start: Date.now(), days: 9999, activated: true });
            alert('Application activated! The app will now reload.');
            location.reload();
          }
        });
        // Add event listener for the test expiry button
        const testExpiryBtn = document.getElementById('test-expiry-btn');
        if(testExpiryBtn) {
            testExpiryBtn.onclick = () => {
                setTrialData({ start: Date.now() - 8 * 24 * 60 * 60 * 1000, days: 7, activated: false }); // Set start date to 1 day ago
                alert('Trial start date set to the past. The app will now reload to show the expired state.');
                location.reload();
            };
        }
      } else {
        console.error("Invalid admin credentials entered.");
        const errorEl = document.getElementById('admin-login-error');
        if (errorEl) errorEl.textContent = 'Invalid admin credentials.';
      }
    };
  }

  // --- Initial Setup ---
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.onclick = () => {
      initMainUI();
      showPage('main-app-page');
    };
  }

  const clearDataBtn = document.getElementById('clear-data-btn');
  if (clearDataBtn) {
    clearDataBtn.onclick = () => {
      showModal({
        title: 'Clear Local Data',
        bodyHTML: 'Are you sure you want to clear all local data, including trial and admin info? This cannot be undone.',
        okText: 'Clear Data',
        cancelText: 'Cancel',
        onOk: () => {
          localStorage.clear();
          alert('Local data cleared. The app will now reload.');
          location.reload();
        }
      });
    };
  }

  checkTrial(); // Initial check to set the correct page

  // --- Network Details Logic ---
  function updateNetworkDetails() {
    console.log("Updating network details...");
    const ipEl = document.getElementById('network-ip');
    const pingEl = document.getElementById('network-ping');
    const statusEl = document.getElementById('network-status');
    const connEl = document.getElementById('network-conn');

    // IP Address
    if(ipEl) fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => ipEl.textContent = data.ip).catch(() => ipEl.textContent = 'Unavailable');
    
    // Ping
    function updatePing() {
      if(!pingEl) return;
      const start = Date.now();
      fetch('https://1.1.1.1/cdn-cgi/trace', {cache:'no-store',mode:'no-cors'}).then(() => pingEl.textContent = (Date.now() - start) + ' ms').catch(() => pingEl.textContent = 'Unavailable');
    }
    updatePing();
    setInterval(updatePing, 5000);

    // Status & Connection
    function updateStatus() {
      if(statusEl) statusEl.textContent = navigator.onLine ? 'Online' : 'Offline';
      if(connEl) {
        if (navigator.connection && navigator.connection.effectiveType) {
          connEl.textContent = navigator.connection.effectiveType;
        } else {
          connEl.textContent = 'Unknown';
        }
      }
    }
    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    if (navigator.connection) navigator.connection.addEventListener('change', updateStatus);
  }
  updateNetworkDetails();
});

// --- Main App UI Logic ---
function initMainUI() {
  console.log("Initializing Main UI...");
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
    if (!container) return () => {}; // Return a no-op function if container is not found
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
    if(fileDropZone) fileDropZone.classList.add('has-file');
    if(filePrompt) filePrompt.textContent = file.name;
    validateForm();
  }
  // Drag and Drop Handlers
  if(fileDropZone) fileDropZone.addEventListener('click', () => fileInput.click());
  if(fileDropZone) fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
  });
  if(fileDropZone) fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('drag-over');
  });
  if(fileDropZone) fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      if(fileInput) fileInput.files = e.dataTransfer.files;
    }
  });
  if(fileInput) fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelect(fileInput.files[0]);
    }
  });
  // Image Handling (Electron dialog)
  if(attachImageBtn) attachImageBtn.addEventListener('click', async () => {
    if (window.electronAPI && window.electronAPI.selectImage) {
      const filePath = await window.electronAPI.selectImage();
      if (filePath) {
        selectedImagePath = filePath;
        const fileName = filePath.split(/[\\/]/).pop();
        if(imageFileName) imageFileName.textContent = fileName;
        if(imageFileName) imageFileName.title = filePath;
        logToUI(`Image selected: ${selectedImagePath}`, 'info');
      } else {
        selectedImagePath = null;
        if(imageFileName) imageFileName.textContent = 'No image selected';
        if(imageFileName) imageFileName.title = '';
        logToUI('Image selection cancelled or no file selected', 'error');
      }
    } else {
      showToast('Image selection not available in this environment', 'error');
    }
  });
  // Form Validation
  function validateForm() {
    if(!sendButton) return;
    const hasFile = fileInput && fileInput.files.length > 0;
    const hasMessage = messageInput && messageInput.value.trim().length > 0;
    sendButton.disabled = !(hasFile && hasMessage);
  }
  if(messageInput) messageInput.addEventListener('input', validateForm);
  // UI Reset
  function resetUI() {
    if(logListEl) logListEl.innerHTML = '';
    if(resultsListEl) resultsListEl.innerHTML = '';
    if(successCountEl) successCountEl.textContent = '0';
    if(failedCountEl) failedCountEl.textContent = '0';
    if(totalCountEl) totalCountEl.textContent = '0';
    selectedImagePath = null;
    if(imageFileName) imageFileName.textContent = 'No image selected';
    if(imageFileName) imageFileName.title = '';
    validateForm();
  }
  // Results Display
  function addResultToList(number, status) {
    if(!resultsListEl) return;
    const item = document.createElement('li');
    item.className = `list-item result-item ${status}`;
    const icon = status === 'success' ? 'check_circle' : 'error';
    const time = new Date().toLocaleTimeString();
    item.innerHTML = `
<span class="material-symbols-outlined">${icon}</span>
<span>${number}</span>
<span>${time}</span>
`;
    resultsListEl.appendChild(item);
    resultsListEl.scrollTop = resultsListEl.scrollHeight;
  }
  // Session Start
  if(sendButton) sendButton.addEventListener('click', async () => {
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
        if(totalCountEl) totalCountEl.textContent = phoneNumbers.length;
        sendButton.disabled = true;
        sendButton.innerHTML = `Session in Progress...`;
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
        if(sendButton) {
            sendButton.disabled = false;
            sendButton.innerHTML = `Send Message`;
        }
      }
    });
  }

  // Check WhatsApp connection on UI load
  checkWhatsAppConnection();

  // Initialize
  validateForm();
}
