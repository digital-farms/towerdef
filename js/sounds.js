// sounds.js
window.playSpawnTowerSound = function() {
  const audio = document.getElementById('spawnTowerSound');
  if (audio) { audio.volume = window.SPAWN_TOWER_VOL; audio.currentTime = 0; audio.play().catch(()=>{}); }
};

window.playGolemSpawnSound = function() {
  const audio = document.getElementById('golemSpawnSound');
  if (!audio) return; try { audio.volume = window.GOLEM_SPAWN_VOL; audio.currentTime = 0; audio.play(); } catch {}
};

window.playGolemDeathSound = function() {
  const audio = document.getElementById('golemDeathSound');
  if (!audio) return; try { audio.volume = window.GOLEM_DEATH_VOL; audio.currentTime = 0; audio.play(); } catch {}
};

const BASIC_SHOT_SOUND_MIN_INTERVAL_MS = 140;
let lastBasicShotSoundTs = 0;
window.playBasicTowerShotSound = function() {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (now - lastBasicShotSoundTs < BASIC_SHOT_SOUND_MIN_INTERVAL_MS) return;
  const audio = document.getElementById('basicTowerShotSound');
  if (!audio) return; try { audio.volume = window.BASIC_SHOT_VOL; audio.currentTime = 0; audio.play(); lastBasicShotSoundTs = now; } catch {}
};
