import React from 'react';
import { Box, Text } from 'ink';
import { AgentMessage, ContentBlock } from '../lib/parser.js';

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
          <Text>{block.text}</Text>
        </Box>
      );

    case 'tool_use': {
      const inputStr = JSON.stringify(block.input, null, 2);
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <Text bold color="cyan">Tool: {block.name}</Text>
          <Text dimColor>{truncate(inputStr)}</Text>
        </Box>
      );
    }

    case 'tool_result': {
      const contentStr = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <Text bold color="green">Tool result</Text>
          <Text dimColor>{truncate(contentStr)}</Text>
        </Box>
      );
    }

    case 'thinking':
      return (
        <Box key={index} flexDirection="column" marginTop={1}>
          <Text dimColor italic>{block.thinking}</Text>
        </Box>
      );

    default:
      return null;
  }
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const timestamp = formatTimestamp(message.timestamp);
  const content = message.message.content;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>[{timestamp}]</Text>
      {typeof content === 'string' ? (
        <Text color="yellow">{content}</Text>
      ) : (
        content.map((block, index) => renderContentBlock(block, index))
      )}
    </Box>
  );
}
