'use strict';
const {safeNickname,announcement}=require('./recruitment-review');
const validId=v=>typeof v==='string'&&/^\d{15,25}$/.test(v);
const validUuid=v=>typeof v==='string'&&/^[\da-f-]{36}$/i.test(v);
const now=()=>new Date().toISOString();
async function sendDiscord(method,path,data){
 const r=await fetch('https://discord.com/api/v10'+path,{
  method,headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},
  body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(8000)
 });
 if(!r.ok)throw Error('Discord '+r.status+' ao executar '+method);
 return r.status===204?{}:r.json();
}
async function settings(ctx){
 const {req,res,gid,user,admin,db,discord,json}=ctx;
 if(!admin)return json(res,403,{error:'Somente administradores configuram cargos e anúncios'});
 const rows=await db('nero_recruitment_permissions',{query:'?guild_id=eq.'+gid+'&select=*&limit=1'});
 const cfg=rows[0]||{};
 if(req.method==='GET'){
  const [roles,channels]=await Promise.all([discord('/guilds/'+gid+'/roles'),discord('/guilds/'+gid+'/channels')]);
  return json(res,200,{config:cfg,roles:roles.filter(x=>x.id!==gid&&!x.managed).map(x=>({id:x.id,name:x.name})),
   channels:channels.filter(x=>x.type===0||x.type===5).map(x=>({id:x.id,name:x.name}))});
 }
 const b=req.body||{},roleId=String(b.approvedRoleId||''),channelId=String(b.announceChannelId||'');
 const tag=String(b.nicknameTag||'PM').replace(/[^A-Za-z0-9]/g,'').slice(0,8);
 if(!tag||(roleId&&!validId(roleId))||(channelId&&!validId(channelId)))
  return json(res,400,{error:'TAG, canal ou cargo inválido'});
 const [roles,channels]=await Promise.all([discord('/guilds/'+gid+'/roles'),discord('/guilds/'+gid+'/channels')]);
 if(roleId&&!roles.some(x=>x.id===roleId&&!x.managed))return json(res,400,{error:'Cargo não existe neste servidor'});
 if(channelId&&!channels.some(x=>x.id===channelId&&(x.type===0||x.type===5)))
  return json(res,400,{error:'Canal não existe neste servidor'});
 await db('nero_recruitment_permissions',{method:'POST',body:{
  guild_id:gid,recruiter_role_id:cfg.recruiter_role_id||null,updated_by:user.id,updated_at:now(),
  approved_role_id:roleId||null,announce_channel_id:channelId||null,
  nickname_tag:tag,show_scores:b.showScores===true
 }});
 return json(res,200,{ok:true});
}
async function publish(ctx){
 const {req,res,gid,user,db,json}=ctx;
 if(req.method!=='POST')return json(res,405,{error:'Publicação exige confirmação'});
 const roundId=String(req.body?.roundId||'');
 if(!validUuid(roundId))return json(res,400,{error:'Recrutamento inválido'});
 const query='?guild_id=eq.'+gid+'&round_id=eq.'+roundId;
 const records=await db('nero_recruitment_rounds',{query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&select=*'});
 const round=records[0];
 if(!round)return json(res,404,{error:'Recrutamento não encontrado'});
 if(round.state==='complete')return json(res,200,{ok:true,alreadyPublished:true});
 const pubs=await db('nero_recruitment_publications',{query:query+'&select=*'});
 if(round.state==='publishing'){
  if(!pubs[0]?.message_id)return json(res,409,{error:'Publicação iniciada sem confirmação. Verifique os logs do Discord antes de retomar'});
  const date=now();
  await db('nero_recruitment_approvals',{method:'PATCH',query:query+'&published_at=is.null',body:{published_at:date}});
  await db('nero_recruitment_rounds',{method:'PATCH',query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&state=eq.publishing',body:{state:'complete'}});
  await db('nero_recruitment_publications',{method:'PATCH',query,body:{state:'complete',published_at:date}});
  return json(res,200,{ok:true,recovered:true});
 }
 if(round.state==='open'&&Date.parse(round.closes_at)<=Date.now()){
  await db('nero_recruitment_rounds',{method:'PATCH',query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&state=eq.open',body:{state:'review',closed_at:now(),closed_by:user.id}});
  round.state='review';
 }
 if(round.state!=='review')return json(res,409,{error:'Encerre a prova antes de publicar'});
 const attempts=await db('nero_recruitment_attempts',{query:query+'&select=*&limit=500'});
 if(!attempts.length)return json(res,409,{error:'Nenhuma prova recebida'});
 if(attempts.some(x=>!['approved','rejected'].includes(x.state)))
  return json(res,409,{error:'Revise todas as provas primeiro'});
 const approved=attempts.filter(x=>x.state==='approved');
 const perms=(await db('nero_recruitment_permissions',{query:'?guild_id=eq.'+gid+'&select=*&limit=1'}))[0]||{};
 const role=String(perms.approved_role_id||''),channel=String(perms.announce_channel_id||''),tag=perms.nickname_tag||'PM';
 if(approved.length&&(!validId(role)||!validId(channel)))
  return json(res,409,{error:'Configure cargo de aprovado e canal de anúncios'});
 let payload=null;
 try{if(approved.length)payload=announcement(approved,{tag,showScores:perms.show_scores===true})}
 catch(e){return json(res,400,{error:e.message})}
 const locked=await db('nero_recruitment_rounds',{method:'PATCH',query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&state=eq.review',body:{state:'publishing'}});
 if(!locked.length)return json(res,409,{error:'Publicação já iniciada por outro recrutador'});
 let sending=false;
 try{
  await db('nero_recruitment_publications',{method:'POST',query:'?on_conflict=guild_id,round_id',
   body:{guild_id:gid,round_id:roundId,channel_id:channel||null,initiated_by:user.id,started_at:now(),state:'publishing'}});
  if(approved.length){
   await db('nero_recruitment_approvals',{method:'POST',query:'?on_conflict=guild_id,round_id,user_id',
    body:approved.map(x=>({guild_id:gid,round_id:roundId,user_id:x.user_id,
     display_name:safeNickname(tag,x.rp_name,x.rp_id),score_percent:x.final_score,
     show_score:perms.show_scores===true,confirmed_by:x.reviewed_by||user.id,
     confirmed_at:x.reviewed_at||now(),published_at:null}))});
   for(const x of approved){
    await sendDiscord('PUT','/guilds/'+gid+'/members/'+x.user_id+'/roles/'+role);
    await sendDiscord('PATCH','/guilds/'+gid+'/members/'+x.user_id,
     {nick:safeNickname(tag,x.rp_name,x.rp_id)});
   }
   sending=true;
   const posted=await sendDiscord('POST','/channels/'+channel+'/messages',payload);
   if(!validId(String(posted.id||'')))throw Error('Mensagem não confirmada pelo Discord');
   await db('nero_recruitment_publications',{method:'PATCH',query,body:{message_id:posted.id,state:'sent'}});
   sending=false;
  }
  const date=now();
  if(approved.length)await db('nero_recruitment_approvals',{method:'PATCH',query:query+'&published_at=is.null',body:{published_at:date}});
  await db('nero_recruitment_rounds',{method:'PATCH',query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&state=eq.publishing',body:{state:'complete'}});
  await db('nero_recruitment_publications',{method:'PATCH',query,body:{state:'complete',published_at:date}});
  return json(res,200,{ok:true,published:true,approvedCount:approved.length});
 }catch(e){
  console.error('Publicação Nero:',String(e.message||e).slice(0,120));
  const logged=await db('nero_recruitment_publications',{query:query+'&select=message_id'}).catch(()=>[]);
  if(!sending&&!logged[0]?.message_id){
   await db('nero_recruitment_rounds',{method:'PATCH',
    query:'?guild_id=eq.'+gid+'&id=eq.'+roundId+'&state=eq.publishing',body:{state:'review'}}).catch(()=>{});
  }
  return json(res,503,{error:'Publicação incompleta. Consulte os logs antes de reenviar.'});
 }
}
module.exports={settings,publish};
