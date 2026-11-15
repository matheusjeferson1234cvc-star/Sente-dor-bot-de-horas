'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildRecruitmentPanel,recruitmentUrl,validateChannel,command}=require('../recruitment-discord-panel');
const guild='123456789012345678',channel='234567890123456789';
test('painel publica um botão de link para o servidor correto',()=>{
 const result=buildRecruitmentPanel({guildId:guild,guildName:'Polícia RP'});
 assert.equal(result.components.length,1);
 assert.equal(result.components[0].components[0].style,5);
 assert.equal(result.components[0].components[0].url,recruitmentUrl(guild));
 assert.deepEqual(result.allowed_mentions.parse,[]);
 assert.ok(result.embeds[0].description.includes('enquanto um recrutamento estiver aberto'));
});
test('IDs de servidor e canais são validados',()=>{
 assert.throws(()=>recruitmentUrl('123'));
 assert.equal(validateChannel([{id:channel,type:0}],channel),channel);
 assert.throws(()=>validateChannel([{id:channel,type:2}],channel));
});
test('não permite menção embutida no nome nem link externo',()=>{
 const x=buildRecruitmentPanel({guildId:guild,guildName:'@everyone <@123>'});
 assert.ok(!x.embeds[0].description.includes('<@'));
 assert.ok(!x.embeds[0].description.includes('@everyone'));
 assert.equal(command.name,'painelrecrutamento');
});
