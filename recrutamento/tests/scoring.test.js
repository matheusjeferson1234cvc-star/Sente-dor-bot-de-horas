'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessObjective}=require('../lib/scoring');
const choice=i=>({type:'choice',title:'Questão '+i,correct:i,options:['A','B','C','D']});
test('corrige gabarito automaticamente e considera 50% aprovado',()=>{
 const x=assessObjective({passPercent:50,questions:[choice(0),choice(1),choice(2),choice(3)]},[0,1,0,0]);
 assert.deepEqual({score:x.score,decision:x.decision},{score:50,decision:'approved'});
});
test('não aprova nota abaixo da mínima',()=>{
 const x=assessObjective({passPercent:50,questions:[choice(0),choice(1)]},[3,1]);
 assert.equal(x.score,50);assert.equal(x.decision,'approved');
 const y=assessObjective({passPercent:60,questions:[choice(0),choice(1)]},[3,1]);
 assert.equal(y.decision,'rejected');
});
test('resposta escrita pede revisão em vez de decisão automática',()=>{
 assert.equal(assessObjective({passPercent:50,questions:[{type:'written',rubric:'comunicação correta'}]},['olá']),null);
});
