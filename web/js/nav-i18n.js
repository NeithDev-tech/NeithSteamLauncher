(() => {
  'use strict';
  // Compatibility shim only. V15 has one global language engine: js/i18n.js.
  // Do not attach click handlers or mutate header text here.
  window.NeithNavI18n = {
    setLanguage(language) { window.NeithI18n?.setLanguage(language); },
    get language() { return window.NeithI18n?.language || document.documentElement.lang || 'es'; }
  };
})();
