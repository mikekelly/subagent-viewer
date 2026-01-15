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
  let focusedPanel: 'sidebar' | 'main' = 'sidebar'; // Track which panel is focused
  let currentEventIndex = 0; // Track which event (message) we're viewing
  let previousAgentId: string | null = null; // Track previously selected agent to detect agent switches

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

  // Header: Title (left) - include full path with ~ for home
  const homeDir = os.homedir();
  const displayPath = cwd.startsWith(homeDir)
    ? `~${cwd.slice(homeDir.length)}`
    : cwd;
  const title = new TextRenderable(renderer, {
    id: "header-title",
    content: `Subagent Viewer (${displayPath})`,
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
    content: "h/l: focus | j/k: nav | {/}: event | a: auto-scroll | q: quit",
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
    borderStyle: "double", // Will be updated based on focus
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
  // Calculate the number of visible lines in the activity panel
  const getVisibleLines = (): number => {
    // Panel height includes: border (2) + padding (2) + title line (1) + blank line (1) = 6 lines overhead
    const panelHeight = mainPanel.height;
    const baseOverhead = 6; // border + padding + "Activity Stream:" + blank line
    return Math.max(1, panelHeight - baseOverhead);
  };

  // Format a message for display
  const formatMessage = (msg: AgentMessage, turnNumber?: number, totalTurns?: number): string[] => {
    // Full detail display
    const lines: string[] = [];
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const turnInfo = turnNumber && totalTurns ? ` Turn ${turnNumber}/${totalTurns}` : '';

    // Helper to split content by newlines and indent each line
    const addContentLines = (header: string, content: string, indent: string = '  ') => {
      lines.push(header);
      const sanitized = sanitizeText(content);
      const contentLines = sanitized.split('\n');
      contentLines.forEach(line => {
        lines.push(`${indent}${line}`);
      });
    };

    if (msg.type === 'user') {
      // User messages can have string content OR array of ContentBlocks (e.g., tool_result)
      if (typeof msg.message.content === 'string') {
        // Skip empty or whitespace-only user messages
        if (msg.message.content.trim() !== '') {
          addContentLines(`[${timestamp}]${turnInfo} User:`, msg.message.content);
        }
      } else if (Array.isArray(msg.message.content)) {
        // Handle ContentBlock arrays in user messages (e.g., tool_result blocks)
        for (const block of msg.message.content) {
          if (block.type === 'tool_result') {
            const resultText = typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content, null, 2);
            addContentLines(`[${timestamp}]${turnInfo} Tool Result:`, resultText);
          } else if (block.type === 'text') {
            addContentLines(`[${timestamp}]${turnInfo} User:`, block.text);
          }
        }
      }
    } else if (msg.type === 'assistant') {
      // Assistant messages have ContentBlock array
      const content = Array.isArray(msg.message.content) ? msg.message.content : [];

      for (const block of content) {
        if (block.type === 'thinking') {
          addContentLines(`[${timestamp}]${turnInfo} Thinking:`, block.thinking);
        } else if (block.type === 'text') {
          addContentLines(`[${timestamp}]${turnInfo} Text:`, block.text);
        } else if (block.type === 'tool_use') {
          const inputText = JSON.stringify(block.input, null, 2);
          addContentLines(`[${timestamp}]${turnInfo} Tool: ${block.name}`, `Input: ${inputText}`);
        } else if (block.type === 'tool_result') {
          const resultText = typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content, null, 2);
          addContentLines(`[${timestamp}]${turnInfo} Tool Result:`, resultText);
        }
      }
    }

    return lines;
  };

  // Convert messages to display lines and track event boundaries
  const getActivityLines = (): { lines: string[]; eventStarts: number[] } => {
    const lines: string[] = [];
    const eventStarts: number[] = [];
    const totalTurns = messages.length;

    // Find and display the initial prompt (first user message)
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    if (firstUserMessage) {
      const content = typeof firstUserMessage.message.content === 'string' ? firstUserMessage.message.content : '';
      if (content.trim() !== '') {
        lines.push("=== INITIAL PROMPT ===");
        const sanitized = sanitizeText(content);
        const contentLines = sanitized.split('\n');
        lines.push(...contentLines);
        lines.push("=== ACTIVITY STREAM ===");
        lines.push("");
      }
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      eventStarts.push(lines.length); // Mark the start of this event
      lines.push(...formatMessage(msg, i + 1, totalTurns));
    }
    return { lines, eventStarts };
  };

  // ===== RENDER UPDATE FUNCTION =====
  const updateDisplay = () => {
    // Update border styles based on focus
    sidebar.borderStyle = focusedPanel === 'sidebar' ? 'double' : 'single';
    mainPanel.borderStyle = focusedPanel === 'main' ? 'double' : 'single';

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
      sessionTabs.content = "Sessions: " + sessionTabsText;
    }

    // Update sidebar with agent list - separate active and inactive
    const liveAgents = agents.filter(a => a.isLive);
    const completedAgents = agents.filter(a => !a.isLive);

    const lines: string[] = [];

    if (liveAgents.length > 0) {
      lines.push(`Active agents (${liveAgents.length}):`);
      liveAgents.forEach((agent) => {
        const agentIndex = agents.indexOf(agent);
        const displayText = agent.agentId.substring(0, 8);
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
        const displayText = agent.agentId.substring(0, 8);
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
    const { lines: activityLines, eventStarts } = getActivityLines();
    const visibleLines = getVisibleLines();

    // Reserve 2 lines for MORE indicators (they're part of the display but not content)
    const contentLines = Math.max(1, visibleLines - 2);
    const maxScrollOffset = Math.max(0, activityLines.length - contentLines);

    // Auto-scroll to bottom if enabled and viewing a live agent
    const currentAgent = agents[selectedAgentIndex];
    if (autoScrollEnabled && currentAgent?.isLive) {
      scrollOffset = maxScrollOffset;
    }

    const clampedScrollOffset = Math.min(scrollOffset, maxScrollOffset);
    scrollOffset = clampedScrollOffset; // Update to clamped value

    const contentStart = clampedScrollOffset;
    const contentEnd = contentStart + contentLines;

    const visibleActivity = activityLines.slice(contentStart, contentEnd);

    let activityText = "Activity Stream:\n\n";
    if (activityLines.length === 0) {
      if (agents.length === 0) {
        activityText += "No agents available.\nSelect a session with subagent activity.";
      } else {
        activityText += "No messages yet.\nWaiting for agent activity...";
      }
    } else {
      // Top MORE indicator (if there's content above)
      if (clampedScrollOffset > 0) {
        activityText += "^ MORE\n";
      } else {
        activityText += "\n"; // Blank line to maintain spacing
      }

      activityText += visibleActivity.join("\n");

      // Bottom MORE indicator (if there's content below)
      if (contentEnd < activityLines.length) {
        activityText += "\nv MORE";
      } else {
        activityText += "\n"; // Blank line to maintain spacing
      }
    }
    mainPanelContent.content = activityText;

    // Update status bar - calculate total tokens and extract model
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let modelName = '';

    for (const msg of messages) {
      if (msg.message.usage) {
        totalInputTokens += msg.message.usage.input_tokens || 0;
        totalOutputTokens += msg.message.usage.output_tokens || 0;
      }
      // Extract model from the first message that has it
      if (!modelName && msg.message.model) {
        modelName = msg.message.model;
      }
    }

    const totalTokens = totalInputTokens + totalOutputTokens;

    // Format model name (extract short version from full model ID)
    let modelDisplay = 'unknown';
    if (modelName) {
      // Extract model type from full model ID (e.g., "claude-sonnet-4-20250514" -> "sonnet")
      if (modelName.includes('sonnet')) {
        modelDisplay = 'sonnet';
      } else if (modelName.includes('opus')) {
        modelDisplay = 'opus';
      } else if (modelName.includes('haiku')) {
        modelDisplay = 'haiku';
      } else {
        modelDisplay = modelName;
      }
    }

    const tokenInfo = totalTokens > 0 ? ` | Tokens: ${totalInputTokens} in / ${totalOutputTokens} out / ${totalTokens} total` : '';
    const modelInfo = `Model: ${modelDisplay}`;
    const autoScrollIndicator = autoScrollEnabled && currentAgent?.isLive ? " | Auto-scroll: ON" : "";
    statusContent.content = `${modelInfo}${tokenInfo}${autoScrollIndicator}`;
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
      currentEventIndex = 0;
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

      // Only reset scroll position when switching to a different agent
      // If we're still viewing the same agent (status refresh), preserve scroll
      const isSwitchingAgent = previousAgentId !== currentAgent.agentId;
      previousAgentId = currentAgent.agentId;

      if (isSwitchingAgent) {
        // Scroll position depends on agent status:
        // - Live agents: scroll to bottom to show latest activity
        // - Completed agents: scroll to top to show initial prompt
        if (currentAgent.isLive) {
          scrollOffset = Number.MAX_SAFE_INTEGER;
          currentEventIndex = Math.max(0, messages.length - 1);
        } else {
          scrollOffset = 0;
          currentEventIndex = 0;
        }
      }
      // else: preserve existing scrollOffset and currentEventIndex

      updateDisplay();
    } catch {
      // File doesn't exist or can't be read
      messages = [];
      filePosition = 0;
      partialLine = '';
      currentEventIndex = 0;
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

            // Only auto-scroll to bottom if autoscroll is enabled
            if (autoScrollEnabled) {
              scrollOffset = Number.MAX_SAFE_INTEGER;
            }

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
  // Handle keyboard events
  renderer.keyInput.on("keypress", async (event) => {
    // Handle quit
    if (event.name === "q") {
      // Clean up watchers
      if (sessionWatcher) sessionWatcher.close();
      if (agentDirWatcher) agentDirWatcher.close();
      if (agentFileWatcher) agentFileWatcher.close();
      clearInterval(refreshInterval);

      console.log("\nExiting...");
      renderer.destroy();
      process.exit(0);
    }
    // Tab: move to next session
    else if (event.name === "tab" && !event.shift) {
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
    // h or Left arrow: focus sidebar
    else if (event.name === "h" || event.name === "left") {
      focusedPanel = 'sidebar';
      updateDisplay();
    }
    // l or Right arrow: focus main panel
    else if (event.name === "l" || event.name === "right") {
      focusedPanel = 'main';
      updateDisplay();
    }
    // Up arrow or k: context-sensitive navigation
    else if (event.name === "up" || event.name === "k") {
      if (focusedPanel === 'sidebar') {
        // Navigate agents in sidebar
        if (agents.length > 0) {
          selectedAgentIndex = selectedAgentIndex === 0
            ? agents.length - 1
            : selectedAgentIndex - 1;
          autoScrollEnabled = true; // Re-enable auto-scroll on agent change
          setupAgentFileWatch();
          await loadMessages();
        }
      } else {
        // Scroll up in main panel
        const { lines: activityLines } = getActivityLines();
        const visibleLines = getVisibleLines();
        const contentLines = Math.max(1, visibleLines - 2);
        const maxScrollOffset = Math.max(0, activityLines.length - contentLines);

        scrollOffset = Math.max(0, scrollOffset - 1);

        // Disable autoscroll if we moved away from bottom
        if (scrollOffset < maxScrollOffset) {
          autoScrollEnabled = false;
        }

        updateDisplay();
      }
    }
    // Down arrow or j: context-sensitive navigation
    else if (event.name === "down" || event.name === "j") {
      if (focusedPanel === 'sidebar') {
        // Navigate agents in sidebar
        if (agents.length > 0) {
          selectedAgentIndex = (selectedAgentIndex + 1) % agents.length;
          autoScrollEnabled = true; // Re-enable auto-scroll on agent change
          setupAgentFileWatch();
          await loadMessages();
        }
      } else {
        // Scroll down in main panel
        const { lines: activityLines } = getActivityLines();
        const visibleLines = getVisibleLines();
        const contentLines = Math.max(1, visibleLines - 2);
        const maxScrollOffset = Math.max(0, activityLines.length - contentLines);
        scrollOffset = Math.min(maxScrollOffset, scrollOffset + 1);

        // Enable autoscroll if we reached the bottom
        if (scrollOffset >= maxScrollOffset) {
          autoScrollEnabled = true;
        }

        updateDisplay();
      }
    }
    // PageUp: scroll up (disable auto-scroll)
    else if (event.name === "pageup") {
      const { lines: activityLines } = getActivityLines();
      const visibleLines = getVisibleLines();
      const contentLines = Math.max(1, visibleLines - 2);
      const maxScrollOffset = Math.max(0, activityLines.length - contentLines);

      scrollOffset = Math.max(0, scrollOffset - 10);

      // Disable autoscroll if we moved away from bottom
      if (scrollOffset < maxScrollOffset) {
        autoScrollEnabled = false;
      }

      updateDisplay();
    }
    // PageDown: scroll down
    else if (event.name === "pagedown") {
      const { lines: activityLines } = getActivityLines();
      const visibleLines = getVisibleLines();
      const contentLines = Math.max(1, visibleLines - 2);
      const maxScrollOffset = Math.max(0, activityLines.length - contentLines);
      scrollOffset = Math.min(maxScrollOffset, scrollOffset + 10);

      // Enable autoscroll if we reached the bottom
      if (scrollOffset >= maxScrollOffset) {
        autoScrollEnabled = true;
      }

      updateDisplay();
    }
    // 'a' key: toggle auto-scroll
    else if (event.name === "a") {
      const previousState = autoScrollEnabled;
      autoScrollEnabled = !autoScrollEnabled;

      // If we just enabled autoscroll, jump to bottom
      if (!previousState && autoScrollEnabled) {
        const { lines: activityLines } = getActivityLines();
        const visibleLines = getVisibleLines();
        const contentLines = Math.max(1, visibleLines - 2);
        const maxScrollOffset = Math.max(0, activityLines.length - contentLines);
        scrollOffset = maxScrollOffset;
      }

      updateDisplay();
    }
    // '{' key: jump to previous event
    else if (event.sequence === "{") {
      autoScrollEnabled = false;
      const { eventStarts } = getActivityLines();
      if (eventStarts.length > 0) {
        // Cyclical: wrap to last event if at first
        currentEventIndex = currentEventIndex === 0
          ? eventStarts.length - 1
          : currentEventIndex - 1;
        scrollOffset = eventStarts[currentEventIndex];
        updateDisplay();
      }
    }
    // '}' key: jump to next event
    else if (event.sequence === "}") {
      autoScrollEnabled = false;
      const { eventStarts } = getActivityLines();
      if (eventStarts.length > 0) {
        // Cyclical: wrap to first event if at last
        currentEventIndex = (currentEventIndex + 1) % eventStarts.length;
        scrollOffset = eventStarts[currentEventIndex];
        updateDisplay();
      }
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
