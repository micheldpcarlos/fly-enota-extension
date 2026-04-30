// XLSX → normalized JSON for the popup.
// Uses SheetJS (window.XLSX) bundled in vendor/.
// Headers are matched after normalization (lowercase, strip accents, collapse whitespace,
// drop trailing punctuation), so small spreadsheet edits don't break the import.

(function () {
  // Map normalized header → JSON field name. Update here to support new columns.
  const HEADER_MAP = {
    'id':                                       'id',
    'nome razao social':                        'razaoSocial',
    'telefone':                                 'telefone',
    'e mail':                                   'email',
    'email':                                    'email',
    'logradouro':                               'logradouro',
    'numero':                                   'numero',
    'complemento':                              'complemento',
    'estado':                                   'estado',
    'municipio':                                'municipio',
    'codigo postal':                            'cep',
    'pais':                                     'paisCodigo',
    'currency':                                 'moedaCodigo',
    'total':                                    'totalMoedaEstrangeira',
    'total brl':                                'totalBRL',
    'valor em moeda estrangeira':               'totalMoedaEstrangeiraSheet',
    'valor do servico':                         'valorServicoSheet',
  };

  function normaliseHeader(h) {
    if (h == null) return '';
    return String(h)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')                        // non-alnum → spaces
      .trim()
      .replace(/\s+/g, ' ');
  }

  function digitsOnly(v) {
    if (v == null || v === '') return '';
    return String(v).replace(/\D+/g, '');
  }

  function toNumber(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    // pt-BR style "1.234,56" → 1234.56
    const s = String(v).trim().replace(/\s+/g, '');
    if (/^[\d.]+,\d+$/.test(s)) {
      return Number(s.replace(/\./g, '').replace(',', '.'));
    }
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (/,\d+$/.test(s)) return Number(s.replace(',', '.'));
    return Number.isFinite(Number(s)) ? Number(s) : null;
  }

  function trimOrNull(v) {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }

  function buildRow(rawRow) {
    const out = {};
    for (const [normHeader, value] of Object.entries(rawRow)) {
      const field = HEADER_MAP[normHeader];
      if (!field) continue;
      out[field] = value;
    }

    // Specific cleanup per field.
    return {
      id:                    trimOrNull(out.id) ?? '',
      razaoSocial:           trimOrNull(out.razaoSocial),
      telefone:              digitsOnly(out.telefone),
      email:                 trimOrNull(out.email),
      logradouro:            trimOrNull(out.logradouro),
      numero:                trimOrNull(out.numero),
      complemento:           trimOrNull(out.complemento),
      estado:                trimOrNull(out.estado),
      municipio:             trimOrNull(out.municipio),
      cep:                   digitsOnly(out.cep) || trimOrNull(out.cep),
      paisCodigo:            trimOrNull(out.paisCodigo) ?? '62',
      moedaCodigo:           trimOrNull(out.moedaCodigo)?.toUpperCase() ?? null,
      totalMoedaEstrangeira: toNumber(out.totalMoedaEstrangeira ?? out.totalMoedaEstrangeiraSheet),
      totalBRL:              toNumber(out.totalBRL ?? out.valorServicoSheet),
    };
  }

  function isEmpty(v) {
    return v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v));
  }

  function validate(row, requiredFields) {
    const missing = requiredFields.filter((f) => isEmpty(row[f]));
    return { _complete: missing.length === 0, _missing: missing };
  }

  async function readWorkbook(file) {
    const buf = await file.arrayBuffer();
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) não carregou — verifique vendor/xlsx.full.min.js');
    }
    return XLSX.read(buf, { type: 'array' });
  }

  function rowsFromSheet(ws) {
    // Get a normalized-header object per row.
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
    if (!aoa.length) return [];
    const rawHeaders = aoa[0];
    const normHeaders = rawHeaders.map(normaliseHeader);
    const rows = [];
    for (let i = 1; i < aoa.length; i++) {
      const rawRow = aoa[i];
      // Skip rows that are entirely null/empty.
      if (rawRow.every((c) => c == null || String(c).trim() === '')) continue;
      const obj = {};
      for (let j = 0; j < normHeaders.length; j++) {
        const k = normHeaders[j];
        if (!k) continue;
        obj[k] = rawRow[j];
      }
      rows.push(obj);
    }
    return rows;
  }

  globalThis.parseXlsx = async function parseXlsx(file, form) {
    const wb = await readWorkbook(file);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error('Planilha vazia ou sem abas legíveis.');
    const raw = rowsFromSheet(ws);
    const rows = raw.map(buildRow).map((r) => Object.assign(r, validate(r, form.requiredFields)));
    const summary = {
      total: rows.length,
      complete: rows.filter((r) => r._complete).length,
      incomplete: rows.filter((r) => !r._complete).length,
    };
    return { rows, summary };
  };
})();
