// Per-form dataset storage backed by chrome.storage.local.
// Used by popup, viewer. Exposed on globalThis since we load as a classic script.

(function () {
  async function getClients(formId) {
    const key = `clientes:${formId}`;
    const result = await chrome.storage.local.get(key);
    return result[key] ?? [];
  }

  async function setClients(formId, rows) {
    const key = `clientes:${formId}`;
    await chrome.storage.local.set({ [key]: rows });
  }

  async function clearClients(formId) {
    const key = `clientes:${formId}`;
    await chrome.storage.local.remove(key);
  }

  globalThis.FlyENotaStorage = { getClients, setClients, clearClients };
})();
