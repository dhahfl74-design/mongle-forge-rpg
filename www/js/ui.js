/* =====================================================================
   몽글 대장간: 별빛 성검 키우기 — UI (v2.1)
   세계 지도 · 보스 패턴 · 전투 연출 · 사운드 · 모달 · 자동 저장
   ===================================================================== */
(function () {
  "use strict";

  const G = window.GAME;
  const $ = (id) => document.getElementById(id);
  const S = () => G.getState();

  let currentTab = "hunt";
  let currentPanel = "achv";
  let currentWorld = 1;
  let battleKey = "";
  let repeatTimer = null;

  /* ===============================================================
     전체 화면 보스 아레나 (집중 전투 모드)
     =============================================================== */
  function enterBattleFocus(boss) {
    document.body.classList.add("battle-focus");
    setTimeout(() => {
      if (window.VFX) { VFX.resize(); VFX.setBoss(!!boss); VFX.start(); }
    }, 30);
  }

  function exitBattleFocus() {
    document.body.classList.remove("battle-focus");
    if (window.VFX) { VFX.setBoss(false); VFX.stop(); }
  }

  /* ===============================================================
     사운드
     =============================================================== */
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume().catch(() => {});
    return actx;
  }

  function tone(freq, dur, type, gain, delay, slideTo) {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.09, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const SFX = {
    click() { tone(720, 0.05, "sine", 0.05); },
    tap() { tone(420, 0.05, "triangle", 0.05, 0, 300); },
    hit() { tone(260, 0.07, "triangle", 0.06, 0, 180); },
    crit() { tone(620, 0.1, "square", 0.05, 0, 1000); tone(920, 0.08, "sine", 0.05, 0.05); },
    heal() { tone(460, 0.16, "sine", 0.07, 0, 720); tone(720, 0.14, "sine", 0.05, 0.1); },
    coin() { tone(980, 0.07, "sine", 0.05); tone(1320, 0.1, "sine", 0.045, 0.06); },
    buy() { tone(660, 0.07, "sine", 0.05); tone(880, 0.09, "sine", 0.045, 0.07); },
    success() { [523, 659, 784].forEach((f, i) => tone(f, 0.14, "sine", 0.07, i * 0.08)); },
    epic() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, "triangle", 0.06, i * 0.075)); },
    fail() { tone(330, 0.16, "triangle", 0.06, 0, 220); },
    break() { tone(200, 0.34, "sawtooth", 0.09, 0, 60); tone(120, 0.3, "square", 0.05, 0.05); },
    levelup() { [440, 554, 659, 880, 1108].forEach((f, i) => tone(f, 0.17, "triangle", 0.06, i * 0.09)); },
    boss() { tone(140, 0.35, "sawtooth", 0.05, 0, 220); },
    warn() { tone(760, 0.09, "square", 0.05); tone(560, 0.1, "square", 0.05, 0.1); },
    guard() { tone(300, 0.12, "square", 0.06, 0, 520); tone(700, 0.1, "sine", 0.05, 0.08); },
    dodge() { tone(880, 0.09, "sine", 0.05, 0, 1320); },
    counter() { [880, 1170, 1560].forEach((f, i) => tone(f, 0.1, "square", 0.05, i * 0.05)); },
    win() { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.2, "sine", 0.06, i * 0.1)); }
  };

  function sfx(name) {
    if (!S().settings.sound) return;
    try { (SFX[name] || SFX.click)(); } catch (e) {}
  }

  function vibrate(ms) {
    if (!S().settings.haptics) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* ===============================================================
     토스트 · 모달
     =============================================================== */
  function toast(msg, tone, icon) {
    const stack = $("toastStack");
    const t = document.createElement("div");
    t.className = "toast " + (tone || "");
    t.innerHTML = `<span class="t-ico">${icon || (tone === "bad" ? "😢" : tone === "epic" ? "🌟" : "✨")}</span><span>${msg}</span>`;
    stack.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 1900);
    while (stack.children.length > 2) stack.removeChild(stack.firstChild);
  }

  function openModal(html, opts) {
    opts = opts || {};
    const root = $("modalRoot");
    const closable = opts.closable !== false;
    root.innerHTML =
      `<div class="modal-backdrop" id="modalBackdrop"><div class="modal" role="dialog" aria-modal="true">` +
      (closable ? `<button class="modal-close" id="modalClose" aria-label="닫기">✕</button>` : "") +
      html + `</div></div>`;
    if (closable) {
      $("modalClose").onclick = closeModal;
      $("modalBackdrop").addEventListener("click", (e) => {
        if (e.target.id === "modalBackdrop") closeModal();
      });
    }
    if (opts.onMount) opts.onMount(root);
  }

  function closeModal() {
    $("modalRoot").innerHTML = "";
    if (repeatTimer) { clearInterval(repeatTimer); clearTimeout(repeatTimer); repeatTimer = null; }
  }

  function confirmModal(title, sub, okLabel, onOk, danger) {
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">${danger ? "🧹" : "💬"}</div>
        <h3>${title}</h3>
        <p class="modal-sub">${sub}</p>
      </div>
      <div class="modal-actions cols">
        <button class="btn btn-ghost" id="mCancel">취소</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="mOk">${okLabel}</button>
      </div>`,
      {
        onMount() {
          $("mCancel").onclick = closeModal;
          $("mOk").onclick = () => { closeModal(); onOk(); };
        }
      }
    );
  }

  /* ===============================================================
     헤더 · 지갑
     =============================================================== */
  function setCoin(id, val) {
    const node = $(id);
    if (!node) return;
    const text = G.fmt(val);
    if (node.textContent !== text) {
      node.textContent = text;
      const pill = node.closest(".coin");
      if (pill) { pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump"); }
    }
  }

  function renderHeader(force) {
    const s = S();
    const st = G.heroStats();
    setCoin("goldTop", s.gold);
    setCoin("stoneTop", s.stones);
    setCoin("fragTop", s.relFrags);

    $("topHeroLv").textContent = "Lv." + s.hero.level;
    const need = G.expNeed(s.hero.level);
    $("topExpFill").style.width = Math.min(100, (s.hero.exp / need) * 100) + "%";

    $("soundBtn").textContent = s.settings.sound ? "🔊" : "🔇";

    $("heroLvText").textContent = "Lv." + s.hero.level;
    $("heroHpFill").style.width = Math.min(100, (s.hero.hp / st.maxHp) * 100) + "%";
    $("heroHpText").textContent = `${Math.round(s.hero.hp)} / ${st.maxHp}`;
    $("statAtk").textContent = G.fmt(st.atk);
    $("statCrit").textContent = G.pct(st.critChance);
    $("statCritDmg").textContent = G.pct(st.critDmg);
    $("statExpBonus").textContent = "+" + st.goldBonus + "%";
    $("heroExpFill").style.width = Math.min(100, (s.hero.exp / need) * 100) + "%";
    $("heroExpText").textContent = `EXP ${G.fmt(s.hero.exp)} / ${G.fmt(need)}`;

    const titles = [
      "잿더미의 생존자", "곰팡이 숲의 잠입자", "핏빛 목장의 도살자", "잿구름의 방랑자",
      "성흔의 추적자", "유리 성당의 파괴자", "월식의 순례자", "잿가루 협곡의 개척자",
      "하늘 성소의 이방인", "악몽을 건넌 자", "성에 설원의 나그네", "썩은 빛의 항해자",
      "멈춘 시간의 벗", "재의 정복자", "성검의 주인"
    ];
    const ti = Math.min(titles.length - 1, Math.max(0, currentWorld - 1));
    $("heroTitle").textContent = titles[ti];

    if (force) $("heroPortrait").innerHTML = G.sprites.hero(G.tierOf(), {});
  }

  /* ===============================================================
     사냥 탭
     =============================================================== */
  function renderHunt() {
    const b = G.battle;
    $("tab-hunt").classList.toggle("battle-mode", !!b);
    if (b) {
      $("stageListView").classList.add("hidden");
      $("journeyCard").classList.add("hidden");
      $("skillCard").classList.add("hidden");
      $("battleView").classList.remove("hidden");
      renderBattleChrome();
      updateBattleFrame();
    } else {
      $("battleView").classList.add("hidden");
      exitBattleFocus();
      $("stageListView").classList.remove("hidden");
      $("journeyCard").classList.remove("hidden");
      $("skillCard").classList.remove("hidden");
      hidePattern();
      renderStagePicker();
      renderJourney();
      renderSkillPanel();
    }
  }

  function renderSkillPanel() {
    const s = S();
    $("skillList").innerHTML = G.SKILLS.map((sk) => {
      const unlocked = G.skillUnlocked(sk);
      const ups = s.skills[sk.id] || 0;
      const maxed = ups >= 9;
      const cost = G.skillUpgradeCost(sk);
      const can = unlocked && !maxed && s.stones >= cost.stones && s.gold >= cost.gold;
      const effect = sk.type === "heal"
        ? `최대 체력 ${Math.round(G.skillPower(sk) * 100)}% 회복`
        : `공격력 ${Math.round(G.skillPower(sk) * 100)}% 피해${sk.alwaysCrit ? " · 확정 치명타" : ""}`;
      return `<div class="skill-item ${unlocked ? "" : "locked"}">
        <div class="si-ico">${unlocked ? sk.icon : "🔒"}</div>
        <div class="si-copy">
          <b>${unlocked ? sk.name : "???"} ${unlocked ? `<span class="skill-lv">Lv.${ups + 1}</span>` : ""}</b>
          <p>${unlocked ? effect : `영웅 Lv.${sk.unlockLv}에 해금`} · 쿨다운 ${sk.cd}초</p>
        </div>
        <div class="si-act">
          ${unlocked
            ? (maxed ? `<span class="chip lav">MAX</span>`
              : `<button class="btn btn-ghost btn-sm" data-skill-up="${sk.id}" ${can ? "" : "disabled"}>강화</button>
                 <span class="skill-cost">💎${cost.stones} · 🪙${G.fmtShort(cost.gold)}</span>`)
            : `<span class="chip">Lv.${sk.unlockLv}</span>`}
        </div>
      </div>`;
    }).join("");
  }

  function renderJourney() {
    const s = S();
    const next = G.STAGES.find((x) => x.index === s.progress.maxStage);
    const relicLv = Object.values(s.relics).reduce((a, r) => a + (r.u ? r.lv : 0), 0);
    if (next) {
      $("jcEmoji").textContent = next.emoji;
      $("jcName").textContent = `${next.label} ${next.name}${next.isBoss ? " 👑" : ""}`;
      $("jcDesc").textContent = `추천 공격력 ${G.fmt(next.recAtk)} · ${next.isBoss ? "보스방!" : "첫 클리어 보너스"}`;
      $("jcGo").disabled = false;
      $("jcGo").textContent = "도전";
      $("jcSub").textContent = `세계 ${next.world} · ${s.progress.maxStage - 1}/${G.TOTAL_STAGES} 진행`;
    } else {
      $("jcEmoji").textContent = "👑";
      $("jcName").textContent = "모든 세계 정복!";
      $("jcDesc").textContent = "전설의 성검이 완성됐어요";
      $("jcGo").disabled = true;
      $("jcGo").textContent = "완료";
      $("jcSub").textContent = "최고의 대장장이";
    }
    $("jcWeapon").textContent = "+" + s.weapon.level;
    $("jcHero").textContent = "Lv." + s.hero.level;
    $("jcRelics").textContent = String(relicLv);
    $("jcCodex").textContent = `${Object.keys(s.codex).length}/${Object.keys(G.MONSTERS).length}`;
    $("jcLog").innerHTML = G.logLines.slice(0, 2).map((l) => `<div>· ${l.msg}</div>`).join("");
  }

  function maxUnlockedWorld() {
    let w = 1;
    G.WORLDS.forEach((x) => { if (G.worldProgress(x.id).unlocked) w = x.id; });
    return w;
  }

  function renderStagePicker() {
    const s = S();
    const maxWorld = maxUnlockedWorld();
    if (currentWorld > maxWorld) currentWorld = maxWorld;
    const w = G.worldById(currentWorld);
    if (!w) return;

    $("worldStrip").innerHTML = G.WORLDS.map((x) => {
      const p = G.worldProgress(x.id);
      const cls = [x.id === currentWorld ? "active" : "", p.unlocked ? "" : "locked", p.cleared >= p.total ? "done" : ""].join(" ");
      return `<button class="world-chip ${cls}" data-world="${x.id}">
        <span class="wc-emoji">${p.unlocked ? x.emoji : "🔒"}</span>
        <span class="wc-id">${x.id}</span>
      </button>`;
    }).join("");

    const prog = G.worldProgress(w.id);
    $("worldInfo").innerHTML = `
      <div class="wi-emoji">${w.emoji}</div>
      <div class="wi-copy">
        <b>${w.id}. ${w.name}</b>
        <span>${prog.unlocked ? w.desc : "이전 세계의 지배자를 베면 열립니다"}</span>
      </div>
      <div class="wi-bar">
        <div class="bar exp" style="height:8px;"><i style="width:${(prog.cleared / prog.total) * 100}%"></i></div>
        <div class="wi-pct">${prog.cleared}/${prog.total}</div>
      </div>`;
    $("stageHint").textContent = `세계 ${w.id} · ${prog.cleared}/${w.sub} 클리어`;

    const nextStage = G.STAGES.find((x) => x.index === s.progress.maxStage);
    $("stageGrid").innerHTML = Array.from({ length: w.sub }, (_, i) => {
      const sub = i + 1;
      const key = w.id + "-" + sub;
      const stage = G.stageByKey(key);
      const cleared = !!s.progress.cleared[key];
      const unlocked = stage.index <= s.progress.maxStage;
      const isBoss = stage.isBoss;
      const isNext = nextStage && nextStage.key === key;
      const cls = [cleared ? "cleared" : "", isBoss ? "boss" : "", isNext ? "next" : "", unlocked ? "" : "locked"].join(" ");
      return `<button class="stage-cell ${cls}" data-stage="${key}" ${unlocked ? "" : "disabled"}>
        ${cleared ? `<span class="sc-check">✓</span>` : ""}
        <span class="sc-label">${key}</span>
        <span class="sc-sub">${isBoss ? "보스방" : (cleared ? "완료" : "도전")}</span>
        <span class="sc-stars">${"⭐".repeat(Math.min(3, s.progress.cleared[key] || 0))}</span>
      </button>`;
    }).join("");
  }

  function renderBattleChrome() {
    const b = G.battle;
    if (!b) return;
    const key = b.stageKey + ":" + b.waveIndex + ":" + b.enemyIndex;
    if (key === battleKey && $("heroSprite").children.length) {
      $("battleStage").textContent = `${b.stage.label} · ${b.stage.name}`;
      return;
    }
    battleKey = key;

    const scene = $("battleScene");
    scene.style.background = `linear-gradient(180deg, ${b.stage.sky[0]} 0%, ${b.stage.sky[1]} 100%)`;
    scene.style.setProperty("--hill1", b.stage.ground);
    scene.style.setProperty("--hill2", b.stage.sky[0]);
    $("battleStage").textContent = `${b.stage.label} · ${b.stage.name}`;

    $("heroSprite").innerHTML = G.sprites.hero(G.tierOf(), {});
    $("autoToggle").checked = !!b.auto;

    const deco2 = { 1: "🕯️", 2: "🍄", 3: "🩸", 4: "☁️", 5: "✨", 6: "🦋", 7: "🌘", 8: "🪨", 9: "🕊️", 10: "🏰", 11: "❄️", 12: "🌊", 13: "⏳", 14: "🔥", 15: "👑" };
    $("deco1").textContent = b.stage.emoji;
    $("deco2").textContent = deco2[b.stage.world] || "✦";

    enterBattleFocus(!!b.stage.isBoss);
    renderEnemySprite();
    renderSkillBar();
  }

  function renderEnemySprite() {
    const b = G.battle;
    const fy = $("enemyFighter");
    fy.classList.remove("dead", "telegraph", "shielded", "enraged");
    if (!b || !b.enemy) { $("enemySprite").innerHTML = ""; return; }
    const e = b.enemy;
    fy.classList.toggle("boss", !!e.boss);
    $("enemySprite").innerHTML = G.sprites.monster(e, { boss: e.boss });
    $("enemyName").textContent = e.name + (e.boss ? " 👑" : "");
    $("tapHint").style.display = "";
    if (window.VFX) VFX.setBoss(!!e.boss || !!b.stage.isBoss);
    if (e.boss) { sfx("boss"); vibrate([12, 40, 12]); }
  }

  function renderSkillBar() {
    const b = G.battle;
    if (!b) return;
    $("skillBar").innerHTML = G.SKILLS.map((sk) => {
      const unlocked = G.skillUnlocked(sk);
      const ups = S().skills[sk.id] || 0;
      return `<button class="skill-btn ${unlocked ? "" : "locked"}" data-skill="${sk.id}">
        <span class="sk-ico">${unlocked ? sk.icon : "🔒"}</span>
        <span class="sk-name">${unlocked ? sk.name : "???"}</span>
        <span class="sk-cd-text">${unlocked ? "Lv." + (ups + 1) : "서약자 Lv." + sk.unlockLv}</span>
        <span class="sk-cd"></span>
        <span class="sk-remain"></span>
      </button>`;
    }).join("");
    renderReactBar();
  }

  /* 방어 · 회피 · 카운터 (지배자 패턴 대응) */
  function renderReactBar() {
    const b = G.battle;
    const pat = b && b.enemy && b.enemy.pattern;
    const responded = pat && pat.responded;
    document.querySelectorAll(".react-btn").forEach((btn) => {
      const live = !!pat && !responded;
      btn.disabled = !live;
      btn.classList.toggle("live", live);
      btn.classList.toggle("done", !!responded);
    });
  }

  function renderWavePips() {
    const b = G.battle;
    if (!b) return;
    const wave = b.waves[b.waveIndex];
    const total = wave.monsters.length;
    const done = b.enemyIndex;
    let html = "";
    for (let i = 0; i < total; i++) {
      const pct = i < done ? 100 : (i === done && b.enemy ? Math.round((1 - b.enemy.hp / b.enemy.maxHp) * 100) : 0);
      html += `<span class="wave-pip ${i < done ? "done" : ""}"><i style="width:${pct}%"></i></span>`;
    }
    $("wavePips").innerHTML = html;
  }

  function updateBattleFrame() {
    const b = G.battle;
    if (!b) return;
    const st = G.heroStats();
    const hpPct = Math.max(0, Math.min(100, (S().hero.hp / st.maxHp) * 100));
    $("fightHeroHp").style.width = hpPct + "%";
    $("heroHpFill").style.width = hpPct + "%";
    $("heroHpText").textContent = `${Math.round(S().hero.hp)} / ${st.maxHp}`;
    $("sceneVignette").classList.toggle("danger", hpPct <= 25);
    if (b.enemy) {
      const e = b.enemy;
      $("fightEnemyHp").style.width = Math.max(0, (e.hp / e.maxHp) * 100) + "%";
      $("enemyHpText").textContent = `${Math.max(0, Math.ceil(e.hp))} / ${e.maxHp}`;
      $("enemyFighter").classList.toggle("shielded", !!e.shield);
      $("enemyFighter").classList.toggle("enraged", !!e.enraged);
    }
    renderWavePips();

    const buttons = $("skillBar").querySelectorAll(".skill-btn");
    buttons.forEach((btn) => {
      const id = btn.dataset.skill;
      const sk = G.SKILLS.find((x) => x.id === id);
      if (!sk) return;
      const cd = b.cds[id] || 0;
      const pct = Math.min(100, (cd / sk.cd) * 100);
      const layer = btn.querySelector(".sk-cd");
      const remain = btn.querySelector(".sk-remain");
      if (layer) layer.style.height = pct + "%";
      if (remain) remain.textContent = cd > 0 ? Math.ceil(cd) : "";
      if (!btn.classList.contains("locked")) btn.classList.toggle("ready", cd <= 0);
    });

    setCoin("goldTop", S().gold);
    setCoin("stoneTop", S().stones);
    setCoin("fragTop", S().relFrags);

    const patNow = b.enemy && b.enemy.pattern;
    document.querySelectorAll(".react-btn").forEach((btn) => {
      const live = !!patNow && !patNow.responded;
      if (btn.disabled === live) btn.disabled = !live;
      btn.classList.toggle("live", live);
      btn.classList.toggle("done", !!(patNow && patNow.responded));
    });

    $("biWeapon").textContent = "+" + S().weapon.level;
    $("biAtk").textContent = G.fmt(st.atk);
    $("biCrit").textContent = G.pct(st.critChance);
  }

  /* ===============================================================
     보스 패턴 UI
     =============================================================== */
  let activePattern = null;

  function showPattern(pat, phase, total) {
    activePattern = { id: pat.id, action: pat.action, phase: phase };
    $("tab-hunt").classList.add("pattern-on");
    const panel = $("patternPanel");
    panel.classList.remove("hidden", "shield", "responded");
    if (pat.action === "counter") panel.classList.add("shield");
    $("ppIcon").textContent = pat.icon;
    $("ppTitle").textContent = phase === "active" ? `${pat.name} 전개!` : `${pat.name} 준비!`;
    $("ppHint").textContent = pat.hint;
    $("ppTimer").textContent = total.toFixed(1);
    $("ppFill").style.width = "100%";
    $("enemyFighter").classList.add(phase === "active" ? "shielded" : "telegraph");
    renderReactBar();
    sfx("warn");
  }

  function updatePatternUI(timer, total, responded) {
    const pct = Math.max(0, Math.min(100, (timer / total) * 100));
    $("ppFill").style.width = pct + "%";
    $("ppTimer").textContent = timer.toFixed(1);
    if (responded) {
      $("patternPanel").classList.add("responded");
      renderReactBar();
    }
  }

  function hidePattern() {
    activePattern = null;
    $("tab-hunt").classList.remove("pattern-on");
    $("patternPanel").classList.add("hidden");
    $("patternPanel").classList.remove("shield", "responded");
    $("enemyFighter").classList.remove("telegraph");
    document.querySelectorAll(".react-btn").forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove("live", "done");
    });
  }

  /* ===============================================================
     대장간 탭
     =============================================================== */
  let forgeSwordLevel = null;

  function renderForge() {
    const s = S();
    const lv = s.weapon.level;
    const st = G.heroStats();
    const rates = G.rates(lv);
    const cost = G.enhanceCost(lv);
    const canProtect = lv >= G.FORGE.breakStartLv && lv < G.MAX_LV;
    const protCost = canProtect ? G.protectCost(lv) : 0;
    const total = cost + (canProtect && s.weapon.protect ? protCost : 0);
    const maxed = lv >= G.MAX_LV;

    $("forgeLv").textContent = "+" + lv;
    $("forgeName").textContent = G.WEAPONS[Math.min(lv, G.WEAPONS.length - 1)];
    $("forgeAtk").textContent = `무기 공격력 ${G.fmt(G.weaponAtk(lv))} · 총 공격력 ${G.fmt(st.atk)}`;
    $("sellPrice").textContent = G.fmt(G.sellPrice(lv)) + " G";

    $("starRow").innerHTML = [5, 10, 15, 20, 25].map((step) =>
      `<i class="${lv >= step ? "on" : ""}"><span>★</span><em>${step}</em></i>`
    ).join("");

    if (forgeSwordLevel !== lv) {
      $("forgeVisual").innerHTML = G.sprites.sword(lv);
      forgeSwordLevel = lv;
    }

    $("rateSuccess").textContent = maxed ? "MAX" : (s.weapon.pity >= 100 ? "확정!" : G.pct(rates.success));
    $("rateDown").textContent = maxed || s.weapon.pity >= 100 ? "0%" : G.pct(rates.down);
    $("rateBreak").textContent = maxed || s.weapon.pity >= 100 ? "0%" : G.pct(rates.breakRate);
    $("rateSuccess").parentNode.className = "rate-box good";
    $("rateDown").parentNode.className = "rate-box " + (rates.down > 25 ? "bad" : "warn");
    $("rateBreak").parentNode.className = "rate-box " + (rates.breakRate > 20 ? "bad" : "warn");
    $("rateNote").textContent = maxed
      ? "최고 단계입니다. 검이 완성되었습니다."
      : (lv < G.FORGE.safeLv
        ? "실패해도 단계가 유지되고 장인의 원한이 쌓입니다"
        : (lv < G.FORGE.breakStartLv
          ? "실패하면 한 단계 내려갑니다 (파괴 없음)"
          : "실패하면 검이 부서질 수 있습니다 · 봉인 부적으로 보호"));

    $("pityText").textContent = G.pct(Math.min(100, s.weapon.pity));
    $("pityFill").style.width = Math.min(100, s.weapon.pity) + "%";

    $("protectRow").classList.toggle("off", !(canProtect && s.weapon.protect));
    const pt = $("protectToggle");
    pt.disabled = !canProtect;
    pt.checked = canProtect ? !!s.weapon.protect : false;
    $("protectCost").textContent = canProtect
      ? `이번 강화에 ${G.fmt(protCost)} G 추가`
      : (lv >= G.MAX_LV ? "최고 단계에서는 필요 없습니다" : "+10강부터 사용할 수 있습니다");

    const btn = $("enhanceBtn");
    if (maxed) {
      btn.disabled = true;
      $("enhanceMain").textContent = "👑 성검 완성!";
      $("enhanceCost").textContent = "더 강화할 수 없어요";
    } else if (s.weapon.pity >= 100) {
      btn.disabled = s.gold < total;
      $("enhanceMain").textContent = "🌑 원한 폭발!";
      $("enhanceCost").textContent = `${G.fmt(total)} G`;
    } else {
      btn.disabled = s.gold < total;
      $("enhanceMain").textContent = s.gold < total ? "🪙 골드 부족" : "⚒ 망치질";
      $("enhanceCost").textContent = `${G.fmt(total)} G`;
    }

    $("sellBtnSub").textContent = `+${G.fmtShort(G.sellPrice(lv))} G`;

    const mineGain = 40 + s.upgrades.pickaxe * 45;
    const furnaceRate = s.upgrades.furnace * 35;
    $("mineInfo").textContent = `클릭 +${G.fmt(mineGain)} G · 자동 +${G.fmt(furnaceRate)} G/초`;
    $("mineBtn").textContent = `캐기 +${G.fmtShort(mineGain)}`;

    $("researchList").innerHTML = G.FORGE_UPGRADES.map((u) => {
      const lvU = s.upgrades[u.key];
      const price = G.upgradeCost(u.key);
      const maxU = lvU >= u.max;
      return `<div class="upg-item">
        <div class="upg-ico">${u.icon}</div>
        <div class="upg-body">
          <b>${u.name} <span class="upg-lv">Lv.${lvU}${maxU ? " MAX" : ""}</span></b>
          <p>${u.desc}</p>
        </div>
        <button class="btn btn-ghost btn-sm upg-buy" data-upg="${u.key}" ${maxU || s.gold < price ? "disabled" : ""}>
          ${maxU ? "완료" : G.fmtShort(price) + " G"}
        </button>
      </div>`;
    }).join("");

    renderLog();
  }

  function renderLog() {
    const box = $("logBox");
    const lines = G.logLines.slice(0, 18);
    box.innerHTML = lines.length
      ? lines.map((l) => `<div class="log-line ${l.tone ? "tone-" + l.tone : ""}">${l.msg}</div>`).join("")
      : `<div class="log-empty">아직 소식이 없어요. 강화나 사냥을 시작해 보세요!</div>`;
  }

  function showForgeToast(text, tone) {
    const t = $("forgeToast");
    t.textContent = text;
    t.className = "forge-toast show " + (tone || "");
    clearTimeout(showForgeToast._t);
    showForgeToast._t = setTimeout(() => { t.className = "forge-toast " + (tone || ""); }, 1500);
  }

  function animateSword(cls) {
    const svg = $("forgeVisual").querySelector(".forge-sword");
    if (!svg) return;
    svg.classList.remove("shake", "pulse", "cracked");
    void svg.offsetWidth;
    svg.classList.add(cls);
    setTimeout(() => svg.classList.remove(cls), 700);
  }

  /* ===============================================================
     유물 탭
     =============================================================== */
  function renderRelics() {
    const s = S();
    $("fragCount").textContent = G.fmt(s.relFrags);
    $("relicList").innerHTML = G.RELICS.map((r) => {
      const cur = s.relics[r.id];
      const val = r.effect * cur.lv;
      const cost = G.relicLevelCost(r);
      let action;
      if (!cur.u) {
        const can = s.relFrags >= r.unlock;
        action = `<button class="btn btn-lav btn-sm" data-relic-unlock="${r.id}" ${can ? "" : "disabled"}>깨우기</button>
          <div class="relic-cost">🔮 <b>${r.unlock}</b> 조각</div>`;
      } else if (cur.lv >= r.max) {
        action = `<span class="chip lav">MAX</span>`;
      } else {
        const can = s.gold >= cost.gold && s.relFrags >= cost.frags;
        action = `<button class="btn btn-ghost btn-sm" data-relic-level="${r.id}" ${can ? "" : "disabled"}>강화</button>
          <div class="relic-cost">🔮 <b>${cost.frags}</b> · 🪙 ${G.fmtShort(cost.gold)}</div>`;
      }
      const pips = Array.from({ length: r.max }, (_, i) => `<i class="${i < cur.lv ? "on" : ""}"></i>`).join("");
      return `<div class="relic-card ${cur.u ? "" : "locked"}">
        <div class="relic-ico" style="--rc:${r.color}">${cur.u ? r.icon : "❔"}</div>
        <div class="relic-body">
          <div class="relic-name">${r.name} ${cur.u ? `<span class="relic-lv">Lv.${cur.lv}</span>` : ""}</div>
          <div class="relic-effect">${cur.u ? r.text(val) : r.text(r.effect) + " (해금 시)"}</div>
          <div class="relic-desc">${r.desc}</div>
          ${cur.u ? `<div class="relic-pips">${pips}</div>` : ""}
        </div>
        <div class="relic-act">${action}</div>
      </div>`;
    }).join("");
  }

  /* ===============================================================
     도감 · 업적 · 설정
     =============================================================== */
  function renderCodex() {
    const s = S();
    const list = G.achievements();
    const ready = list.filter((a) => a.done && !a.claimed).length;
    const done = list.filter((a) => a.done).length;
    $("achvDone").textContent = done;
    $("achvTotal").textContent = list.length;
    $("achvSummaryText").textContent = ready
      ? `수령할 업적이 ${ready}개 있습니다.`
      : (done === list.length ? "모든 업적을 달성했습니다." : "사냥과 망치질로 업적을 채우십시오.");
    $("achvList").innerHTML = list.map(({ def, done: d, claimed }) => {
      const rw = [];
      if (def.reward.gold) rw.push(`🪙 ${G.fmtShort(def.reward.gold)}`);
      if (def.reward.stones) rw.push(`💎 ${def.reward.stones}`);
      if (def.reward.frags) rw.push(`🔮 ${def.reward.frags}`);
      const state = claimed
        ? `<span class="achv-state claimed">완료</span>`
        : d
          ? `<button class="achv-state claimable" data-claim="${def.id}">받기</button>`
          : `<span class="achv-state">진행 중</span>`;
      return `<div class="achv-item ${d ? "done" : ""}">
        <div class="achv-ico">${def.icon}</div>
        <div class="achv-body">
          <b>${def.name}</b>
          <p>${def.desc}</p>
          <div class="achv-reward">${rw.join(" · ")}</div>
        </div>
        ${state}
      </div>`;
    }).join("");

    const entries = [];
    G.WORLDS.forEach((w) => {
      entries.push(`<div class="codex-world">${w.emoji} ${w.id}. ${w.name}</div>`);
      w.monsters.forEach((id) => entries.push(entryCell(id, s, false)));
      entries.push(entryCell(w.boss, s, true));
    });
    $("codexGrid").innerHTML = entries.join("");
    const total = Object.keys(G.MONSTERS).length;
    $("codexCount").textContent = `${Object.keys(s.codex).length} / ${total}`;
    $("codexFill").style.width = (Object.keys(s.codex).length / total) * 100 + "%";

    $("soundToggle").checked = !!s.settings.sound;
    $("autoToggleSetting").checked = !!s.settings.auto;
    $("hapticsToggle").checked = !!s.settings.haptics;
    $("autoAdvanceToggle").checked = s.settings.autoAdvance !== false;
    $("autoRepeatToggle").checked = !!s.settings.autoRepeat;
    $("saveInfo").textContent = `마지막 저장: ${new Date(s.lastSeen).toLocaleTimeString("ko-KR")} · 자동 저장 켜짐 · v${G.VERSION}`;
    $("tipBox").textContent = "💡 " + G.TIPS[(new Date().getDate() + s.progress.maxStage) % G.TIPS.length];

    $("navBadge").textContent = ready > 0 ? String(ready) : "";
    const badge = $("achvBadge");
    badge.textContent = ready;
    badge.style.display = ready > 0 ? "inline-grid" : "none";
  }

  function entryCell(id, s, boss) {
    const mon = G.MONSTERS[id];
    if (!mon) return "";
    const known = !!s.codex[id];
    return `<div class="codex-cell ${known ? "" : "unknown"} ${boss ? "box" : ""}">
      ${boss ? `<span class="cx-boss">BOSS</span>` : ""}
      <div class="cx-sprite">${G.sprites.monster(mon, { boss: boss })}</div>
      <div class="cx-name">${known ? mon.name : "???"}</div>
    </div>`;
  }

  /* ===============================================================
     전투 미니
     =============================================================== */
  function updateBattleMini() {
    const b = G.battle;
    const mini = $("battleMini");
    if (!b) { mini.classList.remove("show"); return; }
    const boss = b.enemy && b.enemy.boss ? "👑 " : "";
    $("battleMiniStage").textContent = `${boss}${b.stage.label} · ${b.enemy ? b.enemy.name : "이동 중"}`;
    $("battleMiniHp").textContent = b.enemy ? Math.ceil((b.enemy.hp / b.enemy.maxHp) * 100) + "%" : "";
    mini.classList.toggle("show", currentTab !== "hunt");
  }

  /* ===============================================================
     탭 이동
     =============================================================== */
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-page").forEach((p) => { p.classList.toggle("active", p.id === "tab-" + tab); p.scrollTop = 0; });
    renderHeader(false);
    if (tab === "hunt") {
      const b = G.battle;
      if (b) currentWorld = b.stage.world;
      renderHunt();
    }
    if (tab === "forge") renderForge();
    if (tab === "relic") renderRelics();
    if (tab === "codex") renderCodex();
    updateBattleMini();
    sfx("click");
  }

  function switchPanel(panel) {
    currentPanel = panel;
    document.querySelectorAll("#codexSeg button").forEach((b) => b.classList.toggle("active", b.dataset.panel === panel));
    document.querySelectorAll("#tab-codex .panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + panel));
    sfx("click");
  }

  function renderAll() {
    renderHeader(false);
    renderHunt();
    renderForge();
    renderRelics();
    renderCodex();
    updateBattleMini();
  }

  /* ===============================================================
     연출
     =============================================================== */
  function floatNum(targetEl, text, cls, tag) {
    if (!targetEl) return;
    const r = targetEl.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "float-num " + (cls || "");
    d.innerHTML = (tag ? `<span class="fn-tag">${tag}</span>` : "") + `<span>${text}</span>`;
    d.style.left = r.left + r.width / 2 + (Math.random() * 26 - 13) + "px";
    d.style.top = r.top + r.height * 0.42 + "px";
    $("fxLayer").appendChild(d);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 1000);
  }

  function sparkle(targetEl, count) {
    if (!targetEl) return;
    const r = targetEl.getBoundingClientRect();
    const icons = ["✦", "✧", "★", "·"];
    for (let i = 0; i < (count || 4); i++) {
      const sp = document.createElement("div");
      sp.className = "spark";
      sp.textContent = icons[i % icons.length];
      sp.style.left = r.left + r.width / 2 + (Math.random() * r.width * 0.7 - r.width * 0.35) + "px";
      sp.style.top = r.top + r.height * 0.45 + (Math.random() * r.height * 0.4 - r.height * 0.2) + "px";
      sp.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
      sp.style.setProperty("--dy", (-30 - Math.random() * 50) + "px");
      sp.style.color = ["#ffd166", "#ff9fb0", "#a8e6cf", "#b9a7ff"][i % 4];
      $("fxLayer").appendChild(sp);
      setTimeout(() => { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 750);
    }
  }

  function dropCoins(targetEl, n) {
    if (!targetEl) return;
    const r = targetEl.getBoundingClientRect();
    const icons = ["🪙", "🪙", "💎", "🪙", "✨"];
    for (let i = 0; i < (n || 3); i++) {
      const c = document.createElement("div");
      c.className = "drop-coin";
      c.textContent = icons[i % icons.length];
      c.style.left = r.left + r.width / 2 + "px";
      c.style.top = r.top + r.height * 0.55 + "px";
      c.style.setProperty("--dx", (Math.random() * 70 - 35) + "px");
      c.style.animationDelay = (i * 0.05) + "s";
      $("fxLayer").appendChild(c);
      setTimeout(() => { if (c.parentNode) c.parentNode.removeChild(c); }, 1100);
    }
  }

  function showLevelUp(lv) {
    const o = $("levelupOverlay");
    $("luLv").textContent = "Lv." + lv;
    o.classList.remove("show");
    void o.offsetWidth;
    o.classList.add("show");
    setTimeout(() => o.classList.remove("show"), 1800);
    sparkle($("heroSprite"), 8);
  }

  /* ===============================================================
     이벤트 배선
     =============================================================== */
  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    $("soundBtn").addEventListener("click", () => {
      S().settings.sound = !S().settings.sound;
      G.save();
      renderHeader(false);
      renderCodex();
      if (S().settings.sound) sfx("success");
      toast(S().settings.sound ? "소리를 켰어요" : "소리를 껐어요", "", S().settings.sound ? "🔊" : "🔇");
    });

    // 세계 선택
    $("worldStrip").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-world]");
      if (!chip) return;
      const id = Number(chip.dataset.world);
      const p = G.worldProgress(id);
      if (!p.unlocked) { toast("이전 세계의 지배자를 먼저 베십시오", "bad", "🔒"); return; }
      currentWorld = id;
      sfx("click");
      renderStagePicker();
    });

    // 스테이지 선택
    $("stageGrid").addEventListener("click", (e) => {
      const cell = e.target.closest("[data-stage]");
      if (!cell) return;
      const key = cell.dataset.stage;
      const stage = G.stageByKey(key);
      if (!stage) return;
      if (!G.stageReached(stage)) { toast("이전 구역을 먼저 정복하십시오", "bad", "🔒"); return; }
      currentWorld = stage.world;
      challenge(key);
    });

    $("fleeBtn").addEventListener("click", () => {
      if (!G.battle) return;
      const key = G.battle.stageKey;
      G.flee();
      battleKey = "";
      exitBattleFocus();
      sfx("click");
      renderHunt();
      renderHeader(false);
      toast("대장간으로 퇴각했습니다", "", "🏃");
      void key;
    });

    $("autoToggle").addEventListener("change", (e) => {
      G.setAuto(e.target.checked);
      toast(e.target.checked ? "자동 전투를 켰습니다" : "자동 전투를 껐습니다. 직접 눌러 베십시오", "", e.target.checked ? "🤖" : "⚔");
    });

    $("enemyFighter").addEventListener("click", () => {
      if (!G.battle) return;
      const res = G.tapAttack();
      if (res.ok) {
        $("tapHint").style.display = "none";
        sfx("tap");
        vibrate(8);
      }
    });

    $("skillBar").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-skill]");
      if (!btn) return;
      const id = btn.dataset.skill;
      const sk = G.SKILLS.find((x) => x.id === id);
      if (!sk) return;
      if (!G.skillUnlocked(sk)) {
        toast(`서약자 Lv.${sk.unlockLv}에 각성합니다`, "bad", "🔒");
        return;
      }
      const res = G.useSkill(id);
      if (!res.ok && res.reason === "cooldown") toast("아직 쿨다운입니다", "", "⏳");
      else if (res.ok) {
        if (sk.type === "heal") { sfx("heal"); vibrate(12); }
        else { sfx("crit"); vibrate(16); }
      }
    });

    // 수동 공격 (컨트롤 바)
    $("attackBtn").addEventListener("click", () => {
      if (!G.battle) return;
      const res = G.tapAttack();
      if (res.ok) {
        $("tapHint").style.display = "none";
        $("attackBtn").classList.remove("hit");
        void $("attackBtn").offsetWidth;
        $("attackBtn").classList.add("hit");
        sfx("tap");
        vibrate(8);
      }
    });

    // 지배자 패턴 대응 (방어 · 회피 · 카운터)
    $("reactRow").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-react]");
      if (!btn || btn.disabled) return;
      const action = btn.dataset.react;
      const res = G.respond(action);
      if (!res.ok) {
        if (res.reason === "wrong") {
          toast("지금은 다른 대응이 필요합니다!", "bad", "⚠️");
          $("patternPanel").animate(
            [{ transform: "translateX(-50%) translateX(0)" }, { transform: "translateX(-50%) translateX(-6px)" }, { transform: "translateX(-50%) translateX(6px)" }, { transform: "translateX(-50%) translateX(0)" }],
            { duration: 220 }
          );
        }
        return;
      }
      if (res.kind === "guard") { sfx("guard"); floatNum($("heroSprite"), "방어!", "heal"); }
      else if (res.kind === "dodge") { sfx("dodge"); floatNum($("heroSprite"), "회피!", "heal"); }
      else if (res.kind === "counter") { sfx("counter"); vibrate(24); floatNum($("enemySprite"), "카운터!", "crit", "COUNTER"); sparkle($("enemySprite"), 6); }
      $("patternPanel").classList.add("responded");
      $("enemyFighter").classList.remove("telegraph");
      renderReactBar();
    });

    // 대장간
    $("enhanceBtn").addEventListener("click", () => {
      const res = G.enhance();
      if (!res.ok) {
        if (res.reason === "gold") toast("골드가 부족합니다. 사냥이나 광맥으로 모으십시오", "bad", "🪙");
        if (res.reason === "max") toast("이미 최고 단계입니다", "", "👑");
        return;
      }
      onForgeResult(res);
    });

    $("sellBtn").addEventListener("click", () => {
      const lv = S().weapon.level;
      if (lv <= 0) { toast("지금은 팔 것이 없습니다", "", "🪙"); return; }
      confirmModal(
        `+${lv} 검을 매각할까요?`,
        `${G.WEAPONS[lv]}을(를) ${G.fmt(G.sellPrice(lv))} G에 팔고 +0부터 다시 시작합니다.`,
        "매각하기",
        () => {
          const r = G.sell();
          if (r.ok) {
            sfx("coin"); vibrate(10);
            showForgeToast(`+${G.fmt(r.price)} G`, "good");
            renderForge();
            renderHeader(true);
            if (G.battle) { battleKey = ""; renderBattleChrome(); }
            toast(`+${G.fmt(r.price)} G를 받았어요`, "good", "💰");
          }
        }
      );
    });

    $("protectToggle").addEventListener("change", (e) => {
      G.toggleProtect(e.target.checked);
      renderForge();
      if (e.target.checked) toast("파괴 방지권을 켰어요. 강화 비용이 조금 늘어나요", "", "🛡️");
    });

    $("mineBtn").addEventListener("click", () => {
      const gain = G.mine();
      sfx("coin");
      floatNum($("mineBtn"), "+" + G.fmt(gain), "coin");
      dropCoins($("mineBtn"), 2);
      renderHeader(false);
      renderForge();
    });

    $("researchList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-upg]");
      if (!btn) return;
      const r = G.buyUpgrade(btn.dataset.upg);
      if (!r.ok) {
        if (r.reason === "gold") toast("골드가 부족해요", "bad", "🪙");
        if (r.reason === "max") toast("이미 최고 레벨이에요", "", "✅");
        return;
      }
      sfx("buy");
      renderForge(); renderHeader(false); renderCodex();
    });

    // 유물
    $("relicList").addEventListener("click", (e) => {
      const unlockBtn = e.target.closest("[data-relic-unlock]");
      const levelBtn = e.target.closest("[data-relic-level]");
      if (unlockBtn) {
        const r = G.unlockRelic(unlockBtn.dataset.relicUnlock);
        if (!r.ok) { toast("유물 조각이 부족해요. 보스를 사냥해 보세요!", "bad", "🔮"); return; }
        sfx("epic"); vibrate(20);
        renderRelics(); renderHeader(false); renderCodex();
      } else if (levelBtn) {
        const r = G.levelRelic(levelBtn.dataset.relicLevel);
        if (!r.ok) {
          toast(r.reason === "frags" ? "유물 조각이 부족해요" : "골드가 부족해요", "bad", r.reason === "frags" ? "🔮" : "🪙");
          return;
        }
        sfx("success");
        renderRelics(); renderHeader(false); renderCodex();
      }
    });

    $("panel-achv").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-claim]");
      if (!btn) return;
      const r = G.claimAchievement(btn.dataset.claim);
      if (r && r.ok) {
        sfx("epic"); vibrate(16);
        renderCodex(); renderHeader(false); renderForge();
        const a = G.ACHIEVEMENTS.find((x) => x.id === btn.dataset.claim);
        toast("업적 보상: " + a.name, "epic", "🏆");
      }
    });

    $("codexSeg").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-panel]");
      if (btn) switchPanel(btn.dataset.panel);
    });

    $("soundToggle").addEventListener("change", (e) => {
      S().settings.sound = e.target.checked; G.save(); renderHeader(false);
      if (e.target.checked) sfx("success");
    });
    $("autoToggleSetting").addEventListener("change", (e) => {
      G.setAuto(e.target.checked); renderCodex();
      if (G.battle) $("autoToggle").checked = e.target.checked;
    });
    $("hapticsToggle").addEventListener("change", (e) => {
      S().settings.haptics = e.target.checked; G.save(); if (e.target.checked) vibrate(12);
    });
    $("autoAdvanceToggle").addEventListener("change", (e) => {
      S().settings.autoAdvance = e.target.checked; G.save();
      toast(e.target.checked ? "클리어하면 다음 사냥터로 이동해요" : "자동 진행을 껐어요", "", "➡️");
    });
    $("autoRepeatToggle").addEventListener("change", (e) => {
      S().settings.autoRepeat = e.target.checked; G.save();
      toast(e.target.checked ? "클리어 후 같은 곳을 반복해요" : "자동 반복을 껐어요", "", "🔁");
    });

    $("exportBtn").addEventListener("click", openExportModal);
    $("importBtn").addEventListener("click", openImportModal);
    $("resetBtn").addEventListener("click", () => {
      confirmModal("정말 처음부터 시작할까요?", "강화 단계, 서약자, 유물, 도감 기록이 모두 사라집니다. 되돌릴 수 없습니다.", "모두 지우기", () => {
        G.reset();
        battleKey = "";
        forgeSwordLevel = null;
        currentWorld = 1;
        exitBattleFocus();
        renderAll();
        toast("새로운 서약이 시작됩니다", "", "🌑");
        switchTab("hunt");
      }, true);
    });

    $("battleMiniGo").addEventListener("click", () => switchTab("hunt"));
    $("installClose").addEventListener("click", () => $("installBanner").classList.remove("show"));

    $("jcGo").addEventListener("click", () => {
      const next = G.STAGES.find((x) => x.index === S().progress.maxStage);
      if (next) challenge(next.key);
    });

    $("skillList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-skill-up]");
      if (!btn) return;
      const r = G.upgradeSkill(btn.dataset.skillUp);
      if (!r.ok) {
        toast(r.reason === "stones" ? "강화석이 부족해요. 사냥으로 모아요!" : "골드가 부족해요", "bad", r.reason === "stones" ? "💎" : "🪙");
        return;
      }
      sfx("success");
      renderSkillPanel();
      renderHeader(false);
      const sk = G.SKILLS.find((x) => x.id === btn.dataset.skillUp);
      toast(`[${sk.name}] Lv.${(S().skills[sk.id] || 0) + 1} 강화!`, "good", sk.icon);
    });

    const unlock = () => { audio(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock, { once: true });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("modalRoot").children.length) {
        const closable = $("modalClose");
        if (closable) closeModal();
      }
    });
  }

  /* ===============================================================
     강화 결과
     =============================================================== */
  function onForgeResult(res) {
    const lv = res.level;
    if (res.kind === "success" || res.kind === "pity") {
      const epic = lv >= 20 || lv % 5 === 0;
      animateSword("pulse");
      sfx(epic ? "epic" : "success");
      vibrate(epic ? 24 : 14);
      sparkle($("forgeVisual"), epic ? 10 : 4);
      showForgeToast(res.kind === "pity" ? `🌙 기운 발동! +${lv}` : `✨ 강화 성공! +${lv}`, epic ? "epic" : "good");
      if (epic) floatNum($("forgeVisual"), `+${lv}`, "crit", "ENHANCE");
      G.log(`✨ +${lv} ${G.WEAPONS[lv]} 강화 성공!`, "level");
      if (G.battle) { battleKey = ""; renderBattleChrome(); }
    } else if (res.kind === "down") {
      animateSword("shake");
      sfx("fail");
      vibrate(30);
      showForgeToast(`📉 실패… +${lv}로 내려갔어요`, "bad");
      G.log(`📉 강화 실패! +${lv}로 하락했습니다. (원한 +${Math.round(res.pity)}%)`, "fail");
    } else if (res.kind === "maintain") {
      animateSword("shake");
      sfx("fail");
      showForgeToast(`🌀 유지… 원한 +${Math.round(res.pity)}%`, "");
      G.log(`🌀 강화 실패, +${lv} 그대로입니다. 장인의 원한이 쌓였습니다.`, "fail");
    } else if (res.kind === "protected") {
      animateSword("shake");
      sfx("fail");
      vibrate(20);
      showForgeToast("🛡 봉인 부적이 검을 지켰습니다", "");
      G.log(`🛡 봉인 부적 발동! +${lv} 검을 지켰습니다.`, "");
    } else if (res.kind === "break") {
      animateSword("cracked");
      sfx("break");
      vibrate([40, 40, 60]);
      showForgeToast("💥 검 파괴! +0으로…", "bad");
      G.log(`💥 +${res.from} 검이 부서졌습니다. 다시 벼리십시오.`, "fail");
      sparkle($("forgeVisual"), 6);
    }
    renderForge();
    renderHeader(false);
    renderCodex();
    if (G.battle) updateBattleFrame();
  }

  /* ===============================================================
     사냥 시작 / 결과
     =============================================================== */
  function challenge(key) {
    const stage = G.stageByKey(key);
    const r = G.startBattle(key);
    if (!r.ok) {
      toast(r.reason === "locked" ? "아직 봉인된 구역입니다" : "사냥을 시작할 수 없습니다", "bad", "🔒");
      return;
    }
    battleKey = "";
    enterBattleFocus(!!(stage && stage.isBoss));
    switchTab("hunt");
    renderHunt();
    renderHeader(true);
  }

  function nextAfterVictory(res) {
    const s = S();
    const next = G.nextStage(res.stage.key);
    if (s.settings.autoAdvance !== false && next && G.stageReached(next)) return next;
    if (s.settings.autoRepeat) return res.stage;
    return null;
  }

  function onVictory(res) {
    battleKey = "";
    exitBattleFocus();
    renderAll();
    sfx("win");
    vibrate([20, 40, 20]);
    const first = res.first;
    const follow = nextAfterVictory(res);
    const boss = res.boss;

    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">${boss ? "👑" : first ? "🎉" : "🌟"}</div>
        <h3>${boss ? "지배자 격파" : "구역 정복"}</h3>
        <p class="modal-sub">${res.stage.label} ${res.stage.name}${boss ? "의 지배자를 베었습니다." : (first ? " · 새로운 구역이 열렸습니다." : ` · ${res.cleared}번째 정복입니다.`)}</p>
      </div>
      <div class="modal-body">
        <div class="reward-grid">
          <div class="reward-cell"><div class="rc-ico">🪙</div><div class="rc-val">${G.fmtShort(res.gold)}</div><div class="rc-name">골드</div></div>
          <div class="reward-cell"><div class="rc-ico">💎</div><div class="rc-val">${res.stones}</div><div class="rc-name">강화석</div></div>
          <div class="reward-cell"><div class="rc-ico">🔮</div><div class="rc-val">${res.frags}</div><div class="rc-name">유물조각</div></div>
        </div>
        ${boss ? `<div class="modal-list"><div class="ml-row"><span>지배자 전리품</span><b>유물 파편 대량 획득</b></div></div>` : ""}
        ${res.unlockedNext ? `<div class="modal-list"><div class="ml-row"><span>새 구역</span><b>${res.unlockedNext.label} ${res.unlockedNext.name}</b></div></div>` : ""}
      </div>
      <div class="modal-actions cols">
        <button class="btn btn-ghost" id="mvStop">대장간으로</button>
        <button class="btn btn-primary" id="mvAgain">${follow && follow.key !== res.stage.key ? "다음 구역" : "한 번 더"}</button>
      </div>`,
      {
        onMount() {
          $("mvStop").onclick = () => { closeModal(); renderAll(); };
          const go = () => {
            clearInterval(repeatTimer); clearTimeout(repeatTimer); repeatTimer = null;
            closeModal();
            challenge(follow ? follow.key : res.stage.key);
          };
          $("mvAgain").onclick = go;
          if (follow && (S().settings.autoAdvance || S().settings.autoRepeat)) {
            let left = 2;
            const btn = $("mvAgain");
            const base = btn.textContent;
            btn.textContent = `${base} (${left})`;
            repeatTimer = setInterval(() => {
              left -= 1;
              if (left <= 0) { repeatTimer && clearInterval(repeatTimer); repeatTimer = null; go(); return; }
              if (btn) btn.textContent = `${base} (${left})`;
            }, 1000);
          }
        }
      }
    );
  }

  function onDefeat(res) {
    battleKey = "";
    exitBattleFocus();
    renderAll();
    sfx("fail");
    vibrate(60);
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">💫</div>
        <h3>쓰러졌습니다…</h3>
        <p class="modal-sub">${res.stage.label} ${res.stage.name}의 존재가 너무 강했습니다.<br />체력은 35%까지 회복했습니다.</p>
      </div>
      <div class="modal-body">
        <div class="tip-box">💡 대장간에서 검을 벼리거나 유물로 공격력을 올리십시오. 강타는 '방어', 돌진은 '회피', 보호막은 '카운터'로 받아내면 훨씬 안전합니다.</div>
      </div>
      <div class="modal-actions cols">
        <button class="btn btn-ghost" id="mdForge">대장간</button>
        <button class="btn btn-primary" id="mdAgain">다시 도전</button>
      </div>`,
      {
        onMount() {
          $("mdForge").onclick = () => { closeModal(); switchTab("forge"); };
          $("mdAgain").onclick = () => { closeModal(); challenge(res.stage.key); };
        }
      }
    );
  }

  /* ===============================================================
     오프라인 · 환영 · 저장 백업
     =============================================================== */
  function onOffline(reward) {
    const mins = Math.floor(reward.seconds / 60);
    const timeText = reward.seconds < 3600 ? `${Math.max(1, mins)}분` : `${Math.floor(reward.seconds / 3600)}시간 ${mins % 60}분`;
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">🌙</div>
        <h3>돌아오셨군요.</h3>
        <p class="modal-sub">${timeText} 동안 심연의 잔재들이 무언가를 모아두었습니다.<br />(최대 ${reward.hours.toFixed(1)}시간)</p>
      </div>
      <div class="modal-body">
        <div class="reward-grid">
          <div class="reward-cell"><div class="rc-ico">🪙</div><div class="rc-val">${G.fmtShort(reward.gold)}</div><div class="rc-name">골드</div></div>
          <div class="reward-cell"><div class="rc-ico">💎</div><div class="rc-val">${reward.stones}</div><div class="rc-name">강화석</div></div>
          <div class="reward-cell"><div class="rc-ico">🌱</div><div class="rc-val">${G.fmtShort(reward.exp)}</div><div class="rc-name">경험치</div></div>
        </div>
        <div class="tip-box" style="margin-top:10px;">⏳ 월식 모래시계 유물을 올리면 더 많이, 더 오래 모입니다.</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="moOk">받아들이겠습니다</button>
      </div>`,
      { onMount() { $("moOk").onclick = () => { closeModal(); sfx("coin"); renderAll(); }; } }
    );
  }

  function showWelcome() {
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">⚔</div>
        <h3>심연의 대장간에 발을 들였습니다.</h3>
        <p class="modal-sub">저주받은 성검을 벼리고 15개의 황폐한 세계를 베어 나가십시오.</p>
      </div>
      <div class="welcome-tips">
        <div class="welcome-tip"><div class="wt-ico">⚒️</div><div><b>망치질</b><p>+0에서 +25까지. 실패하면 내려가고, +10강부터는 부서질 수 있습니다.</p></div></div>
        <div class="welcome-tip"><div class="wt-ico">⚔️</div><div><b>사냥</b><p>화면의 '공격' 버튼이나 몬스터를 직접 눌러 벱니다. 스킬창에서 기술을 씁니다.</p></div></div>
        <div class="welcome-tip"><div class="wt-ico">👁️</div><div><b>지배자</b><p>X-10, X-15는 지배자의 방. 아래 방어·회피·카운터 버튼으로 패턴을 받아냅니다.</p></div></div>
        <div class="welcome-tip"><div class="wt-ico">💾</div><div><b>자동 저장</b><p>모든 진행은 자동으로 저장됩니다. 앱을 닫아도 이어집니다.</p></div></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" id="mwStart">서약한다</button>
      </div>`,
      {
        closable: false,
        onMount() {
          $("mwStart").onclick = () => {
            S().welcomeSeen = true;
            G.save();
            closeModal();
            sfx("success");
            switchTab("hunt");
          };
        }
      }
    );
  }

  function openExportModal() {
    const text = G.exportSave();
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">💾</div>
        <h3>저장 데이터 내보내기</h3>
        <p class="modal-sub">아래 내용을 복사해 보관하거나 파일로 저장하세요.</p>
      </div>
      <div class="modal-body">
        <textarea id="exportText" readonly>${text.replace(/</g, "&lt;")}</textarea>
        <div class="modal-actions">
          <button class="btn btn-primary" id="doDownload">파일로 저장</button>
          <button class="btn btn-ghost" id="doCopy">복사하기</button>
        </div>
      </div>`,
      {
        onMount() {
          $("doDownload").onclick = () => {
            try {
              const blob = new Blob([text], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `mongle-forge-save-${new Date().toISOString().slice(0, 10)}.json`;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
              toast("저장 파일을 내려받았어요", "good", "💾");
            } catch (e) {
              toast("다운로드가 막혀 있어요. 내용을 복사해 주세요", "bad", "📋");
            }
          };
          $("doCopy").onclick = () => {
            const ta = $("exportText");
            ta.select();
            try {
              navigator.clipboard.writeText(text).then(
                () => toast("복사했어요!", "good", "📋"),
                () => toast("길게 눌러 직접 복사해 주세요", "bad", "📋")
              );
            } catch (e) { toast("길게 눌러 직접 복사해 주세요", "bad", "📋"); }
          };
        }
      }
    );
  }

  function openImportModal() {
    openModal(
      `<div class="modal-hero">
        <div class="modal-emoji">📥</div>
        <h3>저장 데이터 불러오기</h3>
        <p class="modal-sub">백업한 JSON을 붙여넣거나 파일을 골라 주세요.<br />지금 진행은 덮어써져요.</p>
      </div>
      <div class="modal-body">
        <textarea id="importText" placeholder="여기에 저장 데이터를 붙여넣으세요"></textarea>
        <div class="file-row"><input type="file" id="importFile" accept=".json,application/json" /></div>
        <div class="modal-actions cols">
          <button class="btn btn-ghost" id="miCancel">취소</button>
          <button class="btn btn-primary" id="miOk">불러오기</button>
        </div>
      </div>`,
      {
        onMount() {
          $("miCancel").onclick = closeModal;
          $("importFile").addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { $("importText").value = String(reader.result || ""); };
            reader.readAsText(file);
          });
          $("miOk").onclick = () => {
            const text = $("importText").value.trim();
            if (!text) { toast("저장 데이터를 넣어 주세요", "bad", "📥"); return; }
            const r = G.importSave(text);
            if (!r.ok) { toast(r.reason, "bad", "😢"); return; }
            closeModal();
            battleKey = "";
            forgeSwordLevel = null;
            renderAll();
            toast("저장 데이터를 불러왔어요!", "good", "✨");
            switchTab("hunt");
          };
        }
      }
    );
  }

  /* ===============================================================
     코어 이벤트
     =============================================================== */
  function bindGameEvents() {
    const onKill = { _ct: null };
    G.bus.on("battle:start", () => {
      battleKey = "";
      hidePattern();
      renderHunt();
    });

    G.bus.on("battle:enemy", (p) => {
      $("enemyFighter").classList.remove("dead");
      hidePattern();
      renderEnemySprite();
      if (p.boss) { /* 보스 등장은 패턴 패널이 알려줘요 */ }
      updateBattleFrame();
    });

    G.bus.on("battle:damage", (p) => {
      if (p.target === "enemy") {
        floatNum($("enemySprite"), String(p.amount), (p.crit ? "crit " : "") + (p.skill ? "skill" : ""), p.crit ? "CRIT!" : "");
        const hf = $("heroFighter");
        hf.classList.remove("attack"); void hf.offsetWidth; hf.classList.add("attack");
        const ef = $("enemyFighter");
        ef.classList.remove("hit"); void ef.offsetWidth; ef.classList.add("hit");
        setTimeout(() => { hf.classList.remove("attack"); ef.classList.remove("hit"); }, 360);
        sfx(p.crit ? "crit" : "hit");
        if (p.crit) { vibrate(14); sparkle($("enemySprite"), 4); }
        if (p.shielded) toast("보호막이 공격을 막고 있어요! 카운터를 노려요", "", "🛡️");
        updateBattleFrame();
      } else {
        floatNum($("heroSprite"), "-" + p.amount, "hero");
        const hf = $("heroFighter");
        hf.classList.remove("hurt"); void hf.offsetWidth; hf.classList.add("hurt");
        setTimeout(() => hf.classList.remove("hurt"), 340);
        updateBattleFrame();
      }
    });

    G.bus.on("battle:heal", (p) => {
      floatNum($("heroSprite"), "+" + p.amount, "heal");
      sparkle($("heroSprite"), 3);
      updateBattleFrame();
    });

    G.bus.on("battle:kill", (p) => {
      $("enemyFighter").classList.add("dead");
      dropCoins($("enemySprite"), p.boss ? 7 : 3);
      floatNum($("enemySprite"), "+" + G.fmt(p.gold) + "G", "coin");
      if (p.boss) { sparkle($("enemySprite"), 12); sfx("epic"); }
      if (p.frags > 0) { floatNum($("enemySprite"), "🔮" + p.frags, "coin"); toast(`유물 조각 +${p.frags}!`, "epic", "🔮"); }
      if (p.combo >= 3) {
        const chip = $("comboChip");
        chip.textContent = `연속 ${p.combo}!`;
        chip.classList.add("show");
        clearTimeout(onKill._ct);
        onKill._ct = setTimeout(() => chip.classList.remove("show"), 1200);
      }
      sfx("coin");
      setCoin("goldTop", S().gold);
      setCoin("stoneTop", S().stones);
      setCoin("fragTop", S().relFrags);
    });

    G.bus.on("battle:wave", () => {
      updateBattleFrame();
    });

    G.bus.on("battle:victory", (res) => { onVictory(res); });
    G.bus.on("battle:defeat", (res) => { onDefeat(res); });

    // 보스 패턴
    G.bus.on("battle:pattern", (p) => {
      showPattern(p.pattern, p.phase, p.total);
      vibrate([10, 30, 10]);
    });
    G.bus.on("battle:patternTick", (p) => {
      updatePatternUI(p.timer, p.total, p.responded);
    });
    G.bus.on("battle:respond", () => {
      $("patternPanel").classList.add("responded");
      $("enemyFighter").classList.remove("telegraph");
      renderReactBar();
    });
    G.bus.on("battle:patternResolve", (p) => {
      hidePattern();
      if (p.responded) {
        const label = p.pattern.action === "guard" ? "완벽한 방어!" : "완벽한 회피!";
        floatNum($("heroSprite"), label, "heal");
        sparkle($("heroSprite"), 5);
        toast(label + " 피해를 줄였어요", "good", "🛡️");
      } else if (p.dmg > 0) {
        floatNum($("heroSprite"), "-" + p.dmg, "hero");
        vibrate(40);
        toast(`${p.pattern.name}에 맞았어요! 다음엔 꼭 대응해요`, "bad", "💥");
      }
      updateBattleFrame();
    });
    G.bus.on("battle:patternEnd", () => { hidePattern(); });
    G.bus.on("battle:counter", (p) => {
      floatNum($("enemySprite"), String(p.dmg), "crit", "COUNTER!");
      sparkle($("enemySprite"), 8);
      toast("보호막을 깼어요!", "epic", "⚡");
      updateBattleFrame();
    });
    G.bus.on("battle:enrage", () => {
      $("enemyFighter").classList.add("enraged");
      toast("보스가 격노했어요! 공격이 빨라져요", "bad", "🔥");
      vibrate([20, 40, 20]);
      sfx("warn");
    });

    G.bus.on("forge:result", () => { renderCodex(); renderRelics(); });
    G.bus.on("forge:sell", () => showForgeToast("판매 완료!", "good"));

    G.bus.on("hero:levelup", (p) => {
      sfx("levelup");
      vibrate([16, 30, 16]);
      showLevelUp(p.level);
      toast(`영웅 Lv.${p.level} 달성!`, "epic", "🌱");
      renderHeader(true);
      if (G.battle) renderBattleChrome();
      renderCodex();
    });

    G.bus.on("skill:unlock", (sk) => {
      toast(`새 스킬 [${sk.name}] 해금!`, "epic", sk.icon);
      if (G.battle) renderSkillBar();
    });

    G.bus.on("codex:new", () => {
      renderCodex();
    });

    G.bus.on("achievement:ready", () => { renderCodex(); });
    G.bus.on("achievement:claim", () => { renderHeader(false); });
    G.bus.on("offline:reward", (r) => { onOffline(r); });
    G.bus.on("relic:unlock", (p) => { toast(`유물 [${p.relic.name}] 해금!`, "epic", "🔮"); });
    G.bus.on("relic:level", () => { sfx("success"); });

    G.bus.on("save", () => {
      const info = $("saveInfo");
      if (info && currentPanel === "settings") info.textContent = `마지막 저장: ${new Date().toLocaleTimeString("ko-KR")} · 자동 저장 켜짐 · v${G.VERSION}`;
    });

    G.bus.on("log", () => { renderLog(); });
  }

  /* ===============================================================
     메인 루프
     =============================================================== */
  function startLoop() {
    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 1.5) dt = 1.5;
      if (dt < 0) dt = 0;
      try {
        G.tick(dt);
        if (G.battle) updateBattleFrame();
        setCoin("goldTop", S().gold);
        setCoin("stoneTop", S().stones);
        setCoin("fragTop", S().relFrags);
        const st = G.heroStats();
        $("heroHpFill").style.width = Math.max(0, Math.min(100, (S().hero.hp / st.maxHp) * 100)) + "%";
        $("heroHpText").textContent = `${Math.round(S().hero.hp)} / ${st.maxHp}`;
        updateBattleMini();
        if (!G.battle) refreshAffordability();
      } catch (e) {
        console.error("[loop]", e);
      }
    }, 100);
  }

  function refreshAffordability() {
    const s = S();
    const lv = s.weapon.level;
    if (lv >= G.MAX_LV) return;
    const cost = G.enhanceCost(lv) + (s.weapon.protect && lv >= G.FORGE.breakStartLv ? G.protectCost(lv) : 0);
    const disabled = s.gold < cost;
    if ($("enhanceBtn").disabled !== disabled) {
      $("enhanceBtn").disabled = disabled;
      $("enhanceMain").textContent = disabled ? "🪙 골드 부족" : (s.weapon.pity >= 100 ? "🌑 원한 폭발!" : "⚒ 망치질");
    }
  }

  /* ===============================================================
     시작
     =============================================================== */
  function start() {
    G.boot();
    if (window.VFX && $("vfxCanvas")) VFX.init($("vfxCanvas"));
    bindEvents();
    bindGameEvents();
    renderAll();
    renderHeader(true);

    currentWorld = 1;
    if (S().progress.maxStage > 1) {
      const cur = G.STAGES.find((x) => x.index === S().progress.maxStage);
      if (cur) currentWorld = cur.world;
    }
    renderStagePicker();
    renderJourney();
    startLoop();
    switchTab("hunt");

    window.addEventListener("resize", () => {
      document.querySelectorAll(".tab-page").forEach((p) => { p.scrollTop = 0; });
      const vp = document.querySelector(".viewport");
      if (vp) vp.scrollTop = 0;
    });

    const reward = G.collectOffline();
    if (!reward && !S().welcomeSeen) showWelcome();
    else if (reward) renderAll();

    setInterval(() => G.save(), 5000);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) G.save();
      else {
        const reward = G.collectOffline();
        renderAll();
        if (!reward) renderHeader(true);
      }
    });
    window.addEventListener("pagehide", () => G.save());
    window.addEventListener("beforeunload", () => G.save());

    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $("installBanner").classList.add("show");
    });
    $("installBtn").addEventListener("click", async () => {
      if (!deferredPrompt) {
        toast("브라우저 메뉴의 '홈 화면에 추가'를 눌러 주세요", "", "📱");
        return;
      }
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (e) {}
      deferredPrompt = null;
      $("installBanner").classList.remove("show");
    });

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
