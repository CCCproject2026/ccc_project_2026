# Codex and OpenCode compatibility

The available CLI is OpenCode 1.19.6. Its configuration therefore uses V1 field names (`permission`, `agent`, `command`, `mcp.<name>`). The latest OpenCode docs also describe V2-native forms (`permissions`, `agents`, `commands`, `mcp.servers`). V2 officially accepts supported V1 configuration, but converting this package to V2-only syntax would make it fail in the installed CLI. Recheck `opencode --version` before upgrading, and use the official migration guide when intentionally converting.

| Concept | Codex | OpenCode here |
|---|---|---|
| repository instructions | `AGENTS.md` | `AGENTS.md`, loaded by config `instructions` |
| specialist agents | `.codex/agents/*.toml` generated from role docs | `.opencode/agents/*.md` frontmatter + system prompt |
| skills | `.agents/skills/<id>/SKILL.md` | OpenCode discovers `.agents/skills` and native `.opencode/skills`; this package uses native path and does not point at project assets implicitly |
| MCP | Codex configuration / app connections | OpenCode 1.x `mcp.<name>`; Context7 entry is disabled |
| slash commands | tool-specific commands | `.opencode/commands/*.md` with OpenCode YAML metadata |
| plugins/hooks | Codex-specific mechanisms | OpenCode plugins execute host code; no plugin chosen |
| permissions | Codex sandbox and approval controls | OpenCode ordered permission rules; not a substitute for OS sandbox or managed policy |

Adapted concepts: existing project roles `nextjs-specialist`, `python-ml-iot-specialist`, and `senior-code-reviewer`; local skills `code-review`, `security-and-privacy`, `fastapi-ml-iot`, `iot-data-contract`, and architecture explanation. Existing source remains untouched. OpenCode custom agents do not automatically inherit Codex TOML semantics; metadata and permission rules were rewritten for OpenCode.

## Read-only inventory completed for this workspace

| Existing asset | Purpose / area | Relationship and compatibility |
|---|---|---|
| `.codex/agents/nextjs-specialist.toml` | Generated Next.js implementation role | Mapped to future `frontend-engineer`; not copied because this baseline prioritizes shared core and Python/IoT tasks. OpenCode Markdown agent format differs from TOML. |
| `.codex/agents/python-ml-iot-specialist.toml` | Generated Python, FastAPI, MQTT, Device API, and inference role | Adapted as `python-iot-engineer`; strengthened to avoid guessing sensor/preprocessing contracts. |
| `.codex/agents/senior-code-reviewer.toml` | Generated independent read-only reviewer | Adapted as `reviewer`, with narrower evidence and severity reporting. |
| `.agents/skills/code-review/SKILL.md` | Diff review | Reimplemented as OpenCode `code-review`; no source copy. |
| `.agents/skills/security-and-privacy/SKILL.md` | Auth, secrets, privacy, external communication | Security approach independently incorporated into `security-review` and global `AGENTS.md`. |
| `.agents/skills/fastapi-ml-iot/SKILL.md` | Python and inference workflow | Similar domain concerns captured in `fastapi-development` and the Python/IoT agent. |
| `.agents/skills/iot-data-contract/SKILL.md` | Cross-layer data contract work | Reimplemented as `iot-contracts`, retaining explicit verification of unresolved sensor/model facts. |
| `.agents/skills/nextjs-frontend/SKILL.md` | Next.js frontend implementation | Not imported in this baseline; add a specialized frontend skill when used outside this project's own `.agents/skills`. |
| `.agents/skills/project-explainer/SKILL.md` | Project architecture and code explanation, with references | Not imported: project-specific and its references describe this host repository. |
| `.agents/skills/learning-oriented-explanation/SKILL.md` | Japanese post-implementation explanation | Not imported into this portable baseline; host project reporting preferences remain in host `AGENTS.md`. |
| `.agents/skills/testing-and-verification/SKILL.md` | Select and report appropriate verification | Its principle is reflected in `/test`; full project-specific command lists remain in host docs. |
| `docs/agent-coding/roles/` and `docs/agent-coding/skills/` | Human-maintained sources referenced by generated copies | Kept as project-specific source of truth; not rewritten. |

Global `~/.codex/config.toml` was inspected by key names only, with values redacted: it contains Codex app plugins and `computer-use` / `node_repl` MCP declarations, not OpenCode-compatible config. No global Codex custom-agent or standalone-skill source suitable for direct migration was identified in the inspected paths. Those MCPs were intentionally not imported: one is host-runtime-specific and the other permits code execution with environment configuration. Authentication values, local paths, and environment values were not copied or displayed.
