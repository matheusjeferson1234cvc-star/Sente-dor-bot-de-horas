'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {signed}=require('../lib/oauth-core');
const handler=require('../api/prova');
const guild='123456789012345678',user='234567890123456789',roundId='7b96205b-cd43-41ef-a982-8bd38e3071ad';
const secret='0123456789abcdef0123456789abcdef0123456789abcdef',host='nero-recrutamento.vercel.app';
const config={durationMinutes:30,questions:[
 {type:'choice',title:'O que é RP?',options:['Interpretação','Sem regras','Sair','Vencer'],correct:0},
 {type:'written',title:'Explique RP.',rubric:'Interpretação do personagem'}
]};
const future=()=>new Date(Date.now()+60*60000).toISOString();
function req(method,body){
 const session=signed('candidate',{id:user,guildId:guild,name:'Candidato Teste',exp:Date.now()+60*60000});
 return {method,query:{guild},headers:{host,origin:'https://'+host,cookie:'nero_oauth_session='+encodeURIComponent(session)},body:body||{}};
}
function res(){return {code:200,headers:{},body:null,status(c){this.code=c;return this},
 setHeader(k,v){this.headers[k]=v;return this},json(data){this.body=data;return this}}}
function ok(data){return {ok:true,status:200,json:async()=>data}}
function setup(roundState='open'){
 process.env.NERO_IDENTITY_SECRET=secret;
 process.env.NERO_PUBLIC_EXAM_ENABLED='true';
 process.env.SUPABASE_URL='https://test.supabase.co';
 process.env.SUPABASE_SECRET_KEY='sb_secret_test';
 process.env.DISCORD_BOT_TOKEN='token-ficticio';
 let attempt=null;
 const original=global.fetch;
 global.fetch=async(url,options={})=>{
  const path=new URL(String(url)).pathname,method=options.method||'GET';
  if(path.includes('/guilds/'+guild+'/members/'+user))return ok({user:{id:user}});
  if(path.includes('nero_recruitment_rounds'))return ok([{id:roundId,guild_id:guild,state:roundState,
   opens_at:new Date(Date.now()-60000).toISOString(),closes_at:future(),duration_minutes:30,config_snapshot:config}]);
  if(path.includes('nero_recruitment_attempts')){
   if(method==='GET')return ok(attempt?[attempt]:[]);
   if(method==='POST'){attempt=JSON.parse(options.body);return ok([attempt])}
   if(method==='PATCH'){
    if(!attempt||attempt.state!=='in_progress')return ok([]);
    Object.assign(attempt,JSON.parse(options.body));return ok([attempt]);
   }
  }
  throw Error('URL inesperada: '+url);
 };
 return {restore(){global.fetch=original},getAttempt(){return attempt}};
}
async function register(){
 const r=res();await handler(req('POST',{guildId:guild,action:'register',rpName:'Candidato RP',rpId:'105'}),r);
 assert.equal(r.code,200);
 assert.equal(r.body.registered,true);
}
test('prova nunca abre sem ativação explícita',async()=>{
 const prev=process.env.NERO_PUBLIC_EXAM_ENABLED;
 process.env.NERO_PUBLIC_EXAM_ENABLED='false';
 const a=res();await handler({method:'GET',query:{guild},headers:{}},a);
 assert.equal(a.code,423);process.env.NERO_PUBLIC_EXAM_ENABLED=prev;
});
test('primeiro acesso exige OAuth Discord, registro RP e questões sem gabarito',async()=>{
 const stub=setup();
 try{
  const no=res();await handler({method:'GET',query:{guild},headers:{cookie:''}},no);assert.equal(no.code,401);
  const before=res();await handler(req('GET'),before);
  assert.equal(before.code,200);assert.equal(before.body.state,'registration');assert.equal(before.body.needsRp,true);
  await register();
  const yes=res();await handler(req('GET'),yes);
  assert.equal(yes.code,200);assert.equal(yes.body.state,'in_progress');
  assert.equal(yes.body.questions.length,2);
  assert.equal(yes.body.questions[0].correct,undefined);
  assert.equal(yes.body.questions[1].rubric,undefined);
  assert.equal(stub.getAttempt().guild_id,guild);
  assert.equal(stub.getAttempt().rp_name,'Candidato RP');
  assert.equal(stub.getAttempt().rp_id,'105');
 }finally{stub.restore()}
});
test('respostas podem ser salvas e enviadas somente uma vez após cadastro RP',async()=>{
 const stub=setup();
 try{
  const blocked=res();await handler(req('POST',{guildId:guild,action:'save',answers:[0,'Interpreto personagem']}),blocked);
  assert.equal(blocked.code,409);
  await register();
  const saved=res();await handler(req('POST',{guildId:guild,action:'save',answers:[0,'Interpreto personagem']}),saved);
  assert.equal(saved.code,200);assert.equal(stub.getAttempt().state,'in_progress');
  const submitted=res();await handler(req('POST',{guildId:guild,action:'submit',answers:[0,'Interpreto personagem']}),submitted);
  assert.equal(submitted.code,200);assert.equal(submitted.body.submitted,true);
  const again=res();await handler(req('POST',{guildId:guild,action:'submit',answers:[1,'Outra']}),again);
  assert.equal(again.code,409);
 }finally{stub.restore()}
});
test('fechar recrutamento impede abrir ou enviar provas mesmo com login Discord',async()=>{
 const stub=setup('review');
 try{
  const a=res();await handler(req('GET'),a);assert.equal(a.code,423);
 }finally{stub.restore()}
});
