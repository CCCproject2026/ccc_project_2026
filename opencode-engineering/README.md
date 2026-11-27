# OpenCode Engineering Environment

Portable, project-local OpenCode setup with focused agents, six lazy-loaded skills, ten slash commands, conservative permissions, a disabled optional Context7 server, and local validators. No external code was copied and no plugin dependency is installed.

## Quick start

```sh
./scripts/setup.sh
opencode
```

Start from this directory so OpenCode discovers `opencode.json` and `.opencode/`. See [installation](docs/installation.md), [architecture](docs/architecture.md), [agents](docs/agents.md), [skills](docs/skills.md), [MCP](docs/mcp.md), [security](docs/security.md), [sources](docs/sources.md), and [Codex compatibility](docs/compatibility.md).

Use `/plan`, `/implement`, `/review`, `/debug`, `/research`, `/test`, `/security-review`, `/architecture`, `/document`, and `/refactor`.

`./scripts/doctor.sh` performs local validation and invokes OpenCode CLI diagnostics. Context7 is disabled. Configure a model/provider through OpenCode's normal setup. Review source/license and permissions before adding plugins or enabling MCPs.
