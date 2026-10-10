'use strict';
const {isIP}=require('node:net');
const {buildReport}=require('../lib/report');
function validateUrl(value){
 if(typeof value!=='string'||value.length>2048)throw new Error('URL');
 const u=new URL(value);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port)throw new Error('URL');
 const host=u.hostname.toLowerCase();
 if(isIP(host)||host.includes(':')||!host.includes('.')||host.endsWith('.')||/\.(local|localhost|internal|test|invalid|example)$/.test(host)||host==='localhost')throw new Error('URL');
 u.hash='';return u.href;
}
async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
 if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Formato inválido.'});
 if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origem não permitida.'});}catch{return res.status(403).json({error:'Origem inválida.'});}}
 let body=req.body,url;
 try{if(typeof body==='string')body=JSON.parse(body);url=validateUrl(body?.url);}catch{return res.status(400).json({error:'Informe um endereço público válido, como https://suaempresa.com.br.'});}
 const endpoint=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
 endpoint.searchParams.set('url',url);endpoint.searchParams.set('strategy','mobile');endpoint.searchParams.set('locale','pt-BR');
 for(const c of ['performance','seo','accessibility','best-practices'])endpoint.searchParams.append('category',c);
 if(process.env.PAGESPEED_API_KEY)endpoint.searchParams.set('key',process.env.PAGESPEED_API_KEY);
 try{
  // O servidor consulta exclusivamente o Google, nunca faz fetch direto do site informado.
  const upstream=await fetch(endpoint,{signal:AbortSignal.timeout(55000),redirect:'error'});
  if(!upstream.ok){
   if([403,429].includes(upstream.status))return res.status(503).json({error:'O serviço de análise está indisponível ou atingiu seu limite. Tente novamente mais tarde. Nenhuma nota foi gerada.'});
   return res.status(502).json({error:'Não foi possível analisar esta página. Ela pode estar inacessível ou bloquear a medição. Nenhuma nota foi gerada.'});
  }
  const report=buildReport(await upstream.json(),url);
  return res.status(200).json(report);
 }catch(error){return res.status(504).json({error:error?.message==='INCOMPLETE'?'A medição não retornou dados suficientes. Tente novamente ou consulte o PageSpeed Insights.':'A análise não terminou no tempo disponível. Tente novamente ou consulte o PageSpeed Insights. Nenhuma nota foi gerada.'});}
}
module.exports=handler;
module.exports.validateUrl=validateUrl;
