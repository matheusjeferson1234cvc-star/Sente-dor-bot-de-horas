'use strict';
// Nero Recrutamento — painel Discord Components V2, isolado por servidor.
// Publicar o painel nunca abre inscrições.
const V2_FLAG=1<<15;
const BUTTON_MY_ID='nero:recruit:my-id';
function recruitmentUrl(guildId,baseUrl='https://nero-recrutamento.vercel.app/'){
 if(typeof guildId!=='string'||!/^\d{15,25}$/.test(guildId))throw Error('ID do servidor inválido');
 const url=new URL(baseUrl);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Endereço do recrutamento deve usar HTTPS');
 url.search='';url.hash='';url.searchParams.set('guild',guildId);
 return url.toString();
}
function safeImageUrl(value,fallback){
 const str=String(value||'').trim();
 if(!str)return fallback;
 const url=new URL(str);
 if(url.protocol!=='https:'||url.username||url.password||!url.pathname.toLowerCase().endsWith('.gif'))
  throw Error('GIF deve usar HTTPS e terminar em .gif');
 return url.toString();
}
function recruitmentPayload(guildId,guildName,baseUrl,options={}){
 const url=recruitmentUrl(guildId,baseUrl);
 const results=new URL(url);results.searchParams.set('tab','aprovados');
 const name=String(guildName||'Servidor Discord').replace(/[\r\n<>@\x60*_~|]/g,'').trim().slice(0,90)||'Servidor Discord';
 const duration=Number(options.durationMinutes??30);
 if(!Number.isInteger(duration)||duration<5||duration>180)throw Error('Tempo de prova inválido');
 const banner=safeImageUrl(options.gifUrl,new URL('/nero-loop.gif',url).toString());
 const emojiId=String(options.animatedEmojiId||'');
 const emojiName=String(options.animatedEmojiName||'');
 const animated=/^\d{15,25}$/.test(emojiId)&&/^[a-zA-Z0-9_]{2,32}$/.test(emojiName);
 const star=animated?'<a:'+emojiName+':'+emojiId+'>':'✨';
 const buttonEmoji=(fallback)=>animated?{id:emojiId,name:emojiName,animated:true}:{name:fallback};
 return {
  flags:V2_FLAG,
  components:[{
   type:17,accent_color:0xC71E44,
   components:[
    {type:10,content:star+' **NERO BOT · RECRUTAMENTO** '+star+'\n## '+name},
    {type:12,items:[{media:{url:banner},description:'Banner animado do Nero Recrutamento'}]},
    {type:10,content:'📝 **Prova RP** · ⏱️ Duração prevista: **'+duration+' minutos**\n'+
      '🔐 O recrutamento só recebe respostas quando for aberto por um recrutador autorizado.\n'+
      '🏆 Os aprovados são exibidos depois da revisão e publicação oficial.'},
    {type:1,components:[
      {type:2,style:5,label:'Participar da prova',url,emoji:buttonEmoji('📝')},
      {type:2,style:2,label:'Pegar meu ID',custom_id:BUTTON_MY_ID,emoji:{name:'🪪'}},
      {type:2,style:5,label:'Aprovados',url:results.toString(),emoji:{name:'🏆'}}
    ]}
   ]
  }],
  allowed_mentions:{parse:[],replied_user:false}
 };
}
async function handleMyIdInteraction(interaction){
 if(!interaction||!interaction.isButton?.()||interaction.customId!==BUTTON_MY_ID)return false;
 const userId=String(interaction.user?.id||interaction.member?.user?.id||'');
 if(!/^\d{15,25}$/.test(userId))throw Error('ID Discord indisponível');
 await interaction.reply({
  content:'🪪 **Seu ID do Discord:** '+userId+'\nCopie este número e cole no site do recrutamento. Não precisa entrar com login no site.',
  flags:64,allowedMentions:{parse:[]}
 });
 return true;
}
module.exports={recruitmentUrl,recruitmentPayload,handleMyIdInteraction,BUTTON_MY_ID,V2_FLAG};
