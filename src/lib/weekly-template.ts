/**
 * Weekly 30s readings assembled entirely from fixed sentences: the placement is computed,
 * the worry is picked from the house's list, and no model writes any of it.
 */
import { JA_PLANET, JA_SIGN, Placement, SIGNS, asSign, jaDay, placementsFor } from '@/lib/placements';

interface Worry {
  /** Follows 「〈星座〉のあなたは、」 and ends with 「〜ていませんか？」. */
  hook: string;
  /** Subject of 「〜のは、…ためです。」 */
  reason: string;
  /** What this period is good for in that field. */
  use: string;
}

/** What each house governs, in a phrase that fits 「〜を見直すよう促している」. */
const JA_HOUSE_FIELD: Record<number, string> = {
  1: '自分自身のあり方',
  2: 'お金や大切にしているもの',
  3: '日々のやり取りや自分から動く力',
  4: '家庭や心の安らぎ',
  5: '恋愛や楽しみ、才能の生かし方',
  6: '日々の務めや体の調子',
  7: '向き合う相手との関係',
  8: '思いがけない変化への向き合い方',
  9: '生き方や信じているもの',
  10: '仕事や社会での立場',
  11: '収入の伸びや仲間とのつながり',
  12: '休み方や手放し方',
};

const JA_WORRIES: Record<number, Worry[]> = {
  1: [
    { hook: 'なんとなく自分に自信が持てずにいませんか？', reason: '自分に自信が持てない', use: '今は、自分の良いところを一つずつ確かめ直す時期です。' },
    { hook: '何から始めればよいか決められずにいませんか？', reason: '始め方が決められない', use: '今は、小さな一歩目を決めてみるのに向いた時期です。' },
    { hook: '周りと比べて焦ってしまっていませんか？', reason: '周りと比べて焦ってしまう', use: '今は、自分の歩幅を取り戻すのに向いた時期です。' },
    { hook: '毎日がなんとなく過ぎていくと感じていませんか？', reason: '毎日がなんとなく過ぎていく', use: '今は、自分が本当にしたいことを思い出す時期です。' },
    { hook: '休んでも疲れが抜けないと感じていませんか？', reason: '疲れが抜けにくい', use: '今は、体の調子を整えることを最優先にしてよい時期です。' },
  ],
  2: [
    { hook: 'お金の不安がなかなか消えずにいませんか？', reason: 'お金の不安が消えない', use: '今は、何があれば安心できるのかを見直すのに向いた時期です。' },
    { hook: '気づくとお金が貯まっていないと感じていませんか？', reason: 'お金が手元に残らない', use: '今は、お金の使い方を落ち着いて整え直す時期です。' },
    { hook: '言いたいことをうまく言葉にできずにいませんか？', reason: '言いたいことが言葉にならない', use: '今は、本当の気持ちを言葉にする練習に向いた時期です。' },
    { hook: '今あるものを失うのが怖くなっていませんか？', reason: '失うことが怖くなる', use: '今は、本当に大切なものを選び直すのに向いた時期です。' },
    { hook: '自分の価値を低く見積もっていませんか？', reason: '自分の価値を低く見てしまう', use: '今は、自分が持っている力を正しく数え直す時期です。' },
  ],
  3: [
    { hook: '自分から動く勇気が出ずにいませんか？', reason: '自分から動けない', use: '今は、小さな行動を一つずつ積み重ねるのに向いた時期です。' },
    { hook: '思っていることを周りにうまく伝えられずにいませんか？', reason: '思いがうまく伝わらない', use: '今は、伝え方を落ち着いて工夫し直すのに向いた時期です。' },
    { hook: '頑張っても前に進んでいない気がしていませんか？', reason: '前に進んでいない気がする', use: '今は、これまでの努力の手応えを確かめ直す時期です。' },
    { hook: '職場の人につい気をつかいすぎていませんか？', reason: '気をつかいすぎてしまう', use: '今は、遠慮せずに自分の考えを話してよい時期です。' },
    { hook: '新しいことを始めたいのに動けずにいませんか？', reason: '始めたいのに動けない', use: '今は、まず試してみることを自分に許してよい時期です。' },
  ],
  4: [
    { hook: '家にいても気が休まらずにいませんか？', reason: '家にいても気が休まらない', use: '今は、自分が落ち着ける過ごし方を見つけ直す時期です。' },
    { hook: '家族に素直になれずにいませんか？', reason: '家族に素直になれない', use: '今は、身近な人との安心できる関係を整え直す時期です。' },
    { hook: '親との距離感に迷っていませんか？', reason: '親との距離感に迷う', use: '今は、お互いに心地よい距離を考え直すのに向いた時期です。' },
    { hook: '心から安心できる場所がないと感じていませんか？', reason: '安心できる場所がないと感じる', use: '今は、心の拠り所を自分の中に育て直す時期です。' },
    { hook: '家族のことで気が休まらずにいませんか？', reason: '家族のことで気が休まらない', use: '今は、自分にできることとできないことを分けて考える時期です。' },
  ],
  5: [
    { hook: '好きなことを心から楽しめずにいませんか？', reason: '好きなことを楽しめない', use: '今は、本当に心が動くものを探し直すのに向いた時期です。' },
    { hook: '好きなのにあと一歩が踏み出せずにいませんか？', reason: 'あと一歩が踏み出せない', use: '今は、自分がどんな関係を望んでいるのかを確かめる時期です。' },
    { hook: '自分の才能に自信が持てずにいませんか？', reason: '才能に自信が持てない', use: '今は、得意なことを一つ磨き直すのに向いた時期です。' },
    { hook: '新しい挑戦をしたいのに失敗を怖がっていませんか？', reason: '失敗が怖くなる', use: '今は、小さく試して経験を積むのに向いた時期です。' },
    { hook: '出会いはあるのに続かないと感じていませんか？', reason: '出会いが続かない', use: '今は、自分が心から楽しめる関係を考え直す時期です。' },
  ],
  6: [
    { hook: '義務を一人で抱え込んで疲れていませんか？', reason: '義務を抱え込んで疲れる', use: '今は、人に任せられることを選び直す時期です。' },
    { hook: '職場の人間関係ですり減っていませんか？', reason: '人間関係ですり減る', use: '今は、自分を守る距離の取り方を身につける時期です。' },
    { hook: '断れなくて予定を詰め込みすぎていませんか？', reason: '断れずに抱え込んでしまう', use: '今は、引き受けることを選び直すのに向いた時期です。' },
    { hook: '休むことに罪悪感を覚えていませんか？', reason: '休むことに罪悪感を覚える', use: '今は、休むことも務めのうちだと考えてよい時期です。' },
    { hook: '毎日の忙しさに追われていると感じていませんか？', reason: '忙しさに追われてしまう', use: '今は、毎日の過ごし方を無理のない形に整え直す時期です。' },
  ],
  7: [
    { hook: '相手の本当の気持ちが分からずにいませんか？', reason: '相手の気持ちが分からない', use: '今は、相手の話を最後まで聞くことに向いた時期です。' },
    { hook: '人との関係で譲りすぎていませんか？', reason: '譲りすぎてしまう', use: '今は、自分の望みも相手に伝えてよい時期です。' },
    { hook: '人と深く関わることをためらっていませんか？', reason: '人と深く関わるのをためらう', use: '今は、信頼できる人との関係を少しずつ深める時期です。' },
    { hook: '本音を言えないまま時間だけが過ぎていませんか？', reason: '本音を言えないままになる', use: '今は、落ち着いて本音を伝え直すのに向いた時期です。' },
    { hook: '自分ばかり頑張っていると感じていませんか？', reason: '自分ばかり頑張っていると感じる', use: '今は、支え合える関係の形を見直す時期です。' },
  ],
  8: [
    { hook: '先の見えない不安が消えずにいませんか？', reason: '先の見えない不安が消えない', use: '今は、変えられないことより、変えられることに目を向ける時期です。' },
    { hook: '人に頼ることを怖がっていませんか？', reason: '人に頼るのが怖い', use: '今は、信頼できる人に少しだけ任せてみる時期です。' },
    { hook: '変わっていくことを受け入れられずにいませんか？', reason: '変化を受け入れられない', use: '今は、古いやり方を手放して立て直す時期です。' },
    { hook: '将来のお金が不安で落ち着かずにいませんか？', reason: '将来のお金が不安になる', use: '今は、備えを落ち着いて見直すのに向いた時期です。' },
    { hook: '誰にも言えない不安を抱えていませんか？', reason: '誰にも言えない不安を抱える', use: '今は、心の奥にあるものを自分で受け止め直す時期です。' },
  ],
  9: [
    { hook: '今の道で正しいのかと迷っていませんか？', reason: '今の道で正しいのか迷う', use: '今は、自分が大切にしたい考えを確かめ直す時期です。' },
    { hook: '信じてきたものが揺らいでいませんか？', reason: '信じてきたものが揺らぐ', use: '今は、本当に信じられるものを選び直す時期です。' },
    { hook: '何のために頑張っているのか分からなくなっていませんか？', reason: '頑張る理由が見えなくなる', use: '今は、学び直して目的を取り戻すのに向いた時期です。' },
    { hook: 'もっと学びたいのに踏み出せずにいませんか？', reason: '学びたいのに踏み出せない', use: '今は、興味のあることを一つ学び始めるのに向いた時期です。' },
    { hook: '頼れる手本が見つからないと感じていませんか？', reason: '頼れる手本が見つからない', use: '今は、尊敬できる考え方に出会い直す時期です。' },
  ],
  10: [
    { hook: '頑張っても評価されない気がしていませんか？', reason: '頑張っても評価されない気がする', use: '今は、自分の実績を落ち着いて積み上げ直す時期です。' },
    { hook: '今の仕事このままでいいのかと迷っていませんか？', reason: '仕事の方向に迷う', use: '今は、自分が長く続けたい働き方を見直す時期です。' },
    { hook: '責任ばかり増えて報われないと感じていませんか？', reason: '責任ばかり増えて報われない', use: '今は、引き受ける仕事を選び直す時期です。' },
    { hook: '転職したいのに踏み切れずにいませんか？', reason: '転職に踏み切れない', use: '今は、自分の強みを確かめ直すのに向いた時期です。' },
    { hook: '職場の人間関係で朝から気が重くなっていませんか？', reason: '職場のことで気が重くなる', use: '今は、自分の役目に集中し直すのに向いた時期です。' },
  ],
  11: [
    { hook: '頑張りが収入に結びついていないと感じていませんか？', reason: '頑張りが収入に結びつかない', use: '今は、収入につながる力を一つ育て直す時期です。' },
    { hook: '仲間の中で居場所がないと感じていませんか？', reason: '居場所がないと感じる', use: '今は、本当に気の合う人とのつながりを大事にする時期です。' },
    { hook: '願いが叶う気がしないとあきらめかけていませんか？', reason: '願いが叶う気がしない', use: '今は、願いを小さな目標に分け直す時期です。' },
    { hook: '誘われないと置いていかれた気がしていませんか？', reason: '置いていかれた気がする', use: '今は、自分から声をかけてみるのに向いた時期です。' },
    { hook: '収入を増やすきっかけがないと感じていませんか？', reason: '収入を増やすきっかけがない', use: '今は、人とのつながりから機会を探すのに向いた時期です。' },
  ],
  12: [
    { hook: '眠っても疲れが取れずにいませんか？', reason: '眠っても疲れが取れない', use: '今は、一人で休む時間をしっかり取ってよい時期です。' },
    { hook: '一人になりたい気持ちに罪悪感を覚えていませんか？', reason: '一人になりたいのに罪悪感を覚える', use: '今は、一人の時間で心を立て直す時期です。' },
    { hook: '手放したいのに手放せないものを抱えていませんか？', reason: '手放したいのに手放せない', use: '今は、抱えているものを一つずつ軽くしていく時期です。' },
    { hook: '気づくと出費がかさんでいると感じていませんか？', reason: '出費がかさんでしまう', use: '今は、本当に必要なものを選び直すのに向いた時期です。' },
    { hook: '心のどこかでずっと疲れを感じていませんか？', reason: '心の疲れが抜けない', use: '今は、何もしない時間を自分に許してよい時期です。' },
  ],
};

const JA_NATURE: Record<string, string> = {
  Sun: '自分らしさを表す太陽',
  Mars: '行動力を表す火星',
  Mercury: '考えと言葉を表す水星',
  Jupiter: '成長と広がりを表す木星',
  Venus: '豊かさと愛情を表す金星',
  Saturn: '責任と忍耐を表す土星',
  Rahu: '欲求を膨らませるラーフ',
  Ketu: '執着をほどくケートゥ',
};

const PRIORITY = ['Saturn', 'Jupiter', 'Rahu', 'Ketu', 'Mars', 'Venus', 'Mercury', 'Sun'];

function rank(placement: Placement): number {
  const base = PRIORITY.indexOf(placement.planet);
  if (placement.ingress) return base;
  if (placement.retrograde && placement.planet !== 'Rahu' && placement.planet !== 'Ketu') return 10 + base;
  return 20 + base;
}

export interface TemplateScript {
  hook_text: string;
  body_script: string;
  planet: string;
  house: number;
}

/** `weekNumber` rotates the worry so the same house does not repeat the same question every week. */
export function buildWeeklyTemplateJa(
  reference: string,
  moonSign: string,
  spokenPeriod: string,
  weekNumber: number,
  /** Worries already used this week, so two signs never ask the same question. */
  used: Set<string> = new Set(),
): TemplateScript | null {
  const moon = asSign(moonSign);
  if (!moon) return null;
  const placements = placementsFor(reference, moonSign).filter((p) => JA_PLANET[p.planet] && JA_NATURE[p.planet]);
  const sorted = [...placements].sort((a, b) => rank(a) - rank(b));
  // Every sign sees the same moving planets; alternating among the week's notable ones keeps
  // twelve videos from all naming one planet.
  const notable = sorted.filter((p) => rank(p) < 20);
  const chosen = notable.length ? notable[SIGNS.indexOf(moon) % notable.length] : sorted[0];
  if (!chosen) return null;

  const planet = JA_PLANET[chosen.planet];
  const node = chosen.planet === 'Rahu' || chosen.planet === 'Ketu';
  const day = chosen.ingress ? jaDay(chosen.ingress.day) : null;
  const house = chosen.ingress && day ? chosen.ingress.house : chosen.house;
  const field = JA_HOUSE_FIELD[house];
  const worries = JA_WORRIES[house];
  let index = (weekNumber + SIGNS.indexOf(moon)) % worries.length;
  for (let step = 0; step < worries.length && used.has(`${house}:${index}`); step += 1) {
    index = (index + 1) % worries.length;
  }
  used.add(`${house}:${index}`);
  const worry = worries[index];

  const where = `インド占星術では、${spokenPeriod}、月星座の${JA_SIGN[moon]}から${chosen.house}ハウス目の${JA_SIGN[chosen.sign]}`;
  let opening: string;
  let cause: string;
  if (chosen.ingress && day) {
    opening = `${where}にある${planet}が、${day}に${house}ハウス目の${JA_SIGN[chosen.ingress.sign]}へ移ります。`;
    cause = `${JA_NATURE[chosen.planet]}が、${field}の分野に入ってくる`;
  } else if (chosen.retrograde && !node) {
    opening = `${where}で、${planet}が逆行しています。`;
    cause = `${JA_NATURE[chosen.planet]}が逆行し、${field}を見直し、立て直すよう促している`;
  } else {
    opening = `${where}に、${planet}があります。`;
    cause =
      chosen.planet === 'Rahu'
        ? `${JA_NATURE.Rahu}が、${field}への思いを強めている`
        : chosen.planet === 'Ketu'
          ? `${JA_NATURE.Ketu}が、${field}から心を少し離させている`
          : `${JA_NATURE[chosen.planet]}が、${field}に強く働いている`;
  }

  return {
    hook_text: `${JA_SIGN[moon]}のあなたは、${worry.hook}`,
    body_script: `${opening}${worry.reason}のは、${cause}ためです。${worry.use}`,
    planet: chosen.planet,
    house,
  };
}

/** Every worry, for review: `house: hook`. */
export function listJaWorries(): string[] {
  return Object.entries(JA_WORRIES).flatMap(([house, list]) =>
    [`【${house}ハウス：${JA_HOUSE_FIELD[Number(house)]}】`, ...list.map((w, i) => `${i + 1}. ${w.hook}`)],
  );
}
