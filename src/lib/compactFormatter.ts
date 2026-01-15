import { AgentMessage } from './parser.js';
import { sanitizeText } from './sanitize.js';

/**
 * Format a message in compact card-based mode
 * Uses single-line cards with color coding and truncation
 */
export function formatMessageCompact(msg: AgentMessage): string[] {
  const lines: string[] = [];
  const timestamp = new Date(msg.timestamp).toLocaleTimeString();

  // Handle both string content (user messages) and ContentBlock arrays
  if (typeof msg.message.content === 'string') {
    // Simple string content (user messages)
    const content = msg.message.content;
    if (content.trim() !== '') {
      const truncated = truncateText(content, 200);
      lines.push(`\x1b[34m[${timestamp}] 👤 User: ${sanitizeText(truncated)}\x1b[0m`);
    }
  } else if (Array.isArray(msg.message.content)) {
    // ContentBlock array (can be in both user and assistant messages)
    const content = msg.message.content;

    for (const block of content) {
      if (block.type === 'thinking') {
        // Thinking: dim/gray
        const truncated = truncateText(block.thinking, 200);
        lines.push(`\x1b[2m[${timestamp}] 💭 Thinking: ${sanitizeText(truncated)}\x1b[0m`);
      } else if (block.type === 'text') {
        // Assistant text: white/default
        const truncated = truncateText(block.text, 200);
        lines.push(`[${timestamp}] 📝 Text: ${sanitizeText(truncated)}`);
      } else if (block.type === 'tool_use') {
        // Tool use: yellow
        const inputText = JSON.stringify(block.input, null, 0);
        const truncated = truncateText(inputText, 80);
        lines.push(`\x1b[33m[${timestamp}] 🔧 Tool: ${block.name} → ${sanitizeText(truncated)}\x1b[0m`);
      } else if (block.type === 'tool_result') {
        // Tool result: green
        const resultText = typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content, null, 0);
        const truncated = truncateText(resultText, 100);
        const status = block.is_error ? '✗' : '✓';
        lines.push(`\x1b[32m[${timestamp}] ${status} Result: ${sanitizeText(truncated)}\x1b[0m`);
      }
    }
  }

  return lines;
}

/**
 * Truncate text to a maximum length, adding "..." if truncated
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
