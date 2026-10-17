/**
 * The English weekly 30s reading, assembled from fixed sentences like the Japanese one. The
 * placement and the worry are chosen by `pickWeekly()`, so both languages ask the same
 * question for the same sky; only the wording below is English.
 */
import { pickWeekly, TemplateScript } from '@/lib/weekly-template';
import type { Sign } from '@/lib/placements';

/** `hook` follows "<Sign>, ", `reason` follows "If you ", `use` follows "This is a good time to ". */
type EnWorry = [hook: string, reason: string, use: string];

const EN_SIGN: Record<Sign, string> = {
  Aries: 'Aries', Taurus: 'Taurus', Gemini: 'Gemini', Cancer: 'Cancer', Leo: 'Leo', Virgo: 'Virgo',
  Libra: 'Libra', Scorpio: 'Scorpio', Sagittarius: 'Sagittarius', Capricorn: 'Capricorn',
  Aquarius: 'Aquarius', Pisces: 'Pisces',
};

const EN_PLANET: Record<string, string> = {
  Sun: 'the Sun', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus',
  Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu',
};

const EN_NATURE: Record<string, string> = {
  Sun: 'the Sun, the planet of self-expression,',
  Mars: 'Mars, the planet of drive and action,',
  Mercury: 'Mercury, the planet of thought and speech,',
  Jupiter: 'Jupiter, the planet of growth,',
  Venus: 'Venus, the planet of love and comfort,',
  Saturn: 'Saturn, the planet of duty and patience,',
  Rahu: 'Rahu, which magnifies desire,',
  Ketu: 'Ketu, which loosens attachment,',
};

const EN_HOUSE_FIELD: Record<number, string> = {
  1: 'how you see yourself',
  2: 'money, words and what you value',
  3: 'everyday communication and your drive to act',
  4: 'home and peace of mind',
  5: 'romance, joy and your talents',
  6: 'daily duties and your health',
  7: 'your close relationships',
  8: 'how you face sudden change',
  9: 'your beliefs and direction in life',
  10: 'your work and standing',
  11: 'income growth and friendships',
  12: 'how you rest and let go',
};

/** Same order as `JA_WORRIES`: index i here is the same worry as index i there. */
const EN_WORRIES: Record<number, EnWorry[]> = {
  1: [
    ['are you struggling to feel sure of yourself?', 'find it hard to feel sure of yourself', 'notice your strengths again, one at a time.'],
    ['are you unsure where to even begin?', 'feel unsure where to begin', 'choose one small first step.'],
    ['do you feel rushed when you compare yourself to others?', 'feel rushed when you compare yourself to others', 'find your own pace again.'],
    ['do your days feel like they just slip by?', 'feel your days just slip by', 'remember what you truly want to do.'],
    ['do you still feel tired even after resting?', 'still feel tired even after resting', 'put your health first.'],
  ],
  2: [
    ['are money worries hard to shake right now?', 'find money worries hard to shake', 'look again at what truly makes you feel secure.'],
    ['do you feel money never stays with you?', 'feel money never stays with you', 'calmly rethink how you spend.'],
    ['is it hard to put your feelings into words?', 'find it hard to put your feelings into words', 'practise saying what you really feel.'],
    ['are you afraid of losing what you have?', 'feel afraid of losing what you have', 'choose again what truly matters to you.'],
    ['are you underestimating your own worth?', 'underestimate your own worth', 'take honest stock of what you can do.'],
  ],
  3: [
    ['are you struggling to find the courage to act?', 'struggle to find the courage to act', 'build up small actions one by one.'],
    ['do you feel your thoughts are not getting across?', 'feel your thoughts are not getting across', 'calmly try a new way of expressing yourself.'],
    ['do you feel you work hard but go nowhere?', 'feel you work hard but go nowhere', 'recognise how far your effort has brought you.'],
    ['are you holding back too much around people at work?', 'hold back too much around people at work', 'share your own ideas without apology.'],
    ['do you want to start something new but feel stuck?', 'want to start something new but feel stuck', 'let yourself simply try.'],
  ],
  4: [
    ['do you find it hard to relax even at home?', 'find it hard to relax even at home', 'find again the routines that calm you.'],
    ['is it hard to be open with your family?', 'find it hard to be open with your family', 'rebuild a sense of safety with the people closest to you.'],
    ['are your ups and downs pulling you around?', 'feel pulled around by your ups and downs', 'shape days that keep your heart steady.'],
    ['do you feel there is nowhere you can truly relax?', 'feel there is nowhere you can truly relax', 'grow a place of calm inside yourself.'],
    ['are family matters keeping you from feeling at ease?', 'feel family matters keep you from being at ease', 'separate what you can change from what you cannot.'],
  ],
  5: [
    ['are you struggling to enjoy the things you love?', 'struggle to enjoy the things you love', 'look again for what truly moves you.'],
    ['do you like someone but hesitate to take the next step?', 'like someone but hesitate to take the next step', 'get clear on the kind of relationship you want.'],
    ['are you doubting your own talents?', 'doubt your own talents', 'polish one thing you are good at.'],
    ['do you want a new challenge but fear failing?', 'want a new challenge but fear failing', 'try small and build experience.'],
    ['do you meet people but find nothing lasts?', 'meet people but find nothing lasts', 'rethink the kind of connection you truly enjoy.'],
  ],
  6: [
    ['are you worn out from carrying every duty alone?', 'feel worn out from carrying every duty alone', 'choose what you can hand over to others.'],
    ['are relationships at work wearing you down?', 'feel worn down by relationships at work', 'learn the distance that protects you.'],
    ['do you struggle to say no and overfill your days?', 'struggle to say no and overfill your days', 'rethink what you agree to take on.'],
    ['do you feel guilty whenever you rest?', 'feel guilty whenever you rest', 'treat rest as part of your duties.'],
    ['do you feel chased by how busy every day is?', 'feel chased by how busy every day is', 'reshape your days into a pace you can keep.'],
  ],
  7: [
    ['are you unsure what someone close really feels?', 'feel unsure what someone close really feels', 'listen to the other person all the way through.'],
    ['do you give in too much in your relationships?', 'give in too much in your relationships', 'tell the other person what you want too.'],
    ['are you hesitant to let people get close?', 'hesitate to let people get close', 'slowly deepen ties with people you trust.'],
    ['is time passing while your true feelings go unsaid?', 'feel time passing while your true feelings go unsaid', 'calmly say what you really mean.'],
    ['do you feel you are the only one trying?', 'feel you are the only one trying', 'rethink how you and others support each other.'],
  ],
  8: [
    ['is uncertainty about the future hard to shake?', 'find uncertainty about the future hard to shake', 'focus on what you can change, not what you cannot.'],
    ['are you afraid to rely on other people?', 'feel afraid to rely on others', 'let someone you trust take on a little.'],
    ['are you struggling to accept the changes around you?', 'struggle to accept the changes around you', 'let old ways go and rebuild.'],
    ['is worry about future money keeping you on edge?', 'feel on edge about future money', 'calmly review how prepared you are.'],
    ['are you carrying a worry you cannot tell anyone?', 'carry a worry you cannot tell anyone', 'gently face what lies deep in your heart.'],
  ],
  9: [
    ['are you wondering if you are on the right path?', 'wonder if you are on the right path', 'confirm the values you want to live by.'],
    ['is something you always believed in starting to waver?', 'feel something you believed in starting to waver', 'choose again what you can truly believe in.'],
    ['have you lost sight of why you work so hard?', 'have lost sight of why you work so hard', 'learn something new and find your purpose again.'],
    ['do you want to learn more but cannot begin?', 'want to learn more but cannot begin', 'start learning one thing that interests you.'],
    ['do you feel there is no one to look up to?', 'feel there is no one to look up to', 'seek out ideas you can truly respect.'],
  ],
  10: [
    ['do you feel your hard work goes unrecognised?', 'feel your hard work goes unrecognised', 'steadily build up your track record again.'],
    ['are you unsure whether your current job is right?', 'feel unsure whether your current job is right', 'rethink the way you want to work for years to come.'],
    ['do your responsibilities keep growing without reward?', 'feel your responsibilities keep growing without reward', 'choose again which work you take on.'],
    ['do you want to change jobs but cannot commit?', 'want to change jobs but cannot commit', 'confirm your strengths again.'],
    ['do people at work make your mornings feel heavy?', 'feel people at work make your mornings heavy', 'refocus on your own role.'],
  ],
  11: [
    ['do you feel your effort is not reaching your income?', 'feel your effort is not reaching your income', 'grow one skill that leads to income.'],
    ['do you feel you do not belong among your friends?', 'feel you do not belong among your friends', 'value ties with people you truly get along with.'],
    ['are you close to giving up on your wishes?', 'feel close to giving up on your wishes', 'break your wishes into small goals.'],
    ['do you feel left behind when no one invites you?', 'feel left behind when no one invites you', 'reach out to someone first.'],
    ['do you feel there is no way to grow your income?', 'feel there is no way to grow your income', 'look for chances through the people you know.'],
  ],
  12: [
    ['are you still tired even after sleeping?', 'still feel tired even after sleeping', 'take real time to rest on your own.'],
    ['do you feel guilty for wanting time alone?', 'feel guilty for wanting time alone', 'use time alone to restore yourself.'],
    ['is there something you want to let go of but cannot?', 'want to let go of something but cannot', 'lighten what you carry, one thing at a time.'],
    ['do you feel your spending keeps piling up?', 'feel your spending keeps piling up', 'choose again what you truly need.'],
    ['do you feel a deep tiredness that will not lift?', 'feel a deep tiredness that will not lift', 'let yourself simply do nothing for a while.'],
  ],
};

const MONTHS: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

function enDay(day: string): string | null {
  const match = /^([A-Z][a-z]{2})\s+(\d+)$/.exec(day.trim());
  return match && MONTHS[match[1]] ? `${MONTHS[match[1]]} ${match[2]}` : null;
}

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildWeeklyTemplateEn(
  reference: string,
  moonSign: string,
  spokenPeriod: string,
  weekNumber: number,
  used: Set<string> = new Set(),
): TemplateScript | null {
  const picked = pickWeekly(reference, moonSign, weekNumber, used);
  if (!picked) return null;
  const { moon, chosen, house } = picked;
  const planet = EN_PLANET[chosen.planet];
  const nature = EN_NATURE[chosen.planet];
  const node = chosen.planet === 'Rahu' || chosen.planet === 'Ketu';
  const day = chosen.ingress ? enDay(chosen.ingress.day) : null;
  const field = EN_HOUSE_FIELD[house];
  const [hook, reason, use] = EN_WORRIES[house][picked.worry];
  const where = `${EN_SIGN[chosen.sign]}, your ${ordinal(chosen.house)} house from Moon sign ${EN_SIGN[moon]}`;
  const lead = `In Vedic astrology, from ${spokenPeriod},`;

  let opening: string;
  let cause: string;
  if (chosen.ingress && day) {
    opening = `${lead} ${planet} moves into ${EN_SIGN[chosen.ingress.sign]}, your ${ordinal(house)} house from Moon sign ${EN_SIGN[moon]}, on ${day}.`;
    cause = `is entering the area of ${field}`;
  } else if (chosen.retrograde && !node) {
    opening = `${lead} ${planet} is retrograde in ${where}.`;
    cause = `is retrograde, asking you to rethink ${field}`;
  } else {
    opening = `${lead} ${planet} is in ${where}.`;
    cause =
      chosen.planet === 'Rahu'
        ? `is intensifying your focus on ${field}`
        : chosen.planet === 'Ketu'
          ? `is drawing your heart away from ${field}`
          : `is working strongly on ${field}`;
  }

  return {
    hook_text: `${EN_SIGN[moon]}, ${hook}`,
    body_script: `${opening} If you ${reason}, it is because ${nature} ${cause}. This is a good time to ${use}`,
    planet: chosen.planet,
    house,
  };
}

/** Every worry in English, house by house, for review. */
export function listEnWorries(): string[] {
  return Object.entries(EN_WORRIES).flatMap(([house, list]) => [
    `[House ${house}: ${EN_HOUSE_FIELD[Number(house)]}]`,
    ...list.map(([hook, reason, use], i) => `${i + 1}. ${capitalize(hook)} / If you ${reason}, … / This is a good time to ${use}`),
    '',
  ]);
}
