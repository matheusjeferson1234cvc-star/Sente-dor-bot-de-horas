'use strict';
const handler=require('./index.js');
module.exports=(req,res)=>{req.centralRoute='bot-config';return handler(req,res)};
