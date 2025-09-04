# Tower Defense TikTok Integration

**Tower Defense Game с интеграцией TikTok Live**

---

## Быстрый старт

1. **Клонируй репозиторий:**
   ```sh
   git clone https://github.com/digital-farms/towerdef.git
   cd towerdef
   ```
2. **Установи зависимости:**
   ```sh
   npm install
   ```
3. **Настрой переменные окружения (при необходимости):**
   Сервер берёт данные внешнего лайв-источника из ENV. По умолчанию всё уже работает на дефолтных значениях.
   - `TT_SERVER_HOST` — домен внешнего источника событий (по умолчанию `tiktokliveserver.org`)
   - `TT_STREAMER` — ник стримера (по умолчанию `nittaya_asmr`)
   - `TT_TOKEN` — Bearer-токен авторизации (может быть пустым, тогда авторизация не используется)
   - `LIKES_MODE` — режим учёта лайков: `delta` (приращения, по умолчанию) или `cumulative` (накопительно)

   Пример запуска с переменными (Windows PowerShell):
   ```powershell
   set TT_STREAMER=your_streamer; set LIKES_MODE=delta; node server.js
   ```

4. **Запусти сервер:**
   ```sh
   npm start
   ```
   Игра и API будут доступны на http://localhost:8080

5. **(Опционально) Открой доступ через интернет:**
   - Используй [ngrok](https://ngrok.com/), [localtunnel](https://github.com/localtunnel/localtunnel) или [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) для проброса порта.
   - Пример для ngrok:
     ```sh
     ngrok http 8080
     ```
   - Скопируй публичную ссылку и делись с друзьями.

---

## Особенности
- Башни появляются за лайки в TikTok Live
- Ограничение на количество выстрелов башни (50)
- После израсходования выстрелов башня удаляется, а скорость спавна врагов ЧУТЬ УМЕНЬШАЕТСЯ
- Вся логика игры и сервер — на Node.js + WebSocket

---

## Структура проекта
- `index.html` — основной фронтенд (игра, логика, отрисовка)
- `server.js` — сервер, TikTok интеграция, WebSocket
- `package.json` — зависимости
- `*.png`, `*.gif` — ассеты для игры

---

## FAQ
- **Как поменять скорость стрельбы башен?**
  - В `index.html` найди класс `Tower`, поменяй `this.fireRate` в конструкторе.
- **Как поменять зону спавна башен?**
  - Массив `ALLOWED_TOWER_ZONES` в `index.html`.
- **Как добавить новые фичи?**
  - Вся логика открыта, пиши прямо в index.html и server.js.

---

## Архитектура проекта
- `index.html` — фронтенд-игра на Canvas (отрисовка, логика, физика, спавн, звук, управление масштабом, рендер-слои, анимации смерти и т. д.).
- `server.js` — Node.js сервер: раздаёт статику, проксирует и ретранслирует события из внешнего лайв-источника через WebSocket, хранит leaderboard.
- `leaderboard.js` — клиентский модуль топа: считает и отправляет на сервер топ-3 по убийствам, рендерит список с аватарками.
- `leaderboard.html` — вспомогательная страница для отображения серверного Топ-3 (данные с `/api/leaderboard`).
- `sound/` — директория с аудио: `Monster_Roar7.mp3`, `laserShot_basicTower.mp3`, `spawnTower.mp3`.
- Спрайты и ассеты: `map.png`, `base.png`, `turret.png`, `dino_sprite.png`, `Golem_1_walk.png`, `Golem_1_die_1.png`, `explosion_basicMob_2.png`, `gift_towers_assets/*`.

## Конфигурация сервера (`server.js`)
- ENV:
  - `TT_SERVER_HOST` (строка) — домен WS/HTTP источника. Пример: `tiktokliveserver.org`.
  - `TT_STREAMER` (строка) — ник стримера.
  - `TT_TOKEN` (строка) — Bearer-токен; если пусто, запросы идут без заголовка авторизации.
  - `LIKES_MODE` (`delta` | `cumulative`) — интерпретация лайков от источника.
- HTTP:
  - Раздаёт статику из корня проекта.
  - `GET /` — отдаёт `index.html` (игру).
  - `GET /api/leaderboard` — JSON топ-3 с сервера.
- WebSocket:
  - Сервер принимает от клиента сообщения типа `{ type: 'leaderboardUpdate', entries }` и кеширует их как серверный топ.
  - Сервер транслирует в браузер служебные логи внешнего источника `{ type: 'extLog', ... }` (удобно для отладки).
  - Сервер ретранслирует внутриигровые команды спавна башен по событиям `LIKE`/`GIFT` из источника:
    - `GIFT` → `{ type: 'newGiftTower', userId, nickname, avatar, level }` (уровень 1 или 2 в зависимости от `gift_price`).
    - `LIKE` → `{ type: 'newTower', userId, nickname, avatar, likeCount, bonus }` (логика выдачи: 1-я башня на 5 лайков, затем каждые +100 лайков).

## Игровые настройки и баланс (`index.html`)
- __Стартовый спавн обычных мобов__: `let enemySpawnRate = 0.004`.
- __Плотность мобов__: `ENEMY_DENSITY_SCALE = 0.33` — уменьшает частоту спавна и пропорционально повышает HP/урон мобов:
  - Базовые: `BASE_ENEMY_HP = 3`, `BASE_ENEMY_BASE_DAMAGE = 1`.
  - Скалированные: `ENEMY_SCALED_HP`, `ENEMY_SCALED_BASE_DAMAGE` вычисляются из коэффициента плотности.
- __Рост/падение спавнрейта__: при добавлении любой башни `enemySpawnRate += 0.0015` (с верхним лимитом 1.0), при удалении (когда `shotsLeft` исчерпаны) `enemySpawnRate -= 0.0015` (с нижним лимитом 0).
- __Гигант ГОЛЕМ__ (`class GolemEnemy`):
  - HP/скорость/анимации: увеличенный спрайт, полоска HP, анимация смерти из `Golem_1_die_1.png`.
  - Стреляет по башням с кулдауном `fireRate` и визуальными жёлтыми сферами (`GolemBullet`).
  - При появлении проигрывается рык (см. раздел Звук).
  - Условие появления: когда на сцене ≥ 5 башен и в данный момент нет другого голема (`checkGolemSpawn()`).
- __Башни__ (`class Tower`):
  - Радиус 100, `fireRate = 45`, лимит `shotsLeft = 50`, счётчик убийств.
  - Пули обычной башни — чёрные кружки.
  - Звук выстрела с троттлингом и редким воспроизведением (каждый N-й выстрел).
- __Подарочные башни__ (`class GiftAvatarTower`):
  - Уровни и визуальные/боевые параметры в `GIFT_TOWER_LEVELS`:
    - L1: `shotsLeft=150`, `fireRate=45`, `range=100`, обводка аватарки и цвет пули `#0000ff`.
    - L2: `shotsLeft=250`, `fireRate=30`, `range=120`, обводка аватарки и цвет пули `#FF0000`.
  - Цвет пули подхватывается из цвета обводки аватарки (см. `getGiftTowerBulletColor(level)`).
  - Рендер слоями относительно дороги для корректной глубины: башни за дорогой рисуются под врагами, перед дорогой — поверх.
- __Зоны спавна башен зрителей__: массив `ALLOWED_TOWER_ZONES` и запрет размещения на дороге `PATH_FORBIDDEN_RADIUS` с проверкой `isNearPath()`.
- __Рестарт за лайки__: 
  - Порог `RESTART_LIKES_TARGET` (по умолчанию 10).
  - Состояния `gameState: 'running' | 'waitingRestart'`. В режиме ожидания рисуется затемнение и прогресс до рестарта.
  - В режиме ожидания лайки из внешнего источника (события `extLog` типа `LIKE`) переводятся в приращения через хранилище `lastSeenLikesByUser` и учитываются функцией `addRestartLikes()`.
  - База при старте забега сбрасывается до `base.hp = 100` (см. `startGameRun()`), на карте отображается через `drawBase()`.
  - Клик по канвасу спавнит обычную башню только в состоянии `running`; при клике рядом с дорогой позиция сдвигается внутрь разрешённой зоны (`findValidSpawnPos()`).
  - Экран ожидания можно отключить: в `index.html` установите `SHOW_RESTART_OVERLAY = false` или из консоли вызовите `setShowRestartOverlay(false)`.

### Режим рестарта по лайкам / ручной старт
- `USE_LIKES_RESTART = true | false`
  - `true` (по умолчанию): забег стартует только после накопления лайков до `RESTART_LIKES_TARGET`. При смерти базы — переход в `waitingRestart`.
  - `false`: механика лайков отключена; можно запускать забег вручную кнопкой `Start`. При смерти базы происходит мягкая очистка и мгновенный автозапуск нового забега.
- Кнопка `Start` отображается, когда игра не в состоянии `running`.

## Лидерборд (`leaderboard.js` + `index.html`)
- Клиент поддерживает локальный топ-3 по сумме `killCount` у всех башен с аватарками (`AvatarTower`).
- Каждую секунду отправляет на сервер сводку `{ type: 'leaderboardUpdate', entries }`, сервер кэширует и отдаёт `GET /api/leaderboard`.

## Анимации и визуал
- Обычный моб: ходьба с тайлингом 8 кадров; смерть — спрайт-лист `explosion_basicMob_2.png` на 11 кадров, увеличен масштаб взрыва `EXPLOSION_BASIC_SCALE = 1.5`.
- Голем: увеличенный спрайт ходьбы (`visualScale = 1.4`), полоса HP; смерть — 10 кадров из `Golem_1_die_1.png`.

## Звук и громкости (`index.html` + `sound/`)
- Аудио теги:
  - `<audio id="spawnTowerSound" src="sound/spawnTower.mp3" preload="auto">`
  - `<audio id="basicTowerShotSound" src="sound/laserShot_basicTower.mp3" preload="auto">`
  - `<audio id="golemSpawnSound" src="sound/Monster_Roar7.mp3" preload="auto">`
- Константы громкости (0.0–1.0):
  - `SPAWN_TOWER_VOL` — звук появления башни (по умолчанию 0.6)
  - `BASIC_SHOT_VOL` — звук выстрела обычной башни (по умолчанию 0.13)
  - `GOLEM_SPAWN_VOL` — рык при спавне голема (по умолчанию 0.3)
- Троттлинг звука выстрела: `BASIC_SHOT_SOUND_MIN_INTERVAL_MS = 140` + редкое проигрывание по счётчику выстрелов `shotSoundEveryN`.
- Обработчики: `playSpawnTowerSound()`, `playBasicTowerShotSound()`, `playGolemSpawnSound()`.
- Примечание: автоплей в браузерах — первый пользовательский клик может понадобиться для разблокировки звука.

## WebSocket: формат клиентских событий
- От сервера к клиенту:
  - `{ type: 'extLog', level: 'raw' | 'event', ... }` — диагностические сообщения внешнего источника.
  - `{ type: 'newTower', userId, nickname, avatar, likeCount, bonus }` — спавн обычной башни для зрителя.
  - `{ type: 'newGiftTower', userId, nickname, avatar, level }` — спавн подарочной башни L1/L2.
- От клиента к серверу:
  - `{ type: 'leaderboardUpdate', entries: [{ username, avatarImg, score }] }` — обновление топа для `GET /api/leaderboard`.

## Страницы и API
- Игра: `GET /` → `index.html`.
- Топ-3: `GET /api/leaderboard` → JSON, используется `leaderboard.html` в демонстрационных целях.

## Скрипты и зависимости
- Node.js зависимости: `express`, `ws` (см. `package.json`).
- Скрипт запуска: `npm start` (эквивалент `node server.js`).

## Отладка и полезные советы
- В консоли браузера доступны вспомогательные функции:
  - `setRestartTarget(N)` — изменить порог лайков для рестарта.
- Для изменения баланса редактируй константы в начале `index.html` (плотность мобов, громкости звука, стартовый спавн и т. д.).
- Следи за производительностью и звуковым балансом при добавлении новых эффектов.

---

**Енджой епта!**
