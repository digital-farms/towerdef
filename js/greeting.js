// js/greeting.js
(function(){
  const canvas = document.getElementById('greetingCanvas');
  const ctx = canvas.getContext('2d');
  let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize(){
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Sprite load
  const spriteImg = new Image();
  spriteImg.src = window.GREETING_SPRITE_URL || 'gift_towers_assets/helloMonster_ava.png';

  // Queue of greetings
  const queue = [];
  let lastShownAt = 0;
  let current = null; // { user, avatarImg, t0, phaseDur: {in,hold,out} }

  function now(){ return performance.now(); }

  function scheduleShow(item){
    // Throttle
    const minInt = Number(window.GREETING_MIN_INTERVAL_MS || 800);
    const t = now();
    if (current || (t - lastShownAt) < minInt){
      if (queue.length < (window.GREETING_QUEUE_LIMIT || 20)) queue.push(item);
      return;
    }
    startShow(item);
  }

  function startShow(item){
    const fadeIn = Number(window.GREETING_FADE_IN_MS || 500);
    const hold = Number(window.GREETING_HOLD_MS || 1500);
    const fadeOut = Number(window.GREETING_FADE_OUT_MS || 1000);
    current = { ...item, t0: now(), phaseDur: { fadeIn, hold, fadeOut } };
  }

  function tick(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (current){
      const t = now() - current.t0;
      const { fadeIn, hold, fadeOut } = current.phaseDur;
      const total = fadeIn + hold + fadeOut;
      let alpha = 1;
      if (t < fadeIn) alpha = t / fadeIn;
      else if (t < fadeIn + hold) alpha = 1;
      else if (t < total) alpha = 1 - (t - fadeIn - hold) / fadeOut;
      else {
        lastShownAt = now();
        current = null;
        // next from queue
        if (queue.length){
          const next = queue.shift();
          // ensure throttle gap
          const left = Math.max(0, (window.GREETING_MIN_INTERVAL_MS||800) - (now() - lastShownAt));
          if (left > 0) setTimeout(()=>startShow(next), left); else startShow(next);
        }
        requestAnimationFrame(tick);
        return;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const drawAvatar = () => {
        if (!current.avatarImg) return;
        const cx = Number(window.GREETING_AVATAR_CX || 210);
        const cy = Number(window.GREETING_AVATAR_CY || 210);
        const rx = Math.max(1, Number(window.GREETING_AVATAR_RX || 42));
        const ry = Math.max(1, Number(window.GREETING_AVATAR_RY || 42));
        ctx.save();
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
        else ctx.arc(cx, cy, Math.min(rx, ry), 0, Math.PI*2);
        ctx.closePath();
        ctx.clip();
        const diameter = Math.max(rx*2, ry*2);
        const size = Math.max(diameter*1.2, 100);
        ctx.drawImage(current.avatarImg, cx - size/2, cy - size/2, size, size);
        ctx.restore();
      };

      const drawSprite = () => {
        if (!(spriteImg.complete && spriteImg.naturalWidth > 0)) return;
        const sx = Number(window.GREETING_SPRITE_X || 100);
        const sy = Number(window.GREETING_SPRITE_Y || 100);
        const sc = Number(window.GREETING_SPRITE_SCALE || 1);
        const w = spriteImg.naturalWidth * sc;
        const h = spriteImg.naturalHeight * sc;
        ctx.drawImage(spriteImg, sx, sy, w, h);
      };

      // Order depends on GREETING_AVATAR_ON_TOP
      const onTop = !!window.GREETING_AVATAR_ON_TOP;
      if (onTop) { drawSprite(); drawAvatar(); } else { drawAvatar(); drawSprite(); }

      // Avatar ring (always on top)
      if (window.GREETING_AVATAR_RING_ENABLED){
        const cx = Number(window.GREETING_AVATAR_CX || 210);
        const cy = Number(window.GREETING_AVATAR_CY || 210);
        const rx = Math.max(1, Number(window.GREETING_AVATAR_RX || 42)) + Number(window.GREETING_AVATAR_RING_RX_DELTA||0);
        const ry = Math.max(1, Number(window.GREETING_AVATAR_RY || 42)) + Number(window.GREETING_AVATAR_RING_RY_DELTA||0);
        ctx.save();
        ctx.lineWidth = Number(window.GREETING_AVATAR_RING_WIDTH || 6);
        ctx.strokeStyle = window.GREETING_AVATAR_RING_COLOR || '#000';
        const shColor = window.GREETING_AVATAR_RING_SHADOW_COLOR || 'transparent';
        const shBlur = Number(window.GREETING_AVATAR_RING_SHADOW_BLUR || 0);
        if (shBlur > 0){ ctx.shadowColor = shColor; ctx.shadowBlur = shBlur; }
        ctx.beginPath();
        if (ctx.ellipse) ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); else ctx.arc(cx, cy, Math.min(rx, ry), 0, Math.PI*2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Draw text with colored name
      const template = (window.GREETING_TEXT || 'Hello {name}!');
      const nameStr = String(current.user || '');
      const parts = template.split('{name}');
      const pre = parts[0] || '';
      const post = (parts.length > 1) ? parts.slice(1).join('{name}') : '';
      const tx = Number(window.GREETING_TEXT_X || 360);
      const ty = Number(window.GREETING_TEXT_Y || 200);
      const maxW = Number(window.GREETING_TEXT_MAX_WIDTH || 500);
      const font = window.GREETING_TEXT_FONT || 'bold 36px Arial';
      const align = (window.GREETING_TEXT_ALIGN || 'left');
      const fill = window.GREETING_TEXT_FILL || '#fff';
      const stroke = window.GREETING_TEXT_STROKE || '#000';
      const strokeW = Number(window.GREETING_TEXT_STROKE_WIDTH || 6);
      const nameFill = window.GREETING_NAME_FILL || fill;
      const nameStroke = window.GREETING_NAME_STROKE || stroke;
      const nameStrokeW = Number(window.GREETING_NAME_STROKE_WIDTH ?? strokeW);

      ctx.font = font;
      // Подсчёт общей ширины для корректного выравнивания
      const wPre = ctx.measureText(pre).width;
      const wName = ctx.measureText(nameStr).width;
      const wPost = ctx.measureText(post).width;
      const totalW = wPre + wName + wPost;
      let startX = tx;
      if (align === 'center') startX = tx - totalW / 2;
      else if (align === 'right') startX = tx - totalW;
      // Рисуем по сегментам
      let cursor = startX;
      // pre
      if (pre){
        ctx.lineWidth = strokeW; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
        ctx.strokeText(pre, cursor, ty, maxW);
        ctx.fillText(pre, cursor, ty, maxW);
        cursor += wPre;
      }
      // name (отдельные цвета)
      if (nameStr){
        ctx.lineWidth = nameStrokeW; ctx.strokeStyle = nameStroke; ctx.fillStyle = nameFill;
        ctx.strokeText(nameStr, cursor, ty, maxW);
        ctx.fillText(nameStr, cursor, ty, maxW);
        cursor += wName;
      }
      // post
      if (post){
        ctx.lineWidth = strokeW; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
        ctx.strokeText(post, cursor, ty, maxW);
        ctx.fillText(post, cursor, ty, maxW);
      }

      ctx.restore();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // WS client (same-origin)
  function connectWS(){
    try{
      const proto = (location.protocol === 'https:') ? 'wss' : 'ws';
      const url = `${proto}://${location.host}`;
      const ws = new WebSocket(url);
      ws.addEventListener('message', (ev) => {
        try{
          const data = JSON.parse(ev.data);
          if (data && data.type === 'viewer_join'){
            pushJoin(data.user, data.avatar);
          } else if (data && data.level === 'raw' && typeof data.message === 'string'){
            // в случае, если летит сырой JSON строкой внутри data.message
            try {
              const parsed = JSON.parse(data.message);
              if (parsed && parsed.event_type === 'JOIN' && parsed.payload && parsed.payload.user){
                pushJoin(parsed.payload.user, parsed.payload.avatar || null);
              }
            } catch {}
          } else if (data && data.eventType === 'JOIN' && data.payload){
            // другой возможный формат прокси
            pushJoin(String(data.payload.user||''), data.payload.avatar||null);
          }
        }catch(e){ console.warn('[greeting] WS parse error', e); }
      });
      ws.addEventListener('error', ()=>{ /* ignore, page stays idle */ });
    }catch(e){ /* ignore */ }
  }
  connectWS();

  // Helpers
  function loadImage(url){
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function pushJoin(user, avatarUrl){
    if (!window.GREETING_ENABLED) return;
    const item = { user: String(user||'') };
    let img = null;
    if (avatarUrl) img = await loadImage(avatarUrl);
    if (!img && window.GREETING_FALLBACK_AVATAR_URL){
      img = await loadImage(window.GREETING_FALLBACK_AVATAR_URL);
    }
    item.avatarImg = img;
    scheduleShow(item);
  }

  // Expose mock for local testing
  window.__mockJoin = (name, url) => pushJoin(name, url);
})();
