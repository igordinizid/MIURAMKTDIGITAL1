'use strict';
const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const ipaddr = require('ipaddr.js');
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
 if (!records.length || records.some(r => !isPublic(r.address))) throw new Error('TARGET');
 return records;
}
async function fetchPage(value, {lookup = dns.lookup, request} = {}) {
 let url = validateUrl(value);
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 14000);
 const started = performance.now();
 try {
  for (let hop = 0; hop <= 3; hop++) {
   const u = new URL(url);
   const records = await resolvePublic(u.hostname, lookup);
   if (controller.signal.aborted) throw new Error('TIMEOUT');
   const record = records.find(r => r.family === 4) || records[0];
   const result = await new Promise((resolve, reject) => {
    const send = request || (u.protocol === 'https:' ? https.request : http.request);
    // Pinned IP preserves the hostname for Host/TLS and prevents DNS rebinding.
    const req = send(u, {
     signal: controller.signal, agent: false,
     lookup: (_hostname, options, cb) => options?.all ? cb(null, [record]) : cb(null, record.address, record.family),
     headers: {'User-Agent': 'MiuraAudit/3.0 (+https://www.miuramktdigital.com.br)', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity'}
    }, res => {
     const firstByteMs = Math.round(performance.now() - started);
     if ([301, 302, 303, 307, 308].includes(res.statusCode)) { res.destroy(); resolve({redirect: res.headers.location}); return; }
     if (res.statusCode < 200 || res.statusCode >= 300) { res.destroy(); reject(new Error('HTTP')); return; }
     if (!/text\/html|application\/xhtml\+xml/i.test(String(res.headers['content-type']))) {res.destroy(); reject(new Error('NOT_HTML')); return;}
     if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') {res.destroy(); reject(new Error('ENCODING')); return;}
     const chunks = []; let bytes = 0;
     res.on('data', chunk => { bytes += chunk.length; if (bytes > 2 * 1024 * 1024) {res.destroy(new Error('TOO_LARGE')); return;} chunks.push(chunk); });
     res.on('error', reject);
     res.on('end', () => resolve({html: Buffer.concat(chunks), bytes, firstByteMs, status: res.statusCode, headers: res.headers, finalUrl: url}));
    });
    req.on('error', reject); req.end();
   });
   if (!Object.hasOwn(result, 'redirect')) return {...result, redirects: hop};
   if (!result.redirect || hop === 3) throw new Error('REDIRECT');
   url = validateUrl(new URL(result.redirect, url).href);
  }
 } finally { clearTimeout(timer); }
}
module.exports = {validateUrl, isPublic, resolvePublic, fetchPage};
