// ws.js
(function(){
  const tiktokSocket = new WebSocket('ws://localhost:8080');
  tiktokSocket.addEventListener('open', () => { console.log('[TikTok WS] Соединение установлено'); });
  tiktokSocket.addEventListener('error', (err) => { console.log('[TikTok WS] Ошибка соединения', err); });
  let origTikTokMsgHandler = tiktokSocket.onmessage;
  tiktokSocket.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'newTower') {
        if (window.gameState !== 'running') return;
        const pos = window.randomTowerPositionInAllowedZones();
        if (data.avatar) {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = data.avatar;
          img.onload = () => { window.towers.push(new window.AvatarTower(pos.x, pos.y, img, data.nickname, data.userId)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay(); };
          img.onerror = () => { window.towers.push(new window.Tower(pos.x, pos.y)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay(); };
        } else {
          window.towers.push(new window.Tower(pos.x, pos.y)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay();
        }
      } else if (data.type === 'newGiftTower') {
        if (window.gameState !== 'running') return;
        const pos = window.randomTowerPositionInAllowedZones(); const lvl = Number(data.level || 1);
        if (data.avatar) {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = data.avatar;
          img.onload = () => { window.towers.push(new window.GiftAvatarTower(pos.x, pos.y, img, data.nickname, data.userId, lvl)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay(); };
          img.onerror = () => { window.towers.push(new window.GiftAvatarTower(pos.x, pos.y, null, data.nickname, data.userId, lvl)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay(); };
        } else {
          window.towers.push(new window.GiftAvatarTower(pos.x, pos.y, null, data.nickname, data.userId, lvl)); window.playSpawnTowerSound(); window.enemySpawnRate = Math.min(window.enemySpawnRate + 0.0015, 1); window.updateSpawnRateDisplay();
        }
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
