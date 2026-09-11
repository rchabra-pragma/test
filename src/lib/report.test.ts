// Run: node src/report.test.ts   (node >=22 strips the types)
import assert from 'node:assert/strict';
import { reportFileName, reportHTML, reportTitle } from './report.ts';
import type { Tx } from './logic.ts';

const tx = (id: string, type: Tx['type'], amount: number, category: string, date: string, note = '', currency = 'USD'): Tx => ({
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
  tx('2', 'expense', 250.5, 'Food', '2026-09-02', 'lunch & <tea>'),
  tx('3', 'expense', 749.5, 'Bills', '2026-09-03'),
];

const html = reportHTML(txs, 'month', '2026-09-10');

// every entry and both summary tables are present
for (const t of txs) assert.ok(html.includes(t.date), `missing row for ${t.date}`);
assert.ok(html.includes('Salary') && html.includes('Food') && html.includes('Bills'));
assert.ok(html.includes('Expenses by category'));
assert.ok(html.includes('3 entries'));

// totals: income 5000, expense 1000, balance 4000
assert.ok(html.includes('5,000.00') && html.includes('1,000.00') && html.includes('4,000.00'));

// notes are HTML-escaped, never injected
assert.ok(html.includes('lunch &amp; &lt;tea&gt;'));
assert.ok(!html.includes('<tea>'));

// empty period still renders a valid document
const empty = reportHTML([], 'year', '2026-09-10');
assert.ok(empty.startsWith('<!doctype html>') && empty.includes('No entries in this period.'));

assert.ok(reportTitle('year', '2026-09-10').includes('2026'));
assert.match(reportFileName('year', '2026-09-10'), /^expenses-2026\.pdf$/);

// a year report lists months, not individual days
const yearly = reportHTML(txs, 'year', '2026-09-10');
assert.ok(yearly.includes('<h2>Months</h2>') && yearly.includes('<th>Month</th>'));
assert.ok(!yearly.includes('<td>2026-09-02</td>'));
assert.ok(yearly.includes('September 2026') || yearly.includes('2026'));
assert.ok(html.includes('<h2>Entries</h2>')); // month view still lists entries

console.log('ok - all report checks passed');
