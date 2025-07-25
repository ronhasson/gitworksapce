// server/file-index/collect.js

import fs from 'fs/promises';
import path from 'path';
import { SKIP_DIRS } from '../constants.js';
import { debugLog } from '../utils/index.js';

/**
 * Check if a directory should be skipped during file collection
 * 
 * @param {string} dirName - Directory name to check
 * @returns {boolean} - True if directory should be skipped
 */
export function shouldSkipDirectory(dirName) {
  return dirName.startsWith('.') || SKIP_DIRS.has(dirName);
}

/**
 * Check if a file should be skipped during file collection
 * 
 * @param {string} fileName - File name to check
 * @returns {boolean} - True if file should be skipped
 */
export function shouldSkipFile(fileName) {
  return fileName.startsWith('.') && 
         !fileName.endsWith('.gitignore') && 
         !fileName.endsWith('.env.example');
}

/**
 * Recursively collect all files in a directory, filtering out unwanted files/directories
 * 
 * @param {string} currentPath - Starting path to collect files from
 * @returns {Promise<string[]>} - Array of absolute file paths
 */
export async function collectFilesFiltered(currentPath) {
  const files = [];
  
  async function walk(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (shouldSkipDirectory(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (shouldSkipFile(entry.name)) {
            continue;
          }
          files.push(fullPath);
        }
      }
    } catch (error) {
      debugLog(`Cannot read directory ${dirPath}:`, error.message);
    }
  }
  
  await walk(currentPath);
  return files;
}
