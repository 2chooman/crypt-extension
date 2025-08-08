/**
 * Content script injected into the active tab. It renders a self-contained
 * Shadow DOM modal that allows the user to encrypt or decrypt arbitrary text
 * using a shared key. All crypto operations run locally via the Web Crypto API.
 */
(async () => {
  // Avoid injecting multiple overlays if the content script runs again
  if (document.getElementById('sample-extension-overlay')) return;

  // Load and register the custom font used within the modal
  const font = new FontFace(
    'Titillium Web',
    `url('${chrome.runtime.getURL('fonts/TitilliumWeb-Regular.ttf')}')`
  );
  await font.load();
  document.fonts.add(font);

  // Create a host element and attach a Shadow DOM for style isolation
  const overlayHost = document.createElement('div');
  overlayHost.id = 'sample-extension-overlay';
  const shadow = overlayHost.attachShadow({ mode: 'open' });

  /** Inject a stylesheet link into the shadow root. */
  const addStyle = href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    shadow.appendChild(link);
  };
  addStyle('https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css');
  addStyle(chrome.runtime.getURL('modal.css'));

  // Load the modal markup and append it to the shadow root
  const html = await (await fetch(chrome.runtime.getURL('modal.html'))).text();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html.trim();
  const overlay = wrapper.firstElementChild;
  shadow.appendChild(overlay);

  // Shorthand to lookup elements inside the shadow DOM
  const $ = id => shadow.getElementById(id);
  const inputEl = $('input-text');
  const outputEl = $('output-text');
  const keyEl = $('key-input');

  // Wire up clipboard copy buttons for each field
  shadow.querySelectorAll('.copy-btn').forEach(btn => {
    const target = $(btn.dataset.target);
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(target.value);
      } catch (e) {
        console.error('Copy failed', e);
      }
    });
  });

  // Prevent host page keyboard shortcuts from intercepting input while typing
  const stopPropagation = e => e.stopPropagation();
  [inputEl, outputEl, keyEl].forEach(el => {
    ['keydown', 'keyup', 'keypress'].forEach(type => {
      el.addEventListener(type, stopPropagation);
      el.addEventListener(type, stopPropagation, true);
    });
  });

  /**
   * Import a string as a 16-byte AES-CBC key.
   * Only the first 16 bytes of the provided string are used.
   */
  const importKey = keyStr => {
    const keyBytes = new TextEncoder().encode(keyStr).slice(0, 16);
    const keyBuffer = new Uint8Array(16);
    keyBuffer.set(keyBytes);
    return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-CBC' }, false, [
      'encrypt',
      'decrypt',
    ]);
  };

  /** Convert an ArrayBuffer to a base64 string. */
  const bufferToBase64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));

  /** Convert a base64 string back into a Uint8Array buffer. */
  const base64ToBuffer = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  /**
   * Encrypt text with the supplied key.
   * Returns base64 encoded IV + ciphertext.
   */
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

  /** Decrypt previously encrypted text using the supplied key. */
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

  /**
   * Higher-order function returning an event handler that processes the input
   * using the provided crypto function (encrypt or decrypt).
   */
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

  // Hook up button actions within the modal
  shadow
    .querySelector('.encrypt-btn')
    .addEventListener('click', handleCrypto(encryptText));
  shadow
    .querySelector('.decrypt-btn')
    .addEventListener('click', handleCrypto(decryptText));
  shadow
    .querySelector('.close-btn')
    .addEventListener('click', () => overlayHost.remove());

  // Finally, inject the shadow host into the page
  document.body.appendChild(overlayHost);
})();

