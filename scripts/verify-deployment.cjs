'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const required = [
 'api/audit.js', 'api/leads.js',
 'lib/report.js', 'lib/html-report.js', 'lib/safe-page.js',
 'public/index.html', 'public/app.js', 'public/styles.css',
 'public/config.js', 'public/assets/logo.svg', 'public/assets/simbolo.svg',
 'vercel.json', 'package.json', 'package-lock.json'
];
const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
 console.error('MIURA: a cópia do projeto está incompleta. Arquivos ausentes: ' + missing.join(', '));
 console.error('Extraia o ZIP e envie api/, lib/, public/ e scripts/ junto de package.json e vercel.json. Root Directory deve apontar para essa pasta, nunca para public/.');
 process.exit(1);
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (config.framework !== null || config.outputDirectory !== 'public') {
 throw new Error('MIURA: mantenha Framework Other (framework: null) e Output Directory public.');
}
for (const file of required.filter(file => /\.(js|cjs)$/.test(file))) {
 new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename: file});
}
for (const file of ['api/audit.js', 'api/leads.js']) {
 if (!Object.hasOwn(config.functions || {}, file)) throw new Error('Configuração ausente para ' + file);
 if (typeof require(path.join(root, file)) !== 'function') throw new Error('Handler inválido: ' + file);
}
console.log('MIURA: frontend, logo e duas funções API presentes; dependências e JavaScript verificados.');
