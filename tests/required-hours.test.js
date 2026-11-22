'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const schema=require('../bot-config-schema');
function settings(){
 const shift={start:'06:00',end:'12:00',roleIds:[],supervisorRoles:[],logChannelId:null};
 return {pointMode:'individual',timezone:'America/Sao_Paulo',requiredHours:3,
  minMembers:2,maxMembers:4,inviteMinutes:15,serviceRoleId:null,auditChannelId:null,
  presenceChannelId:null,notifications:{pointDm:true,receiptImage:false},
  shifts:{manha:{...shift},tarde:{...shift},noite:{...shift},madrugada:{...shift}},
  justifications:{reviewChannelId:null,logChannelId:null,warningChannelId:null,warningRoles:[null,null,null],autoWarnings:false,
   panelVisual:{title:'Justificativas',description:'Solicitar justificativa de ausência',customGif:null}},
  panel:{title:'Bate-ponto',description:'Registro de jornada',customGif:null}
 };
}
test('meta única de horas é compartilhada por todos os turnos',()=>{
 const normalized=schema.normalize(settings());assert.equal(normalized.requiredHours,3);
 assert.deepEqual(Object.keys(normalized.shifts).sort(),['madrugada','manha','noite','tarde']);
});
test('configuração antiga mantém 2h de padrão sem perder os demais dados',()=>{
 const old=settings();delete old.requiredHours;
 const normalized=schema.normalize(old);assert.equal(normalized.requiredHours,2);
 assert.equal(normalized.pointMode,'individual');
});
test('não aceita meta zero, negativa, fracionária nem superior a 24 horas',()=>{
 for(const requiredHours of [0,-1,1.5,25,'3',null])assert.throws(()=>schema.normalize({...settings(),requiredHours}),/Horas obrigatórias/);
});
