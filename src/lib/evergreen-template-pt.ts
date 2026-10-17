/** Portuguese Mon–Wed per-sign evergreen scripts: same structure and chart reasoning as the ja/en sets. */
import { SIGNS, Sign, asSign } from '@/lib/placements';
import type { SignThemeSeries } from '@/lib/sign-themes';
import { EvergreenTemplate, RULER, signFrom } from '@/lib/evergreen-template';
import { zodiacName } from '@/lib/zodiac-names';

const sign = (s: Sign) => zodiacName(s.toLowerCase(), 'pt') ?? s;
const PLANET: Record<string, string> = {
  Sun: 'o Sol', Moon: 'a Lua', Mars: 'Marte', Mercury: 'Mercúrio', Jupiter: 'Júpiter', Venus: 'Vênus', Saturn: 'Saturno',
};
type L3 = [string, string, string];

const WORK: Record<Sign, L3> = {
  Capricorn: ['você se culpa quando os resultados no trabalho demoram?', 'construir uma confiança sólida com o tempo', 'organizações duradouras ou cargos de real responsabilidade'],
  Aquarius: ['sente que não combina com os colegas de trabalho?', 'ver o todo e encontrar novos métodos', 'tecnologia, pesquisa ou criação de sistemas'],
  Pisces: ['cansa ser julgado só pelos números?', 'apoiar as pessoas e aliviar o peso delas', 'ensino, orientação ou atendimento a pessoas'],
  Aries: ['você segura a sua força para não incomodar ninguém?', 'decidir por conta própria e agir primeiro', 'lançar projetos novos ou liderar na frente'],
  Taurus: ['cansa estar sempre no centro das atenções?', 'reconhecer a qualidade e torná-la duradoura', 'gastronomia, design ou trabalho com valor real'],
  Gemini: ['sufoca fazer a mesma tarefa todo dia?', 'reunir informações e explicá-las com clareza', 'escrita, vendas ou conectar pessoas'],
  Cancer: ['passa o dia atento ao humor dos outros?', 'sentir o que os outros sentem e acalmá-los', 'hotelaria ou atendimento a pessoas'],
  Leo: ['sente-se pouco valorizado trabalhando nos bastidores?', 'ir para a frente e assumir a responsabilidade', 'liderar uma equipe ou trabalhar com o próprio nome'],
  Virgo: ['pesa a distância entre os seus ideais e o trabalho diário?', 'aprimorar cada detalhe com precisão', 'análise ou controle de qualidade'],
  Libra: ['você se esforça demais sozinho no trabalho?', 'mediar entre pessoas e manter o equilíbrio', 'negociação ou trabalho que une pessoas'],
  Scorpio: ['um trabalho superficial deixa você vazio?', 'ir fundo em uma única coisa', 'pesquisa ou análise aprofundada'],
  Sagittarius: ['é difícil encontrar sentido no seu trabalho?', 'mostrar um propósito maior e guiar os outros', 'educação, direito ou trabalho internacional'],
};
const COMPAT: Record<Sign, L3> = {
  Aries: ['você é sempre quem vai na frente nas relações?', 'tem o impulso de Marte e vai direto', 'pessoas a quem você pode dizer o que pensa'],
  Taurus: ['cansam você as pessoas que mudam de ideia o tempo todo?', 'tem a calma de Vênus e valoriza o que dura', 'pessoas que constroem a confiança devagar'],
  Gemini: ['cansa estar com quem não dá para conversar de verdade?', 'tem a leveza de Mercúrio e se conecta pelas palavras', 'pessoas que acompanham o seu ritmo na conversa'],
  Cancer: ['está exausto de estar sempre atento aos outros?', 'tem a ternura da Lua e quer proteger', 'pessoas com quem você pode ser você mesmo'],
  Leo: ['você se perde por sempre se adaptar aos outros?', 'tem o calor do Sol e ilumina os outros', 'pessoas que ficam felizes ao ver você brilhar'],
  Virgo: ['cansa reparar em cada pequeno detalhe?', 'tem a atenção de Mercúrio e quer ser útil', 'pessoas que agradecem a sua atenção'],
  Libra: ['esconde o que sente para evitar atritos?', 'tem a harmonia de Vênus e valoriza o equilíbrio', 'pessoas que recebem a sua sinceridade com calma'],
  Scorpio: ['amizades superficiais deixam você querendo mais?', 'guarda a força de Marte por dentro e busca laços profundos', 'pessoas com quem você pode ser sincero por anos'],
  Sagittarius: ['sente que as relações viram uma prisão?', 'tem a generosidade de Júpiter e quer explorar', 'pessoas que respeitam a liberdade do outro'],
  Capricorn: ['sente-se sozinho porque nunca mostra fraqueza?', 'tem a integridade de Saturno e assume responsabilidades', 'pessoas que aceitam também o seu lado frágil'],
  Aquarius: ['sente-se o estranho do grupo?', 'tem a clareza de Saturno e vê todos como iguais', 'pessoas que gostam das diferenças entre vocês'],
  Pisces: ['cansa carregar os sentimentos dos outros?', 'tem a compaixão de Júpiter e sente a dor alheia', 'pessoas que retribuem a sua bondade'],
};
const LOVE: Record<Sign, L3> = {
  Aries: ['no amor, você espera e nunca dá o primeiro passo?', 'dizer o que sente e ir direto', 'um par que ame a sua sinceridade'],
  Taurus: ['você pensa demais no amor?', 'deixar o amor crescer devagar e com conforto', 'um par com quem você se sinta em paz'],
  Gemini: ['fica inquieto quando você e seu par param de conversar?', 'compartilhar palavras e risadas', 'um par com quem falar de tudo'],
  Cancer: ['você banca o forte e não consegue se apoiar no seu par?', 'criar um laço caloroso em que um protege o outro', 'um par com quem você possa ser você'],
  Leo: ['no amor, você é sempre quem cede?', 'sentir-se amado e mostrar o seu amor abertamente', 'um par que se orgulhe de você'],
  Virgo: ['você dá muito ao seu par e sente que não é notado?', 'apoiar o seu par com gestos discretos', 'um par que perceba os pequenos detalhes'],
  Libra: ['você evita qualquer desacordo com o seu par?', 'construir uma relação elegante de respeito mútuo', 'um par que trate você de igual para igual'],
  Scorpio: ['o amor passageiro deixa você vazio?', 'se unir profundamente a uma só pessoa', 'um par que aceite o que você realmente sente'],
  Sagittarius: ['sente-se preso quando o seu par segura demais?', 'aprender e ampliar o mundo de vocês juntos', 'um par que apoie a sua liberdade e os seus sonhos'],
  Capricorn: ['é tão prudente no amor que as chances escapam?', 'construir com o tempo um amor de confiança', 'um par que cumpra as promessas'],
  Aquarius: ['o romance convencional entedia você?', 'conversar com liberdade, como melhores amigos', 'um par que goste do seu jeito de ser'],
  Pisces: ['no amor, você se entrega demais?', 'se conectar de coração para coração, além das palavras', 'um par que retribua a sua bondade'],
};
const MONEY: Record<Sign, L3> = {
  Aries: ['quer poupar, mas gasta logo?', 'agir com decisão e ganhar por conta própria', 'um trabalho em que você abre o próprio caminho'],
  Taurus: ['abre mão do que gosta por medo de faltar dinheiro?', 'reconhecer a qualidade e fazer o valor crescer', 'um trabalho com coisas de qualidade'],
  Gemini: ['fica inquieto por ter uma única renda?', 'usar a informação para ganhar por vários caminhos', 'um trabalho que aproveita o conhecimento e as palavras'],
  Cancer: ['gasta dinheiro demais com os outros?', 'proteger a vida de quem você ama', 'um trabalho que sustenta o dia a dia das pessoas'],
  Leo: ['gasta dinheiro só para manter as aparências?', 'transformar o seu nome e a sua reputação em renda', 'um trabalho em que você dá a cara'],
  Virgo: ['corta gastos e mesmo assim não consegue poupar?', 'controlar as contas com precisão e evitar desperdício', 'um trabalho com números'],
  Libra: ['é difícil dizer não quando há dinheiro envolvido?', 'ganhar graças à confiança com os outros', 'trabalhar em parceria com outras pessoas'],
  Scorpio: ['guarda para si as preocupações com dinheiro?', 'ler para onde o dinheiro flui e fazê-lo crescer', 'formas de ganhar que crescem com o tempo'],
  Sagittarius: ['está cansado de pensar sempre em dinheiro?', 'transformar o que aprendeu e viveu em riqueza', 'um trabalho que aproveita o que você aprendeu'],
  Capricorn: ['angustia ver o dinheiro crescer tão devagar?', 'construir passo a passo um patrimônio sólido', 'um trabalho que você mantém por anos'],
  Aquarius: ['as formas comuns de ganhar dinheiro não combinam com você?', 'ganhar com sistemas e ideias novas', 'trabalho on-line ou novas tecnologias'],
  Pisces: ['dá tanto que não sobra nada para você?', 'ajudar as pessoas e transformar essa confiança em fartura', 'um trabalho que ajuda as pessoas'],
};
const FAMILY: Record<Sign, L3> = {
  Aries: ['você bate de frente com a família com frequência?', 'proteger a sua família com as próprias mãos', 'um lar onde todos possam dizer o que pensam'],
  Taurus: ['nem em casa você consegue descansar?', 'cultivar uma vida tranquila e agradável', 'um lar sem pressa'],
  Gemini: ['sente que nunca conversa de verdade com a família?', 'se unir à família pelas palavras', 'uma mesa onde se possa falar de tudo'],
  Cancer: ['está exausto de se preocupar com a família?', 'envolver a família em carinho e protegê-la', 'um lar onde também cuidem de você'],
  Leo: ['sente que a sua família não valoriza você?', 'estar no centro e animar todos', 'uma família que reconhece o esforço de cada um'],
  Virgo: ['carrega sozinho as tarefas da casa?', 'tratar cada detalhe da vida em família', 'uma família que divide o peso'],
  Libra: ['você é sempre quem faz as pazes na família?', 'manter a família em equilíbrio e harmonia', 'um lar onde todos cedem um pouco'],
  Scorpio: ['não consegue ser sincero nem com a família?', 'se unir profundamente aos seus', 'uma família que aceita o que cada um sente'],
  Sagittarius: ['os valores da sua família batem com os seus?', 'compartilhar o jeito de viver em que você acredita', 'um lar que respeita o caminho de cada um'],
  Capricorn: ['carrega sozinho os fardos da família?', 'cumprir o seu dever com a família', 'uma família em que todos se apoiam'],
  Aquarius: ['sente-se o diferente da família?', 'aceitar cada pessoa da família como ela é', 'um lar que respeita a opinião de todos'],
  Pisces: ['deixa você sempre por último pela família?', 'acompanhar a dor da família e ampará-la', 'uma família que retribui a sua bondade'],
};
const REST: Record<Sign, L3> = {
  Aries: ['mesmo deitado para descansar, continua cansado?', 'mexer o corpo descansa você mais do que ficar parado', 'um momento para suar'],
  Taurus: ['a pressa constante cansou também a sua mente?', 'estar cercado de coisas agradáveis ajuda você a relaxar', 'um momento para curtir a música ou os aromas de que gosta'],
  Gemini: ['a sua mente corre tanto que você não consegue dormir?', 'colocar os pensamentos em palavras alivia você', 'um momento para conversar com alguém'],
  Cancer: ['está exausto de cuidar de todos?', 'um lugar onde você se sente seguro recarrega você', 'um lugar onde cuidem de você'],
  Leo: ['está prestes a se esgotar de tanto se esforçar?', 'o tempo em que ninguém olha para você recarrega você', 'um momento sozinho, fora de serviço'],
  Virgo: ['até nas folgas você pensa nas tarefas?', 'um ambiente arrumado acalma a sua mente', 'um espaço tranquilo e arrumado'],
  Libra: ['cansa estar sempre atento aos outros?', 'o que é belo devolve o seu equilíbrio', 'um momento para contemplar uma paisagem de que gosta'],
  Scorpio: ['esconde o cansaço de todos?', 'dormir profundamente e sozinho é a sua forma de se recuperar', 'um sono que ninguém interrompa'],
  Sagittarius: ['a mesma rotina desgasta você?', 'lugares e ideias novas abrem a sua mente', 'um passeio a um lugar desconhecido'],
  Capricorn: ['sente culpa por descansar?', 'descansar em horário fixo dá estabilidade a você', 'um horário fixo de descanso todo dia'],
  Aquarius: ['cansa simplesmente estar cercado de gente?', 'se afastar no seu próprio ritmo recupera você', 'um momento no seu próprio ritmo'],
  Pisces: ['cansa absorver os sentimentos de todos?', 'a música e a água limpam a sua mente', 'um momento para ouvir uma música tranquila'],
};
const IMPRESSION: Record<Sign, L3> = {
  Aries: ['acham que você é intimidador?', 'o seu jeito de agir sem hesitar parece forte', 'papéis em que você lidera na frente'],
  Taurus: ['acham que você é lento?', 'a sua presença tranquila parece vagarosa', 'relações de longo prazo'],
  Gemini: ['acham que você não leva nada a sério?', 'a sua rapidez ao falar e a sua leveza parecem descuidadas', 'papéis que conectam pessoas'],
  Cancer: ['acham que você muda de humor fácil?', 'cada emoção aparece no seu rosto', 'momentos de amparar os outros'],
  Leo: ['acham que você é arrogante?', 'a sua presença confiante parece altiva', 'papéis que reúnem as pessoas'],
  Virgo: ['acham que você é rígido e exigente?', 'o seu olhar para os detalhes parece severo', 'trabalhos de pôr ordem'],
  Libra: ['acham que você quer agradar a todos?', 'ser gentil com todos parece isso', 'papéis de mediador'],
  Scorpio: ['dizem que não sabem o que você pensa?', 'guardar o seu interior para si parece misterioso', 'papéis em que confiam a você o que importa'],
  Sagittarius: ['acham que você é desatento?', 'olhar sempre o quadro geral parece descuido', 'papéis em que você guia os outros'],
  Capricorn: ['acham que você é frio?', 'pôr o dever antes dos sentimentos parece rígido', 'trabalhos importantes confiados a você'],
  Aquarius: ['acham que você é meio estranho?', 'pensar por conta própria parece esquisito', 'momentos que pedem ideias novas'],
  Pisces: ['acham que não dá para contar com você?', 'uma bondade que nunca culpa ninguém parece fraca', 'momentos de consolar os outros'],
};
const AVOID: Record<Sign, L3> = {
  Aries: ['um trabalho cheio de discussões desgasta você?', 'a raiva e a competição esgotam você', 'um lugar onde se conversa com calma'],
  Taurus: ['um ambiente caótico deixa você tenso?', 'as mudanças constantes de última hora abalam você', 'um lugar com uma rotina estável'],
  Gemini: ['está cansado de mensagens e conversas sem fim?', 'palavras demais não deixam a sua mente descansar', 'um lugar tranquilo para se concentrar'],
  Cancer: ['sente-se sozinho num ambiente frio?', 'um lugar sem compreensão aperta o seu coração', 'um lugar onde as pessoas se cuidam'],
  Leo: ['cansa um lugar que nunca reconhece o seu esforço?', 'ser tratado como alguém sem importância desgasta a sua confiança', 'um lugar que dá a você responsabilidade real'],
  Virgo: ['esgota você um lugar bagunçado e descuidado?', 'a bagunça e o desleixo deixam você tenso', 'um lugar onde as coisas são bem feitas'],
  Libra: ['está cansado de ficar entre pessoas que brigam?', 'o tratamento injusto tira o seu equilíbrio', 'um lugar onde todos são tratados com justiça'],
  Scorpio: ['cansa um lugar cheio de jogos e politicagem?', 'relações sem sinceridade deixam você tenso', 'um lugar sem nada escondido'],
  Sagittarius: ['regras sem sentido sufocam você?', 'normas sem propósito apagam você', 'um lugar que confia no seu julgamento'],
  Capricorn: ['esgota você um trabalho que nunca termina?', 'a responsabilidade acumulada pesa no seu coração', 'um lugar com funções claras e pausas de verdade'],
  Aquarius: ['sente-se preso quando impõem costumes antigos?', 'um lugar que resiste à mudança trava você', 'um lugar onde testar ideias novas'],
  Pisces: ['cansa carregar os problemas de todos?', 'depender de você sem limite desgasta você', 'um lugar onde você possa proteger o seu tempo'],
};
const TURNING: Record<Sign, L3> = {
  Aries: ['está a ponto de querer largar tudo?', 'de repente, depois de um choque ou ao chegar ao seu limite', 'antes de largar no impulso, você decide um próximo passo'],
  Taurus: ['assustam você as mudanças na renda ou na casa?', 'devagar, como uma mudança de dinheiro ou de moradia', 'você escolhe uma parte da vida para manter e solta o resto'],
  Gemini: ['algo que contaram a você não sai da sua cabeça?', 'por uma apresentação ou uma conversa casual', 'você marca um encontro na mesma semana para saber mais'],
  Cancer: ['hesita em mudar de vida por causa da família?', 'por circunstâncias familiares ou uma mudança de casa', 'você dá aos seus desejos o mesmo peso que à família'],
  Leo: ['o seu cargo atual ficou pequeno?', 'como uma promoção ou um pedido para dar a cara', 'você aceita esse papel ao menos uma vez, mesmo com dúvida'],
  Virgo: ['sente que a sua saúde ou a sua agenda não se sustentam?', 'como uma mudança na sua saúde', 'você para de aguentar e muda o seu ritmo'],
  Libra: ['um casamento ou um término está abalando a sua vida?', 'como uma mudança numa relação próxima', 'você escolhe pelo jeito como quer viver, não pelo que agrada ao outro'],
  Scorpio: ['carrega uma preocupação que não pode contar?', 'quando um problema escondido vem à tona', 'você conta a alguém de confiança em vez de carregar sozinho'],
  Sagittarius: ['sente vontade de voltar a estudar ou ir para o exterior?', 'por novos estudos ou um lugar distante', 'você visita uma vez o curso ou o lugar que interessa a você'],
  Capricorn: ['hesita em deixar um trabalho que faz há anos?', 'quando algo que você faz há anos chega ao fim', 'você leva tudo o que construiu para o próximo lugar'],
  Aquarius: ['pensa em trabalhar fora de uma empresa?', 'ao sair de uma organização ou começar algo com outros', 'você procura pessoas que pensam como você'],
  Pisces: ['um pressentimento que não sabe explicar inquieta você?', 'como uma intuição inexplicável ou um encontro casual', 'você não descarta a intuição e a testa em pequena escala'],
};
const HABIT: Record<Sign, [string, string, string, string]> = {
  Aries: ['você responde sempre na hora?', 'você age antes de decidir', 'Deixe as respostas importantes para o dia seguinte', 'vai se arrepender muito menos'],
  Taurus: ['você se agarra a coisas e pessoas que já não combinam?', 'você continua protegendo o que já tem', 'Solte uma coisa que nunca usa', 'vai sentir que respira melhor'],
  Gemini: ['olha o celular até a hora de dormir?', 'você está sempre atrás de informação nova', 'Largue a tela uma hora antes de deitar', 'o barulho na sua cabeça vai se acalmar'],
  Cancer: ['o humor dos outros sempre preocupa você?', 'você vive os sentimentos alheios como seus', 'Pare de tentar consertar o humor de todos', 'os seus próprios sentimentos vão voltar'],
  Leo: ['segue em frente sozinho sem nunca reclamar?', 'você quer ser aquele em quem todos se apoiam', 'Peça ajuda com uma única coisa', 'vai tirar um peso dos ombros'],
  Virgo: ['revisa várias vezes o que já está pronto?', 'cada pequeno erro incomoda você', 'Revise uma vez e pare', 'vai sobrar tempo e energia'],
  Libra: ['diz sim quando na verdade quer dizer não?', 'você tenta não estragar o clima', 'Diga um não claro uma única vez', 'lidar com as pessoas vai ficar mais fácil'],
  Scorpio: ['fica remoendo algo que disseram a você?', 'as feridas ficam gravadas fundo em você', 'Conte a alguém de confiança', 'o aperto no peito vai afrouxar'],
  Sagittarius: ['enche demais a sua agenda?', 'você se joga em tudo o que parece divertido', 'Tire um compromisso', 'vai aproveitar de verdade cada um'],
  Capricorn: ['pensa no trabalho até nas folgas?', 'você sempre põe a responsabilidade em primeiro lugar', 'Não olhe mensagens de trabalho nas folgas', 'vai notar a diferença na semana seguinte'],
  Aquarius: ['decide tudo sozinho sem se apoiar em ninguém?', 'você não quer abrir mão do seu jeito', 'Siga a ideia de outra pessoa uma única vez', 'um caminho inesperado vai se abrir'],
  Pisces: ['é impossível para você dizer não?', 'você não consegue ignorar quem precisa', 'Não responda na hora, tome tempo para pensar', 'vai proteger o seu próprio tempo'],
};
const NATURE: Record<Sign, L3> = {
  Aries: ['está cansado de sempre se adaptar aos outros?', 'abrir o seu próprio caminho com os próprios pés', 'enfrentando um desafio que você mesmo escolheu'],
  Taurus: ['angustia você a velocidade dos outros?', 'fazer crescer algo sólido com o tempo', 'perseverando com paciência em uma só coisa'],
  Gemini: ['você se critica por saber um pouco de tudo?', 'aprender e passar adiante', 'contando a alguém o que aprendeu'],
  Cancer: ['você se deixa sempre em último lugar?', 'que as pessoas que você ama se sintam seguras', 'passando um momento tranquilo com os seus'],
  Leo: ['recua quando é hora de se destacar?', 'viver de um jeito de que possa se orgulhar', 'dizendo o que pensa com segurança'],
  Virgo: ['é difícil enxergar as suas próprias qualidades?', 'dar o seu melhor de um jeito que ajude', 'resolvendo com facilidade o problema de alguém'],
  Libra: ['preocupa você não ter opinião própria?', 'criar harmonia entre as pessoas', 'aproximando pessoas que não se entendem'],
  Scorpio: ['pensa demais em tudo?', 'a verdade que existe sob a superfície', 'indo até o fundo de uma só coisa'],
  Sagittarius: ['sente que falta algo no seu jeito de viver?', 'aprender sempre e ampliar o seu olhar', 'explorando ideias ou lugares novos'],
  Capricorn: ['acha que é sério demais?', 'cumprir as suas responsabilidades a longo prazo', 'avançando passo a passo para uma meta que você traçou'],
  Aquarius: ['sente que não se conecta com quem está por perto?', 'pensar fora dos moldes para criar formas novas', 'testando as coisas do seu jeito'],
  Pisces: ['preocupa você sentir demais a dor alheia?', 'perceber a dor escondida e acompanhá-la', 'ouvindo alguém em silêncio'],
};
const SUN_TRAIT: Record<Sign, string> = {
  Aries: 'apaixonado e cheio de ação', Taurus: 'calmo e constante', Gemini: 'espirituoso e sociável',
  Cancer: 'caseiro e muito afetuoso', Leo: 'brilhante e líder nato', Virgo: 'meticuloso e perfeccionista',
  Libra: 'charmoso e elegante', Scorpio: 'intenso e reservado', Sagittarius: 'livre e otimista',
  Capricorn: 'sério e trabalhador', Aquarius: 'original e fora do comum', Pisces: 'doce e sonhador',
};

const P = (s: Sign) => PLANET[RULER[s]];
const VA = 'Na astrologia védica,';
const hk = (m: Sign, h: string) => `Lua em ${sign(m)}, ${h}`;

const SERIES: Record<SignThemeSeries, (m: Sign) => EvergreenTemplate> = {
  work: (m) => { const s = signFrom(m, 10); const [h, a, b] = WORK[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 10, a do trabalho. Por isso você consegue ${a}. Em ${b}, a sua força aparece naturalmente.` }; },
  compat: (m) => { const [h, a, b] = COMPAT[m];
    return { hook: hk(m, h), body: `${VA} a compatibilidade se lê de Lua para Lua, não pelo Sol. A Lua em ${sign(m)} ${a}. Com ${b}, os corações se conectam naturalmente.` }; },
  love: (m) => { const s = signFrom(m, 5); const [h, a, b] = LOVE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 5, a do amor. Por isso você deseja ${a}. Com ${b}, esse amor é correspondido.` }; },
  money: (m) => { const s = signFrom(m, 2); const [h, a, b] = MONEY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 2, a do dinheiro. Por isso você consegue ${a}. Em ${b}, o dinheiro chega naturalmente.` }; },
  family: (m) => { const s = signFrom(m, 4); const [h, a, b] = FAMILY[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 4, a da família. Por isso você quer ${a}. Em ${b}, você encontra paz de verdade.` }; },
  rest: (m) => { const s = signFrom(m, 12); const [h, a, b] = REST[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 12, a do descanso. Por isso ${a}. Com ${b}, a energia volta sozinha.` }; },
  impression: (m) => { const [h, a, b] = IMPRESSION[m];
    return { hook: hk(m, h), body: `${VA} ${P(m)} rege a sua casa 1, a imagem que você mostra. Por isso ${a}. Em ${b}, essa impressão vira confiança.` }; },
  avoid: (m) => { const s = signFrom(m, 6); const [h, a, b] = AVOID[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 6, a do que desgasta você. Por isso ${a}. Em ${b}, você volta a ser você.` }; },
  turning: (m) => { const s = signFrom(m, 8); const [h, a, b] = TURNING[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 8, a das viradas da vida. A sua virada chega ${a}. Se ${b}, ela joga a seu favor.` }; },
  habit: (m) => { const [h, a, b, c] = HABIT[m];
    return { hook: hk(m, h), body: `${VA} a sua Lua, que mostra o seu coração, ganha a natureza de ${P(m)}. Por isso ${a}. ${b} e ${c}.` }; },
  nature: (m) => { const s = signFrom(m, 9); const [h, a, b] = NATURE[s];
    return { hook: hk(m, h), body: `${VA} ${P(s)} rege a sua casa 9, o eixo da sua vida. O que você valoriza de verdade é ${a}. Quando está ${b}, você é mais você.` }; },
  sidereal: (sun) => ({
    hook: `${sign(sun)}, os horóscopos dizem que você é ${SUN_TRAIT[sun]}. Sente que não é você?`,
    body: 'A astrologia védica lê o seu caráter pela Lua, não pelo Sol, e usa a posição real das estrelas. Muita gente tem o Sol e a Lua em signos diferentes; talvez por isso os horóscopos não acertem.',
  }),
};

export function buildEvergreenTemplatePt(series: SignThemeSeries, moonSign: string): EvergreenTemplate | null {
  const m = asSign(moonSign);
  return m && SIGNS.includes(m) ? SERIES[series](m) : null;
}
