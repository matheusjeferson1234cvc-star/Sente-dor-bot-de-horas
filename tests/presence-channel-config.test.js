'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const schema=require('../bot-config-schema');
function config(){
 const shift={start:'08:00',end:'12:00',roleIds:[],supervisorRoles:[],logChannelId:null};
 return {
  pointMode:'individual',timezone:'America/Sao_Paulo',
  minMembers:2,maxMembers:4,inviteMinutes:15,
  serviceRoleId:null,auditChannelId:null,presenceChannelId:'123456789012345678',
  notifications:{pointDm:true,receiptImage:false},
  shifts:{manha:{...shift},tarde:{...shift},noite:{...shift},madrugada:{...shift}},
  justifications:{reviewChannelId:null,logChannelId:null,warningChannelId:null,
   warningRoles:[null,null,null],autoWarnings:false,
   panelVisual:{title:'Justificativas',description:'Informe quantos dias vai faltar e o motivo.',customGif:null}},
  panel:{title:'Central de Horas',description:'Painel de ponto',customGif:null}
 };
}
test('canal único de presença é mantido e exige ID válido',()=>{
 const obj=schema.normalize(config());
 assert.equal(obj.presenceChannelId,'123456789012345678');
 assert.throws(()=>schema.normalize({...config(),presenceChannelId:'incorreto'}),/Canal de logs de presença/);
});
test('validar o canal único contra canais disponíveis do próprio servidor',()=>{
 const value=schema.normalize(config()),channels=[{id:'123456789012345678',type:0}];
 assert.doesNotThrow(()=>schema.assertResources(value,[],channels,'999999999999999999'));
 assert.throws(()=>schema.assertResources(value,[],[],'999999999999999999'),/canal inválido/);
});
test('configurações antigas sem campo novo continuam válidas',()=>{
 const value=config();delete value.presenceChannelId;
 assert.equal(schema.normalize(value).presenceChannelId,null);
});
