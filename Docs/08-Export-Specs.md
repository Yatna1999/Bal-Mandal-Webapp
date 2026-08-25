# 08 — Export Specs

## The Gujarati PDF constraint, restated because it will bite you

`jsPDF`, `pdfmake` and `@react-pdf/renderer` do not run an Indic shaping pass. They place glyphs left to right in codepoint order. Gujarati requires reordering (the `િ` matra is stored after its consonant but drawn before it) and conjunct formation (`ત` + `્` + `ર` becomes `ત્ર`). None of those libraries do either, even with a correct TTF embedded. Your output will show broken matras and split conjuncts, and you will not notice until you print a real name.

**Do not fight this. Route around it.**

PDF is produced by a print-only HTML route plus `window.print()`. The browser hands the text to the OS shaping engine, which is correct on every platform. The print dialog's Save as PDF is available on Android Chrome, iOS Safari, Windows, macOS and Linux.

Excel needs no workaround. XLSX is Unicode and Excel shapes Gujarati natively.

## Architecture

```
/export                     the form
/export/print/[type]        print-only HTML route, ?params in query string
lib/export/excel.ts         SheetJS builders
lib/export/format.ts        shared date, numeral, label helpers
```

Both formats read the **same** query function so the numbers can never disagree.

```ts
// one function per report, returns rows + meta
export async function buildAttendanceReport(p: {
  sabhaId: string; from: string; to: string; lang: 'gu' | 'en';
}): Promise<{ meta: ReportMeta; columns: Col[]; rows: Row[] }>
```

## Shared conventions

**Date language toggle.** `lang: 'gu'` renders `૨૭ ઓગસ્ટ ૨૦૨૬` and Gujarati numerals throughout. `lang: 'en'` renders `27 August 2026` and Latin numerals. The toggle affects dates, numerals and column headers. Balak names always render in **both** scripts, in adjacent columns, regardless of the toggle, because that is what makes an exported sheet usable by everyone.

**Excel numerals are always Latin.** A Gujarati numeral in a spreadsheet cell is text and will not sum. Only PDF gets Gujarati digits.

**Every export carries a meta block:**

```
વિસ્તાર: પાલડી
સભા: પાલડી બાળ સભા
સમયગાળો: ૧ ઓગસ્ટ ૨૦૨૬ થી ૩૧ ઓગસ્ટ ૨૦૨૬
તૈયાર કરનાર: [કાર્યકરનું નામ]
તારીખ: [આજની તારીખ]
```

**Filenames:**
`palди-bal-sabha_hajari_2026-08.xlsx` — Latin, lowercase, hyphenated, ISO dates. Do not put Gujarati in a filename; some Android file managers mangle it.

---

## Report 1 — બાળક નોંધપોથી (Balak Register)

**Scope:** one sabha, or all visible sabhas.

| # | ગુજરાતી | width | source |
|---|---|---|---|
| 1 | ક્રમ | 5 | row index |
| 2 | નામ (ગુજરાતી) | 22 | `full_name_gu` |
| 3 | Name (English) | 22 | `full_name_en` |
| 4 | જન્મ તારીખ | 12 | `dob` |
| 5 | ઉંમર | 6 | computed |
| 6 | ધોરણ | 10 | `standards.label_gu` |
| 7 | માધ્યમ | 10 | enum label |
| 8 | શાળા | 24 | `school_gu` |
| 9 | સત્સંગ સ્થિતિ | 12 | enum label |
| 10 | સરનામું | 34 | `address_gu` |
| 11 | માતાનું નામ | 20 | `mother_name_gu` |
| 12 | માતાનો મોબાઈલ | 14 | `mother_mobile`, text format |
| 13 | પિતાનું નામ | 20 | `father_name_gu` |
| 14 | પિતાનો મોબાઈલ | 14 | `father_mobile`, text format |
| 15 | સભા | 22 | comma-joined sabha names |

Sorted by ધોરણ then Gujarati name.

**Mobile columns must be forced to text** (`{ t: 's' }` in SheetJS) or Excel strips the leading zero and renders `9.87654E+09`.

**PDF:** A4 **landscape**. 15 columns will not fit portrait. Columns 10 and 15 wrap.

---

## Report 2 — હાજરી પત્રક (Attendance Sheet)

The most-used export. A month of one sabha.

Layout is a matrix: balako down, session dates across.

| Col | Content |
|---|---|
| A | ક્રમ |
| B | નામ (ગુજરાતી) |
| C | Name (English) |
| D | ધોરણ |
| E..N | one column per held session, header `૬ ઓગ` / `6 Aug` |
| last-2 | કુલ હાજર |
| last-1 | કુલ સભા |
| last | ટકાવારી |

**Cell values:** `હ` for present, `ગે` for absent, blank for a session the balak was not enrolled in. Do not use `P` and `A`, this is a Gujarati document.

**Cancelled sessions are omitted as columns entirely** and excluded from `કુલ સભા`.

**Footer rows** below the last balak:
```
કુલ હાજર        [per column]
હાજરી ટકાવારી   [per column]
સંપર્ક કરનાર     [comma-joined names from session_followup_karyakars]
```

**Excel formatting:** freeze panes at C2. Conditional fill: `ગે` cells get `#FBEEEF`. Column widths 5, 22, 22, 8, then 6 per date.

**PDF:** A4 landscape. If more than 5 sessions in the period, break into pages of 5 date columns, repeating columns A to D on every page.

---

## Report 3 — આહ્નિક નોંધ (Ahnik Log)

Two variants, chosen on the export form.

### 3a. Per sabha, one week

Rows are balako, columns are the seven ahnik items.

| Col | Content |
|---|---|
| A | ક્રમ |
| B | નામ (ગુજરાતી) |
| C | ધોરણ |
| D..J | પૂજા, તિલક-ચાંદલો, માનસી પૂજા, આરતી, વચનામૃત/સ્વામીની વાતો, ઘરસભા, રવિ સભા |
| K | કુલ (out of ૭) |
| L | નોંધનાર |

Cell values `હા` / `ના`, blank if the week was never recorded for that balak.

Header rotation: the ahnik column headers are long. In Excel set the header row to 60pt height with `alignment: { textRotation: 45, wrapText: true }`. In PDF rotate the header cells 45 degrees with `writing-mode` or a CSS transform.

**Footer:** count of `હા` per column, and a percentage row.

### 3b. Per balak, multiple weeks

Rows are weeks, columns are the seven items. Adds a trend footer: percentage per item across the period. Useful for a karyakar preparing a conversation with one balak.

---

## Report 4 — નિયમ નોંધ (Niyam Register)

| # | ગુજરાતી |
|---|---|
| 1 | ક્રમ |
| 2 | બાળકનું નામ |
| 3 | સભા |
| 4 | નિયમ |
| 5 | શરૂ તારીખ |
| 6 | મહિના |
| 7 | પૂરો થવાની તારીખ |
| 8 | સ્થિતિ |
| 9 | નોંધનાર |

Grouped by સ્થિતિ: ચાલુ first, then મુદત પૂરી, then પૂરો કર્યો, then અધૂરો રહ્યો.

**PDF:** A4 portrait.

---

## Report 5 — કાર્યકર જવાબદારી (Karyakar Accountability)

Vistar scope only.

| # | ગુજરાતી |
|---|---|
| 1 | કાર્યકરનું નામ |
| 2 | હોદ્દો |
| 3 | સભા |
| 4 | કુલ કામ |
| 5 | સમયસર પૂરાં |
| 6 | મોડાં પૂરાં |
| 7 | બાકી |
| 8 | ટકાવારી |

Sorted by ટકાવારી ascending, so the person who needs a conversation is at the top. That ordering is the point of the report.

**PDF:** A4 portrait, with a note under the table:
`ટકાવારી = મુદત પહેલાં પૂરાં થયેલાં કામ ÷ કુલ સોંપાયેલાં કામ. રદ થયેલી સભાનાં કામ ગણતરીમાં નથી.`

---

## Excel implementation

```ts
import * as XLSX from 'xlsx';

export function toWorkbook(r: Report, filename: string) {
  const wb = XLSX.utils.book_new();

  // meta block as the first rows, then a blank row, then the table
  const metaRows = [
    ['વિસ્તાર', r.meta.vistar],
    ['સભા', r.meta.sabha],
    ['સમયગાળો', r.meta.period],
    ['તૈયાર કરનાર', r.meta.by],
    ['તારીખ', r.meta.on],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ...metaRows,
    r.columns.map(c => c.header),
    ...r.rows.map(row => r.columns.map(c => row[c.key])),
  ]);

  ws['!cols'] = r.columns.map(c => ({ wch: c.width }));
  ws['!freeze'] = { xSplit: 3, ySplit: metaRows.length + 1 };

  XLSX.utils.book_append_sheet(wb, ws, r.meta.sheetName);
  XLSX.writeFile(wb, filename);   // client side, no server
}
```

Force text on mobile columns:

```ts
const cell = ws[XLSX.utils.encode_cell({ r, c })];
if (cell) { cell.t = 's'; cell.z = '@'; }
```

## PDF implementation

```tsx
// app/export/print/[type]/page.tsx
export default async function PrintPage({ params, searchParams }) {
  const report = await buildReport(params.type, searchParams);
  return (
    <>
      <PrintStyles orientation={report.orientation} />
      <ReportHeader meta={report.meta} />
      <ReportTable columns={report.columns} rows={report.rows} />
      <ReportFooter meta={report.meta} />
      <AutoPrint />
    </>
  );
}
```

```css
@page { size: A4 landscape; margin: 12mm 10mm; }

@media print {
  html, body { background: #fff; }
  nav, .app-chrome, .no-print { display: none !important; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  thead { display: table-header-group; }   /* repeat header on every page */
  tr { break-inside: avoid; }
  th, td { border: 0.5pt solid #999; padding: 3pt 4pt; }
  th { background: #F2F0EB; font-weight: 600; }
  .meta { font-size: 9pt; margin-bottom: 6mm; }
  .page-foot { position: fixed; bottom: 4mm; font-size: 7pt; color: #666; }
}

/* Gujarati needs room. Do not compress below these. */
body { font-family: 'Hind Vadodara', sans-serif; line-height: 1.55; }
```

`AutoPrint` calls `window.print()` in a `useEffect` after fonts load:

```ts
useEffect(() => { document.fonts.ready.then(() => window.print()); }, []);
```

Waiting on `document.fonts.ready` matters. Printing before Hind Vadodara loads gives you a fallback face that may not carry Gujarati at all.

## Test before you ship

Print each report once and check:

1. `શ્રી`, `ત્રિ`, `કિ`, `ર્ય` render correctly. If any conjunct splits, the font did not load.
2. Long Gujarati names do not clip. Set `word-break: keep-all` and let rows grow.
3. Mobile numbers in Excel show all 10 digits, not scientific notation.
4. The header row repeats on page 2 of a multi-page attendance sheet.
5. A cancelled session does not appear as a column and is not in the denominator.
