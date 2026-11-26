/* =====================================================================
   심연의 대장간 — 대기 연출 (vfx.js)
   캔버스 기반 불씨 · 재 · 안개 · 룬 광휘 · 지배자 아레나 번개
   ===================================================================== */
(function () {
  "use strict";

  const VFX = {};
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let w = 0;
  let h = 0;
  let raf = 0;
  let running = false;
  let boss = false;
  let lastT = 0;
  let flash = 0;
  let flashCd = 3;

  const embers = [];
  const fog = [];
  let runePhase = 0;

  const reduced = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildFog();
  }

  function buildFog() {
    fog.length = 0;
    const n = 4;
    for (let i = 0; i < n; i++) {
      fog.push({
        x: rand(0, w),
        y: rand(h * 0.35, h * 0.92),
        r: rand(h * 0.22, h * 0.5),
        vx: rand(-6, 6),
        vy: rand(-2.4, 1.2),
        a: rand(0.04, 0.11)
      });
    }
  }

  function spawnEmber() {
    embers.push({
      x: rand(0, w),
      y: h + rand(0, 20),
      r: rand(0.7, 2.4),
      vx: rand(-9, 9),
      vy: rand(-38, -14),
      life: 0,
      max: rand(3.2, 8),
      hue: Math.random() < 0.72 ? "warm" : "cold",
      ph: rand(0, Math.PI * 2)
    });
  }

  function drawRune(now) {
    const cx = w * 0.5;
    const baseY = h * 0.86;
    const R = Math.min(w, h) * (boss ? 0.44 : 0.32);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, baseY);
    ctx.scale(1, 0.32);
    runePhase += 0.0035;
    const rot = runePhase;
    for (let ring = 0; ring < 2; ring++) {
      const rr = R * (1 - ring * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.strokeStyle = ring === 0 ? "rgba(255,80,90,0.18)" : "rgba(201,162,74,0.16)";
      ctx.lineWidth = 2;
      ctx.setLineDash(ring === 0 ? [10, 14] : [3, 12]);
      ctx.lineDashOffset = rot * (ring === 0 ? 40 : -26);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // 룬 글자
    const glyphs = 8;
    for (let i = 0; i < glyphs; i++) {
      const a = rot * 2 + (i / glyphs) * Math.PI * 2;
      const gx = Math.cos(a) * R * 0.8;
      const gy = Math.sin(a) * R * 0.8;
      ctx.beginPath();
      ctx.arc(gx, gy, boss ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "rgba(255,90,90,0.5)" : "rgba(255,215,120,0.42)";
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(t) {
    if (!running || !ctx) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;

    ctx.clearRect(0, 0, w, h);

    // 안개
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    fog.forEach((f) => {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -f.r) f.x = w + f.r;
      if (f.x > w + f.r) f.x = -f.r;
      if (f.y < h * 0.2) f.vy = Math.abs(f.vy);
      if (f.y > h) f.vy = -Math.abs(f.vy);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, boss ? `rgba(120,40,60,${f.a})` : `rgba(80,70,120,${f.a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 룬
    drawRune(t);

    // 불씨 · 재
    const maxEmbers = reduced ? 12 : (boss ? 78 : 46);
    if (embers.length < maxEmbers && Math.random() < 0.85) spawnEmber();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life += dt;
      e.ph += dt * 2.2;
      e.x += (e.vx + Math.sin(e.ph) * 8) * dt;
      e.y += e.vy * dt;
      const k = e.life / e.max;
      if (k >= 1 || e.y < -20) { embers.splice(i, 1); continue; }
      const alpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      const warm = e.hue === "warm";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - k * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = warm
        ? `rgba(255,${140 + Math.round(70 * (1 - k))},90,${alpha * 0.85})`
        : `rgba(150,190,255,${alpha * 0.6})`;
      ctx.shadowColor = warm ? "rgba(255,120,60,0.9)" : "rgba(140,180,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();

    // 지배자 아레나: 붉은 번개 섬광
    if (boss && !reduced) {
      flashCd -= dt;
      if (flashCd <= 0) { flash = 1; flashCd = rand(2.6, 6.5); }
      if (flash > 0) {
        flash = Math.max(0, flash - dt * 2.4);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.75);
        g.addColorStop(0, `rgba(255,60,70,${0.16 * flash})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        if (Math.random() < 0.4) {
          ctx.strokeStyle = `rgba(255,180,180,${0.5 * flash})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          let x = rand(w * 0.2, w * 0.8);
          ctx.moveTo(x, 0);
          for (let y = 0; y < h * 0.55; y += 14) {
            x += rand(-14, 14);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    raf = requestAnimationFrame(frame);
  }

  VFX.init = function (el) {
    if (!el || !el.getContext) return;
    canvas = el;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    VFX.start();
  };

  VFX.start = function () {
    if (running || !ctx) return;
    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  };

  VFX.stop = function () {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  VFX.setBoss = function (on) {
    boss = !!on;
    if (boss) { flash = 1; flashCd = rand(1.2, 2.4); }
  };

  VFX.isBoss = function () { return boss; };

  VFX.resize = resize;

  window.VFX = VFX;
})();
