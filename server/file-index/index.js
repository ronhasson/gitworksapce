// server/file-index/index.js

import fs from 'fs/promises';
import path from 'path';
import { 
  FILE_EXTENSIONS,
  PRIORITY_FILES,
  FILE_PRIORITIES,
  PERFORMANCE_LIMITS
} from '../constants.js';
import { config } from '../config.js';
import { debugLog } from '../utils/index.js';
import { collectFilesFiltered } from './collect.js';

// Extract config values for easier access
const { 
  WORKSPACE_PATH, 
  ENABLE_FILE_INDEXING, 
  MAX_FILE_SIZE_BYTES 
} = config;

// File index for performance - shared state
let fileIndex = new Map();
let indexLastBuilt = null;

/**
 * Get the priority level for a file based on its path and extension
 * 
 * @param {string} filePath - Full path to the file
 * @param {string} extension - File extension (with dot)
 * @returns {number} - Priority level (lower numbers = higher priority)
 */
export function getFilePriority(filePath, extension) {
  const name = path.basename(filePath).toLowerCase();
  
  // Priority 1: Critical project files
  if (PRIORITY_FILES.includes(name)) {
    return FILE_PRIORITIES.CRITICAL;
  }
  
  // Priority 2: Code files
  if (FILE_EXTENSIONS.CODE.includes(extension)) {
    return FILE_PRIORITIES.CODE;
  }
  
  // Priority 3: Config files
  if (FILE_EXTENSIONS.CONFIG.includes(extension)) {
    return FILE_PRIORITIES.CONFIG;
  }
  
  // Priority 4: Documentation
  if (FILE_EXTENSIONS.DOCS.includes(extension)) {
    return FILE_PRIORITIES.DOCS;
  }
  
  // Priority 5: Other files
  return FILE_PRIORITIES.OTHER;
}

/**
 * Build the file index by scanning all files in the workspace
 * This is the main indexing function that populates the fileIndex Map
 * 
 * @returns {Promise<void>}
 */
export async function buildFileIndex() {
  if (!ENABLE_FILE_INDEXING) {
    debugLog('File indexing disabled');
    return;
  }
  
  console.error("Building file index...");
  const startTime = Date.now();
  
  try {
    const allFiles = await collectFilesFiltered(WORKSPACE_PATH);
    console.error(`Found ${allFiles.length} files to index`);
    
    fileIndex.clear();
    let processed = 0;
    
    for (const filePath of allFiles) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > MAX_FILE_SIZE_BYTES) {
          debugLog(`Skipping large file: ${filePath} (${stats.size} bytes)`);
          continue;
        }
        
        const relativePath = path.relative(WORKSPACE_PATH, filePath);
        const extension = path.extname(filePath).toLowerCase();
        
        fileIndex.set(relativePath, {
          path: relativePath,
          name: path.basename(filePath),
          size: stats.size,
          modified: stats.mtime.getTime(),
          priority: getFilePriority(filePath, extension),
          extension
        });
        
        processed++;
        if (processed % PERFORMANCE_LIMITS.INDEX_PROGRESS_INTERVAL === 0) {
          console.error(`Indexed ${processed}/${allFiles.length} files...`);
        }
      } catch (error) {
        debugLog(`Error indexing ${filePath}:`, error.message);
      }
    }
    
    indexLastBuilt = new Date();
    const duration = Date.now() - startTime;
    console.error(`File index built: ${fileIndex.size} files indexed in ${duration}ms`);
  } catch (error) {
    console.error(`Error building file index: ${error.message}`);
  }
}

/**
 * Get access to the file index Map (read-only access recommended)
 * 
 * @returns {Map} - The file index Map
 */
export function getFileIndex() {
  return fileIndex;
}

/**
 * Get the timestamp when the index was last built
 * 
 * @returns {Date|null} - Last built timestamp or null if never built
 */
export function getIndexLastBuilt() {
  return indexLastBuilt;
}

/**
 * Get file index statistics
 * 
 * @returns {Object} - Statistics about the file index
 */
export function getFileIndexStats() {
  const stats = {
    totalFiles: fileIndex.size,
    lastBuilt: indexLastBuilt ? indexLastBuilt.toISOString() : 'Never',
    fileSizeDistribution: {}
  };
  
  // Calculate file type distribution
  for (const [, info] of fileIndex) {
    const ext = info.extension || '(no extension)';
    stats.fileSizeDistribution[ext] = (stats.fileSizeDistribution[ext] || 0) + 1;
  }
  
  return stats;
}

/**
 * Clear the file index (useful for testing or manual refresh)
 */
export function clearFileIndex() {
  fileIndex.clear();
  indexLastBuilt = null;
}
