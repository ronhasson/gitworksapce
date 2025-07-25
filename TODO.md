# Git Workspace MCP Refactoring Plan

## Overview

This document outlines the plan to refactor the monolithic `server/index.js` file into a more maintainable and organized structure. The goal is to extract tools and helper functions into separate files grouped by category.

## Directory Structure

Create the following directory structure:

```
server/
├── index.js                  # Main entry point (simplified)
├── config.js                 # Configuration settings
├── constants.js              # Constants like SKIP_DIRS
├── utils/                    # Utility functions
│   ├── index.js              # Re-exports all utilities
│   ├── path.js               # Path validation and normalization
│   ├── file.js               # File operations helpers
│   ├── git.js                # Git command helpers
│   ├── diff.js               # Diff generation utilities
│   ├── line-ending.js        # Line ending detection/normalization
│   └── logger.js             # Logging utilities
├── file-index/               # File indexing system
│   ├── index.js              # Main indexing functionality
│   ├── collect.js            # File collection functions
│   └── search.js             # Search functions
└── tools/                    # All tool implementations
    ├── index.js              # Re-exports all tools
    ├── filesystem/           # File system operations
    │   ├── index.js          # Re-exports all filesystem tools
    │   ├── read-file.js
    │   ├── write-file.js
    │   ├── edit-file.js
    │   ├── preview-edit.js
    │   ├── append-to-file.js
    │   ├── replace-in-file.js
    │   ├── edit-file-advanced.js
    │   ├── list-files.js
    │   ├── create-directory.js
    │   └── delete-file.js
    ├── git/                  # Git operations
    │   ├── index.js          # Re-exports all git tools
    │   ├── git-status.js
    │   ├── git-diff.js
    │   ├── git-log.js
    │   ├── git-list-branches.js
    │   ├── git-compare-branches.js
    │   ├── git-compare-commits.js
    │   ├── git-show-commit.js
    │   ├── git-current-branch.js
    │   └── git-branch-history.js
    ├── search/               # Search operations
    │   ├── index.js          # Re-exports all search tools
    │   ├── fast-find-file.js
    │   ├── find-files.js
    │   └── search-content.js
    ├── analysis/             # Code analysis tools
    │   ├── index.js          # Re-exports all analysis tools
    │   ├── get-project-structure.js
    │   ├── analyze-code-quality.js
    │   └── find-todos-fixmes.js
    └── index-management/     # File index management
        ├── index.js          # Re-exports all index tools
        ├── refresh-file-index.js
        └── file-index-stats.js
```

## Extraction Plan

### 1. Utility Functions

Extract the following utility functions to appropriate files:

#### `utils/path.js`
- `normalizePath()`
- `expandHome()`
- `validatePath()`

#### `utils/file.js`
- `writeFileAtomically()`
- `tailFile()`
- `headFile()`
- `applyFileEdits()`

#### `utils/git.js`
- `runGitCommand()`

#### `utils/diff.js`
- `createUnifiedDiff()`
- `formatDiff()`

#### `utils/line-ending.js`
- `detectLineEnding()`
- `normalizeLineEndings()`

#### `utils/logger.js`
- `debugLog()`

### 2. File Indexing System

Extract the file indexing system to separate files:

#### `file-index/collect.js`
- `shouldSkipDirectory()`
- `shouldSkipFile()`
- `collectFilesFiltered()`

#### `file-index/index.js`
- `getFilePriority()`
- `buildFileIndex()`
- File index data structures

#### `file-index/search.js`
- `searchFileIndex()`

### 3. Tool Implementations

Extract each tool implementation to its own file under the appropriate category:

#### Filesystem Tools
- `read_file` → `tools/filesystem/read-file.js`
- `write_file` → `tools/filesystem/write-file.js`
- `edit_file` → `tools/filesystem/edit-file.js`
- `preview_edit` → `tools/filesystem/preview-edit.js`
- `append_to_file` → `tools/filesystem/append-to-file.js`
- `replace_in_file` → `tools/filesystem/replace-in-file.js`
- `edit_file_advanced` → `tools/filesystem/edit-file-advanced.js`
- `list_files` → `tools/filesystem/list-files.js`
- `create_directory` → `tools/filesystem/create-directory.js`
- `delete_file` → `tools/filesystem/delete-file.js`

#### Git Tools
- `git_status` → `tools/git/git-status.js`
- `git_diff` → `tools/git/git-diff.js`
- `git_log` → `tools/git/git-log.js`
- `git_list_branches` → `tools/git/git-list-branches.js`
- `git_compare_branches` → `tools/git/git-compare-branches.js`
- `git_compare_commits` → `tools/git/git-compare-commits.js`
- `git_show_commit` → `tools/git/git-show-commit.js`
- `git_current_branch` → `tools/git/git-current-branch.js`
- `git_branch_history` → `tools/git/git-branch-history.js`

#### Search Tools
- `fast_find_file` → `tools/search/fast-find-file.js`
- `find_files` → `tools/search/find-files.js`
- `search_content` → `tools/search/search-content.js`
## Implementation Strategy

1. ✅ Create the directory structure first
2. Extract constants and configuration
3. Extract utility functions
4. Extract file indexing system
5. Extract tool definitions to separate files
6. Extract tool implementations
7. Update the main `index.js` file to use the extracted modules
8. Test each component individually
9. Verify the full system works as expected

Extract tool definitions to separate files with the same structure:

- `tools/filesystem/index.js` - Export all filesystem tool definitions
- `tools/git/index.js` - Export all git tool definitions
- `tools/search/index.js` - Export all search tool definitions
- `tools/analysis/index.js` - Export all analysis tool definitions
- `tools/index-management/index.js` - Export all index management tool definitions
- `tools/index.js` - Combine and re-export all tool definitions

### 5. Configuration

Extract all configuration-related code to `config.js`:
- Environment variable processing
- Default values
- Configuration validation

### 6. Constants

Extract all constants to `constants.js`:
- `SKIP_DIRS` and other constants
- `ALLOWED_GIT_COMMANDS`

## File Templates

### Tool Implementation Template

Each tool implementation file should follow this template:

```javascript
// tools/[category]/[tool-name].js

import { validatePath } from '../../utils/path.js';
// Import other required utilities

/**
 * Implementation of the [tool name] tool
 * 
 * @param {Object} args - Tool arguments
 * @returns {Object} - Response with content
 */
export async function [toolFunction](args) {
  try {
    // Implementation
    
    return {
      content: [{ type: "text", text: result }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
```

### Tool Definition Template

```javascript
// tools/[category]/index.js

export const [toolName]Definition = {
  name: "[tool_name]",
  description: "...",
  inputSchema: {
    type: "object",
    properties: {
      // Properties
    },
    required: []
  }
};
```

### Utility Function Template

```javascript
// utils/[utility-type].js

/**
 * [Function description]
 * 
 * @param {[Type]} param - Parameter description
 * @returns {[Type]} - Return value description
 */
export function [utilityFunction](param) {
  // Implementation
}
```

## Implementation Strategy

1. Create the directory structure first
2. Extract constants and configuration
3. Extract utility functions
4. Extract file indexing system
5. Extract tool definitions to separate files
6. Extract tool implementations
7. Update the main `index.js` file to use the extracted modules
8. Test each component individually
9. Verify the full system works as expected

## State Sharing Considerations

Several tools rely on shared state, particularly:
- The file index
- Configuration values
- Workspace path

These should be handled using:
- A singleton module for the file index
- Config export from the config.js
- Context passed to tool implementations

## Error Handling

Maintain the current error handling approach:
- Each tool should handle its own errors
- Return standardized error responses
- Log errors in debug mode

## Testing Process

After refactoring, test each tool individually:
1. Basic functionality
2. Error cases
3. Edge cases (large files, special characters, etc.)

## Debugging Tips

Add debug logging to track:
- File operations
- Tool calls
- Configuration loading
- File indexing operations

## Naming Conventions

- File names: kebab-case (e.g., `git-status.js`)
- Function names: camelCase (e.g., `runGitCommand`)
- Constants: UPPER_SNAKE_CASE (e.g., `SKIP_DIRS`)
- Export names: camelCase for functions, PascalCase for classes

## Code Organization Within Files

Each file should follow this structure:
1. Imports
2. Constants
3. Helper functions (private to the file)
4. Main exported function(s)
5. Additional exports

## Documentation

Each file should include:
- File header comment explaining purpose
- JSDoc for all exported functions
- Examples where appropriate
- Explanation of complex logic

## Example of a Refactored File

Here's an example of how the `read-file.js` tool implementation would look:

```javascript
// tools/filesystem/read-file.js

import { validatePath } from '../../utils/path.js';
import { tailFile, headFile } from '../../utils/file.js';
import fs from 'fs/promises';

/**
 * Implements the read_file tool
 * Reads file contents with optional tail/head operations
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {number} [args.tail] - Number of lines to read from end
 * @param {number} [args.head] - Number of lines to read from start
 * @returns {Object} - Response with file content
 */
export async function readFile(args) {
  try {
    const validPath = await validatePath(args.path);
    
    // Support tail and head operations for large files
    if (args.tail && args.head) {
      throw new Error("Cannot specify both tail and head parameters simultaneously");
    }
    
    if (args.tail) {
      // Use memory-efficient tail implementation for large files
      const tailContent = await tailFile(validPath, args.tail);
      return {
        content: [{ type: "text", text: tailContent }],
      };
    }
    
    if (args.head) {
      // Use memory-efficient head implementation for large files
      const headContent = await headFile(validPath, args.head);
      return {
        content: [{ type: "text", text: headContent }],
      };
    }
    
    const content = await fs.readFile(validPath, "utf-8");
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
```

## Final Main File Structure

After refactoring, the main `index.js` file should:
1. Import all necessary modules
2. Set up error handlers
3. Create the MCP server
4. Register tool definitions and handlers
5. Start the server

This approach will make the codebase more maintainable, testable, and easier to extend with new features.
