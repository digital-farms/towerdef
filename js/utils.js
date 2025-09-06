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
  const minDist = Number(window.TOWER_MIN_DISTANCE) || 0;
  for (let attempts = 0; attempts < 120; attempts++) {
    const x = x1 + radius + Math.random() * (w - radius * 2);
    const y = y1 + radius + Math.random() * (h - radius * 2);
    if (window.isNearPath(x, y)) continue;
    if (!window.isPosTooCloseToTowers(x, y, minDist)) return { x, y };
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
  // Если включён сеточный спавн — выбираем случайный центр клетки
  if (window.GRID_SPAWN_ENABLED) {
    const center = window.randomGridCenterInZone(zone);
    if (center) {
      console.warn('[TOWER_SPAWN_DEBUG][GRID] центр клетки', center, 'zone:', [x1, y1, x2, y2]);
      return center;
    }
  }
  // Иначе — старый способ: случайно в зоне вдали от пути
  const pos = window.findValidSpawnPos();
  console.warn('[TOWER_SPAWN_DEBUG] выпало', pos, 'zone:', [x1, y1, x2, y2]);
  return pos;
};

// --- GRID SPAWN HELPERS ---
window.getGridCellSize = function(){
  if (typeof window.GRID_SPAWN_CELL_SIZE === 'number' && window.GRID_SPAWN_CELL_SIZE > 0) return window.GRID_SPAWN_CELL_SIZE;
  // Базируемся на диаметре круга аватарки L1 и коэффициенте GRID_SPAWN_CELL_K
  const lvl1 = window.GIFT_TOWER_LEVELS && window.GIFT_TOWER_LEVELS[1];
  const R = lvl1 && lvl1.avatarRadius ? lvl1.avatarRadius : 15; // дефолт 15
  const K = (typeof window.GRID_SPAWN_CELL_K === 'number' && window.GRID_SPAWN_CELL_K > 0) ? window.GRID_SPAWN_CELL_K : 1.25;
  return Math.round(2 * R * K);
};

window.computeGridCenters = function(zone){
  const [x1, y1, x2, y2] = zone;
  const pad = (typeof window.GRID_SPAWN_BORDER_OFFSET === 'number') ? window.GRID_SPAWN_BORDER_OFFSET : 8;
  const cx1 = x1 + pad, cy1 = y1 + pad, cx2 = x2 - pad, cy2 = y2 - pad;
  const cell = window.getGridCellSize();
  if (cx2 <= cx1 || cy2 <= cy1 || cell <= 2) return [];
  const centers = [];
  // шаг сетки = размер клетки, центры смещены на cell/2 от стартовой границы
  const startX = cx1 + cell/2;
  const startY = cy1 + cell/2;
  let lastRowY = startY;
  const rowYs = [];
  for (let y = startY; y <= cy2 - cell/2 + 0.5; y += cell) {
    rowYs.push(y);
    for (let x = startX; x <= cx2 - cell/2 + 0.5; x += cell) {
      centers.push({x, y});
    }
    lastRowY = y; // запомним последнюю строку в пределах зоны
  }
  // Дополнительные ряды сверху/снизу
  const extraTop = Math.max(0, Number(window.GRID_EXTRA_ROWS_TOP) || 0);
  const extraBottom = Math.max(0, Number(window.GRID_EXTRA_ROWS_BOTTOM) || 0);
  for (let k = 1; k <= extraTop; k++) {
    const y = startY - k * cell;
    rowYs.unshift(y);
    for (let x = startX; x <= cx2 - cell/2 + 0.5; x += cell) {
      centers.push({ x, y });
    }
  }
  for (let k = 1; k <= extraBottom; k++) {
    const y = lastRowY + k * cell;
    rowYs.push(y);
    for (let x = startX; x <= cx2 - cell/2 + 0.5; x += cell) {
      centers.push({ x, y });
    }
  }
  // Дополнительные столбцы слева/справа на всех Y строках
  const extraLeft = Math.max(0, Number(window.GRID_EXTRA_COLS_LEFT) || 0);
  const extraRight = Math.max(0, Number(window.GRID_EXTRA_COLS_RIGHT) || 0);
  // вычислим последний X столбец в пределах зоны
  let lastColX = startX;
  for (let x = startX; x <= cx2 - cell/2 + 0.5; x += cell) lastColX = x;
  for (let k = 1; k <= extraLeft; k++) {
    const x = startX - k * cell;
    for (const y of rowYs) centers.push({ x, y });
  }
  for (let k = 1; k <= extraRight; k++) {
    const x = lastColX + k * cell;
    for (const y of rowYs) centers.push({ x, y });
  }
  // Применяем глобальное смещение сетки
  const offX = Number(window.GRID_OFFSET_X) || 0;
  const offY = Number(window.GRID_OFFSET_Y) || 0;
  if (offX !== 0 || offY !== 0){
    for (let i = 0; i < centers.length; i++) { centers[i] = { x: centers[i].x + offX, y: centers[i].y + offY }; }
  }
  return centers;
};

window.randomGridCenterInZone = function(zone){
  const centers = window.computeGridCenters(zone);
  if (!centers.length) return null;
  // фильтруем точки близко к дороге
  const minDist = Number(window.TOWER_MIN_DISTANCE) || 0;
  const validPath = centers.filter(c => !window.isNearPath(c.x, c.y));
  // дополнительно фильтруем по дистанции до уже стоящих башен
  const valid = validPath.filter(c => !window.isPosTooCloseToTowers(c.x, c.y, minDist));
  let pool = valid.length ? valid : validPath;
  if (!pool.length) pool = centers; // последний шанс — вообще любые центры
  // попробуем до 40 случайных попыток найти свободную точку
  for (let i=0; i<40; i++){
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!window.isPosTooCloseToTowers(pick.x, pick.y, minDist)) return { x: pick.x, y: pick.y };
  }
  // если не нашли свободную — вернём ближайшую к условию из пула
  const fallback = pool.find(c => !window.isNearPath(c.x, c.y)) || pool[0];
  return fallback ? { x: fallback.x, y: fallback.y } : null;
};

// Проверка, не слишком ли близко к уже стоящим башням
window.isPosTooCloseToTowers = function(x, y, minDist){
  if (!minDist || !Array.isArray(window.towers)) return false;
  for (const t of window.towers){
    if (!t || t.dead) continue;
    const dx = t.x - x, dy = t.y - y;
    if (Math.hypot(dx, dy) < minDist) return true;
  }
  return false;
};

// --- AUTO-RANGE: увеличить радиус так, чтобы из любой сеточной точки доставать до дороги ---
(function(){
  try {
    if (!window.AUTO_TOWER_RANGE_FROM_GRID) return;
    if (!Array.isArray(window.ALLOWED_TOWER_ZONES) || !window.ALLOWED_TOWER_ZONES.length) return;
    if (!Array.isArray(window.path) || window.path.length < 2) return;
    const zone = window.ALLOWED_TOWER_ZONES[0];
    const centers = window.computeGridCenters ? window.computeGridCenters(zone) : [];
    if (!centers.length) return;
    let worstMin = 0;
    for (const c of centers){
      let bestDist = Infinity;
      for (let i=0;i<window.path.length-1;i++){
        const a = window.path[i], b = window.path[i+1];
        const d = window.distancePointToSegment(c.x, c.y, a.x, a.y, b.x, b.y);
        if (d < bestDist) bestDist = d;
      }
      if (bestDist > worstMin) worstMin = bestDist;
    }
    const margin = Number(window.TOWER_RANGE_MARGIN) || 0;
    const newRange = Math.ceil(worstMin + margin);
    if (Number.isFinite(newRange) && newRange > (window.TOWER_RANGE||0)){
      const prev = window.TOWER_RANGE;
      window.TOWER_RANGE = newRange;
      console.warn('[AUTO_TOWER_RANGE] prev=', prev, 'new=', newRange, 'worstMin=', worstMin.toFixed(1), 'margin=', margin);
    }
  } catch (e) {
    console.warn('[AUTO_TOWER_RANGE] error:', e);
  }
})();
