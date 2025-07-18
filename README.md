# WhatsApp Project v1

A Node.js tool to send WhatsApp messages in bulk using Puppeteer automation, featuring a modern, expressive user interface.

## Features

- **Bulk Sending:** Sends messages to multiple numbers from an uploaded Excel file.
- **Modern UI:** A clean, "frosted glass" interface inspired by modern design principles.
- **Real-time Feedback:** Includes a progress bar, live status log, and success/failed counters.
- **Error Reporting:** Displays a clear list of any numbers that failed to send.

## How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Start the Server:**
    ```bash
    node server.js
    ```
3.  **Launch the UI:** A browser window will open for WhatsApp Web. Scan the QR code. Then, open your regular browser and navigate to `http://localhost:3000`.

## Excel File Format

- The Excel file must contain phone numbers in the **first column (Column A)**.
- **Do not use a header row.** The first cell (A1) should be the first phone number.
- Numbers must include the country code but **no `+` sign, spaces, or dashes**.
  - **Correct:** `919876543210`
  - **Incorrect:** `+91 9876-543210`

---
*Project created by ca4solutions*