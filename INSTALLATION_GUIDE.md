# 🚀 Git Workspace MCP Extension - Installation Guide

Complete setup guide for the Git Workspace MCP Extension that prevents file corruption and provides intelligent workspace management.

## 📋 Prerequisites

- **Claude Desktop**: Latest version with Desktop Extensions support
- **Git Repository**: A local Git repository to work with
- **Node.js**: 16.0+ (optional for development, bundled with Claude Desktop)

## 🎯 Quick Installation (Recommended)

### Option 1: Pre-built Extension (Easiest)

1. **Download** the pre-built `git-workspace-v1.0.0.dxt` file
2. **Install** by double-clicking the `.dxt` file or dragging to Claude Desktop
3. **Configure** your project directory when prompted
4. **Start using** immediately!

### Option 2: Build from Source

1. **Clone or download** this repository
2. **Run installation script**:
   ```bash
   # macOS/Linux:
   chmod +x install.sh
   ./install.sh
   
   # Windows:
   install.bat
   ```
3. **Follow the prompts** to build and install

## 📦 Manual Installation (Advanced)

If you prefer to build manually:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Validate Extension
```bash
npm run validate
```

### Step 3: Create DXT Package
```bash
# macOS/Linux:
npm run package

# Windows:
npm run package-win
```

### Step 4: Install in Claude Desktop
- Double-click the generated `git-workspace-v1.0.0.dxt` file
- Or use Claude Desktop's extension manager

## ⚙️ Configuration

When installing, you'll be prompted for:

### Project Directory
- **What it is**: The root directory of your Git-powered project
- **Example**: `/Users/yourname/Projects/my-app`
- **Requirements**:
  - Must be a valid directory path
  - Should contain a `.git` folder (Git repository)
  - Will be used as the workspace root for all operations

### Configuration Examples

✅ **Good configurations:**
```
/Users/alice/Projects/react-app
/home/bob/code/python-project  
C:\Users\Carol\Documents\Projects\node-api
```

❌ **Bad configurations:**
```
/Users/alice/Projects/react-app/src  (too specific - use root)
/Users/alice                         (too broad - security risk)
~/Projects                           (multiple projects - pick one)
```

## 🧪 Testing Your Installation

### Basic Test
1. **Open Claude Desktop** and start a new conversation
2. **Look for the tool icon** indicating MCP connection
3. **Try a simple command**:
   ```
   Use read_file to show me the package.json file
   ```

### Comprehensive Test
Use the MCP Inspector for thorough testing:
```bash
npm run inspect
```

This opens a browser interface where you can:
- Test all available tools
- View tool schemas
- Debug connection issues
- Verify tool responses

## 🔧 Troubleshooting

### Extension Not Appearing
- **Check manifest validation**: `npm run validate`
- **Verify Claude Desktop version**: Ensure latest version with DXT support
- **Restart Claude Desktop** after installation

### "Tools not found" Error
- **Verify project directory**: Must be valid and accessible
- **Check Git repository**: Directory should contain `.git` folder
- **Try refreshing**: Use `refresh_file_index` tool

### Performance Issues
- **Large projects**: Extension automatically filters build directories
- **Indexing time**: First run may take 10-30 seconds for very large projects
- **Memory usage**: Optimized for projects up to 100,000+ files

### Permission Issues
```bash
# Make scripts executable (macOS/Linux):
chmod +x install.sh
chmod +x validate.js

# Windows: Run as Administrator if needed
```

### Git Commands Failing
- **Ensure Git is installed**: `git --version`
- **Verify repository**: Directory must contain `.git` folder
- **Check permissions**: User must have read access to repository

## 🛡️ Security Considerations

### What the Extension CAN Do
- ✅ Read files within configured directory
- ✅ Modify files within configured directory  
- ✅ View Git status, diffs, and history
- ✅ Search file contents and names
- ✅ Create new files and directories

### What the Extension CANNOT Do
- ❌ Access files outside configured directory
- ❌ Git commit, push, or pull operations
- ❌ Delete the Git repository itself
- ❌ Access system files or other projects
- ❌ Network access or external API calls

### Path Safety
- All file operations are restricted to the configured workspace
- Path traversal attacks (../../../etc/passwd) are prevented
- Absolute paths outside workspace are blocked

## 🎓 Learning Resources

### Essential Reading
- **[README.md](README.md)** - Overview and features
- **[USAGE_EXAMPLES.md](USAGE_EXAMPLES.md)** - Practical usage patterns
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and features

### Key Concepts
- **Intelligent Workflow**: Always read → preview → edit → verify
- **Line Number Safety**: Extension shows numbered lines to prevent guessing
- **Git Read-Only**: Secure analysis without write risks
- **Performance Optimization**: Smart indexing for large projects

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **MCP Inspector**: Debug tool interactions
- **Validation Script**: `npm run validate` for troubleshooting

## 🚀 Quick Start Workflow

Once installed, follow this pattern:

1. **Explore Project Structure**
   ```
   Get an overview of my project structure
   ```

2. **Find Files**
   ```
   Find all JavaScript files in this project
   ```

3. **Read Before Editing**
   ```
   Show me the contents of src/app.js with line numbers
   ```

4. **Preview Changes**
   ```
   Preview what would happen if I replace lines 15-20 with new code
   ```

5. **Apply Changes**
   ```
   Apply those changes to src/app.js
   ```

6. **Verify Results**
   ```
   Show me src/app.js again to confirm the changes
   ```

## 🎯 Success Indicators

Your installation is successful when:
- ✅ Extension appears in Claude Desktop
- ✅ Tools are available and responsive  
- ✅ File operations work correctly
- ✅ Git commands show repository status
- ✅ Search and indexing complete successfully
- ✅ No errors in Claude Desktop console

## 📞 Support

### Before Seeking Help
1. **Run validation**: `npm run validate`
2. **Check logs**: Look for errors in Claude Desktop console
3. **Test with Inspector**: `npm run inspect`
4. **Review configuration**: Verify project directory path

### Getting Support
- **GitHub Issues**: Detailed bug reports with logs
- **Discussions**: Questions and feature requests
- **Documentation**: Check all `.md` files in this repository

---

**🎉 Congratulations!** You now have a powerful, secure, and intelligent file management system that prevents the common file corruption issues with LLM-powered editing. Enjoy your enhanced development workflow!
