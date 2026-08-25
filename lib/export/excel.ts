import * as XLSX from 'xlsx';
import type { Report } from './types';

/**
 * Downloads a Report object as an Excel file (.xlsx) entirely client-side using SheetJS.
 * - Mobile / phone number columns are forced to text ('s' type and '@' format)
 *   so Excel never strips leading zeros or converts 10 digits into scientific notation (9.87654E+09).
 * - Freeze panes enabled for frozen column and metadata header rows.
 */
export function downloadExcel(r: Report, filename: string) {
  const wb = XLSX.utils.book_new();

  const metaRows = [
    ['વિસ્તાર', r.meta.vistar],
    ['સભા', r.meta.sabha],
    ['સમયગાળો', r.meta.period],
    ['તૈયાર કરનાર', r.meta.by],
    ['તારીખ', r.meta.on],
    [],
  ];

  const headerRow = r.columns.map((c) => c.header);
  const dataRows = r.rows.map((row) => r.columns.map((c) => row[c.key] ?? ''));
  const footerRows = (r.footerRows ?? []).map((row) => r.columns.map((c) => row[c.key] ?? ''));

  const allAoa = [
    ...metaRows,
    headerRow,
    ...dataRows,
    ...footerRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(allAoa);

  // Set column widths
  ws['!cols'] = r.columns.map((c) => ({ wch: Math.max(c.width, 10) }));

  // Freeze panes (Freeze metadata header rows + 3 leading columns: sr, name_gu, name_en)
  const freezeRow = metaRows.length + 1; // row index after header row
  ws['!freeze'] = { xSplit: 3, ySplit: freezeRow };

  // Walk every cell to ensure mobile/phone numbers stay text string ('s') and '@' format
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const headerRowIdx = metaRows.length; // 0-indexed row of table header

  for (let R = headerRowIdx + 1; R <= range.e.r; ++R) {
    r.columns.forEach((col, C) => {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) return;

      const colKey = col.key.toLowerCase();
      if (
        colKey.includes('mobile') ||
        colKey.includes('whatsapp') ||
        colKey.includes('phone')
      ) {
        // Force string type and text format '@' to prevent stripping leading 0 or scientific notation
        cell.t = 's';
        cell.z = '@';
        if (cell.v !== undefined && cell.v !== null) {
          cell.v = String(cell.v);
        }
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, r.meta.sheetName || 'અહેવાલ');
  XLSX.writeFile(wb, filename);
}
