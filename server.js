// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const https = require('https');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const likeCounts = {};
const sentTowersCount = {};
let leaderboardData = [];

// Конфигурация внешнего сервера лайв-событий
// Настраивается через переменные окружения:
//   TT_SERVER_HOST — домен сервера (по умолчанию tiktokliveserver.org)
//   TT_STREAMER    — ник стримера (например, enfor.cross)
//   TT_TOKEN       — Bearer-токен авторизации
//   LIKES_MODE     — 'delta' (likes — приращение) или 'cumulative' (likes — суммарно)
const STREAM_HOST = process.env.TT_SERVER_HOST || 'tiktokliveserver.org';
const STREAMER = process.env.TT_STREAMER || 'nittaya_asmr';
const TOKEN = process.env.TT_TOKEN || '3debd82ada04ab756d750d3c7d8295e4ad958e440ba7fd7135e31bba370c1a8d777862c62b3e45fe570640e5c54de641b7c89a7c82732a9489fd156c50f6cec8';
const LIKES_MODE = (process.env.LIKES_MODE || 'delta').toLowerCase();

// Раздаём всю папку towerdef как статику
app.use(express.static(__dirname));

// По корню отдаём index.html (чтобы http://localhost:8080/ сразу открывал игру)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
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
function startListenHTTP() {
  return new Promise((resolve) => {
    const options = {
      hostname: STREAM_HOST,
      path: `/listen/${encodeURIComponent(STREAMER)}`,
      method: 'POST',
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
    };
    const req = https.request(options, (res) => {
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
function connectExternalWS() {
  const url = `ws://${STREAM_HOST}/ws`;
  const wsOptions = TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {};
  logSrc(`Подключаюсь к ${url} (streamer=${STREAMER}, mode=${LIKES_MODE})`);
  extWS = new WebSocket(url, wsOptions);

  extWS.on('open', () => logSrc('✅ WS connected'));

  extWS.on('close', (code, reason) => {
    logSrc(`WS closed: ${code} ${reason || ''}`);
    // Реконнект через 3 сек.
    setTimeout(connectExternalWS, 3000);
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
      // Обработка подарков: gift_price === 1 -> L1, gift_price >= 10 -> L2
      if (evt && evt.event_type === 'GIFT' && evt.payload && evt.payload.user) {
        const viewer = String(evt.payload.user);
        const giftPrice = Number(evt.payload.gift_price || 0);
        const avatarUrl = evt.payload && evt.payload.avatar ? String(evt.payload.avatar) : null;
        if (giftPrice === 1) {
          const giftMsg = JSON.stringify({
            type: 'newGiftTower',
            userId: viewer,
            nickname: viewer,
            avatar: avatarUrl,
            level: 1,
            time: new Date().toISOString()
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(giftMsg);
          });
          logSrc(`Выдана gift-башня L1 для ${viewer}`);
        } else if (giftPrice >= 10) {
          const giftMsgL2 = JSON.stringify({
            type: 'newGiftTower',
            userId: viewer,
            nickname: viewer,
            avatar: avatarUrl,
            level: 2,
            time: new Date().toISOString()
          });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(giftMsgL2);
          });
          logSrc(`Выдана gift-башня L2 для ${viewer} (gift_price=${giftPrice})`);
        }
      }
      // Ожидаемый формат: { unique_id: 'streamer', event_type: 'LIKE', payload: { user: 'viewer', likes: 7 } }
      if (evt && evt.event_type === 'LIKE' && evt.payload && evt.payload.user) {
        const viewer = String(evt.payload.user);
        const likesVal = Number(evt.payload.likes || 0);
        const avatarUrl = evt.payload && evt.payload.avatar ? String(evt.payload.avatar) : null;

        if (LIKES_MODE === 'cumulative') {
          // Значение — суммарные лайки пользователя
          likeCounts[viewer] = Math.max(likeCounts[viewer] || 0, likesVal);
        } else {
          // Значение — приращение (по умолчанию)
          likeCounts[viewer] = (likeCounts[viewer] || 0) + likesVal;
        }

        const totalLikes = likeCounts[viewer];
        logSrc(`${viewer} likes total=${totalLikes}`);

        // Сколько башен уже отправлено этому юзеру
        const prevCount = sentTowersCount[viewer] || 0;
        let newCount = 0;
        if (totalLikes >= 5) {
          // первая башня за 5 лайков, затем каждые +100 лайков — ещё по одной башне
          newCount = 1 + Math.floor((totalLikes - 5) / 100);
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
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
              }
            });
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
  console.log('[WS] Новый клиент подключен');

  // --- WS для получения leaderboard от клиента ---
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'leaderboardUpdate' && Array.isArray(data.entries)) {
        leaderboardData = data.entries;
      }
    } catch (e) {}
  });
});

server.listen(8080, async () => {
  console.log('WebSocket server running on http://localhost:8080');
  if (!TOKEN) {
    logSrc('ВНИМАНИЕ: TT_TOKEN не задан — авторизация на внешнем сервере может не пройти.');
  }
  await startListenHTTP();
  connectExternalWS();
});
