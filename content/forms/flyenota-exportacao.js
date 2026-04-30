// Filler for the form "Fly e-Nota — Exportação de Serviços".
// Step numbering matches the user's spec; static values are inlined.

(function () {
  globalThis.FlyENotaFillers = globalThis.FlyENotaFillers ?? {};

  const STATIC = Object.freeze({
    naturezaOperacao: '8',          // Exportação
    tomadorTipo: 'E',               // Tomador Estrangeiro
    motivoNif: '0',                 // 0 - Não informado na nota de origem
    paisCodigo: '62',               // Estados Unidos
    regimeTributacao: '0',          // Nenhum
    listaServicos: '07.03.01',
    nbs: '1.1409.90.00',
    modoPrestacao: '1',             // Transfronteiriço
    vinculoPartes: '0',             // Sem vínculo
    mecanismoApoio: '01',           // Nenhum
    movTempBens: '1',               // Não
    discriminacao: 'Serviços de desenho técnico em CAD',
    quantidade: '1,0000',
    descCondicionado: '0,00',
    descIncondicionado: '0,00',
    cstPisCofins: '08',             // 08 - Operação sem incidência da Contribuição
  });

  function requireField(client, key) {
    const v = client?.[key];
    if (v == null || v === '') {
      throw new Error(`Cliente sem campo obrigatório: ${key}`);
    }
    return v;
  }

  globalThis.FlyENotaFillers.flyenotaExportacao = async function fill(client) {
    const D = globalThis.FlyENotaDOM;
    if (!D) throw new Error('dom-utils não carregado');
    if (!client) throw new Error('Cliente não informado');

    // ── 1) Click Novo, wait for the empty form. ────────────────────────────
    await D.clickButton('mainForm:btCreate');
    await D.waitForAjaxIdle();
    await D.waitForElement('#mainForm\\:naturezaOperacao', 5000);

    // ── 2) Natureza da Operação → Exportação. ──────────────────────────────
    await D.setSelect('mainForm:naturezaOperacao', STATIC.naturezaOperacao);
    await D.waitForAjaxIdle();

    // ── 3) Tomador → Estrangeiro (re-renders the tomador panel). ───────────
    await D.setRadio('mainForm:tipoTomador', STATIC.tomadorTipo);
    await D.waitForAjaxIdle();
    await D.waitForElement('#mainForm\\:nomeEstrangeiro', 5000);

    // ── 4) NIF: leave blank.  ── 5) Motivo NIF → 0. ────────────────────────
    await D.setSelect('mainForm:tomadorCodNaoNifSelect', STATIC.motivoNif);

    // ── 6–14) Foreign tomador identity + address. ──────────────────────────
    await D.setText('mainForm:telefoneE',          requireField(client, 'telefone'));
    await D.setText('mainForm:nomeEstrangeiro',    requireField(client, 'razaoSocial'));
    await D.setText('mainForm:emailEstrangeiro',   client.email ?? '');
    await D.setText('mainForm:enderecoTomadorE',   requireField(client, 'logradouro'));
    await D.setText('mainForm:numeroTomadorE',     requireField(client, 'numero'));
    await D.setText('mainForm:complementoTomadorE', client.complemento ?? '');
    await D.setText('mainForm:bairroTomadorE',     requireField(client, 'estado'));      // page label "Estado"
    await D.setText('mainForm:municipioTomadorE',  requireField(client, 'municipio'));
    await D.setText('mainForm:cepTE',              requireField(client, 'cep'));

    // ── 15) País → 62 (server populates `nomePaisTomador`). ────────────────
    await D.setText('mainForm:iPaisesTomador', STATIC.paisCodigo, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:nomePaisTomador', 5000);

    // ── 16) Regime especial de tributação → Nenhum. ────────────────────────
    await D.setSelect('mainForm:prestadorRegEspTrib', STATIC.regimeTributacao);
    await D.waitForAjaxIdle();

    // ── 17) Serviço (Lista de Serviços LC 116) → 07.03.01. ─────────────────
    await D.setText('mainForm:iListaServicos', STATIC.listaServicos, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:descricaoLista', 5000);

    // ── 18) NBS → 1.1409.90.00. ────────────────────────────────────────────
    await D.setText('mainForm:iNbs', STATIC.nbs, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:descricaoNbs', 5000);

    // ── 19) Alíquota — click the first row of the LC 155/2016 table. ───────
    await clickFirstAliquotaRow(D);

    // ── 20) País (Prestado no país) → 62. ──────────────────────────────────
    await D.setText('mainForm:iPaisesS', STATIC.paisCodigo, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:nomePaisS', 5000);

    // ── 21) Modo de Prestação → 1 (Transfronteiriço). ──────────────────────
    await D.setSelect('mainForm:modoPrestacaoComex', STATIC.modoPrestacao);

    // ── 22) Vínculo entre as partes → 0 (Sem vínculo). ─────────────────────
    await D.setSelect('mainForm:comExtVincPartes', STATIC.vinculoPartes);

    // ── 23) Valor em moeda estrangeira. ────────────────────────────────────
    const valorEstrangeiro = requireField(client, 'totalMoedaEstrangeira');
    await D.setText(
      'mainForm:comExtVlrServicoMoeda',
      D.formatBRL(valorEstrangeiro),
      { fireBlur: true }
    );
    await D.waitForAjaxIdle();

    // ── 24) Código da moeda da transação (USD → 840, etc.). ────────────────
    const moedaCodigo = requireField(client, 'moedaCodigo');
    const moedaNumeric = globalThis.FlyENotaCurrency?.toNumeric(moedaCodigo);
    if (!moedaNumeric) {
      throw new Error(
        `Moeda "${moedaCodigo}" não mapeada — adicione em shared/currency-map.js`
      );
    }
    await D.setSelect('mainForm:comExtTipoMoeda', moedaNumeric);

    // ── 25) Mecanismo de apoio - Prestador → 01 (Nenhum). ──────────────────
    await D.setSelect('mainForm:comExtMecAfComexP', STATIC.mecanismoApoio);

    // ── 26) Vínculo à movimentação temporária → 1 (Não). ───────────────────
    await D.setSelect('mainForm:comExtMovTempBens', STATIC.movTempBens);

    // ── 27) Nº DI: blank.   28) Nº RE: blank. ──────────────────────────────

    // ── 29) Discriminação do serviço. ──────────────────────────────────────
    await D.setText('mainForm:discriminacao', STATIC.discriminacao);

    // ── 30) Valor do serviço (unit price; quantity is 1, so unit = total BRL).
    const totalBRL = requireField(client, 'totalBRL');
    await D.setText(
      'mainForm:valorUnitario',
      D.formatBRL(totalBRL),
      { fireBlur: true }
    );
    await D.waitForAjaxIdle();

    // ── 31) Quantidade → 1. ────────────────────────────────────────────────
    await D.setText('mainForm:quantidade', STATIC.quantidade, { fireBlur: true });
    await D.waitForAjaxIdle();

    // ── 32) Desc. condicionado → 0. ────────────────────────────────────────
    await D.setText('mainForm:descCondicionado', STATIC.descCondicionado, { fireBlur: true });

    // ── 33) Desc. incondicionado → 0. ──────────────────────────────────────
    await D.setText('mainForm:descIncondicionado', STATIC.descIncondicionado, { fireBlur: true });
    await D.waitForAjaxIdle();

    // ── 34) É dedução por valor → Sim (checkbox, normally already checked).
    await D.setCheckbox('mainForm:tipoDeducao', true);
    await D.waitForAjaxIdle();

    // ── 35) Situação Tributária PIS/COFINS → 08. ───────────────────────────
    await D.setSelect('mainForm:cst', STATIC.cstPisCofins);
    await D.waitForAjaxIdle();

    return { ok: true, completedThrough: 35 };
  };

  // Wait for the LC 155/2016 alíquota table, then click the first row's icon
  // (the column-1 link with the bt_set.gif icon). The full id has a JSF-
  // generated `j_id_jsp_…` suffix that drifts across deploys, so we select
  // structurally instead.
  async function clickFirstAliquotaRow(D) {
    const tableSelector = '#mainForm\\:t-aliquotaSimplesNacional2018';
    const table = await D.waitForElement(tableSelector, 5000);
    if (!table) {
      // Not a Simples Nacional taxpayer — alíquota is determined elsewhere.
      return;
    }
    const link =
      table.querySelector('tbody tr:first-child a[id*=":0:"][onclick*="A4J.AJAX.Submit"]') ||
      table.querySelector('tbody tr:first-child a:has(img[src*="bt_set"])') ||
      table.querySelector('tbody tr:first-child a');
    if (!link) {
      throw new Error('Alíquota: linha 1 não encontrada na tabela LC 155/2016');
    }
    link.click();
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:aliquota', 5000);
  }
})();
