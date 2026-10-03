/**
 * Guards the invariants a sign title must keep in every language: the search keyword, the
 * moon-sign note and a usable part of the hook. Dropping any of them silently costs the
 * search traffic the titles exist for.
 *
 * The hooks below are real generated ones, one per language: Japanese writes a whole hook in
 * the characters other languages spend on half of it, so a title checked on Japanese alone
 * looks fine while every other language is cut mid-sentence.
 */
import { LANGUAGES, type Language } from '@/lib/languages';
import { weekPeriodTitleLabel } from '@/lib/period';
import { SIGN_THEME_SERIES } from '@/lib/sign-themes';
import { MOON_SIGN_NOTE, TITLE_KEYWORDS, buildYouTubeTitle } from '@/lib/youtube-seo';
import { zodiacName } from '@/lib/zodiac-names';

const HOOKS: Record<Language, string> = {
  ja: '予定通りに進まない毎日に疲れていませんか。',
  en: 'Aries, is your mind racing about work while your home life feels completely detached?',
  es: '¿Sientes que tus decisiones recientes en casa o en el trabajo se mueven sin rumbo fijo?',
  pt: 'Áries, percebeu que suas conversas diárias andam girando em torno de acordos pendentes?',
  id: 'Merasa keputusan karier terasa lambat dan penuh pertimbangan ulang minggu ini?',
  ar: 'هل تشعر أن هدوءك الداخلي يتأثر فجأة وأنت لم تغير شيئاً؟',
  fr: 'Bélier, vous sentez un frein persistant dans vos projets sans en comprendre la cause ?',
  de: 'Sie warten als Widder auf Klarheit und nichts bewegt sich?',
};

const SIGN = 'Aries';
/** A week inside one month, and one that crosses into the next: both have to stay readable. */
const WEEKS = ['2026-W41', '2026-W44'];
/** A hook is only worth its characters if a searcher can read a whole thought in it. */
const MIN_KEPT_HOOK = 20;
/** Connectors that promise a word the title does not have, checked across all eight languages. */
const DANGLING_TAIL =
  /(\s)(and|or|but|while|about|with|of|to|in|on|for|that|the|y|que|de|del|da|do|en|em|con|com|por|para|el|la|dan|atau|dengan|untuk|dari|yang|et|ou|mais|dans|avec|pour|du|des|le|les|und|oder|aber|mit|auf|an|im|der|die|das|zu|von|و|أو|في|من|على|إلى|مع|أن)$/i;

const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (!condition) failures.push(label);
}

for (const lang of LANGUAGES) {
  const sign = zodiacName(SIGN, lang) ?? SIGN;
  for (const week of WEEKS) {
    for (const hook of [HOOKS[lang], 'Short hook', '']) {
      const period = weekPeriodTitleLabel(week, lang);
      const title = buildYouTubeTitle({ lang, zodiacSign: sign, hook, period });
      const label = `${lang} ${week} hook=${hook.length}`;
      check(`${label}: over 100 chars`, title.length <= 100);
      check(`${label}: sign name missing`, title.includes(sign));
      check(`${label}: weekly keyword missing`, title.includes(TITLE_KEYWORDS[lang].weekly));
      check(`${label}: moon sign note missing`, title.includes(MOON_SIGN_NOTE[lang]));
      if (!hook) continue;

      const kept = title.slice(title.indexOf(': ') + 2, title.lastIndexOf(MOON_SIGN_NOTE[lang]));
      const shown = kept.replace(lang === 'ja' ? '｜' : ' | ', '').trim();
      check(`${label}: hook missing`, shown.length >= Math.min(hook.length, MIN_KEPT_HOOK));
      check(
        `${label}: hook cut mid-sentence: ${shown}`,
        shown === hook.trim() || /[?!.…\u061F\u3002\uFF1F\uFF01]$/.test(shown),
      );
      check(
        `${label}: hook ends on a dangling word: ${shown}`,
        !DANGLING_TAIL.test(shown.replace(/…$/, '').trim()),
      );
    }
  }
  for (const series of SIGN_THEME_SERIES) {
    const title = buildYouTubeTitle({ lang, zodiacSign: sign, hook: HOOKS[lang], series });
    check(`${lang} ${series}: over 100 chars`, title.length <= 100);
    check(`${lang} ${series}: moon sign note missing`, title.includes(MOON_SIGN_NOTE[lang]));
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('youtube title invariants ok');
