// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const tiktokUsername = 'digital.n0mad'; // ЗАМЕНИ НА СВОЙ TikTok username!
const tiktokConnection = new WebcastPushConnection(tiktokUsername);

const likeCounts = {};
const sentTowersCount = {};

// Раздаём всю папку towerdef как статику
app.use(express.static(__dirname));

// По корню отдаём index.html (чтобы http://localhost:8080/ сразу открывал игру)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Логирование всех подключений
wss.on('connection', (ws) => {
  console.log('[WS] Новый клиент подключен');
});

// Логирование событий TikTok
function logTikTok(msg) {
  console.log(`[TikTok] ${msg}`);
}

tiktokConnection.connect().then(() => {
  logTikTok('✅ Connected to TikTok live');
}).catch(e => {
  logTikTok('❌ Ошибка подключения: ' + e.message);
});

tiktokConnection.on('like', (data) => {
  const userId = data.userId;
  if (!userId) return;
  likeCounts[userId] = (likeCounts[userId] || 0) + data.likeCount;
  logTikTok(`${data.uniqueId} (${userId}) поставил лайк #${likeCounts[userId]}`);

  // Сколько башен уже отправлено этому юзеру
  const prevCount = sentTowersCount[userId] || 0;
  let newCount = 0;
  if (likeCounts[userId] >= 5) {
    // первая башня за 5 лайков
    newCount = 1 + Math.floor((likeCounts[userId] - 5) / 100);
  }
  // Если надо выдать новые башни
  while (prevCount < newCount) {
    const payload = {
      userId,
      avatar: data.profilePictureUrl || null,
      nickname: data.uniqueId || '',
      likeCount: likeCounts[userId],
      time: new Date().toISOString(),
      bonus: prevCount > 0 // true для второй и последующих башен
    };
    const msg = JSON.stringify({ type: 'newTower', ...payload });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
    logTikTok(`Башня #${prevCount + 1} для ${payload.nickname} (${userId}) отправлена в игру!`);
    sentTowersCount[userId] = prevCount + 1;
    prevCount++;
  }
});

server.listen(8080, () => {
  console.log('WebSocket server running on http://localhost:8080');
});
