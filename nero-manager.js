/* Interface Manager: preferências locais; identidade proveniente da sessão Discord. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id), key='nero-manager:theme';
 let theme='light';
 try{theme=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 function apply(){document.documentElement.dataset.managerTheme=theme;const b=$('managerTheme');if(b){b.textContent=theme==='light'?'☀ Tema claro':'☾ Tema escuro';b.setAttribute('aria-pressed',String(theme==='dark'));}}
 function owner(value){const b=$('managerOwner');if(b)b.hidden=value!==true;}
 function guild(name){const b=$('managerGuild');if(!b)return;b.hidden=!name;$('managerGuildName').textContent=name||'Selecionar servidor';}
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
 apply();document.addEventListener('DOMContentLoaded',()=>{apply();$('managerTheme')?.addEventListener('click',()=>{theme=theme==='light'?'dark':'light';try{localStorage.setItem(key,theme);}catch{}apply();});});
})();
