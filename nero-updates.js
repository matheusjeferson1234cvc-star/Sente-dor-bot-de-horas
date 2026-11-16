'use strict';
const crypto=require('node:crypto');
const validId=value=>typeof value==='string'&&/^\d{15,25}$/.test(value);
const sameOrigin=req=>{
 try{const origin=new URL(String(req.headers.origin||''));return origin.protocol==='https:'&&origin.host===req.headers.host}catch{return false}
};
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max+1):'';
async function discordWrite(method,path,body){
 const response=await fetch('https://discord.com/api/v10'+path,{
  method,headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)
 });
 if(!response.ok){
  const code=response.status;
  const message=code===403?'O Nero precisa de permissão para gerenciar o canal e publicar mensagens':
   code===429?'O Discord limitou o envio. Tente novamente mais tarde':
   'Discord recusou a solicitação (HTTP '+code+')';
  const e=new Error(message);e.status=code;throw e;
 }
 return response.status===204?{}:response.json();
}
module.exports=async({req,res,gid,user,db,json,discord})=>{
 if(!process.env.DISCORD_BOT_TOKEN)return json(res,503,{error:'Discord Bot não configurado'});
 if(req.method==='GET'){
  const [saved,posts,channels]=await Promise.all([
   db('nero_update_settings',{query:'?guild_id=eq.'+gid+'&select=channel_id,updated_at&limit=1'}),
   db('nero_update_posts',{query:'?guild_id=eq.'+gid+'&select=title,body,channel_id,message_id,published_at,published_by&order=published_at.desc&limit=25'}),
   discord('/guilds/'+gid+'/channels')
  ]);
  return json(res,200,{channelId:saved[0]?.channel_id||null,
   channels:channels.filter(x=>(x.type===0||x.type===5)&&validId(String(x.id))).map(x=>({id:x.id,name:x.name})),
   posts:posts.map(x=>({title:x.title,body:x.body,channelId:x.channel_id,messageId:x.message_id,
    publishedAt:x.published_at,publishedBy:x.published_by,
    url:'https://discord.com/channels/'+gid+'/'+x.channel_id+'/'+x.message_id}))});
 }
 if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
 if(!sameOrigin(req))return json(res,403,{error:'Origem inválida'});
 const b=req.body||{},action=String(b.action||''),channels=await discord('/guilds/'+gid+'/channels');
 const target=String(b.channelId||''),matches=x=>String(x.id)===target&&(x.type===0||x.type===5);
 if(action==='save-channel'){
  if(!validId(target)||!channels.some(matches))return json(res,400,{error:'Selecione um canal deste servidor'});
  await db('nero_update_settings',{method:'POST',body:{guild_id:gid,channel_id:target,updated_by:user.id,updated_at:new Date().toISOString()}});
  return json(res,200,{ok:true,channelId:target});
 }
 if(action==='create-channel'){
  let channel=channels.find(x=>x.type===0&&x.name==='atualizacoes-nero');
  if(!channel){
   channel=await discordWrite('POST','/guilds/'+gid+'/channels',{
    type:0,name:'atualizacoes-nero',topic:'Novidades oficiais e histórico de atualizações permanentes do Nero Bot.'
   });
  }
  if(!validId(String(channel.id||'')))return json(res,502,{error:'Discord não confirmou o canal'});
  await db('nero_update_settings',{method:'POST',body:{
   guild_id:gid,channel_id:String(channel.id),updated_by:user.id,updated_at:new Date().toISOString()
  }});
  return json(res,200,{ok:true,channelId:String(channel.id),created:!channels.some(x=>String(x.id)===String(channel.id))});
 }
 if(action==='publish'){
  const title=text(b.title,180),body=text(b.message,3500);
  if(title.length<3||title.length>180||body.length<3||body.length>3500)
   return json(res,400,{error:'Título (3 a 180) e mensagem (3 a 3500) são obrigatórios'});
  const selected=await db('nero_update_settings',{query:'?guild_id=eq.'+gid+'&select=channel_id&limit=1'});
  const channel=String(selected[0]?.channel_id||'');
  if(!validId(channel)||!channels.some(x=>String(x.id)===channel&&(x.type===0||x.type===5)))
   return json(res,409,{error:'Defina o canal permanente de atualizações antes de publicar'});
  const payload={embeds:[{title:'🔴 '+title,description:body,color:0xe32d4d,
   footer:{text:'NERO BOT · Atualizações oficiais permanentes'},timestamp:new Date().toISOString()}],
   allowed_mentions:{parse:[],replied_user:false},nonce:crypto.randomBytes(12).toString('hex')};
  const message=await discordWrite('POST','/channels/'+channel+'/messages',payload);
  const id=String(message.id||'');
  if(!validId(id))return json(res,502,{error:'Discord não confirmou a mensagem'});
  try{
   await db('nero_update_posts',{method:'POST',body:{
    guild_id:gid,channel_id:channel,message_id:id,title,body,published_by:user.id,published_at:new Date().toISOString()
   }});
  }catch(e){
   console.error('Histórico de atualizações Nero:',String(e.message||e).slice(0,90));
   return json(res,207,{ok:true,historySaved:false,url:'https://discord.com/channels/'+gid+'/'+channel+'/'+id,
    warning:'Mensagem enviada, mas o histórico não foi salvo. Não publique novamente sem verificar o canal.'});
  }
  return json(res,200,{ok:true,historySaved:true,url:'https://discord.com/channels/'+gid+'/'+channel+'/'+id,messageId:id});
 }
 return json(res,400,{error:'Ação desconhecida'});
};
