/* Interface Manager: preferências locais; identidade proveniente da sessão Discord. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id), key='nero-manager:theme';
 let theme='light';
 try{theme=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 function apply(){document.documentElement.dataset.managerTheme=theme;const b=$('managerTheme');if(b){b.textContent=theme==='light'?'☀ Tema claro':'☾ Tema escuro';b.setAttribute('aria-pressed',String(theme==='dark'));}}
 function owner(value){const b=$('managerOwner');if(b)b.hidden=value!==true;}
 let guildSelection={};
 function closeGuild(){const b=$('managerGuild'),p=$('managerGuildList');if(b)b.setAttribute('aria-expanded','false');if(p)p.hidden=true;}
 function serverAvatar(el,g,name){
  if(!el)return;
  const fallback=(name||'S').trim().slice(0,1).toUpperCase()||'S';
  const id=String(g?.guild_id||''),icon=g?.icon;
  const url=/^\d{15,25}$/.test(id)&&/^(a_)?[a-f0-9]{32}$/i.test(icon||'')?'https://cdn.discordapp.com/icons/'+id+'/'+icon+'.png?size=64':null;
  if(el.dataset.iconUrl===(url||'')&&el.dataset.fallback===fallback)return;
  el.dataset.iconUrl=url||'';el.dataset.fallback=fallback;el.textContent=fallback;
  if(url){const img=document.createElement('img');img.alt='';img.src=url;img.onerror=()=>img.remove();el.append(img);}
 }
 function guild(name,entries=[],current=null,onChoose=null,onManage=null,managed=[]){
  const wrap=$('managerGuildWrap'),b=$('managerGuild'),p=$('managerGuildList');if(!b||!p||!wrap)return;
  wrap.hidden=!name;$('managerGuildName').textContent=name||'Selecionar servidor';
  const icons=new Map(managed.map(g=>[String(g.guild_id),g.icon]));
  const allowed=entries.map(g=>({...g,icon:icons.get(String(g.guild_id))||null}));
  serverAvatar($('managerGuildAvatar'),allowed.find(g=>String(g.guild_id)===String(current)),name);
  guildSelection={entries:allowed,current,onChoose,onManage};if(!name)closeGuild();
 }
 function renderGuildList(){
  const p=$('managerGuildList');if(!p)return;p.replaceChildren();
  const title=document.createElement('small');title.className='manager-guild-caption';title.textContent='TROCAR SERVIDOR';p.append(title);
  for(const g of guildSelection.entries||[]){
   const item=document.createElement('button');item.type='button';item.className='manager-server-option';
   const av=document.createElement('span');av.className='manager-server-avatar';serverAvatar(av,g,g.name);
   const label=document.createElement('span');label.textContent=g.name||'Servidor';item.append(av,label);
   if(String(g.guild_id)===String(guildSelection.current)){item.setAttribute('aria-current','true');const check=document.createElement('span');check.textContent='✓';check.className='manager-server-check';item.append(check);}
   item.onclick=()=>{closeGuild();if(String(g.guild_id)!==String(guildSelection.current))guildSelection.onChoose?.(String(g.guild_id));};p.append(item);
  }
  const more=document.createElement('button');more.type='button';more.className='manager-server-manage';more.textContent='⚙️ Gerenciar servidores';more.onclick=()=>{closeGuild();guildSelection.onManage?.();};p.append(more);
 }
 function setupGuild(){
  const b=$('managerGuild'),p=$('managerGuildList');if(!b||!p)return;
  b.addEventListener('click',()=>{if(!p.hidden){closeGuild();return;}renderGuildList();p.hidden=false;b.setAttribute('aria-expanded','true');});
  document.addEventListener('click',e=>{if(!$('managerGuildWrap')?.contains(e.target))closeGuild();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!p.hidden){closeGuild();b.focus();}});
 }
 function profile(me){
  const b=$('userBadge'),u=me?.user;if(!b||!u)return;
  b.replaceChildren();const name=document.createElement('span');name.textContent=u.name||'Discord';
  const avatar=document.createElement('span');avatar.className='manager-avatar';
  avatar.textContent=(u.name||'D').slice(0,1).toUpperCase();
  if(/^\d{15,25}$/.test(String(u.id))&&/^(a_)?[a-f0-9]{32}$/i.test(u.avatar||'')){
   const img=document.createElement('img');img.alt='';img.src='https://cdn.discordapp.com/avatars/'+u.id+'/'+u.avatar+'.png?size=64';img.onerror=()=>img.remove();avatar.append(img);
  }
  b.append(avatar,name);owner(me.isBotOwner===true);
 }
 // Substitui a abertura nativa do Android sem alterar os valores ou eventos dos formulários.
 const enhanced=new WeakMap();
 let opened=null,selectSequence=0;
 function normalize(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
 function syncSelect(s){
  const c=enhanced.get(s);if(!c)return;
  const selected=s.selectedOptions[0];c.value.textContent=selected?.textContent||'Selecione uma opção';
  c.trigger.disabled=s.disabled;c.trigger.setAttribute('aria-label',c.label()+': '+c.value.textContent);
 }
 function closeSelect(focus=false){
  if(!opened)return;
  const {trigger,panel}=opened;opened=null;panel.remove();trigger.setAttribute('aria-expanded','false');if(focus&&trigger.isConnected)trigger.focus();
 }
 function placeSelect(){
  if(!opened)return;const {trigger,panel}=opened;
  if(!trigger.isConnected||!trigger.getClientRects().length){closeSelect();return;}
  const r=trigger.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
  const width=Math.min(Math.max(r.width,235),vw-20),below=vh-r.bottom-12,above=r.top-12;
  const upward=below<190&&above>below;
  panel.style.width=width+'px';panel.style.left=Math.max(10,Math.min(r.left,vw-width-10))+'px';
  panel.style.maxHeight=Math.max(100,Math.min(340,upward?above:below))+'px';
  panel.style.top=upward?'auto':Math.min(r.bottom+5,vh-110)+'px';
  panel.style.bottom=upward?(vh-r.top+5)+'px':'auto';
 }
 function openSelect(s){
  const c=enhanced.get(s);if(!c||s.disabled)return;if(opened?.select===s){closeSelect(true);return;}closeSelect();
  syncSelect(s);
  const panel=document.createElement('div');panel.className='manager-select-panel';panel.id=c.id;
  const search=document.createElement('input');search.type='search';search.className='manager-select-search';search.placeholder='Pesquisar opções…';search.setAttribute('aria-label','Pesquisar '+c.label());search.autocomplete='off';
  const options=document.createElement('div');options.className='manager-select-options';options.setAttribute('role','listbox');options.setAttribute('aria-label',c.label());
  panel.append(search,options);
  function refresh(){
   options.replaceChildren();const q=normalize(search.value);
   for(const o of s.options){
    if(o.hidden||o.parentElement?.hidden||!normalize(o.textContent).includes(q))continue;
    const b=document.createElement('button');b.type='button';b.className='manager-select-option';b.setAttribute('role','option');b.setAttribute('aria-selected',String(o.selected));b.disabled=o.disabled||!!o.closest('optgroup:disabled');
    const label=document.createElement('span');label.textContent=o.textContent;b.append(label);
    if(o.selected){const check=document.createElement('span');check.textContent='✓';check.className='manager-select-check';b.append(check);}
    b.onclick=()=>{const index=o.index;closeSelect(true);if(s.selectedIndex!==index){s.selectedIndex=index;syncSelect(s);s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));}};
    options.append(b);
   }
   if(!options.childElementCount){const p=document.createElement('span');p.className='manager-select-empty';p.textContent='Nenhuma opção encontrada.';options.append(p);}
  }
  search.addEventListener('input',refresh);panel.addEventListener('keydown',e=>{
   const buttons=[...options.querySelectorAll('button:not(:disabled)')];if(!buttons.length)return;
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)))].focus();}
   if(e.key==='Enter'&&document.activeElement===search){e.preventDefault();buttons[0].click();}
  });
  document.body.append(panel);opened={select:s,trigger:c.trigger,panel};c.trigger.setAttribute('aria-expanded','true');refresh();placeSelect();
 }
 function enhanceSelect(s){
  if(enhanced.has(s)){syncSelect(s);return;}
  if(s.id==='guild'||s.multiple||s.size>1||s.hidden)return;
  const trigger=document.createElement('button');trigger.type='button';trigger.className='manager-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const value=document.createElement('span');value.className='manager-select-value';const arrow=document.createElement('span');arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');trigger.append(value,arrow);
  const id='nero-select-options-'+(++selectSequence);trigger.setAttribute('aria-controls',id);
  const label=()=>s.getAttribute('aria-label')||s.labels?.[0]?.querySelector('span')?.textContent||s.labels?.[0]?.firstChild?.textContent?.trim()||'Selecionar opção';
  enhanced.set(s,{trigger,value,id,label});s.classList.add('manager-native-select');s.tabIndex=-1;s.setAttribute('aria-hidden','true');s.after(trigger);syncSelect(s);
  trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openSelect(s);});
  s.addEventListener('change',()=>syncSelect(s));s.addEventListener('invalid',e=>{e.preventDefault();trigger.focus();openSelect(s);});
 }
 function setupSelects(){
  const content=$('content');if(!content)return;
  const scan=node=>{if(node.nodeType!==1)return;if(node.matches('select'))enhanceSelect(node);node.querySelectorAll('select').forEach(enhanceSelect);};
  scan(content);
  new MutationObserver(records=>{
   if(opened&&!opened.trigger.isConnected)closeSelect();
   for(const rec of records){
    const s=rec.target.nodeType===1?rec.target.closest('select'):rec.target.parentElement?.closest('select');
    if(s)syncSelect(s);
    if(rec.type==='childList')for(const n of rec.addedNodes)scan(n);
   }
  }).observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','label','hidden']});
  document.addEventListener('click',e=>{if(opened&&!opened.panel.contains(e.target)&&!opened.trigger.contains(e.target))closeSelect();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();closeSelect(true);}});
  window.addEventListener('resize',placeSelect);window.addEventListener('scroll',placeSelect,true);
 }
 window.NeroManager={profile,owner,guild};
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();setupGuild();setupSelects();$('managerTheme')?.addEventListener('click',()=>{theme=theme==='light'?'dark':'light';try{localStorage.setItem(key,theme);}catch{}apply();});});
})();
