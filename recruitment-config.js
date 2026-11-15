'use strict';
// Modelos editáveis por servidor. As respostas de múltipla escolha não são expostas à área pública.
const choice=(title,options,correct)=>({type:'choice',title,options,correct});
const written=(title,rubric)=>({type:'written',title,rubric});
const DEFAULTS={
 policia:[
  {
    "type": "choice",
    "title": "O que significa Código 1 neste servidor?",
    "options": [
      "Abordagem de rotina",
      "Oficial abatido",
      "Perseguição",
      "Equipe liberada"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que significa Código 2 neste servidor?",
    "options": [
      "Ocorrência encerrada",
      "Abordagem suspeita",
      "Área limpa",
      "Apoio solicitado"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "O que significa Código 4 neste servidor?",
    "options": [
      "Abordagem suspeita",
      "Em perseguição",
      "Situação sob controle / Área limpa",
      "QRR máximo"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que significa Código 8 neste servidor?",
    "options": [
      "Oficial abatido",
      "Abordagem de rotina",
      "Ocorrência encerrada",
      "Apoio solicitado / Reforço em deslocamento"
    ],
    "correct": 3
  },
  {
    "type": "choice",
    "title": "O que significa Código 9 neste servidor?",
    "options": [
      "Ocorrência encerrada / Equipe liberada",
      "Fogo aberto",
      "Perímetro estabelecido",
      "Em perseguição"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que significa QAP?",
    "options": [
      "Fora de serviço",
      "Na escuta",
      "Localização",
      "Identificação"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "O que significa QSL?",
    "options": [
      "Aguarde",
      "Não compreendi",
      "Recebido / Entendido",
      "Repetir a mensagem"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que significa QTH?",
    "options": [
      "Operador",
      "Aguarde",
      "Mensagem recebida",
      "Localização"
    ],
    "correct": 3
  },
  {
    "type": "choice",
    "title": "O que é metagaming?",
    "options": [
      "Usar informação obtida fora do RP para agir dentro dele",
      "Comunicar pelo rádio",
      "Respeitar a hierarquia",
      "Responder à ocorrência"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que é powergaming?",
    "options": [
      "Encerrar o jogo",
      "Forçar ações impossíveis ou contrárias às regras do RP",
      "Participar de patrulha",
      "Pedir orientação"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "O que é RDM?",
    "options": [
      "Registrar ocorrência",
      "Falar pelo rádio",
      "Atacar alguém sem contexto válido de RP",
      "Pedir reforço"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que é VDM?",
    "options": [
      "Registrar uma viatura",
      "Assumir turno",
      "Fazer prova",
      "Usar veículo para atingir jogadores sem contexto válido de RP"
    ],
    "correct": 3
  },
  {
    "type": "written",
    "title": "Qual é a principal função de um policial no RP?",
    "rubric": "Proteger a experiência de RP, seguir as regras do servidor e agir com responsabilidade."
  },
  {
    "type": "written",
    "title": "Como realizar uma abordagem respeitando as regras do servidor?",
    "rubric": "Respeito, comunicação clara, proporcionalidade e regras do servidor."
  },
  {
    "type": "written",
    "title": "Por que a hierarquia policial é importante?",
    "rubric": "Organização, responsabilidade e respeito às funções; ordens não podem contrariar regras."
  },
  {
    "type": "written",
    "title": "O que fazer ao receber uma ordem contrária às regras do servidor?",
    "rubric": "Não violar regras; esclarecer, comunicar à liderança ou moderação."
  },
  {
    "type": "written",
    "title": "Qual a importância da comunicação pelo rádio?",
    "rubric": "Coordenação, comunicação clara e respeito ao contexto de RP."
  },
  {
    "type": "written",
    "title": "O que fazer se um colega desrespeitar as regras do RP?",
    "rubric": "Comunicar adequadamente e não encobrir infrações."
  },
  {
    "type": "written",
    "title": "Explique a diferença entre IC e OOC.",
    "rubric": "IC são ações e informações dentro do personagem; OOC fora do personagem."
  },
  {
    "type": "written",
    "title": "Por que você quer fazer parte da corporação?",
    "rubric": "Resposta pessoal coerente, respeitosa e alinhada ao RP."
  }
],
 organizacao:[
  {
    "type": "choice",
    "title": "O que significa RP?",
    "options": [
      "Jogar sem regras",
      "Interpretar um personagem",
      "Evitar interações",
      "Vencer todas as cenas"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "O que é metagaming?",
    "options": [
      "Usar informação externa ao RP no personagem",
      "Participar de cena",
      "Comunicar pelo rádio",
      "Sair do servidor"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que é powergaming?",
    "options": [
      "Conversar no jogo",
      "Cumprir hierarquia",
      "Forçar ações impossíveis ou contrárias às regras do RP",
      "Registrar ocorrência"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que significa RDM?",
    "options": [
      "Respeitar pessoas",
      "Iniciar uma conversa",
      "Voltar ao personagem",
      "Atacar sem contexto válido de RP"
    ],
    "correct": 3
  },
  {
    "type": "choice",
    "title": "O que significa VDM?",
    "options": [
      "Usar veículo contra jogadores sem contexto válido de RP",
      "Concluir missão",
      "Entrar em um veículo",
      "Pedir ajuda"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que é combat logging?",
    "options": [
      "Ficar ausente no chat",
      "Sair durante uma ação para evitar consequências do RP",
      "Registrar um log",
      "Pausar para ajuste técnico"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "O que significa IC?",
    "options": [
      "Informações do Discord",
      "Mensagem administrativa",
      "Dentro do personagem",
      "Fora do personagem"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que significa OOC?",
    "options": [
      "Falar no rádio",
      "Nome do personagem",
      "Ação em cena",
      "Fora do personagem"
    ],
    "correct": 3
  },
  {
    "type": "choice",
    "title": "Como agir diante de uma ordem contrária às regras do servidor?",
    "options": [
      "Pedir esclarecimento e respeitar as regras",
      "Cumprir qualquer ordem",
      "Ignorar a moderação",
      "Punir quem discordar"
    ],
    "correct": 0
  },
  {
    "type": "choice",
    "title": "O que é importante em uma organização de RP?",
    "options": [
      "Apenas ganhar conflitos",
      "Respeitar colegas, regras e a narrativa",
      "Ignorar outros participantes",
      "Não aceitar erros"
    ],
    "correct": 1
  },
  {
    "type": "choice",
    "title": "Como agir em um desentendimento entre membros?",
    "options": [
      "Provocar mais",
      "Excluir um participante",
      "Dialogar e recorrer à liderança/moderação quando necessário",
      "Quebrar regras do RP"
    ],
    "correct": 2
  },
  {
    "type": "choice",
    "title": "O que significa valorizar a própria vida no RP?",
    "options": [
      "Ignorar consequências",
      "Forçar vitórias",
      "Impedir outras pessoas de interpretar",
      "Interpretar situações com coerência e respeito às regras"
    ],
    "correct": 3
  },
  {
    "type": "written",
    "title": "Por que você quer entrar na organização de RP?",
    "rubric": "Motivação coerente e respeito à comunidade."
  },
  {
    "type": "written",
    "title": "Como lidar com um colega que desrespeita as regras?",
    "rubric": "Resolver com respeito e, se necessário, comunicar a moderação."
  },
  {
    "type": "written",
    "title": "Por que a hierarquia é importante dentro da organização?",
    "rubric": "Responsabilidades claras e cooperação sem desrespeitar regras."
  },
  {
    "type": "written",
    "title": "Como reagiria se uma cena de RP não terminasse como esperava?",
    "rubric": "Aceitar consequências, manter a interpretação e não discutir OOC."
  },
  {
    "type": "written",
    "title": "Explique a diferença entre IC e OOC com suas palavras.",
    "rubric": "Separar informações e ações dentro e fora do personagem."
  },
  {
    "type": "written",
    "title": "Como ajudar um novo integrante a aprender as regras?",
    "rubric": "Paciência, orientação e respeito."
  },
  {
    "type": "written",
    "title": "O que faria se notasse uma quebra de regras no RP?",
    "rubric": "Não reproduzir a infração e usar os canais corretos de moderação."
  },
  {
    "type": "written",
    "title": "O que significa participar de um RP de qualidade?",
    "rubric": "Interpretação coerente, colaboração e respeito pelos demais participantes."
  }
]
};
const kinds=Object.keys(DEFAULTS);
const clone=v=>JSON.parse(JSON.stringify(v));
const starting=kind=>{
 if(!kinds.includes(kind))throw Error('Tipo de prova inválido');
 return {passPercent:50,questions:clone(DEFAULTS[kind])};
};
const cleanString=(v,max,label)=>{
 if(typeof v!=='string'||v.trim().length<2||v.length>max)throw Error(label+' inválido');
 return v.trim();
};
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuração inválida');
 const passPercent=Number(input.passPercent);
 if(!Number.isInteger(passPercent)||passPercent<1||passPercent>100)throw Error('Nota mínima deve ser de 1 a 100%');
 if(!Array.isArray(input.questions)||input.questions.length<1||input.questions.length>20)throw Error('A prova deve ter de 1 a 20 questões');
 const questions=input.questions.map((q,i)=>{
  if(!q||typeof q!=='object')throw Error('Questão '+(i+1)+' inválida');
  const title=cleanString(q.title,250,'Enunciado da questão '+(i+1));
  if(q.type==='choice'){
   if(!Array.isArray(q.options)||q.options.length!==4)throw Error('Questão '+(i+1)+': informe quatro alternativas');
   const options=q.options.map((s,j)=>cleanString(s,180,'Alternativa '+(j+1)));
   if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3)throw Error('Questão '+(i+1)+': gabarito inválido');
   return choice(title,options,q.correct);
  }
  if(q.type==='written')return written(title,cleanString(q.rubric,800,'Critério de correção'));
  throw Error('Questão '+(i+1)+': tipo inválido');
 });
 return {passPercent,questions};
}
module.exports={DEFAULTS,starting,normalize,kinds};
