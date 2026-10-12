// One-step developer setup: `npm run setup`.
//
// Checks the toolchain, installs dependencies, wires up the git hooks, then starts the app.
// Written in Node rather than shell so it works the same on macOS, Linux and Windows.
//
//   npm run setup                 set up, then start the Expo dev server
//   npm run setup -- --android    ...and open Android directly (also --ios, --web)
//   npm run setup -- --no-start   set up only

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const MIN_NODE = 22;
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);

const c = { red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' };
const step = (n, total, msg) => console.log(`\n${c.bold}[${n}/${total}] ${msg}${c.off}`);
const ok = (msg) => console.log(`${c.green}✓${c.off} ${msg}`);

function die(msg, fix) {
  console.error(`\n${c.red}✗ ${msg}${c.off}`);
  if (fix) console.error(`${c.dim}  ${fix}${c.off}\n`);
  process.exit(1);
}

/** Runs a command with inherited stdio. Returns false instead of throwing when it fails. */
function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  return res.status === 0;
}

const TOTAL = has('--no-start') ? 3 : 4;

// 1 — toolchain
step(1, TOTAL, 'Checking your toolchain');

const major = Number(process.versions.node.split('.')[0]);
if (major < MIN_NODE) {
  die(
    `Node ${process.versions.node} is too old — this project needs Node ${MIN_NODE} or newer.`,
    'Tests rely on Node\'s native TypeScript support. Install from https://nodejs.org or use nvm.',
  );
}
ok(`Node ${process.versions.node}`);

if (!existsSync('package.json')) {
  die('No package.json here.', 'Run this from the project root.');
}

// 2 — dependencies
step(2, TOTAL, 'Installing dependencies');
if (!run('npm', ['install'])) {
  die('npm install failed.', 'Scroll up for the reason, then re-run `npm run setup`.');
}
ok('Dependencies installed');

// 3 — git hooks
step(3, TOTAL, 'Wiring up git hooks');
if (existsSync('.git')) {
  // Also done by the "prepare" script, but repeated here so setup works on an existing checkout.
  run('git', ['config', 'core.hooksPath', '.githooks']);
  ok('Pre-commit hook active (lint + typecheck)');
} else {
  console.log(`${c.dim}  Not a git repository — skipping.${c.off}`);
}

if (has('--no-start')) {
  console.log(`\n${c.green}${c.bold}Setup complete.${c.off} Start the app with ${c.bold}npm start${c.off}\n`);
  process.exit(0);
}

// 4 — start
const platform = ['--android', '--ios', '--web'].find(has);
step(4, TOTAL, `Starting Expo${platform ? ` (${platform.slice(2)})` : ''}`);
console.log(
  `${c.dim}  Expo Go is enough for most work. Ads need a development build —\n` +
    `  see docs/development.md. Press Ctrl+C to stop.${c.off}`,
);

process.exit(run('npx', ['expo', 'start', ...(platform ? [platform] : [])]) ? 0 : 1);
