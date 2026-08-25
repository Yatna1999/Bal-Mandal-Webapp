# 06 — Screen Specs

Route map, data requirements and behaviour. Visual treatment is in `07`. Strings are in `05`.

## Route map

```
/login
/first-password                       forced when must_change_password
/                                     મુખ્ય (home)
/tasks                                કામ
/balako                               list + search
/balako/new
/balako/[id]                          profile, tabs: વિગત | હાજરી | આહ્નિક
/balako/[id]/edit
/balako/[id]/niyam/new
/sabha                                list of sabhas + upcoming sessions
/sabha/[sabhaId]
/session/[id]                         session detail + task checklist
/session/[id]/karyakram
/session/[id]/presabha                pre-sabha follow-up
/session/[id]/attendance              હાજરી પત્રક
/session/[id]/ahnik                   pakki only
/dashboard                            vistar scope only
/export
/export/print/[type]                  print-only HTML, no chrome
/more
/more/notifications
/more/language
/admin/karyakars                      super_admin only
/admin/sabhas                         super_admin only
/admin/audit                          vistar scope only
```

---

## / — મુખ્ય

**Query:** today's and tomorrow's sessions for `my_sabha_ids()`; open tasks with `opens_at <= now()`; three month-to-date stats scoped to the user.

**Behaviour**
- If the user is sabha-scope, stats cover their sabhas only. If vistar-scope, all four.
- Task rows sort by `due_at` ascending, overdue first.
- A task row deep-links straight to the screen that closes it, never to an intermediate page.
- If there are no sessions in the next 2 days and no open tasks, show the empty state, not a zeroed dashboard.

---

## /tasks — કામ

**Query:** all open tasks for `my_sabha_ids()` where `opens_at <= now()`.

**Grouping:** `મુદત વીતી ગઈ` / `આજે` / `આવતા દિવસોમાં`.

**Behaviour**
- No Mark Done control. Tasks close when their condition is met.
- Pull to refresh calls `recomputeOpenTasks()` for the user's sabhas.
- The tab badge count is this list's length. It must update optimistically after a mutation, not wait for the cron.

---

## /balako — બાળકો

**Query:** active balako visible to the user, with primary sabha name and photo path.

**Search:** debounce 250ms, match against `search_blob`, which holds Gujarati name, English name, English school and both mobile numbers, lowercased and unaccented. This is why English names are mandatory: a karyakar without a Gujarati keyboard types `yash` and still finds યશ.

**Filter chips:** બધા plus one chip per sabha the user can see.

**Incomplete profile:** any balak with `photo_path is null`. Past `photo_grace_days` (10) the label turns amber.

**Empty and no-results states** are different strings. See `05`.

---

## /balako/new — નવો બાળક

Single scrolling form, not a wizard. A wizard adds taps for no benefit at 14 fields.

**Field order** matches how a karyakar collects the information verbally:

```
1  ફોટો                    optional at save, flagged after
2  પૂરું નામ (ગુજરાતી)      required
3  પૂરું નામ (અંગ્રેજી)      required
4  જન્મ તારીખ              required, date picker, max = today
5  ધોરણ                    required, select from standards
6  માધ્યમ                   required, select
7  શાળાનું નામ              required, both scripts
8  સરનામું                  required, multiline
9  સત્સંગ સ્થિતિ            required, three chandlo options
10 માતાનું નામ              required
11 માતાનો મોબાઈલ નંબર      required, 10 digits
12 પિતાનું નામ              required
13 પિતાનો મોબાઈલ નંબર      required, 10 digits
14 કઈ સભામાં આવે છે         required, multi-select from visible sabhas
15 મુખ્ય સભા                required, single select from step 14
```

**Validation:** zod, messages from the copy deck. Mobile: exactly 10 digits after stripping spaces, `+91` and hyphens. Store digits only.

**Duplicate guard:** before insert, check for an active balak with the same `full_name_en` (case-insensitive) and either parent mobile. If found, show `duplicateBalak` with a link to the existing profile and an `તોય ઉમેરો` override.

**Photo pipeline (WO-09):** on select, downscale to max 512x512, encode WebP quality 0.8, then upload. Reject nothing on size, just compress. A 4 MB camera photo becomes roughly 200 KB.

**On save:** insert `balako`, insert `balak_sabhas` rows, then call `seedAttendanceRows()` for that balak's sabhas' scheduled sessions in the next 3 days so he appears on an already-generated sheet.

---

## /balako/[id] — પ્રોફાઇલ

Three tabs.

**વિગત** — all fields as label/value rows. Mobile numbers render as `tel:` links, digits in Latin inside the href, Gujarati in the display text. Below the fields, the વિશેષ નિયમ list with an add button.

**હાજરી** — last 12 held sessions of the balak's sabhas, one row each, with a chandlo showing present or absent, plus a summary strip: attended / total / percentage. Cancelled sessions are omitted entirely.

**આહ્નિક** — last 12 weeks as a compact grid. Rows are weeks, columns are the seven ahnik items, cells are chandlos. Horizontally scrollable with the week column sticky. A week with no record shows a full row of dashed rings, not blanks.

**Archive** sits behind the overflow menu and only renders for vistar-scope roles. Requires a Gujarati reason. Confirmation dialog states that history is preserved.

---

## /session/[id] — સભા

The task checklist screen. Five rows for pakki, four for kachi.

Each row shows the task's live state, its closing condition in plain Gujarati as the sub-line, and links to the closing screen.

`કાર્યક્રમ` and `નોંધ` text areas sit below the checklist. Saving `karyakram_text` non-empty closes task 1 immediately, without waiting for the cron.

`આ અઠવાડિયે સભા નથી` renders only for Nirikshak and Super Admin. It opens a sheet requiring a reason, then sets `status = 'cancelled'`, auto-closes all tasks, and returns to `/sabha` with a toast.

If the session is already cancelled, every control is disabled and a banner shows the reason and who cancelled it.

---

## /session/[id]/presabha — સભા પૂર્વે સંપર્ક

**Query:** attendance rows for the session joined to balako, ordered by Gujarati name.

**Per row:** photo, name, two call buttons (`માતા` / `પિતા`), three outcome options.

**Tapping a call button:**
1. writes `presabha_contacted` = mother or father, and `presabha_by` = current user
2. opens `tel:+91XXXXXXXXXX` in a new context
3. does **not** set the outcome, because the karyakar has not spoken yet

**Tapping an outcome:** sets `presabha_status` and `presabha_at`, optimistic update, single row PATCH.

If the karyakar taps a second parent, `presabha_contacted` becomes `both`.

**Footer:** `સંપર્ક કોણે કર્યો`, multi-select chips of the sabha's karyakars, writing to `session_followup_karyakars`. Pre-select whoever has a `presabha_by` stamp on any row in this session, which is free data and removes a step.

**Progress bar** = rows with `presabha_status <> 'pending'` over total rows.

Task 2 closes when that count reaches total.

---

## /session/[id]/attendance — હાજરી પત્રક

The screen that has to work fastest. A karyakar is standing in front of 25 balako.

**Layout:** sticky header row, sticky first column, hairline rows.

**Per row:** photo, name, standard, then three chandlos: the pre-sabha contact result (read-only, carried over from the previous screen so the karyakar can see who said they were coming), હાજર, ગેરહાજર.

હાજર and ગેરહાજર are mutually exclusive. Tapping one clears the other.

**`બધાને હાજર કરો`** in the header sets every unmarked row to present in one action. Most rows are present most weeks. This is the single biggest time saver on the screen and it must exist.

**Saving:** debounced batch upsert, 800ms after the last tap, plus an explicit save on the action bar. Show `સાચવાય છે...` inline, never a blocking spinner.

**Footer:** live totals in mono, `કુલ હાજર ૬ • ગેરહાજર ૨`.

**Editing later:** the same screen, no lock. On any edit it stamps `updated_by` and `updated_at` and writes an audit row. A line at the bottom reads `છેલ્લે બદલનાર: [નામ] • [તારીખ]`.

---

## /session/[id]/ahnik — આહ્નિક ફોલો-અપ

Pakki sabha only. On a kachi session the route returns the `notApplicable` message.

**One balak at a time**, navigated by a horizontal photo strip at the top. Seven rows, one chandlo each, a large tap target.

**Week key:** the Monday of the ISO week containing `session_date`.

**Dedup:** on load, check for an existing `ahnik_weeks` row for `(balak_id, week_start)`. If one exists and was captured at a different session, show `alreadyRecorded` with the existing values pre-filled and editable, plus a line naming the sabha where it was captured.

**Save and next** advances the strip. The last balak's button reads `આહ્નિક સાચવો` and returns to the session.

The photo strip shows a small filled chandlo on the corner of every balak already recorded this week, so the karyakar can see remaining work at a glance.

---

## /dashboard — વિસ્તારનો અહેવાલ

Vistar scope only. Sabha-scope users hitting this route get the Gujarati 403 page, not a redirect.

**Sections in order:**
1. Three headline stats for the selected period
2. Per-sabha attendance bars
3. `સતત ગેરહાજર બાળકો` with a call button per row, because this is the list that produces action
4. `બાકી કામ` overdue tasks with the amber treatment
5. `અધૂરી પ્રોફાઇલ` count with a link

**Period selector:** આ મહિનો / ગયો મહિનો / છેલ્લા ૩ મહિના / custom.

Cancelled sessions are excluded from every denominator on this screen. State that in a footnote so nobody wonders why the numbers move.

---

## /export

Four inputs, two outputs. See `08-Export-Specs.md`.

---

## /more

Rows: પ્રોફાઇલ, સૂચનાઓ, ભાષા, પાસવર્ડ બદલો, મદદ, લોગ આઉટ. Admin rows appended for the relevant roles.

**/more/notifications** carries the whole push subscription flow, the test-notification button and the Android battery help link. See `04`.

---

## PWA shell

```json
// manifest.json
{
  "name": "બાળ સભા સંચાલન",
  "short_name": "બાળ સભા",
  "lang": "gu",
  "dir": "ltr",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FDFCF9",
  "theme_color": "#A81E2E",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`<html lang="gu">` is required or the OS may pick the wrong shaping engine and the Gujarati will look subtly wrong on some Android builds.

Service worker caches the app shell and static assets only. **Do not cache API responses.** Attendance data that is one week stale is worse than a loading state.

Offline behaviour: a Gujarati banner reading `ઇન્ટરનેટ મળતું નથી`. No offline queue in v1, venues have internet.
