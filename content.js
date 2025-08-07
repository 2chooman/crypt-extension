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

  overlay.querySelector('.close-btn').addEventListener('click', () => {
    overlay.remove();
    cssLink.remove();
  });

  document.body.appendChild(overlay);
})();
