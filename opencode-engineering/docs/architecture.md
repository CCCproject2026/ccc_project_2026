# Architecture

This is a project-local OpenCode environment. Start OpenCode with this directory as the working directory, or copy the `.opencode/` contents and `opencode.json` into a reviewed project configuration. The setup script does not write to global configuration.

OpenCode-native layout:

- `opencode.json`: OpenCode 1.x config, conservative permissions, and a disabled optional Context7 server.
- `.opencode/agents/`: focused primary and read-only subagents.
- `.opencode/skills/<id>/SKILL.md`: lazy-loaded task procedures with progressive disclosure.
- `.opencode/commands/`: slash-command prompt templates selecting matching agents.
- `scripts/`: local structural validation and CLI diagnostics.
- `docs/`: provenance, security, installation, and compatibility notes.

Primary agent owns request scope and implementation. Architect/planner/debugger/security agents are read-only. Reviewer can run only exact `git status --short --untracked-files=all`, `git diff --no-ext-diff --no-textconv`, and cached equivalent commands, with all other shell commands denied, and cannot edit. The diff flags block configured external diff and text conversion programs. The Python/IoT specialist handles scoped implementation and preserves cross-layer contracts. Commands route repeatable tasks to these agents; skills contain the reusable detailed workflow.

No plugin or custom MCP server is installed. Plugins execute code in the agent host, and MCP servers can expose powerful tools; neither had a compelling, sufficiently reviewed need for the baseline. Context7 is registered but disabled. The OpenCode CLI's built-in web search and fetch require an explicit permission grant in this config.
