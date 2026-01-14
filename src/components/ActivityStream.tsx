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

  // Reserve space for status bar at bottom (3 lines)
  const statusBarHeight = 3;
  const effectiveHeight = availableHeight ? availableHeight - statusBarHeight : undefined;

  // Calculate visible message range based on available height
  const visibleMessageCount = effectiveHeight
    ? Math.floor((effectiveHeight - 3) / linesPerMessage) // Subtract header space
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

  // Handle keyboard and mouse wheel scrolling
  useInput((input, key) => {
    if (key.pageDown || input === 'j') {
      setScrollOffset(prev => {
        const maxOffset = Math.max(0, messages.length - visibleMessageCount);
        return Math.min(prev + 1, maxOffset);
      });
    } else if (key.pageUp || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    }
  }, { isActive: true });

  // Get visible messages based on scroll offset
  const visibleMessages = useMemo(() => {
    if (!effectiveHeight) {
      return messages; // No scrolling needed
    }
    return messages.slice(scrollOffset, scrollOffset + visibleMessageCount);
  }, [messages, scrollOffset, visibleMessageCount, effectiveHeight]);

  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleMessageCount < messages.length;

  // Calculate cumulative token usage from assistant messages
  const tokenStats = useMemo(() => {
    let totalOutputTokens = 0;
    let turnCount = 0;
    let modelName = 'unknown';

    for (const msg of messages) {
      if (msg.type === 'assistant') {
        if (msg.message.usage?.output_tokens) {
          totalOutputTokens += msg.message.usage.output_tokens;
        }
        if (msg.message.model && modelName === 'unknown') {
          modelName = msg.message.model;
        }
        turnCount++;
      }
    }

    return { totalOutputTokens, turnCount, modelName };
  }, [messages]);

  // Calculate scroll position percentage for indicator
  const scrollPercentage = useMemo(() => {
    if (messages.length <= visibleMessageCount) {
      return 100; // All messages visible, scroll at 100%
    }
    const maxOffset = messages.length - visibleMessageCount;
    return Math.round((scrollOffset / maxOffset) * 100);
  }, [scrollOffset, messages.length, visibleMessageCount]);

  // Generate scroll indicator bar
  const scrollIndicator = useMemo(() => {
    if (messages.length <= visibleMessageCount) {
      return '[========]'; // All visible
    }
    const barLength = 8;
    const filledLength = Math.round((scrollPercentage / 100) * barLength);
    const filled = '='.repeat(filledLength);
    const empty = '-'.repeat(barLength - filledLength);
    return `[${filled}${empty}]`;
  }, [scrollPercentage, messages.length, visibleMessageCount]);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} height={availableHeight} overflow="hidden">
      <Text bold>Activity</Text>
      {hasMoreAbove && (
        <Text dimColor>... (more above, use k or Page Up to scroll up)</Text>
      )}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleMessages.length === 0 && (
          <Text dimColor>No activity yet</Text>
        )}
        {visibleMessages.map((message, index) => (
          <MessageRenderer key={`${message.agentId}-${scrollOffset + index}`} message={message} />
        ))}
      </Box>
      {hasMoreBelow && (
        <Text dimColor>... (more below, use j or Page Down to scroll down)</Text>
      )}

      {/* Status bar at bottom */}
      <Box borderStyle="single" borderTop marginTop={1} paddingX={1} flexDirection="row">
        <Text dimColor>
          Model: <Text bold>{tokenStats.modelName}</Text>
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>
          Output tokens: <Text bold>{tokenStats.totalOutputTokens.toLocaleString()}</Text>
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>
          Turns: <Text bold>{tokenStats.turnCount}</Text>
        </Text>
        <Box flexGrow={1} />
        {messages.length > visibleMessageCount && (
          <Text dimColor>
            {scrollIndicator} {scrollPercentage}%
          </Text>
        )}
        {isLive && (
          <Text color="green"> ● Streaming</Text>
        )}
      </Box>
    </Box>
  );
}
