/* Nero V4 — arquitetura de apresentação. Não lê segredos, não altera API ou banco. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const emojis={"inicio":"🏠","sistemas":"🧩","bateponto":"⏱️","ativos":"🟢","presenca":"✅","recrutamento":"📋","bot-reunioes":"📅","bot-atendimento":"🎫","justificativas":"📝","bot-boasvindas":"👋","ranking":"🏆","relatorios":"📊","administracao":"🛡️","configuracoes":"⚙️","servidores":"🔄","atualizacoes":"📢","comunicados":"💬"};
 const node=(tag,cls,content)=>{
   const x=document.createElement(tag);
   if(cls)x.className=cls;
   if(content!==undefined)x.textContent=String(content);
   return x;
 };
 const svg=name=>{
   const x=document.createElementNS('http://www.w3.org/2000/svg','svg');
   x.setAttribute('class','ico');x.setAttribute('aria-hidden','true');
   const use=document.createElementNS('http://www.w3.org/2000/svg','use');
   use.setAttribute('href','#ico-'+name);x.append(use);return x;
 };
 function button(label,target,ctx,cls=''){
   const b=node('button',cls,label);b.type='button';
   b.onclick=()=>ctx.openTab(target);
   return b;
 }
 function head(title,caption,rightAction){
   const wrap=node('div','v4-section-title'),copy=node('div');
   copy.append(node('h3','',title));
   if(caption)copy.append(node('p','',caption));
   wrap.append(copy);
   if(rightAction)wrap.append(rightAction);
   return wrap;
 }
 function metric(label,value,small,icon){
   const x=node('article','v4-metric');x.dataset.metricIcon=icon;x.title=small;const top=node('div','v4-metric-top');
   top.append(node('span','v4-metric-label',label));
   const i=node('span','v4-metric-icon');i.append(svg(icon));top.append(i);
   x.append(top,node('strong','v4-metric-value',value),node('span','v4-metric-note',small));
   return x;
 }
 function tool(ctx,tab,title,description,icon,tag,primary){
   if(ctx.allowedFeature&&!ctx.allowedFeature(tab))return null;
   const b=node('button','v4-tool'+(primary?' v4-tool-primary':''));
   b.type='button';b.dataset.module=tab;b.setAttribute('aria-label','Abrir '+title);
   const i=node('span','v4-tool-icon manager-module-emoji',emojis[tab]||({clock:'⏱️',file:'📄',calendar:'📅',users:'👥',settings:'⚙️',shield:'🛡️',bar:'📊',activity:'📈',check:'✅'})[icon]||'📌');i.setAttribute('aria-hidden','true');
   const content=node('span','v4-tool-content');
   content.append(node('strong','',title),node('small','',description));
   if(tag)content.append(node('span','v4-tool-tag',tag));
   b.append(i,content);b.onclick=()=>ctx.openTab(tab);
   return b;
 }
 function group(ctx,items,title,description){
   const section=node('section','v4-surface');
   if(title||description)section.append(head(title,description));
   const grid=node('div','v4-tool-grid');
   for(const item of items){const b=tool(ctx,...item);if(b)grid.append(b)}
   if(!grid.childElementCount)return null;
   section.append(grid);return section;
 }
 function intro(kicker,title,description,icon){
   const section=node('section','v4-module-intro'),copy=node('div');
   copy.append(node('span','v4-kicker',kicker),node('h2','',title),node('p','',description));
   const seal=node('div','v4-module-icon');seal.append(svg(icon));section.append(copy,seal);
   return section;
 }
 function mini(ctx,text,tab){
   const b=button(text,tab,ctx);b.className='';return b;
 }
 function activeEntries(ctx,max=5){
   const all=ctx.state.data?.cards||[];
   const m=new Map((ctx.state.data?.members||[]).map(x=>[String(x.user_id),x]));
   return all.filter(c=>c.status==='Ativo').slice(0,max).map(c=>{
     const member=m.get(String(c.user_id)),item=node('div','v4-live-item');
     const avatar=node('span','v4-live-avatar',(member?.display_name||'?').slice(0,1).toUpperCase());
     if(member?.avatar_url&&/^https:\/\//.test(member.avatar_url)){
       const img=document.createElement('img');img.src=member.avatar_url;img.alt='';
       img.onerror=()=>img.remove();avatar.replaceChildren(img);
     }
     const content=node('span','v4-live-main');
     content.append(node('strong','',member?.display_name||'Membro do servidor'));
     content.append(node('small','',String(c.shift||'Turno não informado')+' · '+String(c.kind||'Ponto normal')));
     item.append(avatar,content,node('span','v4-state','Em serviço'));
     return item;
   });
 }
 function alertNote(text){
   const box=node('div','v4-help');box.append(svg('shield'),node('span','',text));return box;
 }
 function renderOverview(ctx){
   const {state,fmt,totaled,cards,inPeriod,requiredHours}=ctx;
   const root=$('rows');if(!root)return false;
   const data=state.data||{},all=cards(),period=all.filter(inPeriod),normal=period.filter(c=>c.kind==='Normal');
   const live=all.filter(c=>c.status==='Ativo'),complete=period.filter(c=>c.status==='Validado');
   const pending=(data.justifications||[]).filter(x=>x.status==='pending').length;
   const guild=state.guilds.find(g=>String(g.guild_id)===String(state.guild));
   const dash=node('div','v4-dashboard');
   const section=node('section','manager-metrics-section');
   const metrics=node('div','v4-metrics');
   const snapshot=state.canEdit&&state.moduleReports?.guild===state.guild?state.moduleReports.snapshot:null;
   const meetings=Array.isArray(snapshot?.meetings)?snapshot.meetings:null,tickets=Array.isArray(snapshot?.tickets)?snapshot.tickets:null;
   metrics.append(metric('Servidores',state.guilds.length,'Ambientes disponíveis','users'));
   metrics.append(metric('Registros de ponto',all.length,'Registros disponíveis','clock'));
   metrics.append(metric('Membros do ponto',(data.members||[]).length,'Membros sincronizados','users'));
   metrics.append(metric('Reuniões recentes',meetings?.length??'—','Até 100 registros sincronizados','calendar'));
   metrics.append(metric('Tickets recentes',tickets?.length??'—','Até 100 registros sincronizados','file'));
   metrics.append(metric('Justificativas',pending,'Pendentes de análise','file'));
   section.append(metrics);dash.append(section);
   const modules=group(ctx,[['bateponto','Sistema de Bate-ponto','Controle de horas, equipes, turnos e registros dos membros.','clock'],['recrutamento','Sistema de Recrutamento','Processo seletivo, provas, aprovação e revisão de candidatos.','users'],['bot-reunioes','Sistema de Reuniões','Organize reuniões, presença, faltas e justificativas.','calendar'],['bot-atendimento','Sistema de Tickets','Atendimentos, responsáveis e histórico de solicitações.','users'],['justificativas','Sistema de Justificativas','Solicitações de ausência, análise e histórico.','file'],['bot-boasvindas','Boas-vindas e saída','Personalize mensagens automáticas de entrada e saída.','users'],['administracao','Central do líder','Consulte advertências, folgas e registros administrativos.','shield'],['configuracoes','Configurações','Personalize os painéis, canais, cargos e regras.','settings']],'','');
   if(modules){
    modules.classList.add('manager-modules');
    const stats={bateponto:[[all.length,'Total'],[live.length,'Em aberto']],justificativas:[[(data.justifications||[]).length,'Total'],[pending,'Pendentes']], 'bot-reunioes':meetings?[[meetings.length,'Recentes']]:null,'bot-atendimento':tickets?[[tickets.length,'Recentes'],[tickets.filter(t=>!t.closed).length,'Abertos']]:null};
    for(const card of modules.querySelectorAll('.v4-tool')){
     const values=stats[card.dataset.module],footer=node('span','manager-card-summary');
     if(values){for(const [value,label] of values){const item=node('span','manager-card-stat');item.append(node('strong','',value),node('small','',label));footer.append(item);}}
     else{footer.append(node('span','manager-card-link',(['bot-reunioes','bot-atendimento'].includes(card.dataset.module))?'Consultar registros':'Abrir sistema'),node('span','manager-card-arrow','›'));}
     card.append(footer);
    }
    dash.append(modules);
   }
   const details=node('details','manager-dashboard-details');details.open=!!state.managerDetailsOpen;details.addEventListener('toggle',()=>{state.managerDetailsOpen=details.open;});
   details.append(node('summary','','Acompanhamento do bate-ponto'));
   const cols=node('div','v4-columns');
   const first=node('section','v4-surface');
   first.append(head('Cartões em andamento','Acompanhe os registros ativos',button('Ver todos','ativos',ctx)));
   const items=node('div','v4-list'),entries=activeEntries(ctx,5);
   if(entries.length)items.append(...entries);else items.append(node('div','v4-empty','Nenhum cartão ativo no momento. Os próximos registros aparecerão aqui.'));
   first.append(items);
   const second=node('section','v4-surface');
   second.append(head('Acesso rápido','O que você precisa fazer agora?'));
   const links=node('div','v4-quick-grid');
   const shortcuts=[
     ['Cartões','ativos','activity'],['Presença','presenca','check'],
     ['Ranking','ranking','bar'],['Justificativas','justificativas','file'],
     ['Recrutamento','recrutamento','users'],['Configurações','configuracoes','settings']
   ];
   for(const [label,tab,icon] of shortcuts){
     if(ctx.allowedFeature&&!ctx.allowedFeature(tab))continue;
     const link=node('button','v4-shortcut');link.type='button';
     link.append(svg(icon),node('span','',label));
     const arrow=node('span','v4-arrow','›');link.append(arrow);link.onclick=()=>ctx.openTab(tab);
     links.append(link);
   }
   second.append(links);cols.append(first,second);details.append(cols);
   const rule=node('div','v4-bottom-note');
   rule.append(svg('clock'),node('span','', 'Meta obrigatória atual: '+requiredHours()+'h para todos os turnos. Alterações podem ser feitas nas configurações do bate-ponto.'));
   details.append(rule);dash.append(details);root.append(dash);return true;
 }
 function renderHub(key,ctx){
   const root=$('rows');if(!root)return false;
   const d=ctx.state.data||{};
   const topics={
     sistemas:{
       kicker:'NERO V4 • PLATAFORMA',title:'Central de Sistemas',desc:'Cada sistema tem sua própria área. Escolha o que deseja administrar neste servidor.',icon:'spark',
       groups:[
        ['Sistemas disponíveis','Selecione uma ferramenta para começar.',[
         ['bateponto','Bate-ponto','Jornada, equipes, cartões e presença.','clock','SISTEMA ATIVO',true],
         ['recrutamento','Recrutamento','Provas, candidatos e resultados no Discord.','users','SISTEMA ATIVO'],
         ['bot-reunioes','Reuniões V2','Presenças, faltas e justificativas em um relatório.','calendar','NOVO'],
         ['bot-atendimento','Atendimento','Histórico de tickets.','users','NOVO'],
         ['bot-boasvindas','Boas-vindas e saída','Personalize título, canais, cores e animações.','users','V2'],
         ['atualizacoes','Atualizações oficiais','Publicações permanentes no seu servidor.','file'],
        ]],
        ['Organização e acesso','Outras ferramentas da plataforma.',[
         ['servidores','Meus servidores','Gerencie os ambientes autorizados.','users'],
         ['configuracoes','Configurações','Ajuste o Nero e os painéis do seu servidor.','settings'],
         ['comunicados','Comunicados','Publique mensagens no Discord.','file']
        ]]
       ]
     },
     bateponto:{
       kicker:'WORKSPACE • CENTRAL DE HORAS',title:'Bate-ponto',desc:'Jornada por turnos, cartões ativos, registros e administração. A meta de horas é única para todos os turnos.',icon:'clock',
       groups:[
        ['Operação','Acompanhe o que está acontecendo agora.',[
         ['ativos','Cartões em andamento','Pontos ativos e integrantes em serviço.','activity','AO VIVO',true],
         ['presenca','Controle de presença','Cumprimentos, faltas e justificativas.','check'],
         ['turno','Turnos e cargos','Horários e membros de cada turno.','calendar'],
         ['mensal','Histórico mensal','Consulte as horas registradas no mês.','clock']
        ]],
        ['Resultados','Acesse a evolução da equipe.',[
         ['ranking','Ranking de horas','Classificação semanal e mensal.','bar'],
         ['relatorios','Relatórios detalhados','Pesquise cartões e períodos.','file'],
         ['membros','Membros do servidor','Consulte os integrantes por cargo.','users']
        ]],
        ['Controle e configuração','Permissões e auditorias organizadas.',[
         ['justificativas','Justificativas','Solicitações de ausência e motivos.','file'],
         ['cancelados','Cartões cancelados','Registro dos motivos e responsáveis.','x'],
         ['configuracoes','Configurações de ponto','Horas obrigatórias, equipes, cargos e canais.','settings']
        ]]
       ]
     },
     configuracoes:{
       kicker:'NERO V4 • AJUSTES',title:'Configurações',desc:'Um local para ajustar o bot, as regras de ponto, os canais e a aparência, com permissões validadas pelo Discord.',icon:'settings',
       groups:[
        ['Regras do bate-ponto','O mesmo valor de horas obrigatórias vale para todos os turnos.',[
         ['bot-geral','Horas obrigatórias e equipes','Defina a meta, modo individual ou equipe e convites.','clock','META ÚNICA',true],
         ['bot-turnos','Turnos e cargos','Horários, cargos e responsáveis.','calendar'],
         ['bot-alertas','Avisos automáticos','Mensagens privadas e advertências.','alert']
        ]],
        ['Painéis e integrações','Personalize sem sair do workspace.',[
         ['bot-painel','Painel do bate-ponto','Título, descrição e GIF do painel.','clock'],
         ['bot-painel-just','Painel de justificativas','Aparência da solicitação de ausência.','file'],
         ['bot-boasvindas','Boas-vindas e saída','Mensagens, avatar, banner e cores.','users'],
         ['bot-canais','Canais e logs','Presença, auditoria e canais do Discord.','list']
        ]],
        ['Acesso e preferências','Controle de permissões do servidor.',[
         ['permissoes','Permissões','Defina os cargos autorizados no site.','shield'],
         ['site-preferencias','Preferências do site','Ajustes locais de navegação e aparência.','settings'],
         ['servidores','Trocar servidor','Selecione outro ambiente autorizado.','users']
        ]]
       ]
     },
     administracao:{
       kicker:'NERO V4 • GESTÃO',title:'Administração',desc:'Revise solicitações e registros com histórico e permissões por servidor.',icon:'shield',
       groups:[
        ['Solicitações e auditorias','Tudo o que exige conferência.',[
          ['justificativas','Justificativas','Veja o motivo informado e a decisão.','file','REQUER ANÁLISE',true],
          ['advertencias','Advertências','Histórico dos níveis e situações.','alert'],
          ['cancelados','Cancelamentos','Motivos dos cartões cancelados.','x'],
          ['folgas','Folgas','Defina folgas por turno ou para todos.','calendar']
        ]]
       ]
     },
     resultados:{
       kicker:'NERO V4 • ANÁLISE',title:'Resultados e relatórios',desc:'Consulte desempenho, classificações e histórico de cartões.',icon:'bar',
       groups:[
        ['Painéis de acompanhamento','Acesso direto aos dados existentes.',[
         ['ranking','Ranking','Top 10 do período selecionado.','bar','MAIS ACESSADOS',true],
         ['relatorios','Relatórios','Histórico completo com filtros.','file'],
         ['membros','Membros','Acompanhe participantes do servidor.','users'],
         ['mensal','Por mês','Horas registradas em cada mês.','calendar']
        ]]
       ]
     },
     jornada:{
       kicker:'NERO V4 • OPERAÇÃO',title:'Jornada e cartões',desc:'Controle de presença e horários de trabalho em um mesmo espaço.',icon:'clock',
       groups:[
        ['Registro de jornada','Acompanhe a operação do seu turno.',[
         ['ativos','Cartões ativos','Pontos em andamento.','activity','AO VIVO',true],
         ['presenca','Presença','Registro de horas e ausências.','check'],
         ['turno','Turnos','Horários e membros.','clock'],
         ['mensal','Histórico','Cartões validados por mês.','calendar']
        ]]
       ]
     }
   };
   const def=topics[key];if(!def)return false;
   const content=node('div','v4-module');
   content.append(intro(def.kicker,def.title,def.desc,def.icon));
   if(key==='bateponto'){
     const bar=node('div','v4-nav-line');
     bar.append(mini(ctx,'Trocar servidor','servidores'),mini(ctx,'Meu painel de configurações','bot-geral'));
     content.append(bar);
     const status=node('div','v4-bottom-note');
     const active=(d.cards||[]).filter(c=>c.status==='Ativo').length;
     status.append(svg('activity'),node('span','',active+' cartão(ões) ativo(s) · Meta do servidor: '+ctx.requiredHours()+' horas, igual para todos os turnos.'));
     content.append(status);
   }
   for(const [title,description,items] of def.groups){const section=group(ctx,items,title,description);if(section)content.append(section)}
   if(key==='sistemas')content.append(alertNote('Módulos independentes: as horas do bate-ponto não são misturadas com outras modalidades.'));
   if(key==='configuracoes')content.append(alertNote('Mudanças são salvas pela API e sincronizadas com o bot. As permissões continuam verificadas no Discord.'));
   root.append(content);return true;
 }
 function onRenderNav(state){
   if(!state)return;
   const group=state.tab;
   const nav=$('sidebar')?.querySelectorAll('.v4-nav [data-tab]')||[];
   const related={
     bateponto:new Set(['bateponto','ativos','presenca','jornada','turno','mensal','membros','justificativas','cancelados']),
     relatorios:new Set(['relatorios','resultados']),
     ranking:new Set(['ranking']),
     administracao:new Set(['administracao','advertencias','folgas']),
     configuracoes:new Set(['configuracoes','bot-geral','bot-turnos','bot-canais','bot-painel','bot-painel-just','bot-alertas','permissoes','site-preferencias']),
     recrutamento:new Set(['recrutamento'])
   };
   for(const b of nav){
     const tab=b.dataset.tab;
     const current=tab===group||(![...nav].some(x=>x.dataset.tab===group)&&(related[tab]?.has(group)===true));
     b.classList.toggle('active',current);
     if(current)b.setAttribute('aria-current','page');
     else b.removeAttribute('aria-current');
   }
 }
 window.NeroV4={renderOverview,renderHub,onRenderNav};
})();