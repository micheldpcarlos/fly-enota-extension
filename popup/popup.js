// Wires each form card: dropdown population, Import XLSX, View Data,
// and the Apply button (sends the chosen client to the active tab's
// content script).

(async function () {
  const host = document.getElementById('cards');
  const toast = document.getElementById('toast');

  function showToast(message, kind = 'ok') {
    toast.textContent = message;
    toast.className = `toast show ${kind}`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function populateDropdown(select, rows) {
    select.innerHTML = '';
    if (!rows.length) {
      const opt = document.createElement('option');
      opt.textContent = 'Importe um XLSX para começar';
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      select.appendChild(opt);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    const placeholder = document.createElement('option');
    placeholder.textContent = '— selecione —';
    placeholder.value = '';
    select.appendChild(placeholder);
    for (const row of rows) {
      const opt = document.createElement('option');
      opt.value = row.id ?? row.razaoSocial ?? '';
      const tag = row._complete ? '' : ' ⚠ incompleto';
      opt.textContent = `${row.razaoSocial ?? '(sem nome)'}${tag}`;
      opt.dataset.complete = row._complete ? '1' : '0';
      select.appendChild(opt);
    }
  }

  function summarise(rows) {
    const total = rows.length;
    const complete = rows.filter((r) => r._complete).length;
    const incomplete = total - complete;
    return { total, complete, incomplete };
  }

  function refreshStatus(card, rows) {
    const { total, complete, incomplete } = summarise(rows);
    if (!total) {
      card.statusLeft.textContent = 'Sem dados';
      card.statusLeft.className = 'pill';
      card.statusRight.textContent = '';
      return;
    }
    card.statusLeft.textContent = `${total} cliente${total === 1 ? '' : 's'}`;
    card.statusLeft.className = `pill ${incomplete ? 'warn' : 'ok'}`;
    card.statusRight.textContent = incomplete
      ? `${complete} ok · ${incomplete} incompleto${incomplete === 1 ? '' : 's'}`
      : `${complete} ok`;
  }

  function filterRows(rows, query) {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.id, r.razaoSocial, r.email, r.telefone, r.municipio, r.estado]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  function syncApplyState(card) {
    const opt = card.select.selectedOptions[0];
    const enabled = !!opt && opt.value && opt.dataset.complete === '1';
    card.apply.disabled = !enabled;
  }

  async function refreshCard(form, card) {
    const rows = await globalThis.FlyENotaStorage.getClients(form.id);
    populateDropdown(card.select, rows);
    refreshStatus(card, rows);
    card.apply.disabled = true;
    card.select.onchange = () => syncApplyState(card);
    card.filter.oninput = () => {
      const visible = filterRows(rows, card.filter.value);
      populateDropdown(card.select, visible);
      syncApplyState(card);
    };
    return rows;
  }

  function findRow(rows, value) {
    return rows.find((r) => String(r.id ?? r.razaoSocial ?? '') === String(value));
  }

  async function onImport(form, card) {
    return new Promise((resolve) => {
      card.fileInput.value = '';
      card.fileInput.onchange = async () => {
        const file = card.fileInput.files?.[0];
        if (!file) return resolve();
        try {
          if (typeof globalThis.parseXlsx !== 'function') {
            showToast('xlsx-import.js ainda não carregado', 'danger');
            return resolve();
          }
          const { rows, summary } = await globalThis.parseXlsx(file, form);
          await globalThis.FlyENotaStorage.setClients(form.id, rows);
          await refreshCard(form, card);
          if (summary.incomplete) {
            showToast(
              `${summary.total} importados, ${summary.incomplete} incompleto${summary.incomplete === 1 ? '' : 's'} — corrija o XLSX`,
              'warn'
            );
          } else {
            showToast(`${summary.total} clientes importados`, 'ok');
          }
        } catch (err) {
          console.error(err);
          showToast(`Falha ao importar: ${err.message ?? err}`, 'danger');
        }
        resolve();
      };
      card.fileInput.click();
    });
  }

  function onView(form) {
    const url = chrome.runtime.getURL(`viewer/viewer.html?form=${encodeURIComponent(form.id)}`);
    chrome.tabs.create({ url });
  }

  async function onApply(form, card, rows) {
    const value = card.select.value;
    const client = findRow(rows, value);
    if (!client) {
      showToast('Selecione um cliente', 'warn');
      return;
    }
    if (!client._complete) {
      showToast(`Cliente incompleto: ${(client._missing ?? []).join(', ')}`, 'warn');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showToast('Não consegui identificar a aba ativa', 'danger');
      return;
    }
    if (!form.urlMatch.test(tab.url ?? '')) {
      showToast('Abra a página de Notas Fiscais do Fly e-Nota antes de aplicar', 'warn');
      return;
    }
    card.apply.disabled = true;
    showToast('Aplicando…', 'ok');
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fill',
        formId: form.id,
        client,
      });
      if (response?.ok) {
        showToast('Formulário preenchido', 'ok');
      } else {
        showToast(response?.error ?? 'Falha desconhecida', 'danger');
      }
    } catch (err) {
      showToast(`Erro: ${err.message ?? err}`, 'danger');
    } finally {
      card.apply.disabled = false;
    }
  }

  for (const form of globalThis.FlyENotaForms ?? []) {
    const card = globalThis.renderFormCard(form, host);
    let rows = await refreshCard(form, card);

    card.importBtn.addEventListener('click', async () => {
      await onImport(form, card);
      rows = await globalThis.FlyENotaStorage.getClients(form.id);
    });
    card.viewBtn.addEventListener('click', () => onView(form));
    card.apply.addEventListener('click', () => onApply(form, card, rows));
  }
})();
