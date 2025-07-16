const sendButton = document.getElementById('sendMessageBtn');
const fileInput = document.getElementById('excelFile');
const messageInput = document.getElementById('message');
const logContainer = document.getElementById('log-container');

function log(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-message log-${type}`;
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

sendButton.addEventListener('click', () => {
    if (fileInput.files.length === 0) {
        log('Please select an Excel file.', 'error');
        return;
    }
    if (!messageInput.value) {
        log('Please enter a message to send.', 'error');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
        logContainer.innerHTML = '';
        log(`Reading file: ${file.name}`);

        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).flat();

        // **Filter for valid phone numbers only**
        const phoneNumbers = allData.filter(item => {
            return /^\d{10,}$/.test(String(item));
        });

        if (phoneNumbers.length === 0) {
            log('No valid phone numbers found. Please check your Excel file.', 'error');
            log('Ensure numbers are in the first column, have no headers, and contain only digits (no + or spaces).', 'info');
            return;
        }

        log(`Found ${phoneNumbers.length} valid numbers. Ignored ${allData.length - phoneNumbers.length} invalid entries.`);
        log('Preparing to send...', 'info');
        sendButton.disabled = true;

        try {
            const response = await fetch('/api/send-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numbers: phoneNumbers,
                    message: messageInput.value,
                }),
            });
            const result = await response.json();
            if (result.success) {
                log(result.message, 'summary');
                if (result.details && result.details.errorCount > 0) {
                    log(`Failed numbers: ${result.details.errorNumbers.join(', ')}`, 'error');
                }
            } else {
                log(`Server error: ${result.message}`, 'error');
            }
        } catch (error) {
            log(`CRITICAL ERROR: Could not connect to the server. Is it running?`, 'error');
        } finally {
            sendButton.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
});