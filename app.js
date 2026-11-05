/* Central de Horas — Protótipo navegável. Dados e perfis inteiramente fictícios. */
(() => {
  'use strict';
  const $app = document.getElementById('app');
  const DAY_MS = 86400000;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const shifts = ['Manhã', 'Tarde', 'Noite', 'Madrugada'];
  const colors = ['violet', 'blue', 'pink', 'amber', 'green'];
  const servers = [
    { id:'aurora', name:'Polícia RP • Aurora', abbr:'AU', color:'violet', members:['João Victor','Pedro Henrique','Lucas Almeida','Carlos Eduardo','Rafael Costa','Ana Beatriz','Mateus Silva','Camila Rocha','Bruno Oliveira','Mariana Santos','Felipe Martins','Gabriel Lima'], roles:['Comando Geral','Supervisão','Recursos Humanos','Líder de Turno'] },
    { id:'metropole', name:'Metrópole RP', abbr:'MR', color:'blue', members:['Yasmin Souza','Thiago Ribeiro','Isabela Nunes','Daniel Rocha','Laura Mendes','Renan Castro','Eduarda Lima','Gustavo Alves','Beatriz Pinto','Arthur Gomes','Milena Santos','André Ferreira'], roles:['Diretoria','Administração','Coordenação','Fiscalização'] },
    { id:'nexus', name:'Equipe Nexus', abbr:'NX', color:'pink', members:['Anderson Silva','Sofia Campos','Vinícius Oliveira','Clara Matos','Diego Monteiro','Júlia Ramos','Henrique Melo','Nicolas Duarte','Aline Barbosa','Marcelo Cruz','Larissa Araújo','Samuel Moraes'], roles:['Gerência','Administradores','Supervisores','Responsáveis'] },
  ];
  const paths = {
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    house:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
    trophy:'<path d="M8 21h8m-4-4v4M7 4h10v7a5 5 0 0 1-10 0zM7 6H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-15a4 4 0 0 1 0 8m6 7v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
    chart:'<path d="M3 3v18h18M7 16v-5m5 5V7m5 9v-8"/>',
    shield:'<path d="m12 22 7-4V6l-7-3-7 3v12z"/><path d="m9 12 2 2 4-4"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    x:'<path d="M18 6 6 18M6 6l12 12"/>',
    alert:'<path d="m12 3 10 18H2zM12 9v4m0 4h.01"/>',
    sparkles:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17v4m-2-2h4M5 3v4M3 5h4"/>',
    layers:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 10h18M10 10v11"/>',
    trending:'<path d="m3 17 6-6 4 4 8-8m-6 0h6v6"/>',
    bolt:'<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>',
    file:'<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h8"/>',
    lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    discord:'<path d="M7 6a16 16 0 0 1 10 0l1.6-2.2A18 18 0 0 1 22 6c1 3 1.5 6 .8 9.1a18 18 0 0 1-5.2 3.2l-1.1-1.8c.6-.2 1.2-.5 1.7-.8-.9.7-3.1 1.4-6.2 1.4s-5.3-.7-6.2-1.4c.5.3 1.1.6 1.7.8l-1.1 1.8A18 18 0 0 1 1.2 15C.5 12 1 9 2 6a18 18 0 0 1 3.4-2.2z"/><path d="M8 12h.01M16 12h.01" stroke-width="3" stroke-linecap="round"/>',
    back:'<path d="m15 18-6-6 6-6"/>',
    filter:'<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
  };
  const ic = (name, size=19) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.clock}</svg>`;
  const dateAt = offset => { const d=new Date(today); d.setDate(d.getDate()+offset); return d; };
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtDate = s => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','');
  const fmtFull = d => d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - (today.getDay()+6)%7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
  const startWeek = ymd(weekStart);
  const startMonth = ymd(new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const todayStr = ymd(today);
  const formatHours = minutes => { const m=Math.max(0, Math.round(minutes)); return `${Math.floor(m/60)}h${m%60 ? ` ${String(m%60).padStart(2,'0')}min`:''}`; };
  const formatCompact = minutes => `${(minutes/60).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}h`;
  const sum = (arr,fn) => arr.reduce((a,b)=>a+fn(b),0);
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const isValidated = r => r.status==='Validado';
  const inRange = (r,period) => r.date >= (period==='month'?startMonth:startWeek) && r.date <= todayStr;
  const getDayTime = (shift,duration) => {
    const hours = { 'Manhã':8*60, 'Tarde':14*60, 'Noite':19*60, 'Madrugada':1*60 };
    const h=hours[shift]; const f=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    return [f(h),f(h+duration)];
  };
  let rid=0;
  const allRecords=[];
  servers.forEach((server,sIdx)=>{
    server.members = server.members.map((name,index)=>({ id:`${server.id}-m${index}`, name, initials:name.split(' ').slice(0,2).map(x=>x[0]).join(''), color:colors[(index+sIdx)%colors.length], role:index%3===0?'Líder de turno':index%3===1?'Agente':'Membro' }));
    server.members.forEach((member,i)=>{
      for(let daysAgo=39;daysAgo>=0;daysAgo--){
        const day=dateAt(-daysAgo); if(day.getDay()===0) continue;
        const seed = i*17 + daysAgo*13 + sIdx*11;
        const worked = seed%13!==2 && seed%13!==7 && seed%13!==10;
        if(!worked) continue;
        const duration = 80 + (seed%9)*15;
        const shift = shifts[(i+daysAgo+sIdx)%4];
        const [start,end] = getDayTime(shift,duration);
        const canceled = seed%31===0;
        allRecords.push({id:`CT-${++rid}`,guildId:server.id,memberId:member.id,memberName:member.name,date:ymd(day),start,end,duration,shift,kind:'Normal',status:canceled?'Cancelado':'Validado',reason:canceled?'Cartão encerrado por inconsistência no registro':'',actor:canceled?'Responsável de turno':'Supervisor de equipe'});
        if(seed%6===1 || seed%11===0){
          const extra = 30 + (seed%5)*30;
          const exTime=getDayTime(shifts[(i+daysAgo+1)%4],extra);
          const exCanceled=seed%41===0;
          allRecords.push({id:`CT-${++rid}`,guildId:server.id,memberId:member.id,memberName:member.name,date:ymd(day),start:exTime[0],end:exTime[1],duration:extra,shift:shifts[(i+daysAgo+1)%4],kind:'Extra',status:exCanceled?'Cancelado':'Validado',reason:exCanceled?'Participação cancelada pelo líder da equipe':'',actor:exCanceled?'Líder de turno':'Supervisor de equipe'});
        }
      }
    });
  });
  allRecords.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));

  const storage = {read(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}}, write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
  const state={
    profile:storage.read('ch-profile',null),
    serverId:storage.read('ch-server',null),
    page:'home', period:'week',
    memberId:null,
    memberSearch:'', reportSearch:'', reportStatus:'all', reportKind:'all', reportShift:'all', reportLimit:30,
    permissions:storage.read('ch-permissions',{}), mobileMenu:false,
    toast:null,
  };
  let toastTimeout;
  function accessServers(){
    if(state.profile==='botowner') return servers;
    if(state.profile==='owner') return servers.filter(s=>s.id==='aurora');
    if(state.profile==='admin') return servers.filter(s=>s.id==='aurora'||s.id==='metropole');
    return [];
  }
  function currentServer(){ const allowed=accessServers(); return allowed.find(x=>x.id===state.serverId)||allowed[0]||null; }
  function records(server){return allRecords.filter(r=>r.guildId===server.id);}
  function recordsPeriod(server,period){return records(server).filter(r=>inRange(r,period));}
  function totals(recs){const valid=recs.filter(isValidated);const norm=sum(valid.filter(r=>r.kind==='Normal'),r=>r.duration);const extra=sum(valid.filter(r=>r.kind==='Extra'),r=>r.duration);return {normal:norm,extra,total:norm+extra};}
  function rank(server,period){
    const valid=recordsPeriod(server,period).filter(isValidated);
    return server.members.map(member=>({member,...totals(valid.filter(r=>r.memberId===member.id))})).sort((a,b)=>b.total-a.total||a.member.name.localeCompare(b.member.name,'pt-BR'));
  }
  function dailyNormal(memberId,serverId,dateStr){return sum(allRecords.filter(r=>r.guildId===serverId && r.memberId===memberId && r.date===dateStr && r.kind==='Normal'&&isValidated(r)),r=>r.duration);}
  function completedWeekCount(server){return server.members.filter(m=>totals(recordsPeriod(server,'week').filter(r=>r.memberId===m.id)).normal>=720).length;}
  function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function toast(message){state.toast=message;render();clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{state.toast=null;render();},2700);}
  function go(page){state.page=page;state.memberId=null;state.mobileMenu=false;state.reportLimit=30;window.scrollTo({top:0,behavior:'instant'});render();}
  const avatar=(m,size='')=>`<span class="avatar ${size} ${m.color}">${escapeHTML(m.initials)}</span>`;
  const rankMarker = n => n<=3 ? `<span class="rank-medal m${n}">${['','🥇','🥈','🥉'][n]}</span>` : `<span class="rank-number">${String(n).padStart(2,'0')}</span>`;
  const roleLabel = p => ({botowner:'Dono do bot',owner:'Dono de servidor',admin:'Administrador',member:'Membro comum'})[p]||'Visitante';
  const navEntries = [ ['home','house','Visão geral'], ['ranking','trophy','Ranking'], ['members','users','Membros'], ['reports','chart','Relatórios'], ['permissions','shield','Permissões'] ];
  function navigation(){return navEntries.filter(x=>x[0]!=='permissions'||state.profile==='owner').map(([key,ico,label])=>`<button class="nav-item ${state.page===key?'active':''}" data-go="${key}" aria-current="${state.page===key?'page':'false'}">${ic(ico,20)}<span>${label}</span>${state.page===key?'<i></i>':''}</button>`).join('');}
  function topHeader(server){return `<header class="topbar">
    <div class="top-left"><button class="hamburger" id="menu-btn" aria-label="Abrir menu">${ic('menu')}</button><span class="breadcrumb">Painel <span>/</span> <b>${escapeHTML(({home:'Visão geral',ranking:'Ranking',members:'Membros',reports:'Relatórios',permissions:'Permissões'})[state.page])}</b></span></div>
    <div class="top-actions"><span class="demo-tag"><i></i> MODO DEMO</span><span class="top-divider"></span><div class="profile-avatar">${state.profile==='botowner'?'BOT':state.profile==='owner'?'DS':'AD'}</div><div class="profile-copy"><strong>Conta de teste</strong><small>${roleLabel(state.profile)}</small></div><button class="icon-button exit-top" id="logout" title="Sair">${ic('logout',19)}</button></div>
  </header>`;}
  function sidebar(server){return `<aside class="sidebar ${state.mobileMenu?'sidebar-open':''}"><div class="brand"><span class="brand-mark">${ic('clock',26)}</span><div><strong>Central de <em>Horas</em></strong><small>CONTROLE INTELIGENTE</small></div></div>
    <div class="side-label">ESPAÇO DE TRABALHO</div><div class="sidebar-server"><div class="server-icon ${server.color}">${server.abbr}</div><div><strong>${escapeHTML(server.name)}</strong><span>Servidor conectado</span></div>${ic('chevron',15)}</div>
    <div class="side-label nav-label">MENU PRINCIPAL</div><nav class="side-nav">${navigation()}</nav>
    <div class="side-bottom"><div class="side-hint">${ic('shield',20)}<div><strong>Acesso protegido</strong><span>Relatórios somente leitura. Os registros vêm do bot.</span></div></div><button class="text-logout" id="side-logout">${ic('logout',18)} Encerrar sessão</button></div>
  </aside>${state.mobileMenu?'<div class="sidebar-scrim" id="close-menu"></div>':''}`;}
  function mobileBar(){return `<nav class="mobile-bar" aria-label="Navegação">${navEntries.filter(x=>x[0]!=='permissions'||state.profile==='owner').map(([key,ico,label])=>`<button class="mobile-nav-item ${state.page===key?'active':''}" data-go="${key}">${ic(ico,20)}<span>${key==='home'?'Início':label}</span></button>`).join('')}</nav>`;}
  function serverSelect(server){const allowed=accessServers();return `<label class="server-select"><span>Servidor selecionado</span><div class="select-shell">${ic('layers',18)}<select id="server-choice" aria-label="Selecionar servidor">${allowed.map(s=>`<option value="${s.id}" ${s.id===server.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}</select>${ic('chevron',16)}</div></label>`;}
  function pageIntro(title,desc,server,action=''){return `<div class="page-intro"><div><div class="eyebrow"><span class="eyebrow-dot"></span>PAINEL ADMINISTRATIVO</div><h1>${title}</h1><p>${desc}</p></div><div class="page-controls">${serverSelect(server)}${action}</div></div>`;}
  function metricCard({label,value,subtitle,icon,color='purple'}){return `<article class="metric-card"><div class="metric-card-top"><span>${label}</span><span class="metric-icon ${color}">${ic(icon,19)}</span></div><strong>${value}</strong><div class="metric-sub">${subtitle}</div></article>`;}
  function homePage(server){
    const all=recordsPeriod(server,'week');const t=totals(all);const sorted=rank(server,'week'); const completed=completedWeekCount(server);
    const latest=records(server).slice(0,5);
    const totMonth=totals(recordsPeriod(server,'month'));
    const max=Math.max(1,...sorted.map(p=>p.total));
    const dayData=Array.from({length:6},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);const key=ymd(d);return {label:weekdays[d.getDay()],date:key,future:key>todayStr,value:sum(all.filter(r=>r.date===key&&isValidated(r)&&r.kind==='Normal'),r=>r.duration)};});
    const maxDay=Math.max(120,...dayData.map(d=>d.value));
    return `<section class="hero"><div class="hero-content"><span class="hero-kicker">${ic('sparkles',15)} VISÃO GERAL DO SERVIDOR</span><h2>Uma visão clara de <span>cada hora.</span></h2><p>Consulte registros, acompanhe metas e descubra quem lidera os rankings. Tudo organizado por servidor.</p><div class="hero-foot"><span>${ic('calendar',16)} ${fmtDate(startWeek)} a ${fmtDate(ymd(weekEnd))}</span><span class="hero-separator"></span><span>${ic('shield',16)} Consulta segura</span></div></div><div class="hero-art" aria-hidden="true"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="clock-face"><span class="clock-center"></span><span class="clock-hand-one"></span><span class="clock-hand-two"></span></div></div></section>
      ${pageIntro('Visão geral',`Resumo da semana atual em ${escapeHTML(server.name)}.`,server)}
      <div class="metric-grid">${metricCard({label:'Horas normais',value:formatHours(t.normal),subtitle:'Contabilizadas para a meta',icon:'clock',color:'purple'})}${metricCard({label:'Horas extras',value:formatHours(t.extra),subtitle:'Separadas da meta obrigatória',icon:'bolt',color:'cyan'})}${metricCard({label:'Total da semana',value:formatHours(t.total),subtitle:'Normais + extras validadas',icon:'trending',color:'pink'})}${metricCard({label:'Meta semanal atingida',value:`${completed} <small>/ ${server.members.length}</small>`,subtitle:'Pessoas com 12h normais ou mais',icon:'check',color:'green'})}</div>
      <div class="main-grid"><article class="panel chart-panel"><div class="panel-heading"><div><h3>Horas por dia</h3><p>Horas normais da equipe nesta semana</p></div><span class="small-pill">SEG – SÁB</span></div><div class="chart-area">${dayData.map(d=>`<div class="chart-column"><span class="chart-number">${d.future?'—':formatCompact(d.value)}</span><div class="chart-bar-space"><div class="chart-bar ${d.future?'future':''}" style="height:${d.future?4:Math.max(8,Math.round(d.value/maxDay*100))}%"></div></div><span class="chart-day">${d.label}</span></div>`).join('')}</div><div class="chart-footer"><span><span class="legend-dot"></span> Horas normais</span><span>Registros até ${fmtDate(todayStr)}</span></div></article>
      <article class="panel"><div class="panel-heading"><div><h3>${ic('trophy',19)} Destaques da semana</h3><p>Top 5 por horas totais validadas</p></div><button class="link-action" data-go="ranking">Ver Top 10 ${ic('arrow',15)}</button></div><div class="leader-list">${sorted.slice(0,5).map((p,i)=>`<button class="leader-line" data-member="${p.member.id}"><span class="leader-place">${rankMarker(i+1)}</span>${avatar(p.member,'small')}<span class="leader-name"><strong>${escapeHTML(p.member.name)}</strong><small>${formatHours(p.normal)} normais · ${formatHours(p.extra)} extras</small></span><b>${formatHours(p.total)}</b></button>`).join('')}</div></article></div>
      <div class="main-grid lower-grid"><article class="panel recent-panel"><div class="panel-heading"><div><h3>Atividade recente</h3><p>Últimos cartões registrados</p></div><button class="link-action" data-go="reports">Ver relatórios ${ic('arrow',15)}</button></div>${latest.map(r=>`<div class="activity-line"><span class="activity-symbol ${r.status==='Cancelado'?'bad':'good'}">${ic(r.status==='Cancelado'?'x':'check',17)}</span><div class="activity-description"><strong>${escapeHTML(r.memberName)}</strong><span>${r.kind==='Extra'?'Hora extra':'Hora normal'} • ${r.shift} • ${fmtDate(r.date)}</span></div><span class="activity-end">${r.status==='Cancelado'?'<span class="status-pill canceled">Cancelado</span>':formatHours(r.duration)}</span></div>`).join('')}</article><article class="panel info-panel"><div class="panel-heading"><div><h3>Resumo do mês</h3><p>Acumulado de cartões validados</p></div><span class="small-pill">${today.toLocaleDateString('pt-BR',{month:'long'}).toUpperCase()}</span></div><div class="month-big">${formatHours(totMonth.total)}</div><div class="month-progress"><div style="width:${totMonth.total?totMonth.normal/totMonth.total*100:0}%"></div></div><div class="month-legend"><span><i class="legend-dot"></i>Normais <b>${formatHours(totMonth.normal)}</b></span><span><i class="legend-dot extra"></i>Extras <b>${formatHours(totMonth.extra)}</b></span></div><div class="notice">${ic('info',17)} Horas extras entram no total do ranking, mas não na meta de 2 horas por dia.</div></article></div>`;
  }
  function periodControls(){return `<div class="segmented"><button class="${state.period==='week'?'selected':''}" data-period="week">Esta semana</button><button class="${state.period==='month'?'selected':''}" data-period="month">Este mês</button></div>`;}
  function rankingPage(server){
    const rows=rank(server,state.period).slice(0,10);
    const leaders=[rows[1],rows[0],rows[2]].filter(Boolean);
    return `${pageIntro('Ranking de horas','Classificação por horas normais + extras validadas, sem misturar as metas.',server)}
    <div class="section-bar"><div class="section-title"><h2>${ic('trophy',22)} Top 10 ${state.period==='week'?'da semana':'do mês'}</h2><p>Classificação atual do servidor</p></div>${periodControls()}</div>
    <div class="podium">${leaders.map((p,j)=>{const pos= j===0?2:j===1?1:3;return `<button class="podium-card pos-${pos}" data-member="${p.member.id}"><span class="podium-award">${rankMarker(pos)}</span>${avatar(p.member,'large')}<strong>${escapeHTML(p.member.name)}</strong><span>${escapeHTML(p.member.role)}</span><b>${formatHours(p.total)}</b><small>${formatHours(p.normal)} normais + ${formatHours(p.extra)} extras</small></button>`;}).join('')}</div>
    <article class="panel rank-table"><div class="panel-heading"><div><h3>Classificação completa</h3><p>O total define a posição; a meta considera apenas horas normais.</p></div><span class="small-pill">10 PRIMEIROS</span></div><div class="table-scroller"><table><thead><tr><th>POSIÇÃO</th><th>MEMBRO</th><th>HORAS NORMAIS</th><th>HORAS EXTRAS</th><th>TOTAL</th><th>META SEMANAL</th></tr></thead><tbody>${rows.map((p,i)=>`<tr class="clickable-row" data-member="${p.member.id}"><td>${rankMarker(i+1)}</td><td><div class="table-name">${avatar(p.member,'small')}<strong>${escapeHTML(p.member.name)}</strong></div></td><td>${formatHours(p.normal)}</td><td>${formatHours(p.extra)}</td><td><b class="purple-text">${formatHours(p.total)}</b></td><td>${state.period==='week'?`<span class="status-pill ${p.normal>=720?'validated':'pending'}">${p.normal>=720?'Meta atingida':`${Math.round(p.normal/720*100)}% da meta`}</span>`:'<span class="subtle-text">Meta semanal</span>'}</td></tr>`).join('')}</tbody></table></div></article><div class="notice standalone">${ic('info',17)} Esta prévia usa dados fictícios. A atualização automática virá da validação dos cartões pelo bot quando a integração estiver pronta.</div>`;
  }
  function membersPage(server){
    const search=state.memberSearch.trim().toLocaleLowerCase('pt-BR');
    const totalsByMember=rank(server,'week');
    const visible=server.members.filter(m=>m.name.toLocaleLowerCase('pt-BR').includes(search));
    return `${pageIntro('Membros da equipe','Pesquise pessoas e consulte cartões, horas e metas sem alterar os registros.',server)}<div class="section-bar members-bar"><div class="section-title"><h2>Todos os membros <span class="count-pill">${server.members.length}</span></h2><p>Selecione um membro para abrir seu perfil</p></div><label class="search-wrap">${ic('search',18)}<input id="member-search" placeholder="Buscar por nome..." value="${escapeHTML(state.memberSearch)}" autocomplete="off" /></label></div>
    ${visible.length ? `<div class="member-grid">${visible.map(m=>{const t=totalsByMember.find(p=>p.member.id===m.id);return `<button class="member-card" data-member="${m.id}"><div class="member-card-head">${avatar(m,'medium')}<span class="member-arrow">${ic('arrow',17)}</span></div><strong>${escapeHTML(m.name)}</strong><small>${m.role}</small><div class="member-card-split"><span>Normal <b>${formatHours(t.normal)}</b></span><span>Extra <b>${formatHours(t.extra)}</b></span></div><div class="member-card-bottom"><span>Total na semana</span><strong>${formatHours(t.total)}</strong></div></button>`;}).join('')}</div>`:`<div class="empty">${ic('search',28)}<strong>Nenhum membro encontrado</strong><span>Tente buscar outro nome.</span></div>`}`;
  }
  function memberDetail(server){
    const m=server.members.find(x=>x.id===state.memberId); if(!m) return '';
    const week=totals(recordsPeriod(server,'week').filter(r=>r.memberId===m.id));
    const month=totals(recordsPeriod(server,'month').filter(r=>r.memberId===m.id));
    const daily=Array.from({length:6},(_,i)=>{const date=new Date(weekStart);date.setDate(date.getDate()+i);return {date:ymd(date),name:weekdays[date.getDay()],minutes:dailyNormal(m.id,server.id,ymd(date))};});
    const recent=records(server).filter(r=>r.memberId===m.id).slice(0,8);
    return `<div class="detail-overlay" id="close-detail"><div class="detail-drawer" id="detail-drawer"><button class="close-detail" id="detail-close" aria-label="Fechar">${ic('x')}</button><div class="detail-top">${avatar(m,'xl')}<h2>${escapeHTML(m.name)}</h2><span>${m.role} · ${escapeHTML(server.name)}</span></div><div class="drawer-section"><h3>Esta semana</h3><div class="drawer-stats"><div><span>Normais</span><strong>${formatHours(week.normal)}</strong></div><div><span>Extras</span><strong>${formatHours(week.extra)}</strong></div><div><span>Total</span><strong>${formatHours(week.total)}</strong></div></div><div class="goal-title"><span>Meta semanal — somente normais</span><b>${Math.round(week.normal/720*100)}%</b></div><div class="goal-bar"><i style="width:${clamp(week.normal/720*100,0,100)}%"></i></div><small class="goal-note">${formatHours(week.normal)} de 12 horas obrigatórias</small></div>
    <div class="drawer-section"><h3>Meta diária (seg. a sáb.)</h3><div class="day-status-grid">${daily.map(d=>`<div class="day-status"><strong>${d.name}</strong><span>${d.date>todayStr?'—':formatHours(d.minutes)}</span><small class="${d.date>todayStr?'future':d.minutes>=120?'ok':'off'}">${d.date>todayStr?'Futuro':d.minutes>=120?'Cumpriu':d.minutes===0?'Sem registro':'Abaixo da meta'}</small></div>`).join('')}</div></div>
    <div class="drawer-section"><h3>Resumo do mês</h3><p class="drawer-month">${formatHours(month.normal)} normais · ${formatHours(month.extra)} extras · <b>${formatHours(month.total)} total</b></p></div>
    <div class="drawer-section"><h3>Últimos registros</h3>${recent.length?recent.map(r=>`<div class="mini-event"><div><strong>${r.kind==='Extra'?'Hora extra':'Hora normal'} • ${r.shift}</strong><span>${fmtDate(r.date)} · ${r.start}–${r.end}</span>${r.reason?`<small>Motivo: ${escapeHTML(r.reason)}</small>`:''}</div><span class="status-pill ${r.status==='Validado'?'validated':'canceled'}">${r.status==='Validado'?formatHours(r.duration):'Cancelado'}</span></div>`).join(''):'<p>Sem registros.</p>'}</div><div class="drawer-bottom">${ic('lock',15)} Somente consulta. Nenhuma hora pode ser editada por aqui.</div></div></div>`;
  }
  function reportRows(server){
    const search=state.reportSearch.trim().toLocaleLowerCase('pt-BR');
    return records(server).filter(r=>r.memberName.toLocaleLowerCase('pt-BR').includes(search) && (state.reportStatus==='all'||r.status===state.reportStatus) && (state.reportKind==='all'||r.kind===state.reportKind) && (state.reportShift==='all'||r.shift===state.reportShift));
  }
  function reportsPage(server){
    const rows=reportRows(server);const visible=rows.slice(0,state.reportLimit);const canceled=rows.filter(r=>r.status==='Cancelado').length;const validated=rows.filter(isValidated).length;
    return `${pageIntro('Relatórios e auditoria','Consulte cartões validados e cancelamentos, com responsável e motivo.',server)}
    <div class="report-summary"><div><span class="report-summary-icon">${ic('file',20)}</span><strong>${rows.length}</strong><small>Registros encontrados</small></div><div><span class="report-summary-icon good">${ic('check',20)}</span><strong>${validated}</strong><small>Validados</small></div><div><span class="report-summary-icon bad">${ic('x',20)}</span><strong>${canceled}</strong><small>Cancelados</small></div></div>
    <article class="panel report-panel"><div class="panel-heading"><div><h3>Histórico de cartões</h3><p>Filtros de consulta disponíveis para a administração</p></div><span class="small-pill">${ic('filter',15)} FILTROS</span></div><div class="filters"><label class="search-wrap">${ic('search',18)}<input id="report-search" placeholder="Pesquisar membro..." value="${escapeHTML(state.reportSearch)}" /></label><select id="report-status" aria-label="Situação"><option value="all">Todas as situações</option><option value="Validado" ${state.reportStatus==='Validado'?'selected':''}>Validado</option><option value="Cancelado" ${state.reportStatus==='Cancelado'?'selected':''}>Cancelado</option></select><select id="report-kind" aria-label="Tipo"><option value="all">Normais e extras</option><option value="Normal" ${state.reportKind==='Normal'?'selected':''}>Horas normais</option><option value="Extra" ${state.reportKind==='Extra'?'selected':''}>Horas extras</option></select><select id="report-shift" aria-label="Turno"><option value="all">Todos os turnos</option>${shifts.map(x=>`<option value="${x}" ${state.reportShift===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="table-scroller"><table><thead><tr><th>DATA</th><th>MEMBRO</th><th>TURNO</th><th>PERÍODO</th><th>TIPO</th><th>DURAÇÃO</th><th>SITUAÇÃO</th></tr></thead><tbody>${visible.map(r=>`<tr><td>${fmtDate(r.date)}</td><td><strong>${escapeHTML(r.memberName)}</strong></td><td>${r.shift}</td><td class="time-cell">${r.start}–${r.end}</td><td><span class="kind-pill ${r.kind==='Extra'?'extra':''}">${r.kind==='Extra'?'Hora extra':'Normal'}</span></td><td>${r.status==='Cancelado'?'—':formatHours(r.duration)}</td><td><span class="status-pill ${r.status==='Validado'?'validated':'canceled'}">${r.status}</span>${r.status==='Cancelado'?`<div class="cancel-reason"><b>Motivo:</b> ${escapeHTML(r.reason)}<br/><b>Responsável:</b> ${escapeHTML(r.actor)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>${!visible.length?`<div class="empty compact">${ic('search',24)}<strong>Nenhum cartão encontrado</strong></div>`:''}${rows.length>visible.length?`<div class="load-more"><button id="more-reports" class="outline-button">Carregar mais ${ic('chevron',16)}</button></div>`:''}</article><div class="notice standalone">${ic('shield',17)} Cancelamentos são exibidos para auditoria, mas não entram nas horas normais, extras nem no ranking. Nenhum cartão pode ser alterado pelo site.</div>`;
  }
  function permissionsPage(server){
    const stored=state.permissions[server.id]||{};
    return `${pageIntro('Permissões de acesso','Somente o dono deste servidor escolhe quais cargos terão acesso aos relatórios.',server)}<div class="permission-grid"><article class="panel permission-panel"><div class="panel-heading"><div><h3>${ic('shield',19)} Cargos autorizados</h3><p>Controle ilustrativo para ${escapeHTML(server.name)}</p></div><span class="small-pill">DONO DO SERVIDOR</span></div><div class="permission-description">Selecione os cargos que poderão consultar os rankings, membros e relatórios. Ninguém terá permissão para editar as horas no site.</div><div class="role-list">${server.roles.map((role,i)=>{const enabled = Object.prototype.hasOwnProperty.call(stored,role)?!!stored[role]:i<2;return `<label class="role-row"><span class="role-symbol">${ic('users',18)}</span><span class="role-info"><strong>${role}</strong><small>${enabled?'Pode consultar relatórios':'Sem acesso administrativo'}</small></span><input type="checkbox" class="role-toggle" data-role="${escapeHTML(role)}" ${enabled?'checked':''}/><span class="switch-track"><i></i></span></label>`;}).join('')}</div><div class="notice">${ic('info',17)} No modo de demonstração, as escolhas são salvas apenas neste navegador. O controle real será feito no servidor após conectar o login Discord.</div></article><article class="panel permission-side"><div class="shield-visual">${ic('lock',42)}</div><h3>Segurança por servidor</h3><p>Cada administrador acessará somente os servidores em que tiver cargo autorizado. O dono do bot poderá consultar todos, mas não editar permissões de outros servidores.</p><div class="permission-point">${ic('check',17)} Validação de cargos pelo Discord</div><div class="permission-point">${ic('check',17)} Isolamento de dados por servidor</div><div class="permission-point">${ic('check',17)} Histórico das horas somente leitura</div><span class="small-mock-tag">Integração real: próxima fase</span></article></div>`;
  }
  function loginPage(){
    return `<main class="login-screen"><div class="login-glow glow-one"></div><div class="login-glow glow-two"></div><div class="login-layout"><section class="login-message"><div class="login-brand"><span class="brand-mark">${ic('clock',28)}</span><strong>Central de <em>Horas</em></strong></div><span class="login-chip">${ic('sparkles',15)} NOVA CENTRAL ADMINISTRATIVA</span><h1>Seus registros.<br/><span>Seu controle.</span><br/>Em um só lugar.</h1><p>Monitore horas normais, horas extras, metas e rankings dos seus servidores Discord em um painel moderno.</p><div class="login-features"><span>${ic('check',16)} Ranking semanal e mensal</span><span>${ic('check',16)} Relatórios por servidor</span><span>${ic('check',16)} Visual adaptado para celular</span></div><div class="login-preview"><div class="preview-top"><span><i></i> Painel de horas</span><small>PREVIEW</small></div><div class="preview-values"><div><small>Normais</small><strong>96h</strong></div><div><small>Extras</small><strong>24h</strong></div><div><small>Total</small><strong>120h</strong></div></div><div class="preview-bars"><i style="height:45%"></i><i style="height:72%"></i><i style="height:59%"></i><i style="height:89%"></i><i style="height:67%"></i><i style="height:94%"></i><i style="height:70%"></i></div></div></section>
    <section class="login-card"><div class="login-card-header"><span class="login-card-icon">${ic('shield',28)}</span><h2>Bem-vindo ao painel</h2><p>Entre para visualizar as informações do seu servidor.</p></div><button class="discord-btn" disabled title="Ativaremos o login quando a integração com Discord estiver configurada">${ic('discord',21)} Entrar com Discord <span>Em breve</span></button><div class="login-divider"><span>EXPERIMENTE A INTERFACE</span></div><label class="field-label" for="demo-profile">Escolha um perfil de demonstração</label><div class="login-select">${ic('users',19)}<select id="demo-profile"><option value="owner">Dono de servidor</option><option value="admin">Administrador autorizado</option><option value="botowner">Dono do bot (acesso global, leitura)</option><option value="member">Membro comum (acesso negado)</option></select>${ic('chevron',16)}</div><button class="primary-btn login-submit" id="login-demo">Explorar painel ${ic('arrow',19)}</button><p class="login-disclaimer">${ic('info',15)} Versão de demonstração com dados fictícios. Nenhuma conta do Discord é conectada neste momento.</p></section></div><div class="login-bottom">Central de Horas · Desenvolvido para integração com Discord <span>v0.1 DEMO</span></div></main>`;
  }
  function noAccess(){return `<main class="unauthorized"><span class="brand-mark">${ic('clock',24)}</span><div class="blocked-icon">${ic('lock',35)}</div><h1>Acesso administrativo necessário</h1><p>Este perfil de demonstração é um membro comum e não tem permissão para consultar relatórios. No site real, o acesso dependerá dos cargos autorizados pelo dono do servidor.</p><button class="primary-btn" id="logout">Voltar para entrada ${ic('arrow',18)}</button></main>`;}
  function render(){
    if(!state.profile){$app.innerHTML=loginPage();bindEvents();return;}
    const allowed=accessServers();if(!allowed.length){$app.innerHTML=noAccess();bindEvents();return;}
    const server=currentServer();if(!server){$app.innerHTML=noAccess();bindEvents();return;}state.serverId=server.id;storage.write('ch-server',server.id);
    if(state.page==='permissions' && state.profile!=='owner') state.page='home';
    const pageContent=({home:homePage,ranking:rankingPage,members:membersPage,reports:reportsPage,permissions:permissionsPage})[state.page](server);
    $app.innerHTML=`<div class="app-layout">${sidebar(server)}<div class="app-right">${topHeader(server)}<div class="demo-strip">${ic('info',15)} Prévia navegável: nomes, servidores e horas são exemplos. Login Discord e banco ainda não conectados.</div><main class="main-content">${pageContent}</main><footer class="app-footer"><span>© Central de Horas · Painel demonstrativo</span><span>Feito para desktop e mobile</span></footer></div>${mobileBar()}${state.memberId?memberDetail(server):''}${state.toast?`<div class="toast">${ic('check',17)} ${escapeHTML(state.toast)}</div>`:''}</div>`;
    bindEvents();
  }
  function bindEvents(){
    document.querySelector('#login-demo')?.addEventListener('click',()=>{state.profile=document.querySelector('#demo-profile').value;storage.write('ch-profile',state.profile);state.page='home';state.serverId=null;state.memberId=null;render();});
    document.querySelectorAll('#logout,#side-logout').forEach(el=>el.addEventListener('click',()=>{state.profile=null;state.memberId=null;state.mobileMenu=false;storage.write('ch-profile',null);render();}));
    document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
    document.querySelector('#server-choice')?.addEventListener('change',e=>{state.serverId=e.target.value;state.memberId=null;render();});
    document.querySelector('#menu-btn')?.addEventListener('click',()=>{state.mobileMenu=!state.mobileMenu;render();});
    document.querySelector('#close-menu')?.addEventListener('click',()=>{state.mobileMenu=false;render();});
    document.querySelectorAll('[data-period]').forEach(el=>el.addEventListener('click',()=>{state.period=el.dataset.period;render();}));
    document.querySelectorAll('[data-member]').forEach(el=>el.addEventListener('click',()=>{state.memberId=el.dataset.member;render();}));
    const closeDetail=()=>{state.memberId=null;render();};
    document.querySelector('#detail-close')?.addEventListener('click',closeDetail);
    document.querySelector('#close-detail')?.addEventListener('click',e=>{if(e.target.id==='close-detail')closeDetail();});
    const onFilterText=(selector,key)=>{document.querySelector(selector)?.addEventListener('input',e=>{const val=e.target.value;const start=e.target.selectionStart;state[key]=val;render();const input=document.querySelector(selector);input?.focus();try{input?.setSelectionRange(start,start);}catch{}});};
    onFilterText('#member-search','memberSearch');onFilterText('#report-search','reportSearch');
    [['#report-status','reportStatus'],['#report-kind','reportKind'],['#report-shift','reportShift']].forEach(([selector,key])=>document.querySelector(selector)?.addEventListener('change',e=>{state[key]=e.target.value;state.reportLimit=30;render();}));
    document.querySelector('#more-reports')?.addEventListener('click',()=>{state.reportLimit+=30;render();});
    document.querySelectorAll('.role-toggle').forEach(el=>el.addEventListener('change',e=>{
      if(state.profile!=='owner') return;
      const server=currentServer();state.permissions[server.id]??={};state.permissions[server.id][e.target.dataset.role]=e.target.checked;
      storage.write('ch-permissions',state.permissions);toast(`Permissão ${e.target.checked?'habilitada':'desabilitada'} nesta demonstração.`);
    }));
    document.onkeydown=e=>{if(e.key==='Escape'&&state.memberId)closeDetail();else if(e.key==='Escape'&&state.mobileMenu){state.mobileMenu=false;render();}};
  }
  render();
})();
