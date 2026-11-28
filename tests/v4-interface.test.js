'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('scripts da V4 e painel antigo têm sintaxe válida',()=>{
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync('nero-v4.js','utf8')));
 assert.doesNotThrow(()=>new vm.Script(fs.readFileSync('real.js','utf8')));
});
test('V4 é camada visual: HTML preserva endpoints e integração do login',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const id of ['auth','serverPicker','guild','rows','content','moduleContent','sidebar','siteDialog','mobileBottom']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/nero-v4\.css/);
 assert.match(html,/nero-v4\.js/);
 assert.match(html,/\/real\.js/);
 assert.match(html,/href="\/api\/invite"/);
});
test('dashboard V4 usa somente dados reais e preserva telas do legado',()=>{
 const js=fs.readFileSync('nero-v4.js','utf8'),old=fs.readFileSync('real.js','utf8');
 assert.match(js,/state\.data\?\.cards/);
 assert.match(js,/data\.justifications/);
 assert.match(js,/state\.guilds/);
 assert.match(js,/allowedFeature/);
 assert.match(old,/NeroV4\?\.renderOverview/);
 assert.match(old,/NeroV4\?\.renderHub/);
 assert.match(old,/NeroV4\?\.onRenderNav/);
});

test('Manager mantém módulos reais e selo do proprietário validado pela API',()=>{
 const html=fs.readFileSync('index.html','utf8'),manager=fs.readFileSync('nero-manager.js','utf8'),real=fs.readFileSync('real.js','utf8');
 assert.doesNotThrow(()=>new vm.Script(manager));
 assert.match(html,/nero-manager\.css/);assert.match(html,/id="managerOwner"/);assert.match(manager,/me\.isBotOwner===true/);assert.match(real,/data\?\.isBotOwner/);
 for(const tab of ['bateponto','bot-reunioes','bot-atendimento','justificativas','bot-boasvindas'])assert.ok(html.includes('data-tab="'+tab+'"'));
});

test('Manager compacto mantém perfil e acesso ao bate-ponto',()=>{
 const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('nero-manager.css','utf8'),ui=fs.readFileSync('nero-v4.js','utf8');
 assert.match(html,/id="managerGuild"/);assert.match(html,/class="manager-account"/);assert.match(css,/repeat\(6,minmax\(0,1fr\)\)/);assert.match(ui,/manager-dashboard-details/);assert.match(ui,/requiredHours\(\)/);assert.match(ui,/\['bateponto','Sistema de Bate-ponto'/);
});

test('Manager usa emojis e seletor restrito aos servidores autorizados',()=>{
 const html=fs.readFileSync('index.html','utf8'),manager=fs.readFileSync('nero-manager.js','utf8'),real=fs.readFileSync('real.js','utf8');
 assert.match(html,/manager-nav-emoji/);assert.match(html,/id="managerGuildList"/);assert.match(manager,/guildSelection\.entries/);assert.match(real,/guild\(guildName,state\.guilds,state\.guild,chooseServer,showServerPicker,state\.managedGuilds/);assert.match(real,/state\.guilds\.some/);assert.doesNotThrow(()=>new vm.Script(manager));
});

test('Manager usa avatar de servidor e contagens reais, sem expor dados de outro servidor',()=>{
 const ui=fs.readFileSync('nero-v4.js','utf8'),manager=fs.readFileSync('nero-manager.js','utf8'),real=fs.readFileSync('real.js','utf8');
 assert.match(manager,/cdn\.discordapp\.com\/icons\//);assert.match(manager,/entries\.map/);assert.match(ui,/moduleReports\?\.guild===state\.guild/);assert.match(ui,/manager-card-summary/);assert.match(real,/request!==managerLoadSequence\|\|state\.guild!==guild/);
});
