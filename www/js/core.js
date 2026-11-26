/* =====================================================================
   몽글 대장간: 별빛 성검 키우기 — 게임 코어 (v2.1)
   저장/계산/강화/사냥 전투/보스 패턴/유물/업적/오프라인 보상
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

  function defaults() {
    return {
      version: 3,
      createdAt: Date.now(),
      gold: 1200,
      stones: 3,
      relFrags: 0,
      weapon: { level: 0, pity: 0, protect: false },
      hero: { level: 1, exp: 0, hp: 130 },
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
        guards: 0, dodges: 0, counters: 0
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
    s.gold = clamp(int(s.gold, 1200), 0, Number.MAX_SAFE_INTEGER);
    s.stones = clamp(int(s.stones, 0), 0, Number.MAX_SAFE_INTEGER);
    s.relFrags = clamp(int(s.relFrags, 0), 0, Number.MAX_SAFE_INTEGER);
    s.weapon.level = clamp(int(s.weapon.level, 0), 0, G.MAX_LV);
    s.weapon.pity = clamp(num(s.weapon.pity, 0), 0, 100);
    s.hero.level = clamp(int(s.hero.level, 1), 1, 99);
    s.hero.exp = Math.max(0, int(s.hero.exp, 0));
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

  G.load = function () {
    let loaded = null;
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) { loaded = null; }

    if (!loaded) {
      for (const key of G.LEGACY_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const old = JSON.parse(raw);
          if (!old) continue;
          const fresh = defaults();
          fresh.gold = clamp(int(old.gold, 1200), 0, Number.MAX_SAFE_INTEGER);
          fresh.weapon.level = clamp(int(old.level, 0), 0, G.MAX_LV);
          fresh.weapon.pity = clamp(num(old.pity, 0), 0, 100);
          fresh.upgrades = Object.assign(fresh.upgrades, old.upgrades || {});
          if (old.stats) {
            fresh.stats.maxLv = clamp(int(old.stats.maxLv, 0), 0, G.MAX_LV);
            fresh.stats.tries = Math.max(0, int(old.stats.tries, 0));
            fresh.stats.breaks = Math.max(0, int(old.stats.breaks, 0));
          }
          fresh.hero.level = 1 + Math.floor(fresh.weapon.level / 2);
          fresh.hero.hp = hpCapOf(fresh);
          fresh.welcomeSeen = true;
          loaded = fresh;
          console.info("[save] 예전 대장간 저장을 이어받았어요");
          break;
        } catch (e) { /* 다음 키 */ }
      }
    }

    state = sanitize(mergeDeep(defaults(), loaded || {}));
    if (!loaded) state.welcomeSeen = false;
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
      if (!isObj(data) || !isObj(data.weapon) || !isObj(data.hero)) {
        return { ok: false, reason: "이 파일은 심연의 대장간 저장 파일이 아닙니다." };
      }
      state = sanitize(mergeDeep(defaults(), data));
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
  G.weaponAtk = function (lv) {
    lv = num(lv, state.weapon.level);
    return Math.round(10 + 7 * lv + 2.2 * Math.pow(lv, 1.85));
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

  G.expNeed = function (lv) {
    return Math.round(35 * Math.pow(lv, 1.42));
  };

  G.enhanceCost = function (lv) {
    lv = num(lv, state.weapon.level);
    const cost = G.FORGE.baseCost * Math.pow(G.FORGE.costGrowth, lv) * Math.pow(0.95, state.upgrades.skill);
    return Math.round(Math.min(G.FORGE.maxCost, cost));
  };

  G.sellPrice = function (lv) {
    lv = num(lv, state.weapon.level);
    return Math.round(G.FORGE.sellBase * Math.pow(G.FORGE.sellGrowth, lv));
  };

  G.protectCost = function (lv) {
    lv = num(lv, state.weapon.level);
    return Math.round(G.FORGE.protectBase * Math.pow(G.FORGE.protectGrowth, Math.max(0, lv - 10)));
  };

  G.rates = function (lv) {
    lv = num(lv, state.weapon.level);
    const st = G.heroStats();
    let success;
    if (lv < 3) success = 100;
    else success = 100 - lv * 4.2 + state.upgrades.skill * 1.5 + st.enhanceBonus;
    success = clamp(Math.round(success * 10) / 10, 6, 100);
    const fail = Math.max(0, 100 - success);
    // +5 미만: 실패해도 단계 유지 (기운만 획득)
    if (lv < G.FORGE.safeLv) return { success, down: 0, breakRate: 0 };
    // +5 ~ +9: 실패하면 하락, 파괴 없음
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
    lv = num(lv, state.weapon.level);
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

  /* ---------------- 강화 ---------------- */
  G.enhance = function () {
    const lv = state.weapon.level;
    if (lv >= G.MAX_LV) return { ok: false, reason: "max" };
    const canProtect = lv >= G.FORGE.breakStartLv && state.weapon.protect;
    const cost = G.enhanceCost(lv) + (canProtect ? G.protectCost(lv) : 0);
    if (state.gold < cost) return { ok: false, reason: "gold", cost };

    state.gold -= cost;
    state.stats.tries += 1;
    const rates = G.rates(lv);
    const pityReady = state.weapon.pity >= 100;
    let result;

    if (pityReady) {
      state.weapon.pity = 0;
      state.weapon.level += 1;
      result = { kind: "pity", from: lv, to: state.weapon.level };
    } else {
      const roll = Math.random() * 100;
      if (roll < rates.success) {
        state.weapon.level += 1;
        state.stats.successes += 1;
        result = { kind: "success", from: lv, to: state.weapon.level };
      } else {
        const gain = (G.FORGE.pityGainBase + lv * G.FORGE.pityGainPerLv) * (1 + state.upgrades.pity * 0.25);
        state.weapon.pity = Math.min(100, state.weapon.pity + gain);
        if (roll < rates.success + rates.down) {
          state.weapon.level = Math.max(0, lv - 1);
          result = { kind: "down", from: lv, to: state.weapon.level, pity: gain };
        } else if (rates.breakRate <= 0) {
          // 파괴 구간이 아니면 단계 유지
          result = { kind: "maintain", from: lv, to: lv, pity: gain };
        } else if (canProtect) {
          result = { kind: "protected", from: lv, to: lv, pity: gain };
        } else {
          state.weapon.level = 0;
          state.stats.breaks += 1;
          result = { kind: "break", from: lv, to: 0, pity: gain };
        }
      }
    }

    state.stats.maxLv = Math.max(state.stats.maxLv, state.weapon.level);
    result.cost = cost;
    result.level = state.weapon.level;
    result.weaponName = G.WEAPONS[Math.min(G.MAX_LV, state.weapon.level)];
    G.save();
    emit("forge:result", result);
    checkAchievements();
    return Object.assign({ ok: true }, result);
  };

  G.sell = function () {
    const lv = state.weapon.level;
    const price = G.sellPrice(lv);
    if (lv <= 0) return { ok: false, reason: "nothing" };
    state.gold += price;
    state.stats.goldEarned += price;
    state.stats.sells += 1;
    state.weapon.level = 0;
    G.save();
    G.log(`💰 +${lv} ${G.WEAPONS[lv]}을(를) 매각해 ${G.fmt(price)} 골드를 받았습니다.`);
    emit("forge:sell", { price, from: lv });
    checkAchievements();
    return { ok: true, price };
  };

  G.toggleProtect = function (on) {
    state.weapon.protect = !!on;
    G.save();
  };

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

  /* ---------------- 사냥 전투 ---------------- */
  G.battle = null;

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
      pattern: null, patternCd: isBoss ? 4.2 : 0, patternIdx: 0,
      shield: false, enraged: false, stun: 0
    };
  }

  function wavesFor(stage) {
    const w = stage.worldData;
    if (stage.isBoss) {
      return [
        { monsters: [w.monsters[0], w.monsters[0], w.monsters[1]], boss: false },
        { monsters: [w.boss], boss: true }
      ];
    }
    return [
      { monsters: [w.monsters[0], w.monsters[0], w.monsters[0]], boss: false },
      { monsters: [w.monsters[1], w.monsters[1], w.monsters[1]], boss: false }
    ];
  }

  G.startBattle = function (stageKey) {
    const stage = G.stageByKey(stageKey);
    if (!stage) return { ok: false, reason: "stage" };
    if (!G.stageReached(stage)) return { ok: false, reason: "locked" };
    const st = G.heroStats();
    if (state.hero.hp <= 0) state.hero.hp = Math.round(st.maxHp * 0.5);
    G.battle = {
      stageKey: stage.key,
      stage: stage,
      waves: wavesFor(stage),
      waveIndex: 0,
      enemyIndex: 0,
      enemy: null,
      auto: state.settings.auto !== false,
      heroTimer: 0.35,
      enemyTimer: 1.1,
      tapCd: 0,
      cds: {},
      combo: 0,
      startedAt: Date.now(),
      over: false,
      patternQueue: (stage.patterns || []).slice()
    };
    G.SKILLS.forEach((sk) => { G.battle.cds[sk.id] = 0; });
    spawnEnemy();
    emit("battle:start", { stage });
    return { ok: true, battle: G.battle };
  };

  function spawnEnemy() {
    const b = G.battle;
    if (!b) return;
    const wave = b.waves[b.waveIndex];
    const monId = wave.monsters[b.enemyIndex];
    b.enemy = enemyFor(b.stage, monId, wave.boss);
    b.enemyTimer = 0.9;
    b.heroTimer = 0.3;
    emit("battle:enemy", {
      enemy: b.enemy, wave: b.waveIndex + 1, index: b.enemyIndex,
      total: wave.monsters.length, boss: wave.boss
    });
  }

  function damageEnemy(mult, opts) {
    const b = G.battle;
    if (!b || !b.enemy || b.over) return null;
    opts = opts || {};
    const st = G.heroStats();
    const crit = !!opts.alwaysCrit || Math.random() * 100 < st.critChance;
    let dmg = st.atk * mult * (0.92 + Math.random() * 0.16);
    if (crit) dmg *= 1 + st.critDmg / 100;
    let shielded = false;
    if (b.enemy.shield) { dmg *= 0.28; shielded = true; }
    dmg = Math.max(1, Math.round(dmg));
    b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
    emit("battle:damage", {
      target: "enemy", amount: dmg, crit: crit, skill: opts.skill || null,
      shielded: shielded, enemyHp: b.enemy.hp, enemyMaxHp: b.enemy.maxHp
    });
    if (b.enemy.hp <= 0) onEnemyKilled();
    else G.save();
    return dmg;
  }

  function heroAttack() {
    const b = G.battle;
    if (!b || b.over) return;
    damageEnemy(1.0, {});
  }

  function enemyAttack() {
    const b = G.battle;
    if (!b || !b.enemy || b.over) return;
    const e = b.enemy;
    const st = G.heroStats();
    const dmg = Math.max(1, Math.round(e.atk * (0.9 + Math.random() * 0.2) * (e.enraged ? 1 : 1)));
    state.hero.hp = Math.max(0, state.hero.hp - dmg);
    b.enemyTimer = e.interval;
    emit("battle:damage", { target: "hero", amount: dmg, crit: false, heroHp: state.hero.hp, heroMaxHp: st.maxHp });
    if (state.hero.hp <= 0) onHeroDeath();
  }

  function onHeroDeath() {
    const b = G.battle;
    if (!b) return;
    b.over = true;
    const st = G.heroStats();
    state.hero.hp = Math.round(st.maxHp * 0.35);
    emit("battle:defeat", { stage: b.stage });
    G.log(`💫 ${b.stage.label} ${b.stage.name}에서 쓰러졌습니다... 다시 서약하십시오.`, "fail");
    G.battle = null;
    G.save();
  }

  function onEnemyKilled() {
    const b = G.battle;
    if (!b) return;
    const enemy = b.enemy;
    const st = G.heroStats();
    const gold = Math.round(enemy.gold * (1 + st.goldBonus / 100));
    addGold(gold);

    let stones = 0;
    if (enemy.boss) stones = 6 + b.stage.world * 2;
    else if (Math.random() < 0.42) stones = 1 + (Math.random() < 0.15 ? 1 : 0);

    let frags = 0;
    if (enemy.boss) frags = 3 + Math.floor(b.stage.world * 0.8);
    else if (Math.random() < 0.05) frags = 1;

    addStones(stones);
    addFrags(frags);
    G.addExp(enemy.exp);

    b.combo += 1;
    state.stats.kills += 1;
    if (enemy.boss) state.stats.bossKills += 1;

    const codex = G.registerCodex(enemy.id, b.stage);

    emit("battle:kill", {
      enemy, gold, stones, frags, exp: enemy.exp, combo: b.combo, codex, boss: enemy.boss
    });

    const wave = b.waves[b.waveIndex];
    b.enemyIndex += 1;

    if (b.enemyIndex < wave.monsters.length) {
      b.enemy = null;
      b.spawnTimer = 0.26;
    } else if (b.waveIndex < b.waves.length - 1) {
      b.waveIndex += 1;
      b.enemyIndex = 0;
      b.enemy = null;
      b.spawnTimer = 0.62;
      const heal = Math.round(st.maxHp * G.STAGE_TUNE.waveHeal);
      state.hero.hp = Math.min(st.maxHp, state.hero.hp + heal);
      emit("battle:wave", { wave: b.waveIndex + 1, heal: heal });
    } else {
      onStageClear();
    }
    G.save();
    checkAchievements();
  }

  function onStageClear() {
    const b = G.battle;
    if (!b) return;
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
    state.hero.hp = Math.min(st.maxHp, state.hero.hp + Math.round(st.maxHp * 0.3));
    state.progress.firstClear[s] = state.progress.firstClear[s] || (first ? Date.now() : 0);

    const result = {
      stage, first: first, boss: stage.isBoss, gold, stones, frags, exp,
      cleared: state.progress.cleared[s],
      unlockedNext: first && next && next.index <= state.progress.maxStage ? next : null
    };
    G.battle = null;
    G.save();
    emit("battle:victory", result);
    G.log(`🎉 ${stage.label} ${stage.name} 정복! (+${G.fmt(gold)}골드${stage.isBoss ? " · 지배자 격파" : ""})`, "win");
    checkAchievements();
  }

  G.flee = function () {
    if (!G.battle) return;
    const b = G.battle;
    b.over = true;
    G.battle = null;
    emit("battle:flee", { stage: b.stage });
  };

  /* ---------------- 스킬 ---------------- */
  G.useSkill = function (id) {
    const b = G.battle;
    if (!b || b.over) return { ok: false, reason: "battle" };
    const sk = G.SKILLS.find((x) => x.id === id);
    if (!sk) return { ok: false };
    if (!G.skillUnlocked(sk)) return { ok: false, reason: "locked" };
    if ((b.cds[id] || 0) > 0) return { ok: false, reason: "cooldown" };
    const st = G.heroStats();
    b.cds[id] = sk.cd;
    if (sk.type === "damage") {
      emit("battle:skill", { skill: sk });
      damageEnemy(G.skillPower(sk), { skill: sk.id, alwaysCrit: !!sk.alwaysCrit });
    } else if (sk.type === "heal") {
      const amount = Math.round(st.maxHp * G.skillPower(sk));
      const before = state.hero.hp;
      state.hero.hp = Math.min(st.maxHp, state.hero.hp + amount);
      emit("battle:heal", { amount: state.hero.hp - before, skill: sk, heroHp: state.hero.hp, heroMaxHp: st.maxHp });
      emit("battle:skill", { skill: sk });
      G.save();
    }
    return { ok: true };
  };

  G.tapAttack = function () {
    const b = G.battle;
    if (!b || b.over || !b.enemy) return { ok: false };
    if (b.tapCd > 0) return { ok: false, reason: "cooldown" };
    b.tapCd = 0.3;
    b.heroTimer = Math.min(b.heroTimer, 0.25);
    damageEnemy(1.0, { tap: true });
    return { ok: true };
  };

  G.setAuto = function (on) {
    state.settings.auto = !!on;
    if (G.battle) G.battle.auto = !!on;
    G.save();
  };

  /* ---------------- 보스 패턴 ---------------- */
  function startBossPattern() {
    const b = G.battle;
    const e = b && b.enemy;
    if (!e || !e.boss || e.pattern) return;
    const queue = b.patternQueue.length ? b.patternQueue : b.stage.patterns;
    if (!queue || !queue.length) return;
    const id = queue[e.patternIdx % queue.length];
    e.patternIdx += 1;
    const pat = G.PATTERNS[id];
    if (!pat) return;
    if (pat.action === "counter") {
      e.pattern = { id: id, phase: "active", timer: pat.duration, total: pat.duration, responded: false };
      e.shield = true;
      emit("battle:pattern", { pattern: pat, phase: "active", total: pat.duration, enemy: e });
    } else {
      const tel = Math.max(1.35, pat.telegraph - b.stage.world * 0.045);
      e.pattern = { id: id, phase: "telegraph", timer: tel, total: tel, responded: false };
      emit("battle:pattern", { pattern: pat, phase: "telegraph", total: tel, enemy: e });
    }
  }

  function resolveBossPattern() {
    const b = G.battle;
    const e = b && b.enemy;
    if (!e || !e.pattern) return;
    const pat = G.PATTERNS[e.pattern.id];
    const responded = e.pattern.responded;
    const st = G.heroStats();
    let dmg = Math.max(1, Math.round(e.atk * pat.mult));
    if (responded) dmg = Math.round(dmg * pat.reduce);
    if (dmg > 0) {
      state.hero.hp = Math.max(0, state.hero.hp - dmg);
    }
    emit("battle:patternResolve", {
      pattern: pat, responded: responded, dmg: dmg,
      heroHp: state.hero.hp, heroMaxHp: st.maxHp
    });
    e.pattern = null;
    e.patternCd = Math.max(4.2, 8.2 - b.stage.world * 0.18);
    if (responded) {
      if (pat.action === "guard") state.stats.guards += 1;
      if (pat.action === "dodge") state.stats.dodges += 1;
      damageEnemy(0.8, { skill: null });
      if (!G.battle) return;
    }
    if (state.hero.hp <= 0) onHeroDeath();
    G.save();
  }

  G.respond = function (action) {
    const b = G.battle;
    const e = b && b.enemy;
    if (!e || !e.pattern) return { ok: false, reason: "none" };
    const pat = G.PATTERNS[e.pattern.id];
    if (!pat) return { ok: false };
    if (e.pattern.responded) return { ok: false, reason: "already" };
    if (action !== pat.action) return { ok: false, reason: "wrong", expected: pat.action };

    if (pat.action === "counter") {
      e.shield = false;
      e.pattern = null;
      e.patternCd = Math.max(4.5, 8.5 - b.stage.world * 0.18);
      e.stun = 2;
      state.stats.counters += 1;
      const dmg = damageEnemy(2.6, { skill: "counter" });
      emit("battle:counter", { dmg: dmg });
      G.save();
      return { ok: true, kind: "counter" };
    }

    e.pattern.responded = true;
    emit("battle:respond", { pattern: pat, action: action });
    return { ok: true, kind: action };
  };

  /* ---------------- 프레임 틱 ---------------- */
  G.tick = function (dt) {
    dt = clamp(num(dt, 0), 0, 1.5);
    state.stats.playSeconds += dt;

    const b = G.battle;
    if (b && !b.over) {
      b.tapCd = Math.max(0, b.tapCd - dt);
      G.SKILLS.forEach((sk) => { b.cds[sk.id] = Math.max(0, (b.cds[sk.id] || 0) - dt); });

      // 다음 몬스터 스폰 대기
      if (!b.enemy) {
        b.spawnTimer = Math.max(0, (b.spawnTimer || 0) - dt);
        if (b.spawnTimer <= 0 && !b.over) spawnEnemy();
        return;
      }

      const e = b.enemy;
      if (e) {
        // 격노
        if (e.boss && !e.enraged && e.hp / e.maxHp <= 0.5) {
          e.enraged = true;
          e.atk = Math.round(e.atk * 1.35);
          e.interval = Math.max(1.1, e.interval * 0.78);
          emit("battle:enrage", { enemy: e });
        }
        // 스턴
        if (e.stun > 0) {
          e.stun = Math.max(0, e.stun - dt);
        } else {
          // 패턴 진행
          if (e.pattern) {
            e.pattern.timer = Math.max(0, e.pattern.timer - dt);
            emit("battle:patternTick", {
              patternId: e.pattern.id, phase: e.pattern.phase,
              timer: e.pattern.timer, total: e.pattern.total, responded: e.pattern.responded
            });
            if (e.pattern.timer <= 0) {
              if (e.pattern.phase === "telegraph") resolveBossPattern();
              else if (e.pattern.phase === "active") {
                e.shield = false;
                e.pattern = null;
                e.patternCd = Math.max(4.5, 8.5 - b.stage.world * 0.18);
                emit("battle:patternEnd", {});
              }
            }
          } else if (e.boss) {
            e.patternCd -= dt;
            if (e.patternCd <= 0) startBossPattern();
          }

          // 영웅은 계속 공격, 보스는 텔레그래프 중 일반 공격을 멈춤
          if (b.auto) {
            b.heroTimer -= dt;
            if (b.heroTimer <= 0) {
              b.heroTimer = G.heroStats().attackInterval;
              heroAttack();
              if (!G.battle || G.battle !== b) return;
            }
          }
          const telegraphing = e.pattern && e.pattern.phase === "telegraph";
          if (!telegraphing) {
            b.enemyTimer -= dt;
            if (b.enemyTimer <= 0) {
              enemyAttack();
              if (!G.battle || G.battle !== b) return;
            }
          }
        }
      }
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
      state.weapon.level = clamp(int(lv, 0), 0, G.MAX_LV);
      state.stats.maxLv = Math.max(state.stats.maxLv, state.weapon.level);
      G.save();
      return state.weapon.level;
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
      dt = dt || 0.1;
      let t = 0;
      while (t < seconds) { G.tick(dt); t += dt; }
      return { hp: Math.round(state.hero.hp), battle: !!G.battle };
    },
    clearStage(key, autoRespond) {
      if (!G.stageReached(key)) state.progress.maxStage = G.stageByKey(key).index;
      G.startBattle(key);
      let guard = 0;
      while (G.battle && guard < 40000) {
        G.tick(0.1);
        if (autoRespond && G.battle && G.battle.enemy && G.battle.enemy.pattern) {
          const pat = G.PATTERNS[G.battle.enemy.pattern.id];
          if (pat) G.respond(pat.action);
        }
        guard++;
      }
      return { guard, cleared: !!state.progress.cleared[key], maxStage: state.progress.maxStage };
    },
    kill(stageKey) {
      const stage = G.stageByKey(stageKey);
      if (!stage) return null;
      G.startBattle(stageKey);
      if (!G.battle) return null;
      const e = G.battle.enemy;
      e.hp = 1;
      G.tapAttack();
      return { cleared: !!state.progress.cleared[stageKey] };
    }
  };
})();
