import React from 'react';
import { Box, Text, Transform } from 'ink';
import { AgentInfo } from '../lib/agentDiscovery.js';

const CLEAR_TO_EOL = '\x1B[K';

function ClearText({ children, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Transform transform={(line) => line + CLEAR_TO_EOL}>
      <Text {...props}>{children}</Text>
    </Transform>
  );
}

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

    // Use agentId as display name (shows unique agent identifier)
    // Truncate if too long (leave room for indent and padding)
    // Sidebar width is 30, minus padding, indent, and borders leaves ~24 chars
    const maxLength = 24;
    const displayName = agent.agentId.length > maxLength
      ? agent.agentId.substring(0, maxLength - 1) + '…'
      : agent.agentId;

    return (
      <Box key={agent.agentId}>
        <ClearText
          color={isSelected ? 'black' : undefined}
          backgroundColor={isSelected ? 'white' : undefined}
        >
          {'  '}{displayName}
        </ClearText>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {agents.length === 0 ? (
        <Box flexDirection="column">
          <ClearText bold>Agents (0)</ClearText>
          <Box height={1} />
          <ClearText dimColor>Waiting for agents...</ClearText>
          <Box height={1} />
          <ClearText dimColor>Subagents will appear here</ClearText>
          <ClearText dimColor>when Claude Code creates</ClearText>
          <ClearText dimColor>background tasks.</ClearText>
        </Box>
      ) : (
        <>
          {liveAgents.length > 0 && (
            <>
              <ClearText bold color="green">Active agents ({liveAgents.length})</ClearText>
              {liveAgents.map(renderAgent)}
              <Box height={1} />
            </>
          )}

          {completedAgents.length > 0 && (
            <>
              <ClearText bold dimColor>Inactive agents ({completedAgents.length})</ClearText>
              {completedAgents.map(renderAgent)}
            </>
          )}
        </>
      )}
    </Box>
  );
}
