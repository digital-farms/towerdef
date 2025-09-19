// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const likeCounts = {};
const sentTowersCount = {};
const lastTankGiftAt = Object.create(null); // дедупликация танков по пользователю
const lastGiftTowerAt = Object.create(null); // дедупликация gift-башен по пользователю
let leaderboardData = [];

// Helper: отправка только игровым клиентам
function sendToGames(jsonString){
  let cnt=0;
  wss.clients.forEach((client) => {
    try{
      if (client.readyState === WebSocket.OPEN && client.role === 'game'){
        client.send(jsonString);
        cnt++;
      }
    } catch {}
  });
  logSrc(`sendToGames -> sent to ${cnt} game client(s)`);
}

// --- ADMIN: config storage (public, non-secret) ---
const LIVE_CONFIG_PATH = path.join(__dirname, 'live.config.json');

function readLiveConfig(){
  try { return JSON.parse(fs.readFileSync(LIVE_CONFIG_PATH, 'utf8')); }
  catch { return {}; }
}
function writeLiveConfig(cfg){ fs.writeFileSync(LIVE_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8'); }

// Конфигурация внешнего сервера лайв-событий с приоритетом ENV > live.config.json > дефолты
const liveCfg = readLiveConfig();
let secrets = {}; try { secrets = require('./server.config.js'); } catch {}

const STREAM_HOST = process.env.TT_SERVER_HOST || liveCfg.STREAM_HOST || '127.0.0.1';
const STREAMERS = (
  process.env.TT_STREAMERS || process.env.TT_STREAMER || (Array.isArray(liveCfg.STREAMERS) ? liveCfg.STREAMERS.join(',') : (liveCfg.STREAMERS || 'j.chatae'))
).toString().split(',').map(s=>s.trim()).filter(Boolean);
const STREAMER_MODE = (process.env.TT_STREAMER_MODE || liveCfg.STREAMER_MODE || (STREAMERS.length > 1 ? 'random' : 'fixed')).toLowerCase();
function pickStreamer(){
  if (!STREAMERS.length) return 'polex';
  if (STREAMER_MODE === 'random') return STREAMERS[Math.floor(Math.random() * STREAMERS.length)];
  return STREAMERS[0];
}
let CURRENT_STREAMER = pickStreamer();
const TOKEN = process.env.TT_TOKEN || secrets.TOKEN || 'YOUR_LOCAL_DEV_TOKEN';
const LIKES_MODE = (process.env.LIKES_MODE || liveCfg.LIKES_MODE || 'delta').toLowerCase();

// Раздаём всю папку towerdef как статику
app.use(express.static(__dirname));

// По корню отдаём index.html (чтобы http://localhost:8080/ сразу открывал игру)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Удобный алиас для панели админа
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Страница приветствий
app.get('/greeting', (req, res) => {
  res.sendFile(path.join(__dirname, 'greeting.html'));
});
app.get('/greeting.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'greeting.html'));
});

// GET current live (public) config
app.get('/admin/live-config', (req, res) => {
  const cfg = readLiveConfig();
  // Вернём ПОЛНЫЙ конфиг, подставив дефолты только для STREAM_* и LIKES_MODE, если отсутствуют
  const merged = {
    ...cfg,
    STREAM_HOST: cfg.STREAM_HOST ?? STREAM_HOST,
    STREAMERS: cfg.STREAMERS ?? STREAMERS,
    STREAMER_MODE: cfg.STREAMER_MODE ?? STREAMER_MODE,
    LIKES_MODE: cfg.LIKES_MODE ?? LIKES_MODE
  };
  res.json(merged);
});

// POST updated live (public) config
app.post('/admin/live-config', (req, res) => {
  try {
    const cfg = req.body || {};
    if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Invalid JSON' });
    // basic sanitize
    cfg.STREAMERS = Array.isArray(cfg.STREAMERS) ? cfg.STREAMERS.map(s=>String(s).trim()).filter(Boolean) : [];
    cfg.STREAM_HOST = String(cfg.STREAM_HOST || '').trim() || STREAM_HOST;
    cfg.STREAMER_MODE = String(cfg.STREAMER_MODE || 'fixed').toLowerCase();
    cfg.LIKES_MODE = String(cfg.LIKES_MODE || 'delta').toLowerCase();
    writeLiveConfig(cfg);
    // после сохранения — жёсткий рестарт
    res.json({ ok: true, restarting: true });
    setTimeout(()=>process.exit(0), 100);
  } catch (e) {
    console.error('POST /admin/live-config error', e);
    res.status(500).json({ error: 'write_failed' });
  }
});

// Hard restart (expects supervisor like nodemon/pm2)
app.post('/admin/restart', (req, res) => {
  res.json({ ok: true, restarting: true });
  setTimeout(() => process.exit(0), 100);
});

// --- LEADERBOARD API ---
app.get('/api/leaderboard', (req, res) => {
  res.json(leaderboardData.slice(0, 3));
});

// Логирование внешнего источника
function logSrc(msg) {
  console.log(`[EXT] ${msg}`);
}

// Подготовка прослушивания стрима через HTTP ("пробуждение" канала)
function startListenHTTP(streamerName) {
  return new Promise((resolve) => {
    const options = {
      hostname: STREAM_HOST,
      port: 8001,
      path: `/listen/${encodeURIComponent(streamerName)}`,
      method: 'POST',
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        logSrc(`HTTP listen ${res.statusCode} ${res.statusMessage}`);
        resolve();
      });
    });
    req.on('error', (err) => {
      logSrc(`HTTP listen error: ${err.message}`);
      resolve();
    });
    req.end();
  });
}

// Подключение к WebSocket источнику
let extWS = null;
function connectExternalWS(streamerName) {
  const url = `ws://${STREAM_HOST}:8001/ws`;
  const wsOptions = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};
  logSrc(`Подключаюсь к ${url} (streamer=${streamerName}, mode=${LIKES_MODE}, pick=${STREAMER_MODE})`);
  extWS = new WebSocket(url, wsOptions);

  extWS.on('open', () => logSrc('✅ WS connected'));

  extWS.on('close', (code, reason) => {
    logSrc(`WS closed: ${code} ${reason || ''}`);
    // Перевыбор стримера при режиме random и реконнект
    if (STREAMER_MODE === 'random') {
      CURRENT_STREAMER = pickStreamer();
      logSrc(`Рандомный выбор нового стримера: ${CURRENT_STREAMER}`);
    }
    // Перед реконнектом "пробуждаем" канал на нового стримера
    startListenHTTP(CURRENT_STREAMER).finally(() => {
      setTimeout(() => connectExternalWS(CURRENT_STREAMER), 3000);
    });
  });

  extWS.on('error', (err) => {
    logSrc(`WS error: ${err.message}`);
  });

  extWS.on('message', (buf) => {
    try {
      const text = buf.toString();
      // Логируем сырое сообщение от внешнего WS
      logSrc(`WS message raw: ${text}`);
      // Транслируем в клиент (браузер) для отладки
      try {
        const logMsgRaw = JSON.stringify({ type: 'extLog', level: 'raw', message: text });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) client.send(logMsgRaw);
        });
      } catch {}
      const evt = JSON.parse(text);
      // Логируем распарсенный тип события (если есть)
      if (evt && evt.event_type) {
        logSrc(`WS event_type: ${evt.event_type}`);
        // Транслируем в клиент краткую сводку события
        try {
          const logMsgEvt = JSON.stringify({ type: 'extLog', level: 'event', eventType: evt.event_type, payload: evt.payload || null });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(logMsgEvt);
          });
        } catch {}
      }
      // Обработка подарков: gift_price === 1 -> L1, gift_price === 5 -> Tank, gift_price >= 10 -> L2
      // Дедупликация по сигнатуре события (на случай двукратной доставки)
      const payload = evt && evt.payload ? evt.payload : null;
      const recvTs = Date.now();
      if (!global.__recentGiftSignatures) global.__recentGiftSignatures = new Map();
      const recents = global.__recentGiftSignatures;
      // Сигнатура строится максимально устойчиво к отсутствующим полям
      const sig = payload ? [
        'gift',
        String(payload.user||''),
        String(payload.gift_price||''),
        String(payload.gift_id||payload.id||payload.event_id||payload.timestamp||evt.timestamp||evt.time||'')
      ].join('|') : null;
      // Очистка устаревших записей
      for (const [k, t] of recents) if (recvTs - t > 8000) recents.delete(k);
      if (evt && evt.event_type === 'GIFT' && evt.payload && evt.payload.user) {
        if (sig && recents.has(sig)) { logSrc(`🟡 DUP gift suppressed sig=${sig}`); return; }
        const viewer = String(evt.payload.user);
        const giftPrice = Number(evt.payload.gift_price || 0);
        const avatarUrl = evt.payload && evt.payload.avatar ? String(evt.payload.avatar) : null;
        if (sig) recents.set(sig, recvTs);
        if (giftPrice === 1) {
          const now = Date.now();
          if (now - (lastGiftTowerAt[viewer] || 0) < 3000) { logSrc(`Дубликат gift L1 подавлен для ${viewer}`); return; }
          lastGiftTowerAt[viewer] = now;
          const giftMsg = JSON.stringify({
            type: 'newGiftTower',
            userId: viewer,
            nickname: viewer,
            avatar: avatarUrl,
            level: 1,
            time: new Date().toISOString()
          });
          sendToGames(giftMsg);
          logSrc(`Выдана gift-башня L1 для ${viewer}`);
        } else if (giftPrice === 5) {
          const now = Date.now();
          const prev = lastTankGiftAt[viewer] || 0;
          if (now - prev < 3000) {
            logSrc(`Дубликат танка подавлен для ${viewer}`);
          } else {
            lastTankGiftAt[viewer] = now;
            const tankMsg = JSON.stringify({ type: 'newGiftTank', userId: viewer, nickname: viewer, avatar: avatarUrl, time: new Date().toISOString() });
            sendToGames(tankMsg);
            logSrc(`Спавн танка для ${viewer} (gift_price=5)`);
          }
        } else if (giftPrice >= 10) {
          const now2 = Date.now();
          if (now2 - (lastGiftTowerAt[viewer] || 0) < 3000) { logSrc(`Дубликат gift L2 подавлен для ${viewer}`); return; }
          lastGiftTowerAt[viewer] = now2;
          const giftMsgL2 = JSON.stringify({
            type: 'newGiftTower',
            userId: viewer,
            nickname: viewer,
            avatar: avatarUrl,
            level: 2,
            time: new Date().toISOString()
          });
          sendToGames(giftMsgL2);
          logSrc(`Выдана gift-башня L2 для ${viewer} (gift_price=${giftPrice})`);
        }
      }
      // Ожидаемый формат: { unique_id: 'streamer', event_type: 'JOIN', payload: { user: 'viewer', avatar: 'url' } }
      if (evt && evt.event_type === 'JOIN' && evt.payload && evt.payload.user) {
        const viewer = String(evt.payload.user);
        const avatarUrl = evt.payload && evt.payload.avatar ? String(evt.payload.avatar) : null;
        const out = JSON.stringify({ type: 'viewer_join', user: viewer, avatar: avatarUrl });
        wss.clients.forEach((client) => { if (client.readyState === WebSocket.OPEN) client.send(out); });
        logSrc(`JOIN ${viewer} (avatar=${avatarUrl ? 'yes' : 'no'})`);
      }

      // Ожидаемый формат: { unique_id: 'streamer', event_type: 'LIKE', payload: { user: 'viewer', likes: 7 } }
      if (evt && evt.event_type === 'LIKE' && evt.payload && evt.payload.user) {
        const viewer = String(evt.payload.user);
        const likesValRaw = evt.payload.likes ?? evt.payload.like_count ?? evt.payload.count ?? evt.payload.total ?? evt.payload.total_likes ?? 0;
        const likesVal = Number(likesValRaw) || 0;
        const avatarUrl = evt.payload && evt.payload.avatar ? String(evt.payload.avatar) : null;

        const prev = likeCounts[viewer] || 0;
        let deltaForRestart = 0;
        let newStored = prev;

        if (LIKES_MODE === 'cumulative') {
          // cumulative: общий счётчик у источника, считаем дельту как разницу
          if (likesVal >= prev) {
            deltaForRestart = likesVal - prev;
            newStored = likesVal;
          } else {
            // счётчик у источника «обнулилcя» — считаем пришедшее значение как новую дельту
            deltaForRestart = likesVal;
            newStored = likesVal;
          }
        } else {
          // delta: по идее приходит приращение; но некоторые источники присылают cumulative
          if (likesVal >= prev && likesVal <= prev + 100000) {
            // Похоже на cumulative — считаем дельту как разницу
            deltaForRestart = likesVal - prev;
            newStored = likesVal;
          } else {
            // Нормальный delta-пакет
            deltaForRestart = Math.max(0, likesVal);
            newStored = prev + deltaForRestart;
          }
        }

        likeCounts[viewer] = newStored;
        const totalLikes = likeCounts[viewer];

        if (deltaForRestart > 0) {
          const deltaMsg = JSON.stringify({ type: 'likesDelta', delta: deltaForRestart, user: viewer });
          sendToGames(deltaMsg);
        }

        logSrc(`${viewer} likes total=${totalLikes} (delta=${deltaForRestart})`);

        // Сколько башен уже отправлено этому юзеру
        const prevCount = sentTowersCount[viewer] || 0;
        let newCount = 0;
        if (totalLikes >= 5) {
          // первая башня за 5 лайков, затем каждые +30 лайков — ещё по одной башне
          newCount = 1 + Math.floor((totalLikes - 5) / 30);
        }
        if (newCount > prevCount) {
          for (let i = prevCount; i < newCount; i++) {
            const payload = {
              userId: viewer,
              avatar: avatarUrl,
              nickname: viewer,
              likeCount: likeCounts[viewer],
              time: new Date().toISOString(),
              bonus: i > 0
            };
            const msg = JSON.stringify({ type: 'newTower', ...payload });
            sendToGames(msg);
            logSrc(`Выдана башня #${i + 1} для ${viewer}`);
            sentTowersCount[viewer] = i + 1;
          }
        }
      }
    } catch (e) {
      logSrc(`WS message parse error: ${e.message}`);
    }
  });
}

// Логирование всех подключений
wss.on('connection', (ws) => {
  ws.role = 'unknown';
  ws.clientPath = '';
  ws.clientIp = (ws._socket && ws._socket.remoteAddress) ? ws._socket.remoteAddress : 'unknown';
  console.log('[WS] Новый клиент подключен');

  // --- WS приём сообщений от клиента ---
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'clientHello'){
        ws.role = String(data.role || 'unknown');
        ws.clientPath = String(data.path || '');
        console.log(`[WS] clientHello role=${ws.role} path=${ws.clientPath} ip=${ws.clientIp}`);
        // Разрешаем только одного игрового клиента: закрываем все предыдущие game‑клиенты
        if (ws.role === 'game'){
          let closed = 0;
          wss.clients.forEach((other) => {
            if (other !== ws && other.readyState === WebSocket.OPEN && other.role === 'game'){
              try { other.close(4000, 'Another game client connected'); closed++; } catch {}
            }
          });
          if (closed>0) console.log(`[WS] Closed ${closed} previous game client(s)`);
        }
        return;
      }
      if (data.type === 'leaderboardUpdate' && Array.isArray(data.entries)) {
        leaderboardData = data.entries;
        return;
      }
    } catch (e) {}
  });
});

server.listen(8080, async () => {
  console.log('WebSocket server running on http://127.0.0.1:8080');
  if (!TOKEN) {
    logSrc('ВНИМАНИЕ: TT_TOKEN не задан — авторизация на внешнем сервере может не пройти.');
  }
  logSrc(`Инициализация прослушивания. Выбран стример: ${CURRENT_STREAMER} (режим выбора: ${STREAMER_MODE}; список: ${STREAMERS.join(', ')})`);
  await startListenHTTP(CURRENT_STREAMER);
  connectExternalWS(CURRENT_STREAMER);
});
