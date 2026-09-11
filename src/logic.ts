// Pure logic. No React / react-native imports so it stays testable with plain node.

export type TxType = 'income' | 'expense';

export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
};

export type Category = {
  name: string;
  icon: string;
  color: string;
  type: TxType;
};

export type Period = 'day' | 'month' | 'year' | 'all';

export const today = () => new Date().toISOString().slice(0, 10);

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export const money = (n: number, currency = '₹') =>
  (n < 0 ? '-' : '') + currency + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Bucket a date belongs to for a period. 'all' collapses everything into one bucket. */
export function periodKey(date: string, p: Period): string {
  return p === 'day' ? date : p === 'month' ? date.slice(0, 7) : p === 'year' ? date.slice(0, 4) : '';
}

export function inPeriod(txs: Tx[], p: Period, ref: string): Tx[] {
  const k = periodKey(ref, p);
  return txs.filter((t) => periodKey(t.date, p) === k);
}

export function totals(txs: Tx[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) t.type === 'income' ? (income += t.amount) : (expense += t.amount);
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
    ['Date', 'Type', 'Category', 'Amount', 'Note'],
    ...[...txs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [t.date, t.type, t.category, t.amount.toFixed(2), t.note]),
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

export const ICONS = ['🍜', '🚕', '🛒', '💡', '🛍️', '💊', '🎬', '🏠', '✈️', '📚', '🐾', '☕', '💼', '📈', '🎁', '💰'];
