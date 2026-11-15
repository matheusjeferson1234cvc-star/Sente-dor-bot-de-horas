'use strict';
// Endpoint público somente de leitura. Nunca divulga membros, respostas ou segredos.
// Todo recrutamento fica fechado até o fluxo autenticado estar implantado e auditado.
const guildPattern=/^\d{15,25}$/;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const gid=String(req.query?.guild||'');
 if(!guildPattern.test(gid))return res.status(400).json({error:'Servidor inválido'});
 const fallback={guildId:gid,name:'Servidor Discord',iconUrl:null,status:'closed'};
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(200).json(fallback);
 try{
  const headers={apikey:key};
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  const api=new URL('/rest/v1/guild_settings',url);
  api.searchParams.set('guild_id','eq.'+gid);api.searchParams.set('select','name');api.searchParams.set('limit','1');
  const response=await fetch(api,{headers,cache:'no-store',signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error('Supabase '+response.status);
  const rows=await response.json();
  if(!rows.length)return res.status(404).json({error:'Servidor não encontrado'});
  const name=String(rows[0]?.name||'Servidor Discord').slice(0,100);
  let iconUrl=null;
  if(process.env.DISCORD_BOT_TOKEN){
   try{
    const r=await fetch('https://discord.com/api/v10/guilds/'+gid,{headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(4000)});
    if(r.ok){const g=await r.json();if(g.icon&&/^[a-zA-Z0-9_]+$/.test(g.icon))iconUrl='https://cdn.discordapp.com/icons/'+gid+'/'+g.icon+'.png?size=128';}
   }catch{}
  }
  // Só exibir aberto se houver sessão ativa e todo o mecanismo de identidade estiver configurado.
  let status='closed',siteKey=null;
  if(process.env.DISCORD_BOT_TOKEN&&process.env.TURNSTILE_SITE_KEY&&process.env.TURNSTILE_SECRET_KEY&&process.env.NERO_IDENTITY_SECRET?.length>=32){
   try{
    const rounds=new URL('/rest/v1/nero_recruitment_rounds',url);
    rounds.searchParams.set('guild_id','eq.'+gid);
    rounds.searchParams.set('state','eq.open');
    rounds.searchParams.set('select','state,opens_at,closes_at');
    rounds.searchParams.set('order','closes_at.asc');
    rounds.searchParams.set('limit','5');
    const q=await fetch(rounds,{headers,cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(q.ok){
     const now=Date.now(),list=await q.json();
     if(list.some(x=>x.state==='open'&&Date.parse(x.opens_at)<=now&&Date.parse(x.closes_at)>now)){
      status='open';siteKey=process.env.TURNSTILE_SITE_KEY;
     }
    }
   }catch(e){console.warn('Status Nero indisponível:',String(e.message||e).slice(0,80))}
  }
  return res.status(200).json({guildId:gid,name,iconUrl,status,siteKey});
 }catch(err){console.error('Recrutamento - falha na consulta de status:',String(err.message||err).slice(0,90));return res.status(200).json(fallback);}
};
