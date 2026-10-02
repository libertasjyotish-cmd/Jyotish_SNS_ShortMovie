/**
 * Which opening a sign reading is written from.
 *
 * The twelve readings of a week are generated one call at a time, so the model cannot see the
 * other eleven and converges on whatever opening fits the week's transit best: a whole week of
 * readings asked the viewer the same question about plans going wrong. The angle is therefore
 * assigned here instead of left to the model, one per sign, rotating by week so a sign does not
 * meet the same opening again for twelve weeks.
 */

import { ZODIAC_SIGNS, ZodiacSign } from '@/lib/zodiac-names';

/**
 * Each angle fixes what the first line is about, not its wording. They are written as
 * instructions because the prompt is in English while the script is not.
 */
const HOOK_ANGLES = [
  'a stretch of days where the same small thing keeps needing to be redone',
  'something the viewer has been blaming on their own effort or character',
  'a decision the viewer keeps postponing without being able to say why',
  'the gap between how the week looked on paper and how it actually went',
  'a conversation or message that landed differently than the viewer meant it',
  'the hours of the day when the viewer suddenly has energy, or loses it',
  'a belief the viewer holds from Western astrology that the reading contradicts',
  'money or spending behaving differently than the viewer plans for',
  'someone close whose reactions changed without an obvious reason',
  'the urge to tidy, move or change something at home',
  'work or study that moves either much faster or much slower than expected',
  'something from months ago coming back around for a second look',
] as const;

/** Where the everyday example is taken from, so two signs do not illustrate the same scene. */
const EXAMPLE_DOMAINS = [
  'daily routine and timing',
  'work and study',
  'conversations and messages',
  'home and family',
  'money and everyday spending',
  'rest, sleep and energy',
  'close relationships',
  'plans and decisions',
  'learning something new',
  'travel and moving around',
  'commitments to other people',
  'looking back at an earlier choice',
] as const;

function weekNumber(week_id: string): number {
  const parsed = /-W(\d{2})$/.exec(week_id);
  return parsed ? Number(parsed[1]) : 0;
}

function rotation(week_id: string, sign: string | undefined, offset: number): number {
  const index = ZODIAC_SIGNS.indexOf(String(sign).toLowerCase() as ZodiacSign);
  if (index < 0) return -1;
  return (index + weekNumber(week_id) * offset) % HOOK_ANGLES.length;
}

/**
 * The angle and example domain this week's reading for `sign` is written from, or undefined for
 * a video that belongs to no single sign and has nothing to be told apart from.
 */
export function hookAssignment(
  week_id: string,
  sign: string | undefined,
): { angle: string; domain: string } | undefined {
  const angleIndex = rotation(week_id, sign, 1);
  if (angleIndex < 0) return undefined;
  /** A different stride keeps angle and domain from pairing up the same way every week. */
  const domainIndex = rotation(week_id, sign, 5);
  return { angle: HOOK_ANGLES[angleIndex], domain: EXAMPLE_DOMAINS[domainIndex] };
}
