// Pure report rendering. No React / react-native imports so it stays testable with plain node.
import { currencyOf } from './currency.ts';
import { byCategory, byCurrency, groupByDate, groupForPeriod, money, monthLabel, periodLabel, totals, type Period, type Tx } from './logic.ts';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

export const reportTitle = (p: Period, ref: string) => `Expense Manager — ${periodLabel(ref, p)}`;

export const reportFileName = (p: Period, ref: string) =>
  `expenses-${periodLabel(ref, p).replace(/[^\w]+/g, '-').toLowerCase()}.pdf`;

/** One self-contained block per currency: totals, categories, then entries (months in a year view). */
function currencySection(items: Tx[], code: string, period: Period, showHeading: boolean): string {
  const sum = totals(items);
  const cur = currencyOf(code);
  const byMonth = period === 'year';

  const catRows = byCategory(items, 'expense')
    .map(
      (c) => `<tr>
        <td colspan="2">${esc(c.category)}</td>
        <td class="r">${sum.expense ? Math.round((c.total / sum.expense) * 100) : 0}%</td>
        <td class="r">${esc(money(c.total, code))}</td>
      </tr>`,
    )
    .join('');

  const rows = byMonth
    ? groupForPeriod(items, period)
        .map(([key, group]) => {
          const t = totals(group);
          return `<tr>
        <td>${esc(monthLabel(key))}</td>
        <td>${group.length}</td>
        <td class="r income">${esc(money(t.income, code))}</td>
        <td class="r expense">${esc(money(t.expense, code))}</td>
      </tr>`;
        })
        .join('')
    : groupByDate(items)
        .flatMap(([, group]) => group)
        .map(
          (t) => `<tr>
        <td>${t.date}</td>
        <td>${esc(t.category)}</td>
        <td>${esc(t.note) || '&mdash;'}</td>
        <td class="r ${t.type}">${t.type === 'income' ? '+' : '&minus;'}${esc(money(t.amount, code))}</td>
      </tr>`,
        )
        .join('');

  const head = byMonth
    ? '<tr><th>Month</th><th>Entries</th><th class="r">Income</th><th class="r">Expense</th></tr>'
    : '<tr><th>Date</th><th>Category</th><th>Details</th><th class="r">Amount</th></tr>';

  return `<section>
${showHeading ? `<h2 class="cur">${esc(`${cur.flag} ${cur.code} — ${cur.label}`)}</h2>` : ''}
<div class="cards">
  <div class="card"><span class="label">Income</span><b class="income">${esc(money(sum.income, code))}</b></div>
  <div class="card"><span class="label">Expense</span><b class="expense">${esc(money(sum.expense, code))}</b></div>
  <div class="card"><span class="label">Balance</span><b>${esc(money(sum.balance, code))}</b></div>
</div>
${
  catRows
    ? `<h2>Expenses by category</h2><table><tbody>${catRows}</tbody>
       <tfoot><tr><td colspan="3">Total</td><td class="r">${esc(money(sum.expense, code))}</td></tr></tfoot></table>`
    : ''
}
<h2>${byMonth ? 'Months' : 'Entries'}</h2>
${
  rows
    ? `<table><thead>${head}</thead><tbody>${rows}</tbody>
       <tfoot><tr><td colspan="3">Balance</td><td class="r">${esc(money(sum.balance, code))}</td></tr></tfoot></table>`
    : '<div class="empty">No entries in this period.</div>'
}
</section>`;
}

/** Printable statement. Entries in different currencies get their own section — totals are never mixed. */
export function reportHTML(txs: Tx[], period: Period, ref: string): string {
  const groups = byCurrency(txs);
  const body = groups.length
    ? groups.map(([code, items]) => currencySection(items, code, period, groups.length > 1)).join('')
    : '<div class="empty">No entries in this period.</div>';

  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(reportTitle(period, ref))}</title>
<style>
  @page { margin: 32px; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #12141A; font-size: 13px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #6B7280; margin-bottom: 18px; }
  section + section { margin-top: 28px; }
  .cards { display: flex; gap: 10px; margin-bottom: 22px; }
  .card { flex: 1; border: 1px solid #E4E7F0; border-radius: 10px; padding: 10px 12px; }
  .card b { display: block; font-size: 17px; margin-top: 3px; }
  .label { color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: #6B7280; margin: 22px 0 6px; }
  h2.cur { font-size: 15px; text-transform: none; letter-spacing: 0; color: #12141A; font-weight: 700;
           border-bottom: 2px solid #E4E7F0; padding-bottom: 6px; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #6B7280;
       border-bottom: 1px solid #E4E7F0; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #F1F3F8; }
  tr { page-break-inside: avoid; }
  .r { text-align: right; white-space: nowrap; }
  .income { color: #12A67A; }
  .expense { color: #E04848; }
  tfoot td { font-weight: 700; border-top: 1px solid #E4E7F0; border-bottom: none; }
  .empty { color: #6B7280; padding: 24px 0; }
</style></head><body>
<h1>${esc(reportTitle(period, ref))}</h1>
<div class="sub">${txs.length} ${txs.length === 1 ? 'entry' : 'entries'}${
    groups.length > 1 ? ` in ${groups.length} currencies` : ''
  } &middot; generated ${new Date().toLocaleString()}</div>
${body}
</body></html>`;
}
