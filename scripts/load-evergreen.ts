/**
 * Loads hand-written scripts from a JSON file into `Evergreen_Scripts`, linting each one first
 * and skipping ids the sheet already holds for that language, so a re-run after a partial load
 * is safe. `post` on an event script is the date it goes out; it is stored as the `week_id` the
 * script is tied to.
 *
 *   npm run load:evergreen drafts/event-scripts.json
 *   npm run load:evergreen drafts/event-scripts.json -- --dry-run
 */
import { readFileSync } from 'node:fs';

import { lintEvergreenEntry } from '@/lib/evergreen-cta';
import { describeIssues } from '@/lib/script-lint';
import { isEventScriptId, isoWeekId, PROMO_DAY } from '@/lib/schedule';
import { EvergreenScript, GoogleSheetsService, Language } from '@/services/sheets';

interface Entry {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
  /** Posting date, `YYYY-MM-DD`. Required on event scripts. */
  post?: string;
  /** Defaults to `PROMO_DAY`, the day the promotions run. */
  day?: string;
  hashtags?: string;
}

function toScript(entry: Entry): EvergreenScript {
  if (isEventScriptId(entry.id) && !entry.post) {
    throw new Error(`${entry.id}: an event script needs a post date`);
  }
  const issues = lintEvergreenEntry(entry);
  if (issues.length > 0) throw new Error(`${entry.id} ${entry.lang}: ${describeIssues(issues)}`);

  return {
    script_id: entry.id,
    day_of_week: entry.day ?? PROMO_DAY,
    lang_code: entry.lang,
    hook: entry.hook,
    body: entry.body,
    cta: entry.cta,
    hashtags: entry.hashtags ?? '',
    enabled: true,
    last_used_week: '',
    week_id: entry.post ? isoWeekId(new Date(`${entry.post}T00:00:00Z`)) : '',
  };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('usage: load-evergreen <file.json> [--dry-run]');
  const dryRun = process.argv.includes('--dry-run');

  const entries = JSON.parse(readFileSync(path, 'utf8')) as Entry[];
  const scripts = entries.map(toScript);
  for (const script of scripts) {
    console.log(script.script_id, script.lang_code, script.week_id || 'rotating');
  }
  if (dryRun) return;

  const added = await new GoogleSheetsService().addEvergreenScripts(scripts);
  console.log(`added ${added.length} of ${scripts.length} rows`);
}

void main();
