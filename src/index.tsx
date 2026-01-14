import React, { useEffect, useState } from 'react';
import { render, Text, Box } from 'ink';
import { getProjectPath, getClaudeProjectDir, listSessions, getSubagentsDir, SessionInfo } from './lib/session.js';
import { useAgentDiscovery } from './hooks/useAgentDiscovery.js';
import { App } from './components/App.js';

function SubagentViewer() {
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentSession = sessions[selectedSessionIndex];
  const subagentsDir = currentSession && projectDir
    ? getSubagentsDir(projectDir, currentSession.sessionId)
    : null;
  const agents = useAgentDiscovery(subagentsDir);

  useEffect(() => {
    const initSession = async () => {
      try {
        const cwd = process.cwd();
        const projectPath = getProjectPath(cwd);
        const projectDir = getClaudeProjectDir(projectPath);

        // Check if Claude project directory exists (for better error message)
        try {
          await import('fs').then(fs => fs.promises.access(projectDir));
        } catch {
          setError(
            'No Claude Code project found. Make sure you are running this from a directory that has been used with Claude Code.'
          );
          return;
        }

        const allSessions = await listSessions(projectDir);

        if (allSessions.length === 0) {
          setError(
            'No Claude sessions found. Start a Claude Code session in this project first.'
          );
          return;
        }

        setProjectDir(projectDir);
        setSessions(allSessions);
      } catch (err) {
        // Handle permission errors and other unexpected errors
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
          setError(
            'Permission denied accessing Claude directories. Check file permissions for ~/.claude'
          );
        } else {
          setError(`Error discovering session: ${errorMessage}`);
        }
      }
    };

    initSession();
  }, []);

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return <Text>Discovering sessions...</Text>;
  }

  return (
    <App
      agents={agents}
      sessions={sessions}
      selectedSessionIndex={selectedSessionIndex}
      onSessionChange={setSelectedSessionIndex}
    />
  );
}

render(<SubagentViewer />);
