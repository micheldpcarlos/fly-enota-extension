// Registry of forms supported by the extension.
// Adding a new form = append an entry, add content/forms/<id>.js, and (optionally)
// extend xlsx-import.js with a column map. The popup and viewer are generic.
//
// Loaded as a classic script in both popup and content-script contexts, so we attach
// to globalThis instead of using ES module exports.

(function () {
  const FORMS = [
    {
      id: 'flyenota-exportacao',
      title: 'Fly e-Nota — Exportação de Serviços',
      // Matches the production portal AND the Betha test environment
      // (`/e-nota-test/` instead of `/e-nota/`).
      urlMatch: /e-gov\.betha\.com\.br\/e-nota(?:-test)?\/contribuinte\/cad_dpsnotasfiscais\.faces/,
      storageKey: 'clientes:flyenota-exportacao',
      requiredFields: [
        'razaoSocial',
        'telefone',
        'logradouro',
        'numero',
        'estado',
        'municipio',
        'cep',
        'moedaCodigo',
        'totalMoedaEstrangeira',
        'totalBRL',
      ],
      optionalFields: ['email', 'complemento'],
      // The filler module attaches itself to window.FlyENotaFillers[fillerName]
      fillerName: 'flyenotaExportacao',
      // Columns shown in the viewer table (in order).
      viewerColumns: [
        { key: 'id',                    label: 'ID' },
        { key: 'razaoSocial',           label: 'Razão Social' },
        { key: 'telefone',              label: 'Telefone' },
        { key: 'email',                 label: 'E-mail' },
        { key: 'logradouro',            label: 'Logradouro' },
        { key: 'numero',                label: 'Número' },
        { key: 'complemento',           label: 'Complemento' },
        { key: 'municipio',             label: 'Município' },
        { key: 'estado',                label: 'Estado' },
        { key: 'cep',                   label: 'CEP' },
        { key: 'paisCodigo',            label: 'País' },
        { key: 'moedaCodigo',           label: 'Moeda' },
        { key: 'totalMoedaEstrangeira', label: 'Valor (estr.)' },
        { key: 'totalBRL',              label: 'Total BRL' },
      ],
    },
  ];

  globalThis.FlyENotaForms = FORMS;
  globalThis.getFormById = (id) => FORMS.find((f) => f.id === id);
})();
