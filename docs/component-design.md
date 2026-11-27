転倒予防支援システム
Component Design Documentation
Fall Prevention Support System
v1.1  ·  June 2026  ·  Clerk Auth Integration

1. Introduction
This document defines the visual and behavioral design system for the 転倒予防支援システム (Fall Prevention Support System) — an IoT-connected monitoring platform for care facilities that detects resident falls and posture anomalies using ESP32 sensor devices.

The system serves two user roles:
•	看護師（管理者） — Nurse / Admin: full access to all pages, alarms, and staff management
•	介護士 — Care Worker: dashboard and alarm response only

2. Design Tokens
2.1 Color Palette
All colors derive from two base ramps — purple (brand) and semantic status colors. Never use off-palette hex values in components.

	Token	Hex	Usage
	primary	#7F77DD	Buttons, active nav, primary actions
	primary-dark	#3C3489	Sidebar brand, heading text, focus rings
	primary-bg	#EEEDFE	Card highlights, badge backgrounds, hover fills
	sidebar-bg	#1A1040	Navigation sidebar background
	alarm	#E24B4A	Active alarm state, danger buttons, error text
	alarm-bg	#FCEBEB	Alarm card fill, alert banner background
	online	#639922	Online status dot, healthy battery bar
	online-bg	#EAF3DE	Online badge fill
	warning	#EF9F27	Mid-range battery, weekly fall count
	warning-bg	#FAEEDA	Warning badge fill
	border-alarm	#F09595	Alarm card border color
	surface	#F1EFE8	Page background, secondary surfaces
	border	#DEDDE8	Default card and table borders

2.2 Typography

Role	Size	Weight	Usage
Page title (H1)	24px / 32pt	700	Main page headings
Section heading (H2)	20px / 26pt	600	Card titles, table section headers
Component label (H3)	16px / 22pt	600	Card sub-sections
Body text	14px / 18pt	400	Descriptions, memo text, table rows
Caption / badge	12px / 16pt	500	Badges, meta labels, timestamps
Data code	13px / 18pt	400	Device IDs, MAC addresses, staff IDs

2.3 Spacing & Radius

Token	Value	Usage
--radius-sm	6px	Badges, pills, small inline elements
--radius-md	8px	Buttons, inputs, table cells
--radius-lg	12px	Cards, modals, panels
--radius-xl	16px	Full-page overlays
--space-xs	4px	Icon-to-text gap
--space-sm	8px	Badge padding, between stats
--space-md	12–16px	Card internal padding
--space-lg	24px	Between sections within a page

3. Components
3.1 Badge
Badges communicate status at a glance. Always pair a color fill with appropriately dark text from the same palette ramp. Never use black text on colored fills.

● オンライン
	● アラーム発生中
	⊘ 誤検知
	● オフライン

看護師（管理者）
	介護士
	2件

Props
Prop	Type	Default	Description
variant	'online'|'alarm'|'misdetect'|'offline'|'admin'|'care'	—	Controls color scheme and icon
dot	boolean	true	Show colored dot prefix
children	ReactNode	—	Badge label text

3.2 Avatar
Circular initials badge for residents and staff. Background color is deterministically assigned from name, ensuring the same person always gets the same color.

Color mapping (by first character):

山	山・田・た → Purple
中	中・渡・わ → Coral
伊	伊・小・お → Teal
加	加・か → Amber


3.3 Button
Three variants cover all use cases. Match variant severity to the action — use danger only for destructive or emergency actions.

Variant	Background	Text color	When to use
primary	#7F77DD	#FFFFFF	Positive actions: register, add, save
danger	#E24B4A	#FFFFFF	Emergency response, irreversible actions
ghost	transparent	inherit	Secondary: cancel, unassign, back

<Button variant="primary" icon={<IconPlus/>}>デバイス登録</Button>
<Button variant="danger" icon={<IconAlertTriangle/>}>対応する →</Button>
<Button variant="ghost" size="sm">キャンセル</Button>

3.4 BatteryIndicator
Visual representation of IoT device charge level. Three threshold states determine color and optional warning label.

Level	Range	Color	Label
Healthy	≥ 30%	#639922	None
Low	15–29%	#EF9F27	None
Critical	< 15%	#E24B4A	要充電 (badge)

3.5 AlertBanner
Full-width strip displayed at the top of the dashboard when unresolved alarms are active. Never dismissed automatically — staff must take action.

⚠ 未対応のアラームがあります（1件）
渡辺 富士子（205号室）— 検知時刻: 09:15

1台のデバイスのバッテリーが低下しています。早急に充電してください。

3.6 MetricCard
Summary statistics displayed in a 4-up grid on the dashboard. Each card has an icon, large number, description, and a colored link label.

6
名が監視対象
入所者数	1
件の未対応アラーム
アクティブアラーム	5
/ 6台が割当済み
オンラインデバイス	3
件（誤検知除く）
今週の転倒件数

3.7 ResidentCard
Clickable card representing a single resident. Has three states: normal, alarm-active, and device-unassigned.

Normal
山田 太郎
91歳・101号室
ESP32-101 87%
転倒: 0  誤検知: 2  計: 2	Alarm active
渡辺 富士子
86歳・205号室
● アラーム発生中 — 09:15
ESP32-205 92%	No device
小林 正雄
96歳・301号室
デバイス未割当
転倒: 0  誤検知: 0  計: 0

3.8 AlarmModal
Full-screen overlay triggered by a fall detection event from an ESP32 device. Blocks interaction until staff takes action. Cannot be dismissed by clicking outside.

Element	Value	Notes
Title	転倒・姿勢崩れを検知	Red, centered, 18px bold
Subtitle	AIモデルが異常な体勢変化を検知しました	Muted, 13px
Resident info	Name, room, detection time	Pink-tinted card inside modal
Elapsed timer	mm:ss counting up	Large red, prominent urgency signal
Primary CTA	現場確認・対応する	Full-width danger button
Secondary CTA	後で	Ghost button, small
Footer note	緊急時は直ちに担当医師へ連絡してください	12px, muted, with phone icon

3.9 Response Form (ResponseInputPage)
Staff fills this form after physically checking on the resident. The outcome verdict drives the system's false-detection accuracy metrics.

Form fields

入所者 (read-only)  Resident name + room, pre-filled from alarm context
検知日時 (read-only)  Detection timestamp + elapsed time in red
対応スタッフ (read-only)  Auto-filled with current logged-in user
実際に転倒していましたか？ *  Required toggle: 'はい、転倒していた' or 'いいえ（誤検知）'
状況・処置メモ (textarea)  Optional notes: condition found, treatment given, doctor notified

3.10 Sidebar
Dark navy navigation panel. Always visible on authenticated pages. The emergency alarm badge shows unresolved alarm count and persists until all alarms are resolved.

Section	Contents
Brand header	Purple icon + '転倒予防' + '支援システム'
Alarm strip	Red-tinted row with bell icon and count badge — only shown when alarms > 0
Nav items	ダッシュボード · デバイス管理 · スタッフ管理 (admin only)
Active state	Semi-transparent purple fill, lighter text
User footer	Avatar circle + name + role tag + logout link

3.11 DeviceTable
Tabular list of all registered ESP32 devices with real-time battery level, online status, and resident assignment.

Device	Battery	Status	Assigned to	Last seen	Actions
ESP32-101	87%	オンライン	山田 太郎 / 101号室	06/10 09:10	割当解除
ESP32-102	18%	オンライン	中村 きみ / 102号室	06/10 09:14	割当解除
ESP32-401	72%	未割当	—	06/10 08:55	割当する

3.12 RegisterDeviceModal
Appears when the admin clicks '+ デバイス登録'. Device name is pre-filled with the next sequential ID. MAC address is auto-generated and can be regenerated or overridden.

Fields:
  デバイス名 *     — e.g. ESP32-007 (auto-incremented)
  MACアドレス *    — auto-generated, regenerate button ↺

Info box (read-only):
  登録後の初期設定: バッテリー 100%  ステータス: 未割当

Actions:
  登録する  (primary)   |   キャンセル  (ghost)

3.13 StaffTable + AddStaffModal
Lists all system users synced from Clerk. Admins can change any staff member's role or delete them (except themselves). Account creation now uses Clerk invitations — the add modal collects an email address and role, not a name.

スタッフ	スタッフID	権限ロール	ステータス	操作
田中 花子（自分）	staff-001	看護師（管理者）	Active	—
鈴木 一郎	staff-002	介護士	Active	削除
佐藤 美紀	staff-003	介護士	Active	削除
山本 健太	staff-004	介護士	Pending	招待取消

AddStaffModal — Clerk invitation flow (replaces direct account creation):

Fields:
  メールアドレス *   — email to send Clerk invitation to
  権限ロール *       — 介護士 (USER) | 看護師（管理者）(ADMIN)

On submit: POST /api/staff/invitations
  → Clerk /v1/invitations { emailAddress, publicMetadata: { role } }
  → Clerk sends invitation email with hosted signup link
  → Row appears in staff table as 'Pending' until accepted

Role selector — same toggle UI as before, now sets Clerk publicMetadata:

介護士
USER権限 / care_worker	看護師（管理者）
ADMIN権限 / nurse_admin

3.14 Clerk Auth Integration
Authentication and account lifecycle are fully delegated to Clerk. The app never handles passwords, tokens, or signup forms directly.

Concern	Implementation
Login UI	Clerk <SignIn /> hosted component replaces custom LoginPage form
Session	ClerkProvider owns session — authStore no longer holds tokens
Role check	user.publicMetadata.role from Clerk session claims ('nurse_admin' | 'care_worker')
Account creation	Clerk invitation email → hosted signup → user.created webhook
Role change	PATCH /api/staff/:id/role → Clerk updateUserMetadata → local DB sync
Revoke invite	DELETE /api/staff/invitations/:id → Clerk revokeInvitation
Webhook security	svix signature verified with CLERK_WEBHOOK_SECRET on every event
DB sync trigger	user.created event writes clerkId + email + role + auto-generated staffId to staff table

Required environment variables:

CLERK_SECRET_KEY                       # backend SDK auth
CLERK_WEBHOOK_SECRET                   # svix signature verification
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY      # frontend ClerkProvider
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login   # redirect target

New and modified files:

Status	File	Change
New	api/clerk.ts	Clerk Backend SDK wrapper — inviteUser(), updateUserRole(), revokeInvitation()
New	types/clerk.ts	ClerkPublicMetadata, InvitationStatus, ClerkWebhookEvent types
New	app/api/webhooks/clerk/route.ts	Webhook handler: user.created → DB sync; user.updated → role sync
New	app/api/staff/route.ts	GET staff list from DB; POST invite via Clerk
New	app/api/staff/[id]/role/route.ts	PATCH role — calls Clerk then updates local DB
New	app/api/staff/invitations/route.ts	GET pending invites; POST new invitation
New	app/api/staff/invitations/[id]/route.ts	DELETE — revoke pending invitation
New	components/staff/PendingInviteRow.tsx	Pending invitation row with Revoke button
Changed	pages/LoginPage.tsx	Replace custom form with Clerk <SignIn /> component
Changed	App.tsx	Wrap app in <ClerkProvider>; update auth guard
Changed	hooks/useAuth.ts	Read role from user.publicMetadata.role
Changed	hooks/useStaff.ts	Add inviteStaff(), updateRole(), listInvitations(); remove createStaff()
Changed	store/authStore.ts	Remove token/session state — Clerk owns it
Changed	types/staff.ts	Add clerkId, email; Role = 'nurse_admin' | 'care_worker'
Changed	components/staff/AddStaffModal.tsx	Name input → email input; calls inviteStaff()
Changed	components/staff/StaffTable.tsx	Add role-change dropdown + Pending status indicator


4. Interaction Patterns
4.1 Alarm Flow
The alarm lifecycle is the core UX of the system. Every step must be fast and unambiguous — a confused staff member in a real emergency is a product failure.

Step	Trigger	UI response
1	ESP32 sends posture anomaly event	AlarmModal opens, elapsed timer starts, alarm strip appears in sidebar
2	Staff clicks 現場確認・対応する	Modal closes, user navigated to ResponseInputPage
3	Staff selects verdict + enters memo	Form shows verdict toggle and optional notes textarea
4	Staff submits response record	Alarm resolved, dashboard alarm count decrements, log entry created

4.2 Permission Model
Route-level guard in AppLayout checks the current user role from Clerk session claims (user.publicMetadata.role) before rendering pages. Unauthenticated users are redirected to /login where Clerk's hosted SignIn component handles authentication.

Page / Action	看護師（admin）	介護士（user）	Unauthenticated
ダッシュボード	✓	✓	→ Login
入所者詳細	✓	✓	→ Login
対応記録入力	✓	✓	→ Login
デバイス管理	✓	✗	→ Login
スタッフ管理	✓	✗	→ Login
スタッフ削除	✓ (others only)	✗	—

4.3 Empty & Loading States

State	Behavior
No residents	Empty dashboard grid with 'まだ入所者が登録されていません' and an add CTA
Device unassigned	ResidentCard shows 'デバイス未割当' row instead of battery bar
Loading data	Skeleton shimmer over MetricCards and resident grid
No alarms	Alarm strip hidden entirely (not shown as 0)
Failed fetch	Inline error row with retry button — never a full-page error

4.4 Clerk Invitation Flow
Staff accounts are never created directly. Admins send a Clerk invitation, which triggers an email with a hosted signup link. The backend syncs the new user into the local DB via webhook when they complete signup.

Step	Actor	What happens
1	Admin (UI)	Fills email + role in AddStaffModal, clicks 招待する
2	useStaff.inviteStaff()	POST /api/staff/invitations with { email, role }
3	API route → api/clerk.ts	Calls Clerk /v1/invitations with publicMetadata: { role }
4	Clerk	Sends invitation email with hosted signup link to the nurse/care worker
5	Staff table (UI)	New row appears immediately with 'Pending' status indicator
6	Invitee	Clicks email link → Clerk hosted signup → sets their own password
7	Clerk webhook	Fires user.created event to POST /api/webhooks/clerk
8	Webhook handler	Verifies svix signature, writes staff row to DB (clerkId, email, role, auto-generated staffId)
9	Staff table (UI)	Pending row updates to 'Active' on next data refresh

Role change flow (in-app, no re-invitation needed):

Step	Actor	What happens
1	Admin (UI)	Selects new role from dropdown in StaffTable row
2	useStaff.updateRole()	PATCH /api/staff/:id/role with { role }
3	API route → api/clerk.ts	Calls Clerk updateUserMetadata({ publicMetadata: { role } })
4	Webhook (user.updated)	Syncs updated role back to local DB staff table
5	Session	Role change takes effect on the user's next page load (session refresh)

5. Accessibility
Care facility systems may be used under stress, in low-light conditions, or by staff with varying technical proficiency. These requirements are non-negotiable.

Requirement	Implementation
Color is not the only signal	Status always paired with text label (e.g. '● オンライン', not just a green dot)
Keyboard navigable	All interactive elements reachable via Tab; modals trap focus
AlarmModal ARIA	role='alertdialog', aria-modal='true', aria-labelledby pointing to title
Contrast ratios	All text-on-background pairs meet WCAG AA (4.5:1 minimum)
Reduced motion	Pulsing alarm indicators respect prefers-reduced-motion
Touch targets	Minimum 44×44px for all tap targets on mobile

転倒予防支援システム  ·  Component Design Documentation  ·  v1.1  ·  June 2026  ·  Clerk Auth Integration
