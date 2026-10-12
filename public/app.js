
'use strict';
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0});
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let auditedUrl = '', animationId = 0, currentPotential = 40000;
$('#year').textContent = new Date().getFullYear();
const menuButton = $('.menu-toggle');
menuButton.addEventListener('click', () => {const expanded = menuButton.getAttribute('aria-expanded') === 'true'; menuButton.setAttribute('aria-expanded', String(!expanded)); $('#mobile-menu').hidden = expanded;});
$('#mobile-menu').addEventListener('click', (event) => {if(event.target.closest('a')) {$('#mobile-menu').hidden = true;menuButton.setAttribute('aria-expanded','false');}});
for (const dialog of document.querySelectorAll('dialog')) {dialog.querySelector('.close').addEventListener('click', () => dialog.close());dialog.addEventListener('click', (event) => {const rect=dialog.getBoundingClientRect();if(event.target === dialog && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)) dialog.close();});}
$('#privacy-open').addEventListener('click', () => $('#privacy-dialog').showModal());
function normalizeUrl(value) {const clean = value.trim();const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(clean) ? clean : `https://${clean}`);if(!['http:','https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error('Informe um endereço válido, como suaempresa.com.br.');url.hash="";return url.href;}
let currentReport=null,auditBusy=false,activeUrl='';
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function grade(value){return value===null?{label:'Sem dados',color:'#a8a8b3'}:value>=90?{label:'Bom',color:'#65c49d'}:value>=50?{label:'Precisa melhorar',color:'#e2ba6c'}:{label:'Atenção prioritária',color:'#ee7777'};}
function renderIssues(){
 const list=$('#issue-list');list.replaceChildren();const filter=$('#issue-filter').value;
 const issues=currentReport.issues.filter(x=>filter==='all'||x.category===filter);
 if(!issues.length){list.append(node('p','empty-state',currentReport.issues.length?'Não há problemas retornados nesta área.':'Nenhum problema automático foi retornado nesta medição. Isso não substitui uma avaliação manual.'));return;}
 for(const issue of issues){
  const details=node('details','issue');const summary=node('summary');
  summary.append(node('span','priority '+(issue.priority==='Alta'?'high':''),issue.priority),node('span','issue-title',issue.title),node('span','issue-category',issue.categoryLabel));details.append(summary);
  const body=node('div','issue-body');body.append(node('h4','','O que foi encontrado'),node('p','',issue.evidence||'Esta verificação encontrou um ponto de atenção no conteúdo recebido.'));
  if(issue.value)body.append(node('p','measured-value','Medição: '+issue.value));
  for(const example of issue.examples)body.append(node('code','evidence',example));
  if(issue.savingsMs!==null)body.append(node('p','micro','Economia potencial de tempo estimada pelo Lighthouse: '+issue.savingsMs+' ms. As estimativas podem se sobrepor e não devem ser somadas.'));
  const impact=node('div','issue-action');impact.append(node('h4','','Possível impacto'),node('p','',issue.impact),node('h4','','Como podemos ajudar'),node('p','',issue.help));body.append(impact);details.append(body);list.append(details);
 }
}
function renderReport(report){
 currentReport=report;const scores=$('#score-grid');scores.replaceChildren();
 for(const category of report.categories){const g=grade(category.score),card=node('article','score-card');const ring=node('div','score-ring');ring.style.setProperty('--score',(category.score??0)+'%');ring.style.setProperty('--score-color',g.color);ring.append(node('strong','',category.score===null?'—':String(category.score)));ring.setAttribute('aria-label',category.label+': '+(category.score===null?'sem dados':category.score+' de 100'));card.append(ring,node('h3','',category.label),node('p','micro',category.detail||(report.mode==='html'?category.passed+'/'+category.total+' verificações aprovadas':g.label)));scores.append(card);}
 $('#findings-summary').textContent=report.mode==='connection'?'Identificamos o que impediu a leitura.':report.counts.issues?report.counts.issues+' '+(report.counts.issues===1?'ponto':'pontos')+' para investigar e melhorar.':'A medição não encontrou falhas automáticas nas verificações retornadas.';
 $('#findings-counts').textContent=report.mode==='connection'?'Relatório parcial: conteúdo, SEO, acessibilidade e carregamento não avaliados.':report.counts.passed+' verificações aprovadas · '+report.counts.unavailable+' sem resultado conclusivo.';
 const metrics=$('#metrics');metrics.replaceChildren();
 for(const m of report.metrics){const row=node('div','metric-row');const label=node('div','metric-label');label.append(node('strong','',m.label),node('span','',m.value));const bar=node('div','metric-track');const fill=node('span');fill.style.width=(m.score??0)+'%';fill.style.background=grade(m.score).color;bar.append(fill);row.append(label,node('p','micro',m.description),bar,node('p','micro',m.score===null?'Valor observado, sem nota de navegação':grade(m.score).label+' · nota do indicador: '+m.score+'/100'));metrics.append(row);}
 const plan=$('#meeting-plan');plan.replaceChildren();
 const top=report.issues.slice(0,3);
 if(top.length){top.forEach((issue,i)=>{const block=node('div','plan-step');block.append(node('span','pillar-no','0'+(i+1)),node('p','',issue.help));plan.append(block);});}
 else plan.append(node('p','micro','Revisar a jornada, a clareza da oferta e os dados de conversão com sua equipe. Esses pontos não foram medidos automaticamente.'));
 $('#issue-filter').value='all';renderIssues();
 const date=new Date(report.measuredAt);$('#measurement-meta').textContent=report.source+' · '+(Number.isNaN(date.valueOf())?report.measuredAt:date.toLocaleString('pt-BR'));
 $('#report-address').textContent='Página analisada: '+report.finalUrl;
 $('#score-note').textContent=report.scoreNote||''; $('#scope-note').textContent=report.scopeNote||''; $('#report-badge').textContent=report.mode==='connection'?'CONEXÃO · RELATÓRIO PARCIAL':report.mode==='html'?'HTML · EVIDÊNCIAS REAIS':'MOBILE · LABORATÓRIO';
 const chart=$('#check-chart');chart.replaceChildren();
 for(const c of report.categories){if(c.total===undefined)continue;const row=node('div','check-chart-row');row.append(node('span','',c.label),node('strong','',c.passed+'/'+c.total+' verificações aprovadas'));const track=node('div','check-track');const fill=node('span');fill.style.width=c.score+'%';track.append(fill);row.append(track);chart.append(row);}

 $('#report-content').hidden=false;
 $('#report-heading').focus({preventScroll:true});
}
$('#issue-filter').addEventListener('change',renderIssues);
$('#site-url').addEventListener('input',()=>$('#site-url').setCustomValidity(''));
$('#retry-audit').addEventListener('click',()=>{$('#site-url').value=activeUrl;$('#audit-form').requestSubmit();});
$('#audit-form').addEventListener('submit',async event=>{
 event.preventDefault();if(auditBusy)return;
 const input=$('#site-url');try{activeUrl=normalizeUrl(input.value);}catch{input.setCustomValidity('Informe um endereço público válido, como suaempresa.com.br.');input.reportValidity();return;}
 auditedUrl=activeUrl;currentReport=null;auditBusy=true;
 const button=$('#audit-button');button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Analisando sua página…';
 $('#site-report').hidden=false;$('#report-loading').hidden=false;$('#report-error').hidden=true;$('#report-content').hidden=true;$('#report-address').textContent=activeUrl;
 $('#audit-status').textContent='Analisando o conteúdo público da página e reunindo evidências reais.';
 $('#site-report').scrollIntoView({behavior:reducedMotion||document.documentElement.classList.contains('motion-paused')?'instant':'smooth',block:'start'});
 const started=Date.now();$('#elapsed').textContent='Medição em andamento…';
 const timer=setInterval(()=>{$('#elapsed').textContent=Math.floor((Date.now()-started)/1000)+' segundos aguardando o resultado. Não é necessário preencher o formulário.';},1000);
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),59000);
 try{
  if(location.protocol==='file:')throw new Error('Para executar a análise real, publique a pasta completa na Vercel. A medição precisa da função /api/audit.');
  const response=await fetch('/api/audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:activeUrl}),signal:controller.signal});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.categories)throw new Error(data?.error||'O serviço de análise não está disponível neste endereço. Nenhuma nota foi gerada.');
  renderReport(data);$('#audit-status').textContent=data.mode==='connection'?'Verificação de conexão concluída. O conteúdo não pôde ser lido; consulte a evidência e a orientação abaixo.':'Diagnóstico concluído. Explore as evidências e as ações recomendadas abaixo.';
 }catch(error){$('#report-error-message').textContent=error.name==='AbortError'?'A página demorou para responder. Tente novamente ou solicite uma avaliação com a Miura.':error.message;$('#report-error').hidden=false;$('#audit-status').textContent='Não foi possível concluir a medição. Veja as opções abaixo.';}
 finally{clearInterval(timer);clearTimeout(timeout);auditBusy=false;$('#report-loading').hidden=true;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Analisar Meu Site Grátis →';}
});
const motionButton=$('#motion-toggle');
function setMotion(paused){document.documentElement.classList.toggle('motion-paused',paused);motionButton.setAttribute('aria-pressed',String(paused));motionButton.textContent=paused?'Ativar movimentos':'Pausar movimentos';}
setMotion(reducedMotion);
motionButton.addEventListener('click',()=>setMotion(!document.documentElement.classList.contains('motion-paused')));
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>setMotion(e.matches));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('arrived');observer.unobserve(entry.target);}}},{threshold:.08});document.querySelectorAll('.panel,.section-heading,.contact-copy').forEach(el=>observer.observe(el));}
window.addEventListener('scroll',()=>{document.documentElement.style.setProperty('--reading-progress',((scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))*100)+'%');},{passive:true});

function animatePotential(target) {cancelAnimationFrame(animationId);if(reducedMotion){currentPotential=target;$('#potential-value').textContent=money.format(target);return;}const start=performance.now(),from=currentPotential;function frame(now){const progress=Math.min((now-start)/350,1);currentPotential=from+(target-from)*(1-Math.pow(1-progress,3));$('#potential-value').textContent=money.format(currentPotential);if(progress<1)animationId=requestAnimationFrame(frame);}animationId=requestAnimationFrame(frame);}
function updateCalculator(){const revenue=Number($('#revenue').value),investment=Number($('#investment').value);$('#revenue-value').textContent=money.format(revenue)+(revenue===500000?'+':'');$('#investment-value').textContent=money.format(investment)+(investment===50000?'+':'');animatePotential(investment*4);$('#comparison').textContent=`A receita simulada equivale a ${Math.round(investment*4/revenue*100)}% do faturamento mensal informado. Não é receita adicional garantida.`;for(const slider of [$('#revenue'),$('#investment')]){const percent=(Number(slider.value)-Number(slider.min))/(Number(slider.max)-Number(slider.min))*100;slider.style.background=`linear-gradient(to right, #990000 ${percent}%, #393941 ${percent}%)`;}}
$('#revenue').addEventListener('input',updateCalculator);$('#investment').addEventListener('input',updateCalculator);updateCalculator();
$('#phone').addEventListener('input', (event) => {event.target.setCustomValidity('');});
const WHATSAPP_MIURA='5561999704242';
const contactUrl='https://wa.me/'+WHATSAPP_MIURA;
const tiktokLink=$('#tiktok-link');
const tiktok=window.MIURA_CONFIG?.tiktokUrl;
tiktokLink.href=contactUrl+'?text='+encodeURIComponent('Olá, Miura! Qual é o perfil de vocês no TikTok?');
if(tiktok){try{const u=new URL(tiktok);if(u.protocol==='https:'&&(u.hostname==='www.tiktok.com'||u.hostname==='tiktok.com')){tiktokLink.href=u.href;tiktokLink.target='_blank';tiktokLink.rel='noopener noreferrer';tiktokLink.setAttribute('aria-label','Acompanhar a Miura no TikTok');tiktokLink.dataset.contactDetail='TikTok · Acompanhe a Miura';}}catch{}}
const serviceCategories=Array.from(document.querySelectorAll('#servicos .miura-category'));
serviceCategories.forEach(button=>button.addEventListener('click',()=>{
 const shouldOpen=button.getAttribute('aria-expanded')!=='true';
 serviceCategories.forEach(category=>{const open=category===button&&shouldOpen;category.setAttribute('aria-expanded',String(open));document.getElementById(category.getAttribute('aria-controls')).hidden=!open;});
}));
document.querySelectorAll('#servicos [data-service]').forEach(link=>link.addEventListener('click',()=>{
 $('#servicos .miura-selected').textContent='Vamos conversar sobre '+link.dataset.service.toLowerCase()+'.';
}));
const footerSocials=document.querySelector('.miura-socials');
const footerContact=$('#footer-contact-detail');
const defaultContact='WhatsApp · (61) 99970-4242';
function describeContact(event){const link=event.target.closest('[data-contact]');if(link&&footerSocials.contains(link))footerContact.textContent=link.dataset.contactDetail;}
footerSocials.addEventListener('pointerover',describeContact);
footerSocials.addEventListener('focusin',describeContact);
footerSocials.addEventListener('pointerleave',()=>{if(!footerSocials.contains(document.activeElement))footerContact.textContent=defaultContact;});
footerSocials.addEventListener('focusout',event=>{if(!footerSocials.contains(event.relatedTarget))footerContact.textContent=defaultContact;});
let leadBusy=false;
$('#lead-form').addEventListener('submit',async(event)=>{
 event.preventDefault();if(leadBusy)return;
 const form=event.currentTarget,data=Object.fromEntries(new FormData(form));
 const phone=data.phone.replace(/\D/g,'');
 if(!/^(?:55)?\d{10,11}$/.test(phone)){$('#phone').setCustomValidity('Informe um WhatsApp válido com DDD.');$('#phone').reportValidity();return;}
 if(data.website)return;
 const payload={name:data.name.trim(),phone:data.phone,goal:data.goal,income:data.income,consent:data.consent==='on',site:auditedUrl,website:data.website||''};
 const message=['Olá, Miura! Tenho interesse nos serviços de marketing digital.','Cliente: '+payload.name,'WhatsApp: '+payload.phone,'Maior objetivo: '+payload.goal,'Faturamento médio: '+payload.income,...(auditedUrl?['Site: '+auditedUrl]:[]),'Autorizo o contato da equipe.'].join('\n');
 const fallback=$('#lead-whatsapp');fallback.href=contactUrl+'?text='+encodeURIComponent(message);fallback.hidden=true;
 const submit=form.querySelector('[type=submit]');leadBusy=true;submit.disabled=true;submit.textContent='Encaminhando sua ficha…';$('#lead-status').textContent='Aguarde enquanto preparamos seu contato.';
 try{
  const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(16000)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'O envio automático não foi confirmado.');
  if(result.status==='accepted'){$('#lead-status').textContent='Sua ficha foi aceita para encaminhamento à equipe. Se preferir, fale conosco também pelo WhatsApp.';fallback.textContent='Conversar agora pelo WhatsApp ↗';fallback.hidden=false;}
  else{$('#lead-status').textContent='Sua ficha está pronta. No WhatsApp, toque em enviar para entregá-la à Miura.';fallback.textContent='Enviar minha ficha pelo WhatsApp ↗';fallback.hidden=false;window.location.assign(fallback.href);}
 }catch{$('#lead-status').textContent='O envio automático não foi confirmado. Use o botão abaixo para revisar e enviar sua ficha no WhatsApp.';fallback.textContent='Enviar minha ficha pelo WhatsApp ↗';fallback.hidden=false;}
 finally{leadBusy=false;submit.disabled=false;submit.textContent='Acelerar Meu Negócio Agora →';}
});
let scrollFrame=0;
function moveWithScroll(){scrollFrame=0;const paused=document.documentElement.classList.contains('motion-paused');for(const el of document.querySelectorAll('.service-card,.visual')){const rect=el.getBoundingClientRect();const offset=paused?0:Math.max(-9,Math.min(9,(innerHeight/2-rect.top-rect.height/2)*.018));el.style.setProperty('--scroll-float',offset+'px');}}
window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(moveWithScroll);},{passive:true});
motionButton.addEventListener('click',moveWithScroll);moveWithScroll();
