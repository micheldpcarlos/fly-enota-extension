// Router: receives messages from the popup and dispatches to the right
// per-form filler based on the current URL. Also shows an on-page toast so
// the user sees progress/results even after the popup closes.

(function () {
  function findFormForUrl(url) {
    const forms = globalThis.FlyENotaForms ?? [];
    return forms.find((f) => f.urlMatch.test(url));
  }

  // ── On-page toast ─────────────────────────────────────────────────────────
  let toastEl = null;
  function ensureToast() {
    if (toastEl && document.body.contains(toastEl)) return toastEl;
    toastEl = document.createElement('div');
    Object.assign(toastEl.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '2147483647',
      background: '#0b1224',
      color: '#f1f5f9',
      border: '1px solid #334155',
      padding: '10px 16px',
      borderRadius: '999px',
      fontFamily: '-apple-system, "Segoe UI", system-ui, sans-serif',
      fontSize: '13px',
      maxWidth: '320px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      transition: 'opacity 0.2s, transform 0.2s',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(20px)',
    });
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function showToast(message, kind = 'info') {
    const el = ensureToast();
    const colors = { info: '#334155', ok: '#22c55e', warn: '#f59e0b', danger: '#ef4444' };
    el.style.borderColor = colors[kind] ?? colors.info;
    el.textContent = message;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    clearTimeout(showToast._t);
    if (kind !== 'info') {
      showToast._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
      }, 4000);
    }
  }

  // ── Persist the in-memory log of the current run so the popup can read it.
  //    Overwritten on every run; no history kept.
  async function persistRunLogs(meta) {
    try {
      const D = globalThis.FlyENotaDOM;
      const log = D?.getLog?.() ?? { startedAt: Date.now(), entries: [] };
      await chrome.storage.local.set({
        lastRun: {
          ...meta,
          startedAt: log.startedAt,
          finishedAt: Date.now(),
          entries: log.entries,
          url: location.href,
        },
      });
    } catch (e) {
      console.warn('[Fly e-Nota] failed to persist run logs', e);
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg?.action === 'ping') {
          sendResponse({ ok: true, url: location.href });
          return;
        }
        if (msg?.action !== 'fill') {
          sendResponse({ ok: false, error: `Ação desconhecida: ${msg?.action}` });
          return;
        }
        const form = findFormForUrl(location.href);
        if (!form) {
          sendResponse({ ok: false, error: 'Esta aba não corresponde a nenhum formulário suportado.' });
          return;
        }
        if (form.id !== msg.formId) {
          sendResponse({
            ok: false,
            error: `Aba aberta no formulário "${form.id}", mas a popup pediu "${msg.formId}".`,
          });
          return;
        }
        const filler = globalThis.FlyENotaFillers?.[form.fillerName];
        if (typeof filler !== 'function') {
          sendResponse({ ok: false, error: `Filler "${form.fillerName}" não registrado.` });
          return;
        }
        const D = globalThis.FlyENotaDOM;
        D?.clearLog?.();
        D?.log?.(`Iniciando: ${msg.client?.razaoSocial ?? '(sem nome)'}`);
        showToast(`Preenchendo: ${msg.client?.razaoSocial ?? '...'}`, 'info');
        try {
          const result = await filler(msg.client);
          D?.log?.(`Concluído: ${result?.completedThrough ?? '?'} passos`, 'info');
          showToast(
            `✓ Formulário preenchido (${result?.completedThrough ?? '?'} passos). Revise e clique em Emitir.`,
            'ok'
          );
          await persistRunLogs({ ok: true, completedThrough: result?.completedThrough, client: msg.client });
          sendResponse({ ok: true, result });
        } catch (err) {
          const message = err?.message ?? String(err);
          console.error('[Fly e-Nota] fill error', err);
          D?.log?.(`Erro: ${message}`, 'error');
          showToast(`Erro: ${message}`, 'danger');
          await persistRunLogs({ ok: false, error: message, client: msg.client });
          sendResponse({ ok: false, error: message });
        }
      } catch (err) {
        // Outer catch covers anything thrown before we even reached the filler.
        const message = err?.message ?? String(err);
        console.error('[Fly e-Nota] router error', err);
        showToast(`Erro: ${message}`, 'danger');
        sendResponse({ ok: false, error: message });
      }
    })();
    return true; // keep the message channel open for the async response
  });
})();
