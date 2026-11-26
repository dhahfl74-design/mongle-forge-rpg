/* =====================================================================
   심연의 대장간 — 강화 · 수집 · 상자깡 특화 (v5.0)
   데이터: 15세계 180구역 · 6등급 · 4부위 72종 장비 도감 · 강화/연구/유물
   ===================================================================== */
(function () {
  "use strict";
  const G = (window.GAME = window.GAME || {});

  G.VERSION = "5.0.0";
  G.SAVE_KEY = "mongle_forge_v5";
  G.LEGACY_KEYS = ["mongle_forge_save_v2", "sword_enhancer_app_save_v1"];

  /* ---------------- 등급 ---------------- */
  /* mult: 공격력 배수 · weight: 기본 등장 가중치 · salvage: 분해 보상 계수 */
  G.RARITY = [
    { key: "normal", name: "일반", color: "#a9b4c6", deep: "#4c5666", beam: "rgba(190,202,220,0.45)", mult: 1.0, weight: 50, salvage: 1 },
    { key: "uncommon", name: "고급", color: "#5fdc97", deep: "#1d5a3a", beam: "rgba(95,220,151,0.7)", mult: 1.38, weight: 27, salvage: 1.6 },
    { key: "rare", name: "희귀", color: "#5aa9ff", deep: "#1a3f77", beam: "rgba(90,169,255,0.8)", mult: 1.9, weight: 13.5, salvage: 2.6 },
    { key: "epic", name: "영웅", color: "#b57cff", deep: "#4a2680", beam: "rgba(181,124,255,0.85)", mult: 2.62, weight: 6.2, salvage: 4.2 },
    { key: "legend", name: "전설", color: "#ffb631", deep: "#7a4a06", beam: "rgba(255,182,49,1)", mult: 3.6, weight: 2.5, salvage: 7 },
    { key: "myth", name: "신화", color: "#ff4f74", deep: "#7d0f27", beam: "rgba(255,79,116,1)", mult: 5.0, weight: 0.8, salvage: 12 }
  ];
  G.RARITY_BY_KEY = {};
  G.RARITY.forEach((r, i) => { r.idx = i; G.RARITY_BY_KEY[r.key] = r; });

  /* ---------------- 부위 ---------------- */
  G.SLOTS = [
    { key: "weapon", name: "무기", icon: "sword", mult: 1.42, main: "공격력" },
    { key: "helm", name: "투구", icon: "helm", mult: 0.82, main: "공격력" },
    { key: "armor", name: "갑옷", icon: "armor", mult: 0.9, main: "공격력" },
    { key: "ring", name: "장신구", icon: "ring", mult: 0.74, main: "공격력" }
  ];
  G.SLOT_BY_KEY = {};
  G.SLOTS.forEach((s) => { G.SLOT_BY_KEY[s.key] = s; });

  /* ---------------- 장비 72종 (4부위 × 6등급 × 3종) ---------------- */
  const NAMES = {
    weapon: {
      normal: ["녹슨 파편검", "잿빛 하급검", "균열한 철검"],
      uncommon: ["검은 못 장검", "피묻은 세이버", "월광 문장검"],
      rare: ["서리 서약검", "심판의 집행검", "룬 수호검"],
      epic: ["천둥 심판검", "심연의 비명검", "용의 비늘검"],
      legend: ["몰락 왕의 금검", "영겁의 세라프검", "세계수의 저주검"],
      myth: ["종말의 흑성검", "전설의 대장장이 검", "종말의 성검"]
    },
    helm: {
      normal: ["낡은 가죽 투구", "뼈 조각 투구", "재투성이 두건"],
      uncommon: ["철못 투구", "사냥꾼의 후드", "잿빛 관모"],
      rare: ["서리 서약 투구", "룬 수호 관", "심판의 투구"],
      epic: ["천둥 뿔투구", "용비늘 투구", "비명의 가면"],
      legend: ["몰락 왕의 관", "세라프의 후광", "세계수의 관"],
      myth: ["종말의 왕관", "심연의 성관", "영겁의 별관"]
    },
    armor: {
      normal: ["찢긴 사슬 갑옷", "재묻은 가죽 갑옷", "녹슨 흉갑"],
      uncommon: ["철못 판금", "잿빛 망토", "사냥꾼의 조끼"],
      rare: ["서리 서약 갑주", "룬 수호 판금", "심판의 예복"],
      epic: ["천둥 심판 갑주", "용비늘 갑주", "비명의 망토"],
      legend: ["몰락 왕의 갑주", "세라프의 깃갑", "세계수의 수피갑"],
      myth: ["종말의 흑갑", "심연의 성갑", "영겁의 별갑"]
    },
    ring: {
      normal: ["녹슨 반지", "뼈 고리", "잿가루 부적"],
      uncommon: ["철못 인장", "사냥꾼의 부적", "잿빛 목걸이"],
      rare: ["서리 서약 인장", "룬 수호 목걸이", "심판의 성표"],
      epic: ["천둥 심판 인장", "용의 눈 목걸이", "비명의 성흔"],
      legend: ["몰락 왕의 옥새", "세라프의 성표", "세계수의 열매"],
      myth: ["종말의 흑성", "심연의 성흔", "영겁의 별"]
    }
  };

  G.ITEMS = [];
  G.ITEMS_BY_ID = {};
  G.ITEMS_BY_SLOT = {};
  G.SLOTS.forEach((slot) => {
    G.ITEMS_BY_SLOT[slot.key] = [];
    G.RARITY.forEach((rar) => {
      NAMES[slot.key][rar.key].forEach((name, i) => {
        const id = slot.key + ":" + rar.key + ":" + (i + 1);
        const item = {
          id: id, name: name, slot: slot.key,
          slotName: slot.name, rarity: rar.key, rarityName: rar.name,
          icon: slot.icon, idx: G.ITEMS.length
        };
        G.ITEMS.push(item);
        G.ITEMS_BY_ID[id] = item;
        G.ITEMS_BY_SLOT[slot.key].push(item);
      });
    });
  });
  G.TOTAL_ITEMS = G.ITEMS.length; // 72

  /* ---------------- 하위 옵션 ---------------- */
  G.SUBS = {
    crit: { key: "crit", name: "치명타 확률", icon: "🎯", fmt: (v) => "+" + v.toFixed(1) + "%", weight: 3, cap: 6.5 },
    critDmg: { key: "critDmg", name: "치명타 피해", icon: "💥", fmt: (v) => "+" + Math.round(v) + "%", weight: 3, cap: 60 },
    bossDmg: { key: "bossDmg", name: "보스 피해", icon: "👑", fmt: (v) => "+" + Math.round(v) + "%", weight: 2.4, cap: 45 },
    gold: { key: "gold", name: "골드 획득", icon: "🪙", fmt: (v) => "+" + Math.round(v) + "%", weight: 2.2, cap: 40 }
  };

  /* ---------------- 세계 15개 ---------------- */
  G.WORLDS = [
    { id: 1, name: "잿빛 황야", emoji: "🌫️", sub: 10, tint: "#8b93a8", desc: "재가 되어 버린 옛 초원. 썩은 점액이 뒹굽니다.", mobs: ["부패한 점액", "뼈토끼"], boss: "썩은 왕 점액" },
    { id: 2, name: "곰팡이 숲", emoji: "🍄", sub: 10, tint: "#7ea889", desc: "포자가 눈처럼 흩날리는 저주받은 숲.", mobs: ["버섯 망령", "도토리 도굴꾼"], boss: "버섯 군주" },
    { id: 3, name: "핏빛 목장", emoji: "🩸", sub: 10, tint: "#c06a7d", desc: "붉은 안개가 깔린 도살장. 짐승의 울음이 남아 있습니다.", mobs: ["가시 양", "독침 벌"], boss: "핏덩이 골렘" },
    { id: 4, name: "잿구름 고원", emoji: "☁️", sub: 10, tint: "#7e9dc4", desc: "죽은 자의 재로 된 구름이 흐르는 고원.", mobs: ["재구름", "유성 파편"], boss: "아귀 고래" },
    { id: 5, name: "성흔 동굴", emoji: "✨", sub: 10, tint: "#a08ede", desc: "별이 죽어 빛나는 동굴. 혼불이 길을 잃고 떠돕니다.", mobs: ["혼불", "동굴 흡혈귀"], boss: "수정 갑각" },
    { id: 6, name: "유리 성당", emoji: "🦋", sub: 10, tint: "#b18cd6", desc: "깨진 성화가 흐느끼는 유리 성당.", mobs: ["유리 나비", "가시 덩굴"], boss: "성상의 여왕" },
    { id: 7, name: "월식 사원", emoji: "🌘", sub: 10, tint: "#8f8ad0", desc: "달이 핏빛으로 잠긴 사원. 그림자가 기도합니다.", mobs: ["월식 토끼", "그림자 고양이"], boss: "월식의 수호신" },
    { id: 8, name: "잿가루 협곡", emoji: "🪨", sub: 10, tint: "#c98d62", desc: "검게 탄 뼛가루가 강처럼 흐르는 협곡.", mobs: ["뼛가루 골렘", "타르 점액"], boss: "화산 뼈룡" },
    { id: 9, name: "하늘 성소", emoji: "🕊️", sub: 10, tint: "#8fd0df", desc: "무너진 성소가 구름 위에 떠 있는 곳.", mobs: ["타락한 요정", "눈먼 양"], boss: "재의 불사조" },
    { id: 10, name: "악몽의 성채", emoji: "🏰", sub: 15, tint: "#a678e0", desc: "성검이 잠든 첫 번째 시험. 마왕의 옥좌가 기다립니다.", mobs: ["악몽 유령", "그림자 기사"], boss: "심연의 마왕" },
    { id: 11, name: "성에 설원", emoji: "❄️", sub: 15, tint: "#9cc6e8", desc: "별가루가 눈처럼 내려 쌓인 얼어붙은 설원.", mobs: ["눈꽃 망령", "서리 갑각충"], boss: "빙결의 여왕" },
    { id: 12, name: "썩은 빛의 못", emoji: "🌊", sub: 15, tint: "#6fc3b4", desc: "무지개가 썩어 흐르는 검은 호수.", mobs: ["물방울 정령", "비늘 잉어"], boss: "심연의 수룡" },
    { id: 13, name: "멈춘 시계탑", emoji: "⏳", sub: 15, tint: "#d5b573", desc: "태엽이 멈춘 탑. 시간이 우는 소리가 들립니다.", mobs: ["톱니 골렘", "예언의 부엉이"], boss: "태엽 수호자" },
    { id: 14, name: "쇳물 공장", emoji: "🔥", sub: 15, tint: "#e08a5c", desc: "쇳물과 재가 강처럼 흐르는 저주받은 공장.", mobs: ["잿병아리", "쇳물 인형"], boss: "재의 군주" },
    { id: 15, name: "종말의 성전", emoji: "👑", sub: 15, tint: "#e8c46a", desc: "저주받은 성검이 잠든 마지막 성전.", mobs: ["성검의 망령", "종말의 그림자"], boss: "성검의 지배자" }
  ];
  G.WORLD_BY_ID = {};
  G.WORLDS.forEach((w) => { G.WORLD_BY_ID[w.id] = w; });

  const BOSS_ART = { 1: "demon", 2: "knight", 3: "dragon", 4: "demon", 5: "knight", 6: "demon", 7: "knight", 8: "dragon", 9: "demon", 10: "demon", 11: "knight", 12: "dragon", 13: "knight", 14: "dragon", 15: "demon" };
  const MOB_ART = { 1: "undead", 2: "fiend", 3: "undead", 4: "fiend", 5: "undead", 6: "fiend", 7: "undead", 8: "fiend", 9: "undead", 10: "fiend", 11: "undead", 12: "fiend", 13: "undead", 14: "fiend", 15: "undead" };

  /* ---------------- 180구역 ---------------- */
  G.STAGES = [];
  (function build() {
    let i = 0;
    G.WORLDS.forEach((w) => {
      for (let s = 1; s <= w.sub; s++) {
        i += 1;
        const boss = s === w.sub;
        G.STAGES.push({
          i: i, world: w.id, sub: s, key: w.id + "-" + s, label: w.id + "-" + s,
          isBoss: boss, worldName: w.name, subCount: w.sub,
          name: boss ? w.boss : w.mobs[(s - 1) % w.mobs.length],
          mobName: w.mobs[(s - 1) % 2],
          mobCount: boss ? 1 : 6,
          art: boss ? "assets/boss-" + BOSS_ART[w.id] + ".png" : "assets/monster-" + MOB_ART[w.id] + ".png",
          tint: w.tint, emoji: w.emoji,
          scale: Math.pow(1.152, i - 1)
        });
      }
    });
  })();
  G.TOTAL_STAGES = G.STAGES.length;
  G.stageByIndex = (i) => G.STAGES[Math.max(0, Math.min(G.TOTAL_STAGES - 1, i - 1))];
  G.stageByKey = (k) => G.STAGES.find((s) => s.key === k) || null;
  G.bossOfWorld = (wid) => G.STAGES.find((s) => s.world === wid && s.isBoss) || null;

  /* ---------------- 밸런스 ---------------- */
  G.BAL = {
    recPower: (S, i) => 34 * S * (1 + 0.045 * ((i || 1) - 1)),   // 구역 권장 전투력
    enemyHp: (S, boss, i) => (boss ? 400 * 6.4 : 400) * S * (1 + 0.045 * ((i || 1) - 1)),
    enemyAtk: (S, boss) => (boss ? 6.4 : 2.2) * S,
    enemyInterval: (boss) => (boss ? 1.5 : 1.9),
    goldPerKill: (S, boss) => Math.round((12 * Math.pow(S, 1.0)) * (boss ? 24 : 1)),
    expPerKill: (S, boss) => Math.round((8 * Math.pow(S, 0.6)) * (boss ? 10 : 1)),
    keyChance: 0.26,
    stoneChance: 0.05,
    fragBoss: 6,
    heroHp: (atk, lv) => Math.round(300 + lv * 26 + atk * 1.1),
    heroBaseAtk: (lv) => 8 + (lv - 1) * 2.6,
    heroRegen: 0.035,
    respawnSec: 3.2,
    killGap: 0.34
  };

  /* ---------------- 강화 ---------------- */
  G.ENH = {
    max: 20,
    step: 0.075, // +1당 해당 장비 공격력 +7.5%
    costBase: 130,
    costGrowth: 1.34,
    success(lv, research) {
      const table = [100, 96, 92, 87, 82, 77, 71, 65, 59, 53, 47, 41, 36, 31, 27, 23, 20, 17, 14, 11];
      const base = table[Math.max(0, Math.min(19, lv))];
      return Math.max(6, Math.min(100, base + research * 1.2));
    },
    downChance(lv) { return lv >= 5 ? 0.42 : 0; },
    breakChance(lv) { return lv >= 10 ? Math.min(0.26, 0.05 + (lv - 10) * 0.028) : 0; },
    pityGain(lv) { return Math.round(11 + lv * 1.3); },
    sealCost: (lv) => 1
  };
  G.enhCost = function (item, lv) {
    const l = lv == null ? (item ? item.lv : 0) : lv;
    return Math.round((G.ENH.costBase + (item ? item.atk * 1.7 : 0)) * Math.pow(G.ENH.costGrowth, l));
  };

  /* ---------------- 상자 ---------------- */
  G.CHEST = {
    maxLv: 20,
    levelCost: (lv) => Math.round(900 * Math.pow(1.55, lv - 1)),
    levelStones: (lv) => (lv >= 10 ? 12 : lv >= 5 ? 5 : 1),
    // 상자 레벨이 오르면 고등급 가중치가 커진다
    weights(lv) {
      const boost = (lv - 1) * 0.11;
      return G.RARITY.map((r, i) => {
        if (i === 0) return Math.max(6, r.weight - boost * 46);
        return r.weight * (1 + boost * i * 1.15);
      });
    },
    keyPrice: 950,
    keyPrice10: 8500,
    pullAutoDelay: 900
  };

  /* ---------------- 분해 ---------------- */
  G.salvage = function (item) {
    const S = item.stageScale || 1;
    const r = G.RARITY_BY_KEY[item.rarity];
    return {
      gold: Math.round((30 + item.baseAtk * 2.4) * r.salvage),
      stones: Math.max(0, Math.round((r.idx - 2) * 1.3 + (Math.random() < 0.18 ? 1 : 0))),
      exp: Math.round((6 + item.baseAtk * 0.5) * r.salvage)
    };
  };

  /* ---------------- 연구 ---------------- */
  G.RESEARCH = [
    { key: "atk", name: "모루 각인", icon: "⚒", desc: "모든 장비 공격력 +5%", base: 900, mult: 1.85, max: 20 },
    { key: "crit", name: "예리한 눈", icon: "🎯", desc: "치명타 확률 +1.2%p · 강화 성공률 +1.2%p", base: 1200, mult: 1.9, max: 15 },
    { key: "key", name: "열쇠 연마", icon: "🔑", desc: "열쇠 획득 확률 +6%p", base: 1100, mult: 1.8, max: 15 },
    { key: "gold", name: "황금 손길", icon: "🪙", desc: "골드 획득 +9%", base: 800, mult: 1.75, max: 20 }
  ];
  G.researchCost = function (cfg, lv) {
    return Math.round(cfg.base * Math.pow(cfg.mult, lv));
  };

  /* ---------------- 유물 ---------------- */
  G.RELICS = [
    { id: "flag", name: "전몰자의 군기", icon: "🏴", desc: "공격력 +5%/lv", stat: "atk", effect: 5, max: 12, frag: 3 },
    { id: "clover", name: "저주받은 네잎", icon: "🍀", desc: "치명타 확률 +0.8%p/lv", stat: "crit", effect: 0.8, max: 12, frag: 3 },
    { id: "key", name: "해골 열쇠", icon: "🗝️", desc: "열쇠 획득 +8%/lv", stat: "key", effect: 8, max: 10, frag: 4 },
    { id: "heart", name: "핏빛 성심", icon: "🫀", desc: "최대 체력 +9%/lv", stat: "hp", effect: 9, max: 10, frag: 4 },
    { id: "anvil", name: "저주받은 모루", icon: "⚒️", desc: "강화 성공률 +1.5%p/lv", stat: "enh", effect: 1.5, max: 10, frag: 5 },
    { id: "hourglass", name: "월식 모래시계", icon: "⏳", desc: "오프라인 보상 +15%/lv", stat: "offline", effect: 15, max: 8, frag: 6 }
  ];
  G.RELICS.forEach((r) => { r.cost = (lv) => Math.round(r.frag * Math.pow(1.55, lv)); });

  /* ---------------- 업적 ---------------- */
  G.ACHIEVEMENTS = [
    { id: "pull1", icon: "🎁", name: "첫 상자", desc: "상자를 1회 엽니다", reward: { gold: 600, keys: 3 }, check: (s) => s.stats.pulls >= 1 },
    { id: "pull50", icon: "📦", name: "상자 중독", desc: "상자를 50회 엽니다", reward: { gold: 6000, keys: 15, stones: 4 }, check: (s) => s.stats.pulls >= 50 },
    { id: "pull300", icon: "🧨", name: "상자깡 장인", desc: "상자를 300회 엽니다", reward: { gold: 80000, keys: 60, stones: 30 }, check: (s) => s.stats.pulls >= 300 },
    { id: "epic1", icon: "🔮", name: "영웅 등장", desc: "영웅 등급 장비를 획득합니다", reward: { gold: 3000, keys: 8 }, check: (s) => (s.stats.bestRarity || 0) >= 3 },
    { id: "legend1", icon: "🌟", name: "전설의 손끝", desc: "전설 등급 장비를 획득합니다", reward: { gold: 15000, keys: 25, stones: 8 }, check: (s) => (s.stats.bestRarity || 0) >= 4 },
    { id: "myth1", icon: "🔥", name: "신화 개봉", desc: "신화 등급 장비를 획득합니다", reward: { gold: 120000, keys: 100, stones: 50 }, check: (s) => (s.stats.bestRarity || 0) >= 5 },
    { id: "enh5", icon: "🔨", name: "+5 강화", desc: "장비를 +5강까지 벼립니다", reward: { gold: 1500, stones: 3 }, check: (s) => s.stats.maxEnh >= 5 },
    { id: "enh10", icon: "🩸", name: "+10 강화", desc: "장비를 +10강까지 벼립니다", reward: { gold: 9000, stones: 10, frags: 4 }, check: (s) => s.stats.maxEnh >= 10 },
    { id: "enh15", icon: "🌒", name: "+15 강화", desc: "장비를 +15강까지 벼립니다", reward: { gold: 60000, stones: 30, frags: 14 }, check: (s) => s.stats.maxEnh >= 15 },
    { id: "enh20", icon: "👑", name: "+20 강화", desc: "장비를 +20강까지 벼립니다", reward: { gold: 400000, stones: 120, frags: 60 }, check: (s) => s.stats.maxEnh >= 20 },
    { id: "kill300", icon: "🐺", name: "황야의 사냥꾼", desc: "몬스터를 300마리 처치합니다", reward: { gold: 4000, keys: 10 }, check: (s) => s.stats.kills >= 300 },
    { id: "kill3000", icon: "🏹", name: "잿빛 학살자", desc: "몬스터를 3,000마리 처치합니다", reward: { gold: 45000, keys: 40, stones: 15 }, check: (s) => s.stats.kills >= 3000 },
    { id: "boss1", icon: "👁️", name: "첫 지배자", desc: "지배자를 1회 처치합니다", reward: { gold: 2500, keys: 10, frags: 3 }, check: (s) => s.stats.bossKills >= 1 },
    { id: "world5", icon: "🩸", name: "성흔을 건너서", desc: "세계 5의 지배자를 처치합니다", reward: { gold: 20000, keys: 30, stones: 10 }, check: (s) => !!s.progress.cleared["5-10"] },
    { id: "world10", icon: "🏰", name: "악몽의 성채 정복", desc: "세계 10의 지배자를 처치합니다", reward: { gold: 150000, keys: 80, frags: 25 }, check: (s) => !!s.progress.cleared["10-15"] },
    { id: "world15", icon: "⚔", name: "종말의 성검", desc: "세계 15의 마지막 지배자를 처치합니다", reward: { gold: 900000, keys: 200, stones: 150 }, check: (s) => !!s.progress.cleared["15-15"] },
    { id: "codex24", icon: "📖", name: "도감 수집가", desc: "도감을 24칸 채웁니다", reward: { gold: 8000, keys: 15 }, check: (s) => Object.keys(s.seen).length >= 24 },
    { id: "codex72", icon: "🏆", name: "심연 도감 마스터", desc: "도감 72칸을 모두 채웁니다", reward: { gold: 500000, keys: 150, stones: 100 }, check: (s) => Object.keys(s.seen).length >= G.TOTAL_ITEMS },
    { id: "chest10", icon: "🎚️", name: "상자 단련", desc: "상자 레벨 10을 달성합니다", reward: { gold: 25000, keys: 30, stones: 10 }, check: (s) => s.chest.lv >= 10 },
    { id: "lv30", icon: "🕯️", name: "서약자 Lv.30", desc: "서약자 레벨 30을 달성합니다", reward: { gold: 30000, keys: 25, stones: 10 }, check: (s) => s.hero.lv >= 30 },
    { id: "lv60", icon: "🖤", name: "서약자 Lv.60", desc: "서약자 레벨 60을 달성합니다", reward: { gold: 180000, keys: 70, frags: 20 }, check: (s) => s.hero.lv >= 60 }
  ];

  /* ---------------- 도감 완성 보상 ---------------- */
  G.CODEX_MILESTONES = [
    { id: "w_normal", slot: "weapon", rarity: "normal", name: "무기 · 일반", reward: { gold: 800, keys: 3 } },
    { id: "w_rare", slot: "weapon", rarity: "rare", name: "무기 · 희귀", reward: { gold: 12000, keys: 12 } },
    { id: "w_myth", slot: "weapon", rarity: "myth", name: "무기 · 신화", reward: { gold: 200000, keys: 80 } },
    { id: "h_all", slot: "helm", rarity: "all", name: "투구 전체", reward: { gold: 60000, stones: 25 } },
    { id: "a_all", slot: "armor", rarity: "all", name: "갑옷 전체", reward: { gold: 60000, stones: 25 } },
    { id: "r_all", slot: "ring", rarity: "all", name: "장신구 전체", reward: { gold: 60000, stones: 25 } },
    { id: "all_all", slot: "all", rarity: "all", name: "도감 완전 정복", reward: { gold: 800000, keys: 200, stones: 150 } }
  ];

  /* ---------------- 초보자 안내 4단계 ---------------- */
  G.TUTORIAL = [
    { id: "pull", tab: "chest", icon: "🎁", title: "첫 상자깡", goal: "상자를 1회 열기", hint: "가운데 [상자 열기]를 눌러보세요" },
    { id: "equip", tab: "chest", icon: "⚔", title: "첫 장비", goal: "개봉 카드에서 [장착] 누르기", hint: "장착하면 전투력이 바로 올라갑니다" },
    { id: "enhance", tab: "forge", icon: "⚒", title: "첫 망치질", goal: "모루에서 장비 1회 강화", hint: "모루 탭에서 [망치질]을 눌러보세요" },
    { id: "boss", tab: "stage", icon: "👑", title: "첫 지배자", goal: "1-10 지배자에게 도전해 격파", hint: "구역을 밀어 올려 [보스 도전]을 누르세요" }
  ];

  G.TIPS = [
    "상자 레벨을 올리면 전설·신화 등장 확률이 눈에 띄게 올라갑니다.",
    "같은 장비라도 등급이 높으면 기본 공격력이 최대 5배입니다.",
    "장착한 장비를 강화하면 그 장비의 공격력만 +9%씩 오릅니다.",
    "+5강부터 실패하면 단계가 내려가고, +10강부터는 장비가 부서질 수 있습니다.",
    "+10강부터 봉인 부적을 켜두면 파괴를 한 번 막아줍니다.",
    "장인의 원한 게이지가 100%가 되면 다음 강화는 반드시 성공합니다.",
    "도감에 새 장비를 등록할 때마다 영구 공격력 보너스가 쌓입니다.",
    "자동 분해 등급을 정해두면 낮은 등급은 손대지 않고 골드로 바뀝니다.",
    "지배자를 잡으면 열쇠와 유물 파편을 크게 줍습니다.",
    "자리를 비우면 오프라인 보상이 쌓입니다."
  ];
})();
