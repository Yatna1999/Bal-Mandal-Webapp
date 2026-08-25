import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const TZ = 'Asia/Kolkata';

const GU_DIGITS = ['૦','૧','૨','૩','૪','૫','૬','૭','૮','૯'];

/** Latin digits to Gujarati. Display only. Never on tel:, form values, or Excel. */
export const toGu = (n: number | string): string =>
  String(n).replace(/[0-9]/g, d => GU_DIGITS[Number(d)]);

/** index 0 = Sunday, matches JS Date.getDay() */
export const WEEKDAYS_GU = ['રવિવાર','સોમવાર','મંગળવાર','બુધવાર','ગુરુવાર','શુક્રવાર','શનિવાર'] as const;
export const WEEKDAYS_GU_SHORT = ['રવિ','સોમ','મંગળ','બુધ','ગુરુ','શુક્ર','શનિ'] as const;

export const MONTHS_GU = ['જાન્યુઆરી','ફેબ્રુઆરી','માર્ચ','એપ્રિલ','મે','જૂન',
  'જુલાઈ','ઓગસ્ટ','સપ્ટેમ્બર','ઓક્ટોબર','નવેમ્બર','ડિસેમ્બર'] as const;
export const MONTHS_GU_SHORT = ['જાન્યુ','ફેબ્રુ','માર્ચ','એપ્રિલ','મે','જૂન',
  'જુલાઈ','ઓગ','સપ્ટે','ઓક્ટો','નવે','ડિસે'] as const;

const ist = (d: Date | string) => toZonedTime(typeof d === 'string' ? new Date(d) : d, TZ);

/** '૨૭ ઓગસ્ટ ૨૦૨૬' */
export function formatDateGu(d: Date | string): string {
  const x = ist(d);
  return `${toGu(x.getDate())} ${MONTHS_GU[x.getMonth()]} ${toGu(x.getFullYear())}`;
}

/** '૨૭ ઓગ' */
export function formatDateGuShort(d: Date | string): string {
  const x = ist(d);
  return `${toGu(x.getDate())} ${MONTHS_GU_SHORT[x.getMonth()]}`;
}

/** '27 August 2026' */
export function formatDateEn(d: Date | string): string {
  return format(ist(d), 'd MMMM yyyy');
}

/** 'બુધવાર, ૨૭ ઓગસ્ટ' */
export function formatWeekdayDateGu(d: Date | string): string {
  const x = ist(d);
  return `${WEEKDAYS_GU[x.getDay()]}, ${toGu(x.getDate())} ${MONTHS_GU[x.getMonth()]}`;
}

function periodWord(hour24: number): string {
  if (hour24 < 12) return 'સવારે';
  if (hour24 < 16) return 'બપોરે';
  if (hour24 < 19) return 'સાંજે';
  return 'રાત્રે';
}

/** '૯:૦૦ થી ૧૦:૩૦ રાત્રે' from 'HH:mm:ss' or 'HH:mm' strings */
export function formatTimeRangeGu(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  const s = `${toGu(h12(sh))}:${toGu(String(sm).padStart(2, '0'))}`;
  const e = `${toGu(h12(eh))}:${toGu(String(em).padStart(2, '0'))}`;
  return `${s} થી ${e} ${periodWord(eh)}`;
}

/** ISO week Monday, as 'yyyy-MM-dd'. Used as the ahnik week key. */
export function isoWeekStart(d: Date | string): string {
  const x = ist(d);
  const day = x.getDay();               // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  const monday = new Date(x);
  monday.setDate(x.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return format(monday, 'yyyy-MM-dd');
}

/** '૨૫-૩૧ ઓગસ્ટ' for a week starting on the given Monday */
export function formatWeekRangeGu(weekStart: string): string {
  const a = new Date(weekStart + 'T00:00:00');
  const b = new Date(a); b.setDate(a.getDate() + 6);
  if (a.getMonth() === b.getMonth()) {
    return `${toGu(a.getDate())}-${toGu(b.getDate())} ${MONTHS_GU[a.getMonth()]}`;
  }
  return `${toGu(a.getDate())} ${MONTHS_GU_SHORT[a.getMonth()]} - ${toGu(b.getDate())} ${MONTHS_GU_SHORT[b.getMonth()]}`;
}

/** Digits only, for storage and tel: links */
export const cleanMobile = (s: string): string => s.replace(/\D/g, '').slice(-10);
export const telHref = (s: string): string => `tel:+91${cleanMobile(s)}`;

export function ageFromDob(dob: string): number {
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}
