'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const handler=require('../api/index.js');
const secret='test-oauth-secret-key-not-for-production';
const mkReq=()=>{
 const nonce='test-nonce-state',sig=crypto.createHmac('sha256',secret).update(nonce).digest('hex');
 return {centralRoute:'callback',method:'GET',headers:{host:'central-de-horas1.vercel.app',cookie:'ch_state='+nonce+'.'+sig},query:{state:nonce,code:'fake-one-time-code'}};
};
function mkRes(){
 return {statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this},end(){this.ended=true;return this}};
}
const keys=['DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI','SESSION_SECRET'];
async function runScenario(remoteCode,status){
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const oldFetch=global.fetch,oldWarn=console.warn;const warnings=[];
 Object.assign(process.env,{DISCORD_CLIENT_ID:'123456789012345678',DISCORD_CLIENT_SECRET:'fake-private-test-secret',DISCORD_REDIRECT_URI:'https://central-de-horas1.vercel.app/api/callback',SESSION_SECRET:secret});
 global.fetch=async()=>({ok:false,status,json:async()=>({error:remoteCode,error_description:'server-only-description-never-show'})});
 console.warn=(...args)=>warnings.push(args);
 try{const res=mkRes();await handler(mkReq(),res);return {res,warnings};}
 finally{global.fetch=oldFetch;console.warn=oldWarn;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
}
test('credenciais inválidas mostram erro inteligível sem expor descrição ou chaves',async()=>{
 const {res,warnings}=await runScenario('invalid_client',401);
 assert.equal(res.statusCode,302);
 assert.equal(res.headers.location,'/?oauth_error=invalid_client');
 assert.equal(res.ended,true);
 assert.doesNotMatch(JSON.stringify({res,warnings}),/fake-private-test-secret|server-only-description-never-show|fake-one-time-code/);
});
test('código expirado ou já usado pode ser reconhecido com segurança',async()=>{
 const {res}=await runScenario('invalid_grant',400);
 assert.equal(res.headers.location,'/?oauth_error=invalid_grant');
});
test('resposta estranha do servidor remoto não é reproduzida no navegador',async()=>{
 const {res}=await runScenario('evil\\n<script>contents</script>',400);
 assert.equal(res.headers.location,'/?oauth_error=unknown');
});
test('limite de tentativas do Discord exibe aviso para tentar mais tarde',async()=>{
 const {res}=await runScenario('temporarily_unavailable',429);
 assert.equal(res.headers.location,'/?oauth_error=rate_limited');
});
test('UI de login preserva link e traduz os erros conhecidos',()=>{
 const fs=require('node:fs'),src=fs.readFileSync('real.js','utf8');
 assert.match(src,/oauth_error/);
 assert.match(src,/invalid_client/);
 assert.match(src,/invalid_grant/);
 assert.match(src,/discordLoginLink/);
 assert.match(src,/Entrar com Discord/);
});
