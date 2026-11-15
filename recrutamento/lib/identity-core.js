'use strict';
// Identificacao sem OAuth: ID informado sozinho nunca equivale a identidade verificada.
const crypto=require('node:crypto');
const isSnowflake=v=>typeof v==='string'&&/^\d{15,25}$/.test(v);
function secretOK(secret){return typeof secret==='string'&&Buffer.byteLength(secret)>=32}
function assertSecret(secret){if(!secretOK(secret))throw Error('NERO_IDENTITY_SECRET não configurado')}
function newCode(){return String(crypto.randomInt(0,100000000)).padStart(8,'0')}
function digest(secret,guildId,roundId,userId,code){
 assertSecret(secret);
 if(!isSnowflake(guildId)||!isSnowflake(userId)||!/^[0-9a-f-]{36}$/i.test(roundId)||!/^\d{8}$/.test(code))throw Error('Identidade inválida');
 return crypto.createHmac('sha256',secret).update([guildId,roundId,userId,code].join(':')).digest('hex');
}
function matchesHash(actual,expected){
 if(!/^[a-f0-9]{64}$/i.test(String(actual||''))||!/^[a-f0-9]{64}$/i.test(String(expected||'')))return false;
 const a=Buffer.from(String(actual),'hex'),b=Buffer.from(String(expected),'hex');
 return a.length===32&&b.length===32&&crypto.timingSafeEqual(a,b);
}
function isOpen(round,now=Date.now()){
 if(!round||round.state!=='open')return false;
 const opens=Date.parse(round.opens_at),closes=Date.parse(round.closes_at);
 return Number.isFinite(opens)&&Number.isFinite(closes)&&opens<=now&&closes>now;
}
function issueSession(secret,{guildId,roundId,userId,closesAt},now=Date.now()){
 assertSecret(secret);
 if(!isSnowflake(guildId)||!isSnowflake(userId)||!/^[0-9a-f-]{36}$/i.test(roundId))throw Error('Sessão inválida');
 const expires=Math.min(now+3*60*60*1000,Date.parse(closesAt));
 if(!Number.isFinite(expires)||expires<=now)throw Error('Recrutamento encerrado');
 const payload=Buffer.from(JSON.stringify({guildId,roundId,userId,exp:expires})).toString('base64url');
 const mac=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
 return {token:payload+'.'+mac,maxAge:Math.max(1,Math.floor((expires-now)/1000))};
}
function readSession(secret,token,now=Date.now()){
 if(!secretOK(secret)||typeof token!=='string'||token.length>2048)return null;
 const parts=token.split('.');if(parts.length!==2)return null;
 const [payload,mac]=parts;
 const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
 const a=Buffer.from(mac),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
 try{
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  return isSnowflake(data.guildId)&&isSnowflake(data.userId)&&/^[0-9a-f-]{36}$/i.test(data.roundId)&&Number.isFinite(data.exp)&&data.exp>now?data:null;
 }catch{return null}
}
module.exports={isSnowflake,secretOK,newCode,digest,matchesHash,isOpen,issueSession,readSession};
