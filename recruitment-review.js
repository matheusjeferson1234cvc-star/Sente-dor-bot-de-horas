'use strict';
// Correção preliminar transparente: marcação exata e rubrica escrita por palavras-chave.
// A decisão final SEMPRE exige confirmação humana da equipe.
const stop=new Set(['de','do','da','dos','das','o','a','os','as','e','ou','para','por','com','que','uma','um','no','na','em','ser','estar','sao','se','sobre','entre','seu','sua','seus','suas','ao','aos','como','ter','tem','mais','menos','muito']);
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const keywords=s=>new Set(clean(s).split(' ').filter(w=>w.length>2&&!stop.has(w)));
function assess(config,answers){
 if(!Array.isArray(config?.questions)||config.questions.length<1||config.questions.length>20)throw Error('Prova inválida');
 const q=config.questions,marks=[];
 for(let i=0;i<q.length;i++){
  const answer=Array.isArray(answers)?answers[i]:null;
  if(q[i].type==='choice'){
   const score=Number.isInteger(answer)&&answer===q[i].correct?1:0;
   marks.push({number:i+1,type:'choice',score,needsHuman:false,reason:score?'Resposta correta':'Resposta diferente do gabarito'});
  }else if(q[i].type==='written'){
   const rubric=keywords(q[i].rubric),candidate=keywords(typeof answer==='string'?answer:'');
   const matched=[...rubric].filter(x=>candidate.has(x));
   const score=rubric.size?Math.round((matched.length/rubric.size)*100)/100:0;
   marks.push({number:i+1,type:'written',score,needsHuman:true,reason:'Estimativa por termos do critério; revisão humana obrigatória'});
  }else throw Error('Questão inválida');
 }
 const provisionalScore=Math.round(marks.reduce((a,x)=>a+x.score,0)*10000/q.length)/100;
 return {questions:marks,provisionalScore,passPercent:Math.max(50,Number(config.passPercent)||50),reviewRequired:true};
}
const validId=v=>typeof v==='string'&&/^\d{15,25}$/.test(v);
function safeNickname(tag,name,rpId){
 const a=String(tag||'PM').replace(/[^a-zA-Z0-9]/g,'').slice(0,8);
 const n=String(name||'').replace(/[\r\n<>@|[\]\x60*_~]/g,'').trim().slice(0,24);
 const id=String(rpId||'').replace(/[^0-9a-zA-Z-]/g,'').slice(0,12);
 if(!n||!id||!a)throw Error('Nome RP, ID RP e TAG são obrigatórios');
 const suffix=' | '+id,prefix='['+a+'] ';
 if(prefix.length+suffix.length+1>32)throw Error('TAG ou ID RP muito longo');
 return prefix+n.slice(0,32-prefix.length-suffix.length)+suffix;
}
function announcement(approved,{tag='PM',showScores=false}={}){
 if(!Array.isArray(approved)||approved.length===0||approved.length>100)throw Error('Lista de aprovados inválida');
 const users=[],lines=['🏆 **NERO RECRUTAMENTO · APROVADOS**'];
 for(let i=0;i<approved.length;i++){
  const x=approved[i],userId=String(x.user_id||x.userId||'');
  if(!validId(userId))throw Error('ID Discord inválido no resultado');
  const nick=safeNickname(tag,x.rp_name||x.rpName,x.rp_id||x.rpId);
  const score=Number(x.final_score??x.score);
  users.push(userId);
  lines.push((i+1)+'. <@'+userId+'> — '+nick+(showScores&&Number.isFinite(score)?' · '+score.toFixed(0)+'%':''));
 }
 const content=lines.join('\n');
 if(content.length>2000)throw Error('O Discord aceita no máximo 2000 caracteres; revise os aprovados antes de publicar numa única mensagem');
 return {content,allowed_mentions:{parse:[],users:[...new Set(users)]}};
}
module.exports={assess,safeNickname,announcement};
