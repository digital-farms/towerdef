// state.js
window.canvas = document.getElementById('gameCanvas');
window.ctx = canvas.getContext('2d');

// Game state containers
window.towers = [];
window.enemies = [];
window.bullets = [];
window.base = { x: 540, y: 80, hp: 10000 };

// Spawning and scaling
window.enemySpawnRate = 0.004; // ниже стартовая частота спавна
window.ENEMY_SCALED_HP = Math.max(1, Math.round(window.BASE_ENEMY_HP / window.ENEMY_DENSITY_SCALE));
window.ENEMY_SCALED_BASE_DAMAGE = Math.max(1, Math.round(window.BASE_ENEMY_BASE_DAMAGE / window.ENEMY_DENSITY_SCALE));

// Restart/likes: если включён таймер, стартуем в режиме ожидания
window.gameState = (window.RESTART_COUNTDOWN_MS && window.RESTART_COUNTDOWN_MS > 0)
  ? 'waitingRestart'
  : (window.USE_LIKES_RESTART ? 'waitingRestart' : 'running');
window.restartLikesAccum = 0;
window.lastSeenLikesByUser = Object.create(null);
window.SHOW_RESTART_OVERLAY = true;
// Таймер ожидания перезапуска (мс, timestamp конца ожидания)
window.restartCountdownEndsAt = null;

// UI button
const startRunBtn = document.getElementById('startRunBtn');
window.updateUIButtons = function() {
  if (!startRunBtn) return;
  startRunBtn.style.display = (window.gameState === 'running') ? 'none' : 'inline-block';
};
if (startRunBtn) {
  startRunBtn.onclick = () => {
    window.startGameRun();
    window.updateUIButtons();
  };
}
window.updateUIButtons();
