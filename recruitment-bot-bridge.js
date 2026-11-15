'use strict';
// Nero Bot — funções de apoio ao módulo de recrutamento RP (discord.js ou REST).
// A presença de um ID no servidor NÃO comprova que quem digitou seja seu titular.
// NUNCA aplicar cargos ou alterar apelidos apenas pela consulta deste módulo.
const snowflake=value=>typeof value==='string'&&/^\d{15,25}$/.test(value);
const api='https://discord.com/api/v10';
function validGuildMember(guildId,userId){
 if(!snowflake(guildId)||!snowflake(userId))throw Error('IDs Discord inválidos');
}
async function findMember(guildId,userId,{fetchImpl=globalThis.fetch,token=process.env.DISCORD_BOT_TOKEN}={}){
 validGuildMember(guildId,userId);
 if(!token)throw Error('DISCORD_BOT_TOKEN ausente no bot');
 const response=await fetchImpl(api+'/guilds/'+guildId+'/members/'+userId,{
  method:'GET',headers:{Authorization:'Bot '+token,Accept:'application/json'}
 });
 if(response.status===404)return null;
 if(response.status===429)throw Error('Discord limitou a consulta de membros');
 if(!response.ok)throw Error('Discord rejeitou a consulta de membro ('+response.status+')');
 const member=await response.json();
 const user=member?.user||{};
 const name=String(user.global_name||user.username||'Membro Discord').slice(0,80);
 const nickname=String(member.nick||name).slice(0,80);
 const avatarHash=(member.avatar||user.avatar||null);
 const avatarUrl=avatarHash&&/^[a-zA-Z0-9_]+$/.test(avatarHash)?
  (member.avatar?'https://cdn.discordapp.com/guilds/'+guildId+'/users/'+userId+'/avatars/'+avatarHash+'.png?size=128':
  'https://cdn.discordapp.com/avatars/'+userId+'/'+avatarHash+'.png?size=128'):null;
 return {guildId,userId,name,nickname,avatarUrl,found:true,identityVerified:false};
}
function previewApproved({guildId,approved,showScores=false}){
 if(!snowflake(guildId))throw Error('Servidor inválido');
 if(!Array.isArray(approved)||approved.length<1||approved.length>100)throw Error('Lista de aprovados inválida');
 const lines=approved.map((entry,i)=>{
  const userId=String(entry.userId||'');
  if(!snowflake(userId))throw Error('Candidato com ID inválido');
  const nickname=String(entry.nickname||'').trim().replace(/[\r\n<>@]/g,'').slice(0,80);
  if(!nickname)throw Error('Apelido do aprovado obrigatório');
  const suffix=showScores&&Number.isFinite(Number(entry.score))?' · '+Math.max(0,Math.min(100,Number(entry.score)))+'%':'';
  return (i+1)+'. <@'+userId+'> — '+nickname+suffix;
 });
 const text='**NERO RECRUTAMENTO · APROVADOS**\n'+lines.join('\n');
 if(text.length>2000)throw Error('A lista ultrapassou o limite de uma mensagem Discord; revise o lote antes de publicar');
 return {content:text,allowed_mentions:{parse:[],users:approved.map(x=>String(x.userId))},embeds:[]};
}
// A PUBLICAÇÃO E APLICAÇÃO DE CARGOS EXIGEM uma decisão humana autenticada e logada no backend.
// Esta função gera a PRÉVIA, mas NÃO envia a mensagem nem modifica membros.
module.exports={findMember,previewApproved,validGuildMember};
