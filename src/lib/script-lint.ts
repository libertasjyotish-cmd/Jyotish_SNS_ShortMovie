import { normalizeDigits } from '@/lib/period';
import { GeneratedScript } from '@/services/gemini';
import { Language, Pattern } from '@/services/sheets';

export interface ScriptIssue {
  field: 'hook_text' | 'body_script' | 'cta_text' | 'script';
  code:
    | 'fear_wording'
    | 'certainty_wording'
    | 'missing_recognition'
    | 'missing_individual_difference'
    | 'hook_not_addressed'
    | 'discouraged_wording'
    | 'weak_cta'
    | 'contains_url'
    | 'missing_period'
    | 'missing_sign'
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
  ja: /効い|効く|届い|届く|当てはま|出ている人|感じ|心当た|覚え|思い当た|気づ/,
  en: /\b(the ones it reaches|if it reaches you|you may have noticed|notice|recognise|recognize)\b/i,
  es: /\b(a quienes les llega|puede que hayas notado|has notado|te das cuenta|notas|percibes|sientes|experimentas|reconoces)\b/i,
  pt: /\b(a quem chega|talvez tenha notado|percebe|reconhece)\b/i,
  id: /\b(yang terkena|mungkin kamu merasa|memperhatikan|perhatikan|menyadari|sadar|terasa|kamu rasakan|mengenali)\b/i,
  ar: /من يصله|ربما لاحظت|تلاحظ|لاحظت|تشعر|تجد|يتكرر/,
  fr: /(remarqu|ressent|ressens|reconna|si cela vous parle|ceux que cela touche)/i,
  de: /(bemerk|sp[üu]r|erkenn|wen es trifft|vielleicht hast du)/i,
};

/** The CTA has to leave the personal answer to the chart, or the video closes the loop itself. */
const INDIVIDUAL_DIFFERENCE_PATTERNS: Record<Language, RegExp> = {
  ja: /出生時刻|生まれた時|ホロスコープ|108の区分|ダシャー|あなた|人によって|強さ|変わります/,
  en: /\b(birth time|birth chart|horoscope|varies|depends on|108|dasha)\b/i,
  es: /(?:^|[^a-z\u00c0-\u024f])(hora de nacimiento|carta natal|hor[óo]scopo|var[íi]a|depende|108|dasha)(?![a-z\u00c0-\u024f])/i,
  pt: /(?:^|[^a-z\u00c0-\u024f])(hora de nascimento|carta natal|hor[óo]scopo|varia|depende|108|dasha)(?![a-z\u00c0-\u024f])/i,
  id: /\b(waktu lahir|bagan lahir|horoskop|berbeda|tergantung|108|dasha)\b/i,
  ar: /وقت الميلاد|خريطة الميلاد|يختلف|يعتمد|108|داشا/,
  fr: /(heure de naissance|th[èe]me natal|carte du ciel|horoscope|varie|d[ée]pend|108|dasha)/i,
  de: /(geburtszeit|geburtshoroskop|geburtsbild|horoskop|unterschiedlich|h[äa]ngt|je nach|108|dasha)/i,
};

/**
 * The hook either asks the viewer about their own life or contradicts what they believe, since
 * a video only earns a visit to the site when the viewer cannot settle the question alone.
 */
const HOOK_ADDRESSED_PATTERNS: Record<Language, RegExp> = {
  ja: /[?？]|ますか|ませんか|ですか|でしょうか|あなた|自分|なら|ではありません|ではなく|違います|人へ|人は|人、|か。/,
  en: /\?|\byou(r|rs)?\b|\bis not\b|\bisn't\b|\bnot because\b/i,
  /**
   * Spanish drops the pronoun, so the second person often shows only in the verb ending;
   * the forms listed are the ones the hooks are written with.
   */
  es: /[?¿]|(?:^|[^a-z\u00c0-\u024f])(tu|tus|t[úu]|te|ti|contigo|est[áa]s|llevas|eliges|sigues|sientes|notas|vuelves|ganas|puedes|tienes|quieres|haces|dices|crees|piensas|acabas|terminas)(?![a-z\u00c0-\u024f])|\bno es\b/i,
  pt: /\?|(?:^|[^a-z\u00c0-\u024f])(voc[êe]|teu|tua|seu|sua|te|n[ãa]o [ée])(?![a-z\u00c0-\u024f])/i,
  id: /\?|\b(kamu|anda)\b|\b\w+mu\b|\bbukan\b/i,
  /** The trailing kaf is the second-person possessive, which is how Arabic addresses the viewer. */
  ar: /[?؟]|أنت|لديك|عندك|ليس|تجد|تشعر|تلاحظ|كل مرة|تكرر|[ء-ي]ك(?![ء-ي])/,
  fr: /\?|(?:^|[^a-z\u00c0-\u024f])(vous|votre|vos|tu|ton|ta|tes)(?![a-z\u00c0-\u024f])|\bn'est pas\b/i,
  de: /\?|\b(du|dich|dir|dein|deine|deinem|deinen|deiner|euch|sie|ihr|ihre)\b|\bnicht\b/i,
};

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

/**
 * The CTA earns the visit by naming what the twelve sun signs cannot settle and the finer
 * divisions Jyotish reads instead; without that contrast it reads as a generic forecast.
 */
const CTA_DIFFERENTIATION_PATTERNS: Record<Language, RegExp> = {
  ja: /12の太陽星座|12星座|108の区分|27の宿|ダシャー/,
  en: /\b(twelve sun signs|12 sun signs|108 divisions|27 lunar mansions|dasha)\b/i,
  es: /\b(doce signos solares|12 signos|108 divisiones|27 mansiones|dasha)\b/i,
  pt: /\b(doze signos solares|12 signos|108 divis[õo]es|27 mans[õo]es|dasha)\b/i,
  id: /\b(dua belas zodiak|12 zodiak|108 pembagian|27 rasi bulan|dasha)\b/i,
  ar: /الأبراج الشمسية الاثني عشر|١٢ برجا|108 قسم|27 منزلا|داشا/,
  fr: /(douze signes solaires|12 signes|108 divisions|27 demeures|dasha)/i,
  de: /(zw[öo]lf sonnenzeichen|12 sternzeichen|108 abschnitte|27 mondh[äa]user|dasha)/i,
};

/** The CTA has to send the viewer somewhere; naming the difference alone converts nobody. */
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

  if (!RECOGNITION_PATTERNS[language].test(`${script.hook_text} ${script.body_script}`)) {
    issues.push({
      field: 'body_script',
      code: 'missing_recognition',
      detail: 'no sentence lets the viewer check whether the transit reaches them',
    });
  }

  const hook = script.hook_text.trim();
  if (
    !HOOK_ADDRESSED_PATTERNS[language].test(hook) ||
    HOOK_LECTURE_PATTERNS[language].test(hook)
  ) {
    issues.push({
      field: 'hook_text',
      code: 'hook_not_addressed',
      detail: 'the hook announces a topic instead of naming what the viewer lives with',
    });
  }

  if (!INDIVIDUAL_DIFFERENCE_PATTERNS[language].test(script.cta_text)) {
    issues.push({
      field: 'cta_text',
      code: 'missing_individual_difference',
      detail: 'the CTA does not leave the personal answer to the birth chart',
    });
  }

  if (
    !CTA_DIFFERENTIATION_PATTERNS[language].test(script.cta_text) ||
    !CTA_ACTION_PATTERNS[language].test(script.cta_text)
  ) {
    issues.push({
      field: 'cta_text',
      code: 'weak_cta',
      detail: 'the CTA does not contrast the twelve sun signs and send the viewer to look it up',
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

export function describeIssues(issues: ScriptIssue[]): string {
  return issues.map((issue) => `${issue.field}/${issue.code}: ${issue.detail}`).join('; ');
}
