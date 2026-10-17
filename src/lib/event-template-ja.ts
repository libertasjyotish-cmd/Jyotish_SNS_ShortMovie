/**
 * Japanese sky-event scripts assembled from the calculated calendar, without Gemini.
 * Returns null for event kinds that have no approved wording, so they never ship.
 */
import type { SkyEvent } from '@/lib/sky-events';
import type { EvergreenTemplate } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const PLANET: Record<string, string> = {
  Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', Rahu: 'ラーフ',
};
const AREA: Record<string, string> = {
  Mercury: '言葉や連絡、考えごと',
  Venus: '愛情やお金、楽しみ',
  Mars: 'やる気や行動',
  Jupiter: '成長や学び、幸運',
  Saturn: '責任や努力、時間をかけて築くもの',
  Rahu: '強い望みや新しい挑戦',
};
const RETRO_Q: Record<string, string> = {
  Mercury: '大事な連絡を、送る前に読み返していますか？',
  Venus: '人やお金との付き合い方を、見直したくなっていませんか？',
  Mars: '焦って動いて、空回りしていませんか？',
  Jupiter: '今の目標がこのままでいいか、迷っていませんか？',
  Saturn: '責任を、重く感じていませんか？',
};
const RETRO_DO: Record<string, string> = {
  Mercury: '送る前に読み返し、約束を確かめ直す',
  Venus: '本当に大切な人やお金の使い方を選び直す',
  Mars: '勢いで始めず、やり方を整え直す',
  Jupiter: '計画を見直し、伸ばす方向を選び直す',
  Saturn: '引き受けたことを見直し、土台を補強する',
};
const INGRESS_Q: Record<string, string> = {
  Jupiter: '新しく伸ばしたいことが、見えてきていませんか？',
  Saturn: '腰を据えて取り組みたいことが、ありませんか？',
  Rahu: '急に惹かれ始めたものが、ありませんか？',
};
const STAY: Record<string, string> = { Jupiter: '約1年', Saturn: '約2年半', Rahu: '約1年半' };
const ECLIPSE_KIND: Record<string, string> = { total: '皆既', annular: '金環', partial: '部分' };

const signJa = (s: string) => zodiacName(s.toLowerCase(), 'ja') ?? s;
/** Calendar day in Japan. */
function jaDate(d: Date): { y: number; label: string } {
  const j = new Date(d.getTime() + 9 * 3_600_000);
  return { y: j.getUTCFullYear(), label: `${j.getUTCMonth() + 1}月${j.getUTCDate()}日` };
}

export interface EventNeighbours { prev?: SkyEvent; next?: SkyEvent }

/** "前回は2014年、次は2037年です。" plus "〇年ぶりに" for the hook when the gap is long. */
function rarity(event: SkyEvent, around: EventNeighbours): { since: string; line: string } {
  const y = jaDate(event.date).y;
  const prev = around.prev ? jaDate(around.prev.date).y : undefined;
  const next = around.next ? jaDate(around.next.date).y : undefined;
  const since = prev !== undefined && y - prev >= 8 ? `${y - prev}年ぶりに、` : '';
  const parts = [prev !== undefined ? `前回は${prev}年` : '', next !== undefined ? `次は${next}年` : ''].filter(Boolean);
  return { since, line: parts.length ? `${parts.join('、')}です。` : '' };
}

export function buildEventTemplateJa(event: SkyEvent, around: EventNeighbours): EvergreenTemplate | null {
  const { label } = jaDate(event.date);
  const { since, line } = rarity(event, around);
  const p = PLANET[event.planet];
  const s = signJa(event.sign);
  const eclipse = /^(solar|lunar)-eclipse-(\w+)$/.exec(event.type);
  if (eclipse) {
    const kind = ECLIPSE_KIND[eclipse[2]];
    if (!kind) return null;
    const solar = eclipse[1] === 'solar';
    const name = `${kind}${solar ? '日食' : '月食'}`;
    return {
      hook: `${label}、${since}${s}で${name}が起きます。${solar ? '続けてきたやり方を、手放したくなっていませんか？' : '心の中で、区切りをつけたいことはありませんか？'}`,
      body: `インド占星術では、食は${solar ? '太陽' : '月'}が影の星ラーフ・ケートゥと重なる時です。${solar ? '目標や生き方' : '気持ちや人との関係'}に区切りがつき、古いやり方を手放す節目になります。${line}`,
    };
  }
  if (!p) return null;
  switch (event.type) {
    case 'retrograde':
      if (!RETRO_Q[event.planet]) return null;
      return {
        hook: `${label}、${since}${p}が${s}で逆行に入ります。${RETRO_Q[event.planet]}`,
        body: `${p}は${AREA[event.planet]}の星です。逆行は止まる時ではなく、${RETRO_DO[event.planet]}ことで前より良くする再強化期間です。${line}`,
      };
    case 'direct':
      if (!RETRO_Q[event.planet]) return null;
      return {
        hook: `${label}、${p}が${s}で順行に戻ります。止まっていたことが、動き出していませんか？`,
        body: `逆行の間に見直してきた${AREA[event.planet]}が、ここから少しずつ前に進み始めます。${line}`,
      };
    case 'ingress':
      if (!INGRESS_Q[event.planet]) return null;
      return {
        hook: `${label}、${since}${p}が${s}に入ります。${INGRESS_Q[event.planet]}`,
        body: `${p}は${AREA[event.planet]}の星で、ここから${STAY[event.planet]}${s}にとどまります。月星座から数えたハウスによって、効く分野が変わります。${line}`,
      };
    case 'exalted':
      if (!['Jupiter', 'Saturn'].includes(event.planet)) return null;
      return {
        hook: `${label}、${since}${p}が、最も力を発揮する${s}に入ります。${INGRESS_Q[event.planet]}`,
        body: `インド占星術では、${s}は${p}が高揚する星座です。${AREA[event.planet]}の星が、いちばん素直に力を届ける配置が${STAY[event.planet]}続きます。${line}`,
      };
    case 'debilitated':
      if (event.planet === 'Saturn') {
        return {
          hook: `${label}、${since}土星が、力を出しにくい${s}に入ります。責任を、重く感じていませんか？`,
          body: `インド占星術では、${s}は土星が減衰する星座です。焦らず土台を固め直すと、前より強い形をつくれる再強化期間です。${line}`,
        };
      }
      if (event.planet === 'Jupiter') {
        return {
          hook: `${label}、${since}木星が、力を出しにくい${s}に入ります。伸び悩みを感じていませんか？`,
          body: `インド占星術では、${s}は木星が減衰する星座です。大きく広げるより、地道な積み重ねを選び直すと、確かな成長につながる時期になります。${line}`,
        };
      }
      return null;
    default:
      return null;
  }
}
