# 10 — Open Decisions

Things I decided for you, so the build could start. Each names the default I coded, the reasoning, and what changes if you disagree. Items 1 and 2 should be settled before Phase 4.

---

## 1. Can અગ્રેસર cancel a sabha? — **BLOCKING**

**Coded default:** no. Only `nirikshak` and `super_admin`.

**Why:** your answer named only Nirikshak. I did not widen it on my own guess.

**Why it may be wrong:** in most BAPS structures અગ્રેસર sits at or above નિરીક્ષક. If so, an Agresar who cannot cancel a sabha while a Nirikshak can will feel backwards on day one, and someone will start sharing the Nirikshak login, which destroys the audit trail.

**To change:** one line in `can_cancel_session()`, add `'agresar'` to the role list. Plus one row in the RBAC matrix.

---

## 2. Does the pre-sabha follow-up run per sabha or per balak? — **BLOCKING**

**Coded default:** per sabha session. A balak enrolled in two sabhas gets contacted twice in a week, once before each.

**Why:** the question being asked is "are you coming to *this* sabha on *this* day." That is genuinely a different question for a Wednesday sabha and a Saturday sabha.

**Why it may be wrong:** if in practice a karyakar makes one call and asks about both sabhas, the app is manufacturing a second task that nobody performs, which will show as a permanently red row and will teach karyakars that red rows are meaningless. That is the worst outcome in an accountability system.

**To change:** add a `presabha_shared_with_session` reference so recording an outcome on one session offers to copy it to the other session in the same week. Roughly half a day of work in WO-16, much more after.

**How to decide:** ask a karyakar who currently handles a multi-sabha balak what they actually do on the phone.

---

## 3. Should attendance be markable before the sabha ends?

**Coded default:** yes, no time lock. The `mark_attendance` task opens at session end, but the sheet is editable at any time.

**Why:** karyakars mark attendance as balako arrive, not after. A lock would break the real workflow.

**Trade-off:** someone could mark everyone present the day before. The audit log catches it, and nothing else will.

---

## 4. Photo grace period behaviour

**Coded default:** 10 days, then an amber flag on the profile and a count on the vistar dashboard. Registration is never blocked.

**Why:** a karyakar registering a new balak at 9:30 pm with a queue behind them does not have a photo. Blocking means they register nobody, and you lose the record entirely.

**Alternative:** block after 10 days from editing anything else on that profile until a photo is added. More forceful, more annoying. Your call. The setting is `photo_grace_days` in `app_settings`.

---

## 5. Ahnik week boundary

**Coded default:** ISO week, Monday to Sunday, Asia/Kolkata.

**Why:** unambiguous, and both your pakki sabhas fall on Wednesday, comfortably mid-week, so there is no edge case where a Wednesday sabha could be logged into two different weeks.

**Watch:** if you ever move a pakki sabha to Sunday or Monday, revisit this. A Sunday sabha sits on a week boundary and the dedup logic will surprise you.

---

## 6. What closes the `presabha_followup` task

**Coded default:** every active enrolled balak has a status other than `pending`. `જવાબ નથી મળ્યો` counts as done.

**Why:** the karyakar performed the task. Whether the parent picked up is not within their control, and penalising them for it makes the accountability number measure the wrong thing.

---

## 7. Who is `completed_by` on a task closed by the last of several karyakars

**Coded default:** whoever performed the action that satisfied the final condition.

**Why it is imperfect:** if three karyakars each contact eight balako, only the one who happened to finish last gets credit. Their accountability percentage will look better than the others'.

**Better, deferred:** score `presabha_followup` by counting `presabha_by` stamps per karyakar rather than by who closed the task. Worth doing once you have three months of real data and can see whether the distortion matters.

---

## 8. Balak enrollment in a second sabha

**Coded default:** any karyakar with access to a sabha can enroll an existing balak into it.

**Risk:** a sabha-scope karyakar enrolls a balak they can already see into their own sabha, which is fine, but they cannot enroll a balak they cannot see, which is also fine. No leak. But two sabhas can quietly claim the same balak without either knowing.

**Mitigation coded:** the balak profile lists all sabhas they attend, and the profile is visible to any karyakar of any of those sabhas.

---

## 9. Backups

**Not coded. You must do this manually.**

Supabase free tier gives you no automated backups. Losing the database means losing every attendance and ahnik record.

**Minimum viable:** a monthly manual `pg_dump` to a file you keep somewhere other than Supabase.

```bash
pg_dump "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres" \
  --no-owner --no-acl -Fc -f balsabha-$(date +%F).dump
```

**Better, still free:** a GitHub Action on a monthly schedule that runs the dump and commits it to a **private** repo. Set it up in Phase 8 and put a calendar reminder on it. This is the single highest-value hour of work in the whole project and it is the one most likely to be skipped.

---

## 10. Succession

You said you would hand this to someone capable and trustable if you stop. That is a plan for the app, not for the accounts.

Write down, on paper, in the mandal file: the Supabase project URL and login, the Vercel login, the GitHub repo, the cron job login, the VAPID private key, and the super admin credentials. An app nobody can log into as admin is worse than a Google Sheet, because the Sheet can at least be shared.

---

# Deferred to Phase 2

Recorded here so they are not re-litigated during the build.

| Feature | Why deferred |
|---|---|
| Points, streaks, badges on ahnik | Your explicit decision. Also worth thinking about carefully: gamifying a spiritual practice changes what the practice is for. |
| Parent or balak accounts | Would require verifiable parental consent under the DPDP Act. Large scope increase, no current need. |
| WhatsApp or SMS | Costs money. Karyakars already use parent groups for broadcast; this app handles personal follow-up. |
| Offline-first sync | Venues have internet. Roughly doubles build complexity. |
| File attachments on sessions | No stated need, and storage is your tightest free-tier limit. |
| Annual syllabus planning | Karyakram is logged after the fact today. |
| Sibling linking | No stated need. `address_gu` already lets you spot families. |
| Multi-vistar UI | Schema is ready. Build it when a second vistar actually asks. |
| Per-balak follow-up assignment | Your model is a shared list with attribution at the footer. Revisit if diffusion of responsibility shows up in the accountability numbers. |
