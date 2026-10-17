/** Spanish weekly reading (tú). Same worry order as `JA_WORRIES`; wording written by hand. */
import type { Sign } from '@/lib/placements';
import { isNode, LanguagePack, Worry } from '@/lib/weekly-template-pack';

const SIGN: Record<Sign, string> = {
  Aries: 'Aries', Taurus: 'Tauro', Gemini: 'Géminis', Cancer: 'Cáncer', Leo: 'Leo', Virgo: 'Virgo',
  Libra: 'Libra', Scorpio: 'Escorpio', Sagittarius: 'Sagitario', Capricorn: 'Capricornio',
  Aquarius: 'Acuario', Pisces: 'Piscis',
};

const PLANET: Record<string, string> = {
  Sun: 'el Sol', Mars: 'Marte', Mercury: 'Mercurio', Jupiter: 'Júpiter', Venus: 'Venus',
  Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu',
};

const NATURE: Record<string, string> = {
  Sun: 'el Sol, planeta de la expresión personal,',
  Mars: 'Marte, planeta del impulso y la acción,',
  Mercury: 'Mercurio, planeta del pensamiento y la palabra,',
  Jupiter: 'Júpiter, planeta del crecimiento,',
  Venus: 'Venus, planeta del amor y el bienestar,',
  Saturn: 'Saturno, planeta del deber y la paciencia,',
  Rahu: 'Rahu, que agranda el deseo,',
  Ketu: 'Ketu, que afloja el apego,',
};

const FIELD: Record<number, string> = {
  1: 'la forma en que te ves',
  2: 'el dinero, las palabras y lo que valoras',
  3: 'la comunicación diaria y tu impulso para actuar',
  4: 'el hogar y la paz interior',
  5: 'el amor, la alegría y tus talentos',
  6: 'las obligaciones diarias y tu salud',
  7: 'tus relaciones cercanas',
  8: 'la forma de afrontar los cambios repentinos',
  9: 'tus creencias y el rumbo de tu vida',
  10: 'tu trabajo y tu posición',
  11: 'el aumento de ingresos y las amistades',
  12: 'la forma en que descansas y sueltas',
};

const WORRIES: Record<number, Worry[]> = {
  1: [
    ['¿te cuesta confiar en ti?', 'te cuesta confiar en ti', 'volver a notar tus fortalezas, una a una.'],
    ['¿no sabes por dónde empezar?', 'no sabes por dónde empezar', 'elegir un primer paso pequeño.'],
    ['¿te agobia compararte con los demás?', 'te agobia compararte con los demás', 'recuperar tu propio ritmo.'],
    ['¿sientes que los días se te escapan?', 'sientes que los días se te escapan', 'recordar lo que de verdad quieres hacer.'],
    ['¿sigues con cansancio incluso después de descansar?', 'sigues con cansancio incluso después de descansar', 'poner tu salud en primer lugar.'],
  ],
  2: [
    ['¿te inquietan las preocupaciones por el dinero?', 'te inquietan las preocupaciones por el dinero', 'revisar qué te da de verdad seguridad.'],
    ['¿sientes que el dinero nunca se queda contigo?', 'sientes que el dinero nunca se queda contigo', 'repensar con calma cómo gastas.'],
    ['¿te cuesta poner en palabras lo que sientes?', 'te cuesta poner en palabras lo que sientes', 'practicar decir lo que de verdad sientes.'],
    ['¿te da miedo perder lo que tienes?', 'te da miedo perder lo que tienes', 'volver a elegir lo que de verdad te importa.'],
    ['¿te estás subestimando?', 'te subestimas', 'mirar con honestidad todo lo que sabes hacer.'],
  ],
  3: [
    ['¿te falta valor para dar el paso?', 'te falta valor para dar el paso', 'sumar pequeñas acciones, una tras otra.'],
    ['¿sientes que tus ideas no llegan a los demás?', 'sientes que tus ideas no llegan a los demás', 'probar con calma otra forma de expresarte.'],
    ['¿sientes que te esfuerzas pero no avanzas?', 'sientes que te esfuerzas pero no avanzas', 'reconocer todo lo que tu esfuerzo ya ha logrado.'],
    ['¿te contienes demasiado con la gente del trabajo?', 'te contienes demasiado con la gente del trabajo', 'compartir tus ideas sin pedir perdón.'],
    ['¿quieres empezar algo nuevo pero no te decides?', 'quieres empezar algo nuevo pero no te decides', 'permitirte simplemente probar.'],
  ],
  4: [
    ['¿te cuesta relajarte incluso en casa?', 'te cuesta relajarte incluso en casa', 'recuperar las rutinas que te calman.'],
    ['¿te cuesta abrirte con tu familia?', 'te cuesta abrirte con tu familia', 'reconstruir la confianza con las personas más cercanas.'],
    ['¿te arrastran tus altibajos?', 'te arrastran tus altibajos', 'crear días que mantengan estable tu ánimo.'],
    ['¿sientes que no tienes un lugar donde descansar de verdad?', 'sientes que no tienes un lugar donde descansar de verdad', 'cultivar un espacio de calma dentro de ti.'],
    ['¿los asuntos familiares no te dejan estar en paz?', 'los asuntos familiares no te dejan estar en paz', 'separar lo que puedes cambiar de lo que no.'],
  ],
  5: [
    ['¿te cuesta disfrutar de lo que te gusta?', 'te cuesta disfrutar de lo que te gusta', 'buscar de nuevo lo que de verdad te emociona.'],
    ['¿te gusta alguien pero dudas en dar el siguiente paso?', 'te gusta alguien pero dudas en dar el siguiente paso', 'aclarar qué tipo de relación quieres.'],
    ['¿dudas de tus propios talentos?', 'dudas de tus talentos', 'pulir una cosa que se te da bien.'],
    ['¿quieres un nuevo reto pero temes fracasar?', 'quieres un nuevo reto pero temes fracasar', 'probar en pequeño y ganar experiencia.'],
    ['¿conoces gente pero nada dura?', 'conoces gente pero nada dura', 'repensar qué tipo de vínculo disfrutas de verdad.'],
  ],
  6: [
    ['¿te agota cargar con todas las obligaciones sin ayuda?', 'te agota cargar con todas las obligaciones sin ayuda', 'elegir qué puedes delegar.'],
    ['¿te desgastan las relaciones en el trabajo?', 'te desgastan las relaciones en el trabajo', 'aprender la distancia que te protege.'],
    ['¿te cuesta decir que no y llenas demasiado tus días?', 'te cuesta decir que no y llenas demasiado tus días', 'repensar qué aceptas asumir.'],
    ['¿te sientes culpable cada vez que descansas?', 'te sientes culpable cada vez que descansas', 'ver el descanso como parte de tus obligaciones.'],
    ['¿sientes que el ritmo de cada día te persigue?', 'sientes que el ritmo de cada día te persigue', 'ajustar tus días a un ritmo que puedas mantener.'],
  ],
  7: [
    ['¿no sabes qué siente de verdad alguien cercano?', 'no sabes qué siente de verdad alguien cercano', 'escuchar a la otra persona hasta el final.'],
    ['¿cedes demasiado en tus relaciones?', 'cedes demasiado en tus relaciones', 'decir también lo que tú quieres.'],
    ['¿te cuesta dejar que la gente se acerque?', 'te cuesta dejar que la gente se acerque', 'estrechar poco a poco los lazos con las personas en quienes confías.'],
    ['¿pasa el tiempo sin que digas lo que de verdad sientes?', 'el tiempo pasa sin que digas lo que sientes', 'decir con calma lo que de verdad piensas.'],
    ['¿sientes que eres la única persona que se esfuerza?', 'sientes que eres la única persona que se esfuerza', 'repensar el apoyo mutuo en tus relaciones.'],
  ],
  8: [
    ['¿te inquieta la incertidumbre sobre el futuro?', 'te inquieta la incertidumbre sobre el futuro', 'centrarte en lo que puedes cambiar, no en lo que no.'],
    ['¿te da miedo apoyarte en los demás?', 'te da miedo apoyarte en los demás', 'dejar que alguien de confianza cargue con un poco.'],
    ['¿te cuesta aceptar los cambios a tu alrededor?', 'te cuesta aceptar los cambios a tu alrededor', 'soltar las viejas costumbres y reconstruir.'],
    ['¿te inquieta el dinero del futuro?', 'te inquieta el dinero del futuro', 'revisar con calma cuánto te has preparado.'],
    ['¿cargas con una preocupación que no puedes contar a nadie?', 'cargas con una preocupación que no puedes contar a nadie', 'mirar con suavidad lo que llevas en el fondo del corazón.'],
  ],
  9: [
    ['¿te preguntas si vas por el camino correcto?', 'te preguntas si vas por el camino correcto', 'confirmar los valores con los que quieres vivir.'],
    ['¿algo en lo que siempre creíste empieza a tambalearse?', 'sientes que algo en lo que creías se tambalea', 'volver a elegir aquello en lo que de verdad puedes creer.'],
    ['¿has perdido de vista por qué te esfuerzas tanto?', 'has perdido de vista por qué te esfuerzas tanto', 'aprender algo nuevo y reencontrar tu propósito.'],
    ['¿quieres aprender más pero no logras empezar?', 'quieres aprender más pero no logras empezar', 'empezar a aprender una cosa que te interese.'],
    ['¿sientes que no tienes a nadie a quien admirar?', 'sientes que no tienes a nadie a quien admirar', 'buscar ideas que de verdad puedas respetar.'],
  ],
  10: [
    ['¿sientes que nadie reconoce tu esfuerzo?', 'sientes que nadie reconoce tu esfuerzo', 'volver a construir tus logros con constancia.'],
    ['¿dudas de si tu trabajo actual es el adecuado?', 'dudas de si tu trabajo actual es el adecuado', 'repensar cómo quieres trabajar en los próximos años.'],
    ['¿tus responsabilidades crecen sin recompensa?', 'tus responsabilidades crecen sin recompensa', 'volver a elegir qué trabajo asumes.'],
    ['¿quieres cambiar de trabajo pero no te decides?', 'quieres cambiar de trabajo pero no te decides', 'confirmar de nuevo tus puntos fuertes.'],
    ['¿la gente del trabajo te pesa cada mañana?', 'la gente del trabajo te pesa cada mañana', 'volver a centrarte en tu propio papel.'],
  ],
  11: [
    ['¿sientes que tu esfuerzo no se refleja en tus ingresos?', 'sientes que tu esfuerzo no se refleja en tus ingresos', 'desarrollar una habilidad que te dé ingresos.'],
    ['¿sientes que no encajas entre tus amistades?', 'sientes que no encajas entre tus amistades', 'cuidar los lazos con quienes de verdad te entiendes.'],
    ['¿estás a punto de renunciar a tus deseos?', 'estás a punto de renunciar a tus deseos', 'dividir tus deseos en metas pequeñas.'],
    ['¿te sientes aparte cuando nadie te invita?', 'te sientes aparte cuando nadie te invita', 'dar tú el primer paso hacia alguien.'],
    ['¿sientes que no hay forma de aumentar tus ingresos?', 'sientes que no hay forma de aumentar tus ingresos', 'buscar oportunidades a través de la gente que conoces.'],
  ],
  12: [
    ['¿sigues con cansancio aunque duermas?', 'sigues con cansancio aunque duermas', 'tomarte tiempo de verdad para descansar a solas.'],
    ['¿te sientes culpable por querer tiempo para ti?', 'te sientes culpable por querer tiempo para ti', 'usar el tiempo a solas para recuperarte.'],
    ['¿hay algo que quieres soltar pero no puedes?', 'hay algo que quieres soltar y no puedes', 'aligerar lo que cargas, una cosa a la vez.'],
    ['¿sientes que tus gastos no paran de acumularse?', 'sientes que tus gastos no paran de acumularse', 'volver a elegir lo que de verdad necesitas.'],
    ['¿sientes un cansancio profundo que no se va?', 'sientes un cansancio profundo que no se va', 'permitirte no hacer nada durante un rato.'],
  ],
};

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "de" + "el …" contracts to "del …". */
const de = (text: string) => (text.startsWith('el ') ? `del ${text.slice(3)}` : `de ${text}`);

export const ES: LanguagePack = {
  worries: WORRIES,
  field: FIELD,
  write({ moon, chosen, house, period, day, worry: [hook, reason, use] }) {
    const planet = PLANET[chosen.planet];
    const field = FIELD[house];
    const from = `desde el signo lunar ${SIGN[moon]}`;
    const lead = `En astrología védica, ${period},`;
    let opening: string;
    let cause: string;
    if (chosen.ingress && day) {
      opening = `${lead} ${planet} entra en ${SIGN[chosen.ingress.sign]}, tu casa ${house} ${from}, el ${day.date} de ${MONTHS[day.month]}.`;
      cause = `entra en el ámbito ${de(field)}`;
    } else if (chosen.retrograde && !isNode(chosen.planet)) {
      opening = `${lead} ${planet} está retrógrado en ${SIGN[chosen.sign]}, tu casa ${chosen.house} ${from}.`;
      cause = `está retrógrado y te invita a replantear ${field}`;
    } else {
      opening = `${lead} ${planet} está en ${SIGN[chosen.sign]}, tu casa ${chosen.house} ${from}.`;
      cause =
        chosen.planet === 'Rahu'
          ? `intensifica tu atención en ${field}`
          : chosen.planet === 'Ketu'
            ? `aleja tu corazón ${de(field)}`
            : `actúa con fuerza sobre ${field}`;
    }
    return {
      hook: `Luna en ${SIGN[moon]}, ${hook}`,
      body: `${opening} Si ${reason}, es porque ${NATURE[chosen.planet]} ${cause}. Es buen momento para ${use}`,
    };
  },
};

