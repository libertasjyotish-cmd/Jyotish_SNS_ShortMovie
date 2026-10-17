/** Portuguese weekly reading (Brazil, você). Same worry order as `JA_WORRIES`; written by hand. */
import type { Sign } from '@/lib/placements';
import { isNode, LanguagePack, Worry } from '@/lib/weekly-template-pack';

const SIGN: Record<Sign, string> = {
  Aries: 'Áries', Taurus: 'Touro', Gemini: 'Gêmeos', Cancer: 'Câncer', Leo: 'Leão', Virgo: 'Virgem',
  Libra: 'Libra', Scorpio: 'Escorpião', Sagittarius: 'Sagitário', Capricorn: 'Capricórnio',
  Aquarius: 'Aquário', Pisces: 'Peixes',
};

const PLANET: Record<string, string> = {
  Sun: 'o Sol', Mars: 'Marte', Mercury: 'Mercúrio', Jupiter: 'Júpiter', Venus: 'Vênus',
  Saturn: 'Saturno', Rahu: 'Rahu', Ketu: 'Ketu',
};

const NATURE: Record<string, string> = {
  Sun: 'o Sol, planeta da expressão pessoal,',
  Mars: 'Marte, planeta do impulso e da ação,',
  Mercury: 'Mercúrio, planeta do pensamento e da fala,',
  Jupiter: 'Júpiter, planeta do crescimento,',
  Venus: 'Vênus, planeta do amor e do bem-estar,',
  Saturn: 'Saturno, planeta do dever e da paciência,',
  Rahu: 'Rahu, que amplia o desejo,',
  Ketu: 'Ketu, que afrouxa o apego,',
};

const FIELD: Record<number, string> = {
  1: 'a forma como você se vê',
  2: 'o dinheiro, as palavras e o que você valoriza',
  3: 'a comunicação do dia a dia e a sua vontade de agir',
  4: 'o lar e a paz interior',
  5: 'o amor, a alegria e os seus talentos',
  6: 'as obrigações diárias e a sua saúde',
  7: 'os seus relacionamentos próximos',
  8: 'a forma de lidar com mudanças repentinas',
  9: 'as suas crenças e o rumo da sua vida',
  10: 'o seu trabalho e a sua posição',
  11: 'o aumento da renda e as amizades',
  12: 'o seu descanso e o desapego',
};

/** The reason clause is the hook without its question mark unless given. */
const w = (hook: string, use: string, reason?: string): Worry => [hook, reason ?? hook.replace(/\?$/, ''), use];

const WORRIES: Record<number, Worry[]> = {
  1: [
    w('você tem dificuldade de confiar em si?', 'perceber de novo os seus pontos fortes, um a um.'),
    w('você não sabe por onde começar?', 'escolher um primeiro passo pequeno.'),
    w('você se angustia ao se comparar com os outros?', 'reencontrar o seu próprio ritmo.'),
    w('você sente que os dias passam sem você perceber?', 'lembrar o que você realmente quer fazer.'),
    w('o cansaço continua mesmo depois de descansar?', 'colocar a sua saúde em primeiro lugar.', 'o cansaço continua mesmo depois de você descansar'),
  ],
  2: [
    w('as preocupações com dinheiro não saem da sua cabeça?', 'rever o que realmente lhe dá segurança.'),
    w('você sente que o dinheiro nunca fica com você?', 'repensar com calma como você gasta.'),
    w('é difícil colocar em palavras o que você sente?', 'praticar dizer o que você realmente sente.'),
    w('você tem medo de perder o que tem?', 'escolher de novo o que realmente importa para você.'),
    w('você está se subestimando?', 'olhar com honestidade para tudo o que você sabe fazer.', 'você se subestima'),
  ],
  3: [
    w('falta coragem para dar o primeiro passo?', 'somar pequenas ações, uma de cada vez.'),
    w('você sente que as suas ideias não chegam aos outros?', 'testar com calma outra forma de se expressar.'),
    w('você sente que se esforça, mas não sai do lugar?', 'reconhecer até onde o seu esforço já levou você.'),
    w('você se contém demais com as pessoas do trabalho?', 'compartilhar as suas ideias sem pedir desculpas.'),
    w('você quer começar algo novo, mas não se decide?', 'se permitir simplesmente tentar.'),
  ],
  4: [
    w('é difícil relaxar até em casa?', 'retomar as rotinas que acalmam você.'),
    w('é difícil se abrir com a sua família?', 'reconstruir a confiança com as pessoas mais próximas.'),
    w('os seus altos e baixos deixam você sem chão?', 'criar dias que mantenham o seu ânimo estável.'),
    w('você sente que não tem onde descansar de verdade?', 'cultivar um espaço de calma dentro de você.'),
    w('os assuntos de família não deixam você em paz?', 'separar o que você pode mudar do que não pode.'),
  ],
  5: [
    w('é difícil curtir as coisas que você ama?', 'procurar de novo o que realmente emociona você.'),
    w('você gosta de alguém, mas hesita em dar o próximo passo?', 'deixar claro o tipo de relação que você quer.'),
    w('você duvida dos seus próprios talentos?', 'aprimorar uma coisa que você faz bem.', 'você duvida dos seus talentos'),
    w('você quer um novo desafio, mas tem medo de falhar?', 'testar em pequena escala e ganhar experiência.'),
    w('você conhece pessoas, mas nada dura?', 'repensar o tipo de vínculo que você realmente aprecia.'),
  ],
  6: [
    w('você se esgota carregando todas as obrigações sem ajuda?', 'escolher o que você pode delegar.'),
    w('as relações no trabalho estão desgastando você?', 'aprender a distância que protege você.', 'as relações no trabalho desgastam você'),
    w('é difícil dizer não e os seus dias ficam lotados?', 'repensar o que você aceita assumir.'),
    w('bate culpa toda vez que você descansa?', 'ver o descanso como parte das suas obrigações.'),
    w('você sente que a correria de cada dia persegue você?', 'ajustar os seus dias a um ritmo que você consiga manter.'),
  ],
  7: [
    w('você não sabe o que alguém próximo realmente sente?', 'ouvir a outra pessoa até o fim.'),
    w('você cede demais nos seus relacionamentos?', 'dizer também o que você quer.'),
    w('é difícil deixar as pessoas se aproximarem?', 'aprofundar aos poucos os laços com quem você confia.'),
    w('o tempo passa sem você dizer o que realmente sente?', 'dizer com calma o que você realmente pensa.', 'o tempo passa sem você dizer o que sente'),
    w('você sente que é a única pessoa que se esforça?', 'repensar o apoio mútuo nos seus relacionamentos.'),
  ],
  8: [
    w('a incerteza sobre o futuro não sai da sua cabeça?', 'focar no que você pode mudar, não no que não pode.'),
    w('você tem medo de contar com os outros?', 'deixar alguém de confiança assumir um pouco.'),
    w('é difícil aceitar as mudanças ao seu redor?', 'deixar os velhos hábitos e recomeçar.'),
    w('o dinheiro do futuro preocupa você?', 'rever com calma a sua preparação.'),
    w('você carrega uma preocupação que não pode contar a ninguém?', 'olhar com delicadeza para o que está no fundo do seu coração.'),
  ],
  9: [
    w('você se pergunta se está no caminho certo?', 'confirmar os valores com que você quer viver.'),
    w('algo em que você sempre acreditou começa a balançar?', 'escolher de novo aquilo em que você realmente pode acreditar.', 'algo em que você acreditava começa a balançar'),
    w('você perdeu de vista por que se esforça tanto?', 'aprender algo novo e reencontrar o seu propósito.'),
    w('você quer aprender mais, mas não consegue começar?', 'começar a aprender uma coisa que interesse a você.'),
    w('você sente que não tem ninguém para admirar?', 'buscar ideias que você possa respeitar de verdade.'),
  ],
  10: [
    w('você sente que ninguém reconhece o seu esforço?', 'voltar a construir os seus resultados com constância.'),
    w('você duvida se o seu trabalho atual é o certo?', 'repensar como você quer trabalhar nos próximos anos.'),
    w('as suas responsabilidades crescem sem recompensa?', 'escolher de novo que trabalho você assume.'),
    w('você quer mudar de emprego, mas não se decide?', 'confirmar de novo os seus pontos fortes.'),
    w('as pessoas do trabalho deixam as suas manhãs pesadas?', 'voltar a focar no seu próprio papel.'),
  ],
  11: [
    w('você sente que o seu esforço não aparece na sua renda?', 'desenvolver uma habilidade que gere renda.'),
    w('você sente que não se encaixa entre os seus amigos?', 'cuidar dos laços com quem realmente entende você.'),
    w('você está perto de desistir dos seus desejos?', 'dividir os seus desejos em metas pequenas.'),
    w('você se sente de fora quando ninguém convida você?', 'procurar alguém primeiro.'),
    w('você sente que não há como aumentar a sua renda?', 'buscar oportunidades por meio das pessoas que você conhece.'),
  ],
  12: [
    w('o cansaço continua mesmo depois de dormir?', 'reservar um tempo só seu para descansar de verdade.', 'o cansaço continua mesmo depois de você dormir'),
    w('bate culpa por querer um tempo só para você?', 'usar o tempo a sós para se recuperar.'),
    w('tem algo que você quer largar, mas não consegue?', 'aliviar o que você carrega, uma coisa de cada vez.'),
    w('você sente que os seus gastos não param de se acumular?', 'escolher de novo do que você realmente precisa.'),
    w('você sente um cansaço profundo que não passa?', 'se permitir não fazer nada por um tempo.'),
  ],
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "de"/"em" + article contract: do, da, dos, das / no, na, nos, nas. */
function contract(prep: 'de' | 'em', text: string): string {
  const match = /^(o|a|os|as) /.exec(text);
  if (!match) return `${prep} ${text}`;
  return `${prep === 'de' ? 'd' : 'n'}${match[1]} ${text.slice(match[0].length)}`;
}

export const PT: LanguagePack = {
  worries: WORRIES,
  field: FIELD,
  write({ moon, chosen, house, period, day, worry: [hook, reason, use] }) {
    const planet = PLANET[chosen.planet];
    const field = FIELD[house];
    const from = `do signo lunar ${SIGN[moon]}`;
    const lead = `Na astrologia védica, ${period},`;
    let opening: string;
    let cause: string;
    if (chosen.ingress && day) {
      opening = `${lead} ${planet} entra em ${SIGN[chosen.ingress.sign]}, a sua casa ${house} ${from}, em ${day.date} de ${MONTHS[day.month]}.`;
      cause = `entra no campo ${contract('de', field)}`;
    } else if (chosen.retrograde && !isNode(chosen.planet)) {
      opening = `${lead} ${planet} está retrógrado em ${SIGN[chosen.sign]}, a sua casa ${chosen.house} ${from}.`;
      cause = `está retrógrado e convida você a repensar ${field}`;
    } else {
      opening = `${lead} ${planet} está em ${SIGN[chosen.sign]}, a sua casa ${chosen.house} ${from}.`;
      cause =
        chosen.planet === 'Rahu'
          ? `intensifica a sua atenção ${contract('em', field)}`
          : chosen.planet === 'Ketu'
            ? `afasta o seu coração ${contract('de', field)}`
            : `atua com força sobre ${field}`;
    }
    return {
      hook: `Lua em ${SIGN[moon]}, ${hook}`,
      body: `${opening} Se ${reason}, é porque ${NATURE[chosen.planet]} ${cause}. É hora de ${use}`,
    };
  },
};
