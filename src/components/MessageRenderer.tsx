import React from 'react';
import { Box, Text, Transform } from 'ink';
import { AgentMessage, ContentBlock } from '../lib/parser.js';
import { sanitizeText } from '../lib/sanitize.js';

const CLEAR_TO_EOL = '\x1B[K';

function ClearText({ children, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Transform transform={(line) => line + CLEAR_TO_EOL}>
      <Text {...props}>{children}</Text>
    </Transform>
  );
}

export interface MessageRendererProps {
  message: AgentMessage;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function renderContentBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case 'text':
      return (
        <Box key={index} flexDirection="column">
          <ClearText wrap="wrap">{sanitizeText(block.text)}</ClearText>
        </Box>
      );

    case 'tool_use': {
      const inputStr = JSON.stringify(block.input, null, 2);
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <ClearText bold color="cyan">Tool: {sanitizeText(block.name)}</ClearText>
          <ClearText dimColor wrap="wrap">{sanitizeText(truncate(inputStr, 200))}</ClearText>
        </Box>
      );
    }

    case 'tool_result': {
      const contentStr = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <ClearText bold color="green">Tool result</ClearText>
          <ClearText dimColor wrap="wrap">{sanitizeText(truncate(contentStr, 200))}</ClearText>
        </Box>
      );
    }

    case 'thinking':
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <ClearText dimColor italic wrap="wrap">{sanitizeText(block.thinking)}</ClearText>
        </Box>
      );

    default:
      return null;
  }
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const timestamp = formatTimestamp(message.timestamp);
  const content = message.message.content;

  // Skip rendering empty user messages (string content that's empty or whitespace-only)
  if (typeof content === 'string') {
    const trimmedContent = content.trim();
    if (trimmedContent === '') {
      return null;
    }
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <ClearText dimColor>[{timestamp}]</ClearText>
      {typeof content === 'string' ? (
        <ClearText color="yellow" wrap="wrap">{sanitizeText(content)}</ClearText>
      ) : (
        content.map((block, index) => renderContentBlock(block, index))
      )}
    </Box>
  );
}
