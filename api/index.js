const warningDecision=require('../warning-decision');
const botSchema=require('../bot-config-schema');
const shiftAccess=require('../shift-access');
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
const missingSchema=e=>/PGRST205|PGRST204|42P01|42703|could not find the table|schema cache|does not exist|column .* does not exist/i.test(String(e?.message||e));
const supplemental=async(table,query,missing)=>{try{return await db(table,{query})}catch(e){if(!missingSchema(e))throw e;missing.push(table);return []}};
const discord=async(path,token)=>{const r=await fetch(`https://discord.com/api/v10${path}`,{headers:{Authorization:`Bot ${token||process.env.DISCORD_BOT_TOKEN}`}});if(!r.ok)throw Error(`Discord ${r.status}`);return r.json()};
// Diagnóstico da integração, sem expor segredos aos usuários.
const editorDbError=(res,e)=>{
 if(missingSchema(e))return json(res,409,{code:'BOT_CONFIG_SCHEMA_MISSING',error:'O Supabase está sem colunas da configuração do bot. Execute a atualização SQL v5.8 (bot_config e revisões) no projeto certo.'});
 console.error('Configurações do bot / Supabase:',e);
 return json(res,503,{code:'BOT_CONFIG_DATABASE_UNAVAILABLE',error:'Não foi possível ler as configurações no Supabase. Confira as variáveis SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel e os logs da implantação.'});
};
const editorDiscordError=(res,e)=>{
 const status=Number(String(e?.message||'').match(/Discord (\d{3})/)?.[1]||0);
 if(status===401)return json(res,503,{code:'DISCORD_BOT_TOKEN_INVALID',error:'O Discord rejeitou o token do bot (401). Atualize DISCORD_BOT_TOKEN na Vercel com o token do mesmo bot instalado no servidor e faça Redeploy.'});
 if(status===403||status===404)return json(res,503,{code:'DISCORD_BOT_NO_GUILD_ACCESS',error:'O bot não conseguiu acessar os cargos e canais deste servidor no Discord. Confira se o bot correto está no servidor selecionado.'});
 if(status===429)return json(res,503,{code:'DISCORD_RATE_LIMIT',error:'O Discord limitou temporariamente a consulta. Aguarde um pouco e tente novamente.'});
 console.error('Configurações do bot / Discord:',e);
 return json(res,503,{code:'DISCORD_API_UNAVAILABLE',error:'Não foi possível consultar cargos e canais no Discord. Confira o token do bot e a conexão da Vercel.'});
};
const editorDiscordResources=async(gid)=>Promise.all([discord(`/guilds/${gid}/roles`),discord(`/guilds/${gid}/channels`)]);
const validDate=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const SHIFT=['manha','tarde','noite','madrugada','all'];
const safeTimeOff=input=>{
 if(!input||typeof input!=='object')throw Error('Folgas inválidas');
 const weekly={};for(const shift of SHIFT){const days=input.weekly?.[shift]||[];
  if(!Array.isArray(days)||days.length>7||!days.every(d=>Number.isInteger(d)&&d>=0&&d<=6))throw Error('Dias semanais inválidos');
  weekly[shift]=[...new Set(days)];}
 const dates=input.dates||[];if(!Array.isArray(dates)||dates.length>150||dates.some(d=>!d||!validDay(d.date)||!SHIFT.includes(d.shift)))throw Error('Datas de folga inválidas');
 return {weekly,dates:[...new Map(dates.map(d=>[d.date+':'+d.shift,{date:d.date,shift:d.shift}])).values()]};
};
const authorized=async(guild,user)=>{
 const globalOwner=!!process.env.BOT_OWNER_DISCORD_ID&&user.id===process.env.BOT_OWNER_DISCORD_ID;
 const ownerCanEdit=globalOwner&&(process.env.BOT_OWNER_EDIT_GUILDS||'').split(/[\s,;]+/).includes(guild);
 // O dono global pode consultar sem token; ele não recebe edição irrestrita.
 if(globalOwner&&!process.env.DISCORD_BOT_TOKEN)return {view:true,edit:false,accessReason:'discord-bot-not-configured'};
 let info;
 try{info=await discord(`/guilds/${guild}`)}catch(e){if(globalOwner)return {view:true,edit:false,accessReason:'discord-unavailable'};throw e}
 if(info.owner_id===user.id)return {view:true,edit:true,accessReason:'guild-owner'};
 // Discord: permissão ADMINISTRATOR = bit 0x8. Não confiar em nome de cargo,
 // dados do navegador nem em claims enviados na sessão OAuth.
 // O bot consulta diretamente os cargos reais do membro e as permissões reais.
 try{
  const [member,guildRoles]=await Promise.all([
   discord(`/guilds/${guild}/members/${user.id}`),
   Array.isArray(info.roles)?Promise.resolve(info.roles):discord(`/guilds/${guild}/roles`)
  ]);
  const owned=new Set([guild,...(member.roles||[])]); // inclui @everyone
  const admin=guildRoles.some(r=>{
   if(!owned.has(r.id))return false;
   try{return (BigInt(r.permissions||'0')&8n)!==0n}catch{return false}
  });
  if(admin)return {view:true,edit:true,accessReason:'discord-administrator'};
  if(globalOwner)return {view:true,edit:ownerCanEdit,scope:'full',accessReason:ownerCanEdit?'bot-owner-authorized':'bot-owner-readonly'};
  const cfg=await db('guild_settings',{query:`?guild_id=eq.${encodeURIComponent(guild)}&select=roles,bot_config`});
  // O responsável de turno pode consultar o site, mas SOMENTE seu turno.
  // A atribuição vem dos cargos atuais do Discord, nunca de parâmetros do navegador.
  const supervised=shiftAccess.forSupervisor(cfg[0]?.bot_config,member.roles||[]);
  if(supervised.length)return {view:true,edit:false,scope:'shift',allowedShifts:supervised,accessReason:'shift-supervisor'};
  const allowed=cfg[0]?.roles?.allowed||[];
  const explicit=Array.isArray(allowed)&&allowed.some(id=>owned.has(id));
  return {view:explicit,edit:false,scope:'full',accessReason:explicit?'member-readonly':'not-authorized'};
 }catch(e){
  // Continua permitindo acesso de teste explicitamente autorizado ao dono global.
  if(globalOwner)return {view:true,edit:ownerCanEdit,accessReason:ownerCanEdit?'bot-owner-authorized':'bot-owner-readonly'};
  throw e;
 }
};
module.exports=async(req,res)=>{
 try{
  const path=req.centralRoute||req.query?.centralRoute||(req.url||'').split('?')[0].replace(/^\/api\/?/,'');
  if(typeof req.body==='string'){try{req.body=JSON.parse(req.body)}catch{return json(res,400,{error:'JSON inválido'})}}
  if(path==='health'){
   const configured={supabase:!!(process.env.SUPABASE_URL&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)),discordOAuth:!!(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET&&process.env.DISCORD_REDIRECT_URI&&process.env.SESSION_SECRET),discordBot:!!process.env.DISCORD_BOT_TOKEN,botSync:!!process.env.BOT_SYNC_SECRET};
   const result={ok:true,version:'5.9.0',configured};
   if(req.query?.check==='database'){
    if(!configured.supabase)return json(res,200,{...result,database:{ready:false,message:'Configurar SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel'}});
    const names=['guild_settings','guild_members','shift_cards','attendance_days','absence_justifications','attendance_warnings'];
    const checks=await Promise.all(names.map(async name=>{try{await db(name,{query:'?select=*&limit=0'});return [name,true]}catch(e){return [name,false]}}));
    let botConfigReady=false;
    try{await db('guild_settings',{query:'?select=bot_config,bot_config_revision,bot_config_applied_revision,bot_config_applied_at&limit=0'});botConfigReady=true}catch{}
    result.database={ready:checks.every(x=>x[1])&&botConfigReady,tables:Object.fromEntries(checks),botConfigReady};
   }
   return json(res,200,result);
  }
  if(path==='bot-config'&&req.query?.scope!=='editor'){
   if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
   if(!process.env.BOT_SYNC_SECRET||!same(req.headers['x-bot-secret'],process.env.BOT_SYNC_SECRET))return json(res,401,{error:'Não autorizado'});
   const guildId=String(req.query?.guildId||'');if(!/^\d{15,25}$/.test(guildId))return json(res,400,{error:'Servidor inválido'});
   const rows=await db('guild_settings',{query:`?guild_id=eq.${guildId}&select=time_off,point_mode,bot_config,bot_config_revision`});
   const [days,justifications,warnings]=await Promise.all([
    db('attendance_days',{query:`?guild_id=eq.${guildId}&select=day,user_id,shift,status&order=day.desc&limit=4000`}),
    db('absence_justifications',{query:`?guild_id=eq.${guildId}&select=day,user_id,shift,status&order=day.desc&limit=2000`}),
    db('attendance_warnings',{query:`?guild_id=eq.${guildId}&select=day,user_id,level&order=day.desc&limit=2000`})
   ]);
   const timeOff=rows[0]?.time_off||{weekly:{all:[0]},dates:[]};
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   return json(res,200,{timeOff,pointMode:rows[0]?.point_mode||'team',botConfig:rows[0]?.bot_config||null,configRevision:rows[0]?.bot_config_revision||0,warningApprovals:warningDecision.evaluate({days,justifications,warnings,timeOff,today})});
  }
  if(path==='bot-sync'){
   if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
   if(!process.env.BOT_SYNC_SECRET||!same(req.headers['x-bot-secret'],process.env.BOT_SYNC_SECRET))return json(res,401,{error:'Não autorizado'});
   const d=req.body||{};
   if(!/^\d{15,25}$/.test(String(d.guildId||'')))return json(res,400,{error:'guildId inválido'});
   const gid=d.guildId;
   if(d.type==='config-ack'){
    const revision=Number(d.revision);
    if(!Number.isInteger(revision)||revision<0)return json(res,400,{error:'Revisão inválida'});
    // O bot só pode confirmar a revisão que está armazenada. Nunca criar
    // uma confirmação para uma configuração que não foi salva pelo site.
    const current=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=bot_config_revision,bot_config_applied_revision`});
    if(!current.length||current[0].bot_config_revision!==revision)return json(res,409,{error:'Revisão desatualizada'});
    if((current[0].bot_config_applied_revision||0)<=revision){
     await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}&bot_config_revision=eq.${revision}`,body:{bot_config_applied_revision:revision,bot_config_applied_at:new Date().toISOString()}});
    }
    return json(res,200,{ok:true});
   }
   if(d.type==='bot-settings'){
    const old=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`});
    // O site é a fonte das configurações após a primeira inicialização.
    // O bot NÃO substitui uma revisão configurada pela administração no site.
    const syncPatch={shift_roles:d.shiftRoles||{},shift_hours:d.shiftHours||{},point_mode:d.pointMode==='individual'?'individual':'team',updated_at:new Date().toISOString()};
    if(old.length){
     if(!old[0].bot_config&&d.fullConfig){
      try{syncPatch.bot_config=botSchema.normalize(d.fullConfig)}catch(e){console.warn('Configuração inicial ignorada:',e.message)}
     }
     await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}`,body:syncPatch});
    }else{
     const first={guild_id:gid,name:'',...syncPatch};
     if(d.fullConfig)try{first.bot_config=botSchema.normalize(d.fullConfig)}catch(e){console.warn('Configuração inicial ignorada:',e.message)}
     await db('guild_settings',{method:'POST',body:first});
    }
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
   if(d.type==='attendance'){
    if(!Array.isArray(d.days)||d.days.length>50)return json(res,400,{error:'Lote inválido'});
    const rows=d.days.filter(x=>/^\d{15,25}$/.test(String(x.userId))&&validDay(x.date)&&['manha','tarde','noite','madrugada'].includes(x.shift)&&['cumpriu','incompleta','falta','folga','justificada','pendente'].includes(x.status)).map(x=>({guild_id:gid,day:x.date,user_id:x.userId,shift:x.shift,status:x.status,minutes:Math.max(0,Math.floor(Number(x.minutes)||0))}));
    if(rows.length)await db('attendance_days',{method:'POST',body:rows});return json(res,200,{ok:true,count:rows.length});
   }
   if(d.type==='justifications'){
    if(!Array.isArray(d.justifications)||d.justifications.length>50)return json(res,400,{error:'Lote inválido'});
    const rows=d.justifications.filter(x=>/^\d{15,25}$/.test(String(x.userId))&&validDay(x.date)&&['manha','tarde','noite','madrugada'].includes(x.shift)&&['pending','approved','rejected'].includes(x.status)&&x.id).map(x=>({guild_id:gid,id:String(x.id).slice(0,40),user_id:x.userId,shift:x.shift,day:x.date,reason:String(x.reason).slice(0,600),status:x.status,created_at:new Date(x.at).toISOString(),decided_at:x.decidedAt?new Date(x.decidedAt).toISOString():null,reviewer_id:x.reviewerId||null}));
    if(rows.length)await db('absence_justifications',{method:'POST',body:rows});return json(res,200,{ok:true,count:rows.length});
   }
   if(d.type==='warnings'){
    if(!Array.isArray(d.warnings)||d.warnings.length>50)return json(res,400,{error:'Lote inválido'});
    const rows=d.warnings.filter(x=>/^\d{15,25}$/.test(String(x.userId))&&validDay(x.date)&&['manha','tarde','noite','madrugada'].includes(x.shift)&&['active','revoked'].includes(x.status)&&Number.isInteger(x.level)&&x.level>=1&&x.level<=3&&x.id).map(x=>({guild_id:gid,id:String(x.id).slice(0,40),user_id:x.userId,shift:x.shift,day:x.date,level:x.level,status:x.status,reason:String(x.reason||'').slice(0,500),created_at:new Date(x.at).toISOString(),revoked_at:x.revokedAt?new Date(x.revokedAt).toISOString():null,revoked_by:x.revokedBy||null}));
    if(rows.length)await db('attendance_warnings',{method:'POST',body:rows});return json(res,200,{ok:true,count:rows.length});
   }
   if(d.type==='guild'){
    const old=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=guild_id`});
    if(old.length)await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}`,body:{name:String(d.name||'').slice(0,120)}});
    else await db('guild_settings',{method:'POST',body:{guild_id:gid,name:String(d.name||'').slice(0,120)}});
   }
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
  if(path==='invite'){
   if(req.method!=='GET')return json(res,405,{error:'Método não permitido'});
   // ID público da aplicação: o token do bot nunca vai para o navegador.
   const appId=String(process.env.DISCORD_BOT_CLIENT_ID||process.env.DISCORD_CLIENT_ID||'').trim();
   if(!/^\d{15,25}$/.test(appId))return json(res,503,{error:'Convite indisponível. Configure DISCORD_BOT_CLIENT_ID ou DISCORD_CLIENT_ID na Vercel.'});
   // Manage Roles, View Channel, Send Messages, Manage Messages, Embed Links,
   // Attach Files e Read Message History; sem exigir Administrator.
   const requested=String(process.env.DISCORD_BOT_INVITE_PERMISSIONS||'268561408');
   const permissions=/^\d{1,20}$/.test(requested)?requested:'268561408';
   const link=new URL('https://discord.com/oauth2/authorize');
   link.search=new URLSearchParams({client_id:appId,scope:'bot applications.commands',permissions,integration_type:'0'}).toString();
   res.statusCode=302;
   res.setHeader('Cache-Control','no-store');
   res.setHeader('Location',link.toString());
   return res.end();
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
   const missing=[];
   const [members,cards,settings,attendance,justifications,warnings]=await Promise.all([
    db('guild_members',{query:`?guild_id=eq.${gid}&select=*&limit=2000`}),
    db('shift_cards',{query:`?guild_id=eq.${gid}&select=*&order=started_at.desc&limit=3000`}),
    db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`}),
    supplemental('attendance_days',`?guild_id=eq.${gid}&select=*&order=day.desc&limit=3000`,missing),
    supplemental('absence_justifications',`?guild_id=eq.${gid}&select=*&order=created_at.desc&limit=800`,missing),
    supplemental('attendance_warnings',`?guild_id=eq.${gid}&select=*&order=created_at.desc&limit=800`,missing)
   ]);
   const oldSettings=settings[0]||null;
   if(oldSettings&&(!('time_off' in oldSettings)||!('point_mode' in oldSettings)))missing.push('guild_settings: folgas e modo');
   const payload={members,cards,settings:oldSettings,attendance,justifications,warnings,missingSchema:missing,canEdit:rights.edit,accessReason:rights.accessReason||'unknown',isBotOwner:user.id===process.env.BOT_OWNER_DISCORD_ID,viewScope:rights.scope||'full',allowedShifts:rights.allowedShifts||[]};
   return json(res,200,rights.scope==='shift'?shiftAccess.scopeData(payload,rights.allowedShifts):payload);
  }
  if(path==='warnings-preview'&&req.method==='GET'){
   if(user.id!==process.env.BOT_OWNER_DISCORD_ID&&!rights.edit)return json(res,403,{error:'Somente o dono ou Administrador do Discord pode simular a avaliação'});
   const [settings,days,justifications,warnings]=await Promise.all([
    db('guild_settings',{query:`?guild_id=eq.${gid}&select=time_off`}),
    db('attendance_days',{query:`?guild_id=eq.${gid}&select=day,user_id,shift,status&order=day.desc&limit=4000`}),
    db('absence_justifications',{query:`?guild_id=eq.${gid}&select=day,user_id,shift,status&order=day.desc&limit=2000`}),
    db('attendance_warnings',{query:`?guild_id=eq.${gid}&select=day,user_id,level&order=day.desc&limit=2000`})
   ]);
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const approvals=warningDecision.evaluate({days,justifications,warnings,timeOff:settings[0]?.time_off||{},today});
   return json(res,200,{ok:true,dryRun:true,approvals,scanned:days.length,warning:'Esta simulação não altera cargos, registros nem envia avisos.'});
  }
  if(path==='bot-config'&&req.query?.scope==='editor'){
   if(!rights.edit)return json(res,403,{error:'Somente o dono ou Administrador do Discord pode consultar ou editar configurações gerais do bot'});
   let stored;
   try{stored=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=bot_config,bot_config_revision,bot_config_applied_revision,bot_config_applied_at`})}
   catch(e){return editorDbError(res,e)}
   if(!stored.length)return json(res,404,{code:'GUILD_NOT_SYNCED',error:'Servidor ainda não sincronizado pelo bot. Confira BOT_SYNC_SECRET no bot e na Vercel.'});
   const config=stored[0];
   if(!process.env.DISCORD_BOT_TOKEN)return json(res,503,{code:'DISCORD_BOT_TOKEN_MISSING',error:'Falta DISCORD_BOT_TOKEN nas variáveis da Vercel. Configure o token do bot, faça Redeploy e tente novamente.'});
   if(req.method==='GET'){
    let roles,channels;
    try{[roles,channels]=await editorDiscordResources(gid)}catch(e){return editorDiscordError(res,e)}
    return json(res,200,{config:config.bot_config?botSchema.normalize(config.bot_config):null,canEdit:rights.edit,revision:config.bot_config_revision||0,appliedRevision:config.bot_config_applied_revision||0,appliedAt:config.bot_config_applied_at||null,
     roles:roles.filter(r=>r.id!==gid&&!r.managed).map(r=>({id:r.id,name:r.name,position:r.position})).sort((a,b)=>b.position-a.position),
     channels:channels.filter(c=>[0,5].includes(c.type)).map(c=>({id:c.id,name:c.name}))});
   }
   if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
   if(req.headers.origin&&req.headers.host){try{if(new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Origem não autorizada'})}catch{return json(res,403,{error:'Origem inválida'})}}
   const payload=req.body||{};
   if(!Number.isInteger(payload.revision)||payload.revision!==(config.bot_config_revision||0))return json(res,409,{error:'Configurações alteradas em outra sessão. Recarregue antes de salvar.'});
   let normalized;
   try{normalized=botSchema.normalize(payload.config)}catch(e){return json(res,400,{error:e.message})}
   let roles,channels;
    try{[roles,channels]=await editorDiscordResources(gid)}catch(e){return editorDiscordError(res,e)}
   try{botSchema.assertResources(normalized,roles,channels,gid)}catch(e){return json(res,400,{error:e.message})}
   const patch=await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}&bot_config_revision=eq.${payload.revision}`,body:{bot_config:normalized,bot_config_revision:payload.revision+1,updated_at:new Date().toISOString()}});
   if(!patch.length)return json(res,409,{error:'Configuração desatualizada. Atualize a página e tente novamente.'});
   return json(res,200,{ok:true,revision:payload.revision+1,applied:false,message:'Salvo. O bot aplicará após a próxima sincronização.'});
  }
  if(path==='roles'&&req.method==='GET'){
   if(!rights.edit)return json(res,403,{error:'Somente o dono ou Administrador do Discord pode escolher cargos'});
   const roles=await discord(`/guilds/${gid}/roles`);
   return json(res,200,{roles:roles.filter(r=>r.id!==gid&&!r.managed).sort((a,b)=>b.position-a.position).map(r=>({id:r.id,name:r.name}))});
  }
  if(path==='time-off'&&req.method==='POST'){
   if(!rights.edit)return json(res,403,{error:'Somente o dono ou Administrador do Discord pode configurar folgas'});
   const timeOff=safeTimeOff(req.body||{});
   // PATCH is intentional: do not overwrite bot settings, roles or guild name.
   await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}`,body:{time_off:timeOff,updated_at:new Date().toISOString()}});
   return json(res,200,{ok:true,timeOff});
  }
  if(path==='settings'&&req.method==='POST'){
   if(!rights.edit)return json(res,403,{error:'Somente o dono ou Administrador do Discord pode configurar'});
   const d=req.body||{};
   if(!Array.isArray(d.allowedRoles)||d.allowedRoles.length>100||!d.allowedRoles.every(r=>/^\d{15,25}$/.test(String(r))))return json(res,400,{error:'Cargos inválidos'});
   const guildRoles=await discord(`/guilds/${gid}/roles`);
   const allowed=new Set(guildRoles.filter(r=>!r.managed&&r.id!==gid).map(r=>r.id));
   if(d.allowedRoles.some(r=>!allowed.has(r)))return json(res,400,{error:'Um cargo não pertence a este servidor'});
   const settings=await db('guild_settings',{query:`?guild_id=eq.${gid}&select=*`});
   if(!settings.length)return json(res,404,{error:'Servidor ainda não foi sincronizado'});
   await db('guild_settings',{method:'PATCH',query:`?guild_id=eq.${gid}`,body:{roles:{...(settings[0].roles||{}),allowed:d.allowedRoles},updated_at:new Date().toISOString()}});
   return json(res,200,{ok:true});
  }
  return json(res,404,{error:'Rota não encontrada'});
 }catch(e){console.error(e);return json(res,500,{error:'Falha na integração; confira as configurações do servidor'})}
};
