/**
 * Messaging service for type-safe chrome.runtime messaging
 * Provides a centralized way to send and receive messages
 */

import type { ExtensionMessage } from './types';

// ============================================================================
// MESSAGE SENDER
// ============================================================================

export class MessageSender {
  /**
   * Send a message to the background script
   * Handles errors gracefully and returns a promise
   */
  static async send<T extends ExtensionMessage>(
    message: T
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.runtime?.id) {
          reject(new Error('Extension context invalidated'));
          return;
        }

        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            // Context invalidated or no receiver
            console.debug('[Messaging] Error:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('[Messaging] Send failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Send a message without waiting for response
   * Useful for fire-and-forget notifications
   */
  static sendAsync<T extends ExtensionMessage>(message: T): void {
    try {
      if (!chrome?.runtime?.id) return;
      
      chrome.runtime.sendMessage(message).catch(() => {
        // Silently ignore - receiver might not be available
      });
    } catch (error) {
      // Silently ignore
    }
  }
}

// ============================================================================
// MESSAGE RECEIVER
// ============================================================================

type MessageListener<T extends ExtensionMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<any> | any;

export class MessageReceiver {
  private static listeners = new Map<string, Set<MessageListener<any>>>();
  private static initialized = false;

  /**
   * Register a message listener for a specific message type
   */
  static on<T extends ExtensionMessage>(
    messageType: T['type'],
    listener: MessageListener<T>
  ): () => void {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }

    this.listeners.get(messageType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(messageType);
      if (set) {
        set.delete(listener);
      }
    };
  }

  /**
   * Initialize the global message listener
   */
  private static initialize(): void {
    if (this.initialized) return;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const listeners = this.listeners.get(message.type);
      
      if (!listeners || listeners.size === 0) {
        return false;
      }

      // Execute all listeners for this message type
      const promises: Promise<any>[] = [];
      let hasAsync = false;

      listeners.forEach((listener) => {
        try {
          const result = listener(message, sender);
          if (result instanceof Promise) {
            hasAsync = true;
            promises.push(result);
          } else if (result !== undefined) {
            sendResponse(result);
          }
        } catch (error) {
          console.error('[Messaging] Listener error:', error);
        }
      });

      // If any listener is async, wait for all and send last response
      if (hasAsync) {
        Promise.all(promises)
          .then((results) => {
            const lastResult = results[results.length - 1];
            if (lastResult !== undefined) {
              sendResponse(lastResult);
            }
          })
          .catch((error) => {
            console.error('[Messaging] Async listener error:', error);
            sendResponse({ error: error.message });
          });
        
        return true; // Keep channel open for async response
      }

      return false;
    });

    this.initialized = true;
  }

  /**
   * Remove all listeners for a message type
   */
  static off(messageType: string): void {
    this.listeners.delete(messageType);
  }

  /**
   * Clear all listeners
   */
  static clear(): void {
    this.listeners.clear();
  }
}
