import React, { useEffect, useState } from 'react';
import { render, Text, Box } from 'ink';
import { getProjectPath, getClaudeProjectDir, findCurrentSession, getSubagentsDir } from './lib/session.js';
import { useAgentDiscovery } from './hooks/useAgentDiscovery.js';
import { App } from './components/App.js';

function SubagentViewer() {
  const [subagentsDir, setSubagentsDir] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

        const sessionId = await findCurrentSession(projectDir);

        if (!sessionId) {
          setError(
            'No active Claude session found. Start a Claude Code session in this project first.'
          );
          return;
        }

        const dir = getSubagentsDir(projectDir, sessionId);
        setSubagentsDir(dir);
        setSessionId(sessionId);
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

  if (!subagentsDir) {
    return <Text>Discovering session...</Text>;
  }

  return <App agents={agents} sessionId={sessionId ?? ''} />;
}

render(<SubagentViewer />);
