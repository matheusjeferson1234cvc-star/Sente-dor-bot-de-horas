'use strict';const {test}=require('node:test');const assert=require('node:assert/strict');
const {findMember,previewApproved}=require('../recruitment-bot-bridge');
test('busca membro sem afirmar titularidade do ID',async()=>{
 const f=async()=>({status:200,ok:true,json:async()=>({nick:'Membro RP',user:{username:'Discord'}})});
 const r=await findMember('123456789012345678','234567890123456789',{fetchImpl:f,token:'test'});
 assert.equal(r.identityVerified,false);assert.equal(r.nickname,'Membro RP');
});
test('mensagem de aprovados respeita uma única publicação sem todos-mentions',()=>{
 const r=previewApproved({guildId:'123456789012345678',approved:[{userId:'234567890123456789',nickname:'[PM] Lucas | 105'}]});
 assert.equal(r.content.includes('<@234567890123456789>'),true);
 assert.deepEqual(r.allowed_mentions.parse,[]);
});
