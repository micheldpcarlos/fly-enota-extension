// DOM helpers for filling JSF/RichFaces forms.
// JSF ignores naked `.value =` assignments — every set must dispatch a real
// `change` event (and `blur` for masked / float inputs), then we wait for
// any A4J.AJAX.Submit to settle before touching the next field.

(function () {
  const AJAX_INDICATOR_SELECTOR = 'span.ajaxProcess';
  const SETTLE_MS = 120;

  // ── In-memory log of the current run. Cleared at fill start, persisted to
  //    chrome.storage.local at fill end so the popup can render it later.
  const _log = [];
  let _runStartedAt = null;
  function log(message, level = 'info', extra = {}) {
    const entry = { ts: Date.now(), level, message, ...extra };
    _log.push(entry);
    // Mirror to devtools.
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[Fly e-Nota] ${message}`);
    return entry;
  }
  function clearLog() {
    _log.length = 0;
    _runStartedAt = Date.now();
  }
  function getLog() {
    return { startedAt: _runStartedAt, entries: _log.slice() };
  }

  // ── Visual feedback: scroll the field into view and briefly outline it so
  //    the user can see exactly which field is being touched.
  // Always scrolls (centered) — earlier "only if needed" was too conservative
  // and many fields stayed off-screen because they were "barely visible".
  function scrollIntoView(el) {
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* no-op */ }
  }
  const FLASH_STYLE_ID = 'fly-enota-flash-style';
  function ensureFlashStyle() {
    if (document.getElementById(FLASH_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = FLASH_STYLE_ID;
    style.textContent = `
      @keyframes fly-enota-flash {
        0%   { box-shadow: 0 0 0 3px rgba(99,102,241,0.85); }
        100% { box-shadow: 0 0 0 0   rgba(99,102,241,0);    }
      }
      .fly-enota-flash {
        animation: fly-enota-flash 700ms ease-out;
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }
  function flash(el) {
    ensureFlashStyle();
    el.classList.remove('fly-enota-flash');
    // Force reflow so the animation restarts on rapid sequential calls.
    void el.offsetWidth;
    el.classList.add('fly-enota-flash');
  }
  // Brings the element into view, flashes it, and pauses long enough that
  // the user actually sees what's being touched before the next step fires.
  async function focusVisually(el, settle = 180) {
    scrollIntoView(el);
    flash(el);
    await sleep(settle);
  }

  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento não encontrado: #${id}`);
    return el;
  }

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }

  async function setText(id, value, { fireBlur = false } = {}) {
    const el = $(id);
    await focusVisually(el);
    log(`setText #${id} = ${JSON.stringify(value ?? '')}`, 'info', { id, value });
    el.focus();
    el.value = value ?? '';
    fire(el, 'input');
    fire(el, 'change');
    if (fireBlur) fire(el, 'blur');
  }

  async function setSelect(id, value) {
    const el = $(id);
    await focusVisually(el);
    if (value == null) {
      log(`setSelect #${id} = (skip — null)`, 'warn');
      return;
    }
    const v = String(value);
    const has = Array.from(el.options).some((o) => o.value === v);
    if (!has) {
      throw new Error(
        `Select #${id}: valor "${v}" não encontrado nas opções (` +
          Array.from(el.options).map((o) => o.value).join(',') +
          ')'
      );
    }
    const label = Array.from(el.options).find((o) => o.value === v)?.textContent?.trim() ?? '';
    log(`setSelect #${id} = "${v}" (${label})`, 'info', { id, value: v });
    el.value = v;
    fire(el, 'change');
  }

  // Selects the <option> whose visible label ends with "(CODE)", e.g. "(AUD)".
  // e-Nota's option *values* don't reliably match the ISO-4217 numeric code
  // (AUD is value="30", not "036"), so we match on the alpha-3 code in the
  // label and read back whatever value the form uses. The parenthesized code
  // is plain ASCII, so this is also immune to the page's mojibake.
  async function setSelectByLabelCode(id, code) {
    const el = $(id);
    await focusVisually(el);
    if (code == null || String(code).trim() === '') {
      log(`setSelectByLabelCode #${id} = (skip — vazio)`, 'warn');
      return;
    }
    const wanted = String(code).trim().toUpperCase();
    const codeOf = (o) => (o.textContent.match(/\(([A-Za-z]{3})\)\s*$/)?.[1] ?? '').toUpperCase();
    const match = Array.from(el.options).find((o) => codeOf(o) === wanted);
    if (!match) {
      throw new Error(
        `Select #${id}: código "${wanted}" não encontrado nos rótulos (` +
          Array.from(el.options).map(codeOf).filter(Boolean).join(',') +
          ')'
      );
    }
    log(
      `setSelectByLabelCode #${id} = "${match.value}" (${match.textContent.trim()})`,
      'info',
      { id, value: match.value }
    );
    el.value = match.value;
    fire(el, 'change');
  }

  async function setRadio(name, value) {
    const el = document.querySelector(
      `input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`
    );
    if (!el) throw new Error(`Radio name="${name}" value="${value}" não encontrado`);
    await focusVisually(el);
    log(`setRadio name="${name}" value="${value}"`, 'info');
    el.checked = true;
    // JSF radios use onclick to fire AJAX; click() dispatches a synthetic event
    // that runs the inline handler.
    el.click();
    fire(el, 'change');
  }

  async function setCheckbox(id, checked) {
    const el = $(id);
    await focusVisually(el);
    log(`setCheckbox #${id} = ${!!checked}`, 'info');
    if (el.checked === !!checked) return;
    el.click();
    fire(el, 'change');
  }

  async function clickButton(id) {
    const el = $(id);
    await focusVisually(el);
    log(`clickButton #${id}`, 'info');
    el.click();
  }

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Resolves once the RichFaces "Carregando…" indicator has been hidden for
  // SETTLE_MS continuous milliseconds, or rejects on timeout.
  async function waitForAjaxIdle({ timeout = 15000 } = {}) {
    const indicator = document.querySelector(AJAX_INDICATOR_SELECTOR);
    if (!indicator) {
      // No indicator on the page — fall back to a small fixed delay.
      await sleep(SETTLE_MS);
      return;
    }
    const start = Date.now();
    let lastBusyAt = 0;
    while (Date.now() - start < timeout) {
      const busy = window.getComputedStyle(indicator).display !== 'none';
      if (busy) lastBusyAt = Date.now();
      else if (Date.now() - lastBusyAt >= SETTLE_MS) return;
      await sleep(40);
    }
    log(`waitForAjaxIdle: timeout após ${timeout}ms`, 'error');
    throw new Error('waitForAjaxIdle: timeout aguardando o servidor');
  }

  // Resolves when the element appears in the DOM, or null on timeout.
  async function waitForElement(selector, timeout = 5000) {
    const found = document.querySelector(selector);
    if (found) return found;
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        const el = document.querySelector(selector);
        if (!el) log(`waitForElement(${selector}): timeout`, 'warn');
        resolve(el);
      }, timeout);
    });
  }

  // Resolves when an input's value becomes a non-empty string.
  async function waitForFieldFilled(id, timeout = 5000) {
    const el = $(id);
    if (el.value && String(el.value).trim() !== '') return el.value;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (el.value && String(el.value).trim() !== '') return el.value;
      await sleep(50);
    }
    if (!el.value || String(el.value).trim() === '') {
      log(`waitForFieldFilled #${id}: timeout (campo continuou vazio)`, 'warn');
    }
    return el.value;
  }

  // pt-BR number formatting for fields like "1.234,56".
  function formatBRL(n, decimals = 2) {
    if (n == null || n === '') return '';
    const num = typeof n === 'number' ? n : Number(String(n).replace(',', '.'));
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  globalThis.FlyENotaDOM = {
    $,
    setText,
    setSelect,
    setSelectByLabelCode,
    setRadio,
    setCheckbox,
    clickButton,
    waitForAjaxIdle,
    waitForElement,
    waitForFieldFilled,
    sleep,
    formatBRL,
    log,
    clearLog,
    getLog,
  };
})();
