# 07 — Design System and Stitch Prompts

## Why this direction

You asked for something that does not look like a generic AI-built webapp. The way to get that is not to add decoration, it is to ground every choice in the subject's own material world and then execute with restraint.

The subject's world here is the **હાજરી પત્રક**: a ruled paper register, filled in with pen, at night, in a mandir hall. And the **ચાંદલો**: a filled red circle that means a thing was done.

So: the app is a register, and its state vocabulary is the chandlo.

Three things I deliberately avoided, because they are what AI-generated design defaults to right now:

- Warm cream background with a high-contrast serif and a terracotta accent
- Near-black background with one acid accent
- Card grids with 16px radius and soft drop shadows

## Tokens

```css
:root {
  /* surface */
  --paper:        #FDFCF9;   /* app background, barely tinted, cool not cream */
  --sheet:        #FFFFFF;   /* register surface */
  --rule:         #DDD8CE;   /* hairline, the register rule */
  --rule-strong:  #B9B2A4;   /* section divider */

  /* ink */
  --ink:          #16181D;   /* primary text, cool near-black like pen ink */
  --ink-soft:     #5A6069;   /* secondary text */
  --ink-faint:    #949AA3;   /* labels, captions */

  /* kumkum: primary action AND the done/present state */
  --kumkum:       #A81E2E;
  --kumkum-deep:  #86121F;   /* pressed */
  --kumkum-wash:  #FBEEEF;   /* selected row background */

  /* second pen */
  --indigo:       #1E3A8A;   /* links, informational */
  --indigo-wash:  #EEF2FB;

  /* states */
  --amber:        #B45309;   /* overdue only. nothing else. */
  --amber-wash:   #FEF6EC;
  --slate:        #94A3B8;   /* absent, not-done, hollow */

  /* geometry */
  --r-sm: 4px;
  --r-md: 6px;               /* hard cap on interactive elements */
  --r-sheet: 12px;           /* bottom sheets only, top corners */
  --hair: 1px;
  --tap: 48px;               /* minimum tap target, non-negotiable */
}
```

**Kumkum red means "done".** Not green. This is deliberate: the chandlo is red, and a red mark on a register has always meant an entry was made. Overdue uses amber so the two never collide.

## Type

```html
<link href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Hind+Vadodara:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

| Role | Face | Use |
|---|---|---|
| Wordmark | **Shrikhand** 400 | The words `બાળ સભા` in the app header. **Once per screen, nowhere else.** |
| UI and body | **Hind Vadodara** 300/400/500/600/700 | Everything |
| Data | **IBM Plex Mono** 400/500 | Every number inside a register row, table, or export. Tabular figures align the columns. |

Scale:

```
display   28 / 34   Hind Vadodara 700
h1        22 / 28   Hind Vadodara 600
h2        18 / 24   Hind Vadodara 600
body      16 / 26   Hind Vadodara 400      <- Gujarati needs 1.6 line-height minimum for matras
small     14 / 22   Hind Vadodara 400
label     11 / 16   Hind Vadodara 600, letter-spacing 0.08em
data      15 / 20   IBM Plex Mono 500, font-variant-numeric: tabular-nums
```

**Gujarati line-height is not optional.** Matras sit above and below the baseline. Anything under 1.55 clips them. Set `line-height: 1.6` on body as a global default.

## Signature element: the ચાંદલો state token

Every binary state in the app is a circle. Not a checkbox, not a pill, not a toggle.

```
●  filled kumkum, 20px        done / હાજર / આહ્નિક કર્યું
○  hollow, 1.5px slate ring   not done / ગેરહાજર
◌  dotted 1.5px ring          pending / હજી પૂછ્યું નથી
```

```css
.chandlo {
  width: 20px; height: 20px; border-radius: 50%;
  border: 1.5px solid var(--slate);
  background: transparent;
  transition: background 180ms cubic-bezier(.34,1.4,.64,1), border-color 180ms;
}
.chandlo[data-state="done"] {
  background: var(--kumkum);
  border-color: var(--kumkum);
}
.chandlo[data-state="pending"] {
  border-style: dashed;
  border-color: var(--ink-faint);
}
@media (prefers-reduced-motion: reduce) { .chandlo { transition: none; } }
```

The tap target around it is 48px. The circle itself is 20px.

This is the one memorable thing in the app. Everything around it stays quiet.

## Layout rules

1. **No cards.** Lists are full-bleed rows separated by a 1px `--rule` hairline. This is a register, not a dashboard.
2. **No drop shadows anywhere.** Elevation is background tint plus hairline. The only exception is the bottom sheet, which gets `0 -1px 0 var(--rule)` as a top hairline, not a shadow.
3. **Radius capped at 6px** on buttons, inputs and chips. Bottom sheets get 12px on the top two corners only. Nothing else is rounded.
4. **Active row gets a 3px `--kumkum` left border** and `--kumkum-wash` background. That is the whole selection treatment.
5. **Column headers** in the `label` style, sitting on a `--rule-strong` bottom border.
6. **Sticky first column** on the attendance sheet, so the balak name stays visible while the karyakar scrolls the state columns. Sticky header row too.
7. **Bottom tab bar**, 5 items, 56px tall, `--sheet` background, top hairline. Active tab: `--kumkum` icon and label, others `--ink-faint`.
8. **Primary action is a full-width bar** fixed above the tab bar on form screens, not a floating action button. Karyakars are one-handed on a phone at 9 pm.

## Motion

One orchestrated moment, nothing else. The chandlo fill: 180ms, `cubic-bezier(.34, 1.4, .64, 1)`, which gives a slight overshoot so a tap feels registered without a toast.

No page transitions. No skeleton shimmer, use a static `--rule` coloured block. No hover effects, this is a touch app first.

Respect `prefers-reduced-motion` on all of it.

## Accessibility floor

- Every tap target 48x48 minimum
- Visible focus ring: `2px solid var(--indigo)`, `outline-offset: 2px`
- Contrast: `--ink` on `--sheet` is 15.8:1, `--kumkum` on `--sheet` is 7.1:1, both pass AA
- The chandlo never carries state by colour alone. `done` is filled, `not done` is hollow, `pending` is dashed. Shape carries the meaning.
- `lang="gu"` on `<html>` so the OS picks Gujarati shaping and screen readers use the right voice

---

# Stitch prompts

Feed these one at a time. Prefix every prompt with the block below.

## Global preamble (paste before every prompt)

```
Mobile-first web app screen, 390x844. Gujarati language interface.

Style: a paper attendance register, not a SaaS dashboard.
Background #FDFCF9, surfaces #FFFFFF, hairline rules #DDD8CE.
Text #16181D primary, #5A6069 secondary, #949AA3 for labels.
Accent #A81E2E (deep kumkum red) used for primary actions and for the
"done" state. #1E3A8A for links. #B45309 for overdue only.

Fonts: Hind Vadodara for all UI text (Gujarati script), IBM Plex Mono
for numbers. Line height 1.6 on Gujarati text.

HARD RULES:
- No cards. Lists are full-bleed rows divided by 1px hairlines.
- No drop shadows anywhere.
- Border radius maximum 6px.
- No gradients. No purple. No teal. No emoji.
- Binary states are drawn as CIRCLES: filled #A81E2E = done,
  hollow with 1.5px #94A3B8 ring = not done, dashed ring = pending.
  Never use checkmarks, tick icons, or toggle switches for state.
- Bottom tab bar, 5 items, 56px, top hairline.
- Primary action is a full-width bar fixed above the tab bar.
```

---

### S1 — મુખ્ય (Home)

```
Home screen for a karyakar.

Top: thin header bar, left the wordmark "બાળ સભા" in Shrikhand,
right a bell icon with a small red dot badge.

Below the header, one line of #949AA3 label text: "પાલડી વિસ્તાર".

Section 1, "આજ અને આવતીકાલ": one or two full-bleed rows. Each row shows
sabha name in 16px Hind Vadodara 600, below it day, date and time in
IBM Plex Mono 14px in #5A6069, and on the right a small pill reading
"પાકી" or "કાચી" with a hairline border, no fill.

Section 2, header "બાકી કામ" in 11px letterspaced label style with a
#B9B2A4 bottom rule. Below it three task rows. Each task row: a dashed
circle on the left, the task name in 16px, the sabha name and due date
beneath in 13px #5A6069, and a right chevron. One of the three rows is
overdue: its left circle and its due-date text are #B45309, and it has
a 3px #B45309 left border.

Section 3, header "આ મહિનો". Three statistics side by side, separated
by vertical hairlines, no boxes: large number in IBM Plex Mono 28px
above a 11px letterspaced Gujarati label. Labels: "હાજરી ટકાવારી",
"કુલ બાળકો", "સતત ગેરહાજર".

Bottom tab bar: મુખ્ય, કામ, બાળકો, સભા, વધુ. First tab active in
#A81E2E. The "કામ" tab carries a small red numeric badge.
```

---

### S2 — હાજરી પત્રક (Attendance sheet)

```
The most important screen. It must read like a ruled paper register.

Header: back arrow, title "હાજરી પત્રક", right a small "બદલો" text
button in #1E3A8A.

Below header a compact context strip on #FFFFFF with a bottom hairline:
sabha name in 15px 600, and below it "બુધવાર, ૨૭ ઓગસ્ટ • ૯:૦૦ થી ૧૦:૩૦
રાત્રે" in IBM Plex Mono 13px #5A6069.

Then a sticky column header row on #FFFFFF with a 1px #B9B2A4 bottom
border. Four columns, all in 11px letterspaced label style: "બાળક"
(left aligned, wide), "સંપર્ક", "હાજર", "ગેરહાજર" (the last three
narrow, centre aligned).

Then 8 register rows, each 56px tall, divided by 1px #DDD8CE
hairlines, no card, no radius, full bleed edge to edge.
Each row: a 32px circular photo on the far left, then the balak's
Gujarati name in 15px 500 with "ધોરણ ૫" beneath it in IBM Plex Mono
12px #949AA3. Then three centred circles, one per column.
- The સંપર્ક circle is filled #A81E2E on rows where contact was made,
  dashed grey on rows where it is pending.
- હાજર and ગેરહાજર are a mutually exclusive pair: one filled #A81E2E,
  the other hollow with a 1.5px #94A3B8 ring.
Two of the eight rows should show a dashed pending contact circle and
two hollow attendance circles.

At the bottom of the list, above the action bar, a footer block on
#FFFFFF with a top hairline: label "સંપર્ક કોણે કર્યો" in 11px
letterspaced, then three selectable name chips with 6px radius and a
1px hairline border. Two chips are selected: #FBEEEF fill with a
#A81E2E border and #A81E2E text.

Fixed full-width bar above the tab bar, #A81E2E, white text 16px 600,
reading "હાજરી સાચવો". To its left inside the same bar area, small
#5A6069 text "કુલ હાજર ૬ • ગેરહાજર ૨" in IBM Plex Mono.
```

---

### S3 — સભા પૂર્વે સંપર્ક (Pre-sabha follow-up)

```
Header: back arrow, title "સભા પૂર્વે સંપર્ક".

Instruction block on #FFFFFF with a bottom hairline: two lines of 14px
#5A6069 text reading "સભા પહેલાં દરેક બાળકના ઘરે ફોન કરીને પૂછો કે
બાળક સભામાં આવશે કે નહીં."

Progress strip: a 4px tall bar, #A81E2E filled to about 60% on a
#DDD8CE track, no radius, full bleed. Below it, right aligned,
"૪ બાળકનો સંપર્ક બાકી" in IBM Plex Mono 13px #B45309.

Then full-bleed rows divided by hairlines, 76px tall each. Per row:
32px photo, Gujarati name 15px 500, and directly beneath the name two
side-by-side call buttons, each 40px tall with 6px radius and a 1px
#DDD8CE border, containing a small phone glyph and the word "માતા" or
"પિતા" in 14px. On the right edge of the row, a compact vertical
stack of three tiny selectable labels reading "આવશે", "નહીં આવે",
"જવાબ નથી મળ્યો", each with a small circle to its left.

Show three states across the rows: one row with "આવશે" selected (its
circle filled #A81E2E, its label #16181D 600, others #949AA3), one row
with "નહીં આવે" selected, and one row untouched with all three circles
dashed.

Fixed bar above the tab bar reading "સંપર્ક પૂરો થયો", in #A81E2E,
white text, disabled-looking (60% opacity) because rows remain.
```

---

### S4 — આહ્નિક ફોલો-અપ

```
Header: back arrow, title "આહ્નિક ફોલો-અપ", and beneath it in 13px
#5A6069 "પાલડી બાળ સભા • અઠવાડિયું ૨૫-૩૧ ઓગસ્ટ".

A horizontally scrollable strip of balak chips at the top, 64px tall,
each a 40px circular photo with the first name beneath in 11px. The
active balak's photo has a 2px #A81E2E ring. Some photos have a small
filled #A81E2E dot at their bottom right, meaning already recorded.

Below, the active balak in a full-width block: 56px photo, name 18px
600, "ધોરણ ૫ • સત્સંગી" in 13px #5A6069.

Then seven full-bleed rows, one per ahnik item, 56px tall, divided by
hairlines. Each row: the Gujarati item name on the left at 16px, and on
the right a single large circle, 28px, that is the tap target.
Items top to bottom: પૂજા, તિલક-ચાંદલો, માનસી પૂજા, આરતી,
વચનામૃત / સ્વામીની વાતો વાંચન, ઘરસભા, રવિ સભા.
Show four filled #A81E2E and three hollow with a #94A3B8 ring.
The fifth item's Gujarati text is long, so it must wrap to two lines
without breaking the row height rhythm badly.

Fixed bar above the tab bar: "આહ્નિક સાચવો અને આગળ", #A81E2E.
```

---

### S5 — બાળકની પ્રોફાઇલ

```
Header: back arrow, title "બાળકની પ્રોફાઇલ", right a "બદલો" text
button in #1E3A8A.

Identity block, left aligned not centred: 72px circular photo, to its
right the Gujarati name at 22px 600, the English name beneath at 14px
#5A6069, and below that two small hairline-bordered pills reading
"સત્સંગી" and "ધોરણ ૫".

A horizontal tab strip with three items, "વિગત", "હાજરી", "આહ્નિક",
selected item underlined with a 2px #A81E2E rule, others #5A6069, on a
#DDD8CE full-width bottom hairline. "વિગત" is active.

Detail rows: label on the left in 13px #949AA3, value on the right in
15px #16181D, each row 48px, divided by hairlines, full bleed.
Rows: જન્મ તારીખ, ધોરણ, માધ્યમ, શાળા, સરનામું, માતાનું નામ,
માતાનો મોબાઈલ નંબર, પિતાનું નામ, પિતાનો મોબાઈલ નંબર.
The two mobile number values are #1E3A8A with a small phone glyph,
and their digits are in IBM Plex Mono.

Below, a section header "વિશેષ નિયમ" in 11px letterspaced with a
#B9B2A4 bottom rule, then one niyam row: title "ટીવી નહીં જોવાનો નિયમ"
at 15px, "૧ ઓગસ્ટ થી ૩૧ ઓક્ટોબર" beneath in IBM Plex Mono 12px
#5A6069, and on the right a small pill reading "ચાલુ" with #FBEEEF
fill and #A81E2E text.

No fixed action bar on this screen.
```

---

### S6 — બાળકો (List and search)

```
Header: title "બાળકો" 22px 600, right a "+" icon button.

Search field, full width, 48px tall, 6px radius, 1px #DDD8CE border,
#FFFFFF fill, placeholder "નામ કે મોબાઈલ નંબરથી શોધો" in #949AA3.

Below it a horizontally scrollable row of filter chips, 32px tall, 6px
radius, hairline border: "બધા", "પાલડી બાળ સભા", "પાલડી શિશુ સભા",
"સ્વામિનારાયણ પાર્ક-૧", "રિવર સાઇડ પાર્ક". First chip selected with
#FBEEEF fill and #A81E2E border.

A count line, right aligned, "૨૩ બાળકો" in IBM Plex Mono 13px #949AA3.

Then full-bleed rows, 64px, divided by hairlines: 40px photo, Gujarati
name 16px 500, beneath it "ધોરણ ૫ • પાલડી બાળ સભા" in 13px #5A6069,
right chevron on the far right.

One row must show an incomplete profile: instead of a photo it has a
40px circle with a dashed #949AA3 border containing a small camera
glyph, and a small #B45309 text label "ફોટો બાકી" sits beside the name.
```

---

### S7 — સભા (Session detail)

```
Header: back arrow, title "પાલડી બાળ સભા", right an overflow "⋯" icon.

Context block: "બુધવાર, ૨૭ ઓગસ્ટ" at 18px 600, beneath it
"૯:૦૦ થી ૧૦:૩૦ રાત્રે" in IBM Plex Mono 14px #5A6069, and a "પાકી સભા"
pill with a hairline border on the right.

Then a checklist of five task rows, full bleed, 64px, hairline
divided. Each row: a state circle on the left (filled #A81E2E for done,
dashed for pending), the task name at 16px, a small status line beneath
in 13px, and a right chevron.
Rows and states, top to bottom:
1. કાર્યક્રમ તૈયાર કરો — done, sub "પૂરું કરનાર: યત્ન" in #5A6069
2. સભા પૂર્વે સંપર્ક કરો — done, sub "૨૩ માંથી ૨૩ પૂરા"
3. હાજરી નોંધો — pending, sub "આજે રાત્રે ૧૦:૩૦ પછી"
4. આહ્નિક ફોલો-અપ કરો — pending, sub "આજે રાત્રે ૧૦:૩૦ પછી"
5. અહેવાલ ભરો — pending, sub "કાલે રાત્રે ૯ સુધીમાં"

Below, a section "કાર્યક્રમ" with a #B9B2A4 rule, then a multiline
text area, 1px #DDD8CE border, 6px radius, #FFFFFF fill, 120px tall,
holding three lines of Gujarati text.

Below that a section "નોંધ" with a smaller empty text area.

No fixed bar. Instead, two full-width stacked buttons with 6px radius:
"કાર્યક્રમ સાચવો" filled #A81E2E with white text, and beneath it
"આ અઠવાડિયે સભા નથી" as an outline button with a 1px #B45309 border
and #B45309 text.
```

---

### S8 — વિસ્તારનો અહેવાલ (Vistar dashboard, Nirikshak and Agresar)

```
Header: title "વિસ્તારનો અહેવાલ" 22px 600, right a small period
selector chip reading "આ મહિનો" with a 6px radius hairline border.

Three headline statistics in a single row separated by vertical
hairlines, no boxes: number in IBM Plex Mono 30px #16181D, label
beneath in 11px letterspaced #949AA3. Labels: "હાજરી ટકાવારી",
"કુલ બાળકો", "કાર્યકર જવાબદારી".

Section "સભા પ્રમાણે" with a #B9B2A4 rule. Four full-bleed rows, one
per sabha, 60px, hairline divided. Each: sabha name 15px 500, beneath
it "૨૩ બાળકો" in IBM Plex Mono 12px #5A6069. On the right a horizontal
bar 6px tall and about 100px wide on a #DDD8CE track, filled #A81E2E to
its attendance rate, with the percentage in IBM Plex Mono 14px to the
right of the bar. Four different fill lengths.

Section "સતત ગેરહાજર બાળકો" with a #B9B2A4 rule and a one-line
#5A6069 explanation "છેલ્લી ૩ સભામાં એક પણ વાર ન આવ્યા હોય."
Three rows, each: 32px photo, name 15px, sabha name beneath in 13px,
and on the right a 36px tall outline button with a phone glyph and
6px radius, #1E3A8A border and text.

Section "બાકી કામ" with a #B9B2A4 rule. Two overdue rows, each with a
3px #B45309 left border, #FEF6EC background, task name at 15px, and
"પાલડી શિશુ સભા • ૨ દિવસથી બાકી" beneath in 13px #B45309.

At the bottom, a full-width outline button, 6px radius, #1E3A8A border
and text, reading "અહેવાલ ઉતારો".
```

---

### S9 — નિકાસ (Export)

```
Header: back arrow, title "નિકાસ".

Section "કયો અહેવાલ જોઈએ છે" as an 11px letterspaced label with a
#B9B2A4 rule. Five selectable full-bleed rows, 56px, hairline divided,
each with a circle on the left and a name at 16px: "બાળક નોંધપોથી",
"હાજરી પત્રક", "આહ્નિક નોંધ", "નિયમ નોંધ", "કાર્યકર જવાબદારી".
The second is selected: filled #A81E2E circle, #FBEEEF row background,
3px #A81E2E left border.

Section "સભા": a select field, 48px, 6px radius, hairline border,
showing "પાલડી બાળ સભા".

Section "સમયગાળો": two date fields side by side, 48px each, 6px
radius, hairline border, values in IBM Plex Mono.

Section "તારીખની ભાષા": a two-option segmented control, 44px tall,
6px radius, 1px #DDD8CE border, split down the middle. Left half
"ગુજરાતી" selected with #A81E2E fill and white text, right half
"અંગ્રેજી" with #FFFFFF fill and #5A6069 text.

Two stacked full-width buttons, 6px radius, 52px tall:
"એક્સેલમાં ઉતારો" filled #A81E2E white text, and
"PDF બનાવો" as an outline button with a #A81E2E border and text.
Beneath them one line of 13px #949AA3 helper text:
"PDF બનાવવા માટે છપાઈની વિન્ડોમાં Save as PDF પસંદ કરો."
```

---

## After Stitch

Stitch will hand you HTML and CSS. Do not paste it into the app as-is. Instead:

1. Extract the layout structure and spacing rhythm
2. Replace every hardcoded colour with the CSS variable from the token block above
3. Replace every hardcoded string with a key from `05-Gujarati-Copy-Deck.md`
4. Rebuild as React components against the real data shapes in `02-Schema.sql`
5. Verify the chandlo tokens are circles with the three-state shape distinction intact, because generation tools will substitute checkmarks if you let them

Then take one screenshot per screen at 390px and check three things: Gujarati matras are not clipped, no shadow crept in, and no radius exceeds 6px.
