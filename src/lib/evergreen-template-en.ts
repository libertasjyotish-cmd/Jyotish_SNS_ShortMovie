/**
 * English Mon–Wed per-sign evergreen scripts, hand-written to the same structure and the same
 * chart reasoning as the approved Japanese set (`evergreen-template.ts`); no model writes any of it.
 */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';

const EN_PLANET: Record<string, string> = {
  Sun: 'the Sun', Moon: 'the Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter',
  Venus: 'Venus', Saturn: 'Saturn',
};

/** [hook after "<Sign> Moon, ", strength/feeling, place]. */
type Line3 = [string, string, string];

const EN_WORK: Record<Sign, Line3> = {
  Capricorn: ['do you blame yourself when results at work come slowly?', 'build solid trust over time', 'long-lasting organisations or roles of real responsibility'],
  Aquarius: ['do you feel out of step with the people you work with?', 'see the whole picture and find new methods', 'technology, research or work that builds systems'],
  Pisces: ['are you worn out by being judged only on numbers?', 'support people and lighten their load', 'teaching, counselling or work that cares for people'],
  Aries: ['are you holding back your strength to keep everyone happy?', 'decide for yourself and move first', 'launching new projects or leading from the front'],
  Taurus: ['are you drained by always being put in the spotlight?', 'recognise quality and turn it into something lasting', 'food, design or work that deals in real value'],
  Gemini: ['does doing the same task every day feel suffocating?', 'gather information and explain it clearly', 'writing, sales or connecting people'],
  Cancer: ['do you spend your workday reading everyone else’s mood?', 'sense what people feel and put them at ease', 'hospitality, care or work that looks after people'],
  Leo: ['do you feel unrewarded working behind the scenes?', 'stand in front and take responsibility', 'leading a team or work done under your own name'],
  Virgo: ['does the gap between your ideals and your daily work trouble you?', 'refine every detail with precision', 'analysis or quality control'],
  Libra: ['are you pushing too hard on your own at work?', 'stand between people and keep things fair', 'negotiation or work that connects people'],
  Scorpio: ['does shallow work leave you feeling unfulfilled?', 'dig deep into one thing', 'research or investigation'],
  Sagittarius: ['do you struggle to find meaning in your work?', 'show a bigger purpose and guide others', 'education, law or work across borders'],
};

const EN_COMPAT: Record<Sign, Line3> = {
  Aries: ['are you the only one rushing ahead in your relationships?', 'carries the drive of Mars and moves straight ahead', 'people you can speak your mind with right away'],
  Taurus: ['do people who keep changing their minds wear you out?', 'carries the calm of Venus and values what lasts', 'people who build trust slowly'],
  Gemini: ['do you feel drained around people you can’t really talk to?', 'carries the lightness of Mercury and connects through words', 'people whose conversation keeps pace with yours'],
  Cancer: ['are you exhausted from always being considerate?', 'carries the Moon’s own tenderness and wants to protect others', 'people you can be yourself with'],
  Leo: ['do you lose yourself by always going along with others?', 'carries the warmth of the Sun and lights others up', 'people who are glad to see you shine'],
  Virgo: ['are you tired from noticing every little thing?', 'carries the care of Mercury and wants to be useful', 'people who say thank you for your thoughtfulness'],
  Libra: ['do you hide your true feelings to avoid friction?', 'carries the harmony of Venus and values balance', 'people who take your honesty calmly'],
  Scorpio: ['do surface-level friendships leave you wanting more?', 'holds the strength of Mars inside and seeks deep bonds', 'people you can stay honest with for years'],
  Sagittarius: ['do relationships start to feel like a cage?', 'carries the generosity of Jupiter and wants to explore', 'people who respect each other’s freedom'],
  Capricorn: ['do you feel lonely because you never show weakness?', 'carries the integrity of Saturn and takes on responsibility', 'people who accept your weaker side too'],
  Aquarius: ['do you feel like the odd one out in a group?', 'carries the clarity of Saturn and sees everyone as equal', 'people who enjoy your differences'],
  Pisces: ['are you worn out from carrying other people’s feelings?', 'carries the compassion of Jupiter and feels others’ pain', 'people who return your kindness'],
};

const EN_LOVE: Record<Sign, Line3> = {
  Aries: ['in love, do you wait and never make the first move?', 'tell someone how you feel and go straight for it', 'a partner who loves your honesty'],
  Taurus: ['do you overthink love?', 'let love grow slowly and comfortably', 'a partner who feels calm to be with'],
  Gemini: ['do you feel anxious when you and your partner stop talking?', 'share words and laughter', 'a partner you can talk to about anything'],
  Cancer: ['do you act so strong that you can’t lean on your partner?', 'build a warm bond where you protect each other', 'a partner you can be yourself with'],
  Leo: ['in love, are you always the one who adjusts?', 'be cherished and show your love openly', 'a partner who is proud of you'],
  Virgo: ['do you give so much to your partner and feel unrewarded?', 'support your partner with quiet care', 'a partner who notices small kindnesses'],
  Libra: ['do you avoid every disagreement with your partner?', 'build a graceful relationship of mutual respect', 'a partner who meets you as an equal'],
  Scorpio: ['does casual love leave you empty?', 'bond deeply with one person', 'a partner who accepts your true feelings'],
  Sagittarius: ['do you feel trapped when a partner holds on too tight?', 'learn and widen your world together', 'a partner who supports your freedom and dreams'],
  Capricorn: ['are you so careful in love that chances slip away?', 'build a love you can trust over time', 'a partner who keeps their promises'],
  Aquarius: ['are you bored by ordinary romance?', 'talk freely, like best friends', 'a partner who enjoys your individuality'],
  Pisces: ['in love, do you give far too much of yourself?', 'connect heart to heart, beyond words', 'a partner who returns your kindness'],
};

const EN_MONEY: Record<Sign, Line3> = {
  Aries: ['do you want to save but spend it all straight away?', 'take bold action and earn on your own', 'work where you carve out your own path'],
  Taurus: ['do money worries make you give up what you enjoy?', 'recognise real quality and grow its value', 'work that deals in good things'],
  Gemini: ['does having just one income make you uneasy?', 'use information to earn in several ways', 'work that uses knowledge and words'],
  Cancer: ['do you spend too much of your money on others?', 'protect the lives of the people you love', 'work that supports people’s daily lives'],
  Leo: ['do you spend money just to keep up appearances?', 'turn your name and reputation into income', 'work where you stand in front'],
  Virgo: ['do you cut back but still can’t save?', 'manage numbers precisely and cut waste', 'work with numbers'],
  Libra: ['do you find it hard to say no when money is involved?', 'earn through trust with others', 'working in partnership'],
  Scorpio: ['do you keep your money worries to yourself?', 'read where money flows and grow it steadily', 'ways of earning that grow over time'],
  Sagittarius: ['are you tired of thinking about money all the time?', 'turn learning and experience into wealth', 'work that uses what you have learned'],
  Capricorn: ['are you anxious that your money grows so slowly?', 'build lasting wealth step by step', 'work you keep doing for years'],
  Aquarius: ['do ordinary ways of earning just not suit you?', 'earn through new systems and ideas', 'online work or new technology'],
  Pisces: ['do you give so much that nothing is left for you?', 'help people and turn that trust into abundance', 'work that helps people'],
};

const EN_FAMILY: Record<Sign, Line3> = {
  Aries: ['do you keep clashing with your family?', 'protect your family with your own hands', 'a home where everyone can say what they think'],
  Taurus: ['does home still not feel restful?', 'value a calm, comfortable life', 'a relaxed, unhurried home'],
  Gemini: ['do you feel you never really talk with your family?', 'connect with your family through words', 'a table where anything can be said'],
  Cancer: ['are you exhausted from worrying about your family?', 'wrap your family in warmth and keep them safe', 'a home where you can be looked after too'],
  Leo: ['do you feel unappreciated in your family?', 'be at the centre, lifting everyone up', 'a family that recognises each other’s efforts'],
  Virgo: ['are you carrying all the housework alone?', 'look after every detail of your family’s life', 'a family that shares the load'],
  Libra: ['are you always the peacemaker in your family?', 'keep your family balanced and harmonious', 'a home where everyone gives a little'],
  Scorpio: ['can’t you be honest even with your family?', 'bond deeply with your family', 'a family that accepts each other’s true feelings'],
  Sagittarius: ['do your family’s values clash with yours?', 'share the way of life you believe in', 'a home that respects each person’s path'],
  Capricorn: ['are you carrying your family’s burdens alone?', 'fulfil your duty to your family', 'a family where everyone can rely on each other'],
  Aquarius: ['do you feel like the odd one out in your family?', 'accept each person in your family as they are', 'a home that respects everyone’s views'],
  Pisces: ['do you always put yourself last for your family?', 'stay close to your family’s pain and support them', 'a family that returns your kindness'],
};

const EN_REST: Record<Sign, Line3> = {
  Aries: ['does lying down to rest still leave you tired?', 'moving your body rests your mind more than keeping still', 'time to work up a sweat'],
  Taurus: ['has constant busyness worn out your mind too?', 'being surrounded by pleasant things helps you unwind', 'time to sink into music or scents you love'],
  Gemini: ['does your mind race so much you can’t sleep?', 'putting your thoughts into words lightens your mind', 'time to talk things through with someone'],
  Cancer: ['are you worn out from looking after everyone?', 'a place where you feel safe fills you back up', 'a place where you can be looked after'],
  Leo: ['are you close to burning out from trying so hard?', 'time when no one is watching refills you', 'time alone, off duty'],
  Virgo: ['even on days off, are you thinking about your to-do list?', 'tidy surroundings settle your mind', 'a quiet, orderly space'],
  Libra: ['are you drained from always being considerate?', 'beautiful things restore your balance', 'time to take in a view you love'],
  Scorpio: ['do you hide your exhaustion from everyone?', 'deep sleep alone is how you recover', 'sleep that no one interrupts'],
  Sagittarius: ['does the same routine wear you down?', 'new places and new ideas open your mind', 'time to go somewhere unfamiliar'],
  Capricorn: ['do you feel guilty for resting?', 'resting at a set time keeps you steady', 'a fixed rest time every day'],
  Aquarius: ['does just being around people tire you out?', 'stepping away to your own pace restores you', 'time at your own pace'],
  Pisces: ['are you tired from absorbing everyone’s feelings?', 'music and water wash your mind clean', 'time to listen to quiet music'],
};

const EN_IMPRESSION: Record<Sign, Line3> = {
  Aries: ['are you misunderstood as intimidating?', 'the way you act without hesitation looks strong', 'roles where you lead from the front'],
  Taurus: ['do people think you’re slow?', 'your calm presence looks unhurried', 'long-term relationships'],
  Gemini: ['do people think you’re not serious?', 'your quick talk and lightness look carefree', 'roles that connect people'],
  Cancer: ['do people think you’re moody?', 'every feeling shows on your face', 'moments of caring for others'],
  Leo: ['are you misunderstood as arrogant?', 'your confident presence looks self-assured', 'roles that bring people together'],
  Virgo: ['do people think you’re strict and fussy?', 'your sharp eye for detail looks severe', 'work that puts things in order'],
  Libra: ['do people think you try to please everyone?', 'being pleasant to everyone looks that way', 'roles that bridge people'],
  Scorpio: ['do people say they can’t tell what you’re thinking?', 'keeping your depths to yourself looks mysterious', 'roles where you are trusted with what matters'],
  Sagittarius: ['do people think you’re careless?', 'keeping your eye on the big picture looks easygoing', 'roles where you guide others'],
  Capricorn: ['are you misunderstood as cold?', 'putting duty before feelings looks stiff', 'important work you are trusted with'],
  Aquarius: ['do people think you’re a little strange?', 'thinking for yourself looks unusual', 'moments that call for new ideas'],
  Pisces: ['do people think you’re not dependable?', 'a kindness that never blames looks soft', 'moments of comforting others'],
};

const EN_AVOID: Record<Sign, Line3> = {
  Aries: ['are you worn down by a workplace full of arguments?', 'anger and competition drain you', 'a place where people talk calmly'],
  Taurus: ['does a hectic environment keep you on edge?', 'constant last-minute changes unsettle you', 'a place with a steady routine'],
  Gemini: ['are you tired of endless messages and small talk?', 'too many words keep your mind from resting', 'a quiet place to focus'],
  Cancer: ['do you feel lonely in a cold atmosphere?', 'a place without understanding makes your heart shrink', 'a place where people look out for each other'],
  Leo: ['are you tired of a place that never recognises your effort?', 'being treated as unimportant wears away your confidence', 'a place that gives you real responsibility'],
  Virgo: ['does a messy, disorganised place wear you out?', 'disorder and sloppiness keep you on edge', 'a place where things are done properly'],
  Libra: ['are you tired of standing between people who fight?', 'unfair treatment throws you off balance', 'a place where everyone is treated fairly'],
  Scorpio: ['are you tired of a place full of games and politics?', 'relationships without honesty keep you tense', 'a place with nothing hidden'],
  Sagittarius: ['do petty rules make you feel suffocated?', 'rules without purpose make you wilt', 'a place that trusts your judgement'],
  Capricorn: ['are you exhausted by work that never ends?', 'piling responsibility makes your heart heavy', 'a place with clear roles and real time off'],
  Aquarius: ['do old ways being forced on you feel cramped?', 'a place that resists change makes you rigid', 'a place where you can try new ideas'],
  Pisces: ['are you drained by carrying everyone’s problems?', 'being relied on without limit wears you thin', 'a place where you can protect your own time'],
};

const EN_TURNING: Record<Sign, Line3> = {
  Aries: ['are you at the point of wanting to quit everything?', 'suddenly, sparked by a clash or by reaching your limit', 'before you quit in the heat of the moment, decide on one next step'],
  Taurus: ['are you afraid of changes to your income or home?', 'slowly, as a shift in money or where you live', 'choose one part of your life to keep and let the rest go'],
  Gemini: ['is something someone told you still on your mind?', 'through an introduction or a passing conversation', 'meet up within the week to find out more'],
  Cancer: ['are you wondering whether to change your life for your family?', 'through family circumstances or a move', 'weigh your own wishes as heavily as your family’s needs'],
  Leo: ['does your current position feel too small?', 'as a promotion or a request to step into the spotlight', 'say yes to that role at least once, even if you hesitate'],
  Virgo: ['do your health or working hours feel unsustainable?', 'as a change in health or a rethink of how you work', 'stop putting up with it and change the way you work'],
  Libra: ['is a marriage or a breakup shaking your life?', 'as a change in a close relationship', 'choose by how you want to live, not by what pleases them'],
  Scorpio: ['are you carrying a worry you can’t tell anyone?', 'as a hidden problem coming into the open', 'tell someone you trust instead of carrying it alone'],
  Sagittarius: ['are you drawn to studying again or going abroad?', 'through new learning or a far-off place', 'visit the course or place that interests you once'],
  Capricorn: ['are you wondering whether to leave a job you’ve done for years?', 'as something you’ve done for years reaching its end', 'take everything you’ve built straight into the next place'],
  Aquarius: ['are you thinking about working outside a company?', 'as leaving an organisation or starting something with others', 'look for people who think the way you do'],
  Pisces: ['is a feeling you can’t explain stirring you?', 'as an unexplained hunch or a chance meeting', 'don’t dismiss the hunch, test it in a small way'],
};

/** [hook, why (habit), stop, relief]. */
const EN_HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['do you always reply straight away?', 'you act before you decide', 'Sleep on the important replies', 'you will have far fewer regrets'],
  Taurus: ['do you hold on to things and people that no longer fit?', 'you keep guarding what you already have', 'Let go of one thing you never use', 'you will feel room to breathe'],
  Gemini: ['are you on your phone right up until bedtime?', 'you are always chasing new information', 'Put the screen away an hour before bed', 'the noise in your head will settle'],
  Cancer: ['are you always worrying about other people’s moods?', 'you take other people’s feelings as your own', 'Stop trying to fix everyone’s mood', 'your own feelings will come back'],
  Leo: ['do you push on alone without ever complaining?', 'you want to be the one others rely on', 'Ask someone for help with just one thing', 'the weight on your shoulders will lift'],
  Virgo: ['do you keep rechecking things that are already done?', 'every small flaw bothers you', 'Check things once and stop', 'you will have time and energy left'],
  Libra: ['do you say yes when you really mean no?', 'you try not to spoil the mood', 'Say a clear no just once', 'dealing with people will get easier'],
  Scorpio: ['do you keep replaying something someone said to you?', 'hurt cuts deep into you', 'Tell someone you trust about it', 'the tightness in your chest will ease'],
  Sagittarius: ['do you pack your schedule too full?', 'you reach for anything that looks fun', 'Drop one plan', 'you will enjoy each one properly'],
  Capricorn: ['do you think about work even on your days off?', 'you always put responsibility first', 'Don’t check work messages on days off', 'you will feel the difference the next week'],
  Aquarius: ['do you decide everything yourself without relying on anyone?', 'you don’t want to give up your own way', 'Go along with someone else’s idea just once', 'an unexpected path will open'],
  Pisces: ['do you find it impossible to turn down requests?', 'you can’t ignore someone in need', 'Don’t answer on the spot, take time to think', 'you will protect your own time'],
};

const EN_NATURE: Record<Sign, Line3> = {
  Aries: ['are you tired of always fitting in with others?', 'forging your own path with your own feet', 'taking on a challenge you chose yourself'],
  Taurus: ['does everyone else’s speed make you anxious?', 'growing something solid over time', 'patiently sticking with one thing'],
  Gemini: ['do you call yourself a jack of all trades, master of none?', 'learning and passing it on to others', 'telling someone what you have learned'],
  Cancer: ['do you always put yourself last?', 'making the people you love feel safe', 'spending peaceful time with the people close to you'],
  Leo: ['do you shy away from standing out?', 'living in a way you can be proud of', 'speaking your mind with confidence'],
  Virgo: ['do you struggle to see your own good qualities?', 'giving your best in a way that helps people', 'neatly solving someone’s problem'],
  Libra: ['do you worry that you have no opinions of your own?', 'creating harmony between people', 'smoothing things over between people who disagree'],
  Scorpio: ['do you think too deeply about everything?', 'the truth beneath the surface', 'digging all the way into one thing'],
  Sagittarius: ['does the way you live now feel like it’s missing something?', 'always learning and widening your view', 'exploring new ideas or new places'],
  Capricorn: ['do you think you are too serious?', 'fulfilling your responsibilities over the long run', 'moving step by step towards a goal you set'],
  Aquarius: ['do you feel you can’t relate to the people around you?', 'thinking beyond fixed frames to find new forms', 'trying things your own way'],
  Pisces: ['do you worry that you feel others’ pain too much?', 'sensing hidden pain and standing beside it', 'quietly listening to someone'],
};

const EN_SUN_TRAIT: Record<Sign, string> = {
  Aries: 'passionate and full of action', Taurus: 'easygoing and steady', Gemini: 'clever and sociable',
  Cancer: 'home-loving and deeply caring', Leo: 'glamorous and a born leader', Virgo: 'meticulous and a perfectionist',
  Libra: 'charming and stylish', Scorpio: 'intense and secretive', Sagittarius: 'free-spirited and optimistic',
  Capricorn: 'serious and hardworking', Aquarius: 'original and unconventional', Pisces: 'gentle and dreamy',
};

const ruler = (sign: Sign) => EN_PLANET[RULER[sign]];
const moonHook = (moon: Sign, hook: string) => `${moon} Moon, ${hook}`;

const EN_SERIES: Record<SignThemeSeries, (moon: Sign) => EvergreenTemplate> = {
  work: (moon) => {
    const s = signFrom(moon, 10); const [hook, strength, place] = EN_WORK[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 10th house of work. That is why you can ${strength}. In ${place}, your strength comes through naturally.` };
  },
  compat: (moon) => {
    const [hook, nature, place] = EN_COMPAT[moon];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, compatibility is read Moon to Moon, not by the Sun. ${/^[AEIOU]/.test(moon) ? 'An' : 'A'} ${moon} Moon ${nature}. With ${place}, your hearts connect naturally.` };
  },
  love: (moon) => {
    const s = signFrom(moon, 5); const [hook, feeling, place] = EN_LOVE[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 5th house of romance. That is why you long to ${feeling}. With ${place}, that love is returned.` };
  },
  money: (moon) => {
    const s = signFrom(moon, 2); const [hook, strength, place] = EN_MONEY[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 2nd house of money. That is why you can ${strength}. In ${place}, money flows to you naturally.` };
  },
  family: (moon) => {
    const s = signFrom(moon, 4); const [hook, feeling, place] = EN_FAMILY[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 4th house of family. That is why you want to ${feeling}. In ${place}, you can truly be at peace.` };
  },
  rest: (moon) => {
    const s = signFrom(moon, 12); const [hook, why, place] = EN_REST[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 12th house of rest. That is why ${why}. With ${place}, your energy comes back on its own.` };
  },
  impression: (moon) => {
    const [hook, why, place] = EN_IMPRESSION[moon];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(moon)} is linked to your 1st house, the face you show the world. That is why ${why}. In ${place}, that impression turns into trust.` };
  },
  avoid: (moon) => {
    const s = signFrom(moon, 6); const [hook, why, place] = EN_AVOID[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 6th house, what wears you down. That is why ${why}. In ${place}, you can be yourself again.` };
  },
  turning: (moon) => {
    const s = signFrom(moon, 8); const [hook, arrival, action] = EN_TURNING[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 8th house of life’s turning points. Your turning point arrives ${arrival}. If you ${action}, it works in your favour.` };
  },
  habit: (moon) => {
    const [hook, why, stop, relief] = EN_HABIT[moon];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, your Moon, which shows your heart, takes on the nature of ${ruler(moon)}. That is why ${why}. ${stop}, and ${relief}.` };
  },
  nature: (moon) => {
    const s = signFrom(moon, 9); const [hook, core, scene] = EN_NATURE[s];
    return { hook: moonHook(moon, hook), body: `In Vedic astrology, ${ruler(s)} is linked to your 9th house, the core of how you live. What you truly value is ${core}. When you are ${scene}, you are most yourself.` };
  },
  sidereal: (sun) => ({
    hook: `${sun}, horoscopes call you ${EN_SUN_TRAIT[sun]}. Does that feel like someone else?`,
    body: 'Vedic astrology reads your personality from the Moon, which shows your heart, not the Sun, and places the signs by where the stars really are. Many people’s Sun and Moon signs differ, which may be why horoscopes never seem to fit.',
  }),
};

export function buildEvergreenTemplateEn(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const moon = asSign(moonSign);
  const build = EN_SERIES[series];
  return moon && SIGNS.includes(moon) ? build(moon) : null;
}
