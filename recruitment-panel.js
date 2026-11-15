'use strict';
// Painel público do recrutamento RP; não abre inscrições nem acessa provas.
function recruitmentUrl(guildId, baseUrl = 'https://nero-recrutamento.vercel.app/') {
  if (typeof guildId !== 'string' || !/^\d{15,25}$/.test(guildId)) throw new Error('ID do servidor inválido');
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Endereço do recrutamento deve usar HTTPS');
  url.search = '';
  url.hash = '';
  url.searchParams.set('guild', guildId);
  return url.toString();
}
function recruitmentPayload(guildId, guildName, baseUrl) {
  const url = recruitmentUrl(guildId, baseUrl);
  const safeName = String(guildName || 'Servidor Discord')
    .replace(/[\r\n<>@`*_~|]/g, '').trim().slice(0, 90) || 'Servidor Discord';
  return {
    embeds: [{
      title: 'NERO BOT · RECRUTAMENTO',
      description: 'Processo seletivo de **' + safeName + '**.\n\nClique no botão para consultar a página de recrutamento deste servidor. Se as inscrições estiverem fechadas, não será possível enviar respostas.',
      color: 0xE32D4D,
      footer: { text: 'NERO RECRUTAMENTO · Cada servidor possui seu próprio processo' }
    }],
    components: [{type: 1, components: [{
      type: 2, style: 5, label: 'Participar do recrutamento', url
    }]}],
    allowed_mentions: {parse: [], replied_user: false}
  };
}
module.exports={recruitmentUrl,recruitmentPayload};
