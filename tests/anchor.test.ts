// Run: npm test   (node >=22 strips the types)
import assert from 'node:assert/strict';
import { panelLayout, type Anchor } from '../src/lib/anchor.ts';

const WIN_W = 390;
const WIN_H = 844;
const at = (x: number, y: number, w = 100, h = 44): Anchor => ({ x, y, w, h });

// plenty of room below: opens downwards, left-aligned to the trigger
const below = panelLayout(at(20, 120), WIN_W, WIN_H);
assert.equal(below.top, 168); // y + h + gap
assert.equal(below.bottom, undefined);
assert.equal(below.left, 20);
assert.equal(below.maxHeight, 320); // capped, not the full 668 available

// near the bottom: flips above the trigger
const flipped = panelLayout(at(20, 800), WIN_W, WIN_H);
assert.equal(flipped.top, undefined);
assert.equal(flipped.bottom, 48); // winH - y + gap
assert.ok(flipped.maxHeight > 0 && flipped.maxHeight <= 320);

// a trigger near the top never flips, even with little room below, because above is worse
const topOfScreen = panelLayout(at(20, 10, 100, 20), WIN_W, 200);
assert.equal(typeof topOfScreen.top, 'number');

// clamped to the window: a right-edge trigger does not push the panel off-screen
const rightEdge = panelLayout(at(370, 100), WIN_W, WIN_H);
assert.ok(rightEdge.left + rightEdge.width <= WIN_W, 'panel must stay inside the window');
assert.ok(rightEdge.left >= 8);

// a negative/offscreen anchor is still clamped to the left edge
assert.equal(panelLayout(at(-50, 100), WIN_W, WIN_H).left, 8);

// the panel is never narrower than its trigger, and never wider than the window
const wide = panelLayout(at(10, 100, 360), WIN_W, WIN_H);
assert.equal(wide.width, 360); // widened to the trigger, which exceeds the preferred 300
const narrowWindow = panelLayout(at(0, 100, 10), 200, WIN_H);
assert.ok(narrowWindow.width <= 200 - 16);

// maxHeight never goes negative when the trigger sits flush against an edge
assert.ok(panelLayout(at(20, 0, 100, 844), WIN_W, WIN_H).maxHeight >= 0);

console.log('# ok - all anchor layout checks passed');
