'use strict';
const handler=require('./index.js');
module.exports=(req,res)=>{req.centralRoute='time-off';return handler(req,res)};
