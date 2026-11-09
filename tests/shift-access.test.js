'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const access=require('../shift-access');
test('responsável recebe apenas turnos dos próprios cargos',()=>{
 const c={shifts:{manha:{supervisorRoles:['role-a']},tarde:{supervisorRoles:['role-b']},noite:{supervisorRoles:['role-n']},madrugada:{supervisorRoles:[]}}};
 assert.deepEqual(access.forSupervisor(c,['role-n']),['noite']);
 assert.deepEqual(access.forSupervisor(c,['role-n','role-b']),['tarde','noite']);
 assert.deepEqual(access.forSupervisor(c,['role-random']),[]);
});
test('resposta limitada nunca inclui cartões ou cancelamentos de outros turnos',()=>{
 const raw={
  cards:[{user_id:'1',shift:'Noite',status:'Cancelado'},{user_id:'2',shift:'Manhã',status:'Cancelado'}],
  attendance:[{user_id:'1',shift:'Noite'},{user_id:'2',shift:'Manhã'}],
  warnings:[{user_id:'2',shift:'Manhã'}],
  justifications:[{user_id:'1',shift:'Noite'}],
  members:[{user_id:'1',role_ids:['n']},{user_id:'2',role_ids:['m']}],
  settings:{shift_roles:{Noite:['n'],Manhã:['m']},shift_hours:{Noite:['20:00','23:00'],Manhã:['07:00','11:00']},time_off:{weekly:{all:[0],manha:[1],noite:[3]},dates:[{shift:'manha',date:'2026-11-09'},{shift:'noite',date:'2026-11-10'}]},bot_config:{secret:'not-for-supervisors'},roles:{allowed:['admin']}}
 };
 const restricted=access.scopeData(raw,['noite']);
 assert.equal(restricted.cards.length,1);
 assert.equal(restricted.cards[0].user_id,'1');
 assert.equal(restricted.warnings.length,0);
 assert.deepEqual(restricted.members.map(m=>m.user_id),['1']);
 assert.equal(restricted.settings.bot_config,undefined);
 assert.equal(restricted.settings.roles,undefined);
 assert.deepEqual(Object.keys(restricted.settings.shift_roles),['Noite']);
 assert.deepEqual(restricted.allowedShifts,['noite']);
 assert.equal(restricted.canEdit,false);
 assert.equal(raw.cards.length,2);
});
test('valores de turno não reconhecidos são excluídos',()=>{
 const x=access.scopeData({cards:[{shift:'unknown'},{shift:'madrugada'}],settings:{}},['madrugada']);
 assert.equal(x.cards.length,1);
 assert.deepEqual(x.allowedShifts,['madrugada']);
});
