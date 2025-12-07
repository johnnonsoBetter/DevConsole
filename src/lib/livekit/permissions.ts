/**
 * LiveKit permission helpers
 * Handles requesting optional Chrome extension permissions for media capture.
 */

const REQUIRED_PERMISSIONS: chrome.permissions.Permissions = {
  permissions: ['audioCapture', 'videoCapture'],
};

/**
 * Ensure the extension has permission to access camera/microphone.
 * Returns true if permission is already granted or successfully requested.
 */
export async function ensureCapturePermissions(): Promise<boolean> {
  // Outside of the extension environment, fall back to allowing.
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) {
    return true;
  }

  return new Promise((resolve) => {
    chrome.permissions.contains(REQUIRED_PERMISSIONS, (hasPermission) => {
      if (chrome.runtime.lastError) {
        console.warn(
          '[LiveKit] Permission check failed:',
          chrome.runtime.lastError.message
        );
        resolve(false);
        return;
      }

      if (hasPermission) {
        resolve(true);
        return;
      }

      chrome.permissions.request(REQUIRED_PERMISSIONS, (granted) => {
        if (chrome.runtime.lastError) {
          console.warn(
            '[LiveKit] Permission request failed:',
            chrome.runtime.lastError.message
          );
          resolve(false);
          return;
        }

        resolve(Boolean(granted));
      });
    });
  });
}
