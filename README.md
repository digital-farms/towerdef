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
3. **Настрой TikTok:**
   - В файле `server.js` укажи свой TikTok username:
     ```js
     const tiktokUsername = 'ВАШ_ТИКТОК_ЮЗЕРНЕЙМ';
     ```
4. **Запусти сервер:**
   ```sh
   node server.js
   ```
   Сервер будет доступен на http://localhost:8080

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
- После исчезновения башни скорость спавна врагов увеличивается
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

**Удачи и весёлых башен!**
