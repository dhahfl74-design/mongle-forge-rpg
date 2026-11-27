/* =====================================================================
   심연의 대장간 v5.0 — UI
   ===================================================================== */
(function () {
  "use strict";
  const G = window.GAME;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const svg = (name, cls) => '<svg class="' + (cls || "") + '"><use href="#i-' + name + '"/></svg>';
  const itemArt = (slot, rarity) => "./assets/items/" + slot + "_" + rarity + ".webp";
  const iconImg = (o, cls) => '<img class="item-ico ' + (cls || "") + '" src="' + itemArt(o.slot, o.rarity) + '" alt="" draggable="false" loading="eager" decoding="async" />';
  const rar = (k) => G.RARITY_BY_KEY[k] || G.RARITY[0];

  let S = null;
  const ui = {
    tab: "chest",
    cxSlot: "all",
    recent: [],
    newCodex: 0,
    newInv: 0,
    autoTimer: 0,
    lastEnemyKey: "",
    modal: null,
    lastFrame: 0,
    interacted: false,
    dmgSpots: [],
    musicMode: ""
  };

  /* ================= 기본 렌더 ================= */
  function renderWallet(pulse) {
    $("#goldVal").textContent = G.fmt(S.gold);
    $("#keyVal").textContent = G.fmt(S.keys);
    $("#stoneVal").textContent = G.fmt(S.stones);
    $("#fragVal").textContent = G.fmt(S.frags);
    if (pulse) {
      const map = { gold: "#goldVal", keys: "#keyVal", stones: "#stoneVal", frags: "#fragVal" };
      const node = $(map[pulse]);
      if (node) {
        const box = node.closest(".w-item");
        box.classList.remove("pulse");
        void box.offsetWidth;
        box.classList.add("pulse");
      }
    }
  }

  function renderHud() {
    const need = G.expNeed(S.hero.lv);
    $("#heroLv").textContent = "Lv." + S.hero.lv;
    const fill = $("#heroExpFill");
    if (fill) fill.style.width = Math.min(100, (S.hero.exp / need) * 100) + "%";
  }

  function renderStageStatic() {
    const st = G.stageByIndex(S.progress.stage);
    $("#sbWorldEmoji").textContent = st.emoji;
    $("#sbLabel").textContent = st.label;
    $("#sbName").textContent = st.worldName;
    $('#sbPips').innerHTML = '';
    // 현재 세계 구역 핍
    const world = G.WORLD_BY_ID[st.world];
    let pips = "";
    for (let s = 1; s <= world.sub; s++) {
      const key = st.world + "-" + s;
      const cur = s === st.sub;
      const cleared = !!S.progress.cleared[key];
      const boss = s === world.sub;
      pips += '<i class="' + (boss ? "boss " : "") + (cur || cleared ? "on" : "") + '"></i>';
    }
    $("#sbPips").innerHTML = pips;

    const st2 = G.stats();
    $("#powerVal").textContent = G.fmt(st2.power);
    $("#powerRec").textContent = "/ 권장 " + G.fmt(G.BAL.recPower(st.scale, st.i));
    $("#heroHpText").textContent = "— / —";

    // 도전 버튼
    const bossBtn = $("#bossBtn");
    const canBoss = st.isBoss && !S.progress.cleared[st.key];
    bossBtn.classList.toggle("show", canBoss);
  }

  /* ================= 전장 프레임 ================= */
  function renderFrame(v) {
    const st = v.stage;
    $("#heroHpFill").style.width = (v.heroMax ? (v.heroHp / v.heroMax) * 100 : 0) + "%";
    $("#heroHpText").textContent = G.fmt(v.heroHp) + " / " + G.fmt(v.heroMax);
    const foe = $("#foeUnit");
    const img = $("#enemyImg");
    const bar = $("#enemyHpFill");
    const barWrap = $(".hpbar.enemy");
    if (v.enemy) {
      const key = st.key + "|" + v.enemy.name;
      if (key !== ui.lastEnemyKey) {
        ui.lastEnemyKey = key;
        img.src = v.enemy.art;
        $("#enemyName").textContent = v.enemy.name;
        $("#enemyTag").textContent = v.enemy.boss ? "지배자" : "일반";
        $("#enemyTag").classList.toggle("normal", !v.enemy.boss);
        foe.classList.toggle("boss", !!v.enemy.boss);
        barWrap.classList.toggle("boss", !!v.enemy.boss);
        foe.classList.remove("dying", "hit", "spawn");
        void foe.offsetWidth;
        foe.classList.add("spawn");
        setTimeout(() => foe.classList.remove("spawn"), 380);
      }
      const pct = Math.max(0, (v.enemy.hp / v.enemy.maxHp) * 100);
      bar.style.width = pct + "%";
      $("#enemyHpText").textContent = G.fmt(Math.max(0, v.enemy.hp)) + " / " + G.fmt(v.enemy.maxHp);
    } else {
      $("#enemyName").textContent = st.isBoss ? st.name : "다음 몬스터";
      $("#enemyTag").textContent = st.isBoss ? "지배자" : "일반";
      $("#enemyTag").classList.toggle("normal", !st.isBoss);
      bar.style.width = "0%";
      $("#enemyHpText").textContent = st.isBoss ? "도전 대기" : "—";
      if (ui.lastEnemyKey.indexOf("idle|") !== 0) {
        ui.lastEnemyKey = "idle|" + st.key;
        img.src = st.art;
      }
      foe.classList.toggle("boss", !!st.isBoss);
    }
    $("#heroUnitLv").textContent = "Lv." + S.hero.lv;
    const chip = $("#comboChip");
    chip.classList.toggle("show", v.combo >= 4);
    const label = "콤보 " + v.combo;
    if (chip.textContent !== label) {
      chip.textContent = label;
      chip.classList.remove("bump");
      void chip.offsetWidth;
      chip.classList.add("bump");
    }
    $("#downBanner").classList.toggle("show", v.respawn > 0);
    const down = $("#downBanner");
    if (down) down.setAttribute("aria-hidden", v.respawn > 0 ? "false" : "true");
    $("#bossBtn").classList.toggle("show", st.isBoss && !S.progress.cleared[st.key] && !v.bossFight);

    /* ---- 구역 진행도 ---- */
    const progBox = $("#acProgress");
    const progFill = $("#acProgressFill");
    const killLine = $("#killLine");
    if (progBox && progFill) {
      progBox.classList.toggle("boss", !!st.isBoss);
      let pct = 0;
      if (st.isBoss) {
        if (v.bossFight && v.enemy) pct = 1 - Math.max(0, v.enemy.hp) / Math.max(1, v.enemy.maxHp);
        else pct = S.progress.cleared[st.key] ? 1 : 0;
      } else {
        pct = Math.min(1, (v.killsInStage || 0) / Math.max(1, st.mobCount || 6));
      }
      progFill.style.width = (pct * 100).toFixed(1) + "%";
    }
    if (killLine) {
      if (st.isBoss) {
        if (v.bossFight && v.enemy) killLine.innerHTML = "지배자 <b>" + Math.max(0, Math.round((1 - v.enemy.hp / Math.max(1, v.enemy.maxHp)) * 100)) + "%</b> 격파";
        else killLine.innerHTML = S.progress.cleared[st.key] ? "정복 완료" : "<b>도전 대기</b>";
      } else {
        killLine.innerHTML = "처치 <b>" + Math.min(v.killsInStage || 0, st.mobCount || 6) + "/" + (st.mobCount || 6) + "</b>";
      }
    }

    /* ---- 지배자 도전 유도 ---- */
    const cta = $("#bossCta");
    if (cta) {
      const show = !!v.bossReady && v.respawn <= 0;
      cta.classList.toggle("show", show);
      cta.setAttribute("aria-hidden", show ? "false" : "true");
    }
    const st2 = G.stats();
    $("#powerVal").textContent = G.fmt(st2.power);
    $("#powerRec").textContent = "/ 권장 " + G.fmt(G.BAL.recPower(st.scale, st.i));
  }

  function stageChanged() {
    ui.lastEnemyKey = "";
    renderStageStatic();
    renderFrame(G.battleView());
  }

  /* ================= 데미지 연출으로 ================= */
  function floatDmg(text, cls, xPct, yPct) {
    const layer = $("#dmgLayer");
    if (!layer) return;
    const d = document.createElement("div");
    d.className = "dmg " + (cls || "");
    d.textContent = text;
    d.style.left = xPct + "%";
    d.style.top = yPct + "%";
    layer.appendChild(d);
    setTimeout(() => d.remove(), 1050);
  }
  function hitFlash() {
    const f = $("#hitFlash");
    f.classList.remove("on");
    void f.offsetWidth;
    f.classList.add("on");
    const foe = $("#foeUnit");
    foe.classList.remove("hit");
    void foe.offsetWidth;
    foe.classList.add("hit");
    setTimeout(() => foe.classList.remove("hit"), 280);
  }

  /* 화면 흔들림 · 히트스톱 */
  const fx = {
    shakeT: 0, shakeMag: 0, running: false,
    shake(mag, ms) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeT = Math.max(this.shakeT, ms || 150);
      if (this.running) return;
      this.running = true;
      const scene = $("#acScene");
      const step = () => {
        if (!scene) { this.running = false; return; }
        if (this.shakeT > 0) {
          const k = Math.min(1, this.shakeT / 160);
          const dx = (Math.random() - .5) * this.shakeMag * k * 2;
          const dy = (Math.random() - .5) * this.shakeMag * k * 2;
          scene.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
          this.shakeT -= 16;
          this.shakeMag *= .9;
          requestAnimationFrame(() => step());
        } else {
          scene.style.transform = "";
          this.running = false;
        }
      };
      requestAnimationFrame(step);
    },
    stop(ms) {
      const app = $("#app");
      if (!app) return;
      app.classList.add("hitstop");
      clearTimeout(this._st);
      this._st = setTimeout(() => app.classList.remove("hitstop"), ms || 55);
    }
  };

  function heroAttackAnim() {
    const u = $("#heroUnit");
    if (!u) return;
    if (u.classList.contains("attack")) return;
    u.classList.add("attack");
    setTimeout(() => u.classList.remove("attack"), 360);
  }

  /* 무대의 불씨 */
  function spawnEmbers() {
    const box = $("#acEmbers");
    if (!box) return;
    box.innerHTML = "";
    for (let i = 0; i < 14; i++) {
      const e = document.createElement("i");
      e.style.left = (6 + Math.random() * 88) + "%";
      e.style.animationDuration = (4.5 + Math.random() * 5) + "s";
      e.style.animationDelay = (Math.random() * 6) + "s";
      e.style.setProperty("--ex", ((Math.random() - .5) * 60).toFixed(0) + "px");
      e.style.opacity = "0";
      e.style.width = e.style.height = (2 + Math.random() * 2.4).toFixed(1) + "px";
      box.appendChild(e);
    }
  }

  /* 아이콘 선로딩 — 10연 결과가 빈 카드로 뜨지 않게 */
  function preloadItemArt() {
    const list = ["weapon", "helm", "armor", "ring"];
    const rars = G.RARITY.map((r) => r.key);
    list.forEach((slot) => rars.forEach((rr) => {
      const im = new Image();
      im.src = itemArt(slot, rr);
    }));
  }

  function haptic(ms) {
    if (!S.settings.haptics) return;
    if (!ui.interacted) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms || 12); } catch (e) {} }
  }

  /* ================= 상자 ================= */
  let chestToken = 0;
  function playChestOpen(rarityIdx, done, opts) {
    opts = opts || {};
    const token = ++chestToken;
    const chest = $("#chestArt");
    const scene = $("#chestScene");
    const hero = $(".chest-hero");
    const beam = $("#beam");
    const ring = $("#shockRing");
    const stinger = $("#stinger");
    const stingerName = $("#stingerName");
    const r = G.RARITY[rarityIdx] || G.RARITY[0];
    const fast = !!opts.fast;
    const timers = [];
    let fired = false;
    const at = (fn, ms) => timers.push(setTimeout(() => { if (token === chestToken) fn(); }, ms));
    const clear = () => timers.forEach(clearTimeout);

    chest.classList.remove("sealed", "crack", "open");
    beam.classList.remove("on");
    ring.classList.remove("on");
    stinger.classList.remove("on", "myth");
    scene.style.setProperty("--rc", r.color);
    scene.classList.toggle("myth", rarityIdx >= 5);
    hero.classList.add("opening");
    ui.chestBusy = true;
    if (G.musicDuck) G.musicDuck(true);

    const reveal = (skipped) => {
      if (fired) return;
      fired = true;
      clear();
      chest.classList.remove("sealed", "crack");
      chest.classList.add("open");
      beam.classList.add("on");
      ring.classList.remove("on");
      void ring.offsetWidth;
      ring.classList.add("on");
      G.sfx("chestOpen");
      burstSparks(r.color, rarityIdx);
      if (rarityIdx >= 3) { haptic([20, 30, 20]); fx.shake(5, 180); }
      else haptic(16);
      // 3막 확정 — 뚜껑이 열린 뒤 등급 타이포가 내려앉는다
      const stingerLead = skipped ? 0 : 170;
      setTimeout(() => {
        if (token !== chestToken) return;
        stingerName.textContent = r.name;
        stinger.classList.toggle("myth", rarityIdx >= 5);
        stinger.classList.remove("on");
        void stinger.offsetWidth;
        stinger.classList.add("on");
        G.sfx("reveal", rarityIdx);
      }, stingerLead);
      const delay = skipped ? 90 : 700;
      setTimeout(() => {
        if (token !== chestToken) return;
        if (done) done();
        ui.chestBusy = false;
      }, delay);
      setTimeout(() => {
        if (token !== chestToken) return;
        chest.classList.remove("open", "crack", "sealed");
        beam.classList.remove("on");
        ring.classList.remove("on");
        stinger.classList.remove("on");
        hero.classList.remove("opening");
        scene.classList.remove("myth");
        if (G.musicDuck) G.musicDuck(false);
        ui.chestBusy = false;
      }, delay + 700);
    };

    // 탭하면 3막으로 건너뛰기
    const skip = () => { if (!fired) { G.sfx("tap"); reveal(true); } };
    ui.skipChest = skip;
    const skipBtn = $("#chestSkip");
    if (skipBtn) skipBtn.onclick = skip;
    scene.onclick = skip;

    if (fast) {
      chest.classList.add("crack");
      G.sfx("chestShake");
      at(() => reveal(true), 220);
      return;
    }

    // 0막 봉인 → 1막 균열 → 2막 개방 → 3막 확정 → 4막 카드
    chest.classList.add("sealed");
    G.sfx("chestSeal");
    at(() => {
      chest.classList.remove("sealed");
      chest.classList.add("crack");
      G.sfx("chestShake");
      haptic(14);
    }, 300);
    at(reveal, 900);
  }

  function burstSparks(color, power) {
    const box = $("#sparks");
    if (!box) return;
    const n = 18 + power * 7;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "spark";
      s.style.left = "50%";
      s.style.top = "48%";
      s.style.background = color;
      s.style.boxShadow = "0 0 10px 3px " + color;
      s.style.width = s.style.height = (3 + Math.random() * 4).toFixed(1) + "px";
      const ang = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * (70 + power * 20);
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", (Math.sin(ang) * dist - 40) + "px");
      s.style.animationDelay = (Math.random() * 0.14) + "s";
      box.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }

  function riseCard(item, salvaged) {
    const box = $("#riseCards");
    if (!box) return;
    const r = rar(item.rarity);
    const d = document.createElement("div");
    d.className = "rise-card";
    d.style.color = r.color;
    d.style.borderColor = r.color + "88";
    d.textContent = (salvaged ? "분해 " : "") + "[" + r.name + "] " + item.name;
    box.appendChild(d);
    setTimeout(() => d.remove(), 1600);
  }

  function doPull(n) {
    if (ui.chestBusy) return;
    const res = G.pull(n);
    if (!res.ok) {
      G.sfx("error");
      toast("🔑 열쇠가 부족합니다 · " + (n === 10 ? 10 : 1) + "개 필요 · 아래 [열쇠 구매]로 채울 수 있습니다");
      const b = n === 10 ? $("#pull10Btn") : $("#pullBtn");
      b.classList.remove("shake");
      void b.offsetWidth;
      b.classList.add("shake");
      const ks = $("#keyShop");
      if (ks) {
        ks.classList.remove("flash");
        void ks.offsetWidth;
        ks.classList.add("flash");
        ks.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }
    const items = res.items;
    const bestIdx = Math.max.apply(null, items.map((it) => rar(it.rarity).idx));
    items.forEach((it) => addRecent(it));
    renderAll();
    if (S.chest.auto && n === 1) {
      if (bestIdx >= 4) toast("[" + rar(items[0].rarity).name + "] " + items[0].name + " 획득!");
      playChestOpen(bestIdx, null, { fast: true });
      return;
    }
    if (G.music) G.music("forge");
    playChestOpen(bestIdx, () => {
      if (n === 10) showBatch(items);
      else showReveal(items[0]);
    });
  }

  function addRecent(it) {
    ui.recent.unshift(it);
    if (ui.recent.length > 8) ui.recent.length = 8;
    renderRecent();
  }

  function renderRecent() {
    const box = $("#recentList");
    if (!ui.recent.length) {
      box.innerHTML = '<div class="empty-line">아직 깐 상자가 없습니다. 첫 상자를 열어보세요.</div>';
      return;
    }
    box.innerHTML = ui.recent.map((it) => {
      const r = rar(it.rarity);
      return '<div class="recent-item" style="border-color:' + r.color + '33">' +
        '<div class="ri-ico">' + iconImg(it) + '</div>' +
        '<div class="ri-copy"><b style="color:' + r.color + '">' + esc(it.name) + '</b>' +
        '<span>' + r.name + ' · ' + G.SLOT_BY_KEY[it.slot].name + (it.salvaged ? " · 분해됨" : it.lv ? " · +" + it.lv : "") + '</span></div>' +
        (it.isNew ? '<span class="ri-new">NEW</span>' : '') +
        '<span class="ri-atk">' + G.fmt(it.atk * (1 + G.ENH.step * it.lv)) + '</span></div>';
    }).join("");
  }

  function renderKeyShop() {
    const p1 = $("#keyPrice1");
    const p10 = $("#keyPrice10");
    if (p1) p1.textContent = G.fmt(G.CHEST.keyPrice) + " G";
    if (p10) p10.textContent = G.fmt(G.CHEST.keyPrice10) + " G";
    const b1 = $("#buyKey1");
    const b10 = $("#buyKey10");
    if (b1) b1.classList.toggle("poor", S.gold < G.CHEST.keyPrice);
    if (b10) b10.classList.toggle("poor", S.gold < G.CHEST.keyPrice10);
  }

  function renderChest() {
    $("#chestLv").textContent = S.chest.lv;
    const c = G.chestLevelCost();
    const up = $("#chestUpBtn");
    if (S.chest.lv >= G.CHEST.maxLv) {
      up.innerHTML = "최대";
      up.disabled = true;
    } else {
      up.innerHTML = "레벨업 <em>" + G.fmt(c.gold) + " G" + (c.stones ? " · 💠" + c.stones : "") + "</em>";
      up.disabled = false;
    }
    const list = $("#rateList");
    list.innerHTML = G.RARITY.map((r, i) => {
      const p = G.rarityChance(i) * 100;
      return '<div class="rate-row2"><span class="rr-name" style="color:' + r.color + '">' + r.name + '</span>' +
        '<span class="rr-bar"><i style="width:' + Math.min(100, p * 1.5) + '%;background:' + r.color + '"></i></span>' +
        '<span class="rr-val" style="color:' + r.color + '">' + (p >= 10 ? p.toFixed(1) : p.toFixed(2)) + '%</span></div>';
    }).join("");
    $("#autoOpen").checked = !!S.chest.auto;
    $("#autoEquip").checked = !!S.chest.autoEquip;
    $("#autoSalvage").value = S.chest.autoSalvage || "none";
    renderRecent();
    renderKeyShop();
  }

  /* ================= 모루 ================= */
  function slotCard(slot) {
    const it = S.equip[slot.key];
    const r = it ? rar(it.rarity) : null;
    const isForge = it && S.forgeItem && it.uid === S.forgeItem.uid;
    if (!it) {
      return '<button class="slot empty" data-slot="' + slot.key + '">' +
        '<span class="s-slot">' + slot.name + '</span>' +
        '<div class="s-ico" style="color:#6b6470">' + svg(slot.icon) + '</div>' +
        '<div class="s-name">미장착</div><div class="s-atk">상자에서 획득</div></button>';
    }
    return '<button class="slot' + (isForge ? " active" : "") + '" data-slot="' + slot.key + '" style="border-color:' + r.color + '55">' +
      '<span class="s-slot">' + slot.name + '</span>' +
      (it.lv ? '<span class="s-lv">+' + it.lv + '</span>' : '') +
      '<div class="s-ico" style="border-color:' + r.color + '55">' + iconImg(it) + '</div>' +
      '<div class="s-name" style="color:' + r.color + '">' + esc(it.name) + '</div>' +
      '<div class="s-atk">공격력 ' + G.fmt(G.itemAtk(it)) + '</div>' +
      (it.isNew ? '<span class="s-new"></span>' : '') +
      '</button>';
  }

  function renderSlots() {
    $("#slotsGrid").innerHTML = G.SLOTS.map(slotCard).join("");
  }

  /* ================= 보관함 ================= */
  function invDiff(it) {
    const eq = S.equip[it.slot];
    if (!eq) return { cls: "up", text: "빈 슬롯 · 바로 장착" };
    const mine = G.itemScore(it);
    const theirs = G.itemScore(eq);
    const ratio = mine / Math.max(1, theirs);
    const pct = ratio >= 10 ? Math.round(ratio) + "배" : Math.round(Math.abs(ratio - 1) * 100) + "%";
    if (mine > theirs + 0.0001) return { cls: "up", text: "▲ " + pct + " 더 강함" };
    if (mine < theirs - 0.0001) return { cls: "down", text: "▼ " + pct + " 약함" };
    return { cls: "same", text: "= 장착품과 동급" };
  }

  function invNewCount() {
    return S.inventory.filter((it) => it && it.isNewInv).length;
  }

  function renderInventory() {
    const grid = $("#invGrid");
    if (!grid) return;
    const n = G.invCount();
    const max = G.invMax();
    const cnt = $("#invCount");
    cnt.textContent = n + " / " + max;
    cnt.classList.toggle("full", n >= max);
    const sub = $("#invSub");
    if (sub) sub.textContent = n >= max ? "가득 찼습니다 · 약한 장비를 일괄 분해하세요" : "획득 장비 자동 보관 · 전투력 순";
    if (!n) {
      grid.innerHTML = '<div class="inv-empty">보관함이 비어 있습니다.<br /><b>상자에서 나온 장비는 자동으로 여기에 쌓입니다.</b></div>';
      return;
    }
    grid.innerHTML = G.invSorted().map((it) => {
      const r = rar(it.rarity);
      const diff = invDiff(it);
      return '<div class="inv-item" style="border-color:' + r.color + '44">' +
        (it.isNewInv ? '<span class="ii-new"></span>' : "") +
        '<div class="ii-top">' +
          '<div class="ii-ico" style="border-color:' + r.color + '44">' + iconImg(it) + '</div>' +
          '<div class="ii-body">' +
            '<div class="ii-name" style="color:' + r.color + '">' + esc(it.name) + '</div>' +
            '<div class="ii-meta">' + r.name + ' · ' + G.SLOT_BY_KEY[it.slot].name + ' · 공 ' + G.fmt(G.itemAtk(it)) + '</div>' +
            '<div class="ii-diff ' + diff.cls + '">' + diff.text + '</div>' +
          '</div>' +
          (it.lv ? '<span class="ii-lv">+' + it.lv + '</span>' : "") +
        '</div>' +
        '<div class="ii-actions">' +
          '<button class="ii-eq" data-inv-equip="' + esc(it.uid) + '">장착</button>' +
          '<button class="ii-forge" data-inv-forge="' + esc(it.uid) + '">모루</button>' +
          '<button class="ii-sal" data-inv-salvage="' + esc(it.uid) + '">분해</button>' +
        '</div></div>';
    }).join("");
  }

  function clearInvNew() {
    let touched = false;
    S.inventory.forEach((it) => { if (it.isNewInv) { delete it.isNewInv; touched = true; } });
    if (touched) G.saveSoon();
  }

  function forgeItemCard() {
    const it = S.forgeItem;
    if (!it) {
      $("#fvIcon").innerHTML = svg("sword");
      $("#fvIcon").style.color = "#5c5566";
      $("#fvLv").textContent = "+0";
      $("#fiName").textContent = "모루가 비어 있습니다";
      $("#fiRar").textContent = "—";
      $("#fiRar").style.color = "var(--dim2)";
      $("#fiSlot").textContent = "아래 슬롯이나 상자에서 장비를 고르세요";
      $("#fiAtk").textContent = "0";
      $("#fiSubs").innerHTML = "";
      $("#fiDiff").textContent = "";
      $("#equipBtn").disabled = true;
      $("#salvageBtn").disabled = true;
      $("#forgeVisual").style.borderColor = "rgba(236,205,133,.16)";
      $("#enhanceBtn").disabled = true;
      $("#enhanceBtnSub").textContent = "장비를 올려주세요";
      ["#eSucc", "#eDown", "#eBreak"].forEach((s) => { $(s).textContent = "—"; });
      $("#eCost").textContent = "—";
      $("#pityVal").textContent = S.enhance.pity + "%";
      $("#pityFill").style.width = S.enhance.pity + "%";
      $("#sealInfo").textContent = "+10강부터 파괴를 1회 막습니다 · 보유 " + S.enhance.seal;
      return;
    }
    const r = rar(it.rarity);
    const equipped = S.equip[it.slot];
    const isEq = equipped && equipped.uid === it.uid;
    $("#fvIcon").innerHTML = iconImg(it, "fv-img");
    $("#fvIcon").style.color = r.color;
    $("#fvLv").textContent = "+" + it.lv;
    $("#forgeVisual").style.borderColor = r.color + "55";
    $("#fiName").textContent = it.name;
    $("#fiName").style.color = r.color;
    $("#fiRar").textContent = r.name;
    $("#fiRar").style.color = r.color;
    $("#fiSlot").textContent = G.SLOT_BY_KEY[it.slot].name + (isEq ? " · 장착 중" : "");
    $("#fiAtk").textContent = G.fmt(G.itemAtk(it));
    $("#fiSubs").innerHTML = (it.subs || []).map((s) => {
      const cfg = G.SUBS[s.k];
      return '<span class="fi-sub-row">' + cfg.icon + " " + cfg.name + " " + cfg.fmt(s.v) + "</span>";
    }).join("") || '<span class="fi-sub-row" style="color:var(--dim2)">하위 옵션 없음</span>';

    if (isEq) {
      $("#fiDiff").textContent = "현재 장착 중인 장비입니다";
      $("#fiDiff").className = "fi-diff";
      $("#equipBtn").disabled = true;
      $("#equipBtn").textContent = "장착 중";
    } else if (equipped) {
      const d = G.itemScore(it) - G.itemScore(equipped);
      const ratio = G.itemScore(it) / Math.max(1, G.itemScore(equipped));
      const head = d >= 0 ? "▲ 전투력 " : "▼ 전투력 ";
      const amount = ratio >= 10 ? Math.round(ratio) + "배" : (d >= 0 ? "+" : "") + Math.round((ratio - 1) * 100) + "%";
      $("#fiDiff").textContent = head + amount + " · " + equipped.name;
      $("#fiDiff").className = "fi-diff " + (d >= 0 ? "up" : "down");
      $("#equipBtn").disabled = false;
      $("#equipBtn").textContent = "장착하기";
    } else {
      $("#fiDiff").textContent = "빈 슬롯 · 장착하면 바로 강해집니다";
      $("#fiDiff").className = "fi-diff up";
      $("#equipBtn").disabled = false;
      $("#equipBtn").textContent = "장착하기";
    }
    $("#salvageBtn").disabled = false;

    const info = G.enhanceInfo(it);
    $("#eSucc").textContent = info.max ? "MAX" : info.success.toFixed(0) + "%";
    $("#eDown").textContent = info.max ? "—" : info.down + "%";
    $("#eBreak").textContent = info.max ? "—" : info.break + "%";
    $("#eCost").textContent = info.max ? "—" : G.fmt(info.cost) + " G";
    $("#pityVal").textContent = info.pity + "%";
    $("#pityFill").style.width = info.pity + "%";
    $("#pityNote").textContent = info.pity >= 100 ? "다음 강화는 확정 성공입니다" : "100%가 되면 다음 강화는 확정 성공";
    $("#sealInfo").textContent = (info.canProtect ? "파괴 1회 방지" : "+10강부터 사용 가능") + " · 보유 " + S.enhance.seal;
    $("#sealRow").classList.toggle("off", !info.canProtect);
    $("#protectToggle").checked = !!S.enhance.protect;
    const enhBtn = $("#enhanceBtn");
    enhBtn.disabled = info.max;
    $("#enhanceBtnSub").textContent = info.max ? "최대 강화 완료" : "비용 " + G.fmt(info.cost) + " G";
  }

  function renderResearch() {
    $("#researchList").innerHTML = G.RESEARCH.map((cfg) => {
      const info = G.researchInfo(cfg);
      return '<div class="res-row"><div class="res-ico">' + cfg.icon + '</div>' +
        '<div class="res-copy"><b>' + cfg.name + ' <span class="res-lv">Lv.' + info.lv + '/' + cfg.max + '</span></b><span>' + cfg.desc + '</span></div>' +
        '<button class="btn ' + (info.max ? "btn-ghost" : "btn-gold") + ' sm res-buy" data-res="' + cfg.key + '"' + (info.max ? " disabled" : "") + '>' +
        (info.max ? "MAX" : G.fmt(info.cost) + " G") + '</button></div>';
    }).join("");
  }

  /* ================= 도감 ================= */
  function renderCodex() {
    const seenCount = Object.keys(S.seen).length;
    const total = G.TOTAL_ITEMS;
    $("#codexCount").textContent = seenCount + " / " + total;
    $("#codexFill").style.width = (seenCount / total * 100) + "%";
    const st = G.stats();
    $("#codexBonus").textContent = (st.collectionBonus * 100).toFixed(1);
    const list = G.ITEMS.filter((d) => ui.cxSlot === "all" || d.slot === ui.cxSlot);
    $("#codexGrid").innerHTML = list.map((d) => {
      const r = rar(d.rarity);
      const got = !!S.seen[d.id];
      return '<div class="cx-cell ' + (got ? "got" : "locked") + '" style="color:' + (got ? r.color : "transparent") + ';border-color:' + (got ? r.color + "44" : "rgba(255,255,255,.05)") + '">' +
        '<div class="cc-ico">' + (got ? iconImg(d) : '<span class="locked-art">' + svg(d.icon) + '</span>') + '</div>' +
        '<div class="cc-name">' + (got ? esc(d.name) : "???") + '</div>' +
        '<div class="cc-rar" style="color:' + (got ? r.color : "rgba(255,255,255,.12)") + '">' + r.name + '</div>' +
        (got ? "" : '<span class="cc-lock">' + svg("lock") + '</span>') +
        '</div>';
    }).join("");
    $("#milestoneList").innerHTML = G.CODEX_MILESTONES.map((m) => {
      const p = G.codexProgress(m.slot, m.rarity);
      const done = !!S.milestones[m.id];
      return '<div class="ms-row ' + (done ? "done" : "") + '">' +
        '<span class="ms-name">' + m.name + '</span>' +
        '<span class="ms-prog">' + p.got + '/' + p.total + '</span>' +
        '<span style="font-size:9px;color:' + (done ? "#7bf0b0" : "var(--dim2)") + '">' + (done ? "완료" : "🎁") + '</span></div>';
    }).join("");
    $("#dotCodex").classList.toggle("show", ui.newCodex > 0);
  }

  /* ================= 유물 ================= */
  function renderRelics() {
    $("#fragCount").textContent = G.fmt(S.frags);
    $("#relicList").innerHTML = G.RELICS.map((cfg) => {
      const info = G.relicInfo(cfg);
      const pips = Array.from({ length: Math.min(cfg.max, 12) }, (_, i) => '<i class="' + (i < info.lv ? "on" : "") + '"></i>').join("");
      return '<div class="relic-card ' + (info.max ? "max" : "") + '"><div class="relic-ico">' + cfg.icon + '</div>' +
        '<div class="relic-copy"><b>' + cfg.name + '</b><span>' + cfg.desc + '</span><div class="relic-pips">' + pips + '</div></div>' +
        '<div class="relic-buy"><span class="relic-lv">Lv.' + info.lv + '/' + cfg.max + '</span>' +
        '<button class="btn ' + (info.max ? "btn-ghost" : "btn-gold") + ' sm" data-relic="' + cfg.id + '"' + (info.max ? " disabled" : "") + '>' +
        (info.max ? "MAX" : "🩸 " + info.cost) + '</button></div></div>';
    }).join("");
  }

  /* ================= 업적 / 설정 ================= */
  function renderAchievements() {
    let ready = 0;
    const rows = G.ACHIEVEMENTS.map((a) => {
      const done = !!S.achievements.claimed[a.id];
      const can = !done && G.achievementReady(a);
      if (can) ready += 1;
      const rw = [];
      if (a.reward.gold) rw.push("🪙" + G.fmt(a.reward.gold));
      if (a.reward.keys) rw.push("🔑" + a.reward.keys);
      if (a.reward.stones) rw.push("💠" + a.reward.stones);
      if (a.reward.frags) rw.push("🩸" + a.reward.frags);
      return '<div class="achv-row ' + (done ? "done" : can ? "ready" : "") + '"><div class="achv-ico">' + a.icon + '</div>' +
        '<div class="achv-copy"><b>' + a.name + '</b><span>' + a.desc + ' · ' + rw.join(" ") + '</span></div>' +
        '<button class="btn ' + (can ? "btn-gold" : "btn-ghost") + ' sm" data-achv="' + a.id + '"' + (done || !can ? " disabled" : "") + '>' +
        (done ? "완료" : can ? "수령" : "진행") + '</button></div>';
    }).join("");
    $("#achvList").innerHTML = rows;
    const badge = $("#navBadge");
    badge.textContent = ready;
    badge.classList.toggle("show", ready > 0);
    return ready;
  }

  function renderSettings() {
    $("#setSound").checked = !!S.settings.sound;
    const mu = $("#setMusic");
    if (mu) mu.checked = S.settings.music !== false;
    $("#setHaptics").checked = !!S.settings.haptics;
    $("#soundBtn").innerHTML = svg(S.settings.sound ? "sound" : "mute");
    $("#tipList").innerHTML = G.TIPS.map((t) => "<li>" + t + "</li>").join("");
  }

  function renderQuest() {
    const step = G.tutorialStep();
    const bar = $("#questBar");
    if (!step || S.tutorial.collapsed) {
      bar.classList.remove("show");
      document.body.classList.remove("quest-on");
      return;
    }
    bar.classList.add("show");
    document.body.classList.add("quest-on");
    $("#qIcon").textContent = step.icon;
    $("#qStep").textContent = (S.tutorial.idx + 1) + "/" + G.TUTORIAL.length;
    $("#qTitle").textContent = step.title;
    $("#qGoal").textContent = step.goal;
  }

  function renderNav() {
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === ui.tab));
    $("#dotChest").classList.toggle("show", S.chest.auto && S.keys > 0);
    const dotForge = $("#dotForge");
    if (dotForge) dotForge.classList.toggle("show", ui.tab !== "forge" && invNewCount() > 0);
  }

  function renderAll() {
    renderWallet();
    renderHud();
    renderChest();
    renderSlots();
    renderInventory();
    forgeItemCard();
    renderResearch();
    renderCodex();
    renderRelics();
    renderAchievements();
    renderSettings();
    renderQuest();
    renderNav();
  }

  /* ================= 탭 ================= */
  function switchTab(tab) {
    if (tab === "stage") {
      $("#stageBar").classList.add("flash");
      setTimeout(() => $("#stageBar").classList.remove("flash"), 900);
      const st = G.stageByIndex(S.progress.stage);
      if (st.isBoss) {
        $("#bossBtn").animate ? $("#bossBtn").animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 500, iterations: 2 }) : null;
      }
      toast(st.isBoss ? "👑 지배자에게 도전하세요" : "구역을 밀어 지배자에게 도전하세요");
      return;
    }
    ui.tab = tab;
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === "page-" + tab));
    if (tab === "codex") ui.newCodex = 0;
    if (tab === "forge") { clearInvNew(); renderInventory(); }
    if (G.music && ui.musicMode !== "battle") G.music("forge");
    renderNav();
    renderCodex();
    $("#content").scrollTop = 0;
    G.sfx("tap");
  }

  /* ================= 모달 ================= */
  function openModal(html, cls) {
    closeModal(true);
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = '<div class="modal ' + (cls || "") + '">' + html + "</div>";
    back.addEventListener("mousedown", (e) => { if (e.target === back) closeModal(); });
    $("#modalRoot").appendChild(back);
    ui.modal = back;
    return back;
  }
  function closeModal(quiet) {
    if (!ui.modal) return;
    ui.modal.remove();
    ui.modal = null;
    if (!quiet) G.sfx("tap");
  }

  function showReveal(item) {
    const r = rar(item.rarity);
    const eq = S.equip[item.slot];
    const storedNow = !!G.invFind(item.uid);
    const note = item.equippedNow
      ? '<div class="reveal-stored equip">⚔ 자동 장착되었습니다</div>'
      : item.salvaged
        ? '<div class="reveal-stored warn">🎒 보관함이 가득 차 분해되었습니다</div>'
        : storedNow
          ? '<div class="reveal-stored">🎒 보관함에 저장되었습니다 · 나중에 장착할 수 있습니다</div>'
          : '';
    const html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
      '<div class="reveal-stage" style="--rv:' + r.beam + ';--rc:' + r.color + '">' +
      '<div class="reveal-rays"></div><div class="reveal-halo"></div><div class="reveal-pedestal"></div>' +
      '<div class="reveal-item">' + iconImg(item) + '</div></div>' +
      '<div class="reveal-title">' + G.SLOT_BY_KEY[item.slot].name + ' · ' + (item.salvaged ? "자동 분해됨" : "개봉") + '</div>' +
      '<div class="reveal-rarity" style="color:' + r.color + '">' + r.name + '</div>' +
      '<div class="reveal-itemname" style="color:' + r.color + '">' + esc(item.name) + '</div>' +
      (item.isNew ? '<div class="reveal-new">NEW 도감 등록</div>' : "") +
      note +
      itemCardBody(item, { compact: true, reveal: true });
    const back = openModal(html, "reveal-modal item-card");
    bindItemActions(back, item, { reveal: true });
  }

  function showBatch(items) {
    const best = items.reduce((a, b) => (rar(b.rarity).idx > rar(a.rarity).idx ? b : a), items[0]);
    const bestR = rar(best.rarity);
    const storedN = items.filter((it) => !it.salvaged && !it.equippedNow && G.invFind(it.uid)).length;
    const salvagedN = items.filter((it) => it.salvaged).length;
    const newN = items.filter((it) => it.isNew).length;
    const equipN = items.filter((it) => it.equippedNow).length;
    const cells = items.map((it, i) => {
      const r = rar(it.rarity);
      return '<button class="batch-cell ' + (it === best ? "best" : "") + '" data-batch="' + i + '" style="--rc:' + r.color + ';--i:' + i + '">' +
        (it.isNew ? '<span class="bc-new"></span>' : '') +
        '<div class="bc-ico">' + iconImg(it) + '</div>' +
        '<div class="bc-name">' + esc(it.name) + '</div>' +
        '<div class="bc-rar" style="color:' + r.color + '">' + (it.equippedNow ? '<b class="bc-eqtag">장착</b>' : '') + r.name + ' · ' + G.SLOT_BY_KEY[it.slot].name + '</div>' +
        '</button>';
    }).join("");
    const chips = [];
    if (equipN) chips.push('<span class="bs-chip new">자동 장착 ' + equipN + '</span>');
    if (storedN) chips.push('<span class="bs-chip">보관 ' + storedN + '</span>');
    if (newN) chips.push('<span class="bs-chip new">NEW ' + newN + '</span>');
    if (salvagedN) chips.push('<span class="bs-chip gone">분해 ' + salvagedN + '</span>');
    const bestEq = S.equip[best.slot];
    const bestUpgrade = !!best && !best.salvaged && (!bestEq || G.itemScore(best) > G.itemScore(bestEq));
    const html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
      '<div class="modal-title">10연 개봉 결과</div>' +
      '<div class="modal-note" style="margin-bottom:6px;color:' + bestR.color + '">최고 등급 · ' + bestR.name + ' ' + esc(best.name) + '</div>' +
      (chips.length ? '<div class="batch-summary">' + chips.join("") + '</div>' : '') +
      '<div class="batch-grid">' + cells + '</div>' +
      '<div class="batch-actions">' +
      (bestUpgrade ? '<button class="btn btn-gold wide" data-equip-best>' + svg("sword", "btn-ico") + ' 최고 등급 장착</button>' : '') +
      '<button class="btn btn-ghost" data-open-inv>보관함</button>' +
      '<button class="btn btn-ghost" data-salvage-low>희귀 이하 분해</button>' +
      '<button class="btn btn-ghost" data-close>닫기</button>' +
      '</div>';
    const back = openModal(html, "batch-modal");
    const bestBtn = back.querySelector("[data-equip-best]");
    if (bestBtn) bestBtn.addEventListener("click", () => {
      G.equipItem(best);
      G.tutorialDone("equip");
      G.sfx("success");
      haptic(20);
      closeModal();
      renderAll();
      toast("⚔ " + best.name + " 장착 · 전투력 " + G.fmt(G.stats().power), "reward");
    });
    back.querySelector("[data-salvage-low]").addEventListener("click", () => {
      const targets = items.filter((it) => !it.salvaged && rar(it.rarity).idx < 3);
      if (!targets.length) { toast("분해할 장비가 없습니다"); return; }
      const r = G.salvageMany(targets);
      if (r.count) {
        toast("🗑 " + r.count + "개 분해 · +" + G.fmt(r.gold) + " G" + (r.stones ? " · 💠" + r.stones : ""));
        G.sfx("gold");
        closeModal();
        renderAll();
      }
    });
    const invBtn = back.querySelector("[data-open-inv]");
    if (invBtn) invBtn.addEventListener("click", () => {
      closeModal();
      switchTab("forge");
      scrollToInv();
    });
    back.querySelectorAll("[data-batch]").forEach((b) => {
      b.addEventListener("click", () => {
        const it = items[Number(b.dataset.batch)];
        showReveal(it);
      });
    });
    back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
  }

  function itemCardBody(item, opts) {
    const r = rar(item.rarity);
    const eq = S.equip[item.slot];
    const isEq = eq && eq.uid === item.uid;
    const base = G.itemAtk(item);
    const rows = [];
    const eqAtk = eq && !isEq ? G.itemAtk(eq) : 0;
    rows.push(cmpRow("공격력", base, eqAtk, isEq));
    const keys = ["crit", "critDmg", "bossDmg", "gold"];
    keys.forEach((k) => {
      const mine = (item.subs || []).filter((s) => s.k === k).reduce((a, s) => a + s.v, 0);
      const theirs = eq && !isEq ? (eq.subs || []).filter((s) => s.k === k).reduce((a, s) => a + s.v, 0) : 0;
      if (!mine && !theirs) return;
      const cfg = G.SUBS[k];
      rows.push(cmpRow(cfg.icon + " " + cfg.name, mine, theirs, isEq, cfg, true));
    });
    const score = G.itemScore(item);
    const eqScore = eq && !isEq ? G.itemScore(eq) : 0;
    rows.push(cmpRow("전투력", Math.round(score), Math.round(eqScore), isEq));

    const head = (opts && opts.compact)
      ? '<div class="ic-atk-line"><span>' + G.SLOT_BY_KEY[item.slot].name + '</span><span>공격력 <b>' + G.fmt(base) + '</b></span>' +
        (item.lv ? '<span class="ic-lvtag">+' + item.lv + '</span>' : '') + '</div>'
      : '<div class="ic-head" style="margin-top:12px">' +
        '<div class="ic-ico" style="border-color:' + r.color + '55">' + iconImg(item) + '</div>' +
        '<div class="ic-head-copy"><div class="ic-name" style="color:' + r.color + '">' + esc(item.name) + '</div>' +
        '<div class="ic-meta"><span class="rar-tag" style="color:' + r.color + '">' + r.name + '</span><span>' + G.SLOT_BY_KEY[item.slot].name + '</span>' +
        (item.lv ? '<span>+' + item.lv + ' 강화</span>' : '') + '</div></div>' +
        '<div class="ic-atk"><span>공격력</span><b>' + G.fmt(base) + '</b></div></div>';

    return head +
      ((item.subs || []).length ? '<div class="ic-subs">' + item.subs.map((s) => {
        const cfg = G.SUBS[s.k];
        return '<div class="ic-sub"><span class="is-ico">' + cfg.icon + '</span><span class="is-name">' + cfg.name + '</span><span class="is-val">' + cfg.fmt(s.v) + '</span></div>';
      }).join("") + '</div>' : "") +
      '<div class="ic-cmp"><div class="ic-cmp-title">' + (eq && !isEq ? "장착 중 · " + esc(eq.name) + " 와 비교" : isEq ? "현재 장착 중" : "장착 슬롯 비어 있음") + '</div>' +
      rows.join("") + '</div>' +
      '<div class="ic-actions' + (opts && opts.reveal && !isEq ? " three" : "") + '">' +
      (isEq ? '<button class="btn btn-ghost" disabled>장착 중</button>' :
        '<button class="btn btn-gold" data-equip>' + svg("sword", "btn-ico") + ' 장착</button>' +
        (opts && opts.reveal ? '<button class="btn btn-ghost" data-store>🎒 보관</button>' : "") +
        '<button class="btn salvage" data-salvage>분해</button>') +
      '</div>' +
      '<div class="ic-tip">' + (isEq ? "" : eq ? (G.invFull() ? "보관함이 가득 찼습니다 · 장착하면 기존 장비는 분해됩니다" : "장착하면 기존 장비는 보관함으로 이동합니다") : "장착 즉시 전투력이 반영됩니다") + '</div>';
  }

  function cmpRow(name, mine, theirs, isEq, cfg, pct) {
    let diff = mine - theirs;
    let sign = diff > 0.0001 ? "up" : diff < -0.0001 ? "down" : "same";
    const arrow = sign === "up" ? "▲" : sign === "down" ? "▼" : "–";
    const fmt = (v) => (pct && cfg ? cfg.fmt(v).replace("+", "") : pct ? (Math.round(v * 10) / 10) + "%" : G.fmt(v));
    return '<div class="cmp-row"><span class="cr-name">' + name + '</span>' +
      (isEq ? "" : '<span class="cr-val" style="color:#e8e2d4">' + fmt(mine) + '</span>') +
      '<span class="cr-diff ' + sign + '">' + (isEq ? "" : arrow + "&nbsp;" + (diff === 0 ? "0" : fmt(Math.abs(diff)))) + '</span></div>';
  }

  function bindItemActions(root, item, opts) {
    root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
    const eqBtn = root.querySelector("[data-equip]");
    if (eqBtn) eqBtn.addEventListener("click", () => {
      G.equipItem(item);
      G.tutorialDone("equip");
      G.sfx("success");
      haptic(20);
      closeModal();
      renderAll();
    });
    const svBtn = root.querySelector("[data-salvage]");
    if (svBtn) svBtn.addEventListener("click", () => {
      G.salvageItem(item);
      G.sfx("gold");
      closeModal();
      renderAll();
    });
    const storeBtn = root.querySelector("[data-store]");
    if (storeBtn) storeBtn.addEventListener("click", () => {
      if (!G.invFind(item.uid) && !(S.equip[item.slot] && S.equip[item.slot].uid === item.uid)) G.storeItem(item);
      G.sfx("tap");
      toast("🎒 " + item.name + " · 보관함에 보관");
      closeModal();
      renderAll();
    });
    // 개봉 카드를 그냥 닫아도 장비는 보관함에 남아 있다
    if (opts && opts.reveal) {
      root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
        if (G.invFind(item.uid)) toast("🎒 " + item.name + " · 보관함에 보관", "reward");
      }));
    }
  }

  function scrollToInv() {
    const card = $("#invCard");
    if (!card) return;
    card.classList.remove("flash-inv");
    void card.offsetWidth;
    card.classList.add("flash-inv");
    setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    setTimeout(() => card.classList.remove("flash-inv"), 1300);
  }

  /* ================= 구역 선택 ================= */
  function showStagePicker() {
    let html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
      '<div class="modal-title">구역 이동</div><div class="modal-note" style="margin-bottom:10px">해금한 구역까지 자유롭게 이동해 사냥할 수 있습니다.</div>';
    G.WORLDS.forEach((w) => {
      const bossStage = G.bossOfWorld(w.id);
      const unlocked = bossStage.i <= S.progress.maxStage || w.id === 1;
      const items = [];
      for (let s = 1; s <= w.sub; s++) {
        const st = G.STAGES.find((x) => x.world === w.id && x.sub === s);
        if (!st) continue;
        const open = st.i <= S.progress.maxStage;
        const cur = st.i === S.progress.stage;
        const cleared = !!S.progress.cleared[st.key];
        items.push('<button class="stage-dot ' + (st.isBoss ? "boss " : "") + (cur ? "current " : "") + (cleared ? "cleared " : "") + (open ? "" : "locked") + '" ' +
          (open ? 'data-stage="' + st.i + '"' : "disabled") + '>' + st.sub + '</button>');
      }
      html += '<div class="world-block ' + (unlocked ? "" : "locked") + '"><div class="world-head"><span>' + w.emoji + '</span><b>' + w.name + '</b>' +
        '<span class="wh-sub">' + (unlocked ? w.sub + "구역 · 보스 " + w.id + "-" + w.sub : "미해금") + '</span></div>' +
        '<div class="stage-dots">' + items.join("") + '</div></div>';
    });
    const back = openModal(html, "stage-sheet");
    back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
    back.querySelectorAll("[data-stage]").forEach((b) => b.addEventListener("click", () => {
      const idx = Number(b.dataset.stage);
      G.combat.gotoStage(idx);
      closeModal();
      stageChanged();
      const st = G.stageByIndex(idx);
      toast(st.label + " " + st.name + (st.isBoss ? " · 👑 지배자" : ""));
    }));
  }

  /* ================= 토스트 ================= */
  function toast(text, kind) {
    const stack = $("#toastStack");
    const d = document.createElement("div");
    d.className = "toast" + (kind ? " kind-" + kind : "");
    d.textContent = text;
    stack.appendChild(d);
    if (stack.children.length > 3) stack.firstChild.remove();
    setTimeout(() => d.remove(), 2700);
  }

  function levelBanner(lv) {
    const layer = $("#fxLayer");
    const b = document.createElement("div");
    b.className = "level-banner";
    b.innerHTML = '<div class="lb-label">서약자 각성</div><div class="lb-main">Lv.' + lv + '</div>';
    layer.appendChild(b);
    const fl = document.createElement("div");
    fl.className = "flash-screen";
    layer.appendChild(fl);
    setTimeout(() => { b.remove(); fl.remove(); }, 1800);
    G.sfx("levelup");
  }

  /* ================= 이벤트 ================= */
  function bindEvents() {
    document.addEventListener("pointerdown", () => { ui.interacted = true; G.sfxUnlock(); }, { once: true });
    // 탭
    $$(".nav-btn").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

    // 상자
    $("#pullBtn").addEventListener("click", () => { G.sfxUnlock(); doPull(1); G.tutorialDone("pull"); });
    $("#pull10Btn").addEventListener("click", () => { G.sfxUnlock(); doPull(10); G.tutorialDone("pull"); });
    $("#chestUpBtn").addEventListener("click", () => {
      const res = G.levelUpChest();
      if (!res.ok) {
        if (res.reason === "stones") toast("💠 강화석이 부족합니다 · 지배자를 잡아 모으세요");
        else toast("🪙 골드가 부족합니다");
        G.sfx("error");
        return;
      }
      G.sfx("success");
      renderAll();
    });
    $("#autoOpen").addEventListener("change", (e) => { S.chest.auto = e.target.checked; G.saveSoon(); renderNav(); updateAuto(); });
    $("#autoEquip").addEventListener("change", (e) => { S.chest.autoEquip = e.target.checked; G.saveSoon(); });
    $("#autoSalvage").addEventListener("change", (e) => { S.chest.autoSalvage = e.target.value; G.saveSoon(); });
    $("#recentClear").addEventListener("click", () => { ui.recent = []; renderRecent(); });

    // 열쇠 구매
    const buyKey = (n) => {
      const res = G.buyKeys(n);
      if (!res.ok) {
        toast("🪙 골드가 부족합니다 · 열쇠 " + n + "개 " + G.fmt(res.cost) + " G", "break");
        G.sfx("error");
        return;
      }
      G.sfx("gold");
      renderAll();
    };
    const bk1 = $("#buyKey1");
    if (bk1) bk1.addEventListener("click", () => buyKey(1));
    const bk10 = $("#buyKey10");
    if (bk10) bk10.addEventListener("click", () => buyKey(10));

    // 모루
    $("#slotsGrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-slot]");
      if (!b) return;
      const it = S.equip[b.dataset.slot];
      if (!it) { toast("빈 슬롯입니다 · 상자에서 장비를 획득하세요"); return; }
      G.setForgeItem(it);
      G.sfx("tap");
      renderSlots(); forgeItemCard();
    });
    $("#forgeClear").addEventListener("click", () => { G.setForgeItem(null); renderSlots(); forgeItemCard(); });

    // 보관함
    $("#invBulkBtn").addEventListener("click", () => {
      const box = $("#invTools");
      box.classList.toggle("open");
      G.sfx("tap");
    });
    $("#invTools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-bulk]");
      if (!b) return;
      const mode = b.dataset.bulk;
      const list = G.bulkTargets(mode);
      if (!list.length) {
        toast(mode === "weaker" ? "장착품보다 약한 장비가 없습니다" : "희귀 이하 장비가 없습니다");
        G.sfx("error");
        return;
      }
      const gold = list.reduce((a, it) => a + G.salvage(it).gold, 0);
      const label = mode === "weaker" ? "장착품보다 약한 장비" : "희귀 이하 장비";
      confirmModal("🎒 일괄 분해",
        label + " <b>" + list.length + "개</b>를 분해합니다.<br />예상 보상 · 🪙 <b>+" + G.fmt(gold) + " G</b> · 💠 강화석",
        () => {
          const r = G.bulkSalvage(mode);
          G.sfx("gold");
          renderAll();
          if (r.count) toast("🗑 " + r.count + "개 분해 · +" + G.fmt(r.gold) + " G" + (r.stones ? " · 💠" + r.stones : ""));
        });
    });
    $("#invGrid").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-inv-equip], button[data-inv-forge], button[data-inv-salvage]");
      if (!b) return;
      const uid = b.dataset.invEquip || b.dataset.invForge || b.dataset.invSalvage;
      const it = G.invFind(uid);
      if (!it) { renderAll(); return; }
      if (b.dataset.invEquip) {
        G.equipItem(it);
        G.tutorialDone("equip");
        G.sfx("success");
        haptic(18);
        renderAll();
        return;
      }
      if (b.dataset.invForge) {
        G.setForgeItem(it);
        G.sfx("tap");
        renderSlots();
        forgeItemCard();
        const fc = $(".forge-card");
        if (fc) fc.scrollIntoView({ behavior: "smooth", block: "center" });
        toast("⚒ " + it.name + " · 모루에 올렸습니다");
        return;
      }
      const doSalvage = () => {
        G.salvageItem(it);
        G.sfx("gold");
        renderAll();
      };
      if (rar(it.rarity).idx >= 3) {
        confirmModal("🗑 장비 분해",
          "<b style=\"color:" + rar(it.rarity).color + "\">" + esc(it.name) + "</b> 을(를) 분해합니다.<br />되돌릴 수 없습니다.",
          doSalvage);
      } else {
        doSalvage();
      }
    });
    $("#equipBtn").addEventListener("click", () => {
      if (!S.forgeItem) return;
      G.equipItem(S.forgeItem);
      G.tutorialDone("equip");
      G.sfx("success");
      haptic(18);
      renderAll();
    });
    $("#salvageBtn").addEventListener("click", () => {
      const it = S.forgeItem;
      if (!it) return;
      const eq = S.equip[it.slot];
      if (eq && eq.uid === it.uid) {
        confirmModal("🗑 장착 장비 분해", "지금 장착 중인 <b>" + esc(it.name) + "</b>을(를) 분해합니다. 슬롯이 비게 됩니다.", () => {
          G.salvageItem(it);
          S.equip[it.slot] = null;
          S.forgeItem = null;
          G.saveSoon();
          renderAll();
        });
      } else {
        G.salvageItem(it);
        S.forgeItem = null;
        renderAll();
      }
    });
    $("#enhanceBtn").addEventListener("click", () => {
      const res = G.enhance();
      if (!res.ok && res.broke) {
        // 파괴: 장비가 사라졌으니 모루와 화면을 즉시 정리한다
        G.sfx("break");
        haptic([20, 40, 30]);
        const fv0 = $("#forgeVisual");
        if (fv0) { fv0.classList.remove("flash"); void fv0.offsetWidth; fv0.classList.add("flash"); }
        renderForgeAfterBreak();
        return;
      }
      if (!res.ok) {
        if (res.reason === "gold") { toast("🪙 골드가 부족합니다 · 비용 " + G.fmt(res.cost) + " G"); G.sfx("error"); }
        else if (res.reason === "max") toast("이미 +20 최대 강화입니다");
        else if (res.reason === "noitem") toast("모루에 장비를 올려주세요");
        else {
          // 망치질은 했지만 실패(유지/하락)
          const fvf = $("#forgeVisual");
          if (fvf) { fvf.classList.remove("flash"); void fvf.offsetWidth; fvf.classList.add("flash"); }
          G.sfx("anvil"); setTimeout(() => G.sfx("fail"), 220); haptic(14);
          if (res.downed) toast("💥 강화 실패 · 단계가 한 칸 내려갔습니다", "break");
          renderAll();
        }
        return;
      }
      G.tutorialDone("enhance");
      const fv = $("#forgeVisual");
      fv.classList.remove("flash");
      void fv.offsetWidth;
      fv.classList.add("flash");
      G.sfx("anvil"); setTimeout(() => G.sfx("success"), 180); haptic(24);
      if (res.milestone) {
        const st = $("#fvStinger");
        const tx = $("#fvStingerText");
        if (st && tx) {
          tx.textContent = "+" + res.lv;
          st.classList.remove("on");
          void st.offsetWidth;
          st.classList.add("on");
          setTimeout(() => st.classList.remove("on"), 1000);
        }
        fx.shake(4, 180);
        haptic([18, 30, 18]);
        toast("⚒ " + (res.name || "장비") + " +" + res.lv + " 달성! 강화 성공률이 더 어려워집니다", "reward");
      }
      renderAll();
      renderSlots();
    });
    $("#protectToggle").addEventListener("change", (e) => { S.enhance.protect = e.target.checked; G.saveSoon(); });
    $("#sealBuy").addEventListener("click", () => {
      if (G.buySeal(1)) { G.sfx("gold"); renderAll(); } else { toast("🪙 골드가 부족합니다"); G.sfx("error"); }
    });

    // 연구
    $("#researchList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-res]");
      if (!b) return;
      const res = G.buyResearch(b.dataset.res);
      if (!res.ok) { toast("🪙 골드가 부족합니다"); G.sfx("error"); return; }
      G.sfx("success");
      renderAll();
    });

    // 도감 필터
    $("#cxSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-slot]");
      if (!b) return;
      ui.cxSlot = b.dataset.slot;
      $$("#cxSeg button").forEach((x) => x.classList.toggle("active", x === b));
      renderCodex();
      G.sfx("tap");
    });

    // 유물
    $("#relicList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-relic]");
      if (!b) return;
      const res = G.buyRelic(b.dataset.relic);
      if (!res.ok) { toast("🩸 유물 파편이 부족합니다"); G.sfx("error"); return; }
      G.sfx("success");
      renderAll();
    });

    // 업적
    $("#achvList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-achv]");
      if (!b) return;
      if (G.claimAchievement(b.dataset.achv)) { G.sfx("gold"); renderAll(); }
    });
    $("#claimAllBtn").addEventListener("click", () => {
      const n = G.claimAllAchievements();
      if (n) { toast("🏆 업적 " +
        n + "개 보상 수령!"); G.sfx("success"); }
      else toast("수령할 업적이 없습니다");
      renderAll();
    });

    // 설정
    $("#soundBtn").addEventListener("click", () => {
      S.settings.sound = !S.settings.sound;
      G.saveSoon();
      renderSettings();
      if (G.audioRefresh) G.audioRefresh();
      if (S.settings.sound) G.sfx("tap");
    });
    $("#setSound").addEventListener("change", (e) => { S.settings.sound = e.target.checked; G.saveSoon(); renderSettings(); if (G.audioRefresh) G.audioRefresh(); if (S.settings.sound) G.sfx("tap"); });
    const setMusic = $("#setMusic");
    if (setMusic) setMusic.addEventListener("change", (e) => {
      S.settings.music = e.target.checked;
      G.saveSoon();
      if (G.audioRefresh) G.audioRefresh();
      if (S.settings.music) { G.sfxUnlock(); if (G.music) G.music(ui.tab === "chest" ? "forge" : ui.musicMode || "forge", true); }
    });
    $("#setHaptics").addEventListener("change", (e) => { S.settings.haptics = e.target.checked; G.saveSoon(); renderSettings(); });
    $("#tutorialReplay").addEventListener("click", () => {
      S.tutorial = { idx: 0, skipped: false, collapsed: false, done: {}, shown: {} };
      G.saveSoon(); renderQuest(); switchTab("chest"); toast("🎓 초보자 안내를 다시 시작합니다");
    });
    $("#exportBtn").addEventListener("click", () => {
      const html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
        '<div class="modal-title">저장 내보내기</div>' +
        '<div class="modal-note">아래 텍스트를 복사해 보관하세요.</div>' +
        '<textarea class="save-box" readonly>' + esc(G.exportSave()) + '</textarea>' +
        '<div class="confirm-actions"><button class="btn btn-gold" data-close>닫기</button></div>';
      const back = openModal(html);
      back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
      const ta = back.querySelector("textarea");
      ta.addEventListener("focus", () => ta.select());
    });
    $("#importBtn").addEventListener("click", () => {
      const html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
        '<div class="modal-title">저장 불러오기</div>' +
        '<div class="modal-note">백업 텍스트를 붙여넣으세요. 현재 진행은 덮어씌워집니다.</div>' +
        '<textarea class="save-box" placeholder="백업 JSON"></textarea>' +
        '<div class="confirm-actions"><button class="btn btn-ghost" data-close>취소</button><button class="btn btn-gold" data-do-import>불러오기</button></div>';
      const back = openModal(html);
      back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
      back.querySelector("[data-do-import]").addEventListener("click", () => {
        const text = back.querySelector("textarea").value.trim();
        if (!text) return;
        try {
          G.importSave(text);
          S = G.state;
          ui.newInv = 0;
          closeModal();
          renderAll();
          stageChanged();
          toast("📥 저장을 불러왔습니다");
        } catch (err) {
          toast("불러오기 실패 · 형식을 확인하세요");
          G.sfx("error");
        }
      });
    });
    $("#resetBtn").addEventListener("click", () => {
      confirmModal("🧹 처음부터", "모든 진행·장비·도감이 사라집니다. 되돌릴 수 없습니다.", () => {
        G.reset();
        S = G.state;
        ui.recent = [];
        ui.newInv = 0;
        renderAll();
        stageChanged();
        toast("새로 시작합니다");
      });
    });

    // 안내
    $("#qGo").addEventListener("click", () => {
      const step = G.tutorialStep();
      if (!step) return;
      if (step.tab === "stage") {
        const st = G.stageByIndex(S.progress.stage);
        if (st.isBoss) G.challengeBoss();
        else toast("구역을 밀어 1-10 지배자에게 도전하세요");
        return;
      }
      switchTab(step.tab);
    });
    $("#qSkip").addEventListener("click", () => {
      S.tutorial.collapsed = true;
      G.saveSoon();
      renderQuest();
      toast("안내를 잠시 접었습니다 · 설정에서 다시 볼 수 있어요");
    });

    // 보스 / 구역
    $("#bossBtn").addEventListener("click", startBossFight);
    const bcta = $("#bossCta");
    if (bcta) bcta.addEventListener("click", startBossFight);
    $("#stagePickBtn").addEventListener("click", showStagePicker);

    // 모달 공통
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  function startBossFight() {
    if (!G.challengeBoss()) return false;
    G.sfx("boss");
    haptic([30, 60, 30]);
    const layer = $("#fxLayer");
    const b = document.createElement("div");
    b.className = "boss-banner";
    b.textContent = "👑 지배자 강림";
    layer.appendChild(b);
    setTimeout(() => b.remove(), 2300);
    return true;
  }

  function showBossClear(st, drops) {
    const w = G.WORLD_BY_ID[st.world];
    const next = G.WORLD_BY_ID[st.world + 1];
    const rw = [];
    if (drops && drops.gold) rw.push('<span class="bc-reward gold">🪙 +' + G.fmt(drops.gold) + '</span>');
    if (drops && drops.keys) rw.push('<span class="bc-reward key">🔑 +' + drops.keys + '</span>');
    if (drops && drops.stones) rw.push('<span class="bc-reward stone">💠 +' + drops.stones + '</span>');
    if (drops && drops.frags) rw.push('<span class="bc-reward frag">🩸 +' + drops.frags + '</span>');
    const html = '<button class="modal-close" data-close>' + svg("close") + '</button>' +
      '<div class="boss-clear">' +
      '<div class="bc-crown">👑</div>' +
      '<div class="bc-kicker">지배자 격파</div>' +
      '<div class="bc-world">' + w.emoji + ' ' + w.name + '</div>' +
      '<div class="bc-boss">' + st.name + '</div>' +
      (rw.length ? '<div class="bc-rewards">' + rw.join("") + '</div>' : '') +
      '<div class="bc-next">' + (next ? '세계 ' + next.id + ' <b>' + next.name + '</b> 해금' : '모든 세계 정복 · 종말의 성검을 손에 넣었습니다') + '</div>' +
      '</div>' +
      '<div class="confirm-actions"><button class="btn btn-gold" data-close>계속</button></div>';
    const back = openModal(html, "boss-clear-modal");
    back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal()));
  }

  function confirmModal(title, text, onOk) {
    const html = '<div class="confirm-modal"><div class="confirm-icon">⚠️</div><div class="modal-title">' + title + '</div>' +
      '<div class="confirm-text">' + text + '</div><div class="confirm-actions">' +
      '<button class="btn btn-ghost" data-cancel>취소</button><button class="btn btn-danger" data-ok>확인</button></div></div>';
    const back = openModal(html);
    back.querySelector("[data-cancel]").addEventListener("click", () => closeModal());
    back.querySelector("[data-ok]").addEventListener("click", () => { closeModal(); onOk(); });
  }

  /* ================= 자동 개봉 ================= */
  function updateAuto() {
    if (ui.autoTimer) { clearInterval(ui.autoTimer); ui.autoTimer = 0; }
    if (!S.chest.auto) return;
    ui.autoTimer = setInterval(() => {
      if (!S.chest.auto) return;
      if (S.keys <= 0) return;
      const res = G.pull(1);
      if (!res.ok) return;
      const it = res.items[0];
      addRecent(it);
      // 자동 장착은 G.pull 안에서 처리된다
      renderWallet("keys");
      renderChest();
      renderSlots();
      renderInventory();
      renderNav();
      if (ui.tab === "forge") forgeItemCard();
      renderCodex();
      renderAchievements();
      if (rar(it.rarity).idx >= 3) {
        toast("[" + rar(it.rarity).name + "] " + it.name + (it.salvaged ? " · 분해" : ""), "reward");
        G.sfx("reveal", rar(it.rarity).idx);
      } else {
        G.sfx("tick");
      }
    }, G.CHEST.pullAutoDelay);
  }

  /* ================= 전투 이벤트 ================= */
  function bindBattle() {
    const layer = $("#dmgLayer");
    G.bus.on("hit", (e) => {
      let x = 55 + Math.random() * 20;
      let y = 38 + Math.random() * 16;
      const now = performance.now();
      ui.dmgSpots = (ui.dmgSpots || []).filter((s) => now - s.t < 340);
      let guard = 0;
      while (ui.dmgSpots.some((s) => Math.abs(s.x - x) < 10 && Math.abs(s.y - y) < 9) && guard++ < 14) {
        y += 5.5;
        if (y > 62) { y = 36; x += 6; if (x > 80) x = 56; }
      }
      ui.dmgSpots.push({ x: x, y: y, t: now });
      floatDmg(G.fmt(e.dmg), e.crit ? "crit" : e.boss ? "boss" : "", x, y);
      hitFlash();
      if (e.crit) { G.sfx("crit"); haptic(26); fx.shake(6.5, 190); fx.stop(60); }
      else { G.sfx("hit"); fx.shake(2.6, 110); }
    });
    G.bus.on("heroAttack", () => heroAttackAnim());
    G.bus.on("heroHit", (e) => {
      floatDmg("-" + G.fmt(e.dmg), "hero-dmg", 13 + Math.random() * 10, 38 + Math.random() * 16);
      const u = $("#heroUnit");
      if (u) {
        u.classList.remove("hurt");
        void u.offsetWidth;
        u.classList.add("hurt");
        setTimeout(() => u.classList.remove("hurt"), 290);
      }
      fx.shake(3, 110);
    });
    G.bus.on("heroDown", () => {
      toast("💀 쓰러졌습니다 · " + G.BAL.respawnSec + "초 후 재정비", "break");
      G.sfx("fail");
      haptic([40, 60, 40]);
    });
    G.bus.on("kill", (d) => {
      ui.lastKill = d;
      const bits = ["<b>+" + G.fmt(d.gold) + " G</b>"];
      if (d.keys) bits.push("🔑+" + d.keys);
      if (d.stones) bits.push("💠+" + d.stones);
      if (d.frags) bits.push("🩸+" + d.frags);
      $("#dropLine").innerHTML = bits.join(" · ");
      floatDmg("+" + G.fmt(d.gold) + " G", "gold", 60 + Math.random() * 14, 66);
      const foe = $("#foeUnit");
      if (foe) {
        foe.classList.remove("dying");
        void foe.offsetWidth;
        foe.classList.add("dying");
      }
      if (d.boss) {
        toast("👑 " + d.bossName + " 격파!", "reward");
        G.sfx("levelup");
        haptic([30, 50, 30, 50]);
        fx.shake(8, 320);
        fx.stop(90);
      }
      renderWallet("gold");
    });
    G.bus.on("spawn", (e) => {
      const foe = $("#foeUnit");
      if (foe) foe.classList.remove("dying");
      if (e.boss) {
        G.sfx("boss");
        ui.musicMode = "battle";
        if (G.music) G.music("battle");
      }
    });
    G.bus.on("stage", () => { stageChanged(); });
    G.bus.on("stageClear", (st) => {
      const next = G.stageByIndex(Math.min(G.TOTAL_STAGES, st.i + 1));
      if (next.isBoss) toast("👑 " + next.label + " 지배자의 방 · [보스 도전]을 누르세요", "reward");
    });
    G.bus.on("bossClear", (st) => {
      const w = G.WORLD_BY_ID[st.world];
      toast("👑 " + w.name + " 정복! 세계 " + (st.world + 1) + " 해금", "reward");
      ui.musicMode = "forge";
      if (G.music) G.music("forge");
      showBossClear(st, ui.lastKill);
      setTimeout(() => { renderAll(); stageChanged(); }, 300);
    });
    G.bus.on("frame", (v) => renderFrame(v));
    G.bus.on("heroLevel", (lv) => { levelBanner(lv); renderHud(); });
    G.bus.on("codex", () => { ui.newCodex += 1; renderCodex(); });
    G.bus.on("inventory", () => { renderInventory(); renderNav(); });
    G.bus.on("equip", () => { renderInventory(); renderNav(); });
    G.bus.on("pull", () => { renderWallet("keys"); });
    G.bus.on("enhance", () => { renderWallet(); });
    G.bus.on("tutorial", () => renderQuest());
    G.bus.on("toast", (t) => toast(t.text, t.kind));
  }

  function renderForgeAfterBreak() {
    S.forgeItem = null;
    renderAll();
  }

  /* ================= 오프라인 ================= */
  function offlineModal() {
    const r = G.offlineCheck();
    if (!r) return;
    const hours = Math.floor(r.seconds / 3600);
    const mins = Math.floor((r.seconds % 3600) / 60);
    const html = '<div class="confirm-modal" style="text-align:center">' +
      '<div class="confirm-icon">🌙</div><div class="modal-title">오프라인 보상</div>' +
      '<div class="confirm-text">자리를 비운 ' + (hours ? hours + "시간 " : "") + mins + "분 동안<br />대장간이 조용히 벼려두었습니다.</div>" +
      '<div style="display:flex;gap:6px;justify-content:center;margin:12px 0">' +
      '<span class="w-item gold">🪙 <b>' + G.fmt(r.gold) + '</b></span>' +
      '<span class="w-item key">🔑 <b>' + r.keys + '</b></span></div>' +
      '<div class="confirm-actions"><button class="btn btn-gold" data-ok>받기</button></div></div>';
    const back = openModal(html);
    back.querySelector("[data-ok]").addEventListener("click", () => {
      G.claimOffline(r);
      closeModal();
      renderAll();
      G.sfx("gold");
    });
  }

  /* ================= 부팅 ================= */
  function boot() {
    const res = G.init();
    S = G.state;

    if (!S.tutorialSeen) {
      S.tutorialSeen = true;
      G.saveSoon();
    }

    bindEvents();
    bindBattle();
    spawnEmbers();
    preloadItemArt();
    G.autoDemote();
    renderAll();
    updateAuto();
    stageChanged();
    if (G.music) G.music("forge");
    G.startLoop();

    // 저장 표시
    setInterval(() => {
      const t = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      $("#saveInfo").textContent = "자동 저장됨 · " + pad(t.getHours()) + ":" + pad(t.getMinutes()) + ":" + pad(t.getSeconds());
    }, 5000);

    if (res.migrated) {
      setTimeout(() => toast("이전 저장을 이어받았습니다 · 새 상자 시스템으로 시작!", "reward"), 600);
    }
    setTimeout(offlineModal, 700);

    // 초기 웰컴
    setTimeout(() => {
      if (S.stats.pulls === 0) toast("🎁 첫 상자를 열어 장비를 얻어보세요", "reward");
    }, 1100);

    // 테스트 훅
    window.__ui = ui;
    window.__renderAll = renderAll;
    window.__showReveal = showReveal;
    window.__chest = playChestOpen;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
