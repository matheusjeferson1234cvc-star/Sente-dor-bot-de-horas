// Integração de exemplo para discord.js v14.
// Importe e chame as funções nos eventos REAIS do seu bot, sem criar cartões duplicados.
// Configure CENTRAL_API_URL e BOT_SYNC_SECRET nas variáveis da Discloud.
const endpoint = process.env.CENTRAL_API_URL;
const secret = process.env.BOT_SYNC_SECRET;
async function syncEvent(event) {
  if (!endpoint || !secret) throw new Error('CENTRAL_API_URL/BOT_SYNC_SECRET ausentes');
  const response = await fetch(`${endpoint.replace(/\/$/,'')}/api/bot-sync`, {
    method: 'POST',
    headers: {'Content-Type':'application/json','X-Bot-Secret':secret},
    body:JSON.stringify(event)
  });
  if (!response.ok) throw new Error(`Falha na sincronização (${response.status})`);
  return response.json();
}
async function syncMember(guild,member) {
  return syncEvent({type:'member',guildId:guild.id,userId:member.id,
    displayName:member.displayName,avatarUrl:member.displayAvatarURL(),
    roleIds:[...member.roles.cache.keys()]});
}
async function syncCard(card) {
  // card: guildId, cardId, userId, shift, originShift, kind,
  // status, startedAt, endedAt, durationMinutes, cancellationReason
  return syncEvent({type:'card',...card});
}
async function syncGuild(guild) {
  return syncEvent({type:'guild',guildId:guild.id,name:guild.name});
}
// Exemplo: client.on('guildMemberUpdate', (_old, member)=>syncMember(member.guild,member).catch(console.error));
// Para a lista COMPLETA de ausentes, sincronize todos os membros com o cargo,
// com GuildMembers intent habilitada e permissões apropriadas.
module.exports={syncEvent,syncMember,syncCard,syncGuild};
