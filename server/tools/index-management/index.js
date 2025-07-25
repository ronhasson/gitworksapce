// tools/index-management/index.js
// Index management tool definitions

export const refreshFileIndexDefinition = {
  name: "refresh_file_index",
  description: "Refresh the file index to include newly created files",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

export const fileIndexStatsDefinition = {
  name: "file_index_stats",
  description: "Show file index statistics and status",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

// Export all index management tool definitions
export const indexManagementToolDefinitions = [
  refreshFileIndexDefinition,
  fileIndexStatsDefinition
];
