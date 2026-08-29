import { Language } from '@/services/sheets';

/**
 * Words the Japanese TTS voice mispronounces or skips, mapped to kana spellings.
 * Applied to the narration only; the on-screen text keeps the original wording.
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
  [/月星座/g, 'つきせいざ'],
];

export function applyReadingHints(text: string, language: Language): string {
  if (language !== 'ja') return text;
  return JA_READINGS.reduce((acc, [pattern, reading]) => acc.replace(pattern, reading), text);
}
