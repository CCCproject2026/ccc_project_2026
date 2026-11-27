# Installation and use

Requirements: OpenCode CLI and Python 3.10+ for the local validator.

1. Run `./scripts/setup.sh` to print the CLI version and validate local assets. It does not install packages or edit global config.
2. Start OpenCode from `opencode-engineering/` with `opencode`. The config and `.opencode/` assets are project-local.
3. Choose a provider/model through the normal OpenCode setup. No provider or model is hard-coded.
4. Use `/plan <task>`, `/implement <task>`, `/review`, `/debug <symptom>`, `/research <question>`, `/security-review <scope>`, `/architecture <topic>`, `/document <topic>`, `/refactor <scope>`, or `/test <change>`.
5. Optional Context7 can be enabled by editing `opencode.json` after reviewing its current terms/authentication and tools. Then use `opencode mcp list`; authentication may require `/mcps`.

This package currently sits inside a larger repository. OpenCode also discovers applicable ancestor instructions and shared skill directories (including this host repository's `.agents/skills`) and merges global user settings. Those are not copied into this package. To use an isolated asset set, run it from a standalone checkout/directory and inspect the resolved config with `opencode debug config` before acting.

Run `./scripts/doctor.sh` for `opencode debug config` and `opencode mcp list`. This can initiate connection discovery for configured enabled MCP services; the supplied Context7 entry is disabled. Do not enable external services without reviewing data flow and permissions.
