/**
 * Configuration settings for Git Workspace MCP Server
 * Handles environment variable processing and configuration validation
 */

import os from 'os';

/**
 * Load and validate configuration from environment variables
 * @returns {Object} Configuration object
 */
export function loadConfig() {
  const config = {
    // Workspace configuration
    WORKSPACE_PATH: process.env.WORKSPACE_PATH || process.cwd(),
    
    // File indexing configuration
    ENABLE_FILE_INDEXING: process.env.ENABLE_FILE_INDEXING !== 'false',
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),
    
    // Debug configuration
    DEBUG_MODE: process.env.DEBUG_MODE === 'true',
  };

  // Derived configuration
  config.MAX_FILE_SIZE_BYTES = config.MAX_FILE_SIZE_MB * 1024 * 1024;

  return config;
}

/**
 * Get the current configuration
 */
export const config = loadConfig();

/**
 * Validate configuration values
 * @param {Object} config - Configuration object to validate
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (!config.WORKSPACE_PATH) {
    throw new Error('WORKSPACE_PATH must be specified');
  }

  if (config.MAX_FILE_SIZE_MB <= 0) {
    throw new Error('MAX_FILE_SIZE_MB must be positive');
  }

  if (typeof config.ENABLE_FILE_INDEXING !== 'boolean') {
    throw new Error('ENABLE_FILE_INDEXING must be a boolean');
  }

  if (typeof config.DEBUG_MODE !== 'boolean') {
    throw new Error('DEBUG_MODE must be a boolean');
  }
}

// Validate the loaded configuration
validateConfig(config);
