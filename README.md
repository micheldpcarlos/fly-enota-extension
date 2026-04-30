# Fly e-Nota Auto-fill — Chrome extension

Preenche notas de exportação de serviços no portal **Fly e-Nota** (Betha Sistemas) a partir de uma planilha de clientes.

## Status

| Fase | Conteúdo | Estado |
|---|---|---|
| P1 | Esqueleto: manifesto, popup, registry, storage, content-script router | ✅ |
| P2 | Importação de XLSX (SheetJS) + visualizador em aba | ✅ |
| P3 | Passos 1–15 do preenchimento (cabeçalho + tomador estrangeiro) | ✅ |
| P4 | Passos 16–28 (serviço, NBS, clique na alíquota, comércio exterior) | ✅ |
| P5 | Passos 29–35 (item + PIS/COFINS) | ✅ — falta smoke-test em produção |
| P6 | Filtro no dropdown + toast injetado na página | ✅ |

## Carregar a extensão

1. Abra `chrome://extensions` no Chrome.
2. Ligue **Modo do desenvolvedor** (canto superior direito).
3. **Carregar sem compactação** → selecione esta pasta (`fly-enota-extension/`).
4. Fixe o ícone na barra de ferramentas para acesso rápido.

## Como usar

1. Faça login no Fly e-Nota e abra a tela `Cadastro de DPS / Notas Fiscais`.
2. Clique no ícone da extensão.
3. **📥 Importar XLSX** — selecione a planilha de clientes. Clientes com colunas estruturadas em branco (`Logradouro`, `Município`, `CEP`, etc.) entram marcados como `⚠ incompleto` e não podem ser aplicados — corrija a planilha e re-importe.
4. Use o campo de busca no topo do dropdown para filtrar por nome / ID / e-mail / cidade.
5. Selecione o cliente e clique **Aplicar**.
6. A popup pode fechar; um toast injetado no canto inferior direito da página mostra o progresso e o resultado.
7. Revise o formulário e clique em **Emitir** manualmente — a extensão **nunca** emite a nota sozinha.
8. **📊 Ver dados** abre uma tabela com todos os clientes importados, com pílulas de status e busca.

## Adicionando outro formulário

A arquitetura é por-formulário. Para suportar uma segunda nota:

1. Adicione uma entrada em `shared/form-registry.js` (id, title, urlMatch, requiredFields, fillerName, viewerColumns).
2. Crie `content/forms/<seu-id>.js` exportando `globalThis.FlyENotaFillers.<fillerName> = async (client) => { ... }`.
3. Acrescente o arquivo aos `content_scripts.js` em `manifest.json`.
4. Se a planilha tiver colunas diferentes, ajuste `shared/xlsx-import.js`.

A popup e o visualizador funcionam automaticamente — eles iteram sobre o registry.

## Estrutura

```
fly-enota-extension/
├── manifest.json
├── popup/        UI do popup (componente form-card por formulário)
├── viewer/       Aba "Ver dados"
├── content/      Script injetado na página + fillers por formulário
├── shared/       form-registry, storage, dom-utils, currency-map, xlsx-import
├── vendor/       SheetJS (P2)
└── icons/        Ícones do action button
```
