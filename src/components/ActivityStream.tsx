import React from 'react';
import { Box, Text } from 'ink';
import { AgentMessage } from '../lib/parser.js';
import { MessageRenderer } from './MessageRenderer.js';

export interface ActivityStreamProps {
  messages: AgentMessage[];
  isLive: boolean;
}

export function ActivityStream({ messages, isLive }: ActivityStreamProps) {
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Activity</Text>
      <Box height={1} />
      {messages.length === 0 && (
        <Text dimColor>No activity yet</Text>
      )}
      {messages.map((message, index) => (
        <MessageRenderer key={`${message.agentId}-${index}`} message={message} />
      ))}
      {isLive && (
        <Box marginTop={1}>
          <Text color="green">● Streaming...</Text>
        </Box>
      )}
    </Box>
  );
}
