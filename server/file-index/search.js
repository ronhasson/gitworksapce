// server/file-index/search.js

import path from 'path';
import { config } from '../config.js';
import { getFileIndex } from './index.js';

// Extract config values for easier access
const { WORKSPACE_PATH, ENABLE_FILE_INDEXING } = config;

/**
 * Search the file index for files matching a query
 * Uses intelligent scoring to rank results by relevance
 * 
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of results to return (default: 10)
 * @returns {string[]} - Array of absolute file paths sorted by relevance
 */
export function searchFileIndex(query, limit = 10) {
  const fileIndex = getFileIndex();
  
  if (!ENABLE_FILE_INDEXING || fileIndex.size === 0) {
    return [];
  }
  
  const results = [];
  const queryLower = query.toLowerCase();
  
  for (const [, info] of fileIndex) {
    let score = 0;
    
    // Exact path match (highest priority)
    if (info.path.toLowerCase() === queryLower) {
      score = 1000;
    }
    // Exact filename match (very high priority)
    else if (info.name.toLowerCase() === queryLower) {
      score = 900;
    }
    // Path contains query (high priority, prefer shorter paths)
    else if (info.path.toLowerCase().includes(queryLower)) {
      score = 500 + (100 - info.path.length); // Prefer shorter paths
    }
    // Filename contains query (medium priority, prefer shorter names)
    else if (info.name.toLowerCase().includes(queryLower)) {
      score = 400 + (50 - info.name.length); // Prefer shorter names
    }
    
    if (score > 0) {
      results.push({ ...info, score });
    }
  }
  
  // Sort by score (desc), then priority (asc), then name (asc)
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
  
  return results.slice(0, limit).map(r => path.resolve(WORKSPACE_PATH, r.path));
}
