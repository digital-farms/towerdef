// render.js
window.drawBase = function() {
  const ctx = window.ctx; const baseImg = window.baseImg; const base = window.base;
  ctx.drawImage(baseImg, base.x - 64, base.y - 64, 256, 256);
  ctx.save(); ctx.font = 'bold 20px Arial'; ctx.lineWidth = 5; ctx.strokeStyle = 'black'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
  ctx.strokeText('HP: ' + base.hp, base.x, base.y + 50); ctx.fillText('HP: ' + base.hp, base.x, base.y + 50);
  ctx.restore();
};

window.resizeCanvas = function() {
  const canvas = window.canvas; const aspect = 640 / 480; let w = window.innerWidth; let h = window.innerHeight; if (w / h > aspect) { w = h * aspect; } else { h = w / aspect; }
  canvas.width = w; canvas.height = h; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
};
window.addEventListener('resize', window.resizeCanvas);
window.resizeCanvas();

window.drawGameOverOverlay = function() {
  const ctx = window.ctx; const canvas = window.canvas; const RESTART_LIKES_TARGET = window.RESTART_LIKES_TARGET; const restartLikesAccum = window.restartLikesAccum;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='bold 64px Arial'; ctx.lineWidth=10; ctx.strokeStyle='black'; ctx.fillStyle='#ff4444'; ctx.textAlign='center';
  ctx.strokeText('GAME OVER', canvas.width/2, canvas.height/2 - 20); ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
  const remaining = Math.max(0, RESTART_LIKES_TARGET - restartLikesAccum);
  ctx.font='bold 36px Arial'; const text = `${remaining}\u2764\ufe0f before RESTART!`; ctx.lineWidth=6; ctx.strokeStyle='black'; ctx.fillStyle='#ffffff';
  ctx.strokeText(text, canvas.width/2, canvas.height/2 + 40); ctx.fillText(text, canvas.width/2, canvas.height/2 + 40);
  const barW = Math.min(600, canvas.width*0.8), barH=20, barX=(canvas.width-barW)/2, barY=canvas.height/2+70, p=Math.min(1, restartLikesAccum/RESTART_LIKES_TARGET);
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(barX, barY, barW, barH); ctx.fillStyle='#ff2e88'; ctx.fillRect(barX, barY, barW*p, barH); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.strokeRect(barX, barY, barW, barH);
  ctx.restore();
};
