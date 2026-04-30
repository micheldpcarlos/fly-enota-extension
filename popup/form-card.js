// Renders one card per registered form. Generic — driven entirely by the
// form-registry entry, so adding a new form requires no changes here.

(function () {
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v != null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  function renderCard(form, host) {
    const filter = el('input', {
      id: `filter-${form.id}`,
      type: 'search',
      placeholder: 'Buscar por nome, ID, e-mail…',
    });
    const select = el('select', { id: `select-${form.id}` });
    const apply  = el('button', { class: 'btn btn-primary', type: 'button' }, 'Aplicar');
    const importBtn = el('button', { class: 'btn', type: 'button' }, '📥 Importar XLSX');
    const viewBtn   = el('button', { class: 'btn', type: 'button' }, '📊 Ver dados');
    const fileInput = el('input', { type: 'file', accept: '.xlsx', class: 'file-input' });
    const statusLeft  = el('span', { class: 'pill' }, 'Sem dados');
    const statusRight = el('span', {}, '');

    const card = el('section', { class: 'card', dataset: { formId: form.id } }, [
      el('h2', {}, form.title),
      el('div', { class: 'field' }, [
        el('label', { for: `filter-${form.id}` }, 'Cliente'),
        filter,
        select,
      ]),
      apply,
      el('div', { class: 'row' }, [importBtn, viewBtn]),
      fileInput,
      el('div', { class: 'status' }, [statusLeft, statusRight]),
    ]);

    host.appendChild(card);

    return {
      card,
      filter,
      select,
      apply,
      importBtn,
      viewBtn,
      fileInput,
      statusLeft,
      statusRight,
    };
  }

  globalThis.renderFormCard = renderCard;
})();
