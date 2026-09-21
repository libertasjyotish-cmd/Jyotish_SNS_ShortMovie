import { GeneratedScript } from '@/services/gemini';
import { Language, Pattern } from '@/services/sheets';

export interface ScriptIssue {
  field: 'hook_text' | 'body_script' | 'cta_text' | 'script';
  code:
    | 'fear_wording'
    | 'certainty_wording'
    | 'missing_recognition'
    | 'missing_individual_difference'
    | 'contains_url'
    | 'too_short'
    | 'too_long';
  detail: string;
}

/**
 * Wording that sells the video through fear rather than curiosity. Retention is meant to come
 * from the viewer wanting to check whether the reading applies to them, so these are rejected
 * even when the astrology behind them is sound.
 */
const FEAR_PATTERNS: Record<Language, RegExp> = {
  ja: /危険|警告|注意しないと|大変なこと|手遅れ|今すぐ|不運|災難|絶望|悪化|取り返しのつかない/,
  en: /\b(danger|dangerous|warning|beware|too late|act now|hurry|misfortune|disaster|doomed|irreversible)\b/i,
  es: /\b(peligro|peligroso|advertencia|cuidado|demasiado tarde|ahora mismo|desgracia|desastre)\b/i,
  pt: /\b(perigo|perigoso|aviso|cuidado|tarde demais|agora mesmo|desgra[çc]a|desastre)\b/i,
  id: /\b(bahaya|peringatan|hati-hati|terlambat|sekarang juga|kesialan|bencana)\b/i,
  ar: /خطر|تحذير|فات الوقت|الآن فورا|نكبة|كارثة/,
  fr: /(danger|dangereu|avertissement|m[ée]fiez-vous|trop tard|tout de suite|malheur|catastrophe|d[ée]sastre|irr[ée]versible)/i,
  de: /(gefahr|gef[äa]hrlich|warnung|vorsicht|zu sp[äa]t|sofort handeln|ungl[üu]ck|katastrophe|unumkehrbar)/i,
};

/** Promises of a fixed outcome; a transit is never a guarantee for an individual chart. */
const CERTAINTY_PATTERNS: Record<Language, RegExp> = {
  ja: /必ず|絶対に|確実に|100%/,
  en: /\b(guaranteed|will definitely|certainly will|always happens|100%)\b/i,
  es: /\b(garantizado|seguro que|siempre ocurre|100%)\b/i,
  pt: /\b(garantido|com certeza vai|sempre acontece|100%)\b/i,
  id: /\b(dijamin|pasti akan|selalu terjadi|100%)\b/i,
  ar: /مضمون|بالتأكيد سوف|دائما يحدث|100%/,
  fr: /(garanti|c'est certain|[àa] coup s[ûu]r|toujours le cas|100\s?%)/i,
  de: /(garantiert|mit sicherheit|hundertprozentig|passiert immer|100\s?%)/i,
};

/**
 * The sentence that lets the viewer judge for themselves whether the transit reaches them.
 * Without it the script states a fact about the sky and gives the viewer nothing to check.
 */
const RECOGNITION_PATTERNS: Record<Language, RegExp> = {
  ja: /効いて|届いて|当てはま|増えていません|出ている人|感じて/,
  en: /\b(the ones it reaches|if it reaches you|you may have noticed|notice|recognise|recognize)\b/i,
  es: /\b(a quienes les llega|puede que hayas notado|notas|reconoces)\b/i,
  pt: /\b(a quem chega|talvez tenha notado|percebe|reconhece)\b/i,
  id: /\b(yang terkena|mungkin kamu merasa|memperhatikan|mengenali)\b/i,
  ar: /من يصله|ربما لاحظت|تلاحظ/,
  fr: /(remarqu|ressent|ressens|reconna|si cela vous parle|ceux que cela touche)/i,
  de: /(bemerk|sp[üu]r|erkenn|wen es trifft|vielleicht hast du)/i,
};

/** The CTA has to leave the personal answer to the chart, or the video closes the loop itself. */
const INDIVIDUAL_DIFFERENCE_PATTERNS: Record<Language, RegExp> = {
  ja: /出生時刻|出生図|ホロスコープ|人によって|強さ|変わります/,
  en: /\b(birth time|birth chart|horoscope|varies|depends on)\b/i,
  es: /\b(hora de nacimiento|carta natal|hor[óo]scopo|var[íi]a|depende)\b/i,
  pt: /\b(hora de nascimento|carta natal|hor[óo]scopo|varia|depende)\b/i,
  id: /\b(waktu lahir|bagan lahir|horoskop|berbeda|tergantung)\b/i,
  ar: /وقت الميلاد|خريطة الميلاد|يختلف|يعتمد/,
  fr: /(heure de naissance|th[èe]me natal|carte du ciel|horoscope|varie|d[ée]pend)/i,
  de: /(geburtszeit|geburtshoroskop|geburtsbild|horoskop|unterschiedlich|h[äa]ngt|je nach)/i,
};

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|jp|io)\b/i;

/** Languages written without spaces, where length is counted in characters. */
const CHARACTER_COUNTED: Language[] = ['ja'];

/**
 * Length the narration has to land in to fit its pattern. Derived from measured Google Cloud
 * TTS output at the default speaking rate, with the margin the re-synthesis loop can absorb.
 */
const LENGTH_BOUNDS: Record<Pattern, Record<Language, { min: number; max: number }>> = {
  '30s': {
    ja: { min: 130, max: 185 },
    en: { min: 45, max: 70 },
    es: { min: 60, max: 95 },
    pt: { min: 60, max: 95 },
    id: { min: 60, max: 95 },
    ar: { min: 60, max: 95 },
    fr: { min: 60, max: 95 },
    de: { min: 55, max: 85 },
  },
  '65s': {
    ja: { min: 350, max: 460 },
    en: { min: 140, max: 200 },
    es: { min: 140, max: 200 },
    pt: { min: 140, max: 200 },
    id: { min: 140, max: 200 },
    ar: { min: 140, max: 200 },
    fr: { min: 140, max: 200 },
    de: { min: 130, max: 185 },
  },
};

export function scriptLength(text: string, language: Language): number {
  if (CHARACTER_COUNTED.includes(language)) {
    return text.replace(/\s/g, '').length;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Checks a generated script against the rules the prompt is asked to follow. Generation is
 * billed and the sky facts come from the transit reference, so issues are reported for review
 * rather than throwing the script away.
 */
export function lintScript(
  script: GeneratedScript,
  language: Language,
  pattern: Pattern,
): ScriptIssue[] {
  const issues: ScriptIssue[] = [];
  const fields: { field: ScriptIssue['field']; text: string }[] = [
    { field: 'hook_text', text: script.hook_text },
    { field: 'body_script', text: script.body_script },
    { field: 'cta_text', text: script.cta_text },
  ];

  for (const { field, text } of fields) {
    const fear = text.match(FEAR_PATTERNS[language]);
    if (fear) {
      issues.push({ field, code: 'fear_wording', detail: fear[0] });
    }
    const certainty = text.match(CERTAINTY_PATTERNS[language]);
    if (certainty) {
      issues.push({ field, code: 'certainty_wording', detail: certainty[0] });
    }
    const url = text.match(URL_PATTERN);
    if (url) {
      issues.push({ field, code: 'contains_url', detail: url[0] });
    }
  }

  if (!RECOGNITION_PATTERNS[language].test(`${script.hook_text} ${script.body_script}`)) {
    issues.push({
      field: 'body_script',
      code: 'missing_recognition',
      detail: 'no sentence lets the viewer check whether the transit reaches them',
    });
  }

  if (!INDIVIDUAL_DIFFERENCE_PATTERNS[language].test(script.cta_text)) {
    issues.push({
      field: 'cta_text',
      code: 'missing_individual_difference',
      detail: 'the CTA does not leave the personal answer to the birth chart',
    });
  }

  const total = fields.reduce((sum, { text }) => sum + scriptLength(text, language), 0);
  const { min, max } = LENGTH_BOUNDS[pattern][language];
  if (total < min) {
    issues.push({ field: 'script', code: 'too_short', detail: `${total} < ${min}` });
  } else if (total > max) {
    issues.push({ field: 'script', code: 'too_long', detail: `${total} > ${max}` });
  }

  return issues;
}

export function describeIssues(issues: ScriptIssue[]): string {
  return issues.map((issue) => `${issue.field}/${issue.code}: ${issue.detail}`).join('; ');
}
