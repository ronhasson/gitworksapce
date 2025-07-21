# Git Workspace MCP Extension

A comprehensive Desktop Extension (DXT) that provides AI assistants with intelligent, secure access to Git repositories. This extension combines the robustness of the official filesystem MCP server with advanced Git integration and workflow intelligence.

**Enhanced with advanced corruption protection, memory-efficient operations, and intelligent line-by-line matching.**

## 🎯 **Key Features**

### **🔒 Security First**
- **Atomic File Operations**: All file writes use temporary files and atomic renames to prevent corruption
- **Path Validation**: Comprehensive security validation prevents directory traversal attacks
- **Symlink Protection**: Handles symlinks safely, preventing access outside the workspace
- **Read-Only Git**: All Git operations are read-only - human developers maintain full control

### **🧠 Intelligent Workflow Guidance**
- **Prevents Line Number Guessing**: Tool descriptions guide LLMs to read files before editing
- **Corruption Protection**: Automatic backup and verification for all file operations  
- **Workflow Enforcement**: Built-in best practices prevent common AI coding mistakes
- **Error Recovery**: Comprehensive error handling with actionable recovery suggestions

### **⚡ Performance Optimized**
- **Lightning-Fast File Indexing**: Parallel processing with smart directory filtering
- **Scalable Architecture**: Handles projects from 100 files to 100,000+ files efficiently
- **Memory Efficient**: Optimized for both older laptops and modern workstations
- **Smart Directory Skipping**: Automatically filters out build/dependency directories

### **🔬 Advanced Features** 
- **Memory-Efficient File Operations**: Tail/head support for large files without loading entire content
- **Intelligent Line Matching**: Line-by-line matching with flexible whitespace handling
- **Indentation Preservation**: Maintains code formatting during find/replace operations
- **Write Verification**: Automatic corruption detection with backup restoration
- **Line Ending Preservation**: Properly handles CRLF, LF, and CR across platforms

## 🛠️ **Complete Tool Set**

### **File Operations**
- `read_file` - Read file contents with intelligent workflow guidance (supports tail/head for large files)
- `write_file` - Atomic file writing with corruption protection
- `edit_file` - Line-based editing with diff preview and verification
- `preview_edit` - Preview changes before applying (prevents mistakes)
- `append_to_file` - Safely append content to files
- `replace_in_file` - Find and replace with intelligent line-by-line matching
- `edit_file_advanced` - Multiple find-and-replace operations with indentation preservation

### **Git Operations (Read-Only)**
- `git_status` - Show working tree status
- `git_diff` - Show changes with optional file filtering
- `git_log` - Commit history with customizable output
- `git_list_branches` - List local and remote branches
- `git_compare_branches` - Compare branches with stats
- `git_compare_commits` - Compare specific commits
- `git_show_commit` - Show commit details and diffs
- `git_current_branch` - Show current branch info
- `git_branch_history` - Branch-specific commit history

### **Search & Intelligence**
- `fast_find_file` - Instant file search using performance index
- `find_files` - Pattern-based file search with fuzzy matching
- `search_content` - Search text content across files
- `get_project_structure` - Visual project tree overview
- `analyze_code_quality` - Basic code quality metrics
- `find_todos_fixmes` - Find TODO/FIXME comments across project

### **System Tools**
- `list_files` - Directory listings with filtering options
- `create_directory` - Create directories with full paths
- `delete_file` - Safe file and directory deletion
- `refresh_file_index` - Rebuild performance index
- `file_index_stats` - Show indexing statistics

## 📦 **Installation**

### **For Claude Desktop Users**
1. Download the `.dxt` file
2. Double-click to open with Claude Desktop
3. Follow the configuration prompts
4. Select your Git repository directory
5. The extension will be immediately available

### **For Other MCP Clients**
1. Extract the `.dxt` file (it's a ZIP archive)
2. Install Node.js dependencies: `npm install`
3. Configure your MCP client to use the server:

```json
{
  "git-workspace": {
    "command": "node",
    "args": ["path/to/server/index.js"],
    "env": {
      "WORKSPACE_PATH": "/path/to/your/git/repository"
    }
  }
}
```

## ⚙️ **Configuration Options**

When installing through Claude Desktop, you'll be prompted to configure:

- **Git Workspace Directory**: The root directory of your Git repository (required)
- **Enable Fast File Indexing**: Build an index for faster searching (recommended)
- **Maximum File Size**: Skip files larger than this to prevent performance issues (default: 10MB)
- **Debug Mode**: Enable detailed logging for troubleshooting (default: off)

## 🚀 **Usage Examples**

### **Intelligent File Editing Workflow**

The extension enforces safe editing practices:

```
Human: "Update the API endpoint in config.js"

AI: I'll help you update the API endpoint. Let me first read the current config to see what needs to be changed.

[Uses read_file to see current content]
[Uses preview_edit to show what will change]
[Uses edit_file to apply the changes]  
[Uses read_file to verify the results]
```

### **Git Integration**

Check repository status and review changes:

```
Human: "What changes have I made to the authentication system?"

AI: Let me check your Git status and examine the authentication-related changes.

[Uses git_status to see modified files]
[Uses git_diff to show specific changes]
[Uses find_files to locate auth-related files]
```

### **Project Exploration**

Quickly understand and navigate large codebases:

```
Human: "Show me the structure of this project and find all the database-related files"

AI: I'll give you an overview of the project structure and locate database files.

[Uses get_project_structure for overview]
[Uses search_content to find database references]
[Uses find_files with pattern matching]
```

## 🔧 **Technical Architecture**

### **Security Model**
- All file operations are restricted to the configured workspace directory
- Path validation prevents directory traversal (../ attacks)
- Symlinks are resolved and validated to ensure they stay within workspace
- Git operations are explicitly read-only - no commits, pushes, or destructive operations

### **Performance Optimization**
- File index builds in parallel using worker processes
- Smart directory filtering skips `node_modules`, `.git`, `build`, etc.
- Memory-efficient streaming for large files
- Configurable file size limits prevent system overload

### **Intelligent Workflow**
- Tool descriptions guide LLMs toward safe practices
- Error messages include recovery instructions
- Built-in verification steps prevent file corruption
- Workflow enforcement prevents common AI coding mistakes

## 📊 **Performance Benchmarks**

Typical indexing performance on various project sizes:

- **Small projects** (<1,000 files): ~0.5 seconds
- **Medium projects** (~5,000 files): ~2-4 seconds  
- **Large projects** (~50,000 files): ~8-15 seconds
- **Projects with node_modules**: Filtered out immediately during scan

## 🐛 **Troubleshooting**

### **Common Issues**

**"Access denied" errors**:
- Ensure the workspace path is correctly configured
- Check that the directory exists and is readable
- Verify you're not trying to access files outside the workspace

**Slow performance**:
- Enable file indexing for faster searches
- Increase the maximum file size limit if needed
- Consider excluding large binary files from your workspace

**Git operations failing**:
- Ensure Git is installed and accessible in PATH
- Verify you're in a Git repository
- Check that the workspace directory contains a `.git` folder

### **Debug Mode**

Enable debug mode during configuration to see detailed logging:

```
ENABLE_DEBUG_MODE=true
```

This will show detailed information about file operations, Git commands, and performance metrics.

## 🔄 **Development & Building**

### **Prerequisites**
- Node.js 16.0.0 or higher
- Git (for Git operations)
- Claude Desktop or compatible MCP client

### **Development Setup**
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Validate manifest
npm run validate

# Create DXT package
npm run package
```

### **Build Process**
1. Ensure all dependencies are installed: `npm install`
2. Validate the extension: `npm run validate`
3. Create the DXT package: `npm run package` (Unix/macOS) or `npm run package-win` (Windows)
4. Test the `.dxt` file in Claude Desktop

## 🌟 **What Makes This Special**

### **Prevents Common AI Coding Problems**
❌ **Before**: "Edit line 47 of auth.js to fix the bug"  
✅ **After**: "Use read_file to see auth.js, then preview_edit, then edit_file, then read_file to verify"

❌ **Before**: File corruption from wrong line numbers  
✅ **After**: Atomic operations with automatic backup and verification

❌ **Before**: Dangerous Git operations  
✅ **After**: Read-only Git with comprehensive repository insight

### **Professional Developer Experience**
- **Security**: Enterprise-grade path validation and access control
- **Performance**: Handles massive codebases with sub-second response times
- **Reliability**: Corruption protection and automatic error recovery
- **Usability**: Clear error messages and guided workflows

## 🤝 **Contributing**

This extension is based on the official Anthropic filesystem MCP server with additional Git workspace intelligence. Contributions are welcome!

### **Development Setup**

1. Clone the repository
2. Install dependencies: `npm install`
3. Run in development mode: `npm run dev`
4. Test with your MCP client

### **Key Design Principles**

1. **Security First**: Every operation must be safe and contained
2. **Performance Optimized**: Must handle large projects efficiently  
3. **Workflow Intelligence**: Guide users toward safe practices
4. **Error Recovery**: Always provide clear paths to resolution

## 📄 **License**

MIT License - see LICENSE file for details.

## 🙏 **Credits**

Built by Ron Hasson and Claude (Anthropic), based on the official MCP filesystem server architecture with additional Git workspace intelligence and workflow optimization.

---

**Desktop Extension Specification**: This extension follows the official DXT specification for maximum compatibility with MCP-enabled applications.