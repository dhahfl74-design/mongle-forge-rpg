/* =====================================================================
   심연의 대장간 v5.0 — 엔진
   저장 · 상자 개봉 · 장착/분해 · 강화 · 자동 전장 · 성장 · 오프라인
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;

  /* ---------------- 이벤트 버스 ---------------- */
  const handlers = {};
  G.bus = {
    on(n, fn) { (handlers[n] = handlers[n] || []).push(fn); return () => G.bus.off(n, fn); },
    off(n, fn) { if (handlers[n]) handlers[n] = handlers[n].filter((f) => f !== fn); },
    emit(n, p) { (handlers[n] || []).slice().forEach((fn) => { try { fn(p); } catch (e) { console.warn("[bus]", n, e); } }); }
  };
  const emit = (n, p) => G.bus.emit(n, p);

  /* ---------------- 유틸 ---------------- */
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  G.fmt = function (v) {
    v = Math.floor(num(v, 0));
    const a = Math.abs(v);
    if (a >= 1e16) return (v / 1e16).toFixed(2).replace(/\.?0+$/, "") + "경";
    if (a >= 1e12) return (v / 1e12).toFixed(2).replace(/\.?0+$/, "") + "조";
    if (a >= 1e8) return (v / 1e8).toFixed(2).replace(/\.?0+$/, "") + "억";
    if (a >= 1e4) return (v / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
    return v.toLocaleString("ko-KR");
  };
  G.fmtFull = (v) => Math.floor(num(v, 0)).toLocaleString("ko-KR");

  /* ---------------- 기본 상태 ---------------- */
  function defaults() {
    return {
      v: 5,
      createdAt: Date.now(),
      gold: 1500,
      keys: 6,
      stones: 0,
      frags: 0,
      hero: { lv: 1, exp: 0 },
      chest: { lv: 1, auto: false, autoEquip: false, autoSalvage: "none" },
      progress: { stage: 1, maxStage: 1, cleared: {}, world: 1 },
      equip: { weapon: null, helm: null, armor: null, ring: null },
      inventory: [],
      forgeItem: null,
      enhance: { pity: 0, seal: 0, protect: false },
      seen: {},
      milestones: {},
      research: { atk: 0, crit: 0, key: 0, gold: 0 },
      relics: {},
      settings: { sound: true, music: true, haptics: true },
      tutorial: { idx: 0, skipped: false, collapsed: false, done: {}, shown: {} },
      achievements: { claimed: {}, notified: {} },
      stats: {
        pulls: 0, enhances: 0, breaks: 0, maxEnh: 0, bestRarity: 0,
        kills: 0, bossKills: 0, clears: 0, goldEarned: 0, keysEarned: 0,
        salvaged: 0, playSec: 0, dmg: 0
      },
      lastSeen: Date.now(),
      tutorialSeen: false
    };
  }

  let S = defaults();
  G.getState = () => S;

  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
  function merge(base, saved) {
    if (!isObj(saved)) return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(saved).forEach((k) => {
      const b = base[k]; const s = saved[k];
      if (isObj(b) && isObj(s)) out[k] = merge(b, s);
      else if (s !== undefined && s !== null) out[k] = s;
    });
    return out;
  }

  /* ---------------- 아이템 ---------------- */
  let uidSeq = 1;
  G.itemScore = function (it) {
    if (!it) return 0;
    const atk = it.atk * (1 + G.ENH.step * (it.lv || 0));
    let mul = 1;
    (it.subs || []).forEach((s) => {
      if (s.k === "crit") mul += s.v * 0.011;
      else if (s.k === "critDmg") mul += s.v * 0.0035;
      else if (s.k === "bossDmg") mul += s.v * 0.003;
      else if (s.k === "gold") mul += s.v * 0.0008;
    });
    return atk * mul;
  };
  G.itemAtk = (it) => (it ? it.atk * (1 + G.ENH.step * (it.lv || 0)) : 0);

  G.rarityRoll = function () {
    const w = G.CHEST.weights(S.chest.lv);
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
    return 0;
  };
  G.rarityChance = function (idx) {
    const w = G.CHEST.weights(S.chest.lv);
    const total = w.reduce((a, b) => a + b, 0);
    return w[idx] / total;
  };

  G.makeItem = function (stageIdx, forcedRarity, exclude) {
    const stage = G.stageByIndex(stageIdx);
    const Sc = stage.scale;
    const rarityIdx = forcedRarity == null ? G.rarityRoll() : forcedRarity;
    const rar = G.RARITY[rarityIdx];
    let def = null;
    for (let t = 0; t < 16; t++) {
      const cand = pick(G.ITEMS_BY_SLOT[pick(G.SLOTS).key].filter((d) => d.rarity === rar.key));
      if (!exclude || !exclude.has(cand.id)) { def = cand; break; }
      if (!def) def = cand;
    }
    const slot = G.SLOT_BY_KEY[def.slot];
    const baseAtk = 7.2 * Sc * rar.mult * slot.mult * rnd(0.87, 1.16);
    const subCount = [1, 2, 2, 3, 3, 4][rarityIdx];
    const keys = ["crit", "critDmg", "bossDmg", "gold"];
    const chosen = [];
    const poolKeys = keys.slice();
    for (let i = 0; i < subCount && poolKeys.length; i++) {
      const totalW = poolKeys.reduce((a, k) => a + G.SUBS[k].weight, 0);
      let r = Math.random() * totalW; let pickKey = poolKeys[0];
      for (const k of poolKeys) { r -= G.SUBS[k].weight; if (r <= 0) { pickKey = k; break; } }
      chosen.push(pickKey); poolKeys.splice(poolKeys.indexOf(pickKey), 1);
    }
    const subs = chosen.map((k) => {
      let v;
      if (k === "crit") v = rnd(0.9, 2.2) + rarityIdx * 0.42;
      else if (k === "critDmg") v = rnd(7, 13) + rarityIdx * 4.2;
      else if (k === "bossDmg") v = rnd(6, 11) + rarityIdx * 3.4;
      else v = rnd(4, 9) + rarityIdx * 3.1;
      v = Math.min(G.SUBS[k].cap, Math.round(v * 10) / 10);
      return { k: k, v: v };
    });
    return {
      uid: "it" + Date.now().toString(36) + "_" + (uidSeq++),
      defId: def.id, name: def.name, slot: slot.key, slotName: slot.name,
      rarity: rar.key, rarityName: rar.name, icon: slot.icon,
      atk: Math.max(1, Math.round(baseAtk)),
      baseAtk: Math.max(1, Math.round(baseAtk)),
      subs: subs, lv: 0,
      stageScale: Sc, stageIdx: stageIdx,
      new: !S.seen[def.id]
    };
  };

  /* ---------------- 성장/스탯 ---------------- */
  G.stats = function () {
    const lv = S.hero.lv;
    let gearAtk = 0;
    let crit = 0, critDmg = 0, bossDmg = 0, goldPct = 0;
    G.SLOTS.forEach((sl) => {
      const it = S.equip[sl.key];
      if (!it) return;
      gearAtk += G.itemAtk(it);
      (it.subs || []).forEach((s) => {
        if (s.k === "crit") crit += s.v;
        else if (s.k === "critDmg") critDmg += s.v;
        else if (s.k === "bossDmg") bossDmg += s.v;
        else if (s.k === "gold") goldPct += s.v;
      });
    });
    const seenCount = Object.keys(S.seen).length;
    const collectionBonus = seenCount * 0.006 + (Object.keys(S.milestones).length * 0.02);
    const relic = (id) => S.relics[id] || 0;
    const atkBonus = 1 + S.research.atk * 0.05 + relic("flag") * 0.05 + collectionBonus;
    const base = G.BAL.heroBaseAtk(lv);
    const atk = (base + gearAtk) * atkBonus;
    const maxHp = G.BAL.heroHp(atk, lv) * (1 + relic("heart") * 0.09 / 1);
    return {
      atk: atk,
      baseAtk: base,
      gearAtk: gearAtk,
      crit: Math.min(75, 5 + crit + S.research.crit * 1.2 + relic("clover") * 0.8),
      critDmg: 155 + critDmg,
      bossDmg: bossDmg,
      goldMul: 1 + goldPct / 100 + S.research.gold * 0.09,
      keyChance: Math.min(0.85, G.BAL.keyChance + S.research.key * 0.06 + relic("key") * 0.008),
      maxHp: Math.round(maxHp),
      enhBonus: S.research.crit * 1.2 + relic("anvil") * 1.5,
      collectionBonus: collectionBonus,
      power: atk
    };
  };

  G.expNeed = (lv) => Math.round(55 * Math.pow(lv, 1.9));

  function gainExp(n) {
    S.hero.exp += n;
    let up = 0;
    while (S.hero.exp >= G.expNeed(S.hero.lv) && S.hero.lv < 999) {
      S.hero.exp -= G.expNeed(S.hero.lv);
      S.hero.lv += 1; up += 1;
    }
    if (up) { emit("heroLevel", S.hero.lv); emit("toast", { kind: "levelup", text: "서약자 Lv." + S.hero.lv + " 달성!" }); }
  }

  function gainGold(n) { S.gold += n; S.stats.goldEarned += n; }
  function gainKeys(n) { S.keys += n; S.stats.keysEarned += n; }
  function gainStones(n) { S.stones += n; }
  function gainFrags(n) { S.frags += n; }

  /* ---------------- 저장 ---------------- */
  let saveTimer = 0;
  G.save = function (silent) {
    S.lastSeen = Date.now();
    try {
      localStorage.setItem(G.SAVE_KEY, JSON.stringify(S));
      if (!silent) emit("saved", S.lastSeen);
    } catch (e) { console.warn("save failed", e); }
  };
  G.saveSoon = function () {
    if (saveTimer) return;
    saveTimer = setTimeout(() => { saveTimer = 0; G.save(true); }, 1200);
  };

  G.load = function () {
    let raw = null;
    try { raw = localStorage.getItem(G.SAVE_KEY); } catch (e) {}
    let migrated = false;
    let fresh = !raw;
    if (!raw) {
      for (const k of G.LEGACY_KEYS) {
        let old = null;
        try { old = localStorage.getItem(k); } catch (e) {}
        if (old) {
          try {
            const o = JSON.parse(old);
            const src = o && o.data ? o.data : o;
            if (src) {
              S = defaults();
              S.gold = Math.max(S.gold + 4000, num(src.gold, 0));
              S.keys = 15;
              S.stones = Math.max(0, num(src.stones, 0));
              S.hero.lv = Math.max(1, Math.min(40, num(src.hero && src.hero.level, 1)));
              // 새 상자 루프는 1-1에서 다시 시작한다 (이전 구역 진행은 가져오지 않음)
              S.progress.maxStage = 1;
              S.progress.stage = 1;
              S.tutorial.skipped = true;
              migrated = true;
            }
          } catch (e) {}
          break;
        }
      }
    }
    if (raw) {
      try {
        const o = JSON.parse(raw);
        S = merge(defaults(), o);
      } catch (e) { S = defaults(); }
    }
    S.v = 5;
    if (!S.equip) S.equip = {};
    G.SLOTS.forEach((sl) => {
      const it = S.equip[sl.key];
      if (it && typeof it !== "object") S.equip[sl.key] = null;
    });
    normalizeInventory();
    if (!S.seen) S.seen = {};
    if (!S.milestones) S.milestones = {};
    if (!S.relics) S.relics = {};
    G.state = S;
    return { migrated: migrated, fresh: fresh };
  };

  /* 시작 장비 세트 — 첫 상자 전에도 사냥이 눈에 보이게 */
  G.seedStarter = function () {
    const starters = [
      ["weapon", "녹슨 파편검", 10],
      ["helm", "낡은 가죽 투구", 6],
      ["armor", "재묻은 가죽 갑옷", 7],
      ["ring", "녹슨 반지", 5]
    ];
    starters.forEach(([slot, name, atk]) => {
      const def = G.ITEMS.find((d) => d.slot === slot && d.name === name) || G.ITEMS.find((d) => d.slot === slot);
      if (!def) return;
      S.equip[slot] = {
        uid: "seed_" + slot + "_" + Date.now().toString(36),
        defId: def.id, name: def.name, slot: slot, slotName: def.slotName,
        rarity: def.rarity, rarityName: def.rarityName, icon: def.icon,
        atk: atk, baseAtk: atk, subs: [], lv: 0, stageScale: 1, stageIdx: 1, isNew: false
      };
      S.seen[def.id] = Date.now();
    });
    S.forgeItem = S.equip.weapon;
  };

  G.reset = function () {
    try { localStorage.removeItem(G.SAVE_KEY); } catch (e) {}
    S = defaults();
    G.state = S;
    combat.reset();
    G.save(true);
  };

  G.exportSave = () => JSON.stringify({ game: "mongle-forge", version: G.VERSION, savedAt: new Date().toISOString(), data: S }, null, 2);
  G.importSave = function (text) {
    const o = JSON.parse(text);
    const src = o && o.data ? o.data : o;
    if (!isObj(src)) throw new Error("형식이 올바르지 않습니다");
    S = merge(defaults(), src);
    G.state = S;
    G.save(true);
    combat.reset();
    return true;
  };

  /* ---------------- 도감 ---------------- */
  function registerSeen(item) {
    const fresh = !S.seen[item.defId];
    if (fresh) {
      S.seen[item.defId] = Date.now();
      emit("codex", item);
      checkMilestones();
    }
    return fresh;
  }

  function codexProgress(slot, rarity) {
    let total = 0, got = 0;
    G.ITEMS.forEach((d) => {
      if (slot !== "all" && d.slot !== slot) return;
      if (rarity !== "all" && d.rarity !== rarity) return;
      total++; if (S.seen[d.id]) got++;
    });
    return { got: got, total: total };
  }
  G.codexProgress = codexProgress;

  function checkMilestones() {
    G.CODEX_MILESTONES.forEach((m) => {
      if (S.milestones[m.id]) return;
      const p = codexProgress(m.slot, m.rarity);
      if (p.got >= p.total) {
        S.milestones[m.id] = Date.now();
        grant(m.reward);
        emit("toast", { kind: "reward", text: "도감 완성 · " + m.name + " 보상!" });
      }
    });
  }
  G.milestoneDone = (id) => !!S.milestones[id];

  /* ---------------- 보상 지급 ---------------- */
  function grant(r) {
    if (!r) return;
    if (r.gold) gainGold(r.gold);
    if (r.keys) gainKeys(r.keys);
    if (r.stones) gainStones(r.stones);
    if (r.frags) gainFrags(r.frags);
  }
  G.grant = grant;

  /* ---------------- 상자 개봉 ---------------- */
  G.pull = function (count, opts) {
    const n = count === 10 ? 10 : 1;
    if (S.keys < n) return { ok: false, reason: "keys" };
    const results = [];
    const used = new Set();
    let stored = 0, replaced = 0, fullDismantled = 0;
    for (let i = 0; i < n; i++) {
      S.keys -= 1;
      S.stats.pulls += 1;
      const stageIdx = Math.max(1, S.progress.stage);
      // 개봉은 현재 구역 기준. 보스 도전 중이면 그 보스 구역 기준
      const it = G.makeItem(stageIdx, undefined, used);
      used.add(it.defId);
      const fresh = registerSeen(it);
      it.isNew = fresh;
      S.stats.bestRarity = Math.max(S.stats.bestRarity, G.RARITY_BY_KEY[it.rarity].idx);
      results.push(it);
      if (S.chest.autoSalvage !== "none") {
        const threshold = G.RARITY_BY_KEY[S.chest.autoSalvage].idx;
        const rarIdx = G.RARITY_BY_KEY[it.rarity].idx;
        if (rarIdx < threshold) { autoSalvage(it); it.salvaged = true; }
      }
      // 자동 장착: 지금 장착한 것보다 강하면 바로 장착
      if (!it.salvaged && S.chest.autoEquip) {
        const eq = S.equip[it.slot];
        if (!eq || G.itemScore(it) > G.itemScore(eq)) {
          G.equipItem(it, { silent: true });
          it.equippedNow = true;
        }
      }
      // 나머지는 전부 보관함으로 — 개봉 카드를 놓치거나 닫아도 사라지지 않는다
      if (!it.salvaged && !it.equippedNow) {
        const res = G.storeItem(it, { silent: true });
        if (res.ok) { stored += 1; if (res.replaced) replaced += 1; }
        else if (res.reason === "full") { fullDismantled += 1; }
      }
    }
    emit("pull", results);
    if (stored) emit("inventory", { kind: "add", items: results });
    if (replaced || fullDismantled) {
      emit("toast", {
        kind: "salvage",
        text: "🎒 보관함이 가득 차 " + (replaced ? "약한 장비 " + replaced + "개 교체 분해" : "새 장비 " + fullDismantled + "개 분해")
      });
    }
    G.saveSoon();
    return { ok: true, items: results, stored: stored, replaced: replaced, full: fullDismantled };
  };

  function autoSalvage(it) {
    return salvageQuiet(it);
  }

  /* 분해 보상을 조용히 지급 (토스트 없음) */
  function salvageQuiet(it) {
    const r = G.salvage(it);
    gainGold(r.gold); gainStones(r.stones); gainExp(r.exp);
    S.stats.salvaged += 1;
    return r;
  }

  G.salvageItem = function (it) {
    const r = salvageQuiet(it);
    G.invRemove(it.uid);
    if (S.forgeItem && S.forgeItem.uid === it.uid) S.forgeItem = null;
    emit("toast", { kind: "salvage", text: "분해 · +" + G.fmt(r.gold) + " G" + (r.stones ? " · 💠" + r.stones : "") });
    emit("inventory", { kind: "remove", item: it });
    G.saveSoon();
    return r;
  };

  /* ---------------- 보관함 (장비 인벤토리) ---------------- */
  const INV_MAX = () => G.INV.max;

  G.invCount = () => S.inventory.length;
  G.invMax = () => INV_MAX();
  G.invFull = () => S.inventory.length >= INV_MAX();
  G.invFind = function (uid) {
    return S.inventory.find((x) => x && x.uid === uid) || null;
  };
  G.invRemove = function (uid) {
    const i = S.inventory.findIndex((x) => x && x.uid === uid);
    if (i < 0) return false;
    S.inventory.splice(i, 1);
    return true;
  };
  /* 전투력 높은 순으로 정렬한 사본 */
  G.invSorted = function () {
    return S.inventory.slice().sort((a, b) => G.itemScore(b) - G.itemScore(a));
  };

  function normalizeInventory() {
    if (!Array.isArray(S.inventory)) S.inventory = [];
    const seen = new Set();
    S.inventory = S.inventory.filter((it) => {
      if (!it || typeof it !== "object" || !it.uid || !it.slot || !G.SLOT_BY_KEY[it.slot]) return false;
      if (!it.atk || !G.RARITY_BY_KEY[it.rarity]) return false;
      if (seen.has(it.uid)) return false;
      seen.add(it.uid);
      return true;
    });
    // 장착 중인 장비는 보관함에서 빼둔다 (중복 방지)
    G.SLOTS.forEach((sl) => {
      const eq = S.equip[sl.key];
      if (eq && eq.uid) G.invRemove(eq.uid);
    });
    // 용량을 넘은 옛 저장은 약한 것부터 분해해 골드로 돌려준다
    while (S.inventory.length > INV_MAX()) {
      let wi = 0, ws = Infinity;
      S.inventory.forEach((x, i) => { const sc = G.itemScore(x); if (sc < ws) { ws = sc; wi = i; } });
      const drop = S.inventory.splice(wi, 1)[0];
      if (S.forgeItem && S.forgeItem.uid === drop.uid) S.forgeItem = null;
      const r = G.salvage(drop);
      S.gold += r.gold; S.stones += r.stones;
    }
  }

  /* 새 장비를 보관함에 넣는다.
     반환: { ok, stored, replaced?, salvage?, reason? }
     - 가득 찼을 때: 새 장비가 가장 약한 보관 장비보다 강하면 그 약한 장비를 분해하고 교체,
       아니면 새 장비를 분해한다. (noSwap: 교체 없이 새 장비 분해) */
  G.storeItem = function (it, opts) {
    opts = opts || {};
    if (!it) return { ok: false, reason: "noitem" };
    if (G.invFind(it.uid)) return { ok: true, already: true, stored: true };
    const eq = it.slot ? S.equip[it.slot] : null;
    if (eq && eq.uid === it.uid) return { ok: false, reason: "equipped" };

    if (S.inventory.length < INV_MAX()) {
      it.stored = true;
      it.isNewInv = true;
      S.inventory.push(it);
      if (!opts.silent) emit("inventory", { kind: "add", item: it });
      return { ok: true, stored: true };
    }

    if (opts.noSwap) {
      const r = salvageQuiet(it);
      it.salvaged = true;
      return { ok: false, reason: "full", salvage: r };
    }

    let wi = 0, ws = Infinity;
    S.inventory.forEach((x, i) => { const sc = G.itemScore(x); if (sc < ws) { ws = sc; wi = i; } });
    const weakest = S.inventory[wi];
    if (weakest && G.itemScore(it) > ws) {
      S.inventory.splice(wi, 1);
      weakest.salvaged = true;
      if (S.forgeItem && S.forgeItem.uid === weakest.uid) S.forgeItem = null;
      const r = salvageQuiet(weakest);
      it.stored = true;
      it.isNewInv = true;
      S.inventory.push(it);
      emit("inventory", { kind: "replace", item: it, replaced: weakest, salvage: r });
      return { ok: true, stored: true, replaced: weakest, salvage: r };
    }
    const r = salvageQuiet(it);
    it.salvaged = true;
    return { ok: false, reason: "full", salvage: r };
  };

  /* 보관함에서 여러 개를 한 번에 분해 */
  G.salvageMany = function (list) {
    let gold = 0, stones = 0, n = 0;
    (list || []).slice().forEach((it) => {
      if (!it || it.salvaged) return;
      const r = salvageQuiet(it);
      it.salvaged = true;
      G.invRemove(it.uid);
      if (S.forgeItem && S.forgeItem.uid === it.uid) S.forgeItem = null;
      gold += r.gold; stones += r.stones; n += 1;
    });
    if (n) {
      emit("inventory", { kind: "bulk" });
      G.saveSoon();
    }
    return { count: n, gold: gold, stones: stones };
  };

  /* 일괄 분해 대상 */
  G.bulkTargets = function (mode) {
    return S.inventory.filter((it) => {
      if (!it || it.salvaged) return false;
      if (mode === "rarity") return G.RARITY_BY_KEY[it.rarity].idx <= 2;
      const eq = S.equip[it.slot];
      if (!eq) return false; // 빈 슬롯은 건드리지 않는다
      return G.itemScore(it) < G.itemScore(eq);
    });
  };

  G.bulkSalvage = function (mode) {
    const list = G.bulkTargets(mode);
    if (!list.length) return { count: 0, gold: 0, stones: 0 };
    const r = G.salvageMany(list);
    emit("toast", { kind: "salvage", text: "일괄 분해 · " + r.count + "개 · +" + G.fmt(r.gold) + " G" + (r.stones ? " · 💠" + r.stones : "") });
    return r;
  };

  /* ---------------- 장착 ---------------- */
  G.equipItem = function (it, opts) {
    if (!it) return null;
    opts = opts || {};
    const prev = S.equip[it.slot] || null;
    if (prev && prev.uid === it.uid) { it.isNew = false; return prev; }
    S.equip[it.slot] = it;
    // 장착한 장비는 보관함에서 빠진다
    G.invRemove(it.uid);
    // 모루 위 장비가 방금 장착한 장비였다면 모루는 비운다
    if (S.forgeItem && S.forgeItem.uid === it.uid) S.forgeItem = null;
    it.isNew = false;
    it.stored = false;
    // 밀려난 장비는 분해하지 않고 보관함으로 (가득 차면 그때만 분해)
    let prevStored = false;
    if (prev) {
      const res = G.storeItem(prev, { silent: true, noSwap: true });
      prevStored = !!res.ok;
    }
    if (!S.forgeItem) S.forgeItem = it;
    emit("equip", it);
    emit("inventory", { kind: "swap", item: it });
    if (!opts.silent) {
      emit("toast", {
        kind: "equip",
        text: it.name + " 장착" + (prev ? (prevStored ? " · 이전 장비 보관함" : " · 보관함 가득 · 이전 장비 분해") : "")
      });
    }
    G.saveSoon();
    return prev;
  };

  G.unequipToForge = function (slotKey) {
    const it = S.equip[slotKey];
    if (!it) return;
    S.forgeItem = it;
    emit("forgeSlot", it);
    G.saveSoon();
  };

  G.setForgeItem = function (it) {
    S.forgeItem = it;
    emit("forgeSlot", it);
    G.saveSoon();
  };

  /* ---------------- 강화 ---------------- */
  G.enhanceInfo = function (it) {
    if (!it) return null;
    const st = G.stats();
    const lv = it.lv;
    const success = lv >= G.ENH.max ? 0 : G.ENH.success(lv, S.research.crit) + st.enhBonus;
    const down = lv >= 5 ? G.ENH.downChance(lv) * (1 - success / 100) : 0;
    const brk = lv >= 10 ? G.ENH.breakChance(lv) * (1 - success / 100) : 0;
    const pitied = S.enhance.pity >= 100;
    return {
      lv: lv,
      success: pitied ? 100 : Math.min(100, success),
      down: Math.round(down * 100),
      break: Math.round(brk * 100),
      cost: G.enhCost(it, lv),
      pity: S.enhance.pity,
      sealed: S.enhance.protect && S.enhance.seal > 0,
      canProtect: lv >= 10,
      max: lv >= G.ENH.max
    };
  };

  G.pullStoneCost = 0;

  G.enhance = function () {
    const it = S.forgeItem;
    if (!it) return { ok: false, reason: "noitem" };
    if (it.lv >= G.ENH.max) return { ok: false, reason: "max" };
    const info = G.enhanceInfo(it);
    if (S.gold < info.cost) return { ok: false, reason: "gold", cost: info.cost };
    S.gold -= info.cost;
    S.stats.enhances += 1;
    const protectedNow = info.sealed;
    if (protectedNow) S.enhance.seal -= 1;

    const pitied = S.enhance.pity >= 100;
    const roll = Math.random() * 100;
    const success = pitied || roll < info.success;

    if (success) {
      it.lv += 1;
      S.enhance.pity = 0;
      S.stats.maxEnh = Math.max(S.stats.maxEnh, it.lv);
      emit("enhance", { ok: true, lv: it.lv, item: it });
      G.saveSoon();
      return { ok: true, lv: it.lv };
    }

    // 실패
    const failRoll = Math.random() * 100;
    if (failRoll < info.break && !protectedNow) {
      S.stats.breaks += 1;
      const r = G.salvage(it);
      gainGold(Math.round(r.gold * 0.4));
      if (S.forgeItem && S.forgeItem.uid === it.uid) S.forgeItem = null;
      if (S.equip[it.slot] && S.equip[it.slot].uid === it.uid) S.equip[it.slot] = null;
      G.invRemove(it.uid);
      emit("inventory", { kind: "remove", item: it });
      emit("enhance", { ok: false, broke: true, name: it.name });
      emit("toast", { kind: "break", text: it.name + " 파괴… +" + it.lv + "이 사라졌습니다" });
      G.saveSoon();
      return { ok: false, broke: true };
    }
    let downed = false;
    if (failRoll < info.break + info.down && it.lv > 0) {
      it.lv -= 1;
      downed = true;
    }
    S.enhance.pity = Math.min(100, S.enhance.pity + G.ENH.pityGain(it.lv));
    if (protectedNow) emit("toast", { kind: "seal", text: "봉인 부적이 장비를 지켰습니다" });
    emit("enhance", { ok: false, downed: downed, lv: it.lv, item: it });
    G.saveSoon();
    return { ok: false, downed: downed };
  };

  G.buySeal = function (n) {
    const cost = 5000 * n;
    if (S.gold < cost) return false;
    S.gold -= cost;
    S.enhance.seal += n;
    emit("toast", { kind: "seal", text: "봉인 부적 " + n + "개 구입" });
    G.saveSoon();
    return true;
  };

  /* ---------------- 상자 레벨---------------- */
  G.chestLevelCost = () => ({ gold: G.CHEST.levelCost(S.chest.lv), stones: G.CHEST.levelStones(S.chest.lv) });
  G.levelUpChest = function () {
    if (S.chest.lv >= G.CHEST.maxLv) return { ok: false, reason: "max" };
    const c = G.chestLevelCost();
    if (S.gold < c.gold) return { ok: false, reason: "gold" };
    if (S.stones < c.stones) return { ok: false, reason: "stones" };
    S.gold -= c.gold; S.stones -= c.stones;
    S.chest.lv += 1;
    emit("chestLevel", S.chest.lv);
    emit("toast", { kind: "chest", text: "상자 Lv." + S.chest.lv + " · 고급 등급 확률 상승" });
    G.saveSoon();
    return { ok: true };
  };

  G.buyKeys = function (n) {
    const cost = n === 10 ? G.CHEST.keyPrice10 : G.CHEST.keyPrice * n;
    if (S.gold < cost) return { ok: false, reason: "gold", cost: cost };
    S.gold -= cost;
    gainKeys(n);
    emit("toast", { kind: "key", text: "열쇠 " + n + "개 구입" });
    G.saveSoon();
    return { ok: true };
  };

  /* ---------------- 연구 / 유물 ---------------- */
  G.researchInfo = function (cfg) {
    const lv = S.research[cfg.key];
    return { lv: lv, max: lv >= cfg.max, cost: G.researchCost(cfg, lv) };
  };
  G.buyResearch = function (key) {
    const cfg = G.RESEARCH.find((r) => r.key === key);
    if (!cfg) return { ok: false };
    const info = G.researchInfo(cfg);
    if (info.max) return { ok: false, reason: "max" };
    if (S.gold < info.cost) return { ok: false, reason: "gold" };
    S.gold -= info.cost;
    S.research[key] += 1;
    emit("research", key);
    emit("toast", { kind: "research", text: cfg.name + " Lv." + S.research[key] });
    G.saveSoon();
    return { ok: true };
  };

  G.relicInfo = function (cfg) {
    const lv = S.relics[cfg.id] || 0;
    return { lv: lv, max: lv >= cfg.max, cost: cfg.cost(lv) };
  };
  G.buyRelic = function (id) {
    const cfg = G.RELICS.find((r) => r.id === id);
    if (!cfg) return { ok: false };
    const info = G.relicInfo(cfg);
    if (info.max) return { ok: false, reason: "max" };
    if (S.frags < info.cost) return { ok: false, reason: "frags", cost: info.cost };
    S.frags -= info.cost;
    S.relics[id] = info.lv + 1;
    emit("relic", id);
    emit("toast", { kind: "relic", text: cfg.name + " Lv." + S.relics[id] });
    G.saveSoon();
    return { ok: true };
  };

  /* ---------------- 업적 ---------------- */
  G.achievementReady = function (a) {
    if (S.achievements.claimed[a.id]) return false;
    try { return !!a.check(S); } catch (e) { return false; }
  };
  G.claimAchievement = function (id) {
    const a = G.ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || S.achievements.claimed[id]) return false;
    if (!G.achievementReady(a)) return false;
    S.achievements.claimed[id] = Date.now();
    grant(a.reward);
    emit("toast", { kind: "reward", text: "업적 · " + a.name + " 보상 수령!" });
    G.saveSoon();
    return true;
  };
  G.claimAllAchievements = function () {
    let n = 0;
    G.ACHIEVEMENTS.forEach((a) => { if (G.claimAchievement(a.id)) n += 1; });
    return n;
  };

  /* ---------------- 안내 ---------------- */
  G.tutorialStep = function () {
    if (S.tutorial.skipped) return null;
    const step = G.TUTORIAL[S.tutorial.idx];
    if (!step || S.tutorial.done[step.id]) return null;
    return step;
  };
  G.tutorialDone = function (id) {
    const idx = G.TUTORIAL.findIndex((t) => t.id === id);
    if (idx < 0 || S.tutorial.done[id]) return;
    S.tutorial.done[id] = true;
    const step = G.TUTORIAL[idx];
    if (idx === S.tutorial.idx) {
      S.tutorial.idx += 1;
      S.tutorial.collapsed = false;
      emit("tutorial", S.tutorial.idx);
      const reward = [ { keys: 4, gold: 800 }, { keys: 4, gold: 1200 }, { keys: 12, gold: 6000 }, { keys: 30, stones: 6, frags: 4 } ][idx];
      grant(reward);
      emit("toast", { kind: "tutorial", text: "안내 완료 · " + step.title + " 보상!" });
      if (S.tutorial.idx >= G.TUTORIAL.length) {
        S.tutorial.skipped = true;
        emit("toast", { kind: "tutorial", text: "초보자 안내 완료! 이제 자유롭게 성장하세요" });
      }
    }
    G.saveSoon();
  };
  G.skipTutorial = function () { S.tutorial.skipped = true; emit("tutorial", -1); G.saveSoon(); };

  /* ---------------- 전장 (자동 전투) ---------------- */
  const combat = {
    enemy: null,
    heroHp: 0,
    maxHp: 0,
    attackT: 0,
    enemyT: 0,
    respawn: 0,
    gaze: 0,
    paused: false,
    bossFight: false,
    combo: 0,
    running: false,

    reset() {
      this.enemy = null; this.respawn = 0; this.bossFight = false; this.combo = 0;
      this.maxHp = G.stats().maxHp; this.heroHp = this.maxHp;
      this.spawnDelay = 0;
      emit("battle", this.view());
    },

    stageIdx() { return Math.max(1, Math.min(G.TOTAL_STAGES, S.progress.stage)); },
    stage() { return G.stageByIndex(this.stageIdx()); },

    spawnEnemy(boss) {
      const st = this.stage();
      const S2 = st.scale;
      const hp = G.BAL.enemyHp(S2, boss, st.i);
      this.enemy = {
        name: boss ? st.name : st.mobName,
        hp: hp, maxHp: hp, boss: !!boss,
        art: boss ? st.art : "assets/monster-" + (st.art.includes("demon") || st.art.includes("fiend") ? "fiend" : "undead") + ".png",
        atk: G.BAL.enemyAtk(S2, boss),
        interval: G.BAL.enemyInterval(boss)
      };
      this.enemyT = this.enemy.interval;
      this.attackT = 0.15;
      emit("spawn", this.enemy);
    },

    heroAttack() {
      if (!this.enemy) return;
      emit("heroAttack", { boss: this.enemy.boss });
      const st = G.stats();
      const stage = this.stage();
      let dmg = st.atk * rnd(0.86, 1.14);
      const crit = Math.random() * 100 < st.crit;
      if (crit) dmg *= st.critDmg / 100;
      if (this.enemy.boss) dmg *= 1 + st.bossDmg / 100;
      dmg = Math.max(1, Math.round(dmg));
      this.enemy.hp -= dmg;
      S.stats.dmg += dmg;
      this.combo = this.enemy.hp > 0 ? this.combo + 1 : 0;
      emit("hit", { dmg: dmg, crit: crit, boss: this.enemy.boss, hp: Math.max(0, this.enemy.hp), maxHp: this.enemy.maxHp });
      if (this.enemy.hp <= 0) this.onKill();
    },

    onKill() {
      const st = this.stage();
      const boss = this.enemy.boss;
      const Sc = st.scale;
      const stat = G.stats();
      const gold = Math.round(G.BAL.goldPerKill(Sc, boss) * stat.goldMul * rnd(0.9, 1.12));
      gainGold(gold);
      gainExp(G.BAL.expPerKill(Sc, boss));
      S.stats.kills += boss ? 0 : 1;
      const drops = { gold: gold, keys: 0, stones: 0, frags: 0 };
      if (boss) {
        S.stats.bossKills += 1;
        drops.keys = 4 + Math.floor(st.world / 4);
        drops.stones = 2 + Math.floor(st.world / 3);
        drops.frags = G.BAL.fragBoss;
        gainKeys(drops.keys); gainStones(drops.stones); gainFrags(drops.frags);
      } else {
        if (Math.random() < stat.keyChance) { drops.keys = 1; gainKeys(1); }
        if (Math.random() < G.BAL.stoneChance + S.research.key * 0.002) { drops.stones = 1; gainStones(1); }
      }
      emit("kill", { gold: drops.gold, keys: drops.keys, stones: drops.stones, frags: drops.frags, boss: boss, bossName: boss ? st.name : "" });
      this.enemy = null;

      if (boss) {
        S.progress.cleared[st.key] = Date.now();
        S.stats.clears += 1;
        this.bossFight = false;
        emit("bossClear", st);
        // 보스 격파 후 다음 구역으로
        if (st.i < G.TOTAL_STAGES) {
          S.progress.stage = st.i + 1;
          S.progress.maxStage = Math.max(S.progress.maxStage, st.i + 1);
          this.spawnDelay = 1.2;
        } else {
          this.spawnDelay = 2.2;
          emit("allClear");
        }
        S.progress.world = G.stageByIndex(S.progress.stage).world;
        emit("stage", this.stage());
        G.tutorialDone("boss");
        G.saveSoon();
        return;
      }

      // 일반 구역: 6마리 처치하면 다음 구역
      this.killsInStage = (this.killsInStage || 0) + 1;
      if (this.killsInStage >= st.mobCount) {
        this.killsInStage = 0;
        if (!S.progress.cleared[st.key]) S.progress.cleared[st.key] = Date.now();
        S.stats.clears += 1;
        const nextIdx = Math.min(G.TOTAL_STAGES, st.i + 1);
        S.progress.stage = nextIdx;
        S.progress.maxStage = Math.max(S.progress.maxStage, nextIdx);
        S.progress.world = G.stageByIndex(nextIdx).world;
        emit("stage", this.stage());
        emit("stageClear", st);
        this.spawnDelay = 0.75;
        G.saveSoon();
      } else {
        this.spawnDelay = G.BAL.killGap;
      }
    },

    tick(dt) {
      if (this.paused) return;
      const st = this.stage();
      if (this.respawn > 0) {
        this.respawn -= dt;
        if (this.respawn <= 0) {
          const s2 = G.stats();
          this.maxHp = s2.maxHp;
          this.heroHp = this.maxHp;
          emit("respawn", this.view());
          if (st.isBoss && this.bossFight) this.spawnEnemy(true);
        }
        return;
      }
      if (this.spawnDelay > 0) {
        this.spawnDelay -= dt;
        if (this.spawnDelay <= 0) {
          if (st.isBoss && !this.bossFight) return;
          this.spawnEnemy(st.isBoss && this.bossFight);
        }
        return;
      }
      if (!this.enemy) {
        if (st.isBoss && !this.bossFight) return;
        this.spawnEnemy(st.isBoss && this.bossFight);
        return;
      }
      const stat = G.stats();
      if (this.maxHp !== stat.maxHp) {
        const ratio = this.maxHp ? this.heroHp / this.maxHp : 1;
        this.maxHp = stat.maxHp;
        this.heroHp = Math.min(this.maxHp, Math.max(this.heroHp, this.maxHp * ratio));
      }
      this.attackT -= dt;
      if (this.attackT <= 0) {
        this.attackT = 0.38;
        this.heroAttack();
      }
      if (!this.enemy) return;
      this.enemyT -= dt;
      if (this.enemyT <= 0) {
        this.enemyT = this.enemy.interval;
        const dmg = Math.max(1, Math.round(this.enemy.atk * rnd(0.85, 1.15)));
        emit("enemyAttack", { boss: this.enemy.boss });
        this.heroHp -= dmg;
        emit("heroHit", { dmg: dmg, hp: Math.max(0, this.heroHp), maxHp: this.maxHp });
        if (this.heroHp <= 0) {
          this.heroHp = 0;
          this.respawn = G.BAL.respawnSec;
          emit("heroDown", this.view());
        }
      }
      // 체력 자연 회복
      if (this.heroHp > 0) this.heroHp = Math.min(this.maxHp, this.heroHp + this.maxHp * G.BAL.heroRegen * dt);
    },

    view() {
      const st = this.stage();
      const stat = G.stats();
      return {
        stage: st, enemy: this.enemy,
        heroHp: Math.max(0, Math.round(this.heroHp)), heroMax: Math.round(this.maxHp || stat.maxHp),
        respawn: this.respawn, bossFight: this.bossFight,
        killsInStage: this.killsInStage || 0, combo: this.combo
      };
    },

    challengeBoss() {
      const st = this.stage();
      if (!st.isBoss) return false;
      this.bossFight = true;
      this.spawnDelay = 0;
      this.spawnEnemy(true);
      emit("bossStart", st);
      return true;
    },

    gotoStage(idx) {
      idx = clamp(idx, 1, S.progress.maxStage);
      S.progress.stage = idx;
      S.progress.world = G.stageByIndex(idx).world;
      this.enemy = null; this.bossFight = false; this.killsInStage = 0; this.spawnDelay = 0.4; this.respawn = 0;
      this.maxHp = G.stats().maxHp; this.heroHp = this.maxHp;
      emit("stage", this.stage());
      emit("battle", this.view());
      G.saveSoon();
    }
  };
  G.combat = combat;
  G.battleView = () => combat.view();
  G.challengeBoss = () => combat.challengeBoss();

  /* ---------------- 오프라인 보상 ---------------- */
  G.offlineCheck = function () {
    const elapsed = Math.max(0, (Date.now() - num(S.lastSeen, Date.now())) / 1000);
    if (elapsed < 120) return null;
    const capped = Math.min(elapsed, 8 * 3600);
    const st = G.stageByIndex(S.progress.stage);
    const goldPerSec = (G.BAL.goldPerKill(st.scale, false) * 6 / 6) / 4.4; // 4.4초당 1마리
    const relic = S.relics["hourglass"] || 0;
    const mul = (1 + relic * 0.15) * 0.55;
    const gold = Math.round(goldPerSec * capped * mul);
    const keys = Math.floor(capped / 240 * (1 + relic * 0.15) * 0.5);
    if (gold < 10 && keys < 1) return null;
    return { seconds: capped, gold: gold, keys: keys };
  };
  G.claimOffline = function (r) {
    gainGold(r.gold); gainKeys(r.keys);
    S.lastSeen = Date.now();
    G.saveSoon();
  };

  /* ---------------- 루프 ---------------- */
  let last = performance.now();
  let uiTick = 0;
  function loop(now) {
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
    last = now;
    if (!S.paused) {
      combat.tick(dt);
      S.stats.playSec += dt;
    }
    uiTick += dt;
    if (uiTick > 0.1) { uiTick = 0; emit("frame", combat.view()); }
    requestAnimationFrame(loop);
  }
  G.startLoop = function () { requestAnimationFrame(loop); };

  /* 지금 전투력으로 감당할 수 없는 구역에 있으면 가장 가까운 구역으로 재정비 */
  G.autoDemote = function () {
    if (S.progress.stage <= 1) return false;
    const st = G.stageByIndex(S.progress.stage);
    const power = G.stats().power;
    const rec = G.BAL.recPower(st.scale, st.i);
    if (rec <= power * 2.2) return false;
    let target = 1;
    for (let i = S.progress.stage - 1; i >= 1; i--) {
      const c = G.stageByIndex(i);
      if (G.BAL.recPower(c.scale, c.i) <= power * 1.1) { target = i; break; }
    }
    S.progress.stage = target;
    S.progress.world = G.stageByIndex(target).world;
    emit("toast", { kind: "reward", text: "구역 재정비 · " + G.stageByIndex(target).label + "부터 다시 도전합니다" });
    G.saveSoon();
    return true;
  };

  /* ---------------- 초기화 ---------------- */
  G.init = function () {
    const r = G.load();
    if (r.fresh) {
      G.seedStarter();
      S.keys = Math.max(S.keys, 10);
      G.save(true);
    }
    G.state = S;
    combat.maxHp = G.stats().maxHp;
    combat.heroHp = combat.maxHp;
    combat.killsInStage = 0;
    setInterval(() => G.save(true), 5000);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) G.save(true);
      else { S.lastSeen = S.lastSeen || Date.now(); }
    });
    window.addEventListener("beforeunload", () => G.save(true));
    return r;
  };
})();
