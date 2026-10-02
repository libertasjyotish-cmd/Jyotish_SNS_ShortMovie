/**
 * Guards the invariants a sign title must keep in every language: the search keyword, the
 * moon-sign note and a usable part of the hook. Dropping any of them silently costs the
 * search traffic the titles exist for.
 */
import { LANGUAGES } from '@/lib/languages';
import { weekPeriodLabel } from '@/lib/period';
import { SIGN_THEME_SERIES } from '@/lib/sign-themes';
import { MOON_SIGN_NOTE, TITLE_KEYWORDS, buildYouTubeTitle } from '@/lib/youtube-seo';

const LONG_HOOK =
  'Have you noticed that your decisions at work keep slipping away from what you planned, ' +
  'again and again, and you cannot tell why it happens every single week lately';
const SIGN = 'Sagittarius';
const WEEK = '2026-W41';

const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (!condition) failures.push(label);
}

for (const lang of LANGUAGES) {
  for (const hook of [LONG_HOOK, 'Short hook', '']) {
    const period = weekPeriodLabel(WEEK, lang);
    const title = buildYouTubeTitle({ lang, zodiacSign: SIGN, hook, period });
    const label = `${lang} hook=${hook.length}`;
    check(`${label}: over 100 chars`, title.length <= 100);
    check(`${label}: sign name missing`, title.includes(SIGN));
    check(`${label}: weekly keyword missing`, title.includes(TITLE_KEYWORDS[lang].weekly));
    check(`${label}: moon sign note missing`, title.includes(MOON_SIGN_NOTE[lang]));
    if (hook) check(`${label}: hook missing`, title.includes(hook.slice(0, 12)));
  }
  for (const series of SIGN_THEME_SERIES) {
    const title = buildYouTubeTitle({ lang, zodiacSign: SIGN, hook: LONG_HOOK, series });
    check(`${lang} ${series}: over 100 chars`, title.length <= 100);
    check(`${lang} ${series}: moon sign note missing`, title.includes(MOON_SIGN_NOTE[lang]));
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('youtube title invariants ok');
