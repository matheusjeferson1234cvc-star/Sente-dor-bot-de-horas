'use strict';
const handler=require('./index.js');
module.exports=(req,res)=>{req.centralRoute='announce-channels';return handler(req,res)};
