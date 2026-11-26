/* =====================================================================
   심연의 대장간 — 60fps 캔버스 아레나 (arena.js, v4)
   다수 몹 · 3인 파티 · 광역기 · 타격감(히트플래시/넉백/화면흔들림/드롭)
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;

  const A = {};
  let canvas = null;
  let ctx = null;
  let W = 1, H = 1, dpr = 1;
  let raf = 0;
  let running = false;
  let last = 0;
  let frames = 0, fpsT = 0, fps = 60;
  let ro = null;
  let particles = [];        // 배경 불씨
  let stageTint = { sky: ["#0f0d16", "#241d2e"], ground: "#1a1622" };
  let worldAccent = "#c9a24a";
  let time = 0;

  const SRC = {
    hero: "assets/hero.png",
    fiend: "assets/monster-fiend.png",
    undead: "assets/monster-undead.png",
    demon: "assets/boss-demon.png",
    dragon: "assets/boss-dragon.png",
    knight: "assets/boss-knight.png",
    bg: "assets/arena-bg.jpg"
  };
  const IMG = {};
  const WHITE = {};          // 흰 실루엣 캐시 (히트플래시)
  const TINT = {};           // 몬스터별 색 변주 캐시
  const RATIO = {};          // 이미지 가로/세로

  function loadImages() {
    Object.keys(SRC).forEach((k) => {
      const im = new Image();
      im.decoding = "async";
      im.src = SRC[k];
      im.onload = () => {
        IMG[k] = im;
        RATIO[k] = im.width / Math.max(1, im.height);
      };
      im.onerror = () => { IMG[k] = null; };
    });
  }

  /* ---------- 유틸 ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  function hashHue(id) {
    let h = 0;
    for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 360;
    return h;
  }

  function silhouette(img) {
    if (!img) return null;
    if (WHITE[img.src]) return WHITE[img.src];
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, c.width, c.height);
    WHITE[img.src] = c;
    return c;
  }

  function tinted(img, key, filter) {
    if (!img) return null;
    const k = img.src + "|" + key;
    if (TINT[k]) return TINT[k];
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    try { x.filter = filter; } catch (e) {}
    x.drawImage(img, 0, 0);
    TINT[k] = c;
    return c;
  }

  function artKeyForMob(m) {
    if (m.boss) {
      if (m.kind === "dragon" || m.kind === "whale" || m.kind === "turtle") return "dragon";
      if (m.kind === "knight" || m.kind === "crowned" || m.kind === "queen") return "knight";
      if (m.kind === "ghost") return "undead";
      return "demon";
    }
    if (m.kind === "ghost" || m.kind === "bat" || m.kind === "shadowknight") return "undead";
    return "fiend";
  }

  function mobImage(m) {
    const key = artKeyForMob(m);
    const img = IMG[key];
    if (!img) return null;
    const h = hashHue(m.id);
    const filt = "hue-rotate(" + Math.round((h - 180) * 0.55) + "deg) saturate(" + (0.95 + (h % 25) / 100).toFixed(2) + ") brightness(" + (m.boss ? 1.02 : 0.98) + ")";
    return tinted(img, m.id + (m.boss ? "_b" : ""), filt);
  }

  /* ---------- 좌표 ---------- */
  function unitScale() {
    return clamp(Math.min(W / 100, H / 58), 2.2, 7.6);
  }
  function proj(x, y) {
    const padX = W * 0.045;
    const topY = H * 0.11;
    const sx = padX + (x / 100) * (W - padX * 2);
    const sy = topY + (y / 100) * (H - topY);
    const depth = 0.66 + (y / 100) * 0.46;
    return { x: sx, y: sy, s: depth };
  }
  function mobHeight(m, s) {
    const U = unitScale();
    return (m.boss ? 32 : 15.4) * U * s;
  }
  function unitHeight(u, s) {
    const U = unitScale();
    return (u.kind === "hero" ? 18.5 : 16.8) * U * s;
  }

  /* ---------- 그리기 ---------- */
  function resize() {
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    W = Math.max(180, r.width);
    H = Math.max(140, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedParticles() {
    particles = [];
    const n = 26;
    for (let i = 0; i < n; i++) {
      particles.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 2.1), vy: rnd(-16, -4), vx: rnd(-4, 4), a: rnd(0.12, 0.5) });
    }
  }

  function drawBackground(dt) {
    ctx.clearRect(0, 0, W, H);
    const bg = IMG.bg;
    if (bg) {
      const ir = bg.width / bg.height;
      const cr = W / H;
      let dw = W, dh = H, dx = 0, dy = 0;
      if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; }
      else { dw = W; dh = W / ir; dy = (H - dh) / 2; }
      ctx.globalAlpha = 0.9;
      ctx.drawImage(bg, dx, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
    // 세계 색조
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hexA(stageTint.sky[0], 0.86));
    g.addColorStop(0.5, hexA(stageTint.sky[1], 0.62));
    g.addColorStop(1, hexA("#05040a", 0.88));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 달 (혈월)
    const mx = W * 0.5, my = H * 0.085, mr = Math.min(W, H) * 0.042;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.4);
    mg.addColorStop(0, "rgba(255,170,150,0.20)");
    mg.addColorStop(0.4, "rgba(190,60,70,0.10)");
    mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 3.4, 0, Math.PI * 2); ctx.fill();
    const mdisk = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.25, mr * 0.15, mx, my, mr);
    mdisk.addColorStop(0, "rgba(255,214,186,0.82)");
    mdisk.addColorStop(0.55, "rgba(214,120,110,0.62)");
    mdisk.addColorStop(1, "rgba(120,40,50,0.30)");
    ctx.fillStyle = mdisk;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();

    // 지면 룬
    const gy = H * 0.72;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(W * 0.5, gy);
    ctx.scale(1, 0.34);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(W, H) * (0.46 - i * 0.12), 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "rgba(255,90,90,0.13)" : hexA(worldAccent, 0.14);
      ctx.lineWidth = 2;
      ctx.setLineDash(i === 0 ? [14, 18] : [3, 13]);
      ctx.lineDashOffset = time * (i === 0 ? 26 : -18);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // 불씨
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin((time + i) * 1.4) * 0.2;
      if (p.y < -6) { p.y = H + 6; p.x = rnd(0, W); }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255," + (150 + (i % 5) * 16) + ",110," + p.a + ")";
      ctx.fill();
    }
    ctx.restore();

    // 바닥 그라데이션
    const fg = ctx.createLinearGradient(0, H * 0.55, 0, H);
    fg.addColorStop(0, "rgba(0,0,0,0)");
    fg.addColorStop(1, hexA(stageTint.ground || "#141020", 0.55));
    ctx.fillStyle = fg;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
  }

  function hexA(hex, a) {
    if (!hex) return "rgba(0,0,0," + a + ")";
    if (hex[0] !== "#") return hex;
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function drawShadow(x, y, w) {
    const ctx2 = ctx;
    ctx2.save();
    ctx2.globalAlpha = 0.42;
    ctx2.fillStyle = "#000";
    ctx2.beginPath();
    ctx2.ellipse(x, y, w * 0.46, w * 0.15, 0, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();
  }

  function drawZones(b) {
    const zones = (b.zones || []).filter((z) => z.t > 0);
    zones.forEach((z) => {
      const p = 1 - z.t / z.total;           // 0 → 1 (차오름)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (z.kind === "circle") {
        const c = proj(z.x, z.y);
        const rx = z.r * (W / 100);
        const ry = rx * 0.42;
        const g = ctx.createRadialGradient(c.x, c.y, ry * 0.1, c.x, c.y, ry);
        g.addColorStop(0, "rgba(255,70,60," + (0.24 + p * 0.34) + ")");
        g.addColorStop(0.72, "rgba(255,50,40," + (0.16 + p * 0.3) + ")");
        g.addColorStop(1, "rgba(255,40,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * (0.35 + p * 0.65), ry * (0.35 + p * 0.65), 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,120,90," + (0.5 + p * 0.45) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * p, ry * p, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        const a = proj(z.x1, z.y1), bpt = proj(z.x2, z.y2);
        const dx = bpt.x - a.x, dy = bpt.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const halfW = Math.max(7, (z.w / 100) * W * 0.5);
        ctx.fillStyle = "rgba(255,60,50," + (0.16 + p * 0.3) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x + nx * halfW, a.y + ny * halfW);
        ctx.lineTo(bpt.x + nx * halfW, bpt.y + ny * halfW);
        ctx.lineTo(bpt.x - nx * halfW, bpt.y - ny * halfW);
        ctx.lineTo(a.x - nx * halfW, a.y - ny * halfW);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,140,100,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * halfW, a.y + ny * halfW);
        ctx.lineTo(bpt.x + nx * halfW, bpt.y + ny * halfW);
        ctx.moveTo(a.x - nx * halfW, a.y - ny * halfW);
        ctx.lineTo(bpt.x - nx * halfW, bpt.y - ny * halfW);
        ctx.stroke();
        // 진행 웨이브
        ctx.fillStyle = "rgba(255,90,70," + (0.34 * p + 0.06) + ")";
        ctx.beginPath();
        ctx.moveTo(a.x + nx * halfW, a.y + ny * halfW);
        ctx.lineTo(a.x + dx * p + nx * halfW, a.y + dy * p + ny * halfW);
        ctx.lineTo(a.x + dx * p - nx * halfW, a.y + dy * p - ny * halfW);
        ctx.lineTo(a.x - nx * halfW, a.y - ny * halfW);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawMob(b, m) {
    const p = proj(m.x, m.y);
    const s = p.s;
    if (m.dead) {
      const k = clamp(m.deadT / 0.34, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(p.x, p.y);
      ctx.scale(1 + (1 - k) * 0.35, k);
      const h = mobHeight(m, s);
      const img = mobImage(m);
      const w = (RATIO[artKeyForMob(m)] || 0.8) * h;
      drawShadow(0, 0, w);
      if (img) ctx.drawImage(img, -w / 2, -h, w, h);
      ctx.restore();
      return;
    }
    const h = mobHeight(m, s) * (m.spawnT > 0 ? (1 - m.spawnT / 0.42) * 0.4 + 0.6 : 1);
    const img = mobImage(m);
    const w = (RATIO[artKeyForMob(m)] || 0.8) * h;
    drawShadow(p.x, p.y, w);

    // 지배자 오라
    if (m.boss) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y - h * 0.45, 0, p.x, p.y - h * 0.45, h * 0.75);
      g.addColorStop(0, hexA(m.color2, 0.28));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - h * 0.45, h * 0.7, h * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const bob = Math.sin(time * (m.boss ? 3.4 : 6.2) + m.uid) * (m.moving ? 2.4 : 1.1);
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (m.face < 0) ctx.scale(-1, 1);
    if (img) {
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (m.flash > 0) {
        const wm = silhouette(img);
        if (wm) {
          ctx.globalAlpha = clamp(m.flash / 0.13, 0, 1) * 0.92;
          ctx.drawImage(wm, -w / 2, -h, w, h);
          ctx.globalAlpha = 1;
        }
      }
    } else {
      ctx.fillStyle = m.color || "#553";
      ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.4, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.color2 || "#f88";
      ctx.beginPath(); ctx.arc(-w * 0.13, -h * 0.55, 2.2, 0, Math.PI * 2); ctx.arc(w * 0.13, -h * 0.55, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 체력 바 (피해를 입은 경우)
    if (!m.boss && m.hp < m.maxHp) {
      const bw = Math.max(22, w * 0.7), bh = 3.2;
      const bx = p.x - bw / 2, by = p.y - h - 9;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = m.hp / m.maxHp > 0.5 ? "#7dffb0" : m.hp / m.maxHp > 0.22 ? "#ffd166" : "#ff5a6e";
      ctx.fillRect(bx, by, bw * clamp(m.hp / m.maxHp, 0, 1), bh);
    }
    if (m.shield) {
      ctx.save();
      ctx.strokeStyle = "rgba(140,190,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - h * 0.5, w * 0.62, h * 0.58, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawUnit(b, u, isLeader) {
    const p = proj(u.x, u.y);
    const s = p.s;
    const h = unitHeight(u, s);
    let img = IMG.hero;
    if (img && u.kind === "ally") {
      const filt = u.partyId === "knight"
        ? "hue-rotate(190deg) saturate(1.15) brightness(1.12)"
        : "hue-rotate(-28deg) saturate(1.65) brightness(1.2)";
      img = tinted(img, "ally_" + u.partyId, filt);
    }
    const w = (RATIO.hero || 0.58) * h;

    if (!u.alive) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.translate(p.x, p.y);
      ctx.rotate(-0.35);
      if (img) ctx.drawImage(img, -w / 2, -h * 0.72, w, h * 0.72);
      ctx.restore();
      // 부활 게이지
      ctx.strokeStyle = "rgba(160,200,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 6, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(1 - u.downT / (u.kind === "hero" ? 5.5 : 7.5), 0, 1));
      ctx.stroke();
      return;
    }

    drawShadow(p.x, p.y, w);
    // 파티 유닛 뒤 광휘 (어두운 배경에서 실루엣 분리)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const lg = ctx.createRadialGradient(p.x, p.y - h * 0.45, 0, p.x, p.y - h * 0.45, h * 0.62);
    lg.addColorStop(0, isLeader ? "rgba(255,214,150,0.20)" : hexA(u.color, 0.14));
    lg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - h * 0.45, h * 0.5, h * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 파티 색 링
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = isLeader ? "rgba(255,216,140,0.85)" : hexA(u.color, 0.55);
    ctx.lineWidth = isLeader ? 2.4 : 1.6;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, w * (isLeader ? 0.42 : 0.34), w * (isLeader ? 0.15 : 0.12), 0, 0, Math.PI * 2);
    ctx.stroke();
    if (u.iframe > 0.05) {
      ctx.strokeStyle = "rgba(160,220,255,0.5)";
      ctx.beginPath(); ctx.ellipse(p.x, p.y - h * 0.4, w * 0.6, h * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    const bob = Math.sin(time * (isLeader ? 5.2 : 4.4) + (u.partyId ? u.partyId.length : 1)) * (u.moving ? 2.2 : 1);
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    // 스윙 시 살짝 앞으로
    const lunge = u.swing > 0 ? (0.26 - u.swing) / 0.26 : 0;
    ctx.translate(u.face * lunge * 5, 0);
    if (u.face < 0) ctx.scale(-1, 1);
    if (img) {
      ctx.drawImage(img, -w / 2, -h, w, h);
      if (u.hitFlash > 0) {
        const wm = silhouette(img);
        if (wm) {
          ctx.globalAlpha = clamp(u.hitFlash / 0.22, 0, 1) * 0.85;
          ctx.drawImage(wm, -w / 2, -h, w, h);
          ctx.globalAlpha = 1;
        }
      }
    } else {
      ctx.fillStyle = u.color;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.28, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // 무기 궤적
    if (u.swing > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = isLeader ? "rgba(255,235,200,0.75)" : hexA(u.color, 0.6);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      const ang = u.aim;
      const r = u.range * (W / 100) * 0.9;
      ctx.arc(p.x, p.y - h * 0.42, r * 0.62, ang - 0.8, ang + 0.85);
      ctx.stroke();
      ctx.restore();
    }

    // 리더 표식
    if (isLeader) {
      ctx.save();
      ctx.fillStyle = "rgba(255,216,140,0.95)";
      ctx.font = "700 " + Math.max(8, W * 0.021) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("▼", p.x, p.y - h - 6);
      ctx.restore();
    }
    if (u.kind === "ally") {
      ctx.save();
      ctx.font = "700 " + Math.max(8, W * 0.019) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = hexA(u.color, 0.9);
      ctx.fillText(u.name, p.x, p.y + Math.max(10, h * 0.02 + 10));
      ctx.restore();
    }
    // 유닛 체력
    const bw = Math.max(24, w * 0.8), bh = 3;
    const bx = p.x - bw / 2, by = p.y - h - 5;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = u.kind === "hero" ? "#ff8a94" : "#8fd6ff";
    ctx.fillRect(bx, by, bw * clamp(u.hp / u.maxHp, 0, 1), bh);
  }

  function drawShots(b) {
    b.shots.forEach((s) => {
      const p = proj(s.x, s.y);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
      g.addColorStop(0, "rgba(255,220,150,0.95)");
      g.addColorStop(0.4, hexA(s.color || "#ff9a5c", 0.75));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function drawDrops(b) {
    b.drops.forEach((d) => {
      const p = proj(d.x, d.y);
      const lift = d.state === "scatter" ? Math.sin(clamp(d.t / 0.45, 0, 1) * Math.PI) * 10 : 0;
      ctx.save();
      if (d.kind === "gold") {
        ctx.fillStyle = "#ffd166";
        ctx.beginPath(); ctx.arc(p.x, p.y - lift - 3, d.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(120,80,20,0.8)"; ctx.lineWidth = 1; ctx.stroke();
      } else if (d.kind === "stone") {
        ctx.fillStyle = "#8fd6ff";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - lift - 8);
        ctx.lineTo(p.x + d.r, p.y - lift - 4);
        ctx.lineTo(p.x, p.y - lift);
        ctx.lineTo(p.x - d.r, p.y - lift - 4);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillStyle = "#c58bff";
        ctx.beginPath(); ctx.arc(p.x, p.y - lift - 5, d.r * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFx(b) {
    b.fxs.forEach((f) => {
      const k = 1 - f.life / f.max;          // 0 → 1
      const alpha = 1 - k;
      const p = proj(f.x, f.y);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (f.type === "slash" || f.type === "arc") {
        const r = (f.r || 14) * (W / 100) * (0.55 + k * 0.55);
        ctx.strokeStyle = hexA(f.color || "#ffd0d8", alpha * 0.85);
        ctx.lineWidth = (f.type === "arc" ? 5 : 3.4) * (1 - k * 0.6);
        ctx.beginPath();
        const half = f.half || 1.1;
        ctx.arc(p.x, p.y - 10, r, f.ang - half, f.ang + half);
        ctx.stroke();
        if (f.wide) {
          ctx.strokeStyle = hexA("#ffffff", alpha * 0.5);
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 10, r * 0.8, f.ang - half * 0.9, f.ang + half * 0.9);
          ctx.stroke();
        }
      } else if (f.type === "nova" || f.type === "ring" || f.type === "burst") {
        const r = (f.r || 20) * (W / 100) * (0.3 + k);
        ctx.strokeStyle = hexA(f.color || "#ff5a6e", alpha * 0.8);
        ctx.lineWidth = 4 * (1 - k * 0.7);
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        if (f.type === "burst") {
          ctx.fillStyle = hexA(f.color || "#ff9a5c", alpha * 0.35);
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, r * 0.7, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        }
      } else if (f.type === "meteor") {
        const r = (f.r || 30) * (W / 100);
        // 낙하 궤적
        const dropY = p.y - (1 - k) * H * 0.85;
        const grd = ctx.createLinearGradient(p.x, dropY - H * 0.3, p.x, dropY);
        grd.addColorStop(0, "rgba(200,140,255,0)");
        grd.addColorStop(1, hexA(f.color, 0.85));
        ctx.strokeStyle = grd;
        ctx.lineWidth = 8 * (1 - k * 0.5);
        ctx.beginPath(); ctx.moveTo(p.x, dropY - H * 0.3); ctx.lineTo(p.x, dropY); ctx.stroke();
        // 착탄
        if (k > 0.45) {
          const kk = (k - 0.45) / 0.55;
          ctx.fillStyle = "rgba(255,200,120," + (0.5 * (1 - kk)) + ")";
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (0.6 + kk * 1.1), r * 0.45 * (0.6 + kk), 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,235,190," + (0.8 * (1 - kk)) + ")";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r * (0.7 + kk * 1.4), r * 0.5 * (0.7 + kk), 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (f.type === "ult") {
        const r = (f.r || 42) * (W / 100) * (0.35 + k * 1.15);
        const g = ctx.createRadialGradient(p.x, p.y - 16, 0, p.x, p.y - 16, r);
        g.addColorStop(0, "rgba(255,250,225," + alpha * 0.5 + ")");
        g.addColorStop(0.45, hexA(f.color, alpha * 0.28));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, r, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,242,208," + alpha * 0.65 + ")";
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, r * 0.92, r * 0.58, 0, 0, Math.PI * 2); ctx.stroke();
        // 연계 참격선
        for (let i = 0; i < 3; i++) {
          const a0 = (i * Math.PI) / 3 + k * 0.8;
          ctx.strokeStyle = "rgba(255,235,190," + alpha * 0.5 + ")";
          ctx.lineWidth = 2.4 * (1 - k);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a0) * r * 0.15, p.y - 12 + Math.sin(a0) * r * 0.1);
          ctx.lineTo(p.x + Math.cos(a0) * r * 1.25, p.y - 12 + Math.sin(a0) * r * 0.78);
          ctx.stroke();
        }
      } else if (f.type === "spark") {
        const p2 = proj(f.x, f.y);
        ctx.fillStyle = hexA(f.color, alpha);
        ctx.beginPath(); ctx.arc(p2.x, p2.y - 8, f.size * (0.6 + alpha * 0.8), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFloats(b) {
    b.floats.forEach((f) => {
      const p = proj(f.x, f.y);
      const k = 1 - f.life / f.max;
      const pop = k < 0.18 ? 0.7 + (k / 0.18) * 0.45 : 1;
      const alpha = f.life < 0.25 ? f.life / 0.25 : 1;
      const size = f.size * clamp(W / 390, 0.85, 1.6) * pop;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "900 " + size.toFixed(1) + "px 'Gothic A1', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = Math.max(2, size * 0.22);
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(f.text, p.x, p.y - 18);
      if (f.crit) {
        const g = ctx.createLinearGradient(p.x, p.y - 40, p.x, p.y);
        g.addColorStop(0, "#fff6d0");
        g.addColorStop(1, "#ffb03a");
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = f.color;
      }
      ctx.fillText(f.text, p.x, p.y - 18);
      ctx.restore();
    });
  }

  function drawBossBar(b) {
    const boss = b.boss;
    if (!boss || boss.dead) return;
    const w = Math.min(W * 0.58, 380);
    const x = (W - w) / 2, y = H * 0.115;
    ctx.save();
    ctx.fillStyle = "rgba(6,4,10,0.7)";
    ctx.fillRect(x, y, w, 10);
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, "#7a1620");
    g.addColorStop(0.5, "#e0404f");
    g.addColorStop(1, "#ffb03a");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * pct, 10);
    ctx.strokeStyle = "rgba(255,214,150,0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 9);
    ctx.font = "700 " + Math.max(10, W * 0.026) + "px 'Gothic A1', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9c9";
    ctx.fillText("👑 " + boss.name + (boss.shield ? "  🛡" : "") + (boss.enraged ? "  🔥격노" : ""), W / 2, y - 5);
    ctx.restore();
  }

  function draw(dt) {
    if (!ctx) return;
    const b = G.battle;
    ctx.save();
    const sh = b ? b.shake : 0;
    if (sh > 0.2) ctx.translate(rnd(-sh, sh) * 0.45, rnd(-sh, sh) * 0.45);
    drawBackground(dt);
    if (b) {
      drawZones(b);
      const list = [];
      b.mobs.forEach((m) => list.push({ y: m.y, kind: "mob", ref: m }));
      b.units.forEach((u, i) => list.push({ y: u.y + 0.2, kind: "unit", ref: u, leader: i === b.leaderIdx }));
      list.sort((a, c) => a.y - c.y);
      list.forEach((it) => {
        if (it.kind === "mob") drawMob(b, it.ref);
        else drawUnit(b, it.ref, it.leader);
      });
      drawShots(b);
      drawDrops(b);
      drawFx(b);
      drawFloats(b);
      drawBossBar(b);

      if (b.flash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,220,190," + (b.flash * 0.22) + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      if (b.swapFlash > 0.02) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,230,170," + (b.swapFlash * 0.7) + ")";
        ctx.lineWidth = 6 * b.swapFlash;
        ctx.strokeRect(3, 3, W - 6, H - 6);
        ctx.restore();
      }
    }
    // 비네트
    const vg = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.34, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.68)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ---------- 루프 ---------- */
  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000) || 0.016);
    last = t;
    time += dt;
    frames++;
    fpsT += dt;
    if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    try {
      if (G.battle && !G.battle.over) G.stepBattle(dt);
      draw(dt);
    } catch (e) {
      if (!frame._warned) { frame._warned = true; console.error("[arena]", e); }
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- 외부 API ---------- */
  A.init = function (el) {
    if (!el || !el.getContext) return false;
    canvas = el;
    ctx = canvas.getContext("2d", { alpha: true });
    loadImages();
    resize();
    seedParticles();
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => { resize(); seedParticles(); });
      ro.observe(canvas);
    }
    window.addEventListener("resize", () => { resize(); seedParticles(); });
    // 화면을 직접 눌러도 벤다
    canvas.addEventListener("pointerdown", (e) => {
      if (!G.battle) return;
      e.preventDefault();
      const res = G.arena.attack();
      if (res && res.ok) G.bus.emit("arena:tap", res);
    });
    return true;
  };

  A.start = function () {
    if (running || !ctx) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  A.stop = function () {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  A.resize = resize;
  A.fps = () => fps;
  A.setStage = function (stage) {
    if (!stage) return;
    stageTint = { sky: stage.sky || stageTint.sky, ground: stage.ground || stageTint.ground };
    const w = G.worldById(stage.world);
    const boss = w && G.MONSTERS[w.boss];
    worldAccent = (boss && boss.color2) || "#c9a24a";
    resize();
  };
  A.W = () => W;
  A.H = () => H;
  A.debugInfo = function () {
    const b = G.battle;
    return {
      running, w: Math.round(W), h: Math.round(H), fps,
      mobs: b ? b.mobs.filter((m) => !m.dead).length : 0,
      units: b ? b.units.length : 0,
      floats: b ? b.floats.length : 0,
      images: Object.keys(IMG).filter((k) => IMG[k]).length
    };
  };

  window.Arena = A;
  G.arenaRender = A;
})();
