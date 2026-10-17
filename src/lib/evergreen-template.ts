/**
 * Mon–Wed per-sign evergreen scripts assembled from fixed sentences: each series reads one
 * fixed fact of the Moon sign (no transit, so nothing depends on the posting date) and no
 * model writes any of it.
 */
import { JA_PLANET, JA_SIGN, SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';

export interface EvergreenTemplate {
  hook: string;
  body: string;
}

const RULER: Record<Sign, string> = {
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

const JA_RULER: Record<string, string> = { ...JA_PLANET, Moon: '月' };

/** The sign `n` places on from `sign`, counting the sign itself as the first. */
export function signFrom(sign: Sign, n: number): Sign {
  return SIGNS[(SIGNS.indexOf(sign) + n - 1) % SIGNS.length];
}

interface WorkLine {
  /** Follows 「〈月星座〉のあなた、」 and ends with 「〜ていませんか？」. */
  hook: string;
  /** Precedes 「力があるからです」. */
  strength: string;
  /** The hook's worry restated as the subject of 「〜のは、…力があるからです」. */
  flip: string;
  /** Where that strength is rewarded; precedes 「なら」. */
  place: string;
}

/** Keyed by the 10th sign from the Moon, the sign Jyotish reads work from (never spoken). */
const JA_WORK: Record<Sign, WorkLine> = {
  Capricorn: { hook: '仕事の結果が遅いと、自分を責めていませんか？', strength: '時間をかけて、確かな信頼を積み上げる', flip: 'すぐに結果が出ない', place: '長く続く組織や、任される立場' },
  Aquarius: { hook: '周りと考えが合わず、職場で浮いていませんか？', strength: '全体を見て、新しい方法を思いつく', flip: '周りと考えが合わない', place: '仕組みを作る技術や研究の仕事' },
  Pisces: { hook: '成果の数字だけで測られて、疲れていませんか？', strength: '人を支えて、心を軽くする', flip: '数字の競争に疲れる', place: '教える仕事や、人の相談に乗る仕事' },
  Aries: { hook: '気をつかうばかりで、力を出し切れていませんか？', strength: '自分で決めて、真っ先に動く', flip: '人に合わせると苦しくなる', place: '新しいことの立ち上げや、先頭に立つ役' },
  Taurus: { hook: '目立つ役ばかり任されて、疲れていませんか？', strength: '良いものを見分けて、形にして残す', flip: '派手な役で消耗する', place: '食やデザインなど、価値を扱う仕事' },
  Gemini: { hook: '同じ仕事ばかりで、息苦しくなっていませんか？', strength: '情報を集めて、分かりやすく伝える', flip: '同じことの繰り返しが苦しい', place: '文章や営業、人と人の調整役' },
  Cancer: { hook: '仕事で、相手の顔色ばかり気にしていませんか？', strength: '人の気持ちをくみ取って、安心させる', flip: '相手の顔色が気になる', place: '接客や介護など、人を支える仕事' },
  Leo: { hook: '裏方ばかりで、報われないと感じていませんか？', strength: '前に立って、責任を引き受ける', flip: '裏方のままでは報われない', place: '人をまとめる立場や、名前を出す仕事' },
  Virgo: { hook: '理想と目の前の仕事の差に、悩んでいませんか？', strength: '細かいところまで、正確に整える', flip: '理想と現実の差が気になる', place: '分析や品質管理の仕事' },
  Libra: { hook: '一人で黙々と頑張りすぎていませんか？', strength: '人と人の間に立って、釣り合いを取る', flip: '一人で抱えると行き詰まる', place: '交渉や接客など、人と人をつなぐ仕事' },
  Scorpio: { hook: '浅い仕事に、物足りなさを感じていませんか？', strength: '一つのことを、深く掘り下げる', flip: '浅い仕事が物足りない', place: '研究や調査など、深く調べる仕事' },
  Sagittarius: { hook: '自分の仕事に、意味を感じられずにいませんか？', strength: '大きな目的を示して、人を導く', flip: '意味の見えない仕事がつらい', place: '教育や法律、海外と関わる仕事' },
};

function workJa(moon: Sign): EvergreenTemplate {
  const tenth = signFrom(moon, 10);
  const line = JA_WORK[tenth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body:
      `インド占星術では、仕事を表す10ハウスに${JA_RULER[RULER[tenth]]}が関わっています。${line.strength}力があるのは、そのためです。` +
      `${line.place}なら、自ずから力を発揮します。`,
  };
}

interface CompatLine {
  /** Follows 「〈月星座〉のあなた、」 and ends with 「〜ていませんか？」. */
  hook: string;
  /** The Moon sign's own temperament; precedes 「心です」. */
  nature: string;
  /** The kind of person that temperament settles with; precedes 「となら」. */
  place: string;
}

/** Keyed by the Moon sign itself: Jyotish matches people Moon to Moon, not by the Sun. */
const JA_COMPAT: Record<Sign, CompatLine> = {
  Aries: { hook: '人付き合いで、一人だけ焦っていませんか？', nature: '火星の勢いを持ち、まっすぐ動く', place: '思ったことを、すぐ言い合える人' },
  Taurus: { hook: 'ころころ変わる人に、振り回されていませんか？', nature: '金星の穏やかさを持ち、変わらないものを大切にする', place: 'ゆっくり信頼を育てられる人' },
  Gemini: { hook: '話の合わない人といると、疲れていませんか？', nature: '水星の軽やかさを持ち、言葉で人とつながる', place: '会話のテンポが合う人' },
  Cancer: { hook: '気をつかいすぎて、疲れていませんか？', nature: '月そのものの優しさを持ち、人を守ろうとする', place: '安心して素顔を見せられる人' },
  Leo: { hook: '人に合わせて、自分を見失っていませんか？', nature: '太陽の明るさを持ち、人を照らす', place: 'あなたの輝きを喜んでくれる人' },
  Virgo: { hook: '細かいことに気づきすぎて、疲れていませんか？', nature: '水星の細やかさを持ち、人の役に立とうとする', place: '気づかいに、ありがとうと言える人' },
  Libra: { hook: '角が立つのを恐れて、本音を隠していませんか？', nature: '金星の調和を持ち、釣り合いを大切にする', place: '本音も穏やかに受け止めてくれる人' },
  Scorpio: { hook: '浅い付き合いに、物足りなさを感じていませんか？', nature: '火星の強さを内に秘め、深くつながろうとする', place: '本音で長く付き合える人' },
  Sagittarius: { hook: '人間関係に縛られて、窮屈になっていませんか？', nature: '木星の大らかさを持ち、自由に世界を広げる', place: '互いの自由を認め合える人' },
  Capricorn: { hook: '弱みを見せられず、孤独を感じていませんか？', nature: '土星の誠実さを持ち、責任を背負おうとする', place: '弱さも受け止めてくれる人' },
  Aquarius: { hook: '人の輪の中で、浮いていると感じていませんか？', nature: '土星の冷静さを持ち、一人ひとりを対等に見る', place: '違いをおもしろがってくれる人' },
  Pisces: { hook: '人の気持ちを背負いすぎて、疲れていませんか？', nature: '木星の慈しみを持ち、人の痛みに寄り添う', place: '優しさを返してくれる人' },
};

function compatJa(moon: Sign): EvergreenTemplate {
  const line = JA_COMPAT[moon];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、相性を太陽ではなく月の星座同士で見ます。${JA_SIGN[moon]}の月は、${line.nature}心です。${line.place}となら、自然と心が通じます。`,
  };
}

interface LoveLine {
  /** Follows 「〈月星座〉のあなた、」 and ends with 「〜ていませんか？」. */
  hook: string;
  /** Precedes 「気持ちになるのは、そのためです」. */
  strength: string;
  /** Precedes 「となら」. */
  place: string;
}

/** Keyed by the 5th sign from the Moon, the house of romance (never spoken). */
const JA_LOVE: Record<Sign, LoveLine> = {
  Aries: { hook: '恋になると、待つばかりで動けずにいませんか？', strength: '自分から想いを伝えて、まっすぐ進みたい', place: '素直な気持ちを喜んでくれる相手' },
  Taurus: { hook: '恋を、頭で考えすぎていませんか？', strength: '心地よさを感じながら、ゆっくり恋を育てたい', place: '一緒にいて落ち着ける相手' },
  Gemini: { hook: '恋人と話せないと、不安になっていませんか？', strength: '言葉を交わして、楽しさを分け合いたい', place: '何でも話せる相手' },
  Cancer: { hook: '強く見せすぎて、恋人に甘えられずにいませんか？', strength: '守り守られる、温かい関係を育てたい', place: '安心して素顔を見せられる相手' },
  Leo: { hook: '恋をしても、自分ばかり合わせていませんか？', strength: '大切にされて、堂々と愛を表したい', place: 'あなたを誇りに思ってくれる相手' },
  Virgo: { hook: '恋人に尽くしても、報われずにいませんか？', strength: '細やかな気づかいで、相手を支えたい', place: '小さな優しさに気づく相手' },
  Libra: { hook: '恋人とぶつかるのを、避けすぎていませんか？', strength: '互いを尊重して、美しい関係を築きたい', place: '対等に向き合ってくれる相手' },
  Scorpio: { hook: '軽い恋では、満たされないと感じていませんか？', strength: '一人の人と、深く結びつきたい', place: '本音まで受け止めてくれる相手' },
  Sagittarius: { hook: '恋人に縛られると、苦しくなっていませんか？', strength: '一緒に学んで、世界を広げていきたい', place: '自由も夢も認めてくれる相手' },
  Capricorn: { hook: '恋に慎重すぎて、チャンスを逃していませんか？', strength: '時間をかけて、確かな愛を育てたい', place: '約束を守り続けてくれる相手' },
  Aquarius: { hook: 'ありきたりな恋に、退屈していませんか？', strength: '友達のように、自由に語り合いたい', place: '個性をおもしろがってくれる相手' },
  Pisces: { hook: '恋をすると、相手に尽くしすぎていませんか？', strength: '言葉を超えて、心で通じ合いたい', place: '優しさを返してくれる相手' },
};

function loveJa(moon: Sign): EvergreenTemplate {
  const fifth = signFrom(moon, 5);
  const line = JA_LOVE[fifth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、恋を表す5ハウスに${JA_RULER[RULER[fifth]]}が関わっています。${line.strength}気持ちになるのは、そのためです。${line.place}となら、きっと報われます。`,
  };
}

/** Keyed by the 2nd sign from the Moon, the house of money (never spoken). */
const JA_MONEY: Record<Sign, LoveLine> = {
  Aries: { hook: '貯めたいのに、すぐ使ってしまっていませんか？', strength: '思い切って動き、自分で稼ぎ出す', place: '自分の力で切り開く働き方' },
  Taurus: { hook: 'お金が心配で、楽しみを我慢していませんか？', strength: '本当に良いものを見分けて、価値を育てる', place: '良いものを扱う仕事' },
  Gemini: { hook: '収入が一つだけで、心細くなっていませんか？', strength: '情報を生かして、いくつもの道で稼ぐ', place: '知識や言葉を生かす仕事' },
  Cancer: { hook: '人のために、お金を使いすぎていませんか？', strength: '大切な人の暮らしを守る', place: '暮らしを支える仕事' },
  Leo: { hook: 'つい見栄を張って、お金を使っていませんか？', strength: '自分の名前と信用で、お金を生む', place: '自分が前に立つ仕事' },
  Virgo: { hook: '節約しても、お金が貯まらずにいませんか？', strength: '数字を正確に管理して、無駄を省く', place: '数字を扱う仕事' },
  Libra: { hook: '頼まれると、お金のことを断れずにいませんか？', strength: '人との信頼から、収入を生む', place: '人と組んで稼ぐ働き方' },
  Scorpio: { hook: 'お金の悩みを、誰にも相談できずにいませんか？', strength: 'お金の流れを深く読んで、着実に増やす', place: '時間をかけて育てる稼ぎ方' },
  Sagittarius: { hook: 'お金のことばかり考えて、疲れていませんか？', strength: '学びや経験を、豊かさに変える', place: '学びを生かす仕事' },
  Capricorn: { hook: 'お金が増えるのが遅いと、焦っていませんか？', strength: 'こつこつ積み上げて、確かな財産を作る', place: '長く続ける働き方' },
  Aquarius: { hook: '普通の稼ぎ方が、合わないと感じていませんか？', strength: '新しい仕組みを使って、お金を生む', place: 'ネットや新しい技術を使う稼ぎ方' },
  Pisces: { hook: '人に与えすぎて、お金が残らずにいませんか？', strength: '人を助けて、その信頼を豊かさに変える', place: '人を助ける仕事' },
};

function moneyJa(moon: Sign): EvergreenTemplate {
  const second = signFrom(moon, 2);
  const line = JA_MONEY[second];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、お金を表す2ハウスに${JA_RULER[RULER[second]]}が関わっています。${line.strength}力があるのは、そのためです。${line.place}なら、自ずからお金が巡ります。`,
  };
}

const JA_SERIES: Partial<Record<SignThemeSeries, (moon: Sign) => EvergreenTemplate>> = {
  work: workJa,
  compat: compatJa,
  love: loveJa,
  money: moneyJa,
};

/** The fixed script of one sign in one series, or null while that series has no template. */
export function buildEvergreenTemplateJa(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const moon = asSign(moonSign);
  const build = JA_SERIES[series];
  return moon && build ? build(moon) : null;
}
