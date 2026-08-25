# બાળ સભા સંચાલન પ્રણાલી — Prompt Book

**Scope:** Paldi Vistar, Ahmedabad. 4 sabhas, roughly 80 to 100 balako, 8 to 12 karyakars.
**Users:** karyakars only. No parent login, no balak login.
**Budget:** zero, permanently.
**Build tool:** Antigravity for code, Stitch for screen design.
**Language:** Gujarati primary, English secondary.

---

## 1. What this system actually is

Strip away the vocabulary and this is an **accountability ledger with a weekly cycle**. Four things must happen around every sabha, in order:

| # | Task | Opens | Closes when |
|---|---|---|---|
| 1 | કાર્યક્રમ તૈયારી (prepare karyakram) | T-2 days, 09:00 | Karyakram text saved on the session |
| 2 | સભા પૂર્વે સંપર્ક (pre-sabha follow-up) | T-1 day, 09:00 | Every enrolled balak has a contact outcome recorded |
| 3 | હાજરી (attendance) | Session end time | Every enrolled balak marked હાજર or ગેરહાજર |
| 4 | આહ્નિક ફોલો-અપ (pakki sabha only) | Session end time | Every enrolled balak has an ahnik row for the current week |
| 5 | અહેવાલ (aheval checkbox) | Session end + 30 min | Checkbox ticked |

Everything else in the app exists to feed those five states or to read them back out.

**Design consequence:** the home screen is not a dashboard of charts. It is a list of open tasks with the nearest deadline at the top. The charts live on a separate screen for Nirikshak and Agresar.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind | Vercel free tier, PWA-capable, SSR for fast cold open |
| Hosting | Vercel Hobby | Free, no spin-down, global edge |
| DB + Auth + Storage | Supabase free | Permanent free Postgres, RLS, 1 GB storage, built-in auth |
| Push | Self-hosted Web Push (VAPID) via `web-push` in a Supabase Edge Function | No third party, no cost, no vendor lock |
| Scheduler | cron-job.org or GitHub Actions, every 30 minutes | Supabase free has no pg_cron on the free plan and pauses after 7 idle days. The ping solves both. |
| Excel export | SheetJS (`xlsx`), client side | Zero server compute |
| PDF export | HTML print view + browser print to PDF | See section 4. Non-negotiable. |
| State | TanStack Query + Zustand | Standard, small |
| Forms | react-hook-form + zod | Gujarati validation messages live in the copy deck |

**Do not use Render.** Free Render Postgres is deleted 30 days after creation with no backups, and free web services sleep after 15 minutes of inactivity. A weekly-use app would be cold every single time a karyakar opens it, with 25 balako waiting.

Verify Supabase and Vercel free tier limits before you architect around a number. They change.

## 3. The push notification reality you must design around

Two hard constraints:

**Android OEM battery killers.** MIUI, ColorOS, FunTouch and One UI aggressively terminate background service workers. Web push will silently stop reaching a share of your karyakars and you will get no delivery failure signal. Therefore **push is never the source of truth for accountability.** The source of truth is the `tasks` table, surfaced as an in-app inbox and as a red row on the Nirikshak and Agresar dashboard. Push is best-effort reinforcement on top of that.

**iOS.** Web push only fires if the karyakar has added the PWA to their home screen on iOS 16.4 or later. Most people never do. Ship a dedicated iOS onboarding screen that walks them through Add to Home Screen with screenshots, and accept that iOS karyakars are driven by the in-app badge.

**Cadence.** You asked for every 4 hours until done. That means a 2 AM ping, which gets notifications turned off at OS level, which kills the signal invisibly. Implemented instead:

- Quiet hours 22:00 to 07:00 IST. No push in that window, ever.
- Reminder slots 09:00, 13:00, 17:00, 21:00.
- **Escalate rather than repeat.** An overdue task appears as a red row on the Nirikshak and Agresar dashboard, which the responsible karyakar cannot mute. Supervisor visibility is a stronger accountability mechanism than a repeating buzz, because it cannot be silenced by the person avoiding the task.

Both the quiet-hours window and the reminder slots are rows in `app_settings`, so you can tune them without a deploy.

## 4. Gujarati PDF export: the trap

jsPDF, pdfmake and `@react-pdf/renderer` do not run an Indic shaping pass. Gujarati matras and conjuncts (કિ, ર્ય, ત્ર, શ્રી) come out broken or reordered even with a correct TTF embedded, because those libraries lay out glyphs left to right without reordering.

**Solution:** build a dedicated `/export/print/[type]` route that renders clean HTML with `@media print` CSS at A4, then call `window.print()`. The browser hands text to the OS shaping engine, which renders Gujarati correctly, and every phone and desktop has a Save as PDF option in the print dialog.

Excel is safe. XLSX is Unicode and Excel shapes Gujarati natively.

## 5. Build order

Do not build screens first. Build in this order or you will rework:

```
Phase 0   WO-01 .. WO-03    Repo, Supabase project, schema + RLS
Phase 1   WO-04 .. WO-07    Auth, karyakar management, org seed
Phase 2   WO-08 .. WO-11    Balak register, photo pipeline, archive
Phase 3   WO-12 .. WO-14    Session auto-generation, sabha editing, cancellation
Phase 4   WO-15 .. WO-17    Pre-sabha follow-up, attendance sheet, aheval
Phase 5   WO-18 .. WO-19    Ahnik weekly capture, special niyam
Phase 6   WO-20 .. WO-22    Task engine, cron dispatcher, web push
Phase 7   WO-23 .. WO-25    Exports, dashboards, PWA shell
Phase 8   WO-26 .. WO-27    Audit log surfacing, hardening
```

Phase 6 depends on Phases 3, 4 and 5 existing, because tasks are derived from session state.

## 6. Files in this prompt book

| File | Feed to |
|---|---|
| `01-Product-Spec.md` | Read first. Antigravity context. |
| `02-Schema.sql` | Run directly in Supabase SQL editor |
| `03-RBAC-Matrix.md` | Antigravity, when writing RLS and route guards |
| `04-Notification-Engine.md` | Antigravity, WO-20 to WO-22 |
| `05-Gujarati-Copy-Deck.md` | Both. Every string in the app is here. |
| `06-Screen-Specs.md` | Antigravity for logic, Stitch for layout |
| `07-Design-System-and-Stitch-Prompts.md` | Stitch, then Antigravity for tokens |
| `08-Export-Specs.md` | Antigravity, WO-23 |
| `09-Work-Orders.md` | Antigravity, one at a time, in order |
| `10-Open-Decisions.md` | You. Answer before Phase 4. |

## 7. Cost check

| Item | Cost |
|---|---|
| Vercel Hobby | ₹0 |
| Supabase free (500 MB DB, 1 GB storage) | ₹0 |
| cron-job.org | ₹0 |
| Web push VAPID | ₹0 |
| Google Fonts | ₹0 |
| Domain | ₹0 on `*.vercel.app` |
| **Total** | **₹0/month** |

Photo storage sanity check: compress client side to 512x512 WebP at quality 0.8 before upload. Each photo lands at 150 to 300 KB. 200 balako is roughly 50 MB, comfortably inside 1 GB. Do not upload 4 MB originals. The compression step is WO-09 and is mandatory.
