// Run: node src/logic.test.ts   (node >=22 strips the types)
import assert from 'node:assert/strict';
import { byCategory, groupByDate, inPeriod, isDate, money, periodKey, slices, toCSV, totals, type Tx } from './logic.ts';

const tx = (id: string, type: Tx['type'], amount: number, category: string, date: string, note = ''): Tx => ({
  id,
  type,
  amount,
  category,
  date,
  note,
});

const txs: Tx[] = [
  tx('1', 'income', 5000, 'Salary', '2026-09-01'),
  tx('2', 'expense', 250.5, 'Food', '2026-09-01', 'lunch, with "tip"'),
  tx('3', 'expense', 100, 'Food', '2026-09-02'),
  tx('4', 'expense', 900, 'Bills', '2026-08-31'),
];

// totals
assert.deepEqual(totals(txs), { income: 5000, expense: 1250.5, balance: 3749.5 });
assert.deepEqual(totals([]), { income: 0, expense: 0, balance: 0 });

// period filtering
assert.equal(inPeriod(txs, 'day', '2026-09-01').length, 2);
assert.equal(inPeriod(txs, 'month', '2026-09-15').length, 3);
assert.equal(inPeriod(txs, 'year', '2026-01-01').length, 4);
assert.equal(inPeriod(txs, 'all', '2026-09-01').length, 4);
assert.equal(periodKey('2026-09-01', 'all'), '');

// category rollup, sorted biggest first
assert.deepEqual(byCategory(txs, 'expense'), [
  { category: 'Bills', total: 900 },
  { category: 'Food', total: 350.5 },
]);

// grouping is newest date first
assert.deepEqual(
  groupByDate(txs).map(([d, g]) => [d, g.length]),
  [
    ['2026-09-02', 1],
    ['2026-09-01', 2],
    ['2026-08-31', 1],
  ]
);

// donut slices sum to 1 and start at 0; a lone slice must be a full ring
const s = slices(byCategory(txs, 'expense'));
assert.equal(s[0].offset, 0);
assert.ok(Math.abs(s.at(-1)!.offset + s.at(-1)!.frac - 1) < 1e-9);
assert.equal(slices([{ total: 7 }])[0].frac, 1);
assert.deepEqual(slices([]), []);
assert.equal(slices([{ total: 0 }])[0].frac, 0); // no divide-by-zero

// csv escapes quotes/commas and is oldest first
const csv = toCSV(txs).split('\n');
assert.equal(csv[0], 'Date,Type,Category,Amount,Note');
assert.equal(csv[1], '2026-08-31,expense,Bills,900.00,');
assert.equal(csv[3], '2026-09-01,expense,Food,250.50,"lunch, with ""tip"""');

// formatting + validation
assert.equal(money(1234567.5), '₹1,234,567.50');
assert.equal(money(-40, '$'), '-$40.00');
assert.ok(isDate('2026-02-28'));
assert.ok(!isDate('2026-13-01'));
assert.ok(!isDate('26-01-01'));

console.log('ok — all logic checks passed');
