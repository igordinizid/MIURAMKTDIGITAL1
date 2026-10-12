'use strict';
const categories = {
 performance: {label:'Velocidade',impact:'Uma página lenta pode dificultar a navegação e a chegada até a oferta.',help:'Podemos revisar imagens, carregamento de scripts e a entrega da página, priorizando os gargalos medidos.'},
 seo: {label:'SEO técnico',impact:'Problemas técnicos podem dificultar a interpretação da página pelos mecanismos de busca.',help:'Podemos organizar metadados, indexação e estrutura da página. A análise não mede posição no Google.'},
 accessibility: {label:'Acessibilidade',impact:'Barreiras de leitura e navegação podem impedir que parte do público use a página.',help:'Podemos revisar contraste, formulários, descrições de imagens e navegação por teclado.'},
 'best-practices': {label:'Boas práticas',impact:'Falhas técnicas podem prejudicar a experiência e a confiabilidade da página.',help:'Podemos revisar os problemas apontados e planejar correções com a equipe responsável pelo site.'}
};
const custom = {
 'document-title':['Título da página','Um título claro ajuda pessoas e buscadores a entenderem a página.','Revisar o título para representar a oferta e o conteúdo da página.'],
 'meta-description':['Descrição nos resultados de busca','Uma descrição ausente ou inadequada reduz o controle sobre como a oferta é apresentada.','Criar uma descrição clara e específica para esta página.'],
 'image-alt':['Descrição das imagens','Imagens sem alternativa textual podem perder significado para quem usa leitor de tela.','Adicionar textos alternativos úteis, respeitando imagens decorativas.'],
 'color-contrast':['Contraste de leitura','Contraste insuficiente dificulta a leitura de textos e botões.','Ajustar as combinações de cores mantendo a identidade visual.'],
 'label':['Identificação dos campos','Campos sem rótulos dificultam o preenchimento, especialmente com tecnologias assistivas.','Revisar rótulos, instruções e mensagens de erro dos formulários.'],
 'link-name':['Identificação dos links','Links sem descrição clara dificultam a decisão de navegação.','Criar nomes acessíveis que expliquem o destino ou a ação.'],
 'is-crawlable':['Permissão de indexação','A configuração encontrada pode impedir a indexação desta página. Pode também ser intencional.','Confirmar o objetivo da página e revisar as regras de indexação quando apropriado.'],
 'unused-javascript':['JavaScript não utilizado','Código desnecessário aumenta o trabalho de carregamento da página.','Revisar dependências e carregar apenas o código necessário.'],
 'unused-css-rules':['CSS não utilizado','Estilos não utilizados podem aumentar o volume transferido.','Reduzir CSS excedente e priorizar os estilos necessários à primeira tela.'],
 'render-blocking-resources':['Recursos que bloqueiam a exibição','Arquivos podem atrasar a primeira apresentação do conteúdo.','Reorganizar carregamento de CSS e scripts após validar dependências.'],
 'render-blocking-insight':['Recursos que bloqueiam a exibição','Arquivos podem atrasar a primeira apresentação do conteúdo.','Reorganizar carregamento de CSS e scripts após validar dependências.'],
 'image-delivery-insight':['Entrega de imagens','Imagens podem estar consumindo mais dados do que o necessário.','Revisar dimensões, compressão e formatos das imagens.'],
 'uses-optimized-images':['Otimização de imagens','Imagens pesadas podem atrasar o carregamento do conteúdo.','Comprimir arquivos e usar dimensões adequadas.'],
 'uses-responsive-images':['Dimensões das imagens','Imagens maiores que sua área de exibição podem desperdiçar dados.','Entregar versões adequadas para cada tamanho de tela.']
};
function plain(value){return String(value||'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[`*_]/g,'').replace(/<[^>]*>/g,'').slice(0,1800);}
function score(value){return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.min(1,Math.max(0,value))*100):null;}
function buildReport(payload,url){
 const lh=payload?.lighthouseResult;
 if(!lh||lh.runtimeError)throw new Error('INCOMPLETE');
 const audits=lh.audits||{},issues=new Map();let passed=0,unavailable=0;
 const cards=Object.entries(categories).map(([id,config])=>{
  const category=lh.categories?.[id];
  for(const ref of category?.auditRefs||[]){
   const audit=audits[ref.id];if(!audit)continue;
   if(['manual','notApplicable','informative'].includes(audit.scoreDisplayMode))continue;
   if(audit.scoreDisplayMode==='error'||typeof audit.score!=='number'){unavailable++;continue;}
   if(audit.score===1){passed++;continue;}
   if(issues.has(ref.id))continue;
   const entry=custom[ref.id];
   const evidence=[];
   for(const item of audit.details?.items||[]){
    const node=item.node;
    if(node?.selector)evidence.push('Elemento: '+plain(node.selector));
    else if(typeof item.url==='string'){try{const u=new URL(item.url);evidence.push('Recurso: '+u.origin+u.pathname);}catch{}}
    if(evidence.length===3)break;
   }
   const savings=audit.details?.overallSavingsMs;
   issues.set(ref.id,{
    id:ref.id,category:id,categoryLabel:config.label,
    title:entry?.[0]||plain(audit.title)||ref.id,
    evidence:plain(audit.description),value:plain(audit.displayValue),examples:evidence,
    impact:entry?.[1]||config.impact,help:entry?.[2]||config.help,
    priority:audit.score<.5?'Alta':'Melhoria',
    savingsMs:typeof savings==='number'&&savings>0?Math.round(savings):null,
    rank:(1-audit.score)*(1+Math.max(0,Number(ref.weight)||0))
   });
  }
  return {id,label:config.label,score:score(category?.score)};
 });
 if(!cards.some(c=>c.score!==null))throw new Error('INCOMPLETE');
 const metricDefs=[['largest-contentful-paint','LCP','Exibição do maior conteúdo'],['first-contentful-paint','FCP','Primeiro conteúdo visível'],['total-blocking-time','TBT','Tempo de bloqueio da página'],['cumulative-layout-shift','CLS','Estabilidade do layout'],['speed-index','Speed Index','Velocidade de preenchimento visual']];
 const metrics=metricDefs.map(([id,label,description])=>{const a=audits[id];return {id,label,description,value:plain(a?.displayValue)||'Não disponível',score:score(a?.score)};});
 const list=[...issues.values()].sort((a,b)=>b.rank-a.rank).map(({rank,...issue})=>issue);
 return {url,finalUrl:lh.finalDisplayedUrl||lh.finalUrl||url,measuredAt:lh.fetchTime||new Date().toISOString(),device:'mobile',source:'Google PageSpeed Insights / Lighthouse',categories:cards,metrics,issues:list,counts:{issues:list.length,passed,unavailable},version:lh.lighthouseVersion||null};
}
module.exports={buildReport};
