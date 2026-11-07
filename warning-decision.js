'use strict';
// O site autoriza somente pares de faltas em dias consecutivos e comprovados.
// Não concede cargos, não reconstitui escalas sem registros nem aceita datas futuras.
const SHIFT=['manha','tarde','noite','madrugada'];
const dayValid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(`${d}T12:00:00Z`));
const nextDay=d=>new Date(Date.parse(`${d}T12:00:00Z`)+86400000).toISOString().slice(0,10);
const weekday=d=>new Date(`${d}T12:00:00Z`).getUTCDay();
function isOff(off,date,shift){const w=off?.weekly||{},dow=weekday(date);
 return (w.all||[]).includes(dow)||(w[shift]||[]).includes(dow)||(off?.dates||[]).some(x=>x.date===date&&(x.shift==='all'||x.shift===shift));
}
function evaluate({days=[],justifications=[],warnings=[],timeOff={},today=new Date().toISOString().slice(0,10),maxAgeDays=10}){
 if(!dayValid(today))return [];
 const cut=new Date(Date.parse(today+'T12:00:00Z')-maxAgeDays*86400000).toISOString().slice(0,10);
 const unresolved=new Set(justifications.filter(x=>['pending','approved'].includes(x.status))
  .map(x=>`${x.user_id}:${x.shift}:${x.day}`));
 const byPerson=new Map();for(const row of days){if(!row||!SHIFT.includes(row.shift)||!dayValid(row.day)||row.day>=today||!row.user_id)continue;
  const key=row.user_id+':'+row.shift;if(!byPerson.has(key))byPerson.set(key,[]);byPerson.get(key).push(row);
 }
 const prevWarning=new Map(),prevCount=new Map();
 for(const w of warnings){if(!w?.user_id||!dayValid(w.day))continue;
  if(!prevWarning.has(w.user_id)||prevWarning.get(w.user_id)<w.day)prevWarning.set(w.user_id,w.day);
  prevCount.set(w.user_id,Math.max(prevCount.get(w.user_id)||0,Number(w.level)||0));
 }
 const result=[];
 for(const [key,arr] of byPerson){const colon=key.indexOf(':'),userId=key.slice(0,colon),shift=key.slice(colon+1);
  const lastWarning=prevWarning.get(userId)||'0000-00-00';if((prevCount.get(userId)||0)>=3)continue;
  const ordered=arr.sort((a,b)=>a.day.localeCompare(b.day));let streak=[],previous=null;
  for(const day of ordered){if(day.day<=lastWarning)continue;
   const missed=day.status==='falta'&&!isOff(timeOff,day.day,shift)&&!unresolved.has(`${userId}:${shift}:${day.day}`);
   if(!missed){streak=[];previous=day.day;continue}
   if(previous&&nextDay(previous)!==day.day)streak=[];
   streak.push(day.day);previous=day.day;
   if(streak.length>=2){if(day.day>=cut)result.push({id:`${userId}:${shift}:${day.day}`,userId,shift,date:day.day,evidenceDays:streak.slice(-2)});break}
  }
 }
 // Apenas uma autorização por usuário por ciclo. O histórico no banco impedirá repetir a mesma.
 const unique=new Map();for(const candidate of result){const other=unique.get(candidate.userId);if(!other||candidate.date<other.date)unique.set(candidate.userId,candidate)}
 return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,100);
}
module.exports={evaluate,isOff,nextDay};
