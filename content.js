(async () => {
  if (document.getElementById('sample-extension-overlay')) {
    return;
  }

  const htmlUrl = chrome.runtime.getURL('modal.html');
  const response = await fetch(htmlUrl);
  const html = await response.text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const overlay = wrapper.firstElementChild;

  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = chrome.runtime.getURL('modal.css');
  document.head.appendChild(cssLink);

  const inputEl = overlay.querySelector('#input-text');
  const outputEl = overlay.querySelector('#output-text');
  const keyEl = overlay.querySelector('#key-input');

  function importKey(keyStr) {
    const enc = new TextEncoder();
    const keyBytes = enc.encode(keyStr);
    const keyBuffer = new Uint8Array(16);
    keyBuffer.set(keyBytes.slice(0, 16));
    return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-CBC' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async function encryptText(text, keyStr) {
    const key = await importKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      new TextEncoder().encode(text)
    );
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    return bufferToBase64(combined);
  }

  async function decryptText(cipherText, keyStr) {
    const data = base64ToBuffer(cipherText);
    const iv = data.slice(0, 16);
    const encrypted = data.slice(16);
    const key = await importKey(keyStr);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  }

  overlay.querySelector('.encrypt-btn').addEventListener('click', async () => {
    if (!keyEl.value) {
      outputEl.value = 'Key required';
      return;
    }
    try {
      outputEl.value = await encryptText(inputEl.value, keyEl.value);
    } catch (e) {
      outputEl.value = `Error: ${e.message}`;
    }
  });

  overlay.querySelector('.decrypt-btn').addEventListener('click', async () => {
    if (!keyEl.value) {
      outputEl.value = 'Key required';
      return;
    }
    try {
      outputEl.value = await decryptText(inputEl.value, keyEl.value);
    } catch (e) {
      outputEl.value = `Error: ${e.message}`;
    }
  });

  overlay.querySelector('.close-btn').addEventListener('click', () => {
    overlay.remove();
    cssLink.remove();
  });

  document.body.appendChild(overlay);
})();
