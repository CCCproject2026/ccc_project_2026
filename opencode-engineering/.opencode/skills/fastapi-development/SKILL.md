---
name: fastapi-development
description: Use when implementing or reviewing Python services, FastAPI endpoints, async work, or service error handling.
---
# FastAPI development
1. Read `pyproject.toml`, lockfile, app boundaries, and repository workflow before choosing patterns.
2. Keep domain logic independent of framework adapters; validate external input and separate authentication from authorization.
3. Define timeout, cancellation, retry/idempotency, and safe error/log behavior at I/O boundaries.
4. Preserve existing contracts and migrations; do not add dependencies unless required and explained.
5. Run repository-selected checks only when authorized or required; report exact scope and failures.
On uncertainty, identify the contract owner or mark the unresolved decision instead of guessing.

Input: a scoped service change or review target. Output: affected paths, contract and failure handling, implementation/check result, and remaining risks. If the contract or authorization boundary is unclear, stop at a proposal and name the missing evidence.
