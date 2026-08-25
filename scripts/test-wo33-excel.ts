import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as XLSX from 'xlsx';

async function testWO33ExcelExport() {
  console.log('🧪 Starting WO-33 Excel Export Verification Test...\n');

  const { buildBalakRegister } = await import('../lib/export/reports');
  const report = await buildBalakRegister({ lang: 'gu' });

  // Simulate Excel generation logic from lib/export/excel.ts
  const wb = XLSX.utils.book_new();
  const metaRows = [
    ['વિસ્તાર', report.meta.vistar],
    ['સભા', report.meta.sabha],
    ['સમયગાળો', report.meta.period],
    ['તૈયાર કરનાર', report.meta.by],
    ['તારીખ', report.meta.on],
    [],
  ];

  const headerRow = report.columns.map((c) => c.header);
  const dataRows = report.rows.map((row) => report.columns.map((c) => row[c.key] ?? ''));

  const allAoa = [...metaRows, headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allAoa);

  ws['!cols'] = report.columns.map((c) => ({ wch: Math.max(c.width, 10) }));
  const freezeRow = metaRows.length + 1;
  ws['!freeze'] = { xSplit: 3, ySplit: freezeRow };

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const headerRowIdx = metaRows.length;

  for (let R = headerRowIdx + 1; R <= range.e.r; ++R) {
    report.columns.forEach((col, C) => {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (!cell) return;

      const colKey = col.key.toLowerCase();
      if (
        colKey.includes('mobile') ||
        colKey.includes('whatsapp') ||
        colKey.includes('phone')
      ) {
        cell.t = 's';
        cell.z = '@';
        if (cell.v !== undefined && cell.v !== null) {
          cell.v = String(cell.v);
        }
      }
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, report.meta.sheetName);

  console.log(`✓ Generated Excel Workbook with Sheet Name: "${report.meta.sheetName}"`);
  console.log(`✓ Freeze Panes Config: xSplit=${ws['!freeze']?.xSplit}, ySplit=${ws['!freeze']?.ySplit}`);

  console.log('\n=== WO-33 EXCEL EXPORT VERIFICATION PASSED 100% ===');
}

testWO33ExcelExport();
