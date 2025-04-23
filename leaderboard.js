// leaderboard.js
// Топ-3 зрителя по убитым мобам с аватарками и 💥

class Leaderboard {
  constructor(limit = 3) {
    this.limit = limit;
    this.entries = []; // { username, avatarImg, score }
    this._ws = null;
    this._lastSend = 0;
    this._startSync();
  }

  update(username, avatarImg, score) {
    let entry = this.entries.find(e => e.username === username);
    if (entry) {
      entry.score = score;
      entry.avatarImg = avatarImg;
    } else {
      this.entries.push({ username, avatarImg, score });
    }
    this.entries.sort((a, b) => b.score - a.score);
    this.entries = this.entries.slice(0, this.limit);
    this._sendToServer();
  }

  _startSync() {
    // Пытаемся подключиться к WS для отправки leaderboard
    if (window.location.protocol.startsWith('http')) {
      let proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      this._ws = new WebSocket(`${proto}://${window.location.host}`);
      this._ws.onopen = () => this._sendToServer();
    }
  }

  _sendToServer() {
    if (this._ws && this._ws.readyState === 1) {
      // Только публичные данные (без Image)
      const entries = this.entries.map(e => ({
        username: e.username,
        avatarImg: (e.avatarImg && e.avatarImg.src) ? e.avatarImg.src : null,
        score: e.score
      }));
      // Не чаще раза в 1 секунду
      if (Date.now() - this._lastSend > 1000) {
        this._ws.send(JSON.stringify({ type: 'leaderboardUpdate', entries }));
        this._lastSend = Date.now();
      }
    }
  }

  render(ctx, x, y) {
    ctx.save();
    ctx.font = '28px Arial';
    ctx.textBaseline = 'middle';
    if (this.entries.length === 0) {
      ctx.fillStyle = '#d2b074';
      ctx.textAlign = 'left';
      ctx.fillText('Пока нет лидеров', x, y);
      ctx.restore();
      return;
    }
    this.entries.forEach((entry, i) => {
      const lineY = y + i * 48;
      // Аватарка
      if (entry.avatarImg && entry.avatarImg.complete) {
        ctx.drawImage(entry.avatarImg, x, lineY - 18, 36, 36);
      }
      // Эмоджи + ник + счёт
      ctx.fillStyle = '#d2b074';
      ctx.textAlign = 'left';
      ctx.fillText(`💥  ${entry.username}`, x + 44, lineY);
      ctx.textAlign = 'right';
      ctx.fillText(entry.score, x + 320, lineY);
      ctx.textAlign = 'left';
    });
    ctx.restore();
  }
}

window.leaderboard = new Leaderboard(3);
