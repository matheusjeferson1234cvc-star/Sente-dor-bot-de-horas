'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recruitmentUrl,recruitmentPayload,handleMyIdInteraction,BUTTON_MY_ID,V2_FLAG}=require('../recruitment-panel');
const guild='123456789012345678';
test('link exclusivo e seguro por servidor',()=>{
 assert.equal(recruitmentUrl(guild),'https://nero-recrutamento.vercel.app/?guild='+guild);
 assert.notEqual(recruitmentUrl(guild),recruitmentUrl('234567890123456789'));
 assert.throws(()=>recruitmentUrl('abc'),/inválido/);
 assert.throws(()=>recruitmentUrl(guild,'http://example.com'),/HTTPS/);
});
test('painel usa Components V2, GIF, 3 botões e não abre inscrições',()=>{
 const payload=recruitmentPayload(guild,'Servidor @everyone\nTeste',undefined,{durationMinutes:45});
 assert.equal(payload.flags,V2_FLAG);
 assert.equal(payload.embeds,undefined);
 assert.equal(payload.content,undefined);
 assert.equal(payload.components[0].type,17);
 const elements=payload.components[0].components;
 assert.equal(elements.find(x=>x.type===12).items[0].media.url,'https://nero-recrutamento.vercel.app/nero-loop.gif');
 assert.match(elements.find(x=>x.type===10&&x.content.includes('Duração')).content,/45 minutos/);
 const buttons=elements.find(x=>x.type===1).components;
 assert.equal(buttons.length,3);
 assert.equal(buttons[0].url,'https://nero-recrutamento.vercel.app/?guild='+guild);
 assert.equal(buttons[1].custom_id,BUTTON_MY_ID);
 assert.match(buttons[2].url,/tab=aprovados/);
 assert.deepEqual(payload.allowed_mentions.parse,[]);
 assert.doesNotMatch(JSON.stringify(payload),/@everyone/);
});
test('emoji animado é utilizado somente com nome e ID válidos',()=>{
 const opts={durationMinutes:60,animatedEmojiId:'234567890123456789',animatedEmojiName:'nero',gifUrl:'https://images.example.com/recruit.gif'};
 const p=recruitmentPayload(guild,'Teste',undefined,opts);
 assert.match(p.components[0].components[0].content,/<a:nero:234567890123456789>/);
 const buttons=p.components[0].components.find(x=>x.type===1).components;
 assert.equal(buttons[0].emoji.animated,true);
 assert.throws(()=>recruitmentPayload(guild,'Teste',undefined,{gifUrl:'http://test.test/foo.gif'}),/HTTPS/);
});
test('bot responde ao botão de ID em mensagem privada para o autor da interação',async()=>{
 let reply=null;
 const response=await handleMyIdInteraction({
  isButton:()=>true,customId:BUTTON_MY_ID,user:{id:'234567890123456789'},
  reply:async data=>{reply=data}
 });
 assert.equal(response,true);
 assert.equal(reply.flags,64);
 assert.match(reply.content,/234567890123456789/);
 assert.deepEqual(reply.allowedMentions.parse,[]);
 assert.equal(await handleMyIdInteraction({isButton:()=>true,customId:'outro'}),false);
});
