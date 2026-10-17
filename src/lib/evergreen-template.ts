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

/** Keyed by the 4th sign from the Moon, the house of home and family (never spoken). */
const JA_FAMILY: Record<Sign, LoveLine> = {
  Aries: { hook: '家族と、ついぶつかってしまっていませんか？', strength: '家族を自分の手で守りたい', place: '言いたいことを言い合える家' },
  Taurus: { hook: '家にいても、心が休まらずにいませんか？', strength: '穏やかで心地よい暮らしを大切にしたい', place: 'ゆったり過ごせる暮らし' },
  Gemini: { hook: '家族と、ちゃんと話せていないと感じていませんか？', strength: '言葉を交わして、家族とつながりたい', place: '何でも話せる食卓' },
  Cancer: { hook: '家族の心配ばかりして、疲れていませんか？', strength: '家族を温かく包んで守りたい', place: 'あなたも甘えられる家' },
  Leo: { hook: '家族の中で、認めてもらえないと感じていませんか？', strength: '家族の中心で、皆を明るく支えたい', place: '頑張りを認め合える家族' },
  Virgo: { hook: '家のことを、一人で抱えすぎていませんか？', strength: '細やかに気を配って、家族の暮らしを整えたい', place: '家のことを分け合える家族' },
  Libra: { hook: '家族の間で、いつも仲裁役になっていませんか？', strength: '家族の釣り合いを取って、和やかに保ちたい', place: '皆が少しずつ譲り合える家' },
  Scorpio: { hook: '家族にも、本音を言えずにいませんか？', strength: '家族と、心の底から深く結びつきたい', place: '本音を受け止め合える家族' },
  Sagittarius: { hook: '家族と、生き方の考えが合わずにいませんか？', strength: '大切にしたい生き方を、家族と分かち合いたい', place: '互いの生き方を認め合える家' },
  Capricorn: { hook: '家族への責任を、一人で背負っていませんか？', strength: '家族のために、しっかり責任を果たしたい', place: '頼り合える家族' },
  Aquarius: { hook: '家族の中で、自分だけ違うと感じていませんか？', strength: '家族それぞれの違いを、そのまま認めたい', place: '一人ひとりの考えを尊重し合える家' },
  Pisces: { hook: '家族のために、自分を後回しにしていませんか？', strength: '家族の痛みに寄り添い、支えたい', place: '優しさを返してくれる家族' },
};

function familyJa(moon: Sign): EvergreenTemplate {
  const fourth = signFrom(moon, 4);
  const line = JA_FAMILY[fourth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、家族を表す4ハウスに${JA_RULER[RULER[fourth]]}が関わっています。${line.strength}気持ちになるのは、そのためです。${line.place}なら、心から安らげます。`,
  };
}

interface RestLine {
  /** Follows 「〈月星座〉のあなた、」 and ends with 「〜ていませんか？」. */
  hook: string;
  /** How this mind recovers; precedes 「のは、そのためです」. */
  why: string;
  /** What gives that recovery; precedes 「があれば」. */
  place: string;
}

/** Keyed by the 12th sign from the Moon, the house of rest and sleep (never spoken). */
const JA_REST: Record<Sign, RestLine> = {
  Aries: { hook: '横になって休んでも、疲れが取れずにいませんか？', why: 'じっとしているより、体を動かした方が心が休まる', place: '汗をかく時間' },
  Taurus: { hook: '忙しさに追われて、心まで疲れていませんか？', why: '心地よいものに囲まれると、心がほどける', place: '好きな音や香りに浸る時間' },
  Gemini: { hook: '頭が休まらず、夜も眠れずにいませんか？', why: '考えを言葉にして外に出すと、心が軽くなる', place: '思いを誰かに話す時間' },
  Cancer: { hook: '人の世話ばかりで、疲れ切っていませんか？', why: '安心できる場所で、心が満たされる', place: '自分が甘えられる場所' },
  Leo: { hook: '頑張りすぎて、燃え尽きそうになっていませんか？', why: '誰にも見られない時間で、心が満ちる', place: '役目を下りる一人の時間' },
  Virgo: { hook: '休みの日も、やることばかり考えていませんか？', why: '身の回りが整うと、心も落ち着く', place: '整った静かな場所' },
  Libra: { hook: '人に気をつかいすぎて、ぐったりしていませんか？', why: '美しいものに触れると、心が整う', place: '好きな景色を眺める時間' },
  Scorpio: { hook: '疲れを、誰にも見せられずにいませんか？', why: '一人で深く眠ると、心が立ち直る', place: '誰にも邪魔されない眠り' },
  Sagittarius: { hook: '同じことの繰り返しで、疲れていませんか？', why: '新しい景色や学びに触れると、心が広がる', place: '知らない場所へ出かける時間' },
  Capricorn: { hook: '休むことに、罪悪感を持っていませんか？', why: '決まった時間に休むと、心が安定する', place: '毎日決まった休みの時間' },
  Aquarius: { hook: '人の中にいるだけで、疲れていませんか？', why: '人から離れて自分のペースに戻ると、心が回復する', place: '自分のペースで過ごす時間' },
  Pisces: { hook: '人の気持ちを受け取りすぎて、疲れていませんか？', why: '音楽や水辺に身を置くと、心が洗われる', place: '静かに音楽を聴く時間' },
};

function restJa(moon: Sign): EvergreenTemplate {
  const twelfth = signFrom(moon, 12);
  const line = JA_REST[twelfth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、休息を表す12ハウスに${JA_RULER[RULER[twelfth]]}が関わっています。${line.why}のは、そのためです。${line.place}があれば、自ずと力が戻ります。`,
  };
}

/** Keyed by the Moon sign itself, the 1st house counted from the Moon (never spoken). */
const JA_IMPRESSION: Record<Sign, RestLine> = {
  Aries: { hook: '怖い人だと、誤解されていませんか？', why: '迷わず動く姿が、強く見える', place: '先頭に立つ場面' },
  Taurus: { hook: 'のんびりしていると、思われていませんか？', why: '落ち着いた佇まいが、ゆったりして見える', place: '長く付き合う関係' },
  Gemini: { hook: '軽い人だと、思われていませんか？', why: '話の早さと身軽さが、軽やかに見える', place: '人と人をつなぐ場面' },
  Cancer: { hook: '気分屋だと、思われていませんか？', why: '心の動きが、そのまま顔に出る', place: '人を気づかう場面' },
  Leo: { hook: '偉そうだと、誤解されていませんか？', why: '堂々とした姿が、自信に満ちて見える', place: '人をまとめる場面' },
  Virgo: { hook: '細かくて厳しい人だと、思われていませんか？', why: 'よく気がつく目が、厳しく見える', place: '物事を整える場面' },
  Libra: { hook: '八方美人だと、思われていませんか？', why: '誰にでも感じよく接する姿が、そう見える', place: '人の間を取り持つ場面' },
  Scorpio: { hook: '何を考えているか分からないと、言われていませんか？', why: '心の奥を簡単に見せない姿が、謎めいて見える', place: '大事なことを任される場面' },
  Sagittarius: { hook: '大ざっぱな人だと、思われていませんか？', why: '大きな目的を見る姿が、おおらかに見える', place: '人を導く場面' },
  Capricorn: { hook: '冷たい人だと、誤解されていませんか？', why: '感情より責任を先に立てる姿が、硬く見える', place: '大事な仕事を任される場面' },
  Aquarius: { hook: '変わった人だと、思われていませんか？', why: '周りに流されない考え方が、独特に見える', place: '新しい考えが求められる場面' },
  Pisces: { hook: '頼りない人だと、思われていませんか？', why: '人を責めない優しさが、柔らかく見える', place: '人の心を癒やす場面' },
};

function impressionJa(moon: Sign): EvergreenTemplate {
  const line = JA_IMPRESSION[moon];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、人に見せる顔を表す1ハウスに${JA_RULER[RULER[moon]]}が関わっています。${line.why}のは、そのためです。${line.place}なら、その印象が自ずと信頼に変わります。`,
  };
}

/** Keyed by the 6th sign from the Moon, the house of strain and conflict (never spoken). */
const JA_AVOID: Record<Sign, RestLine> = {
  Aries: { hook: '言い争いの多い職場で、すり減っていませんか？', why: '怒りや競争が飛び交う場所で、心が消耗する', place: '穏やかに話し合える環境' },
  Taurus: { hook: '慌ただしい環境で、落ち着かずにいませんか？', why: '急な変更が続く場所で、心が乱れる', place: '決まった流れで進む環境' },
  Gemini: { hook: '連絡や雑談に追われて、疲れていませんか？', why: '言葉が多すぎる場所で、頭が休まらない', place: '静かに集中できる環境' },
  Cancer: { hook: '冷たい空気の場所で、心細くなっていませんか？', why: '気持ちを分かり合えない場所で、心がしぼむ', place: '互いを気づかえる環境' },
  Leo: { hook: '頑張りを認めてもらえない場所で、疲れていませんか？', why: '存在を軽く扱われる場所で、自信が削られる', place: '役目をきちんと任される環境' },
  Virgo: { hook: 'いい加減な職場に、苛立っていませんか？', why: '決まりのない場所で、気が休まらない', place: '手順が整った環境' },
  Libra: { hook: '人の争いの間に立って、疲れていませんか？', why: '不公平なやり取りが続く場所で、心が乱れる', place: '公平に扱われる環境' },
  Scorpio: { hook: '駆け引きの多い場所で、疲れていませんか？', why: '本音の見えない人間関係で、心が張りつめる', place: '隠し事のない環境' },
  Sagittarius: { hook: '細かい決まりに縛られて、息苦しくなっていませんか？', why: '目的の見えない決まりが多い場所で、心がしぼむ', place: '考えを任せてもらえる環境' },
  Capricorn: { hook: '終わりの見えない忙しさに、疲れていませんか？', why: '責任ばかり重なる場所で、心が重くなる', place: '役割と休みがはっきりした環境' },
  Aquarius: { hook: '古いやり方を押しつけられて、窮屈になっていませんか？', why: '変化を嫌う場所で、心が固まる', place: '新しい考えを試せる環境' },
  Pisces: { hook: '人の悩みを背負う場所で、疲れ切っていませんか？', why: '際限なく頼られる場所で、心が擦り切れる', place: '自分の時間を守れる環境' },
};

function avoidJa(moon: Sign): EvergreenTemplate {
  const sixth = signFrom(moon, 6);
  const line = JA_AVOID[sixth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、心をすり減らすものを表す6ハウスに${JA_RULER[RULER[sixth]]}が関わっています。${line.why}のは、そのためです。${line.place}なら、あなたらしさを取り戻せます。`,
  };
}

/** Keyed by the 8th sign from the Moon, the house of life's turning points (never spoken). */
interface TurningLine { hook: string; arrival: string; action: string }

const JA_TURNING: Record<Sign, TurningLine> = {
  Aries: { hook: '我慢の限界で、全部投げ出したくなっていませんか？', arrival: '衝突や我慢の限界をきっかけに、ある日突然', action: '勢いで辞める前に、次の行き先を一つ決めておく' },
  Taurus: { hook: '収入や暮らしが変わるのが、怖くなっていませんか？', arrival: 'お金や住まいの入れ替わりとして、ゆっくり', action: '守りたい暮らしを一つだけ決めて、残りは手放す' },
  Gemini: { hook: '人から聞いた話が、ずっと頭に残っていませんか？', arrival: '人の紹介や、何気なく聞いた話から', action: '気になった話は、その週のうちに会って確かめる' },
  Cancer: { hook: '家族のことで、生き方を変えようか迷っていませんか？', arrival: '家族の事情や引っ越しをきっかけに', action: '家族の都合だけでなく、自分の望みも同じ重さで考える' },
  Leo: { hook: '今の立場に、物足りなさを感じていませんか？', arrival: '昇進や、人前に立つ役目を頼まれる形で', action: '頼まれた役目は、迷っても一度引き受けてみる' },
  Virgo: { hook: '体調や働き方に、無理を感じていませんか？', arrival: '体調の変化や、働き方の見直しとして', action: '不調を我慢せず、働き方そのものを変える' },
  Libra: { hook: '結婚や別れで、人生が揺れていませんか？', arrival: '結婚や別れなど、大切な人との関係の変化として', action: '相手に合わせるのではなく、自分がどう生きたいかで選ぶ' },
  Scorpio: { hook: '誰にも言えない悩みを、抱えていませんか？', arrival: '隠していた問題が表に出る形で', action: '一人で抱えず、信頼できる人に打ち明ける' },
  Sagittarius: { hook: '学び直しや海外に、惹かれていませんか？', arrival: '学び直しや、遠い土地との縁として', action: '興味のある講座や土地に、まず一度足を運ぶ' },
  Capricorn: { hook: '長く続けた仕事を、辞めるか迷っていませんか？', arrival: '何年も続けたことが区切りを迎える形で', action: '積み上げた経験を、次の場所へそのまま持っていく' },
  Aquarius: { hook: '会社の外で働くことを、考えていませんか？', arrival: '組織を離れる、仲間と新しく始めるといった形で', action: '一人で抱えず、同じ考えの仲間を探す' },
  Pisces: { hook: '説明できない予感に、心が揺れていませんか？', arrival: '理屈では説明できない予感や、偶然の出会いとして', action: '予感を打ち消さず、小さく試してみる' },
};

function turningJa(moon: Sign): EvergreenTemplate {
  const eighth = signFrom(moon, 8);
  const line = JA_TURNING[eighth];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、人生の変わり目を表す8ハウスに${JA_RULER[RULER[eighth]]}が関わっています。転機は、${line.arrival}訪れます。${line.action}と、それが追い風になります。`,
  };
}

/** Keyed by the Moon sign itself: the mind's habit and what dropping it frees. */
interface HabitLine { hook: string; why: string; stop: string; relief: string }

const JA_HABIT: Record<Sign, HabitLine> = {
  Aries: { hook: '返事を、すぐに出そうとしていませんか？', why: '決める前に、つい先に動いてしまう', stop: '大事な返事だけ一晩置く', relief: '後から謝る場面がぐっと減ります' },
  Taurus: { hook: '合わない物や人を、手放せずにいませんか？', why: '一度手にしたものを、守り続けようとする', stop: '使っていない物を一つ手放す', relief: '気持ちに余裕が生まれます' },
  Gemini: { hook: '寝る前まで、スマホを見続けていませんか？', why: '新しい情報を、いつも追いかけてしまう', stop: '寝る一時間前に画面を閉じる', relief: '頭のざわつきが静まります' },
  Cancer: { hook: '人の機嫌を、いつも気にしていませんか？', why: '周りの気持ちを、自分のことのように受け取る', stop: '相手の機嫌を直そうとするのをやめる', relief: '自分の気持ちが戻ってきます' },
  Leo: { hook: '弱音を吐かずに、一人で頑張っていませんか？', why: '頼られる自分でいようとする', stop: '一つだけ、人に助けを頼む', relief: '肩の荷がすっと軽くなります' },
  Virgo: { hook: '終わったことを、何度も見直していませんか？', why: '小さな粗まで、気になってしまう', stop: '見直しを一回で終える', relief: '時間と気力が残ります' },
  Libra: { hook: '本当は嫌なのに、引き受けていませんか？', why: '場の空気を、壊さないようにする', stop: '一度だけ、はっきり断る', relief: '人付き合いが楽になります' },
  Scorpio: { hook: '言われた一言を、ずっと引きずっていませんか？', why: '心に受けた傷を、深く刻み込む', stop: 'その一言を、信頼できる人に話してしまう', relief: '胸のつかえが取れます' },
  Sagittarius: { hook: '予定を、詰め込みすぎていませんか？', why: '面白そうなことに、すぐ手を伸ばす', stop: '予定を一つ減らす', relief: '一つひとつを楽しめるようになります' },
  Capricorn: { hook: '休みの日まで、仕事のことを考えていませんか？', why: '責任を、いつも先に立てる', stop: '休みの日は仕事の連絡を見ない', relief: '次の週の力が違ってきます' },
  Aquarius: { hook: '人に頼らず、全部自分で決めていませんか？', why: '自分のやり方を、崩したくない', stop: '一つだけ、人の案に乗ってみる', relief: '思わぬ道が開けます' },
  Pisces: { hook: '人の頼みを、断れずにいませんか？', why: '困っている人を、放っておけない', stop: 'すぐに返事をせず、一度持ち帰る', relief: '自分の時間が守れます' },
};

function habitJa(moon: Sign): EvergreenTemplate {
  const line = JA_HABIT[moon];
  return {
    hook: `月星座が${JA_SIGN[moon]}のあなた、${line.hook}`,
    body: `インド占星術では、心を表す月に${JA_RULER[RULER[moon]]}が関わっています。${line.why}のは、そのためです。${line.stop}と、${line.relief}。`,
  };
}

const JA_SERIES: Partial<Record<SignThemeSeries, (moon: Sign) => EvergreenTemplate>> = {
  work: workJa,
  compat: compatJa,
  love: loveJa,
  money: moneyJa,
  family: familyJa,
  rest: restJa,
  impression: impressionJa,
  avoid: avoidJa,
  turning: turningJa,
  habit: habitJa,
};

/** The fixed script of one sign in one series, or null while that series has no template. */
export function buildEvergreenTemplateJa(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const moon = asSign(moonSign);
  const build = JA_SERIES[series];
  return moon && build ? build(moon) : null;
}
