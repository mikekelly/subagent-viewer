import React, { useState, useEffect } from 'react';
import { Box, useInput, Text, useApp } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';
import { Sidebar } from './Sidebar.js';
import { ActivityStream } from './ActivityStream.js';
import { useAgentStream } from '../hooks/useAgentStream.js';

export interface AppProps {
  agents: AgentInfo[];
  sessionId: string;
}

export function App({ agents, sessionId }: AppProps) {
  const { exit } = useApp();

  // Select first agent by default
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort agents same way as Sidebar for consistent indexing
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const selectedAgent = sortedAgents[selectedIndex];

  // Stream messages for selected agent
  const { messages, isStreaming } = useAgentStream(selectedAgent?.filePath ?? null);

  // Handle keyboard input (navigation and quit)
  useInput((input, key) => {
    // Quit on 'q'
    if (input === 'q') {
      exit();
      return;
    }

    // Arrow key navigation
    if (key.upArrow) {
      setSelectedIndex(prev => {
        if (prev === 0) return sortedAgents.length - 1; // Wrap to bottom
        return prev - 1;
      });
    } else if (key.downArrow) {
      setSelectedIndex(prev => {
        if (prev === sortedAgents.length - 1) return 0; // Wrap to top
        return prev + 1;
      });
    }
  });

  // Reset selection if agents list changes and selected index is out of bounds
  useEffect(() => {
    if (selectedIndex >= sortedAgents.length) {
      setSelectedIndex(Math.max(0, sortedAgents.length - 1));
    }
  }, [sortedAgents.length, selectedIndex]);

  // Truncate session ID for display (first 8 chars)
  const shortSessionId = sessionId ? sessionId.substring(0, 8) : 'unknown';

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderBottom paddingX={1}>
        <Text bold color="cyan">Subagent Viewer</Text>
        <Text dimColor> - Session: {shortSessionId}</Text>
        <Box flexGrow={1} />
        <Text dimColor>(q to quit)</Text>
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        <Box width={30} borderStyle="single" borderRight>
          <Sidebar
            agents={sortedAgents}
            selectedId={selectedAgent?.agentId ?? null}
            onSelect={() => {}}
          />
        </Box>
        <Box flexGrow={1}>
          <ActivityStream messages={messages} isLive={isStreaming} />
        </Box>
      </Box>
    </Box>
  );
}
