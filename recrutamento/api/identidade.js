'use strict';
// Identificação por ID Discord + código privado via DM. Sem OAuth para candidatos.
// Não responde a nenhum pedido enquanto o recrutamento não estiver aberto e configurado.
const {isSnowflake,secretOK,newCode,digest,matchesHash,isOpen,issueSession}=require('../lib/identity-core');
const api='https://discord.com/api/v10';
const json=(res,status,data)=>res.status(status).setHeader('Cache-Control','no-store').json(data);
const configs=()=>({
 url:process.env.SUPABASE_URL,
 key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,
 bot:process.env.DISCORD_BOT_TOKEN,
 secret:process.env.NERO_IDENTITY_SECRET,
 turnstile:process.env.TURNSTILE_SECRET_KEY
});
async function db(path,{method='GET',body,prefer}={}){
 const c=configs();if(!c.url||!c.key)throw Error('Banco não configurado');
 const u=new URL('/rest/v1/'+path,c.url);
 const h={apikey:c.key,'Content-Type':'application/json'};
 if(!c.key.startsWith('sb_secret_'))h.Authorization='Bearer '+c.key;
 if(prefer)h.Prefer=prefer;
 const r=await fetch(u,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('Banco indisponível ('+r.status+')');
 return r.status===204?[]:r.json();
}
async function discord(path,{method='GET',body}={}){
 const r=await fetch(api+path,{
  method,headers:{Authorization:'Bot '+configs().bot,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(7000)
 });
 if(r.status===429)throw Error('Limite Discord');
 if(!r.ok){const e=new Error('Discord '+r.status);e.status=r.status;throw e}
 return r.status===204?null:r.json();
}
async function getRound(guildId){
 const rows=await db('nero_recruitment_rounds?guild_id=eq.'+guildId+
  '&state=eq.open&select=id,guild_id,state,opens_at,closes_at&order=closes_at.asc&limit=5');
 return rows.find(r=>isOpen(r))||null;
}
async function validateCaptcha(token,req){
 if(typeof token!=='string'||token.length<20||token.length>2048)return false;
 const form=new URLSearchParams({secret:configs().turnstile,response:token});
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
 if(ip)form.set('remoteip',ip);
 const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
  method:'POST',body:form,signal:AbortSignal.timeout(6000)
 });
 if(!r.ok)return false;
 const v=await r.json();
 return v.success===true&&v.hostname===String(req.headers.host||'');
}
function sameOrigin(req){
 try{const origin=new URL(String(req.headers.origin||''));return origin.protocol==='https:'&&origin.host===req.headers.host}
 catch{return false}
}
async function start(req,res,b,guildId,c){
 if(!isSnowflake(String(b.userId||'')))return json(res,400,{error:'ID Discord inválido'});
 if(!await validateCaptcha(b.captchaToken,req))return json(res,403,{error:'Confirmação de segurança não concluída'});
 const round=await getRound(guildId);
 if(!round)return json(res,423,{error:'Inscrições encerradas'});
 const userId=String(b.userId);
 const qs='?guild_id=eq.'+guildId+'&round_id=eq.'+round.id+'&user_id=eq.'+userId;
 const rows=await db('nero_recruitment_identity_challenges'+qs+'&select=cooldown_until');
 if(rows.length&&Date.parse(rows[0].cooldown_until)>Date.now())return json(res,429,{error:'Aguarde antes de pedir outro código'});
 try{await discord('/guilds/'+guildId+'/members/'+userId)}catch(e){
  // Resposta deliberadamente genérica: não divulgar se um ID pertence ao servidor.
  if(e.status===404)return json(res,200,{ok:true,message:'Se a conta estiver no servidor, receberá instruções por mensagem privada.'});
  throw e;
 }
 const code=newCode(),now=Date.now();
 const row={guild_id:guildId,round_id:round.id,user_id:userId,
  code_hash:digest(c.secret,guildId,round.id,userId,code),attempts:0,
  issued_at:new Date(now).toISOString(),expires_at:new Date(now+5*60000).toISOString(),
  cooldown_until:new Date(now+90*1000).toISOString(),verified_at:null};
 await db('nero_recruitment_identity_challenges?on_conflict=guild_id,round_id,user_id',{
  method:'POST',body:row,prefer:'resolution=merge-duplicates,return=representation'
 });
 try{
  const dm=await discord('/users/@me/channels',{method:'POST',body:{recipient_id:userId}});
  await discord('/channels/'+dm.id+'/messages',{method:'POST',body:{
   content:'**Nero Recrutamento**\nSeu código de confirmação é: **'+code+
    '**\nVálido por 5 minutos. Não compartilhe este código. Se não solicitou, ignore.',
   allowed_mentions:{parse:[]}
  }});
 }catch(e){
  // Impedir código órfão quando as mensagens privadas estão desativadas.
  await db('nero_recruitment_identity_challenges'+qs+'&code_hash=eq.'+row.code_hash,{method:'DELETE'}).catch(()=>{});
  if(e.status===403)return json(res,409,{error:'Não foi possível enviar DM. Habilite mensagens privadas deste servidor.'});
  throw e;
 }
 return json(res,200,{ok:true,step:'code',message:'Confira sua mensagem privada no Discord.'});
}
async function confirm(req,res,b,guildId,c){
 const userId=String(b.userId||''),code=String(b.code||'');
 if(!isSnowflake(userId)||!/^\d{8}$/.test(code))return json(res,400,{error:'Código ou ID inválido'});
 const round=await getRound(guildId);
 if(!round)return json(res,423,{error:'Inscrições encerradas'});
 const qs='?guild_id=eq.'+guildId+'&round_id=eq.'+round.id+'&user_id=eq.'+userId;
 const rows=await db('nero_recruitment_identity_challenges'+qs+'&select=*');
 const row=rows[0];
 if(!row||row.verified_at||Date.parse(row.expires_at)<=Date.now()||row.attempts>=5)
  return json(res,403,{error:'Código inválido ou expirado. Solicite outro código.'});
 const expected=digest(c.secret,guildId,round.id,userId,code);
 if(!matchesHash(row.code_hash,expected)){
  await db('nero_recruitment_identity_challenges'+qs+'&attempts=eq.'+row.attempts,{
   method:'PATCH',body:{attempts:Math.min(5,row.attempts+1)},prefer:'return=representation'});
  return json(res,403,{error:'Código inválido ou expirado. Solicite outro código.'});
 }
 const changed=await db('nero_recruitment_identity_challenges'+qs+
  '&verified_at=is.null&code_hash=eq.'+row.code_hash,{
  method:'PATCH',body:{verified_at:new Date().toISOString()},prefer:'return=representation'});
 if(!Array.isArray(changed)||changed.length!==1)return json(res,409,{error:'Código já utilizado'});
 const session=issueSession(c.secret,{guildId,roundId:round.id,userId,closesAt:round.closes_at});
 res.setHeader('Set-Cookie','nero_recruit_session='+encodeURIComponent(session.token)+
  '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age='+session.maxAge);
 // A interface de prova precisa validar este cookie e conferir o estado do recrutamento novamente.
 return json(res,200,{ok:true,verified:true,userId,guildId,message:'ID confirmado. Pronto para participar quando a prova estiver disponível.'});
}
module.exports=async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
 if(!sameOrigin(req))return json(res,403,{error:'Origem não autorizada'});
 let b=req.body;
 if(typeof b==='string'){try{b=JSON.parse(b)}catch{return json(res,400,{error:'JSON inválido'})}}
 if(!b||typeof b!=='object'||Array.isArray(b)||JSON.stringify(b).length>4096)
  return json(res,400,{error:'Requisição inválida'});
 const guildId=String(b.guildId||''),action=String(b.action||'');
 if(!isSnowflake(guildId)||!['start','confirm'].includes(action))
  return json(res,400,{error:'Dados inválidos'});
 const c=configs();
 if(!c.url||!c.key||!c.bot||!c.turnstile||!secretOK(c.secret))
  return json(res,503,{error:'Verificação de identidade indisponível neste momento'});
 try{return action==='start'?await start(req,res,b,guildId,c):await confirm(req,res,b,guildId,c)}
 catch(e){console.error('Identidade Nero:',String(e.message||e).slice(0,100));
  return json(res,503,{error:'Não foi possível concluir a verificação. Tente novamente.'})}
};
