# MIURA MKT DIGITAL — versão 3.0.3

Projeto completo para substituir o site na Vercel. A logo oficial com fundo transparente está incorporada no HTML, para não depender do carregamento de um arquivo separado.

## Publicar no projeto que já usa seu domínio

1. Extraia o ZIP. A raiz deve conter `package.json`, `package-lock.json`, `vercel.json`, `api/`, `lib/` e `public/`.
2. Substitua os arquivos do repositório conectado ao seu projeto Vercel por estes arquivos e envie as alterações.
3. No projeto Vercel, use **Framework Preset: Other**, **Root Directory: em branco se os arquivos estiverem na raiz do repositório**, **Output Directory: public**, **Install Command: npm ci**, **Build Command: npm run build**. O `vercel.json` já define framework, instalação, verificação e saída.
4. Publique a nova revisão com esses arquivos. Mantenha o domínio `www.miuramktdigital.com.br` associado ao projeto existente. Reimplantar uma revisão antiga não inclui as alterações do ZIP novo.

Não publique somente `index.html`: as funções `api/audit.js` e `api/leads.js` são necessárias. Não envie `node_modules` nem `.env` ao repositório. Não é necessário criar um novo projeto para atualizar seu site.

## Erro: api/audit.js não corresponde a nenhuma função

Os arquivos precisam manter os caminhos originais. `audit.js` deve estar em `api/audit.js`, e `leads.js` em `api/leads.js`. As bibliotecas devem ficar em `lib/`, a página em `public/`, a verificação em `scripts/` e os testes em `tests/`. Enviar todos esses arquivos soltos para a raiz perde a estrutura e impede a publicação.


Essa mensagem significa que a Vercel leu a configuração de `functions`, mas não encontrou a função correspondente entre os arquivos reconhecidos naquela publicação. O ZIP inclui as duas funções. Confira o conteúdo da revisão enviada e a pasta escolhida como Root Directory.

- No GitHub, envie os ARQUIVOS EXTRAÍDOS e suas pastas; colocar apenas o ZIP no repositório não disponibiliza as funções.
- A pasta que contém `vercel.json` e `package.json` precisa conter também `api/audit.js`, `api/leads.js`, `lib/`, `scripts/` e `public/`.
- Se os arquivos estão direto no repositório, mantenha Root Directory em branco. Se colocou tudo em uma subpasta, selecione essa subpasta inteira.
- Root Directory e Output Directory são configurações diferentes. `public` é a saída estática; não deve ser a raiz do projeto porque as funções ficam em `api/`, ao lado dela.
- Use o projeto de HTML + Node.js deste ZIP com Framework Other. A configuração agora força `framework: null` para evitar usar um preset de outro framework. Se estiver usando v0 para gerar um projeto Next.js, esses endpoints precisam ser adaptados ao framework; este pacote não deve ser mesclado como páginas Next.js.
- Preserve as entradas de `functions`: apagá-las não recupera APIs que não foram enviadas.

O comando `npm run build` verifica a presença dos arquivos, os handlers e suas dependências. É uma verificação local; o resultado final da publicação precisa ser confirmado nos registros da Vercel.

## Contatos já configurados

- WhatsApp: +55 61 99970-4242.
- E-mail: atendimento.miuramktdigital@gmail.com.
- Instagram: https://www.instagram.com/miura.mktdigital/.
- TikTok: falta informar o perfil oficial. Até lá, o link convida a pedir o perfil pelo WhatsApp. Preencha `tiktokUrl` em `public/config.js` com o link exato.

## Análise gratuita real

A função lê o HTML público da URL, sem depender de uma chave do Google. Verifica título, descrição, H1, diretivas de indexação, idioma, imagens sem atributo alt, campos sem rótulos, dimensões de imagens, viewport, HTTPS e volume HTML. Mostra a evidência de cada problema, verificações aprovadas por área, gráficos e recomendações.

O tempo de primeira resposta é observado da função ao site, incluindo DNS e redirecionamentos. Não é o tempo de carregamento dos visitantes. Os percentuais são proporções de verificações HTML aprovadas, não notas Lighthouse. O scanner não executa JavaScript nem inspeciona todas as páginas do domínio; páginas montadas no navegador exigem avaliação complementar. Ele não mede posições no Google ou perdas de faturamento.

Para adicionar **LCP, FCP, TBT, CLS, Speed Index e as notas Lighthouse**, crie e habilite a chave de PageSpeed Insights e configure `PAGESPEED_API_KEY` em **Vercel → Settings → Environment Variables**. Depois faça Redeploy. Nunca coloque essa chave em `public/`. Se o Google falhar, a análise HTML continua disponível quando o site permitir a leitura. Não existem links externos de PageSpeed na interface do cliente. Sites protegidos, indisponíveis ou que bloqueiam a leitura ainda podem impedir a análise; nesses casos a interface não inventa resultados.

## Envio da ficha pelo WhatsApp

Sem integração, o formulário abre uma mensagem pronta para **+55 61 99970-4242**. O visitante precisa tocar em **enviar** no próprio WhatsApp. Se a abertura não ocorrer, há um botão explícito para enviar a ficha. O site não afirma que uma mensagem foi entregue automaticamente.

Para enviar automaticamente ao preencher, escolha UMA integração:

### Opção A — webhook de automação

Configure `LEADS_WEBHOOK_URL` com o endpoint HTTPS de uma automação sua (por exemplo, n8n/Make conectado a um provedor de WhatsApp). Se o endpoint usa token, configure `LEADS_WEBHOOK_TOKEN`.

O backend envia JSON com `event`, `id`, `createdAt`, `recipient` (5561999704242), `lead` e `message`. A automação deve enviar `message` ao número `recipient` e retornar sucesso somente quando tiver aceitado a solicitação. Nome, telefone, objetivo, faturamento e site estão em `lead`. O webhook sozinho não envia WhatsApp: o fluxo precisa estar conectado ao provedor e ativado. Configure deduplicação e proteção contra abuso na automação e no projeto Vercel.

### Opção B — WhatsApp Business Cloud API da Meta

Configure no servidor:

- `WHATSAPP_ACCESS_TOKEN`: token de acesso do negócio.
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número que enviará a notificação.
- `WHATSAPP_GRAPH_VERSION`: versão ativa da Graph API usada pela sua conta, por exemplo no formato vNN.0.
- `WHATSAPP_TEMPLATE_NAME`: nome do template aprovado para notificação de leads.
- `WHATSAPP_TEMPLATE_LANGUAGE`: padrão pt_BR.

O template deve ter EXATAMENTE cinco parâmetros no corpo, nesta ordem: nome, WhatsApp do cliente, objetivo, faixa de faturamento e site. Exemplo de corpo a submeter à aprovação da Meta:

> Novo interesse nos serviços da MIURA. Cliente: {{1}}. WhatsApp: {{2}}. Objetivo: {{3}}. Faturamento médio: {{4}}. Site: {{5}}.

A conta/provedor deve estar autorizado a notificar o destinatário informado; aprovação de template, permissões, consentimento de destinatário e eventuais custos são administrados no serviço. O número destinatário continua sendo 5561999704242. Use um remetente habilitado que possa entregar a esse destinatário.

Após configurar, faça Redeploy e um teste controlado. O retorno `accepted` significa aceitação pelo provedor, não confirmação de entrega; a confirmação depende dos eventos de entrega do provedor. Se houver falha, o formulário oferece envio manual. Nunca cole tokens em conversa nem inclua tokens no frontend. Se ambos estiverem configurados, o webhook tem preferência.

## Visual e acessibilidade

13 serviços agrupados em quatro categorias que abrem ao toque, navegação móvel, ícones de contato no rodapé após o formulário, botão flutuante de WhatsApp, fundo com linhas vermelhas e pulsos, símbolo oficial com órbitas, movimentos suaves associados à rolagem. Os movimentos respeitam `prefers-reduced-motion` e podem ser pausados. A calculadora usa o cenário ilustrativo investimento × 4; não é previsão garantida. Não são usados cases de vendas não comprovados.

## Verificação local

Node.js 22:

```sh
npm ci
npm run build
npm run check
npm test
```

Os testes usam respostas controladas e não enviam mensagens reais. O pacote foi verificado localmente; a publicação e as integrações precisam ser conferidas no seu projeto Vercel. A imagem de prévia é ilustrativa e pode apresentar diferenças de tipografia e enquadramento.

A página contém a marca, os estilos e os scripts. Para análise real, publique o projeto completo com `api/` e `lib/`; colar apenas HTML não publica funções de servidor.

## Editar a interface

Edite `public/styles.css` e `public/app.js`. O comando `npm run build` incorpora esses arquivos e `public/config.js` à página, preservando a logo oficial. A interface usa ícones de marcas do Simple Icons 13.21.0 e ícones de interface do Lucide, incorporados no código, sem dependência de um CDN. As categorias de serviços são operadas por botões com `aria-expanded` e mantêm apenas um grupo aberto por vez.
