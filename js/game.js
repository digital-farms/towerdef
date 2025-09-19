// game.js
(function(){
  const canvas = window.canvas; const ctx = window.ctx;
  // Коллекция визуальных эффектов (например, вспышка при появлении башни)
  window.effects = window.effects || [];
  // Маленький оверлей с rate в углу (создаём динамически)
  function ensureSpawnRateCorner(){
    let el = document.getElementById('spawnRateCorner');
    if (!el){
      el = document.createElement('span');
      el.id = 'spawnRateCorner';
      el.style.position = 'fixed';
      el.style.top = '8px';
      el.style.left = '8px';
      el.style.fontSize = '13px';
      el.style.color = '#fff';
      el.style.background = 'rgba(0,0,0,0.5)';
      el.style.padding = '2px 7px';
      el.style.borderRadius = '7px';
      el.style.fontFamily = 'sans-serif';
      el.style.zIndex = '10';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
    }
    return el;
  }
  window.updateSpawnRateDisplay = function(){
    const a = document.getElementById('spawnRateDisplay');
    if (a) a.textContent = window.enemySpawnRate.toFixed(3);
    const b = ensureSpawnRateCorner();
    if (b) b.textContent = `rate: ${window.enemySpawnRate.toFixed(3)}`;
  };

  window.softResetToWaiting = function(){
    window.enemies.length = 0; window.bullets.length = 0; window.towers.length = 0; window.enemySpawnRate = (window.ENEMY_SPAWN_RATE_INITIAL || 0.004); window.updateSpawnRateDisplay();
    // Запускаем обратный отсчёт, если включён режим ожидания по таймеру
    if (window.RESTART_COUNTDOWN_MS && window.RESTART_COUNTDOWN_MS > 0){
      window.restartCountdownEndsAt = Date.now() + Number(window.RESTART_COUNTDOWN_MS);
    }
  };

  window.startGameRun = function(){
    const startHp = (typeof window.BASE_HP_START==='number') ? window.BASE_HP_START : 100;
    window.base.hp = startHp; window.restartLikesAccum = 0; window.gameState = 'running'; if (typeof window.updateUIButtons === 'function') window.updateUIButtons();
  };

  window.addRestartLikes = function(delta){
    const add = Math.max(0, Number(delta) || 0); if (add <= 0) return; window.restartLikesAccum += add; if (window.restartLikesAccum >= window.RESTART_LIKES_TARGET && window.gameState === 'waitingRestart'){ window.startGameRun(); }
  };

  window.setRestartTarget = function(n){ window.RESTART_LIKES_TARGET = Math.max(1, Number(n) || window.RESTART_LIKES_TARGET); };

  function checkGolemSpawn(){
    const min = (typeof window.GOLEM_SPAWN_MIN_TOWERS === 'number') ? window.GOLEM_SPAWN_MIN_TOWERS : 5;
    if (window.towers.length >= min && !window.enemies.some(e => e instanceof window.GolemEnemy)) {
      window.enemies.push(new window.GolemEnemy()); window.playGolemSpawnSound();
    }
  }
  function checkBossSpawn(){
    const min = (typeof window.BOSS_SPAWN_MIN_TOWERS === 'number') ? window.BOSS_SPAWN_MIN_TOWERS : 10;
    if (window.towers.length > min && !window.enemies.some(e => e instanceof window.BossEnemy)) {
      window.enemies.push(new window.BossEnemy());
    }
  }

  window.gameLoop = function(){
    ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); const scale = Math.min(canvas.width/640, canvas.height/480); ctx.scale(scale, scale);
    ctx.drawImage(window.bgImage, 0, 0, 640, 480);
    if (window.showTowerZones){ for (const [x1,y1,x2,y2] of window.ALLOWED_TOWER_ZONES){ ctx.strokeStyle='red'; ctx.lineWidth=2; ctx.strokeRect(x1,y1,x2-x1,y2-y1); } }
    if (window.gameState === 'running'){
      checkGolemSpawn(); checkBossSpawn();
      if (Math.random() < window.enemySpawnRate * window.ENEMY_DENSITY_SCALE) window.enemies.push(new window.Enemy());
      for (const t of window.towers) t.update();
      for (const e of window.enemies) e.update();
      for (const b of window.bullets) b.update();
      // Апдейт эффектов
      for (const fx of window.effects) if (fx.update) fx.update();
    }
    window.drawBase();
    if (typeof drawSpawnGrid === 'function') drawSpawnGrid();
    // Рисуем эффекты под башнями
    for (const fx of window.effects) if (fx.draw) fx.draw();
    const backTowers=[], frontTowers=[];
    for (const t of window.towers){
      const gy=window.getTowerGroundY(t);
      const cy=window.getClosestPathY(t.x, gy);
      if (cy==null || gy <= cy + window.FRONT_Y_EPS) backTowers.push({t, gy}); else frontTowers.push({t, gy});
    }
    // Сортируем по groundY: меньшие Y (сзади) рисуем раньше, большие Y (впереди) — позже
    backTowers.sort((a,b)=>a.gy - b.gy);
    frontTowers.sort((a,b)=>a.gy - b.gy);
    for (const {t} of backTowers) t.draw();
    // 1) Сначала обычные мобы (без големов, боссов и танков)
    for (const e of window.enemies) if (!(e instanceof window.GolemEnemy) && !(e instanceof window.BossEnemy) && !(e instanceof window.TankEnemy)) e.draw();
    // 2) Затем големы
    for (const e of window.enemies) if (e instanceof window.GolemEnemy) e.draw();
    // 3) Башни, находящиеся перед дорогой
    for (const {t} of frontTowers) t.draw();
    // 4) Боссы поверх всего остального (кроме танков)
    for (const e of window.enemies) if (e instanceof window.BossEnemy) e.draw();
    // 5) Танки — поверх всех других мобов
    for (const e of window.enemies) if (e instanceof window.TankEnemy) e.draw();
    for (const b of window.bullets) b.draw();

    if (window.gameState === 'running'){
      for (let i=window.enemies.length-1;i>=0;i--) if (window.enemies[i].dead) window.enemies.splice(i,1);
      for (let i=window.bullets.length-1;i>=0;i--) if (window.bullets[i].dead) window.bullets.splice(i,1);
      for (let i=window.towers.length-1;i>=0;i--) if (window.towers[i].dead){ window.enemySpawnRate = Math.max(0, window.enemySpawnRate - (window.SPAWN_RATE_DEC_ON_TOWER_DEATH||0.0015)); window.updateSpawnRateDisplay(); window.towers.splice(i,1); }
      for (let i=window.effects.length-1;i>=0;i--) if (window.effects[i].dead) window.effects.splice(i,1);
    }

    ctx.restore();
    // Переход в режим ожидания после проигрыша
    if (window.gameState === 'running' && window.base.hp <= 0){
      window.gameState = 'waitingRestart';
      window.softResetToWaiting();
      if (typeof window.updateUIButtons==='function') window.updateUIButtons();
    }
    // Рисуем оверлей ожидания (таймер + лайки)
    if (window.gameState === 'waitingRestart' && window.SHOW_RESTART_OVERLAY){ window.drawGameOverOverlay(); }
    // Авто-старт после завершения обратного отсчёта
    if (window.gameState === 'waitingRestart' && window.restartCountdownEndsAt && Date.now() >= window.restartCountdownEndsAt){
      window.startGameRun();
    }
    requestAnimationFrame(window.gameLoop);
  };

  canvas.addEventListener('click', (e) => {
    if (window.gameState !== 'running') return;
    const rect = canvas.getBoundingClientRect(); const rawX = e.clientX - rect.left; const rawY = e.clientY - rect.top; const scale = Math.min(canvas.width/640, canvas.height/480); const x = rawX/scale; const y = rawY/scale;
    let spawn = { x, y }; if (window.isNearPath(x, y)) { spawn = window.findValidSpawnPos(); console.warn('[SPAWN] Клик рядом с дорогой — смещаем башню в безопасную позицию', spawn); }
    const t = new window.Tower(spawn.x, spawn.y);
    window.towers.push(t);
    window.playSpawnTowerSound();
    // Эффект появления башни (если включён)
    if (window.TOWER_IMPACT_ENABLED && window.TowerSpawnImpact){
      const gy = window.getTowerGroundY(t);
      window.effects.push(new window.TowerSpawnImpact(t.x, gy));
    }
    // Рост частоты спавна врагов — по конфигу
    const inc = (window.SPAWN_RATE_INC_PER_TOWER || 0.0015);
    const cap = (window.SPAWN_RATE_CAP || 1);
    window.enemySpawnRate = Math.min(window.enemySpawnRate + inc, cap); window.updateSpawnRateDisplay();
  });

  const spawnPlusBtn = document.getElementById('spawnPlus');
  if (spawnPlusBtn) spawnPlusBtn.onclick = () => { const step=(window.SPAWN_RATE_MANUAL_STEP||0.003), cap=(window.SPAWN_RATE_CAP||1); window.enemySpawnRate = Math.min(window.enemySpawnRate + step, cap); window.updateSpawnRateDisplay(); };
  window.updateSpawnRateDisplay();

  const startAfterConfig = async () => {
    try { if (window.loadLiveConfigPromise) await window.loadLiveConfigPromise; } catch {}
    // Если игра стартует в режиме ожидания — убедимся, что таймер инициализирован
    if (window.gameState === 'waitingRestart' && (!window.restartCountdownEndsAt) && window.RESTART_COUNTDOWN_MS && window.RESTART_COUNTDOWN_MS > 0){
      window.restartCountdownEndsAt = Date.now() + Number(window.RESTART_COUNTDOWN_MS);
    }
    window.gameLoop();
  };
  if (window.bgImage && window.bgImage.complete) {
    // Изображение уже закешировано и загружено — стартуем сразу
    startAfterConfig();
    if (typeof window.updateSpawnRateDisplay === 'function') window.updateSpawnRateDisplay();
  } else {
    window.bgImage.onload = () => { startAfterConfig(); if (typeof window.updateSpawnRateDisplay === 'function') window.updateSpawnRateDisplay(); };
  }
})();
