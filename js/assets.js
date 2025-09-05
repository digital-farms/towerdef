// assets.js
// Images
window.bgImage = new Image();
window.bgImage.src = './map.png';

window.dinoSprite = new Image();
window.dinoSprite.src = './dino_sprite.png';

window.baseImg = new Image();
window.baseImg.src = './base.png';

window.turretImg = new Image();
window.turretImg.src = './turret.png';

window.golemSprite = new Image();
window.golemSprite.src = './Golem_1_walk.png';

// Спрайт смерти голема (10 кадров, спрайт-лист 900x40)
window.golemDieSprite = new Image();
window.golemDieSprite.src = './Golem_1_die_1.png';

// Спрайт взрыва для базового моба (10 кадров по горизонтали, 352x32)
window.explosionBasicMobSprite = new Image();
window.explosionBasicMobSprite.src = './explosion_basicMob_2.png';
// Коэффициент масштабирования взрыва ("немного больше")
window.EXPLOSION_BASIC_SCALE = 1.5;

// Спрайт босса 3 уровня (6 кадров, общий размер 660x80 => кадр 110x80)
window.boss3Sprite = new Image();
window.boss3Sprite.src = './3mob-fly.png';

// Спрайт смерти босса (11 кадров по горизонтали)
window.bossDieSprite = new Image();
window.bossDieSprite.src = './3mob-death.png';

// Спрайт башни за подарок 1 уровня
window.giftL1Img = new Image();
window.giftL1Img.src = 'gift_towers_assets/1lvl_gift_tower.png';
// Спрайт башни за подарок 2 уровня
window.giftL2Img = new Image();
window.giftL2Img.src = 'gift_towers_assets/2lvl_gift_tower.png';
