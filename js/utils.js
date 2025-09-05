// utils.js
window.distancePointToSegment = function(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const b = c1 / c2;
  const bx = x1 + b * vx, by = y1 + b * vy;
  return Math.hypot(px - bx, py - by);
};

window.isNearPath = function(x, y, threshold = window.PATH_FORBIDDEN_RADIUS) {
  const path = window.path;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const d = window.distancePointToSegment(x, y, a.x, a.y, b.x, b.y);
    if (d < threshold) return true;
  }
  return false;
};

window.closestPointOnSegment = function(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const c2 = vx * vx + vy * vy;
  if (c2 <= 1e-6) return { x: x1, y: y1, t: 0 };
  let t = (vx * wx + vy * wy) / c2;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * vx, y: y1 + t * vy, t };
};

window.getClosestPathY = function(x, y) {
  const path = window.path;
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const p = window.closestPointOnSegment(x, y, a.x, a.y, b.x, b.y);
    const dx = p.x - x, dy = p.y - y;
    const dist2 = dx * dx + dy * dy;
    if (!best || dist2 < best.dist2) best = { y: p.y, dist2 };
  }
  return best ? best.y : null;
};

window.getTowerGroundY = function(t) {
  if (t instanceof window.GiftAvatarTower) {
    const cfg = window.GIFT_TOWER_LEVELS[t.level] || window.GIFT_TOWER_LEVELS[1];
    return t.y + (cfg && cfg.baseYOffset ? cfg.baseYOffset : 0);
  }
  return t.y;
};

window.findValidSpawnPos = function() {
  const zone = window.ALLOWED_TOWER_ZONES[0];
  const [x1, y1, x2, y2] = zone;
  const w = x2 - x1, h = y2 - y1;
  const radius = 16;
  if (w < radius * 2 || h < radius * 2) {
    return { x: x1 + w / 2, y: y1 + h / 2 };
  }
  for (let attempts = 0; attempts < 60; attempts++) {
    const x = x1 + radius + Math.random() * (w - radius * 2);
    const y = y1 + radius + Math.random() * (h - radius * 2);
    if (!window.isNearPath(x, y)) return { x, y };
  }
  return { x: x1 + w / 2, y: y1 + h / 2 };
};

window.randomTowerPositionInAllowedZones = function() {
  const zone = window.ALLOWED_TOWER_ZONES[0];
  let [x1, y1, x2, y2] = zone;
  const w = x2 - x1;
  const h = y2 - y1;
  const radius = 16;
  if (w < radius * 2 || h < radius * 2) {
    const pos = { x: x1 + w / 2, y: y1 + h / 2 };
    console.warn('[TOWER_SPAWN_DEBUG] маленькая зона', pos, 'zone:', [x1, y1, x2, y2]);
    return pos;
  }
  const pos = window.findValidSpawnPos();
  console.warn('[TOWER_SPAWN_DEBUG] выпало', pos, 'zone:', [x1, y1, x2, y2]);
  return pos;
};
