import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProjectPath, getClaudeProjectDir, getSubagentsDir, findCurrentSession, listSessions } from '../lib/session.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

describe('session', () => {
  describe('getProjectPath', () => {
    it('should convert absolute path to Claude project format', () => {
      const cwd = '/Users/mike/code/subagent-viewer';
      const expected = '-Users-mike-code-subagent-viewer';
      expect(getProjectPath(cwd)).toBe(expected);
    });

    it('should handle paths with spaces', () => {
      const cwd = '/Users/john doe/my projects/test';
      const expected = '-Users-john doe-my projects-test';
      expect(getProjectPath(cwd)).toBe(expected);
    });

    it('should handle root directory', () => {
      const cwd = '/root';
      const expected = '-root';
      expect(getProjectPath(cwd)).toBe(expected);
    });
  });

  describe('getClaudeProjectDir', () => {
    it('should return path to Claude projects directory', () => {
      const projectPath = '-Users-mike-code-subagent-viewer';
      const homeDir = os.homedir();
      const expected = path.join(homeDir, '.claude', 'projects', projectPath);
      expect(getClaudeProjectDir(projectPath)).toBe(expected);
    });
  });

  describe('getSubagentsDir', () => {
    it('should return path to subagents directory for a session', () => {
      const projectDir = '/Users/mike/.claude/projects/-Users-mike-code-subagent-viewer';
      const sessionId = '12345-abcde-67890';
      const expected = path.join(projectDir, sessionId, 'subagents');
      expect(getSubagentsDir(projectDir, sessionId)).toBe(expected);
    });
  });

  describe('findCurrentSession', () => {
    const tmpDir = path.join(os.tmpdir(), 'session-test-' + Date.now());

    beforeEach(async () => {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    it('should return null when no sessions exist', async () => {
      const result = await findCurrentSession(tmpDir);
      expect(result).toBeNull();
    });

    it('should return null when sessions have no subagents', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'session-123'), { recursive: true });
      const result = await findCurrentSession(tmpDir);
      expect(result).toBeNull();
    });

    it('should return the session with most recent subagent activity', async () => {
      // Create two sessions with subagents
      const session1 = path.join(tmpDir, 'session-111');
      const session2 = path.join(tmpDir, 'session-222');

      await fs.promises.mkdir(path.join(session1, 'subagents'), { recursive: true });
      await fs.promises.mkdir(path.join(session2, 'subagents'), { recursive: true });

      // Write files with different timestamps
      const file1 = path.join(session1, 'subagents', 'agent-abc.jsonl');
      const file2 = path.join(session2, 'subagents', 'agent-def.jsonl');

      await fs.promises.writeFile(file1, 'test');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different mtime
      await fs.promises.writeFile(file2, 'test');

      const result = await findCurrentSession(tmpDir);
      expect(result).toBe('session-222');
    });

    it('should ignore directories without dashes', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'notasession'), { recursive: true });
      await fs.promises.mkdir(path.join(tmpDir, 'session-123', 'subagents'), { recursive: true });
      await fs.promises.writeFile(
        path.join(tmpDir, 'session-123', 'subagents', 'agent-abc.jsonl'),
        'test'
      );

      const result = await findCurrentSession(tmpDir);
      expect(result).toBe('session-123');
    });
  });

  describe('listSessions', () => {
    const tmpDir = path.join(os.tmpdir(), 'list-sessions-test-' + Date.now());

    beforeEach(async () => {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    it('should return empty array when no sessions exist', async () => {
      const result = await listSessions(tmpDir);
      expect(result).toEqual([]);
    });

    it('should return all sessions ordered by last modified (most recent first)', async () => {
      // Create three sessions with different timestamps
      const session1 = path.join(tmpDir, 'session-111');
      const session2 = path.join(tmpDir, 'session-222');
      const session3 = path.join(tmpDir, 'session-333');

      await fs.promises.mkdir(path.join(session1, 'subagents'), { recursive: true });
      await fs.promises.mkdir(path.join(session2, 'subagents'), { recursive: true });
      await fs.promises.mkdir(path.join(session3, 'subagents'), { recursive: true });

      // Write files with different timestamps
      await fs.promises.writeFile(path.join(session1, 'subagents', 'agent-abc.jsonl'), 'test');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.promises.writeFile(path.join(session2, 'subagents', 'agent-def.jsonl'), 'test');
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.promises.writeFile(path.join(session3, 'subagents', 'agent-ghi.jsonl'), 'test');

      const result = await listSessions(tmpDir);

      expect(result).toHaveLength(3);
      expect(result[0].sessionId).toBe('session-333'); // Most recent
      expect(result[1].sessionId).toBe('session-222');
      expect(result[2].sessionId).toBe('session-111'); // Oldest

      // Verify all have lastModified dates
      result.forEach(session => {
        expect(session.lastModified).toBeInstanceOf(Date);
      });
    });

    it('should ignore directories without dashes', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'notasession'), { recursive: true });
      await fs.promises.mkdir(path.join(tmpDir, 'session-123'), { recursive: true });

      const result = await listSessions(tmpDir);

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe('session-123');
    });

    it('should include sessions without subagents directory', async () => {
      await fs.promises.mkdir(path.join(tmpDir, 'session-111'), { recursive: true });
      await fs.promises.mkdir(path.join(tmpDir, 'session-222', 'subagents'), { recursive: true });

      const result = await listSessions(tmpDir);

      expect(result).toHaveLength(2);
      expect(result.map(s => s.sessionId).sort()).toEqual(['session-111', 'session-222']);
    });
  });
});
