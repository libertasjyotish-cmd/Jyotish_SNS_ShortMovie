import { readFileSync } from 'node:fs';

import { fixedCta } from '@/lib/fixed-cta';
import { describeIssues, lintScript, scriptLength } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

interface Entry {
  id: string;
  lang: Language;
  hook: string;
  body: string;
}

const entries: Entry[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const entry of entries) {
  // The closing is the same approved sentence in every video, so a hand-written script is
  // measured with that closing rather than with whatever CTA the file happens to carry.
  const cta = fixedCta(entry.lang);
  const script = { hook_text: entry.hook, body_script: entry.body, cta_text: cta };
  const total =
    scriptLength(entry.hook, entry.lang) +
    scriptLength(entry.body, entry.lang) +
    scriptLength(cta, entry.lang);
  const issues = lintScript(script, entry.lang, '30s');
  console.log(entry.id, entry.lang, total, issues.length ? describeIssues(issues) : 'OK');
}
