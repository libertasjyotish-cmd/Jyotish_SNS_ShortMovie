/** Spanish Mon–Wed per-sign evergreen scripts: same structure and chart reasoning as the ja/en sets. */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'es') ?? s;
const PLANET: Record<string, string> = {
  Sun: 'el Sol', Moon: 'la Luna', Mars: 'Marte', Mercury: 'Mercurio', Jupiter: 'Júpiter', Venus: 'Venus', Saturn: 'Saturno',
};
type L3 = [string, string, string];

const WORK: Record<Sign, L3> = {
  Capricorn: ['¿te culpas cuando los resultados en el trabajo tardan?', 'construir una confianza sólida con el tiempo', 'organizaciones duraderas o puestos de verdadera responsabilidad'],
  Aquarius: ['¿sientes que no encajas con tus compañeros de trabajo?', 'ver el conjunto y encontrar métodos nuevos', 'la tecnología, la investigación o el diseño de sistemas'],
  Pisces: ['¿te agota que solo te juzguen por los números?', 'apoyar a las personas y aliviar su carga', 'la enseñanza, la orientación o la atención a personas'],
  Aries: ['¿frenas tu fuerza para no incomodar a nadie?', 'decidir por ti y moverte primero', 'lanzar proyectos nuevos o liderar desde delante'],
  Taurus: ['¿te cansa estar siempre en el centro de atención?', 'reconocer la calidad y convertirla en algo duradero', 'la gastronomía, el diseño o el trabajo con valor real'],
  Gemini: ['¿te ahoga hacer la misma tarea cada día?', 'reunir información y explicarla con claridad', 'la escritura, las ventas o conectar a personas'],
  Cancer: ['¿pasas la jornada pendiente del ánimo de los demás?', 'sentir lo que otros sienten y darles tranquilidad', 'la hostelería o la atención a personas'],
  Leo: ['¿te sientes poco valorado trabajando en la sombra?', 'ponerte delante y asumir la responsabilidad', 'dirigir un equipo o trabajar con tu propio nombre'],
  Virgo: ['¿te pesa la distancia entre tus ideales y tu trabajo diario?', 'pulir cada detalle con precisión', 'el análisis o el control de calidad'],
  Libra: ['¿te esfuerzas demasiado tú solo en el trabajo?', 'mediar entre personas y mantener el equilibrio', 'la negociación o el trabajo que une a personas'],
  Scorpio: ['¿te deja vacío un trabajo superficial?', 'profundizar en una sola cosa', 'la investigación o el análisis a fondo'],
  Sagittarius: ['¿te cuesta encontrar sentido a tu trabajo?', 'mostrar un propósito mayor y guiar a otros', 'la educación, el derecho o el trabajo internacional'],
};
const COMPAT: Record<Sign, L3> = {
  Aries: ['¿eres siempre quien va por delante en tus relaciones?', 'tiene el impulso de Marte y va directa', 'personas a las que puedes decir lo que piensas'],
  Taurus: ['¿te agotan las personas que cambian de idea todo el tiempo?', 'tiene la calma de Venus y valora lo que dura', 'personas que construyen la confianza despacio'],
  Gemini: ['¿te cansa estar con gente con la que no puedes hablar de verdad?', 'tiene la ligereza de Mercurio y conecta con palabras', 'personas que siguen tu ritmo al conversar'],
  Cancer: ['¿estás agotado de estar siempre pendiente de los demás?', 'tiene la ternura de la Luna y quiere proteger', 'personas con las que puedes ser tú mismo'],
  Leo: ['¿te pierdes a ti mismo por adaptarte siempre a los demás?', 'tiene la calidez del Sol e ilumina a otros', 'personas que se alegran de verte brillar'],
  Virgo: ['¿te cansa fijarte en cada pequeño detalle?', 'tiene la atención de Mercurio y quiere ser útil', 'personas que agradecen tu atención'],
  Libra: ['¿escondes lo que sientes para evitar roces?', 'tiene la armonía de Venus y valora el equilibrio', 'personas que reciben tu sinceridad con calma'],
  Scorpio: ['¿te dejan con ganas de más las amistades superficiales?', 'guarda la fuerza de Marte por dentro y busca lazos profundos', 'personas con las que puedes ser sincero durante años'],
  Sagittarius: ['¿sientes que las relaciones se vuelven una jaula?', 'tiene la generosidad de Júpiter y quiere explorar', 'personas que respetan la libertad del otro'],
  Capricorn: ['¿te sientes solo porque nunca muestras debilidad?', 'tiene la integridad de Saturno y asume responsabilidades', 'personas que aceptan también tu lado frágil'],
  Aquarius: ['¿te sientes el raro del grupo?', 'tiene la claridad de Saturno y ve a todos como iguales', 'personas que disfrutan de vuestras diferencias'],
  Pisces: ['¿te agota cargar con los sentimientos de los demás?', 'tiene la compasión de Júpiter y siente el dolor ajeno', 'personas que te devuelven tu bondad'],
};
const LOVE: Record<Sign, L3> = {
  Aries: ['en el amor, ¿esperas y nunca das el primer paso?', 'decir lo que sientes e ir directo', 'una pareja que ame tu sinceridad'],
  Taurus: ['¿le das demasiadas vueltas al amor?', 'dejar que el amor crezca despacio y a gusto', 'una pareja con la que te sientas en calma'],
  Gemini: ['¿te inquieta cuando tu pareja y tú dejáis de hablar?', 'compartir palabras y risas', 'una pareja con la que hablar de todo'],
  Cancer: ['¿te haces el fuerte y no puedes apoyarte en tu pareja?', 'crear un lazo cálido en el que os protejáis', 'una pareja con la que puedas ser tú'],
  Leo: ['en el amor, ¿eres siempre quien cede?', 'sentirte querido y mostrar tu amor abiertamente', 'una pareja orgullosa de ti'],
  Virgo: ['¿das mucho a tu pareja y sientes que no se valora?', 'apoyar a tu pareja con atenciones discretas', 'una pareja que note los pequeños detalles'],
  Libra: ['¿evitas cualquier desacuerdo con tu pareja?', 'construir una relación elegante de respeto mutuo', 'una pareja que te trate de igual a igual'],
  Scorpio: ['¿te deja vacío el amor pasajero?', 'unirte a fondo con una sola persona', 'una pareja que acepte lo que de verdad sientes'],
  Sagittarius: ['¿te sientes atrapado cuando tu pareja te sujeta demasiado?', 'aprender y ampliar vuestro mundo juntos', 'una pareja que apoye tu libertad y tus sueños'],
  Capricorn: ['¿eres tan prudente en el amor que se te escapan las ocasiones?', 'construir con el tiempo un amor de confianza', 'una pareja que cumpla sus promesas'],
  Aquarius: ['¿te aburre el romance convencional?', 'hablar con libertad, como mejores amigos', 'una pareja que disfrute de tu forma de ser'],
  Pisces: ['en el amor, ¿te entregas demasiado?', 'conectar de corazón a corazón, más allá de las palabras', 'una pareja que te devuelva tu bondad'],
};
const MONEY: Record<Sign, L3> = {
  Aries: ['¿quieres ahorrar pero lo gastas enseguida?', 'actuar con decisión y ganar por tu cuenta', 'un trabajo en el que abres tu propio camino'],
  Taurus: ['¿renuncias a lo que te gusta por miedo al dinero?', 'reconocer la calidad y hacer crecer su valor', 'un trabajo con cosas de calidad'],
  Gemini: ['¿te inquieta tener un solo ingreso?', 'usar la información para ganar por varias vías', 'un trabajo que aprovecha el conocimiento y las palabras'],
  Cancer: ['¿gastas demasiado dinero en los demás?', 'proteger la vida de quienes quieres', 'un trabajo que sostiene la vida diaria de la gente'],
  Leo: ['¿gastas dinero solo por aparentar?', 'convertir tu nombre y tu reputación en ingresos', 'un trabajo en el que das la cara'],
  Virgo: ['¿recortas gastos y aun así no consigues ahorrar?', 'llevar las cuentas con precisión y evitar el derroche', 'un trabajo con números'],
  Libra: ['¿te cuesta decir que no cuando hay dinero de por medio?', 'ganar gracias a la confianza con otros', 'trabajar en equipo con otros'],
  Scorpio: ['¿te guardas para ti tus preocupaciones de dinero?', 'leer hacia dónde fluye el dinero y hacerlo crecer', 'formas de ganar que crecen con el tiempo'],
  Sagittarius: ['¿estás cansado de pensar siempre en el dinero?', 'convertir lo aprendido y lo vivido en riqueza', 'un trabajo que aprovecha lo que has aprendido'],
  Capricorn: ['¿te angustia que tu dinero crezca tan despacio?', 'construir paso a paso un patrimonio sólido', 'un trabajo que mantienes durante años'],
  Aquarius: ['¿no te encajan las formas habituales de ganar dinero?', 'ganar con sistemas e ideas nuevas', 'el trabajo en línea o las nuevas tecnologías'],
  Pisces: ['¿das tanto que no te queda nada para ti?', 'ayudar a la gente y convertir esa confianza en abundancia', 'un trabajo que ayuda a las personas'],
};
const FAMILY: Record<Sign, L3> = {
  Aries: ['¿chocas a menudo con tu familia?', 'proteger a tu familia con tus propias manos', 'un hogar donde todos puedan decir lo que piensan'],
  Taurus: ['¿ni en casa consigues descansar?', 'cuidar una vida tranquila y agradable', 'un hogar sin prisas'],
  Gemini: ['¿sientes que nunca hablas de verdad con tu familia?', 'unirte a tu familia a través de las palabras', 'una mesa donde se pueda hablar de todo'],
  Cancer: ['¿estás agotado de preocuparte por tu familia?', 'envolver a tu familia en calidez y protegerla', 'un hogar donde también te cuiden a ti'],
  Leo: ['¿sientes que en tu familia no te valoran?', 'estar en el centro y animar a todos', 'una familia que reconoce el esfuerzo de cada uno'],
  Virgo: ['¿cargas tú solo con las tareas de la casa?', 'cuidar cada detalle de la vida familiar', 'una familia que reparte la carga'],
  Libra: ['¿eres siempre quien pone paz en la familia?', 'mantener a tu familia en equilibrio y armonía', 'un hogar donde todos ceden un poco'],
  Scorpio: ['¿no puedes ser sincero ni con tu familia?', 'unirte a fondo con los tuyos', 'una familia que acepta lo que cada uno siente'],
  Sagittarius: ['¿chocan los valores de tu familia con los tuyos?', 'compartir la forma de vivir en la que crees', 'un hogar que respeta el camino de cada uno'],
  Capricorn: ['¿llevas tú solo las cargas de tu familia?', 'cumplir con tu deber hacia tu familia', 'una familia en la que todos se apoyan'],
  Aquarius: ['¿te sientes el diferente de tu familia?', 'aceptar a cada miembro tal como es', 'un hogar que respeta la opinión de todos'],
  Pisces: ['¿te dejas siempre para el final por tu familia?', 'acompañar el dolor de tu familia y sostenerla', 'una familia que te devuelve tu bondad'],
};
const REST: Record<Sign, L3> = {
  Aries: ['¿aunque te tumbes a descansar, sigues cansado?', 'mover el cuerpo te descansa más que quedarte quieto', 'un rato para sudar'],
  Taurus: ['¿las prisas constantes te han cansado también la mente?', 'rodearte de cosas agradables te ayuda a soltarte', 'un rato para disfrutar de la música o los aromas que te gustan'],
  Gemini: ['¿tu mente va tan rápido que no puedes dormir?', 'poner tus pensamientos en palabras te aligera', 'un rato para hablar con alguien'],
  Cancer: ['¿estás agotado de cuidar de todos?', 'un lugar donde te sientes seguro te recarga', 'un lugar donde te cuiden a ti'],
  Leo: ['¿estás a punto de quemarte de tanto esforzarte?', 'el tiempo en que nadie te mira te recarga', 'un rato a solas, fuera de servicio'],
  Virgo: ['¿incluso en tus días libres piensas en tus tareas?', 'un entorno ordenado calma tu mente', 'un espacio tranquilo y ordenado'],
  Libra: ['¿te agota estar siempre pendiente de los demás?', 'lo bello te devuelve el equilibrio', 'un rato para contemplar un paisaje que te guste'],
  Scorpio: ['¿escondes tu cansancio ante todos?', 'dormir a fondo y a solas es tu forma de recuperarte', 'un sueño que nadie interrumpa'],
  Sagittarius: ['¿te desgasta la misma rutina?', 'los lugares y las ideas nuevas te abren la mente', 'un rato para ir a un sitio desconocido'],
  Capricorn: ['¿te sientes culpable por descansar?', 'descansar a una hora fija te da estabilidad', 'una hora fija de descanso cada día'],
  Aquarius: ['¿te cansa simplemente estar rodeado de gente?', 'apartarte a tu propio ritmo te recupera', 'un rato a tu propio ritmo'],
  Pisces: ['¿te cansa absorber los sentimientos de todos?', 'la música y el agua te limpian la mente', 'un rato para escuchar música tranquila'],
};
const IMPRESSION: Record<Sign, L3> = {
  Aries: ['¿te malinterpretan como alguien intimidante?', 'tu forma de actuar sin dudar parece fuerte', 'los papeles en los que lideras desde delante'],
  Taurus: ['¿creen que eres lento?', 'tu presencia tranquila parece pausada', 'las relaciones a largo plazo'],
  Gemini: ['¿creen que no te tomas nada en serio?', 'tu rapidez al hablar y tu ligereza parecen despreocupadas', 'los papeles que conectan a personas'],
  Cancer: ['¿creen que eres cambiante de humor?', 'cada emoción se te nota en la cara', 'los momentos de cuidar a otros'],
  Leo: ['¿te malinterpretan como arrogante?', 'tu presencia segura parece altiva', 'los papeles que reúnen a la gente'],
  Virgo: ['¿creen que eres estricto y quisquilloso?', 'tu ojo para el detalle parece severo', 'el trabajo de poner orden'],
  Libra: ['¿creen que quieres quedar bien con todos?', 'ser amable con todos se ve así', 'los papeles de mediador'],
  Scorpio: ['¿te dicen que no saben lo que piensas?', 'guardar tu interior para ti parece misterioso', 'los papeles en los que te confían lo importante'],
  Sagittarius: ['¿creen que eres descuidado?', 'mirar siempre el panorama general parece despreocupado', 'los papeles en los que guías a otros'],
  Capricorn: ['¿te malinterpretan como frío?', 'poner el deber antes que los sentimientos parece rígido', 'el trabajo importante que te confían'],
  Aquarius: ['¿creen que eres un poco raro?', 'pensar por tu cuenta parece extraño', 'los momentos que piden ideas nuevas'],
  Pisces: ['¿creen que no eres de fiar?', 'una bondad que nunca culpa parece blanda', 'los momentos de consolar a otros'],
};
const AVOID: Record<Sign, L3> = {
  Aries: ['¿te desgasta un trabajo lleno de discusiones?', 'la ira y la competencia te agotan', 'un lugar donde se habla con calma'],
  Taurus: ['¿un entorno caótico te mantiene en tensión?', 'los cambios constantes de última hora te alteran', 'un lugar con una rutina estable'],
  Gemini: ['¿estás cansado de mensajes y charlas sin fin?', 'demasiadas palabras no dejan descansar tu mente', 'un lugar tranquilo para concentrarte'],
  Cancer: ['¿te sientes solo en un ambiente frío?', 'un lugar sin comprensión te encoge el corazón', 'un lugar donde se cuidan unos a otros'],
  Leo: ['¿te cansa un lugar que nunca reconoce tu esfuerzo?', 'que te traten como alguien sin importancia desgasta tu confianza', 'un lugar que te da verdadera responsabilidad'],
  Virgo: ['¿te agota un lugar desordenado y descuidado?', 'el desorden y la dejadez te ponen en tensión', 'un lugar donde las cosas se hacen bien'],
  Libra: ['¿estás cansado de estar entre personas que discuten?', 'el trato injusto te desequilibra', 'un lugar donde se trata a todos con justicia'],
  Scorpio: ['¿te cansa un lugar lleno de juegos y política?', 'las relaciones sin sinceridad te mantienen tenso', 'un lugar sin nada oculto'],
  Sagittarius: ['¿te ahogan las normas sin sentido?', 'las reglas sin propósito te apagan', 'un lugar que confía en tu criterio'],
  Capricorn: ['¿te agota un trabajo que nunca termina?', 'la responsabilidad acumulada te pesa en el corazón', 'un lugar con funciones claras y descansos reales'],
  Aquarius: ['¿te sientes encerrado cuando te imponen viejas costumbres?', 'un lugar que se resiste al cambio te bloquea', 'un lugar donde probar ideas nuevas'],
  Pisces: ['¿te agota cargar con los problemas de todos?', 'que dependan de ti sin límite te desgasta', 'un lugar donde puedas proteger tu tiempo'],
};
const TURNING: Record<Sign, L3> = {
  Aries: ['¿estás a punto de querer dejarlo todo?', 'de golpe, tras un choque o al llegar a tu límite', 'antes de dejarlo en caliente, decides un siguiente paso'],
  Taurus: ['¿te asustan los cambios en tus ingresos o tu casa?', 'despacio, como un cambio de dinero o de vivienda', 'eliges una parte de tu vida que conservar y sueltas el resto'],
  Gemini: ['¿sigue en tu cabeza algo que te contaron?', 'a través de una presentación o una conversación casual', 'quedas esa misma semana para saber más'],
  Cancer: ['¿dudas si cambiar tu vida por tu familia?', 'por circunstancias familiares o una mudanza', 'das a tus deseos el mismo peso que a tu familia'],
  Leo: ['¿se te queda pequeño tu puesto actual?', 'como un ascenso o una petición de dar la cara', 'aceptas ese papel al menos una vez, aunque dudes'],
  Virgo: ['¿sientes que tu salud o tu horario no se sostienen?', 'como un cambio de salud o una revisión de tu forma de trabajar', 'dejas de aguantar y cambias tu forma de trabajar'],
  Libra: ['¿una boda o una ruptura está sacudiendo tu vida?', 'como un cambio en una relación cercana', 'eliges según cómo quieres vivir, no según lo que agrada al otro'],
  Scorpio: ['¿cargas con una preocupación que no puedes contar?', 'cuando sale a la luz un problema oculto', 'se lo cuentas a alguien de confianza en vez de cargarlo solo'],
  Sagittarius: ['¿te atrae volver a estudiar o irte al extranjero?', 'a través de nuevos estudios o un lugar lejano', 'visitas una vez el curso o el lugar que te interesa'],
  Capricorn: ['¿dudas si dejar un trabajo que haces desde hace años?', 'cuando algo que llevas años haciendo llega a su fin', 'llevas todo lo que has construido al siguiente lugar'],
  Aquarius: ['¿piensas en trabajar fuera de una empresa?', 'al dejar una organización o empezar algo con otros', 'buscas a personas que piensan como tú'],
  Pisces: ['¿te inquieta un presentimiento que no sabes explicar?', 'como una intuición inexplicable o un encuentro casual', 'no descartas la intuición y la pruebas en pequeño'],
};
const HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['¿respondes siempre al instante?', 'actúas antes de decidir', 'Consulta con la almohada las respuestas importantes', 'tendrás muchos menos arrepentimientos'],
  Taurus: ['¿te aferras a cosas y personas que ya no encajan?', 'sigues protegiendo lo que ya tienes', 'Suelta una cosa que nunca usas', 'sentirás que respiras mejor'],
  Gemini: ['¿miras el móvil hasta la hora de dormir?', 'siempre persigues información nueva', 'Deja la pantalla una hora antes de acostarte', 'el ruido de tu cabeza se calmará'],
  Cancer: ['¿te preocupa siempre el humor de los demás?', 'vives los sentimientos ajenos como propios', 'Deja de intentar arreglar el ánimo de todos', 'tus propios sentimientos volverán'],
  Leo: ['¿sigues adelante solo sin quejarte nunca?', 'quieres ser en quien todos se apoyan', 'Pide ayuda con una sola cosa', 'se te quitará peso de los hombros'],
  Virgo: ['¿revisas una y otra vez lo que ya está hecho?', 'te molesta cada pequeño fallo', 'Revisa una vez y para', 'te sobrarán tiempo y energía'],
  Libra: ['¿dices que sí cuando en realidad quieres decir que no?', 'intentas no estropear el ambiente', 'Di un no claro una sola vez', 'tratar con la gente será más fácil'],
  Scorpio: ['¿sigues dando vueltas a algo que te dijeron?', 'las heridas se te graban hondo', 'Cuéntaselo a alguien de confianza', 'se te aflojará el nudo del pecho'],
  Sagittarius: ['¿llenas demasiado tu agenda?', 'te lanzas a todo lo que parece divertido', 'Quita un plan', 'disfrutarás de verdad cada uno'],
  Capricorn: ['¿piensas en el trabajo incluso en tus días libres?', 'siempre pones la responsabilidad primero', 'No mires mensajes del trabajo en tus días libres', 'notarás la diferencia la semana siguiente'],
  Aquarius: ['¿lo decides todo tú sin apoyarte en nadie?', 'no quieres renunciar a tu manera', 'Sigue la idea de otra persona una sola vez', 'se abrirá un camino inesperado'],
  Pisces: ['¿te resulta imposible decir que no?', 'no puedes ignorar a quien lo necesita', 'No respondas al momento, tómate tiempo para pensarlo', 'protegerás tu propio tiempo'],
};
const NATURE: Record<Sign, L3> = {
  Aries: ['¿estás cansado de adaptarte siempre a los demás?', 'abrir tu propio camino con tus propios pies', 'afrontando un reto que tú mismo elegiste'],
  Taurus: ['¿te angustia la velocidad de los demás?', 'hacer crecer algo sólido con el tiempo', 'perseverando con paciencia en una sola cosa'],
  Gemini: ['¿te reprochas saber de todo un poco y de nada mucho?', 'aprender y transmitirlo a otros', 'contando a alguien lo que has aprendido'],
  Cancer: ['¿te dejas siempre en último lugar?', 'que las personas que quieres se sientan seguras', 'pasando un rato tranquilo con los tuyos'],
  Leo: ['¿te echas atrás cuando toca destacar?', 'vivir de una forma de la que puedas sentirte orgulloso', 'diciendo lo que piensas con seguridad'],
  Virgo: ['¿te cuesta ver tus propias cualidades?', 'dar lo mejor de ti de una forma que ayude', 'resolviendo con soltura el problema de alguien'],
  Libra: ['¿te preocupa no tener opinión propia?', 'crear armonía entre las personas', 'acercando a personas que no están de acuerdo'],
  Scorpio: ['¿le das demasiadas vueltas a todo?', 'la verdad que hay bajo la superficie', 'llegando hasta el fondo de una sola cosa'],
  Sagittarius: ['¿sientes que a tu forma de vivir le falta algo?', 'aprender siempre y ampliar tu mirada', 'explorando ideas o lugares nuevos'],
  Capricorn: ['¿crees que eres demasiado serio?', 'cumplir tus responsabilidades a largo plazo', 'avanzando paso a paso hacia una meta que te marcaste'],
  Aquarius: ['¿sientes que no conectas con quienes te rodean?', 'pensar más allá de los moldes para crear formas nuevas', 'probando las cosas a tu manera'],
  Pisces: ['¿te preocupa sentir demasiado el dolor ajeno?', 'percibir el dolor oculto y acompañarlo', 'escuchando a alguien en silencio'],
};
const SUN_TRAIT: Record<Sign, string> = {
  Aries: 'apasionado y lleno de acción', Taurus: 'tranquilo y constante', Gemini: 'ingenioso y sociable',
  Cancer: 'hogareño y muy afectuoso', Leo: 'brillante y líder nato', Virgo: 'meticuloso y perfeccionista',
  Libra: 'encantador y elegante', Scorpio: 'intenso y reservado', Sagittarius: 'libre y optimista',
  Capricorn: 'serio y trabajador', Aquarius: 'original y poco convencional', Pisces: 'dulce y soñador',
};

const P = (s: Sign) => PLANET[RULER[s]];
const VA = 'En la astrología védica,';
const hk = (m: Sign, h: string) => `Luna en ${sign(m)}, ${h}`;

const SERIES: Record<SignThemeSeries, (m: Sign) => EvergreenTemplate> = {
  work: (m) => { const s = signFrom(m, 10); const [h, a, b] = WORK[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 10, la del trabajo. Por eso puedes ${a}. En ${b}, tu fuerza sale de forma natural.` }; },
  compat: (m) => { const [h, a, b] = COMPAT[m];
    return { hook: hk(m, h), body: `${VA} la compatibilidad se lee de Luna a Luna, no por el Sol. La Luna en ${sign(m)} ${a}. Con ${b}, los corazones conectan de forma natural.` }; },
  love: (m) => { const s = signFrom(m, 5); const [h, a, b] = LOVE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 5, la del amor. Por eso deseas ${a}. Con ${b}, ese amor es correspondido.` }; },
  money: (m) => { const s = signFrom(m, 2); const [h, a, b] = MONEY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 2, la del dinero. Por eso puedes ${a}. En ${b}, el dinero llega de forma natural.` }; },
  family: (m) => { const s = signFrom(m, 4); const [h, a, b] = FAMILY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 4, la de la familia. Por eso quieres ${a}. En ${b}, encuentras paz de verdad.` }; },
  rest: (m) => { const s = signFrom(m, 12); const [h, a, b] = REST[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 12, la del descanso. Por eso ${a}. Con ${b}, la energía vuelve sola.` }; },
  impression: (m) => { const [h, a, b] = IMPRESSION[m];
    return { hook: hk(m, h), body: `${VA} ${P(m)} rige tu casa 1, la imagen que muestras. Por eso ${a}. En ${b}, esa impresión se convierte en confianza.` }; },
  avoid: (m) => { const s = signFrom(m, 6); const [h, a, b] = AVOID[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 6, la de lo que te desgasta. Por eso ${a}. En ${b}, vuelves a ser tú.` }; },
  turning: (m) => { const s = signFrom(m, 8); const [h, a, b] = TURNING[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 8, la de los giros de la vida. Tu momento de cambio llega ${a}. Si ${b}, jugará a tu favor.` }; },
  habit: (m) => { const [h, a, b, c] = HABIT[m];
    return { hook: hk(m, h), body: `${VA} tu Luna, que muestra tu corazón, toma la naturaleza de ${P(m)}. Por eso ${a}. ${b} y ${c}.` }; },
  nature: (m) => { const s = signFrom(m, 9); const [h, a, b] = NATURE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rige tu casa 9, el eje de tu vida. Lo que de verdad valoras es ${a}. Cuando estás ${b}, eres más tú.` }; },
  sidereal: (sun) => ({
    hook: `${sign(sun)}, los horóscopos dicen que eres ${SUN_TRAIT[sun]}. ¿Sientes que no eres tú?`,
    body: 'La astrología védica lee tu carácter por la Luna, no por el Sol, y usa la posición real de las estrellas. Muchas personas tienen el Sol y la Luna en signos distintos; quizá por eso los horóscopos no aciertan.',
  }),
};

export function buildEvergreenTemplateEs(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const m = asSign(moonSign);
  return m && SIGNS.includes(m) ? SERIES[series](m) : null;
}
