'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/index.js');
const initial={};
function setup(){
 for(const key of ['DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI','SESSION_SECRET'])initial[key]=process.env[key];
 process.env.DISCORD_CLIENT_ID='123456789012345678';
 process.env.DISCORD_CLIENT_SECRET='test-token';
 process.env.DISCORD_REDIRECT_URI='https://central-de-horas1.vercel.app/api/callback';
 process.env.SESSION_SECRET='test-session-secret';
}
function restore(){for(const [k,v] of Object.entries(initial)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
function response(){
 const headers={};
 return {headers,statusCode:200,setHeader(name,value){headers[name.toLowerCase()]=value;return this},status(code){this.statusCode=code;return this},json(v){this.body=v;return this},end(){this.ended=true;return this},redirect(url){this.statusCode=302;this.headers.location=url;this.ended=true;return this}};
}
test('login da prévia inicia no domínio oficial em vez de perder o cookie OAuth',async()=>{
 setup();try{
  const res=response();
  await handler({centralRoute:'login',headers:{host:'central-de-horas1-preview.vercel.app'},query:{}},res);
  assert.equal(res.statusCode,302);
  assert.equal(res.headers.location,'https://central-de-horas1.vercel.app/api/login');
  assert.equal(res.headers['set-cookie'],undefined);
 }finally{restore()}
});
test('login oficial envia para o Discord e conserva o cookie de estado',async()=>{
 setup();try{
  const res=response();
  await handler({centralRoute:'login',headers:{host:'central-de-horas1.vercel.app'},query:{}},res);
  assert.equal(res.statusCode,302);
  assert.match(res.headers.location,/^https:\/\/discord\.com\/oauth2\/authorize\?/);
  assert.match(res.headers.location,/redirect_uri=https%3A%2F%2Fcentral-de-horas1\.vercel\.app%2Fapi%2Fcallback/);
  assert.match(res.headers['set-cookie'],/^ch_state=/);
 }finally{restore()}
});
test('callback OAuth incorreto é bloqueado antes de redirecionar',async()=>{
 setup();try{
  process.env.DISCORD_REDIRECT_URI='http://localhost:3000/api/callback';
  const res=response();
  await handler({centralRoute:'login',headers:{host:'central-de-horas1.vercel.app'},query:{}},res);
  assert.equal(res.statusCode,503);
  assert.match(res.body.error,/DISCORD_REDIRECT_URI/);
 }finally{restore()}
});
