'use strict';
const handler=require('./index.js');
module.exports=(req,res)=>{req.centralRoute='announce';return handler(req,res)};
