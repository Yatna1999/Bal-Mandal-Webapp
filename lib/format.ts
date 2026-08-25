const guDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

/** Converts ASCII digits 0-9 in a number or string to Gujarati numerals ૦-૯ */
export function toGu(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[0-9]/g, (d) => guDigits[parseInt(d, 10)]);
}

export const guWeekdays = [
  'રવિવાર',
  'સોમવાર',
  'મંગળવાર',
  'બુધવાર',
  'ગુરુવાર',
  'શુક્રવાર',
  'શનિવાર',
];

export const guMonths = [
  'જાન્યુઆરી',
  'ફેબ્રુઆરી',
  'માર્ચ',
  'એપ્રિલ',
  'મે',
  'જૂન',
  'જુલાઈ',
  'ઓગસ્ટ',
  'સપ્ટેમ્બર',
  'ઓક્ટોબર',
  'નવેમ્બર',
  'ડિસેમ્બર',
];

export const enMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Formats a date string/object into Gujarati format e.g. "૧૫ ઓગસ્ટ ૨૦૨૬" */
export function formatDateGu(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const day = toGu(d.getDate());
  const month = guMonths[d.getMonth()];
  const year = toGu(d.getFullYear());
  return `${day} ${month} ${year}`;
}

/** Formats a date string/object into English format e.g. "15 August 2026" */
export function formatDateEn(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = enMonths[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Formats time range e.g. "17:00 - 18:30" */
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}
