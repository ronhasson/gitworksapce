// tools/index-management/file-index-stats.js

import { getFileIndexStats } from '../../file-index/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the file_index_stats tool
 * Shows file index statistics and status
 * 
 * @param {Object} args - Tool arguments (none expected)
 * @returns {Object} - Response with file index statistics
 */
export async function fileIndexStats(args) {
  try {
    if (!config.ENABLE_FILE_INDEXING) {
      return {
        content: [{ type: "text", text: "File indexing is disabled" }]
      };
    }
    
    const stats = getFileIndexStats();
    
    const result = [
      `File Index Statistics:`,
      `• Total files indexed: ${stats.totalFiles}`,
      `• Last built: ${stats.lastBuilt}`,
      `• Index enabled: ${config.ENABLE_FILE_INDEXING}`,
      `• Max file size: ${config.MAX_FILE_SIZE_MB}MB`,
      '',
      'File type distribution:',
      ...Object.entries(stats.fileSizeDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ext, count]) => `• ${ext}: ${count} files`)
    ];
    
    return {
      content: [{ type: "text", text: result.join('\n') }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
