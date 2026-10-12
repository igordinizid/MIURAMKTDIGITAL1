'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {PassThrough} = require('node:stream');
const zlib = require('node:zlib');
const {fetchPage,PageReadError,MAX_BYTES} = require('../lib/safe-page');
const {buildConnectionReport} = require('../lib/connection-report');
const {createHandler} = require('../api/audit');
const html = Buffer.from('<html lang="pt-BR"><head><title>Empresa de teste</title></head><body><h1>Oferta real</h1></body></html>');
const lookup = async () => [{address:'8.8.8.8',family:4}];
function fakeResponse(body,{status=200,headers={'content-type':'text/html'}}={}) {
 return (url, options, callback) => {
  assert.ok(options.headers['User-Agent'].startsWith('MiuraAudit/'));
  options.lookup(url.hostname,{all:false},(error,address)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');});
  const req=new EventEmitter();
  req.end=()=>setImmediate(()=>{const res=new PassThrough();res.statusCode=status;res.headers=headers;callback(res);if(!res.destroyed)res.end(body);});
  return req;
 };
}
for(const [encoding,compress] of [['gzip',zlib.gzipSync],['deflate',zlib.deflateSync],['br',zlib.brotliCompressSync]]) {
 test('reads '+encoding+' HTML and records actual transfer sizes',async()=>{
  const encoded=compress(html);
  const page=await fetchPage('https://empresa.com.br/',{lookup,request:fakeResponse(encoded,{headers:{'content-type':'text/html','content-encoding':encoding}})});
  assert.deepEqual(page.html,html);assert.equal(page.bytes,html.length);assert.equal(page.wireBytes,encoded.length);assert.equal(page.encoding,encoding);
 });
}
test('plain HTML is still read without changing its content',async()=>{
 const page=await fetchPage('https://empresa.com.br/',{lookup,request:fakeResponse(html)});
 assert.deepEqual(page.html,html);assert.equal(page.encoding,'identity');
});
test('compressed documents cannot exceed the decoded size limit',async()=>{
 const body=zlib.gzipSync(Buffer.alloc(MAX_BYTES+1,65));
 await assert.rejects(fetchPage('https://empresa.com.br/',{lookup,request:fakeResponse(body,{headers:{'content-type':'text/html','content-encoding':'gzip'}})}),error=>error.auditCode==='TOO_LARGE');
});
test('invalid compressed responses are not inspected as HTML',async()=>{
 await assert.rejects(fetchPage('https://empresa.com.br/',{lookup,request:fakeResponse(Buffer.from('not gzip'),{headers:{'content-type':'text/html','content-encoding':'gzip'}})}),error=>error.auditCode==='ENCODING');
});
test('HTTP 403 is recorded without inspecting the denial page',async()=>{
 let error;
 try{await fetchPage('https://empresa.com.br/',{lookup,request:fakeResponse(Buffer.from('<title>Access denied</title>'),{status:403,headers:{'content-type':'text/html',server:'CloudFront'}})});}catch(e){error=e;}
 assert.equal(error.auditCode,'HTTP');assert.equal(error.observation.status,403);assert.equal(error.observation.server,'CloudFront');assert.ok(Number.isFinite(error.observation.firstByteMs));
 const report=buildConnectionReport(error,'https://empresa.com.br/');
 assert.equal(report.partial,true);assert.equal(report.mode,'connection');assert.ok(report.categories.every(c=>c.score===null));assert.ok(report.issues[0].evidence.includes('HTTP 403'));assert.ok(!report.issues.some(i=>i.id==='html-description'));assert.ok(report.metrics.some(m=>m.id==='http-status'&&m.value==='403'));
});
test('DNS failures do not invent an HTTP response or a loading time',async()=>{
 let error;
 try{await fetchPage('https://empresa.com.br/',{lookup:async()=>{throw Object.assign(new Error('temporary DNS error'),{code:'EAI_AGAIN'});}});}catch(e){error=e;}
 const report=buildConnectionReport(error,'https://empresa.com.br/');
 assert.equal(error.auditCode,'DNS');assert.ok(!report.metrics.some(m=>m.id==='http-status'||m.id==='response'));assert.ok(report.metrics.some(m=>m.id==='attempt'));
});
test('denied targets return a partial report with no fabricated grades',async()=>{
 const old=process.env.PAGESPEED_API_KEY;delete process.env.PAGESPEED_API_KEY;
 try {
  const handler=createHandler({pageFetcher:async()=>{throw new PageReadError('HTTP',{status:403,firstByteMs:145,server:'CloudFront',finalUrl:'https://empresa.com.br/'});},logger(){}});
  const out={};await handler({method:'POST',body:{url:'https://empresa.com.br/'},headers:{host:'miura.vercel.app',origin:'https://miura.vercel.app','content-type':'application/json'}},{setHeader(){},status(value){out.status=value;return this;},json(value){out.body=value;return this;}});
  assert.equal(out.status,200);assert.equal(out.body.mode,'connection');assert.ok(out.body.categories.every(c=>c.score===null));assert.equal(out.body.counts.passed,0);
 }finally{if(old===undefined)delete process.env.PAGESPEED_API_KEY;else process.env.PAGESPEED_API_KEY=old;}
});
