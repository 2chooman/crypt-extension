# CipherMate

CipherMate is a lightweight Chrome extension for encrypting and decrypting text with a shared key. Click the extension icon to inject a modal interface on the current page and secure your messages right in the browser.

## Features
- Encrypt and decrypt text using AES-CBC from the Web Crypto API.
- Modal interface with input, output, and key fields.
- All processing occurs locally; no data ever leaves the page.
- Styled with Bootstrap and a custom dark theme.

## Installation
1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this directory.

## Usage
1. Click the CipherMate icon in the toolbar to open the modal.
2. Enter or paste text into **Enter text**.
3. Provide a shared key in **Key** (the first 16 bytes are used).
4. Click **Encrypt** or **Decrypt** to transform the text.
5. Copy the result from **Output text** and close the modal when finished.

## Development
This extension is fully client-side; no build step is required. Run tests with:

```sh
npm test
```

