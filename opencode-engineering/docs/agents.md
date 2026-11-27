# Agents

| Agent | Mode | Scope | Tools / limits |
|---|---|---|---|
| build | primary | scoped implementation and coordination | permission-gated shell and edits |
| architect | subagent | architecture and design review | read-only; shell/network/edit disabled |
| planner | subagent | task decomposition and dependencies | read-only; shell/edit disabled; web research uses global approval prompts |
| reviewer | subagent | independent evidence-based diff review | edit disabled; only exact `git status --short --untracked-files=all`, `git diff --no-ext-diff --no-textconv`, and cached equivalent shell commands are allowed; all other shell is denied |
| debugger | subagent | root-cause investigation | edits disabled; report hypotheses as hypotheses |
| python-iot-engineer | subagent | Python/FastAPI/MQTT/device/ML contract work | normal permission gates; no contract guessing |
| security-engineer | subagent | security and privacy review | read-only; shell/network/edit disabled |

The primary agent owns user intent and final output. Subagents receive bounded work and return evidence. More narrow AWS, Terraform, RAG, database, frontend, and evaluation roles can be added when real workflows need them; generic role proliferation is avoided.
