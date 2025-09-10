(function(){
  const $ = (sel) => document.querySelector(sel);
  const toastEl = $('#toast');
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), 2000); }
  const statusEl = $('#status');
  function setStatus(s){ statusEl.textContent = `Статус: ${s}`; }

  async function loadConfig(){
    const res = await fetch('/admin/live-config');
    if(!res.ok){ setStatus('не удалось загрузить'); return; }
    const cfg = await res.json();
    $('#host').value = cfg.STREAM_HOST || '';
    $('#streamers').value = Array.isArray(cfg.STREAMERS) ? cfg.STREAMERS.join(', ') : '';
    $('#streamer_mode').value = (cfg.STREAMER_MODE || 'fixed');
    $('#likes_mode').value = (cfg.LIKES_MODE || 'delta');
    $('#raw').value = JSON.stringify(cfg, null, 2);
    setStatus('конфиг загружен');

    // Геймплей
    $('#ENEMY_SPAWN_RATE_INITIAL').value = cfg.ENEMY_SPAWN_RATE_INITIAL ?? '';
    $('#SPAWN_RATE_INC_PER_TOWER').value = cfg.SPAWN_RATE_INC_PER_TOWER ?? '';
    $('#SPAWN_RATE_DEC_ON_TOWER_DEATH').value = cfg.SPAWN_RATE_DEC_ON_TOWER_DEATH ?? '';
    $('#SPAWN_RATE_CAP').value = cfg.SPAWN_RATE_CAP ?? '';
    $('#SPAWN_RATE_MANUAL_STEP').value = cfg.SPAWN_RATE_MANUAL_STEP ?? '';
    $('#ENEMY_DENSITY_SCALE').value = cfg.ENEMY_DENSITY_SCALE ?? '';
    // Сетка/коллизии
    $('#GRID_SPAWN_ENABLED').checked = !!cfg.GRID_SPAWN_ENABLED;
    $('#GRID_SPAWN_CELL_K').value = cfg.GRID_SPAWN_CELL_K ?? '';
    $('#GRID_OFFSET_X').value = cfg.GRID_OFFSET_X ?? '';
    $('#GRID_OFFSET_Y').value = cfg.GRID_OFFSET_Y ?? '';
    $('#PATH_FORBIDDEN_RADIUS').value = cfg.PATH_FORBIDDEN_RADIUS ?? '';
    $('#TOWER_MIN_DISTANCE').value = cfg.TOWER_MIN_DISTANCE ?? '';
    // Башни
    $('#TOWER_RANGE').value = cfg.TOWER_RANGE ?? '';
    $('#TOWER_FIRE_RATE').value = cfg.TOWER_FIRE_RATE ?? '';
    $('#TOWER_SHOTS_LEFT').value = cfg.TOWER_SHOTS_LEFT ?? '';
    $('#TOWER_DRAW_SIZE').value = cfg.TOWER_DRAW_SIZE ?? '';
    $('#TOWER_INITIAL_KILLS_BASIC').value = cfg.TOWER_INITIAL_KILLS_BASIC ?? '';
    $('#TOWER_INITIAL_KILLS_GIFT_L1').value = cfg.TOWER_INITIAL_KILLS_GIFT_L1 ?? '';
    $('#TOWER_INITIAL_KILLS_GIFT_L2').value = cfg.TOWER_INITIAL_KILLS_GIFT_L2 ?? '';
    // Босс
    $('#BOSS_HP').value = cfg.BOSS_HP ?? '';
    $('#BOSS_SPEED').value = cfg.BOSS_SPEED ?? '';
    $('#BOSS_FIRE_RATE').value = cfg.BOSS_FIRE_RATE ?? '';
    $('#BOSS_BASE_DAMAGE').value = cfg.BOSS_BASE_DAMAGE ?? '';
    $('#BOSS_VISUAL_SCALE').value = cfg.BOSS_VISUAL_SCALE ?? '';
    $('#BOSS_SIZE_OFFSET_Y').value = cfg.BOSS_SIZE_OFFSET_Y ?? '';
    // Голем
    $('#GOLEM_HP').value = cfg.GOLEM_HP ?? '';
    $('#GOLEM_SPEED').value = cfg.GOLEM_SPEED ?? '';
    $('#GOLEM_FIRE_RATE').value = cfg.GOLEM_FIRE_RATE ?? '';
    $('#GOLEM_BASE_DAMAGE').value = cfg.GOLEM_BASE_DAMAGE ?? '';
    $('#GOLEM_VISUAL_SCALE').value = cfg.GOLEM_VISUAL_SCALE ?? '';
    $('#GOLEM_SIZE_OFFSET_Y').value = cfg.GOLEM_SIZE_OFFSET_Y ?? '';
  }

  async function saveConfig(){
    const cfg = {
      STREAM_HOST: $('#host').value.trim(),
      STREAMERS: $('#streamers').value.split(',').map(s=>s.trim()).filter(Boolean),
      STREAMER_MODE: $('#streamer_mode').value,
      LIKES_MODE: $('#likes_mode').value,
      // Геймплей
      ENEMY_SPAWN_RATE_INITIAL: Number($('#ENEMY_SPAWN_RATE_INITIAL').value) || undefined,
      SPAWN_RATE_INC_PER_TOWER: Number($('#SPAWN_RATE_INC_PER_TOWER').value) || undefined,
      SPAWN_RATE_DEC_ON_TOWER_DEATH: Number($('#SPAWN_RATE_DEC_ON_TOWER_DEATH').value) || undefined,
      SPAWN_RATE_CAP: Number($('#SPAWN_RATE_CAP').value) || undefined,
      SPAWN_RATE_MANUAL_STEP: Number($('#SPAWN_RATE_MANUAL_STEP').value) || undefined,
      ENEMY_DENSITY_SCALE: Number($('#ENEMY_DENSITY_SCALE').value) || undefined,
      // Сетка/коллизии
      GRID_SPAWN_ENABLED: $('#GRID_SPAWN_ENABLED').checked,
      GRID_SPAWN_CELL_K: Number($('#GRID_SPAWN_CELL_K').value) || undefined,
      GRID_OFFSET_X: Number($('#GRID_OFFSET_X').value) || undefined,
      GRID_OFFSET_Y: Number($('#GRID_OFFSET_Y').value) || undefined,
      PATH_FORBIDDEN_RADIUS: Number($('#PATH_FORBIDDEN_RADIUS').value) || undefined,
      TOWER_MIN_DISTANCE: Number($('#TOWER_MIN_DISTANCE').value) || undefined,
      // Башни
      TOWER_RANGE: Number($('#TOWER_RANGE').value) || undefined,
      TOWER_FIRE_RATE: Number($('#TOWER_FIRE_RATE').value) || undefined,
      TOWER_SHOTS_LEFT: Number($('#TOWER_SHOTS_LEFT').value) || undefined,
      TOWER_DRAW_SIZE: Number($('#TOWER_DRAW_SIZE').value) || undefined,
      TOWER_INITIAL_KILLS_BASIC: Number($('#TOWER_INITIAL_KILLS_BASIC').value) || undefined,
      TOWER_INITIAL_KILLS_GIFT_L1: Number($('#TOWER_INITIAL_KILLS_GIFT_L1').value) || undefined,
      TOWER_INITIAL_KILLS_GIFT_L2: Number($('#TOWER_INITIAL_KILLS_GIFT_L2').value) || undefined,
      // Босс
      BOSS_HP: Number($('#BOSS_HP').value) || undefined,
      BOSS_SPEED: Number($('#BOSS_SPEED').value) || undefined,
      BOSS_FIRE_RATE: Number($('#BOSS_FIRE_RATE').value) || undefined,
      BOSS_BASE_DAMAGE: Number($('#BOSS_BASE_DAMAGE').value) || undefined,
      BOSS_VISUAL_SCALE: Number($('#BOSS_VISUAL_SCALE').value) || undefined,
      BOSS_SIZE_OFFSET_Y: Number($('#BOSS_SIZE_OFFSET_Y').value) || undefined,
      // Голем
      GOLEM_HP: Number($('#GOLEM_HP').value) || undefined,
      GOLEM_SPEED: Number($('#GOLEM_SPEED').value) || undefined,
      GOLEM_FIRE_RATE: Number($('#GOLEM_FIRE_RATE').value) || undefined,
      GOLEM_BASE_DAMAGE: Number($('#GOLEM_BASE_DAMAGE').value) || undefined,
      GOLEM_VISUAL_SCALE: Number($('#GOLEM_VISUAL_SCALE').value) || undefined,
      GOLEM_SIZE_OFFSET_Y: Number($('#GOLEM_SIZE_OFFSET_Y').value) || undefined
    };
    const res = await fetch('/admin/live-config', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(cfg) });
    if(res.ok){ toast('Сохранено'); setStatus('сохранено'); $('#raw').value = JSON.stringify(cfg, null, 2); }
    else { toast('Ошибка сохранения'); setStatus('ошибка сохранения'); }
  }

  async function saveRaw(){
    try{
      const parsed = JSON.parse($('#raw').value);
      const res = await fetch('/admin/live-config', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(parsed) });
      if(res.ok){ toast('JSON сохранён'); setStatus('сохранено'); }
      else { toast('Ошибка сохранения JSON'); setStatus('ошибка'); }
    }catch{ toast('Невалидный JSON'); }
  }

  function formatRaw(){ try{ const obj = JSON.parse($('#raw').value); $('#raw').value = JSON.stringify(obj, null, 2); toast('Форматировано'); } catch{ toast('Невалидный JSON'); } }

  async function restart(){ const res = await fetch('/admin/restart', { method:'POST' }); if(res.ok){ toast('Рестарт сервера...'); setStatus('рестарт...'); setTimeout(()=>location.reload(), 4000); } else { toast('Не удалось перезапустить'); } }

  async function applyNoRestart(){
    // Лёгкое оповещение клиентов уже делается сервером через WS 'configUpdated'.
    toast('Если клиенты подписаны на configUpdated — они применят настройки автоматически');
  }

  const saveBtn = $('#save'); if (saveBtn) saveBtn.onclick = saveConfig;
  const saveRawBtn = $('#saveRaw'); if (saveRawBtn) saveRawBtn.onclick = saveRaw;
  const formatBtn = $('#format'); if (formatBtn) formatBtn.onclick = formatRaw;
  // Кнопка рестарта удалена из UI; оставляем защиту, если вернётся
  const restartBtn = $('#restart'); if (restartBtn) restartBtn.onclick = restart;
  const reloadBtn = $('#reload'); if (reloadBtn) reloadBtn.onclick = applyNoRestart;

  loadConfig();
})();
