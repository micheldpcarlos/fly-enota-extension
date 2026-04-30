// Reads ?form=<id> from the URL and renders that form's clientes
// from chrome.storage.local as a sortable, searchable table.

(async function () {
  const params = new URLSearchParams(location.search);
  const formId = params.get('form');
  const titleEl = document.getElementById('title');
  const countersEl = document.getElementById('counters');
  const searchEl = document.getElementById('search');
  const table = document.getElementById('data-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  const emptyEl = document.getElementById('empty');

  const form = globalThis.getFormById?.(formId);
  if (!form) {
    titleEl.textContent = `Formulário desconhecido: ${formId}`;
    return;
  }
  document.title = `${form.title} — Dados`;
  titleEl.textContent = form.title;

  const rows = await globalThis.FlyENotaStorage.getClients(form.id);

  function renderHeader() {
    const tr = document.createElement('tr');
    const statusTh = document.createElement('th');
    statusTh.className = 'col-status';
    statusTh.textContent = 'Status';
    tr.appendChild(statusTh);
    for (const col of form.viewerColumns ?? []) {
      const th = document.createElement('th');
      th.textContent = col.label;
      tr.appendChild(th);
    }
    thead.innerHTML = '';
    thead.appendChild(tr);
  }

  function fmtCell(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    }
    return String(value);
  }

  function renderBody(filtered) {
    tbody.innerHTML = '';
    if (!filtered.length) {
      emptyEl.hidden = false;
      table.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    table.hidden = false;

    for (const row of filtered) {
      const tr = document.createElement('tr');

      const statusTd = document.createElement('td');
      const pill = document.createElement('span');
      if (row._complete) {
        pill.className = 'pill ok';
        pill.textContent = '✓ completo';
      } else {
        pill.className = 'pill warn';
        pill.textContent = `⚠ faltam ${(row._missing ?? []).length}`;
        pill.title = `Faltando: ${(row._missing ?? []).join(', ')}`;
      }
      statusTd.appendChild(pill);
      tr.appendChild(statusTd);

      for (const col of form.viewerColumns ?? []) {
        const td = document.createElement('td');
        const value = fmtCell(row[col.key]);
        if (value == null) {
          td.textContent = '—';
          td.classList.add('cell-empty');
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function refreshCounters(filteredCount) {
    const total = rows.length;
    const ok = rows.filter((r) => r._complete).length;
    const warn = total - ok;
    const filterNote = filteredCount === total ? '' : ` · exibindo ${filteredCount}`;
    countersEl.innerHTML = total
      ? `${total} cliente${total === 1 ? '' : 's'} · ` +
        `<span class="ok">${ok} completo${ok === 1 ? '' : 's'}</span>` +
        (warn ? ` · <span class="warn">${warn} incompleto${warn === 1 ? '' : 's'}</span>` : '') +
        filterNote
      : 'Nenhum dado importado ainda.';
  }

  function applySearch() {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) {
      renderBody(rows);
      refreshCounters(rows.length);
      return;
    }
    const filtered = rows.filter((row) =>
      Object.values(row).some(
        (v) => v != null && String(v).toLowerCase().includes(q)
      )
    );
    renderBody(filtered);
    refreshCounters(filtered.length);
  }

  renderHeader();
  applySearch();
  searchEl.addEventListener('input', applySearch);
})();
