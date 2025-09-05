// leaderboard_sync.js
// Собираем killCount и аватарки для всех AvatarTower и пушим в leaderboard.js
window.updateLeaderboardFromTowers = function() {
  const towers = window.towers; const leaderboard = window.leaderboard;
  if (!leaderboard) return;
  const towersByUser = {};
  for (const t of towers) {
    if (t instanceof window.AvatarTower && t.killCount > 0) {
      const username = t.nickname || t.userId || 'anon';
      towersByUser[username] = towersByUser[username] || {score: 0, avatarImg: t.avatarImg};
      towersByUser[username].score += t.killCount;
    }
  }
  for (const [username, data] of Object.entries(towersByUser)) {
    leaderboard.update(username, data.avatarImg, data.score);
  }
};
