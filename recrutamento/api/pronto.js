'use strict';
// Verificação sem segredos: indica se o site está preparado para aceitar inscrições.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const env=process.env,missing=[];
 if(env.NERO_PUBLIC_EXAM_ENABLED!=='true')missing.push('NERO_PUBLIC_EXAM_ENABLED=true');
 if(!env.SUPABASE_URL)missing.push('SUPABASE_URL');
 if(!env.SUPABASE_SECRET_KEY&&!env.SUPABASE_SERVICE_ROLE_KEY)missing.push('SUPABASE_SECRET_KEY');
 if(!env.DISCORD_BOT_TOKEN)missing.push('DISCORD_BOT_TOKEN');
 if(!env.NERO_IDENTITY_SECRET||env.NERO_IDENTITY_SECRET.length<32)missing.push('NERO_IDENTITY_SECRET');
 if(!env.TURNSTILE_SITE_KEY)missing.push('TURNSTILE_SITE_KEY');
 if(!env.TURNSTILE_SECRET_KEY)missing.push('TURNSTILE_SECRET_KEY');
 if(missing.length)return res.status(200).json({ready:false,missing});
 try{
  const headers={apikey:env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY};
  if(!headers.apikey.startsWith('sb_secret_'))headers.Authorization='Bearer '+headers.apikey;
  const url=new URL('/rest/v1/nero_recruitment_rounds?select=id&limit=0',env.SUPABASE_URL);
  const [db,bot]=await Promise.all([
   fetch(url,{headers,signal:AbortSignal.timeout(5000),cache:'no-store'}),
   fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bot '+env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(5000),cache:'no-store'})
  ]);
  if(!db.ok)missing.push('Supabase: tabela de recrutamentos/credencial');
  if(!bot.ok)missing.push('Discord: token do bot');
 }catch(e){missing.push('Conexão ao Supabase ou Discord indisponível');}
 return res.status(200).json({ready:missing.length===0,missing});
};
