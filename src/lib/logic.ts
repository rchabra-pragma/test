// Pure logic. No React / react-native imports so it stays testable with plain node.
import { DEFAULT_CURRENCY, decimalsOf, symbolOf } from './currency.ts';

export type TxType = 'income' | 'expense';

export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  currency: string; // ISO code, e.g. USD
  /** Main label, e.g. "Coffee". Optional: entries saved before this field existed do not have it. */
  info?: string;
  category: string;
  /** Additional details, shown under the main label. */
  note: string;
  date: string; // YYYY-MM-DD
};

/** An entry's main label. Falls back to the category for entries saved before `info` existed. */
export const txLabel = (tx: Tx): string => tx.info?.trim() || tx.category;

export type Category = {
  name: string;
  icon: string;
  color: string;
  type: TxType;
};

export type Period = 'day' | 'month' | 'year';

/** Which entries the list/report shows. */
export type Filter = 'all' | TxType;

export const filterTxs = (txs: Tx[], f: Filter) => (f === 'all' ? txs : txs.filter((t) => t.type === f));

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

/** Local calendar day as YYYY-MM-DD. toISOString() would shift the day for any non-UTC timezone. */
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** YYYY-MM-DD -> local midday, so a DST jump can never roll it to the previous day. Invalid input falls back to now. */
export const fromISO = (s: string) => (isDate(s) ? new Date(`${s}T12:00:00`) : new Date());

export const today = () => toISO(new Date());

/**
 * 'Today' / 'Yesterday' / a written date. `ref` is the day to count back from.
 * Uses fromISO so a DST jump can never shift the comparison a day.
 */
export function relativeDate(iso: string, ref = today()): string {
  if (iso === ref) return 'Today';
  const prev = fromISO(ref);
  prev.setDate(prev.getDate() - 1);
  if (iso === toISO(prev)) return 'Yesterday';
  return fromISO(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Unique, chronologically sortable entry id. The millisecond prefix keeps the
 * `id.localeCompare` ordering used by suggestions/grouping working against ids
 * written before the random suffix existed.
 */
export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const money = (n: number, currency = DEFAULT_CURRENCY) =>
  (n < 0 ? '-' : '') +
  symbolOf(currency) +
  Math.abs(n)
    .toFixed(decimalsOf(currency))
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');


/** Entries split per currency, biggest group first. Amounts in different currencies are never added together. */
export function byCurrency(txs: Tx[]): [string, Tx[]][] {
  const m = new Map<string, Tx[]>();
  for (const t of txs) m.set(t.currency, [...(m.get(t.currency) ?? []), t]);
  return [...m].sort((a, b) => b[1].length - a[1].length);
}

export const totalsByCurrency = (txs: Tx[]) => byCurrency(txs).map(([currency, items]) => ({ currency, ...totals(items) }));

/** Bucket a date belongs to for a period. */
export function periodKey(date: string, p: Period): string {
  return p === 'day' ? date : p === 'month' ? date.slice(0, 7) : date.slice(0, 4);
}

export function inPeriod(txs: Tx[], p: Period, ref: string): Tx[] {
  const k = periodKey(ref, p);
  return txs.filter((t) => periodKey(t.date, p) === k);
}

/** Move the reference date by whole months/years. 'day' and 'all' don't navigate. */
export function shiftPeriod(ref: string, p: Period, delta: number): string {
  if (p !== 'month' && p !== 'year') return ref;
  const d = fromISO(ref);
  const months = (p === 'month' ? delta : delta * 12) + d.getMonth();
  // day 1 avoids the Jan 31 -> Mar 3 overflow; the period only cares about year/month
  return toISO(new Date(d.getFullYear(), months, 1));
}

export function periodLabel(ref: string, p: Period): string {
  const d = fromISO(ref);
  if (p === 'year') return String(d.getFullYear());
  const opts: Intl.DateTimeFormatOptions =
    p === 'month' ? { month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString(undefined, opts);
}

/** 'YYYY-MM' -> 'September 2026'. */
export const monthLabel = (key: string) =>
  fromISO(`${key}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** True when `latest` is a newer dotted version than `current` ("1.2.10" > "1.2.9"). */
export function isNewerVersion(latest: string, current: string): boolean {
  const part = (v: string, i: number) => Number(v.split('.')[i] ?? 0) || 0;
  const len = Math.max(latest.split('.').length, current.split('.').length);
  for (let i = 0; i < len; i++) {
    if (part(latest, i) !== part(current, i)) return part(latest, i) > part(current, i);
  }
  return false;
}

/** True once the last backup is older than `days`, or if there has never been one. */
export const backupIsStale = (lastBackupAt: number | null, days = 2, now = Date.now()) =>
  lastBackupAt === null || now - lastBackupAt > days * 864e5;

/** Past entries matching what's being typed, newest first, de-duplicated by label. */
export function suggestions(txs: Tx[], type: TxType, query: string, limit = 5) {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: { info: string; category: string; amount: number }[] = [];
  for (const t of [...txs].sort((a, b) => b.id.localeCompare(a.id))) {
    // Legacy entries have no info, so fall back to the note they were labelled with.
    const label = (t.info?.trim() || t.note.trim()).trim();
    const key = label.toLowerCase();
    if (t.type !== type || !key || seen.has(key)) continue;
    if (q && !key.includes(q)) continue;
    seen.add(key);
    out.push({ info: label, category: t.category, amount: t.amount });
    if (out.length === limit) break;
  }
  return out;
}

/** Most-used category for a label the user has entered before. */
export const suggestCategory = (txs: Tx[], type: TxType, info: string) =>
  suggestions(txs, type, info, 1).find((s) => s.info.toLowerCase() === info.trim().toLowerCase())?.category ?? '';

export function totals(txs: Tx[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function byCategory(txs: Tx[], type: TxType) {
  const m = new Map<string, number>();
  for (const t of txs) if (t.type === type) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  return [...m].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

/** Newest first, grouped into [date, txs] sections. */
export function groupByDate(txs: Tx[]): [string, Tx[]][] {
  const m = new Map<string, Tx[]>();
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
  for (const t of sorted) {
    if (!m.has(t.date)) m.set(t.date, []);
    m.get(t.date)!.push(t);
  }
  return [...m];
}

/** Sections for a period: days inside a day/month view, months inside a year view. */
export function groupForPeriod(txs: Tx[], p: Period): [string, Tx[]][] {
  if (p !== 'year') return groupByDate(txs);
  const m = new Map<string, Tx[]>();
  for (const [date, items] of groupByDate(txs)) {
    const key = date.slice(0, 7);
    m.set(key, [...(m.get(key) ?? []), ...items]);
  }
  return [...m];
}

/** Donut slices as fractions of the whole: render with strokeDasharray, no arc maths needed. */
export function slices<T extends { total: number }>(items: T[]) {
  const sum = items.reduce((a, b) => a + b.total, 0);
  let offset = 0;
  return items.map((it) => {
    const frac = sum > 0 ? it.total / sum : 0;
    const s = { ...it, frac, offset };
    offset += frac;
    return s;
  });
}

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCSV(txs: Tx[]): string {
  const rows: (string | number)[][] = [
    ['Date', 'Type', 'Info', 'Category', 'Currency', 'Amount', 'Description'],
    ...[...txs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [t.date, t.type, txLabel(t), t.category, t.currency, t.amount.toFixed(2), t.note]),
  ];
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Food', icon: '🍜', color: '#FF8A5B', type: 'expense' },
  { name: 'Transport', icon: '🚕', color: '#5BC0FF', type: 'expense' },
  { name: 'Groceries', icon: '🛒', color: '#8BD450', type: 'expense' },
  { name: 'Bills', icon: '💡', color: '#FFC75F', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: '#F866B1', type: 'expense' },
  { name: 'Health', icon: '💊', color: '#FF6B6B', type: 'expense' },
  { name: 'Fun', icon: '🎬', color: '#A66BFF', type: 'expense' },
  { name: 'Home', icon: '🏠', color: '#4ECDC4', type: 'expense' },
  { name: 'Salary', icon: '💼', color: '#38D39F', type: 'income' },
  { name: 'Business', icon: '📈', color: '#6C8CFF', type: 'income' },
  { name: 'Gift', icon: '🎁', color: '#FFD166', type: 'income' },
];

export const PALETTE = ['#FF8A5B', '#5BC0FF', '#8BD450', '#FFC75F', '#F866B1', '#FF6B6B', '#A66BFF', '#4ECDC4', '#38D39F', '#6C8CFF'];

export const ICONS = [
  // food & drink
  '🍜', '🍕', '🍔', '🍣', '🥗', '☕', '🍺', '🍰', '🛒',
  // travel & transport
  '🚕', '🚌', '🚆', '✈️', '⛽', '🅿️', '🚲', '🛵', '🚗',
  // home & bills
  '🏠', '💡', '🚿', '🔥', '📶', '📱', '🧾', '🛠️', '🧹',
  // shopping & fun
  '🛍️', '👕', '👟', '💄', '🎬', '🎮', '🎵', '🎁', '🎉',
  // health & care
  '💊', '🩺', '🦷', '🏋️', '🧘', '🐾', '👶', '🎓', '📚',
  // money & work
  '💼', '📈', '💰', '🏦', '💳', '🪙', '🧑‍💻', '🏢', '📊',
  // misc
  '❤️', '⭐', '🔑', '⚖️', '🌱', '☂️', '🧳', '📌', '🔔',
];
