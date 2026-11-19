#!/usr/bin/env python3
"""Validate local OpenCode assets without network access or side effects."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
try:
    config = json.loads((ROOT / "opencode.json").read_text())
except (OSError, json.JSONDecodeError) as exc:
    print(f"FAIL opencode.json: {exc}")
    sys.exit(1)

if config.get("$schema") != "https://opencode.ai/config.json":
    errors.append("opencode.json: missing OpenCode schema URL")
agent_files = list((ROOT / ".opencode/agents").rglob("*.md"))
skill_files = list((ROOT / ".opencode/skills").glob("*/SKILL.md"))
command_files = list((ROOT / ".opencode/commands").glob("*.md"))
agent_ids = {p.stem for p in agent_files}
if config.get("default_agent") not in agent_ids:
    errors.append("default_agent does not resolve to an agent file")
for path in agent_files + skill_files + command_files:
    body = path.read_text()
    if not body.startswith("---\n") or "\n---\n" not in body[4:]:
        errors.append(f"{path.relative_to(ROOT)}: missing YAML frontmatter")
        continue
    front = body[4:].split("\n---\n", 1)[0]
    if not re.search(r"(?m)^description:\s*\S", front):
        errors.append(f"{path.relative_to(ROOT)}: missing description")
    if path in skill_files:
        declared = re.search(r"(?m)^name:\s*([\w-]+)\s*$", front)
        if not declared or declared.group(1) != path.parent.name:
            errors.append(f"{path.relative_to(ROOT)}: skill name must match directory")
    if path in command_files:
        agent = re.search(r"(?m)^agent:\s*([\w-]+)\s*$", front)
        if agent and agent.group(1) not in agent_ids:
            errors.append(f"{path.relative_to(ROOT)}: unknown agent {agent.group(1)}")
if len({p.parent.name for p in skill_files}) != len(skill_files):
    errors.append("duplicate skill IDs detected")
servers = config.get("mcp", {})
if not isinstance(servers, dict):
    errors.append("mcp.servers must be an object")
else:
    for name, server in servers.items():
        if server.get("type") not in {"remote", "local"}:
            errors.append(f"mcp server {name}: type must be remote or local")
        if server.get("enabled", True):
            errors.append(f"mcp server {name}: must remain disabled until reviewed")
for ref in re.findall(r"`([^`]+)`", (ROOT / "AGENTS.md").read_text()):
    if ref.startswith(("docs/", "main/")):
        # Domain-specific examples may refer to host project files, which this portable package does not ship.
        continue
if config.get("plugins", []):
    errors.append("unreviewed plugins are configured")
plugin_dir = ROOT / ".opencode/plugins"
if plugin_dir.exists() and any(plugin_dir.iterdir()):
    errors.append("plugin directory contains unreviewed code")
for doc in (ROOT / "docs").rglob("*.md"):
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", doc.read_text()):
        target = target.split("#", 1)[0]
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        if not (doc.parent / target).exists():
            errors.append(f"{doc.relative_to(ROOT)}: missing local link target {target}")
print(f"Found {len(agent_files)} agents, {len(skill_files)} skills, {len(command_files)} commands, {len(servers)} MCP server entries")
if errors:
    print("FAIL\n" + "\n".join(f"- {item}" for item in errors))
    sys.exit(1)
print("PASS: JSON, frontmatter, agent references, MCP safety, and plugin configuration")
