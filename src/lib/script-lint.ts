import { fixedCta } from '@/lib/fixed-cta';
import { normalizeDigits } from '@/lib/period';
import type { GeneratedScript } from '@/services/gemini';
import { Language, Pattern } from '@/services/sheets';

export interface ScriptIssue {
  field: 'hook_text' | 'body_script' | 'cta_text' | 'script';
  code:
    | 'fear_wording'
    | 'certainty_wording'
    | 'hook_announces_topic'
    | 'hook_too_long'
    | 'discouraged_wording'
    | 'cta_without_action'
    | 'contains_url'
    | 'missing_period'
    | 'missing_sign'
    | 'vague_house'
    | 'dangling_predicate'
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
 * Japanese sentences that take a person as their topic and then close on the chart instead of
 * on that person (「〜感じる人はこの部屋が出ています」). They read as a translation and shipped for
 * months, because every other check passes: the words are all allowed and the length fits.
 */
const PERSON_TOPIC = /(?:人|あなた|時期)(?:は|ほど|、)/;
const DANGLING_PREDICATES =
  /(?:ここ|この(?:部屋|配置|周期|細かさ|偏り|二日|日)|出方|位置|形|点数|図ごとの差|結論|担当|差|月)(?:が|は|も)?(?:です|でした|です。|出ています|出ます|効いています|動いていました|働いています|当たっています|合っていません|変わります|違います|違う|替わります|離れています|ズレています|別です)。?$/;

/** Sentences of Japanese narration, without the trailing empty piece. */
function japaneseSentences(text: string): string[] {
  return text
    .split(/(?<=。)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Openings that announce the video instead of naming something the viewer lives with. */
const HOOK_LECTURE_PATTERNS: Record<Language, RegExp> = {
  ja: /^(?:今週|今日|今回|この動画)|について解説|を解説|とは何か/,
  en: /^(?:this week|today|in this video|let's talk|here is)/i,
  es: /^(?:esta semana|hoy|en este video)/i,
  pt: /^(?:esta semana|hoje|neste v[íe]deo)/i,
  id: /^(?:pekan ini|minggu ini|hari ini|di video ini)/i,
  ar: /^(?:هذا الأسبوع|اليوم|في هذا الفيديو)/,
  fr: /^(?:cette semaine|aujourd'hui|dans cette vid[ée]o)/i,
  de: /^(?:diese woche|heute|in diesem video)/i,
};

/**
 * Terms the narration never uses because they read as jargon to the viewer the videos are
 * written for; the chart is named in the words the site itself uses.
 */
const DISCOURAGED_PATTERNS: Partial<Record<Language, RegExp>> = {
  ja: /出生図|出生時間|チャート|ネイタル/,
};

/** The CTA has to send the viewer somewhere, or the video earns no visit to the site. */
const CTA_ACTION_PATTERNS: Record<Language, RegExp> = {
  ja: /調べるには|確認できます|リンク|プロフィール|概要欄/,
  en: /\b(link|profile|bio|find out|check yours)\b/i,
  es: /\b(enlace|perfil|bio|averigua|consulta)\b/i,
  pt: /\b(link|perfil|bio|descubra|consulte)\b/i,
  id: /\b(tautan|link|profil|bio|cek|periksa)\b/i,
  ar: /الرابط|الملف الشخصي|تحقق|اكتشف/,
  fr: /(lien|profil|bio|d[ée]couvrez|v[ée]rifiez)/i,
  de: /(link|profil|bio|finde heraus|pr[üu]fe)/i,
};

/**
 * A reading names the house the transit falls in, counted from the sign it is written for.
 * Without the count the viewer is told a planet moved somewhere unnamed, which is the one thing
 * they cannot look up for themselves and the reason the video sends them to the site.
 */
const VAGUE_HOUSE_PATTERNS: Record<Language, RegExp> = {
  ja: /特定の(?:部屋|ハウス|場所|位置|領域)|ある部屋|どこかの部屋/,
  en: /\b(a (?:certain|particular|specific) (?:house|area|part)|some house)\b/i,
  es: /\b(?:una|cierta) (?:casa|zona|parte) (?:determinada|concreta|espec[íi]fica)\b|\bcierta casa\b/i,
  pt: /\b(?:uma|certa) (?:casa|[áa]rea|parte) (?:determinada|espec[íi]fica)\b|\bcerta casa\b/i,
  id: /\brumah (?:tertentu|tertentu itu)\b|\bbagian tertentu\b/i,
  ar: /بيت معين|منطقة معينة|جزء معين/,
  fr: /\b(?:une|certaine) (?:maison|zone|partie) (?:particuli[èe]re|pr[ée]cise|donn[ée]e)\b|\bcertaine maison\b/i,
  de: /\b(?:ein|einem) bestimmtes? Haus\b|\bbestimmten Bereich\b/i,
};

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|jp|io)\b/i;

/** Languages written without spaces, where length is counted in characters. */
const CHARACTER_COUNTED: Language[] = ['ja'];

/**
 * Room a sign reading needs on top of a theme script, in the unit that language counts: the
 * spoken week at the start, and the clause telling the viewer the sign meant here is the
 * sidereal Moon sign they can look up.
 */
const SIGN_ALLOWANCE: Record<Language, number> = {
  ja: 55,
  en: 24,
  es: 28,
  pt: 28,
  id: 24,
  ar: 24,
  fr: 28,
  de: 24,
};

/**
 * Longest hook, in the unit that language counts. The hook is on screen in full from the first
 * frame, so the viewer reads it before it is spoken and the limit only has to keep the narration
 * from still running at second five. It is a budget for one complete sentence, never a reason to
 * leave out a subject, an object or a particle.
 */
export const HOOK_BOUNDS: Record<Language, number> = {
  ja: 34,
  en: 12,
  es: 13,
  pt: 13,
  id: 13,
  ar: 13,
  fr: 13,
  de: 12,
};

/**
 * Length the narration has to land in to fit its pattern, closing included. Derived from measured
 * Google Cloud TTS output at the default speaking rate, with the margin the re-synthesis loop can
 * absorb. The short pattern is read in about 38 seconds so that the fixed closing does not eat the
 * sentences the viewer needs to recognise themselves in.
 */
const LENGTH_BOUNDS: Record<Pattern, Record<Language, { min: number; max: number }>> = {
  '30s': {
    ja: { min: 150, max: 213 },
    en: { min: 52, max: 81 },
    es: { min: 69, max: 109 },
    pt: { min: 69, max: 109 },
    id: { min: 69, max: 109 },
    ar: { min: 69, max: 109 },
    fr: { min: 69, max: 109 },
    de: { min: 63, max: 98 },
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

/**
 * Room the generated part of the script has, once the fixed closing is taken out of the budget.
 * The model is told this instead of the whole-script limit, so it never has to guess how much the
 * CTA it is not writing will cost.
 */
export function narrationBudget(
  language: Language,
  pattern: Pattern,
  period?: string,
): { min: number; max: number; unit: string } {
  const bounds = LENGTH_BOUNDS[pattern][language];
  const allowance = period ? SIGN_ALLOWANCE[language] : 0;
  const cta = scriptLength(fixedCta(language), language);
  return {
    min: Math.max(1, bounds.min + allowance - cta),
    max: Math.max(1, bounds.max + allowance - cta),
    unit: CHARACTER_COUNTED.includes(language) ? 'characters excluding spaces' : 'words',
  };
}

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
  /** Spoken week the reading covers; sign readings must say it out loud. */
  period?: string,
  /** Sign the reading is for, in the audience's language; it must be named out loud too. */
  signName?: string,
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
    const discouraged = text.match(DISCOURAGED_PATTERNS[language] ?? /(?!)/);
    if (discouraged) {
      issues.push({ field, code: 'discouraged_wording', detail: discouraged[0] });
    }
    const url = text.match(URL_PATTERN);
    if (url) {
      issues.push({ field, code: 'contains_url', detail: url[0] });
    }
  }

  if (language === 'ja') {
    for (const { field, text } of fields) {
      for (const sentence of japaneseSentences(text)) {
        if (PERSON_TOPIC.test(sentence) && DANGLING_PREDICATES.test(sentence)) {
          issues.push({ field, code: 'dangling_predicate', detail: sentence });
        }
      }
    }
  }

  const hook = script.hook_text.trim();
  if (HOOK_LECTURE_PATTERNS[language].test(hook)) {
    issues.push({
      field: 'hook_text',
      code: 'hook_announces_topic',
      detail: 'the hook announces the video instead of naming what the viewer lives with',
    });
  }

  const hookLength = scriptLength(hook, language);
  if (hookLength > HOOK_BOUNDS[language]) {
    issues.push({
      field: 'hook_text',
      code: 'hook_too_long',
      detail: `${hookLength} > ${HOOK_BOUNDS[language]}; too long to be read out before the clip moves on`,
    });
  }

  if (!CTA_ACTION_PATTERNS[language].test(script.cta_text)) {
    issues.push({
      field: 'cta_text',
      code: 'cta_without_action',
      detail: 'the CTA never sends the viewer to look their own reading up',
    });
  }

  if (period) {
    const spoken = normalizeDigits(`${script.hook_text} ${script.body_script}`);
    const days = normalizeDigits(period).match(/\d+/g) ?? [];
    if (!days.every((day) => new RegExp(`(?:^|\\D)${day}(?:\\D|$)`).test(spoken))) {
      issues.push({
        field: 'body_script',
        code: 'missing_period',
        detail: `the narration never says the week it covers (${period})`,
      });
    }
  }

  if (signName) {
    const vague = script.body_script.match(VAGUE_HOUSE_PATTERNS[language]);
    if (vague) {
      issues.push({ field: 'body_script', code: 'vague_house', detail: vague[0] });
    }

    const opening = `${script.hook_text} ${script.body_script}`;
    if (!opening.toLowerCase().includes(signName.toLowerCase())) {
      issues.push({
        field: 'body_script',
        code: 'missing_sign',
        detail: `the narration never says which sign it reads (${signName})`,
      });
    }
  }

  const total = fields.reduce((sum, { text }) => sum + scriptLength(text, language), 0);
  const bounds = LENGTH_BOUNDS[pattern][language];
  const allowance = period ? SIGN_ALLOWANCE[language] : 0;
  const min = bounds.min + allowance;
  const max = bounds.max + allowance;
  if (total < min) {
    issues.push({ field: 'script', code: 'too_short', detail: `${total} < ${min}` });
  } else if (total > max) {
    issues.push({ field: 'script', code: 'too_long', detail: `${total} > ${max}` });
  }

  return issues;
}

/**
 * The checks a script has to satisfy, phrased as instructions. A rewrite that is only told what
 * was wrong loops between two failures — fixing the recognition sentence by dropping the CTA
 * contrast and back — because the checks themselves were never stated to it.
 */
export function lintRequirements(
  language: Language,
  pattern: Pattern,
  period?: string,
  signName?: string,
): string[] {
  const budget = narrationBudget(language, pattern, period);

  return [
    `hook_text + body_script together: ${budget.min}-${budget.max} ${budget.unit}; hook_text alone at most ${HOOK_BOUNDS[language]}. The fixed closing is added by the app on top of this and is not yours to write or to count.`,
    'hook_text names something the viewer lives with; it never opens by announcing the video or the week.',
    'body_script lets the viewer tell whether this reaches them, in whatever words read naturally.',
    'No URL, domain or email in any field.',
    ...(period
      ? [`body_script says the week out loud exactly as "${period}", including its numbers.`]
      : []),
    ...(signName
      ? [
          `hook_text or the first sentence of body_script says the sign exactly as "${signName}", and body_script counts the house as an ordinal, never "a certain house".`,
        ]
      : []),
    ...(language === 'ja'
      ? [
          'Each sentence has one subject and a predicate that says something about that subject. Never close a sentence about a person on a noun phrase about the chart (「〜人はこの部屋が出ています」 is broken), and never write 出生図 / 出生時間 / チャート / ネイタル.',
        ]
      : []),
  ];
}

export function describeIssues(issues: ScriptIssue[]): string {
  return issues.map((issue) => `${issue.field}/${issue.code}: ${issue.detail}`).join('; ');
}
