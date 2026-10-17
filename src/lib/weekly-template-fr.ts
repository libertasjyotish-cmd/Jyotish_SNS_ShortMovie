/** French weekly reading (vous, gender-neutral wording). Same worry order as `JA_WORRIES`. */
import type { Sign } from '@/lib/placements';
import { zodiacName } from '@/lib/zodiac-names';
import { isNode, LanguagePack, Worry } from '@/lib/weekly-template-pack';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'fr') ?? s;

const PLANET: Record<string, string> = {
  Sun: 'le Soleil', Mars: 'Mars', Mercury: 'Mercure', Jupiter: 'Jupiter', Venus: 'Vénus',
  Saturn: 'Saturne', Rahu: 'Rahu', Ketu: 'Ketu',
};

const NATURE: Record<string, string> = {
  Sun: "le Soleil, la planète de l'expression de soi,",
  Mars: "Mars, la planète de l'élan et de l'action,",
  Mercury: 'Mercure, la planète de la pensée et de la parole,',
  Jupiter: 'Jupiter, la planète de la croissance,',
  Venus: "Vénus, la planète de l'amour et du bien-être,",
  Saturn: 'Saturne, la planète du devoir et de la patience,',
  Rahu: 'Rahu, qui amplifie les désirs,',
  Ketu: 'Ketu, qui détache des liens,',
};

const FIELD: Record<number, string> = {
  1: 'votre regard sur vous-même',
  2: 'votre argent, vos paroles et ce qui compte pour vous',
  3: 'vos échanges du quotidien et votre élan pour agir',
  4: 'votre foyer et votre paix intérieure',
  5: 'vos amours, vos plaisirs et vos talents',
  6: 'vos tâches quotidiennes et votre santé',
  7: 'vos relations proches',
  8: 'votre façon de vivre les changements soudains',
  9: 'vos convictions et la direction de votre vie',
  10: 'votre travail et votre position',
  11: 'vos revenus et vos amitiés',
  12: 'votre repos et votre lâcher-prise',
};

const WORRIES: Record<number, Worry[]> = {
  1: [
    ['avez-vous du mal à avoir confiance en vous ?', 'avez du mal à avoir confiance en vous', 'redécouvrir vos forces, une à une.'],
    ['ne savez-vous plus par où commencer ?', 'ne savez plus par où commencer', 'choisir un premier petit pas.'],
    ['vous sentez-vous sous pression en vous comparant aux autres ?', 'vous sentez sous pression en vous comparant aux autres', 'retrouver votre propre rythme.'],
    ["avez-vous l'impression que les jours passent sans vous ?", "avez l'impression que les jours passent sans vous", 'vous rappeler ce que vous voulez vraiment faire.'],
    ['la fatigue reste-t-elle même après le repos ?', 'sentez la fatigue rester même après le repos', 'faire passer votre santé en premier.'],
  ],
  2: [
    ["l'inquiétude pour l'argent ne vous quitte-t-elle pas ?", "n'arrivez pas à vous défaire de l'inquiétude pour l'argent", 'revoir ce qui vous donne vraiment un sentiment de sécurité.'],
    ["avez-vous l'impression que l'argent ne reste jamais ?", "avez l'impression que l'argent ne reste jamais", 'repenser calmement votre façon de dépenser.'],
    ['avez-vous du mal à exprimer ce que vous ressentez ?', 'avez du mal à mettre des mots sur ce que vous ressentez', 'vous exercer à dire ce que vous ressentez vraiment.'],
    ['avez-vous peur de perdre ce que vous avez ?', 'avez peur de perdre ce que vous avez', 'choisir à nouveau ce qui compte vraiment pour vous.'],
    ['sous-estimez-vous votre propre valeur ?', 'sous-estimez votre propre valeur', 'regarder honnêtement tout ce dont vous êtes capable.'],
  ],
  3: [
    ["avez-vous du mal à trouver le courage d'agir ?", "avez du mal à trouver le courage d'agir", 'accumuler de petites actions, une à une.'],
    ["avez-vous l'impression que vos idées ne passent pas ?", "avez l'impression que vos idées ne passent pas", 'essayer calmement une nouvelle façon de vous exprimer.'],
    ["avez-vous l'impression d'avancer sans progresser ?", "avez l'impression d'avancer sans progresser", 'reconnaître le chemin que vos efforts ont déjà parcouru.'],
    ['vous retenez-vous trop devant vos collègues ?', 'vous retenez trop devant vos collègues', 'partager vos idées sans vous excuser.'],
    ['voulez-vous commencer quelque chose de nouveau sans oser vous lancer ?', 'voulez commencer quelque chose de nouveau sans oser vous lancer', 'vous autoriser simplement à essayer.'],
  ],
  4: [
    ['avez-vous du mal à vous détendre, même chez vous ?', 'avez du mal à vous détendre, même chez vous', 'retrouver les habitudes qui vous apaisent.'],
    ['avez-vous du mal à vous confier à votre famille ?', 'avez du mal à vous confier à votre famille', 'reconstruire un sentiment de sécurité avec vos proches.'],
    ["vous laissez-vous emporter par vos sautes d'humeur ?", "vous laissez emporter par vos sautes d'humeur", 'organiser des journées qui gardent votre cœur stable.'],
    ["avez-vous l'impression de n'avoir aucun endroit pour vraiment vous reposer ?", "avez l'impression de n'avoir aucun endroit pour vraiment vous reposer", 'cultiver un espace de calme en vous.'],
    ['les affaires de famille troublent-elles votre tranquillité ?', 'sentez les affaires de famille troubler votre tranquillité', 'distinguer ce que vous pouvez changer de ce que vous ne pouvez pas changer.'],
  ],
  5: [
    ['avez-vous du mal à profiter de ce que vous aimez ?', 'avez du mal à profiter de ce que vous aimez', 'chercher à nouveau ce qui vous fait vibrer.'],
    ["aimez-vous quelqu'un sans oser aller plus loin ?", "aimez quelqu'un sans oser aller plus loin", 'clarifier le lien que vous souhaitez vraiment.'],
    ['doutez-vous de vos talents ?', 'doutez de vos talents', 'perfectionner une chose que vous faites bien.'],
    ["voulez-vous relever un nouveau défi tout en craignant l'échec ?", "voulez relever un nouveau défi tout en craignant l'échec", "essayer à petite échelle et gagner de l'expérience."],
    ['rencontrez-vous des gens sans que rien ne dure ?', 'rencontrez des gens sans que rien ne dure', 'repenser le type de relation qui vous fait vraiment du bien.'],
  ],
  6: [
    ["avez-vous l'impression de tout porter sur vos épaules ?", "avez l'impression de tout porter sur vos épaules", 'choisir ce que vous pouvez confier aux autres.'],
    ['les relations au travail vous épuisent-elles ?', 'sentez que les relations au travail vous épuisent', 'apprendre la distance qui vous protège.'],
    ["avez-vous du mal à dire non, jusqu'à surcharger vos journées ?", "avez du mal à dire non, jusqu'à surcharger vos journées", 'définir ce que vous pouvez vraiment prendre en charge.'],
    ['vous sentez-vous coupable dès que vous vous reposez ?', 'vous sentez coupable dès que vous vous reposez', 'considérer le repos comme une part de vos devoirs.'],
    ["avez-vous l'impression de courir après le temps chaque jour ?", "avez l'impression de courir après le temps chaque jour", 'organiser vos journées selon un rythme tenable.'],
  ],
  7: [
    ['ne savez-vous pas ce que ressent vraiment un proche ?', 'ne savez pas ce que ressent vraiment un proche', "écouter l'autre jusqu'au bout."],
    ['faites-vous trop de concessions dans vos relations ?', 'faites trop de concessions dans vos relations', 'dire aussi ce que vous voulez.'],
    ["hésitez-vous à laisser les autres s'approcher ?", "hésitez à laisser les autres s'approcher", 'approfondir lentement les liens avec ceux en qui vous avez confiance.'],
    ['gardez-vous pour vous ce que vous avez sur le cœur ?', 'gardez pour vous ce que vous avez sur le cœur', 'dire calmement ce que vous pensez vraiment.'],
    ["avez-vous l'impression d'être la seule personne à faire des efforts ?", "avez l'impression d'être la seule personne à faire des efforts", 'repenser la façon de vous soutenir mutuellement.'],
  ],
  8: [
    ["l'inquiétude pour l'avenir ne vous quitte-t-elle pas ?", "n'arrivez pas à vous défaire de l'inquiétude pour l'avenir", 'vous concentrer sur ce que vous pouvez changer.'],
    ['avez-vous peur de dépendre des autres ?', 'avez peur de dépendre des autres', 'laisser une personne de confiance porter un peu de votre charge.'],
    ['avez-vous du mal à accepter les changements autour de vous ?', 'avez du mal à accepter les changements autour de vous', 'laisser partir les anciennes façons de faire et reconstruire.'],
    ["l'argent de demain vous inquiète-t-il ?", "vous inquiétez pour l'argent de demain", 'vérifier calmement vos préparatifs.'],
    ['gardez-vous une inquiétude que vous ne pouvez confier à personne ?', 'gardez pour vous une inquiétude que vous ne pouvez confier à personne', 'regarder doucement ce qui se cache au fond de votre cœur.'],
  ],
  9: [
    ['vous demandez-vous si vous êtes sur la bonne voie ?', 'vous demandez si vous êtes sur la bonne voie', 'confirmer les valeurs selon lesquelles vous voulez vivre.'],
    ['ce en quoi vous croyiez commence-t-il à vaciller ?', 'sentez vaciller ce en quoi vous croyiez', 'choisir à nouveau ce en quoi vous pouvez vraiment croire.'],
    ['avez-vous oublié pourquoi vous travaillez si dur ?', 'avez oublié pourquoi vous travaillez si dur', 'apprendre quelque chose de nouveau et retrouver votre but.'],
    ['voulez-vous apprendre davantage sans parvenir à commencer ?', 'voulez apprendre davantage sans parvenir à commencer', 'commencer à étudier une seule chose qui vous intéresse.'],
    ["avez-vous l'impression de n'avoir aucun modèle ?", "avez l'impression de n'avoir aucun modèle", 'chercher des idées que vous pouvez vraiment respecter.'],
  ],
  10: [
    ["avez-vous l'impression que vos efforts ne sont pas reconnus ?", "avez l'impression que vos efforts ne sont pas reconnus", 'reconstruire patiemment vos réussites.'],
    ['vous demandez-vous si votre travail actuel vous convient ?', 'vous demandez si votre travail actuel vous convient', 'repenser la façon dont vous voulez travailler dans les années à venir.'],
    ['vos responsabilités augmentent-elles sans contrepartie ?', 'voyez vos responsabilités augmenter sans contrepartie', 'choisir à nouveau les missions que vous acceptez.'],
    ['voulez-vous changer de travail sans parvenir à vous décider ?', 'voulez changer de travail sans parvenir à vous décider', 'faire à nouveau le point sur vos forces.'],
    ['vos collègues rendent-ils vos matinées pesantes ?', 'sentez que vos collègues rendent vos matinées pesantes', 'vous recentrer sur votre propre rôle.'],
  ],
  11: [
    ['vos efforts ne se reflètent-ils pas dans vos revenus ?', "avez l'impression que vos efforts ne se voient pas dans vos revenus", 'développer une compétence qui rapporte.'],
    ["vous sentez-vous à l'écart parmi vos amis ?", "vous sentez à l'écart parmi vos amis", 'cultiver les liens avec ceux qui vous comprennent vraiment.'],
    ['êtes-vous sur le point de renoncer à vos souhaits ?', 'êtes sur le point de renoncer à vos souhaits', 'découper vos souhaits en petits objectifs.'],
    ["vivez-vous mal le fait qu'on oublie de vous inviter ?", "vivez mal le fait qu'on oublie de vous inviter", "faire le premier pas vers quelqu'un."],
    ["avez-vous l'impression de ne trouver aucun moyen d'augmenter vos revenus ?", "avez l'impression de ne trouver aucun moyen d'augmenter vos revenus", 'chercher des occasions à travers les personnes que vous connaissez.'],
  ],
  12: [
    ['la fatigue reste-t-elle même après une nuit de sommeil ?', 'sentez la fatigue rester même après une nuit de sommeil', 'prendre un vrai moment à vous pour vous reposer.'],
    ['vous sentez-vous coupable de vouloir du temps pour vous ?', 'vous sentez coupable de vouloir du temps pour vous', 'utiliser ce temps pour vous ressourcer.'],
    ['voulez-vous lâcher quelque chose sans y parvenir ?', 'voulez lâcher quelque chose sans y parvenir', 'alléger ce que vous portez, peu à peu.'],
    ["avez-vous l'impression que vos dépenses s'accumulent ?", "avez l'impression que vos dépenses s'accumulent", 'choisir à nouveau ce dont vous avez vraiment besoin.'],
    ['ressentez-vous une fatigue profonde qui ne passe pas ?', 'ressentez une fatigue profonde qui ne passe pas', 'vous autoriser à ne rien faire pendant un moment.'],
  ],
};

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const ord = (n: number) => (n === 1 ? '1re' : `${n}e`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const FR: LanguagePack = {
  worries: WORRIES,
  field: FIELD,
  write({ moon, chosen, house, period, day, worry: [hook, reason, use] }) {
    const planet = PLANET[chosen.planet];
    const field = FIELD[house];
    const where = (n: number) => `la ${ord(n)} maison à partir de votre signe lunaire ${sign(moon)}`;
    const lead = `En astrologie védique, ${period},`;
    let opening: string;
    let cause: string;
    if (chosen.ingress && day) {
      opening = `${lead} ${planet} entre en ${sign(chosen.ingress.sign)}, ${where(house)}, le ${day.date === 1 ? '1er' : day.date} ${MONTHS[day.month]}.`;
      cause = `entre dans le domaine de ${field}`;
    } else if (chosen.retrograde && !isNode(chosen.planet)) {
      opening = `${lead} ${planet} est rétrograde en ${sign(chosen.sign)}, ${where(chosen.house)}.`;
      cause = `est rétrograde et vous invite à repenser ${field}`;
    } else {
      opening = `${lead} ${planet} se trouve en ${sign(chosen.sign)}, ${where(chosen.house)}.`;
      cause =
        chosen.planet === 'Rahu'
          ? `intensifie votre attention sur ${field}`
          : chosen.planet === 'Ketu'
            ? `éloigne votre cœur de ${field}`
            : `agit avec force sur ${field}`;
    }
    return {
      hook: `Lune en ${sign(moon)}, ${hook}`,
      body: `${cap(opening)} Si vous ${reason}, c'est parce que ${NATURE[chosen.planet]} ${cause}. C'est le bon moment pour ${use}`,
    };
  },
};
