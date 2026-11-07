const crypto=require('node:crypto');
const cookie=(req,key)=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')))[key];
const json=(res,status,data)=>{res.status(status).setHeader('Cache-Control','no-store');res.json(data)};
const sign=v=>crypto.createHmac('sha256',process.env.SESSION_SECRET||'').update(v).digest('hex');
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y)};
const session=req=>{const raw=cookie(req,'ch_session');if(!raw||!process.env.SESSION_SECRET)return null;const [payload,sig]=raw.split('.');if(!payload||!sig||!same(sign(payload),sig))return null;try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.exp>Date.now()?data:null}catch{return null}};
const db=async(table,options={})=>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Supabase não configurado');
 const headers={apikey:key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'};
 // Chaves sb_secret_ não são JWT e não devem ser enviadas como Bearer.
 if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
 const r=await fetch(`${url}/rest/v1/${table}${options.query||''}`,{method:options.method||'GET',headers,body:options.body?JSON.stringify(options.body):undefined});
 if(!r.ok)throw Error(`Supabase ${r.status}: ${(await r.text()).slice(0,180)}`);
 return r.json();
};
const discord=async(path,token)=>{const r=await fetch(`https://discord.com/api/v10${path}`,{headers:{Authorization:`Bot ${token||process.env.DISCORD_BOT_TOKEN}`}});if(!r.ok)throw Error(`Discord ${r.status}`);return r.json()};
const validDate=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const authorized=async(guild,user)=>{
 if(user.id===process.env.BOT_OWNER_DISCORD_ID)return {view:true,edit:false};
 const g=await discord(`/guilds/${guild}`);if(g.owner_id===user.id)return {view:true,edit:true};
 const member=await discord(`/guilds/${guild}/members/${user.id}`);
 const cfg=await db('guild_settings',{query:`?guild_id=eq.${encodeURIComponent(guild)}&select=roles`});
 const roles=cfg[0]?.roles?.allowed||[];
 return {view:roles.some(x=>member.roles.includes(x)),edit:false};
};
module.exports=async(req,res)=>{
 try{
  const path=req.centralRoute||(req.url||'').split('?')[0].replace(/^\/api\/?/,'');
  if(typeof req.body==='string'){try{req.body=JSON.parse(req.body)}catch{return json(res,400,{error:'JSON inválido'})}}
  if(path==='health')return json(res,200,{ok:true,version:'5.2.0',configured:{supabase:!!(process.env.SUPABASE_URL&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)),discordOAuth:!!(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET&&process.env.DISCORD_REDIRECT_URI&&process.env.SESSION_SECRET),discordBot:!!process.env.DISCORD_BOT_TOKEN,botSync:!!process.env.BOT_SYNC_SECRET}});
  if(path==='bot-sync'){
   if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
   if(!process.env.BOT_SYNC_SECRET||!same(req.headers['x-bot-secret'],process.env.BOT_SYNC_SECRET))return json(res,401,{error:'Não autorizado'});
   const d=req.body||{};
   if(!/^\d{15,25}$/.test(String(d.guildId||'')))return json(res,400,{error:'guildId inválido'});
   const gid=d.guildId;
   if(d.type==='bot-settings'){
    const old=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`});
    await db('guild_settings',{method:'POST',body:{guild_id:gid,name:old[0]?.name||'',roles:old[0]?.roles||{},shift_roles:d.shiftRoles||{},shift_hours:d.shiftHours||{}}});
    return json(res,200,{ok:true});
   }
   if(d.type==='members'){
    if(!Array.isArray(d.members)||d.members.length>50)return json(res,400,{error:'Lote inválido'});
    const rows=d.members.filter(m=>/^\d{15,25}$/.test(String(m.userId))).map(m=>({guild_id:gid,user_id:m.userId,display_name:String(m.displayName||'').slice(0,100),avatar_url:m.avatarUrl||null,role_ids:Array.isArray(m.roleIds)?m.roleIds:[]}));
    if(rows.length)await db('guild_members',{method:'POST',body:rows});
    return json(res,200,{ok:true,count:rows.length});
   }
   if(d.type==='cards'){
    if(!Array.isArray(d.cards)||d.cards.length>50)return json(res,400,{error:'Lote inválido'});
    const rows=d.cards.filter(c=>/^\d{15,25}$/.test(String(c.userId))&&c.cardId&&['Normal','Extra'].includes(c.kind)&&['Ativo','Validado','Cancelado'].includes(c.status)&&['Manhã','Tarde','Noite','Madrugada'].includes(c.shift)&&validDate(c.startedAt)&&(!c.endedAt||validDate(c.endedAt))).map(c=>({guild_id:gid,card_id:String(c.cardId).slice(0,100),user_id:c.userId,shift:c.shift,origin_shift:c.originShift||null,kind:c.kind,status:c.status,started_at:c.startedAt,ended_at:c.endedAt||null,duration_minutes:c.status==='Cancelado'?0:Math.max(0,Math.floor(Number(c.durationMinutes)||0)),cancellation_reason:c.cancellationReason||null}));
    if(rows.length)await db('shift_cards',{method:'POST',body:rows});
    return json(res,200,{ok:true,count:rows.length});
   }
   if(d.type==='guild')await db('guild_settings',{method:'POST',body:{guild_id:gid,name:String(d.name||'').slice(0,120)}});
   else if(d.type==='member'){
    if(!/^\d{15,25}$/.test(String(d.userId||'')))return json(res,400,{error:'userId inválido'});
    await db('guild_members',{method:'POST',body:{guild_id:gid,user_id:d.userId,display_name:String(d.displayName||'').slice(0,100),avatar_url:d.avatarUrl||null,role_ids:Array.isArray(d.roleIds)?d.roleIds:[]}});
   }else if(d.type==='card'){
    if(!/^\d{15,25}$/.test(String(d.userId||''))||!d.cardId)return json(res,400,{error:'Cartão inválido'});
    if(!['Normal','Extra'].includes(d.kind)||!['Ativo','Validado','Cancelado'].includes(d.status)||!['Manhã','Tarde','Noite','Madrugada'].includes(d.shift)||!validDate(d.startedAt)||(d.endedAt&&!validDate(d.endedAt)))return json(res,400,{error:'Estado ou data inválidos'});
    await db('shift_cards',{method:'POST',body:{guild_id:gid,card_id:String(d.cardId).slice(0,100),user_id:d.userId,shift:d.shift,origin_shift:d.originShift||null,kind:d.kind,status:d.status,started_at:d.startedAt,ended_at:d.endedAt||null,duration_minutes:d.status==='Validado'?Math.max(0,Math.floor(Number(d.durationMinutes)||0)):0,cancellation_reason:d.cancellationReason||null}});
   }else return json(res,400,{error:'Evento desconhecido'});
   return json(res,200,{ok:true});
  }
  if(path==='login'){
   if(!process.env.DISCORD_CLIENT_ID||!process.env.DISCORD_CLIENT_SECRET||!process.env.DISCORD_REDIRECT_URI||!process.env.SESSION_SECRET)return json(res,503,{error:'OAuth não configurado'});
   const nonce=crypto.randomBytes(20).toString('hex');
   res.setHeader('Set-Cookie',`ch_state=${nonce}.${sign(nonce)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
   return res.redirect(`https://discord.com/oauth2/authorize?${new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,redirect_uri:process.env.DISCORD_REDIRECT_URI,response_type:'code',scope:'identify',state:nonce})}`);
  }
  if(path==='callback'){
   const state=req.query.state,raw=cookie(req,'ch_state'),[nonce,sig]=(raw||'').split('.');
   if(!nonce||nonce!==state||!same(sign(nonce),sig))return json(res,403,{error:'Estado OAuth inválido'});
   if(typeof req.query?.code!=='string'||!req.query.code)return json(res,400,{error:'Código OAuth ausente'});
   const r=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code:req.query.code,redirect_uri:process.env.DISCORD_REDIRECT_URI})});
   if(!r.ok)return json(res,401,{error:'Login Discord falhou'});
   const token=await r.json();if(!token.access_token)return json(res,401,{error:'Token OAuth inválido'});const profile=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bearer ${token.access_token}`}});if(!profile.ok)return json(res,401,{error:'Não foi possível verificar o usuário Discord'});const u=await profile.json();if(!/^\d{15,25}$/.test(String(u.id||'')))return json(res,401,{error:'Identidade Discord inválida'});
   const payload=Buffer.from(JSON.stringify({id:u.id,name:u.global_name||u.username,exp:Date.now()+86400000})).toString('base64url');
   res.setHeader('Set-Cookie',[`ch_session=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`,'ch_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0']);
   return res.redirect('/');
  }
  if(path==='me')return json(res,200,{user:session(req)});
  if(path==='logout'){if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});res.setHeader('Set-Cookie','ch_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return json(res,200,{ok:true})}
  const user=session(req);if(!user)return json(res,401,{error:'Faça login pelo Discord'});
  if(path==='guilds'){
   // Liste servidores sincronizados pelo bot e filtre por autorização.
   const rows=await db('guild_settings',{query:'?select=guild_id,name'});
   const permitted=[];
   for(const g of rows){try{if((await authorized(g.guild_id,user)).view)permitted.push(g)}catch{}}
   return json(res,200,{guilds:permitted});
  }
  const gid=String(req.query.guildId||'');
  if(!/^\d{15,25}$/.test(gid))return json(res,400,{error:'Servidor inválido'});
  const rights=await authorized(gid,user);if(!rights.view)return json(res,403,{error:'Sem acesso'});
  if(path==='data'&&req.method==='GET'){
   const [members,cards,settings]=await Promise.all([
    db('guild_members',{query:`?guild_id=eq.${gid}&select=*&limit=2000`}),
    db('shift_cards',{query:`?guild_id=eq.${gid}&select=*&order=started_at.desc&limit=3000`}),
    db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`})
   ]);
   return json(res,200,{members,cards,settings:settings[0]||null,canEdit:rights.edit});
  }
  if(path==='roles'&&req.method==='GET'){
   if(!rights.edit)return json(res,403,{error:'Somente o dono do servidor pode escolher cargos'});
   const roles=await discord(`/guilds/${gid}/roles`);
   return json(res,200,{roles:roles.filter(r=>r.id!==gid&&!r.managed).sort((a,b)=>b.position-a.position).map(r=>({id:r.id,name:r.name}))});
  }
  if(path==='settings'&&req.method==='POST'){
   if(!rights.edit)return json(res,403,{error:'Só o dono do servidor configura'});
   const d=req.body||{};
   if(!Array.isArray(d.allowedRoles)||d.allowedRoles.length>100||!d.allowedRoles.every(r=>/^\d{15,25}$/.test(String(r))))return json(res,400,{error:'Cargos inválidos'});
   const guildRoles=await discord(`/guilds/${gid}/roles`);
   const allowed=new Set(guildRoles.filter(r=>!r.managed&&r.id!==gid).map(r=>r.id));
   if(d.allowedRoles.some(r=>!allowed.has(r)))return json(res,400,{error:'Um cargo não pertence a este servidor'});
   const settings=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`});
   if(!settings.length)return json(res,404,{error:'Servidor ainda não foi sincronizado'});
   await db('guild_settings',{method:'POST',body:{guild_id:gid,name:settings[0].name||'',roles:{...(settings[0].roles||{}),allowed:d.allowedRoles},shift_roles:settings[0].shift_roles||{},shift_hours:settings[0].shift_hours||{},updated_at:new Date().toISOString()}});
   return json(res,200,{ok:true});
  }
  return json(res,404,{error:'Rota não encontrada'});
 }catch(e){console.error(e);return json(res,500,{error:'Falha na integração; confira as configurações do servidor'})}
};
