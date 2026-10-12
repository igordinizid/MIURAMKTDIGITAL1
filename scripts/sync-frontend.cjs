'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const filename = path.join(root, 'public/index.html');
let html = read('public/index.html');
if ((html.match(/<style>/g) || []).length !== 1 || (html.match(/<script>/g) || []).length !== 1) {
  throw new Error('MIURA: a página deve conter um bloco de estilos e um de scripts.');
}
const css = read('public/styles.css').trim();
const js = [read('public/config.js').trim(), read('public/app.js').trim()].join('\n');
html = html.replace(/<style>[\s\S]*?<\/style>/, () => '<style>\n' + css + '\n</style>');
html = html.replace(/<script>[\s\S]*?<\/script>/, () => '<script>\n' + js + '\n</script>');
const version = JSON.parse(read('package.json')).version;
html = html.replace(/(<meta name="miura-version" content=")[^"]+("\s*\/?>)/, (_, before, after) => before + version + after);
fs.writeFileSync(filename, html);
console.log('MIURA: estilos e scripts incorporados ao HTML, versão ' + version + '.');
