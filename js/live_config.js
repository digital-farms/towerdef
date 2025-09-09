// js/live_config.js
(function(){
  async function fetchJSON(url){
    const r = await fetch(url, { cache: 'no-cache' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }
  function deepAssign(target, src){
    if (!src || typeof src !== 'object') return;
    for (const k of Object.keys(src)){
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)){
        if (typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        deepAssign(target[k], v);
      } else {
        target[k] = v;
      }
    }
  }
  async function loadLive(){
    try {
      const cfg = await fetchJSON('/live.config.json');
      // Прямое назначение на window.*
      deepAssign(window, cfg);
      console.log('[LIVE CONFIG] applied', cfg);
    } catch (e) {
      console.warn('[LIVE CONFIG] failed to load', e);
    }
  }
  window.loadLiveConfig = loadLive;
  window.loadLiveConfigPromise = loadLive();
})();
