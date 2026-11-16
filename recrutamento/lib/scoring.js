'use strict';
// Gabarito objetivo. Respostas escritas exigem revisão quando não há avaliador seguro.
function assessObjective(config,answers){
 const questions=Array.isArray(config?.questions)?config.questions:[];
 if(!questions.length||questions.length>20||questions.some(q=>q.type!=='choice'))return null;
 const correct=questions.reduce((sum,q,i)=>sum+(Number.isInteger(answers?.[i])&&answers[i]===q.correct?1:0),0);
 const score=Math.round(correct*10000/questions.length)/100;
 const passPercent=Math.max(50,Math.min(100,Number(config.passPercent)||50));
 return {score,passPercent,decision:score>=passPercent?'approved':'rejected',total:questions.length,correct};
}
module.exports={assessObjective};
