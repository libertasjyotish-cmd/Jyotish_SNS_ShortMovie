#!/usr/bin/env node
// Renders the paid-ad reels from drafts/ads/<lang>.json on the Cloud Run renderer.
//   node scripts/render-ads.mjs [lang] [id...]
// Output lands in gs://jyotish-sns-renders/ads/final/<id>.mp4 and is the version of record.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const RENDERER = 'https://jyotish-renderer-36815266278.asia-northeast1.run.app';
const BACKGROUNDS = 'https://storage.googleapis.com/jyotish-sns-renders/backgrounds';
const OUT_PREFIX = 'ads/final';
const GCLOUD = process.env.GCLOUD_BIN ?? 'gcloud';

const [lang = 'ja', ...only] = process.argv.slice(2);
const file = path.join(process.cwd(), 'drafts', 'ads', `${lang}.json`);
const scripts = JSON.parse(readFileSync(file, 'utf8')).filter(
  (s) => only.length === 0 || only.includes(s.id),
);
if (scripts.length === 0) throw new Error(`no ad scripts matched in ${file}`);

const run = (args) => execFileSync(GCLOUD, args, { encoding: 'utf8' }).trim();
const token = run(['auth', 'print-identity-token', `--audiences=${RENDERER}`]);
const cronSecret = run([
  'run', 'services', 'describe', 'jyotish-renderer', '--region', 'asia-northeast1',
  '--format', 'value(spec.template.spec.containers[0].env.filter("name:CRON_SECRET").extract(value))',
]).replace(/[[\]'"\s]/g, '');

for (const script of scripts) {
  const body = {
    task_id: script.id,
    language: lang,
    background_url: `${BACKGROUNDS}/ad-bgd-${script.background}.mp4`,
    hook: script.hook,
    body: script.body,
    cta: script.cta,
    theme: script.theme ?? 'light',
    pattern: script.pattern ?? '30s',
    target_min: 26,
    target_max: 32,
    brand: true,
    output_path: `${OUT_PREFIX}/${script.id}.mp4`,
  };
  const res = await fetch(`${RENDERER}/render`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Cron-Secret': cronSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(script.id, res.status, text.slice(0, 300));
  if (!res.ok) process.exitCode = 1;
}
