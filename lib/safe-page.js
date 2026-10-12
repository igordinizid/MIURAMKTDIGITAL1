'use strict';
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const ipaddr = require('ipaddr.js');
const MAX_BYTES = 2 * 1024 * 1024;
class PageReadError extends Error {
 constructor(code, observation = {}) { super(code); this.name = 'PageReadError'; this.auditCode = code; this.observation = observation; }
}
function isPublic(address) {
 try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
function validateUrl(value) {
 if (typeof value !== 'string' || value.length > 2048) throw new Error('URL');
 const u = new URL(value);
 if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port) throw new Error('URL');
 const host = u.hostname.toLowerCase();
 if (ipaddr.isValid(host) || host.includes(':') || !host.includes('.') || host.endsWith('.') || /\.(local|localhost|internal|test|invalid|example)$/.test(host)) throw new Error('URL');
 u.hash = '';
 return u.href;
}
async function resolvePublic(host, lookup = dns.lookup) {
 const records = await lookup(host, {all: true, verbatim: true});
 if (!records.length || records.some(r => !isPublic(r.address))) throw new PageReadError('TARGET');
 return records;
}
async function fetchPage(value, {lookup = dns.lookup, request} = {}) {
 let url = validateUrl(value);
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 14000);
 const started = performance.now();
 let observation = {finalUrl:url};
 try {
  for (let hop = 0; hop <= 3; hop++) {
   const u = new URL(url);
   observation = {finalUrl:url};
   const records = await resolvePublic(u.hostname, lookup);
   if (controller.signal.aborted) throw new PageReadError('TIMEOUT');
   const record = records.find(r => r.family === 4) || records[0];
   const result = await new Promise((resolve, reject) => {
    const send = request || (u.protocol === 'https:' ? https.request : http.request);
    // Pinned IP preserves the hostname for Host/TLS and prevents DNS rebinding.
    const req = send(u, {
     signal: controller.signal, agent: false,
     lookup: (_hostname, options, cb) => options?.all ? cb(null, [record]) : cb(null, record.address, record.family),
     headers: {'User-Agent': 'MiuraAudit/3.0 (+https://www.miuramktdigital.com.br)', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'gzip, deflate, br'}
    }, res => {
     const firstByteMs = Math.round(performance.now() - started);
     observation = {finalUrl:url, status:res.statusCode, firstByteMs, server:String(res.headers.server||'').slice(0,80), contentType:String(res.headers['content-type']||'').slice(0,100)};
     if ([301, 302, 303, 307, 308].includes(res.statusCode)) { res.destroy(); resolve({redirect: res.headers.location}); return; }
     if (res.statusCode < 200 || res.statusCode >= 300) { res.destroy(); reject(new PageReadError('HTTP',observation)); return; }
     if (!/text\/html|application\/xhtml\+xml/i.test(String(res.headers['content-type']))) {res.destroy(); reject(new PageReadError('NOT_HTML',observation)); return;}
     const encoding = String(res.headers['content-encoding']||'identity').trim().toLowerCase();
     const decoders = {gzip:()=>zlib.createGunzip(), 'x-gzip':()=>zlib.createGunzip(), deflate:()=>zlib.createInflate(), br:()=>zlib.createBrotliDecompress()};
     if (encoding !== 'identity' && !Object.hasOwn(decoders,encoding)) {res.destroy();reject(new PageReadError('ENCODING',observation));return;}
     const stream = encoding === 'identity' ? res : decoders[encoding]();
     const chunks = []; let bytes = 0, wireBytes = 0, settled = false;
     const fail = error => {if(settled)return;settled=true;res.destroy();if(stream!==res)stream.destroy();reject(error);};
     res.on('data', chunk => {wireBytes+=chunk.length;if(wireBytes>MAX_BYTES)fail(new PageReadError('TOO_LARGE',observation));});
     res.on('error', error => fail(error));
     res.on('aborted', () => fail(new PageReadError('NETWORK',observation)));
     if(stream!==res)stream.on('error',()=>fail(new PageReadError('ENCODING',observation)));
     stream.on('data', chunk => {if(settled)return;bytes+=chunk.length;if(bytes>MAX_BYTES){fail(new PageReadError('TOO_LARGE',observation));return;}chunks.push(chunk);});
     stream.on('end', () => {if(settled)return;settled=true;resolve({html:Buffer.concat(chunks),bytes,wireBytes,encoding,firstByteMs,status:res.statusCode,headers:res.headers,finalUrl:url});});
     if(stream!==res)res.pipe(stream);
    });
    req.on('error', reject); req.end();
   });
   if (!Object.hasOwn(result, 'redirect')) return {...result, redirects: hop};
   if (!result.redirect || hop === 3) throw new PageReadError('REDIRECT',observation);
   url = validateUrl(new URL(result.redirect, url).href);
  }
 } catch(error) {
  const extra = {...observation,elapsedMs:Math.round(performance.now()-started)};
  if(error instanceof PageReadError){error.observation={...extra,...error.observation};throw error;}
  const code = controller.signal.aborted || error.name==='AbortError' ? 'TIMEOUT'
   : ['ENOTFOUND','EAI_AGAIN','EAI_FAIL'].includes(error.code) ? 'DNS'
   : /CERT|TLS|SSL|UNABLE_TO_VERIFY|SELF_SIGNED|DEPTH_ZERO/.test(String(error.code)) ? 'TLS' : 'NETWORK';
  throw new PageReadError(code,extra);
 } finally { clearTimeout(timer); }
}
module.exports = {validateUrl, isPublic, resolvePublic, fetchPage, PageReadError, MAX_BYTES};
