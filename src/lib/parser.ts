/**
 * Content block types that can appear in agent messages
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown }
  | { type: 'thinking'; thinking: string };

/**
 * Usage statistics for assistant messages
 */
export interface MessageUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/**
 * Message structure from agent JSONL files
 */
export interface AgentMessage {
  type: 'user' | 'assistant';
  uuid: string;  // Unique message identifier
  agentId: string;
  slug: string;
  timestamp: string;
  message: {
    role: string;
    content: ContentBlock[] | string;  // User messages have string content, assistant has array
    model?: string;  // Model name (e.g., "sonnet")
    usage?: MessageUsage;  // Usage stats for assistant messages
  };
}

/**
 * Parse a single line from a JSONL file.
 * Returns null if the line is invalid or empty.
 */
export function parseJsonlLine(line: string): AgentMessage | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    // Basic validation - ensure required fields exist
    // Note: message.content can be a string (user messages) or array (assistant messages)
    if (
      !parsed.type ||
      !parsed.agentId ||
      !parsed.slug ||
      !parsed.timestamp ||
      !parsed.message ||
      !parsed.message.role ||
      (typeof parsed.message.content !== 'string' && !Array.isArray(parsed.message.content))
    ) {
      return null;
    }

    return parsed as AgentMessage;
  } catch {
    return null;
  }
}
