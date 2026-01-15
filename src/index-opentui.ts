import { createCliRenderer, BoxRenderable, TextRenderable } from "@opentui/core";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { getProjectPath, getClaudeProjectDir, listSessions, getSubagentsDir, SessionInfo } from "./lib/session.js";
import { discoverAgents, AgentInfo } from "./lib/agentDiscovery.js";
import { parseJsonlLine, AgentMessage } from "./lib/parser.js";
import { sanitizeText } from "./lib/sanitize.js";

async function main() {
  // Initialize renderer
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
  });

  // ===== STATE =====
  // Real data
  let sessions: SessionInfo[] = [];
  let agents: AgentInfo[] = [];
  let messages: AgentMessage[] = [];

  let selectedSessionIndex = 0;
  let selectedAgentIndex = 0;
  let scrollOffset = 0;
  let autoScrollEnabled = true; // Auto-scroll for live agents

  // Determine project directory
  const cwd = process.cwd();
  const projectPath = getProjectPath(cwd);
  const projectDir = getClaudeProjectDir(projectPath);

  // Root container - vertical flex layout
  const root = new BoxRenderable(renderer, {
    id: "root",
    flexDirection: "column",
    width: "100%",
    height: "100%",
  });

  // ===== HEADER BAR =====
  const header = new BoxRenderable(renderer, {
    id: "header",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });

  // Header: Title (left)
  const title = new TextRenderable(renderer, {
    id: "header-title",
    content: "Subagent Viewer",
  });
  header.add(title);

  // Header: Session tabs (center) - using flexGrow to push to center
  const sessionTabsWrapper = new BoxRenderable(renderer, {
    id: "session-tabs-wrapper",
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
  });
  const sessionTabs = new TextRenderable(renderer, {
    id: "session-tabs",
    content: "",
  });
  sessionTabsWrapper.add(sessionTabs);
  header.add(sessionTabsWrapper);

  // Header: Quit hint (right)
  const quitHint = new TextRenderable(renderer, {
    id: "quit-hint",
    content: "a: auto-scroll | q: quit",
  });
  header.add(quitHint);

  root.add(header);

  // ===== MIDDLE SECTION =====
  const middleSection = new BoxRenderable(renderer, {
    id: "middle-section",
    flexDirection: "row",
    flexGrow: 1,
    width: "100%",
  });

  // Sidebar (left, fixed width)
  const sidebar = new BoxRenderable(renderer, {
    id: "sidebar",
    width: 30,
    border: true,
    borderStyle: "single",
    padding: 1,
    flexShrink: 0,
  });

  const sidebarTitle = new TextRenderable(renderer, {
    id: "sidebar-title",
    content: "Agents:",
  });
  sidebar.add(sidebarTitle);

  const sidebarContent = new TextRenderable(renderer, {
    id: "sidebar-content",
    content: "",
  });
  sidebar.add(sidebarContent);

  middleSection.add(sidebar);

  // Main panel (right, remaining width)
  const mainPanel = new BoxRenderable(renderer, {
    id: "main-panel",
    border: true,
    borderStyle: "single",
    padding: 1,
    flexGrow: 1,
  });

  const mainPanelContent = new TextRenderable(renderer, {
    id: "main-panel-content",
    content: "",
  });
  mainPanel.add(mainPanelContent);

  middleSection.add(mainPanel);
  root.add(middleSection);

  // ===== STATUS BAR =====
  const statusBar = new BoxRenderable(renderer, {
    id: "status-bar",
    flexDirection: "row",
    width: "100%",
    height: 1,
    paddingLeft: 1,
  });

  const statusContent = new TextRenderable(renderer, {
    id: "status-content",
    content: "",
  });
  statusBar.add(statusContent);

  root.add(statusBar);

  // Add root to renderer
  renderer.root.add(root);

  // ===== HELPER FUNCTIONS =====
  // Format a message for display
  const formatMessage = (msg: AgentMessage): string[] => {
    const lines: string[] = [];
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();

    if (msg.type === 'user') {
      // User messages have string content
      const content = typeof msg.message.content === 'string' ? msg.message.content : '';
      // Skip empty or whitespace-only user messages
      if (content.trim() !== '') {
        lines.push(`[${timestamp}] User: ${sanitizeText(content)}`);
      }
    } else if (msg.type === 'assistant') {
      // Assistant messages have ContentBlock array
      const content = Array.isArray(msg.message.content) ? msg.message.content : [];

      for (const block of content) {
        if (block.type === 'thinking') {
          lines.push(`[${timestamp}] Thinking: ${sanitizeText(block.thinking)}`);
        } else if (block.type === 'text') {
          lines.push(`[${timestamp}] Text: ${sanitizeText(block.text)}`);
        } else if (block.type === 'tool_use') {
          lines.push(`[${timestamp}] Tool: ${block.name}`);
        } else if (block.type === 'tool_result') {
          const resultText = typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content);
          lines.push(`[${timestamp}] Result: ${sanitizeText(resultText.substring(0, 100))}`);
        }
      }
    }

    return lines;
  };

  // Convert messages to display lines
  const getActivityLines = (): string[] => {
    const lines: string[] = [];
    for (const msg of messages) {
      lines.push(...formatMessage(msg));
    }
    return lines;
  };

  // ===== RENDER UPDATE FUNCTION =====
  const updateDisplay = () => {
    // Update session tabs
    if (sessions.length === 0) {
      sessionTabs.content = "No sessions found";
    } else {
      const sessionTabsText = sessions
        .map((session, index) => {
          const shortId = session.sessionId.substring(0, 8);
          if (index === selectedSessionIndex) {
            return `[${shortId}]`; // Selected session shown in brackets
          }
          return shortId;
        })
        .join(" ");
      sessionTabs.content = sessionTabsText;
    }

    // Update sidebar with agent list - separate active and inactive
    const liveAgents = agents.filter(a => a.isLive);
    const completedAgents = agents.filter(a => !a.isLive);

    const lines: string[] = [];

    if (liveAgents.length > 0) {
      lines.push(`Active agents (${liveAgents.length}):`);
      liveAgents.forEach((agent) => {
        const agentIndex = agents.indexOf(agent);
        const displayText = `${agent.slug} (${agent.agentId.substring(0, 8)})`;
        if (agentIndex === selectedAgentIndex) {
          lines.push(`> ${displayText}`); // Show selection with arrow
        } else {
          lines.push(`  ${displayText}`);
        }
      });
      lines.push(""); // Blank line separator
    }

    if (completedAgents.length > 0) {
      lines.push(`Completed agents (${completedAgents.length}):`);
      completedAgents.forEach((agent) => {
        const agentIndex = agents.indexOf(agent);
        const displayText = `${agent.slug} (${agent.agentId.substring(0, 8)})`;
        if (agentIndex === selectedAgentIndex) {
          lines.push(`> ${displayText}`); // Show selection with arrow
        } else {
          lines.push(`  ${displayText}`);
        }
      });
    }

    if (agents.length === 0) {
      lines.push("No agents found");
    }

    sidebarContent.content = "\n" + lines.join("\n");

    // Update main panel with activity stream (with scrolling)
    const activityLines = getActivityLines();
    const visibleLines = 10; // Number of visible lines in activity panel
    const maxScrollOffset = Math.max(0, activityLines.length - visibleLines);

    // Auto-scroll to bottom if enabled and viewing a live agent
    const currentAgent = agents[selectedAgentIndex];
    if (autoScrollEnabled && currentAgent?.isLive) {
      scrollOffset = maxScrollOffset;
    }

    const clampedScrollOffset = Math.min(scrollOffset, maxScrollOffset);
    scrollOffset = clampedScrollOffset; // Update to clamped value

    const visibleActivity = activityLines.slice(
      clampedScrollOffset,
      clampedScrollOffset + visibleLines
    );

    let activityText = "Activity Stream:\n\n";
    if (activityLines.length === 0) {
      if (agents.length === 0) {
        activityText += "No agents available.\nSelect a session with subagent activity.";
      } else {
        activityText += "No messages yet.\nWaiting for agent activity...";
      }
    } else {
      if (clampedScrollOffset > 0) {
        activityText += "... (more above)\n";
      }
      activityText += visibleActivity.join("\n");
      if (clampedScrollOffset + visibleLines < activityLines.length) {
        activityText += "\n... (more below)";
      }
    }
    mainPanelContent.content = activityText;

    // Update status bar
    const modelInfo = currentAgent ? `Agent: ${currentAgent.agentId.substring(0, 8)}` : 'No agent';
    const scrollPercentage = activityLines.length <= visibleLines
      ? 100
      : Math.round((clampedScrollOffset / maxScrollOffset) * 100);
    const autoScrollIndicator = autoScrollEnabled && currentAgent?.isLive ? " | Auto-scroll: ON" : "";
    statusContent.content = `${modelInfo} | Messages: ${messages.length} | Scroll: ${scrollPercentage}% (${clampedScrollOffset + 1}-${Math.min(clampedScrollOffset + visibleLines, activityLines.length)}/${activityLines.length})${autoScrollIndicator}`;
  };

  // ===== DATA LOADING AND WATCHING =====
  // Load sessions
  const loadSessions = async () => {
    sessions = await listSessions(projectDir);
    // Clamp selected index
    if (selectedSessionIndex >= sessions.length) {
      selectedSessionIndex = Math.max(0, sessions.length - 1);
    }
    updateDisplay();

    // Load agents for the selected session
    if (sessions.length > 0) {
      await loadAgents();
    }
  };

  // Load agents for the currently selected session
  const loadAgents = async () => {
    if (sessions.length === 0) {
      agents = [];
      updateDisplay();
      return;
    }

    const currentSession = sessions[selectedSessionIndex];
    const subagentsDir = getSubagentsDir(projectDir, currentSession.sessionId);
    agents = await discoverAgents(subagentsDir);

    // Clamp selected agent index
    if (selectedAgentIndex >= agents.length) {
      selectedAgentIndex = Math.max(0, agents.length - 1);
    }

    updateDisplay();

    // Load messages for the selected agent
    if (agents.length > 0) {
      await loadMessages();
    }
  };

  // Load messages from the currently selected agent's JSONL file
  let filePosition = 0;
  let partialLine = '';

  const loadMessages = async () => {
    if (agents.length === 0) {
      messages = [];
      filePosition = 0;
      partialLine = '';
      updateDisplay();
      return;
    }

    const currentAgent = agents[selectedAgentIndex];
    const filePath = currentAgent.filePath;

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const parsed = lines
        .map(line => parseJsonlLine(line))
        .filter((msg): msg is AgentMessage => msg !== null);

      messages = parsed;
      filePosition = content.length;
      partialLine = '';

      // Auto-scroll to bottom when loading new agent
      scrollOffset = Number.MAX_SAFE_INTEGER;

      updateDisplay();
    } catch {
      // File doesn't exist or can't be read
      messages = [];
      filePosition = 0;
      partialLine = '';
      updateDisplay();
    }
  };

  // Read new content from the current agent's file (for live updates)
  const readNewContent = async () => {
    if (agents.length === 0) {
      return;
    }

    const currentAgent = agents[selectedAgentIndex];
    const filePath = currentAgent.filePath;

    try {
      const stats = await fs.promises.stat(filePath);

      // If file is smaller than our position, it was truncated/replaced
      if (stats.size < filePosition) {
        filePosition = 0;
        partialLine = '';
      }

      // Only read if there's new content
      if (stats.size > filePosition) {
        const fd = await fs.promises.open(filePath, 'r');
        try {
          const bufferSize = stats.size - filePosition;
          const buffer = Buffer.alloc(bufferSize);
          await fd.read(buffer, 0, bufferSize, filePosition);

          const newContent = buffer.toString('utf-8');
          filePosition = stats.size;

          // Combine with any partial line from before
          const contentToProcess = partialLine + newContent;
          const lines = contentToProcess.split('\n');

          // Last line might be incomplete if no trailing newline
          partialLine = lines[lines.length - 1];

          // Parse complete lines (all but the last)
          const completeLines = lines.slice(0, -1);
          const newMessages = completeLines
            .map(line => parseJsonlLine(line))
            .filter((msg): msg is AgentMessage => msg !== null);

          if (newMessages.length > 0) {
            messages = [...messages, ...newMessages];

            // Auto-scroll to bottom on new content
            scrollOffset = Number.MAX_SAFE_INTEGER;

            updateDisplay();
          }
        } finally {
          await fd.close();
        }
      }
    } catch {
      // File might not exist yet or error reading
    }
  };

  // Initial data load
  await loadSessions();

  // Set up watchers
  let sessionWatcher: fs.FSWatcher | null = null;
  let agentDirWatcher: fs.FSWatcher | null = null;
  let agentFileWatcher: fs.FSWatcher | null = null;

  // Watch project directory for new sessions
  try {
    sessionWatcher = fs.watch(projectDir, async (eventType) => {
      await loadSessions();
    });
  } catch {
    // Watch might fail
  }

  // Function to setup agent directory watcher
  const setupAgentDirWatch = () => {
    // Close existing watcher
    if (agentDirWatcher) {
      agentDirWatcher.close();
      agentDirWatcher = null;
    }

    if (sessions.length === 0) {
      return;
    }

    const currentSession = sessions[selectedSessionIndex];
    const subagentsDir = getSubagentsDir(projectDir, currentSession.sessionId);

    try {
      agentDirWatcher = fs.watch(subagentsDir, async () => {
        await loadAgents();
      });
    } catch {
      // Directory might not exist yet
    }
  };

  // Function to setup agent file watcher
  const setupAgentFileWatch = () => {
    // Close existing watcher
    if (agentFileWatcher) {
      agentFileWatcher.close();
      agentFileWatcher = null;
    }

    if (agents.length === 0) {
      return;
    }

    const currentAgent = agents[selectedAgentIndex];
    const filePath = currentAgent.filePath;

    try {
      agentFileWatcher = fs.watch(filePath, async () => {
        await readNewContent();
      });
    } catch {
      // File might not exist yet
    }
  };

  // Initial watch setup
  setupAgentDirWatch();
  setupAgentFileWatch();

  // Periodic refresh for live status updates
  const refreshInterval = setInterval(async () => {
    // Refresh agent live status
    if (sessions.length > 0) {
      await loadAgents();
    }
  }, 3000); // Every 3 seconds

  // Initial render
  updateDisplay();

  // ===== KEYBOARD INPUT HANDLERS =====
  // Handle quit
  renderer.keyInput.on("q", () => {
    // Clean up watchers
    if (sessionWatcher) sessionWatcher.close();
    if (agentDirWatcher) agentDirWatcher.close();
    if (agentFileWatcher) agentFileWatcher.close();
    clearInterval(refreshInterval);

    console.log("\nExiting...");
    renderer.destroy();
    process.exit(0);
  });

  // Handle Tab (next session)
  renderer.keyInput.on("keypress", async (event) => {
    if (event.name === "tab" && !event.shift) {
      // Tab: move to next session
      if (sessions.length > 0) {
        selectedSessionIndex = (selectedSessionIndex + 1) % sessions.length;
        setupAgentDirWatch();
        await loadAgents();
      }
    } else if (event.name === "tab" && event.shift) {
      // Shift+Tab: move to previous session
      if (sessions.length > 0) {
        selectedSessionIndex = selectedSessionIndex === 0
          ? sessions.length - 1
          : selectedSessionIndex - 1;
        setupAgentDirWatch();
        await loadAgents();
      }
    }
    // Up arrow or k: move selection up
    else if (event.name === "up" || event.name === "k") {
      if (agents.length > 0) {
        selectedAgentIndex = selectedAgentIndex === 0
          ? agents.length - 1
          : selectedAgentIndex - 1;
        autoScrollEnabled = true; // Re-enable auto-scroll on agent change
        setupAgentFileWatch();
        await loadMessages();
      }
    }
    // Down arrow or j: move selection down
    else if (event.name === "down" || event.name === "j") {
      if (agents.length > 0) {
        selectedAgentIndex = (selectedAgentIndex + 1) % agents.length;
        autoScrollEnabled = true; // Re-enable auto-scroll on agent change
        setupAgentFileWatch();
        await loadMessages();
      }
    }
    // PageUp: scroll up (disable auto-scroll)
    else if (event.name === "pageup") {
      autoScrollEnabled = false;
      scrollOffset = Math.max(0, scrollOffset - 10);
      updateDisplay();
    }
    // PageDown: scroll down (disable auto-scroll)
    else if (event.name === "pagedown") {
      autoScrollEnabled = false;
      const activityLines = getActivityLines();
      const visibleLines = 10;
      const maxScrollOffset = Math.max(0, activityLines.length - visibleLines);
      scrollOffset = Math.min(maxScrollOffset, scrollOffset + 10);
      updateDisplay();
    }
    // 'a' key: toggle auto-scroll
    else if (event.name === "a") {
      autoScrollEnabled = !autoScrollEnabled;
      updateDisplay();
    }
  });

  // Clean up on exit
  process.on("SIGINT", () => {
    if (sessionWatcher) sessionWatcher.close();
    if (agentDirWatcher) agentDirWatcher.close();
    if (agentFileWatcher) agentFileWatcher.close();
    clearInterval(refreshInterval);

    renderer.destroy();
    process.exit(0);
  });

  // Start the renderer
  renderer.start();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
