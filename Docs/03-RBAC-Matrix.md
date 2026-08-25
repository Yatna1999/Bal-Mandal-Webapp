# 03 — RBAC Matrix

## Scope model

Two scopes, five roles.

| Role | Gujarati | Scope |
|---|---|---|
| `super_admin` | સુપર એડમિન | Vistar, plus account and configuration control |
| `agresar` | અગ્રેસર | Vistar |
| `nirikshak` | નિરીક્ષક | Vistar, plus session cancellation approval |
| `sanchalak` | સંચાલક | Assigned sabhas only |
| `sah_sanchalak` | સહ સંચાલક | Assigned sabhas only |

"Vistar scope" means all four sabhas, every balak, every parent phone number, every audit row.
"Sabha scope" means only sabhas listed in `karyakar_sabhas` for that karyakar. A karyakar assigned to two sabhas gets the union.

## Full matrix

| Capability | super_admin | agresar | nirikshak | sanchalak | sah_sanchalak |
|---|:---:|:---:|:---:|:---:|:---:|
| **Accounts** |
| Create karyakar account | Y | N | N | N | N |
| Change a karyakar's role | Y | N | N | N | N |
| Assign karyakar to sabha | Y | N | N | N | N |
| Deactivate karyakar | Y | N | N | N | N |
| Reset a karyakar's password | Y | N | N | N | N |
| Change own password | Y | Y | Y | Y | Y |
| **Sabha configuration** |
| Create a sabha | Y | N | N | N | N |
| Change પાકી / કાચી | Y | N | N | N | N |
| Change sabha default weekday and time | Y | Y | Y | N | N |
| Edit one session's date and time | Y | Y | Y | Y | Y |
| **Cancel a session (સભા નથી)** | **Y** | **N** | **Y** | **N** | **N** |
| **Balako** |
| Register a new balak | Y | Y | Y | Y | Y |
| Edit balak details | Y | Y | Y | own sabha | own sabha |
| Enroll a balak into a sabha | Y | Y | Y | own sabha | own sabha |
| **Archive or transfer a balak** | **Y** | **Y** | **Y** | **N** | **N** |
| See parent phone numbers | all | all | all | own sabha | own sabha |
| Delete a balak | N | N | N | N | N |
| **Sabha work** |
| Write કાર્યક્રમ text | Y | Y | Y | own sabha | own sabha |
| Do pre-sabha follow-up | Y | Y | Y | own sabha | own sabha |
| Mark attendance | Y | Y | Y | own sabha | own sabha |
| Edit attendance after the fact | Y | Y | Y | own sabha | own sabha |
| Record આહ્નિક | Y | Y | Y | own sabha | own sabha |
| Add or edit વિશેષ નિયમ | Y | Y | Y | own sabha | own sabha |
| Tick અહેવાલ checkbox | Y | Y | Y | own sabha | own sabha |
| **Reading and export** |
| Vistar dashboard (all 4 sabhas) | Y | Y | Y | N | N |
| Own sabha dashboard | Y | Y | Y | Y | Y |
| Export Excel and PDF | all | all | all | own sabha | own sabha |
| See audit log | Y | Y | Y | N | N |
| See karyakar accountability of others | Y | Y | Y | N | N |
| See own accountability | Y | Y | Y | Y | Y |
| **Settings** |
| Change quiet hours and reminder slots | Y | N | N | N | N |

## Enforcement, three layers, all mandatory

Do not rely on any single layer.

**Layer 1, Postgres RLS.** Already written in `02-Schema.sql`. This is the only layer that cannot be bypassed by a crafted request. Every policy routes through `can_see_balak()`, `can_touch_sabha()`, `is_vistar_scope()` or `is_super_admin()`.

**Layer 2, route guards.** Next.js middleware plus a server-side `requireRole()` helper on every server action. A sabha-scope karyakar hitting `/dashboard/vistar` gets a 403 page in Gujarati, not a redirect to login.

**Layer 3, UI.** Hide what the user cannot do. A sanchalak never sees a Cancel Sabha button. Hiding is a courtesy, not a control.

## Sensitive rules worth restating

**Parent phone numbers are the highest-sensitivity field in the system.** They belong to minors' families. Sabha-scope karyakars must never receive another sabha's numbers, including in a JSON payload that the UI happens not to render. Select column lists explicitly. Never `select *` on `balako` in a shared component.

**Nothing is ever hard-deleted.** There is no delete endpoint for `balako`, `attendance`, `ahnik_weeks` or `sabha_sessions`. Archiving is the only removal path and it requires a Gujarati reason string.

**Cancellation is deliberately narrow.** Only Nirikshak and Super Admin. If a sanchalak needs a sabha cancelled, they must ask. This is the control that stops "no sabha this week" being used to dodge the task engine.

## Open question flagged for you

Agresar currently **cannot** cancel a session, because your answer named only Nirikshak. If Agresar sits above Nirikshak in your structure, that is backwards. See `10-Open-Decisions.md`, item 1. The change is one line in `can_cancel_session()`.
