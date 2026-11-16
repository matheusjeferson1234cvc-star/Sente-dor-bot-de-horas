'use strict';
const {authUser}=require('../lib/oauth-core');
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const user=authUser(req);
 if(!user)return res.status(200).json({connected:false});
 const avatar=user.avatar?'https://cdn.discordapp.com/avatars/'+user.id+'/'+user.avatar+'.png?size=128':null;
 return res.status(200).json({connected:true,user:{id:user.id,name:user.name,avatarUrl:avatar},guildId:user.guildId});
};
