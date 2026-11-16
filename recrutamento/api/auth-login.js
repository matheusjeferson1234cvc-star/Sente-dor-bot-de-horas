'use strict';
const crypto=require('node:crypto');
const {validId,signed,cookie,redirectUri}=require('../lib/oauth-core');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const guildId=String(req.query?.guild||'');
 if(!validId(guildId))return res.status(400).json({error:'Selecione o servidor antes do login'});
 if(!process.env.DISCORD_CLIENT_ID||!process.env.DISCORD_CLIENT_SECRET)return res.status(503).json({error:'OAuth do recrutamento ainda não configurado'});
 let redirect;
 try{redirect=redirectUri(req)}catch{return res.status(503).json({error:'Redirect Discord não configurado para este endereço'})}
 const state=crypto.randomBytes(24).toString('hex');
 const packed=signed('oauth-state',{state,guildId,exp:Date.now()+600000});
 res.setHeader('Set-Cookie',cookie('nero_oauth_state',packed,600));
 const url=new URL('https://discord.com/oauth2/authorize');
 url.search=new URLSearchParams({client_id:String(process.env.DISCORD_CLIENT_ID),redirect_uri:redirect,response_type:'code',scope:'identify',state}).toString();
 res.statusCode=302;res.setHeader('Location',url.toString());return res.end();
};
