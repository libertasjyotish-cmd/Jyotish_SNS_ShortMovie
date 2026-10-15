import { Language } from '@/services/sheets';

/**
 * Words the Japanese TTS voice mispronounces or skips, mapped to kana spellings.
 * Applied to the narration only; the on-screen text keeps the original wording.
 *
 * A kana spelling is written in katakana where hiragana would be read as separate
 * words: the voice pauses inside a long hiragana run, so `つきせいざ` comes out as
 * two words while `ツキセイザ` is read as one.
 */
const JA_READINGS: Array<[RegExp, string]> = [
  [/牡羊座/g, 'おひつじ座'],
  [/牡牛座/g, 'おうし座'],
  [/双子座/g, 'ふたご座'],
  [/蟹座/g, 'かに座'],
  [/獅子座/g, 'しし座'],
  [/乙女座/g, 'おとめ座'],
  [/天秤座/g, 'てんびん座'],
  [/蠍座/g, 'さそり座'],
  [/射手座/g, 'いて座'],
  [/山羊座/g, 'やぎ座'],
  [/水瓶座/g, 'みずがめ座'],
  [/魚座/g, 'うお座'],
  [/月星座/g, 'ツキセイザ'],
  [/太陽星座/g, 'タイヨウセイザ'],
  // 「の方」 addressing a person is かた; the direction sense keeps its own wording.
  [/(座|人|あなた|読者)の方(?=[はにへもで、。]|$)/g, '$1のかた'],
];

/** Clause endings the voice runs straight through when no comma follows. */
const JA_BREATHS = [
  'ですが',
  'ますが',
  'ので',
  'のに',
  'ても',
  'たら',
  'ながら',
  'けれど',
  'から',
];
/** Characters already carrying a pause, so no comma is added after them. */
const JA_PAUSES = '、。．.!?！？「」';
/** Shortest clause worth a breath, so a comma is not added every few characters. */
const MIN_CLAUSE = 8;

/** Commas where a clause would otherwise be read in one breath with the next. */
export function insertBreathCommas(text: string): string {
  let out = '';
  let clause = 0;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    out += char;
    clause = JA_PAUSES.includes(char) ? 0 : clause + 1;
    const next = text[i + 1];
    if (!next || JA_PAUSES.includes(next) || clause < MIN_CLAUSE) continue;
    if (JA_BREATHS.some((ending) => out.endsWith(ending))) {
      out += '、';
      clause = 0;
    }
  }
  return out;
}

export function applyReadingHints(text: string, language: Language): string {
  if (language !== 'ja') return text;
  const read = JA_READINGS.reduce(
    (acc, [pattern, reading]) => acc.replace(pattern, reading),
    text,
  );
  return insertBreathCommas(read);
}
