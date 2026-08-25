export type Lang = 'gu' | 'en';

export interface ReportMeta {
  vistar: string;
  sabha: string;
  period: string;
  by: string;
  on: string;
  sheetName: string;
  orientation: 'portrait' | 'landscape';
}

export interface Col {
  key: string;
  header: string;
  width: number;
}

export interface Report {
  meta: ReportMeta;
  columns: Col[];
  rows: Record<string, string | number>[];
  footerRows?: Record<string, string | number>[];
}
