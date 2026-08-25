import { gu } from './gu';

type Params = Record<string, string | number>;

/** Dot-path lookup with {param} interpolation. Returns the path if missing. */
export function t(path: string, params?: Params): string {
  const val = path.split('.').reduce<unknown>(
    (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
    gu
  );
  if (typeof val !== 'string') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] missing key: ${path}`);
    }
    return path;
  }
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export { gu };
