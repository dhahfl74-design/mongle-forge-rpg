/* =====================================================================
   몽글 대장간 — 아트 (sprites.js)
   말랑한 몽글 생물 SVG 스프라이트 + 성검 일러스트
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;

  const SP = {};

  function eyes(cx, cy, gap, size, mood) {
    const r = size || 4.6;
    const lx = cx - gap;
    const rx = cx + gap;
    let e = `
      <ellipse cx="${lx}" cy="${cy}" rx="${r}" ry="${r + 0.8}" fill="#4a3a30"/>
      <ellipse cx="${rx}" cy="${cy}" rx="${r}" ry="${r + 0.8}" fill="#4a3a30"/>
      <circle cx="${lx + 1.4}" cy="${cy - 1.6}" r="${r * 0.36}" fill="#ffffff"/>
      <circle cx="${rx + 1.4}" cy="${cy - 1.6}" r="${r * 0.36}" fill="#ffffff"/>`;
    if (mood === "happy") {
      e = `
      <path d="M${lx - r} ${cy} q${r} -${r * 1.15} ${r * 2} 0" stroke="#4a3a30" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M${rx - r} ${cy} q${r} -${r * 1.15} ${r * 2} 0" stroke="#4a3a30" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    } else if (mood === "angry") {
      e = `
      <path d="M${lx - r - 2} ${cy - 5} l${r * 2 + 4} 4" stroke="#4a3a30" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M${rx + r + 2} ${cy - 5} l-${r * 2 + 4} 4" stroke="#4a3a30" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="${lx}" cy="${cy + 2}" rx="${r * 0.9}" ry="${r}" fill="#4a3a30"/>
      <ellipse cx="${rx}" cy="${cy + 2}" rx="${r * 0.9}" ry="${r}" fill="#4a3a30"/>`;
    }
    return e;
  }

  function blush(cx, cy, gap, w) {
    const ww = w || 7;
    return `
      <ellipse cx="${cx - gap}" cy="${cy}" rx="${ww}" ry="${ww * 0.55}" fill="#ff9fb0" opacity="0.55"/>
      <ellipse cx="${cx + gap}" cy="${cy}" rx="${ww}" ry="${ww * 0.55}" fill="#ff9fb0" opacity="0.55"/>`;
  }

  function mouth(cx, cy, w) {
    return `<path d="M${cx - w} ${cy} q${w} ${w * 0.85} ${w * 2} 0" stroke="#4a3a30" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }

  /* ---------- 몸통 ---------- */
  function bodyBlob(c1, c2) {
    return `
      <ellipse cx="60" cy="110" rx="34" ry="6" fill="rgba(120,90,70,0.12)"/>
      <path d="M60 22 C88 22 104 44 104 70 C104 96 86 108 60 108 C34 108 16 96 16 70 C16 44 32 22 60 22 Z"
        fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <ellipse cx="44" cy="44" rx="11" ry="7" fill="#ffffff" opacity="0.45" transform="rotate(-22 44 44)"/>`;
  }

  function bodyFluffy(c1, c2) {
    const puffs = [
      [60, 34, 20], [34, 50, 16], [86, 50, 16], [26, 76, 15],
      [94, 76, 15], [40, 94, 15], [80, 94, 15], [60, 84, 22]
    ];
    return `
      <ellipse cx="60" cy="110" rx="36" ry="6" fill="rgba(120,90,70,0.12)"/>
      ${puffs.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>`).join("")}
      <ellipse cx="60" cy="76" rx="27" ry="24" fill="${c1}"/>`;
  }

  function bodyStar(c1, c2) {
    return `
      <ellipse cx="60" cy="110" rx="30" ry="6" fill="rgba(120,90,70,0.12)"/>
      <path d="M60 20 L73 50 L104 54 L81 76 L88 106 L60 90 L32 106 L39 76 L16 54 L47 50 Z"
        fill="${c1}" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  function bodyGhost(c1, c2) {
    return `
      <ellipse cx="60" cy="112" rx="32" ry="6" fill="rgba(120,90,70,0.12)"/>
      <path d="M60 20 C86 20 102 40 102 66 L102 96 Q94 88 86 96 Q78 104 70 96 Q62 88 54 96 Q46 104 38 96 Q30 88 22 96 L22 66 C22 40 34 20 60 20 Z"
        fill="${c1}" stroke="${c2}" stroke-width="3" opacity="0.94"/>`;
  }

  function bodyGolem(c1, c2) {
    return `
      <ellipse cx="60" cy="110" rx="33" ry="6" fill="rgba(120,90,70,0.12)"/>
      <rect x="20" y="36" width="80" height="70" rx="24" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <rect x="30" y="24" width="26" height="18" rx="8" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <rect x="64" y="24" width="26" height="18" rx="8" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <rect x="30" y="48" width="16" height="10" rx="5" fill="#ffffff" opacity="0.32"/>`;
  }

  function bodyWhale(c1, c2) {
    return `
      <ellipse cx="60" cy="112" rx="32" ry="6" fill="rgba(120,90,70,0.12)"/>
      <path d="M22 70 C22 42 40 28 62 28 C88 28 102 46 102 68 C102 94 82 106 58 106 C36 106 22 94 22 70 Z"
        fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <path d="M96 44 q20 -10 18 12 q-10 -6 -18 -2 Z" fill="${c2}"/>
      <circle cx="42" cy="46" r="4" fill="#ffffff" opacity="0.5"/>`;
  }

  function bodyKnight(c1, c2) {
    return `
      <ellipse cx="60" cy="110" rx="32" ry="6" fill="rgba(120,90,70,0.12)"/>
      <path d="M60 24 C84 24 98 42 98 64 L98 96 C98 104 84 108 60 108 C36 108 22 104 22 96 L22 64 C22 42 36 24 60 24 Z"
        fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <path d="M28 52 q32 -16 64 0 l0 16 q-32 -14 -64 0 Z" fill="#5a4a5f" opacity="0.28"/>`;
  }

  /* ---------- 액세서리 ---------- */
  function crown(c1) {
    return `
      <path d="M40 24 L46 10 L54 20 L60 6 L66 20 L74 10 L80 24 Z" fill="#ffe08a" stroke="#e6b23c" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="60" cy="15" r="2.6" fill="#ff8f7a"/>`;
  }
  function earsBunny(c1, c2) {
    return `
      <path d="M42 28 q-8 -26 4 -26 q10 0 8 26 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6"/>
      <path d="M78 28 q8 -26 -4 -26 q-10 0 -8 26 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6"/>
      <path d="M44 26 q-4 -18 2 -18 q6 0 4 18 Z" fill="#ffd6e2"/>
      <path d="M76 26 q4 -18 -2 -18 q-6 0 -4 18 Z" fill="#ffd6e2"/>`;
  }
  function earsCat(c1, c2) {
    return `
      <path d="M34 34 L30 8 L54 24 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M86 34 L90 8 L66 24 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M38 30 L36 16 L48 25 Z" fill="#ffd6e2"/>
      <path d="M82 30 L84 16 L72 25 Z" fill="#ffd6e2"/>`;
  }
  function earsFox(c1, c2) {
    return `
      <path d="M32 36 L24 6 L56 22 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M88 36 L96 6 L64 22 Z" fill="${c1}" stroke="${c2}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M36 31 L31 15 L49 24 Z" fill="#ffd6e2"/>
      <path d="M84 31 L89 15 L71 24 Z" fill="#ffd6e2"/>`;
  }
  function mushroomCap(c1, c2) {
    return `
      <path d="M18 48 q42 -42 84 0 q-42 16 -84 0 Z" fill="${c1}" stroke="${c2}" stroke-width="3"/>
      <circle cx="44" cy="36" r="5" fill="#ffffff" opacity="0.75"/>
      <circle cx="70" cy="30" r="4" fill="#ffffff" opacity="0.75"/>
      <circle cx="60" cy="44" r="3.4" fill="#ffffff" opacity="0.6"/>`;
  }
  function acornCap(c1, c2) {
    return `
      <path d="M22 44 q38 -34 76 0 q-38 14 -76 0 Z" fill="${c2}" stroke="#a07b52" stroke-width="2.6"/>
      <rect x="57" y="10" width="6" height="16" rx="3" fill="#a07b52"/>
      <path d="M38 40 q22 -10 44 0" stroke="#a07b52" stroke-width="2" fill="none"/>`;
  }
  function beeWings(c1) {
    return `
      <ellipse cx="26" cy="46" rx="16" ry="22" fill="#ffffff" opacity="0.62" transform="rotate(-24 26 46)"/>
      <ellipse cx="94" cy="46" rx="16" ry="22" fill="#ffffff" opacity="0.62" transform="rotate(24 94 46)"/>
      <path d="M30 40 q6 -14 14 -18" stroke="#ffffff" stroke-width="0" fill="none"/>
      <path d="M42 26 q-6 -12 2 -14 q6 8 4 14 Z" fill="${c1}"/>
      <path d="M78 26 q6 -12 -2 -14 q-6 8 -4 14 Z" fill="${c1}"/>`;
  }
  function cloudPuffs(c1, c2) {
    return `
      <circle cx="34" cy="56" r="20" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>
      <circle cx="86" cy="56" r="20" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>
      <circle cx="60" cy="40" r="24" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>`;
  }
  function shell(c1, c2) {
    return `
      <path d="M20 74 q0 -36 40 -36 q40 0 40 36 q-40 22 -80 0 Z" fill="${c2}" stroke="${c1}" stroke-width="3"/>
      <path d="M46 46 q-2 20 -8 34 M74 46 q2 20 8 34 M60 40 v42" stroke="${c1}" stroke-width="2.2" fill="none"/>`;
  }
  function batWings(c1) {
    return `
      <path d="M22 54 q-18 -18 -8 -30 q10 8 18 4 q-2 16 -2 26 Z" fill="${c1}" opacity="0.8"/>
      <path d="M98 54 q18 -18 8 -30 q-10 8 -18 4 q2 16 2 26 Z" fill="${c1}" opacity="0.8"/>
      <path d="M52 76 l3 8 l4 -8 Z" fill="#ffffff"/>
      <path d="M61 76 l3 8 l4 -8 Z" fill="#ffffff"/>`;
  }
  function butterflyWings(c1, c2) {
    return `
      <path d="M56 58 q-38 -26 -44 4 q-4 24 22 22 q18 -2 22 -26 Z" fill="${c1}" opacity="0.86" stroke="${c2}" stroke-width="2"/>
      <path d="M64 58 q38 -26 44 4 q4 24 -22 22 q-18 -2 -22 -26 Z" fill="${c1}" opacity="0.86" stroke="${c2}" stroke-width="2"/>
      <circle cx="34" cy="68" r="5" fill="#ffffff" opacity="0.7"/>
      <circle cx="86" cy="68" r="5" fill="#ffffff" opacity="0.7"/>
      <path d="M56 40 q-6 -12 2 -16 M64 40 q6 -12 -2 -16" stroke="${c2}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  function plantLeaves(c1, c2) {
    return `
      <path d="M60 22 q-2 -18 10 -20 q6 12 -2 22 Z" fill="${c1}" stroke="${c2}" stroke-width="2"/>
      <path d="M56 24 q-14 -12 -22 -2 q8 12 22 6 Z" fill="${c1}" stroke="${c2}" stroke-width="2"/>
      <path d="M64 24 q14 -12 22 -2 q-8 12 -22 6 Z" fill="${c1}" stroke="${c2}" stroke-width="2"/>`;
  }
  function queenVeil(c1, c2) {
    return `
      <path d="M30 44 q30 -34 60 0 q-6 46 -30 52 q-24 -6 -30 -52 Z" fill="#ffffff" opacity="0.28"/>
      ${crown(c1)}
      <circle cx="28" cy="60" r="3" fill="#ffffff" opacity="0.9"/>
      <circle cx="92" cy="60" r="3" fill="#ffffff" opacity="0.9"/>`;
  }
  function cookieChips(c1) {
    return `
      <circle cx="40" cy="46" r="4" fill="#7a5236"/>
      <circle cx="72" cy="40" r="3.4" fill="#7a5236"/>
      <circle cx="80" cy="66" r="4" fill="#7a5236"/>
      <circle cx="48" cy="88" r="3.6" fill="#7a5236"/>
      <circle cx="66" cy="94" r="3" fill="#7a5236"/>`;
  }
  function dragonHorns(c1, c2) {
    return `
      <path d="M40 26 q-10 -16 -2 -20 q8 4 8 16 Z" fill="${c2}" stroke="#e0789a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M80 26 q10 -16 2 -20 q-8 4 -8 16 Z" fill="${c2}" stroke="#e0789a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M18 66 q-16 -8 -12 -22 q14 6 16 18 Z" fill="${c1}" opacity="0.7"/>
      <path d="M102 66 q16 -8 12 -22 q-14 6 -16 18 Z" fill="${c1}" opacity="0.7"/>`;
  }
  function fairyBits(c1) {
    return `
      <ellipse cx="24" cy="52" rx="14" ry="20" fill="#ffffff" opacity="0.55" transform="rotate(-20 24 52)"/>
      <ellipse cx="96" cy="52" rx="14" ry="20" fill="#ffffff" opacity="0.55" transform="rotate(20 96 52)"/>
      <ellipse cx="60" cy="14" rx="12" ry="4" fill="#ffe08a" opacity="0.9"/>
      <path d="M96 30 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#fff6c8"/>`;
  }
  function birdWings(c1) {
    return `
      <path d="M28 60 q-24 -6 -20 -28 q18 4 26 20 Z" fill="${c1}" stroke="#e8a86a" stroke-width="2"/>
      <path d="M92 60 q24 -6 20 -28 q-18 4 -26 20 Z" fill="${c1}" stroke="#e8a86a" stroke-width="2"/>
      <path d="M54 26 q6 -18 14 -2" stroke="#e8a86a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M54 74 l-10 6 l10 4 Z" fill="#ffb347"/>`;
  }
  function demonHorns(c1) {
    return `
      <path d="M38 26 q-6 -20 4 -22 q8 6 6 18 Z" fill="#8b6aa8" stroke="#6e4f8a" stroke-width="2"/>
      <path d="M82 26 q6 -20 -4 -22 q-8 6 -6 18 Z" fill="#8b6aa8" stroke="#6e4f8a" stroke-width="2"/>
      <path d="M20 58 q-16 -12 -10 -26 q14 8 14 22 Z" fill="${c1}" opacity="0.6"/>
      <path d="M100 58 q16 -12 10 -26 q-14 8 -14 22 Z" fill="${c1}" opacity="0.6"/>`;
  }

  /* ---------- 조립 ---------- */
  const ACC = {
    blob: () => "",
    crowned: (m) => crown(m.color),
    bunny: (m) => earsBunny(m.color, "#e8b8c8"),
    acorn: (m) => acornCap(m.color, m.color2),
    mushroom: (m) => mushroomCap(m.color, "#e8927c"),
    fluffy: () => "",
    bee: (m) => beeWings(m.color),
    cloud: () => "",
    star: () => "",
    whale: (m) => `<path d="M70 26 q-6 -14 4 -16 q4 10 -4 16 Z" fill="${m.color2}"/>`,
    bat: (m) => batWings(m.color),
    turtle: () => "",
    butterfly: (m) => butterflyWings(m.color, "#b49ce0"),
    plant: (m) => plantLeaves(m.color, "#5fae74"),
    queen: (m) => queenVeil(m.color, "#b49ce0"),
    cat: (m) => earsCat(m.color, "#a08fbf"),
    fox: (m) => earsFox(m.color, "#e8b86a"),
    cookie: (m) => cookieChips(m.color),
    dragon: (m) => dragonHorns(m.color, m.color2),
    fairy: (m) => fairyBits(m.color),
    bird: (m) => birdWings(m.color),
    ghost: () => "",
    knight: () => "",
    demon: (m) => demonHorns(m.color)
  };

  const BODY = {
    fluffy: bodyFluffy,
    star: bodyStar,
    ghost: bodyGhost,
    golem: bodyGolem,
    whale: bodyWhale,
    knight: bodyKnight
  };

  function bodyFor(kind, m) {
    const fn = BODY[kind];
    if (fn) return fn(m.color, m.color2);
    if (kind === "cloud") return bodyBlob(m.color, m.color2) + cloudPuffs(m.color, m.color2);
    if (kind === "turtle") return bodyBlob(m.color, m.color2) + shell(m.color, m.color2);
    if (kind === "bee") return bodyBlob(m.color, m.color2) + `<path d="M40 82 q20 8 40 0" stroke="#c99a3c" stroke-width="3" fill="none" opacity="0.5"/><path d="M44 94 q16 6 32 0" stroke="#c99a3c" stroke-width="3" fill="none" opacity="0.4"/>`;
    return bodyBlob(m.color, m.color2);
  }

  SP.monster = function (mon, opts) {
    opts = opts || {};
    const boss = !!opts.boss || !!mon.boss;
    const mood = boss ? "angry" : "smile";
    const acc = (ACC[mon.kind] || ACC.blob)(mon);
    const decorate = acc;
    const eyeY = mon.kind === "mushroom" ? 72 : 66;
    return `
    <svg viewBox="0 0 120 120" class="sprite-svg ${boss ? "sprite-boss" : ""}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${boss ? `<circle cx="60" cy="66" r="52" fill="${mon.color}" opacity="0.18"/>` : ""}
      <g class="sprite-body">
        ${bodyFor(mon.kind, mon)}
        ${decorate}
        ${eyes(60, eyeY, 13, 4.8, mood)}
        ${blush(60, eyeY + 12, 20, 6.5)}
        ${mouth(60, eyeY + 13, 4)}
      </g>
    </svg>`;
  };

  /* 용사 */
  SP.hero = function (tier, opts) {
    opts = opts || {};
    const blade = tier ? tier.blade : "#9ccdf2";
    const blade2 = tier ? tier.blade2 : "#e3f5ff";
    const bolt = tier ? tier.bolt : "#5c9fd0";
    return `
    <svg viewBox="0 0 120 140" class="sprite-svg hero-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="58" cy="132" rx="30" ry="6" fill="rgba(120,90,70,0.15)"/>
      <!-- 망토 -->
      <path d="M36 84 q24 -8 48 0 l6 38 q-30 12 -60 0 Z" fill="#a8e0cc" stroke="#7ec9b0" stroke-width="2.5"/>
      <!-- 몸 -->
      <rect x="42" y="78" width="36" height="38" rx="14" fill="#fff6ea" stroke="#e8d5c0" stroke-width="2.5"/>
      <rect x="42" y="98" width="36" height="8" rx="4" fill="#ffb3a7"/>
      <!-- 다리 -->
      <rect x="48" y="112" width="10" height="16" rx="5" fill="#c9a88c"/>
      <rect x="62" y="112" width="10" height="16" rx="5" fill="#c9a88c"/>
      <!-- 머리 -->
      <circle cx="60" cy="52" r="30" fill="#ffe8d6" stroke="#f2d4bd" stroke-width="2"/>
      <!-- 머리카락 -->
      <path d="M30 50 q2 -30 30 -30 q28 0 30 30 q-16 -12 -30 -8 q-14 -4 -30 8 Z" fill="#8a6a52"/>
      <path d="M38 44 q10 -10 22 -8" stroke="#a8836a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- 눈 -->
      <ellipse cx="48" cy="56" rx="4.4" ry="5.2" fill="#4a3a30"/>
      <ellipse cx="72" cy="56" rx="4.4" ry="5.2" fill="#4a3a30"/>
      <circle cx="49.6" cy="54" r="1.7" fill="#fff"/>
      <circle cx="73.6" cy="54" r="1.7" fill="#fff"/>
      <ellipse cx="38" cy="65" rx="6" ry="3.4" fill="#ff9fb0" opacity="0.55"/>
      <ellipse cx="82" cy="65" rx="6" ry="3.4" fill="#ff9fb0" opacity="0.55"/>
      <path d="M56 66 q4 4 8 0" stroke="#4a3a30" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- 성검 -->
      <g transform="translate(86 46) rotate(24)" class="hero-blade">
        <rect x="-4" y="-34" width="8" height="60" rx="3" fill="${blade}" stroke="${blade2}" stroke-width="2"/>
        <path d="M0 -46 l5 12 h-10 Z" fill="${blade2}"/>
        <rect x="-12" y="22" width="24" height="7" rx="3.5" fill="${bolt}"/>
        <rect x="-3" y="29" width="6" height="16" rx="3" fill="#b98d68"/>
        <circle cx="0" cy="47" r="4.4" fill="#ffe08a" stroke="#e6b23c" stroke-width="1.6"/>
      </g>
      <path d="M94 20 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#fff3c4" opacity="0.95"/>
      <path d="M20 78 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff3c4" opacity="0.8"/>
    </svg>`;
  };

  /* 대장간 성검 */
  SP.sword = function (lv) {
    const t = G.tierOf(lv);
    const sparkle = lv >= 12;
    const broken = false;
    return `
    <svg viewBox="0 0 160 170" class="forge-sword" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="swordGlow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="${t.glow}"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${t.blade2}"/>
          <stop offset="45%" stop-color="${t.blade}"/>
          <stop offset="100%" stop-color="${t.bolt}"/>
        </linearGradient>
      </defs>
      <circle cx="80" cy="78" r="66" fill="url(#swordGlow)"/>
      <g class="sword-group">
        <path d="M80 16 L92 44 L92 106 L80 122 L68 106 L68 44 Z" fill="url(#bladeGrad)" stroke="${t.blade2}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M80 26 L80 108" stroke="#ffffff" stroke-width="2.4" opacity="0.55"/>
        <path d="M72 46 L68 44 L68 106 L72 106 Z" fill="#ffffff" opacity="0.18"/>
        <rect x="54" y="112" width="52" height="12" rx="6" fill="${t.bolt}" stroke="${t.blade2}" stroke-width="2"/>
        <circle cx="80" cy="118" r="4" fill="#fff6c8"/>
        <rect x="74" y="124" width="12" height="26" rx="5" fill="#c9a88c" stroke="#a8836a" stroke-width="2"/>
        <path d="M74 132 h12 M74 140 h12" stroke="#a8836a" stroke-width="2"/>
        <circle cx="80" cy="154" r="8" fill="${t.blade}" stroke="${t.blade2}" stroke-width="2.4"/>
        <path d="M80 150 l1.4 3.4 l3.6 1.4 l-3.6 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.6 -1.4 l3.6 -1.4 Z" fill="#fff6c8"/>
      </g>
      ${sparkle ? `
      <g class="sword-sparkles">
        <path d="M40 44 l2.4 6 l6 2.4 l-6 2.4 l-2.4 6 l-2.4 -6 l-6 -2.4 l6 -2.4 Z" fill="#fff6c8"/>
        <path d="M122 60 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#ffe08a"/>
        <path d="M116 118 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 Z" fill="#ffffff"/>
      </g>` : ""}
    </svg>`;
  };

  G.sprites = SP;
})();
