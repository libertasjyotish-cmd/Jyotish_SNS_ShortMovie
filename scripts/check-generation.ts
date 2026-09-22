/**
 * Generates scripts with the live Gemini prompt and reports the lint issues, so the prompt can be
 * judged by what it actually produces rather than by how it reads.
 */
import { GeminiService } from '@/services/gemini';
import { lintScript } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

const TRANSIT = [
  'Week 2026-W40 (sidereal, Lahiri).',
  'Jupiter transits Gemini all week.',
  'Saturn transits Pisces, retrograde.',
  'Mars enters Libra on 2026-10-02.',
  'Mercury transits Virgo.',
].join('\n');

const SIGNS = ['Aries', 'Cancer', 'Libra'];
const LANGS: Language[] = ['ja', 'en'];

async function main() {
  const gemini = new GeminiService();
  let failures = 0;

  for (const lang of LANGS) {
    for (const sign of SIGNS) {
      const generated = await gemini.generateScript({
        week_id: '2026-W40',
        lang_code: lang,
        target_type: 'Zodiac_Sign',
        zodiac_sign: sign,
        transit_reference: TRANSIT,
      });
      const first = (
        [
          ['30s', generated.script_30s],
          ['65s', generated.script_65s],
        ] as const
      ).flatMap(([pattern, script]) => lintScript(script, lang, pattern));
      let content = generated;
      if (first.length > 0) {
        content = await gemini.generateScript({
          week_id: '2026-W40',
          lang_code: lang,
          target_type: 'Zodiac_Sign',
          zodiac_sign: sign,
          transit_reference: TRANSIT,
          lint_feedback: first
            .map((issue) => `${issue.field}/${issue.code}: ${issue.detail}`)
            .join('; '),
        });
        console.log(`\n(retried ${lang} ${sign} after: ${first.map((i) => i.code).join(', ')})`);
      }

      for (const [pattern, script] of [
        ['30s', content.script_30s],
        ['65s', content.script_65s],
      ] as const) {
        const issues = lintScript(script, lang, pattern);
        failures += issues.length > 0 ? 1 : 0;
        console.log(`\n=== ${lang} ${sign} ${pattern} ===`);
        console.log(`hook: ${script.hook_text}`);
        console.log(`body: ${script.body_script}`);
        console.log(`cta : ${script.cta_text}`);
        console.log(issues.length === 0 ? 'lint: ok' : `lint: ${JSON.stringify(issues)}`);
      }
    }
  }

  console.log(`\nscripts with issues: ${failures}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
