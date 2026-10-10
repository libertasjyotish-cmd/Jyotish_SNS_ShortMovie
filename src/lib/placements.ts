/**
 * Turns the week's transit text into the placements as seen from one Moon sign.
 *
 * The weekly script has to be written from the sky, which means the writer needs
 * more than a house number: which planet, in which sign, ruled by whom, moving
 * which way, and which field of life that house is. This module derives exactly
 * that from the stored `transit_data` so the prompt never has to guess.
 */

export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export type Sign = (typeof SIGNS)[number];

const SIGN_RULER: Record<Sign, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

/** How each graha acts, in the terms a reading needs. */
const PLANET_NATURE: Record<string, string> = {
  Sun: 'authority, visibility and the part of life a person stands behind in their own name',
  Moon: 'mood, attachment and what a person needs in order to feel settled',
  Mars: 'drive and friction: effort, impatience, confrontation, the push to act',
  Mercury: 'speech, calculation, arrangements and the exchange of information',
  Jupiter: 'expansion, counsel and the sense that something is worth committing to',
  Venus: 'attraction, comfort, taste and what a person is drawn towards or wants to keep',
  Saturn: 'delay, duty and the weight of what has to be carried whether or not it is wanted',
  Rahu: 'craving and overreach: being pulled towards something one has no measure for',
};

/** Each bhava as a field of life, never as a physical place or object. */
const HOUSE_FIELD: Record<number, string> = {
  1: 'the person themselves: body, bearing and how they start things',
  2: 'what sustains them: income, speech, family of origin, what they hold on to',
  3: 'initiative, siblings and peers, nerve, short moves and daily communication',
  4: 'home life, family, roots, and the inner ground a person stands on',
  5: 'what comes out of them: children, creation, study, judgement, the willingness to take a chance',
  6: 'obligation and resistance: work owed to others, rivals, debts, the body under strain',
  7: 'the other person: partner, counterpart, negotiation, being met face to face',
  8: 'what cannot be controlled: upheaval, other people\'s money, hidden matters, endings',
  9: 'conviction: belief, teachers, long journeys, the principle a person lives by',
  10: 'position and public standing: career, duty in the eyes of others, what one is seen to do',
  11: 'gain and circle: income from others, networks, hopes a person works towards',
  12: 'release: loss, withdrawal, distant places, sleep, what has to be let go of',
};

export interface PlanetTransit {
  planet: string;
  startSign: Sign;
  endSign: Sign;
  retrograde: boolean;
  /** `Enters Libra on Oct 18` style notes, as written in the reference. */
  ingress: string[];
}

const LINE = /^([A-Z][a-z]+):\s*([A-Z][a-z]+)\s+[\d.]+deg\s*->\s*([A-Z][a-z]+)\s+[\d.]+deg(.*)$/;

function asSign(value: string): Sign | null {
  return (SIGNS as readonly string[]).includes(value) ? (value as Sign) : null;
}

/** Reads back the lines `buildTransitReference()` wrote, ignoring anything else. */
export function parseTransitReference(reference: string): PlanetTransit[] {
  const transits: PlanetTransit[] = [];
  for (const raw of reference.split('\n')) {
    const match = LINE.exec(raw.trim());
    if (!match) continue;
    const [, planet, start, end, tail] = match;
    const startSign = asSign(start);
    const endSign = asSign(end);
    if (!startSign || !endSign) continue;
    transits.push({
      planet,
      startSign,
      endSign,
      retrograde: /retrograde/.test(tail),
      ingress: Array.from(tail.matchAll(/Enters\s+([A-Z][a-z]+)\s+on\s+([A-Z][a-z]+\s+\d+)/g)).map(
        (note) => `enters ${note[1]} on ${note[2]}`,
      ),
    });
  }
  return transits;
}

/** 1-based house of `sign` counted from `moonSign`, as Jyotish counts bhavas. */
export function houseFrom(moonSign: Sign, sign: Sign): number {
  return ((SIGNS.indexOf(sign) - SIGNS.indexOf(moonSign) + 12) % 12) + 1;
}

function ordinal(house: number): string {
  const names = [
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth',
    'tenth',
    'eleventh',
    'twelfth',
  ];
  return names[house - 1];
}

/**
 * The placements of the week as seen from `moonSign`, one line per planet, with the
 * planet's nature, its sign and that sign's ruler, the house it falls in and what
 * that house is a field of. The Moon itself is left out: it crosses several signs in
 * a week and is not what a weekly reading is built on.
 */
export function buildPlacementBrief(reference: string, moonSign: string): string {
  const target = asSign(moonSign);
  if (!target) return '';

  const transits = parseTransitReference(reference).filter((transit) => transit.planet !== 'Moon');
  if (transits.length === 0) return '';

  const lines = transits.map((transit) => {
    const house = houseFrom(target, transit.startSign);
    const movement = [
      transit.retrograde ? 'retrograde this week' : null,
      ...transit.ingress.map((note) => `${note}, moving to the ${ordinal(houseFrom(target, transit.endSign))} house`),
    ].filter(Boolean);

    return [
      `- ${transit.planet} (${PLANET_NATURE[transit.planet] ?? 'its own significations'})`,
      `in ${transit.startSign}, ruled by ${SIGN_RULER[transit.startSign]}`,
      `= the ${ordinal(house)} house from ${target}: ${HOUSE_FIELD[house]}`,
      movement.length > 0 ? `[${movement.join('; ')}]` : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  return [
    `Placements for a ${target} Moon sign viewer, counted from ${target} as the first house:`,
    ...lines,
    'Write the reading from one of these placements: this planet acting in this sign, in that field of life. ' +
      'A house is a field of life, never a room, a building or an object, and never a household chore.',
  ].join('\n');
}
