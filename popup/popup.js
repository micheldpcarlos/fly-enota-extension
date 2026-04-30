// Wires each form card and the global popup chrome (header status, logs).

(async function () {
  const host = document.getElementById('cards');
  const toast = document.getElementById('toast');
  const appStatus = document.getElementById('app-status');

  // ── Toast (popup-local) ────────────────────────────────────────────────
  function showToast(message, kind = 'ok') {
    toast.textContent = message;
    toast.className = `toast show ${kind}`;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // ── Active-tab status badge ────────────────────────────────────────────
  // True when the active tab matches a supported form URL.
  let isActive = false;
  let activeUrlHint = '';

  async function refreshAppStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url ?? '';
      const matchedForm = (globalThis.FlyENotaForms ?? []).find((f) => f.urlMatch.test(url));
      isActive = !!matchedForm;
      activeUrlHint = url;
      if (matchedForm) {
        appStatus.dataset.state = 'active';
        appStatus.querySelector('.status-label').textContent = 'Ativo';
        appStatus.title = `${matchedForm.title} — ${url}`;
      } else {
        appStatus.dataset.state = 'inactive';
        appStatus.querySelector('.status-label').textContent = 'Inativo';
        appStatus.title = url
          ? `Abra o Fly e-Nota para ativar.\nURL atual: ${url}`
          : 'Abra o Fly e-Nota para ativar.';
      }
    } catch {
      isActive = false;
      appStatus.dataset.state = 'inactive';
      appStatus.querySelector('.status-label').textContent = 'Inativo';
    }
    // Re-sync any rendered cards' Apply button.
    for (const card of host.__cards ?? []) {
      syncApplyState(card, card.__rows ?? []);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function fmtCurrency(value, code) {
    if (value == null || value === '') return '';
    const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(num)) return '';
    return `${code ? code + ' ' : ''}${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function summarise(rows) {
    const total = rows.length;
    const complete = rows.filter((r) => r._complete).length;
    return { total, complete, incomplete: total - complete };
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
      ? `${complete} completo${complete === 1 ? '' : 's'} · ${incomplete} incompleto${incomplete === 1 ? '' : 's'}`
      : 'Tudo completo';
  }

  // ── Client dropdown ────────────────────────────────────────────────────
  function rowKey(row) {
    return String(row.id ?? row.razaoSocial ?? '');
  }

  function clientMeta(row) {
    const cityState = [row.municipio, row.estado].filter(Boolean).join(', ');
    const value = fmtCurrency(row.totalMoedaEstrangeira, row.moedaCodigo);
    const parts = [];
    if (cityState) parts.push(cityState);
    if (value) parts.push(value);
    if (!row._complete) parts.push(`faltam ${(row._missing ?? []).length} campo${(row._missing ?? []).length === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }

  function displayName(row) {
    return row.razaoSocial ?? row.clientLabel ?? '(sem nome)';
  }

  function buildClientRow(row, isOption = false) {
    const wrap = document.createElement(isOption ? 'div' : 'span');
    wrap.className = `client-row ${row._complete ? 'ok' : 'warn'}`;

    const badge = document.createElement('span');
    badge.className = 'client-badge';
    badge.textContent = row._complete ? '✓' : '⚠';
    badge.title = row._complete ? 'Completo' : `Faltando: ${(row._missing ?? []).join(', ')}`;

    const main = document.createElement('span');
    main.className = 'client-main';
    const name = document.createElement('span');
    name.className = 'client-name';
    name.textContent = displayName(row);
    const meta = document.createElement('span');
    meta.className = 'client-meta';
    meta.textContent = clientMeta(row) || '—';
    main.append(name, meta);

    wrap.append(badge, main);
    return wrap;
  }

  function setTriggerContent(card, row) {
    const content = card.trigger.querySelector('.trigger-content');
    content.innerHTML = '';
    if (!row) {
      const ph = document.createElement('span');
      ph.className = 'trigger-placeholder';
      ph.textContent = 'Selecione um cliente';
      content.appendChild(ph);
    } else {
      content.appendChild(buildClientRow(row, false));
    }
  }

  function populatePanel(card, rows) {
    card.panel.innerHTML = '';
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'panel-empty';
      empty.innerHTML = '📭 Nenhum cliente importado.<br><small>Use <strong>Importar XLSX</strong>.</small>';
      card.panel.appendChild(empty);
      return;
    }
    for (const row of rows) {
      const key = rowKey(row);
      const opt = buildClientRow(row, true);
      opt.classList.add('client-option');
      if (card.selectedId === key) opt.classList.add('selected');
      opt.dataset.id = key;
      opt.setAttribute('role', 'option');
      opt.tabIndex = 0;
      opt.addEventListener('click', () => selectClient(card, rows, key));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectClient(card, rows, key);
        }
      });
      card.panel.appendChild(opt);
    }
  }

  function openPanel(card) {
    card.panel.hidden = false;
    card.trigger.setAttribute('aria-expanded', 'true');
    card.card.classList.add('dropdown-open');
  }
  function closePanel(card) {
    card.panel.hidden = true;
    card.trigger.setAttribute('aria-expanded', 'false');
    card.card.classList.remove('dropdown-open');
  }
  function togglePanel(card) {
    if (card.panel.hidden) openPanel(card);
    else closePanel(card);
  }

  function selectClient(card, rows, key) {
    card.selectedId = key;
    const row = rows.find((r) => rowKey(r) === key);
    setTriggerContent(card, row);
    // Update visual selection in the panel
    for (const opt of card.panel.querySelectorAll('.client-option')) {
      opt.classList.toggle('selected', opt.dataset.id === key);
    }
    syncApplyState(card, rows);
    closePanel(card);
  }

  function syncApplyState(card, rows) {
    const selected = rows.find((r) => rowKey(r) === card.selectedId);
    const ok = selected && selected._complete && isActive;
    card.apply.disabled = !ok;
    if (!isActive) {
      card.apply.title = 'Abra a página de Notas Fiscais do Fly e-Nota antes de aplicar.';
    } else if (selected && !selected._complete) {
      card.apply.title = `Cliente incompleto: ${(selected._missing ?? []).join(', ')}`;
    } else if (selected) {
      card.apply.title = `Aplicar dados de ${displayName(selected)} no formulário`;
    } else {
      card.apply.title = 'Selecione um cliente';
    }
  }

  async function refreshCard(form, card) {
    const rows = await globalThis.FlyENotaStorage.getClients(form.id);
    refreshStatus(card, rows);

    // Reset selection if the previously-chosen client is gone.
    if (card.selectedId && !rows.some((r) => rowKey(r) === card.selectedId)) {
      card.selectedId = null;
    }
    setTriggerContent(card, rows.find((r) => rowKey(r) === card.selectedId) ?? null);
    populatePanel(card, rows);
    card.__rows = rows; // for refreshAppStatus re-sync
    syncApplyState(card, rows);

    // Wiring: trigger toggles the panel.
    card.trigger.onclick = (e) => {
      e.stopPropagation();
      togglePanel(card);
    };
    return rows;
  }

  // ── Actions ────────────────────────────────────────────────────────────
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
              `${summary.total} importados, ${summary.incomplete} incompleto${summary.incomplete === 1 ? '' : 's'}`,
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
    if (!isActive) {
      showToast('Inativo: abra a página do Fly e-Nota e tente novamente', 'warn');
      return;
    }
    const client = rows.find((r) => rowKey(r) === card.selectedId);
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
    card.apply.classList.add('is-loading');
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
      card.apply.classList.remove('is-loading');
    }
  }

  // ── Logs panel ─────────────────────────────────────────────────────────
  const logsToggle = document.getElementById('logs-toggle');
  const logsBody = document.getElementById('logs-body');
  const logsMeta = document.getElementById('logs-meta');
  const logsContent = document.getElementById('logs-content');
  const logsCopy = document.getElementById('logs-copy');
  const logsRefresh = document.getElementById('logs-refresh');
  const logsClear = document.getElementById('logs-clear');

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour12: false }) +
      '.' + String(d.getMilliseconds()).padStart(3, '0');
  }
  function fmtRelative(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'agora há pouco';
    if (diff < 3600_000) return `há ${Math.floor(diff / 60_000)}min`;
    if (diff < 86_400_000) return `há ${Math.floor(diff / 3600_000)}h`;
    return new Date(ts).toLocaleString('pt-BR');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function renderLogs(run) {
    if (!run || !run.entries?.length) {
      logsMeta.textContent = 'Nenhum registro ainda';
      logsMeta.dataset.state = 'idle';
      logsContent.textContent = 'Rode "Aplicar" para gerar logs.';
      return;
    }
    const dur = run.finishedAt && run.startedAt
      ? `${((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s`
      : '?';
    const stepCount = run.entries.filter((e) => /^▶ Passo/.test(e.message)).length;
    const status = run.ok ? '✓' : '✗';
    logsMeta.dataset.state = run.ok ? 'ok' : 'error';
    logsMeta.textContent = `${status} ${stepCount} passo${stepCount === 1 ? '' : 's'} · ${dur} · ${fmtRelative(run.finishedAt)}`;

    const html = run.entries.map((e) => {
      const isStep = /^▶ Passo/.test(e.message);
      const lvl = isStep ? 'step' : (e.level || 'info');
      const ts = fmtTime(e.ts);
      return `<span class="ts">[${ts}]</span> <span class="lvl-${lvl}">${escapeHtml(e.message)}</span>`;
    }).join('\n');
    logsContent.innerHTML = html;
  }
  async function loadLogs() {
    const { lastRun } = await chrome.storage.local.get('lastRun');
    renderLogs(lastRun);
    return lastRun;
  }
  logsToggle.addEventListener('click', async () => {
    const open = logsBody.hidden;
    logsBody.hidden = !open;
    logsToggle.setAttribute('aria-expanded', String(open));
    if (open) await loadLogs();
  });
  logsCopy.addEventListener('click', async () => {
    const { lastRun } = await chrome.storage.local.get('lastRun');
    if (!lastRun?.entries?.length) {
      showToast('Sem logs para copiar', 'warn');
      return;
    }
    const text = lastRun.entries
      .map((e) => `[${fmtTime(e.ts)}] [${(e.level || 'info').toUpperCase()}] ${e.message}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    showToast('Logs copiados', 'ok');
  });
  logsRefresh.addEventListener('click', loadLogs);
  logsClear.addEventListener('click', async () => {
    await chrome.storage.local.remove('lastRun');
    renderLogs(null);
    showToast('Logs limpos', 'ok');
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.lastRun) return;
    renderLogs(changes.lastRun.newValue);
  });

  // ── Boot ───────────────────────────────────────────────────────────────
  await refreshAppStatus();
  await loadLogs();

  host.__cards = [];
  for (const form of globalThis.FlyENotaForms ?? []) {
    const card = globalThis.renderFormCard(form, host);
    host.__cards.push(card);
    let rows = await refreshCard(form, card);

    card.importBtn.addEventListener('click', async () => {
      await onImport(form, card);
      rows = await globalThis.FlyENotaStorage.getClients(form.id);
    });
    card.viewBtn.addEventListener('click', () => onView(form));
    card.apply.addEventListener('click', () => onApply(form, card, rows));
  }
  // Re-sync now that cards exist (refreshAppStatus runs at boot before they do).
  await refreshAppStatus();

  // Enter shortcut from anywhere fires Apply on the (single) form card.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const panel of document.querySelectorAll('.client-panel:not([hidden])')) {
        panel.hidden = true;
        panel.previousElementSibling?.setAttribute('aria-expanded', 'false');
        panel.parentElement?.parentElement?.classList.remove('dropdown-open');
      }
      return;
    }
    if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
    const firstApply = document.querySelector('.btn-apply:not(:disabled)');
    if (firstApply) firstApply.click();
  });

  // Click outside any open dropdown closes it.
  document.addEventListener('click', (e) => {
    for (const panel of document.querySelectorAll('.client-panel:not([hidden])')) {
      const dropdown = panel.parentElement; // .client-dropdown
      if (!dropdown.contains(e.target)) {
        panel.hidden = true;
        panel.previousElementSibling?.setAttribute('aria-expanded', 'false');
        dropdown.parentElement?.parentElement?.classList.remove('dropdown-open');
      }
    }
  });
})();
