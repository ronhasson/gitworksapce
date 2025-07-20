#!/usr/bin/env node

/**
 * Git Workspace MCP Server - JavaScript Implementation
 * 
 * A comprehensive MCP extension that provides intelligent file operations and Git read-only access.
 * Designed to prevent file corruption through intelligent workflow guidance and proper error handling.
 * 
 * Key Features:
 * - Intelligent prompting system to prevent line number guessing
 * - Performance-optimized file indexing with parallel processing
 * - Security-first approach with read-only Git operations
 * - Comprehensive error handling and recovery guidance
 * 
 * Created by: Ron Hasson and Claude (Anthropic)
 * Implements: DXT Extension specification for Claude Desktop
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";

// Constants
const SKIP_DIRS = new Set([
  // Dependencies
  'node_modules', 'vendor', 'venv', 'env', '__pycache__',
  // Build outputs
  'dist', 'build', 'out', 'target', 'bin', 'obj',
  // Framework/tool caches
  '.next', '.nuxt', '.pytest_cache', '.nyc_output', 'coverage',
  // Version control
  '.git', '.svn', '.hg',
  // Editor/IDE
  '.vscode', '.idea', '.vs',
  // Logs and temp
  'logs', 'log', 'tmp', 'temp', '.cache',
  // Other common outputs
  'public/build', 'static/build', '.output'
]);

class GitWorkspaceServer {
  constructor() {
    this.server = new Server(
      {
        name: "git-workspace",
        version: "1.0.0",
      },
      {
        capabilities: {
          logging: {},
          tools: {},
        },
      }
    );

    // Get workspace path from environment or user config
    this.workspacePath = process.env.PROJECT_DIRECTORY || process.cwd();
    this.fileIndex = {};
    this.indexLastUpdated = 0;
    
    this.setupTools();
    this.setupErrorHandlers();
  }

  setupErrorHandlers() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  isSafePath(targetPath) {
    try {
      const resolvedTarget = path.resolve(this.workspacePath, targetPath);
      const resolvedWorkspace = path.resolve(this.workspacePath);
      const relativePath = path.relative(resolvedWorkspace, resolvedTarget);
      
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    } catch (error) {
      return false;
    }
  }

  getFilePriority(filePath, extension) {
    const name = path.basename(filePath).toLowerCase();
    
    // Priority 1: Critical project files
    if (['package.json', 'requirements.txt', 'dockerfile', 'makefile', 'readme.md'].includes(name)) {
      return 1;
    }
    
    // Priority 2: Code files
    const codeExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', 
                           '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'];
    if (codeExtensions.includes(extension)) {
      return 2;
    }
    
    // Priority 3: Config files
    const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'];
    if (configExtensions.includes(extension)) {
      return 3;
    }
    
    // Priority 4: Documentation
    const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
    if (docExtensions.includes(extension)) {
      return 4;
    }
    
    // Priority 5: Other files
    return 5;
  }

  shouldSkipDirectory(dirName) {
    // Skip hidden directories (except specific exceptions)
    if (dirName.startsWith('.') && !dirName.endsWith('.gitignore') && !dirName.endsWith('.env.example')) {
      return true;
    }
    
    // Skip common build/dependency directories
    if (SKIP_DIRS.has(dirName)) {
      return true;
    }
    
    return false;
  }

  async collectFilesFiltered(currentPath) {
    const files = [];
    
    const walk = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip entire directories early - huge performance gain
            if (this.shouldSkipDirectory(entry.name)) {
              continue;
            }
            await walk(fullPath);
          } else if (entry.isFile()) {
            // Skip hidden files (except exceptions)
            if (entry.name.startsWith('.') && 
                !entry.name.endsWith('.gitignore') && 
                !entry.name.endsWith('.env.example')) {
              continue;
            }
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.error(`Cannot read directory ${dirPath}:`, error);
      }
    };
    
    await walk(currentPath);
    return files;
  }

  async buildFileIndex() {
    console.log("Building file index...");
    const startTime = Date.now();
    
    try {
      const allFiles = await this.collectFilesFiltered(this.workspacePath);
      console.log(`Found ${allFiles.length} relevant files (filtered during scan)`);
      
      this.fileIndex = {};
      
      // Process files and build index
      for (const filePath of allFiles) {
        try {
          const relativePath = path.relative(this.workspacePath, filePath);
          const stats = await fs.stat(filePath);
          const extension = path.extname(filePath).toLowerCase();
          
          this.fileIndex[relativePath] = {
            path: relativePath,
            name: path.basename(filePath),
            size: stats.size,
            modified: stats.mtime.getTime(),
            priority: this.getFilePriority(filePath, extension),
            extension: extension
          };
        } catch (error) {
          // Skip files we can't stat
          continue;
        }
      }
      
      this.indexLastUpdated = Date.now();
      const duration = Date.now() - startTime;
      console.log(`File index built: ${Object.keys(this.fileIndex).length} files in ${duration}ms`);
      
    } catch (error) {
      console.error("Failed to build file index:", error);
      throw new Error(`File index build failed: ${error.message}`);
    }
  }

  async runGitCommand(args) {
    const command = args[0];
    
    // Explicitly block write operations
    const blockedCommands = ['add', 'commit', 'push', 'pull', 'merge', 'rebase', 'reset', 'checkout'];
    if (blockedCommands.includes(command)) {
      throw new Error(`Git command '${command}' is not allowed - this MCP only supports read operations`);
    }
    
    return new Promise((resolve, reject) => {
      const gitProcess = spawn('git', args, {
        cwd: this.workspacePath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      gitProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      gitProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      gitProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Git command failed: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });
      
      gitProcess.on('error', (error) => {
        reject(new Error(`Git command execution failed: ${error.message}`));
      });
    });
  }

  async editFileSafely(filePath, lineStart, lineEnd, newContent) {
    const fullPath = path.resolve(this.workspacePath, filePath);
    
    // Create backup
    const originalContent = await fs.readFile(fullPath, 'utf-8');
    
    // Detect line endings
    let lineSeperator = '\n';
    if (originalContent.includes('\r\n')) {
      lineSeperator = '\r\n';
    } else if (originalContent.includes('\r')) {
      lineSeperator = '\r';
    }
    
    // Perform edit
    const lines = originalContent.split(lineSeperator);
    const newLines = newContent.split('\n');
    const linesReplaced = lineEnd - lineStart + 1;
    
    // Validate line numbers
    if (lineStart < 1 || lineStart > lines.length) {
      throw new Error(
        `❌ Invalid line_start ${lineStart} - file only has ${lines.length} lines\n\n` +
        `🔧 TROUBLESHOOTING:\n` +
        `1. Use 'read_file ${filePath}' to see current content\n` +
        `2. Count lines carefully (files start at line 1)\n` +
        `3. Use 'preview_edit' to test parameters safely\n` +
        `💡 The file currently has lines 1-${lines.length}`
      );
    }
    
    if (lineEnd < lineStart || lineEnd > lines.length) {
      throw new Error(
        `❌ Invalid line_end ${lineEnd} - file only has ${lines.length} lines\n\n` +
        `🔧 TROUBLESHOOTING:\n` +
        `1. line_end must be >= line_start (${lineStart})\n` +
        `2. line_end cannot exceed total lines (${lines.length})\n` +
        `3. Use 'read_file ${filePath}' to verify line numbers`
      );
    }
    
    // Replace lines
    lines.splice(lineStart - 1, linesReplaced, ...newLines);
    const newFileContent = lines.join(lineSeperator);
    
    // Write and verify
    await fs.writeFile(fullPath, newFileContent, 'utf-8');
    
    // Verify write success
    try {
      const verificationContent = await fs.readFile(fullPath, 'utf-8');
      if (verificationContent.length === 0 && newFileContent.length > 0) {
        // Corruption detected, restore backup
        await fs.writeFile(fullPath, originalContent, 'utf-8');
        throw new Error("File corruption detected - restored from backup");
      }
    } catch (verifyError) {
      // Restore backup if verification fails
      await fs.writeFile(fullPath, originalContent, 'utf-8');
      throw new Error(`File verification failed - restored from backup: ${verifyError.message}`);
    }
    
    const finalLineCount = lines.length;
    const linesAdded = newLines.length - linesReplaced;
    const lineEndingStyle = lineSeperator === '\r\n' ? 'CRLF' : lineSeperator === '\r' ? 'CR' : 'LF';
    
    return `✅ Successfully edited ${filePath}:\n` +
           `• Replaced ${linesReplaced} lines (lines ${lineStart}-${lineEnd})\n` +
           `• Added ${linesAdded} new lines\n` +
           `• File now has ${finalLineCount} lines (was ${lines.length - linesAdded})\n` +
           `• Line ending style: ${lineEndingStyle}\n\n` +
           `🔍 VERIFICATION RECOMMENDED:\n` +
           `Use 'read_file ${filePath}' to confirm edit looks correct\n` +
           `Use 'git_diff' to see changes in context`;
  }

  setupTools() {
    // List all tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "read_file",
          description: `📖 **EDITING WORKFLOW STEP 1: ALWAYS use this tool first before editing any file**

✅ See current content and structure
✅ Count exact line numbers for edits (lines start at 1)  
✅ Understand context around the changes
✅ Verify the file structure matches expectations

**REQUIRED WORKFLOW FOR EDITING:**
1. Call 'read_file' (this tool) - see current content
2. Call 'preview_edit' - verify what will change
3. Call 'edit_file' - apply the changes  
4. Call 'read_file' again - verify the result

**EXAMPLE:** "Use read_file to see the current structure of auth.js"
Then: "Use preview_edit to show what changing lines 45-50 would do"

⚠️ NEVER edit without reading the file first - line numbers must be exact!`,
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path to file from workspace root"
              }
            },
            required: ["path"]
          }
        },
        {
          name: "preview_edit",
          description: `🛡️ **ESSENTIAL SAFETY TOOL: Always call this tool before using edit_file**

Shows exactly what will change without making any modifications:
✅ Which lines will be removed
✅ What new content will be added
✅ Final line count preview
✅ Zero risk - only shows what would happen

**REQUIRED WORKFLOW:**
1. read_file → 2. preview_edit (this tool) → 3. edit_file → 4. read_file

**EXAMPLE:**
"Use preview_edit to show what changing lines 45-50 would do before I apply it"

⚠️ This is a real tool - call it by name: preview_edit`,
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Relative path to file from workspace root" },
              line_start: { type: "number", description: "Starting line number (1-based)" },
              line_end: { type: "number", description: "Ending line number (optional, defaults to line_start)" },
              new_content: { type: "string", description: "New content to replace the specified lines" }
            },
            required: ["path", "line_start", "new_content"]
          }
        },
        {
          name: "edit_file",
          description: `✏️ **STEP 3: Apply changes after preview_edit confirms they're correct**

**⚠️ CRITICAL WORKFLOW - Follow these exact tool calls in order:**
1. FIRST: Call 'read_file' tool to see current content
2. SECOND: Call 'preview_edit' tool to verify changes  
3. THIRD: Call 'edit_file' tool (this one) with verified parameters
4. FOURTH: Call 'read_file' tool to confirm success

**EXAMPLE WORKFLOW:**
- "Use read_file to check current content"
- "Use preview_edit to show what will change"
- "Use edit_file to apply the changes"
- "Use read_file to verify the result"

❌ NEVER guess line numbers - always use read_file first
🔧 Includes automatic backup and corruption protection`,
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Relative path to file from workspace root" },
              line_start: { type: "number", description: "Starting line number (1-based)" },
              line_end: { type: "number", description: "Ending line number (optional, defaults to line_start)" },
              new_content: { type: "string", description: "New content to replace the specified lines" }
            },
            required: ["path", "line_start", "new_content"]
          }
        },
        {
          name: "write_file",
          description: `📝 **WARNING: This COMPLETELY REPLACES the file content**

✅ Use for: Creating new files, complete rewrites
❌ Don't use for: Small edits (use 'edit_file' tool instead)
❌ Don't use for: Adding/changing a few lines (use 'edit_file' or 'append_to_file' tools)

**WORKFLOW FOR EXISTING FILES:**
1. Call 'read_file' tool first to see current content (if you want to preserve any of it)
2. Call 'write_file' (this tool) to completely replace the file
3. Call 'read_file' tool again to verify the new content

⚠️ CAUTION: This erases ALL existing content - use 'edit_file' for partial changes`,
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Relative path to file from workspace root" },
              content: { type: "string", description: "Content to write to the file" }
            },
            required: ["path", "content"]
          }
        },
        {
          name: "git_status",
          description: "Get Git status of the workspace - shows modified, staged, and untracked files",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "git_diff",
          description: "Get Git diff for specified files or all changes",
          inputSchema: {
            type: "object",
            properties: {
              file_path: { type: "string", description: "Specific file to diff (optional)" },
              staged: { type: "boolean", description: "Show staged changes only", default: false }
            }
          }
        },
        {
          name: "find_files",
          description: "Search for files by name pattern (uses fast file index) - supports wildcards and fuzzy matching",
          inputSchema: {
            type: "object",
            properties: {
              pattern: { type: "string", description: "File name pattern (supports wildcards) or partial filename" },
              case_sensitive: { type: "boolean", description: "Case sensitive search", default: false },
              fuzzy_match: { type: "boolean", description: "Enable fuzzy matching for better results", default: true }
            },
            required: ["pattern"]
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "read_file":
            return await this.handleReadFile(args);
          case "preview_edit":
            return await this.handlePreviewEdit(args);
          case "edit_file":
            return await this.handleEditFile(args);
          case "write_file":
            return await this.handleWriteFile(args);
          case "git_status":
            return await this.handleGitStatus();
          case "git_diff":
            return await this.handleGitDiff(args);
          case "find_files":
            return await this.handleFindFiles(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleReadFile(args) {
    const { path: filePath } = args;
    
    if (!this.isSafePath(filePath)) {
      throw new Error(`❌ Unsafe path: ${filePath}\n\nPath must be within the workspace directory.`);
    }
    
    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split(/\r?\n/);
      const lineCount = lines.length;
      const fileSize = (await fs.stat(fullPath)).size;
      
      // Add line numbers for easy reference
      const numberedLines = lines.map((line, index) => 
        `${String(index + 1).padStart(4, ' ')}: ${line}`
      ).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `📖 **File: ${filePath}** (${lineCount} lines, ${fileSize} bytes)\n\n` +
                  `${numberedLines}\n\n` +
                  `💡 **Next Steps for Editing:**\n` +
                  `1. Use 'preview_edit' to safely test your changes\n` +
                  `2. Use 'edit_file' to apply the changes\n` +
                  `3. Use 'read_file' again to verify the result`
          }
        ]
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`❌ File not found: ${filePath}\n\n🔧 Try using 'find_files' to locate the file.`);
      } else if (error.code === 'EACCES') {
        throw new Error(`❌ Permission denied: ${filePath}`);
      } else {
        throw new Error(`❌ Failed to read file: ${error.message}`);
      }
    }
  }

  async handlePreviewEdit(args) {
    const { path: filePath, line_start: lineStart, line_end, new_content: newContent } = args;
    const lineEnd = line_end || lineStart;
    
    if (!this.isSafePath(filePath)) {
      throw new Error(`❌ Unsafe path: ${filePath}`);
    }

    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      const originalContent = await fs.readFile(fullPath, 'utf-8');
      const lines = originalContent.split(/\r?\n/);
      const newLines = newContent.split('\n');
      
      // Validate line numbers
      if (lineStart < 1 || lineStart > lines.length || lineEnd < lineStart || lineEnd > lines.length) {
        throw new Error(`Invalid line range. File has ${lines.length} lines. Use line numbers 1-${lines.length}.`);
      }
      
      const linesReplaced = lineEnd - lineStart + 1;
      const linesAdded = newLines.length - linesReplaced;
      const finalLineCount = lines.length + linesAdded;
      
      // Show what will be removed
      const removedLines = lines.slice(lineStart - 1, lineEnd).map((line, index) =>
        `  ${lineStart + index}: ${line}`
      ).join('\n');
      
      // Show what will be added
      const addedLines = newLines.map((line, index) =>
        `  ${lineStart + index}: ${line}`
      ).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `🔍 **Preview Edit: ${filePath}**\n\n` +
                  `**LINES TO REMOVE (${lineStart}-${lineEnd}):**\n${removedLines}\n\n` +
                  `**NEW CONTENT TO ADD:**\n${addedLines}\n\n` +
                  `**SUMMARY:**\n` +
                  `• Will replace ${linesReplaced} lines with ${newLines.length} lines\n` +
                  `• Net change: ${linesAdded >= 0 ? '+' : ''}${linesAdded} lines\n` +
                  `• File will have ${finalLineCount} lines (currently ${lines.length})\n\n` +
                  `✅ **This preview looks correct? Use 'edit_file' to apply these changes**\n` +
                  `❌ **Something wrong? Use 'read_file' to check the content again**`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Preview failed: ${error.message}`);
    }
  }

  async handleEditFile(args) {
    const { path: filePath, line_start: lineStart, line_end, new_content: newContent } = args;
    const lineEnd = line_end || lineStart;
    
    if (!this.isSafePath(filePath)) {
      throw new Error(`❌ Unsafe path: ${filePath}`);
    }

    const result = await this.editFileSafely(filePath, lineStart, lineEnd, newContent);
    
    return {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    };
  }

  async handleWriteFile(args) {
    const { path: filePath, content } = args;
    
    if (!this.isSafePath(filePath)) {
      throw new Error(`❌ Unsafe path: ${filePath}`);
    }

    try {
      const fullPath = path.resolve(this.workspacePath, filePath);
      
      // Create directory if needed
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      const stats = await fs.stat(fullPath);
      const lines = content.split(/\r?\n/).length;
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Successfully wrote ${filePath}\n` +
                  `• ${lines} lines\n` +
                  `• ${stats.size} bytes\n\n` +
                  `🔍 Use 'read_file ${filePath}' to verify the content`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async handleGitStatus() {
    try {
      const result = await this.runGitCommand(['status', '--porcelain']);
      
      if (!result.trim()) {
        return {
          content: [
            {
              type: "text",
              text: "✅ Working tree clean - no changes to commit"
            }
          ]
        };
      }
      
      const lines = result.split('\n').filter(line => line.trim());
      let staged = [];
      let unstaged = [];
      let untracked = [];
      
      for (const line of lines) {
        const status = line.substring(0, 2);
        const filePath = line.substring(3);
        
        if (status[0] !== ' ' && status[0] !== '?') {
          staged.push(`${status[0]} ${filePath}`);
        }
        if (status[1] !== ' ') {
          if (status[1] === '?') {
            untracked.push(filePath);
          } else {
            unstaged.push(`${status[1]} ${filePath}`);
          }
        }
      }
      
      let output = "📊 **Git Status:**\n\n";
      
      if (staged.length > 0) {
        output += "**Staged Changes:**\n";
        staged.forEach(item => output += `  ✅ ${item}\n`);
        output += "\n";
      }
      
      if (unstaged.length > 0) {
        output += "**Unstaged Changes:**\n";
        unstaged.forEach(item => output += `  📝 ${item}\n`);
        output += "\n";
      }
      
      if (untracked.length > 0) {
        output += "**Untracked Files:**\n";
        untracked.forEach(item => output += `  ❓ ${item}\n`);
        output += "\n";
      }
      
      return {
        content: [
          {
            type: "text",
            text: output
          }
        ]
      };
    } catch (error) {
      throw new Error(`Git status failed: ${error.message}`);
    }
  }

  async handleGitDiff(args) {
    const { file_path, staged = false } = args || {};
    
    try {
      const gitArgs = ['diff'];
      if (staged) gitArgs.push('--cached');
      if (file_path) gitArgs.push('--', file_path);
      
      const result = await this.runGitCommand(gitArgs);
      
      if (!result.trim()) {
        const target = file_path ? `file ${file_path}` : 'tracked files';
        const type = staged ? 'staged changes' : 'working tree changes';
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ No ${type} for ${target}`
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: `📋 **Git Diff${staged ? ' (Staged)' : ''}${file_path ? ` - ${file_path}` : ''}:**\n\n\`\`\`diff\n${result}\n\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(`Git diff failed: ${error.message}`);
    }
  }

  async handleFindFiles(args) {
    const { pattern, case_sensitive = false, fuzzy_match = true } = args;
    
    // Build index if needed
    if (Object.keys(this.fileIndex).length === 0) {
      await this.buildFileIndex();
    }
    
    const files = Object.values(this.fileIndex);
    const searchPattern = case_sensitive ? pattern : pattern.toLowerCase();
    
    let matches = [];
    
    for (const file of files) {
      const fileName = case_sensitive ? file.name : file.name.toLowerCase();
      const filePath = case_sensitive ? file.path : file.path.toLowerCase();
      
      // Exact matches first
      if (fileName === searchPattern || filePath === searchPattern) {
        matches.push({ ...file, score: 1 });
        continue;
      }
      
      // Pattern matching
      if (pattern.includes('*') || pattern.includes('?')) {
        const regex = new RegExp('^' + searchPattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
        if (regex.test(fileName) || regex.test(filePath)) {
          matches.push({ ...file, score: 0.8 });
          continue;
        }
      }
      
      // Fuzzy matching
      if (fuzzy_match) {
        if (fileName.includes(searchPattern) || filePath.includes(searchPattern)) {
          matches.push({ ...file, score: 0.6 });
        }
      }
    }
    
    // Sort by score and priority
    matches.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.priority - b.priority;
    });
    
    // Limit results
    matches = matches.slice(0, 20);
    
    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `❓ No files found matching pattern: ${pattern}\n\n🔧 Try:\n• Different search terms\n• Using wildcards (*.js)\n• Checking spelling`
          }
        ]
      };
    }
    
    const results = matches.map(file => {
      const sizeStr = file.size < 1024 ? `${file.size}B` : 
                     file.size < 1024*1024 ? `${Math.round(file.size/1024)}KB` :
                     `${Math.round(file.size/(1024*1024))}MB`;
      return `📁 ${file.path} (${sizeStr})`;
    }).join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `🔍 **Found ${matches.length} files matching "${pattern}":**\n\n${results}`
        }
      ]
    };
  }

  async run() {
    try {
      // Build initial file index
      await this.buildFileIndex();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log("🚀 Git Workspace MCP Server running on stdio");
      console.log(`📁 Workspace: ${this.workspacePath}`);
      console.log(`📊 Indexed: ${Object.keys(this.fileIndex).length} files`);
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new GitWorkspaceServer();
server.run().catch(console.error);
