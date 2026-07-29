# Fly e-Nota Automator — Chrome extension

Automatiza o preenchimento de notas de exportação de serviços no portal **Fly e-Nota** (Betha Sistemas) a partir de uma planilha de clientes. Você importa um XLSX uma vez, escolhe o cliente no popup e a extensão preenche os 34 passos do formulário automaticamente. A emissão final continua manual — a extensão nunca clica em **Emitir**.

## Recursos

- 📥 Importa clientes de uma planilha XLSX e armazena no `chrome.storage.local`.
- 🎯 Preenche automaticamente os 34 passos da DPS de exportação (incluindo o clique na linha de alíquota da LC 155/2016 quando aplicável).
- 🗂️ Suporta o novo layout em abas (**Pessoas / Serviço / Valores / IBS/CBS / Outras informações**) — a extensão troca de aba automaticamente antes de preencher cada campo.
- 🔄 Funciona tanto no portal de produção quanto no ambiente de homologação (`/e-nota/` e `/e-nota-test/`).
- 🟢 Indicador **Ativo / Inativo** no topo da popup mostra se a aba atual é a do Fly e-Nota.
- 👁️ Cada campo preenchido é rolado até o centro da tela e ganha um flash visual.
- 📋 Painel **Logs da última execução** (colapsado por padrão) com timestamp por passo, botões Copiar e Limpar.
- 📊 Aba **Ver dados** com tabela completa dos clientes importados, busca e indicação de incompletos.
- ⚠️ Linhas com colunas estruturadas faltando (`Logradouro`, `CEP`, `Município`…) entram marcadas como **incompletas** e o botão Aplicar fica bloqueado — corrija a planilha e re-importe.

## Instalar (recomendado)

1. Vá para a página de [Releases](../../releases) e baixe o `fly-enota-extension-vX.Y.Z.zip` mais recente.
2. Extraia o arquivo em uma pasta de sua preferência (não mova depois — o Chrome lê os arquivos do disco a cada inicialização).
3. Abra `chrome://extensions` no Chrome.
4. Ative **Modo do desenvolvedor** (canto superior direito).
5. Clique em **Carregar sem compactação** e selecione a pasta extraída.
6. Fixe o ícone na barra de ferramentas para acesso rápido.

## Instalar a partir do código-fonte (desenvolvimento)

1. Clone este repositório.
2. Em `chrome://extensions`, ligue **Modo do desenvolvedor**.
3. **Carregar sem compactação** → selecione a pasta clonada (`fly-enota-extension/`).

## Como usar

1. Faça login no Fly e-Nota e abra a tela `Cadastro de DPS / Notas Fiscais` (produção ou test).
2. Clique no ícone da extensão. O badge no topo deve mostrar **🟢 Ativo**.
3. **📥 Importar XLSX** — selecione a planilha de clientes (uma vez por sessão; os dados ficam guardados localmente).
4. Abra o dropdown **Cliente**, selecione o cliente desejado.
5. Clique em **Aplicar no formulário** (ou pressione Enter).
6. Acompanhe o progresso: cada campo é destacado conforme é preenchido.
7. Revise o formulário e clique em **Emitir** manualmente.
8. **📋 Logs da última execução** mostra o detalhe de cada passo se algo precisar ser investigado.
9. **📊 Ver dados** abre uma aba com todos os clientes importados em formato de tabela.

## Formato da planilha

A extensão lê as seguintes colunas (case-insensitive, acentos ignorados):

| Coluna | Campo no formulário | Obrigatório |
|---|---|:---:|
| `ID` | identificador interno | sim |
| `CLIENT` | nome para exibição na lista | — |
| `Nome/Razão Social` | Razão social | sim |
| `Telefone` | Telefone | sim |
| `E-mail` | E-mail | — |
| `Logradouro`, `Número`, `Complemento` | Endereço | sim (exceto Complemento) |
| `Estado` | Estado | sim |
| `Município` | Município | sim |
| `Código Postal` | CEP | sim |
| `CURRENCY` | Código da moeda (USD, EUR, …) | sim |
| `TOTAL` | Valor em moeda estrangeira | sim |
| `TOTAL BRL` | Valor do serviço em BRL | sim |

## Adicionando outro formulário

A arquitetura é por-formulário. Para suportar uma segunda nota:

1. Adicione uma entrada em `shared/form-registry.js` (id, title, urlMatch, requiredFields, fillerName, viewerColumns).
2. Crie `content/forms/<seu-id>.js` exportando `globalThis.FlyENotaFillers.<fillerName> = async (client) => { ... }`.
3. Acrescente o arquivo aos `content_scripts.js` em `manifest.json`.
4. Se a planilha tiver colunas diferentes, ajuste `shared/xlsx-import.js`.

A popup e o visualizador funcionam automaticamente — eles iteram sobre o registry.

## Publicando uma nova versão

1. Atualize `version` em `manifest.json` (siga SemVer: `0.1.0` → `0.2.0`).
2. Commit e push na branch `main`.
3. Crie e empurre uma tag com o mesmo número, prefixada por `v`:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. O workflow `release.yml` valida que a tag bate com a versão do manifesto, gera o zip e publica como GitHub Release com notas automáticas.

## Estrutura

```text
fly-enota-extension/
├── manifest.json
├── popup/        UI do popup (componente form-card por formulário)
├── viewer/       Aba "Ver dados"
├── content/      Script injetado na página + fillers por formulário
├── shared/       form-registry, storage, dom-utils, currency-map, xlsx-import
├── vendor/       SheetJS bundled (Apache-2.0)
├── icons/        Ícones do action button
└── .github/      Workflows: ci.yml + release.yml
```

## Licenças

Extensão: MIT.
Dependência embarcada: [SheetJS Community Edition](https://github.com/SheetJS/sheetjs) sob Apache-2.0.
