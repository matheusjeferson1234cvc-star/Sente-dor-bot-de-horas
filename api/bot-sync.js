'use strict';
// Rota explícita para a Vercel; não depende de rewrites.
const handler = require('./index.js');
module.exports = (req, res) => {
  req.centralRoute = 'bot-sync';
  return handler(req, res);
};
