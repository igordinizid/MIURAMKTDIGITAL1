'use strict';
const {buildReport}=require('../lib/report');
const {buildHtmlReport}=require('../lib/html-report');
const {validateUrl,fetchPage,PageReadError}=require('../lib/safe-page');
const {buildConnectionReport}=require('../lib/connection-report');
function createHandler({pageFetcher=fetchPage,providerFetcher=fetch,logger=record=>console.warn(JSON.stringify(record))}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
  if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Formato inválido.'});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origem não permitida.'});}catch{return res.status(403).json({error:'Origem inválida.'});}}
  let body=req.body,url;
  try{if(typeof body==='string')body=JSON.parse(body);url=validateUrl(body?.url);}catch{return res.status(400).json({error:'Informe um endereço público válido, como https://suaempresa.com.br.'});}
  const htmlJob=pageFetcher(url).then(page=>({report:buildHtmlReport(page,url)})).catch(error=>({error}));
  const lighthouseJob=(async()=>{
   if(!process.env.PAGESPEED_API_KEY)return null;
   const endpoint=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
   endpoint.searchParams.set('url',url);endpoint.searchParams.set('strategy','mobile');endpoint.searchParams.set('locale','pt-BR');endpoint.searchParams.set('key',process.env.PAGESPEED_API_KEY);
   for(const c of ['performance','seo','accessibility','best-practices'])endpoint.searchParams.append('category',c);
   try{const response=await providerFetcher(endpoint,{signal:AbortSignal.timeout(45000),redirect:'error'});if(!response.ok)return null;return {...buildReport(await response.json(),url),mode:'lighthouse',scoreNote:'Notas Lighthouse de 0 a 100: 90–100 bom; 50–89 precisa melhorar; 0–49 atenção prioritária.',scopeNote:'Teste de laboratório em celular simulado. Os valores podem variar entre execuções. TBT não é INP. Não mede posição nas buscas ou perdas de vendas.'};}catch{return null;}
  })();
  const [read,lighthouse]=await Promise.all([htmlJob,lighthouseJob]);
  if(lighthouse)return res.status(200).json({...lighthouse,htmlChecks:read.report?.checks||[]});
  if(read.report)return res.status(200).json(read.report);
  logger({event:'miura_audit_read_failed',hostname:new URL(url).hostname,code:read.error?.auditCode||'UNKNOWN',status:read.error?.observation?.status||null});
  if(read.error instanceof PageReadError && read.error.auditCode!=='TARGET')return res.status(200).json(buildConnectionReport(read.error,url));
  return res.status(502).json({error:'Não foi possível acessar o conteúdo público desta página. Confira o endereço e tente novamente. Páginas protegidas ou que bloqueiam a leitura precisam de uma avaliação com nossa equipe.'});
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.validateUrl=validateUrl;
