'use strict';
const {validId,signed,unpack,getCookie,cookie,redirectUri}=require('../lib/oauth-core');
const discord='https://discord.com/api/v10';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const state=unpack('oauth-state',getCookie(req,'nero_oauth_state'));
 if(!state||!validId(state.guildId)||!req.query?.state||state.state!==req.query.state)
  return res.status(403).json({error:'Login expirado. Volte ao site e entre novamente'});
 res.setHeader('Set-Cookie',cookie('nero_oauth_state','',0));
 const code=String(req.query?.code||'');
 if(!code||code.length>500)return res.redirect('/?guild='+state.guildId+'&auth=cancelled');
 try{
  const redirect=redirectUri(req);
  const tokenResponse=await fetch(discord+'/oauth2/token',{method:'POST',
   headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,
    grant_type:'authorization_code',code,redirect_uri:redirect}),signal:AbortSignal.timeout(8000)});
  if(!tokenResponse.ok)throw Error('Discord OAuth '+tokenResponse.status);
  const token=await tokenResponse.json();
  if(!token.access_token||token.token_type?.toLowerCase()!=='bearer')throw Error('Token inválido');
  const profileResponse=await fetch(discord+'/users/@me',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(7000)});
  if(!profileResponse.ok)throw Error('Não foi possível validar conta Discord');
  const profile=await profileResponse.json(),id=String(profile.id||'');
  if(!validId(id))throw Error('Identidade inválida');
  // OAuth identifica a pessoa; o bot confirma presença na organização antes de conceder sessão.
  const membership=await fetch(discord+'/guilds/'+state.guildId+'/members/'+id,{
   headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(7000)});
  if(!membership.ok){
   if(membership.status===404)return res.redirect('/?guild='+state.guildId+'&auth=not-member');
   throw Error('Verificação do servidor '+membership.status);
  }
  const exp=Date.now()+24*60*60*1000;
  const name=String(profile.global_name||profile.username||'Candidato').slice(0,80);
  const avatar=typeof profile.avatar==='string'&&/^[a-zA-Z0-9_]+$/.test(profile.avatar)?profile.avatar:null;
  const payload=signed('candidate',{id,name,avatar,guildId:state.guildId,exp});
  res.setHeader('Set-Cookie',[cookie('nero_oauth_state','',0),cookie('nero_oauth_session',payload,86400)]);
  return res.redirect('/?guild='+state.guildId+'&auth=connected');
 }catch(e){console.error('Nero OAuth:',String(e.message||e).slice(0,100));return res.redirect('/?guild='+state.guildId+'&auth=error')}
};
