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
 window.NeroManager={profile,owner,guild};
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();setupGuild();$('managerTheme')?.addEventListener('click',()=>{theme=theme==='light'?'dark':'light';try{localStorage.setItem(key,theme);}catch{}apply();});});
})();
