// config.js
// --- НАСТРОЙКИ ГРОМКОСТИ ЗВУКОВ ---
// Диапазон значений: 0.0 (тихо) — 1.0 (макс)
window.SPAWN_TOWER_VOL = 0.4;      // громкость звука появления башни
window.BASIC_SHOT_VOL = 0.05;      // громкость выстрела обычной башни
window.GOLEM_SPAWN_VOL = 0.3;      // громкость рыка при спавне голема

// Коэффициент плотности обычных мобов: <1 — реже спавн; баланс сохраняем повышением HP и урона
window.ENEMY_DENSITY_SCALE = 0.33; // ~в 3 раза меньше мобов

// Базовые параметры обычного моба до масштабирования
window.BASE_ENEMY_HP = 2;           // было 3 — снизили, чтобы башни успевали убивать
window.BASE_ENEMY_BASE_DAMAGE = 0.33; // было 1 — снизили, чтобы урон по базе был ниже

// Производные параметры под масштаб (вычисляются в state.js, чтобы быть привязанными к текущим константам)

// --- РЕЖИМ РЕСТАРТА ПО ЛАЙКАМ / РУЧНОЙ СТАРТ ---
// Флаг использования рестарта по лайкам. Если false — можно запускать забег вручную кнопкой "Start"
window.USE_LIKES_RESTART = true; // переключите на false, чтобы отключить механику лайков
// Порог лайков для старта/рестарта (редактируйте при необходимости)
window.RESTART_LIKES_TARGET = 10;

// --- Зоны для спавна башен зрителей (по картинке) ---
// [x1, y1, x2, y2] — координаты прямоугольников (всегда в "игровых" координатах 0..640, 0..480)
window.ALLOWED_TOWER_ZONES = [
  [12, 140, 500, 380]
];
window.showTowerZones = false; // Показывать красные зоны

// --- Запрет спавна башен на дороге у мобов ---
// Радиус запрета размещения башен около пути (в игровых пикселях 640x480)
window.PATH_FORBIDDEN_RADIUS = 24;

// Небольшой порог, чтобы избежать мигания на границе дороги
window.FRONT_Y_EPS = 4;

// Характеристики подарочных башен по уровням (боевые и визуальные)
window.GIFT_TOWER_LEVELS = {
  1: {
    // Боевые
    shotsLeft: 150,
    fireRate: 45,
    range: 100,
    // Визуальные
    tw: 45,              // ширина спрайта на сцене
    th: 65,              // высота спрайта на сцене
    baseYOffset: 24,     // сдвиг башни по Y (основание)
    killTextYOffset: 20, // сдвиг текста киллов относительно верха спрайта
    avatarYOffset: 32,   // сдвиг центра аватарки относительно верха спрайта
    avatarRadius: 15,    // радиус круга аватарки
    avatarStroke: 6,     // толщина обводки круга
    avatarStrokeColor: '#0000ff' // цвет обводки круга
  },
  2: {
    // Боевые
    shotsLeft: 250,
    fireRate: 30,
    range: 120,
    // Визуальные
    tw: 45,
    th: 65,
    baseYOffset: 30,
    killTextYOffset: 20,
    avatarYOffset: 32,
    avatarRadius: 15,
    avatarStroke: 6,
    avatarStrokeColor: '#FF0000' // цвет обводки круга для L2
  }
};

// Цвет пули для подарочной башни по уровню (совпадает с цветом обводки аватарки)
window.getGiftTowerBulletColor = function(level) {
  const cfg = window.GIFT_TOWER_LEVELS[level] || window.GIFT_TOWER_LEVELS[1];
  return cfg && cfg.avatarStrokeColor ? cfg.avatarStrokeColor : 'yellow';
};

// Путь мобов
window.path = [
  { x: 0,   y: 260 },
  { x: 105, y: 260 },
  { x: 105, y: 120 },
  { x: 235, y: 120 },
  { x: 235, y: 310 },
  { x: 405, y: 310 },
  { x: 405, y: 210 },
  { x: 520, y: 210 }
];

// --- Пороги появления особых врагов ---
window.GOLEM_SPAWN_MIN_TOWERS = 5;   // голем появляется, когда на поле башен >= этого числа
window.BOSS_SPAWN_MIN_TOWERS = 10;    // босс появляется, когда на поле башен > этого числа

// --- Настройки Босса (централизовано) ---
// Параметры врага
window.BOSS_HP = 40;                 // здоровье босса (сколько урона он выдержит)
window.BOSS_SPEED = 0.16;             // скорость движения по пути (чем больше, тем быстрее идёт)
window.BOSS_FIRE_RATE = 300;          // частота выстрелов: интервал между выстрелами в кадрах
window.BOSS_BASE_DAMAGE = 30;       // урон по базе при достижении конца пути
// Параметры анимации спрайта босса
window.BOSS_FRAME_WIDTH = 110;       // ширина одного кадра спрайта босса
window.BOSS_FRAME_HEIGHT = 80;       // высота одного кадра спрайта босса
window.BOSS_FRAME_DELAY = 6;         // задержка между сменой кадров анимации (в кадрах)
window.BOSS_ANIM_FRAMES = 6;         // количество кадров в строке спрайта
// Параметры анимации смерти босса
window.BOSS_DIE_FRAMES_TOTAL = 11;   // количество кадров в анимации смерти босса
window.BOSS_DIE_FRAME_DELAY = 5;     // задержка между кадрами анимации смерти (в кадрах)
// Параметры пули босса
window.BOSS_BULLET_SPEED = 4.2;      // скорость полёта пули босса
window.BOSS_BULLET_RADIUS = 10;      // радиус отрисовки пули (визуальный размер)
window.BOSS_BULLET_COLOR = '#00ff55';// цвет пули босса
window.BOSS_BULLET_TOWER_KILLCOUNT_DELTA = 1;  // на сколько уменьшать killCount башни при попадании
window.BOSS_BULLET_KILL_TOWER_AT_ZERO = true;  // если true — башня умирает, когда её killCount упал до 0

// --- Настройки обычного моба (Enemy) ---
window.ENEMY_SPEED = 1;                      // скорость движения по пути
window.ENEMY_FRAME_DELAY = 5;                // задержка между кадрами анимации (в кадрах)
window.ENEMY_FRAME_WIDTH = 80;               // ширина одного кадра спрайта
window.ENEMY_FRAME_HEIGHT = 80;              // высота одного кадра спрайта
window.ENEMY_ANIM_FRAMES = 8;                // количество кадров в анимации ходьбы
window.ENEMY_DIE_FRAME_DELAY = 3;            // скорость анимации смерти (взрыва)
window.ENEMY_DIE_FRAMES_TOTAL = 11;          // количество кадров в анимации смерти
window.ENEMY_DRAW_WIDTH = 60;                // ширина отрисовки моба на экране
window.ENEMY_DRAW_HEIGHT = 60;               // высота отрисовки моба на экране

// --- Настройки голема (GolemEnemy) ---
window.GOLEM_HP = 20;                        // здоровье голема
window.GOLEM_SPEED = 0.4;                    // скорость движения голема
window.GOLEM_FIRE_RATE = 100;                 // интервал между выстрелами голема (в кадрах)
window.GOLEM_BASE_DAMAGE = 20;               // урон по базе при достижении конца
window.GOLEM_FRAME_DELAY = 6;                // задержка между кадрами анимации
window.GOLEM_FRAME_WIDTH = 90;               // ширина кадра спрайта голема
window.GOLEM_FRAME_HEIGHT = 52;              // высота кадра спрайта голема
window.GOLEM_ANIM_FRAMES = 10;               // количество кадров в анимации ходьбы
window.GOLEM_VISUAL_SCALE = 1.4;             // масштаб отрисовки голема (увеличение)
window.GOLEM_SIZE_OFFSET_Y = 26;             // смещение по Y для центровки
window.GOLEM_DIE_FRAME_DELAY = 5;            // скорость анимации смерти
window.GOLEM_DIE_FRAME_WIDTH = 90;           // ширина кадра анимации смерти
window.GOLEM_DIE_FRAME_HEIGHT = 40;          // высота кадра анимации смерти
window.GOLEM_DIE_FRAMES_TOTAL = 10;          // количество кадров в анимации смерти

// --- Настройки обычной башни (Tower) ---
window.TOWER_RANGE = 100;                    // дальность стрельбы башни
window.TOWER_FIRE_RATE = 45;                 // интервал между выстрелами (в кадрах)
window.TOWER_SHOTS_LEFT = 50;                // количество выстрелов до исчезновения башни
window.TOWER_SHOT_SOUND_EVERY_N = 3;         // играть звук каждого N-го выстрела
window.TOWER_DRAW_SIZE = 52;                 // размер отрисовки башни (52x52)

// --- Настройки обычной пули (Bullet) ---
window.BULLET_SPEED = 4;                     // скорость полёта пули
window.BULLET_RADIUS = 3;                    // радиус отрисовки пули
window.BULLET_COLOR = 'black';               // цвет обычной пули
window.BULLET_DAMAGE = 1;                    // урон пули по мобу

// --- Настройки пули голема (GolemBullet) ---
window.GOLEM_BULLET_SPEED = 5;               // скорость пули голема
window.GOLEM_BULLET_RADIUS = 6;              // радиус отрисовки пули голема
window.GOLEM_BULLET_COLOR = 'yellow';        // цвет пули голема
window.GOLEM_BULLET_TOWER_KILLCOUNT_DELTA = 1; // на сколько уменьшать killCount башни при попадании
