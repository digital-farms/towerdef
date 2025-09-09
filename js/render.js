// render.js
window.drawBase = function() {
  const ctx = window.ctx; const baseImg = window.baseImg; const base = window.base;
  ctx.drawImage(baseImg, base.x - 64, base.y - 64, 256, 256);
  ctx.save(); ctx.font = 'bold 20px Arial'; ctx.lineWidth = 5; ctx.strokeStyle = 'black'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
  ctx.strokeText('HP: ' + base.hp, base.x, base.y + 50); ctx.fillText('HP: ' + base.hp, base.x, base.y + 50);
  ctx.restore();
};

function drawSpawnGrid(){
  if (!window.SHOW_SPAWN_GRID) return;
  const zone = window.ALLOWED_TOWER_ZONES && window.ALLOWED_TOWER_ZONES[0];
  if (!zone) return;
  const [x1,y1,x2,y2] = zone;
  const cell = window.getGridCellSize ? window.getGridCellSize() : 0;
  const pad = (typeof window.GRID_SPAWN_BORDER_OFFSET === 'number') ? window.GRID_SPAWN_BORDER_OFFSET : 8;
  const cx1 = x1 + pad, cy1 = y1 + pad, cx2 = x2 - pad, cy2 = y2 - pad;
  const mode = window.GRID_DRAW_MODE || 'centers';
  const color = window.GRID_COLOR || 'rgba(0,255,255,0.6)';
  const ctx = window.ctx;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = window.GRID_LINE_WIDTH || 1;
  if (mode === 'cells' && cell > 2){
    for (let y = cy1; y <= cy2 - 0.5; y += cell){
      for (let x = cx1; x <= cx2 - 0.5; x += cell){
        ctx.strokeRect(x, y, Math.min(cell, cx2 - x), Math.min(cell, cy2 - y));
      }
    }
  } else {
    // draw centers
    const centers = (window.computeGridCenters ? window.computeGridCenters(zone) : []).slice(0, 5000);
    const r = window.GRID_CENTER_RADIUS || 2;
    for (const c of centers){ ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.fill(); }
  }
  ctx.restore();
}

window.resizeCanvas = function() {
  const canvas = window.canvas; const aspect = 640 / 480; let w = window.innerWidth; let h = window.innerHeight; if (w / h > aspect) { w = h * aspect; } else { h = w / aspect; }
  canvas.width = w; canvas.height = h; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
};
window.resizeCanvas();

window.drawGameOverOverlay = function() {
  const ctx = window.ctx; const canvas = window.canvas;
  const endsAt = window.restartCountdownEndsAt || 0; const now = Date.now();
  const msLeft = Math.max(0, endsAt - now);
  const secLeft = Math.ceil(msLeft / 1000);
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='bold 64px Arial'; ctx.lineWidth=10; ctx.strokeStyle='black'; ctx.fillStyle='#ff4444'; ctx.textAlign='center';
  ctx.strokeText('WAITING', canvas.width/2, canvas.height/2 - 20); ctx.fillText('WAITING', canvas.width/2, canvas.height/2 - 20);
  // Countdown one-line text
  ctx.lineWidth=6; ctx.strokeStyle='black'; ctx.fillStyle='#ffffff';
  ctx.font='bold 42px Arial';
  const label = 'Next run in';
  const oneLine = `${label} ${secLeft}s`;
  ctx.strokeText(oneLine, canvas.width/2, canvas.height/2 + 30);
  ctx.fillText(oneLine, canvas.width/2, canvas.height/2 + 30);
  ctx.restore();
};
