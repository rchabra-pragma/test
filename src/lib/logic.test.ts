// Run: node src/logic.test.ts   (node >=22 strips the types)
import assert from 'node:assert/strict';
import { byCategory, backupIsStale, byCurrency, filterTxs, fromISO, groupByDate, groupForPeriod, inPeriod, isDate, isNewerVersion, money, monthLabel, periodKey, shiftPeriod, slices, suggestCategory, suggestions, toCSV, today, toISO, totals, totalsByCurrency, type Tx } from './logic.ts';
import { CURRENCIES, DEFAULT_CURRENCY, currencyOf, searchCurrencies, symbolOf } from './currency.ts';

const tx = (id: string, type: Tx['type'], amount: number, category: string, date: string, note = '', currency = DEFAULT_CURRENCY): Tx => ({
  id,
  type,
  amount,
  currency,
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
assert.equal(periodKey('2026-09-01', 'year'), '2026');

// type filter shown under the month/year tabs
assert.equal(filterTxs(txs, 'all').length, 4);
assert.deepEqual(filterTxs(txs, 'income').map((t) => t.id), ['1']);
assert.deepEqual(filterTxs(txs, 'expense').map((t) => t.id), ['2', '3', '4']);

// year view groups by month, day/month views by day
assert.deepEqual(groupForPeriod(txs, 'year').map(([k, g]) => [k, g.length]), [
  ['2026-09', 3],
  ['2026-08', 1],
]);
assert.deepEqual(groupForPeriod(txs, 'month').map(([k]) => k), ['2026-09-02', '2026-09-01', '2026-08-31']);
assert.equal(monthLabel('2026-09').includes('2026'), true);

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
assert.equal(csv[0], 'Date,Type,Category,Currency,Amount,Note');
assert.equal(csv[1], '2026-08-31,expense,Bills,USD,900.00,');
assert.equal(csv[3], '2026-09-01,expense,Food,USD,250.50,"lunch, with ""tip"""');

// formatting + validation
assert.equal(money(1234567.5), '$1,234,567.50');
assert.equal(money(-40, 'INR'), '-₹40.00');
assert.equal(money(12, 'NOPE'), 'NOPE12.00'); // unknown codes still render, never crash
assert.equal(symbolOf('EUR'), '€');
assert.equal(currencyOf('EUR').code, 'EUR');
assert.equal(currencyOf('NOPE').label, 'NOPE');
assert.deepEqual(searchCurrencies('rupe').map((x) => x.code), ['INR', 'PKR', 'LKR', 'NPR']);
assert.deepEqual(searchCurrencies('usd').map((x) => x.code), ['USD']);
assert.equal(searchCurrencies('  ').length, CURRENCIES.length);
assert.equal(searchCurrencies('zzz').length, 0);
assert.ok(isDate('2026-02-28'));
assert.ok(!isDate('2026-13-01'));
assert.ok(!isDate('26-01-01'));

// date <-> picker conversion stays on the local calendar day, whatever the timezone
assert.equal(toISO(new Date(2026, 0, 5)), '2026-01-05');
assert.equal(toISO(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
assert.equal(toISO(fromISO('2026-03-08')), '2026-03-08'); // US DST start
assert.equal(toISO(fromISO('2026-10-25')), '2026-10-25'); // EU DST end
assert.equal(fromISO('2026-06-01').getHours(), 12);
assert.ok(isDate(today()));
assert.ok(isDate(toISO(fromISO('nonsense'))));

// period navigation
assert.equal(shiftPeriod('2026-01-31', 'month', 1), '2026-02-01'); // no Jan-31 overflow into March
assert.equal(shiftPeriod('2026-01-15', 'month', -1), '2025-12-01');
assert.equal(shiftPeriod('2026-01-15', 'year', 1), '2027-01-01');
assert.equal(shiftPeriod('2026-01-15', 'day', 1), '2026-01-15'); // the day tab doesn't page
assert.deepEqual(inPeriod(txs, 'month', shiftPeriod('2026-09-10', 'month', -1)).map((t) => t.id), ['4']);

// backup reminder
const now = Date.parse('2026-09-10T10:00:00Z');
assert.equal(backupIsStale(null, 2, now), true);
assert.equal(backupIsStale(now - 3 * 864e5, 2, now), true);
assert.equal(backupIsStale(now - 864e5, 2, now), false);

// suggestions from past entries
const past: Tx[] = [
  tx('10', 'expense', 120, 'Food', '2026-09-01', 'Chai stall'),
  tx('11', 'expense', 60, 'Transport', '2026-09-02', 'Metro card'),
  tx('12', 'expense', 130, 'Food', '2026-09-03', 'chai stall'), // newer duplicate wins, case-insensitive
  tx('13', 'income', 5000, 'Salary', '2026-09-03', 'Monthly pay'),
  tx('14', 'expense', 10, 'Food', '2026-09-03', ''), // blank notes are not suggestions
];
assert.deepEqual(
  suggestions(past, 'expense', '').map((s) => s.note),
  ['chai stall', 'Metro card'],
);
assert.deepEqual(suggestions(past, 'expense', 'CHAI').map((s) => s.note), ['chai stall']);
assert.deepEqual(suggestions(past, 'income', '').map((s) => s.note), ['Monthly pay']);
assert.equal(suggestions(past, 'expense', '', 1).length, 1);
assert.equal(suggestCategory(past, 'expense', 'Chai Stall'), 'Food');
assert.equal(suggestCategory(past, 'expense', 'unseen note'), '');

// version compare for the update prompt
assert.ok(isNewerVersion('1.2.10', '1.2.9'));
assert.ok(isNewerVersion('1.3', '1.2.9'));
assert.ok(!isNewerVersion('1.2.3', '1.2.3'));
assert.ok(!isNewerVersion('1.2.3', '1.10.0'));

// currencies are grouped, never summed together; biggest group first
const mixed: Tx[] = [
  tx('20', 'income', 100, 'Salary', '2026-09-01', '', 'USD'),
  tx('21', 'expense', 40, 'Food', '2026-09-01', '', 'USD'),
  tx('22', 'expense', 300, 'Food', '2026-09-02', '', 'INR'),
];
assert.deepEqual(
  byCurrency(mixed).map(([code, items]) => [code, items.length]),
  [['USD', 2], ['INR', 1]],
);
assert.deepEqual(totalsByCurrency(mixed), [
  { currency: 'USD', income: 100, expense: 40, balance: 60 },
  { currency: 'INR', income: 0, expense: 300, balance: -300 },
]);
assert.deepEqual(byCurrency([]), []);

console.log('ok — all logic checks passed');
