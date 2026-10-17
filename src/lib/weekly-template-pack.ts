/**
 * Shared frame for the weekly readings assembled from fixed sentences in languages other
 * than Japanese. `pickWeekly()` chooses the placement and the worry for every language, so
 * the same sky asks the same question; each language pack only supplies its own wording.
 */
import { pickWeekly, TemplateScript } from '@/lib/weekly-template';
import type { Placement, Sign } from '@/lib/placements';

/** `hook` is the question after "<Sign>, ", `reason` the same worry as a clause, `use` what to do. */
export type Worry = [hook: string, reason: string, use: string];

export interface WriteInput {
  moon: Sign;
  chosen: Placement;
  /** House the reading talks about: the one entered on an ingress, else the current one. */
  house: number;
  period: string;
  /** Ingress day as month index (0–11) and day of month, when the planet changes sign. */
  day: { month: number; date: number } | null;
  worry: Worry;
}

export interface LanguagePack {
  worries: Record<number, Worry[]>;
  field: Record<number, string>;
  write(input: WriteInput): { hook: string; body: string };
}

const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDay(day: string): { month: number; date: number } | null {
  const match = /^([A-Z][a-z]{2})\s+(\d+)$/.exec(day.trim());
  const month = match ? MONTH_KEYS.indexOf(match[1]) : -1;
  return match && month >= 0 ? { month, date: Number(match[2]) } : null;
}

export function isNode(planet: string): boolean {
  return planet === 'Rahu' || planet === 'Ketu';
}

export function buildFromPack(pack: LanguagePack) {
  return (
    reference: string,
    moonSign: string,
    spokenPeriod: string,
    weekNumber: number,
    used: Set<string> = new Set(),
  ): TemplateScript | null => {
    const picked = pickWeekly(reference, moonSign, weekNumber, used);
    if (!picked) return null;
    const { moon, chosen, house } = picked;
    const { hook, body } = pack.write({
      moon,
      chosen,
      house,
      period: spokenPeriod,
      day: chosen.ingress ? parseDay(chosen.ingress.day) : null,
      worry: pack.worries[house][picked.worry],
    });
    return { hook_text: hook, body_script: body, planet: chosen.planet, house };
  };
}

/** Every worry of a pack, house by house, for review. */
export function listPackWorries(pack: LanguagePack): string[] {
  return Object.entries(pack.worries).flatMap(([house, list]) => [
    `[${house}: ${pack.field[Number(house)]}]`,
    ...list.map(([hook, reason, use], i) => `${i + 1}. ${hook} / ${reason} / ${use}`),
    '',
  ]);
}
