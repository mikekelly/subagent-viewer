import React, { useState, useEffect } from 'react';
import { Box, useInput } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';
import { AgentMessage } from '../lib/parser.js';
import { Sidebar } from './Sidebar.js';
import { ActivityStream } from './ActivityStream.js';

export interface AppProps {
  agents: AgentInfo[];
  getMessages: (agentId: string) => AgentMessage[];
}

export function App({ agents, getMessages }: AppProps) {
  // Select first agent by default
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort agents same way as Sidebar for consistent indexing
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  const selectedAgent = sortedAgents[selectedIndex];

  // Handle arrow key navigation
  useInput((input, key) => {
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

  const messages = selectedAgent ? getMessages(selectedAgent.agentId) : [];
  const isLive = selectedAgent?.isLive ?? false;

  return (
    <Box flexDirection="row" height="100%">
      <Box width={30} borderStyle="single" borderRight>
        <Sidebar
          agents={sortedAgents}
          selectedId={selectedAgent?.agentId ?? null}
          onSelect={() => {}}
        />
      </Box>
      <Box flexGrow={1}>
        <ActivityStream messages={messages} isLive={isLive} />
      </Box>
    </Box>
  );
}
