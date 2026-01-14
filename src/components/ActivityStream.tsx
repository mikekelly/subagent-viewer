import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentMessage } from '../lib/parser.js';
import { MessageRenderer } from './MessageRenderer.js';

export interface ActivityStreamProps {
  messages: AgentMessage[];
  isLive: boolean;
  availableHeight?: number;
}

export function ActivityStream({ messages, isLive, availableHeight }: ActivityStreamProps) {
  // Calculate how many lines each message takes (approximation)
  // For simplicity, we'll assume each message is ~3 lines (timestamp + content + margin)
  const linesPerMessage = 3;

  // Calculate visible message range based on available height
  const visibleMessageCount = availableHeight
    ? Math.floor((availableHeight - 3) / linesPerMessage) // Subtract header space
    : messages.length; // If no height limit, show all

  // Calculate initial scroll offset
  const getInitialScrollOffset = () => {
    if (isLive) {
      // For live agents, scroll to bottom (show latest messages)
      return Math.max(0, messages.length - visibleMessageCount);
    } else {
      // For completed agents, scroll to top (show first messages)
      return 0;
    }
  };

  const [scrollOffset, setScrollOffset] = useState(getInitialScrollOffset());

  // Auto-scroll to bottom when new messages arrive for live agents
  useEffect(() => {
    if (isLive && messages.length > 0) {
      const maxOffset = Math.max(0, messages.length - visibleMessageCount);
      setScrollOffset(maxOffset);
    }
  }, [messages.length, isLive, visibleMessageCount]);

  // Handle keyboard scrolling
  useInput((input, key) => {
    if (key.pageDown || input === 'j') {
      setScrollOffset(prev => {
        const maxOffset = Math.max(0, messages.length - visibleMessageCount);
        return Math.min(prev + 1, maxOffset);
      });
    } else if (key.pageUp || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
  });

  // Get visible messages based on scroll offset
  const visibleMessages = useMemo(() => {
    if (!availableHeight) {
      return messages; // No scrolling needed
    }
    return messages.slice(scrollOffset, scrollOffset + visibleMessageCount);
  }, [messages, scrollOffset, visibleMessageCount, availableHeight]);

  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleMessageCount < messages.length;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} height={availableHeight}>
      <Text bold>Activity</Text>
      {hasMoreAbove && (
        <Text dimColor>... (more above, use k or Page Up to scroll up)</Text>
      )}
      {visibleMessages.length === 0 && (
        <Text dimColor>No activity yet</Text>
      )}
      {visibleMessages.map((message, index) => (
        <MessageRenderer key={`${message.agentId}-${scrollOffset + index}`} message={message} />
      ))}
      {hasMoreBelow && (
        <Text dimColor>... (more below, use j or Page Down to scroll down)</Text>
      )}
      {isLive && (
        <Box marginTop={1}>
          <Text color="green">● Streaming...</Text>
        </Box>
      )}
    </Box>
  );
}
