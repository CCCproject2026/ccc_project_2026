# Docker maintenance (pinned versions)

This repo pins a small set of Docker-related versions for reproducible builds/runtime. Pinned values do **not** auto-update; update them intentionally ("bump pins") and verify after each change.

## Pinned locations

- `main/ai/Dockerfile`
  - `UV_IMAGE` (Astral `uv` binary image tag/digest)
  - `PYTHON_IMAGE` (Python base image tag/digest)
- `main/web/Dockerfile`
  - `NODE_IMAGE` (Node base image tag/digest)
- `docker-compose.yml`
  - `mqtt-broker` image (`eclipse-mosquitto` tag/digest)
  - `db` image (`postgres` tag/digest)

Related (already version-controlled/pinned by lockfiles):
- `main/ai/uv.lock`
- `main/web/pnpm-lock.yaml`

## Pin bump routine

1. **Choose the new version/digest**
   - For container images, inspect the target tag and pick the new digest/tag you want:
     - `docker buildx imagetools inspect <image>:<tag>`
   - For tools like `uv`, pick a specific release/version.
2. **Update the pin in the repo**
   - Edit the corresponding `ARG`/`image` value in the files listed above.
   - Keep a short comment with the resolved version/context when helpful (already used in Dockerfiles/Compose).
3. **Pull/rebuild with the new pin**
   - Infra images: `docker compose pull db mqtt-broker`
   - App images: `docker compose build ai-server web-app migrate prisma` (or the affected subset)
4. **Smoke test**
   - `docker compose up -d db mqtt-broker` (and dependent services as needed)
   - `docker compose ps` (check healthy/running)
   - Verify basics as relevant (e.g. `curl http://127.0.0.1:8000/health/live`, migrate/seed flows if affected)
5. **Commit the pin bump**
   - Keep bumps small and intentional so regressions are easy to trace.

## Notes

- Prefer scheduled/intentional bumps over floating tags for reproducibility, but remember pinned images/tools will not receive upstream fixes until bumped.
- If a bump breaks builds/runtime, revert the pin or adjust compatibility in the same change after identifying the cause.
