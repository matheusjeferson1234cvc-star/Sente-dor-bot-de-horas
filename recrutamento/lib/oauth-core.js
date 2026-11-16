'use strict';
const crypto=require('node:crypto');
const validId=value=>typeof value==='string'&&/^\d{15,25}$/.test(value);
const secret=()=>String(process.env.NERO_IDENTITY_SECRET||'');
const ensureSecret=()=>{if(Buffer.byteLength(secret())<32)throw Error('Identidade não configurada')};
function signed(kind,object){
 ensureSecret();
 const payload=Buffer.from(JSON.stringify({...object,kind})).toString('base64url');
 const mac=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
 return payload+'.'+mac;
}
function unpack(kind,token){
 if(!token||typeof token!=='string'||token.length>2048||Buffer.byteLength(secret())<32)return null;
 const [payload,mac,...rest]=token.split('.');
 if(!payload||!mac||rest.length)return null;
 const expected=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
 const a=Buffer.from(mac),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
 try{const d=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return d.kind===kind&&Number.isFinite(d.exp)&&d.exp>Date.now()?d:null}catch{return null}
}
function getCookie(req,name){
 const part=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
 if(!part)return '';try{return decodeURIComponent(part.slice(name.length+1))}catch{return ''}
}
const cookie=(name,value,maxAge,strict=false)=>name+'='+encodeURIComponent(value)+'; HttpOnly; Secure; SameSite='+(strict?'Strict':'Lax')+'; Path=/; Max-Age='+Math.max(0,Math.floor(maxAge));
function authUser(req){
 const user=unpack('candidate',getCookie(req,'nero_oauth_session'));
 return user&&validId(user.id)&&validId(user.guildId)?user:null;
}
function redirectUri(req){
 const raw=String(process.env.DISCORD_RECRUIT_REDIRECT_URI||'').trim();
 const url=new URL(raw);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/api/auth-callback'||url.search||url.hash)throw Error('Redirect OAuth inválido');
 if(url.host!==req.headers.host)throw Error('Redirect OAuth não corresponde ao domínio do site');
 return url.toString();
}
function sameOrigin(req){
 try{const o=new URL(String(req.headers.origin||''));return o.protocol==='https:'&&o.host===req.headers.host}catch{return false}
}
module.exports={validId,signed,unpack,getCookie,cookie,authUser,redirectUri,sameOrigin};
