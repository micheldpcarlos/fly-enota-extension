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
    mecanismoApoio: '01',           // Nenhum (Prestador)
    mecanismoApoioTomador: '01',    // Nenhum (Tomador) — fallback se XLSX vazio
    compartilharMdic: '0',          // 0 - Não enviar para o MDIC — fallback se XLSX vazio
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

    let stepNo = 0;
    const step = (label) => { stepNo += 1; D.log(`▶ Passo ${stepNo}: ${label}`, 'info', { step: stepNo }); };

    // ── 1) Click Novo, wait for the empty form. ────────────────────────────
    step('Clicar Novo');
    await D.clickButton('mainForm:btCreate');
    await D.waitForAjaxIdle();
    await D.waitForElement('#mainForm\\:naturezaOperacao', 5000);

    // ── 2) Natureza da Operação → Exportação. ──────────────────────────────
    step('Natureza da Operação → Exportação');
    await D.setSelect('mainForm:naturezaOperacao', STATIC.naturezaOperacao);
    await D.waitForAjaxIdle();

    // ── 3) Tomador → Estrangeiro (re-renders the tomador panel). ───────────
    step('Tomador → Estrangeiro');
    await D.setRadio('mainForm:tipoTomador', STATIC.tomadorTipo);
    await D.waitForAjaxIdle();
    await D.waitForElement('#mainForm\\:nomeEstrangeiro', 5000);

    // ── 4) Motivo NIF → 0 (NIF itself stays blank).  ───────────────────────
    step('Motivo NIF → 0');
    await D.setSelect('mainForm:tomadorCodNaoNifSelect', STATIC.motivoNif);

    // ── 5–13) Foreign tomador identity + address. ──────────────────────────
    step('Telefone');     await D.setText('mainForm:telefoneE',           requireField(client, 'telefone'));
    step('Razão social'); await D.setText('mainForm:nomeEstrangeiro',     requireField(client, 'razaoSocial'));
    step('E-mail');       await D.setText('mainForm:emailEstrangeiro',    client.email ?? '');
    step('Logradouro');   await D.setText('mainForm:enderecoTomadorE',    requireField(client, 'logradouro'));
    step('Número');       await D.setText('mainForm:numeroTomadorE',      requireField(client, 'numero'));
    step('Complemento'); await D.setText('mainForm:complementoTomadorE', client.complemento ?? '');
    step('Estado');      await D.setText('mainForm:bairroTomadorE',      requireField(client, 'estado')); // page label "Estado"
    step('Município');   await D.setText('mainForm:municipioTomadorE',   requireField(client, 'municipio'));
    step('CEP');         await D.setText('mainForm:cepTE',               requireField(client, 'cep'));

    // ── 14) País → 62 (server populates `nomePaisTomador`). ────────────────
    step(`País → ${STATIC.paisCodigo}`);
    await D.setText('mainForm:iPaisesTomador', STATIC.paisCodigo, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:nomePaisTomador', 5000);

    // ── 15) Regime especial de tributação → Nenhum. ────────────────────────
    step('Regime especial → Nenhum');
    await D.setSelect('mainForm:prestadorRegEspTrib', STATIC.regimeTributacao);
    await D.waitForAjaxIdle();

    // ── 16) Serviço (Lista de Serviços LC 116) → 07.03.01. ─────────────────
    step(`Serviço → ${STATIC.listaServicos}`);
    await D.setText('mainForm:iListaServicos', STATIC.listaServicos, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:descricaoLista', 5000);

    // ── 17) NBS → 1.1409.90.00. ────────────────────────────────────────────
    step(`NBS → ${STATIC.nbs}`);
    await D.setText('mainForm:iNbs', STATIC.nbs, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:descricaoNbs', 5000);

    // ── 18) Alíquota — click the first row of the LC 155/2016 table. ───────
    step('Alíquota — clicar primeira linha LC 155/2016');
    await clickFirstAliquotaRow(D);

    // ── 19) País (Prestado no país) → 62. ──────────────────────────────────
    step(`País prestado → ${STATIC.paisCodigo}`);
    await D.setText('mainForm:iPaisesS', STATIC.paisCodigo, { fireBlur: true });
    await D.waitForAjaxIdle();
    await D.waitForFieldFilled('mainForm:nomePaisS', 5000);

    // ── 20) Modo de Prestação → 1 (Transfronteiriço). ──────────────────────
    step('Modo de Prestação → 1 (Transfronteiriço)');
    await D.setSelect('mainForm:modoPrestacaoComex', STATIC.modoPrestacao);

    // ── 21) Vínculo entre as partes → 0 (Sem vínculo). ─────────────────────
    step('Vínculo partes → 0 (Sem vínculo)');
    await D.setSelect('mainForm:comExtVincPartes', STATIC.vinculoPartes);

    // ── 22) Valor em moeda estrangeira. ────────────────────────────────────
    const valorEstrangeiro = requireField(client, 'totalMoedaEstrangeira');
    step(`Valor moeda estrangeira → ${valorEstrangeiro}`);
    await D.setText(
      'mainForm:comExtVlrServicoMoeda',
      D.formatBRL(valorEstrangeiro),
      { fireBlur: true }
    );
    await D.waitForAjaxIdle();

    // ── 23) Código da moeda da transação. Casamos pelo código alfa-3 do
    //    rótulo (ex.: "(AUD)"), e não pelo value numérico: os values do e-Nota
    //    não seguem o ISO-4217 (AUD é value="30", não "036").
    const moedaCodigo = requireField(client, 'moedaCodigo');
    step(`Código moeda → ${moedaCodigo}`);
    await D.setSelectByLabelCode('mainForm:comExtTipoMoeda', moedaCodigo);

    // ── 24) Mecanismo de apoio - Prestador → 01 (Nenhum). ──────────────────
    step('Mecanismo apoio Prestador → 01 (Nenhum)');
    await D.setSelect('mainForm:comExtMecAfComexP', STATIC.mecanismoApoio);

    // ── 25) Mecanismo de apoio - Tomador (vem do XLSX, fallback 01). ───────
    const mecApoioTomador = client.mecanismoApoioTomador ?? STATIC.mecanismoApoioTomador;
    step(`Mecanismo apoio Tomador → ${mecApoioTomador}`);
    await D.setSelect('mainForm:comExtMecAfComexT', mecApoioTomador);

    // ── 26) Compartilhar com MDIC (vem do XLSX, fallback 0). ───────────────
    const mdic = client.compartilharMdic ?? STATIC.compartilharMdic;
    step(`Compartilhar com MDIC → ${mdic}`);
    await D.setSelect('mainForm:comExtMdic', mdic);

    // ── 27) Vínculo à movimentação temporária → 1 (Não). ───────────────────
    step('Vínculo mov. temporária → 1 (Não)');
    await D.setSelect('mainForm:comExtMovTempBens', STATIC.movTempBens);

    // Nº DI / Nº RE: deixar em branco.

    // ── 28) Discriminação do serviço. ──────────────────────────────────────
    step('Discriminação');
    await D.setText('mainForm:discriminacao', STATIC.discriminacao);

    // ── 29) Valor do serviço (unit price; quantity is 1, so unit = total BRL).
    const totalBRL = requireField(client, 'totalBRL');
    step(`Valor do serviço → ${totalBRL}`);
    await D.setText(
      'mainForm:valorUnitario',
      D.formatBRL(totalBRL),
      { fireBlur: true }
    );
    await D.waitForAjaxIdle();

    // ── 30) Quantidade → 1. ────────────────────────────────────────────────
    step('Quantidade → 1');
    await D.setText('mainForm:quantidade', STATIC.quantidade, { fireBlur: true });
    await D.waitForAjaxIdle();

    // ── 31) Desc. condicionado → 0. ────────────────────────────────────────
    step('Desc. condicionado → 0');
    await D.setText('mainForm:descCondicionado', STATIC.descCondicionado, { fireBlur: true });

    // ── 32) Desc. incondicionado → 0. ──────────────────────────────────────
    step('Desc. incondicionado → 0');
    await D.setText('mainForm:descIncondicionado', STATIC.descIncondicionado, { fireBlur: true });
    await D.waitForAjaxIdle();

    // ── 33) É dedução por valor → Sim (checkbox, normally already checked).
    step('Dedução por valor → Sim');
    await D.setCheckbox('mainForm:tipoDeducao', true);
    await D.waitForAjaxIdle();

    // ── 34) Situação Tributária PIS/COFINS → 08. ───────────────────────────
    step(`PIS/COFINS → ${STATIC.cstPisCofins}`);
    await D.setSelect('mainForm:cst', STATIC.cstPisCofins);
    await D.waitForAjaxIdle();

    return { ok: true, completedThrough: stepNo };
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
