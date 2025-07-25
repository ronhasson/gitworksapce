// tools/git/index.js
// Git tool definitions

export const gitStatusDefinition = {
  name: "git_status",
  description: "Get Git status of the workspace",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

export const gitDiffDefinition = {
  name: "git_diff",
  description: "Get Git diff for specified files or all changes",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Specific file to diff (optional)"
      },
      staged: {
        type: "boolean",
        description: "Show staged changes only",
        default: false
      }
    }
  }
};

export const gitLogDefinition = {
  name: "git_log",
  description: "Get Git commit history",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of commits to show",
        default: 10
      },
      oneline: {
        type: "boolean",
        description: "Show one line per commit",
        default: true
      }
    }
  }
};

export const gitListBranchesDefinition = {
  name: "git_list_branches",
  description: "List all Git branches (local and remote)",
  inputSchema: {
    type: "object",
    properties: {
      include_remote: {
        type: "boolean",
        description: "Include remote branches",
        default: true
      }
    }
  }
};

export const gitCompareBranchesDefinition = {
  name: "git_compare_branches",
  description: "Compare changes between two branches",
  inputSchema: {
    type: "object",
    properties: {
      base_branch: {
        type: "string",
        description: "Base branch to compare from (e.g., 'master', 'main')"
      },
      compare_branch: {
        type: "string",
        description: "Branch to compare to (default: current branch)",
        default: "HEAD"
      },
      file_path: {
        type: "string",
        description: "Specific file to compare (optional)"
      },
      show_stats: {
        type: "boolean",
        description: "Show file change statistics",
        default: true
      }
    },
    required: ["base_branch"]
  }
};

export const gitCompareCommitsDefinition = {
  name: "git_compare_commits",
  description: "Compare changes between two specific commits",
  inputSchema: {
    type: "object",
    properties: {
      commit_from: {
        type: "string",
        description: "Starting commit hash or reference"
      },
      commit_to: {
        type: "string",
        description: "Ending commit hash or reference (default: HEAD)",
        default: "HEAD"
      },
      file_path: {
        type: "string",
        description: "Specific file to compare (optional)"
      },
      show_stats: {
        type: "boolean",
        description: "Show file change statistics",
        default: true
      }
    },
    required: ["commit_from"]
  }
};

export const gitShowCommitDefinition = {
  name: "git_show_commit",
  description: "Show details of a specific commit",
  inputSchema: {
    type: "object",
    properties: {
      commit_hash: {
        type: "string",
        description: "Commit hash or reference (e.g., HEAD, HEAD~1)"
      },
      show_diff: {
        type: "boolean",
        description: "Include the diff in the output",
        default: true
      }
    },
    required: ["commit_hash"]
  }
};

export const gitCurrentBranchDefinition = {
  name: "git_current_branch",
  description: "Get the current active branch",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

export const gitBranchHistoryDefinition = {
  name: "git_branch_history",
  description: "Show commit history for a specific branch",
  inputSchema: {
    type: "object",
    properties: {
      branch_name: {
        type: "string",
        description: "Branch name (default: current branch)",
        default: "HEAD"
      },
      limit: {
        type: "integer",
        description: "Number of commits to show",
        default: 10
      },
      since: {
        type: "string",
        description: "Show commits since date (e.g., '2024-01-01', '1 week ago')"
      }
    }
  }
};

// Export all git tool definitions
export const gitToolDefinitions = [
  gitStatusDefinition,
  gitDiffDefinition,
  gitLogDefinition,
  gitListBranchesDefinition,
  gitCompareBranchesDefinition,
  gitCompareCommitsDefinition,
  gitShowCommitDefinition,
  gitCurrentBranchDefinition,
  gitBranchHistoryDefinition
];
