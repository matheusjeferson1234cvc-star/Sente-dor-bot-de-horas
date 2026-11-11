'use strict';
// O painel de produção lê exclusivamente a API autenticada. Dados fictícios ficam em /demo.html.
const $=id=>document.getElementById(id);
const state={guild:null,data:null,guilds:[],canEdit:false,tab:'inicio',period:'week',month:null,shift:'Noite',presenceDate:null,offShift:'all',search:'',status:'todos',kind:'todos',reportShift:'todos',roles:null,botEditor:null,botDraft:null,botLoading:false,botError:'',botDirty:false,botShift:'manha',navOrigin:null};
const shifts=['Manhã','Tarde','Noite','Madrugada'];
const visibleShifts=()=>state.data?.viewScope==='shift'?shifts.filter(k=>(state.data.allowedShifts||[]).includes(shortShift[k])):shifts;
const api=async (path,options={})=>{const r=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});let d;try{d=await r.json()}catch{throw Error('A API não respondeu em JSON. Confira se a pasta api foi publicada na raiz do projeto Vercel (possível erro 404).')}if(!r.ok)throw Error(d.error||`Erro HTTP ${r.status}`);return d};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
// Caixas escuras acessíveis para avisos e confirmações da plataforma.
function uiModal({title='Confirmação',message='',confirmLabel='Continuar',cancelLabel='Voltar'}={}){
 const dialog=$('siteDialog');
 if(!dialog||typeof dialog.showModal!=='function'){
  return Promise.resolve(cancelLabel?window.confirm(message):(window.alert(message),true));
 }
 return new Promise(resolve=>{
  if(dialog.open)dialog.close();
  $('dialogTitle').textContent=title;
  $('dialogMessage').textContent=message;
  $('dialogAccept').textContent=confirmLabel;
  $('dialogCancel').hidden=!cancelLabel;
  if(cancelLabel)$('dialogCancel').textContent=cancelLabel;
  let result=false;
  const finish=ok=>{result=ok;if(dialog.open)dialog.close()};
  $('dialogAccept').onclick=()=>finish(true);
  $('dialogCancel').onclick=()=>finish(false);
  $('dialogClose').onclick=()=>finish(false);
  dialog.addEventListener('close',()=>resolve(result),{once:true});
  dialog.showModal();
 });
}
const uiNotice=(message,title='Atenção')=>uiModal({title,message,confirmLabel:'Entendi',cancelLabel:null});
const fmt=m=>{const n=Math.max(0,Math.floor(Number(m)||0));return `${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}min`};
const formatDateBR=iso=>/^(\d{4})-(\d{2})-(\d{2})$/.test(iso||'')?iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3/$2/$1'):(iso||'—');
const ymd=d=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(d));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`};
const today=()=>ymd(new Date());
const firstWeek=()=>{const n=new Date(`${today()}T12:00:00-03:00`),diff=(n.getUTCDay()+6)%7;n.setUTCDate(n.getUTCDate()-diff);return ymd(n)};
const inPeriod=c=>{if(state.period==='all')return true;const date=ymd(c.started_at);if(state.period==='month')return date.slice(0,7)===(state.month||today().slice(0,7));return date>=firstWeek()&&date<=today()};
const valid=c=>c.status==='Validado';
const active=c=>c.status==='Ativo';
const totaled=(cards,kind)=>cards.filter(c=>valid(c)&&(!kind||c.kind===kind)).reduce((n,c)=>n+(Number(c.duration_minutes)||0),0);
const members=()=>new Map((state.data?.members||[]).map(m=>[m.user_id,m]));
const cards=()=>state.data?.cards||[];
const person=(m,detail,badge,tone)=>{const r=el('div',undefined,'list-row'),p=el('div',undefined,'person'),a=m?.avatar_url?el('img'):el('div',(m?.display_name||'?').slice(0,1).toUpperCase());a.className='avatar';if(m?.avatar_url){a.src=m.avatar_url;a.alt='';a.onerror=()=>{a.removeAttribute('src');a.alt='?'}}p.append(a);const t=el('div');t.append(el('strong',m?.display_name||m?.user_id||'Membro não sincronizado'),el('small',detail));p.append(t);r.append(p,el('span',badge,`pill ${tone||''}`));return r};
const note=(target,msg,cls='empty')=>target.append(el('p',msg,cls));
const option=(text,value)=>{const o=el('option',text);o.value=value??text;return o};
function select(label,values,selected,fn){const lab=el('label',label),s=el('select');for(const [name,v] of values)s.append(option(name,v));s.value=selected;s.onchange=()=>fn(s.value);lab.append(s);return lab}
const shortShift={Manhã:'manha',Tarde:'tarde',Noite:'noite',Madrugada:'madrugada'};
const weekdays=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const dayOf=date=>new Date(date+'T12:00:00Z').getUTCDay();
const offFor=(date,shift)=>{const off=state.data?.settings?.time_off||{},weekly=off.weekly||{all:[0]},day=dayOf(date);
 return (weekly.all||[]).includes(day)||(weekly[shift]||[]).includes(day)||(off.dates||[]).some(x=>x.date===date&&(x.shift==='all'||x.shift===shift));};
const official=(shift)=>{const roles=state.data?.settings?.shift_roles?.[shift]||[];
 return (state.data?.members||[]).filter(m=>(m.role_ids||[]).some(id=>roles.includes(id)));};
const attendanceRecord=(date,shift,user)=>{const key=shortShift[shift];return (state.data?.attendance||[]).find(x=>x.day===date&&x.shift===key&&x.user_id===user)};
const gapDate=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function consecutive(user,shift,date){const sorted=(state.data?.attendance||[]).filter(x=>x.user_id===user&&x.shift===shortShift[shift]&&x.day<=date).sort((a,b)=>b.day.localeCompare(a.day));
 let count=0;for(const d of sorted){if(d.status==='folga')break;if(d.status==='falta')count++;else break}return count;
}
function presence(){const filters=$('filters'),rows=$('rows'),date=state.presenceDate||today(),shift=state.shift,list=official(shift),byId=members();
 filters.append(select('Turno',visibleShifts().map(x=>[x,x]),shift,v=>{state.shift=v;render()}));
 const field=el('label','Dia'),input=el('input');input.type='date';input.value=date;input.max=today();input.onchange=()=>{state.presenceDate=input.value;render()};field.append(input);filters.append(field);
 filters.append(el('p','Os membros vêm dos cargos configurados no bot. Dias sem escala histórica confirmada não são tratados como faltas. O turno atual só é considerado encerrado após o horário final.','hint'));
 const summary={cumpriu:0,agora:0,falta:0,pendente:0,folga:0};const lines=[];
 for(const m of list){const saved=attendanceRecord(date,shift,m.user_id),work=(state.data.cards||[]).filter(c=>c.user_id===m.user_id&&c.shift===shift&&c.kind==='Normal'&&ymd(c.started_at)===date),activeWork=work.some(c=>c.status==='Ativo');
 const minutes=work.filter(c=>c.status==='Validado').reduce((n,c)=>n+(Number(c.duration_minutes)||0),0);
 let status=saved?.status|| (offFor(date,shortShift[shift])?'folga':minutes>=120?'cumpriu':activeWork?'agora':minutes>0?'incompleta':'sem dados');
 if(!saved&&date===today()&&!offFor(date,shortShift[shift])){if(activeWork)status='agora';else if(minutes>=120)status='cumpriu';else status='aguardando';}
 if(!summary[status])summary[status]=0;summary[status]++;
 lines.push({m,status,minutes:saved?.minutes??minutes,streak:consecutive(m.user_id,shift,date)});
 }
 const headline=el('div',undefined,'field-row');headline.append(el('div',`Turno ${shift} • ${date}`,'group-title'),el('div',`Cumpriram: ${summary.cumpriu||0} · Trabalhando: ${summary.agora||0} · Faltas confirmadas: ${summary.falta||0}`,'muted-small'));rows.append(headline);
 if(!list.length){note(rows,'Nenhum membro com o cargo deste turno está sincronizado.');return}
 const statusText={cumpriu:'Meta cumprida',agora:'Em serviço',falta:'Falta',incompleta:'Abaixo de 2 horas',pendente:'Justificativa em análise',justificada:'Justificada',folga:'Folga',aguardando:'Turno em andamento','sem dados':'Sem registro confirmado'};
 for(const item of lines.sort((a,b)=>({falta:0,incompleta:1,pendente:2,cumpriu:4}[a.status]??3)-({falta:0,incompleta:1,pendente:2,cumpriu:4}[b.status]??3))){
 const tone=item.status==='falta'?'bad':['cumpriu','justificada','folga'].includes(item.status)?'good':'';
 rows.append(person(item.m,`${statusText[item.status]||item.status} · ${fmt(item.minutes)} normais · ${item.streak} falta(s) consecutiva(s)`,statusText[item.status]||item.status,tone));
 }
 if(state.data?.isBotOwner||state.canEdit){
  const b=el('button','Simular advertências pelo site (sem aplicar)','button ghost');
  const outcome=el('div',undefined,'warning-note');
  b.onclick=async()=>{b.disabled=true;outcome.replaceChildren(el('p','Conferindo faltas, folgas e justificativas...'));
   try{const result=await api('warnings-preview?guildId='+encodeURIComponent(state.guild));
    outcome.replaceChildren(el('strong',`${result.approvals.length} autorização(ões) possível(is) · Simulação segura`));
    const people=members();for(const item of result.approvals.slice(0,30)){
      outcome.append(person(people.get(item.userId)||{user_id:item.userId},`${item.evidenceDays.join(' e ')} · turno ${item.shift}`, 'Avaliação', ''));
    }
    if(!result.approvals.length)outcome.append(el('p','Nenhuma dupla de faltas consecutivas confirmadas está elegível no momento.'));
    outcome.append(el('small','Esta consulta NÃO atribui cargo, não registra advertência e não envia mensagens.'));
   }catch(e){outcome.replaceChildren(el('p',e.message,'error'))}finally{b.disabled=false}
  };rows.append(b,outcome);
 }
}
function monthly(){const rows=$('rows'),filters=$('filters'),month=state.month||today().slice(0,7),all=cards().filter(c=>c.status==='Validado'&&ymd(c.started_at).slice(0,7)===month);const map=members();
 filters.append(el('p',`Mês selecionado: ${month}. Contadores recomeçam em zero a cada mês sem apagar os meses anteriores.`, 'hint'));
 filters.append(select('Turno',shifts.map(x=>[x,x]),state.shift,v=>{state.shift=v;render()}));
 const roster=official(state.shift);rows.append(el('h3',`Horas dos membros • ${state.shift}`,'month-title'));
 for(const m of roster){const mine=all.filter(c=>c.user_id===m.user_id);const normal=totaled(mine,'Normal'),extra=totaled(mine,'Extra');rows.append(person(m,`${fmt(normal)} normais · ${fmt(extra)} extras`,fmt(normal+extra),normal>=120?'good':''))}
 if(!roster.length)note(rows,'Nenhum membro deste turno possui cargo configurado atualmente.');
 rows.append(el('p','O histórico utiliza os cartões já sincronizados pelo bot. Cartões em andamento não são contabilizados como finalizados.','muted-small'));
}
function justificationHistory(){const rows=$('rows'),all=state.data?.justifications||[],map=members();rows.append(el('h3','Justificativas registradas','section-title'));
 for(const j of all.slice(0,250)){rows.append(person(map.get(j.user_id)||{user_id:j.user_id},`${formatDateBR(j.day)} · ${j.shift} · ${j.reason}`,j.status==='approved'?'Aprovada':j.status==='rejected'?'Recusada':'Em análise',j.status==='approved'?'good':j.status==='rejected'?'bad':''))}
 if(!all.length)note(rows,'Nenhuma justificativa sincronizada. Use o painel de justificativas no Discord para enviar e analisar.');else rows.append(el('p','Aprovada: falta abonada e fora das advertências. Pendente: bloqueia advertências durante a análise. Recusada: falta não abonada.','hint'));
}
function warnings(){const rows=$('rows'),all=state.data?.warnings||[],map=members();rows.append(el('h3','Histórico de advertências','section-title'));
 for(const w of all.slice(0,250))rows.append(person(map.get(w.user_id)||{user_id:w.user_id},`${formatDateBR(w.day)} · ${w.shift} · ${w.reason}`,`Nível ${w.level} · ${w.status==='active'?'Ativa':'Revogada'}`,w.status==='active'?'bad':'good'));
 if(!all.length)note(rows,'Nenhuma advertência sincronizada. As advertências só são automáticas após ativação nas configurações do bot.');
}
function timeOff(){const filters=$('filters'),rows=$('rows'),off=state.data?.settings?.time_off||{weekly:{all:[0]},dates:[]},shift=state.offShift||'all';
 filters.append(el('p','As folgas evitam contagem de falta e advertência. Podem ser gerais ou específicas para um turno. O bot recebe a configuração na próxima sincronização.','hint'));
 filters.append(select('Aplicar folga em',[['Todos os turnos','all'],['Manhã','manha'],['Tarde','tarde'],['Noite','noite'],['Madrugada','madrugada']],shift,v=>{state.offShift=v;render()}));
 const weekdaysTitle=el('h3','Folgas fixas na semana','section-title');rows.append(weekdaysTitle);
 const checks=el('div',undefined,'weekdays'),days=new Set(off.weekly?.[shift]||[]);
 weekdays.forEach((name,n)=>{const label=el('label',name,'weekday'),checkbox=el('input');checkbox.type='checkbox';checkbox.value=String(n);checkbox.checked=days.has(n);checkbox.disabled=!state.canEdit;label.prepend(checkbox);checks.append(label)});rows.append(checks);
 const save=el('button','Salvar folgas semanais','button');save.disabled=!state.canEdit;save.onclick=async()=>{
  const next=JSON.parse(JSON.stringify(off));next.weekly??={all:[0]};next.weekly[shift]=[...checks.querySelectorAll('input:checked')].map(x=>Number(x.value));save.disabled=true;
  try{await api('time-off?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify(next)});await load()}catch(e){note(rows,e.message,'error')}finally{save.disabled=false}
 };rows.append(save);
 rows.append(el('h3','Folga em uma data específica','section-title'));
 const day=el('input');day.type='date';day.value=today();day.disabled=!state.canEdit;const form=el('div',undefined,'field-row');const label=el('label','Selecionar data');label.append(day);
 const add=el('button','Adicionar dia de folga','button');add.disabled=!state.canEdit;add.onclick=async()=>{if(!day.value)return;const next=JSON.parse(JSON.stringify(off));next.dates??=[];next.dates.push({date:day.value,shift});try{await api('time-off?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify(next)});await load()}catch(e){note(rows,e.message,'error')}};form.append(label,add);rows.append(form);
 const list=el('div');for(const item of off.dates||[]){const r=el('div',undefined,'list-row');r.append(el('span',`${formatDateBR(item.date)} • ${item.shift==='all'?'Todos os turnos':item.shift}`));
  if(state.canEdit){const remove=el('button','Remover','button ghost');remove.onclick=async()=>{try{await api('time-off?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify({...off,dates:off.dates.filter(d=>d.date!==item.date||d.shift!==item.shift)})});await load()}catch(e){note(rows,e.message,'error')}};r.append(remove)}list.append(r)}rows.append(list);
 if(!state.canEdit)rows.append(el('p','Somente o dono ou um Administrador do Discord pode alterar folgas. O dono global do bot não pode editar servidores alheios sem autorização.','warning-note'));
}
const tabInfo={
 inicio:['Central de módulos','Escolha um sistema para acompanhar seus registros'],
 jornada:['Jornada e ponto','Acompanhe turnos, presença e horas registradas'],
 resultados:['Resultados e relatórios','Ranking, membros e consultas em telas separadas'],
 administracao:['Administração','Justificativas, advertências, folgas e auditoria'],
 configuracoes:['Central de configurações','Configurações do bot e do site em um só lugar'],
 servidores:['Meus servidores','Consulte e alterne seus ambientes autorizados'],
 ranking:['Ranking','Horas validadas por membro e período'],
 presenca:['Controle de presença','Membros por turno, jornadas e ausências confirmadas'],
 mensal:['Histórico mensal','Consulte cada mês sem perder os anteriores'],
 turno:['Turnos','Cargos e jornada de cada turno'],
 ativos:['Em serviço','Cartões atualmente em andamento'],
 cancelados:['Cancelamentos','Auditoria dos cartões cancelados'],
 justificativas:['Justificativas','Solicitações enviadas pelo Discord e decisões'],
 advertencias:['Advertências','Registros e níveis sincronizados com o bot'],
 folgas:['Folgas','Folgas semanais e datas específicas'],
 relatorios:['Relatórios','Histórico com pesquisa e filtros'],
 membros:['Membros','Somente usuários com cargo de turno'],
 permissoes:['Permissões','Autorize cargos a acessar o painel'],
 laboratorio:['Laboratório do dono','Teste configurações com segurança, sem mudar dados reais'],
 'site-preferencias':['Preferências do site','Navegação, visual e atualização do painel'],
 'bot-geral':['Regras do ponto','Modo de ponto, fuso e tamanho da equipe'],
 'bot-turnos':['Turnos e cargos','Horários, cargos e responsáveis por turno'],
 'bot-canais':['Canais e cargos gerais','Auditoria, justificativas e advertências'],
 'bot-painel':['Painel de bate-ponto','Título, descrição e GIF do painel de ponto'],
 'bot-painel-just':['Painel de justificativas','Título, descrição e GIF do painel de justificativas'],
 'bot-alertas':['Advertências e notificações','Controle de avisos automáticos e mensagens']
};
// Os sistemas são agrupados por função. Cada ferramenta mantém sua tela independente.
const moduleDefs={
 jornada:{title:'Jornada e ponto',intro:'Gestão de turnos e presença sem misturar com relatórios administrativos.',icon:'ico-clock',items:[
  ['presenca','Controle de presença','Acompanhe a meta diária, os turnos e as ausências confirmadas.','ico-check'],
  ['turno','Escalas e turnos','Membros do turno e horas extras realizadas.','ico-clock'],
  ['ativos','Em serviço','Veja os cartões que estão em andamento.','ico-activity'],
  ['mensal','Histórico mensal','Consulte horas normais e extras de cada mês.','ico-calendar']]},
 resultados:{title:'Resultados e relatórios',intro:'Ranking, membros e histórico em sistemas separados.',icon:'ico-bar',items:[
  ['membros','Membros','Lista de integrantes por cargo e horas registradas.','ico-users'],
  ['ranking','Ranking','Classificação por horas normais e extras validadas.','ico-bar'],
  ['relatorios','Relatórios','Pesquisa de cartões, filtros e consulta de jornadas.','ico-file']]},
 administracao:{title:'Administração',intro:'Acompanhe solicitações e auditorias em espaços separados.',icon:'ico-shield',items:[
  ['justificativas','Justificativas','Histórico de solicitações recebidas pelo bot.','ico-list'],
  ['advertencias','Advertências','Consulte as advertências e seus níveis.','ico-alert'],
  ['folgas','Folgas','Configure folgas fixas e dias específicos, conforme suas permissões.','ico-calendar'],
  ['cancelados','Cancelamentos','Auditoria dos cartões de ponto cancelados.','ico-x']]},
 configuracoes:{title:'Central de configurações',intro:'Configurações do bot e do site reunidas e organizadas, com acesso por busca e categorias.',icon:'ico-settings',items:[
  ['bot-geral','Ativar equipes e regras do ponto','Ligar ou desligar equipes, configurar convites e fuso.','ico-clock'],
  ['bot-turnos','Turnos e cargos','Horários, cargos de turno, responsáveis e logs.','ico-calendar'],
  ['bot-canais','Canais e cargos','Configure auditoria, canais e cargos de advertência.','ico-shield'],
  ['bot-painel','Painel de bate-ponto','Personalize o painel principal do ponto.','ico-clock'],
  ['bot-painel-just','Painel de justificativas','Personalize o painel de solicitações e justificativas.','ico-file'],
  ['bot-alertas','Avisos e notificações','Mensagens privadas, comprovantes e regras automáticas.','ico-alert'],
  ['folgas','Folgas por turno','Defina dias de folga por turno ou para todo o servidor.','ico-calendar'],
  ['justificativas','Histórico de justificativas','Consulte solicitações recebidas e analisadas pelo Discord.','ico-list'],
  ['advertencias','Histórico de advertências','Consulte os níveis registrados pelo bot.','ico-alert'],
  ['cancelados','Auditoria dos cartões','Consulte pontos cancelados e os motivos registrados.','ico-file'],
  ['site-preferencias','Preferências do site','Organize sua página inicial, visual e atualização automática.','ico-settings'],
  ['permissoes','Acesso ao site','Escolha cargos com acesso aos relatórios.','ico-settings'],
  ['servidores','Trocar servidor','Escolha outro ambiente, se houver mais de um.','ico-users'],
  ['laboratorio','Laboratório do dono','Simule regras sem alterar registros reais.','ico-spark']]}
};
const parentTab=tab=>(state.navOrigin&&moduleDefs[state.navOrigin]?.items.some(item=>item[0]===tab)?state.navOrigin:null)||Object.keys(moduleDefs).find(key=>moduleDefs[key].items.some(item=>item[0]===tab))||null;
const allowedFeature=tab=>(!tab.startsWith('bot-')||state.canEdit)&&(tab!=='permissoes'||state.canEdit)&&(tab!=='laboratorio'||!!state.data?.isBotOwner)&&(state.data?.viewScope!=='shift'||(!tab.startsWith('bot-')&&!['folgas','permissoes','laboratorio'].includes(tab)));
function svgIcon(symbol){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('ico');svg.setAttribute('aria-hidden','true');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+symbol);svg.append(use);return svg}
function moduleCard({tab,title,description,icon,meta}){
 const b=el('button',undefined,'feature-card');b.type='button';b.setAttribute('aria-label',`Abrir ${title}`);
 const symbol=el('span',undefined,'feature-symbol');symbol.append(svgIcon(icon));const main=el('span',undefined,'feature-info');main.append(el('strong',title),el('small',description));
 const arrow=el('span',undefined,'feature-arrow');arrow.append(svgIcon('ico-arrow'));b.append(symbol,main,arrow);
 if(meta)b.append(el('span',meta,'feature-meta'));b.onclick=()=>openTab(tab);return b;
}
function moduleMetric(tab){const d=state.data||{};switch(tab){case 'presenca':return `${(d.members||[]).length} sincronizados`;case 'ativos':return `${cards().filter(active).length} ativos`;case 'membros':return `${(d.members||[]).length} membros`;case 'justificativas':return `${(d.justifications||[]).filter(x=>x.status==='pending').length} pendentes`;case 'advertencias':return `${(d.warnings||[]).length} registros`;case 'servidores':return `${state.guilds.length} ambiente(s)`;default:return ''}}
function moduleHub(key){
 const def=moduleDefs[key],rows=$('rows');
 const hero=el('div',undefined,'module-hero'),lead=el('div');
 lead.append(el('span','SISTEMAS DISPONÍVEIS','module-kicker'),el('h2',def.title),el('p',def.intro));
 hero.append(lead);const mark=el('span',undefined,'module-hero-icon');mark.append(svgIcon(def.icon));hero.append(mark);rows.append(hero);
 if(key==='configuracoes'){
  const access=el('div',undefined,'bot-access-panel');
  const title=state.canEdit?'Edição do bot liberada':state.data?.viewScope==='shift'?'Acesso de responsável: somente seus turnos':'Bot em modo consulta · ajustes do site disponíveis';
  const explanation=state.canEdit?'Sua conta foi verificada pela API do Discord. Você pode alterar as configurações deste servidor.':
   state.data?.viewScope==='shift'?'Seus cargos de responsável foram validados pelo Discord. O site mostra apenas os dados, relatórios e cancelamentos dos turnos autorizados.':
   state.data?.accessReason==='bot-owner-readonly'?'Você é dono global do bot, mas este servidor não está autorizado para edição. É necessário ser dono ou Administrador deste servidor.':
   state.data?.accessReason==='discord-bot-not-configured'?'Falta DISCORD_BOT_TOKEN na Vercel para verificar seus cargos e permissões.':
   state.data?.accessReason==='discord-unavailable'?'Não foi possível conferir os seus cargos no Discord. Confirme o token do bot e se ele está neste servidor.':
   'Seu cargo precisa ter a permissão oficial Administrador no Discord. Somente o nome do cargo não libera a edição.';
  const accessCopy=el('div',undefined,'bot-access-copy');
  accessCopy.append(el('span','SITUAÇÃO DO ACESSO','config-kicker'),el('strong',title),el('p',explanation));
  const details=state.data?.permissionDetails;
  if(details){
   const roles=Array.isArray(details.assignedRoleNames)?details.assignedRoleNames:[];
   const admins=Array.isArray(details.adminRoleNames)?details.adminRoleNames:[];
   const check=el('div',undefined,'access-role-check');
   check.append(el('strong',state.canEdit?'Administrador validado no Discord':'Discord não confirmou permissão Administrador','access-check-title'));
   check.append(el('p',roles.length?'Cargos detectados nesta conta: '+roles.join(', '):'Nenhum cargo adicional foi detectado nesta conta neste servidor.','access-check-roles'));
   check.append(el('p',admins.length?'Cargos com Administrador: '+admins.join(', '):'Nenhum dos cargos detectados tem a permissão Administrador ativa. Confira o cargo atribuído à sua conta e o servidor selecionado.','access-check-roles'));
   accessCopy.append(check);
  }else if(!state.canEdit){
   accessCopy.append(el('p','Não foi possível confirmar seus cargos. Confira a conexão com o bot, a conta usada no login e o servidor selecionado.','access-check-roles'));
  }
  const verify=el('button','Verificar acesso','button ghost');verify.type='button';verify.onclick=load;
  access.append(accessCopy,verify);rows.append(access);
  const configSearch=el('div',undefined,'config-search');
  const configSearchInput=el('input');configSearchInput.type='search';
  configSearchInput.placeholder='Buscar ponto, turnos, folgas, site, painéis...';
  configSearchInput.setAttribute('aria-label','Pesquisar configurações do bot e do site');
  configSearch.append(svgIcon('ico-settings'),configSearchInput);rows.append(configSearch);
  const groups=[
   {title:'Bot · Ponto e turnos',description:'Regras da equipe, turnos, cargos, logs e avisos que o bot sincroniza.',tabs:['bot-geral','bot-turnos','bot-canais','bot-alertas']},
   {title:'Bot · Painéis do Discord',description:'Edite título, descrição e GIF e acompanhe a prévia dos painéis.',tabs:['bot-painel','bot-painel-just']},
   {title:'Gestão, folgas e auditoria',description:'Folgas editáveis e consultas de justificativas, advertências e cancelamentos.',tabs:['folgas','justificativas','advertencias','cancelados']},
   {title:'Site, permissões e acesso',description:'Preferências deste navegador, permissões do servidor, ambientes e diagnóstico.',tabs:['site-preferencias','permissoes','servidores','laboratorio']}
  ];
  for(const group of groups){
   const items=group.tabs.map(tab=>def.items.find(item=>item[0]===tab)).filter(item=>item&&allowedFeature(item[0]));
   if(!items.length){
    if(!state.canEdit&&group.tabs.some(tab=>tab.startsWith('bot-'))){
     const locked=el('section',undefined,'config-category');
     const heading=el('div',undefined,'config-category-head'),copy=el('div');
     copy.append(el('h3',group.title),el('p','Configuração do bot disponível somente ao dono ou a quem o Discord confirmar a permissão Administrador neste servidor.'));
     heading.append(copy,el('span','Acesso restrito','config-category-count'));
     const info=el('p','Para editar os painéis do Discord, confirme sua conta e seus cargos acima e toque em Verificar acesso.','warning-note');
     locked.append(heading,info);rows.append(locked);
    }
    continue;
   }
   const section=el('section',undefined,'config-category'),head=el('div',undefined,'config-category-head'),copy=el('div');
   copy.append(el('h3',group.title),el('p',group.description));
   head.append(copy,el('span',items.length+' '+(items.length===1?'opção':'opções'),'config-category-count'));
   const cards=el('div',undefined,'feature-grid');
   for(const [tab,title,description,icon] of items)cards.append(moduleCard({tab,title,description,icon,meta:moduleMetric(tab)}));
   section.append(head,cards);rows.append(section);
  }
  const configNoResults=el('p','Nenhuma configuração encontrada. Tente outra palavra.','config-search-empty');
  configNoResults.hidden=true;rows.append(configNoResults);
  const normalizeConfig=s=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  configSearchInput.addEventListener('input',()=>{
   const query=normalizeConfig(configSearchInput.value.trim());let found=0;
   for(const section of rows.querySelectorAll('.config-category')){
    let count=0;
    for(const card of section.querySelectorAll('.feature-card')){
     const matched=normalizeConfig(card.textContent).includes(query);
     card.hidden=!matched;if(matched)count++;
    }
    section.hidden=count===0;found+=count;
    const label=section.querySelector('.config-category-count');
    if(label)label.textContent=count+' '+(count===1?'opção':'opções');
   }
   configNoResults.hidden=found>0;
  });
  return;
 }
 const tools=el('div',undefined,'feature-grid');
 for(const [tab,title,description,icon] of def.items){
  if(!allowedFeature(tab))continue;tools.append(moduleCard({tab,title,description,icon,meta:moduleMetric(tab)}));
 }
 rows.append(tools);
}
function serversPage(){const rows=$('rows'),activeGuild=state.guild,top=el('div',undefined,'server-head');top.append(el('span','AMBIENTES AUTORIZADOS','module-kicker'),el('h2','Servidores vinculados'),el('p','O painel escolhe um servidor automaticamente. A troca só aparece aqui, sem atrapalhar as outras funções.'));rows.append(top);
 const list=el('div',undefined,'server-grid');for(const g of state.guilds){const b=el('button',undefined,'server-option'+(g.guild_id===activeGuild?' selected':''));b.type='button';const identity=el('span',undefined,'server-identity');const avatar=el('span',(g.name||'S').slice(0,1).toUpperCase(),'server-avatar');const txt=el('span');txt.append(el('strong',g.name||'Servidor sem nome'),el('small',g.guild_id===activeGuild?'Ambiente atual':'Servidor autorizado pelo Discord'));identity.append(avatar,txt);b.append(identity,el('span',g.guild_id===activeGuild?'Selecionado':'Selecionar','server-badge'));b.disabled=g.guild_id===activeGuild;b.onclick=async()=>{state.guild=g.guild_id;state.roles=null;state.botEditor=null;state.botDraft=null;state.botDirty=false;state.botError='';$('guild').value=g.guild_id;await load();};list.append(b)}
 rows.append(list);if(state.guilds.length===1)rows.append(el('p','Só existe um servidor autorizado para esta conta; ele já está selecionado.','module-tip'));
}
function setSidebarOpen(open){
 const side=$('sidebar'),overlay=$('sidebarOverlay');if(!side||side.hidden)return;
 side.classList.toggle('open',!!open);overlay.hidden=!open;overlay.classList.toggle('open',!!open);
 $('openSidebar').setAttribute('aria-expanded',String(!!open));
}
function openTab(tab){
 if(!allowedFeature(tab))return;
 if(!(tab in tabInfo))return;
 if(moduleDefs[tab])state.navOrigin=tab;else if(tab==='inicio')state.navOrigin=null;else if(state.tab==='configuracoes')state.navOrigin='configuracoes';
 state.tab=tab;state.search='';setSidebarOpen(false);render();
 const body=$('rows');body.classList.remove('view-enter');void body.offsetWidth;body.classList.add('view-enter');
 if(window.innerWidth<=950)window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function renderNav(){
 const [title,description]=tabInfo[state.tab]||tabInfo.inicio, parent=parentTab(state.tab);
 $('pageTitle').textContent=title;$('pageDescription').textContent=description;
 $('pageEyebrow').textContent=parent?`CENTRAL / ${tabInfo[parent][0].toLocaleUpperCase('pt-BR')}`:'CENTRAL / MÓDULOS';
 $('headerContext').textContent='Painel de gestão · '+title;
 $('ownerBadge').hidden=!state.data?.isBotOwner;
 const guildName=state.guilds.find(g=>g.guild_id===state.guild)?.name||'Servidor atual';
 $('sidebarGuildName').textContent=guildName;
 const crumbs=$('breadcrumbs');
 if(crumbs){
  crumbs.replaceChildren();crumbs.hidden=state.tab==='inicio';
  if(state.tab!=='inicio'){
   const addCrumb=(name,tab,current=false)=>{const c=el(current?'span':'button',name,current?'breadcrumb-current':'breadcrumb-link');if(!current){c.type='button';c.onclick=()=>openTab(tab)}else c.setAttribute('aria-current','page');crumbs.append(c)};
   addCrumb('Início','inicio');
   crumbs.append(el('span','/','breadcrumb-divider'));
   if(parent){addCrumb(tabInfo[parent][0],parent);crumbs.append(el('span','/','breadcrumb-divider'))}
   addCrumb(title,state.tab,true);
  }
 }
 $('moduleBack').hidden=state.tab==='inicio';
 if(state.tab!=='inicio'){const destination=parent||'inicio';$('backToModule').onclick=()=>openTab(destination);$('backToModule').textContent='← Voltar para '+(destination==='inicio'?'Início':tabInfo[destination][0]);}
 const group=parent||state.tab;
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===group));
 $('mobileMore').classList.toggle('active',false);
}
function overview(){
 const rows=$('rows'),data=state.data,all=cards();
 const pending=(data.justifications||[]).filter(x=>x.status==='pending').length;
 const currentName=state.guilds.find(g=>g.guild_id===state.guild)?.name||'Seu servidor';
 const section=el('section',undefined,'home-hero');
 const intro=el('div');intro.append(el('span','SEU ESPAÇO DE TRABALHO','module-kicker'),el('h2','O que vamos gerenciar hoje?'),el('p',`Você está conectado ao ambiente ${currentName}. Selecione um módulo para acessar suas ferramentas.`));
 const meta=el('div',undefined,'home-hero-badge');meta.append(svgIcon('ico-shield'),el('span','Ambiente conectado'));section.append(intro,meta);rows.append(section);
 const snapshot=el('div',undefined,'home-snapshot');
 for(const [label,value,subtitle] of [
  ['Horas validadas',fmt(totaled(all.filter(inPeriod))), 'no período atual'],
  ['Em serviço',String(all.filter(active).length),'cartões ativos'],
  ['Pendências',String(pending),'justificativas em análise']]){
  const tile=el('div',undefined,'snapshot-card');tile.append(el('span',label),el('strong',value),el('small',subtitle));snapshot.append(tile)}rows.append(snapshot);
 rows.append(el('div','ESCOLHA UM SISTEMA','module-section-label'));
 const cardsGrid=el('div',undefined,'home-module-grid');
 for(const [key,title,descr,ico,foot] of [
  ['jornada','Jornada e ponto','Presença, turnos, horas extras e histórico.','ico-clock','4 ferramentas'],
  ['resultados','Resultados e relatórios','Ranking, membros e filtros avançados.','ico-bar','3 ferramentas'],
  ['administracao','Administração','Justificativas, folgas, advertências e auditoria.','ico-shield','4 ferramentas'],
  ['configuracoes','Configurações','Ponto, Discord, folgas, permissões e preferências do site.','ico-settings','Site e bot juntos']]){
  const b=el('button',undefined,'home-module');b.type='button';const avatar=el('span',undefined,'home-module-icon');avatar.append(svgIcon(ico));const copy=el('span',undefined,'home-module-copy');copy.append(el('strong',title),el('small',descr),el('em',foot));const arrow=el('span',undefined,'home-module-arrow');arrow.append(svgIcon('ico-arrow'));b.append(avatar,copy,arrow);b.onclick=()=>openTab(key);cardsGrid.append(b)}rows.append(cardsGrid);
 rows.append(el('p','Cada módulo contém suas próprias telas, consultas e filtros. Os dados continuam sendo recebidos do bot e do Supabase.','module-tip'));
}
function ownerLab(){
 const rows=$('rows'),filters=$('filters'),data=state.data;
 if(!data?.isBotOwner){note(rows,'Acesso restrito ao dono do sistema.');return}
 filters.append(el('p','Seu acesso é verificado pelo servidor usando BOT_OWNER_DISCORD_ID. As simulações abaixo NÃO alteram banco de dados, folgas, horas, cargos ou advertências.','hint'));
 const alert=el('p','MODO DE TESTE • Nenhuma ação desta seção será aplicada ao Discord ou aos membros.','owner-warning');rows.append(alert);
 const grid=el('div',undefined,'owner-tools');rows.append(grid);
 const box=el('div',undefined,'owner-tool');box.append(el('span','SIMULADOR LOCAL','owner-label'),el('h3','Prévia das configurações'),el('p','Escolha valores fictícios e veja como ficaria a configuração antes de pedir alguma mudança real.'));
 const mode=select('Modo de ponto para simulação',[['Em equipe','team'],['Individual','individual']],data.settings?.point_mode||'team',()=>update());
 const sh=select('Turno para simulação',shifts.map(x=>[x,x]),state.shift,()=>update());
 const day=select('Folga semanal para simulação',[['Domingo','0'],['Segunda-feira','1'],['Terça-feira','2'],['Quarta-feira','3'],['Quinta-feira','4'],['Sexta-feira','5'],['Sábado','6']],String((data.settings?.time_off?.weekly?.all||[0])[0]??0),()=>update());
 const out=el('div',undefined,'owner-preview');function update(){const id=sh.querySelector('select').value;const actual=(data.settings?.shift_roles?.[id]||[]).length;out.textContent=`Prévia local: ${mode.querySelector('select').value==='team'?'Equipe':'Individual'} · Turno ${id} · ${actual} cargo(s) configurado(s) no bot · folga semanal de teste: ${day.querySelector('select').selectedOptions[0].text}. Nenhuma mudança foi salva.`;}
 box.append(mode,sh,day,out);update();grid.append(box);
 const audit=el('div',undefined,'owner-tool');audit.append(el('span','CONSULTA PROTEGIDA','owner-label'),el('h3','Simular advertências'),el('p','Consulta o cálculo real de faltas e folgas do servidor, mas não envia notificações nem atribui cargos.'));
 const b=el('button','⚑ Verificar advertências elegíveis','button'),result=el('div',undefined,'owner-preview');b.type='button';b.onclick=async()=>{b.disabled=true;result.replaceChildren(el('p','Consultando a API...'));
 try{const r=await api('warnings-preview?guildId='+encodeURIComponent(state.guild));result.replaceChildren(el('strong',`${r.approvals.length} avaliação(ões) elegível(is)`));const map=members();for(const i of r.approvals.slice(0,10))result.append(person(map.get(i.userId)||{user_id:i.userId},`${i.shift} · ${i.evidenceDays.join(', ')}`,'Simulação'));if(!r.approvals.length)result.append(el('p','Nenhuma dupla de faltas elegível.'));result.append(el('small','Somente leitura: nenhum cargo ou registro foi alterado.'))}
 catch(e){result.replaceChildren(el('p',e.message,'error'))}finally{b.disabled=false}};
 audit.append(b,result);grid.append(audit);
 const perms=el('div',undefined,'owner-tool');perms.append(el('span','SITUAÇÃO ATUAL','owner-label'),el('h3','Permissões e sincronização'),el('p','Conferência somente leitura das configurações recebidas pelo bot.'));
 const n=(k,v)=>perms.append(el('div',`${k}: ${v}`,'owner-preview'));
 n('Cargos administrativos autorizados',String(data.settings?.roles?.allowed?.length||0));n('Turnos configurados',String(shifts.filter(s=>(data.settings?.shift_roles?.[s]||[]).length>0).length));n('Folgas específicas',String(data.settings?.time_off?.dates?.length||0));n('Tabelas ausentes',data.missingSchema?.length?data.missingSchema.join(', '):'Nenhuma identificada');grid.append(perms);
 const guidance=el('div',undefined,'owner-tool');guidance.append(el('span','ACESSO REAL','owner-label'),el('h3','Quem pode alterar o quê?'),el('p','O dono do sistema consulta todos os servidores e faz simulações seguras. O dono de cada servidor controla suas próprias folgas e cargos autorizados. Administradores do Discord com a permissão oficial Administrador podem editar; cargos somente de consulta não podem salvar.'));
 const btn=el('button','▣ Abrir controle de presença','button ghost');btn.onclick=()=>openTab('presenca');guidance.append(btn);grid.append(guidance);
}
// Edição real das configurações do bot. Os controles só são apresentados ao
// dono do servidor; a API também valida permissões, cargos, canais e revisão.
const botUrl=()=>`bot-config?scope=editor&guildId=${encodeURIComponent(state.guild)}`;
// Prévia local de um painel: não publica mensagens no Discord.
function makeDiscordPreview(kind,getVisual){
 const root=el('aside',undefined,'discord-preview-panel');
 root.append(el('span','PRÉVIA AO VIVO','discord-preview-kicker'),el('h3','Visual no Discord'));
 const view=el('div',undefined,'discord-preview-window');
 view.append(el('div',kind==='ponto'?'# bate-ponto':'# justificativas','discord-preview-channel'));
 const message=el('div',undefined,'discord-preview-message');
 const avatar=el('span','C','discord-preview-avatar'),messageBody=el('div',undefined,'discord-preview-body');
 const author=el('div',undefined,'discord-preview-author');
 author.append(el('strong','NERO'),el('span','BOT','discord-preview-bot'),el('small','prévia'));
 const embed=el('div',undefined,'discord-preview-embed'),title=el('strong',undefined,'discord-preview-title');
 const desc=el('p',undefined,'discord-preview-description'),gif=el('img');
 gif.className='discord-preview-gif';gif.alt='Animação configurada para este painel';gif.loading='lazy';gif.hidden=true;
 const imageError=el('p',undefined,'discord-preview-image-hint');imageError.hidden=true;
 embed.append(title,desc,gif,imageError);
 const actions=el('div',undefined,'discord-preview-actions');
 const labels=kind==='ponto'?['Iniciar / Encerrar','Pausar / Retornar','Gerenciar equipe','Meus pontos','Configurações']:['Enviar justificativa','Minhas solicitações'];
 for(const label of labels)actions.append(el('span',label,'discord-preview-action'));
 messageBody.append(author,embed,actions);message.append(avatar,messageBody);view.append(message);
 root.append(view,el('p','Prévia aproximada: os botões são ilustrativos. Nada é enviado ao Discord ao visualizar.','discord-preview-note'));
 const refresh=()=>{
  const v=getVisual()||{};title.textContent=v.title||'Título do painel';desc.textContent=v.description||'Descrição do painel';
  const url=String(v.customGif||'').trim();
  if(gif.dataset.url===url)return;
  gif.dataset.url=url;gif.hidden=true;gif.removeAttribute('src');imageError.hidden=true;
  if(!url)return;
  try{
   const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Apenas HTTPS');
   gif.onerror=()=>{gif.hidden=true;imageError.textContent='O GIF não pôde ser carregado nesta prévia.';imageError.hidden=false};
   gif.src=parsed.href;gif.hidden=false;
  }catch{imageError.textContent='Informe um link HTTPS válido para o GIF.';imageError.hidden=false}
 };
 return {root,refresh};
}
async function fetchBotEditor(){
 if(state.botLoading)return;const forGuild=state.guild;state.botLoading=true;
 try{
  const response=await api(botUrl());
  if(forGuild!==state.guild)return;
  state.botEditor=response;state.botDraft=response.config?JSON.parse(JSON.stringify(response.config)):null;
  state.botDirty=false;state.botError='';
 }catch(e){if(forGuild===state.guild)state.botError=e.message}
 finally{state.botLoading=false;render()}
}
function botConfigPage(){
 const rows=$('rows'),filters=$('filters');filters.hidden=false;
 if(!state.canEdit){
  const reason=state.data?.accessReason;
  const message=reason==='discord-bot-not-configured'?'A verificação de permissões não funciona: falta DISCORD_BOT_TOKEN na Vercel. O selo de dono do bot não dá acesso automático à edição.':
   reason==='discord-unavailable'?'A API não conseguiu confirmar seus cargos no Discord. Verifique o token do bot na Vercel e se ele está neste servidor.':
   reason==='bot-owner-readonly'?'Você é dono do bot, mas isso não significa ser dono deste servidor. Para salvar, precisa ser dono deste servidor ou ter Administrador no Discord.':
   'Sua conta está em modo consulta. Para salvar, precisa ser dono deste servidor ou ter um cargo com a permissão oficial Administrador no Discord.';
  note(rows,message,'warning-note');
 }
 if(!state.botEditor&&!state.botLoading){if(state.botError){note(rows,state.botError,'error');const retry=el('button','Tentar novamente','button');retry.onclick=()=>{state.botError='';fetchBotEditor()};rows.append(retry);return}note(rows,'Carregando configurações e cargos do Discord…');fetchBotEditor();return}
 if(state.botLoading){note(rows,'Consultando configurações do Discord…');return}
 const config=state.botDraft,editor=state.botEditor;
 if(!config){note(rows,'O bot ainda não enviou suas configurações ao site. Atualize o bot na Discloud, confira CENTRAL_API_URL e BOT_SYNC_SECRET e aguarde a sincronização.','warning-note');const r=el('button','Verificar novamente','button');r.onclick=()=>{state.botEditor=null;fetchBotEditor()};rows.append(r);return}
 const intro=el('div',undefined,'bot-config-banner');intro.append(el('strong',state.canEdit?'Configuração vinculada ao Discord':'Visualização sem permissão de edição'),el('p','As mudanças são salvas no site e o bot as recebe na próxima sincronização (aproximadamente 1 minuto). O dono do servidor ou quem tem a permissão Administrador do Discord pode salvar.'));
 const sync=el('span',editor.revision>editor.appliedRevision?'Aguardando confirmação do bot':editor.revision>0?'Configuração recebida pelo bot':'Configuração atual do bot','bot-sync-pill');intro.append(sync);rows.append(intro);
 const grid=el('div',undefined,'bot-config-form');rows.append(grid);
 let livePreview=()=>{};
 const section=(heading,description)=>{const body=el('section',undefined,'bot-section');body.append(el('h3',heading),el('p',description,'bot-section-description'));grid.append(body);return body};
 const update=()=>{state.botDirty=true;state.botError='';const msg=rows.querySelector('.bot-status');if(msg)msg.textContent='Alterações não salvas. Toque em Salvar para enviar ao bot.';livePreview()};
 const field=(wrap,label,value,change,{type='text',max=150,min,maxNum,step}={})=>{const box=el('label',undefined,'bot-field'),text=el('span',label),i=el('input');i.type=type;if(type==='checkbox')i.checked=!!value;else i.value=value??'';if(max)i.maxLength=max;if(min!==undefined)i.min=min;if(maxNum!==undefined)i.max=maxNum;if(step)i.step=step;
  i.onchange=()=>{change(type==='checkbox'?i.checked:type==='number'?Number(i.value):i.value);update()};box.append(text,i);wrap.append(box);return i};
 const drop=(wrap,label,options,value,change,{navigationOnly=false}={})=>{const box=el('label',undefined,'bot-field'),title=el('span',label),sel=el('select');for(const [name,id] of options)sel.append(option(name,id));sel.value=value??'';sel.onchange=()=>{change(sel.value);if(!navigationOnly)update()};box.append(title,sel);wrap.append(box);return sel};
 const roleOptions=[['Nenhum cargo',''],...editor.roles.map(r=>[r.name,r.id])];
 const channelOptions=[['Nenhum canal',''],...editor.channels.map(c=>['#'+c.name,c.id])];
 const rolesMulti=(wrap,label,selected,change)=>{const area=el('fieldset',undefined,'bot-check-group');area.append(el('legend',label));const holder=el('div',undefined,'bot-check-list'),picked=new Set(selected||[]);
  for(const role of editor.roles){const lab=el('label',undefined,'bot-check'),check=el('input');check.type='checkbox';check.checked=picked.has(role.id);check.onchange=()=>{if(check.checked&&picked.size>=5){check.checked=false;uiNotice('Escolha no máximo 5 cargos para este campo.','Limite de cargos');return}if(check.checked)picked.add(role.id);else picked.delete(role.id);change([...picked]);update()};lab.append(check,el('span',role.name));holder.append(lab)}
  area.append(holder);wrap.append(area)};
 const heading=(text)=>grid.append(el('h4',text,'bot-subheading'));
 if(state.tab==='bot-geral'){
  const c=section('Funcionamento do ponto','Defina a modalidade do registro de jornada e o fuso utilizado.');
  const basics=el('div',undefined,'bot-two-cols');c.append(basics);
  const enabled=field(basics,'Ativar equipes no Discord',config.pointMode==='team',v=>config.pointMode=v?'team':'individual',{type:'checkbox'});
  enabled.setAttribute('aria-description','Ativado exige montar a equipe; desligado libera ponto individual. Salve e aguarde sincronização do bot.');
  basics.append(el('p','Ativado: iniciar em equipe, enviar convites e aguardar aceites. Desativado: ponto individual, sem convites. O bot atualiza o painel depois que receber a configuração.','hint'));
  field(basics,'Fuso horário',config.timezone,v=>config.timezone=v,{max:60});
  const team=section('Convites e equipe','Controle o tempo dos convites e a quantidade de integrantes.');
  const teamFields=el('div',undefined,'bot-two-cols');team.append(teamFields);
  field(teamFields,'Duração do convite (minutos)',config.inviteMinutes,v=>config.inviteMinutes=v,{type:'number',min:5,maxNum:60});
  field(teamFields,'Mínimo de integrantes',config.minMembers,v=>config.minMembers=v,{type:'number',min:2,maxNum:4});
  field(teamFields,'Máximo de integrantes',config.maxMembers,v=>config.maxMembers=v,{type:'number',min:2,maxNum:4});
 }
 if(state.tab==='bot-turnos'){
  const c=section('Turnos e escalas','Configure um turno por vez. Você pode voltar para outro turno sem perder o que ainda não salvou.');
  drop(c,'Turno',[['Manhã','manha'],['Tarde','tarde'],['Noite','noite'],['Madrugada','madrugada']],state.botShift,v=>{state.botShift=v;render()},{navigationOnly:true});
  const t=config.shifts[state.botShift];
  const fields=el('div',undefined,'bot-two-cols');c.append(fields);
  field(fields,'Início (HH:MM)',t.start,v=>t.start=v,{type:'time'});
  field(fields,'Fim (HH:MM)',t.end,v=>t.end=v,{type:'time'});
  rolesMulti(c,'Cargos pertencentes ao turno',t.roleIds,v=>t.roleIds=v);
  rolesMulti(c,'Responsáveis pelo turno',t.supervisorRoles,v=>t.supervisorRoles=v);
  c.append(el('p','No site, estes cargos podem consultar exclusivamente o turno selecionado: cartões, cancelamentos, presença, advertências e relatórios. Administração do servidor continua com acesso geral.','hint'));
  drop(c,'Canal de logs deste turno',channelOptions,t.logChannelId,v=>t.logChannelId=v||null);
 }
 if(state.tab==='bot-canais'){
  const core=section('Serviço e auditoria','Selecione o cargo temporário de quem está em serviço e o canal de auditoria.');
  const coreFields=el('div',undefined,'bot-two-cols');core.append(coreFields);
  drop(coreFields,'Cargo temporário: Em serviço',roleOptions,config.serviceRoleId,v=>config.serviceRoleId=v||null);
  drop(coreFields,'Canal de auditoria',channelOptions,config.auditChannelId,v=>config.auditChannelId=v||null);
  const just=section('Canais de justificativas','Defina onde os pedidos serão analisados e registrados.');
  const justFields=el('div',undefined,'bot-two-cols');just.append(justFields);
  drop(justFields,'Canal de análise',channelOptions,config.justifications.reviewChannelId,v=>config.justifications.reviewChannelId=v||null);
  drop(justFields,'Canal de logs',channelOptions,config.justifications.logChannelId,v=>config.justifications.logChannelId=v||null);
  const warnings=section('Advertências','Escolha o canal de avisos e os três cargos de advertência.');
  drop(warnings,'Canal de advertências',channelOptions,config.justifications.warningChannelId,v=>config.justifications.warningChannelId=v||null);
  const warningFields=el('div',undefined,'bot-two-cols');warnings.append(warningFields);
  for(let i=0;i<3;i++)drop(warningFields,`Cargo da ${i+1}ª advertência`,roleOptions,config.justifications.warningRoles[i],v=>config.justifications.warningRoles[i]=v||null);
 }
 if(state.tab==='bot-painel'){
  const c=section('Painel de bate-ponto no Discord','Alterações no painel de ponto já publicado serão sincronizadas pelo bot.');
  const titleInput=field(c,'Título do painel',config.panel.title,v=>config.panel.title=v,{max:100});
  titleInput.addEventListener('input',()=>{config.panel.title=titleInput.value;update()});
  const lab=el('label',undefined,'bot-field');lab.append(el('span','Descrição do painel'));const ta=el('textarea');ta.rows=6;ta.maxLength=1600;ta.value=config.panel.description;ta.oninput=()=>{config.panel.description=ta.value;update()};lab.append(ta);c.append(lab);
  const gifInput=field(c,'Link HTTPS de animação / GIF (opcional)',config.panel.customGif||'',v=>config.panel.customGif=v||null,{max:500});
  gifInput.addEventListener('input',()=>{config.panel.customGif=gifInput.value||null;update()});
  c.append(el('p','Publicar um painel novo no canal ainda exige o comando do bot; editar um painel existente já é automático.','hint'));
  const preview=makeDiscordPreview('ponto',()=>config.panel),layout=el('div',undefined,'discord-editor-layout');
  grid.append(layout);layout.append(c,preview.root);livePreview=preview.refresh;livePreview();
 }
 if(state.tab==='bot-painel-just'){
  const c=section('Painel de justificativas no Discord','Configure apenas a aparência do painel de justificativas. O painel de bate-ponto tem ajustes separados.');
  config.justifications.panelVisual??={title:'Justificativa de ausência',description:'Solicite a análise de uma ausência pela Central de Horas.',customGif:null};
  const jp=config.justifications.panelVisual;
  const titleInput=field(c,'Título do painel de justificativas',jp.title,v=>jp.title=v,{max:100});
  titleInput.addEventListener('input',()=>{jp.title=titleInput.value;update()});
  const lab=el('label',undefined,'bot-field');lab.append(el('span','Descrição do painel de justificativas'));const ta=el('textarea');ta.rows=6;ta.maxLength=1600;ta.value=jp.description;ta.oninput=()=>{jp.description=ta.value;update()};lab.append(ta);c.append(lab);
  const gifInput=field(c,'Link HTTPS do GIF (opcional)',jp.customGif||'',v=>jp.customGif=v||null,{max:500});
  gifInput.addEventListener('input',()=>{jp.customGif=gifInput.value||null;update()});
  c.append(el('p','As ações de justificar e acessar configurações permanecem funcionando. O painel já publicado será atualizado pelo bot após sincronização.','hint'));
  const preview=makeDiscordPreview('justificativa',()=>jp),layout=el('div',undefined,'discord-editor-layout');
  grid.append(layout);layout.append(c,preview.root);livePreview=preview.refresh;livePreview();
 }
 if(state.tab==='bot-alertas'){
  const c=section('Avisos e notificações','Defina o que o bot envia. Para advertências automáticas, primeiro configure os cargos e o canal necessários.');
  field(c,'Enviar mensagens privadas de ponto',config.notifications.pointDm,v=>config.notifications.pointDm=v,{type:'checkbox'});
  c.append(el('p','Os comprovantes agora são enviados como mensagens organizadas no PV, sem imagens ou anexos. Esta mudança passa a valer depois de atualizar o bot na Discloud para a versão 3.7.3.','hint'));
  const enable=field(c,'Ativar advertências automáticas',config.justifications.autoWarnings,v=>config.justifications.autoWarnings=v,{type:'checkbox'});
  enable.onchange=async()=>{if(enable.checked&&!(await uiModal({title:'Ativar advertências automáticas?',message:'Depois da sincronização, o bot poderá aplicar cargos de advertência conforme as regras de presença e justificativas.',confirmLabel:'Sim, ativar'}))){enable.checked=false;return}config.justifications.autoWarnings=enable.checked;update()};
  c.append(el('p','Advertências automáticas requerem canal e três cargos configurados. A análise continua sujeita às regras de presença e às justificativas.','hint'));
 }
 const action=el('div',undefined,'bot-actions'),save=el('button','Salvar configurações do bot','button'),reload=el('button','Descartar alterações e recarregar','button ghost'),status=el('p',state.botError||(state.botDirty?'Alterações não salvas. Toque em Salvar para enviar ao bot.':''),'bot-status');
 save.type='button';save.onclick=async()=>{save.disabled=true;status.textContent='Validando e salvando…';try{
  const result=await api(botUrl(),{method:'POST',body:JSON.stringify({revision:state.botEditor.revision,config:state.botDraft})});
  state.botEditor.revision=result.revision;state.botEditor.config=JSON.parse(JSON.stringify(state.botDraft));state.botDirty=false;state.botError='';
  status.textContent='Salvo! Aguardando o bot aplicar na próxima sincronização.';sync.textContent='Aguardando confirmação do bot';await load();
 }catch(e){status.textContent=e.message;state.botError=e.message}finally{save.disabled=false}};
 reload.type='button';reload.onclick=async()=>{if(state.botDirty&&!(await uiModal({title:'Descartar alterações?',message:'As alterações ainda não salvas serão perdidas. As configurações já salvas no bot não serão apagadas.',confirmLabel:'Descartar alterações'})))return;state.botEditor=null;state.botDraft=null;state.botDirty=false;state.botError='';fetchBotEditor()};
 action.append(save,reload);grid.append(action,status);
 if(!state.canEdit){
  save.disabled=true;status.textContent='Modo consulta: nenhuma alteração será salva.';
  for(const control of grid.querySelectorAll('input, select, textarea, button'))if(control!==reload)control.disabled=true;
 }

}
function render(){if(!state.data)return;const data=state.data;if(data.viewScope==='shift'&&!visibleShifts().includes(state.shift))state.shift=visibleShifts()[0]||'Noite';const all=cards(),period=all.filter(inPeriod),map=members();$('period').value=state.period;$('month').value=state.month||today().slice(0,7);renderNav();
const summaries=[['Normais validadas',fmt(totaled(period,'Normal'))],['Extras validadas',fmt(totaled(period,'Extra'))],['Total validado',fmt(totaled(period))],['Em andamento',String(period.filter(active).length)+(period.filter(active).length===1?' registro':' registros')]];$('stats').replaceChildren();for(const [label,val] of summaries){const box=el('div',undefined,'stat');box.append(el('span',label),el('strong',val));$('stats').append(box)}
const isHub=!!moduleDefs[state.tab]||state.tab==='inicio', hasPeriod=['ranking','mensal','relatorios','membros','ativos','cancelados'].includes(state.tab), hasStats=['ranking','relatorios'].includes(state.tab);
 $('periodToolbar').hidden=!hasPeriod;$('stats').hidden=!hasStats;
 $('moduleContent').classList.toggle('hub-content',isHub);const footerNote=$('footerNote');if(footerNote)footerNote.hidden=isHub;
 const filters=$('filters'),rows=$('rows');filters.replaceChildren();rows.replaceChildren();filters.hidden=isHub;

if(data.missingSchema?.length)filters.append(el('p','Banco Supabase ainda não atualizado: execute ATUALIZAR-SUPABASE.sql para ativar presença, justificativas, advertências e folgas. As horas antigas continuam disponíveis.','error'));
if(state.tab==='inicio')overview();
else if(moduleDefs[state.tab])moduleHub(state.tab);
else if(state.tab==='servidores')serversPage();
else if(state.tab==='laboratorio')ownerLab();
else if(state.tab==='site-preferencias'){if(window.centralSitePrefs)window.centralSitePrefs.render(rows,load);else note(rows,'Não foi possível carregar as preferências do site. Atualize a página.','error')}
else if(state.tab.startsWith('bot-'))botConfigPage();
else if(state.tab==='ranking'){
 filters.append(el('p','Top 10 do período, considerando somente horas validadas. Horas extras não entram na meta diária.','hint'));
 const totals=new Map();for(const c of period.filter(valid)){const x=totals.get(c.user_id)||{normal:0,extra:0};x[c.kind==='Extra'?'extra':'normal']+=Number(c.duration_minutes)||0;totals.set(c.user_id,x)}
 const ranking=[...totals].sort((a,b)=>(b[1].normal+b[1].extra)-(a[1].normal+a[1].extra)).slice(0,10);for(let i=0;i<ranking.length;i++){const [id,v]=ranking[i];rows.append(person(map.get(id)||{user_id:id},`${fmt(v.normal)} normais · ${fmt(v.extra)} extras`,`${i+1}º · ${fmt(v.normal+v.extra)}`))}if(!ranking.length)note(rows,'Ainda não há horas validadas nesse período.');
}else if(state.tab==='presenca')presence();
else if(state.tab==='mensal')monthly();
else if(state.tab==='justificativas')justificationHistory();
else if(state.tab==='advertencias')warnings();
else if(state.tab==='folgas')timeOff();
else if(state.tab==='turno'){
 filters.append(select('Turno',visibleShifts().map(s=>[s,s]),state.shift,v=>{state.shift=v;render()}));const roleIds=data.settings?.shift_roles?.[state.shift]||[];
 const official=(data.members||[]).filter(m=>(m.role_ids||[]).some(r=>roleIds.includes(r)));const todayCards=all.filter(c=>ymd(c.started_at)===today()&&c.shift===state.shift);
 const hours=data.settings?.shift_hours?.[state.shift]||[];filters.append(el('p',`Horário: ${hours.length===2?hours.join(' até '):'não configurado'} · Meta: 2h normais validadas por dia.`, 'hint'));
 rows.append(el('h3','Membros do turno','section-title'));for(const m of official){const n=totaled(todayCards.filter(c=>c.user_id===m.user_id),'Normal');rows.append(person(m,`${fmt(n)} normais validadas hoje`,n>=120?'Meta cumprida':n>0?'Incompleta':'Sem horas',n>=120?'good':''))}if(!official.length)note(rows,'Nenhum membro com o cargo desse turno foi sincronizado.');
 rows.append(el('h3','Horas extras neste turno','section-title'));const extras=todayCards.filter(c=>c.kind==='Extra'&&c.status!=='Cancelado');for(const c of extras)rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`Turno de origem: ${c.origin_shift||'não informado'} · ${c.status}`,fmt(c.duration_minutes)+' extras',c.status==='Validado'?'good':''));if(!extras.length)note(rows,'Nenhuma hora extra registrada hoje.');
}else if(state.tab==='ativos'||state.tab==='cancelados'){
 const status=state.tab==='ativos'?'Ativo':'Cancelado';const subset=period.filter(c=>c.status===status);for(const c of subset)rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`${c.shift} · ${c.kind}${c.cancellation_reason?' · Motivo: '+c.cancellation_reason:''} · ${ymd(c.started_at)}`,status==='Ativo'?fmt(c.duration_minutes):'Cancelado',status==='Ativo'?'good':'bad'));if(!subset.length)note(rows,status==='Ativo'?'Nenhum cartão em andamento nesse período.':'Nenhum cancelamento nesse período.');
}else if(state.tab==='relatorios'){
 const search=el('input');search.placeholder='Pesquisar membro ou cartão';search.value=state.search;search.oninput=()=>{state.search=search.value;const caret=search.selectionStart;render();const next=$('filters').querySelector('input');if(next){next.focus();next.setSelectionRange(caret,caret)}};const lab=el('label','Pesquisa');lab.append(search);filters.append(lab);
 filters.append(select('Situação',[['Todas','todos'],['Validado','Validado'],['Ativo','Ativo'],['Cancelado','Cancelado']],state.status,v=>{state.status=v;render()}));filters.append(select('Tipo',[['Todos','todos'],['Normal','Normal'],['Extra','Extra']],state.kind,v=>{state.kind=v;render()}));filters.append(select('Turno',[['Todos','todos'],...shifts.map(x=>[x,x])],state.reportShift,v=>{state.reportShift=v;render()}));
 const find=state.search.toLocaleLowerCase('pt-BR').trim();const filtered=period.filter(c=>(state.status==='todos'||c.status===state.status)&&(state.kind==='todos'||c.kind===state.kind)&&(state.reportShift==='todos'||c.shift===state.reportShift)&&(!find||`${c.card_id} ${map.get(c.user_id)?.display_name||''}`.toLocaleLowerCase('pt-BR').includes(find)));filters.append(el('p',`${filtered.length} registros encontrados · Exibindo até 300.`, 'hint'));
 for(const c of filtered.slice(0,300))rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`${c.card_id} · ${ymd(c.started_at)} · ${c.shift} · ${c.kind}${c.cancellation_reason?' · '+c.cancellation_reason:''}`,`${c.status} · ${fmt(c.duration_minutes)}`,c.status==='Cancelado'?'bad':c.status==='Validado'?'good':''));if(!filtered.length)note(rows,'Nenhum relatório encontrado.');
}else if(state.tab==='membros'){
 const search=el('input');search.placeholder='Nome ou ID';search.value=state.search;search.oninput=()=>{state.search=search.value;const caret=search.selectionStart;render();const next=$('filters').querySelector('input');if(next){next.focus();next.setSelectionRange(caret,caret)}};const lab=el('label','Buscar membro');lab.append(search);filters.append(lab);
 const assigned=new Set(shifts.flatMap(shift=>official(shift).map(m=>m.user_id)));const filtered=(data.members||[]).filter(m=>assigned.has(m.user_id)&&(m.display_name+' '+m.user_id).toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>a.display_name.localeCompare(b.display_name,'pt-BR'));filters.append(el('p',`${filtered.length} membros cadastrados`, 'hint'));
 for(const m of filtered.slice(0,300)){const own=period.filter(c=>c.user_id===m.user_id);rows.append(person(m,`${fmt(totaled(own,'Normal'))} normais · ${fmt(totaled(own,'Extra'))} extras`,fmt(totaled(own))))}if(!filtered.length)note(rows,'Nenhum membro encontrado.');
}else if(state.tab==='permissoes')renderPermissions(filters,rows,data);
}
async function renderPermissions(filters,rows,data){filters.append(el('p','O dono do servidor e os Administradores do Discord podem liberar cargos para visualizar os relatórios. Turnos e horários podem ser configurados na área Configurar bot.','hint'));
 if(!state.canEdit){note(rows,'Você não tem permissão para editar.');return}
 const box=el('div',undefined,'permissions');rows.append(box);if(!state.roles){note(box,'Carregando cargos do servidor...');try{state.roles=(await api('roles?guildId='+encodeURIComponent(state.guild))).roles;render()}catch(e){box.replaceChildren(el('p',e.message,'error'))}return}
 const field=el('fieldset'),legend=el('legend','Cargos com permissão de leitura');field.append(legend);const selected=new Set(data.settings?.roles?.allowed||[]);for(const role of state.roles){const label=el('label',undefined,'role-option'),check=el('input');check.type='checkbox';check.checked=selected.has(role.id);check.value=role.id;label.append(check,el('strong',role.name));field.append(label)}
 const save=el('button','Salvar permissões','button');save.type='button';save.onclick=async()=>{save.disabled=true;try{const allowedRoles=[...field.querySelectorAll('input:checked')].map(e=>e.value);await api('settings?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify({allowedRoles})});await load();$('syncStatus').textContent='Permissões salvas';$('syncStatus').className='status ok'}catch(e){$('syncStatus').textContent=e.message;$('syncStatus').className='status err'}finally{save.disabled=false}};
 box.append(field,save)
}
async function load(){if(!state.guild)return;const status=$('syncStatus');status.textContent='Sincronizando dados...';status.className='status';try{state.data=await api('data?guildId='+encodeURIComponent(state.guild));state.canEdit=!!state.data.canEdit;if(state.data.viewScope==='shift'){state.botEditor=null;state.botDraft=null;state.botDirty=false;if(!allowedFeature(state.tab))state.tab='inicio'}render();status.textContent=state.data?.missingSchema?.length?'Banco desatualizado · veja o aviso no painel':'Sincronizado · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});status.className=state.data?.missingSchema?.length?'status err':'status ok'}catch(e){$('rows').replaceChildren(el('p',e.message,'error'));status.textContent='Falha ao carregar';status.className='status err'}}
async function start(){
 const inviteHelp=$('inviteHelp');
 if(inviteHelp)inviteHelp.onclick=()=>uiNotice('Clique em “Adicionar bot ao meu servidor”, escolha no Discord um servidor que você administra e autorize as permissões solicitadas. Depois, mantenha o bot online na Discloud para sincronizar os dados com a Central.','Como adicionar o bot');
 try{const me=await api('me');if(!me.user){$('auth').replaceChildren(el('p','Faça login pelo Discord para verificar seus servidores autorizados.'),(()=>{const a=el('a','Entrar com Discord','button login-main-btn');a.href='/api/login';a.append(svgIcon('ico-arrow'));return a})());$('syncStatus').textContent='Login necessário';return}
 $('auth').replaceChildren(el('p',`Conectado como ${me.user.name}`,'muted'));$('logout').hidden=false;$('sidebarLogout').hidden=false;$('sidebarLogout').onclick=()=>$('logout').click();$('logout').onclick=async()=>{try{await api('logout',{method:'POST'});location.reload()}catch(e){$('syncStatus').textContent=e.message}};
 $('userBadge').hidden=false;$('userBadge').textContent='◉ '+me.user.name;
 const result=await api('guilds');state.guilds=result.guilds||[];if(!state.guilds.length){$('auth').append(el('p','Nenhum servidor sincronizado e autorizado apareceu ainda. Confirme se o bot está ligado, fez a primeira sincronização e se sua conta é dona do servidor ou tem cargo permitido.','muted'));$('syncStatus').textContent='Sem servidor autorizado';return}
 $('auth').hidden=true;$('content').hidden=false;document.body.classList.add('logged-in');$('sidebar').hidden=false;$('mobileBottom').hidden=false;$('openSidebar').hidden=false;const guild=$('guild');guild.replaceChildren();for(const g of state.guilds)guild.append(option(g.name||g.guild_id,g.guild_id));state.guild=state.guilds[0].guild_id;guild.value=state.guild;const savedPrefs=window.centralSitePrefs?.read?.();if(savedPrefs){state.tab=savedPrefs.initialTab;state.period=savedPrefs.defaultPeriod;state.navOrigin=moduleDefs[state.tab]?state.tab:null}guild.onchange=()=>{state.guild=guild.value;state.roles=null;state.botEditor=null;state.botDraft=null;state.botDirty=false;load()};$('period').onchange=e=>{state.period=e.target.value;render()};$('month').value=today().slice(0,7);state.month=$('month').value;$('month').onchange=e=>{state.month=e.target.value;state.period='month';render()};$('reload').onclick=load;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));$('openSidebar').onclick=()=>setSidebarOpen(true);$('mobileMore').onclick=()=>setSidebarOpen(true);$('closeSidebar').onclick=()=>setSidebarOpen(false);$('sidebarOverlay').onclick=()=>setSidebarOpen(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')setSidebarOpen(false)});await load();setInterval(()=>{if(!document.hidden&&state.guild&&window.centralSitePrefs?.read?.().autoRefresh!==false)load().catch(()=>{})},30000);
 }catch(e){$('auth').replaceChildren(el('p',e.message,'error'));$('syncStatus').textContent='Falha na configuração';$('syncStatus').className='status err'}}
start();
