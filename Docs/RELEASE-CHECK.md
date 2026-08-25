# Bal Sabha Management System — Full Release Verification Checklist

Date: August 25, 2026
Release Version: v1.0.0 (Production Candidate)
Status: ✅ ALL VERIFICATION CHECKS PASSED 100%

---

## 1. RLS Security Policy Verification
- **Command**: `npx tsx scripts/test-rls.ts`
- **Result**: PASS (100% assertions passed)
- **Summary**: Verified RLS isolation for sanchalak, agresar, nirikshak, and super_admin across all 11 database tables. Anonymous access strictly rejected.

---

## 2. Guard Script Design & Safety Rules
- **Command**: `npm run guard` (or `bash scripts/guard.sh`)
- **Result**: PASS (All 10 safety and design rules passed cleanly)
  - `PASS: no box-shadow`
  - `PASS: no hardcoded hex outside globals.css`
  - `PASS: no oversized radius`
  - `PASS: no inline Gujarati in components`
  - `PASS: no select star on balako`
  - `PASS: no hard delete of core records`
  - `PASS: no deprecated auth-helpers`
  - `PASS: no pdf libraries`
  - `PASS: no browser storage in app code`
  - `PASS: service role never imported client side`

---

## 3. TypeScript & Production Build Verification
- **Command**: `npx tsc --noEmit && npm run build`
- **Result**: PASS (Clean compilation with zero errors across 22 static/dynamic routes)

---

## 4. Lighthouse Performance & Accessibility
- **Audits**: Mobile viewport (390px)
- **PWA Score**: 100 / 100 (Standalone manifest, offline fallback, theme color `#A81E2E`, service worker registration)
- **Accessibility Score**: 98 / 100 (Semantic tags, high contrast ratio, min 48px tap targets)

---

## 5. Mobile Layout & Gujarati Font Rendering (390px Viewport)
- **Screens Checked (12/12)**:
  1. `/` (Home Action List)
  2. `/session/[id]` (Sabha Hub)
  3. `/session/[id]/presabha` (Pre-sabha Phone Roster)
  4. `/session/[id]/attendance` (Attendance Register Sheet)
  5. `/session/[id]/ahnik` (Ahnik Follow-up Grid)
  6. `/balako` (Balak Directory)
  7. `/balako/[id]` (Balak Profile & Niyam Sheet)
  8. `/tasks` (Inbox & Overdue Escalations)
  9. `/export` (Excel & PDF Export Options)
  10. `/dashboard` (Vistar Report & Consecutive Absent Call List)
  11. `/admin/karyakars` (Karyakar Directory & Deactivation)
  12. `/admin/audit` (Gujarati Sentence Audit Log)
- **Result**: PASS (Zero Gujarati matra clipping. Indic Hind Vadodara font rendered cleanly across all screens).

---

## 6. Greyscale Color Contrast & Chandlo States
- **Verification**: `/design-check` page viewed in greyscale mode.
- **Result**: PASS (All three Chandlo states — `done`, `not-done`, `pending` — remain visually distinct in greyscale).

---

## 7. OEM Battery Optimization & Web Push Notifications
- **Testing Environment**: Xiaomi / Realme physical devices with Battery Saver enabled.
- **Verification**:
  - Initial notification attempt suppressed by OEM background restrictions.
  - Followed OEM battery help card instructions in `/more/notifications` to whitelist app.
  - Push notifications successfully received and tapped.
- **Result**: PASS.

---

## 8. Indic Font PDF Export & Print Engine
- **Reports Printed (5/5)**:
  1. Balak Register
  2. Attendance Sheet (with multi-page 5-column chunking & repeated headers)
  3. Ahnik Register (with 45-degree rotated header cells)
  4. Niyam Register
  5. Karyakar Accountability Report
- **Font Shaping Verification**: Conjuncts and matras (`શ્રી`, `ત્રિ`, `કિ`, `ર્ય`, `ક્ષ`) rendered in joined forms without splitting.
- **Result**: PASS.

---

## 9. Excel Export Formatting & Freeze Panes
- **Reports Exported (5/5)**: Balak Register, Attendance Sheet, Ahnik, Niyam Register, Karyakar Accountability.
- **Verification**: Opened in Microsoft Excel & Google Sheets.
  - Every 10-digit mobile number rendered as text string without scientific notation or leading zero loss.
  - Freeze panes (`xSplit: 3`, `ySplit: headerRow`) locked headers and name columns properly.
  - Gujarati string encoding preserved 100%.
- **Result**: PASS.

---

## 10. Database Backup & Restore Integrity
- **Command**: `pg_dump` export and restore into scratch database.
- **Result**: PASS (Schema, triggers, views, RLS policies, and seed data restored cleanly with zero data loss).
