/* Busca global da Central de Horas — interface somente de navegacao. */
(function(){
 const destinations=[
 ['inicio','Início','Visão geral e atalhos'],
 ['jornada','Jornada e ponto','Turnos, presença e cartões'],
 ['presenca','Controle de presença','Meta diária e faltas'],
 ['turno','Escalas e turnos','Equipes e horas extras'],
 ['ativos','Em serviço','Cartões de ponto ativos'],
 ['mensal','Histórico mensal','Horas por mês e por turno'],
 ['resultados','Resultados e relatórios','Classificações e consultas'],
 ['ranking','Ranking','Horas normais e extras'],
 ['membros','Membros','Consultar integrantes'],
 ['relatorios','Relatórios','Pesquisar cartões'],
 ['administracao','Administração','Auditoria e solicitações'],
 ['justificativas','Justificativas','Solicitações do Discord'],
 ['advertencias','Advertências','Histórico de níveis'],
 ['cancelados','Cancelamentos','Cartões cancelados'],
 ['configuracoes','Central de configurações','Ajustes do bot e do site reunidos'],
 ['site-preferencias','Preferências do site','Aparência, página inicial e atualização'],
 ['folgas','Folgas por turno','Datas e dias de folga'],
 ['bot-geral','Regras do ponto','Equipes e convites'],
 ['bot-turnos','Turnos e cargos','Horários, cargos e responsáveis'],
 ['bot-canais','Canais e cargos','Logs, auditoria e avisos'],
 ['bot-painel','Painel de bate-ponto','Prévia do painel no Discord'],
 ['bot-painel-just','Painel de justificativas','Prévia das justificativas'],
 ['bot-alertas','Avisos e notificações','Mensagens automáticas'],
 ['permissoes','Acesso ao site','Permissões administrativas'],
 ['servidores','Trocar servidor','Ambientes disponíveis']
 ];
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 function initialize(){
  const header=document.querySelector('.top-right');if(!header||document.getElementById('quickSearchTrigger'))return;
  const trigger=document.createElement('button');trigger.id='quickSearchTrigger';trigger.type='button';trigger.className='quick-search-trigger';trigger.hidden=true;trigger.setAttribute('aria-label','Buscar uma página na Central de Horas');
  trigger.innerHTML='<svg class="ico" aria-hidden="true"><use href="#ico-settings"/></svg><span>Buscar página</span><kbd>Ctrl K</kbd>';
  header.prepend(trigger);
  const dialog=document.createElement('dialog');dialog.className='quick-nav-dialog';dialog.setAttribute('aria-label','Navegação rápida');
  dialog.innerHTML='<div class="quick-nav-head"><svg class="ico" aria-hidden="true"><use href="#ico-settings"/></svg><input type="search" placeholder="O que você procura?" aria-label="Pesquisar páginas"><button class="quick-nav-close" type="button" aria-label="Fechar busca">✕</button></div><div class="quick-nav-list" role="listbox"></div><p class="quick-nav-tip">Digite para filtrar · Enter para abrir · Esc para fechar</p>';
  document.body.append(dialog);
  const input=dialog.querySelector('input'),list=dialog.querySelector('.quick-nav-list'),close=dialog.querySelector('.quick-nav-close');
  let visible=[],cursor=0;
  function navigate(tab){dialog.close();if(typeof window.openTab==='function')window.openTab(tab);else {const button=document.querySelector('[data-tab="'+tab+'"]');if(button)button.click()}}
  function render(){
   const term=normalize(input.value.trim());visible=destinations.filter(d=>normalize(d.slice(1).join(' ')).includes(term));cursor=0;list.replaceChildren();
   if(!visible.length){const empty=document.createElement('p');empty.className='quick-nav-empty';empty.textContent='Nenhuma página encontrada. Tente outra palavra.';list.append(empty);return}
   visible.forEach((d,i)=>{const item=document.createElement('button');item.type='button';item.className='quick-nav-item'+(i===cursor?' selected':'');item.setAttribute('role','option');item.setAttribute('aria-selected',String(i===cursor));const meta=document.createElement('span'),title=document.createElement('strong'),desc=document.createElement('small');title.textContent=d[1];desc.textContent=d[2];meta.append(title,desc);item.append(meta);const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');item.append(arrow);item.onclick=()=>navigate(d[0]);list.append(item)});
  }
  function open(){if(trigger.hidden||dialog.open)return;input.value='';render();dialog.showModal();input.focus()}
  function updateSelection(){Array.from(list.querySelectorAll('.quick-nav-item')).forEach((item,i)=>{item.classList.toggle('selected',i===cursor);item.setAttribute('aria-selected',String(i===cursor))});list.children[cursor]?.scrollIntoView({block:'nearest'})}
  trigger.onclick=open;close.onclick=()=>dialog.close();input.oninput=render;
  input.onkeydown=e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();cursor=(cursor+(e.key==='ArrowDown'?1:-1)+visible.length)%Math.max(1,visible.length);updateSelection()}else if(e.key==='Enter'&&visible[cursor]){e.preventDefault();navigate(visible[cursor][0])}};
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  document.addEventListener('keydown',e=>{const typing=e.target?.matches?.('input,textarea,select,[contenteditable="true"]');if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){if(!trigger.hidden){e.preventDefault();open()}}else if(e.key==='/'&&!typing&&!dialog.open&&!trigger.hidden){e.preventDefault();open()}});
  const showIfLogged=()=>{trigger.hidden=!document.body.classList.contains('logged-in')};
  const observer=new MutationObserver(showIfLogged);observer.observe(document.body,{attributes:true,attributeFilter:['class']});showIfLogged();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
