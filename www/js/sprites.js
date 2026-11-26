/* =====================================================================
   심연의 대장간 — 아트 (sprites.js, DARK FANTASY)
   흑요석 몸체 + 발광하는 룬 테두리의 저주받은 존재들, 성검 일러스트
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;

  const SP = {};

  const INK = "#07050c";        // 눈 · 그림자
  const EYE_HOT = "#ff4d5e";    // 몬스터 눈빛 (기본)

  /* ---------- 얼굴 ---------- */
  function eyes(cx, cy, gap, size, mood, hot) {
    const r = size || 4.4;
    const lx = cx - gap;
    const rx = cx + gap;
    const h = hot || EYE_HOT;
    if (mood === "angry") {
      return `
      <path d="M${lx - r - 3} ${cy - 6} l${r * 2 + 6} 4.4" stroke="${h}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      <path d="M${rx + r + 3} ${cy - 6} l-${r * 2 + 6} 4.4" stroke="${h}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      <ellipse cx="${lx}" cy="${cy + 1}" rx="${r}" ry="${r * 0.92}" fill="${INK}"/>
      <ellipse cx="${rx}" cy="${cy + 1}" rx="${r}" ry="${r * 0.92}" fill="${INK}"/>
      <ellipse cx="${lx}" cy="${cy + 1}" rx="${r * 0.62}" ry="${r * 0.52}" fill="${h}"/>
      <ellipse cx="${rx}" cy="${cy + 1}" rx="${r * 0.62}" ry="${r * 0.52}" fill="${h}"/>`;
    }
    return `
      <ellipse cx="${lx}" cy="${cy}" rx="${r}" ry="${r * 1.05}" fill="${INK}"/>
      <ellipse cx="${rx}" cy="${cy}" rx="${r}" ry="${r * 1.05}" fill="${INK}"/>
      <ellipse cx="${lx}" cy="${cy}" rx="${r * 0.6}" ry="${r * 0.72}" fill="${h}"/>
      <ellipse cx="${rx}" cy="${cy}" rx="${r * 0.6}" ry="${r * 0.72}" fill="${h}"/>
      <circle cx="${lx + 1.2}" cy="${cy - 1.4}" r="${r * 0.24}" fill="#fff" opacity="0.85"/>
      <circle cx="${rx + 1.2}" cy="${cy - 1.4}" r="${r * 0.24}" fill="#fff" opacity="0.85"/>`;
  }

  /* 톱니 같은 이빨 (저주받은 입) */
  function fangs(cx, cy, w, color) {
    const t = w || 5;
    return `
      <path d="M${cx - t} ${cy} q${t} ${t * 0.9} ${t * 2} 0" stroke="${color || "#c9b6c8"}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M${cx - t + 1} ${cy + 0.5} l1.6 3.2 l1.6 -3.2 Z" fill="${color || "#e6dbe4"}"/>
      <path d="M${cx + t - 4.2} ${cy + 0.5} l1.6 3.2 l1.6 -3.2 Z" fill="${color || "#e6dbe4"}"/>`;
  }

  /* 갈라진 흉터 */
  function scar(cx, cy, c) {
    return `<path d="M${cx - 8} ${cy - 6} l5 5 l-3 4 l6 5" stroke="${c}" stroke-width="1.6" fill="none" opacity="0.75" stroke-linecap="round"/>`;
  }

  /* ---------- 몸통 ---------- */
  const BODY_FN = {
    blob(c1, c2) {
      return `
        <ellipse cx="60" cy="112" rx="34" ry="6" fill="rgba(0,0,0,0.55)"/>
        <path d="M60 20 C89 20 106 44 106 71 C106 98 87 110 60 110 C33 110 14 98 14 71 C14 44 31 20 60 20 Z"
          fill="${c1}" stroke="${c2}" stroke-width="3"/>
        <path d="M60 30 C80 30 94 48 94 70 C94 92 80 101 60 101 C40 101 26 92 26 70 C26 48 40 30 60 30 Z"
          fill="none" stroke="${c2}" stroke-width="1.2" opacity="0.35"/>
        <ellipse cx="44" cy="42" rx="12" ry="7" fill="#ffffff" opacity="0.1" transform="rotate(-24 44 42)"/>
        <path d="M30 96 q8 -10 16 0 q8 10 16 0 q8 -10 16 0" stroke="${c2}" stroke-width="1.4" fill="none" opacity="0.5"/>`;
    },
    fluffy(c1, c2) {
      const puffs = [
        [60, 32, 20], [34, 50, 16], [86, 50, 16], [26, 78, 15],
        [94, 78, 15], [40, 96, 15], [80, 96, 15], [60, 84, 22]
      ];
      return `
        <ellipse cx="60" cy="112" rx="36" ry="6" fill="rgba(0,0,0,0.55)"/>
        ${puffs.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="${c1}" stroke="${c2}" stroke-width="2.2"/>`).join("")}
        <ellipse cx="60" cy="76" rx="27" ry="24" fill="${c1}"/>`;
    },
    star(c1, c2) {
      return `
        <ellipse cx="60" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.55)"/>
        <path d="M60 18 L73 49 L106 53 L82 76 L89 108 L60 91 L31 108 L38 76 L14 53 L47 49 Z"
          fill="${c1}" stroke="${c2}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M60 34 L68 54 L90 57 L74 72 L78 93 L60 82 L42 93 L46 72 L30 57 L52 54 Z"
          fill="none" stroke="${c2}" stroke-width="1.1" opacity="0.45"/>`;
    },
    ghost(c1, c2) {
      return `
        <ellipse cx="60" cy="114" rx="32" ry="6" fill="rgba(0,0,0,0.5)"/>
        <path d="M60 18 C87 18 103 39 103 66 L103 98 Q94 89 86 98 Q78 107 70 98 Q62 89 54 98 Q46 107 38 98 Q30 89 21 98 L21 66 C21 39 33 18 60 18 Z"
          fill="${c1}" stroke="${c2}" stroke-width="2.6" opacity="0.92"/>
        <path d="M44 30 q16 -8 32 0" stroke="${c2}" stroke-width="1.4" fill="none" opacity="0.4"/>`;
    },
    golem(c1, c2) {
      return `
        <ellipse cx="60" cy="112" rx="33" ry="6" fill="rgba(0,0,0,0.55)"/>
        <rect x="19" y="35" width="82" height="71" rx="20" fill="${c1}" stroke="${c2}" stroke-width="3"/>
        <rect x="29" y="22" width="26" height="18" rx="7" fill="${c1}" stroke="${c2}" stroke-width="2.6"/>
        <rect x="65" y="22" width="26" height="18" rx="7" fill="${c1}" stroke="${c2}" stroke-width="2.6"/>
        <path d="M30 62 h12 l-4 10 h10 M78 52 l-6 12 h12" stroke="${c2}" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>
        <rect x="30" y="46" width="14" height="8" rx="4" fill="#ffffff" opacity="0.1"/>`;
    },
    whale(c1, c2) {
      return `
        <ellipse cx="60" cy="112" rx="32" ry="6" fill="rgba(0,0,0,0.55)"/>
        <path d="M21 70 C21 41 40 26 62 26 C89 26 103 46 103 68 C103 95 82 108 58 108 C35 108 21 95 21 70 Z"
          fill="${c1}" stroke="${c2}" stroke-width="3"/>
        <path d="M97 42 q21 -11 19 13 q-11 -7 -19 -3 Z" fill="${c2}" opacity="0.8"/>
        <path d="M28 76 q34 14 68 0" stroke="${c2}" stroke-width="1.6" fill="none" opacity="0.5"/>
        <circle cx="42" cy="44" r="4.4" fill="${c2}" opacity="0.9"/>`;
    },
    knight(c1, c2) {
      return `
        <ellipse cx="60" cy="112" rx="32" ry="6" fill="rgba(0,0,0,0.55)"/>
        <path d="M60 22 C85 22 99 42 99 65 L99 97 C99 105 84 110 60 110 C36 110 21 105 21 97 L21 65 C21 42 35 22 60 22 Z"
          fill="${c1}" stroke="${c2}" stroke-width="3"/>
        <path d="M26 50 q34 -14 68 0 l0 14 q-34 -13 -68 0 Z" fill="${c2}" opacity="0.16"/>
        <path d="M60 30 V104" stroke="${c2}" stroke-width="1.4" opacity="0.35"/>
        <path d="M34 88 q26 10 52 0" stroke="${c2}" stroke-width="1.4" fill="none" opacity="0.4"/>`;
    }
  };

  /* ---------- 액세서리 ---------- */
  function crown(c1) {
    return `
      <path d="M39 24 L46 8 L54 19 L60 4 L66 19 L74 8 L81 24 Z" fill="#c9a24a" stroke="#f0d792" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="60" cy="14" r="2.6" fill="#b8323e"/>
      <path d="M39 24 h42" stroke="#f0d792" stroke-width="1.4"/>`;
  }
  function earsBunny(c1, c2) {
    return `
      <path d="M42 28 q-9 -27 4 -27 q11 0 8 27 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>
      <path d="M78 28 q9 -27 -4 -27 q-11 0 -8 27 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4"/>
      <path d="M44 25 q-4 -18 2 -18 q6 0 4 18 Z" fill="${c2}" opacity="0.5"/>
      <path d="M76 25 q4 -18 -2 -18 q-6 0 -4 18 Z" fill="${c2}" opacity="0.5"/>`;
  }
  function earsCat(c1, c2) {
    return `
      <path d="M33 35 L28 6 L55 24 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M87 35 L92 6 L65 24 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M39 30 L37 15 L49 25 Z" fill="${c2}" opacity="0.45"/>
      <path d="M81 30 L83 15 L71 25 Z" fill="${c2}" opacity="0.45"/>`;
  }
  function earsFox(c1, c2) {
    return `
      <path d="M31 37 L22 4 L56 22 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M89 37 L98 4 L64 22 Z" fill="${c1}" stroke="${c2}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M36 31 L30 14 L49 24 Z" fill="${c2}" opacity="0.45"/>
      <path d="M84 31 L90 14 L71 24 Z" fill="${c2}" opacity="0.45"/>`;
  }
  function mushroomCap(c1, c2) {
    return `
      <path d="M16 48 q44 -44 88 0 q-44 17 -88 0 Z" fill="${c1}" stroke="${c2}" stroke-width="2.8"/>
      <circle cx="43" cy="35" r="5" fill="${c2}" opacity="0.5"/>
      <circle cx="70" cy="29" r="4" fill="${c2}" opacity="0.45"/>
      <circle cx="60" cy="44" r="3.4" fill="${c2}" opacity="0.4"/>
      <path d="M60 46 q-4 16 0 26" stroke="${c2}" stroke-width="1.4" fill="none" opacity="0.35"/>`;
  }
  function acornCap(c1, c2) {
    return `
      <path d="M21 44 q39 -35 78 0 q-39 15 -78 0 Z" fill="${c2}" opacity="0.5" stroke="${c2}" stroke-width="2.2"/>
      <rect x="57" y="8" width="6" height="18" rx="3" fill="${c2}" opacity="0.7"/>
      <path d="M37 40 q23 -11 46 0" stroke="${c2}" stroke-width="1.6" fill="none" opacity="0.6"/>`;
  }
  function beeWings(c1) {
    return `
      <ellipse cx="24" cy="46" rx="15" ry="21" fill="${c1}" opacity="0.35" stroke="${c1}" stroke-width="1.4" transform="rotate(-24 24 46)"/>
      <ellipse cx="96" cy="46" rx="15" ry="21" fill="${c1}" opacity="0.35" stroke="${c1}" stroke-width="1.4" transform="rotate(24 96 46)"/>
      <path d="M30 84 q20 8 40 0" stroke="${c1}" stroke-width="2.4" fill="none" opacity="0.35"/>
      <path d="M34 94 q16 6 32 0" stroke="${c1}" stroke-width="2.4" fill="none" opacity="0.28"/>`;
  }
  function cloudPuffs(c1, c2) {
    return `
      <circle cx="33" cy="55" r="20" fill="${c1}" stroke="${c2}" stroke-width="2.2"/>
      <circle cx="87" cy="55" r="20" fill="${c1}" stroke="${c2}" stroke-width="2.2"/>
      <circle cx="60" cy="38" r="24" fill="${c1}" stroke="${c2}" stroke-width="2.2"/>`;
  }
  function shell(c1, c2) {
    return `
      <path d="M20 74 q0 -37 40 -37 q40 0 40 37 q-40 22 -80 0 Z" fill="${c2}" opacity="0.35" stroke="${c2}" stroke-width="2.6"/>
      <path d="M46 44 q-2 20 -8 35 M74 44 q2 20 8 35 M60 38 v44" stroke="${c2}" stroke-width="1.8" fill="none" opacity="0.75"/>`;
  }
  function batWings(c1) {
    return `
      <path d="M22 54 q-19 -19 -8 -32 q11 9 19 4 q-2 17 -2 28 Z" fill="${c1}" opacity="0.85" stroke="${c1}" stroke-width="1.4"/>
      <path d="M98 54 q19 -19 8 -32 q-11 9 -19 4 q2 17 2 28 Z" fill="${c1}" opacity="0.85" stroke="${c1}" stroke-width="1.4"/>
      <path d="M50 74 l3.4 9 l3.6 -9 Z" fill="#e6dbe4"/>
      <path d="M62 74 l3.4 9 l3.6 -9 Z" fill="#e6dbe4"/>`;
  }
  function butterflyWings(c1, c2) {
    return `
      <path d="M56 58 q-38 -27 -45 4 q-4 25 23 23 q18 -2 22 -27 Z" fill="${c1}" opacity="0.7" stroke="${c2}" stroke-width="1.8"/>
      <path d="M64 58 q38 -27 45 4 q4 25 -23 23 q-18 -2 -22 -27 Z" fill="${c1}" opacity="0.7" stroke="${c2}" stroke-width="1.8"/>
      <circle cx="33" cy="68" r="4.6" fill="none" stroke="${c2}" stroke-width="1.4" opacity="0.7"/>
      <circle cx="87" cy="68" r="4.6" fill="none" stroke="${c2}" stroke-width="1.4" opacity="0.7"/>`;
  }
  function plantLeaves(c1, c2) {
    return `
      <path d="M60 20 q-3 -19 11 -21 q7 13 -3 23 Z" fill="${c1}" stroke="${c2}" stroke-width="1.8"/>
      <path d="M55 23 q-15 -13 -24 -2 q9 13 24 6 Z" fill="${c1}" stroke="${c2}" stroke-width="1.8"/>
      <path d="M65 23 q15 -13 24 -2 q-9 13 -24 6 Z" fill="${c1}" stroke="${c2}" stroke-width="1.8"/>
      <path d="M22 96 q10 -14 18 0 M80 96 q10 -14 18 0" stroke="${c2}" stroke-width="1.6" fill="none" opacity="0.5"/>`;
  }
  function queenVeil(c1, c2) {
    return `
      <path d="M28 42 q32 -36 64 0 q-6 48 -32 55 q-26 -7 -32 -55 Z" fill="${c2}" opacity="0.12" stroke="${c2}" stroke-width="1.2"/>
      ${crown(c1)}
      <circle cx="26" cy="60" r="2.6" fill="${c2}" opacity="0.9"/>
      <circle cx="94" cy="60" r="2.6" fill="${c2}" opacity="0.9"/>`;
  }
  function cookieChips(c1) {
    return `
      <circle cx="40" cy="46" r="4" fill="#0b0810" opacity="0.8"/>
      <circle cx="72" cy="40" r="3.4" fill="#0b0810" opacity="0.8"/>
      <circle cx="80" cy="66" r="4" fill="#0b0810" opacity="0.8"/>
      <circle cx="48" cy="88" r="3.6" fill="#0b0810" opacity="0.8"/>
      <path d="M36 70 l8 6 M66 78 l-6 8" stroke="${c1}" stroke-width="1.4" opacity="0.7"/>`;
  }
  function dragonHorns(c1, c2) {
    return `
      <path d="M40 25 q-11 -17 -2 -22 q9 5 9 17 Z" fill="${c2}" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M80 25 q11 -17 2 -22 q-9 5 -9 17 Z" fill="${c2}" stroke="${c2}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M17 66 q-17 -9 -13 -24 q15 7 17 19 Z" fill="${c1}" opacity="0.7"/>
      <path d="M103 66 q17 -9 13 -24 q-15 7 -17 19 Z" fill="${c1}" opacity="0.7"/>`;
  }
  function fairyBits(c1) {
    return `
      <ellipse cx="23" cy="52" rx="13" ry="19" fill="${c1}" opacity="0.32" stroke="${c1}" stroke-width="1.2" transform="rotate(-20 23 52)"/>
      <ellipse cx="97" cy="52" rx="13" ry="19" fill="${c1}" opacity="0.32" stroke="${c1}" stroke-width="1.2" transform="rotate(20 97 52)"/>
      <path d="M96 28 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="${c1}" opacity="0.85"/>`;
  }
  function birdWings(c1) {
    return `
      <path d="M28 60 q-25 -7 -21 -29 q19 4 27 21 Z" fill="${c1}" opacity="0.75" stroke="${c1}" stroke-width="1.4"/>
      <path d="M92 60 q25 -7 21 -29 q-19 4 -27 21 Z" fill="${c1}" opacity="0.75" stroke="${c1}" stroke-width="1.4"/>
      <path d="M54 74 l-10 7 l10 4 Z" fill="${c1}" opacity="0.9"/>`;
  }
  function demonHorns(c1) {
    return `
      <path d="M37 26 q-7 -21 4 -24 q9 7 7 19 Z" fill="#2a1730" stroke="${c1}" stroke-width="1.6"/>
      <path d="M83 26 q7 -21 -4 -24 q-9 7 -7 19 Z" fill="#2a1730" stroke="${c1}" stroke-width="1.6"/>
      <path d="M18 58 q-17 -13 -11 -28 q15 9 15 24 Z" fill="${c1}" opacity="0.5"/>
      <path d="M102 58 q17 -13 11 -28 q-15 9 -15 24 Z" fill="${c1}" opacity="0.5"/>`;
  }

  /* ---------- 조립 ---------- */
  const ACC = {
    blob: () => "",
    crowned: (m) => crown(m.color),
    bunny: (m) => earsBunny(m.color, m.color2),
    acorn: (m) => acornCap(m.color, m.color2),
    mushroom: (m) => mushroomCap(m.color, m.color2),
    fluffy: () => "",
    bee: (m) => beeWings(m.color2),
    cloud: () => "",
    star: () => "",
    whale: () => "",
    bat: (m) => batWings(m.color2),
    turtle: () => "",
    butterfly: (m) => butterflyWings(m.color, m.color2),
    plant: (m) => plantLeaves(m.color, m.color2),
    queen: (m) => queenVeil(m.color, m.color2),
    cat: (m) => earsCat(m.color, m.color2),
    fox: (m) => earsFox(m.color, m.color2),
    cookie: (m) => cookieChips(m.color),
    dragon: (m) => dragonHorns(m.color, m.color2),
    fairy: (m) => fairyBits(m.color2),
    bird: (m) => birdWings(m.color2),
    ghost: () => "",
    knight: () => "",
    demon: (m) => demonHorns(m.color2)
  };

  function bodyFor(kind, m) {
    const fn = BODY_FN[kind];
    if (fn) return fn(m.color, m.color2);
    if (kind === "cloud") return BODY_FN.blob(m.color, m.color2) + cloudPuffs(m.color, m.color2);
    if (kind === "turtle") return BODY_FN.blob(m.color, m.color2) + shell(m.color, m.color2);
    return BODY_FN.blob(m.color, m.color2);
  }

  SP.monster = function (mon, opts) {
    opts = opts || {};
    const boss = !!opts.boss || !!mon.boss;
    const mood = boss ? "angry" : "smile";
    const acc = (ACC[mon.kind] || ACC.blob)(mon);
    const eyeY = mon.kind === "mushroom" ? 72 : 66;
    const glow = boss ? 12 : 6;
    return `
    <svg viewBox="0 0 120 120" class="sprite-svg ${boss ? "sprite-boss" : ""}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${boss ? `<circle cx="60" cy="66" r="54" fill="${mon.color2}" opacity="0.07"/>` : ""}
      <g class="sprite-body" style="filter: drop-shadow(0 0 ${glow}px ${mon.color2}aa) drop-shadow(0 8px 10px rgba(0,0,0,0.6))">
        ${bodyFor(mon.kind, mon)}
        ${acc}
        ${eyes(60, eyeY, 13, boss ? 5.2 : 4.6, mood, mon.color2)}
        ${scar(46, eyeY + 16, mon.color2)}
        ${fangs(60, eyeY + 15, 4.6)}
      </g>
    </svg>`;
  };

  /* ---------- 서약자 (저주받은 기사) ---------- */
  SP.hero = function (tier, opts) {
    opts = opts || {};
    const blade = tier ? tier.blade : "#8fc4e8";
    const blade2 = tier ? tier.blade2 : "#dff2ff";
    const bolt = tier ? tier.bolt : "#4d7fa8";
    const glow = tier ? tier.glow : "rgba(120,190,240,0.6)";
    return `
    <svg viewBox="0 0 120 140" class="sprite-svg hero-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="heroCapeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2a1020"/>
          <stop offset="100%" stop-color="#0d0710"/>
        </linearGradient>
        <linearGradient id="heroBladeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${blade2}"/>
          <stop offset="55%" stop-color="${blade}"/>
          <stop offset="100%" stop-color="${bolt}"/>
        </linearGradient>
      </defs>
      <ellipse cx="58" cy="133" rx="30" ry="6" fill="rgba(0,0,0,0.6)"/>
      <g class="sprite-body" style="filter: drop-shadow(0 0 8px rgba(200,40,60,0.35))">
        <!-- 낡은 망토 -->
        <path d="M34 80 q26 -10 52 0 l8 42 q-16 8 -24 4 q-8 -6 -16 0 q-10 6 -22 -4 Z"
          fill="url(#heroCapeGrad)" stroke="#5c1a2a" stroke-width="2"/>
        <path d="M34 96 q26 8 52 0" stroke="#7a2436" stroke-width="1.4" fill="none" opacity="0.7"/>
        <!-- 갑옷 몸통 -->
        <path d="M43 78 q17 -6 34 0 l3 34 q-20 8 -40 0 Z" fill="#232030" stroke="#5d5570" stroke-width="2.4"/>
        <path d="M48 92 q12 5 24 0" stroke="#8a7fa4" stroke-width="1.6" fill="none" opacity="0.8"/>
        <path d="M60 80 v30" stroke="#8a7fa4" stroke-width="1.2" opacity="0.5"/>
        <!-- 다리 -->
        <rect x="48" y="110" width="9" height="18" rx="4" fill="#1b1926" stroke="#4a4459" stroke-width="1.6"/>
        <rect x="63" y="110" width="9" height="18" rx="4" fill="#1b1926" stroke="#4a4459" stroke-width="1.6"/>
        <!-- 어깨 견갑 -->
        <path d="M40 80 q-8 -6 -2 -14 q10 2 12 10 Z" fill="#2a2636" stroke="#6b6180" stroke-width="1.8"/>
        <path d="M80 80 q8 -6 2 -14 q-10 2 -12 10 Z" fill="#2a2636" stroke="#6b6180" stroke-width="1.8"/>
        <!-- 두건 -->
        <path d="M60 20 q-26 0 -30 26 q-2 16 4 24 q10 -14 26 -14 q16 0 26 14 q6 -8 4 -24 Q86 20 60 20 Z"
          fill="#17141f" stroke="#4e465f" stroke-width="2.4"/>
        <path d="M38 52 q22 -12 44 0 q-6 10 -22 10 q-16 0 -22 -10 Z" fill="#08060c"/>
        <!-- 눈빛 -->
        <ellipse cx="50" cy="56" rx="4.2" ry="2.6" fill="#ff3b4e" style="filter: drop-shadow(0 0 4px #ff3b4e)"/>
        <ellipse cx="70" cy="56" rx="4.2" ry="2.6" fill="#ff3b4e" style="filter: drop-shadow(0 0 4px #ff3b4e)"/>
        <!-- 목의 룬 -->
        <path d="M56 72 h8 M60 68 v8" stroke="#c9a24a" stroke-width="1.6" opacity="0.9"/>
      </g>
      <!-- 저주받은 검 -->
      <g transform="translate(88 44) rotate(22)" class="hero-blade" style="filter: drop-shadow(0 0 10px ${blade})">
        <rect x="-4.4" y="-36" width="8.8" height="62" rx="3" fill="url(#heroBladeGrad)" stroke="${blade2}" stroke-width="1.6"/>
        <path d="M0 -50 l5.4 14 h-10.8 Z" fill="${blade2}"/>
        <path d="M0 -30 v52" stroke="#ffffff" stroke-width="1.2" opacity="0.5"/>
        <rect x="-13" y="20" width="26" height="7" rx="3.4" fill="${bolt}" stroke="${blade2}" stroke-width="1.2"/>
        <rect x="-3" y="27" width="6" height="16" rx="3" fill="#3a2b22"/>
        <circle cx="0" cy="46" r="4.6" fill="#1a1220" stroke="${blade2}" stroke-width="1.6"/>
        <circle cx="0" cy="46" r="1.8" fill="#ff3b4e"/>
      </g>
      <path d="M96 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="${blade2}" opacity="0.8"/>
      <path d="M18 76 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#c9a24a" opacity="0.7"/>
      <g opacity="0.55">
        <path d="M20 44 q-6 -8 0 -14 q6 6 0 14" stroke="#7a2436" stroke-width="1.4" fill="none"/>
      </g>
    </svg>`;
  };

  /* ---------- 성검 (대장간) ---------- */
  SP.sword = function (lv) {
    const t = G.tierOf(lv);
    const sparkle = lv >= 12;
    return `
    <svg viewBox="0 0 160 170" class="forge-sword" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="swordGlow" cx="50%" cy="45%" r="52%">
          <stop offset="0%" stop-color="${t.glow}"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${t.blade2}"/>
          <stop offset="42%" stop-color="${t.blade}"/>
          <stop offset="100%" stop-color="${t.bolt}"/>
        </linearGradient>
        <linearGradient id="hiltGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3a2b22"/>
          <stop offset="100%" stop-color="#140d10"/>
        </linearGradient>
      </defs>

      <!-- 룬 원 -->
      <g class="sword-runes" opacity="0.55">
        <circle cx="80" cy="80" r="62" fill="none" stroke="${t.bolt}" stroke-width="1" stroke-dasharray="4 9"/>
        <circle cx="80" cy="80" r="52" fill="none" stroke="${t.bolt}" stroke-width="0.8" stroke-dasharray="1 7"/>
        <path d="M80 8 v10 M80 142 v-10 M8 80 h10 M142 80 h-10" stroke="${t.blade2}" stroke-width="1.2" opacity="0.7"/>
      </g>
      <circle cx="80" cy="78" r="66" fill="url(#swordGlow)"/>

      <g class="sword-group" style="filter: drop-shadow(0 0 10px ${t.blade})">
        <!-- 날 -->
        <path d="M80 12 L93 44 L93 104 L80 122 L67 104 L67 44 Z"
          fill="url(#bladeGrad)" stroke="${t.blade2}" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M80 22 L80 110" stroke="#ffffff" stroke-width="1.8" opacity="0.45"/>
        <path d="M73 46 L67 44 L67 104 L73 104 Z" fill="#000000" opacity="0.3"/>
        <!-- 혈흔 홈 -->
        <path d="M80 40 V100" stroke="${t.bolt}" stroke-width="2" opacity="0.55"/>
        <!-- 균열 -->
        <path d="M72 58 l6 6 l-4 7 l7 6" stroke="#0b0810" stroke-width="1.2" fill="none" opacity="0.6"/>
        <!-- 가드 -->
        <path d="M52 112 q28 -8 56 0 q-4 10 -28 10 q-24 0 -28 -10 Z" fill="${t.bolt}" stroke="${t.blade2}" stroke-width="1.8"/>
        <circle cx="80" cy="117" r="3.4" fill="#ff3b4e"/>
        <!-- 손잡이 -->
        <rect x="74" y="122" width="12" height="26" rx="5" fill="url(#hiltGrad)" stroke="#5d4a3a" stroke-width="1.6"/>
        <path d="M74 130 h12 M74 137 h12 M74 144 h12" stroke="#8a6a4a" stroke-width="1.4" opacity="0.8"/>
        <!-- 폼멜 -->
        <circle cx="80" cy="154" r="9" fill="#1a1220" stroke="${t.blade2}" stroke-width="2"/>
        <path d="M80 149 l1.6 3.8 l4 1.6 l-4 1.6 l-1.6 3.8 l-1.6 -3.8 l-4 -1.6 l4 -1.6 Z" fill="${t.blade2}"/>
      </g>
      ${sparkle ? `
      <g class="sword-sparkles">
        <path d="M38 42 l2.4 6 l6 2.4 l-6 2.4 l-2.4 6 l-2.4 -6 l-6 -2.4 l6 -2.4 Z" fill="${t.blade2}"/>
        <path d="M124 58 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="${t.blade}"/>
        <path d="M118 120 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 Z" fill="#ffffff"/>
      </g>` : ""}
    </svg>`;
  };

  G.sprites = SP;
})();
