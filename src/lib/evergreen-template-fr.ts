/** French Mon–Wed per-sign evergreen scripts (vous): same structure and chart reasoning as the ja/en sets. */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'fr') ?? s;
const PLANET: Record<string, string> = {
  Sun: 'le Soleil', Moon: 'la Lune', Mars: 'Mars', Mercury: 'Mercure', Jupiter: 'Jupiter', Venus: 'Vénus', Saturn: 'Saturne',
};
type L3 = [string, string, string];

const WORK: Record<Sign, L3> = {
  Capricorn: ['vous vous en voulez quand les résultats tardent ?', 'bâtir une confiance solide avec le temps', 'les organisations durables ou les postes à vraie responsabilité'],
  Aquarius: ['vous vous sentez en décalage avec vos collègues ?', 'voir l’ensemble et inventer de nouvelles méthodes', 'la technologie, la recherche ou la création de systèmes'],
  Pisces: ['être jugé sur les seuls chiffres vous épuise ?', 'soutenir les gens et alléger leur fardeau', 'l’enseignement, l’accompagnement ou le service aux personnes'],
  Aries: ['vous retenez votre force pour ne gêner personne ?', 'décider seul et agir le premier', 'le lancement de projets ou les rôles en première ligne'],
  Taurus: ['être sans cesse sous les projecteurs vous fatigue ?', 'reconnaître la qualité et la faire durer', 'la gastronomie, le design ou les métiers de vraie valeur'],
  Gemini: ['refaire la même tâche chaque jour vous étouffe ?', 'rassembler l’information et l’expliquer clairement', 'l’écriture, la vente ou la mise en relation'],
  Cancer: ['vous passez la journée à surveiller l’humeur des autres ?', 'sentir ce que ressentent les autres et les apaiser', 'l’hôtellerie ou le service aux personnes'],
  Leo: ['vous vous sentez peu reconnu en coulisses ?', 'passer devant et prendre la responsabilité', 'la direction d’équipe ou un travail à votre nom'],
  Virgo: ['l’écart entre vos idéaux et le quotidien vous pèse ?', 'perfectionner chaque détail avec précision', 'l’analyse ou le contrôle qualité'],
  Libra: ['vous portez trop de choses seul au travail ?', 'servir de médiateur et garder l’équilibre', 'la négociation ou les métiers qui rapprochent les gens'],
  Scorpio: ['un travail superficiel vous laisse vide ?', 'creuser une seule chose jusqu’au bout', 'la recherche ou l’analyse approfondie'],
  Sagittarius: ['vous peinez à trouver un sens à votre travail ?', 'montrer un but plus grand et guider les autres', 'l’éducation, le droit ou l’international'],
};
const COMPAT: Record<Sign, L3> = {
  Aries: ['c’est toujours vous qui faites le premier pas ?', 'a l’élan de Mars et va droit au but', 'des personnes à qui vous pouvez parler franchement'],
  Taurus: ['les gens qui changent d’avis sans cesse vous fatiguent ?', 'a le calme de Vénus et aime ce qui dure', 'des personnes qui bâtissent la confiance lentement'],
  Gemini: ['être avec quelqu’un sans vraie conversation vous lasse ?', 'a la vivacité de Mercure et se lie par les mots', 'des personnes qui suivent votre rythme de conversation'],
  Cancer: ['vous êtes épuisé d’être toujours attentif aux autres ?', 'a la tendresse de la Lune et veut protéger', 'des personnes avec qui vous pouvez être vous-même'],
  Leo: ['vous vous perdez à force de vous adapter ?', 'a la chaleur du Soleil et éclaire les autres', 'des personnes heureuses de vous voir briller'],
  Virgo: ['remarquer chaque petit détail vous fatigue ?', 'a l’attention de Mercure et veut être utile', 'des personnes qui apprécient votre attention'],
  Libra: ['vous cachez ce que vous ressentez pour éviter les conflits ?', 'a l’harmonie de Vénus et tient à l’équilibre', 'des personnes qui accueillent votre franchise avec calme'],
  Scorpio: ['les amitiés superficielles vous laissent sur votre faim ?', 'garde la force de Mars en dedans et cherche des liens profonds', 'des personnes avec qui rester sincère pendant des années'],
  Sagittarius: ['vous sentez que vos relations deviennent une cage ?', 'a la générosité de Jupiter et aime explorer', 'des personnes qui respectent la liberté de chacun'],
  Capricorn: ['vous vous sentez seul à force de ne jamais montrer de faiblesse ?', 'a la droiture de Saturne et assume ses responsabilités', 'des personnes qui acceptent aussi votre côté fragile'],
  Aquarius: ['vous vous sentez à part dans le groupe ?', 'a la lucidité de Saturne et voit chacun comme un égal', 'des personnes qui aiment vos différences'],
  Pisces: ['porter les émotions des autres vous épuise ?', 'a la compassion de Jupiter et ressent la peine d’autrui', 'des personnes qui vous rendent votre gentillesse'],
};
const LOVE: Record<Sign, L3> = {
  Aries: ['en amour, vous attendez sans jamais faire le premier pas ?', 'dire ce que vous ressentez sans détour', 'un partenaire qui aime votre franchise'],
  Taurus: ['vous réfléchissez trop en amour ?', 'laisser l’amour grandir lentement et en douceur', 'un partenaire auprès de qui vous êtes apaisé'],
  Gemini: ['vous êtes inquiet quand la conversation s’arrête avec votre partenaire ?', 'partager des mots et des rires', 'un partenaire avec qui parler de tout'],
  Cancer: ['vous jouez les forts sans pouvoir vous appuyer sur votre partenaire ?', 'créer un lien chaleureux où l’on se protège', 'un partenaire avec qui être vous-même'],
  Leo: ['en amour, c’est toujours vous qui cédez ?', 'vous sentir aimé et montrer votre amour ouvertement', 'un partenaire fier de vous'],
  Virgo: ['vous donnez beaucoup sans que votre partenaire le voie ?', 'soutenir votre partenaire par de petites attentions', 'un partenaire qui remarque les petits gestes'],
  Libra: ['vous évitez tout désaccord avec votre partenaire ?', 'bâtir une relation élégante de respect mutuel', 'un partenaire qui vous traite d’égal à égal'],
  Scorpio: ['les amours passagères vous laissent vide ?', 'vous unir profondément à une seule personne', 'un partenaire qui accueille ce que vous ressentez vraiment'],
  Sagittarius: ['vous étouffez quand votre partenaire vous retient trop ?', 'apprendre et élargir votre monde à deux', 'un partenaire qui soutient votre liberté et vos rêves'],
  Capricorn: ['vous êtes si prudent en amour que les occasions passent ?', 'construire avec le temps un amour de confiance', 'un partenaire qui tient ses promesses'],
  Aquarius: ['la romance classique vous ennuie ?', 'parler librement, comme de meilleurs amis', 'un partenaire qui aime votre façon d’être'],
  Pisces: ['en amour, vous donnez trop ?', 'vous relier de cœur à cœur, au-delà des mots', 'un partenaire qui vous rend votre gentillesse'],
};
const MONEY: Record<Sign, L3> = {
  Aries: ['vous voulez épargner, mais tout part vite ?', 'agir avec décision et gagner par vous-même', 'un travail où vous ouvrez votre propre voie'],
  Taurus: ['vous renoncez à ce que vous aimez par peur de manquer ?', 'reconnaître la qualité et faire grandir la valeur', 'un travail avec des choses de qualité'],
  Gemini: ['n’avoir qu’un seul revenu vous inquiète ?', 'utiliser l’information pour gagner de plusieurs façons', 'un travail qui mise sur le savoir et les mots'],
  Cancer: ['vous dépensez trop pour les autres ?', 'protéger la vie de ceux que vous aimez', 'un travail qui soutient la vie quotidienne des gens'],
  Leo: ['vous dépensez pour sauver les apparences ?', 'transformer votre nom et votre réputation en revenu', 'un travail où vous vous montrez'],
  Virgo: ['vous réduisez vos dépenses sans réussir à épargner ?', 'tenir vos comptes avec précision et éviter le gaspillage', 'un travail avec des chiffres'],
  Libra: ['vous avez du mal à dire non quand l’argent est en jeu ?', 'gagner grâce à la confiance des autres', 'un travail en partenariat'],
  Scorpio: ['vous gardez pour vous vos soucis d’argent ?', 'lire où va l’argent et le faire fructifier', 'des revenus qui grandissent avec le temps'],
  Sagittarius: ['penser sans cesse à l’argent vous fatigue ?', 'transformer vos savoirs et votre vécu en richesse', 'un travail qui valorise ce que vous avez appris'],
  Capricorn: ['voir l’argent grandir si lentement vous angoisse ?', 'bâtir pas à pas un patrimoine solide', 'un travail que vous menez pendant des années'],
  Aquarius: ['les façons habituelles de gagner ne vous conviennent pas ?', 'gagner avec des systèmes et des idées neuves', 'le travail en ligne ou les nouvelles technologies'],
  Pisces: ['vous donnez tant qu’il ne vous reste rien ?', 'aider les gens et changer cette confiance en abondance', 'un travail qui aide les gens'],
};
const FAMILY: Record<Sign, L3> = {
  Aries: ['vous vous heurtez souvent à votre famille ?', 'protéger votre famille de vos propres mains', 'un foyer où chacun peut parler franchement'],
  Taurus: ['même chez vous, vous n’arrivez pas à vous reposer ?', 'cultiver une vie paisible et agréable', 'un foyer sans précipitation'],
  Gemini: ['vous sentez que vous ne parlez jamais vraiment en famille ?', 'vous lier à votre famille par les mots', 'une table où l’on parle de tout'],
  Cancer: ['vous êtes épuisé de vous inquiéter pour votre famille ?', 'envelopper votre famille de tendresse', 'un foyer où l’on prend aussi soin de vous'],
  Leo: ['vous sentez que votre famille ne vous apprécie pas ?', 'être au centre et donner de l’élan à tous', 'une famille qui reconnaît les efforts de chacun'],
  Virgo: ['vous portez seul les tâches de la maison ?', 'veiller à chaque détail de la vie familiale', 'une famille qui partage la charge'],
  Libra: ['c’est toujours vous qui réconciliez la famille ?', 'garder la famille en équilibre et en harmonie', 'un foyer où chacun cède un peu'],
  Scorpio: ['vous n’arrivez pas à être sincère même en famille ?', 'vous lier profondément aux vôtres', 'une famille qui accueille ce que chacun ressent'],
  Sagittarius: ['les valeurs de votre famille ne sont pas les vôtres ?', 'partager la façon de vivre en laquelle vous croyez', 'un foyer qui respecte le chemin de chacun'],
  Capricorn: ['vous portez seul le poids de la famille ?', 'remplir votre devoir envers votre famille', 'une famille où chacun soutient l’autre'],
  Aquarius: ['vous vous sentez le différent de la famille ?', 'accepter chacun tel qu’il est', 'un foyer qui respecte l’avis de tous'],
  Pisces: ['vous vous mettez toujours en dernier pour votre famille ?', 'accompagner la peine des vôtres et les soutenir', 'une famille qui vous rend votre gentillesse'],
};
const REST: Record<Sign, L3> = {
  Aries: ['même allongé pour vous reposer, vous restez fatigué ?', 'bouger vous repose mieux que rester immobile', 'un moment pour transpirer'],
  Taurus: ['la précipitation permanente a fatigué votre esprit ?', 'être entouré de choses agréables vous détend', 'un moment avec la musique ou les parfums que vous aimez'],
  Gemini: ['votre esprit tourne au point de ne pas dormir ?', 'mettre vos pensées en mots vous soulage', 'un moment pour parler avec quelqu’un'],
  Cancer: ['vous êtes épuisé de prendre soin de tout le monde ?', 'un lieu où vous vous sentez en sécurité vous ressource', 'un endroit où l’on prend soin de vous'],
  Leo: ['vous êtes au bord de l’épuisement à force d’efforts ?', 'le temps où personne ne vous regarde vous ressource', 'un moment seul, sans rôle à jouer'],
  Virgo: ['même en congé, vous pensez à vos tâches ?', 'un espace rangé apaise votre esprit', 'un lieu calme et bien rangé'],
  Libra: ['être toujours attentif aux autres vous fatigue ?', 'la beauté vous rend votre équilibre', 'un moment devant un paysage que vous aimez'],
  Scorpio: ['vous cachez votre fatigue à tout le monde ?', 'dormir profondément, seul, est votre façon de récupérer', 'un sommeil que personne ne vient troubler'],
  Sagittarius: ['la même routine vous use ?', 'les lieux et les idées nouvelles ouvrent votre esprit', 'une sortie vers un endroit inconnu'],
  Capricorn: ['vous culpabilisez de vous reposer ?', 'un repos à heure fixe vous stabilise', 'une heure de repos fixe chaque jour'],
  Aquarius: ['être entouré de monde suffit à vous fatiguer ?', 'prendre du recul à votre rythme vous ressource', 'un moment à votre propre rythme'],
  Pisces: ['absorber les émotions de tous vous épuise ?', 'la musique et l’eau vous lavent l’esprit', 'un moment avec une musique douce'],
};
const IMPRESSION: Record<Sign, L3> = {
  Aries: ['on vous trouve intimidant ?', 'votre façon d’agir sans hésiter paraît dure', 'les rôles en première ligne'],
  Taurus: ['on vous trouve lent ?', 'votre calme paraît de la lenteur', 'les relations sur le long terme'],
  Gemini: ['on pense que vous ne prenez rien au sérieux ?', 'votre parole rapide et légère paraît désinvolte', 'les rôles qui relient les gens'],
  Cancer: ['on vous trouve lunatique ?', 'chaque émotion se lit sur votre visage', 'les moments où vous soutenez les autres'],
  Leo: ['on vous trouve arrogant ?', 'votre assurance paraît de la fierté', 'les rôles qui rassemblent les gens'],
  Virgo: ['on vous trouve strict et exigeant ?', 'votre regard sur les détails paraît sévère', 'les tâches où il faut mettre de l’ordre'],
  Libra: ['on pense que vous voulez plaire à tous ?', 'être aimable avec chacun donne cette image', 'les rôles de médiateur'],
  Scorpio: ['on dit ne pas savoir ce que vous pensez ?', 'garder votre intérieur pour vous paraît mystérieux', 'les rôles où l’on vous confie l’essentiel'],
  Sagittarius: ['on vous trouve étourdi ?', 'voir toujours l’ensemble paraît de la négligence', 'les rôles où vous guidez les autres'],
  Capricorn: ['on vous trouve froid ?', 'faire passer le devoir avant les sentiments paraît rigide', 'les missions importantes qu’on vous confie'],
  Aquarius: ['on vous trouve un peu bizarre ?', 'penser par vous-même paraît étrange', 'les moments qui demandent des idées neuves'],
  Pisces: ['on pense qu’on ne peut pas compter sur vous ?', 'une bonté qui ne blâme jamais paraît faible', 'les moments où vous consolez les autres'],
};
const AVOID: Record<Sign, L3> = {
  Aries: ['un travail plein de disputes vous use ?', 'la colère et la compétition vous épuisent', 'un lieu où l’on parle calmement'],
  Taurus: ['un milieu chaotique vous crispe ?', 'les changements de dernière minute vous ébranlent', 'un lieu au rythme stable'],
  Gemini: ['les messages et réunions sans fin vous fatiguent ?', 'trop de mots empêchent votre esprit de se reposer', 'un lieu calme pour vous concentrer'],
  Cancer: ['vous vous sentez seul dans un milieu froid ?', 'un lieu sans compréhension vous serre le cœur', 'un lieu où l’on prend soin les uns des autres'],
  Leo: ['un lieu qui ne reconnaît jamais vos efforts vous use ?', 'être traité comme quelqu’un sans importance mine votre confiance', 'un lieu qui vous donne une vraie responsabilité'],
  Virgo: ['un lieu désordonné et bâclé vous épuise ?', 'le désordre et la négligence vous crispent', 'un lieu où les choses sont bien faites'],
  Libra: ['être coincé entre des gens qui se disputent vous fatigue ?', 'l’injustice vous fait perdre l’équilibre', 'un lieu où chacun est traité avec justice'],
  Scorpio: ['un lieu plein de jeux de pouvoir vous use ?', 'les relations sans sincérité vous crispent', 'un lieu sans rien de caché'],
  Sagittarius: ['les règles absurdes vous étouffent ?', 'des règles sans but vous éteignent', 'un lieu qui fait confiance à votre jugement'],
  Capricorn: ['un travail qui ne finit jamais vous épuise ?', 'les responsabilités accumulées vous pèsent sur le cœur', 'un lieu aux rôles clairs avec de vraies pauses'],
  Aquarius: ['on vous impose de vieilles habitudes et vous étouffez ?', 'un lieu qui refuse le changement vous bloque', 'un lieu où tester des idées neuves'],
  Pisces: ['porter les problèmes de tous vous épuise ?', 'qu’on compte sur vous sans limite vous use', 'un lieu où vous pouvez protéger votre temps'],
};
const TURNING: Record<Sign, L3> = {
  Aries: ['vous êtes sur le point de tout lâcher ?', 'soudain, après un heurt ou quand vous êtes à bout', 'avant de partir sur un coup de tête, fixez une prochaine étape'],
  Taurus: ['les changements de revenu ou de logement vous font peur ?', 'lentement, par un changement d’argent ou de logement', 'choisissez une part de votre vie à garder et lâchez le reste'],
  Gemini: ['une histoire entendue ne vous quitte pas ?', 'par une présentation ou une conversation banale', 'revoyez la personne dans la semaine pour en savoir plus'],
  Cancer: ['vous hésitez à changer de vie à cause de la famille ?', 'par une affaire de famille ou un déménagement', 'donnez à vos envies le même poids qu’à la famille'],
  Leo: ['votre poste actuel est devenu trop petit ?', 'par une promotion ou une demande de passer devant', 'acceptez ce rôle au moins une fois, même en doutant'],
  Virgo: ['votre santé ou votre emploi du temps ne tiennent plus ?', 'par un changement de santé', 'arrêtez de forcer et changez de rythme'],
  Libra: ['un mariage ou une rupture bouscule votre vie ?', 'par un changement dans une relation proche', 'choisissez selon la vie que vous voulez, pas pour plaire'],
  Scorpio: ['vous portez un souci que vous ne pouvez dire ?', 'quand un problème caché remonte à la surface', 'confiez-le à quelqu’un de confiance'],
  Sagittarius: ['vous avez envie de reprendre des études ou de partir à l’étranger ?', 'par de nouvelles études ou un lieu lointain', 'visitez une fois la formation ou le lieu qui vous attire'],
  Capricorn: ['vous hésitez à quitter un travail de longue date ?', 'quand une chose menée depuis des années prend fin', 'emportez tout ce que vous avez bâti vers la suite'],
  Aquarius: ['vous pensez travailler hors d’une entreprise ?', 'en quittant une organisation ou en lançant un projet à plusieurs', 'cherchez des gens qui pensent comme vous'],
  Pisces: ['un pressentiment inexplicable vous trouble ?', 'par une intuition ou une rencontre fortuite', 'ne l’écartez pas, testez-la à petite échelle'],
};
const HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['vous répondez toujours sur-le-champ ?', 'vous agissez avant de décider', 'Laissez les réponses importantes jusqu’au lendemain', 'vous regretterez alors beaucoup moins'],
  Taurus: ['vous gardez des choses et des liens qui ne vous vont plus ?', 'vous protégez ce que vous avez déjà', 'Séparez-vous d’une chose que vous n’utilisez jamais', 'vous respirerez mieux'],
  Gemini: ['vous regardez votre téléphone jusqu’au coucher ?', 'vous cherchez toujours de nouvelles informations', 'Lâchez l’écran une heure avant de dormir', 'le bruit dans votre tête se calmera'],
  Cancer: ['l’humeur des autres vous préoccupe sans cesse ?', 'vous vivez les émotions d’autrui comme les vôtres', 'Cessez de vouloir réparer l’humeur de tous', 'vos propres émotions reviendront'],
  Leo: ['vous avancez seul sans jamais vous plaindre ?', 'vous voulez être celui sur qui tous s’appuient', 'Demandez de l’aide pour une seule chose', 'vos épaules seront plus légères'],
  Virgo: ['vous revérifiez plusieurs fois ce qui est fini ?', 'chaque petite erreur vous dérange', 'Vérifiez une fois puis arrêtez', 'il vous restera du temps et de l’énergie'],
  Libra: ['vous dites oui quand vous voulez dire non ?', 'vous ne voulez pas gâcher l’ambiance', 'Dites non clairement une seule fois', 'vos relations deviendront plus simples'],
  Scorpio: ['vous ressassez ce qu’on vous a dit ?', 'les blessures se gravent profondément en vous', 'Confiez-vous à quelqu’un de confiance', 'le poids sur votre poitrine s’allégera'],
  Sagittarius: ['vous surchargez votre agenda ?', 'vous plongez dans tout ce qui semble amusant', 'Retirez un rendez-vous', 'vous profiterez vraiment de chacun'],
  Capricorn: ['vous pensez au travail même en congé ?', 'vous placez toujours la responsabilité en premier', 'Ne lisez pas vos messages pro pendant vos congés', 'la semaine suivante sera différente'],
  Aquarius: ['vous décidez tout seul sans vous appuyer sur personne ?', 'vous ne voulez pas lâcher votre façon de faire', 'Suivez l’idée de quelqu’un d’autre une seule fois', 'un chemin inattendu s’ouvrira'],
  Pisces: ['il vous est impossible de dire non ?', 'vous ne pouvez ignorer quelqu’un dans le besoin', 'Ne répondez pas aussitôt, prenez le temps de réfléchir', 'vous protégerez votre propre temps'],
};
const NATURE: Record<Sign, L3> = {
  Aries: ['vous êtes las de toujours vous adapter ?', 'ouvrir votre propre chemin', 'relevez un défi choisi par vous-même'],
  Taurus: ['le rythme des autres vous angoisse ?', 'faire grandir quelque chose de solide avec le temps', 'persévérez patiemment sur une seule chose'],
  Gemini: ['vous vous reprochez de savoir un peu de tout ?', 'apprendre et transmettre', 'racontez à quelqu’un ce que vous avez appris'],
  Cancer: ['vous passez toujours en dernier ?', 'que ceux que vous aimez se sentent en sécurité', 'passez un moment paisible avec vos proches'],
  Leo: ['vous reculez quand il faut vous montrer ?', 'vivre d’une façon dont vous êtes fier', 'dites ce que vous pensez avec assurance'],
  Virgo: ['vous avez du mal à voir vos propres qualités ?', 'donner le meilleur de vous de façon utile', 'réglez sans effort le problème de quelqu’un'],
  Libra: ['vous craignez de ne pas avoir d’avis à vous ?', 'créer l’harmonie entre les gens', 'rapprochez des gens qui ne se comprennent pas'],
  Scorpio: ['vous réfléchissez trop à tout ?', 'la vérité sous la surface', 'allez au fond d’une seule chose'],
  Sagittarius: ['il manque quelque chose à votre façon de vivre ?', 'apprendre sans cesse et élargir votre regard', 'explorez des idées ou des lieux nouveaux'],
  Capricorn: ['vous vous trouvez trop sérieux ?', 'tenir vos responsabilités sur la durée', 'avancez pas à pas vers le but que vous avez fixé'],
  Aquarius: ['vous ne vous sentez pas relié à votre entourage ?', 'sortir des cadres pour créer du neuf', 'essayez les choses à votre manière'],
  Pisces: ['ressentir trop la peine des autres vous inquiète ?', 'percevoir la peine cachée et l’accompagner', 'écoutez quelqu’un en silence'],
};
const SUN_TRAIT: Record<Sign, string> = {
  Aries: 'passionné et plein d’action', Taurus: 'calme et constant', Gemini: 'vif et sociable',
  Cancer: 'casanier et très affectueux', Leo: 'rayonnant et meneur', Virgo: 'méticuleux et perfectionniste',
  Libra: 'charmant et élégant', Scorpio: 'intense et secret', Sagittarius: 'libre et optimiste',
  Capricorn: 'sérieux et travailleur', Aquarius: 'original et hors normes', Pisces: 'doux et rêveur',
};

const P = (s: Sign) => PLANET[RULER[s]];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const VA = 'En astrologie védique,';
const hk = (m: Sign, h: string) => `Lune en ${sign(m)}, ${h}`;

const SERIES: Record<SignThemeSeries, (m: Sign) => EvergreenTemplate> = {
  work: (m) => { const s = signFrom(m, 10); const [h, a, b] = WORK[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 10, celle du travail. C’est pourquoi vous savez ${a}. Dans ${b}, votre force se révèle d’elle-même.` }; },
  compat: (m) => { const [h, a, b] = COMPAT[m];
    return { hook: hk(m, h), body: `${VA} la compatibilité se lit de Lune à Lune, pas par le Soleil. La Lune en ${sign(m)} ${a}. Avec ${b}, les cœurs se comprennent naturellement.` }; },
  love: (m) => { const s = signFrom(m, 5); const [h, a, b] = LOVE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 5, celle de l’amour. C’est pourquoi vous voulez ${a}. Avec ${b}, cet amour est partagé.` }; },
  money: (m) => { const s = signFrom(m, 2); const [h, a, b] = MONEY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 2, celle de l’argent. C’est pourquoi vous savez ${a}. Avec ${b}, l’argent vient de lui-même.` }; },
  family: (m) => { const s = signFrom(m, 4); const [h, a, b] = FAMILY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 4, celle de la famille. C’est pourquoi vous voulez ${a}. Dans ${b}, vous trouvez une vraie paix.` }; },
  rest: (m) => { const s = signFrom(m, 12); const [h, a, b] = REST[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 12, celle du repos. C’est justement pour cela que ${a}. Avec ${b}, l’énergie revient d’elle-même.` }; },
  impression: (m) => { const [h, a, b] = IMPRESSION[m];
    return { hook: hk(m, h), body: `${VA} ${P(m)} est lié à votre maison 1, l’image que vous montrez. C’est justement pour cela que ${a}. Dans ${b}, cette impression devient de la confiance.` }; },
  avoid: (m) => { const s = signFrom(m, 6); const [h, a, b] = AVOID[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 6, celle de ce qui vous use. C’est justement pour cela que ${a}. Dans ${b}, vous redevenez vous-même.` }; },
  turning: (m) => { const s = signFrom(m, 8); const [h, a, b] = TURNING[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 8, celle des tournants. Votre propre tournant arrive ${a}. Quand ce moment arrive, ${b}.` }; },
  habit: (m) => { const [h, a, b, c] = HABIT[m];
    return { hook: hk(m, h), body: `${VA} votre Lune, qui montre votre cœur, prend la nature de ${P(m)}. C’est justement pour cela que ${a}. ${b} et ${c}.` }; },
  nature: (m) => { const s = signFrom(m, 9); const [h, a, b] = NATURE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} est lié à votre maison 9, l’axe de votre vie. Ce qui compte vraiment pour vous, c’est ${a}. ${cap(b)} : c’est là que vous êtes le plus vous-même.` }; },
  sidereal: (sun) => ({
    hook: `${sign(sun)}, les horoscopes vous disent ${SUN_TRAIT[sun]}. Vous ne vous y reconnaissez pas ?`,
    body: 'L’astrologie védique lit votre caractère par la Lune, pas par le Soleil, et utilise la vraie position des étoiles. Beaucoup ont le Soleil et la Lune dans des signes différents ; c’est peut-être pour cela que les horoscopes tombent à côté.',
  }),
};

export function buildEvergreenTemplateFr(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const m = asSign(moonSign);
  return m && SIGNS.includes(m) ? SERIES[series](m) : null;
}
