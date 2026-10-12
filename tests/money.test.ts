// Run: npm test   (node >=22 strips the types)
import assert from 'node:assert/strict';
import { money, newId, relativeDate, toISO } from '../src/lib/logic.ts';
import { decimalsOf } from '../src/lib/currency.ts';

// minor units: most currencies are 2dp, a few are 0 or 3
assert.equal(decimalsOf('USD'), 2);
assert.equal(decimalsOf('JPY'), 0);
assert.equal(decimalsOf('KWD'), 3);
assert.equal(decimalsOf('ZZZ'), 2); // unknown code still formats

// money() follows the currency, not a hardcoded 2dp
assert.equal(money(1234.56, 'USD'), '$1,234.56');
assert.equal(money(1234.56, 'JPY'), '¥1,235');
assert.equal(money(1234, 'KRW'), '₩1,234');
assert.equal(money(1234.5678, 'KWD'), 'KD1,234.568');
assert.equal(money(-1234.5, 'USD'), '-$1,234.50');
assert.equal(money(0, 'USD'), '$0.00');

// grouping separators never leak into the decimal part
assert.equal(money(1234567.891, 'KWD'), 'KD1,234,567.891');
assert.equal(money(999, 'JPY'), '¥999');

// ids are unique and still sort chronologically, including against legacy Date.now() ids
const ids = new Set(Array.from({ length: 2000 }, newId));
assert.equal(ids.size, 2000, 'newId collided');

const legacy = String(Date.now() - 1000);
const fresh = newId();
assert.ok(legacy.localeCompare(fresh) < 0, 'an older legacy id must sort before a new one');
assert.ok(newId().localeCompare(legacy) > 0, 'a new id must sort after an older legacy id');

// relativeDate names the two days a user recognises and writes out the rest
const ref = '2026-09-10';
assert.equal(relativeDate('2026-09-10', ref), 'Today');
assert.equal(relativeDate('2026-09-09', ref), 'Yesterday');
assert.ok(!['Today', 'Yesterday'].includes(relativeDate('2026-09-08', ref)));

// crossing a month boundary still resolves "Yesterday"
assert.equal(relativeDate('2026-08-31', '2026-09-01'), 'Yesterday');

// default ref is the local today, not a UTC day that may be off by one
const now = new Date();
assert.equal(relativeDate(toISO(now)), 'Today');

console.log('ok - all money/id/date checks passed');
