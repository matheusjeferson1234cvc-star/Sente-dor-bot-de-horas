'use strict';
// Publicação automática de recrutamentos encerrados, invocada por Vercel Cron com CRON_SECRET.
// O estado "publishing" impede o reenvio às cegas após uma falha de gravação.
const crypto=require('node:crypto');
const {assessObjective}=require('../lib/scoring');
const validId=x=>typeof x==='string'&&/^\d{15,25}$/.test(x);
const validUuid=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
const stamp=()=>new Date().toISOString();
const db=async(path,{method='GET',body,prefer='resolution=merge-duplicates,return=representation'}={})=>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Banco não configurado');
 const headers={apikey:key,'Content-Type':'application/json',Prefer:prefer};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const r=await fetch(new URL('/rest/v1/'+path,url),{method,headers,cache:'no-store',
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Banco '+r.status);
 return r.status===204?[]:r.json();
};
async function discord(method,path,body){
 const r=await fetch('https://discord.com/api/v10'+path,{method,
  headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Discord '+r.status+' '+method);
 return r.status===204?{}:r.json();
}
function nickname(tag,name,id){
 const a=String(tag||'PM').replace(/[^A-Za-z0-9]/g,'').slice(0,8);
 const n=String(name||'').replace(/[\r\n<>@|[\]\x60*_~]/g,' ').replace(/\s+/g,' ').trim();
 const rpId=String(id||'').replace(/[^A-Za-z0-9-]/g,'').slice(0,12);
 if(!a||!n||!rpId)throw Error('Dados RP incompletos');
 const prefix='['+a+'] ',suffix=' | '+rpId;
 if(prefix.length+suffix.length>31)throw Error('Dados RP muito longos');
 return prefix+n.slice(0,32-prefix.length-suffix.length)+suffix;
}
function announce(approved,tag,showScores){
 const lines=['🏆 **NERO RECRUTAMENTO · APROVADOS**'],users=[];
 for(const [i,a] of approved.entries()){
  if(!validId(a.user_id))throw Error('Candidato inválido');
  users.push(a.user_id);
  const nick=nickname(tag,a.rp_name,a.rp_id);
  const score=Number(a.final_score);
  lines.push((i+1)+'. <@'+a.user_id+'> — '+nick+(showScores&&Number.isFinite(score)?' · '+Math.round(score)+'%':''));
 }
 const content=lines.join('\n');
 if(content.length>2000)throw Error('Mensagem supera limite de 2000 caracteres do Discord');
 return {content,allowed_mentions:{parse:[],users:[...new Set(users)]},nonce:crypto.randomBytes(12).toString('hex')};
}
async function finalize(gid,id){
 const where='?guild_id=eq.'+gid+'&round_id=eq.'+id;
 const time=stamp();
 await db('nero_recruitment_approvals'+where+'&published_at=is.null',{method:'PATCH',body:{published_at:time}});
 await db('nero_recruitment_rounds?guild_id=eq.'+gid+'&id=eq.'+id+'&state=eq.publishing',{
  method:'PATCH',body:{state:'complete'}});
 await db('nero_recruitment_publications'+where,{method:'PATCH',body:{state:'complete',published_at:time}});
}
async function processRound(round){
 const gid=round.guild_id,id=round.id;
 if(!validId(gid)||!validUuid(id))return {status:'invalid'};
 const where='?guild_id=eq.'+gid+'&round_id=eq.'+id;
 if(round.state==='publishing'){
  const pub=(await db('nero_recruitment_publications'+where+'&select=message_id,state'))[0];
  if(pub?.message_id){await finalize(gid,id);return {status:'recovered',roundId:id}}
  return {status:'needs-operator',reason:'Publicação em andamento sem ID confirmado',roundId:id};
 }
 if(round.state==='open'){
  if(Date.parse(round.closes_at)>Date.now())return {status:'not-due'};
  const locked=await db('nero_recruitment_rounds?guild_id=eq.'+gid+'&id=eq.'+id+'&state=eq.open',{
   method:'PATCH',body:{state:'review',closed_at:stamp()}});
  if(!locked.length)return {status:'already-processing'};
 }
 const attempts=await db('nero_recruitment_attempts'+where+'&select=*&limit=500');
 if(!attempts.length)return {status:'empty',roundId:id};
 let pending=0;
 for(const a of attempts){
  if(['approved','rejected'].includes(a.state))continue;
  const score=assessObjective(round.config_snapshot,a.answers);
  if(!score){
   if(a.state!=='under_review')await db('nero_recruitment_attempts'+where+'&user_id=eq.'+a.user_id+
    '&state=in.(in_progress,submitted,expired)',{method:'PATCH',body:{state:'under_review'}});
   pending++;continue;
  }
  const changed=await db('nero_recruitment_attempts'+where+'&user_id=eq.'+a.user_id+
   '&state=in.(in_progress,submitted,expired,under_review)',{method:'PATCH',
    body:{state:score.decision,final_score:score.score,reviewed_at:stamp(),reviewed_by:null}});
  if(changed.length){a.state=score.decision;a.final_score=score.score}
  else pending++;
 }
 if(pending)return {status:'manual-review',roundId:id,pending};
 const approved=attempts.filter(a=>a.state==='approved');
 if(!validId(String(round.opened_by||'')))return {status:'needs-operator',reason:'Responsável inválido',roundId:id};
 const perms=(await db('nero_recruitment_permissions?guild_id=eq.'+gid+'&select=*&limit=1'))[0]||{};
 const role=String(perms.approved_role_id||''),channel=String(perms.announce_channel_id||'');
 const tag=String(perms.nickname_tag||'PM'),showScores=perms.show_scores===true;
 if(approved.length&&(!validId(role)||!validId(channel)))
  return {status:'needs-configuration',roundId:id,reason:'Configure cargo e canal de aprovados'};
 let payload;
 try{if(approved.length)payload=announce(approved,tag,showScores)}
 catch(e){return {status:'needs-operator',roundId:id,reason:e.message}}
 const lock=await db('nero_recruitment_rounds?guild_id=eq.'+gid+'&id=eq.'+id+'&state=eq.review',{
  method:'PATCH',body:{state:'publishing'}});
 if(!lock.length)return {status:'already-processing'};
 let sending=false;
 try{
  await db('nero_recruitment_publications?on_conflict=guild_id,round_id',{method:'POST',body:{
   guild_id:gid,round_id:id,channel_id:channel||null,initiated_by:round.opened_by,started_at:stamp(),state:'publishing'
  }});
  if(approved.length){
   const approvalRows=approved.map(a=>({
    guild_id:gid,round_id:id,user_id:a.user_id,display_name:nickname(tag,a.rp_name,a.rp_id),
    score_percent:a.final_score,show_score:showScores,confirmed_by:round.opened_by,
    confirmed_at:a.reviewed_at||stamp(),published_at:null
   }));
   await db('nero_recruitment_approvals?on_conflict=guild_id,round_id,user_id',{
    method:'POST',body:approvalRows});
   // Modificações idempotentes; se falharem, não publicar até corrigir o acesso do bot.
   for(const a of approved){
    await discord('PUT','/guilds/'+gid+'/members/'+a.user_id+'/roles/'+role);
    await discord('PATCH','/guilds/'+gid+'/members/'+a.user_id,{nick:nickname(tag,a.rp_name,a.rp_id)});
   }
   sending=true;
   const sent=await discord('POST','/channels/'+channel+'/messages',payload);
   if(!validId(String(sent.id||'')))throw Error('Mensagem do Discord não confirmada');
   await db('nero_recruitment_publications'+where,{method:'PATCH',body:{message_id:String(sent.id),state:'sent'}});
   sending=false;
  }
  await finalize(gid,id);
  return {status:'complete',roundId:id,approved:approved.length};
 }catch(e){
  console.error('Automação Nero:',String(e.message||e).slice(0,100));
  const pub=(await db('nero_recruitment_publications'+where+'&select=message_id')).at(0);
  if(!sending&&!pub?.message_id)await db('nero_recruitment_rounds?guild_id=eq.'+gid+'&id=eq.'+id+'&state=eq.publishing',{
   method:'PATCH',body:{state:'review'}}).catch(()=>{});
  return {status:'error',roundId:id,needsCheck:sending||!!pub?.message_id};
 }
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const secret=String(process.env.CRON_SECRET||''),auth=String(req.headers.authorization||'');
 if(secret.length<32||!auth.startsWith('Bearer '))return res.status(401).json({error:'Não autorizado'});
 const provided=auth.slice(7),a=Buffer.from(secret),b=Buffer.from(provided);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'Não autorizado'});
 if(!process.env.DISCORD_BOT_TOKEN)return res.status(503).json({error:'Bot indisponível'});
 try{
  const rows=await db('nero_recruitment_rounds?auto_enabled=eq.true&state=in.(open,review,publishing)&select=*&order=closes_at.asc&limit=25');
  const due=rows.find(x=>x.state!=='open'||Date.parse(x.closes_at)<=Date.now());
  if(!due)return res.status(200).json({ok:true,status:'nothing-due'});
  const result=await processRound(due);
  return res.status(200).json({ok:true,...result});
 }catch(e){
  console.error('Cron Nero Recrutamento:',String(e.message||e).slice(0,100));
  return res.status(503).json({error:'Automação temporariamente indisponível'});
 }
};
module.exports.processRound=processRound;
