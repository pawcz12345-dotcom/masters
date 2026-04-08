/**
 * Saves a round snapshot to data/snapshots/rN.json and commits it.
 * Called by GitHub Actions after each revalidation pass.
 *
 * Logic:
 *  - state === 'pre'              → overwrite r0.json (pre-tournament, keep fresh until R1)
 *  - state === 'post', period = N → save rN.json once (never overwrite a completed round)
 *  - state === 'in'               → do nothing (round in progress)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SNAPSHOTS_DIR = path.join(ROOT, 'data', 'snapshots');

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';

async function fetchESPN() {
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  const data = await res.json();

  const event =
    data.events?.find((e) => e.name?.includes('Masters Tournament')) ??
    data.events?.[0];
  if (!event) throw new Error('No Masters event');

  const competition = event.competitions?.[0];
  const status = {
    state: event.status?.type?.state ?? 'pre',
    period: competition?.status?.period ?? 0,
    detail: competition?.status?.type?.detail ?? '',
    shortDetail: competition?.status?.type?.shortDetail ?? '',
  };
  const competitors = competition?.competitors ?? [];
  return { status, competitors };
}

function readSnapshot(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, filename), 'utf8'));
  } catch {
    return { saved: false };
  }
}

function writeAndCommit(filename, data) {
  const filepath = path.join(SNAPSHOTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${filename}`);

  execSync('git config user.email "github-actions@github.com"');
  execSync('git config user.name "GitHub Actions"');
  execSync(`git add data/snapshots/${filename}`);

  try {
    execSync(`git commit -m "chore: save snapshot ${filename} [skip ci]"`);
    execSync('git push');
    console.log('Committed and pushed');
  } catch {
    console.log('Nothing to commit or push failed (snapshot unchanged)');
  }
}

async function main() {
  const { status, competitors } = await fetchESPN();
  console.log(`ESPN state=${status.state} period=${status.period}`);

  let filename;
  let allowOverwrite = false;

  if (status.state === 'pre') {
    // Keep overwriting pre-tournament snapshot so odds stay fresh
    filename = 'r0.json';
    allowOverwrite = true;
  } else if (status.state === 'post') {
    filename = `r${status.period}.json`;
    allowOverwrite = false; // never overwrite a completed round
  } else {
    console.log('Round in progress — skipping snapshot');
    return;
  }

  const existing = readSnapshot(filename);
  if (existing.saved && !allowOverwrite) {
    console.log(`${filename} already saved — skipping`);
    return;
  }

  writeAndCommit(filename, {
    saved: true,
    round: status.period,
    savedAt: new Date().toISOString(),
    status,
    competitors,
  });
}

main().catch((err) => {
  console.error('save-snapshot failed:', err);
  process.exit(1);
});
