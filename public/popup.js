// Popup script for DevConsole extension
// Test that the extension is working and display status

// Check if chrome.runtime is available
if (chrome?.runtime?.id) {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('DevConsole: Background not responding:', chrome.runtime.lastError.message);
    } else {
      console.log('DevConsole popup loaded, state:', response);
    }
  });
} else {
  console.warn('DevConsole: Extension context invalid');
}
