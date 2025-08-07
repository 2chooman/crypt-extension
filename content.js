(async () => {
  if (document.getElementById('sample-extension-overlay')) return;

  const overlayHost = document.createElement('div');
  overlayHost.id = 'sample-extension-overlay';
  const shadow = overlayHost.attachShadow({ mode: 'open' });

  const addStyle = href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    shadow.appendChild(link);
  };
  addStyle('https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css');
  addStyle(chrome.runtime.getURL('modal.css'));

  const html = await (await fetch(chrome.runtime.getURL('modal.html'))).text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const overlay = wrapper.firstElementChild;
  shadow.appendChild(overlay);

  const $ = id => shadow.getElementById(id);
  const inputEl = $('input-text');
  const outputEl = $('output-text');
  const keyEl = $('key-input');

  // Prevent host page keyboard shortcuts from intercepting input while typing
  const stopPropagation = e => e.stopPropagation();
  [inputEl, outputEl, keyEl].forEach(el => {
    ['keydown', 'keyup', 'keypress'].forEach(type => {
      el.addEventListener(type, stopPropagation);
      el.addEventListener(type, stopPropagation, true);
    });
  });

  const importKey = keyStr => {
    const keyBytes = new TextEncoder().encode(keyStr).slice(0, 16);
    const keyBuffer = new Uint8Array(16);
    keyBuffer.set(keyBytes);
    return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-CBC' }, false, [
      'encrypt',
      'decrypt',
    ]);
  };

  const bufferToBase64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const base64ToBuffer = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const encryptText = async (text, keyStr) => {
    const key = await importKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      new TextEncoder().encode(text)
    );
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    return bufferToBase64(combined);
  };

  const decryptText = async (cipherText, keyStr) => {
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
  };

  const handleCrypto = fn => async () => {
    if (!keyEl.value) {
      outputEl.value = 'Key required';
      return;
    }
    try {
      outputEl.value = await fn(inputEl.value, keyEl.value);
    } catch (e) {
      outputEl.value = `Error: ${e.message}`;
    }
  };

  shadow.querySelector('.encrypt-btn').addEventListener('click', handleCrypto(encryptText));
  shadow.querySelector('.decrypt-btn').addEventListener('click', handleCrypto(decryptText));
  shadow.querySelector('.close-btn').addEventListener('click', () => overlayHost.remove());

  document.body.appendChild(overlayHost);
})();

