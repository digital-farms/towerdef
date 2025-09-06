// entities.js
(function(){
  const ctx = window.ctx;
  const dinoSprite = window.dinoSprite;

  class Enemy {
    constructor() {
      const path = window.path;
      this.x = path[0].x;
      this.y = path[0].y;
      this.pathIndex = 0;
      this.speed = window.ENEMY_SPEED;
      this.hp = window.ENEMY_SCALED_HP;
      this.dead = false;
      this.frame = 0;
      this.frameDelay = window.ENEMY_FRAME_DELAY;
      this.frameCounter = 0;
      this.frameWidth = window.ENEMY_FRAME_WIDTH;
      this.frameHeight = window.ENEMY_FRAME_HEIGHT;
      this.dying = false;
      this.dieFrame = 0;
      this.dieFrameDelay = window.ENEMY_DIE_FRAME_DELAY;
      this.dieFrameCounter = 0;
      this.dieFramesTotal = window.ENEMY_DIE_FRAMES_TOTAL;
    }


    update() {
      if (this.dying) {
        this.dieFrameCounter++;
        if (this.dieFrameCounter >= this.dieFrameDelay) {
          this.dieFrameCounter = 0;
          this.dieFrame++;
          if (this.dieFrame >= this.dieFramesTotal) this.dead = true;
        }
        return;
      }
      this.frameCounter++;
      if (this.frameCounter >= this.frameDelay) {
        this.frame = (this.frame + 1) % window.ENEMY_ANIM_FRAMES;
        this.frameCounter = 0;
      }
      const path = window.path;
      const target = path[this.pathIndex + 1];
      if (!target) {
        window.base.hp -= window.ENEMY_SCALED_BASE_DAMAGE;
        this.dead = true;
        return;
      }
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.speed) this.pathIndex++;
      else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
    }
    draw() {
      if (this.dying) {
        const sprite = window.explosionBasicMobSprite;
        if (sprite.complete && sprite.width > 0) {
          const fw = sprite.width / 11;
          const fh = sprite.height;
          const sx = Math.min(this.dieFrame, 10) * fw;
          const sy = 0;
          const drawW = fw * window.EXPLOSION_BASIC_SCALE;
          const drawH = fh * window.EXPLOSION_BASIC_SCALE;
          ctx.drawImage(sprite, sx, sy, fw, fh, this.x - drawW/2, this.y - drawH, drawW, drawH);
        }
        return;
      }
      ctx.drawImage(dinoSprite, this.frame * this.frameWidth, 0, this.frameWidth, this.frameHeight, this.x - window.ENEMY_DRAW_WIDTH/2, this.y - window.ENEMY_DRAW_HEIGHT, window.ENEMY_DRAW_WIDTH, window.ENEMY_DRAW_HEIGHT);
    }
    startDying() { if (this.dying) return; this.dying = true; this.dieFrame = 0; this.dieFrameCounter = 0; }
  }

  // Эффект появления башни: вспышка у основания
  class TowerSpawnImpact {
    constructor(x, groundY){
      this.x = x;
      this.y = groundY + (Number(window.TOWER_IMPACT_OFFSET_Y) || 0);
      this.frame = 0;
      this.dead = false;
      this.frameDelay = Number(window.TOWER_IMPACT_FRAME_DELAY) || 2;
      this.counter = 0;
      this.total = Number(window.TOWER_IMPACT_FRAMES) || 7;
      this.fw = Number(window.TOWER_IMPACT_FRAME_W) || 140;
      this.fh = Number(window.TOWER_IMPACT_FRAME_H) || 50;
      this.scale = Number(window.TOWER_IMPACT_SCALE) || 1.0;
    }
    update(){
      this.counter++;
      if (this.counter >= this.frameDelay){
        this.counter = 0;
        this.frame++;
        if (this.frame >= this.total) this.dead = true;
      }
    }
    draw(){
      const spr = window.impactTowersSprite;
      if (!spr || !spr.complete || spr.width === 0) return;
      const sx = Math.min(this.frame, this.total - 1) * this.fw;
      const sy = 0;
      const dw = this.fw * this.scale;
      const dh = this.fh * this.scale;
      // Привязка к низу: рисуем так, чтобы низ кадра лежал на y
      const dx = this.x - dw/2;
      const dy = this.y - dh;
      const ctx = window.ctx;
      ctx.drawImage(spr, sx, sy, this.fw, this.fh, dx, dy, dw, dh);
    }
  }

  class Tower {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.range = window.TOWER_RANGE; this.fireRate = window.TOWER_FIRE_RATE; this.cooldown = 0;
      // Стартовые киллы для базовой (лайк/аватар) башни
      this.killCount = Number(window.TOWER_INITIAL_KILLS_BASIC) || 0;
      this.shotsLeft = window.TOWER_SHOTS_LEFT; this.shotCounter = 0; this.shotSoundEveryN = window.TOWER_SHOT_SOUND_EVERY_N; this.dead = false;
    }
    update() {
      if (this.cooldown > 0) { this.cooldown--; return; }
      if (this.shotsLeft <= 0) { this.dead = true; return; }
      for (const e of window.enemies) {
        const dx = e.x - this.x, dy = e.y - this.y;
        if (Math.hypot(dx, dy) <= this.range) {
          window.bullets.push(new window.Bullet(this.x, this.y, e, this));
          this.cooldown = this.fireRate; this.shotsLeft--;
          this.shotCounter = (this.shotCounter + 1) % this.shotSoundEveryN;
          if (this.shotCounter === 0) window.playBasicTowerShotSound();
          break;
        }
      }
    }
    draw() {
      const img = window.turretImg;
      if (img && img.complete) {
        const size = window.TOWER_DRAW_SIZE;
        ctx.drawImage(img, this.x - size/2, this.y - size/2, size, size);
      } else {
        ctx.save(); ctx.fillStyle = 'rgba(0, 150, 255, 0.7)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        const size = window.TOWER_DRAW_SIZE;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size); ctx.strokeRect(this.x - size/2, this.y - size/2, size, size); ctx.restore();
      }
      // KillCount (configurable)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.TOWER_KC_FONT || 'bold 16px Arial';
      ctx.lineWidth = Number(window.TOWER_KC_LINE_WIDTH) || 2;
      ctx.strokeStyle = window.TOWER_KC_STROKE || '#000';
      ctx.fillStyle = window.TOWER_KC_FILL || '#fff';
      const kcAlpha = (typeof window.TOWER_KC_ALPHA === 'number') ? window.TOWER_KC_ALPHA : 1.0;
      const kcY = this.y + (typeof window.TOWER_KC_OFFSET_Y === 'number' ? window.TOWER_KC_OFFSET_Y : -34);
      const prevAlpha1 = ctx.globalAlpha; ctx.globalAlpha = kcAlpha;
      ctx.strokeText(this.killCount, this.x, kcY); ctx.fillText(this.killCount, this.x, kcY);
      ctx.globalAlpha = prevAlpha1; ctx.restore();
      // ShotsLeft (configurable)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.TOWER_SHOTS_FONT || '10px Arial';
      ctx.fillStyle = window.TOWER_SHOTS_FILL || '#ffffff';
      const shAlpha = (typeof window.TOWER_SHOTS_ALPHA === 'number') ? window.TOWER_SHOTS_ALPHA : 1.0;
      const shY = this.y + (typeof window.TOWER_SHOTS_OFFSET_Y === 'number' ? window.TOWER_SHOTS_OFFSET_Y : 20);
      const prevAlpha2 = ctx.globalAlpha; ctx.globalAlpha = shAlpha;
      ctx.fillText(this.shotsLeft, this.x, shY);
      ctx.globalAlpha = prevAlpha2; ctx.restore();
    }
  }

  class AvatarTower extends Tower {
    constructor(x, y, avatarImg, nickname, userId) {
      super(x, y);
      this.avatarImg = avatarImg; this.nickname = nickname || userId || 'anon'; this.userId = userId || null;
    }
    draw() {
      if (this.avatarImg && this.avatarImg.complete) {
        ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, 15, 0, Math.PI*2); ctx.lineWidth = 6; ctx.strokeStyle = '#222'; ctx.stroke(); ctx.clip();
        ctx.drawImage(this.avatarImg, this.x - 26, this.y - 26, 52, 52); ctx.restore();
      } else { super.draw(); return; }
      // KillCount (configurable)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.AVATAR_KC_FONT || 'bold 15px Arial';
      ctx.lineWidth = Number(window.AVATAR_KC_LINE_WIDTH) || 2;
      ctx.strokeStyle = window.AVATAR_KC_STROKE || '#000';
      ctx.fillStyle = window.AVATAR_KC_FILL || '#fff';
      const kcAlpha = (typeof window.AVATAR_KC_ALPHA === 'number') ? window.AVATAR_KC_ALPHA : 1.0;
      const kcY = this.y + (typeof window.AVATAR_KC_OFFSET_Y === 'number' ? window.AVATAR_KC_OFFSET_Y : -12);
      const prevAlpha1 = ctx.globalAlpha; ctx.globalAlpha = kcAlpha;
      ctx.strokeText(this.killCount, this.x, kcY); ctx.fillText(this.killCount, this.x, kcY);
      ctx.globalAlpha = prevAlpha1; ctx.restore();
      // ShotsLeft (configurable)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.AVATAR_SHOTS_FONT || '10px Arial';
      ctx.fillStyle = window.AVATAR_SHOTS_FILL || '#ffffff';
      const shAlpha = (typeof window.AVATAR_SHOTS_ALPHA === 'number') ? window.AVATAR_SHOTS_ALPHA : 1.0;
      const shY = this.y + (typeof window.AVATAR_SHOTS_OFFSET_Y === 'number' ? window.AVATAR_SHOTS_OFFSET_Y : 24);
      const prevAlpha2 = ctx.globalAlpha; ctx.globalAlpha = shAlpha;
      ctx.fillText(this.shotsLeft, this.x, shY);
      ctx.globalAlpha = prevAlpha2; ctx.restore();
    }
  }

  class GiftAvatarTower extends Tower {
    constructor(x, y, avatarImg=null, nickname=null, userId=null, level=1) {
      super(x, y);
      this.avatarImg = avatarImg; this.nickname = nickname || userId || 'anon'; this.userId = userId || null;
      this.level = Number(level) || 1; const cfg = window.GIFT_TOWER_LEVELS[this.level] || window.GIFT_TOWER_LEVELS[1];
      this.shotsLeft = cfg.shotsLeft; this.fireRate = cfg.fireRate; this.range = cfg.range;
      // Стартовые киллы для подарочных башен по уровню
      // Приоритет: глобальные значения из config.js (TOWER_INITIAL_KILLS_GIFT_L1/L2),
      // затем per-level default (cfg.initialKills), затем 0.
      const gL1 = Number(window.TOWER_INITIAL_KILLS_GIFT_L1);
      const gL2 = Number(window.TOWER_INITIAL_KILLS_GIFT_L2);
      if (this.level === 2 && Number.isFinite(gL2)) {
        this.killCount = gL2;
      } else if (this.level !== 2 && Number.isFinite(gL1)) {
        this.killCount = gL1;
      } else if (typeof cfg.initialKills === 'number') {
        this.killCount = cfg.initialKills;
      } else {
        this.killCount = 0;
      }
    }
    draw() {
      const cfg = window.GIFT_TOWER_LEVELS[this.level] || window.GIFT_TOWER_LEVELS[1];
      const tw = cfg.tw, th = cfg.th; const baseYOffset = cfg.baseYOffset; const towerImg = (this.level === 2) ? window.giftL2Img : window.giftL1Img;
      if (towerImg && towerImg.complete) {
        ctx.drawImage(towerImg, this.x - tw/2, this.y - th + baseYOffset, tw, th);
      } else {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,255,0.6)'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.fillRect(this.x - tw/2, this.y - th + baseYOffset, tw, th); ctx.strokeRect(this.x - tw/2, this.y - th + baseYOffset, tw, th); ctx.restore();
      }
      if (this.avatarImg && this.avatarImg.complete) {
        const ax = this.x; const ay = this.y - th + cfg.avatarYOffset; const R = cfg.avatarRadius; const P = 1; const IW = 2*(R-P);
        ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, R, 0, Math.PI*2); ctx.lineWidth = cfg.avatarStroke; ctx.strokeStyle = cfg.avatarStrokeColor || '#0000ff'; ctx.stroke(); ctx.clip();
        ctx.drawImage(this.avatarImg, ax - IW/2, ay - IW/2, IW, IW); ctx.restore();
      }
      // KillCount (configurable for gift)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.GIFT_KC_FONT || 'bold 15px Arial';
      ctx.lineWidth = Number(window.GIFT_KC_LINE_WIDTH) || 4;
      ctx.strokeStyle = window.GIFT_KC_STROKE || '#000';
      ctx.fillStyle = window.GIFT_KC_FILL || '#fff';
      const gkcAlpha = (typeof window.GIFT_KC_ALPHA === 'number') ? window.GIFT_KC_ALPHA : 1.0;
      const killY = this.y - th + cfg.killTextYOffset;
      const prevAlpha1 = ctx.globalAlpha; ctx.globalAlpha = gkcAlpha;
      ctx.strokeText(this.killCount || 0, this.x, killY); ctx.fillText(this.killCount || 0, this.x, killY);
      ctx.globalAlpha = prevAlpha1; ctx.restore();
      // ShotsLeft (configurable for gift)
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = window.GIFT_SHOTS_FONT || '10px Arial';
      ctx.fillStyle = window.GIFT_SHOTS_FILL || '#ffffff';
      const gshAlpha = (typeof window.GIFT_SHOTS_ALPHA === 'number') ? window.GIFT_SHOTS_ALPHA : 1.0;
      const shotsY = this.y + (typeof window.GIFT_SHOTS_OFFSET_Y === 'number' ? window.GIFT_SHOTS_OFFSET_Y : 1);
      const prevAlpha2 = ctx.globalAlpha; ctx.globalAlpha = gshAlpha;
      ctx.fillText(this.shotsLeft, this.x, shotsY);
      ctx.globalAlpha = prevAlpha2; ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, target, ownerTower=null) { this.x = x; this.y = y; this.target = target; this.ownerTower = ownerTower; this.speed = window.BULLET_SPEED; this.dead = false; }
    update() {
      const dx = this.target.x - this.x, dy = this.target.y - this.y; const dist = Math.hypot(dx, dy);
      if (dist < this.speed || this.target.hp <= 0) {
        if (this.target.hp > 0) {
          this.target.hp -= window.BULLET_DAMAGE; if (this.target.hp <= 0 && this.ownerTower) { this.ownerTower.killCount++; window.updateLeaderboardFromTowers && window.updateLeaderboardFromTowers(); }
        }
        if (this.target.hp <= 0) { if (typeof this.target.startDying === 'function') this.target.startDying(); else this.target.dead = true; }
        this.dead = true;
      } else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
    }
    draw() {
      if (this.ownerTower instanceof window.GiftAvatarTower) ctx.fillStyle = window.getGiftTowerBulletColor(this.ownerTower.level); else ctx.fillStyle = window.BULLET_COLOR;
      ctx.beginPath(); ctx.arc(this.x, this.y, window.BULLET_RADIUS, 0, Math.PI*2); ctx.fill();
    }
  }

  class GolemBullet {
    constructor(x, y, target) { this.x = x; this.y = y; this.target = target; this.speed = window.GOLEM_BULLET_SPEED; this.dead = false; }
    update() {
      if (!this.target || this.target.dead) { this.dead = true; return; }
      const dx = this.target.x - this.x, dy = this.target.y - this.y; const dist = Math.hypot(dx, dy);
      if (dist < this.speed) { if (this.target.killCount !== undefined) { this.target.killCount = Math.max(0, this.target.killCount - window.GOLEM_BULLET_TOWER_KILLCOUNT_DELTA); } this.dead = true; return; }
      this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed;
    }
    draw() { ctx.save(); ctx.fillStyle = window.GOLEM_BULLET_COLOR; ctx.beginPath(); ctx.arc(this.x, this.y, window.GOLEM_BULLET_RADIUS, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
  }

  class GolemEnemy extends Enemy {
    constructor(){
      super(); 
      this.hp = window.GOLEM_HP; this.maxHp = window.GOLEM_HP; 
      this.speed = window.GOLEM_SPEED; this.bulletCooldown = 0; this.fireRate = window.GOLEM_FIRE_RATE;
      this.frame = 0; this.frameDelay = window.GOLEM_FRAME_DELAY; this.frameCounter = 0; 
      this.frameWidth = window.GOLEM_FRAME_WIDTH; this.frameHeight = window.GOLEM_FRAME_HEIGHT; 
      this.sizeOffsetY = window.GOLEM_SIZE_OFFSET_Y; this.visualScale = window.GOLEM_VISUAL_SCALE;
      this.dying = false; this.dieFrame = 0; this.dieFrameDelay = window.GOLEM_DIE_FRAME_DELAY; this.dieFrameCounter = 0; 
      this.dieFrameWidth = window.GOLEM_DIE_FRAME_WIDTH; this.dieFrameHeight = window.GOLEM_DIE_FRAME_HEIGHT; this.dieFramesTotal = window.GOLEM_DIE_FRAMES_TOTAL;
    }
    update(){
      if (this.dying){ this.dieFrameCounter++; if (this.dieFrameCounter>=this.dieFrameDelay){ this.dieFrameCounter=0; this.dieFrame++; if (this.dieFrame>=this.dieFramesTotal){ this.dead=true; } } return; }
      if (this.hp<=0){ this.startDying(); return; }
      const path = window.path; const target = path[this.pathIndex + 1]; if (!target){ this.onReachBase(); return; }
      const dx = target.x - this.x, dy = target.y - this.y; const dist = Math.hypot(dx, dy);
      if (dist < this.speed) this.pathIndex++; else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
      if (this.bulletCooldown>0) this.bulletCooldown--; else { const t = this.findNearestTower(); if (t){ this.shootAt(t); this.bulletCooldown = this.fireRate; } }
      this.frameCounter++; if (this.frameCounter>=this.frameDelay){ this.frame=(this.frame+1) % window.GOLEM_ANIM_FRAMES; this.frameCounter=0; }
    }
    startDying(){
      if (this.dying) return;
      this.dying=true; this.dieFrame=0; this.dieFrameCounter=0;
      if (typeof window.playGolemDeathSound === 'function') window.playGolemDeathSound();
    }
    findNearestTower(){ let min=9999, nearest=null; for (const t of window.towers){ if (t.dead) continue; const d=Math.hypot(t.x-this.x, t.y-this.y); if (d<min){ min=d; nearest=t; } } return nearest; }
    shootAt(tower){ window.bullets.push(new window.GolemBullet(this.x, this.y, tower)); }
    onReachBase(){ window.base.hp -= window.GOLEM_BASE_DAMAGE; this.dead=true; }
    draw(){
      const scale=this.visualScale;
      if (this.dying){ const sx=this.dieFrame*this.dieFrameWidth, sy=0, dw=this.dieFrameWidth*scale, dh=this.dieFrameHeight*scale; ctx.drawImage(window.golemDieSprite, sx, sy, this.dieFrameWidth, this.dieFrameHeight, this.x-(this.dieFrameWidth/2)*scale, this.y-this.sizeOffsetY*scale, dw, dh); return; }
      ctx.drawImage(window.golemSprite, this.frame*this.frameWidth, 0, this.frameWidth, this.frameHeight, this.x-45*scale, this.y-this.sizeOffsetY*scale, this.frameWidth*scale, this.frameHeight*scale);
      ctx.fillStyle='#222'; ctx.fillRect(this.x-20*scale, this.y-this.sizeOffsetY*scale-8, 40*scale, 8); ctx.fillStyle='#0f0'; ctx.fillRect(this.x-20*scale, this.y-this.sizeOffsetY*scale-8, 40*scale*(this.hp/this.maxHp), 8); ctx.strokeStyle='#000'; ctx.strokeRect(this.x-20*scale, this.y-this.sizeOffsetY*scale-8, 40*scale, 8);
    }
  }

  class BossBullet {
    constructor(x,y,target){
      this.x=x; this.y=y; this.target=target;
      this.speed = window.BOSS_BULLET_SPEED;
      this.dead=false;
    }
    update(){
      if(!this.target||this.target.dead){ this.dead=true; return; }
      const dx=this.target.x-this.x, dy=this.target.y-this.y, dist=Math.hypot(dx,dy);
      if(dist<this.speed){
        if(typeof this.target.killCount==='number'){
          const delta = window.BOSS_BULLET_TOWER_KILLCOUNT_DELTA || 0;
          this.target.killCount = Math.max(0, (this.target.killCount||0) - delta);
          if(window.BOSS_BULLET_KILL_TOWER_AT_ZERO && this.target.killCount<=0){ this.target.dead=true; }
        }
        this.dead=true; return;
      }
      this.x+=(dx/dist)*this.speed; this.y+=(dy/dist)*this.speed;
    }
    draw(){
      ctx.save();
      ctx.fillStyle = window.BOSS_BULLET_COLOR || '#00ff55';
      const r = window.BOSS_BULLET_RADIUS || 10;
      ctx.beginPath(); ctx.arc(this.x,this.y,r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  class BossEnemy extends Enemy {
    constructor(){
      super();
      this.hp = window.BOSS_HP; this.maxHp = window.BOSS_HP;
      this.speed = window.BOSS_SPEED;
      this.bulletCooldown = 0; this.fireRate = window.BOSS_FIRE_RATE;
      this.frame = 0; this.frameDelay = window.BOSS_FRAME_DELAY; this.frameCounter = 0;
      this.frameWidth = window.BOSS_FRAME_WIDTH; this.frameHeight = window.BOSS_FRAME_HEIGHT;
      // Анимация смерти
      this.dying = false;
      this.dieFrame = 0;
      this.dieFrameDelay = window.BOSS_DIE_FRAME_DELAY || 5;
      this.dieFrameCounter = 0;
      this.dieFramesTotal = window.BOSS_DIE_FRAMES_TOTAL || 11;
    }
    update(){
      if (this.dying){
        // Проигрываем анимацию смерти босса
        this.dieFrameCounter++;
        if (this.dieFrameCounter >= this.dieFrameDelay){
          this.dieFrameCounter = 0;
          this.dieFrame++;
          if (this.dieFrame >= this.dieFramesTotal){ this.dead = true; }
        }
        return;
      }
      if(this.hp<=0){ this.startDying(); return; }
      const path=window.path; const target=path[this.pathIndex+1];
      if(!target){ this.onReachBase(); return; }
      const dx=target.x-this.x, dy=target.y-this.y, dist=Math.hypot(dx,dy);
      if(dist<this.speed) this.pathIndex++; else { this.x+=(dx/dist)*this.speed; this.y+=(dy/dist)*this.speed; }
      if(this.bulletCooldown>0) this.bulletCooldown--; else { const t=this.findNearestTower(); if(t){ this.shootAt(t); this.bulletCooldown=this.fireRate; } }
      this.frameCounter++;
      if(this.frameCounter>=this.frameDelay){ this.frame=(this.frame+1) % (window.BOSS_ANIM_FRAMES||6); this.frameCounter=0; }
    }
    startDying(){ if (this.dying) return; this.dying = true; this.dieFrame = 0; this.dieFrameCounter = 0; }
    findNearestTower(){ let min=1e9, best=null; for(const t of window.towers){ if(t.dead) continue; const d=Math.hypot(t.x-this.x, t.y-this.y); if(d<min){ min=d; best=t; } } return best; }
    shootAt(t){ window.bullets.push(new window.BossBullet(this.x, this.y, t)); }
    onReachBase(){ window.base.hp -= (window.BOSS_BASE_DAMAGE||100); this.dead = true; }
    draw(){
      const scale = window.BOSS_VISUAL_SCALE || 1;
      const yOff = window.BOSS_SIZE_OFFSET_Y || 0;
      // Если идёт анимация смерти — рисуем спрайт смерти босса
      if (this.dying){
        const dieSpr = window.bossDieSprite;
        if (dieSpr && dieSpr.complete && dieSpr.width > 0){
          const total = this.dieFramesTotal;
          const fw = dieSpr.width / total;
          const fh = dieSpr.height;
          const sx = Math.min(this.dieFrame, total-1) * fw;
          const sy = 0;
          const dw = fw * scale;
          const dh = fh * scale;
          ctx.drawImage(dieSpr, sx, sy, fw, fh, this.x - dw/2, this.y - dh + yOff, dw, dh);
        }
        return;
      }
      const spr=window.boss3Sprite;
      if(spr && spr.complete){
        const dw = this.frameWidth * scale;
        const dh = this.frameHeight * scale;
        ctx.drawImage(spr, this.frame*this.frameWidth, 0, this.frameWidth, this.frameHeight, this.x - dw/2, this.y - dh + yOff, dw, dh);
      } else {
        ctx.save(); ctx.fillStyle='rgba(0,255,0,0.6)';
        const dw = 60 * scale, dh = 60 * scale;
        ctx.fillRect(this.x-dw/2, this.y-dh + yOff, dw, dh); ctx.restore();
      }
      // HP bar (позиция учитывает масштаб и смещение)
      ctx.save();
      const barY = this.y - (this.frameHeight * scale) + yOff - 12;
      ctx.fillStyle='#222'; ctx.fillRect(this.x-25, barY, 50, 8);
      ctx.fillStyle='#0f0'; ctx.fillRect(this.x-25, barY, 50*(this.hp/this.maxHp), 8);
      ctx.strokeStyle='#000'; ctx.strokeRect(this.x-25, barY, 50, 8);
      ctx.restore();
    }
  }

  // Export to window
  window.Enemy = Enemy;
  window.TowerSpawnImpact = TowerSpawnImpact;
  window.Tower = Tower;
  window.AvatarTower = AvatarTower;
  window.GiftAvatarTower = GiftAvatarTower;
  window.Bullet = Bullet;
  window.GolemBullet = GolemBullet;
  window.GolemEnemy = GolemEnemy;
  window.BossBullet = BossBullet;
  window.BossEnemy = BossEnemy;
})();
