/**
 * Translates the approved English theme scripts into one other language, retrying each script
 * with the lint feedback until it passes. Reads JSON lines on stdin, writes JSON lines on stdout.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { describeIssues, lintScript, scriptLength } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

interface ThemeScript {
  id: string;
  hook: string;
  body: string;
  cta: string;
  tags: string;
}

const TARGETS: Record<string, { name: string; length: string; note?: string }> = {
  es: { name: 'Español', length: '62 a 92 palabras en total' },
  pt: { name: 'Português', length: '62 a 92 palavras no total' },
  id: { name: 'Bahasa Indonesia', length: 'total 62 sampai 92 kata' },
  ar: {
    name: 'العربية',
    length: '62 إلى 92 كلمة إجمالاً',
    note: 'Right-to-left script. Keep the numeral 108 and write dasha as داشا.',
  },
  fr: { name: 'Français', length: '62 à 92 mots au total' },
  de: {
    name: 'Deutsch',
    length: 'insgesamt 58 bis 82 Wörter',
    note: 'Prefer short everyday words over long compound nouns.',
  },
};

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    hook_text: { type: Type.STRING },
    body_script: { type: Type.STRING },
    cta_text: { type: Type.STRING },
  },
  required: ['hook_text', 'body_script', 'cta_text'],
} as const;

function prompt(lang: string, script: ThemeScript, feedback?: string): string {
  const target = TARGETS[lang];
  return [
    `Translate this short video script into ${target.name} for a Jyotish (Indian astrology) channel.`,
    'It is not a lesson: the hook names something the viewer lives with, the body says how Jyotish reads it, and the CTA sends them to the site.',
    'Rules:',
    `1. Total length of the three fields together: ${target.length}. Count before answering.`,
    '2. Keep the meaning and the order of the original. Do not add or drop ideas.',
    '3. The hook must address the viewer directly (second person) and name the everyday situation.',
    '4. The body must contain a verb of noticing ("you notice", "you have noticed") so the viewer can tell whether it reaches them.',
    '5. cta_text keeps all three parts: (a) "to find out <the one thing left unanswered>"; (b) twelve sun signs are not enough, Jyotish combines the 108 subdivisions with the dasha periods; (c) check yours free through the link. Keep the numeral 108 and the word dasha.',
    '6. No URL, domain or email. No fear wording and no guarantee of a fixed outcome.',
    target.note ? `7. ${target.note}` : '',
    feedback ? `Your previous attempt was rejected: ${feedback}. Fix it.` : '',
    '',
    `hook_text: ${script.hook}`,
    `body_script: ${script.body}`,
    `cta_text: ${script.cta}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function translate(
  ai: GoogleGenAI,
  lang: Language,
  script: ThemeScript,
): Promise<{ hook: string; body: string; cta: string; issues: string }> {
  let feedback: string | undefined;
  let last = { hook: '', body: '', cta: '', issues: 'no attempt' };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt(lang, script, feedback),
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    });
    const parsed = JSON.parse(response.text ?? '{}') as {
      hook_text: string;
      body_script: string;
      cta_text: string;
    };
    const issues = lintScript(parsed, lang, '30s');
    last = {
      hook: parsed.hook_text,
      body: parsed.body_script,
      cta: parsed.cta_text,
      issues: issues.length ? describeIssues(issues) : '',
    };
    if (issues.length === 0) return last;
    feedback = last.issues;
  }
  return last;
}

async function main() {
  const lang = process.argv[2] as Language;
  if (!TARGETS[lang]) throw new Error(`unsupported target ${lang}`);
  const input = await new Response(process.stdin as unknown as ReadableStream).text();
  const scripts = input
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ThemeScript);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (const script of scripts) {
    const result = await translate(ai, lang, script);
    const words = scriptLength(`${result.hook} ${result.body} ${result.cta}`, lang);
    console.error(`${script.id} ${words}: ${result.issues || 'ok'}`);
    console.log(
      JSON.stringify({
        id: script.id,
        hook: result.hook,
        body: result.body,
        cta: result.cta,
        tags: script.tags,
        issues: result.issues,
      }),
    );
  }
}

void main();
