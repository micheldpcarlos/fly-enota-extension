// ISO-4217 alpha-3 → numeric code, matching the option values of
// mainForm:comExtTipoMoeda in the Fly e-Nota form.
// Add more entries as you encounter new currencies.

(function () {
  const CURRENCY = {
    USD: '840',
    EUR: '978',
    GBP: '826',
    BRL: '986',
    CAD: '124',
    JPY: '392',
    CNY: '156',
    AUD: '036',
    CHF: '756',
    NZD: '554',
    MXN: '484',
    ARS: '032',
    CLP: '152',
    UYU: '858',
  };

  globalThis.FlyENotaCurrency = {
    toNumeric(alpha3) {
      if (!alpha3) return null;
      return CURRENCY[String(alpha3).trim().toUpperCase()] ?? null;
    },
    knownCodes: Object.keys(CURRENCY),
  };
})();
