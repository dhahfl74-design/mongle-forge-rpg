/* =====================================================================
   심연의 대장간: 저주받은 성검 — 게임 코어 (v4.0 HORDE REBOOT)
   저장/계산/강화/사냥 전투(다수 몹 · 3인 파티 · 광역기)/유물/업적/오프라인
   ===================================================================== */
(function () {
  "use strict";

  const G = window.GAME;

  /* ---------------- 이벤트 버스 ---------------- */
  const handlers = {};
  G.bus = {
    on(name, fn) {
      (handlers[name] = handlers[name] || []).push(fn);
      return () => G.bus.off(name, fn);
    },
    off(name, fn) {
      if (!handlers[name]) return;
      handlers[name] = handlers[name].filter((f) => f !== fn);
    },
    emit(name, payload) {
      (handlers[name] || []).slice().forEach((fn) => {
        try { fn(payload); } catch (e) { console.warn("[bus]", name, e); }
      });
    }
  };
  const emit = (n, p) => G.bus.emit(n, p);

  /* ---------------- 유틸 ---------------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const int = (v, d) => Math.round(num(v, d));
  const rnd = (a, b) => a + Math.random() * (b - a);

  G.fmt = function (v, jo = true) {
    v = Math.floor(num(v, 0));
    if (jo) return v.toLocaleString("ko-KR");
    if (Math.abs(v) >= 100000000) return (v / 100000000).toFixed(1).replace(/\.0$/, "") + "억";
    if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, "") + "만";
    return v.toLocaleString("ko-KR");
  };
  G.fmtShort = (v) => G.fmt(v, false);

  G.pct = function (v) {
    const r = Math.round(v * 10) / 10;
    return (Number.isInteger(r) ? r : r.toFixed(1)) + "%";
  };

  /* ---------------- 기본 상태 ---------------- */
  function defaultRelics() {
    const o = {};
    G.RELICS.forEach((r) => { o[r.id] = { u: false, lv: 0 }; });
    return o;
  }

  function defaultParty() {
    const members = {};
    G.PARTY.forEach((p) => {
      // 시작부터 3인 파티로 싸운다 — 두 동료 모두 1레벨에 합류
      members[p.id] = { unlocked: true, lv: 1, skill: 0 };
    });
    return { leaderIdx: 0, members: members, swaps: 0 };
  }

  function defaults() {
    return {
      version: 5,
      createdAt: Date.now(),
      gold: 1200,
      stones: 3,
      relFrags: 0,
      // 강화 슬롯(모루 위)과 장착 슬롯(사냥에 쓰는 검)을 분리한다
      forge: { level: 0, pity: 0, protect: false, freeProtect: 0 },
      equipped: { level: 0 },
      tutorial: { idx: 0, claimed: {}, skipped: false, collapsed: false, flags: {}, title: "" },
      hero: { level: 1, exp: 0, hp: 130 },
      party: defaultParty(),
      upgrades: { skill: 0, pity: 0, furnace: 0, pickaxe: 0 },
      skills: { blossom: 0, jelly: 0, meteor: 0 },
      relics: defaultRelics(),
      progress: { maxStage: 1, cleared: {}, firstClear: {} },
      codex: {},
      achievements: { claimed: {} },
      settings: { sound: true, auto: true, haptics: true, autoRepeat: false, autoAdvance: true },
      stats: {
        tries: 0, successes: 0, breaks: 0, maxLv: 0,
        kills: 0, bossKills: 0, clears: 0,
        goldEarned: 1200, stonesEarned: 3, playSeconds: 0, sells: 0,
        guards: 0, dodges: 0, counters: 0, ults: 0, swaps: 0
      },
      lastSeen: Date.now(),
      welcomeSeen: false
    };
  }

  let state = defaults();
  G.getState = () => state;

  /* ---------------- 저장 / 불러오기 ---------------- */
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  function mergeDeep(base, saved) {
    if (!isObj(saved)) return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(saved).forEach((k) => {
      const b = base[k];
      const s = saved[k];
      if (isObj(b) && isObj(s)) out[k] = mergeDeep(b, s);
      else if (s !== undefined && s !== null) out[k] = s;
    });
    return out;
  }

  function hpCapOf(s) {
    let bonus = 0;
    G.RELICS.forEach((r) => {
      if (r.stat !== "hp") return;
      const cur = s.relics[r.id];
      if (cur && cur.u) bonus += r.effect * cur.lv;
    });
    return Math.round((130 + (s.hero.level - 1) * 18) * (1 + bonus / 100));
  }

  function sanitize(s) {
    s.version = 5;
    s.gold = clamp(int(s.gold, 1200), 0, Number.MAX_SAFE_INTEGER);
    s.stones = clamp(int(s.stones, 0), 0, Number.MAX_SAFE_INTEGER);
    s.relFrags = clamp(int(s.relFrags, 0), 0, Number.MAX_SAFE_INTEGER);
    if (!isObj(s.forge)) s.forge = { level: 0, pity: 0, protect: false, freeProtect: 0 };
    if (!isObj(s.equipped)) s.equipped = { level: 0 };
    delete s.weapon;
    s.forge.level = clamp(int(s.forge.level, 0), 0, G.MAX_LV);
    s.forge.pity = clamp(num(s.forge.pity, 0), 0, 100);
    s.forge.protect = !!s.forge.protect;
    s.forge.freeProtect = clamp(int(s.forge.freeProtect, 0), 0, 99);
    s.equipped.level = clamp(int(s.equipped.level, 0), 0, G.MAX_LV);
    const tut = isObj(s.tutorial) ? s.tutorial : {};
    s.tutorial = {
      idx: clamp(int(tut.idx, 0), 0, G.TUTORIAL.length),
      claimed: isObj(tut.claimed) ? tut.claimed : {},
      skipped: !!tut.skipped,
      collapsed: !!tut.collapsed,
      flags: isObj(tut.flags) ? tut.flags : {},
      title: typeof tut.title === "string" ? tut.title : ""
    };
    s.hero.level = clamp(int(s.hero.level, 1), 1, 99);
    s.hero.exp = Math.max(0, int(s.hero.exp, 0));
    // 파티 저장부 보정 (구버전 저장은 기본 파티로 채워진다)
    if (!isObj(s.party)) s.party = defaultParty();
    if (!isObj(s.party.members)) s.party.members = {};
    G.PARTY.forEach((p) => {
      const cur = isObj(s.party.members[p.id]) ? s.party.members[p.id] : {};
      s.party.members[p.id] = {
        unlocked: cur.unlocked === undefined ? true : !!cur.unlocked,
        lv: clamp(int(cur.lv, 1), 1, G.PARTY_LV.max),
        skill: clamp(int(cur.skill, 0), 0, 9)
      };
    });
    s.party.leaderIdx = clamp(int(s.party.leaderIdx, 0), 0, 2);
    s.party.swaps = Math.max(0, int(s.party.swaps, 0));
    s.progress.maxStage = clamp(int(s.progress.maxStage, 1), 1, G.TOTAL_STAGES + 1);
    ["skill", "pity", "furnace", "pickaxe"].forEach((k) => {
      const cfg = G.FORGE_UPGRADES.find((u) => u.key === k);
      s.upgrades[k] = clamp(int(s.upgrades[k], 0), 0, cfg ? cfg.max : 999);
    });
    G.SKILLS.forEach((sk) => { s.skills[sk.id] = clamp(int(s.skills[sk.id], 0), 0, 9); });
    G.RELICS.forEach((r) => {
      const cur = s.relics[r.id] || { u: false, lv: 0 };
      s.relics[r.id] = { u: !!cur.u, lv: clamp(int(cur.lv, 0), 0, r.max) };
      if (!s.relics[r.id].u) s.relics[r.id].lv = 0;
    });
    if (!isObj(s.progress.cleared)) s.progress.cleared = {};
    Object.keys(s.progress.cleared).forEach((k) => {
      if (!G.stageByKey(k)) delete s.progress.cleared[k];
    });
    if (!isObj(s.progress.firstClear)) s.progress.firstClear = {};
    Object.keys(s.stats).forEach((k) => { s.stats[k] = Math.max(0, num(s.stats[k], 0)); });
    s.stats.maxLv = clamp(int(s.stats.maxLv, 0), 0, G.MAX_LV);
    if (!isObj(s.codex)) s.codex = {};
    if (!isObj(s.settings)) s.settings = defaults().settings;
    if (typeof s.settings.autoAdvance !== "boolean") s.settings.autoAdvance = true;
    if (typeof s.settings.autoRepeat !== "boolean") s.settings.autoRepeat = false;
    if (!isObj(s.achievements)) s.achievements = { claimed: {} };
    if (!isObj(s.achievements.claimed)) s.achievements.claimed = {};
    s.hero.hp = clamp(num(s.hero.hp, hpCapOf(s)), 0, hpCapOf(s));
    return s;
  }

  /* 예전 저장(무기 하나만 있던 v3)을 장착/강화 두 슬롯으로 옮긴다.
     장착 슬롯을 같은 단계로 채워 기존 전투력이 그대로 유지된다. */
  function migrateSave(obj) {
    if (!isObj(obj)) return obj;
    const old = isObj(obj.weapon) ? obj.weapon : null;
    if (old && typeof old.level === "number" && !isObj(obj.forge)) {
      obj.forge = {
        level: clamp(int(old.level, 0), 0, G.MAX_LV),
        pity: clamp(num(old.pity, 0), 0, 100),
        protect: !!old.protect,
        freeProtect: 0
      };
      if (!isObj(obj.equipped)) obj.equipped = { level: obj.forge.level };
      console.info("[save] 장착/강화 슬롯으로 저장을 이전했습니다 (+" + obj.forge.level + ")");
    }
    delete obj.weapon;
    if (!isObj(obj.tutorial)) obj._veteran = true;
    return obj;
  }
  G.migrateSave = migrateSave;

  G.load = function () {
    let loaded = null;
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (raw) loaded = migrateSave(JSON.parse(raw));
    } catch (e) { loaded = null; }
    const veteran = !!(loaded && loaded._veteran);
    if (loaded) delete loaded._veteran;

    if (!loaded) {
      for (const key of G.LEGACY_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const old = JSON.parse(raw);
          if (!old) continue;
          const fresh = defaults();
          fresh.gold = clamp(int(old.gold, 1200), 0, Number.MAX_SAFE_INTEGER);
          fresh.forge.level = clamp(int(old.level, 0), 0, G.MAX_LV);
          fresh.forge.pity = clamp(num(old.pity, 0), 0, 100);
          fresh.equipped.level = fresh.forge.level;
          fresh.upgrades = Object.assign(fresh.upgrades, old.upgrades || {});
          if (old.stats) {
            fresh.stats.maxLv = clamp(int(old.stats.maxLv, 0), 0, G.MAX_LV);
            fresh.stats.tries = Math.max(0, int(old.stats.tries, 0));
            fresh.stats.breaks = Math.max(0, int(old.stats.breaks, 0));
          }
          fresh.hero.level = 1 + Math.floor(fresh.forge.level / 2);
          fresh.hero.hp = hpCapOf(fresh);
          fresh.welcomeSeen = true;
          fresh.tutorial.skipped = true;   // 예전 플레이어에게는 안내 퀘스트를 띄우지 않는다
          loaded = fresh;
          console.info("[save] 예전 대장간 저장을 이어받았어요");
          break;
        } catch (e) { /* 다음 키 */ }
      }
    }

    state = sanitize(mergeDeep(defaults(), loaded || {}));
    if (!loaded) state.welcomeSeen = false;
    if (veteran) state.tutorial.skipped = true;
    state.lastSeen = num(loaded && loaded.lastSeen, Date.now());
    G.state = state;
    return state;
  };

  G.save = function () {
    try {
      state.lastSeen = Date.now();
      localStorage.setItem(G.SAVE_KEY, JSON.stringify(state));
      emit("save", { at: state.lastSeen });
      return true;
    } catch (e) {
      emit("save:error", e);
      return false;
    }
  };

  G.reset = function () {
    try { localStorage.removeItem(G.SAVE_KEY); } catch (e) {}
    state = defaults();
    state.hero.hp = hpCapOf(state);
    G.state = state;
    G.battle = null;
    G.save();
    emit("reset");
    return state;
  };

  G.exportSave = function () {
    return JSON.stringify({ game: "mongle-forge", version: G.VERSION, savedAt: new Date().toISOString(), data: state }, null, 2);
  };

  G.importSave = function (text) {
    try {
      const parsed = JSON.parse(text);
      const data = parsed && parsed.data ? parsed.data : parsed;
      if (!isObj(data) || (!isObj(data.forge) && !isObj(data.weapon)) || !isObj(data.hero)) {
        return { ok: false, reason: "이 파일은 심연의 대장간 저장 파일이 아닙니다." };
      }
      const src = migrateSave(data);
      const veteran = !!src._veteran;
      delete src._veteran;
      state = sanitize(mergeDeep(defaults(), src));
      if (veteran) state.tutorial.skipped = true;
      state.hero.hp = Math.min(state.hero.hp, hpCapOf(state));
      G.state = state;
      G.battle = null;
      G.save();
      emit("import");
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: "저장 파일을 읽지 못했습니다. (JSON 형식 오류)" };
    }
  };

  /* ---------------- 소식 로그 ---------------- */
  const logLines = [];
  G.logLines = logLines;
  G.log = function (msg, tone) {
    logLines.unshift({ msg, tone: tone || "", at: Date.now() });
    if (logLines.length > 40) logLines.pop();
    emit("log", { msg, tone: tone || "" });
  };

  /* ---------------- 계산 ---------------- */
  G.atkAt = function (lv) {
    lv = clamp(int(lv, 0), 0, G.MAX_LV);
    return Math.round(10 + 7 * lv + 2.2 * Math.pow(lv, 1.85));
  };
  /* 인자를 비우면 '장착 슬롯' 기준 — 사냥 전투력은 언제나 장착검을 쓴다 */
  G.weaponAtk = function (lv) {
    if (lv === undefined || lv === null) lv = state.equipped.level;
    return G.atkAt(lv);
  };

  G.relicTotal = function (stat) {
    let total = 0;
    G.RELICS.forEach((r) => {
      if (r.stat !== stat) return;
      const cur = state.relics[r.id];
      if (cur && cur.u) total += r.effect * cur.lv;
    });
    return total;
  };

  G.relicLevel = function (id) {
    const cur = state.relics[id];
    return cur && cur.u ? cur.lv : 0;
  };

  G.heroStats = function () {
    const lv = state.hero.level;
    const atkBonus = G.relicTotal("atk");
    const hpBonus = G.relicTotal("hp");
    const rawAtk = (G.weaponAtk() + (lv - 1) * 3.8) * (1 + atkBonus / 100);
    return {
      atk: Math.max(1, Math.round(rawAtk)),
      maxHp: Math.max(1, Math.round((130 + (lv - 1) * 18) * (1 + hpBonus / 100))),
      critChance: clamp(8 + G.relicTotal("crit"), 0, 85),
      critDmg: 175 + (lv - 1) * 0.5,
      attackInterval: Math.max(0.55, 1.0 - lv * 0.004),
      goldBonus: G.relicTotal("gold"),
      enhanceBonus: G.relicTotal("enhance"),
      offlineBonus: G.relicTotal("offline")
    };
  };

  /* 동료 능력치 — 장착검과 동료 레벨을 함께 따라간다 */
  G.partyStats = function (id) {
    const def = G.PARTY.find((p) => p.id === id);
    if (!def) return null;
    const c = state.party.members[id] || { lv: 1, skill: 0 };
    const lv = clamp(int(c.lv, 1), 1, G.PARTY_LV.max);
    const atkBonus = G.relicTotal("atk") / 2;
    const hpBonus = G.relicTotal("hp") / 2;
    const atk = Math.max(1, Math.round((G.weaponAtk() * 0.46 + (lv - 1) * def.atkPer + 7) * def.atkMul * (1 + atkBonus / 100)));
    const maxHp = Math.max(1, Math.round((def.baseHp + (lv - 1) * def.hpPer) * (1 + hpBonus / 100)));
    const sk = def.skill;
    return {
      def, lv: lv, atk: atk, maxHp: maxHp,
      interval: Math.max(0.62, def.interval - lv * 0.004),
      range: def.range, speed: def.speed,
      skillPower: sk.power + (c.skill || 0) * 0.16,
      skillCd: Math.max(2.8, sk.cd - (c.skill || 0) * 0.18)
    };
  };

  G.expNeed = function (lv) {
    return Math.round(35 * Math.pow(lv, 1.42));
  };

  G.enhanceCost = function (lv) {
    if (lv === undefined || lv === null) lv = state.forge.level;
    lv = num(lv, 0);
    const cost = G.FORGE.baseCost * Math.pow(G.FORGE.costGrowth, lv) * Math.pow(0.95, state.upgrades.skill);
    return Math.round(Math.min(G.FORGE.maxCost, cost));
  };

  G.sellPrice = function (lv) {
    if (lv === undefined || lv === null) lv = state.forge.level;
    lv = num(lv, 0);
    return Math.round(G.FORGE.sellBase * Math.pow(G.FORGE.sellGrowth, lv));
  };

  G.protectCost = function (lv) {
    if (lv === undefined || lv === null) lv = state.forge.level;
    lv = num(lv, 0);
    return Math.round(G.FORGE.protectBase * Math.pow(G.FORGE.protectGrowth, Math.max(0, lv - 10)));
  };

  G.rates = function (lv) {
    if (lv === undefined || lv === null) lv = state.forge.level;
    lv = num(lv, 0);
    const st = G.heroStats();
    let success;
    if (lv < 3) success = 100;
    else success = 100 - lv * 4.2 + state.upgrades.skill * 1.5 + st.enhanceBonus;
    success = clamp(Math.round(success * 10) / 10, 6, 100);
    const fail = Math.max(0, 100 - success);
    if (lv < G.FORGE.safeLv) return { success, down: 0, breakRate: 0 };
    if (lv < G.FORGE.breakStartLv) return { success, down: fail, breakRate: 0 };
    let breakShare = 0;
    for (const row of G.BREAK_SHARE) if (lv >= row.min) breakShare = row.v;
    const breakRate = Math.round(fail * breakShare * 10) / 10;
    const down = Math.round((fail - breakRate) * 10) / 10;
    return { success, down, breakRate };
  };

  G.upgradeCost = function (key) {
    const cfg = G.FORGE_UPGRADES.find((u) => u.key === key);
    if (!cfg) return 0;
    return Math.round(cfg.base * Math.pow(cfg.mult, state.upgrades[key]));
  };

  G.tierOf = function (lv) {
    if (lv === undefined || lv === null) lv = state.equipped.level;
    lv = num(lv, 0);
    let t = G.TIERS[0];
    for (const row of G.TIERS) if (lv >= row.min) t = row;
    return t;
  };

  /* ---------------- 재화 ---------------- */
  function addGold(n) {
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    state.gold += n;
    state.stats.goldEarned += n;
    return n;
  }
  function addStones(n) {
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    state.stones += n;
    state.stats.stonesEarned += n;
    return n;
  }
  function addFrags(n) {
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    state.relFrags += n;
    return n;
  }
  G.addGold = addGold;
  G.addStones = addStones;
  G.addFrags = addFrags;

  /* ---------------- 경험치 / 레벨 ---------------- */
  G.addExp = function (n) {
    n = Math.max(0, Math.round(n));
    if (!n) return;
    state.hero.exp += n;
    let ups = 0;
    while (state.hero.level < 99 && state.hero.exp >= G.expNeed(state.hero.level)) {
      state.hero.exp -= G.expNeed(state.hero.level);
      state.hero.level += 1;
      ups += 1;
    }
    if (ups > 0) {
      const st = G.heroStats();
      state.hero.hp = st.maxHp;
      if (G.battle) {
        const u = G.battle.units[0];
        if (u) { u.maxHp = st.maxHp; u.hp = Math.min(st.maxHp, u.hp + st.maxHp * 0.25); }
      }
      G.log(`⚔ 서약자가 Lv.${state.hero.level}이 되었습니다. 체력이 회복되었습니다.`, "level");
      emit("hero:levelup", { level: state.hero.level, ups: ups });
      checkSkillsUnlock();
    }
  };

  function checkSkillsUnlock() {
    G.SKILLS.forEach((sk) => {
      if (state.hero.level >= sk.unlockLv) {
        const prev = state._unlockedSkills || {};
        if (!prev[sk.id]) {
          prev[sk.id] = true;
          state._unlockedSkills = prev;
          emit("skill:unlock", sk);
          G.log(`🌑 새 기술 [${sk.name}]을 각성했습니다!`, "level");
        }
      }
    });
  }
  G.checkSkillsUnlock = checkSkillsUnlock;

  G.skillUnlocked = function (sk) { return state.hero.level >= sk.unlockLv; };
  G.skillPower = function (sk) {
    const ups = state.skills[sk.id] || 0;
    return sk.power + sk.perLevel * ups;
  };

  /* ---------------- 강화 (강화 슬롯만 건드린다) ---------------- */
  G.enhance = function () {
    const f = state.forge;
    const lv = f.level;
    if (lv >= G.MAX_LV) return { ok: false, reason: "max" };
    const canProtect = lv >= G.FORGE.breakStartLv && f.protect;
    const freeToken = canProtect && f.freeProtect > 0;
    const cost = G.enhanceCost(lv) + (canProtect && !freeToken ? G.protectCost(lv) : 0);
    if (state.gold < cost) return { ok: false, reason: "gold", cost };

    state.gold -= cost;
    if (freeToken) f.freeProtect = Math.max(0, f.freeProtect - 1);
    state.stats.tries += 1;
    const rates = G.rates(lv);
    const pityReady = f.pity >= 100;
    let result;

    if (pityReady) {
      f.pity = 0;
      f.level += 1;
      result = { kind: "pity", from: lv, to: f.level };
    } else {
      const roll = Math.random() * 100;
      if (roll < rates.success) {
        f.level += 1;
        state.stats.successes += 1;
        result = { kind: "success", from: lv, to: f.level };
      } else {
        const gain = (G.FORGE.pityGainBase + lv * G.FORGE.pityGainPerLv) * (1 + state.upgrades.pity * 0.25);
        f.pity = Math.min(100, f.pity + gain);
        if (roll < rates.success + rates.down) {
          f.level = Math.max(0, lv - 1);
          result = { kind: "down", from: lv, to: f.level, pity: gain };
        } else if (rates.breakRate <= 0) {
          result = { kind: "maintain", from: lv, to: lv, pity: gain };
        } else if (canProtect) {
          result = { kind: "protected", from: lv, to: lv, pity: gain, freeToken: freeToken };
        } else {
          f.level = 0;
          state.stats.breaks += 1;
          result = { kind: "break", from: lv, to: 0, pity: gain };
        }
      }
    }

    state.stats.maxLv = Math.max(state.stats.maxLv, f.level, state.equipped.level);
    result.cost = cost;
    result.level = f.level;
    result.equippedLv = state.equipped.level;
    result.freeTokenUsed = !!freeToken;
    result.weaponName = G.WEAPONS[Math.min(G.MAX_LV, f.level)];
    G.save();
    emit("forge:result", result);
    tutorialEmit();
    checkAchievements();
    return Object.assign({ ok: true }, result);
  };

  G.sell = function () {
    const f = state.forge;
    const lv = f.level;
    const price = G.sellPrice(lv);
    if (lv <= 0) return { ok: false, reason: "nothing" };
    state.gold += price;
    state.stats.goldEarned += price;
    state.stats.sells += 1;
    f.level = 0;
    G.save();
    G.log(`💰 +${lv} ${G.WEAPONS[lv]}을(를) 매각해 ${G.fmt(price)} 골드를 받았습니다. 장착 중인 +${state.equipped.level} 검은 그대로입니다.`);
    emit("forge:sell", { price, from: lv, equippedLv: state.equipped.level });
    tutorialEmit();
    checkAchievements();
    return { ok: true, price };
  };

  G.toggleProtect = function (on) {
    state.forge.protect = !!on;
    G.save();
  };

  /* ---------------- 장착 (슬롯 교체) ---------------- */
  G.equip = function () {
    const e = state.equipped;
    const f = state.forge;
    const before = { equipped: e.level, forge: f.level };
    e.level = clamp(int(f.level, 0), 0, G.MAX_LV);
    f.level = clamp(int(before.equipped, 0), 0, G.MAX_LV);
    state.stats.maxLv = Math.max(state.stats.maxLv, e.level, f.level);
    if (!isObj(state.tutorial.flags)) state.tutorial.flags = {};
    state.tutorial.flags.equipped = true;
    const st = G.heroStats();
    state.hero.hp = Math.min(state.hero.hp, st.maxHp);
    G.save();
    G.log(`⚔ +${e.level} ${G.WEAPONS[e.level]}을(를) 장착했습니다. (강화 슬롯에 +${f.level} 보관)`, "level");
    emit("forge:equip", { level: e.level, stored: f.level, before });
    tutorialEmit();
    checkAchievements();
    return { ok: true, level: e.level, stored: f.level, previous: before.equipped };
  };

  /* ---------------- 초보자 안내 퀘스트 ---------------- */
  function tutorialGoalMet(id) {
    const t = state.tutorial || {};
    const flags = t.flags || {};
    switch (id) {
      case "forge": return state.stats.tries >= 1;
      case "equip": return !!flags.equipped;
      case "hunt": return !!state.progress.cleared["1-1"];
      case "relic":
        return Object.keys(state.relics).some((k) => state.relics[k] && state.relics[k].u) ||
          (int(state.upgrades.skill, 0) + int(state.upgrades.pity, 0) +
            int(state.upgrades.furnace, 0) + int(state.upgrades.pickaxe, 0)) > 0;
      default: return false;
    }
  }
  G.tutorialGoalMet = tutorialGoalMet;

  G.tutorialState = function () {
    const t = state.tutorial;
    const total = G.TUTORIAL.length;
    const idx = clamp(int(t.idx, 0), 0, total);
    const done = idx >= total;
    const cur = done ? null : G.TUTORIAL[idx];
    return {
      idx, total, done,
      skipped: !!t.skipped,
      collapsed: !!t.collapsed,
      title: t.title || "",
      cur,
      goalMet: cur ? tutorialGoalMet(cur.id) : true,
      steps: G.TUTORIAL.map((st, i) => ({
        id: st.id, title: st.title, goal: st.goal, icon: st.icon, reward: st.reward,
        claimed: !!t.claimed[st.id],
        met: tutorialGoalMet(st.id),
        current: i === idx
      }))
    };
  };

  G.claimTutorial = function () {
    const t = state.tutorial;
    const cur = G.TUTORIAL[t.idx];
    if (!cur) return { ok: false, reason: "done" };
    if (!tutorialGoalMet(cur.id)) return { ok: false, reason: "notyet" };
    t.claimed[cur.id] = Date.now();
    const rw = cur.reward || {};
    if (rw.gold) addGold(rw.gold);
    if (rw.stones) addStones(rw.stones);
    if (rw.frags) addFrags(rw.frags);
    if (rw.protect) state.forge.freeProtect = Math.min(99, int(state.forge.freeProtect, 0) + rw.protect);
    if (rw.title) t.title = rw.title;
    t.idx = clamp(t.idx + 1, 0, G.TUTORIAL.length);
    const finished = t.idx >= G.TUTORIAL.length;
    G.save();
    G.log(`🎓 안내 퀘스트 [${cur.title}] 완료! 보상을 받았습니다.`, "achv");
    emit("tutorial:claim", { step: cur, reward: rw, finished });
    tutorialEmit();
    return { ok: true, reward: rw, step: cur, finished };
  };

  G.setTutorialCollapsed = function (on) {
    state.tutorial.collapsed = !!on;
    G.save();
    tutorialEmit();
  };

  G.skipTutorial = function () {
    state.tutorial.skipped = true;
    G.save();
    tutorialEmit();
  };

  G.restartTutorial = function () {
    state.tutorial = {
      idx: 0, claimed: {}, skipped: false, collapsed: false,
      flags: (state.tutorial && state.tutorial.flags) || {}, title: ""
    };
    G.save();
    tutorialEmit();
    return G.tutorialState();
  };

  function tutorialEmit() {
    emit("tutorial:update", {});
  }
  G.tutorialRefresh = tutorialEmit;

  G.buyUpgrade = function (key) {
    const cfg = G.FORGE_UPGRADES.find((u) => u.key === key);
    if (!cfg) return { ok: false };
    if (state.upgrades[key] >= cfg.max) return { ok: false, reason: "max" };
    const cost = G.upgradeCost(key);
    if (state.gold < cost) return { ok: false, reason: "gold", cost };
    state.gold -= cost;
    state.upgrades[key] += 1;
    G.save();
    G.log(`🔨 [${cfg.name}] Lv.${state.upgrades[key]} 연구 완료!`);
    emit("forge:upgrade", { key, level: state.upgrades[key] });
    tutorialEmit();
    checkAchievements();
    return { ok: true, level: state.upgrades[key] };
  };

  G.mine = function () {
    const gain = 40 + state.upgrades.pickaxe * 45;
    state.gold += gain;
    state.stats.goldEarned += gain;
    return gain;
  };

  /* ---------------- 유물 ---------------- */
  G.relicUnlockCost = function (r) { return r.unlock; };
  G.relicLevelCost = function (r) {
    const cur = state.relics[r.id];
    const lv = cur ? cur.lv : 0;
    return {
      gold: Math.round(320 * Math.pow(1.62, lv) * (1 + r.effect / 25)),
      frags: 2 + Math.floor(lv / 3)
    };
  };

  G.unlockRelic = function (id) {
    const r = G.RELICS.find((x) => x.id === id);
    if (!r) return { ok: false };
    const cur = state.relics[id];
    if (cur.u) return { ok: false, reason: "unlocked" };
    if (state.relFrags < r.unlock) return { ok: false, reason: "frags", need: r.unlock };
    state.relFrags -= r.unlock;
    cur.u = true;
    cur.lv = 1;
    G.save();
    G.log(`🔮 유물 [${r.name}]을(를) 각성했습니다!`, "relic");
    emit("relic:unlock", { relic: r });
    tutorialEmit();
    checkAchievements();
    return { ok: true };
  };

  G.levelRelic = function (id) {
    const r = G.RELICS.find((x) => x.id === id);
    if (!r) return { ok: false };
    const cur = state.relics[id];
    if (!cur.u) return { ok: false, reason: "locked" };
    if (cur.lv >= r.max) return { ok: false, reason: "max" };
    const cost = G.relicLevelCost(r);
    if (state.gold < cost.gold) return { ok: false, reason: "gold", cost };
    if (state.relFrags < cost.frags) return { ok: false, reason: "frags", cost };
    state.gold -= cost.gold;
    state.relFrags -= cost.frags;
    cur.lv += 1;
    G.save();
    G.log(`🔮 [${r.name}] Lv.${cur.lv} 강화! ${r.text(r.effect * cur.lv)}`, "relic");
    emit("relic:level", { relic: r, level: cur.lv });
    tutorialEmit();
    checkAchievements();
    return { ok: true, level: cur.lv };
  };

  /* ---------------- 스킬 강화 ---------------- */
  G.skillUpgradeCost = function (sk) {
    const ups = state.skills[sk.id] || 0;
    return { stones: 3 + ups * 4, gold: Math.round(180 * Math.pow(1.65, ups)) };
  };

  G.upgradeSkill = function (id) {
    const sk = G.SKILLS.find((x) => x.id === id);
    if (!sk) return { ok: false };
    if (!G.skillUnlocked(sk)) return { ok: false, reason: "locked" };
    const ups = state.skills[id] || 0;
    if (ups >= 9) return { ok: false, reason: "max" };
    const cost = G.skillUpgradeCost(sk);
    if (state.stones < cost.stones) return { ok: false, reason: "stones", cost };
    if (state.gold < cost.gold) return { ok: false, reason: "gold", cost };
    state.stones -= cost.stones;
    state.gold -= cost.gold;
    state.skills[id] = ups + 1;
    G.save();
    G.log(`✨ [${sk.name}] Lv.${ups + 2} 강화 완료!`);
    emit("skill:upgrade", { skill: sk, level: ups + 1 });
    return { ok: true };
  };

  /* ---------------- 도감 / 업적 ---------------- */
  G.registerCodex = function (monsterId, stage) {
    if (state.codex[monsterId]) return null;
    const mon = G.MONSTERS[monsterId];
    if (!mon) return null;
    state.codex[monsterId] = Date.now();
    const gold = 30 + (stage ? stage.index : 1) * 8;
    const stones = mon.boss ? 2 : 1;
    addGold(gold);
    addStones(stones);
    G.log(`📖 도감 등록: ${mon.name} (+${gold}골드)`, "codex");
    emit("codex:new", { id: monsterId, monster: mon, gold, stones });
    checkAchievements();
    return { gold, stones };
  };

  G.achievements = function () {
    return G.ACHIEVEMENTS.map((a) => ({
      def: a,
      done: !!a.check(state),
      claimed: !!state.achievements.claimed[a.id]
    }));
  };

  G.achievementReady = function () {
    return G.ACHIEVEMENTS.filter((a) => a.check(state) && !state.achievements.claimed[a.id]).length;
  };

  G.claimAchievement = function (id) {
    const a = G.ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return { ok: false };
    if (state.achievements.claimed[id]) return { ok: false, reason: "already" };
    if (!a.check(state)) return { ok: false, reason: "notyet" };
    state.achievements.claimed[id] = Date.now();
    if (a.reward.gold) addGold(a.reward.gold);
    if (a.reward.stones) addStones(a.reward.stones);
    if (a.reward.frags) addFrags(a.reward.frags);
    G.save();
    G.log(`🏆 업적 [${a.name}] 보상 획득!`, "achv");
    emit("achievement:claim", { achievement: a });
    return { ok: true, reward: a.reward };
  };

  function checkAchievements() {
    const ready = G.achievementReady();
    if (ready > 0) emit("achievement:ready", { count: ready });
  }
  G.checkAchievements = checkAchievements;

  /* ---------------- 스테이지 ---------------- */
  G.stageById = function (key) { return G.stageByKey(key); };
  G.stageReached = function (key) {
    const stage = typeof key === "string" ? G.stageByKey(key) : key;
    if (!stage) return false;
    return stage.index <= state.progress.maxStage;
  };
  G.nextStage = function (key) {
    const stage = G.stageByKey(key);
    if (!stage) return null;
    return G.STAGES.find((s) => s.index === stage.index + 1) || null;
  };

  G.worldProgress = function (worldId) {
    const w = G.worldById(worldId);
    if (!w) return { cleared: 0, total: 0, unlocked: false };
    let cleared = 0;
    for (let s = 1; s <= w.sub; s++) if (state.progress.cleared[worldId + "-" + s]) cleared += 1;
    const first = G.STAGES.find((x) => x.world === worldId);
    return { cleared, total: w.sub, unlocked: !!first && first.index <= state.progress.maxStage };
  };

  /* =================================================================
     3인 파티 — 동료 성장 · 리더 교체
     ================================================================= */
  G.partyLevelCost = function (id) {
    const c = state.party.members[id];
    const lv = c ? c.lv : 1;
    return { gold: G.PARTY_LV.cost(lv), stones: G.PARTY_LV.stones(lv) };
  };

  G.levelCompanion = function (id) {
    const def = G.PARTY.find((p) => p.id === id);
    const c = state.party.members[id];
    if (!def || !c) return { ok: false, reason: "none" };
    if (!c.unlocked) return { ok: false, reason: "locked" };
    if (c.lv >= G.PARTY_LV.max) return { ok: false, reason: "max" };
    const cost = G.partyLevelCost(id);
    if (state.gold < cost.gold) return { ok: false, reason: "gold", cost };
    if (state.stones < cost.stones) return { ok: false, reason: "stones", cost };
    state.gold -= cost.gold;
    state.stones -= cost.stones;
    c.lv += 1;
    G.save();
    G.log(`👥 [${def.name}] Lv.${c.lv} 성장!`, "level");
    emit("party:level", { id, level: c.lv, def });
    return { ok: true, level: c.lv };
  };

  /* 전투 중이면 조종권만 넘긴다(모두 같은 전장에 있다) */
  G.setLeader = function (idx) {
    idx = clamp(int(idx, 0), 0, 2);
    const b = G.battle;
    if (b) {
      const u = b.units[idx];
      if (!u || !u.alive) return { ok: false, reason: "down" };
      if (b.leaderIdx === idx) return { ok: false, reason: "same" };
      b.leaderIdx = idx;
      b.swapFlash = 0.5;
      state.party.leaderIdx = idx;
      state.stats.swaps += 1;
      emit("party:swap", { idx, unit: u });
      return { ok: true, idx };
    }
    state.party.leaderIdx = idx;
    G.save();
    emit("party:swap", { idx, unit: null });
    return { ok: true, idx };
  };

  G.partySummary = function () {
    return G.PARTY.map((def, i) => {
      const c = state.party.members[def.id];
      const st = G.partyStats(def.id);
      return {
        def, idx: i + 1, unlocked: !!(c && c.unlocked), lv: c ? c.lv : 1,
        atk: st.atk, maxHp: st.maxHp, skillLv: c ? c.skill : 0,
        leader: state.party.leaderIdx === i + 1
      };
    });
  };

  /* =================================================================
     사냥 전투 — 다수 몹 몰이사냥 · 3인 파티 · 광역기
     필드 좌표: x 0(왼쪽)~100(오른쪽), y 0(멀리)~100(가까이)
     ================================================================= */
  const FIELD = {
    heroSpeed: 30,
    depthRatio: 0.66,
    dashSpeed: 112,
    dashTime: 0.18,
    dashCd: 1.0,
    heroRange: 16,
    enemyRange: 7.4,
    xMin: 4, xMax: 96, yMin: 12, yMax: 92
  };
  G.FIELD = FIELD;
  let zoneSeq = 0;
  let uidSeq = 0;

  G.battle = null;

  function fieldDist(a, b) {
    if (!a || !b) return 999;
    const dx = a.x - b.x;
    const dy = (a.y - b.y) * 1.15;
    return Math.sqrt(dx * dx + dy * dy);
  }
  G.fieldDist = fieldDist;

  function zoneContains(z, p) {
    if (!z || !p) return false;
    if (z.kind === "circle") return fieldDist({ x: p.x, y: p.y }, { x: z.x, y: z.y }) <= z.r;
    if (z.kind === "lane") {
      const vx = z.x2 - z.x1;
      const vy = (z.y2 - z.y1) * 1.15;
      const wx = p.x - z.x1;
      const wy = (p.y - z.y1) * 1.15;
      const denom = vx * vx + vy * vy || 1;
      let t = (wx * vx + wy * vy) / denom;
      t = Math.max(0, Math.min(1, t));
      const px = z.x1 + vx * t;
      const py = z.y1 + (z.y2 - z.y1) * t;
      return fieldDist({ x: p.x, y: p.y }, { x: px, y: py }) <= z.w / 2;
    }
    return false;
  }
  G.zoneContains = zoneContains;

  function moveStep(o, dx, dy, speed, dt, bounds) {
    const l = Math.hypot(dx, dy) || 1;
    const xb = bounds || FIELD;
    o.x = clamp(o.x + (dx / l) * speed * dt, xb.xMin || 4, xb.xMax || 96);
    o.y = clamp(o.y + (dy / l) * speed * FIELD.depthRatio * dt, xb.yMin || 12, xb.yMax || 92);
  }

  /* ---------- 몬스터 ---------- */
  function enemyFor(stage, monId, isBoss) {
    const mon = G.MONSTERS[monId];
    const tune = G.STAGE_TUNE;
    const w = stage.world;
    const p = (stage.sub - 1) / (stage.worldData ? stage.worldData.sub : 10);
    const scale = Math.pow(tune.goldGrowth, (w - 1) + p);
    const hp = Math.round(stage.recAtk * tune.normalHp * mon.hpMul * (isBoss ? tune.bossHpMul : 1));
    const atk = Math.round(8 * Math.pow(1.16, (w - 1) + p) * mon.atkMul * (isBoss ? 1.2 : 1));
    const gold = Math.round(tune.goldBase * scale * mon.goldMul * (isBoss ? tune.bossGoldMul : 1));
    const exp = Math.round(tune.expBase * Math.pow(tune.expGrowth, (w - 1) + p) * (isBoss ? tune.bossExpMul : 1));
    return {
      id: monId, name: mon.name, kind: mon.kind, color: mon.color, color2: mon.color2,
      boss: !!isBoss, maxHp: hp, hp: hp, atk: atk, gold: gold, exp: exp,
      interval: mon.interval, stageKey: stage.key, world: w,
      pattern: null, patternCd: isBoss ? 4.6 : 0, patternIdx: 0,
      shield: false, enraged: false, stun: 0
    };
  }

  function makeMob(stage, monId, isBoss, b) {
    const base = enemyFor(stage, monId, isBoss);
    const side = Math.random() < 0.5 ? -1 : 1;
    const m = Object.assign(base, {
      uid: ++uidSeq,
      x: clamp(50 + side * rnd(26, 48), 4, 96),
      y: rnd(16, 86),
      r: isBoss ? 13 : 6.2,
      kx: 0, ky: 0,
      flash: 0, swing: 0, dead: false, deadT: 0,
      spawnT: 0.42,
      atkCd: rnd(0.5, 1.4),
      target: null, retargetT: 0,
      speed: (isBoss ? 4.6 : 9.2) + stage.world * 0.55,
      moving: false,
      aliveT: 0
    });
    // 지배자는 위쪽에서 등장
    if (isBoss) { m.x = 50; m.y = 22; m.speed = 4.6 + stage.world * 0.4; }
    return m;
  }

  function mobInterval(m) { return m.boss ? m.interval : m.interval * 1.32; }

  /* ---------- 파티 유닛 ---------- */
  function makeHeroUnit() {
    const st = G.heroStats();
    return {
      kind: "hero", partyId: null, name: "서약자", icon: "🗡", color: "#ff5a6e",
      x: 50, y: 74, face: 1, aim: 0,
      hp: Math.max(1, state.hero.hp), maxHp: st.maxHp,
      atk: st.atk, range: FIELD.heroRange, interval: st.attackInterval, speed: FIELD.heroSpeed + 2,
      atkCd: 0.4, swing: 0, hitFlash: 0, iframe: 0.8,
      mx: 0, my: 0, moving: false, manualT: 0,
      dashT: 0, dashCd: 0, dashDx: 1, dashDy: 0,
      alive: true, downT: 0, skillCd: 0, hits: 0,
      knock: 0, reChase: 0
    };
  }

  function makeCompanionUnit(def, idx) {
    const ps = G.partyStats(def.id);
    return {
      kind: "ally", partyId: def.id, name: def.short, icon: def.icon, color: def.color,
      x: 50 + (idx === 1 ? -9 : 9), y: 79, face: 1, aim: 0,
      hp: ps.maxHp, maxHp: ps.maxHp,
      atk: ps.atk, range: ps.range, interval: ps.interval, speed: ps.speed,
      atkCd: 0.5 + idx * 0.2, swing: 0, hitFlash: 0, iframe: 0.6,
      mx: 0, my: 0, moving: false, manualT: 0,
      dashT: 0, dashCd: 0, dashDx: 1, dashDy: 0,
      alive: true, downT: 0,
      skillCd: 1.8 + idx, skillDef: def.skill, skillPower: ps.skillPower, skillMax: ps.skillCd,
      hits: 0, reChase: 0, knock: 0
    };
  }

  /* ---------- 웨이브 ---------- */
  function wavesFor(stage) {
    const w = stage.worldData;
    const H = G.HORDE;
    if (stage.isBoss) {
      return [
        { quota: H.bossWaveQuota, maxAlive: Math.max(7, H.maxAlive - 2), burst: 7, boss: false,
          monsters: [w.monsters[0], w.monsters[1]], label: "지배자의 문턱" },
        { quota: 0, maxAlive: H.bossMaxAlive, burst: H.bossAdds, boss: true,
          monsters: [w.monsters[1]], label: "지배자 강림" }
      ];
    }
    return [
      { quota: H.waveQuota, maxAlive: H.maxAlive, burst: H.burst, boss: false,
        monsters: [w.monsters[0], w.monsters[0], w.monsters[1]], label: "1진" },
      { quota: H.waveQuota, maxAlive: H.maxAlive, burst: H.burst, boss: false,
        monsters: [w.monsters[1], w.monsters[1], w.monsters[0]], label: "2진" }
    ];
  }

  function pickMonId(wave) {
    const list = wave.monsters || [];
    return list[Math.floor(Math.random() * list.length)] || "m_pudding";
  }

  G.startBattle = function (stageKey) {
    const stage = G.stageByKey(stageKey);
    if (!stage) return { ok: false, reason: "stage" };
    if (!G.stageReached(stage)) return { ok: false, reason: "locked" };
    const st = G.heroStats();
    if (state.hero.hp <= 0) state.hero.hp = Math.round(st.maxHp * 0.5);

    const units = [makeHeroUnit()];
    G.PARTY.forEach((def, i) => {
      const c = state.party.members[def.id];
      if (c && c.unlocked) units.push(makeCompanionUnit(def, i + 1));
    });
    // 저장된 리더가 없거나 쓰러진 유닛이면 서약자로
    let leaderIdx = clamp(int(state.party.leaderIdx, 0), 0, units.length - 1);

    const b = {
      stageKey: stage.key,
      stage: stage,
      waves: wavesFor(stage),
      waveIndex: 0,
      waveKilled: 0,
      waveLabel: "",
      spawnT: 0,
      units: units,
      leaderIdx: leaderIdx,
      mobs: [],
      shots: [],
      zones: [],
      floats: [],
      fxs: [],
      drops: [],
      boss: null,
      cds: {},
      combo: 0,
      comboT: 0,
      ult: 0,
      shake: 0,
      flash: 0,
      hitStop: 0,
      swapFlash: 0,
      auto: state.settings.auto !== false,
      heroTimer: 0.4,
      startedAt: Date.now(),
      over: false,
      patternQueue: (stage.patterns || []).slice(),
      kills: 0,
      maxAlive: 0,
      version: 4
    };
    G.SKILLS.forEach((sk) => { b.cds[sk.id] = 0; });
    G.battle = b;
    startWave(b, 0);
    emit("battle:start", { stage });
    return { ok: true, battle: b };
  };

  function startWave(b, idx) {
    b.waveIndex = idx;
    b.waveKilled = 0;
    const wave = b.waves[idx];
    b.waveLabel = wave.label || "";
    b.spawnT = 0;
    const burst = Math.min(wave.burst || 8, wave.maxAlive);
    for (let i = 0; i < burst; i++) spawnMob(b);
    if (wave.boss) summonBoss(b);
    emit("battle:wave", { wave: idx + 1, total: b.waves.length, label: b.waveLabel, heal: 0 });
  }

  function spawnMob(b) {
    const wave = b.waves[b.waveIndex];
    const m = makeMob(b.stage, pickMonId(wave), false, b);
    // 무리(몰이사냥) 단위로 등장 — 같은 구역에 뭉쳐 나온다
    if (!b.anchor || (b.anchor.ttl || 0) <= 0 || Math.random() < 0.16) {
      const side = Math.random() < 0.5 ? -1 : 1;
      b.anchor = { x: clamp(50 + side * rnd(22, 42), 7, 93), y: rnd(18, 78), ttl: 2.6 };
    }
    m.x = clamp(b.anchor.x + rnd(-8, 8), 4, 96);
    m.y = clamp(b.anchor.y + rnd(-7, 7), 12, 90);
    // 유닛과 너무 가까운 곳은 피한다
    for (let k = 0; k < 6; k++) {
      const near = b.units.some((u) => u.alive && fieldDist(u, m) < 15);
      if (!near) break;
      m.x = clamp(m.x + (m.x < 50 ? -14 : 14), 5, 95);
    }
    b.mobs.push(m);
    b.maxAlive = Math.max(b.maxAlive, b.mobs.filter((x) => !x.dead).length);
    return m;
  }

  function summonBoss(b) {
    const wave = b.waves[b.waveIndex];
    const boss = makeMob(b.stage, b.stage.worldData.boss, true, b);
    boss.patternCd = 4.4;
    b.mobs.push(boss);
    b.boss = boss;
    emit("battle:enemy", { enemy: boss, boss: true });
    emit("battle:bossSpawn", { boss });
  }

  /* ---------- 피해 · 처치 ---------- */
  function addFloat(b, x, y, text, color, size, life) {
    b.floats.push({ x: x, y: y, text: text, color: color || "#fff", size: size || 14, life: life || 0.75, max: life || 0.75, vy: -34 - Math.random() * 14, vx: rnd(-8, 8), crit: size > 17 });
    if (b.floats.length > 26) b.floats.shift();
  }

  function addFx(b, o) {
    o.life = o.life || 0.35;
    o.max = o.life;
    b.fxs.push(o);
    if (b.fxs.length > 70) b.fxs.shift();
  }

  function spark(b, x, y, color, n) {
    for (let i = 0; i < (n || 3); i++) {
      addFx(b, {
        type: "spark", x: x, y: y, vx: rnd(-46, 46), vy: rnd(-60, 18),
        color: color || "#ffd166", life: rnd(0.18, 0.36), size: rnd(1.4, 3.2)
      });
    }
  }

  function dropLoot(b, m) {
    const kinds = ["gold", "gold", "gold"];
    if (Math.random() < 0.5) kinds.push("stone");
    if (Math.random() < 0.32) kinds.push("orb");
    const n = m.boss ? 8 : (2 + Math.floor(Math.random() * 2));
    for (let i = 0; i < n; i++) {
      b.drops.push({
        x: m.x, y: m.y, z: 0,
        vx: rnd(-18, 18), vy: rnd(-24, 8),
        kind: kinds[Math.floor(Math.random() * kinds.length)] || "gold",
        state: "scatter", t: 0, delay: Math.random() * 0.12, r: rnd(2.2, 3.6)
      });
    }
  }

  function mobArc(b, origin, angle, radius, half) {
    const hits = [];
    b.mobs.forEach((m) => {
      if (m.dead) return;
      const d = fieldDist(origin, m);
      if (d > radius + m.r * 0.6) return;
      const ang = Math.atan2((m.y - origin.y) * 1.15, m.x - origin.x);
      let diff = ang - angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= half) hits.push(m);
    });
    return hits;
  }

  function mobCircle(b, center, radius) {
    const hits = [];
    b.mobs.forEach((m) => {
      if (m.dead) return;
      if (fieldDist(center, m) <= radius + m.r * 0.5) hits.push(m);
    });
    return hits;
  }

  function hurtMob(b, m, dmg, opts) {
    if (m.dead) return 0;
    opts = opts || {};
    let d = dmg;
    if (m.shield) d *= 0.3;
    d = Math.max(1, Math.round(d));
    m.hp -= d;
    m.flash = 0.13;
    m.hitCount = (m.hitCount || 0) + 1;
    // 타격감: 넉백
    const src = opts.src || b.units[b.leaderIdx] || b.units[0];
    const dx = m.x - src.x, dy = m.y - src.y;
    const l = Math.hypot(dx, dy * 1.15) || 1;
    const kb = opts.knock === undefined ? (opts.skill ? 9.5 : 5.2) : opts.knock;
    m.kx += (dx / l) * kb;
    m.ky += (dy / l) * kb * 0.8;

    const big = !!opts.crit || !!opts.skill;
    addFloat(b, m.x + rnd(-2, 2), m.y - (m.boss ? 12 : 6),
      (opts.prefix ? opts.prefix : "") + G.fmt(d),
      opts.crit ? "#ffd166" : (opts.skill ? "#ffb0c0" : "#fff2e2"),
      opts.crit ? 21 : (opts.skill ? 17 : 13.5));
    spark(b, m.x, m.y, opts.crit ? "#ffd166" : "#ffb0c0", opts.crit ? 5 : 2);
    if (opts.crit) { b.shake = Math.min(14, b.shake + 4.5); b.hitStop = Math.max(b.hitStop, 0.028); }
    if (opts.skill) { b.shake = Math.min(16, b.shake + 3.2); }

    b.combo += 1;
    b.comboT = 2.6;
    b.ult = Math.min(G.ULT.chargeMax, b.ult + G.ULT.perHit);

    if (m.hp <= 0) killMob(b, m, opts);
    return d;
  }

  function killMob(b, m, opts) {
    if (m.dead) return;
    m.dead = true;
    m.deadT = 0.34;
    m.hp = 0;
    const st = G.heroStats();
    const gold = Math.round(m.gold * (1 + st.goldBonus / 100));
    addGold(gold);
    let stones = 0;
    if (m.boss) stones = 6 + b.stage.world * 2;
    else if (Math.random() < 0.4) stones = 1 + (Math.random() < 0.15 ? 1 : 0);
    let frags = 0;
    if (m.boss) frags = 3 + Math.floor(b.stage.world * 0.8);
    else if (Math.random() < 0.045) frags = 1;
    addStones(stones);
    addFrags(frags);
    G.addExp(m.exp);

    b.kills += 1;
    b.waveKilled += 1;
    b.combo += 1;
    b.comboT = 2.6;
    b.ult = Math.min(G.ULT.chargeMax, b.ult + G.ULT.perKill);
    state.stats.kills += 1;
    if (m.boss) state.stats.bossKills += 1;

    const codex = G.registerCodex(m.id, b.stage);
    dropLoot(b, m);
    if (m.boss) {
      addFloat(b, m.x, m.y - 18, "지배자 격파!", "#ffe9a8", 20, 1.4);
      b.shake = 20;
      b.flash = 0.5;
      spark(b, m.x, m.y, "#ffe9a8", 16);
      // 지배자가 쓰러지면 소환수도 함께 무너진다
      b.mobs.forEach((x) => { if (!x.dead && x !== m) { x.hp = 0; x.dead = true; x.deadT = 0.3; } });
    }
    emit("battle:kill", {
      enemy: m, gold: gold, stones: stones, frags: frags, exp: m.exp,
      combo: b.combo, codex: codex, boss: m.boss, x: m.x, y: m.y
    });
    G.save();
    checkAchievements();
    if (m.boss) {
      b.waveKilled = b.waves[b.waveIndex].quota || 1;
    }
  }

  function damageUnit(b, u, dmg, src, kind) {
    if (!u.alive || u.iframe > 0) return 0;
    dmg = Math.max(1, Math.round(dmg));
    u.hp -= dmg;
    u.hitFlash = 0.22;
    addFloat(b, u.x + rnd(-2, 2), u.y - 10, "-" + G.fmt(dmg), "#ff6b7a", 14);
    b.shake = Math.min(12, b.shake + 2.2);
    if (u.kind === "hero") state.hero.hp = Math.max(0, u.hp);
    emit("battle:damage", {
      target: u.kind === "hero" ? "hero" : "ally", amount: dmg, unit: u,
      heroHp: state.hero.hp, heroMaxHp: b.units[0].maxHp, kind: kind || "mob"
    });
    if (u.hp <= 0) downUnit(b, u);
    return dmg;
  }

  function downUnit(b, u) {
    u.hp = 0;
    u.alive = false;
    u.downT = u.kind === "hero" ? 5.5 : 7.5;
    addFloat(b, u.x, u.y - 14, "쓰러짐", "#9fb8ff", 15, 1.1);
    emit("party:down", { unit: u });
    if (u.kind === "hero") state.hero.hp = 0;
    if (b.leaderIdx === b.units.indexOf(u)) {
      const next = b.units.findIndex((x) => x.alive);
      if (next >= 0) {
        b.leaderIdx = next;
        emit("party:swap", { idx: next, unit: b.units[next], auto: true });
      }
    }
    if (!b.units.some((x) => x.alive)) {
      b.units.forEach((x) => { if (!x.alive) { x.alive = true; } });
      onHeroDeath(b);
    }
  }

  function reviveUnits(b, dt) {
    b.units.forEach((u) => {
      if (u.alive) return;
      u.downT -= dt;
      if (u.downT <= 0) {
        u.alive = true;
        u.hp = Math.round(u.maxHp * 0.35);
        u.iframe = 1.1;
        addFloat(b, u.x, u.y - 12, "부활", "#a8e6cf", 15, 1);
        if (u.kind === "hero") state.hero.hp = u.hp;
        emit("party:revive", { unit: u });
      }
    });
  }

  /* ---------- 공격 ---------- */
  function nearestMob(b, from, maxD) {
    let best = null, bd = maxD === undefined ? 1e9 : maxD;
    b.mobs.forEach((m) => {
      if (m.dead) return;
      const d = fieldDist(from, m);
      if (d < bd) { bd = d; best = m; }
    });
    return best;
  }

  function aimAt(u, m) {
    if (!m) return u.face > 0 ? 0 : Math.PI;
    return Math.atan2((m.y - u.y) * 1.15, m.x - u.x);
  }

  function unitAttack(b, u) {
    const target = nearestMob(b, u, u.range + 8);
    if (!target) return false;
    u.aim = aimAt(u, target);
    u.face = Math.cos(u.aim) < 0 ? -1 : 1;
    const dist = fieldDist(u, target);
    if (dist > u.range + target.r * 0.6) { u.reChase = 0.5; return false; }
    u.swing = 0.26;
    u.atkCd = u.interval;
    const half = u.kind === "hero" ? 1.75 : (u.partyId === "knight" ? 1.5 : 1.6);
    const hits = mobArc(b, u, u.aim, u.range, half);
    const st = G.heroStats();
    let total = 0, crits = 0;
    hits.forEach((m) => {
      const crit = Math.random() * 100 < st.critChance;
      let dmg = u.atk * (0.9 + Math.random() * 0.2);
      if (crit) dmg *= 1 + st.critDmg / 100;
      total += hurtMob(b, m, dmg, { crit: crit, src: u });
      if (crit) crits++;
      u.hits += 1;
    });
    if (hits.length) {
      addFx(b, {
        type: "slash", x: u.x, y: u.y, ang: u.aim, r: u.range, life: 0.22,
        color: u.kind === "hero" ? "#ffd0d8" : u.color, wide: hits.length > 2
      });
      b.shake = Math.min(9, b.shake + (crits ? 1.6 : 0.7) + (hits.length > 3 ? 1.2 : 0));
      b.hitStop = Math.max(b.hitStop, crits ? 0.022 : 0.012);
      emit("battle:damage", {
        target: "enemy", amount: total, crit: crits > 0, hits: hits.length,
        heroHp: state.hero.hp, heroMaxHp: b.units[0].maxHp
      });
    }
    return hits.length > 0;
  }

  /* ---------- 기술 ---------- */
  function castSkillAt(b, u, sk, aim, centerOverride) {
    const st = G.heroStats();
    const power = G.skillPower(sk);
    const half = ((sk.half || 180) * Math.PI) / 180;
    const res = { hits: 0, dmg: 0 };
    if (sk.shape === "circle") {
      const c = centerOverride || densestPoint(b) || { x: u.x + Math.cos(aim) * 14, y: u.y + Math.sin(aim) * 14 };
      addFx(b, { type: "meteor", x: c.x, y: c.y, r: sk.radius, life: 0.62, color: "#c58bff" });
      b.shake = Math.min(18, b.shake + 8);
      b.flash = Math.max(b.flash, 0.22);
      const hits = mobCircle(b, c, sk.radius);
      hits.forEach((m) => {
        const crit = !!sk.alwaysCrit || Math.random() * 100 < st.critChance;
        let dmg = st.atk * power * (0.94 + Math.random() * 0.12);
        if (crit) dmg *= 1 + st.critDmg / 100;
        res.dmg += hurtMob(b, m, dmg, { crit: crit, skill: sk.id, prefix: "", src: u });
        res.hits++;
      });
    } else {
      // arc / nova
      const hits = sk.shape === "nova"
        ? mobCircle(b, u, sk.radius)
        : mobArc(b, u, aim, sk.radius, half);
      addFx(b, {
        type: sk.shape === "nova" ? "nova" : "arc", x: u.x, y: u.y, ang: aim,
        r: sk.radius, half: half, life: 0.42, color: sk.id === "jelly" ? "#ff5a6e" : "#ffd0d8"
      });
      b.shake = Math.min(16, b.shake + 5);
      hits.forEach((m) => {
        const crit = Math.random() * 100 < st.critChance;
        let dmg = st.atk * power * (0.94 + Math.random() * 0.12);
        if (crit) dmg *= 1 + st.critDmg / 100;
        res.dmg += hurtMob(b, m, dmg, { crit: crit, skill: sk.id, src: u });
        res.hits++;
      });
    }
    return res;
  }

  function densestPoint(b) {
    let best = null, bestN = 0;
    b.mobs.forEach((m) => {
      if (m.dead) return;
      let n = 0;
      b.mobs.forEach((o) => { if (!o.dead && fieldDist(m, o) < 18) n++; });
      if (n > bestN) { bestN = n; best = m; }
    });
    return best ? { x: best.x, y: best.y } : null;
  }

  G.useSkill = function (id) {
    const b = G.battle;
    if (!b || b.over) return { ok: false, reason: "battle" };
    const sk = G.SKILLS.find((x) => x.id === id);
    if (!sk) return { ok: false };
    if (!G.skillUnlocked(sk)) return { ok: false, reason: "locked" };
    if ((b.cds[id] || 0) > 0) return { ok: false, reason: "cooldown" };
    const u = b.units[b.leaderIdx] || b.units[0];
    if (!u || !u.alive) return { ok: false, reason: "down" };
    b.cds[id] = sk.cd;
    const target = nearestMob(b, u, 40);
    const aim = aimAt(u, target);
    u.aim = aim;
    u.face = Math.cos(aim) < 0 ? -1 : 1;
    u.swing = 0.3;
    const res = castSkillAt(b, u, sk, aim);
    emit("battle:skill", { skill: sk, hits: res.hits, dmg: res.dmg });
    if (sk.type === "heal") {
      const st = G.heroStats();
      const amount = Math.round(st.maxHp * power(sk));
      b.units.forEach((x) => {
        if (!x.alive) return;
        const add = Math.round(x.maxHp * power(sk));
        x.hp = Math.min(x.maxHp, x.hp + add);
        if (x.kind === "hero") state.hero.hp = x.hp;
      });
      addFx(b, { type: "ring", x: u.x, y: u.y, r: sk.radius * 1.2, life: 0.5, color: "#7dffb0" });
      emit("battle:heal", { amount: amount, skill: sk, heroHp: state.hero.hp, heroMaxHp: G.heroStats().maxHp });
      G.save();
    }
    return { ok: true, hits: res.hits, dmg: res.dmg };
  };

  function power(sk) { return G.skillPower(sk); }

  /* ---------- 궁극기 ---------- */
  G.castUltimate = function () {
    const b = G.battle;
    if (!b || b.over) return { ok: false, reason: "battle" };
    if (b.ult < G.ULT.chargeMax) return { ok: false, reason: "charge", need: G.ULT.chargeMax - b.ult };
    const u = b.units[b.leaderIdx] || b.units[0];
    if (!u || !u.alive) return { ok: false, reason: "down" };
    b.ult = 0;
    state.stats.ults += 1;
    const st = G.heroStats();
    b.shake = 22;
    b.flash = 0.55;
    addFx(b, { type: "ult", x: u.x, y: u.y, r: 42, life: 0.8, color: "#ffe9a8" });
    const hits = b.mobs.filter((m) => !m.dead);
    let dmgSum = 0;
    hits.forEach((m) => {
      const crit = true;
      const dmg = st.atk * G.ULT.power * (0.95 + Math.random() * 0.1) * (1 + st.critDmg / 100);
      dmgSum += hurtMob(b, m, dmg, { crit: crit, skill: "ult", src: u, knock: 12 });
    });
    // 파티 전원 회복
    b.units.forEach((x) => {
      if (!x.alive) return;
      x.hp = Math.min(x.maxHp, x.hp + Math.round(x.maxHp * G.ULT.heal));
      if (x.kind === "hero") state.hero.hp = x.hp;
    });
    emit("battle:ult", { hits: hits.length, dmg: dmgSum, name: G.ULT.name });
    G.save();
    return { ok: true, hits: hits.length, dmg: dmgSum };
  };

  /* ---------- 몹 AI ---------- */
  function pickTarget(b, m) {
    const alive = b.units.filter((u) => u.alive);
    if (!alive.length) return null;
    let best = null, bd = 1e9;
    alive.forEach((u) => {
      let d = fieldDist(m, u);
      if (u.partyId === "knight") d -= 5.5;     // 기사가 어그로를 끈다
      if (u.kind === "hero") d += 1.5;
      if (d < bd) { bd = d; best = u; }
    });
    return best;
  }

  function stepMobs(b, dt) {
    const mobs = b.mobs;
    for (let i = mobs.length - 1; i >= 0; i--) {
      const m = mobs[i];
      m.flash = Math.max(0, m.flash - dt);
      m.swing = Math.max(0, m.swing - dt);
      m.stun = Math.max(0, m.stun - dt);
      if (m.dead) {
        m.deadT -= dt;
        if (m.deadT <= 0) mobs.splice(i, 1);
        continue;
      }
      m.spawnT = Math.max(0, m.spawnT - dt);
      m.aliveT += dt;
      // 넉백
      m.x = clamp(m.x + m.kx * dt, 3, 97);
      m.y = clamp(m.y + m.ky * dt * FIELD.depthRatio, 10, 94);
      m.kx *= Math.max(0, 1 - dt * 6.5);
      m.ky *= Math.max(0, 1 - dt * 6.5);

      m.retargetT -= dt;
      if (!m.target || !m.target.alive || m.retargetT <= 0) {
        m.target = pickTarget(b, m);
        m.retargetT = 1.3 + Math.random() * 0.8;
      }
      const t = m.target;
      if (!t || m.spawnT > 0 || m.stun > 0) { m.moving = false; continue; }

      const dist = fieldDist(m, t);
      const atkRange = m.boss ? 11 : FIELD.enemyRange;
      const tele = m.pattern && m.pattern.phase === "telegraph";
      if (!tele && dist > atkRange * 0.92) {
        moveStep(m, t.x - m.x, t.y - m.y, m.speed, dt);
        m.moving = true;
        m.face = t.x < m.x ? -1 : 1;
      } else {
        m.moving = false;
        m.face = t.x < m.x ? -1 : 1;
      }

      if (!tele && m.spawnT <= 0 && dist <= atkRange + 1.6) {
        m.atkCd -= dt;
        if (m.atkCd <= 0) {
          m.atkCd = mobInterval(m);
          m.swing = 0.3;
          const mul = m.boss ? 1 : G.STAGE_TUNE.mobAtkMul;
          damageUnit(b, t, m.atk * mul * (0.9 + Math.random() * 0.2), m, m.boss ? "boss" : "mob");
          if (G.battle !== b || b.over) return;
        }
      }
    }

    // 몹끼리 겹치지 않게 (간단한 분리)
    for (let i = 0; i < mobs.length; i++) {
      const a = mobs[i];
      if (a.dead) continue;
      for (let j = i + 1; j < mobs.length; j++) {
        const c = mobs[j];
        if (c.dead) continue;
        const dx = c.x - a.x, dy = (c.y - a.y) * 1.15;
        const d = Math.hypot(dx, dy);
        const minD = (a.r + c.r) * 0.7;
        if (d > 0.001 && d < minD) {
          const push = ((minD - d) / d) * 0.5;
          const wa = c.boss ? 0.2 : 1, wc = a.boss ? 0.2 : 1;
          a.x -= dx * push * 0.5 * wa; a.y -= dy * push * 0.5 * wa;
          c.x += dx * push * 0.5 * wc; c.y += dy * push * 0.5 * wc;
        }
      }
    }
  }

  /* ---------- 유닛 이동 · AI ---------- */
  function unitMoveTowards(b, u, tx, ty, speed, dt) {
    const dx = tx - u.x, dy = (ty - u.y);
    if (Math.hypot(dx, dy * 1.15) < 0.6) { u.moving = false; return; }
    moveStep(u, dx, dy, speed, dt);
    u.moving = true;
    if (Math.abs(dx) > 0.4) u.face = dx < 0 ? -1 : 1;
  }

  function findDangerZone(b, u) {
    let best = null, bd = 1e9;
    (b.zones || []).forEach((z) => {
      if (z.t <= 0) return;
      let d;
      if (z.kind === "circle") d = fieldDist(u, { x: z.x, y: z.y }) - z.r;
      else d = fieldDist(u, { x: (z.x1 + z.x2) / 2, y: (z.y1 + z.y2) / 2 }) - z.w;
      if (d < bd) { bd = d; best = z; }
    });
    return bd < 7 ? best : null;
  }

  function stepUnit(b, u, dt, isLeader) {
    u.flash = Math.max(0, u.hitFlash - dt);
    u.hitFlash = Math.max(0, u.hitFlash - dt);
    u.iframe = Math.max(0, u.iframe - dt);
    u.swing = Math.max(0, u.swing - dt);
    u.atkCd = Math.max(0, u.atkCd - dt);
    u.dashCd = Math.max(0, u.dashCd - dt);
    u.manualT = Math.max(0, u.manualT - dt);
    u.reChase = Math.max(0, u.reChase - dt);
    if (!u.alive) return;

    const manual = isLeader && Math.hypot(u.mx, u.my) > 0.08;

    if (u.dashT > 0) {
      u.dashT = Math.max(0, u.dashT - dt);
      u.x = clamp(u.x + u.dashDx * FIELD.dashSpeed * dt, 3, 97);
      u.y = clamp(u.y + u.dashDy * FIELD.dashSpeed * FIELD.depthRatio * dt, 8, 94);
      u.moving = true;
      return;
    }

    if (manual) {
      moveStep(u, u.mx, u.my, u.speed, dt);
      u.moving = true;
      u.face = u.mx < 0 ? -1 : 1;
      u.aim = Math.atan2(u.my * 1.15, u.mx);
      return;
    }

    // 자동/동료 AI: 위험 지대 회피 → 사거리 유지 → 공격
    const danger = findDangerZone(b, u);
    if (danger) {
      const cx = danger.kind === "circle" ? danger.x : (danger.x1 + danger.x2) / 2;
      const cy = danger.kind === "circle" ? danger.y : (danger.y1 + danger.y2) / 2;
      let ax = u.x - cx, ay = u.y - cy;
      if (Math.hypot(ax, ay * 1.15) < 1.5) { ax = u.x < 50 ? -1 : 1; ay = 0; }
      moveStep(u, ax, ay, u.speed * 1.35, dt);
      u.moving = true;
      return;
    }

    const target = nearestMob(b, u, 60);
    if (!target) { u.moving = false; return; }
    const dist = fieldDist(u, target);
    const want = u.kind === "hero" ? u.range * 0.8 : u.range * 0.72;
    // 자동 조종 시에는 한 마리가 아니라 '가장 뭉친 무리' 쪽으로 파고든다 (몰이사냥)
    let mv = target;
    if (u.kind === "hero" && b.auto && dist > want) {
      const c = densestPoint(b);
      if (c && fieldDist(u, c) < 46) mv = c;
    }
    if (dist > want) {
      unitMoveTowards(b, u, mv.x, mv.y, u.speed, dt);
    } else if (dist < want * 0.45) {
      unitMoveTowards(b, u, u.x - (target.x - u.x), u.y - (target.y - u.y), u.speed * 0.7, dt);
    } else {
      u.moving = false;
      u.aim = aimAt(u, target);
      u.face = Math.cos(u.aim) < 0 ? -1 : 1;
    }

    if (u.kind === "hero" && b.auto) {
      if (u.atkCd <= 0 && dist <= u.range + target.r) unitAttack(b, u);
    } else if (u.kind === "ally") {
      if (u.atkCd <= 0 && dist <= u.range + target.r) {
        if (u.partyId === "mage") {
          // 화염구 투사체
          u.swing = 0.3;
          u.atkCd = u.interval;
          u.aim = aimAt(u, target);
          const sp = 62;
          const ang = u.aim;
          b.shots.push({
            x: u.x, y: u.y - 4, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            dmg: u.atk, ttl: 1.2, kind: "fire", color: u.color, aoe: 7.5, target: target.uid
          });
        } else {
          unitAttack(b, u);
        }
      }
      // 동료 기술
      u.skillCd = Math.max(0, u.skillCd - dt);
      if (u.skillCd <= 0 && b.mobs.some((m) => !m.dead && fieldDist(u, m) < u.range)) {
        u.skillCd = u.skillMax;
        const sk = u.skillDef;
        const aim = aimAt(u, target);
        const hits = sk.shape === "circle"
          ? mobCircle(b, densestPoint(b) || target, sk.radius)
          : mobArc(b, u, aim, sk.radius, (sk.half * Math.PI) / 180);
        addFx(b, {
          type: sk.shape === "circle" ? "burst" : "arc", x: u.x, y: u.y, ang: aim,
          r: sk.radius, half: (sk.half * Math.PI) / 180, life: 0.4, color: u.color
        });
        hits.forEach((m) => {
          const crit = Math.random() * 100 < 22;
          hurtMob(b, m, u.atk * u.skillPower * (0.95 + Math.random() * 0.1), {
            crit: crit, skill: "ally", src: u, prefix: ""
          });
        });
        emit("battle:allySkill", { unit: u, name: sk.name, hits: hits.length });
      }
    }
  }

  function stepShots(b, dt) {
    for (let i = b.shots.length - 1; i >= 0; i--) {
      const s = b.shots[i];
      s.ttl -= dt;
      // 살짝 유도
      const tgt = b.mobs.find((m) => m.uid === s.target && !m.dead);
      if (tgt) {
        const ang = Math.atan2((tgt.y - s.y) * 1.15, tgt.x - s.x);
        const sp = Math.hypot(s.vx, s.vy);
        const cur = Math.atan2(s.vy, s.vx);
        let diff = ang - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const na = cur + diff * Math.min(1, dt * 4);
        s.vx = Math.cos(na) * sp;
        s.vy = Math.sin(na) * sp;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let hit = null;
      b.mobs.forEach((m) => {
        if (m.dead || hit) return;
        if (fieldDist(s, m) < 4.5 + m.r * 0.5) hit = m;
      });
      if (hit) {
        const hits = mobCircle(b, s, s.aoe || 7);
        addFx(b, { type: "burst", x: s.x, y: s.y, r: s.aoe || 8, life: 0.32, color: s.color });
        hits.forEach((m) => {
          hurtMob(b, m, s.dmg * (0.85 + Math.random() * 0.3), { crit: Math.random() * 100 < 20, skill: "ally", src: b.units[1] || b.units[0] });
        });
        b.shots.splice(i, 1);
        continue;
      }
      if (s.ttl <= 0 || s.x < 0 || s.x > 100 || s.y < 0 || s.y > 100) b.shots.splice(i, 1);
    }
  }

  /* ---------- 보스 패턴 ---------- */
  function startBossPattern(b) {
    const e = b.boss;
    if (!e || e.dead || e.pattern) return;
    const queue = b.patternQueue.length ? b.patternQueue : b.stage.patterns;
    if (!queue || !queue.length) return;
    const id = queue[e.patternIdx % queue.length];
    e.patternIdx += 1;
    const pat = G.PATTERNS[id];
    if (!pat) return;
    const u = b.units[b.leaderIdx] || b.units[0];
    if (pat.action === "counter") {
      e.pattern = { id: id, phase: "active", timer: pat.duration, total: pat.duration, responded: false };
      e.shield = true;
      emit("battle:pattern", { pattern: pat, phase: "active", total: pat.duration, enemy: e });
      return;
    }
    const tel = Math.max(1.4, pat.telegraph - b.stage.world * 0.045);
    e.pattern = { id: id, phase: "telegraph", timer: tel, total: tel, responded: false };
    let zone = null;
    if (pat.action === "guard") {
      zone = { id: "z" + (++zoneSeq), kind: "circle", x: u.x, y: u.y, r: 15.5, w: 0, t: tel, total: tel, patternId: id };
    } else if (pat.action === "dodge") {
      const dx = u.x - e.x, dy = u.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      zone = {
        id: "z" + (++zoneSeq), kind: "lane",
        x1: e.x, y1: e.y,
        x2: u.x + (dx / len) * 16, y2: u.y + (dy / len) * 16,
        w: 11, t: tel, total: tel, patternId: id
      };
    }
    if (zone) {
      b.zones.push(zone);
      e.pattern.zone = zone;
    }
    emit("battle:pattern", { pattern: pat, phase: "telegraph", total: tel, enemy: e, zone });
  }

  function resolveBossPattern(b) {
    const e = b.boss;
    if (!e || !e.pattern) return;
    const pat = G.PATTERNS[e.pattern.id];
    const responded = e.pattern.responded;
    const zone = e.pattern.zone;
    const u = b.units[b.leaderIdx] || b.units[0];
    const inZone = zone ? zoneContains(zone, u) : true;
    let dmg = Math.max(1, Math.round(e.atk * pat.mult * (b.stage.world > 1 ? 1 + b.stage.world * 0.02 : 1)));
    if (responded) dmg = Math.round(dmg * pat.reduce);
    if (!inZone) dmg = 0;
    if (zone) zone.t = 0;
    if (dmg > 0 && u.alive) {
      u.iframe = 0;
      damageUnit(b, u, dmg, e, "boss");
    }
    emit("battle:patternResolve", {
      pattern: pat, responded: responded, dmg: dmg, dodged: !inZone,
      heroHp: state.hero.hp, heroMaxHp: b.units[0].maxHp
    });
    e.pattern = null;
    e.patternCd = Math.max(4.4, 8.4 - b.stage.world * 0.18);
    if (responded) {
      if (pat.action === "guard") state.stats.guards += 1;
      if (pat.action === "dodge") state.stats.dodges += 1;
      const hits = mobCircle(b, u, 18);
      hits.forEach((m) => hurtMob(b, m, G.heroStats().atk * 0.8, { skill: "counter", src: u }));
      if (!G.battle) return;
    }
    if (!b.units.some((x) => x.alive)) onHeroDeath(b);
    G.save();
  }

  G.respond = function (action) {
    const b = G.battle;
    const e = b && b.boss;
    if (!e || !e.pattern) return { ok: false, reason: "none" };
    const pat = G.PATTERNS[e.pattern.id];
    if (!pat) return { ok: false };
    if (e.pattern.responded) return { ok: false, reason: "already" };
    if (action !== pat.action) return { ok: false, reason: "wrong", expected: pat.action };

    if (pat.action === "counter") {
      e.shield = false;
      e.pattern = null;
      e.patternCd = Math.max(4.6, 8.6 - b.stage.world * 0.18);
      e.stun = 2;
      state.stats.counters += 1;
      const u = b.units[b.leaderIdx] || b.units[0];
      const dmg = hurtMob(b, e, G.heroStats().atk * 2.6, { crit: true, skill: "counter", src: u });
      emit("battle:counter", { dmg: dmg });
      G.save();
      return { ok: true, kind: "counter" };
    }

    e.pattern.responded = true;
    emit("battle:respond", { pattern: pat, action: action });
    return { ok: true, kind: action };
  };

  /* ---------- 한 프레임 ---------- */
  function stepBattle(dt) {
    const b = G.battle;
    if (!b) return;
    if (b.over) return;

    if (b.hitStop > 0) {
      b.hitStop = Math.max(0, b.hitStop - dt);
      dt *= 0.18;
    }

    b.shake = Math.max(0, b.shake - dt * 34);
    b.flash = Math.max(0, b.flash - dt * 2.2);
    b.swapFlash = Math.max(0, (b.swapFlash || 0) - dt * 2);
    b.comboT = Math.max(0, b.comboT - dt);
    if (b.comboT <= 0) b.combo = 0;

    G.SKILLS.forEach((sk) => { b.cds[sk.id] = Math.max(0, (b.cds[sk.id] || 0) - dt); });

    // 유닛
    const leader = b.units[b.leaderIdx];
    b.units.forEach((u, i) => stepUnit(b, u, dt, u === leader));
    if (G.battle !== b || b.over) return;
    reviveUnits(b, dt);

    stepMobs(b, dt);
    if (G.battle !== b || b.over) return;
    stepShots(b, dt);

    // 웨이브 진행 · 리스폰
    const wave = b.waves[b.waveIndex];
    b.spawnT -= dt;
    if (b.anchor) b.anchor.ttl = (b.anchor.ttl || 0) - dt;
    const aliveMobs = b.mobs.filter((m) => !m.dead).length;
    if (b.spawnT <= 0 && wave) {
      const cap = wave.boss ? wave.maxAlive + (b.boss && !b.boss.dead ? 1 : 0) : wave.maxAlive + 1;
      const quotaLeft = Math.max(0, (wave.quota || 0) - b.waveKilled);
      const needSpawn = wave.boss ? aliveMobs < cap : (aliveMobs < cap && quotaLeft > 0);
      if (needSpawn) {
        spawnMob(b);
        b.spawnT = G.HORDE.respawnGap;
      }
    }

    // 보스 패턴
    const e = b.boss;
    if (e && !e.dead) {
      if (e.stun > 0) {
        // 기절 중
      } else if (e.pattern) {
        e.pattern.timer = Math.max(0, e.pattern.timer - dt);
        emit("battle:patternTick", {
          patternId: e.pattern.id, phase: e.pattern.phase,
          timer: e.pattern.timer, total: e.pattern.total, responded: e.pattern.responded
        });
        if (e.pattern.timer <= 0) {
          if (e.pattern.phase === "telegraph") resolveBossPattern(b);
          else {
            e.shield = false;
            e.pattern = null;
            e.patternCd = Math.max(4.6, 8.6 - b.stage.world * 0.18);
            emit("battle:patternEnd", {});
          }
          if (G.battle !== b || b.over) return;
        }
      } else {
        e.patternCd -= dt;
        if (e.patternCd <= 0) startBossPattern(b);
      }
      // 격노
      if (!e.enraged && e.hp / e.maxHp <= 0.5) {
        e.enraged = true;
        e.atk = Math.round(e.atk * 1.35);
        e.speed *= 1.15;
        emit("battle:enrage", { enemy: e });
      }
    }

    // 위험 지대 수명
    if (b.zones.length) {
      b.zones.forEach((z) => { z.t = Math.max(0, z.t - dt); });
      b.zones = b.zones.filter((z) => z.t > 0 || (e && e.pattern && e.pattern.zone === z));
    }

    // 연출 수명
    for (let i = b.floats.length - 1; i >= 0; i--) {
      const f = b.floats[i];
      f.life -= dt;
      f.y += f.vy * dt * 0.1;
      f.x += f.vx * dt * 0.1;
      f.vy += 40 * dt;
      if (f.life <= 0) b.floats.splice(i, 1);
    }
    for (let i = b.fxs.length - 1; i >= 0; i--) {
      const f = b.fxs[i];
      f.life -= dt;
      if (f.type === "spark") {
        f.x += f.vx * dt * 0.6;
        f.y += f.vy * dt * 0.45;
        f.vy += 150 * dt;
      }
      if (f.life <= 0) b.fxs.splice(i, 1);
    }
    // 드롭: 흩어진 뒤 리더에게 빨려간다
    const lead = b.units[b.leaderIdx] && b.units[b.leaderIdx].alive ? b.units[b.leaderIdx] : b.units[0];
    for (let i = b.drops.length - 1; i >= 0; i--) {
      const d = b.drops[i];
      d.t += dt;
      if (d.t < d.delay) continue;
      if (d.state === "scatter") {
        d.x += d.vx * dt * 0.5;
        d.y += d.vy * dt * 0.5;
        d.vx *= 1 - dt * 2.6;
        d.vy *= 1 - dt * 2.6;
        if (d.t > 0.45) d.state = "fly";
      } else {
        const dx = lead.x - d.x, dy = lead.y - d.y;
        const dist = Math.hypot(dx, dy * 1.15) || 1;
        const sp = 52 + d.t * 110;
        d.x += (dx / dist) * sp * dt;
        d.y += (dy / dist) * sp * dt;
        if (dist < 3) b.drops.splice(i, 1);
      }
    }

    if (b.auto) autoSkills(b);

    // 웨이브 종료 판정
    const w = b.waves[b.waveIndex];
    if (w) {
      const done = w.boss ? (b.boss && b.boss.dead) : (b.waveKilled >= w.quota);
      if (done) {
        if (b.waveIndex < b.waves.length - 1) {
          const st = G.heroStats();
          const heal = Math.round(st.maxHp * G.STAGE_TUNE.waveHeal);
          b.units.forEach((u) => {
            if (!u.alive) return;
            u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * G.STAGE_TUNE.waveHeal));
            if (u.kind === "hero") state.hero.hp = u.hp;
          });
          b.ult = Math.min(G.ULT.chargeMax, b.ult + G.ULT.perWave);
          emit("battle:waveClear", { wave: b.waveIndex + 1, heal: heal });
          G.log(`🌊 ${b.stage.label} ${b.waveIndex + 1}진을 쓸어버렸습니다!`, "win");
          startWave(b, b.waveIndex + 1);
        } else {
          onStageClear(b);
        }
      }
    }
  }
  G.stepBattle = stepBattle;

  function autoSkills(b) {
    if (!b.auto || !G.battle) return;
    const u = b.units[b.leaderIdx];
    if (!u || !u.alive) return;
    const st = G.heroStats();
    G.SKILLS.forEach((sk) => {
      if (!G.skillUnlocked(sk) || (b.cds[sk.id] || 0) > 0) return;
      if (sk.type === "heal") {
        if (u.hp / u.maxHp < 0.6) G.useSkill(sk.id);
      } else {
        const near = b.mobs.filter((m) => !m.dead && fieldDist(u, m) <= sk.radius + 4).length;
        if (near >= 3) G.useSkill(sk.id);
      }
    });
    if (b.ult >= G.ULT.chargeMax) {
      const near = b.mobs.filter((m) => !m.dead).length;
      if (near >= 4) G.castUltimate();
    }
  }

  function onHeroDeath(b) {
    if (!b) return;
    b.over = true;
    const st = G.heroStats();
    state.hero.hp = Math.round(st.maxHp * 0.35);
    G.battle = null;
    G.save();
    emit("battle:defeat", { stage: b.stage });
    G.log(`💫 ${b.stage.label} ${b.stage.name}에서 파티가 전멸했습니다... 다시 서약하십시오.`, "fail");
  }

  function onStageClear(b) {
    if (!b || b.over) return;
    b.over = true;
    const stage = b.stage;
    const s = stage.key;
    const first = !state.progress.cleared[s];
    state.progress.cleared[s] = (state.progress.cleared[s] || 0) + 1;
    state.stats.clears += 1;
    const next = G.nextStage(s);
    if (next && state.progress.maxStage < next.index) state.progress.maxStage = next.index;

    const st = G.heroStats();
    const w = stage.world;
    const p = (stage.sub - 1) / (stage.worldData ? stage.worldData.sub : 10);
    const base = G.STAGE_TUNE.goldBase * Math.pow(G.STAGE_TUNE.goldGrowth, (w - 1) + p);
    let gold = Math.round(base * 6 * (1 + st.goldBonus / 100));
    let stones = 2 + Math.floor(w / 2);
    let frags = 1 + Math.floor(w / 3);
    let exp = Math.round(18 * Math.pow(1.42, (w - 1) + p));

    if (stage.isBoss) {
      gold = Math.round(base * 18 * (1 + st.goldBonus / 100));
      stones = 8 + w * 3;
      frags = 5 + Math.floor(w * 1.2);
      exp = Math.round(120 * Math.pow(1.42, (w - 1) + p));
      if (first) { gold = Math.round(gold * 1.5); stones += 5; frags += 3; }
    } else if (first) {
      gold = Math.round(gold * 1.5);
      stones += 2;
      frags += 1;
    }

    addGold(gold); addStones(stones); addFrags(frags); G.addExp(exp);
    const heroU = b.units[0];
    if (heroU) {
      heroU.hp = Math.min(heroU.maxHp, heroU.hp + Math.round(heroU.maxHp * 0.3));
      state.hero.hp = Math.min(G.heroStats().maxHp, heroU.hp);
    }
    state.progress.firstClear[s] = state.progress.firstClear[s] || (first ? Date.now() : 0);

    const result = {
      stage, first: first, boss: stage.isBoss, gold, stones, frags, exp,
      cleared: state.progress.cleared[s], kills: b.kills,
      unlockedNext: first && next && next.index <= state.progress.maxStage ? next : null
    };
    G.battle = null;
    G.save();
    emit("battle:victory", result);
    tutorialEmit();
    G.log(`🎉 ${stage.label} ${stage.name} 정복! (+${G.fmt(gold)}골드${stage.isBoss ? " · 지배자 격파" : ""})`, "win");
    checkAchievements();
  }

  G.flee = function () {
    if (!G.battle) return;
    const b = G.battle;
    b.over = true;
    const u = b.units[0];
    if (u) state.hero.hp = Math.max(1, Math.min(u.maxHp, u.hp));
    G.battle = null;
    emit("battle:flee", { stage: b.stage });
    G.save();
  };

  /* ---------- 조작 API ---------- */
  G.arena = {
    setMove(dx, dy) {
      const b = G.battle;
      const u = b && b.units[b.leaderIdx];
      if (!u) return;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      u.mx = dx; u.my = dy;
      if (Math.hypot(dx, dy) > 0.08) u.manualT = 1.4;
    },

    dash() {
      const b = G.battle;
      const u = b && b.units[b.leaderIdx];
      if (!b || !u || b.over || !u.alive) return { ok: false, reason: "none" };
      if (u.dashCd > 0) return { ok: false, reason: "cooldown", cd: u.dashCd };
      let dx = u.mx, dy = u.my;
      if (Math.hypot(dx, dy) < 0.12) {
        const t = nearestMob(b, u, 40);
        if (t) { dx = u.x - t.x; dy = u.y - t.y; }
        else { dx = u.face > 0 ? -1 : 1; dy = 0; }
      }
      const l = Math.hypot(dx, dy) || 1;
      u.dashDx = dx / l; u.dashDy = dy / l;
      u.dashT = FIELD.dashTime;
      u.dashCd = FIELD.dashCd;
      u.iframe = FIELD.dashTime + 0.14;
      u.face = u.dashDx < 0 ? -1 : 1;
      b.swapFlash = 0.2;
      emit("battle:dash", { dx: u.dashDx, dy: u.dashDy });
      return { ok: true };
    },

    attack() {
      const b = G.battle;
      const u = b && b.units[b.leaderIdx];
      if (!b || b.over || !u || !u.alive) return { ok: false, reason: "none" };
      const target = nearestMob(b, u, u.range + 10);
      if (!target) return { ok: false, reason: "none" };
      if (fieldDist(u, target) > u.range + target.r) {
        u.reChase = 0.6;
        u.aim = aimAt(u, target);
        u.face = Math.cos(u.aim) < 0 ? -1 : 1;
        return { ok: true, chase: true };
      }
      if (u.atkCd > 0) return { ok: false, reason: "cooldown" };
      unitAttack(b, u);
      return { ok: true };
    },

    step(dt) { stepBattle(dt); }
  };

  G.tapAttack = function () { return G.arena.attack(); };

  G.setAuto = function (on) {
    state.settings.auto = !!on;
    if (G.battle) G.battle.auto = !!on;
    G.save();
  };

  /* ---------------- 프레임 틱 ---------------- */
  G.tick = function (dt) {
    dt = clamp(num(dt, 0), 0, 1.5);
    state.stats.playSeconds += dt;

    const b = G.battle;
    if (b && !b.over) {
      stepBattle(dt);
      return;
    }

    // 전투 밖: 체력 회복 + 자동 용광로
    const st = G.heroStats();
    if (state.hero.hp < st.maxHp) {
      state.hero.hp = Math.min(st.maxHp, state.hero.hp + st.maxHp * 0.02 * dt);
    }
    const rate = state.upgrades.furnace * 35;
    if (rate > 0) {
      state._furnaceAcc = (state._furnaceAcc || 0) + rate * dt;
      if (state._furnaceAcc >= 1) {
        const gain = Math.floor(state._furnaceAcc);
        state._furnaceAcc -= gain;
        state.gold += gain;
        state.stats.goldEarned += gain;
      }
    }
  };

  /* ---------------- 오프라인 보상 ---------------- */
  G.pendingOffline = null;

  G.collectOffline = function () {
    const now = Date.now();
    const from = num(state.lastSeen, now);
    const elapsed = Math.max(0, (now - from) / 1000);
    state.lastSeen = now;
    if (elapsed < 90) return null;

    const hours = 8 * (1 + G.relicLevel("hourglass") * 0.08);
    const capped = Math.min(elapsed, hours * 3600);
    const st = G.heroStats();
    const stageIdx = Math.max(1, state.progress.maxStage - 1);
    const idleRate = (state.upgrades.furnace * 35 + 2 + stageIdx * 0.5) * (1 + st.goldBonus / 100) * 0.6;
    const gold = Math.max(0, Math.round(idleRate * capped));
    const stones = Math.floor((capped / 900) * (0.5 + stageIdx * 0.02));
    const exp = Math.floor((capped / 600) * (1 + stageIdx * 0.25));

    if (gold <= 0 && stones <= 0 && exp <= 0) return null;
    addGold(gold);
    addStones(stones);
    if (exp) G.addExp(exp);
    G.save();

    const reward = {
      seconds: Math.floor(elapsed), cappedSeconds: Math.floor(capped),
      gold, stones, exp, hours
    };
    G.pendingOffline = reward;
    emit("offline:reward", reward);
    return reward;
  };

  /* ---------------- 시작 ---------------- */
  G.boot = function () {
    G.load();
    checkSkillsUnlock();
    checkAchievements();
    G.log("⚔ 심연의 대장간에 발을 들였습니다.", "welcome");
  };

  /* ---------------- 디버그 (테스트용) ---------------- */
  G.debug = {
    on: /[?&]debug=1/.test(location.search),
    grant(g, s, f) {
      if (g) addGold(g);
      if (s) addStones(s);
      if (f) addFrags(f);
      G.save();
      return { gold: state.gold, stones: state.stones, frags: state.relFrags };
    },
    setWeapon(lv) {
      state.forge.level = clamp(int(lv, 0), 0, G.MAX_LV);
      state.stats.maxLv = Math.max(state.stats.maxLv, state.forge.level, state.equipped.level);
      G.save();
      return state.forge.level;
    },
    setEquipped(lv) {
      state.equipped.level = clamp(int(lv, 0), 0, G.MAX_LV);
      state.stats.maxLv = Math.max(state.stats.maxLv, state.forge.level, state.equipped.level);
      state.hero.hp = Math.min(state.hero.hp, G.heroStats().maxHp);
      G.save();
      return state.equipped.level;
    },
    resetTutorial() {
      G.restartTutorial();
      return G.tutorialState().idx;
    },
    setHero(lv) {
      state.hero.level = clamp(int(lv, 1), 1, 99);
      state.hero.exp = 0;
      state.hero.hp = G.heroStats().maxHp;
      G.save();
      return state.hero.level;
    },
    setStage(index) {
      state.progress.maxStage = clamp(int(index, 1), 1, G.TOTAL_STAGES + 1);
      G.save();
      return state.progress.maxStage;
    },
    unlockWorld(w) {
      const first = G.STAGES.find((s) => s.world === w);
      if (first) state.progress.maxStage = Math.max(state.progress.maxStage, first.index);
      G.save();
      return state.progress.maxStage;
    },
    step(seconds, dt) {
      dt = dt || 0.05;
      let t = 0;
      while (t < seconds) { G.tick(dt); t += dt; if (!G.battle) break; }
      return { hp: Math.round(state.hero.hp), battle: !!G.battle };
    },
    mobs() {
      const b = G.battle;
      return b ? b.mobs.filter((m) => !m.dead).length : 0;
    },
    clearStage(key, autoRespond) {
      if (!G.stageReached(key)) state.progress.maxStage = G.stageByKey(key).index;
      G.startBattle(key);
      let guard = 0;
      while (G.battle && guard < 60000) {
        G.tick(0.05);
        if (autoRespond && G.battle && G.battle.boss && G.battle.boss.pattern) {
          const pat = G.PATTERNS[G.battle.boss.pattern.id];
          if (pat) G.respond(pat.action);
        }
        guard++;
        if (G.battle && G.battle.over) break;
      }
      return { guard, cleared: !!state.progress.cleared[key], maxStage: state.progress.maxStage };
    },
    kill(stageKey) {
      const stage = G.stageByKey(stageKey);
      if (!stage) return null;
      G.startBattle(stageKey);
      if (!G.battle) return null;
      G.battle.mobs.forEach((m) => { m.hp = 1; });
      G.tapAttack();
      return { cleared: !!state.progress.cleared[stageKey] };
    }
  };
})();
