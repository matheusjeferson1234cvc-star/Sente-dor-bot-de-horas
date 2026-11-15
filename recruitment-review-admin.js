'use strict';
const {assess,safeNickname}=require('./recruitment-review');
const validId=v=>typeof v==='string'&&/^\d{15,25}$/.test(v);
const validUuid=v=>typeof v==='string'&&/^[\da-f-]{36}$/i.test(v);
const now=()=>new Date().toISOString();
async function review(ctx){
 const {req,res,gid,user,db,json}=ctx;
 const id=String(req.query?.roundId||req.body?.roundId||'');
 if(!validUuid(id))return json(res,400,{error:'Selecione um recrutamento válido'});
 const records=await db('nero_recruitment_rounds',{query:'?guild_id=eq.'+gid+'&id=eq.'+id+'&select=*'});
 const round=records[0];
 if(!round)return json(res,404,{error:'Recrutamento não encontrado'});
 const expired=round.state==='open'&&Date.parse(round.closes_at)<=Date.now();
 if(expired){
  const changes=await db('nero_recruitment_rounds',{method:'PATCH',query:'?guild_id=eq.'+gid+'&id=eq.'+id+'&state=eq.open',
   body:{state:'review',closed_at:now(),closed_by:user.id}});
  if(changes.length)round.state='review';
 }
 if(round.state==='open')return json(res,409,{error:'Encerre o recrutamento antes de revisar'});
 if(!Array.isArray(round.config_snapshot?.questions))return json(res,503,{error:'Configuração da prova indisponível'});
 const attempts=await db('nero_recruitment_attempts',{query:'?guild_id=eq.'+gid+'&round_id=eq.'+id+'&select=*&order=started_at.asc&limit=400'});
 const cfg=round.config_snapshot,threshold=Math.max(50,Number(cfg.passPercent)||50);
 if(req.method==='GET'){
  const items=attempts.map(a=>({
   userId:a.user_id,state:a.state,startedAt:a.started_at,submittedAt:a.submitted_at,
   answers:a.answers,rpName:a.rp_name||'',rpId:a.rp_id||'',
   score:a.final_score,assessment:assess(cfg,a.answers),reviewedBy:a.reviewed_by||null
  }));
  return json(res,200,{roundId:id,state:round.state,questions:cfg.questions,threshold,items,
   allReviewed:items.length>0&&items.every(x=>['approved','rejected'].includes(x.state))});
 }
 if(round.state!=='review')return json(res,409,{error:'Revisão não permitida neste estado'});
 const b=req.body||{},userId=String(b.userId||''),decision=String(b.decision||''),score=Number(b.score);
 if(!validId(userId)||!['approved','rejected'].includes(decision)||!Number.isFinite(score)||score<0||score>100)
  return json(res,400,{error:'Candidato, decisão ou nota inválida'});
 if(!attempts.some(a=>a.user_id===userId))return json(res,404,{error:'Candidato não encontrado'});
 if(decision==='approved'&&score<threshold)return json(res,400,{error:'A nota precisa atingir '+threshold+'% para aprovação'});
 const rpName=String(b.rpName||'').trim().slice(0,24),rpId=String(b.rpId||'').trim().slice(0,12);
 if(decision==='approved'){
  try{safeNickname('PM',rpName,rpId)}catch(e){return json(res,400,{error:e.message})}
 }
 const changes=await db('nero_recruitment_attempts',{method:'PATCH',
  query:'?guild_id=eq.'+gid+'&round_id=eq.'+id+'&user_id=eq.'+userId+
   '&state=in.(submitted,in_progress,expired,under_review,approved,rejected)',
  body:{state:decision,final_score:Math.round(score*100)/100,reviewed_by:user.id,reviewed_at:now(),
   rp_name:rpName||null,rp_id:rpId||null}});
 return json(res,changes.length?200:409,changes.length?{ok:true,decision}:{error:'A candidatura mudou. Recarregue'});
}
module.exports=review;
