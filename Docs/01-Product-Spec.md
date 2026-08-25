# 01 — Product Specification

## 1. Organisation hierarchy

```
શહેર (City)        Ahmedabad
  └ ઝોન (Zone)     Zone-1
      └ ક્ષેત્ર (Xetra)   Xetra-14
          └ વિસ્તાર (Vistar)  પાલડી          ← this app is scoped here
              └ સભા (Sabha)  4 sabhas
```

The four levels above Vistar exist in the schema from day one so a second vistar can be added later without migration. **All queries in v1 are filtered to a single `vistar_id`.** Do not build cross-vistar UI. Do build cross-vistar-safe RLS.

## 2. The four sabhas (seed data)

| Sabha | વાર | સમય | પ્રકાર |
|---|---|---|---|
| પાલડી બાળ સભા | બુધવાર | ૯:૦૦ થી ૧૦:૩૦ રાત્રે | પાકી |
| પાલડી શિશુ સભા | બુધવાર | ૯:૦૦ થી ૧૦:૩૦ રાત્રે | પાકી |
| સ્વામિનારાયણ પાર્ક-૧ સભા | શનિવાર | ૭:૦૦ થી ૮:૦૦ સાંજે | કાચી |
| રિવર સાઇડ પાર્ક સભા | ગુરુવાર | ૭:૦૦ થી ૮:૦૦ સાંજે | કાચી |

## 3. પાકી સભા vs કાચી સભા

This flag is the single biggest behavioural switch in the app.

| | પાકી સભા | કાચી સભા |
|---|---|---|
| કાર્યક્રમ તૈયારી task | yes | yes |
| સભા પૂર્વે સંપર્ક task | yes | yes |
| હાજરી task | yes | yes |
| **આહ્નિક ફોલો-અપ task** | **yes** | **no** |
| અહેવાલ task | yes | yes |

Only Super Admin can change a sabha between પાકી and કાચી. Changing it does **not** retroactively create or delete ahnik tasks for past sessions. It affects sessions generated after the change.

## 4. Roles

Five roles, two scopes.

**Vistar scope** (sees all 4 sabhas, all parent phone numbers):
- `super_admin` — you. Creates accounts, sets sabha type, only role that can hard-delete anything.
- `agresar` (અગ્રેસર)
- `nirikshak` (નિરીક્ષક) — additionally the only non-admin role that can approve a cancelled sabha.

**Sabha scope** (sees only sabhas they are assigned to, only those balako, only those parent numbers):
- `sanchalak` (સંચાલક) — lead karyakar of a sabha
- `sah_sanchalak` (સહ સંચાલક)

A karyakar can be assigned to multiple sabhas through `karyakar_sabhas`. Their scope is the union.

Agresar and Nirikshak hold every operational power a sanchalak holds, applied across all four sabhas. They are not read-only.

Full matrix in `03-RBAC-Matrix.md`.

## 5. Balak

**Enrollment is many to many.** A balak can attend more than one sabha in the vistar. `balak_sabhas` carries the link, with one row flagged `is_primary`.

**Counting rule, and it matters for every statistic:**
- Vistar-level total balako: **DISTINCT balak_id**. A multi-sabha balak counts once.
- Per-sabha સંખ્યા: the balak counts in **each** sabha he is enrolled in.

Any query that sums per-sabha counts to get a vistar total is wrong. Write the vistar total as its own `COUNT(DISTINCT)` query.

**Ahnik is attached to the balak profile, not to a sabha.** One ahnik record per balak per week regardless of how many sabhas he attends.

**Standards:** નર્સરી, જુ.કે.જી, સી.કે.જી, ધોરણ ૧ through ધોરણ ૮. Nothing above ધોરણ ૮.

**Status:** `active`, `archived`, `transferred_kishore`. Archiving requires a reason (free text, Gujarati, mandatory) and preserves all history. Nothing is ever deleted.

**Photo:** mandatory, but not blocking at registration. A balak registered without a photo is saved with an `અધૂરી પ્રોફાઇલ` flag. If the photo is still missing 10 days after registration the flag turns red and the balak appears in an incomplete-profiles list on the Nirikshak and Agresar dashboard.

**Names stored in both scripts.** `full_name_gu` and `full_name_en`, both mandatory. Search runs across both, unaccented and case-insensitive, so a karyakar with no Gujarati keyboard can still find a balak by typing `yash`.

## 6. The two follow-ups. These are different things. Do not merge them.

### 6a. સભા પૂર્વે સંપર્ક (pre-sabha follow-up)

- **When:** T-1 day before the session
- **Who is contacted:** the parent, by phone
- **Question asked:** will the balak come to this sabha
- **Applies to:** every sabha, both પાકી and કાચી
- **Stored on:** the attendance row for that session
- **Outcomes:** `આવશે` / `નહીં આવે` / `જવાબ નથી મળ્યો`
- **Multi-sabha balak:** contacted once per sabha session. Two sabhas in one week means two contacts.

UI: a list of enrolled balako. Each row has two tap targets, `માતા` and `પિતા`, each a `tel:` link. Tapping either logs which number was used and opens the phone dialler. After the call the karyakar returns and taps the outcome.

### 6b. આહ્નિક ફોલો-અપ (ahnik follow-up)

- **When:** at the sabha, in person
- **Who is asked:** the balak directly, or the parent, karyakar's judgement
- **Applies to:** પાકી સભા only
- **Stored on:** the balak profile, keyed by ISO week
- **Frequency:** once per week per balak
- **Dedup:** unique on `(balak_id, week_start_date)`. If a balak's ahnik was already captured this week at another sabha, his row shows `આ અઠવાડિયે નોંધાયેલ` with a link, not a blank form.

## 7. આહ્નિક items

Seven fixed items, each a simple boolean. No counts, no durations, no scoring in v1.

| # | Gujarati | code |
|---|---|---|
| ૧ | પૂજા | `pooja` |
| ૨ | તિલક-ચાંદલો | `tilak_chandlo` |
| ૩ | માનસી પૂજા | `mansi` |
| ૪ | આરતી | `aarti` |
| ૫ | વચનામૃત / સ્વામીની વાતો વાંચન | `vachanamrut_swamini_vato` |
| ૬ | ઘરસભા | `gharsabha` |
| ૭ | રવિ સભા | `ravi_sabha` |

The list is identical for every age and every satsang status. `ghar_sabha` is a family activity but is recorded per balak.

Items live in an `ahnik_items` table with `sort_order` and `is_active` so the list can change later without a migration. Historical records keep the item they were recorded against.

**No points, no streaks, no badges.** Deferred to phase 2 by explicit decision.

## 8. વિશેષ નિયમ (special niyam)

Separate from ahnik. Optional. Entered manually by a karyakar.

- Free text title in Gujarati, for example `ટીવી નહીં જોવાનો નિયમ`
- Start date
- Duration in months (1, 2, 3, 6, 12, or custom)
- End date computed
- Status: `active` / `expired` / `completed` / `lapsed`

On the expiry date the nightly dispatcher flips `active` to `expired` and writes an **in-app notification only**. No push. The notification reads: `[નામ]નો નિયમ પૂરો થયો. નવો નિયમ લેવો છે?` The karyakar can then mark it `completed` or `lapsed`, and optionally add a new niyam.

Niyam is record-keeping. It never generates a blocking task.

## 9. Sabha sessions

Sessions are **generated automatically**, 14 days ahead, by the cron dispatcher, from each sabha's `default_weekday` and `default_start_time`.

- Any karyakar may edit a specific session's date and time. This edits the session, not the sabha default.
- Editing the sabha default is Vistar-scope only, and applies to future generated sessions.
- Cancelling a session (`no sabha this week`) requires **Nirikshak or Super Admin**. A cancelled session auto-closes all its tasks and sends no notifications.
- Attendance and ahnik for a cancelled session are not recorded and do not count against percentages.

## 10. Session record

Two free-text fields plus one checkbox, all on the session:

- `karyakram_text` — what happened, which karyakar did what, how long. Free text, Gujarati, multiline. This is what the T-2 task closes on.
- `notes_text` — general notes, guests, anything. Optional. Never blocks a task.
- `aheval_done` — a single checkbox meaning "the aheval has been submitted through the usual channel". Boolean. Records who ticked it and when.

No file attachments in v1.

## 11. Editing and audit

Every record is editable after the fact. There is no lock.

Audit model: **store the latest value only, plus who last changed it and when.** No previous-value history table.

Every mutating action writes one row to `audit_log`: table, record id, action, changed field names (not values), actor id, actor name snapshot, timestamp. Actor name is snapshotted so an audit line still reads correctly after a karyakar is deactivated.

`audit_log` is visible to Vistar-scope roles only.

## 12. Dashboard metrics

Three numbers. If a fourth is added it must produce an action, or it does not go on the screen.

1. **હાજરી ટકાવારી** — present / (present + absent) for the selected period and scope. Cancelled sessions excluded from the denominator.
2. **કાર્યકર જવાબદારી** — of tasks assigned to this karyakar in the period, what percent were closed before their deadline. This is the accountability number.
3. **સતત ગેરહાજર બાળકો** — balako absent 3 or more consecutive held sessions of a sabha they are enrolled in. This is the only number that produces a phone call, so it gets a tappable list, not just a count.

## 13. Explicitly out of scope for v1

Parent accounts. Balak accounts. SMS or WhatsApp API. Points, streaks, badges. File attachments on sessions. Annual syllabus planning. Sibling linking. Multi-vistar UI. Offline-first sync (venues have internet, confirmed).
