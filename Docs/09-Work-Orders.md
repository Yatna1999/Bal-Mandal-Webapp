# 09 — Work Orders for Antigravity

Feed these **one at a time, in order**. Do not batch. Each work order ends with acceptance criteria; do not move on until they pass.

**Standing context to paste at the top of every Antigravity session:**

```
Project: બાળ સભા સંચાલન પ્રણાલી, a Gujarati-language PWA for BAPS Bal
Sabha karyakars in Paldi, Ahmedabad.
Stack: Next.js 15 App Router, TypeScript strict, Tailwind, Supabase
(Postgres + Auth + Storage), deployed on Vercel free tier.
Users: karyakars only. No parent or child accounts.

Reference files in the repo root under /docs:
  01-Product-Spec.md, 02-Schema.sql, 03-RBAC-Matrix.md,
  04-Notification-Engine.md, 05-Gujarati-Copy-Deck.md,
  06-Screen-Specs.md, 07-Design-System-and-Stitch-Prompts.md,
  08-Export-Specs.md

NON-NEGOTIABLE RULES:
1. Every user-facing string comes from lib/i18n/gu.ts. No inline
   Gujarati in components, ever.
2. Every colour and radius comes from the CSS variables in
   07-Design-System. No hardcoded hex. No shadows. Radius max 6px.
3. Binary state is drawn as a <Chandlo> circle component. Never a
   checkbox, tick icon, or toggle switch.
4. Never `select *` on the balako table in shared components. Parent
   phone numbers must not reach a client that has no right to them.
5. Nothing is ever hard-deleted. Archive only.
6. Gujarati text needs line-height 1.6 minimum or matras clip.
7. All numbers rendered on screen pass through toGu(). Never apply
   toGu() to tel: hrefs, form values, or Excel cells.
```

---

# Phase 0 — Foundation

### WO-01 — Repo and shell
Scaffold Next.js 15 App Router, TypeScript strict, Tailwind, ESLint, Prettier. Install `@supabase/ssr`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `xlsx`, `date-fns`, `date-fns-tz`.

Set up `app/globals.css` with the full token block from `07`. Load Shrikhand, Hind Vadodara and IBM Plex Mono via `next/font/google`. Set `<html lang="gu">`. Set body `line-height: 1.6`.

Create `lib/i18n/gu.ts` with the complete structure from `05` and a `t()` helper with `{param}` interpolation and Gujarati fallback.

Create `lib/format.ts` with `toGu()`, `formatDateGu()`, `formatDateEn()`, `formatTimeRange()`, weekday and month arrays.

**Accept:** `npm run build` clean, `tsc --noEmit` clean. A test page renders `બાળ સભા` in Shrikhand and `૧૨૩૪૫` in Hind Vadodara with no clipped matras at 16px.

---

### WO-02 — Supabase project and schema
Create the Supabase project. Run `02-Schema.sql` top to bottom. Create the `balak-photos` storage bucket, private.

Generate types: `supabase gen types typescript --project-id <id> > lib/database.types.ts`.

Create `lib/supabase/{client,server,middleware}.ts` per the `@supabase/ssr` pattern.

**Accept:** all tables exist, all RLS enabled, the Paldi seed produced 1 city, 1 zone, 1 xetra, 1 vistar, 4 sabhas with correct types and weekdays. Anonymous `select * from balako` returns zero rows.

---

### WO-03 — RLS verification harness
A script `scripts/test-rls.ts` that creates one throwaway user per role, then asserts every row of the matrix in `03-RBAC-Matrix.md`.

Critical assertions:
- a `sanchalak` of Sabha A cannot read a balak enrolled only in Sabha B
- a `sanchalak` cannot set `status = 'archived'` on any balak
- a `sanchalak` cannot set a session to `cancelled`
- an `agresar` cannot change `sabha_type`
- a `nirikshak` **can** cancel a session
- no role can `delete from balako`
- `mother_mobile` of an out-of-scope balak is unreachable by any query shape

**Accept:** every assertion passes. This script runs in CI on every push. If it is skipped, a permissions bug ships silently.

---

# Phase 1 — Auth and accounts

### WO-04 — Auth flow
Email-password auth using `<username>@balsabha.local` as the synthetic email so karyakars only ever type a username. No OTP, no SMS, no cost.

`/login`, `/first-password` (forced when `must_change_password`), middleware that redirects unauthenticated users to `/login` and `must_change_password` users to `/first-password`.

Server helper `requireKaryakar()` returning the row, and `requireRole(...roles)` throwing a typed error that renders the Gujarati 403 page.

**Accept:** login works, a fresh account is forced through password change, an inactive account sees `accountInactive`, a sabha-scope user hitting `/dashboard` sees the Gujarati 403 not a redirect loop.

---

### WO-05 — Super admin: karyakar management
`/admin/karyakars`. List, create, edit, deactivate. Creating generates a temporary password shown once with a copy button and sets `must_change_password`.

Multi-select sabha assignment writing `karyakar_sabhas`.

**Accept:** create a `sanchalak` assigned to two sabhas, log in as them, confirm they see exactly those two sabhas and no others.

---

### WO-06 — Super admin: sabha management
`/admin/sabhas`. Edit name, weekday, times, venue, active flag. `sabha_type` toggle renders only for `super_admin` and shows a confirmation explaining that changing to કાચી stops future ahnik follow-up tasks.

**Accept:** an `agresar` sees the sabha edit form without the type toggle, and a direct API call to change type from that account is rejected by the trigger with the Gujarati message.

---

### WO-07 — App shell
Bottom tab bar with 5 items and a live badge on કામ. Header with the Shrikhand wordmark. Gujarati 403 and 404 pages. Toast system using copy-deck strings. `<Chandlo>` component with the three states and the 180ms fill animation, honouring `prefers-reduced-motion`.

**Accept:** navigation works, `<Chandlo state="done|not-done|pending" />` renders three visually distinct circles that remain distinguishable in greyscale.

---

# Phase 2 — બાળકો

### WO-08 — Balak list and search
`/balako` with debounced search against `search_blob`, sabha filter chips, incomplete-profile indicator, count line, both empty states.

**Accept:** typing `yash` finds યશ. Typing a mobile number finds the balak. A `sanchalak` never sees a balak outside their sabhas, including in the network payload.

---

### WO-09 — Photo pipeline
`lib/photo.ts`: read the file, draw to canvas at max 512x512 preserving aspect, export WebP at quality 0.8, upload to `balak-photos` at `{vistar_id}/{balak_id}.webp`, store the path.

Read side: signed URLs, 1 hour expiry, cached in React Query.

Fall back to JPEG quality 0.82 if the browser cannot encode WebP.

**Accept:** a 4 MB camera photo uploads at under 300 KB. 200 uploads stay under 60 MB total. Photos are not publicly readable via a guessed URL.

---

### WO-10 — Balak form
`/balako/new` and `/balako/[id]/edit`. Full field list and order from `06`. Zod validation with copy-deck messages. Duplicate guard with override. On save, write `balak_sabhas` and call `seedAttendanceRows` for upcoming sessions.

**Accept:** all validations fire in Gujarati. A duplicate is caught and links to the existing profile. A newly registered balak appears on tomorrow's already-generated attendance sheet.

---

### WO-11 — Balak profile and archive
`/balako/[id]` with three tabs. Archive behind the overflow menu, vistar scope only, mandatory Gujarati reason, confirmation naming that history is kept.

**Accept:** an archived balak disappears from active lists and from future attendance seeding, but their past attendance and ahnik rows still render on their profile and still appear in historical exports.

---

# Phase 3 — સભા and sessions

### WO-12 — Session generation
`lib/sessions.ts` with `generateSessions()`, idempotent, horizon from `app_settings`. Snapshot `sabha_type` at creation.

For now expose it at `/api/dev/generate` behind the cron secret so you can run it manually.

**Accept:** running twice creates no duplicates. Four sabhas over 14 days produce the right count on the right weekdays. Session `sabha_type` matches the sabha at generation time.

---

### WO-13 — Sabha and session screens
`/sabha` listing sabhas with next session and balak count. `/session/[id]` with the task checklist, કાર્યક્રમ and નોંધ text areas, and the date/time edit sheet.

**Accept:** editing one session's time does not change the sabha default or any other session.

---

### WO-14 — Cancellation
`આ અઠવાડિયે સભા નથી` visible only to `nirikshak` and `super_admin`. Requires a reason. Sets `status = 'cancelled'`, auto-closes all tasks. Cancelled sessions render a banner and disable every control.

**Accept:** a `sanchalak` cannot see or invoke it. After cancelling, no task for that session appears in any inbox and no notification fires. The session is excluded from attendance denominators.

---

# Phase 4 — The weekly cycle

### WO-15 — Attendance seeding
`seedAttendanceRows(sessionId)` inserting missing rows for every active enrolled balak. Idempotent. Called by the cron, by balak registration, and on attendance screen load.

**Accept:** a balak enrolled after session generation still appears on the sheet. An archived balak does not.

---

### WO-16 — Pre-sabha follow-up screen
`/session/[id]/presabha` per `06`. Call buttons writing `presabha_contacted` and `presabha_by` before opening `tel:`. Outcome chips. Progress bar. Footer multi-select writing `session_followup_karyakars`, pre-selected from `presabha_by` stamps.

**Accept:** tapping માતા opens the dialler with the correct number in Latin digits and does not set an outcome. Progress reaches 100% only when every row has a non-pending status.

---

### WO-17 — Attendance sheet
`/session/[id]/attendance`. Sticky header and first column. Read-only contact chandlo carried over. Mutually exclusive હાજર / ગેરહાજર. `બધાને હાજર કરો`. Debounced batch save. Live totals. Post-hoc editing with `છેલ્લે બદલનાર` line.

**Accept:** 25 rows scroll at 60fps on a mid-range Android. `બધાને હાજર કરો` marks only unmarked rows. Editing three days later works and writes an audit row.

---

# Phase 5 — આહ્નિક and નિયમ

### WO-18 — Ahnik weekly capture
`/session/[id]/ahnik`, pakki only. Photo strip navigation with recorded dots. Seven chandlo rows. ISO week key. Dedup with `alreadyRecorded` and pre-filled editable values. Save-and-next.

**Accept:** a balak in two pakki sabhas in the same week gets one `ahnik_weeks` row, and the second sabha shows the existing values with the capturing sabha named. A kachi session returns `notApplicable`.

---

### WO-19 — વિશેષ નિયમ
Add and edit on the balak profile. Title, start date, duration in months, computed end date, status. `expireNiyams()` in the dispatcher writing in-app notifications only, no push. `પૂરો કર્યો` and `અધૂરો રહ્યો` actions.

**Accept:** a niyam ending yesterday flips to `expired` on the next cron run and produces exactly one in-app notification per karyakar of the balak's primary sabha, and zero pushes.

---

# Phase 6 — Task engine and notifications

### WO-20 — Task engine
`lib/tasks.ts`: `createTasksForSession()`, `recomputeTask()`, `recomputeOpenTasks()`, `escalateOverdue()`. Timings exactly as tabled in `04`. `ahnik_followup` only for pakki.

Every mutating server action calls `recomputeTask()` for the affected session and type so the UI updates without waiting for the cron.

**Accept:** saving `karyakram_text` closes task 1 within the same request. Marking the last balak present closes `mark_attendance`. Cancelling a session `auto_closed`s all tasks. `completed_by` names the karyakar whose action satisfied the final condition.

---

### WO-21 — Cron dispatcher
`/api/cron/dispatch` with the 11 steps from `04`, secret verified with a constant-time compare, each step independently error-wrapped, returning a per-step status object.

Configure cron-job.org or GitHub Actions at `*/30 * * * *`.

**Accept:** two consecutive runs produce identical database state. A forced failure in step 7 does not prevent steps 8 to 10. The endpoint returns 401 without the secret.

---

### WO-22 — Web push
VAPID keys, `public/sw.js`, `/more/notifications` with the pre-permission explanation, subscribe flow, test-notification button, and the Android battery help card. iOS standalone detection with the Add to Home Screen walkthrough.

Quiet hours and reminder slots read from `app_settings`. Dead subscriptions pruned on 404 or 410.

**Accept:** a real push arrives on Android Chrome and deep-links to the right screen. No push is sent between 22:00 and 07:00 IST under any condition. iOS Safari not in standalone mode shows the walkthrough instead of a permission prompt.

---

# Phase 7 — Output

### WO-23 — Exports
`lib/export/` with one builder per report, shared by both formats. SheetJS client-side Excel. `/export/print/[type]` print route with the `@media print` CSS and `document.fonts.ready` gating. `/export` form with report picker, sabha, period and date-language toggle.

**Accept:** all five reports export in both formats. Gujarati conjuncts render correctly in PDF. Mobile numbers show 10 digits in Excel, not scientific notation. The header row repeats on page 2. A cancelled session appears in neither format.

---

### WO-24 — Dashboards
`/` for everyone, `/dashboard` for vistar scope. The three metrics, per-sabha bars, `સતત ગેરહાજર` with call buttons, overdue tasks, incomplete profiles. Period selector.

**Accept:** vistar total uses `COUNT(DISTINCT balak_id)` and a multi-sabha balak is counted once at vistar level and once in each sabha row. A `sanchalak` sees only their own sabhas' numbers.

---

### WO-25 — PWA
`manifest.json`, icons at 192, 512 and maskable 512, service worker caching the app shell only. Install prompt handling. Offline banner.

**Accept:** installable on Android Chrome with the correct Gujarati name and `#A81E2E` theme colour. API responses are not cached. Offline shows the banner, not a broken page.

---

# Phase 8 — Hardening

### WO-26 — Audit surfacing
`/admin/audit`, vistar scope only. Filter by table, actor and date. Each row reads `[કાર્યકરનું નામ] એ [રેકોર્ડ] માં [ફીલ્ડ] બદલ્યું • [તારીખ સમય]`.

**Accept:** every edit to a balak, session, attendance, ahnik or niyam appears. The actor name renders correctly even after that karyakar is deactivated.

---

### WO-27 — Hardening pass
- Re-run `scripts/test-rls.ts`, all green
- Grep for hardcoded Gujanguage strings outside `lib/i18n`, zero hits
- Grep for hex colours outside `globals.css`, zero hits
- Grep for `box-shadow`, zero hits
- Grep for `border-radius` above 6px outside the bottom-sheet class, zero hits
- Lighthouse PWA and Accessibility both above 90 on mobile
- Screenshot every screen at 390px and confirm no matra clipping
- Test on a real Xiaomi or Realme device with battery saver on, then follow the help-card path and confirm push starts arriving

**Accept:** all of the above.

---

## Two things to do before Phase 4

Answer items 1 and 2 in `10-Open-Decisions.md`. Both change code that Phase 4 depends on, and both are cheap now and expensive later.
