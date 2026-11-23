---
name: code-review
description: Use when reviewing a concrete diff for bugs, security issues, compatibility problems, or missing failure handling.
---
# Code review
1. Establish scope from the diff and repository instructions; inspect surrounding call sites and contracts.
2. Trace input, state changes, authorization, concurrency, errors, and externally visible behavior.
3. Check relevant verification evidence; do not claim unrun checks.
4. Report actionable findings first with severity, file and line, trigger, impact, and fix. Separate findings from questions and coverage gaps.
5. If there are no findings, say so and list material limits.
Input: a diff or named change. Output: severity-ordered evidence-backed findings. State what incomplete context prevents you from establishing.
