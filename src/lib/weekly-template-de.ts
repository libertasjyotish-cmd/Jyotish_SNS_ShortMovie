/** German weekly reading (du). Same worry order as `JA_WORRIES`; written by hand. */
import type { Sign } from '@/lib/placements';
import { zodiacName } from '@/lib/zodiac-names';
import { isNode, LanguagePack, Worry } from '@/lib/weekly-template-pack';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'de') ?? s;

const PLANET: Record<string, string> = {
  Sun: 'die Sonne', Mars: 'Mars', Mercury: 'Merkur', Jupiter: 'Jupiter', Venus: 'Venus',
  Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu',
};

const NATURE: Record<string, string> = {
  Sun: 'die Sonne, der Planet des Selbstausdrucks,',
  Mars: 'Mars, der Planet des Antriebs,',
  Mercury: 'Merkur, der Planet des Denkens und Sprechens,',
  Jupiter: 'Jupiter, der Planet des Wachstums,',
  Venus: 'Venus, der Planet der Liebe und des Wohlbefindens,',
  Saturn: 'Saturn, der Planet der Pflicht und Geduld,',
  Rahu: 'Rahu, der das Verlangen verstärkt,',
  Ketu: 'Ketu, der Bindungen lockert,',
};

/** Used as "den Bereich …". */
const FIELD: Record<number, string> = {
  1: 'Selbstbild und Selbstvertrauen',
  2: 'Geld, Worte und eigene Werte',
  3: 'Alltagsgespräche und Tatkraft',
  4: 'Zuhause und innere Ruhe',
  5: 'Liebe, Freude und Talente',
  6: 'Alltagspflichten und Gesundheit',
  7: 'enge Beziehungen',
  8: 'plötzliche Veränderungen',
  9: 'Überzeugungen und Lebensrichtung',
  10: 'Beruf und Stellung',
  11: 'Einkommen und Freundschaften',
  12: 'Ruhe und Loslassen',
};

/** [hook question, "Wenn du …" clause (verb last), "… zu …" infinitive]. */
const WORRIES: Record<number, Worry[]> = {
  1: [
    ['fällt es dir schwer, an dich zu glauben?', 'dir schwer tust, an dich zu glauben', 'deine Stärken eine nach der anderen neu zu entdecken.'],
    ['weißt du nicht, wo du anfangen sollst?', 'nicht weißt, wo du anfangen sollst', 'einen ersten kleinen Schritt zu wählen.'],
    ['setzt dich der Vergleich mit anderen unter Druck?', 'dich im Vergleich mit anderen unter Druck fühlst', 'deinen eigenen Rhythmus wiederzufinden.'],
    ['hast du das Gefühl, dass die Tage an dir vorbeiziehen?', 'das Gefühl hast, dass die Tage an dir vorbeiziehen', 'dich zu erinnern, was du wirklich tun willst.'],
    ['bleibt die Müdigkeit, obwohl du dich ausruhst?', 'müde bleibst, obwohl du dich ausruhst', 'deine Gesundheit an die erste Stelle zu setzen.'],
  ],
  2: [
    ['lassen dich Geldsorgen nicht los?', 'Geldsorgen nicht loswirst', 'zu prüfen, was dir wirklich Sicherheit gibt.'],
    ['hast du das Gefühl, dass Geld nie bleibt?', 'das Gefühl hast, dass Geld nie bleibt', 'in Ruhe zu überdenken, wofür du Geld ausgibst.'],
    ['fällt es dir schwer, Gefühle in Worte zu fassen?', 'Gefühle schwer in Worte fassen kannst', 'zu üben, auszusprechen, was du wirklich fühlst.'],
    ['hast du Angst, zu verlieren, was du hast?', 'Angst hast, zu verlieren, was du hast', 'neu zu wählen, was dir wirklich wichtig ist.'],
    ['unterschätzt du deinen eigenen Wert?', 'deinen eigenen Wert unterschätzt', 'ehrlich anzuerkennen, was du alles kannst.'],
  ],
  3: [
    ['fehlt dir der Mut, ins Handeln zu kommen?', 'dir der Mut fehlt, ins Handeln zu kommen', 'kleine Schritte einen nach dem anderen zu gehen.'],
    ['kommt nicht an, was du sagen willst?', 'das Gefühl hast, dass deine Worte nicht ankommen', 'in Ruhe eine neue Art auszuprobieren, dich auszudrücken.'],
    ['strengst du dich an, ohne voranzukommen?', 'dich anstrengst, ohne voranzukommen', 'anzuerkennen, wie weit dich deine Mühe schon gebracht hat.'],
    ['hältst du dich bei Kollegen zu sehr zurück?', 'dich bei Kollegen zu sehr zurückhältst', 'deine Ideen ohne Entschuldigung zu teilen.'],
    ['willst du Neues beginnen, traust dich aber nicht?', 'Neues beginnen willst, dich aber nicht traust', 'dir zu erlauben, es einfach zu versuchen.'],
  ],
  4: [
    ['kannst du selbst zu Hause nicht abschalten?', 'selbst zu Hause nicht abschalten kannst', 'Gewohnheiten wiederzufinden, die dich beruhigen.'],
    ['fällt es dir schwer, dich deiner Familie zu öffnen?', 'dich deiner Familie schwer öffnen kannst', 'mit deinen Nächsten wieder Geborgenheit aufzubauen.'],
    ['lässt du dich von deinen Stimmungen mitreißen?', 'dich von deinen Stimmungen mitreißen lässt', 'Tage zu gestalten, die dein Herz ruhig halten.'],
    ['fehlt dir ein Ort, an dem du wirklich ausruhst?', 'das Gefühl hast, keinen Ort zum Ausruhen zu haben', 'einen ruhigen Raum in dir selbst zu pflegen.'],
    ['raubt dir Familiäres die innere Ruhe?', 'spürst, dass Familiäres dir die innere Ruhe raubt', 'zu trennen, was du ändern kannst und was nicht.'],
  ],
  5: [
    ['fällt es dir schwer, zu genießen, was du magst?', 'schwer genießen kannst, was du magst', 'neu zu suchen, was dein Herz wirklich bewegt.'],
    ['magst du jemanden, zögerst aber, weiterzugehen?', 'jemanden magst, aber zögerst, weiterzugehen', 'zu klären, welche Verbindung du dir wirklich wünschst.'],
    ['zweifelst du an deinen Talenten?', 'an deinen Talenten zweifelst', 'eine Sache zu verfeinern, die du gut kannst.'],
    ['willst du Neues wagen, fürchtest aber das Scheitern?', 'Neues wagen willst, aber das Scheitern fürchtest', 'es im Kleinen zu versuchen und Erfahrung zu sammeln.'],
    ['lernst du Menschen kennen, aber nichts hält?', 'Menschen kennenlernst, aber nichts hält', 'zu überdenken, welche Verbindungen dir wirklich guttun.'],
  ],
  6: [
    ['trägst du alle Aufgaben allein?', 'alle Aufgaben allein trägst', 'auszuwählen, was du anderen überlassen kannst.'],
    ['zehren dich die Beziehungen bei der Arbeit aus?', 'spürst, dass dich die Beziehungen bei der Arbeit auszehren', 'den Abstand zu lernen, der dich schützt.'],
    ['kannst du nicht Nein sagen, bis dein Kalender platzt?', 'nicht Nein sagen kannst, bis dein Kalender platzt', 'festzulegen, was du wirklich übernehmen kannst.'],
    ['hast du ein schlechtes Gewissen, wenn du ruhst?', 'ein schlechtes Gewissen hast, wenn du ruhst', 'Ruhe als Teil deiner Pflichten zu sehen.'],
    ['fühlst du dich jeden Tag gehetzt?', 'dich jeden Tag gehetzt fühlst', 'deine Tage in einem Rhythmus zu ordnen, den du halten kannst.'],
  ],
  7: [
    ['weißt du nicht, was ein naher Mensch wirklich fühlt?', 'nicht weißt, was ein naher Mensch wirklich fühlt', 'dem anderen bis zum Ende zuzuhören.'],
    ['gibst du in Beziehungen zu oft nach?', 'in Beziehungen zu oft nachgibst', 'auch zu sagen, was du selbst willst.'],
    ['zögerst du, andere an dich heranzulassen?', 'zögerst, andere an dich heranzulassen', 'Bindungen zu Menschen, denen du vertraust, langsam zu vertiefen.'],
    ['behältst du für dich, was dir auf dem Herzen liegt?', 'für dich behältst, was dir auf dem Herzen liegt', 'in Ruhe zu sagen, was du wirklich meinst.'],
    ['hast du das Gefühl, nur du gibst dir Mühe?', 'das Gefühl hast, nur du gibst dir Mühe', 'neu zu überlegen, wie ihr euch gegenseitig stützt.'],
  ],
  8: [
    ['lässt dich die Sorge um die Zukunft nicht los?', 'die Sorge um die Zukunft nicht loswirst', 'dich auf das zu konzentrieren, was du ändern kannst.'],
    ['hast du Angst, von anderen abhängig zu sein?', 'Angst hast, von anderen abhängig zu sein', 'einen vertrauten Menschen ein wenig mittragen zu lassen.'],
    ['fällt es dir schwer, Veränderungen anzunehmen?', 'Veränderungen um dich schwer annehmen kannst', 'alte Wege loszulassen und neu aufzubauen.'],
    ['machst du dir Sorgen um dein Geld in der Zukunft?', 'dir Sorgen um dein Geld in der Zukunft machst', 'deine Vorsorge in Ruhe zu prüfen.'],
    ['trägst du eine Sorge, die du niemandem anvertraust?', 'eine Sorge trägst, die du niemandem anvertraust', 'dich behutsam dem zu stellen, was tief in dir liegt.'],
  ],
  9: [
    ['fragst du dich, ob du auf dem richtigen Weg bist?', 'dich fragst, ob du auf dem richtigen Weg bist', 'die Werte zu klären, nach denen du leben willst.'],
    ['gerät ins Wanken, woran du geglaubt hast?', 'spürst, dass ins Wanken gerät, woran du geglaubt hast', 'neu zu wählen, woran du wirklich glauben kannst.'],
    ['hast du vergessen, wofür du dich so anstrengst?', 'vergessen hast, wofür du dich so anstrengst', 'Neues zu lernen und dein Ziel wiederzufinden.'],
    ['willst du mehr lernen, kommst aber nicht in Gang?', 'mehr lernen willst, aber nicht in Gang kommst', 'mit einer Sache anzufangen, die dich interessiert.'],
    ['fehlt dir ein Vorbild?', 'das Gefühl hast, dass dir ein Vorbild fehlt', 'nach Gedanken zu suchen, die du wirklich achten kannst.'],
  ],
  10: [
    ['hast du das Gefühl, dass deine Mühe nicht gesehen wird?', 'das Gefühl hast, dass deine Mühe nicht gesehen wird', 'deine Erfolge geduldig neu aufzubauen.'],
    ['fragst du dich, ob dein jetziger Job zu dir passt?', 'dich fragst, ob dein jetziger Job zu dir passt', 'neu zu überlegen, wie du in den nächsten Jahren arbeiten willst.'],
    ['wächst deine Verantwortung ohne Gegenleistung?', 'spürst, dass deine Verantwortung ohne Gegenleistung wächst', 'neu zu wählen, welche Aufgaben du übernimmst.'],
    ['willst du den Job wechseln, kannst dich aber nicht entscheiden?', 'den Job wechseln willst, dich aber nicht entscheiden kannst', 'dir deine Stärken neu bewusst zu machen.'],
    ['machen dir Kollegen die Morgen schwer?', 'spürst, dass dir Kollegen die Morgen schwer machen', 'dich wieder auf deine eigene Rolle zu konzentrieren.'],
  ],
  11: [
    ['zeigt sich deine Mühe nicht in deinem Einkommen?', 'das Gefühl hast, dass sich deine Mühe nicht im Einkommen zeigt', 'eine Fähigkeit auszubauen, die Einkommen bringt.'],
    ['fühlst du dich unter Freunden fehl am Platz?', 'dich unter Freunden fehl am Platz fühlst', 'Verbindungen zu Menschen zu pflegen, die dich wirklich verstehen.'],
    ['gibst du deine Wünsche fast schon auf?', 'deine Wünsche fast schon aufgibst', 'deine Wünsche in kleine Ziele aufzuteilen.'],
    ['fühlst du dich ausgeschlossen, wenn dich niemand einlädt?', 'dich ausgeschlossen fühlst, wenn dich niemand einlädt', 'selbst den ersten Schritt auf jemanden zuzugehen.'],
    ['siehst du keinen Weg, mehr zu verdienen?', 'keinen Weg siehst, mehr zu verdienen', 'über Menschen, die du kennst, nach Chancen zu suchen.'],
  ],
  12: [
    ['bleibst du müde, selbst nach dem Schlafen?', 'müde bleibst, selbst nach dem Schlafen', 'dir echte Zeit für dich allein zum Ausruhen zu nehmen.'],
    ['hast du ein schlechtes Gewissen, weil du Zeit für dich willst?', 'ein schlechtes Gewissen hast, weil du Zeit für dich willst', 'die Zeit für dich zum Auftanken zu nutzen.'],
    ['willst du etwas loslassen, schaffst es aber nicht?', 'etwas loslassen willst, es aber nicht schaffst', 'Schritt für Schritt leichter zu werden.'],
    ['hast du das Gefühl, dass sich deine Ausgaben häufen?', 'das Gefühl hast, dass sich deine Ausgaben häufen', 'neu zu wählen, was du wirklich brauchst.'],
    ['spürst du eine tiefe Müdigkeit, die nicht vergeht?', 'eine tiefe Müdigkeit spürst, die nicht vergeht', 'dir zu erlauben, eine Weile nichts zu tun.'],
  ],
};

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DE: LanguagePack = {
  worries: WORRIES,
  field: FIELD,
  write({ moon, chosen, house, period, day, worry: [hook, reason, use] }) {
    const planet = cap(PLANET[chosen.planet]);
    const area = `den Bereich ${FIELD[house]}`;
    const from = `vom Mondzeichen ${sign(moon)} aus`;
    const lead = `In der vedischen Astrologie gilt für die Woche vom ${period}:`;
    let opening: string;
    let cause: string;
    if (chosen.ingress && day) {
      opening = `${lead} ${planet} wechselt am ${day.date}. ${MONTHS[day.month]} ins Zeichen ${sign(chosen.ingress.sign)}, in dein ${house}. Haus ${from}.`;
      cause = `in ${area} eintritt`;
    } else if (chosen.retrograde && !isNode(chosen.planet)) {
      opening = `${lead} ${planet} ist rückläufig im Zeichen ${sign(chosen.sign)}, deinem ${chosen.house}. Haus ${from}.`;
      cause = `rückläufig ist und dich einlädt, ${area} zu überdenken`;
    } else {
      opening = `${lead} ${planet} steht im Zeichen ${sign(chosen.sign)}, deinem ${chosen.house}. Haus ${from}.`;
      cause =
        chosen.planet === 'Rahu'
          ? `deine Aufmerksamkeit auf ${area} lenkt`
          : chosen.planet === 'Ketu'
            ? `dein Herz vom Bereich ${FIELD[house]} löst`
            : `stark auf ${area} wirkt`;
    }
    return {
      hook: `${sign(moon)}, ${hook}`,
      body: `${opening} Wenn du ${reason}, liegt das daran, dass ${NATURE[chosen.planet]} ${cause}. Jetzt ist eine gute Zeit, ${use}`,
    };
  },
};
