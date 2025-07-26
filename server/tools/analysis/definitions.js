// tools/analysis/definitions.js
// Analysis tool definitions

export const getProjectStructureDefinition = {
  name: "get_project_structure",
  description: "Get an overview of the project structure",
  inputSchema: {
    type: "object",
    properties: {
      max_depth: {
        type: "integer",
        description: "Maximum directory depth to traverse",
        default: 3
      }
    }
  }
};

export const analyzeCodeQualityDefinition = {
  name: "analyze_code_quality",
  description: "Analyze code quality and suggest improvements",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to file to analyze"
      },
      language: {
        type: "string",
        description: "Programming language (auto-detected if not specified)"
      }
    },
    required: ["file_path"]
  }
};

export const findTodosFixmesDefinition = {
  name: "find_todos_fixmes",
  description: "Find all TODO, FIXME, HACK, and NOTE comments in the project",
  inputSchema: {
    type: "object",
    properties: {
      file_pattern: {
        type: "string",
        description: "File pattern to search (e.g., '*.py')",
        default: "*"
      },
      include_line_context: {
        type: "boolean",
        description: "Include surrounding code context",
        default: true
      }
    }
  }
};

// Export all analysis tool definitions
export const analysisToolDefinitions = [
  getProjectStructureDefinition,
  analyzeCodeQualityDefinition,
  findTodosFixmesDefinition
];
