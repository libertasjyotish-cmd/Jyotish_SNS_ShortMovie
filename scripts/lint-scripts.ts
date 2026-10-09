import { readFileSync } from 'node:fs';

import { evergreenClosing, lintEvergreenEntry } from '@/lib/evergreen-cta';
import { describeIssues, scriptLength } from '@/lib/script-lint';
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
  const cta = evergreenClosing(entry.id, entry.lang, entry.cta);
  const total =
    scriptLength(entry.hook, entry.lang) +
    scriptLength(entry.body, entry.lang) +
    scriptLength(cta, entry.lang);
  const issues = lintEvergreenEntry(entry);
  console.log(entry.id, entry.lang, total, issues.length ? describeIssues(issues) : 'OK');
}
