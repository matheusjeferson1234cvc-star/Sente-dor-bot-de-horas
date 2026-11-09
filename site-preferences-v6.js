'use strict';
// Preferências locais do site. Não altera bot, cargos, registros ou banco de dados.
(function(){
 const STORAGE_KEY='central-de-horas:site-preferences:v1';
 const defaults={compact:false,reduceMotion:false,highContrast:false,autoRefresh:true,initialTab:'inicio',defaultPeriod:'week'};
 const entryPages=new Set(['inicio','jornada','resultados','administracao','configuracoes']);
 const periods=new Set(['week','month','all']);
 let fallback=null;
 const read=()=>{
  let value={};
  try{value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{}
  if(!value||typeof value!=='object'||Array.isArray(value))value={};
  const p={...defaults,...value,...(fallback||{})};
  for(const key of ['compact','reduceMotion','highContrast','autoRefresh'])p[key]=p[key]===true||(key==='autoRefresh'&&p[key]!==false);
  if(!entryPages.has(p.initialTab))p.initialTab=defaults.initialTab;
  if(!periods.has(p.defaultPeriod))p.defaultPeriod=defaults.defaultPeriod;
  return p;
 };
 const apply=p=>{
  if(!document.body)return;
  document.body.classList.toggle('site-compact',p.compact);
  document.body.classList.toggle('site-no-motion',p.reduceMotion);
  document.body.classList.toggle('site-contrast',p.highContrast);
 };
 const save=p=>{
  const cleaned={...defaults,...p};
  fallback=cleaned;
  let stored=true;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cleaned))}catch{stored=false}
  apply(cleaned);
  return stored;
 };
 const node=(tag,text,cls)=>{
  const n=document.createElement(tag);
  if(text!==undefined)n.textContent=text;
  if(cls)n.className=cls;
  return n;
 };
 const render=(root,onRefresh)=>{
  if(!root)return;
  let prefs=read();
  const intro=node('div',undefined,'site-settings-intro');
  intro.append(node('span','CONFIGURAÇÕES DO SITE','site-settings-eyebrow'),node('h2','Seu painel, do seu jeito'),node('p','Estas preferências mudam apenas a experiência do site neste navegador. As configurações do bot continuam separadas e exigem permissão no Discord.'));
  root.append(intro);
  const status=node('p','As preferências são salvas automaticamente neste dispositivo.','site-settings-status');
  status.setAttribute('role','status');
  const shell=node('div',undefined,'site-settings-grid'),layout=node('section',undefined,'site-settings-panel');
  const navigation=node('section',undefined,'site-settings-panel');
  shell.append(layout,navigation);root.append(shell,status);
  const update=change=>{
   prefs={...prefs,...change};
   const stored=save(prefs);
   status.textContent=stored?'Preferência salva neste dispositivo.':'Preferência aplicada nesta sessão; o navegador bloqueou o armazenamento local.';
  };
  function heading(parent,title,desc){
   parent.append(node('h3',title),node('p',desc,'site-settings-description'));
  }
  function toggle(parent,title,desc,key){
   const label=node('label',undefined,'site-settings-toggle');
   const content=node('span',undefined,'site-settings-toggle-copy');
   content.append(node('strong',title),node('small',desc));
   const checkbox=document.createElement('input');checkbox.type='checkbox';
   checkbox.checked=!!prefs[key];
   checkbox.setAttribute('aria-label',title);
   checkbox.onchange=()=>update({[key]:checkbox.checked});
   label.append(content,checkbox);parent.append(label);
  }
  function choose(parent,title,desc,key,options){
   const label=node('label',undefined,'site-settings-choice');
   const copy=node('span',undefined,'site-settings-toggle-copy');
   copy.append(node('strong',title),node('small',desc));
   const select=document.createElement('select');
   select.setAttribute('aria-label',title);
   for(const [text,value] of options){
    const option=document.createElement('option');
    option.value=value;option.textContent=text;select.append(option);
   }
   select.value=prefs[key];
   select.onchange=()=>update({[key]:select.value});
   label.append(copy,select);parent.append(label);
  }
  heading(layout,'Visual e acessibilidade','Ajustes para melhorar a leitura e facilitar a navegação no computador e no celular.');
  toggle(layout,'Modo compacto','Menos espaços e cartões menores nas listagens.','compact');
  toggle(layout,'Reduzir animações','Remove movimentos e efeitos de transição sem alterar os dados.','reduceMotion');
  toggle(layout,'Contraste reforçado','Destaca bordas, textos e campos dos formulários.','highContrast');
  heading(navigation,'Navegação e atualização','Escolha onde começar e como consultar os registros.');
  choose(navigation,'Página inicial','Qual módulo aparece após entrar no Discord.','initialTab',[
   ['Início','inicio'],['Jornada e ponto','jornada'],['Resultados e relatórios','resultados'],
   ['Administração','administracao'],['Central de configurações','configuracoes']
  ]);
  choose(navigation,'Período padrão de consulta','Aplicado ao entrar novamente no site.','defaultPeriod',[
   ['Esta semana','week'],['Mês selecionado','month'],['Todo o histórico','all']
  ]);
  toggle(navigation,'Atualizar dados automaticamente','Consulta os registros a cada 30 segundos enquanto a aba estiver aberta.','autoRefresh');
  const actions=node('div',undefined,'site-settings-actions');
  const refresh=node('button','Atualizar dados agora','button ghost');refresh.type='button';
  refresh.onclick=()=>{
   if(typeof onRefresh==='function'){
    status.textContent='Consultando dados do servidor...';
    Promise.resolve(onRefresh()).then(()=>{status.textContent=document.getElementById('syncStatus')?.classList.contains('err')?'Falha ao atualizar dados. Confira o indicador de conexão.':'Consulta concluída. Os dados foram atualizados.'}).catch(e=>{status.textContent=e.message||'Não foi possível atualizar os dados.'});
   }
  };
  const reset=node('button','Restaurar preferências','button ghost');reset.type='button';
  reset.onclick=async()=>{
   const confirmed=typeof window.uiModal==='function'?
    await window.uiModal({title:'Restaurar preferências?',message:'Deseja voltar às preferências padrão deste navegador? Nenhuma configuração do bot será alterada.',confirmLabel:'Restaurar',cancelLabel:'Cancelar'}):
    window.confirm('Restaurar as preferências padrão deste navegador?');
   if(!confirmed)return;
   prefs={...defaults};
   save(prefs);
   renderReplace();
  };
  actions.append(refresh,reset);root.append(actions);
  const note=node('div',undefined,'site-settings-help');
  note.append(node('strong','O que é configurado no Discord?'),
   node('p','Cargos, canais, turnos, regras de equipe, GIFs dos painéis e avisos são ajustados em Configurações do bot e salvos pela API, mediante permissão. As preferências acima não mudam o bot e não são sincronizadas entre dispositivos.'));
  root.append(note);
  function renderReplace(){
   root.replaceChildren();
   render(root,onRefresh);
   const message=root.querySelector('.site-settings-status');
   if(message)message.textContent='Preferências padrão restauradas neste dispositivo.';
  }
 };
 window.centralSitePrefs={read,apply,save,render};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply(read()),{once:true});
 else apply(read());
})();
