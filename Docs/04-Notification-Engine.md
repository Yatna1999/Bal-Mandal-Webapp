# 04 — Task and Notification Engine

## Design principle

**The `tasks` table is the source of truth. Push is best-effort reinforcement.**

Android OEM battery managers on Xiaomi, Realme, Oppo and Vivo terminate service workers without telling you. iOS delivers web push only after the user adds the PWA to their home screen. If accountability depends on a notification arriving, accountability will silently fail.

So every open task appears in three places, in descending order of reliability:

1. The in-app **કામ** (task inbox) with a badge count, visible the moment the app opens
2. A red row on the Nirikshak and Agresar dashboard once overdue, which the responsible karyakar cannot mute
3. A push notification, if it gets through

## Task lifecycle per session

For a session with date `D`, start `S`, end `E`, in Asia/Kolkata:

| task_type | opens_at | due_at | Assigned to | Closes when |
|---|---|---|---|---|
| `prepare_karyakram` | D-2 at 09:00 | D at S | all karyakars of the sabha | `karyakram_text` non-empty |
| `presabha_followup` | D-1 at 09:00 | D at S | all karyakars of the sabha | every active enrolled balak has `presabha_status <> 'pending'` |
| `mark_attendance` | D at E | D+1 at 12:00 | all karyakars of the sabha | every active enrolled balak has `attendance_status not null` |
| `ahnik_followup` **(pakki only)** | D at E | D+1 at 12:00 | all karyakars of the sabha | every active enrolled balak has an `ahnik_weeks` row for the ISO week containing D |
| `aheval` | D at E + 30 min | D+1 at 21:00 | all karyakars of the sabha | `aheval_done = true` |

A `kachi` session generates four tasks. A `pakki` session generates five.

Tasks are created by the dispatcher at generation time with `status = 'open'` but are hidden from the inbox until `opens_at`.

## Closing tasks

Tasks close **automatically** when their condition becomes true. There is no Mark Done button. The dispatcher re-evaluates every open task every 30 minutes, and the relevant server actions also call `recomputeTask(sessionId, taskType)` immediately after a mutation so the UI updates without waiting for the cron.

`completed_by` is set to the karyakar whose action satisfied the final condition. This is what feeds the accountability metric.

## Cancellation

When a session is cancelled, all its tasks flip to `auto_closed`, are removed from every inbox, and are excluded from accountability calculations. No notification of any kind fires for a cancelled session.

This is the mechanism you asked for: "if there is no sabha then admin will do something so follow-up notification is not go to karyakar."

## Reminder cadence

You asked for every 4 hours until done. Implemented as **slot-based with quiet hours and escalation**, not a rolling 4-hour timer.

```
Reminder slots:  09:00, 13:00, 17:00, 21:00 IST
Quiet hours:     22:00 to 07:00 IST, absolute, no exceptions
```

Both live in `app_settings` as JSON, editable by Super Admin without a deploy.

At each slot the dispatcher finds every task where `status = 'open'` and `opens_at <= now()` and pushes to every karyakar of that sabha who has a live push subscription.

**Escalation, not repetition.** A task past `due_at`:

- flips its dashboard row to the overdue treatment
- becomes visible on the Vistar dashboard under `બાકી કામ`
- writes one `inapp_notifications` row of kind `escalation` to every Nirikshak and Agresar
- stops increasing its push frequency

Rationale: a repeating buzz is dismissible by the one person who wants to dismiss it. A red row on a supervisor's screen is not. That is a stronger accountability mechanism, and it does not train karyakars to disable notifications at OS level, which would kill the channel permanently and invisibly.

## The dispatcher

One endpoint. One external cron. Every 30 minutes.

```
POST https://<app>.vercel.app/api/cron/dispatch
Header: x-cron-secret: <CRON_SECRET>
```

Set up on cron-job.org (free) or GitHub Actions (free, `schedule: cron: '*/30 * * * *'`). GitHub Actions is more reliable but can drift by several minutes under load, which is fine at 30-minute granularity.

The same ping keeps the Supabase project from auto-pausing after 7 idle days. Do not remove it during quiet weeks.

### Dispatcher steps, in order

```ts
// /api/cron/dispatch
1. verifySecret(req)                    // constant-time compare, 401 otherwise

2. generateSessions()
   // for each active sabha, ensure a scheduled session exists for every
   // occurrence of default_weekday within the next session_horizon_days (14).
   // snapshot sabha_type onto the session at creation.
   // idempotent via unique(sabha_id, session_date).

3. seedAttendanceRows()
   // for every scheduled session whose date is within 3 days,
   // insert missing attendance rows for every ACTIVE enrolled balak.
   // idempotent via unique(session_id, balak_id).
   // this also picks up balako enrolled after generation.

4. createTasks()
   // for each scheduled session, ensure its 4 or 5 task rows exist.
   // ahnik_followup only when session.sabha_type = 'pakki'.
   // idempotent via unique(session_id, task_type).

5. recomputeOpenTasks()
   // close any open task whose condition is now satisfied.

6. markHeldSessions()
   // scheduled sessions whose end_time has passed -> status 'held'.

7. expireNiyams()
   // niyams with end_date < today and status 'active' -> 'expired',
   // write ONE inapp_notification per niyam to the karyakars of the
   // balak's primary sabha. No push.

8. escalateOverdue()
   // open tasks past due_at without escalated_at -> write escalation
   // notifications to all nirikshak + agresar of the vistar, stamp escalated_at.

9. sendReminders()
   // only if now() falls inside a reminder slot window (+/- 15 min)
   //   AND outside quiet hours.
   // for each open task where opens_at <= now():
   //   for each karyakar of the sabha with a live subscription: push.
   //   dedupe: one push per karyakar per slot, merged if multiple tasks.

10. pruneDeadSubscriptions()
    // push_subscriptions with failure_count >= 5 -> delete.

11. return { ok: true, counts: {...} }   // log for debugging
```

Steps 2 through 10 must each be wrapped so a failure in one does not abort the rest. Return a per-step status object.

**Every step must be idempotent.** The cron will fire twice sometimes.

## Web push setup

Self-hosted, no third party, no cost.

```bash
npx web-push generate-vapid-keys
```

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=...
```

Subscription flow, in `/settings/notifications`:

1. Explain what notifications are for, in Gujarati, before asking. Never call `Notification.requestPermission()` on page load. A denied permission is close to permanent and cannot be re-prompted.
2. On tap, request permission, then `registration.pushManager.subscribe()`.
3. POST endpoint, p256dh, auth to the server. Upsert on `endpoint`.
4. Show a `પરીક્ષણ સૂચના મોકલો` button so the karyakar can confirm delivery themselves. This is how you detect OEM killing without server-side signal.

On send: a 404 or 410 from the push service means the subscription is dead. Delete it immediately. Any other error increments `failure_count`.

### Payload

```json
{
  "title": "કાર્યક્રમ તૈયાર કરવાનો બાકી છે",
  "body": "પાલડી બાળ સભા • બુધવાર, ૨૭ ઓગસ્ટ",
  "tag": "task-<task_id>",
  "url": "/sabha/<session_id>/karyakram",
  "badge": "/icons/badge-96.png",
  "icon": "/icons/icon-192.png"
}
```

`tag` collapses repeats of the same task so the tray does not stack four identical rows.

## Service worker

```js
// public/sw.js
self.addEventListener('push', e => {
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, icon: d.icon, badge: d.badge,
    data: { url: d.url }, renotify: false
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(list => {
      const open = list.find(c => 'focus' in c);
      if (open) { open.navigate(e.notification.data.url); return open.focus(); }
      return clients.openWindow(e.notification.data.url);
    }));
});
```

## iOS

Web push requires iOS 16.4+ **and** the PWA added to the home screen. Detect standalone mode:

```js
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;
```

If the user is on iOS Safari and not standalone, replace the notification settings screen with an illustrated Add to Home Screen walkthrough in Gujarati: Share button, `Add to Home Screen`, open from the icon. Then, and only then, offer the notification toggle.

For iOS karyakars who never do this, the in-app badge on the કામ tab is the whole mechanism. It has to be prominent.

## Android OEM warning screen

On first successful subscription, show a one-time card:

> સૂચનાઓ ચાલુ થઈ ગઈ છે.
> કેટલાક ફોનમાં બેટરી સેવિંગને કારણે સૂચનાઓ બંધ થઈ જાય છે. જો સૂચના ન આવે તો ફોનના Settings માં આ એપ માટે Battery ને `Unrestricted` કરો.

Link to a short help page listing the exact path for MIUI, ColorOS, FunTouch and One UI. This one screen will save you more delivered notifications than any server-side work.
