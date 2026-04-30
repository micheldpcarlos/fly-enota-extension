// DOM helpers for filling JSF/RichFaces forms.
// JSF ignores naked `.value =` assignments — every set must dispatch a real
// `change` event (and `blur` for masked / float inputs), then we wait for
// any A4J.AJAX.Submit to settle before touching the next field.

(function () {
  const AJAX_INDICATOR_SELECTOR = 'span.ajaxProcess';
  const SETTLE_MS = 120;

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
    el.focus();
    el.value = value ?? '';
    fire(el, 'input');
    fire(el, 'change');
    if (fireBlur) fire(el, 'blur');
  }

  async function setSelect(id, value) {
    const el = $(id);
    if (value == null) return;
    const v = String(value);
    const has = Array.from(el.options).some((o) => o.value === v);
    if (!has) {
      throw new Error(
        `Select #${id}: valor "${v}" não encontrado nas opções (` +
          Array.from(el.options).map((o) => o.value).join(',') +
          ')'
      );
    }
    el.value = v;
    fire(el, 'change');
  }

  async function setRadio(name, value) {
    const el = document.querySelector(
      `input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(String(value))}"]`
    );
    if (!el) throw new Error(`Radio name="${name}" value="${value}" não encontrado`);
    el.checked = true;
    // JSF radios use onclick to fire AJAX; click() dispatches a synthetic event
    // that runs the inline handler.
    el.click();
    fire(el, 'change');
  }

  async function setCheckbox(id, checked) {
    const el = $(id);
    if (el.checked === !!checked) return;
    el.click();
    fire(el, 'change');
  }

  async function clickButton(id) {
    $(id).click();
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
        resolve(document.querySelector(selector));
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
    setRadio,
    setCheckbox,
    clickButton,
    waitForAjaxIdle,
    waitForElement,
    waitForFieldFilled,
    sleep,
    formatBRL,
  };
})();
