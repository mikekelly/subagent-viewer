import React, { useState, useEffect } from 'react';
import { Box, useInput, Text, useApp, useStdout } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';
import { SessionInfo } from '../lib/session.js';
import { Sidebar } from './Sidebar.js';
import { ActivityStream } from './ActivityStream.js';
import { useAgentStream } from '../hooks/useAgentStream.js';

export interface AppProps {
  agents: AgentInfo[];
  sessions: SessionInfo[];
  selectedSessionIndex: number;
  onSessionChange: (index: number) => void;
}

export function App({ agents, sessions, selectedSessionIndex, onSessionChange }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions
  const terminalHeight = stdout?.rows ?? 24;

  // Select first agent by default
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);

  // Sort agents same way as Sidebar for consistent indexing
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const selectedAgent = sortedAgents[selectedAgentIndex];

  // Stream messages for selected agent
  const { messages, isStreaming } = useAgentStream(selectedAgent?.filePath ?? null);

  // Handle keyboard input (navigation and quit)
  useInput((input, key) => {
    // Quit on 'q'
    if (input === 'q') {
      exit();
      return;
    }

    // Tab key navigation for sessions
    if (key.tab) {
      if (key.shift) {
        // Shift+Tab: move to previous session
        onSessionChange(selectedSessionIndex === 0 ? sessions.length - 1 : selectedSessionIndex - 1);
      } else {
        // Tab: move to next session
        onSessionChange(selectedSessionIndex === sessions.length - 1 ? 0 : selectedSessionIndex + 1);
      }
      return;
    }

    // Arrow key navigation for agents
    if (key.upArrow) {
      setSelectedAgentIndex(prev => {
        if (prev === 0) return sortedAgents.length - 1; // Wrap to bottom
        return prev - 1;
      });
    } else if (key.downArrow) {
      setSelectedAgentIndex(prev => {
        if (prev === sortedAgents.length - 1) return 0; // Wrap to top
        return prev + 1;
      });
    }
  });

  // Reset selection if agents list changes and selected index is out of bounds
  useEffect(() => {
    if (selectedAgentIndex >= sortedAgents.length) {
      setSelectedAgentIndex(Math.max(0, sortedAgents.length - 1));
    }
  }, [sortedAgents.length, selectedAgentIndex]);

  // Calculate available height for main content (terminal height - header)
  const headerHeight = 3; // Single combined header (border, content, border)
  const contentHeight = terminalHeight - headerHeight;

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Header: Title, Session tabs, and quit hint in single row */}
      <Box borderStyle="single" borderBottom paddingX={1} flexDirection="row">
        <Text bold color="cyan">Subagent Viewer</Text>
        <Box marginLeft={2} flexDirection="row">
          {sessions.map((session, index) => {
            const shortId = session.sessionId.substring(0, 8);
            const isSelected = index === selectedSessionIndex;
            return (
              <Box key={session.sessionId} marginRight={1}>
                <Text
                  bold={isSelected}
                  color={isSelected ? 'cyan' : undefined}
                  dimColor={!isSelected}
                >
                  [{shortId}]
                </Text>
              </Box>
            );
          })}
        </Box>
        <Box flexGrow={1} />
        <Text dimColor>(q to quit)</Text>
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" height={contentHeight}>
        <Box width={30} borderStyle="single" borderRight flexShrink={0}>
          <Sidebar
            agents={sortedAgents}
            selectedId={selectedAgent?.agentId ?? null}
            onSelect={() => {}}
          />
        </Box>
        <Box flexGrow={1} overflow="hidden">
          <ActivityStream messages={messages} isLive={isStreaming} availableHeight={contentHeight} />
        </Box>
      </Box>
    </Box>
  );
}
