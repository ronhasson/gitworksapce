# Git Workspace MCP Extension

A comprehensive Desktop Extension (DXT) that provides AI assistants with intelligent file operations and Git read-only access. Designed specifically to solve the file corruption issue caused by LLMs guessing line numbers during file edits.

## 🌟 Key Features

### 🛡️ **Prevents File Corruption**
- **Intelligent Workflow Guidance**: Forces proper `read_file → preview_edit → edit_file → read_file` workflow
- **Line Number Validation**: Shows exact line numbers to prevent guessing
- **Preview Before Edit**: Always see what will change before applying modifications  
- **Automatic Backup**: Creates backups and restores if corruption is detected

### ⚡ **Performance Optimized**
- **Smart File Indexing**: Parallel processing with early directory filtering
- **Directory Skipping**: Automatically skips `node_modules`, `dist`, `.git`, and other build directories
- **Scalable Architecture**: Handles projects from 100 to 100,000+ files efficiently

### 🔒 **Security First**
- **Read-Only Git Operations**: Can view status, diffs, logs but CANNOT commit, push, or stage
- **Path Validation**: Prevents directory traversal attacks  
- **Workspace Isolation**: All operations restricted to configured project directory

### 🧠 **Intelligent UX**
- **Comprehensive Error Messages**: Clear problem descriptions with recovery steps
- **Tool Descriptions**: Built-in guidance that teaches LLMs proper workflows
- **Success Feedback**: Detailed results with verification suggestions

## 🚀 Installation

### Method 1: One-Click Install (Recommended)
1. Download the `git-workspace-v1.0.0.dxt` file
2. Double-click the `.dxt` file or drag it to Claude Desktop
3. Configure your project directory when prompted
4. Start using immediately!

### Method 2: Manual Installation  
1. Clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build` 
4. Create DXT package: `zip -r git-workspace.dxt manifest.json server/ node_modules/ package.json`
5. Install the `.dxt` file in Claude Desktop

## 📋 Configuration

When installing, you'll be prompted to configure:

- **Project Directory**: The root directory of your Git project that Claude will access
  - Must be a valid directory path
  - Will be used as the workspace root for all file operations
  - Example: `/Users/yourname/Projects/my-app`

## 🛠️ Available Tools

### File Operations

#### `read_file` ⭐ **ALWAYS USE FIRST**
Shows file contents with numbered lines. **Essential first step** before any edit.

```
Use read_file to see the current content of src/app.js
```

#### `preview_edit` 🛡️ **SAFETY TOOL** 
Preview changes before applying them. Shows exactly what will be removed and added.

```
Use preview_edit to show what changing lines 45-50 would do
```

#### `edit_file` ✏️ **APPLY CHANGES**
Apply changes after preview confirms they're correct. Includes automatic backup.

```  
Use edit_file to replace lines 45-50 with the new function code
```

#### `write_file` 📝 **COMPLETE REPLACEMENT**
Write entire file content. Use for new files or complete rewrites.

```
Use write_file to create a new configuration file
```

### Git Operations (Read-Only)

#### `git_status` 📊
Show current working tree status.

#### `git_diff` 📋  
View differences in working tree or staged changes.

### Search & Discovery

#### `find_files` 🔍
Fast file search using optimized indexing.

```
Use find_files to locate all JavaScript files: *.js
```

## 🔄 Recommended Workflow

### For File Editing:
1. **📖 Read First**: `read_file` to see current content and line numbers
2. **🔍 Preview Changes**: `preview_edit` to verify what will change  
3. **✏️ Apply Changes**: `edit_file` to make the modification
4. **✅ Verify Result**: `read_file` again to confirm success

### For Project Analysis:
1. **🔍 Find Files**: Use `find_files` to locate relevant code
2. **📊 Check Status**: Use `git_status` to see current changes
3. **📋 View Diffs**: Use `git_diff` to understand modifications
4. **📖 Read Code**: Use `read_file` to examine specific files

## 🚨 Common Issues & Solutions

### "Invalid line numbers" Error
- **Cause**: Trying to edit lines that don't exist
- **Solution**: Always use `read_file` first to see actual line numbers

### "File not found" Error  
- **Cause**: Incorrect file path
- **Solution**: Use `find_files` to locate the correct path

### Performance Issues
- **Cause**: Large project with many files
- **Solution**: File indexing runs automatically in background

## 🎯 Why This Extension Solves File Corruption

Traditional MCP file servers often lead to corruption because:
1. ❌ LLMs guess line numbers without reading files first
2. ❌ No preview mechanism to verify changes
3. ❌ Poor error messages that don't guide recovery  
4. ❌ No backup/restore mechanism

**This extension fixes all of these:**
1. ✅ Forces `read_file` first with numbered lines
2. ✅ Mandatory `preview_edit` to see changes before applying
3. ✅ Detailed error messages with recovery steps
4. ✅ Automatic backup and corruption detection

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode  
npm run dev

# Test with MCP inspector
npm run inspect

# Build TypeScript (if using TS version)
npm run build
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Ask questions and share feedback
- **Documentation**: Full specs available in `mcp_specification.md`

---

**Created by Ron Hasson and Claude (Anthropic)**  
**Implements Desktop Extension (DXT) specification for Claude Desktop**
