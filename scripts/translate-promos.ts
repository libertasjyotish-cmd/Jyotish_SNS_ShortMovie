/**
 * Translates the approved Japanese product-promotion scripts into the other dispatch languages
 * and writes a file `load:evergreen` can take. Unlike the weekly theme scripts, a promo keeps its
 * own product CTA, so the fixed "108 subdivisions / dasha" wording must not be forced in.
 *
 *   npm run translate:promos -- drafts/promo-compat-ja.json en es pt id ar fr de
 *   npm run translate:promos -- drafts/promo-compat-ja.json en --out drafts/promo-compat-en.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { describeIssues, lintScript, scriptLength } from '@/lib/script-lint';
import { isTransientGeminiError } from '@/services/gemini';
import { GoogleGenAI, Type } from '@google/genai';
import type { Language } from '@/services/sheets';

interface Entry {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
  hashtags?: string;
}

const TARGETS: Record<string, { name: string; length: string; note?: string }> = {
  en: { name: 'English', length: '48 to 68 words in total' },
  es: { name: 'Español', length: '62 a 92 palabras en total' },
  pt: { name: 'Português', length: '62 a 92 palavras no total' },
  id: { name: 'Bahasa Indonesia', length: 'total 62 sampai 92 kata' },
  ar: {
    name: 'العربية',
    length: '62 إلى 92 كلمة إجمالاً',
    note: 'Right-to-left script. Write dasha as داشا.',
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

function prompt(lang: string, entry: Entry, feedback?: string): string {
  const target = TARGETS[lang];
  return [
    `Translate this short video script into ${target.name}. It promotes a paid Jyotish (Indian astrology) report.`,
    'Rules:',
    `1. Total length of the three fields together: ${target.length}. Count before answering.`,
    '2. Keep the meaning, the order and the product described. Do not add or drop ideas.',
    '3. The hook is one short spoken line; keep it short enough to say in two seconds.',
    '4. cta_text keeps the original promise and sends the viewer to the link in the profile. Do not add the twelve sun signs, the 108 subdivisions or the dasha periods unless the original says so.',
    '5. No URL, domain or email. No fear wording and no guarantee of a fixed outcome. No price.',
    '6. Write for a reader of that language: natural sentences, every verb with its subject and object.',
    target.note ? `7. ${target.note}` : '',
    feedback ? `Your previous attempt was rejected: ${feedback}. Fix it.` : '',
    '',
    `hook_text: ${entry.hook}`,
    `body_script: ${entry.body}`,
    `cta_text: ${entry.cta}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function translate(ai: GoogleGenAI, lang: Language, entry: Entry): Promise<Entry | null> {
  let feedback: string | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    let text: string;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt(lang, entry, feedback),
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
      });
      text = response.text ?? '{}';
    } catch (error) {
      if (!isTransientGeminiError(error)) throw error;
      continue;
    }
    const parsed = JSON.parse(text) as {
      hook_text: string;
      body_script: string;
      cta_text: string;
    };
    const issues = lintScript(parsed, lang, '30s');
    const length = scriptLength(
      `${parsed.hook_text} ${parsed.body_script} ${parsed.cta_text}`,
      lang,
    );
    if (issues.length === 0) {
      console.error(`${entry.id} ${lang} ${length}: ok`);
      return {
        id: entry.id,
        lang,
        hook: parsed.hook_text,
        body: parsed.body_script,
        cta: parsed.cta_text,
        hashtags: entry.hashtags,
      };
    }
    feedback = describeIssues(issues);
    console.error(`${entry.id} ${lang} ${length}: ${feedback}`);
  }
  return null;
}

async function main() {
  const [path, ...rest] = process.argv.slice(2);
  if (!path) throw new Error('usage: translate-promos <file.json> <lang...> [--out <file>]');
  const outIndex = rest.indexOf('--out');
  const out = outIndex === -1 ? null : rest[outIndex + 1];
  const langs = (outIndex === -1 ? rest : rest.slice(0, outIndex)) as Language[];
  for (const lang of langs) {
    if (!TARGETS[lang]) throw new Error(`unsupported target ${lang}`);
  }

  const entries = JSON.parse(readFileSync(path, 'utf8')) as Entry[];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const target = out ?? path.replace(/-ja\.json$/, '-all.json');
  const done: Entry[] = existsSync(target)
    ? (JSON.parse(readFileSync(target, 'utf8')) as Entry[])
    : [];
  for (const lang of langs) {
    for (const entry of entries) {
      if (done.some((kept) => kept.id === entry.id && kept.lang === lang)) continue;
      const translated = await translate(ai, lang, entry);
      if (!translated) continue;
      done.push(translated);
      writeFileSync(target, `${JSON.stringify(done, null, 2)}\n`);
    }
  }
  console.error(`wrote ${done.length} scripts to ${target}`);
}

void main();
