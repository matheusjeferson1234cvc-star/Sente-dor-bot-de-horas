'use strict';
// Escopo de leitura validado no servidor, nunca nos filtros enviados pelo navegador.
const names={manha:'Manhã',tarde:'Tarde',noite:'Noite',madrugada:'Madrugada'};
function key(value){
 const k=String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return Object.hasOwn(names,k)?k:null;
}
function forSupervisor(config,memberRoles){
 const owned=new Set(memberRoles||[]);
 return Object.keys(names).filter(k=>{
  const roles=config?.shifts?.[k]?.supervisorRoles;
  return Array.isArray(roles)&&roles.some(r=>owned.has(r));
 });
}
function scopeData(data,allowed){
 const accepted=new Set((allowed||[]).map(key).filter(Boolean));
 const included=v=>accepted.has(key(v));
 const cards=(data.cards||[]).filter(c=>included(c.shift));
 const attendance=(data.attendance||[]).filter(d=>included(d.shift));
 const justifications=(data.justifications||[]).filter(j=>included(j.shift));
 const warnings=(data.warnings||[]).filter(w=>included(w.shift));
 const permittedUsers=new Set([...cards,...attendance,...justifications,...warnings].map(x=>String(x.user_id||'')).filter(Boolean));
 const settings=data.settings||{};
 const shiftRoles=settings.shift_roles||{};
 for(const m of data.members||[]){
  const roles=new Set(m.role_ids||[]);
  for(const [shift,roleIds] of Object.entries(shiftRoles)){
   if(included(shift)&&(roleIds||[]).some(r=>roles.has(r))){permittedUsers.add(String(m.user_id));break}
  }
 }
 const filteredSettings={
  guild_id:settings.guild_id,name:settings.name,
  point_mode:settings.point_mode,
  shift_roles:Object.fromEntries(Object.entries(shiftRoles).filter(([shift])=>included(shift))),
  shift_hours:Object.fromEntries(Object.entries(settings.shift_hours||{}).filter(([shift])=>included(shift))),
  time_off:{
   weekly:Object.fromEntries(Object.entries(settings.time_off?.weekly||{}).filter(([shift])=>shift==='all'||included(shift))),
   dates:(settings.time_off?.dates||[]).filter(x=>x.shift==='all'||included(x.shift))
  }
 };
 return {...data,cards,attendance,justifications,warnings,
  members:(data.members||[]).filter(m=>permittedUsers.has(String(m.user_id))),
  settings:filteredSettings,canEdit:false,accessReason:'shift-supervisor',viewScope:'shift',allowedShifts:[...accepted]};
}
module.exports={names,key,forSupervisor,scopeData};
