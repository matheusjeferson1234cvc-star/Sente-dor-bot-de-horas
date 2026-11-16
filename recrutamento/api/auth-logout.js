'use strict';
const {cookie,sameOrigin}=require('../lib/oauth-core');
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 if(!sameOrigin(req))return res.status(403).json({error:'Origem inválida'});
 res.setHeader('Set-Cookie',[cookie('nero_oauth_session','',0),cookie('nero_recruit_session','',0)]);
 return res.status(200).json({ok:true});
};
