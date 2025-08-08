/**
 * Service worker entry point.
 *
 * When the extension's action icon is clicked, this script injects the
 * content script (`content.js`) into the active tab. The content script then
 * handles rendering the encryption/decryption modal in the page context.
 */
chrome.action.onClicked.addListener(tab => {
  // Execute the content script in the context of the current tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });
});
