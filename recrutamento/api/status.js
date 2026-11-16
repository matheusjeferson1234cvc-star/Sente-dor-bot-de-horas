'use strict';
// Endpoint público somente de leitura. Nunca divulga membros, respostas ou segredos.
// Todo recrutamento fica fechado até o fluxo autenticado estar implantado e auditado.
const guildPattern=/^\d{15,25}$/;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const gid=String(req.query?.guild||'');
 if(!guildPattern.test(gid))return res.status(400).json({error:'Servidor inválido'});
 const fallback={guildId:gid,name:'Servidor Discord',iconUrl:null,bannerUrl:null,accentColor:null,status:'closed'};
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
  let name=String(rows[0]?.name||'Servidor Discord').slice(0,100);
  let iconUrl=null,bannerUrl=null,accentColor=null;
  if(process.env.DISCORD_BOT_TOKEN){
   try{
    const r=await fetch('https://discord.com/api/v10/guilds/'+gid,{headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(4000)});
    if(r.ok){
     const g=await r.json();
     // Usa somente imagens oficiais CDN do servidor, não URLs arbitrárias enviadas pelo visitante.
     if(typeof g.name==='string'&&g.name.trim())name=g.name.trim().slice(0,100);
     if(g.icon&&/^[a-zA-Z0-9_]+$/.test(g.icon)){
      const ext=g.icon.startsWith('a_')?'gif':'png';
      iconUrl='https://cdn.discordapp.com/icons/'+gid+'/'+g.icon+'.'+ext+'?size=256';
     }
     if(g.banner&&/^[a-zA-Z0-9_]+$/.test(g.banner)){
      const ext=g.banner.startsWith('a_')?'gif':'png';
      bannerUrl='https://cdn.discordapp.com/banners/'+gid+'/'+g.banner+'.'+ext+'?size=1024';
     }else if(g.splash&&/^[a-zA-Z0-9_]+$/.test(g.splash)){
      bannerUrl='https://cdn.discordapp.com/splashes/'+gid+'/'+g.splash+'.png?size=1024';
     }
     // Discord não possui uma cor única obrigatória para servidores. Usa o cargo colorido mais alto.
     const colored=(Array.isArray(g.roles)?g.roles:[]).filter(role=>Number.isInteger(role.color)&&role.color>0&&role.color<=0xffffff);
     colored.sort((a,b)=>(Number(b.position)||0)-(Number(a.position)||0));
     const color=Number.isInteger(g.accent_color)&&g.accent_color>0?g.accent_color:colored[0]?.color;
     if(Number.isInteger(color)&&color>0&&color<=0xffffff)accentColor='#'+color.toString(16).padStart(6,'0');
    }
   }catch{}
  }
  // Só exibir aberto se houver sessão ativa e todo o mecanismo de identidade estiver configurado.
  let status='closed',siteKey=null,durationMinutes=null;
  if(process.env.NERO_PUBLIC_EXAM_ENABLED==='true'&&process.env.DISCORD_BOT_TOKEN&&process.env.TURNSTILE_SITE_KEY&&process.env.TURNSTILE_SECRET_KEY&&process.env.NERO_IDENTITY_SECRET?.length>=32){
   try{
    const rounds=new URL('/rest/v1/nero_recruitment_rounds',url);
    rounds.searchParams.set('guild_id','eq.'+gid);
    rounds.searchParams.set('state','eq.open');
    rounds.searchParams.set('select','kind,state,opens_at,closes_at');
    rounds.searchParams.set('order','closes_at.asc');
    rounds.searchParams.set('limit','5');
    const q=await fetch(rounds,{headers,cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(q.ok){
     const now=Date.now(),list=await q.json();
     const active=list.find(x=>x.state==='open'&&Date.parse(x.opens_at)<=now&&Date.parse(x.closes_at)>now);
     if(active){
      status='open';siteKey=process.env.TURNSTILE_SITE_KEY;durationMinutes=30;
      if(active.kind==='policia'||active.kind==='organizacao'){
       try{
        const configUrl=new URL('/rest/v1/nero_recruitment_templates',url);
        configUrl.searchParams.set('guild_id','eq.'+gid);
        configUrl.searchParams.set('kind','eq.'+active.kind);
        configUrl.searchParams.set('select','config');
        configUrl.searchParams.set('limit','1');
        const conf=await fetch(configUrl,{headers,cache:'no-store',signal:AbortSignal.timeout(3500)});
        if(conf.ok){
         const data=await conf.json(),minutes=Number(data[0]?.config?.durationMinutes);
         if(Number.isInteger(minutes)&&minutes>=5&&minutes<=180)durationMinutes=minutes;
        }
       }catch{}
      }
     }
    }
   }catch(e){console.warn('Status Nero indisponível:',String(e.message||e).slice(0,80))}
  }
  return res.status(200).json({guildId:gid,name,iconUrl,bannerUrl,accentColor,status,siteKey,durationMinutes});
 }catch(err){console.error('Recrutamento - falha na consulta de status:',String(err.message||err).slice(0,90));return res.status(200).json(fallback);}
};
