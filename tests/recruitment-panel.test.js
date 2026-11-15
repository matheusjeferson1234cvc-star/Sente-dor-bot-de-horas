'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recruitmentUrl,recruitmentPayload}=require('../recruitment-panel');
const guild='123456789012345678';

test('link exclusivo por servidor',()=>{
 assert.equal(recruitmentUrl(guild),'https://nero-recrutamento.vercel.app/?guild='+guild);
 assert.notEqual(recruitmentUrl(guild),recruitmentUrl('234567890123456789'));
 assert.throws(()=>recruitmentUrl('abc'),/inválido/);
 assert.throws(()=>recruitmentUrl(guild,'http://example.com'),/HTTPS/);
});

test('painel usa botão de link Discord e não abre inscrições',()=>{
 const payload=recruitmentPayload(guild,'Servidor @everyone\nTeste');
 const button=payload.components[0].components[0];
 assert.equal(button.type,2);
 assert.equal(button.style,5);
 assert.equal(button.label,'Participar do recrutamento');
 assert.equal(button.url,'https://nero-recrutamento.vercel.app/?guild='+guild);
 assert.deepEqual(payload.allowed_mentions.parse,[]);
 assert.doesNotMatch(payload.embeds[0].description,/@everyone/);
 assert.match(payload.embeds[0].description,/inscrições estiverem fechadas/);
});
