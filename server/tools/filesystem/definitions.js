// tools/filesystem/definitions.js
// Filesystem tool definitions

export const readFileDefinition = {
  name: "read_file",
  description: 
    "📋 EDITING WORKFLOW STEP 1: ALWAYS use this tool first before editing any file\n" +
    "✅ See current content and structure\n" +
    "✅ Count exact line numbers for edits (lines start at 1)\n" +
    "✅ Understand context around the changes\n" +
    "✅ Verify the file structure matches expectations\n\n" +
    "REQUIRED WORKFLOW FOR EDITING:\n" +
    "1. Call 'read_file' (this tool) - see current content\n" +
    "2. Call 'preview_edit' - verify what will change\n" +
    "3. Call 'edit_file' - apply the changes\n" +
    "4. Call 'read_file' again - verify the result\n\n" +
    "EXAMPLE: \"Use read_file to see the current structure of auth.js\"\n" +
    "Then: \"Use preview_edit to show what changing lines 45-50 would do\"\n\n" +
    "⚠️ NEVER edit without reading the file first - line numbers must be exact!",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      tail: {
        type: "integer",
        description: "If provided, returns only the last N lines of the file (memory-efficient for large files)"
      },
      head: {
        type: "integer", 
        description: "If provided, returns only the first N lines of the file (memory-efficient for large files)"
      }
    },
    required: ["path"]
  }
};

export const writeFileDefinition = {
  name: "write_file",
  description:
    "⚠️ WARNING: This COMPLETELY REPLACES the file content\n" +
    "✅ Use for: Creating new files, complete rewrites\n" +
    "❌ Don't use for: Small edits (use 'edit_file' tool instead)\n" +
    "❌ Don't use for: Adding/changing a few lines (use 'edit_file' or 'append_to_file' tools)\n\n" +
    "💡 WORKFLOW FOR EXISTING FILES:\n" +
    "1. Call 'read_file' tool first to see current content (if you want to preserve any of it)\n" +
    "2. Call 'write_file' (this tool) to completely replace the file\n" +
    "3. Call 'read_file' tool again to verify the new content\n\n" +
    "🛡️ SAFETY: Has automatic atomic operations and corruption protection\n" +
    "⚠️ CAUTION: This erases ALL existing content - use 'edit_file' for partial changes\n\n" +
    "EXAMPLE:\n" +
    "- \"Use read_file to see what's currently in config.js\"\n" +
    "- \"Use write_file to replace it with the new configuration\"\n" +
    "- \"Use read_file to verify the new config is correct\"",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      content: {
        type: "string",
        description: "Content to write to the file"
      }
    },
    required: ["path", "content"]
  }
};

export const editFileDefinition = {
  name: "edit_file",
  description:
    "✏️ Edit specific lines or sections of a file with ADVANCED CORRUPTION PROTECTION\n" +
    "⚠️ CRITICAL WORKFLOW - Follow these exact tool calls in order:\n" +
    "1. FIRST: Call 'read_file' tool to see current content\n" +
    "2. SECOND: Call 'preview_edit' tool to verify changes\n" +
    "3. THIRD: Call 'edit_file' tool with verified parameters\n" +
    "4. FOURTH: Call 'read_file' tool to confirm success\n\n" +
    "❌ NEVER guess line numbers - always use read_file first\n" +
    "⚠️ This is a real tool - call it by name: preview_edit\n\n" +
    "🛡️ SAFETY FEATURES:\n" +
    "• Automatic backup before editing\n" +
    "• Line ending preservation (CRLF/LF/CR)\n" +
    "• Write verification and corruption detection\n" +
    "• Auto-recovery if corruption detected\n\n" +
    "EXAMPLE WORKFLOW:\n" +
    "- \"Use read_file to check current content\"\n" +
    "- \"Use preview_edit to show what will change\"\n" +
    "- \"Use edit_file to apply the changes\"\n" +
    "- \"Use read_file to verify the result\"",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      line_start: {
        type: "integer",
        description: "Starting line number (1-based)"
      },
      line_end: {
        type: "integer",
        description: "Ending line number (1-based, optional - defaults to line_start)"
      },
      new_content: {
        type: "string",
        description: "New content to replace the specified lines"
      }
    },
    required: ["path", "line_start", "new_content"]
  }
};

export const previewEditDefinition = {
  name: "preview_edit",
  description:
    "🛡️ ESSENTIAL SAFETY TOOL: Always call this tool before using edit_file\n" +
    "Preview what an edit would do before applying it (safer for complex edits)\n\n" +
    "REQUIRED WORKFLOW: read_file → preview_edit → edit_file → read_file\n\n" +
    "⚠️ This is a real tool - call it by name: preview_edit\n\n" +
    "EXAMPLE: \"Use preview_edit to show what changing lines 45-50 would do\"",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      line_start: {
        type: "integer",
        description: "Starting line number (1-based)"
      },
      line_end: {
        type: "integer",
        description: "Ending line number (1-based, optional - defaults to line_start)"
      },
      new_content: {
        type: "string",
        description: "New content to replace the specified lines"
      }
    },
    required: ["path", "line_start", "new_content"]
  }
};

export const appendToFileDefinition = {
  name: "append_to_file",
  description: "Append content to the end of a file with atomic operations",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      content: {
        type: "string",
        description: "Content to append to the file"
      },
      add_newline: {
        type: "boolean",
        description: "Add a newline before the appended content",
        default: true
      }
    },
    required: ["path", "content"]
  }
};

export const replaceInFileDefinition = {
  name: "replace_in_file",
  description:
    "Replace text patterns in a file with INTELLIGENT LINE-BY-LINE MATCHING.\n\n" +
    "💡 RECOMMENDED WORKFLOW:\n" +
    "1. Call 'read_file' tool first to see what text exists and will be replaced\n" +
    "2. Call 'replace_in_file' (this tool) to make the replacements\n" +
    "3. Call 'read_file' tool again to verify the replacements worked correctly\n\n" +
    "🧠 INTELLIGENT FEATURES:\n" +
    "• Exact text matching for simple cases\n" +
    "• Line-by-line matching with flexible whitespace handling\n" +
    "• Indentation preservation\n" +
    "• Atomic file operations\n\n" +
    "✅ Use for: Find and replace operations, updating configuration values\n" +
    "⚠️ TIP: Use 'read_file' first to confirm the search text exists\n" +
    "⚠️ CAUTION: Be specific with search text to avoid unintended replacements\n\n" +
    "EXAMPLE WORKFLOW:\n" +
    "- \"Use read_file to see current config values\"\n" +
    "- \"Use replace_in_file to update the API URL\"\n" +
    "- \"Use read_file to confirm the change worked\"",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      search_text: {
        type: "string",
        description: "Text to search for"
      },
      replace_text: {
        type: "string",
        description: "Text to replace with"
      },
      replace_all: {
        type: "boolean",
        description: "Replace all occurrences (default: first occurrence only)",
        default: false
      }
    },
    required: ["path", "search_text", "replace_text"]
  }
};

export const editFileAdvancedDefinition = {
  name: "edit_file_advanced",
  description:
    "🚀 ADVANCED: Make multiple find-and-replace edits in a single operation\n" +
    "Features intelligent line-by-line matching and indentation preservation\n" +
    "Use when you need to make several related changes at once",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file from workspace root"
      },
      edits: {
        type: "array",
        description: "Array of edit operations to apply sequentially",
        items: {
          type: "object",
          properties: {
            oldText: {
              type: "string",
              description: "Text to search for - must match exactly"
            },
            newText: {
              type: "string", 
              description: "Text to replace with"
            }
          },
          required: ["oldText", "newText"]
        }
      },
      dryRun: {
        type: "boolean",
        description: "Preview changes using git-style diff format",
        default: false
      }
    },
    required: ["path", "edits"]
  }
};

export const listFilesDefinition = {
  name: "list_files",
  description: "List files and directories in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path from workspace root (default: '.')",
        default: "."
      },
      include_hidden: {
        type: "boolean",
        description: "Include hidden files and directories",
        default: false
      },
      recursive: {
        type: "boolean",
        description: "List files recursively",
        default: false
      }
    }
  }
};

export const createDirectoryDefinition = {
  name: "create_directory",
  description: "Create a new directory",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path for the new directory"
      }
    },
    required: ["path"]
  }
};

export const deleteFileDefinition = {
  name: "delete_file",
  description: "Delete a file or directory",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to file/directory to delete"
      }
    },
    required: ["path"]
  }
};

// Export all filesystem tool definitions
export const filesystemToolDefinitions = [
  readFileDefinition,
  writeFileDefinition,
  editFileDefinition,
  previewEditDefinition,
  appendToFileDefinition,
  replaceInFileDefinition,
  editFileAdvancedDefinition,
  listFilesDefinition,
  createDirectoryDefinition,
  deleteFileDefinition
];
