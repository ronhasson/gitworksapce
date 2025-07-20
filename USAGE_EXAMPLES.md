# Git Workspace MCP Extension - Usage Examples

This document provides practical examples of how to use the Git Workspace MCP Extension effectively.

## 🚀 Getting Started

Once installed in Claude Desktop, the extension provides intelligent file operations and Git read-only access. Here are the most common workflows:

## 📝 File Editing Workflow (CRITICAL)

The extension prevents file corruption by enforcing a specific workflow. **Always follow this sequence:**

### ✅ Correct Workflow Example

```
User: "I need to add a new function to auth.js"

Claude: I'll help you add a function to auth.js using the safe editing workflow:

1. First, let me read the current file to see its structure:
   [Uses read_file to see auth.js with line numbers]

2. Now I'll preview the changes to make sure they're correct:
   [Uses preview_edit to show exactly what will change]

3. The preview looks good, so I'll apply the changes:
   [Uses edit_file to make the modification]

4. Let me verify the changes were applied correctly:
   [Uses read_file again to confirm the edit]
```

### ❌ What NOT to Do

```
❌ Never do this:
Claude: "I'll edit lines 45-50 in auth.js..."
[Uses edit_file without reading file first]

Result: ❌ Line number error - file corruption!
```

## 🔍 Common Usage Patterns

### 1. Exploring a New Project

```bash
# Get project overview
get_project_structure

# Find important configuration files
find_files pattern:"*.json"

# Check Git status
git_status

# Look at recent changes
git_log limit:20
```

### 2. Making Code Changes

```bash
# Step 1: Find the file
find_files pattern:"authentication*"

# Step 2: Read current content  
read_file path:"src/auth/authentication.js"

# Step 3: Preview your changes
preview_edit path:"src/auth/authentication.js" line_start:25 line_end:30 new_content:"// Updated function implementation"

# Step 4: Apply the changes
edit_file path:"src/auth/authentication.js" line_start:25 line_end:30 new_content:"// Updated function implementation"

# Step 5: Verify the result
read_file path:"src/auth/authentication.js"
```

### 3. Understanding Git Changes

```bash
# See what files have changed
git_status

# View specific file differences
git_diff file_path:"src/components/Header.jsx"

# Compare with another branch
git_compare_branches base_branch:"main" compare_branch:"feature/new-ui"

# Check commit history
git_log limit:10 oneline:true
```

### 4. Searching the Codebase

```bash
# Search for function definitions
search_content query:"function authenticate" file_pattern:"*.js"

# Find all React components
find_files pattern:"*.jsx"

# Search for TODO comments
search_content query:"TODO" case_sensitive:false

# Find configuration files
find_files pattern:"*config*"
```

### 5. Adding New Files

```bash
# Create a new file
write_file path:"src/utils/helpers.js" content:"// Utility functions\nexport const formatDate = (date) => {\n  return date.toLocaleDateString();\n};"

# Add content to an existing file
append_to_file path:"src/utils/index.js" content:"\nexport { formatDate } from './helpers.js';"
```

## 🛡️ Safety Features in Action

### Automatic Error Prevention

```bash
# This will show helpful error with recovery steps:
edit_file path:"app.js" line_start:999 new_content:"new code"

# Error message includes:
❌ Invalid line_start 999 - file only has 50 lines

🔧 TROUBLESHOOTING:
1. Use 'read_file app.js' to see current content
2. Count lines carefully (files start at line 1)
3. Use 'preview_edit' to test parameters safely
💡 The file currently has lines 1-50
```

### Corruption Protection

```bash
# If file corruption is detected during edit:
✅ File corruption detected - restored from backup

# The extension automatically restores the original content
```

## 🎯 Advanced Usage

### Working with Large Projects

```bash
# Refresh file index after adding new files
refresh_file_index

# Use specific patterns to narrow searches
find_files pattern:"*test*.js"
search_content query:"import React" file_pattern:"*.jsx"

# Get structured view of large projects
get_project_structure max_depth:2
```

### Comparing Code Versions

```bash
# Compare current branch with main
git_compare_branches base_branch:"main"

# View detailed history for a specific file
git_log file_path:"src/components/App.jsx" limit:20

# See staged vs working tree changes
git_diff staged:true
git_diff staged:false
```

### Project Analysis

```bash
# Find all JavaScript files
find_files pattern:"*.js"

# Search for specific patterns across the codebase
search_content query:"useState" file_pattern:"*.jsx"

# Get overview of project structure
get_project_structure

# Check what files have been modified
git_status
```

## 🚨 Troubleshooting Common Issues

### "File not found" Error
```bash
# Instead of guessing paths:
❌ read_file path:"components/Header.js"

# Use find_files first:
✅ find_files pattern:"Header*"
✅ read_file path:"src/components/Header.jsx"
```

### "Invalid line numbers" Error
```bash
# Always read first to see line numbers:
✅ read_file path:"app.js"
✅ preview_edit path:"app.js" line_start:15 line_end:20 new_content:"new code"
✅ edit_file path:"app.js" line_start:15 line_end:20 new_content:"new code"
```

### Performance with Large Projects
```bash
# File indexing runs automatically, but you can refresh:
refresh_file_index

# Use specific patterns to limit search scope:
find_files pattern:"src/**/*.js"
search_content query:"TODO" file_pattern:"src/**/*.js"
```

## 💡 Best Practices

1. **Always Read First**: Use `read_file` before any editing operation
2. **Preview Changes**: Use `preview_edit` to verify modifications
3. **Use Find Tools**: Use `find_files` to locate files instead of guessing paths
4. **Check Git Status**: Use `git_status` and `git_diff` to understand changes
5. **Search Strategically**: Use specific file patterns to narrow search results
6. **Verify Results**: Always read files after editing to confirm changes

## 🔧 Configuration Tips

When setting up the extension in Claude Desktop:

- **Project Directory**: Point to the root of your Git repository
- **Valid Examples**: 
  - `/Users/yourname/Projects/my-react-app`
  - `C:\Users\YourName\Documents\Projects\my-project`
- **Invalid Examples**:
  - `/Users/yourname/Projects/my-react-app/src` (too specific)
  - `/Users/yourname` (too broad)

---

**Remember**: The extension is designed to prevent the common problem of LLMs corrupting files by guessing line numbers. Always follow the read → preview → edit → verify workflow for the best experience!
