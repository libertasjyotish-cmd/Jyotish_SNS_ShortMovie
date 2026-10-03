import { readFileSync } from 'node:fs';

import { describeIssues, lintScript, scriptLength } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

interface Entry {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
}

const entries: Entry[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const entry of entries) {
  const script = { hook_text: entry.hook, body_script: entry.body, cta_text: entry.cta };
  const total =
    scriptLength(entry.hook, entry.lang) +
    scriptLength(entry.body, entry.lang) +
    scriptLength(entry.cta, entry.lang);
  const issues = lintScript(script, entry.lang, '30s');
  console.log(entry.id, entry.lang, total, issues.length ? describeIssues(issues) : 'OK');
}
