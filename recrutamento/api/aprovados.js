'use strict';
// Publica SOMENTE candidatos confirmados e oficialmente publicados.
// Não lê notas em revisão, respostas, provas ou dados internos.
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const guildId=String(req.query?.guild||'');
 if(!/^\d{15,25}$/.test(guildId))return res.status(400).json({error:'Servidor inválido'});
 const url=process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return res.status(200).json({guildId,available:false,items:[]});
 try{
  const headers={apikey:key};
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  const endpoint=new URL('/rest/v1/nero_recruitment_approvals',url);
  endpoint.searchParams.set('guild_id','eq.'+guildId);
  endpoint.searchParams.set('published_at','not.is.null');
  endpoint.searchParams.set('select','round_id,display_name,show_score,score_percent,published_at');
  endpoint.searchParams.set('order','published_at.desc');
  endpoint.searchParams.set('limit','150');
  const r=await fetch(endpoint,{headers,cache:'no-store',signal:AbortSignal.timeout(5500)});
  if(!r.ok){
   if(r.status===404||r.status===400)return res.status(200).json({guildId,available:false,items:[]});
   throw Error('Consulta de aprovados indisponível');
  }
  const data=await r.json();
  if(!Array.isArray(data))throw Error('Resposta inválida');
  const items=data.map(x=>({
   roundId:String(x.round_id||'').slice(0,36),
   name:String(x.display_name||'Aprovado').slice(0,90),
   publishedAt:String(x.published_at||''),
   scorePercent:x.show_score===true&&x.score_percent!==null&&x.score_percent!==undefined&&Number.isFinite(Number(x.score_percent))?Number(x.score_percent):null
  }));
  return res.status(200).json({guildId,available:true,items});
 }catch(e){
  console.error('Lista de aprovados Nero:',String(e.message||e).slice(0,70));
  return res.status(503).json({error:'Não foi possível consultar os resultados'});
 }
};
