import React from 'react';
import { Box, Text } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';

export interface SidebarProps {
  agents: AgentInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Sidebar({ agents, selectedId, onSelect }: SidebarProps) {
  // Separate agents into live and completed groups
  const liveAgents = agents
    .filter(a => a.isLive)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const completedAgents = agents
    .filter(a => !a.isLive)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const renderAgent = (agent: AgentInfo) => {
    const isSelected = agent.agentId === selectedId;

    // Truncate slug if too long (leave room for indent and padding)
    // Sidebar width is 30, minus padding, indent, and borders leaves ~24 chars
    const maxSlugLength = 24;
    const displaySlug = agent.slug.length > maxSlugLength
      ? agent.slug.substring(0, maxSlugLength - 1) + '…'
      : agent.slug;

    return (
      <Box key={agent.agentId}>
        <Text
          color={isSelected ? 'black' : undefined}
          backgroundColor={isSelected ? 'white' : undefined}
        >
          {'  '}{displaySlug}
        </Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {agents.length === 0 ? (
        <Box flexDirection="column">
          <Text bold>Agents (0)</Text>
          <Box height={1} />
          <Text dimColor>Waiting for agents...</Text>
          <Box height={1} />
          <Text dimColor>Subagents will appear here</Text>
          <Text dimColor>when Claude Code creates</Text>
          <Text dimColor>background tasks.</Text>
        </Box>
      ) : (
        <>
          {liveAgents.length > 0 && (
            <>
              <Text bold color="green">Live ({liveAgents.length})</Text>
              {liveAgents.map(renderAgent)}
              <Box height={1} />
            </>
          )}

          {completedAgents.length > 0 && (
            <>
              <Text bold dimColor>Completed ({completedAgents.length})</Text>
              {completedAgents.map(renderAgent)}
            </>
          )}
        </>
      )}
    </Box>
  );
}
