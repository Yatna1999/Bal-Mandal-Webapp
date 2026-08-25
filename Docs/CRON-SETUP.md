# Cron Job Setup Guide

This web application relies on an external cron service (such as [cron-job.org](https://cron-job.org)) to run periodic background dispatch tasks every 30 minutes.

---

## 1. Environment Variable Setup

Ensure `CRON_SECRET` is set in your deployment environment (e.g., Vercel / `.env.local`):

```bash
CRON_SECRET=your_secure_cron_secret_here
```

---

## 2. Setting Up cron-job.org

1. Register or log in to **[cron-job.org](https://cron-job.org)**.
2. Click **Create Cronjob**.
3. Fill in the job details:
   - **Title**: `Bal Mandal Webapp Cron Dispatcher`
   - **URL**: `https://<your-app-domain>.vercel.app/api/cron/dispatch`
   - **Request Method**: `POST`
   - **Schedule**: Every `30 minutes` (`*/30 * * * *`)
4. Add Headers:
   - **Header Name**: `x-cron-secret`
   - **Header Value**: `<your_CRON_SECRET>` (matches your `CRON_SECRET` environment variable)
5. Save the Cronjob.

---

## 3. Important Notes

> ⚠️ **DO NOT DISABLE THIS CRON JOB**  
> Step 10 of the cron dispatcher touches the Supabase `app_settings` table on every run (`last_cron_ping`). This ensures that your Supabase project remains active and is **never paused due to inactivity** during quiet weeks.

---

## 4. Dispatch Steps Overview

Each cron run executes 11 steps sequentially, logging duration in milliseconds and capturing individual step errors without aborting:

1. `generateSessions`: Generates scheduled sessions 14 days ahead.
2. `seedUpcomingAttendance`: Pre-creates attendance rows for enrolled children.
3. `createTasksForUpcoming`: Creates task checklists for scheduled sessions.
4. `recomputeOpenTasks`: Evaluates closing conditions for open tasks.
5. `markHeldSessions`: Flips past sessions to `held` status.
6. `expireNiyams`: Flips expired niyams to `expired` status and writes in-app notifications.
7. `escalateOverdue`: Sends overdue task escalation notifications to vistar leaders.
8. `sendReminders`: Sends push notification reminders for upcoming sessions (WO-31).
9. `pruneDeadSubs`: Cleans up expired push subscriptions (WO-31).
10. `touchSupabaseSettings`: Prevents Supabase project auto-pausing.
11. Returns JSON summary `{ ok, ranAt, totalDurationMs, steps }`.
