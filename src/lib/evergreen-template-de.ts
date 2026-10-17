/** German Mon–Wed per-sign evergreen scripts (du): same structure and chart reasoning as the ja/en sets. */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'de') ?? s;
/** Nominative / dative forms. */
const PLANET: Record<string, [string, string]> = {
  Sun: ['die Sonne', 'der Sonne'], Moon: ['der Mond', 'dem Mond'], Mars: ['Mars', 'Mars'], Mercury: ['Merkur', 'Merkur'],
  Jupiter: ['Jupiter', 'Jupiter'], Venus: ['Venus', 'Venus'], Saturn: ['Saturn', 'Saturn'],
};
/** Genitive-free "die Natur von …". */
const NATURE_OF: Record<string, string> = {
  Sun: 'der Sonne', Moon: 'des Mondes', Mars: 'des Mars', Mercury: 'des Merkur', Jupiter: 'des Jupiter', Venus: 'der Venus', Saturn: 'des Saturn',
};
type L3 = [string, string, string];

/** [hook, "du kannst …" infinitive clause, "In …" place (dative)]. */
const WORK: Record<Sign, L3> = {
  Capricorn: ['machst du dir Vorwürfe, wenn Ergebnisse auf sich warten lassen?', 'mit der Zeit festes Vertrauen aufbauen', 'beständigen Organisationen oder Rollen mit echter Verantwortung'],
  Aquarius: ['fühlst du dich unter Kollegen fehl am Platz?', 'das Ganze sehen und neue Wege finden', 'Technik, Forschung oder dem Aufbau von Systemen'],
  Pisces: ['erschöpft es dich, nur nach Zahlen bewertet zu werden?', 'Menschen stützen und ihnen Last abnehmen', 'Lehre, Begleitung oder der Arbeit mit Menschen'],
  Aries: ['hältst du deine Kraft zurück, um niemanden zu stören?', 'selbst entscheiden und als Erster handeln', 'neuen Projekten oder Rollen an vorderster Stelle'],
  Taurus: ['ermüdet es dich, ständig im Mittelpunkt zu stehen?', 'Qualität erkennen und ihr Dauer geben', 'Gastronomie, Design oder Arbeit mit echtem Wert'],
  Gemini: ['erdrückt dich jeden Tag dieselbe Aufgabe?', 'Informationen sammeln und klar erklären', 'Schreiben, Verkauf oder dem Verbinden von Menschen'],
  Cancer: ['achtest du den ganzen Tag auf die Stimmung anderer?', 'spüren, was andere fühlen, und sie beruhigen', 'Gastgewerbe oder der Arbeit mit Menschen'],
  Leo: ['fühlst du dich hinter den Kulissen zu wenig gesehen?', 'vorangehen und Verantwortung übernehmen', 'der Leitung eines Teams oder Arbeit unter eigenem Namen'],
  Virgo: ['belastet dich der Abstand zwischen Ideal und Arbeitsalltag?', 'jedes Detail genau verbessern', 'Analyse oder Qualitätskontrolle'],
  Libra: ['strengst du dich bei der Arbeit allein zu sehr an?', 'zwischen Menschen vermitteln und das Gleichgewicht halten', 'Verhandlungen oder Arbeit, die Menschen zusammenbringt'],
  Scorpio: ['lässt dich oberflächliche Arbeit leer zurück?', 'einer Sache ganz auf den Grund gehen', 'Forschung oder tiefer Analyse'],
  Sagittarius: ['fällt es dir schwer, Sinn in deiner Arbeit zu finden?', 'ein größeres Ziel zeigen und andere führen', 'Bildung, Recht oder internationaler Arbeit'],
};
/** [hook, "der Mond in X …" predicate, "Mit …" dative]. */
const COMPAT: Record<Sign, L3> = {
  Aries: ['bist du in Beziehungen immer der, der vorangeht?', 'trägt den Schwung des Mars und geht geradeaus', 'Menschen, denen du offen sagen kannst, was du denkst'],
  Taurus: ['ermüden dich Menschen, die ständig ihre Meinung ändern?', 'trägt die Ruhe der Venus und schätzt Beständiges', 'Menschen, die Vertrauen langsam aufbauen'],
  Gemini: ['ermüdet es dich, mit jemandem ohne echtes Gespräch zusammen zu sein?', 'trägt die Leichtigkeit des Merkur und verbindet sich über Worte', 'Menschen, die deinem Gesprächstempo folgen'],
  Cancer: ['bist du erschöpft davon, immer auf andere zu achten?', 'trägt die Zärtlichkeit des Mondes und will beschützen', 'Menschen, bei denen du ganz du selbst sein kannst'],
  Leo: ['verlierst du dich, weil du dich ständig anpasst?', 'trägt die Wärme der Sonne und lässt andere strahlen', 'Menschen, die sich freuen, wenn du glänzt'],
  Virgo: ['ermüdet es dich, jede Kleinigkeit zu bemerken?', 'trägt die Aufmerksamkeit des Merkur und will nützlich sein', 'Menschen, die deine Aufmerksamkeit zu schätzen wissen'],
  Libra: ['verbirgst du deine Gefühle, um Streit zu vermeiden?', 'trägt die Harmonie der Venus und sucht das Gleichgewicht', 'Menschen, die deine Ehrlichkeit gelassen annehmen'],
  Scorpio: ['lassen dich oberflächliche Freundschaften unzufrieden zurück?', 'trägt die Kraft des Mars im Inneren und sucht tiefe Bindungen', 'Menschen, mit denen du über Jahre ehrlich bleiben kannst'],
  Sagittarius: ['fühlen sich Beziehungen für dich wie ein Käfig an?', 'trägt die Großzügigkeit des Jupiter und will entdecken', 'Menschen, die die Freiheit des anderen achten'],
  Capricorn: ['fühlst du dich einsam, weil du nie Schwäche zeigst?', 'trägt die Redlichkeit des Saturn und übernimmt Verantwortung', 'Menschen, die auch deine verletzliche Seite annehmen'],
  Aquarius: ['fühlst du dich in der Gruppe als Außenseiter?', 'trägt die Klarheit des Saturn und sieht alle als gleich', 'Menschen, die eure Unterschiede mögen'],
  Pisces: ['erschöpft es dich, die Gefühle anderer mitzutragen?', 'trägt das Mitgefühl des Jupiter und spürt fremden Schmerz', 'Menschen, die deine Güte erwidern'],
};
/** [hook, "du wünschst dir, …zu…" infinitive, "Mit …" dative]. */
const LOVE: Record<Sign, L3> = {
  Aries: ['wartest du in der Liebe, ohne je den ersten Schritt zu machen?', 'deine Gefühle direkt auszusprechen', 'einem Partner, der deine Offenheit liebt'],
  Taurus: ['denkst du in der Liebe zu viel nach?', 'die Liebe langsam und behaglich wachsen zu lassen', 'einem Partner, bei dem du zur Ruhe kommst'],
  Gemini: ['wirst du unruhig, wenn die Gespräche mit deinem Partner stocken?', 'Worte und Lachen zu teilen', 'einem Partner, mit dem du über alles reden kannst'],
  Cancer: ['spielst du den Starken und kannst dich nicht anlehnen?', 'eine warme Bindung zu schaffen, in der man sich beschützt', 'einem Partner, bei dem du du selbst sein kannst'],
  Leo: ['bist du in der Liebe immer der, der nachgibt?', 'dich geliebt zu fühlen und deine Liebe offen zu zeigen', 'einem Partner, der stolz auf dich ist'],
  Virgo: ['gibst du viel und fühlst dich von deinem Partner übersehen?', 'deinen Partner mit kleinen Gesten zu stützen', 'einem Partner, der kleine Aufmerksamkeiten bemerkt'],
  Libra: ['vermeidest du jede Meinungsverschiedenheit mit deinem Partner?', 'eine elegante Beziehung gegenseitigen Respekts aufzubauen', 'einem Partner, der dich auf Augenhöhe behandelt'],
  Scorpio: ['lässt dich flüchtige Liebe leer zurück?', 'dich tief mit einem einzigen Menschen zu verbinden', 'einem Partner, der deine wahren Gefühle annimmt'],
  Sagittarius: ['fühlst du dich eingeengt, wenn dein Partner dich festhält?', 'gemeinsam zu lernen und eure Welt zu weiten', 'einem Partner, der deine Freiheit und Träume unterstützt'],
  Capricorn: ['bist du in der Liebe so zurückhaltend, dass Chancen vorbeiziehen?', 'mit der Zeit eine Liebe voller Vertrauen aufzubauen', 'einem Partner, der Versprechen hält'],
  Aquarius: ['langweilt dich die klassische Romantik?', 'frei zu reden wie beste Freunde', 'einem Partner, der deine Art mag'],
  Pisces: ['gibst du in der Liebe zu viel?', 'dich von Herz zu Herz zu verbinden, jenseits von Worten', 'einem Partner, der deine Güte erwidert'],
};
/** [hook, "du kannst …" infinitive, "In …" dative]. */
const MONEY: Record<Sign, L3> = {
  Aries: ['willst du sparen, doch das Geld ist schnell weg?', 'entschlossen handeln und selbst verdienen', 'einer Arbeit, in der du deinen eigenen Weg gehst'],
  Taurus: ['verzichtest du aus Geldsorgen auf Dinge, die du liebst?', 'Qualität erkennen und Werte wachsen lassen', 'einer Arbeit mit hochwertigen Dingen'],
  Gemini: ['macht dich ein einziges Einkommen unruhig?', 'mit Informationen auf mehreren Wegen verdienen', 'einer Arbeit mit Wissen und Worten'],
  Cancer: ['gibst du zu viel Geld für andere aus?', 'das Leben deiner Liebsten absichern', 'einer Arbeit, die den Alltag von Menschen trägt'],
  Leo: ['gibst du Geld nur für den äußeren Schein aus?', 'deinen Namen und Ruf in Einkommen verwandeln', 'einer Arbeit, bei der du dein Gesicht zeigst'],
  Virgo: ['sparst du und kommst trotzdem nicht voran?', 'Finanzen genau führen und Verschwendung vermeiden', 'einer Arbeit mit Zahlen'],
  Libra: ['fällt dir das Neinsagen schwer, wenn es um Geld geht?', 'durch das Vertrauen anderer verdienen', 'der Arbeit mit Partnern'],
  Scorpio: ['behältst du Geldsorgen für dich?', 'den Fluss des Geldes lesen und es vermehren', 'Einkommen, das mit der Zeit wächst'],
  Sagittarius: ['bist du es leid, ständig an Geld zu denken?', 'Wissen und Erfahrung in Wohlstand verwandeln', 'einer Arbeit, die dein Wissen nutzt'],
  Capricorn: ['macht es dir Angst, dass das Geld so langsam wächst?', 'Schritt für Schritt ein solides Vermögen aufbauen', 'einer Arbeit, die du über Jahre machst'],
  Aquarius: ['passen die üblichen Wege, Geld zu verdienen, nicht zu dir?', 'mit Systemen und neuen Ideen verdienen', 'Online-Arbeit oder neuen Technologien'],
  Pisces: ['gibst du so viel, dass für dich nichts bleibt?', 'Menschen helfen und dieses Vertrauen in Fülle verwandeln', 'einer Arbeit, die Menschen hilft'],
};
/** [hook, "du möchtest …" infinitive, "In …" dative]. */
const FAMILY: Record<Sign, L3> = {
  Aries: ['gerätst du oft mit deiner Familie aneinander?', 'deine Familie mit eigenen Händen beschützen', 'einem Zuhause, in dem jeder offen reden darf'],
  Taurus: ['kannst du dich nicht einmal zu Hause erholen?', 'ein ruhiges, angenehmes Leben pflegen', 'einem Zuhause ohne Eile'],
  Gemini: ['hast du das Gefühl, mit deiner Familie nie wirklich zu reden?', 'dich mit deiner Familie über Worte verbinden', 'einer Runde, in der man über alles sprechen kann'],
  Cancer: ['bist du erschöpft von der Sorge um deine Familie?', 'deine Familie mit Wärme umhüllen', 'einem Zuhause, in dem auch für dich gesorgt wird'],
  Leo: ['fühlst du dich von deiner Familie nicht geschätzt?', 'in der Mitte stehen und alle aufmuntern', 'einer Familie, die die Mühe jedes Einzelnen anerkennt'],
  Virgo: ['trägst du die Hausarbeit allein?', 'dich um jedes Detail des Familienlebens kümmern', 'einer Familie, die die Last teilt'],
  Libra: ['bist immer du es, der in der Familie Frieden stiftet?', 'die Familie im Gleichgewicht halten', 'einem Zuhause, in dem jeder ein wenig nachgibt'],
  Scorpio: ['kannst du nicht einmal deiner Familie gegenüber ehrlich sein?', 'dich tief mit den Deinen verbinden', 'einer Familie, die die Gefühle jedes Einzelnen annimmt'],
  Sagittarius: ['passen die Werte deiner Familie nicht zu deinen?', 'die Lebensweise teilen, an die du glaubst', 'einem Zuhause, das den Weg jedes Einzelnen achtet'],
  Capricorn: ['trägst du die Last der Familie allein?', 'deine Pflicht gegenüber der Familie erfüllen', 'einer Familie, in der sich alle gegenseitig stützen'],
  Aquarius: ['fühlst du dich in deiner Familie als der Andere?', 'jedes Familienmitglied so annehmen, wie es ist', 'einem Zuhause, das jede Meinung achtet'],
  Pisces: ['stellst du dich für deine Familie immer hintenan?', 'den Kummer der Deinen begleiten und auffangen', 'einer Familie, die deine Güte erwidert'],
};
/** [hook, full sentence after "Deshalb", "Mit …" dative]. */
const REST: Record<Sign, L3> = {
  Aries: ['bist du müde, obwohl du dich zum Ausruhen hingelegt hast?', 'erholt dich Bewegung mehr als Stillsitzen', 'einer Zeit, in der du ins Schwitzen kommst'],
  Taurus: ['hat die ständige Eile auch deinen Kopf müde gemacht?', 'entspannst du dich, wenn dich Angenehmes umgibt', 'einer Zeit mit Musik oder Düften, die du magst'],
  Gemini: ['kreisen deine Gedanken so, dass du nicht schlafen kannst?', 'erleichtert es dich, Gedanken in Worte zu fassen', 'einer Zeit, in der du mit jemandem redest'],
  Cancer: ['bist du erschöpft davon, für alle zu sorgen?', 'tankst du an einem Ort auf, an dem du dich sicher fühlst', 'einem Ort, an dem für dich gesorgt wird'],
  Leo: ['bist du kurz davor, dich zu verausgaben?', 'tankst du in Zeiten auf, in denen dich niemand ansieht', 'einer Zeit allein, ganz ohne Rolle'],
  Virgo: ['denkst du sogar an freien Tagen an Aufgaben?', 'beruhigt ein aufgeräumter Raum deinen Kopf', 'einem ruhigen, aufgeräumten Raum'],
  Libra: ['ermüdet es dich, immer auf andere zu achten?', 'gibt dir Schönes dein Gleichgewicht zurück', 'einer Zeit vor einer Landschaft, die du liebst'],
  Scorpio: ['verbirgst du deine Müdigkeit vor allen?', 'erholst du dich am besten durch tiefen Schlaf allein', 'einem Schlaf, den niemand stört'],
  Sagittarius: ['zermürbt dich immer dieselbe Routine?', 'öffnen neue Orte und Ideen deinen Kopf', 'einem Ausflug an einen unbekannten Ort'],
  Capricorn: ['hast du ein schlechtes Gewissen, wenn du dich ausruhst?', 'gibt dir eine Pause zur festen Zeit Halt', 'einer festen Ruhezeit an jedem Tag'],
  Aquarius: ['ermüdet es dich schon, unter Menschen zu sein?', 'erholst du dich, wenn du dich in deinem Tempo zurückziehst', 'einer Zeit in deinem eigenen Tempo'],
  Pisces: ['erschöpft es dich, die Gefühle aller aufzusaugen?', 'klären Musik und Wasser deinen Kopf', 'einer Zeit mit ruhiger Musik'],
};
/** [hook, full sentence after "Deshalb", "In …" dative]. */
const IMPRESSION: Record<Sign, L3> = {
  Aries: ['hält man dich für einschüchternd?', 'wirkt dein entschlossenes Handeln hart', 'Rollen an vorderster Stelle'],
  Taurus: ['hält man dich für langsam?', 'wirkt deine Ruhe wie Trägheit', 'langfristigen Beziehungen'],
  Gemini: ['denkt man, du nimmst nichts ernst?', 'wirkt deine schnelle, leichte Art leichtfertig', 'Rollen, die Menschen verbinden'],
  Cancer: ['hält man dich für launisch?', 'zeigt sich jedes Gefühl auf deinem Gesicht', 'Momenten, in denen du andere auffängst'],
  Leo: ['hält man dich für arrogant?', 'wirkt deine Selbstsicherheit wie Hochmut', 'Rollen, die Menschen zusammenführen'],
  Virgo: ['hält man dich für streng und anspruchsvoll?', 'wirkt dein Blick fürs Detail hart', 'Aufgaben, bei denen Ordnung gefragt ist'],
  Libra: ['denkt man, du willst es allen recht machen?', 'wirkt deine Freundlichkeit zu allen so', 'der Rolle des Vermittlers'],
  Scorpio: ['sagt man, man wisse nie, was du denkst?', 'wirkt es geheimnisvoll, dass du dein Inneres für dich behältst', 'Rollen, in denen man dir das Wichtigste anvertraut'],
  Sagittarius: ['hält man dich für zerstreut?', 'wirkt dein Blick aufs große Ganze nachlässig', 'Rollen, in denen du andere führst'],
  Capricorn: ['hält man dich für kühl?', 'wirkt es steif, dass du Pflicht vor Gefühl stellst', 'wichtigen Aufgaben, die man dir anvertraut'],
  Aquarius: ['hält man dich für etwas seltsam?', 'wirkt dein eigenständiges Denken eigenartig', 'Momenten, die neue Ideen brauchen'],
  Pisces: ['denkt man, auf dich sei kein Verlass?', 'wirkt deine Güte, die nie jemandem Vorwürfe macht, schwach', 'Momenten, in denen du andere tröstest'],
};
/** [hook, full sentence after "Deshalb", "In …" dative]. */
const AVOID: Record<Sign, L3> = {
  Aries: ['zermürbt dich ein Job voller Streit?', 'erschöpfen dich Wut und Konkurrenz', 'einem Umfeld, in dem man ruhig miteinander spricht'],
  Taurus: ['macht dich ein chaotisches Umfeld angespannt?', 'bringen dich ständige kurzfristige Änderungen aus der Ruhe', 'einem Umfeld mit stabiler Routine'],
  Gemini: ['ermüden dich endlose Nachrichten und Gespräche?', 'kommt dein Kopf bei zu vielen Worten nicht zur Ruhe', 'einem ruhigen Ort zum Konzentrieren'],
  Cancer: ['fühlst du dich in einem kalten Umfeld einsam?', 'schnürt dir ein Ort ohne Verständnis das Herz zu', 'einem Umfeld, in dem man füreinander sorgt'],
  Leo: ['zermürbt dich ein Ort, der deine Mühe nie anerkennt?', 'nagt es an deinem Selbstvertrauen, wie ein Niemand behandelt zu werden', 'einem Umfeld, das dir echte Verantwortung gibt'],
  Virgo: ['erschöpft dich ein unordentliches, schlampiges Umfeld?', 'machen dich Unordnung und Nachlässigkeit angespannt', 'einem Umfeld, in dem sorgfältig gearbeitet wird'],
  Libra: ['ermüdet es dich, zwischen streitenden Menschen zu stehen?', 'bringt dich ungerechte Behandlung aus dem Gleichgewicht', 'einem Umfeld, in dem alle fair behandelt werden'],
  Scorpio: ['zermürbt dich ein Ort voller Machtspiele?', 'machen dich unaufrichtige Beziehungen angespannt', 'einem Umfeld ohne Heimlichkeiten'],
  Sagittarius: ['erdrücken dich sinnlose Regeln?', 'löschen Regeln ohne Ziel deine Begeisterung aus', 'einem Umfeld, das deinem Urteil vertraut'],
  Capricorn: ['erschöpft dich Arbeit, die nie endet?', 'lastet angehäufte Verantwortung schwer auf deinem Herzen', 'einem Umfeld mit klaren Rollen und echten Pausen'],
  Aquarius: ['fühlst du dich eingeengt, wenn man dir alte Gewohnheiten aufzwingt?', 'bremst dich ein Ort, der sich gegen Veränderung sträubt', 'einem Umfeld, in dem du neue Ideen ausprobieren kannst'],
  Pisces: ['erschöpft es dich, die Probleme aller zu tragen?', 'zermürbt es dich, wenn man sich grenzenlos auf dich verlässt', 'einem Umfeld, in dem du deine Zeit schützen kannst'],
};
/** [hook, how it arrives, what to do (imperative sentence)]. */
const TURNING: Record<Sign, L3> = {
  Aries: ['bist du kurz davor, alles hinzuwerfen?', 'plötzlich, nach einem Zusammenstoß oder wenn du an deine Grenze kommst', 'Bevor du im Affekt gehst, lege einen nächsten Schritt fest'],
  Taurus: ['machen dir Veränderungen bei Einkommen oder Wohnung Angst?', 'langsam, über Veränderungen bei Geld oder Wohnort', 'Wähle einen Lebensbereich, den du behältst, und lass den Rest los'],
  Gemini: ['geht dir etwas, das man dir erzählt hat, nicht aus dem Kopf?', 'über eine Vorstellung oder ein beiläufiges Gespräch', 'Triff die Person noch in derselben Woche, um mehr zu erfahren'],
  Cancer: ['zögerst du wegen deiner Familie, dein Leben zu ändern?', 'über Familienangelegenheiten oder einen Umzug', 'Gib deinen eigenen Wünschen dasselbe Gewicht wie der Familie'],
  Leo: ['ist dir deine jetzige Stelle zu klein geworden?', 'als Beförderung oder als Bitte, nach vorn zu treten', 'Nimm diese Rolle wenigstens einmal an, auch wenn du zweifelst'],
  Virgo: ['spürst du, dass deine Gesundheit oder dein Zeitplan nicht mehr mitmacht?', 'über eine Veränderung deiner Gesundheit', 'Hör auf, dich zu zwingen, und ändere deinen Rhythmus'],
  Libra: ['bringt eine Heirat oder Trennung dein Leben ins Wanken?', 'über eine Veränderung in einer nahen Beziehung', 'Entscheide nach dem Leben, das du willst, nicht um anderen zu gefallen'],
  Scorpio: ['trägst du eine Sorge, die du niemandem sagen kannst?', 'wenn ein verborgenes Problem ans Licht kommt', 'Vertraue dich einem Menschen an, dem du vertraust'],
  Sagittarius: ['möchtest du wieder lernen oder ins Ausland gehen?', 'über ein neues Studium oder einen fernen Ort', 'Besuche einmal den Kurs oder den Ort, der dich reizt'],
  Capricorn: ['zögerst du, eine langjährige Arbeit aufzugeben?', 'wenn etwas, das du jahrelang getan hast, zu Ende geht', 'Nimm alles, was du aufgebaut hast, an den nächsten Ort mit'],
  Aquarius: ['denkst du daran, außerhalb eines Unternehmens zu arbeiten?', 'wenn du eine Organisation verlässt oder mit anderen etwas startest', 'Such dir Menschen, die so denken wie du'],
  Pisces: ['beunruhigt dich eine Ahnung, die du nicht erklären kannst?', 'über eine Intuition oder eine zufällige Begegnung', 'Tu sie nicht ab, sondern probiere sie im Kleinen aus'],
};
/** [hook, sentence after "Deshalb", imperative, result sentence]. */
const HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['antwortest du immer auf der Stelle?', 'handelst du, bevor du entschieden hast', 'Lass wichtige Antworten eine Nacht liegen', 'Du wirst viel seltener etwas bereuen'],
  Taurus: ['hältst du an Dingen und Menschen fest, die nicht mehr passen?', 'bewahrst du immer weiter, was du schon hast', 'Trenne dich von einer Sache, die du nie benutzt', 'Du wirst freier atmen'],
  Gemini: ['schaust du bis zum Einschlafen aufs Handy?', 'suchst du ständig nach neuen Informationen', 'Leg den Bildschirm eine Stunde vor dem Schlafen weg', 'Der Lärm in deinem Kopf wird leiser'],
  Cancer: ['beschäftigt dich die Stimmung anderer ständig?', 'erlebst du fremde Gefühle wie deine eigenen', 'Hör auf, die Stimmung aller retten zu wollen', 'Deine eigenen Gefühle kehren zurück'],
  Leo: ['kämpfst du dich allein durch, ohne je zu klagen?', 'willst du der sein, auf den sich alle stützen', 'Bitte bei einer einzigen Sache um Hilfe', 'Deine Schultern werden leichter'],
  Virgo: ['prüfst du Fertiges immer wieder nach?', 'stört dich jeder kleine Fehler', 'Prüfe einmal und hör dann auf', 'Dir bleiben Zeit und Kraft'],
  Libra: ['sagst du ja, obwohl du nein meinst?', 'willst du die Stimmung nicht verderben', 'Sag ein einziges Mal klar nein', 'Der Umgang mit Menschen wird leichter'],
  Scorpio: ['grübelst du lange über etwas, das jemand gesagt hat?', 'graben sich Verletzungen tief in dich ein', 'Erzähl es einem Menschen, dem du vertraust', 'Die Enge in deiner Brust löst sich'],
  Sagittarius: ['packst du deinen Kalender zu voll?', 'stürzt du dich in alles, was nach Spaß aussieht', 'Streiche einen Termin', 'Du wirst jeden anderen wirklich genießen'],
  Capricorn: ['denkst du sogar an freien Tagen an die Arbeit?', 'stellst du Verantwortung immer an erste Stelle', 'Lies an freien Tagen keine Arbeitsnachrichten', 'Die Woche danach fühlt sich anders an'],
  Aquarius: ['entscheidest du alles allein, ohne dich auf jemanden zu stützen?', 'willst du deinen eigenen Weg nicht aufgeben', 'Folge ein einziges Mal der Idee eines anderen', 'Ein unerwarteter Weg öffnet sich'],
  Pisces: ['ist es dir unmöglich, nein zu sagen?', 'kannst du niemanden übergehen, der Hilfe braucht', 'Antworte nicht gleich, nimm dir Zeit zum Nachdenken', 'So schützt du deine eigene Zeit'],
};
/** [hook, what you value (noun phrase), "Wenn du …" clause (verb last)]. */
const NATURE: Record<Sign, L3> = {
  Aries: ['bist du es leid, dich immer anzupassen?', 'deinen eigenen Weg zu gehen', 'dich einer selbst gewählten Herausforderung stellst'],
  Taurus: ['macht dich das Tempo der anderen unruhig?', 'mit der Zeit etwas Festes wachsen zu lassen', 'geduldig an einer Sache dranbleibst'],
  Gemini: ['wirfst du dir vor, von allem nur ein bisschen zu wissen?', 'zu lernen und weiterzugeben', 'jemandem erzählst, was du gelernt hast'],
  Cancer: ['stellst du dich immer an die letzte Stelle?', 'dass sich deine Liebsten sicher fühlen', 'eine ruhige Zeit mit deinen Nächsten verbringst'],
  Leo: ['ziehst du dich zurück, wenn es Zeit ist, aufzutreten?', 'so zu leben, dass du stolz darauf sein kannst', 'deine Meinung mit Überzeugung sagst'],
  Virgo: ['fällt es dir schwer, deine eigenen Stärken zu sehen?', 'dein Bestes so zu geben, dass es anderen nützt', 'mühelos das Problem eines anderen löst'],
  Libra: ['sorgt es dich, keine eigene Meinung zu haben?', 'Harmonie zwischen Menschen zu schaffen', 'Menschen zusammenbringst, die sich nicht verstehen'],
  Scorpio: ['denkst du über alles zu viel nach?', 'die Wahrheit unter der Oberfläche', 'einer Sache auf den Grund gehst'],
  Sagittarius: ['fehlt dir etwas in deiner Lebensweise?', 'immer weiter zu lernen und den Blick zu weiten', 'neue Ideen oder Orte entdeckst'],
  Capricorn: ['hältst du dich für zu ernst?', 'deine Verantwortung auf lange Sicht zu tragen', 'Schritt für Schritt auf dein Ziel zugehst'],
  Aquarius: ['fühlst du dich mit deinem Umfeld nicht verbunden?', 'außerhalb der Rahmen zu denken und Neues zu schaffen', 'Dinge auf deine eigene Weise ausprobierst'],
  Pisces: ['sorgt es dich, den Schmerz anderer zu stark zu fühlen?', 'verborgenen Schmerz zu bemerken und zu begleiten', 'jemandem still zuhörst'],
};
const SUN_TRAIT: Record<Sign, string> = {
  Aries: 'leidenschaftlich und tatkräftig', Taurus: 'ruhig und beständig', Gemini: 'schlagfertig und gesellig',
  Cancer: 'häuslich und liebevoll', Leo: 'strahlend und geborene Führung', Virgo: 'gründlich und perfektionistisch',
  Libra: 'charmant und elegant', Scorpio: 'intensiv und verschlossen', Sagittarius: 'frei und optimistisch',
  Capricorn: 'ernst und fleißig', Aquarius: 'originell und eigenwillig', Pisces: 'sanft und verträumt',
};

const P = (s: Sign) => PLANET[RULER[s]][0];
const VA = 'In der vedischen Astrologie';
const hk = (m: Sign, h: string) => `Mondzeichen ${sign(m)}, ${h}`;
/** "In der vedischen Astrologie ist X mit deinem N. Haus verbunden, …" (verb second). */
const house = (s: Sign, n: number, what: string) => `${VA} ist ${P(s)} mit deinem ${n}. Haus verbunden, ${what}.`;

const SERIES: Record<SignThemeSeries, (m: Sign) => EvergreenTemplate> = {
  work: (m) => { const s = signFrom(m, 10); const [h, a, b] = WORK[s];
    return { hook: hk(m, h), body: `${house(s, 10, 'dem Haus der Arbeit')} Deshalb kannst du ${a}. In ${b} zeigt sich deine Stärke ganz von selbst.` }; },
  compat: (m) => { const [h, a, b] = COMPAT[m];
    return { hook: hk(m, h), body: `${VA} liest man Verträglichkeit von Mond zu Mond, nicht über die Sonne. Der Mond in ${sign(m)} ${a}. Mit ${b} verstehen sich die Herzen ganz von selbst.` }; },
  love: (m) => { const s = signFrom(m, 5); const [h, a, b] = LOVE[s];
    return { hook: hk(m, h), body: `${house(s, 5, 'dem Haus der Liebe')} Deshalb wünschst du dir, ${a}. Mit ${b} wird diese Liebe erwidert.` }; },
  money: (m) => { const s = signFrom(m, 2); const [h, a, b] = MONEY[s];
    return { hook: hk(m, h), body: `${house(s, 2, 'dem Haus des Geldes')} Deshalb kannst du ${a}. In ${b} fließt das Geld ganz von selbst.` }; },
  family: (m) => { const s = signFrom(m, 4); const [h, a, b] = FAMILY[s];
    return { hook: hk(m, h), body: `${house(s, 4, 'dem Haus der Familie')} Deshalb möchtest du ${a}. In ${b} findest du echten Frieden.` }; },
  rest: (m) => { const s = signFrom(m, 12); const [h, a, b] = REST[s];
    return { hook: hk(m, h), body: `${house(s, 12, 'dem Haus der Erholung')} Deshalb ${a}. Mit ${b} kehrt deine Kraft ganz von selbst zurück.` }; },
  impression: (m) => { const [h, a, b] = IMPRESSION[m];
    return { hook: hk(m, h), body: `${house(m, 1, 'dem Haus des Gesichts, das du zeigst')} Deshalb ${a}. In ${b} wird aus diesem Eindruck Vertrauen.` }; },
  avoid: (m) => { const s = signFrom(m, 6); const [h, a, b] = AVOID[s];
    return { hook: hk(m, h), body: `${house(s, 6, 'dem Haus dessen, was dich zermürbt')} Deshalb ${a}. In ${b} wirst du wieder du selbst.` }; },
  turning: (m) => { const s = signFrom(m, 8); const [h, a, b] = TURNING[s];
    return { hook: hk(m, h), body: `${house(s, 8, 'dem Haus der Wendepunkte')} Dein Wendepunkt kommt ${a}. ${b}, dann wird er zu deinem Rückenwind.` }; },
  habit: (m) => { const [h, a, b, c] = HABIT[m];
    return { hook: hk(m, h), body: `${VA} trägt dein Mond, der dein Herz zeigt, die Natur ${NATURE_OF[RULER[m]]}. Deshalb ${a}. ${b}. ${c}.` }; },
  nature: (m) => { const s = signFrom(m, 9); const [h, a, b] = NATURE[s];
    return { hook: hk(m, h), body: `${house(s, 9, 'der Achse deines Lebens')} Was dir wirklich wichtig ist: ${a}. Wenn du ${b}, bist du am meisten du selbst.` }; },
  sidereal: (sun) => ({
    hook: `${sign(sun)}, Horoskope nennen dich ${SUN_TRAIT[sun]}. Fühlt sich das fremd an?`,
    body: 'Die vedische Astrologie liest deinen Charakter am Mond, nicht an der Sonne, und nutzt die wahre Stellung der Sterne. Bei vielen stehen Sonne und Mond in verschiedenen Zeichen; vielleicht treffen Horoskope deshalb nie.',
  }),
};

export function buildEvergreenTemplateDe(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const m = asSign(moonSign);
  return m && SIGNS.includes(m) ? SERIES[series](m) : null;
}
