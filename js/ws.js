// ws.js
(function(){
  // Подключаемся к WS того же домена/порта, откуда загружена страница
  const wsProto = (location.protocol === 'https:') ? 'wss' : 'ws';
  const wsUrl = `${wsProto}://${location.host}`; // пример: ws://kkclazh.com.ua:8080
  const tiktokSocket = new WebSocket(wsUrl);
  tiktokSocket.addEventListener('open', () => {
    console.log('[TikTok WS] Соединение установлено');
    // Представимся серверу как игровой клиент
    try {
      tiktokSocket.send(JSON.stringify({ type: 'clientHello', role: 'game', path: location.pathname, ua: navigator.userAgent }));
    } catch {}
  });
  tiktokSocket.addEventListener('error', (err) => { console.log('[TikTok WS] Ошибка соединения', err); });
  let origTikTokMsgHandler = tiktokSocket.onmessage;
  let lastTankSpawnAt = 0; // антидубли на случай повторной доставки одного и того же подарка
  let lastGiftTowerAt = 0; // антидубли для newGiftTower
  tiktokSocket.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'newTower') {
        if (window.gameState !== 'running') return;
        const pos = window.randomTowerPositionInAllowedZones();
        if (data.avatar) {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = data.avatar;
          img.onload = () => { const t=new window.AvatarTower(pos.x, pos.y, img, data.nickname, data.userId); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay(); };
          img.onerror = () => { const t=new window.Tower(pos.x, pos.y); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay(); };
        } else {
          const t=new window.Tower(pos.x, pos.y); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay();
        }
      } else if (data.type === 'newGiftTower') {
        if (window.gameState !== 'running') return;
        const now = Date.now();
        const cdTower = 4000;
        if (now - lastGiftTowerAt < cdTower) { console.warn('[GiftTower] duplicate suppressed (client)'); return; }
        lastGiftTowerAt = now;
        const pos = window.randomTowerPositionInAllowedZones(); const lvl = Number(data.level || 1);
        if (data.avatar) {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = data.avatar;
          img.onload = () => { const t=new window.GiftAvatarTower(pos.x, pos.y, img, data.nickname, data.userId, lvl); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay(); };
          img.onerror = () => { const t=new window.GiftAvatarTower(pos.x, pos.y, null, data.nickname, data.userId, lvl); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay(); };
        } else {
          const t=new window.GiftAvatarTower(pos.x, pos.y, null, data.nickname, data.userId, lvl); window.towers.push(t); window.playSpawnTowerSound(); if(window.TOWER_IMPACT_ENABLED&&window.TowerSpawnImpact){ const gy=window.getTowerGroundY(t); window.effects.push(new window.TowerSpawnImpact(t.x, gy)); } window.enemySpawnRate = Math.min(window.enemySpawnRate + (window.SPAWN_RATE_INC_PER_TOWER||0.0015), window.SPAWN_RATE_CAP||1); window.updateSpawnRateDisplay();
        }
      } else if (data.type === 'newGiftTank') {
        if (window.gameState !== 'running') return;
        if (window.TANK_ENABLED === false) return;
        const now = Date.now();
        const cd = 4000; // мс; игнорируем повтор в течение 4с
        if (now - lastTankSpawnAt < cd) { console.warn('[Tank] duplicate event suppressed (client)'); return; }
        lastTankSpawnAt = now;
        console.log('[Tank] spawn');
        window.enemies.push(new window.TankEnemy());
      } else if (data.type === 'extLog') {
        if (data.level === 'raw') {
          console.log('[EXT][RAW]', data.message);
        } else {
          console.log('[EXT][EVENT]', data.eventType, data.payload);
          const typeUp = (data.eventType || '').toString().toUpperCase();
          if (typeUp === 'LIKE' && data.payload && data.payload.user) {
            const user = String(data.payload.user);
            // Поддержка разных полей количества лайков
            const rawVal = (
              data.payload.likes ??
              data.payload.like_count ??
              data.payload.count ??
              data.payload.total ??
              data.payload.total_likes ??
              0
            );
            const likesVal = Number(rawVal) || 0;
            if (!Number.isFinite(likesVal) || likesVal <= 0) return;
            let prev = window.lastSeenLikesByUser[user] || 0;
            let delta = 0;
            if (likesVal >= prev) {
              // трактуем как кумулятивный счётчик
              delta = likesVal - prev;
              window.lastSeenLikesByUser[user] = likesVal;
            } else {
              // трактуем как дельту (или счётчик обнулился)
              delta = likesVal;
              window.lastSeenLikesByUser[user] = prev + likesVal;
            }
            if (delta > 0 && window.gameState === 'waitingRestart') {
              console.log('[LIKES] +', delta, 'by', user, 'accum=', (window.restartLikesAccum||0) + delta, 'target=', window.RESTART_LIKES_TARGET);
              window.addRestartLikes(delta);
            }
          }
        }
      } else if (origTikTokMsgHandler) {
        origTikTokMsgHandler.call(tiktokSocket, event);
      }
    } catch (e) {
      console.log('[TikTok WS] Ошибка обработки сообщения:', e);
    }
  };
})();
