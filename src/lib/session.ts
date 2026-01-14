import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Convert absolute file path to Claude's project path format.
 * Example: /Users/mike/code/project -> -Users-mike-code-project
 */
export function getProjectPath(cwd: string): string {
  // Remove leading slash and replace remaining slashes with dashes
  const normalized = cwd.replace(/^\//, '').replace(/\//g, '-');
  return `-${normalized}`;
}

/**
 * Returns the path to the Claude projects directory for a given project.
 */
export function getClaudeProjectDir(projectPath: string): string {
  return path.join(os.homedir(), '.claude', 'projects', projectPath);
}

/**
 * Returns the path to the subagents directory for a given session.
 */
export function getSubagentsDir(projectDir: string, sessionId: string): string {
  return path.join(projectDir, sessionId, 'subagents');
}

export interface SessionInfo {
  sessionId: string;
  lastModified: Date;
}

/**
 * List all sessions in the project directory, ordered by last modified (most recent first).
 * Returns empty array if no sessions are found.
 */
export async function listSessions(projectDir: string): Promise<SessionInfo[]> {
  try {
    const entries = await fs.promises.readdir(projectDir, { withFileTypes: true });

    // Filter for UUID directories (contain dashes, look like UUIDs)
    const sessionDirs = entries.filter(entry =>
      entry.isDirectory() && entry.name.includes('-')
    );

    const sessions: SessionInfo[] = [];

    for (const dir of sessionDirs) {
      const sessionPath = path.join(projectDir, dir.name);

      try {
        // Get the last modified time of the session directory itself
        const stats = await fs.promises.stat(sessionPath);

        // Also check subagents directory if it exists
        const subagentsDir = path.join(sessionPath, 'subagents');
        let lastModified = stats.mtime;

        try {
          const subagentFiles = await fs.promises.readdir(subagentsDir);
          const jsonlFiles = subagentFiles.filter(f => f.endsWith('.jsonl'));

          for (const file of jsonlFiles) {
            const filePath = path.join(subagentsDir, file);
            const fileStats = await fs.promises.stat(filePath);

            if (fileStats.mtime > lastModified) {
              lastModified = fileStats.mtime;
            }
          }
        } catch {
          // Subagents directory doesn't exist, use session directory mtime
        }

        sessions.push({
          sessionId: dir.name,
          lastModified
        });
      } catch {
        // Skip sessions that can't be accessed
        continue;
      }
    }

    // Sort by most recent first
    sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return sessions;
  } catch {
    return [];
  }
}

/**
 * Find the most recent session ID in the project directory that has subagent activity.
 * Returns null if no sessions with subagents are found.
 */
export async function findCurrentSession(projectDir: string): Promise<string | null> {
  try {
    const entries = await fs.promises.readdir(projectDir, { withFileTypes: true });

    // Filter for UUID directories (contain dashes, look like UUIDs)
    const sessionDirs = entries.filter(entry =>
      entry.isDirectory() && entry.name.includes('-')
    );

    if (sessionDirs.length === 0) {
      return null;
    }

    // Find the session with the most recent subagent activity
    let mostRecentSession: string | null = null;
    let mostRecentTime = 0;

    for (const dir of sessionDirs) {
      const subagentsDir = path.join(projectDir, dir.name, 'subagents');

      try {
        const subagentFiles = await fs.promises.readdir(subagentsDir);
        const jsonlFiles = subagentFiles.filter(f => f.endsWith('.jsonl'));

        for (const file of jsonlFiles) {
          const filePath = path.join(subagentsDir, file);
          const stats = await fs.promises.stat(filePath);

          if (stats.mtimeMs > mostRecentTime) {
            mostRecentTime = stats.mtimeMs;
            mostRecentSession = dir.name;
          }
        }
      } catch {
        // Ignore sessions without subagents directory
        continue;
      }
    }

    return mostRecentSession;
  } catch {
    return null;
  }
}
