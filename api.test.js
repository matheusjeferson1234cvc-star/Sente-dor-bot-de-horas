'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const handler=require('../api/index.js');
const savedFetch=global.fetch;
function request(path,options={}){const res={statusCode:200,headers:{},status(n){this.statusCode=n;return this},setHeader(k,v){this.headers[k]=v;return this},json(x){this.data=x;return this},redirect(u){this.location=u;return this}};const req={url:'/api/'+path,method:options.method||'GET',query:options.query||{},headers:options.headers||{},body:options.body};return handler(req,res).then(()=>res)}
function signedCookie(id){const payload=Buffer.from(JSON.stringify({id,name:'Usuário de testes',exp:Date.now()+3600000})).toString('base64url');const sig=crypto.createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('hex');return 'ch_session='+payload+'.'+sig}
process.env.SESSION_SECRET='teste-segredo-com-pelo-menos-32-caracteres';
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_TEST_SECRET_NAO_REAL';process.env.BOT_SYNC_SECRET='segredo-teste-repetido-suficientemente-forte';
process.env.DISCORD_BOT_TOKEN='token-ficticio';process.env.DISCORD_CLIENT_ID='123456789012345678';process.env.DISCORD_CLIENT_SECRET='oauth-ficticio';process.env.DISCORD_REDIRECT_URI='https://central-de-horas1.vercel.app/api/callback';
test('health informa dependências sem expor valores privados',async()=>{const r=await request('health');assert.equal(r.statusCode,200);assert.equal(r.data.configured.discordOAuth,true);assert.equal(JSON.stringify(r.data).includes('sb_secret_'),false)});
test('API exige login antes de listar servidores',async()=>{const r=await request('guilds');assert.equal(r.statusCode,401)});
test('sincronização rejeita segredo ausente ou errado',async()=>{const r=await request('bot-sync',{method:'POST',headers:{'x-bot-secret':'errado'},body:{type:'guild',guildId:'123456789012345678'}});assert.equal(r.statusCode,401)});
test('bot grava servidor usando sb_secret_ só como apikey',async()=>{let seen;global.fetch=async(url,options)=>{seen={url,options};return {ok:true,json:async()=>[{}]}};try{const r=await request('bot-sync',{method:'POST',headers:{'x-bot-secret':process.env.BOT_SYNC_SECRET},body:{type:'guild',guildId:'123456789012345678',name:'Servidor RP'}});assert.equal(r.statusCode,200);assert.match(seen.url,/guild_settings/);assert.equal(seen.options.headers.apikey,process.env.SUPABASE_SECRET_KEY);assert.equal('Authorization' in seen.options.headers,false)}finally{global.fetch=savedFetch}});
test('login inclui state assinado, redirect de OAuth e cookie HttpOnly',async()=>{const r=await request('login');assert.match(r.location,/discord.com\/oauth2\/authorize/);assert.match(r.headers['Set-Cookie'],/HttpOnly; Secure/);assert.match(r.location,/scope=identify/)});
test('dono do servidor acessa dados e configura apenas cargos permitidos',async()=>{
 const seen=[];global.fetch=async(url,options={})=>{seen.push({url,options});let value=[];
 if(url.includes('discord.com/api/v10/guilds/123456789012345678/roles'))value=[{id:'123456789012345678',name:'@everyone',position:0},{id:'222222222222222222',name:'Supervisão',position:2,managed:false}];
 else if(url.includes('discord.com/api/v10/guilds/123456789012345678'))value={owner_id:'111111111111111111'};
 else if(url.includes('guild_settings')&&(!options.method||options.method==='GET'))value=[{guild_id:'123456789012345678',name:'Servidor RP',roles:{allowed:[]},shift_roles:{Noite:['222222222222222222']},shift_hours:{Noite:['18:00','00:00']}}];
 else if(url.includes('guild_settings'))value=[{}];else value=[];
 return {ok:true,json:async()=>value}
 };try{
 const headers={cookie:signedCookie('111111111111111111')};
 const roles=await request('roles',{query:{guildId:'123456789012345678'},headers});assert.equal(roles.statusCode,200);assert.equal(roles.data.roles.length,1);
 const update=await request('settings',{method:'POST',query:{guildId:'123456789012345678'},headers,body:{allowedRoles:['222222222222222222']}});assert.equal(update.statusCode,200);
 const dbPost=seen.find(x=>x.url.includes('guild_settings')&&x.options.method==='POST');const saved=JSON.parse(dbPost.options.body);assert.deepEqual(saved.shift_hours.Noite,['18:00','00:00']);assert.deepEqual(saved.roles.allowed,['222222222222222222']);
 }finally{global.fetch=savedFetch}
});
