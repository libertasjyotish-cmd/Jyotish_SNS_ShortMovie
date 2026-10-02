import { describeIssues, lintScript } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

const [lang, hook, body, cta] = process.argv.slice(2);
const script = { hook_text: hook, body_script: body, cta_text: cta };
const words = `${hook} ${body} ${cta}`.trim().split(/\s+/).length;
console.log('words:', words, 'chars:', `${hook}${body}${cta}`.length);
const issues = lintScript(script, lang as Language, '30s');
console.log(issues.length ? describeIssues(issues) : 'OK');
