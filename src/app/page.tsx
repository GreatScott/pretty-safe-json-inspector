"use client";

import { useState } from "react";

interface JSONLine {
  content: string;
  path: string;
  isField: boolean;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [formattedOutput, setFormattedOutput] = useState("");
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [jsonLines, setJsonLines] = useState<JSONLine[]>([]);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [clickedLine, setClickedLine] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("Python");
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [variableName, setVariableName] = useState("data");

  const detectFormat = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    // JSON detection
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || 
        (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        JSON.parse(trimmed);
        return "JSON";
      } catch {}
    }

    // XML detection
    if (trimmed.startsWith("<") && trimmed.includes(">")) {
      return "XML";
    }

    // CSS detection
    if (trimmed.includes("{") && trimmed.includes("}") && 
        (trimmed.includes(":") || trimmed.includes(";"))) {
      return "CSS";
    }

    // YAML detection
    if (trimmed.includes(":") && !trimmed.includes("<") && !trimmed.includes("{") && 
        (trimmed.includes("\n") || /^\w+:\s*.+$/.test(trimmed))) {
      // Basic YAML patterns: key: value, arrays with -, etc.
      if (/^[\w\s]*:\s*.+/m.test(trimmed) || /^\s*-\s+/.test(trimmed)) {
        return "YAML";
      }
    }

    // SQL detection (basic keywords)
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i;
    if (sqlKeywords.test(trimmed)) {
      return "SQL";
    }

    return "TEXT";
  };

  const formatJSON = (input: string): string => {
    const parsed = JSON.parse(input);
    const formatted = JSON.stringify(parsed, null, 2);
    
    // Build full paths by tracking nesting context
    const lines: JSONLine[] = [];
    const formattedLines = formatted.split('\n');
    const pathStack: string[] = [];
    
    formattedLines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const indent = line.length - line.trimStart().length;
      const currentDepth = Math.floor(indent / 2);
      
      // Adjust path stack to current depth
      while (pathStack.length > currentDepth) {
        pathStack.pop();
      }
      
      let path = '';
      let isField = false;
      
      // Look for lines that start with a quoted key followed by colon
      const keyMatch = trimmedLine.match(/^"([^"]+)"\s*:/);
      if (keyMatch) {
        const key = keyMatch[1];
        
        // Store the key path for later language-specific generation
        const keyPath = [...pathStack.map(p => p.replace(/get\('([^']+)'\)/, '$1')), key];
        path = JSON.stringify(keyPath); // Store as JSON for later parsing
        isField = true;
        
        // Check if this field contains an object or array (for nesting)
        const valueMatch = trimmedLine.match(/:\s*(.+)/);
        if (valueMatch) {
          const value = valueMatch[1].trim();
          if (value === '{' || value === '[') {
            // This field contains a nested structure
            pathStack.push(`get('${key}')`);
          }
        }
      } else if (trimmedLine === '}' || trimmedLine === '},' || trimmedLine === ']' || trimmedLine === '],') {
        // Closing brace/bracket - pop from stack if we have items
        if (pathStack.length > 0) {
          pathStack.pop();
        }
      }
      
      lines.push({
        content: line,
        path: path,
        isField: isField
      });
    });
    
    setJsonLines(lines);
    return formatted;
  };


  const formatCSS = (input: string): string => {
    return input
      .replace(/\s*{\s*/g, " {\n  ")
      .replace(/;\s*/g, ";\n  ")
      .replace(/\s*}\s*/g, "\n}\n\n")
      .replace(/,\s*/g, ",\n")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  };

  const formatSQL = (input: string): string => {
    const keywords = [
      "SELECT", "FROM", "WHERE", "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN",
      "GROUP BY", "ORDER BY", "HAVING", "INSERT", "UPDATE", "DELETE", "CREATE",
      "ALTER", "DROP", "AND", "OR", "NOT", "IN", "EXISTS", "LIKE", "BETWEEN"
    ];
    
    let formatted = input;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      formatted = formatted.replace(regex, keyword.toUpperCase());
    });
    
    return formatted
      .replace(/\s+/g, " ")
      .replace(/,/g, ",\n  ")
      .replace(/\bFROM\b/g, "\nFROM")
      .replace(/\bWHERE\b/g, "\nWHERE")
      .replace(/\bJOIN\b/g, "\nJOIN")
      .replace(/\bGROUP BY\b/g, "\nGROUP BY")
      .replace(/\bORDER BY\b/g, "\nORDER BY")
      .trim();
  };

  const formatYAML = (input: string): string => {
    // Basic YAML formatting - clean up spacing and indentation
    const lines = input.split('\n');
    const formatted: string[] = [];
    const pathLines: JSONLine[] = [];
    let currentPath: string[] = [];
    let arrayCounters: { [depth: number]: number } = {};
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        formatted.push(line);
        pathLines.push({ content: line, path: '', isField: false });
        return;
      }
      
      const indent = line.length - line.trimStart().length;
      const depth = Math.floor(indent / 2);
      
      // Adjust path stack to current depth
      while (currentPath.length > depth) {
        currentPath.pop();
        // Clean up array counters for deeper levels
        Object.keys(arrayCounters).forEach(key => {
          const keyDepth = parseInt(key);
          if (keyDepth > depth) {
            delete arrayCounters[keyDepth];
          }
        });
      }
      
      // Check for key-value pairs
      const keyMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1].trim();
        const value = keyMatch[2].trim();
        
        // Reset array counter for this depth since we have a new key
        delete arrayCounters[depth];
        
        // Build path for this field
        const fieldPath = [...currentPath, key];
        const pathString = JSON.stringify(fieldPath);
        
        formatted.push(line);
        pathLines.push({ content: line, path: pathString, isField: true });
        
        // If no value or value indicates nested structure, add to path
        if (!value || value === '' || value === '|' || value === '>') {
          currentPath.push(key);
          // Initialize array counter for potential array items
          arrayCounters[depth + 1] = 0;
        }
      } else if (trimmed.startsWith('-')) {
        // Array item
        const arrayItem = trimmed.substring(1).trim();
        
        // Get current array index
        const arrayIndex = arrayCounters[depth] || 0;
        
        // Build path for this array element
        const arrayPath = [...currentPath, arrayIndex.toString()];
        const pathString = JSON.stringify(arrayPath);
        
        formatted.push(line);
        pathLines.push({ content: line, path: pathString, isField: true });
        
        // Increment array counter
        arrayCounters[depth] = arrayIndex + 1;
        
        // If array item has no content (nested structure follows), add to path
        if (!arrayItem) {
          currentPath.push(arrayIndex.toString());
        }
      } else {
        formatted.push(line);
        pathLines.push({ content: line, path: '', isField: false });
      }
    });
    
    setJsonLines(pathLines);
    return formatted.join('\n');
  };

  const formatXML = (input: string): string => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(input, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML");
    }

    // Simple XML formatting without path tracking
    return input
      .replace(/></g, ">\n<")
      .replace(/^\s*\n/gm, "")
      .split("\n")
      .map((line, index, arr) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        
        const depth = (line.match(/</g) || []).length - (line.match(/\//g) || []).length;
        const indent = "  ".repeat(Math.max(0, depth - 1));
        return indent + trimmed;
      })
      .join("\n");
  };

  const formatContent = (input: string) => {
    if (!input.trim()) {
      setFormattedOutput("");
      setError("");
      setDetectedFormat("");
      return;
    }

    const format = detectFormat(input);
    setDetectedFormat(format);

    try {
      let formatted = "";
      
      switch (format) {
        case "JSON":
          formatted = formatJSON(input);
          break;
        case "XML":
          formatted = formatXML(input);
          setJsonLines([]);
          break;
        case "CSS":
          formatted = formatCSS(input);
          break;
        case "SQL":
          formatted = formatSQL(input);
          setJsonLines([]);
          break;
        case "YAML":
          formatted = formatYAML(input);
          break;
        default:
          formatted = input;
          setJsonLines([]);
          break;
      }
      
      setFormattedOutput(formatted);
      setError("");
    } catch (err) {
      setError(`Invalid ${format} format`);
      setFormattedOutput("");
      setJsonLines([]);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    formatContent(value);
  };

  const copyToClipboard = async () => {
    if (!formattedOutput) return;
    
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const generateCodePath = (keyPath: string[], language: string, isFromJSON: boolean = false, varName: string = "data"): string => {
    const formatKey = (key: string, language: string, isFromJSON: boolean) => {
      // For JSON, all keys are object keys (even numeric ones like "1")
      // For YAML, numeric keys are true array indices
      const isArrayIndex = !isFromJSON && /^\d+$/.test(key);
      
      if (isArrayIndex) {
        return `[${key}]`;
      }
      
      // Handle different languages for object keys
      switch (language) {
        case "Python":
          return `.get('${key}')`;
        case "JavaScript":
        case "TypeScript":
          return `?.${key}`;
        case "Go":
          return `["${key}"]`;
        case "Java":
        case "Rust":
          return `.get("${key}")`;
        default:
          return `.get('${key}')`;
      }
    };

    switch (language) {
      case "Python":
        return `${varName}${keyPath.map(key => formatKey(key, language, isFromJSON)).join('')}`;
      case "JavaScript":
      case "TypeScript":
        return `${varName}${keyPath.map(key => formatKey(key, language, isFromJSON)).join('')}`;
      case "Go":
        return keyPath.reduce((acc, key, index) => {
          const isArrayIndex = !isFromJSON && /^\d+$/.test(key);
          if (index === 0) {
            return isArrayIndex ? `${varName}[${key}]` : `${varName}["${key}"]`;
          }
          return isArrayIndex ? `${acc}[${key}]` : `${acc}["${key}"]`;
        }, '');
      case "Java":
      case "Rust":
        return `${varName}${keyPath.map(key => formatKey(key, language, isFromJSON)).join('')}`;
      case "XPath":
        return `/${keyPath.join('/')}`;
      default:
        return `${varName}${keyPath.map(key => formatKey(key, language, isFromJSON)).join('')}`;
    }
  };

  const copyCodePath = async (pathString: string, lineIndex: number) => {
    try {
      const keyPath = JSON.parse(pathString);
      const isFromJSON = detectedFormat === "JSON";
      const codeSnippet = generateCodePath(keyPath, selectedLanguage, isFromJSON, variableName);
      await navigator.clipboard.writeText(codeSnippet);
      setClickedLine(lineIndex);
      setTimeout(() => setClickedLine(null), 500);
    } catch (err) {
      console.error("Failed to copy path: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Pretty Safe JSON Inspector
          </h1>
          <p className="text-gray-600">
            Paste your code on the left, see it formatted on the right.
          </p>
          <p className="text-gray-600">
            For JSON and YAML, get quick code-snippets for accessing individual entires.
          </p>
          <p className="text-gray-600">
            100% client-side processing. Everything is run in your browser. No data is collected. 
          </p>
          {detectedFormat && (
            <div className="mt-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Detected: {detectedFormat}
              </span>
            </div>
          )}
        </header>

        <div className={`grid gap-6 h-[calc(100vh-200px)] ${isInputCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          {!isInputCollapsed && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">
                  Raw Input
                </h2>
                <button
                  onClick={() => setIsInputCollapsed(true)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Collapse Window
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Paste your JSON, YAML, XML, etc, here..."
                className="w-full h-[calc(100%-3rem)] resize-none border border-gray-300 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onPaste={(e) => {
                  // Prevent scroll jumping on paste
                  const currentScrollY = window.scrollY;
                  setTimeout(() => {
                    window.scrollTo(0, currentScrollY);
                  }, 0);
                }}
              />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6">
            {isInputCollapsed && (
              <div className="mb-4">
                <button
                  onClick={() => setIsInputCollapsed(false)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ← Expand Input Window
                </button>
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-700">
                Formatted Output
              </h2>
              <button
                onClick={copyToClipboard}
                disabled={!formattedOutput || !!error}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Output
                  </>
                )}
              </button>
            </div>
            {(detectedFormat === "JSON" || detectedFormat === "YAML") && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-500">
                    Hover over line to get code snippet to access field
                  </p>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  >
                    <option value="Python">Python</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Go">Go</option>
                    <option value="Java">Java</option>
                    <option value="Rust">Rust</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Variable name:</label>
                  <input
                    type="text"
                    value={variableName}
                    onChange={(e) => setVariableName(e.target.value)}
                    placeholder="data"
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1 placeholder-gray-400"
                  />
                </div>
              </div>
            )}
            <div className="h-[calc(100%-4rem)] border border-gray-300 rounded-lg p-4 overflow-auto">
              {error ? (
                <div className="text-red-500 font-mono text-sm">{error}</div>
              ) : (detectedFormat === "JSON" || detectedFormat === "YAML") && jsonLines.length > 0 ? (
                <div className="font-mono text-sm text-gray-800">
                  {jsonLines.map((line, index) => (
                    <div
                      key={index}
                      className={`relative group leading-relaxed px-2 py-1 rounded ${
                        hoveredLine === index ? 'bg-gray-100' : ''
                      }`}
                      onMouseEnter={() => setHoveredLine(index)}
                      onMouseLeave={() => setHoveredLine(null)}
                    >
                      <span className="whitespace-pre-wrap break-words">{line.content}</span>
                      {line.isField && hoveredLine === index && (
                        <button
                          onClick={() => copyCodePath(line.path, index)}
                          className={`absolute right-2 top-0 px-2 py-1 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                            clickedLine === index 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          title={`Copy ${selectedLanguage} code`}
                        >
                          {clickedLine === index ? '✓ Copied!' : `📋 ${selectedLanguage}`}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="font-mono text-sm text-gray-800 whitespace-pre-wrap">
                  {formattedOutput || "Formatted output will appear here. JSON and YAML supports getting code snippets to access individual entries"}
                </pre>
              )}
            </div>
          </div>
        </div>
        
        <footer className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Created with ❤️ by{" "}
            <a 
              href="https://www.anthropic.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Claude
            </a>
            {" "}and{" "}
            <a 
              href="https://github.com/greatscott" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Scott
            </a>
          </p>
          <div className="flex items-center justify-center mb-4">
            <a 
              href="https://github.com/GreatScott/pretty-safe-json-inspector" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg 
                className="w-5 h-5" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
          <div className="text-xs text-gray-400 max-w-2xl mx-auto">
            <div className="mb-2 flex items-center justify-center gap-4">
              <span>
                Build: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || 'dev'}
              </span>
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
                <a 
                  href={`https://github.com/GreatScott/pretty-safe-json-inspector/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  View commit
                </a>
              )}
            </div>
            <p className="mb-1">
              <strong>Disclaimer:</strong> This tool is provided "as is" without warranty of any kind. 
              Users are responsible for ensuring the security and confidentiality of their data. The creators are not responsible for any data loss, security breaches, or other issues 
              that may arise from the use of this tool. 
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}