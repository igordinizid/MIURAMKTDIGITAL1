'use strict';
const cheerio = require('cheerio');
function buildHtmlReport(page, url) {
 const $ = cheerio.loadBuffer(page.html);
 const issues = [], checks = [];
 const defs = {performance:'Entrega HTML', seo:'SEO no HTML', accessibility:'Acessibilidade HTML', 'best-practices':'Estrutura e segurança'};
 function check(id, category, title, pass, evidence, help, impact, examples = []) {
  checks.push({id, category, title, passed:pass, evidence});
  if (!pass) issues.push({id, category, categoryLabel:defs[category], title, evidence, value:'', examples, help, impact, priority:'Melhoria', savingsMs:null});
 }
 const title = $('head title').text().trim();
 const description = $('meta[name]').filter((_, el)=>String($(el).attr('name')).toLowerCase()==='description').attr('content')?.trim() || '';
 const h1s = $('h1').length, images = $('img'), missingAlt = images.filter((_, el)=>$(el).attr('alt') === undefined);
 const noDimensions = images.filter((_, el)=>!$(el).attr('width') || !$(el).attr('height'));
 const fields = $('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]),select,textarea');
 const unlabeled = fields.filter((_, el)=> {
  const e=$(el), id=e.attr('id');
  const associated=id && $('label[for]').toArray().some(l=>$(l).attr('for')===id);
  const labelledBy=String(e.attr('aria-labelledby')||'').split(/\s+/).filter(Boolean);
  const ariaLabel=String(e.attr('aria-label')||'').trim();
  return !ariaLabel && !associated && !e.parents('label').length && !labelledBy.some(v=>$('[id]').toArray().some(n=>$(n).attr('id')===v && $(n).text().trim()));
 });
 const refs = (elements, attr) => elements.toArray().slice(0,3).map(e=>String($(e).attr(attr)||$(e).attr('name')||e.tagName).slice(0,200));
 check('html-title','seo','Título da página', !!title, title ? 'Título encontrado: '+title.slice(0,180) : 'Nenhum <title> com conteúdo no HTML recebido.', 'Criar um título que represente a oferta e o conteúdo desta página.', 'O título ajuda visitantes e buscadores a identificar a página.');
 check('html-description','seo','Descrição para os buscadores',!!description,description ? 'Descrição encontrada: '+description.slice(0,240) : 'Meta description ausente ou vazia no HTML.', 'Escrever uma descrição específica da oferta.', 'A descrição contribui para apresentar a oferta nos resultados de pesquisa.');
 check('html-h1','seo','Título principal da página',h1s===1,`${h1s} elementos H1 encontrados.`, 'Revisar a hierarquia dos títulos e definir o tema principal da página.', 'Uma hierarquia clara facilita a compreensão; esta contagem não prova um problema de ranking.');
 check('html-index','seo','Diretivas de indexação',! /noindex/i.test(($('meta[name="robots"]').attr('content')||'')+' '+(page.headers['x-robots-tag']||'')), 'Verificadas as diretivas meta robots e X-Robots-Tag. robots.txt não foi consultado.', 'Confirmar se a página deve aparecer nas buscas antes de remover noindex.', 'Uma diretiva noindex solicita que a página não seja indexada.');
 check('html-alt','accessibility','Alternativa textual nas imagens',missingAlt.length===0,`${missingAlt.length} de ${images.length} imagens sem atributo alt. Alt vazio pode ser adequado para imagens decorativas.`, 'Adicionar descrições úteis às imagens informativas.', 'Imagens sem alternativa podem perder sentido para usuários de leitores de tela.',refs(missingAlt,'src'));
 check('html-lang','accessibility','Idioma do documento',!!$('html').attr('lang')?.trim(), 'Idioma declarado: '+($('html').attr('lang')||'ausente'), 'Declarar o idioma principal no elemento HTML.', 'Leitores de tela usam o idioma declarado para orientar a pronúncia.');
 check('html-label','accessibility','Rótulos dos campos',unlabeled.length===0,`${unlabeled.length} de ${fields.length} campos sem rótulo identificável no HTML.`, 'Associar cada campo a um rótulo claro.', 'Rótulos ajudam pessoas a entender e preencher formulários.',refs(unlabeled,'id'));
 check('html-dimensions','performance','Dimensões declaradas das imagens',noDimensions.length===0,`${noDimensions.length} de ${images.length} imagens sem width e height. CSS pode reservar espaço; não foi avaliado.`, 'Verificar a reserva de espaço das imagens no layout e declarar dimensões quando adequado.', 'A ausência é um ponto de revisão, não uma medição de instabilidade visual.',refs(noDimensions,'src'));
 check('html-size','performance','Volume do documento HTML',page.bytes<=250000,`${page.bytes.toLocaleString('pt-BR')} bytes no documento HTML. Limite de triagem Miura: 250 kB. Não inclui imagens, CSS ou JavaScript externos.`, 'Revisar marcação repetida e dados embutidos, preservando o conteúdo necessário.', 'Documentos grandes transferem mais dados; este valor não é o peso total da página.');
 check('html-viewport','best-practices','Configuração de tela móvel',/width\s*=\s*device-width/i.test($('meta[name="viewport"]').attr('content')||''),'Viewport: '+($('meta[name="viewport"]').attr('content')||'ausente'), 'Configurar a viewport e testar o layout em aparelhos reais.', 'A viewport orienta a escala inicial em telas móveis.');
 check('html-https','best-practices','Conexão HTTPS',new URL(page.finalUrl).protocol==='https:', 'Protocolo observado: '+new URL(page.finalUrl).protocol, 'Ativar HTTPS válido e revisar redirecionamentos.', 'HTTPS protege os dados em trânsito.');
 const categories = Object.entries(defs).map(([id,label])=>{const group=checks.filter(c=>c.category===id);return {id,label,score:Math.round(group.filter(c=>c.passed).length/group.length*100),passed:group.filter(c=>c.passed).length,total:group.length};});
 return {url,finalUrl:page.finalUrl,measuredAt:new Date().toISOString(),device:'server',source:'Miura · inspeção do HTML recebido',mode:'html',categories,issues,checks,counts:{issues:issues.length,passed:checks.filter(c=>c.passed).length,unavailable:0},
  scoreNote:'Percentual de verificações HTML aprovadas em cada área. Não são notas Lighthouse nem medidas de posicionamento, vendas ou velocidade de navegação.',
  scopeNote:'Inspeção do HTML entregue ao servidor. Não executa JavaScript, não testa contraste e não mede LCP, CLS, INP ou carregamento completo. Sites que montam conteúdo por JavaScript exigem análise adicional.',
  metrics:[{id:'response',label:'Primeira resposta',value:page.firstByteMs+' ms',description:'Tempo observado deste servidor até os cabeçalhos, incluindo DNS e redirecionamentos. Não representa a experiência de todos os visitantes.',score:null},{id:'bytes',label:'HTML analisado',value:(page.bytes/1024).toFixed(1)+' kB',description:'Volume do documento HTML após descompressão. Não inclui todos os recursos da página.',score:null},...(page.encoding&&page.encoding!=='identity'&&Number.isFinite(page.wireBytes)?[{id:'wire-bytes',label:'HTML transferido',value:(page.wireBytes/1024).toFixed(1)+' kB',description:'Corpo da resposta comprimida recebido nesta conexão. Não inclui os cabeçalhos nem os demais recursos da página.',score:null}]:[]),{id:'images',label:'Imagens sem alt',value:missingAlt.length+' / '+images.length,description:'Quantidade sem atributo de alternativa textual no HTML.',score:null},{id:'fields',label:'Campos sem rótulo',value:unlabeled.length+' / '+fields.length,description:'Rótulos não identificados nesta inspeção do HTML.',score:null}],version:'3.0.4'};
}
module.exports={buildHtmlReport};
