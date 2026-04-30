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
    const subtitle = el('p', { class: 'card-subtitle' }, 'Selecione um cliente para preencher o formulário automaticamente.');

    // Custom dropdown: trigger button + popover panel with rich rows.
    const trigger = el('button', {
      type: 'button',
      class: 'client-trigger',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      id: `trigger-${form.id}`,
    }, [
      el('span', { class: 'trigger-content' }, [
        el('span', { class: 'trigger-placeholder' }, 'Selecione um cliente'),
      ]),
      el('span', { class: 'trigger-chevron' }, '▾'),
    ]);

    const panel = el('div', {
      class: 'client-panel',
      role: 'listbox',
      'aria-label': 'Lista de clientes',
      hidden: '',
    });

    const dropdown = el('div', { class: 'client-dropdown' }, [trigger, panel]);

    const apply = el('button', {
      class: 'btn btn-primary btn-apply',
      type: 'button',
    }, [
      el('span', { class: 'btn-label' }, 'Aplicar no formulário'),
      el('span', { class: 'btn-shortcut' }, '↵'),
    ]);

    const importBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, [
      el('span', { class: 'btn-icon' }, '📥'),
      el('span', {}, 'Importar XLSX'),
    ]);
    const viewBtn = el('button', { class: 'btn btn-ghost', type: 'button' }, [
      el('span', { class: 'btn-icon' }, '📊'),
      el('span', {}, 'Ver dados'),
    ]);
    const fileInput = el('input', { type: 'file', accept: '.xlsx', class: 'file-input' });

    const statusLeft = el('span', { class: 'pill' }, 'Sem dados');
    const statusRight = el('span', { class: 'status-detail' }, '');

    const card = el('section', { class: 'card', dataset: { formId: form.id } }, [
      el('header', { class: 'card-header' }, [
        el('div', { class: 'card-title-row' }, [
          el('h2', {}, form.title),
        ]),
        subtitle,
      ]),

      el('div', { class: 'field' }, [
        el('label', { for: `trigger-${form.id}`, class: 'field-label' }, 'Cliente'),
        dropdown,
      ]),

      apply,

      el('div', { class: 'secondary-actions' }, [importBtn, viewBtn]),
      fileInput,

      el('footer', { class: 'card-footer' }, [statusLeft, statusRight]),
    ]);

    host.appendChild(card);

    return {
      card,
      trigger,
      panel,
      apply,
      importBtn,
      viewBtn,
      fileInput,
      statusLeft,
      statusRight,
      // Selection state, set by popup.js
      selectedId: null,
    };
  }

  globalThis.renderFormCard = renderCard;
})();
