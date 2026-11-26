'use strict';
// Apenas campos de configuração; nunca copiar credenciais, IDs de mensagem nem
// os registros privados do bot. Compartilhado conceitualmente com o aplicador.
const SHIFTS=['manha','tarde','noite','madrugada'];
const time=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const snowflake=s=>typeof s==='string'&&/^\d{15,25}$/.test(s);
function normalizeWelcome(input){
 const source=input??{};
 if(typeof source!=='object'||Array.isArray(source))throw Error('Configuração de entrada e saída inválida');
 const out={};
 for(const k of ['join','leave']){
  const item=source[k]??{};
  if(typeof item!=='object'||Array.isArray(item))throw Error('Configuração inválida');
  const enabled=item.enabled??false,channelId=item.channelId||null;
  const message=item.message??(k==='join'?'Bem-vindo(a), {membro}, ao {servidor}! Somos {total} membros.':'{nome} saiu do {servidor}. Até logo!');
  if(typeof enabled!=='boolean'||(channelId!==null&&!/^\d{15,25}$/.test(channelId))||typeof message!=='string'||!message.trim()||message.length>1000||enabled&&!channelId)throw Error('Configure canal e mensagem válidos para entrada e saída');
  const title=item.title??(k==='join'?'👋 Bem-vindo(a)!':'👋 Até logo!'),color=item.color??(k==='join'?'#16a34a':'#dc2626'),showAvatar=item.showAvatar??true,imageUrl=item.imageUrl||null;
  if(typeof title!=='string'||!title.trim()||title.length>100||typeof color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(color)||typeof showAvatar!=='boolean')throw Error('Visual de boas-vindas inválido');
  if(imageUrl!==null){if(typeof imageUrl!=='string'||imageUrl.length>500)throw Error('URL de imagem inválida');try{const u=new URL(imageUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error('URL');}catch{throw Error('Use um link HTTPS de imagem');}}
  out[k]={enabled,channelId,message:message.trim(),title:title.trim(),color,showAvatar,imageUrl};
 }
 return out;
}
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Configuração do bot inválida');
 const str=(value,max,name)=>{if(typeof value!=='string'||value.length>max)throw Error(`${name} inválido`);return value};
 const num=(v,min,max,name)=>{if(!Number.isInteger(v)||v<min||v>max)throw Error(`${name} inválido`);return v};
 const bool=(v,name)=>{if(typeof v!=='boolean')throw Error(`${name} inválido`);return v};
 const id=(v,name)=>{if(v===null||v===undefined||v==='')return null;if(!snowflake(v))throw Error(`${name} inválido`);return v};
 const ids=(v,max,name)=>{if(!Array.isArray(v)||v.length>max||v.some(x=>!snowflake(x))||new Set(v).size!==v.length)throw Error(`${name} inválidos`);return [...v]};
 const c={};
 c.pointMode=['team','individual'].includes(input.pointMode)?input.pointMode:(()=>{throw Error('Modo de ponto inválido')})();
 c.timezone=str(input.timezone,60,'Fuso horário');try{new Intl.DateTimeFormat('en',{timeZone:c.timezone})}catch{throw Error('Fuso horário desconhecido')}
 c.requiredHours=num(input.requiredHours===undefined?2:input.requiredHours,1,24,'Horas obrigatórias');
 c.minMembers=num(input.minMembers,2,4,'Mínimo da equipe');c.maxMembers=num(input.maxMembers,2,4,'Máximo da equipe');
 if(c.maxMembers<c.minMembers)throw Error('O máximo de integrantes não pode ser menor que o mínimo');
 c.inviteMinutes=num(input.inviteMinutes,5,60,'Validade do convite');
 c.serviceRoleId=id(input.serviceRoleId,'Cargo em serviço');c.auditChannelId=id(input.auditChannelId,'Canal de auditoria');c.presenceChannelId=id(input.presenceChannelId,'Canal de logs de presença');
 c.notifications={pointDm:bool(input.notifications?.pointDm,'Notificações por DM'),receiptImage:false}; // Imagens de comprovante descontinuadas.
 c.shifts={};for(const key of SHIFTS){const s=input.shifts?.[key];if(!s||!time(s.start)||!time(s.end))throw Error(`Horários inválidos: ${key}`);
  c.shifts[key]={start:s.start,end:s.end,roleIds:ids(s.roleIds,5,`Cargos de ${key}`),supervisorRoles:ids(s.supervisorRoles,5,`Responsáveis de ${key}`),logChannelId:id(s.logChannelId,`Logs de ${key}`)};
 }
 const j=input.justifications||{};if(!Array.isArray(j.warningRoles)||j.warningRoles.length!==3)throw Error('São necessários 3 campos para os cargos de advertência');
 c.justifications={reviewChannelId:id(j.reviewChannelId,'Canal de justificativas'),logChannelId:id(j.logChannelId,'Canal dos logs de justificativas'),warningChannelId:id(j.warningChannelId,'Canal de advertências'),warningRoles:j.warningRoles.map((r,n)=>id(r,`Cargo de advertência ${n+1}`)),autoWarnings:bool(j.autoWarnings,'Advertências automáticas')};
 // Visual independente do painel de justificativas. O campo antigo `panel` (com
 // channelId/messageId) e preservado apenas no bot, jamais editado pela API.
 const jp=j.panelVisual||{};
 c.justifications.panelVisual={
  title:str(jp.title??'Justificativa de ausência',100,'Título do painel de justificativas').trim(),
  description:str(jp.description??'Solicite a análise de uma ausência pela Central de Horas.',1600,'Descrição do painel de justificativas'),
  customGif:jp.customGif==null||jp.customGif===''?null:str(jp.customGif,500,'GIF do painel de justificativas')
 };
 if(!c.justifications.panelVisual.title||!c.justifications.panelVisual.description.trim())throw Error('Título e descrição do painel de justificativas são obrigatórios');
 if(c.justifications.panelVisual.customGif){try{const u=new URL(c.justifications.panelVisual.customGif);if(u.protocol!=='https:'||!u.pathname.toLowerCase().endsWith('.gif'))throw Error('formato')}catch{throw Error('O GIF das justificativas precisa ser HTTPS e terminar em .gif')}}
 if(c.justifications.autoWarnings&&(!c.justifications.reviewChannelId||!c.justifications.warningChannelId||c.justifications.warningRoles.some(r=>!r)||new Set(c.justifications.warningRoles).size!==3))throw Error('Configure o canal de análise, o canal de avisos e três cargos de advertência diferentes antes de ativar');
 const p=input.panel||{};c.panel={title:str(p.title,100,'Título do painel').trim(),description:str(p.description,1600,'Descrição do painel'),customGif:p.customGif==null||p.customGif===''?null:str(p.customGif,500,'GIF do painel')};
 if(!c.panel.title||!c.panel.description.trim())throw Error('O título e a descrição do painel são obrigatórios');
 if(c.panel.customGif){try{const u=new URL(c.panel.customGif);if(u.protocol!=='https:'||!u.pathname.toLowerCase().endsWith('.gif'))throw Error('formato')}catch{throw Error('O GIF precisa ser HTTPS e terminar em .gif')}}
 c.welcome=normalizeWelcome(input.welcome);
 return c;
}
function assertResources(config,roles,channels,guildId){
 const availableRoles=new Set(roles.filter(r=>r.id!==guildId&&!r.managed).map(r=>r.id));
 const availableChannels=new Set(channels.filter(c=>[0,5].includes(c.type)).map(c=>c.id));
 const roleIds=[config.serviceRoleId,...config.justifications.warningRoles,...Object.values(config.shifts).flatMap(s=>[...s.roleIds,...s.supervisorRoles])].filter(Boolean);
 const channelIds=[...Object.values(config.welcome||{}).map(x=>x.channelId),config.auditChannelId,config.presenceChannelId,config.justifications.reviewChannelId,config.justifications.logChannelId,config.justifications.warningChannelId,...Object.values(config.shifts).map(s=>s.logChannelId)].filter(Boolean);
 if(roleIds.some(id=>!availableRoles.has(id)))throw Error('Há um cargo inválido, gerenciado ou de outro servidor');
 if(channelIds.some(id=>!availableChannels.has(id)))throw Error('Há um canal inválido ou de outro servidor');
}
module.exports={normalize,assertResources,SHIFTS,normalizeWelcome};
