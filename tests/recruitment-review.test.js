'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess,safeNickname,announcement}=require('../recruitment-review');
const config={passPercent:50,questions:[
 {type:'choice',title:'O que é RP?',options:['Interpretar','Sair','Qualquer','Nenhuma'],correct:0},
 {type:'written',title:'Descreva boas práticas.',rubric:'respeito comunicação regras'}
]};
test('correção preliminar considera escolhas e resposta parcialmente correta',()=>{
 const result=assess(config,[0,'respeito e comunicação']);
 assert.equal(result.questions[0].score,1);
 assert.ok(result.questions[1].score>0&&result.questions[1].score<1);
 assert.equal(result.questions[1].needsHuman,true);
 assert.equal(result.reviewRequired,true);
 assert.equal(result.passPercent,50);
});
test('erro em questão objetiva vale zero e resposta escrita exige revisão',()=>{
 const result=assess(config,[2,'']);
 assert.equal(result.questions[0].score,0);
 assert.equal(result.questions[1].score,0);
 assert.equal(result.questions[1].needsHuman,true);
});
test('gera apelido no formato Discord sem ultrapassar 32 caracteres',()=>{
 assert.equal(safeNickname('PM','Lucas','105'),'[PM] Lucas | 105');
 const nickname=safeNickname('POLICIA','Nome Muito Muito Grande','92349');
 assert.ok(nickname.length<=32);
 assert.throws(()=>safeNickname('PM','','105'),/obrigatórios/);
 assert.throws(()=>safeNickname('PM','Lucas',''),/obrigatórios/);
});
test('gera anúncio único, menções limitadas aos aprovados',()=>{
 const payload=announcement([{user_id:'123456789012345678',rp_name:'Lucas',rp_id:'105',final_score:90}],{tag:'PM',showScores:true});
 assert.match(payload.content,/Lucas/);
 assert.match(payload.content,/90%/);
 assert.equal(payload.allowed_mentions.parse.length,0);
 assert.deepEqual(payload.allowed_mentions.users,['123456789012345678']);
 assert.throws(()=>announcement([]),/inválida/);
});
