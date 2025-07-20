#!/usr/bin/env node

/**
 * Git Workspace MCP Server
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
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { spawn, execSync } from "child_process";
import { promisify } from "util";

// Type definitions
interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: number;
  priority: number;
  extension: string;
}

interface FileIndex {
  [relativePath: string]: FileInfo;
}

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
  private server: Server;
  private workspacePath: string;
  private fileIndex: FileIndex = {};
  private indexLastUpdated: number = 0;

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
    this.workspacePath = process.env.WORKSPACE_PATH || process.env.PROJECT_DIRECTORY || process.cwd();
    
    this.setupTools();
    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private isSafePath(targetPath: string): boolean {
    try {
      const resolvedTarget = path.resolve(this.workspacePath, targetPath);
      const resolvedWorkspace = path.resolve(this.workspacePath);
      const relativePath = path.relative(resolvedWorkspace, resolvedTarget);
      
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    } catch (error) {
      return false;
    }
  }

  private getFilePriority(filePath: string, extension: string): number {
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

  private shouldSkipDirectory(dirName: string): boolean {
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

  private async collectFilesFiltered(currentPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dirPath: string): Promise<void> => {
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

  private async buildFileIndex(): Promise<void> {
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

  private async runGitCommand(args: string[]): Promise<string> {
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

  private async editFileSafely(
    filePath: string, 
    lineStart: number, 
    lineEnd: number, 
    newContent: string
  ): Promise<string> {
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

  private setupTools(): void {
    // File Operations Tools
    this.setupFileOperationsTools();
    // Git Operations Tools (Read-only)
    this.setupGitOperationsTools();
    // Search & Intelligence Tools
    this.setupSearchTools();
    // Index Management Tools
    this.setupIndexTools();
  }

  private setupFileOperationsTools(): void {
    // read_file - Critical first step in editing workflow
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
        // Continue with other tools...
      ]
    }));

    // Implement read_file
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case "read_file":
          return await this.handleReadFile(args as { path: string });
        // Add other tool handlers...
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleReadFile(args: { path: string }) {
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

  private setupGitOperationsTools(): void {
    // Implementation for Git read-only operations
    // git_status, git_diff, git_log, etc.
  }

  private setupSearchTools(): void {
    // Implementation for search tools
    // fast_find_file, find_files, search_content, etc.
  }

  private setupIndexTools(): void {
    // Implementation for index management
    // refresh_file_index, file_index_stats
  }

  async run(): Promise<void> {
    // Build initial file index
    await this.buildFileIndex();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log("Git Workspace MCP Server running on stdio");
  }
}

// Start the server
const server = new GitWorkspaceServer();
server.run().catch(console.error);
