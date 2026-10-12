'use strict';
const crypto=require('node:crypto');
const TARGET='5561999704242';
const goals=['Aumentar as vendas','Gerar leads qualificados','Reduzir custo por cliente','Melhorar meu site','Escalar a operação'];
const incomes=['Até R$ 10 mil','R$ 10 mil a R$ 50 mil','R$ 50 mil a R$ 100 mil','R$ 100 mil a R$ 500 mil','Acima de R$ 500 mil'];
function validateLead(data){
 if(!data||typeof data!=='object'||data.website)throw new Error('INVALID');
 const name=String(data.name||'').trim(),phone=String(data.phone||'').replace(/\D/g,'');
 if(name.length<2||name.length>100||/[\r\n\x00-\x1f]/.test(name)||! /^(?:55)?\d{10,11}$/.test(phone)||!goals.includes(data.goal)||!incomes.includes(data.income)||data.consent!==true)throw new Error('INVALID');
 let site='Não informado';
 if(data.site){const u=new URL(String(data.site));if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.href.length>2048)throw new Error('INVALID');site=u.origin+u.pathname;}
 return {name,phone:phone.length<=11?'55'+phone:phone,goal:data.goal,income:data.income,site,consent:true};
}
function createHandler({send=fetch}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Método não permitido.'});}
 if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({error:'Formato inválido.'});
 try{if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origem não permitida.'});}catch{return res.status(403).json({error:'Origem inválida.'});}
 let data;
 try{data=validateLead(typeof req.body==='string'?JSON.parse(req.body):req.body);}catch{return res.status(400).json({error:'Confira os dados e autorize o contato antes de enviar.'});}
 const message=`Novo interesse nos serviços de marketing digital da MIURA.\nCliente: ${data.name}\nWhatsApp do cliente: +${data.phone}\nMaior objetivo: ${data.goal}\nFaturamento médio: ${data.income}\nSite: ${data.site}\nContato autorizado pelo visitante.`;
 const fallback='https://wa.me/'+TARGET+'?text='+encodeURIComponent(message);
 const webhook=process.env.LEADS_WEBHOOK_URL;
 const metaReady=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEMPLATE_NAME','WHATSAPP_GRAPH_VERSION'].every(k=>process.env[k]);
 if(!webhook&&!metaReady)return res.status(200).json({status:'manual',whatsappUrl:fallback});
 try{
  let response;
  if(webhook){
   const endpoint=new URL(webhook);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw new Error('CONFIG');
   response=await send(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',...(process.env.LEADS_WEBHOOK_TOKEN?{Authorization:'Bearer '+process.env.LEADS_WEBHOOK_TOKEN}:{})},body:JSON.stringify({event:'miura.lead.created',id:crypto.randomUUID(),createdAt:new Date().toISOString(),recipient:TARGET,lead:data,message})});
  }else{
   const version=process.env.WHATSAPP_GRAPH_VERSION,id=process.env.WHATSAPP_PHONE_NUMBER_ID;
   if(!/^v\d+\.\d+$/.test(version)||!/^\d+$/.test(id))throw new Error('CONFIG');
   response=await send(`https://graph.facebook.com/${version}/${id}/messages`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.WHATSAPP_ACCESS_TOKEN},body:JSON.stringify({messaging_product:'whatsapp',to:TARGET,type:'template',template:{name:process.env.WHATSAPP_TEMPLATE_NAME,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'pt_BR'},components:[{type:'body',parameters:[data.name,'+'+data.phone,data.goal,data.income,data.site].map(text=>({type:'text',text}))}]}})});
  }
  if(!response.ok)throw new Error('PROVIDER');
  if(!webhook){const body=await response.json();if(!body.messages?.[0]?.id)throw new Error('PROVIDER');}
  // Provider acceptance is not proof of WhatsApp delivery.
  return res.status(200).json({status:'accepted',whatsappUrl:fallback});
 }catch{return res.status(502).json({error:'O envio automático não foi confirmado. Você pode enviar sua solicitação pelo WhatsApp.',whatsappUrl:fallback,status:'manual'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.validateLead=validateLead;
