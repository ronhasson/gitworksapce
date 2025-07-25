/**
 * Logging utilities
 * Provides debug logging and other logging functionality
 */

import { config } from '../config.js';

/**
 * Debug logging function that only logs when DEBUG_MODE is enabled
 * @param {...any} args - Arguments to log (same as console.error)
 */
export function debugLog(...args) {
  if (config.DEBUG_MODE) {
    console.error('[DEBUG]', ...args);
  }
}
