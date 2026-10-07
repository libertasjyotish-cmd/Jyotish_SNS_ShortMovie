/**
 * Guards what a cover says in every language. A listing crops the still to its centre and
 * truncates the title beside it, so the plate is the only thing a browsing viewer reads: a cover
 * that names the category instead of the video lists every post of a language under one image.
 *
 * The hooks below are real ones from the evergreen sheet, one per language, because Japanese says
 * a whole hook in the characters the Latin-script languages spend on half of it.
 */
import { LANGUAGES, type Language } from '@/lib/languages';
import { weekPeriodLabel } from '@/lib/period';
import { SIGN_THEME_SERIES } from '@/lib/sign-themes';
import { MOON_SIGN_NOTE, TITLE_KEYWORDS, buildCoverText } from '@/lib/youtube-seo';
import { zodiacName } from '@/lib/zodiac-names';

const HOOKS: Record<Language, string> = {
  ja: '面倒な仕事ばかりなのは、あなたの星のせいです。',
  en: 'Your horoscope keeps missing because the twelve signs moved about 24 degrees since then.',
  es: 'El horóscopo no falla por ti: los doce signos se corrieron unos 24 grados desde entonces.',
  pt: 'O horóscopo não erra por sua causa: os doze signos andaram cerca de 24 graus desde então.',
  id: 'Horoskop sering tidak kena karena dua belas zodiak bergeser sekitar 24 derajat sejak dulu.',
  ar: 'الأبراج لا تخطئ بسببك: الأبراج الاثنا عشر انتقلت نحو 24 درجة منذ ذلك الحين.',
  fr: "L'horoscope ne tombe pas à côté par votre faute : les douze signes ont bougé de 24 degrés.",
  de: 'Dein Horoskop trifft nicht zu, weil die zwölf Zeichen sich um etwa 24 Grad verschoben haben.',
};

/** A plate holds roughly this much before the type shrinks below what a thumbnail shows. */
const HEADLINE_LIMIT = 90;
/** Below this the headline says nothing a viewer can act on. */
const MIN_HEADLINE = 6;
const WEEK = '2026-W41';
/** Connectors that promise a word the headline does not have, across all eight languages. */
const DANGLING_TAIL =
  /(\s)(and|or|but|while|about|with|of|to|in|on|for|that|the|y|que|de|del|da|do|en|em|con|com|por|para|el|la|dan|atau|dengan|untuk|dari|yang|et|ou|mais|dans|avec|pour|du|des|le|les|und|oder|aber|mit|auf|an|im|der|die|das|von|etwa|sich|و|أو|في|من|على|إلى|مع|أن)$/i;

const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (!condition) failures.push(label);
}

for (const lang of LANGUAGES) {
  const keywords = TITLE_KEYWORDS[lang];
  const period = weekPeriodLabel(WEEK, lang);
  const sign = zodiacName('Aries', lang) ?? 'Aries';

  const weekly = buildCoverText({ lang, zodiacSign: sign, period, hook: HOOKS[lang] });
  check(`${lang} weekly: sign missing`, weekly.sign === sign);
  check(`${lang} weekly: moon sign note missing`, weekly.note === MOON_SIGN_NOTE[lang]);
  check(`${lang} weekly: week missing`, weekly.period === period);

  for (const series of SIGN_THEME_SERIES) {
    const themed = buildCoverText({ lang, zodiacSign: sign, series, hook: HOOKS[lang] });
    check(`${lang} ${series}: sign missing`, themed.sign === sign);
    check(`${lang} ${series}: series missing`, themed.period.length > 0);
  }

  // A video with no sign: its headline has to come from the video itself.
  for (const hook of [HOOKS[lang], 'A'.repeat(200), '']) {
    const cover = buildCoverText({ lang, hook });
    const label = `${lang} themed hook=${hook.length}`;
    check(`${label}: headline too long: ${cover.sign.length}`, cover.sign.length <= HEADLINE_LIMIT);
    check(`${label}: headline too short`, cover.sign.length >= MIN_HEADLINE);
    check(`${label}: category label missing`, cover.note === keywords.theme);
    if (!hook) continue;
    check(`${label}: headline is the category, not the video`, cover.sign !== keywords.theme);
    check(
      `${label}: headline not taken from the hook: ${cover.sign}`,
      hook.startsWith(cover.sign.slice(0, MIN_HEADLINE)),
    );
    check(`${label}: headline cut mid-phrase: ${cover.sign}`, !DANGLING_TAIL.test(cover.sign));
    check(
      `${label}: headline cut mid-word: ${cover.sign}`,
      // A hook with no space inside the limit has nowhere to break.
      cover.sign === hook.trim() ||
        !hook.slice(0, cover.sign.length).includes(' ') ||
        ' 、,:：—–'.includes(hook.charAt(cover.sign.length)),
    );
  }
}

if (failures.length) {
  console.error(`Cover text check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`Cover text check passed for ${LANGUAGES.length} languages.`);
