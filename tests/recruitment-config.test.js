'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {starting,normalize}=require('../recruitment-config');
test('modelos possuem 20 questões e 12 de marcar / 8 escritas',()=>{
 for(const kind of ['policia','organizacao']){
  const data=normalize(starting(kind));
  assert.equal(data.questions.length,20);
  assert.equal(data.questions.filter(q=>q.type==='choice').length,12);
  assert.equal(data.questions.filter(q=>q.type==='written').length,8);
 }
});
test('polícia inclui apenas cinco códigos numéricos',()=>{
 const questions=starting('policia').questions;
 const codes=questions.filter(q=>/^O que significa Código /.test(q.title));
 assert.deepEqual(codes.map(q=>Number(q.title.match(/Código (\d+)/)[1])),[1,2,4,8,9]);
});
test('não aceita configuração extensa ou gabarito inválido',()=>{
 assert.throws(()=>normalize({passPercent:50,questions:Array.from({length:21},()=>starting('policia').questions[0])}));
 const q=starting('policia');q.questions[0].correct=7;assert.throws(()=>normalize(q));
});

test('duração configurável de 5 a 180 minutos, padrão de 30',()=>{
 const base=starting('policia');
 assert.equal(base.durationMinutes,30);
 base.durationMinutes=45;
 assert.equal(normalize(base).durationMinutes,45);
 for(const durationMinutes of [0,4,181,30.5]){
  assert.throws(()=>normalize({...base,durationMinutes}),/Duração/);
 }
});
test('GIF e emoji animado são validados por servidor',()=>{
 const base=starting('organizacao');
 base.gifUrl='https://example.com/nero.gif';
 base.animatedEmojiName='Nero';
 base.animatedEmojiId='123456789012345678';
 assert.equal(normalize(base).gifUrl,base.gifUrl);
 assert.throws(()=>normalize({...base,gifUrl:'http://example.com/nero.gif'}),/GIF/);
 assert.throws(()=>normalize({...base,animatedEmojiId:'erro'}),/emoji/);
});
