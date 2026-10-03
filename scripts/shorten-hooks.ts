/**
 * Rewrites evergreen hooks that are too long to be spoken inside the first two seconds.
 *
 * A short-form feed decides on those two seconds whether to keep showing the clip, so the hook
 * has to land before the viewer scrolls. Only the hook is touched; body and CTA keep the reading.
 *
 * Usage: `npm run shorten:hooks -- [lang...] [--apply]` (prints the rewrite without --apply).
 */
import { GoogleGenAI, Type } from '@google/genai';
import { HOOK_BOUNDS, describeIssues, lintScript, scriptLength } from '@/lib/script-lint';
import { GoogleSheetsService, LANGUAGES, type EvergreenScript, type Language } from '@/services/sheets';

const BUDGET: Record<Language, string> = {
  ja: '24文字以内',
  en: '8 words or fewer',
  es: '9 palabras como máximo',
  pt: 'no máximo 9 palavras',
  id: 'maksimal 9 kata',
  ar: '9 كلمات كحد أقصى',
  fr: '9 mots au maximum',
  de: 'höchstens 8 Wörter',
};

const SCHEMA = {
  type: Type.OBJECT,
  properties: { hook_text: { type: Type.STRING } },
  required: ['hook_text'],
} as const;

function prompt(script: EvergreenScript, feedback?: string): string {
  return [
    `Shorten the opening line of this short video script, in ${script.lang_code}.`,
    `It must be spoken within two seconds: ${BUDGET[script.lang_code]}.`,
    'Rules:',
    '1. One sentence. No clause leading up to the point, nothing before the words that stop the scroll.',
    '2. Keep the zodiac sign name if the original has one, and keep the claim the original makes.',
    '3. Address the viewer, or contradict what they believe. Never announce the topic.',
    '4. Do not answer the question the body exists to answer, and do not borrow wording from the body.',
    '5. No fear wording, no guaranteed outcome, no URL.',
    feedback ? `Your previous attempt was rejected: ${feedback}. Fix it.` : '',
    '',
    `original hook: ${script.hook}`,
    `body (for context, do not rewrite): ${script.body}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Issues the hook itself is responsible for; body and CTA are left as they are. */
function hookIssues(script: EvergreenScript, hook: string): string {
  const issues = lintScript(
    { hook_text: hook, body_script: script.body, cta_text: script.cta },
    script.lang_code,
    '30s',
  ).filter((issue) => issue.field === 'hook_text');
  return issues.length ? describeIssues(issues) : '';
}

async function shorten(ai: GoogleGenAI, script: EvergreenScript): Promise<string> {
  let feedback: string | undefined;
  let last = script.hook;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt(script, feedback),
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    });
    const { hook_text: hook } = JSON.parse(response.text ?? '{}') as { hook_text: string };
    last = hook.trim();
    feedback = hookIssues(script, last);
    if (!feedback) return last;
  }
  throw new Error(`${script.script_id} (${script.lang_code}): ${feedback}`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const targets = args.filter((arg) => !arg.startsWith('--')) as Language[];
  const languages = targets.length ? targets : [...LANGUAGES];

  const sheets = new GoogleSheetsService();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const language of languages) {
    const scripts = await sheets.getEvergreenScripts(language);
    const long = scripts.filter(
      (script) => scriptLength(script.hook, language) > HOOK_BOUNDS[language],
    );
    const updates: { scriptId: string; lang_code: Language; hook: string }[] = [];
    for (const script of long) {
      const hook = await shorten(ai, script);
      console.log(`${language} ${script.script_id}\n  - ${script.hook}\n  + ${hook}`);
      updates.push({ scriptId: script.script_id, lang_code: language, hook });
    }
    if (apply) await sheets.updateEvergreenHooks(updates);
    console.log(
      `${language}: ${long.length}/${scripts.length} over ${HOOK_BOUNDS[language]}` +
        `${apply ? ' (written)' : ' (dry run)'}`,
    );
  }
}

void main();
