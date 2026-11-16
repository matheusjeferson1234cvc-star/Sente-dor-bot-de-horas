'use strict';
// Prova por candidato: ID validado por DM, prazo em servidor, respostas privadas.
const {readSession,isOpen,isSnowflake}=require('../lib/identity-core');
const {authUser}=require('../lib/oauth-core');
const output=(res,status,data)=>res.status(status).setHeader('Cache-Control','no-store').json(data);
const db=async(path,{method='GET',body,prefer='return=representation'}={})=>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Banco não configurado');
 const headers={apikey:key,'Content-Type':'application/json',Prefer:prefer};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const r=await fetch(new URL('/rest/v1/'+path,url),{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(7500)});
 if(!r.ok)throw Error('Banco '+r.status);
 if(r.status===204)return [];
 return r.json();
};
function checkOrigin(req){
 try{const url=new URL(String(req.headers.origin||''));return url.protocol==='https:'&&url.host===req.headers.host}
 catch{return false}
}
function getCookie(req,key){
 const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='));
 if(!raw)return '';
 try{return decodeURIComponent(raw.slice(key.length+1))}catch{return ''}
}
function questionsForCandidate(config){
 return config.questions.map(q=>q.type==='choice'?
  {type:'choice',title:q.title,options:q.options}: {type:'written',title:q.title});
}
function normalizeAnswers(answers,questions){
 if(!Array.isArray(answers)||answers.length!==questions.length||answers.length>20)throw Error('Quantidade de respostas inválida');
 return answers.map((v,i)=>{
  if(v===null||v===undefined||v==='')return null;
  if(questions[i].type==='choice'){
   if(!Number.isInteger(v)||v<0||v>=questions[i].options.length)throw Error('Alternativa inválida na questão '+(i+1));
   return v;
  }
  if(typeof v!=='string'||v.length>1800)throw Error('Resposta extensa ou inválida na questão '+(i+1));
  return v.trim().slice(0,1800);
 });
}
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return output(res,405,{error:'Método não permitido'});
 if(process.env.NERO_PUBLIC_EXAM_ENABLED!=='true')return output(res,423,{error:'Inscrições encerradas'});
 if(req.method==='POST'&&!checkOrigin(req))return output(res,403,{error:'Origem não autorizada'});
 const oauth=authUser(req);
 const legacy=readSession(process.env.NERO_IDENTITY_SECRET,getCookie(req,'nero_recruit_session'));
 const session=oauth||legacy;
 if(!session)return output(res,401,{error:'Entre com sua conta do Discord para continuar'});
 const guildId=String(req.method==='POST'?req.body?.guildId||'':req.query?.guild||'');
 if(!isSnowflake(guildId)||guildId!==session.guildId)return output(res,403,{error:'Servidor não autorizado'});
 try{
  const rounds=await db('nero_recruitment_rounds?guild_id=eq.'+guildId+
   '&state=eq.open&select=id,guild_id,state,opens_at,closes_at,duration_minutes,config_snapshot&order=closes_at.asc&limit=10');
  const round=rounds.find(r=>isOpen(r)&&(!legacy||oauth||r.id===legacy.roundId));
  if(!isOpen(round))return output(res,423,{error:'O recrutamento foi encerrado'});
  const config=round.config_snapshot;
  if(!config||!Array.isArray(config.questions)||!config.questions.length||config.questions.length>20)
   return output(res,503,{error:'Prova indisponível'});
  const now=new Date();
  const keyQuery='?guild_id=eq.'+guildId+'&round_id=eq.'+round.id+'&user_id=eq.'+(session.userId||session.id);
  let attempts=await db('nero_recruitment_attempts'+keyQuery+'&select=*');
  const raw=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body):null;
  if(req.method==='POST'&&raw?.action==='register'){
   const rpName=String(raw.rpName||'').replace(/[\r\n<>@|[\]\x60*_~]/g,' ').replace(/\s+/g,' ').trim();
   const rpId=String(raw.rpId||'').trim();
   if(rpName.length<2||rpName.length>24||!/^[\p{L}\p{N} .'-]+$/u.test(rpName)||!/^[A-Za-z0-9-]{1,12}$/.test(rpId))
    return output(res,400,{error:'Informe um Nome RP válido (2 a 24 caracteres) e um ID RP válido'});
   if(oauth){
    const member=await fetch('https://discord.com/api/v10/guilds/'+guildId+'/members/'+session.id,{
     headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(7000)});
    if(!member.ok)return output(res,403,{error:'Sua conta precisa estar no servidor do recrutamento'});
   }
   if(attempts.length){
    return output(res,attempts[0].rp_name&&attempts[0].rp_id?409:200,
     attempts[0].rp_name&&attempts[0].rp_id?{error:'Dados RP já cadastrados'}:{ok:true,registered:false});
   }
   const expires=new Date(Math.min(now.getTime()+round.duration_minutes*60000,Date.parse(round.closes_at)));
   if(expires.getTime()<=now.getTime())return output(res,423,{error:'Tempo da prova encerrado'});
   await db('nero_recruitment_attempts?on_conflict=guild_id,round_id,user_id',{
    method:'POST',body:{guild_id:guildId,round_id:round.id,user_id:session.userId||session.id,
     started_at:now.toISOString(),deadline_at:expires.toISOString(),state:'in_progress',
     rp_name:rpName,rp_id:rpId,answers:Array(config.questions.length).fill(null)},
    prefer:'resolution=ignore-duplicates,return=representation'
   });
   attempts=await db('nero_recruitment_attempts'+keyQuery+'&select=*');
   return output(res,attempts[0]?.rp_name&&attempts[0]?.rp_id?200:409,
    attempts[0]?.rp_name&&attempts[0]?.rp_id?{ok:true,registered:true}:{error:'Inscrição não confirmada'});
  }
  if(!attempts.length)return output(res,req.method==='GET'?200:409,
   req.method==='GET'?{state:'registration',needsRp:true}:{error:'Cadastre Nome RP e ID RP para iniciar a prova'});
  const attempt=attempts[0];
  if(!attempt.rp_name||!attempt.rp_id)return output(res,409,{error:'Nome RP e ID RP não cadastrados'});
  if(req.method==='GET'){
   if(attempt.state!=='in_progress')return output(res,200,{state:attempt.state,submittedAt:attempt.submitted_at||null});
   if(Date.parse(attempt.deadline_at)<=Date.now())return output(res,423,{state:'expired',error:'O tempo individual da prova terminou'});
   return output(res,200,{state:'in_progress',guildId,roundId:round.id,
    deadlineAt:attempt.deadline_at,closesAt:round.closes_at,durationMinutes:round.duration_minutes,
    questions:questionsForCandidate(config),answers:Array.isArray(attempt.answers)?attempt.answers:[]});
  }
  if(attempt.state!=='in_progress'||attempt.submitted_at)return output(res,409,{error:'Esta prova já foi encerrada ou enviada'});
  if(Date.parse(attempt.deadline_at)<=Date.now())return output(res,423,{error:'O prazo individual da prova terminou'});
  if(!raw||JSON.stringify(raw).length>43000)return output(res,413,{error:'Respostas excederam o limite permitido'});
  const action=String(raw.action||'');
  if(!['save','submit'].includes(action))return output(res,400,{error:'Ação inválida'});
  let answers;try{answers=normalizeAnswers(raw.answers,config.questions)}catch(e){return output(res,400,{error:e.message})}
  const patch={answers};
  if(action==='submit'){patch.submitted_at=new Date().toISOString();patch.state='submitted'}
  const updated=await db('nero_recruitment_attempts'+keyQuery+
   '&state=eq.in_progress&submitted_at=is.null&deadline_at=gt.'+encodeURIComponent(new Date().toISOString()),{
   method:'PATCH',body:patch
  });
  if(!updated.length)return output(res,409,{error:'O tempo terminou ou a prova já foi enviada'});
  return output(res,200,{ok:true,state:patch.state||'in_progress',saved:true,submitted:action==='submit'});
 }catch(e){
  console.error('Prova Nero:',String(e.message||e).slice(0,90));
  return output(res,503,{error:'Não foi possível processar a prova'});
 }
};
module.exports.normalizeAnswers=normalizeAnswers;
module.exports.questionsForCandidate=questionsForCandidate;
