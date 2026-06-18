# Web App — Developer README

This document describes the `web` workspace (Next.js App Router) and the staff administration feature you asked for. It's a concise reference for frontend and server-side developers working in `main/web`.

## Quick start

Prerequisites:
- Node.js (18+ recommended)
- pnpm
- PostgreSQL (if you enable Prisma persistence)

Install and run in development:

```bash
cd main/web
pnpm install
pnpm dev
```

Prisma (optional, for DB persistence):

```bash
pnpm prisma:generate
pnpm prisma:push
pnpm prisma:seed
```

## Environment

Copy `.env.example` to `.env` and set keys:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (frontend)
- `CLERK_SECRET_KEY` (server)
- `CLERK_WEBHOOK_SECRET` (webhook verification)
- `API_BASE_URL` (optional override)

## High-level folder map

- `app/` — Next.js App Router routes and pages. Key entries:
  - [app/page.tsx](src/app/page.tsx#L1) — landing page
  - [app/dashboard/page.tsx](src/app/dashboard/page.tsx#L1) — dashboard entry
  - [app/staff/page.tsx](src/app/staff/page.tsx#L1) — staff admin page

- `components/` — Reusable UI components.
  - `components/staff/` — staff management UI: `AddStaffModal.tsx`, `StaffTable.tsx`, `PendingInviteRow.tsx`.

- `hooks/` — client hooks:
  - `useAuth.ts` — Clerk-auth/session extraction (currently placeholder)
  - `useStaff.ts` — list/invite/revoke/update wrappers used by UI

- `api/` — client-side API wrappers calling Next.js server routes:
  - `api/client.ts` — `apiClient()` helper
  - `api/staff.ts`, `api/clerk.ts` — frontend clients

- `lib/` — server helpers (Next.js route code imports these):
  - `lib/clerk.ts` — server-side Clerk integration stubs (invite/update/revoke)
  - `lib/staff-db.ts` — in-memory staff + invitations store (development mode)

- `app/api/` — Next.js server routes (App Router API endpoints):
  - `app/api/webhooks/clerk/route.ts` — Clerk webhook webhook receiver
  - `app/api/staff/route.ts` — GET staff list
  - `app/api/staff/[id]/role/route.ts` — PATCH role
  - `app/api/staff/invitations/route.ts` — GET/POST invitations
  - `app/api/staff/invitations/[id]/route.ts` — DELETE revoke invitation

- `prisma/` — Prisma schema and seed scripts for DB-backed persistence.

- `types/` — TypeScript shared types (`staff`, `clerk`, `auth`, etc.).

- `store/`, `utils/` — small client-side stores and utility helpers.

## Component design (concise)

- AddStaffModal
  - Purpose: Admin invites staff by email.
  - Behavior: validate email, call `inviteStaff(email)` via `useStaff`, show loading and success state.

- StaffTable
  - Purpose: Display staff members and allow role changes.
  - Behavior: fetches via `useStaff`, change role triggers `updateStaffRole(clerkId, role)` and refresh.

- PendingInviteRow
  - Purpose: Show pending invitations; allow revoke.
  - Behavior: calls `revokeInvitation(inviteId)` and removes row on success.

- Hooks
  - `useAuth` should expose `isAuthenticated` and `role` (from Clerk `public_metadata`).
  - `useStaff` exposes `refreshStaff`, `inviteStaff`, `updateRole`, `listInvitations`, `revokeInvitation`.

## Server-side flow and API contract

- Web UI calls client wrappers in `src/api/*` which call Next.js server routes under `src/app/api`.
- `src/lib/clerk.ts` currently stubs Clerk interactions; replace with real Clerk REST or SDK calls in production.
- Webhook handler at `/api/webhooks/clerk` expects Clerk event types like `user.created`, `user.updated`, `invitation.accepted`. Implement Svix/Clerk signature verification using `CLERK_WEBHOOK_SECRET` before processing events.

## Persistence roadmap

Current state: in-memory store (`lib/staff-db.ts`) used for development and demo.
Next steps to persist:
1. Add `Staff` and `Invitation` models to `prisma/schema.prisma`.
2. Implement `lib/staff-db` -> `lib/staff-repo.ts` using Prisma client.
3. Migrate the webhook handler and API route handlers to use the Prisma-backed repo.

## Security & middleware

- Protect server endpoints (role checks) using `src/middleware.ts` or within each route; verify clerk session and role before allowing invites or role changes.
- Verify webhook signatures before accepting events from Clerk.

## Testing & QA

- Unit tests for `useStaff` and components (mock `api` layer).
- Integration test: POST a webhook payload to `/api/webhooks/clerk` and assert staff record created/updated.

## Next recommended tasks

- Enable Prisma persistence and migrate `staff` models.
- Implement Clerk server integration (`lib/clerk.ts`) with proper error handling and retries.
- Add UI to manage role assignment with confirmation dialog and audit log.
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
## User journey maps

### Nurse (Primary user)

- Entry: Nurse signs in via Clerk and lands on the `Dashboard` ([src/app/dashboard/page.tsx](src/app/dashboard/page.tsx#L1)).
- Monitor: Nurse sees live resident list, active alarms, and device statuses on the dashboard.
- Alert flow:
  - An alert arrives (WebSocket) and is displayed prominently on the dashboard.
  - Nurse clicks the alert to open the incident details (resident, timestamp, sensor data).
  - Nurse acknowledges the alert — UI marks acknowledged and sends acknowledgement to server.
  - If required, nurse triggers a `Response` action to notify other staff (via in-app notification or external SMS/call integration).
- Post-incident:
  - Nurse records notes and confirms incident resolution; the incident appears in history.
  - Optionally escalate to admin if device or access issues are found.

Key UI components used: `DashboardPage`, `ResponsePage`, `StaffTable` (to tag responders), `Devices` (for device health).

### Admin (Staff management & configuration)

- Entry: Admin signs in via Clerk and navigates to `Staff` ([src/app/staff/page.tsx](src/app/staff/page.tsx#L1)).
- Staff management:
  - Admin opens `AddStaffModal` to invite a new staff member by email.
  - System calls `/api/staff/invitations` to create the invite; invitation appears in `Pending Invitations`.
  - Admin can revoke an invitation using `PendingInviteRow` (DELETE `/api/staff/invitations/:id`).
  - When the invited user accepts, Clerk sends a webhook (`invitation.accepted`) to `/api/webhooks/clerk`; server updates staff list.
- Role management:
  - Admin updates a staff member's role in `StaffTable`; UI calls PATCH `/api/staff/:id/role`.
  - Changes take effect immediately for role-based guards and are recorded in audit logs (future work).
- System maintenance:
  - Admin monitors devices via `Devices` page and can trigger device reprovisioning or view device logs.
  - Admin configures global settings (future): alert thresholds, notification channels, and Clerk integration settings.

Key UI components used: `AddStaffModal`, `StaffTable`, `PendingInviteRow`, `Devices`.

### Notes on UX edge cases

- Invitation race: invited user accepts before admin sees the pending list — webhook handler must deduplicate and upsert staff records.
- Role downgrade/demotion: require confirmation dialog and optionally record reason for audit.
- Offline handling: queue acknowledge/response actions when the app is offline and sync on reconnect.
