'use strict';
// Mensagem pública fixa e segura. O link é exclusivo do servidor e o site
// verifica o status; o bot nunca recebe provas nem expõe gabaritos no Discord.
const snowflake=v=>typeof v==='string'&&/^\d{15,25}$/.test(v);
const recruitmentUrl=guildId=>{
 if(!snowflake(guildId))throw Error('ID do servidor inválido');
 return 'https://nero-recrutamento.vercel.app/?guild='+guildId;
};
function buildRecruitmentPanel({guildId,guildName='Servidor de RP',guildIcon=null}){
 const url=recruitmentUrl(guildId);
 const name=String(guildName||'Servidor de RP').replace(/[<>@\r\n]/g,'').slice(0,90);
 const embed={
  title:'NERO RECRUTAMENTO',
  description:'**Processo seletivo de '+name+'**\n\nQuer participar? Abra o site pelo botão abaixo para conferir se há recrutamento disponível. Se estiver aberto, você poderá informar seu ID do Discord e responder à prova.\n\n**As inscrições só funcionam enquanto um recrutamento estiver aberto.**',
  color:0xd92649,
  footer:{text:'NERO BOT · Recrutamento por servidor'}
 };
 if(typeof guildIcon==='string'&&/^https:\/\/cdn\.discordapp\.com\/icons\/\d{15,25}\/[a-zA-Z0-9_]+\.(?:png|jpg|webp)(?:\?size=\d+)?$/.test(guildIcon))embed.thumbnail={url:guildIcon};
 return {
  embeds:[embed],
  components:[{type:1,components:[{type:2,style:5,label:'Acessar recrutamento',url}]}],
  allowed_mentions:{parse:[]}
 };
}
function validateChannel(channels,channelId){
 if(!snowflake(channelId)||!Array.isArray(channels)||!channels.some(c=>String(c.id)===channelId&&[0,5].includes(c.type)))throw Error('Canal de recrutamento inválido para este servidor');
 return channelId;
}
// JSON de registro do slash command; o comando só será registrado pelo bot de produção.
const command={name:'painelrecrutamento',description:'Publica o painel do recrutamento no canal escolhido.',type:1,options:[{
 type:7,name:'canal',description:'Canal para publicar o painel de recrutamento',required:true,channel_types:[0,5]
}]};
module.exports={buildRecruitmentPanel,recruitmentUrl,validateChannel,command,snowflake};
