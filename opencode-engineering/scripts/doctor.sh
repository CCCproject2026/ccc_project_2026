#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
python3 "$ROOT/scripts/validate.py"
OPENCODE_BIN=${OPENCODE_BIN:-$(command -v opencode 2>/dev/null || true)}
if [ -z "$OPENCODE_BIN" ] && [ -x "$HOME/node_modules/.bin/opencode" ]; then
  OPENCODE_BIN="$HOME/node_modules/.bin/opencode"
fi
if [ -n "$OPENCODE_BIN" ]; then
  DIAG_DIR=$(mktemp -d "${TMPDIR:-/tmp}/opencode-doctor.XXXXXX")
  trap 'rm -rf "$DIAG_DIR"' EXIT HUP INT TERM
  (cd "$ROOT" && "$OPENCODE_BIN" debug config) >"$DIAG_DIR/config.json"
  (cd "$ROOT" && "$OPENCODE_BIN" debug skill) >"$DIAG_DIR/skills.json"
  for agent in architect planner build reviewer debugger python-iot-engineer security-engineer; do
    (cd "$ROOT" && "$OPENCODE_BIN" debug agent "$agent") >"$DIAG_DIR/agent-$agent.json"
  done
  (cd "$ROOT" && "$OPENCODE_BIN" mcp list) >"$DIAG_DIR/mcp.txt"
  python3 - "$DIAG_DIR" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
config = json.loads((p / "config.json").read_text())
expected_agents = {"architect", "planner", "build", "reviewer", "debugger", "python-iot-engineer", "security-engineer"}
expected_commands = {"research", "plan", "implement", "review", "debug", "test", "security-review", "architecture", "document", "refactor"}
missing_agents = expected_agents - set(config.get("agent", {}))
missing_commands = expected_commands - set(config.get("command", {}))
skills = json.loads((p / "skills.json").read_text())
skill_names = {item["name"] for item in skills if isinstance(item, dict) and "name" in item}
expected_skills = {"code-review", "system-design", "fastapi-development", "iot-contracts", "technical-research", "security-review"}
missing_skills = expected_skills - skill_names
if missing_agents or missing_commands or missing_skills:
    raise SystemExit(f"CLI discovery failed: agents={sorted(missing_agents)}, commands={sorted(missing_commands)}, skills={sorted(missing_skills)}")
print(f"PASS: CLI discovered {len(expected_agents)} agents, {len(expected_commands)} commands, {len(expected_skills)} skills")
PY
  cat "$DIAG_DIR/mcp.txt"
else
  echo "OpenCode CLI unavailable; CLI discovery checks skipped." >&2
fi
