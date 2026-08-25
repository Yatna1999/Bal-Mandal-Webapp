'use client';

import { useEffect } from 'react';
import type { Report } from '@/lib/export/types';

export function PrintReportClient({ report }: { report: Report }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.fonts.ready.then(() => {
        window.print();
      });
    }
  }, []);

  const { meta, columns, rows, footerRows } = report;
  const isLandscape = meta.orientation === 'landscape';

  // Attendance Sheet Paging Logic (max 5 date columns per page chunk)
  const isAttendance = report.meta.sheetName === 'હાજરી પત્રક';
  const fixedCols = columns.slice(0, 4); // sr, name_gu, name_en, standard
  const dateCols = isAttendance ? columns.slice(4, columns.length - 3) : [];
  const summaryCols = isAttendance ? columns.slice(columns.length - 3) : [];

  const chunks: Array<{ cols: typeof columns }> = [];

  if (isAttendance && dateCols.length > 5) {
    for (let i = 0; i < dateCols.length; i += 5) {
      const slice = dateCols.slice(i, i + 5);
      const isLastChunk = i + 5 >= dateCols.length;
      chunks.push({
        cols: [...fixedCols, ...slice, ...(isLastChunk ? summaryCols : [])],
      });
    }
  } else {
    chunks.push({ cols: columns });
  }

  const isAhnik =
    report.meta.sheetName === 'આહ્નિક નોંધ' ||
    report.meta.sheetName === 'આહ્નિક અહેવાલ';

  return (
    <div className="print-container bg-white text-ink p-4 min-h-screen">
      <style jsx global>{`
        @page {
          size: A4 ${isLandscape ? 'landscape' : 'portrait'};
          margin: 12mm 10mm;
        }
        @media print {
          html,
          body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9pt !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th,
          td {
            border: 0.5pt solid #999 !important;
            padding: 3pt 4pt !important;
            vertical-align: middle !important;
          }
          th {
            background-color: #f2f !important;
            font-weight: 600 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Toolbar for manual actions (no-print) */}
      <div className="no-print mb-4 p-4 bg-sheet border border-rule rounded-md flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-ink">{meta.sheetName}</h1>
          <p className="text-[13px] text-ink-soft">
            {meta.period} | {meta.sabha}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 h-[40px] bg-indigo text-white font-semibold text-[14px] rounded-md hover:opacity-95"
        >
          🖨️ PDF પ્રિન્ટ કરો / Save as PDF
        </button>
      </div>

      {chunks.map((chunk, chunkIdx) => (
        <div
          key={chunkIdx}
          className={`${
            chunkIdx > 0 ? 'break-before-page page-break-before-always mt-8' : ''
          }`}
        >
          {/* Metadata Block */}
          <div className="mb-4 text-[13px] border-b border-rule pb-3 flex flex-wrap justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-ink">{meta.sheetName}</h2>
              <p>
                <strong>વિસ્તાર:</strong> {meta.vistar} | <strong>સભા:</strong>{' '}
                {meta.sabha}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>સમયગાળો:</strong> {meta.period}
              </p>
              <p>
                <strong>તૈયાર કરનાર:</strong> {meta.by} | <strong>તારીખ:</strong>{' '}
                {meta.on}
              </p>
            </div>
          </div>

          {/* Report Table */}
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className={isAhnik ? 'h-[60pt]' : ''}>
                {chunk.cols.map((col) => {
                  const isAhnikItemCol = isAhnik && col.key.startsWith('item_');
                  return (
                    <th
                      key={col.key}
                      style={{ width: `${col.width}%` }}
                      className={`bg-paper font-semibold border border-rule p-1.5 align-bottom ${
                        isAhnikItemCol ? 'relative' : ''
                      }`}
                    >
                      {isAhnikItemCol ? (
                        <div className="whitespace-nowrap transform -rotate-45 origin-bottom-left translate-x-3 -translate-y-1 text-[11px]">
                          {col.header}
                        </div>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-sheet border-b border-rule">
                  {chunk.cols.map((col) => {
                    const val = row[col.key] ?? '';
                    const isAbs = val === 'ગે';
                    const isNameCol =
                      col.key === 'name_gu' || col.key === 'name_en';
                    return (
                      <td
                        key={col.key}
                        className={`border border-rule p-1.5 align-middle ${
                          isAbs ? 'bg-kumkum-wash font-semibold text-kumkum' : ''
                        } ${isNameCol ? 'break-words whitespace-normal' : ''}`}
                        style={isNameCol ? { wordBreak: 'keep-all' } : undefined}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Footer Rows */}
              {footerRows &&
                footerRows.map((fRow, fIdx) => (
                  <tr
                    key={`f_${fIdx}`}
                    className="bg-paper font-semibold border-t-2 border-rule"
                  >
                    {chunk.cols.map((col) => (
                      <td
                        key={col.key}
                        className="border border-rule p-1.5 align-middle"
                      >
                        {fRow[col.key] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
