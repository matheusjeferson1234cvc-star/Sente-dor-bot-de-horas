'use strict';
// O painel de produção lê exclusivamente a API autenticada. Dados fictícios ficam em /demo.html.
const $=id=>document.getElementById(id);
const state={guild:null,data:null,guilds:[],canEdit:false,tab:'ranking',period:'week',month:null,shift:'Noite',presenceDate:null,offShift:'all',search:'',status:'todos',kind:'todos',reportShift:'todos',roles:null};
const shifts=['Manhã','Tarde','Noite','Madrugada'];
const api=async (path,options={})=>{const r=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});let d;try{d=await r.json()}catch{throw Error('A API não respondeu em JSON. Confira se a pasta api foi publicada na raiz do projeto Vercel (possível erro 404).')}if(!r.ok)throw Error(d.error||`Erro HTTP ${r.status}`);return d};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const fmt=m=>{const n=Math.max(0,Math.floor(Number(m)||0));return `${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}min`};
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
 filters.append(select('Turno',shifts.map(x=>[x,x]),shift,v=>{state.shift=v;render()}));
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
 if(state.data?.isBotOwner){const b=el('button','Simular análise de faltas (sem alterações)','button ghost');b.onclick=()=>{const remaining=lines.filter(x=>x.streak>=2);note(rows,remaining.length?`${remaining.length} pessoa(s) com dois ou mais dias consecutivos registrados como falta. Prévia apenas: nenhum cargo ou advertência foi aplicado.`:'Simulação: não há sequência de duas faltas confirmadas entre os membros desse turno. Nenhuma ação foi executada.','warning-note')};rows.append(b)}
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
 for(const j of all.slice(0,250)){rows.append(person(map.get(j.user_id)||{user_id:j.user_id},`${j.day} · ${j.shift} · ${j.reason}`,j.status==='approved'?'Aprovada':j.status==='rejected'?'Recusada':'Em análise',j.status==='approved'?'good':j.status==='rejected'?'bad':''))}
 if(!all.length)note(rows,'Nenhuma justificativa sincronizada. Use o painel de justificativas no Discord para enviar e analisar.');
}
function warnings(){const rows=$('rows'),all=state.data?.warnings||[],map=members();rows.append(el('h3','Histórico de advertências','section-title'));
 for(const w of all.slice(0,250))rows.append(person(map.get(w.user_id)||{user_id:w.user_id},`${w.day} · ${w.shift} · ${w.reason}`,`Nível ${w.level} · ${w.status==='active'?'Ativa':'Revogada'}`,w.status==='active'?'bad':'good'));
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
 const list=el('div');for(const item of off.dates||[]){const r=el('div',undefined,'list-row');r.append(el('span',`${item.date} • ${item.shift==='all'?'Todos os turnos':item.shift}`));
  if(state.canEdit){const remove=el('button','Remover','button ghost');remove.onclick=async()=>{try{await api('time-off?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify({...off,dates:off.dates.filter(d=>d.date!==item.date||d.shift!==item.shift)})});await load()}catch(e){note(rows,e.message,'error')}};r.append(remove)}list.append(r)}rows.append(list);
 if(!state.canEdit)rows.append(el('p','Somente o dono deste servidor pode alterar folgas. O dono global do sistema pode consultar e testar, sem editar servidores alheios.','warning-note'));
}
function render(){if(!state.data)return;const data=state.data,all=cards(),period=all.filter(inPeriod),map=members();$('period').value=state.period;$('month').value=state.month||today().slice(0,7);$('permissionsTab').hidden=!state.canEdit;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
const summaries=[['Normais validadas',fmt(totaled(period,'Normal'))],['Extras validadas',fmt(totaled(period,'Extra'))],['Total validado',fmt(totaled(period))],['Em andamento',String(period.filter(active).length)+' registros']];$('stats').replaceChildren();for(const [label,val] of summaries){const box=el('div',undefined,'stat');box.append(el('span',label),el('strong',val));$('stats').append(box)}
const filters=$('filters'),rows=$('rows');filters.replaceChildren();rows.replaceChildren();
if(state.tab==='ranking'){
 filters.append(el('p','Top 10 do período, considerando somente horas validadas. Horas extras não entram na meta diária.','hint'));
 const totals=new Map();for(const c of period.filter(valid)){const x=totals.get(c.user_id)||{normal:0,extra:0};x[c.kind==='Extra'?'extra':'normal']+=Number(c.duration_minutes)||0;totals.set(c.user_id,x)}
 const ranking=[...totals].sort((a,b)=>(b[1].normal+b[1].extra)-(a[1].normal+a[1].extra)).slice(0,10);for(let i=0;i<ranking.length;i++){const [id,v]=ranking[i];rows.append(person(map.get(id)||{user_id:id},`${fmt(v.normal)} normais · ${fmt(v.extra)} extras`,`${i+1}º · ${fmt(v.normal+v.extra)}`))}if(!ranking.length)note(rows,'Ainda não há horas validadas nesse período.');
}else if(state.tab==='presenca')presence();
else if(state.tab==='mensal')monthly();
else if(state.tab==='justificativas')justificationHistory();
else if(state.tab==='advertencias')warnings();
else if(state.tab==='folgas')timeOff();
else if(state.tab==='turno'){
 filters.append(select('Turno',shifts.map(s=>[s,s]),state.shift,v=>{state.shift=v;render()}));const roleIds=data.settings?.shift_roles?.[state.shift]||[];
 const official=(data.members||[]).filter(m=>(m.role_ids||[]).some(r=>roleIds.includes(r)));const todayCards=all.filter(c=>ymd(c.started_at)===today()&&c.shift===state.shift);
 const hours=data.settings?.shift_hours?.[state.shift]||[];filters.append(el('p',`Horário: ${hours.length===2?hours.join(' até '):'não configurado'} · Meta: 2h normais validadas por dia.`, 'hint'));
 rows.append(el('h3','Membros do turno','section-title'));for(const m of official){const n=totaled(todayCards.filter(c=>c.user_id===m.user_id),'Normal');rows.append(person(m,`${fmt(n)} normais validadas hoje`,n>=120?'Meta cumprida':n>0?'Incompleta':'Sem horas',n>=120?'good':''))}if(!official.length)note(rows,'Nenhum membro com o cargo desse turno foi sincronizado.');
 rows.append(el('h3','Horas extras neste turno','section-title'));const extras=todayCards.filter(c=>c.kind==='Extra'&&c.status!=='Cancelado');for(const c of extras)rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`Turno de origem: ${c.origin_shift||'não informado'} · ${c.status}`,fmt(c.duration_minutes)+' extras',c.status==='Validado'?'good':''));if(!extras.length)note(rows,'Nenhuma hora extra registrada hoje.');
}else if(state.tab==='ativos'||state.tab==='cancelados'){
 const status=state.tab==='ativos'?'Ativo':'Cancelado';const subset=period.filter(c=>c.status===status);for(const c of subset)rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`${c.shift} · ${c.kind}${c.cancellation_reason?' · Motivo: '+c.cancellation_reason:''} · ${ymd(c.started_at)}`,status==='Ativo'?fmt(c.duration_minutes):'Cancelado',status==='Ativo'?'good':'bad'));if(!subset.length)note(rows,status==='Ativo'?'Nenhum cartão em andamento nesse período.':'Nenhum cancelamento nesse período.');
}else if(state.tab==='relatorios'){
 const search=el('input');search.placeholder='Pesquisar membro ou cartão';search.value=state.search;search.oninput=()=>{state.search=search.value;render()};const lab=el('label','Pesquisa');lab.append(search);filters.append(lab);
 filters.append(select('Situação',[['Todas','todos'],['Validado','Validado'],['Ativo','Ativo'],['Cancelado','Cancelado']],state.status,v=>{state.status=v;render()}));filters.append(select('Tipo',[['Todos','todos'],['Normal','Normal'],['Extra','Extra']],state.kind,v=>{state.kind=v;render()}));filters.append(select('Turno',[['Todos','todos'],...shifts.map(x=>[x,x])],state.reportShift,v=>{state.reportShift=v;render()}));
 const find=state.search.toLocaleLowerCase('pt-BR').trim();const filtered=period.filter(c=>(state.status==='todos'||c.status===state.status)&&(state.kind==='todos'||c.kind===state.kind)&&(state.reportShift==='todos'||c.shift===state.reportShift)&&(!find||`${c.card_id} ${map.get(c.user_id)?.display_name||''}`.toLocaleLowerCase('pt-BR').includes(find)));filters.append(el('p',`${filtered.length} registros encontrados · Exibindo até 300.`, 'hint'));
 for(const c of filtered.slice(0,300))rows.append(person(map.get(c.user_id)||{user_id:c.user_id},`${c.card_id} · ${ymd(c.started_at)} · ${c.shift} · ${c.kind}${c.cancellation_reason?' · '+c.cancellation_reason:''}`,`${c.status} · ${fmt(c.duration_minutes)}`,c.status==='Cancelado'?'bad':c.status==='Validado'?'good':''));if(!filtered.length)note(rows,'Nenhum relatório encontrado.');
}else if(state.tab==='membros'){
 const search=el('input');search.placeholder='Nome ou ID';search.value=state.search;search.oninput=()=>{state.search=search.value;render()};const lab=el('label','Buscar membro');lab.append(search);filters.append(lab);
 const assigned=new Set(shifts.flatMap(shift=>official(shift).map(m=>m.user_id)));const filtered=(data.members||[]).filter(m=>assigned.has(m.user_id)&&(m.display_name+' '+m.user_id).toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>a.display_name.localeCompare(b.display_name,'pt-BR'));filters.append(el('p',`${filtered.length} membros cadastrados`, 'hint'));
 for(const m of filtered.slice(0,300)){const own=period.filter(c=>c.user_id===m.user_id);rows.append(person(m,`${fmt(totaled(own,'Normal'))} normais · ${fmt(totaled(own,'Extra'))} extras`,fmt(totaled(own))))}if(!filtered.length)note(rows,'Nenhum membro encontrado.');
}else if(state.tab==='permissoes')renderPermissions(filters,rows,data);
}
async function renderPermissions(filters,rows,data){filters.append(el('p','Somente o dono do servidor pode liberar cargos para visualizar os relatórios. Os cargos e horários dos turnos continuam sendo configurados no bot.','hint'));
 if(!state.canEdit){note(rows,'Você não tem permissão para editar.');return}
 const box=el('div',undefined,'permissions');rows.append(box);if(!state.roles){note(box,'Carregando cargos do servidor...');try{state.roles=(await api('roles?guildId='+encodeURIComponent(state.guild))).roles;render()}catch(e){box.replaceChildren(el('p',e.message,'error'))}return}
 const field=el('fieldset'),legend=el('legend','Cargos com permissão de leitura');field.append(legend);const selected=new Set(data.settings?.roles?.allowed||[]);for(const role of state.roles){const label=el('label',undefined,'role-option'),check=el('input');check.type='checkbox';check.checked=selected.has(role.id);check.value=role.id;label.append(check,el('strong',role.name));field.append(label)}
 const save=el('button','Salvar permissões','button');save.type='button';save.onclick=async()=>{save.disabled=true;try{const allowedRoles=[...field.querySelectorAll('input:checked')].map(e=>e.value);await api('settings?guildId='+encodeURIComponent(state.guild),{method:'POST',body:JSON.stringify({allowedRoles})});await load();$('syncStatus').textContent='Permissões salvas';$('syncStatus').className='status ok'}catch(e){$('syncStatus').textContent=e.message;$('syncStatus').className='status err'}finally{save.disabled=false}};
 box.append(field,save)
}
async function load(){if(!state.guild)return;const status=$('syncStatus');status.textContent='Sincronizando dados...';status.className='status';try{state.data=await api('data?guildId='+encodeURIComponent(state.guild));state.canEdit=!!state.data.canEdit;render();status.textContent='Sincronizado · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});status.className='status ok'}catch(e){$('rows').replaceChildren(el('p',e.message,'error'));status.textContent='Falha ao carregar';status.className='status err'}}
async function start(){try{const me=await api('me');if(!me.user){$('auth').replaceChildren(el('p','Faça login pelo Discord para verificar seus servidores autorizados.'),(()=>{const a=el('a','Entrar com Discord','button');a.href='/api/login';return a})());$('syncStatus').textContent='Login necessário';return}
 $('auth').replaceChildren(el('p',`Conectado como ${me.user.name}`,'muted'));$('logout').hidden=false;$('logout').onclick=async()=>{try{await api('logout',{method:'POST'});location.reload()}catch(e){$('syncStatus').textContent=e.message}};
 const result=await api('guilds');state.guilds=result.guilds||[];if(!state.guilds.length){$('auth').append(el('p','Nenhum servidor sincronizado e autorizado apareceu ainda. Confirme se o bot está ligado, fez a primeira sincronização e se sua conta é dona do servidor ou tem cargo permitido.','muted'));$('syncStatus').textContent='Sem servidor autorizado';return}
 $('auth').hidden=true;$('content').hidden=false;document.body.classList.add('logged-in');const guild=$('guild');guild.replaceChildren();for(const g of state.guilds)guild.append(option(g.name||g.guild_id,g.guild_id));state.guild=state.guilds[0].guild_id;guild.value=state.guild;guild.onchange=()=>{state.guild=guild.value;state.roles=null;load()};$('period').onchange=e=>{state.period=e.target.value;render()};$('month').value=today().slice(0,7);state.month=$('month').value;$('month').onchange=e=>{state.month=e.target.value;state.period='month';render()};$('reload').onclick=load;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;state.search='';render()});await load();setInterval(()=>{if(!document.hidden&&state.guild)load().catch(()=>{})},60000);
 }catch(e){$('auth').replaceChildren(el('p',e.message,'error'));$('syncStatus').textContent='Falha na configuração';$('syncStatus').className='status err'}}
start();
