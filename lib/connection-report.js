'use strict';

function buildConnectionReport(error, url) {
 const observed = error.observation || {};
 const status = Number.isInteger(observed.status) ? observed.status : null;
 const code = error.auditCode || 'NETWORK';
 const descriptions = {
  HTTP: {
   title: status === 403 || status === 401 ? 'Servidor recusou a leitura automática' : 'A página respondeu com um erro HTTP',
   evidence: 'A conexão desta auditoria recebeu HTTP ' + status + '. O documento não foi usado para avaliar SEO ou acessibilidade.',
   help: status === 403 || status === 401 ? 'Revisar com o responsável pela hospedagem se a restrição de acesso é intencional. Confirmar as regras de proteção e complementar a análise manualmente.' : 'Verificar com a hospedagem a resposta desta URL e corrigir o erro antes de repetir a leitura.'
  },
  DNS: {title:'Endereço não resolvido nesta tentativa',evidence:'O serviço de DNS não retornou um endereço utilizável na conexão desta auditoria.',help:'Confirmar o endereço informado e revisar a configuração de DNS com a hospedagem.'},
  TLS: {title:'A conexão HTTPS não pôde ser validada',evidence:'A validação segura da conexão HTTPS falhou antes de ler o documento.',help:'Revisar o certificado HTTPS e sua cadeia de confiança com a hospedagem.'},
  TIMEOUT: {title:'Tempo limite de leitura atingido',evidence:'Esta tentativa ultrapassou o tempo disponível para obter o documento. Isso não mede a velocidade de todos os visitantes.',help:'Verificar a resposta da hospedagem e repetir a leitura. Uma avaliação complementar pode medir a experiência de navegação.'},
  NOT_HTML: {title:'O endereço não entregou uma página HTML',evidence:'A resposta recebida tem o tipo '+(observed.contentType||'não identificado')+'. Esta análise requer uma página HTML.',help:'Informar uma página pública do site, em vez de um arquivo, imagem ou endpoint.'},
  ENCODING: {title:'Não foi possível interpretar a resposta comprimida',evidence:'O documento recebido usa uma compressão não suportada ou chegou incompleto. Seu conteúdo não foi analisado.',help:'Verificar com a hospedagem a integridade e o formato da resposta HTML.'},
  TOO_LARGE: {title:'Documento excedeu o limite desta auditoria',evidence:'A resposta ultrapassou o limite de leitura de 2 MiB. Isso não representa o peso total da página no navegador.',help:'Revisar o volume de dados embutidos no HTML e realizar uma avaliação complementar do carregamento.'},
  REDIRECT: {title:'Redirecionamentos impediram a leitura',evidence:'O endereço excedeu o limite de redirecionamentos desta auditoria ou retornou um destino inválido.',help:'Revisar a sequência de redirecionamentos e confirmar a URL final pública.'},
  NETWORK: {title:'A conexão não entregou o documento',evidence:'A leitura foi interrompida nesta conexão antes de obter um documento completo.',help:'Verificar o endereço e a resposta da hospedagem. A tentativa não confirma indisponibilidade para todos os visitantes.'}
 };
 const finding = descriptions[code] || descriptions.NETWORK;
 const finalUrl = observed.finalUrl || url;
 const protocol = new URL(finalUrl).protocol;
 const metrics = [];
 if(status!==null)metrics.push({id:'http-status',label:'Resposta HTTP',value:String(status),description:'Código retornado à conexão desta auditoria. A resposta pode variar conforme a origem do acesso.',score:null});
 if(Number.isFinite(observed.firstByteMs))metrics.push({id:'response',label:'Tempo até a resposta',value:observed.firstByteMs+' ms',description:'Tempo observado até os cabeçalhos da resposta. Não é o carregamento completo da página.',score:null});
 else if(Number.isFinite(observed.elapsedMs))metrics.push({id:'attempt',label:'Duração da tentativa',value:observed.elapsedMs+' ms',description:'Tempo gasto por esta tentativa de conexão, sem uma medição de carregamento.',score:null});
 metrics.push({id:'protocol',label:'Protocolo solicitado',value:protocol==='https:'?'HTTPS':'HTTP',description:'Protocolo utilizado nesta tentativa. Não substitui uma avaliação completa de segurança.',score:null});
 if(observed.server)metrics.push({id:'server',label:'Servidor identificado na resposta',value:observed.server,description:'Identificação informada pelo servidor. Ela não revela qual regra ou configuração causou a recusa.',score:null});
 return {
  url,finalUrl,measuredAt:new Date().toISOString(),mode:'connection',partial:true,errorCode:code,device:'server',source:'Miura · verificação da conexão',
  categories:[
   {id:'connection',label:'Leitura do documento',score:null,detail:status!==null?'Resposta HTTP '+status:'Documento não obtido'},
   {id:'seo',label:'SEO',score:null,detail:'Conteúdo não lido'},
   {id:'accessibility',label:'Acessibilidade',score:null,detail:'Conteúdo não lido'},
   {id:'performance',label:'Carregamento',score:null,detail:'Teste não concluído'}
  ],
  metrics,checks:[],issues:[{id:'connection-'+code.toLowerCase(),category:'best-practices',categoryLabel:'Conexão e acesso',priority:'Investigar',title:finding.title,evidence:finding.evidence,impact:'A restrição desta tentativa impede a auditoria automática do conteúdo. Ela não prova problemas de posicionamento, conversão ou acesso de todos os visitantes.',help:finding.help,value:status!==null?'HTTP '+status:'',examples:[],savingsMs:null}],
  counts:{issues:1,passed:0,unavailable:3},
  scoreNote:'Relatório parcial de conexão. Nenhuma nota de SEO, acessibilidade ou velocidade foi calculada porque o documento não pôde ser lido.',
  scopeNote:'Os dados descrevem somente esta tentativa de conexão do servidor da auditoria. Uma recusa HTTP não confirma que a página esteja indisponível para todos os visitantes. O conteúdo não foi analisado.',
  version:'3.0.4'
 };
}
module.exports = {buildConnectionReport};
