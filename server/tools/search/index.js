// tools/search/index.js
// Search tool definitions

import { PERFORMANCE_LIMITS } from '../../constants.js';

export const fastFindFileDefinition = {
  name: "fast_find_file",
  description: "Quickly find a specific file by exact or partial path using performance index",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Exact or partial file path to search for"
      },
      limit: {
        type: "integer",
        description: "Maximum number of results to return",
        default: PERFORMANCE_LIMITS.MAX_FAST_FIND_RESULTS
      }
    },
    required: ["file_path"]
  }
};

export const findFilesDefinition = {
  name: "find_files",
  description: "Search for files by name pattern (uses fast file index)",
  inputSchema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "File name pattern (supports wildcards) or partial filename"
      },
      case_sensitive: {
        type: "boolean",
        description: "Case sensitive search",
        default: false
      },
      fuzzy_match: {
        type: "boolean",
        description: "Enable fuzzy matching for better results",
        default: true
      }
    },
    required: ["pattern"]
  }
};

export const searchContentDefinition = {
  name: "search_content",
  description: "Search for text content within files",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for"
      },
      file_pattern: {
        type: "string",
        description: "File pattern to search in (e.g., '*.py')",
        default: "*"
      },
      case_sensitive: {
        type: "boolean",
        description: "Case sensitive search",
        default: false
      }
    },
    required: ["query"]
  }
};

// Export all search tool definitions
export const searchToolDefinitions = [
  fastFindFileDefinition,
  findFilesDefinition,
  searchContentDefinition
];
