/* =====================================================================
   심연의 대장간: 저주받은 성검 — 게임 데이터 (v3.0 DARK FANTASY)
   세계 15개 · 원정 구역 180개 · 지배자 패턴
   ===================================================================== */
(function () {
  "use strict";

  const G = (window.GAME = window.GAME || {});

  G.VERSION = "4.0.0";
  G.SAVE_KEY = "mongle_forge_save_v2";      // 기존 저장과 호환 (v3·v4 저장은 자동 이전)
  G.LEGACY_KEYS = ["sword_enhancer_app_save_v1"];
  G.MAX_LV = 25;

  /* ---------------------------------------------------------------
     무기 — 저주받은 검 26단계
     --------------------------------------------------------------- */
  G.WEAPONS = [
    "녹슨 파편검", "잿빛 하급검", "균열한 철검", "검은 못 장검",
    "피묻은 세이버", "망자의 대검", "월광 문장검", "잿불 화염검",
    "서리 서약검", "심판의 집행검", "해골 황금검", "룬 수호검",
    "달의 저주검", "천둥 심판검", "심연의 비명검", "성운 절단검",
    "불사조의 잔해검", "용의 비늘검", "차원 균열검", "몰락 왕의 금검",
    "영겁의 세라프검", "심판자의 진혼곡", "세계수의 저주검", "종말의 흑성검",
    "전설의 대장장이 검", "종말의 성검 ✦"
  ];

  G.TIERS = [
    { min: 0, name: "녹슨 철", blade: "#7a6a58", blade2: "#b3a487", glow: "rgba(150,120,90,0.35)", bolt: "#4a3f34" },
    { min: 4, name: "잿빛 강철", blade: "#8f9aa8", blade2: "#cfd7e2", glow: "rgba(150,170,200,0.45)", bolt: "#5a6474" },
    { min: 8, name: "서리", blade: "#8fc4e8", blade2: "#dff2ff", glow: "rgba(120,190,240,0.6)", bolt: "#4d7fa8" },
    { min: 12, name: "비전", blade: "#b48ce8", blade2: "#ecd9ff", glow: "rgba(168,120,255,0.65)", bolt: "#7a4fc0" },
    { min: 16, name: "잿불", blade: "#ff8a4c", blade2: "#ffd9b8", glow: "rgba(255,120,50,0.7)", bolt: "#c0501c" },
    { min: 20, name: "혈월", blade: "#ff5a6e", blade2: "#ffc9d1", glow: "rgba(255,60,90,0.8)", bolt: "#a01c2c" },
    { min: 23, name: "성광", blade: "#ffe6a0", blade2: "#fffbe6", glow: "rgba(255,215,120,0.95)", bolt: "#c99a20" }
  ];

  G.FORGE = {
    baseCost: 150, costGrowth: 1.34, maxCost: 2000000,
    protectBase: 400, protectGrowth: 1.33,
    sellBase: 120, sellGrowth: 1.45,
    pityGainBase: 15, pityGainPerLv: 1.7,
    safeLv: 5, downOnlyLv: 10, breakStartLv: 10
  };

  G.BREAK_SHARE = [
    { min: 0, v: 0.0 }, { min: 5, v: 0.2 }, { min: 10, v: 0.34 },
    { min: 15, v: 0.46 }, { min: 20, v: 0.56 }
  ];

  G.FORGE_UPGRADES = [
    { key: "skill", name: "대장장이 숙련도", icon: "🔨", desc: "강화 성공 확률 +1.5%p · 강화 비용 -5%", base: 800, mult: 1.75, max: 20 },
    { key: "pity", name: "장인의 원한", icon: "🌑", desc: "실패 시 장인의 원한 획득량 +25%", base: 1000, mult: 1.7, max: 20 },
    { key: "furnace", name: "잿불 용광로", icon: "🔥", desc: "1초마다 골드 +35 (자리를 비워도 조금씩)", base: 900, mult: 1.65, max: 30 },
    { key: "pickaxe", name: "뼈 곡괭이", icon: "🦴", desc: "광맥 채굴 획득량 +45 골드", base: 700, mult: 1.6, max: 20 }
  ];

  /* ---------------------------------------------------------------
     세계 (World) — 15개 황폐한 세계
     --------------------------------------------------------------- */
  G.WORLDS = [
    {
      id: 1, name: "잿빛 황야", emoji: "🌫️", sub: 10, patterns: ["slam"],
      desc: "재가 되어 버린 옛 초원. 썩은 점액이 뒹굽니다.",
      sky: ["#0f0d16", "#241d2e"], ground: "#1a1622",
      monsters: ["m_pudding", "m_bunny"], boss: "b_bigpudding"
    },
    {
      id: 2, name: "곰팡이 숲", emoji: "🍄", sub: 10, patterns: ["slam"],
      desc: "포자가 눈처럼 흩날리는 저주받은 숲.",
      sky: ["#0b120e", "#1a2419"], ground: "#16201a",
      monsters: ["m_mush", "m_acorn"], boss: "b_mushchief"
    },
    {
      id: 3, name: "핏빛 목장", emoji: "🩸", sub: 10, patterns: ["charge"],
      desc: "붉은 안개가 깔린 도살장. 짐승의 울음이 남아 있습니다.",
      sky: ["#140b10", "#2a1018"], ground: "#241018",
      monsters: ["m_sheep", "m_bee"], boss: "b_jamgolem"
    },
    {
      id: 4, name: "잿구름 고원", emoji: "☁️", sub: 10, patterns: ["shield"],
      desc: "죽은 자의 재로 된 구름이 흐르는 고원.",
      sky: ["#0b1018", "#1a2130"], ground: "#161d29",
      monsters: ["m_cloud", "m_star"], boss: "b_cloudwhale"
    },
    {
      id: 5, name: "성흔 동굴", emoji: "✨", sub: 10, patterns: ["slam", "shield"],
      desc: "별이 죽어 빛나는 동굴. 혼불이 길을 잃고 떠돕니다.",
      sky: ["#0d0a16", "#1e1630"], ground: "#1a1329",
      monsters: ["m_firefly", "m_bat"], boss: "b_crystalturtle"
    },
    {
      id: 6, name: "유리 성당", emoji: "🦋", sub: 10, patterns: ["charge", "shield"],
      desc: "깨진 성화가 흐느끼는 유리 성당.",
      sky: ["#100a18", "#241634"], ground: "#1e1530",
      monsters: ["m_butterfly", "m_plant"], boss: "b_glassqueen"
    },
    {
      id: 7, name: "월식 사원", emoji: "🌘", sub: 10, patterns: ["slam", "charge"],
      desc: "달이 핏빛으로 잠긴 사원. 그림자가 기도합니다.",
      sky: ["#0a0a14", "#1b1830"], ground: "#161428",
      monsters: ["m_moonrabbit", "m_shadowcat"], boss: "b_moonguardian"
    },
    {
      id: 8, name: "잿가루 협곡", emoji: "🪨", sub: 10, patterns: ["slam", "charge"],
      desc: "검게 탄 뼛가루가 강처럼 흐르는 협곡.",
      sky: ["#160e0a", "#2a1810"], ground: "#22140e",
      monsters: ["m_cookie", "m_chocoslime"], boss: "b_lavadragon"
    },
    {
      id: 9, name: "하늘 성소", emoji: "🕊️", sub: 10, patterns: ["shield", "slam"],
      desc: "무너진 성소가 구름 위에 떠 있는 곳.",
      sky: ["#090f16", "#16202e"], ground: "#131c28",
      monsters: ["m_fairy", "m_angelsheep"], boss: "b_phoenix"
    },
    {
      id: 10, name: "악몽의 성채", emoji: "🏰", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "성검이 잠든 첫 번째 시험. 마왕의 옥좌가 기다립니다.",
      sky: ["#120a1c", "#281740"], ground: "#201334",
      monsters: ["m_ghost", "m_shadowknight"], boss: "b_demonking"
    },
    {
      id: 11, name: "성에 설원", emoji: "❄️", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "별가루가 눈처럼 내려 쌓인 얼어붙은 설원.",
      sky: ["#0a1018", "#17202e"], ground: "#141c28",
      monsters: ["m_snowpuff", "m_penguin"], boss: "b_snowqueen"
    },
    {
      id: 12, name: "썩은 빛의 못", emoji: "🌊", sub: 15, patterns: ["charge", "shield", "slam"],
      desc: "무지개가 썩어 흐르는 검은 호수.",
      sky: ["#08110f", "#0f2220"], ground: "#0e1e1c",
      monsters: ["m_droplet", "m_koi"], boss: "b_lakedragon"
    },
    {
      id: 13, name: "멈춘 시계탑", emoji: "⏳", sub: 15, patterns: ["shield", "slam", "charge"],
      desc: "태엽이 멈춘 탑. 시간이 우는 소리가 들립니다.",
      sky: ["#120f0a", "#241d12"], ground: "#1c1710",
      monsters: ["m_gear", "m_owl"], boss: "b_timekeeper"
    },
    {
      id: 14, name: "쇳물 공장", emoji: "🔥", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "쇳물과 재가 강처럼 흐르는 저주받은 공장.",
      sky: ["#170a08", "#2c120c"], ground: "#24100a",
      monsters: ["m_chick", "m_jellybot"], boss: "b_cookiemonarch"
    },
    {
      id: 15, name: "종말의 성전", emoji: "👑", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "저주받은 성검이 잠든 마지막 성전.",
      sky: ["#100a18", "#241536"], ground: "#1d1130",
      monsters: ["m_starknight", "m_finalshadow"], boss: "b_swordguardian"
    }
  ];

  /* 몬스터 도감 (45종) — 어두운 몸체 + 발광하는 테두리 */
  G.MONSTERS = {
    /* W1 */
    m_pudding: { name: "부패한 점액", kind: "blob", color: "#33463a", color2: "#7dffb0", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "재를 먹고 부푼 시체 점액." },
    m_bunny: { name: "뼈토끼", kind: "bunny", color: "#3d3340", color2: "#ff7b8a", interval: 1.7, hpMul: 0.9, atkMul: 1.1, goldMul: 1, desc: "갈비뼈 사이로 붉은 빛이 샙니다." },
    b_bigpudding: { name: "썩은 왕 점액", kind: "crowned", color: "#2f4038", color2: "#a9ff7a", interval: 2.1, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "황야를 삼킨 첫 지배자. 몸이 흔들리면 땅이 갈라집니다." },
    /* W2 */
    m_mush: { name: "버섯 망령", kind: "mushroom", color: "#4a2f38", color2: "#ff6b6b", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "포자를 뿜어 숨을 멎게 합니다." },
    m_acorn: { name: "도토리 도굴꾼", kind: "acorn", color: "#3a2c22", color2: "#c9a24a", interval: 1.8, hpMul: 1.1, atkMul: 1, goldMul: 1.1, desc: "무덤에서 주워 온 것들을 자루에 넣고 다닙니다." },
    b_mushchief: { name: "버섯 군주", kind: "crowned", color: "#4a2a30", color2: "#ff9a5c", interval: 2.1, hpMul: 1, atkMul: 1.15, goldMul: 1, boss: true, desc: "숲의 썩은 질서를 지키는 군주." },
    /* W3 */
    m_sheep: { name: "가시 양", kind: "fluffy", color: "#4a3038", color2: "#ff5c7a", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "털 대신 가시가 자랐습니다." },
    m_bee: { name: "독침 벌", kind: "bee", color: "#3d3520", color2: "#ffe066", interval: 1.5, hpMul: 0.8, atkMul: 1.2, goldMul: 1.1, desc: "꿀 대신 독을 나릅니다." },
    b_jamgolem: { name: "핏덩이 골렘", kind: "golem", color: "#4a1d26", color2: "#ff3b5c", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "도살장의 피가 굳어 만들어진 골렘." },
    /* W4 */
    m_cloud: { name: "재구름", kind: "cloud", color: "#2a3340", color2: "#8fc7ff", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "죽은 자의 재로 뭉친 구름." },
    m_star: { name: "유성 파편", kind: "star", color: "#2f2a1c", color2: "#ffd166", interval: 1.7, hpMul: 0.9, atkMul: 1.1, goldMul: 1, desc: "떨어진 별의 심장이 아직 뜨겁습니다." },
    b_cloudwhale: { name: "아귀 고래", kind: "whale", color: "#243044", color2: "#7fb2ff", interval: 2.3, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "고원의 구름을 통째로 삼킨 고래." },
    /* W5 */
    m_firefly: { name: "혼불", kind: "bee", color: "#2a2a18", color2: "#e9ff70", interval: 1.5, hpMul: 0.8, atkMul: 1.15, goldMul: 1.1, desc: "동굴에서 길을 잃은 영혼의 등불." },
    m_bat: { name: "동굴 흡혈귀", kind: "bat", color: "#2a2036", color2: "#c88fff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "거꾸로 매달려 사냥감을 기다립니다." },
    b_crystalturtle: { name: "수정 갑각", kind: "turtle", color: "#1f3a34", color2: "#6affc4", interval: 2.4, hpMul: 1.12, atkMul: 1.15, goldMul: 1, boss: true, desc: "등껍질에 죽은 별이 박혀 있습니다." },
    /* W6 */
    m_butterfly: { name: "유리 나비", kind: "butterfly", color: "#312442", color2: "#c58bff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "날갯짓이 성화를 깨뜨립니다." },
    m_plant: { name: "가시 덩굴", kind: "plant", color: "#20301f", color2: "#7ce87c", interval: 2.0, hpMul: 1.2, atkMul: 0.95, goldMul: 1, desc: "성당의 시신을 양분으로 자랐습니다." },
    b_glassqueen: { name: "성상의 여왕", kind: "queen", color: "#2e2440", color2: "#b9a0ff", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "깨진 성상들이 그녀의 왕관이 되었습니다." },
    /* W7 */
    m_moonrabbit: { name: "월식 토끼", kind: "bunny", color: "#2b2740", color2: "#cfc6ff", interval: 1.7, hpMul: 1, atkMul: 1, goldMul: 1, desc: "달이 가려질 때마다 그림자를 빚습니다." },
    m_shadowcat: { name: "그림자 고양이", kind: "cat", color: "#241d33", color2: "#9a7bff", interval: 1.6, hpMul: 0.9, atkMul: 1.2, goldMul: 1.1, desc: "발소리도 그림자도 남기지 않습니다." },
    b_moonguardian: { name: "월식의 수호신", kind: "fox", color: "#3a2f1c", color2: "#ffca6b", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "핏빛 달을 지키는 여우 신." },
    /* W8 */
    m_cookie: { name: "뼛가루 골렘", kind: "cookie", color: "#3a2c20", color2: "#d9a05c", interval: 2.0, hpMul: 1.15, atkMul: 0.95, goldMul: 1, desc: "부서져도 다시 뼈를 모아 일어납니다." },
    m_chocoslime: { name: "타르 점액", kind: "blob", color: "#2c1d18", color2: "#c98a5c", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1.1, desc: "닿으면 살이 녹습니다." },
    b_lavadragon: { name: "화산 뼈룡", kind: "dragon", color: "#3d1612", color2: "#ff6b3c", interval: 2.2, hpMul: 1, atkMul: 1.25, goldMul: 1, boss: true, desc: "협곡의 쇳물을 마시고 자란 뼈룡." },
    /* W9 */
    m_fairy: { name: "타락한 요정", kind: "fairy", color: "#22303a", color2: "#8fe6ff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "성소를 버리고 어둠에 몸을 맡겼습니다." },
    m_angelsheep: { name: "눈먼 양", kind: "fluffy", color: "#3a3324", color2: "#ffe9a8", interval: 1.9, hpMul: 1.1, atkMul: 1, goldMul: 1, desc: "날개는 뜯기고 눈은 봉해졌습니다." },
    b_phoenix: { name: "재의 불사조", kind: "bird", color: "#40280f", color2: "#ffb347", interval: 2.2, hpMul: 1.05, atkMul: 1.2, goldMul: 1, boss: true, desc: "불꽃이 아니라 잿가루가 타오릅니다." },
    /* W10 */
    m_ghost: { name: "악몽 유령", kind: "ghost", color: "#2a2a3d", color2: "#9fb8ff", interval: 1.8, hpMul: 1.05, atkMul: 1.05, goldMul: 1, desc: "잠든 자의 악몽에서 걸어 나옵니다." },
    m_shadowknight: { name: "그림자 기사", kind: "knight", color: "#232030", color2: "#7f8ab8", interval: 1.9, hpMul: 1.2, atkMul: 1, goldMul: 1.1, desc: "성검을 동경하다 저주에 삼켜진 기사." },
    b_demonking: { name: "심연의 마왕", kind: "demon", color: "#2b1330", color2: "#e05cff", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "성검의 첫 번째 시험을 준비한 옥좌의 주인." },
    /* W11 */
    m_snowpuff: { name: "눈꽃 망령", kind: "fluffy", color: "#2a3340", color2: "#dff4ff", interval: 1.9, hpMul: 1.05, atkMul: 1, goldMul: 1, desc: "눈보라 속에서 웃음소리를 냅니다." },
    m_penguin: { name: "서리 갑각충", kind: "bird", color: "#20293a", color2: "#8fb8ff", interval: 1.7, hpMul: 1, atkMul: 1.1, goldMul: 1, desc: "얼음 껍질로 몸을 감쌌습니다." },
    b_snowqueen: { name: "빙결의 여왕", kind: "queen", color: "#243044", color2: "#bfe9ff", interval: 2.1, hpMul: 1.05, atkMul: 1.2, goldMul: 1, boss: true, desc: "설원 전체를 얼려 왕좌로 삼았습니다." },
    /* W12 */
    m_droplet: { name: "물방울 정령", kind: "blob", color: "#1c3038", color2: "#63d6ff", interval: 1.8, hpMul: 1, atkMul: 1.05, goldMul: 1, desc: "썩은 빛을 머금은 물방울." },
    m_koi: { name: "비늘 잉어", kind: "whale", color: "#3a1f2a", color2: "#ff8fb0", interval: 1.8, hpMul: 1.05, atkMul: 1.05, goldMul: 1.05, desc: "비늘이 칼날처럼 서 있습니다." },
    b_lakedragon: { name: "심연의 수룡", kind: "dragon", color: "#123230", color2: "#5cf0c8", interval: 2.1, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "못의 가장 깊은 곳에서 빛을 삼킵니다." },
    /* W13 */
    m_gear: { name: "톱니 골렘", kind: "golem", color: "#322a1e", color2: "#d9b463", interval: 2.0, hpMul: 1.2, atkMul: 1, goldMul: 1, desc: "멈춘 태엽을 갈아 끼우며 걷습니다." },
    m_owl: { name: "예언의 부엉이", kind: "bird", color: "#2e2620", color2: "#e8c48a", interval: 1.7, hpMul: 0.95, atkMul: 1.15, goldMul: 1.1, desc: "정각마다 죽음의 시각을 울어 댑니다." },
    b_timekeeper: { name: "태엽 수호자", kind: "crowned", color: "#33281a", color2: "#ffd88a", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "탑의 시간을 붙잡아 세계를 멈춰 세웠습니다." },
    /* W14 */
    m_chick: { name: "잿병아리", kind: "bird", color: "#3a2d16", color2: "#ffd166", interval: 1.6, hpMul: 0.9, atkMul: 1.2, goldMul: 1.1, desc: "쇳물 속에서 부화한 기형." },
    m_jellybot: { name: "쇳물 인형", kind: "golem", color: "#3a1f2a", color2: "#ff7fa8", interval: 2.0, hpMul: 1.15, atkMul: 1, goldMul: 1, desc: "공장주가 버린 인형에 쇳물이 스며들었습니다." },
    b_cookiemonarch: { name: "재의 군주", kind: "demon", color: "#2e1e14", color2: "#ff9a5c", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "부서져도 용광로에서 다시 걸어 나옵니다." },
    /* W15 */
    m_starknight: { name: "성검의 망령", kind: "knight", color: "#22243a", color2: "#cfe0ff", interval: 1.8, hpMul: 1.1, atkMul: 1.1, goldMul: 1.1, desc: "성검을 지키다 성검에게 먹힌 기사." },
    m_finalshadow: { name: "종말의 그림자", kind: "ghost", color: "#1e1a2a", color2: "#a08fd8", interval: 1.7, hpMul: 1.05, atkMul: 1.15, goldMul: 1.1, desc: "성검의 마지막 시험 그 자체." },
    b_swordguardian: { name: "성검의 지배자", kind: "demon", color: "#2a1c10", color2: "#ffe08a", interval: 1.9, hpMul: 1.1, atkMul: 1.3, goldMul: 1, boss: true, desc: "저주받은 성검을 쥔 마지막 지배자." }
  };

  /* ---------------------------------------------------------------
     원정 구역 자동 생성 (1-1 … 15-15)
     --------------------------------------------------------------- */
  G.stageRecAtk = function (world, sub) {
    const W = G.WORLDS.find((w) => w.id === world);
    const p = (sub - 1) / (W ? W.sub : 10);
    return Math.round(10 * Math.pow(1.44, (world - 1) + p));
  };

  G.STAGES = [];
  (function buildStages() {
    let index = 0;
    G.WORLDS.forEach((w) => {
      for (let s = 1; s <= w.sub; s++) {
        index += 1;
        const isBoss = s === w.sub;
        G.STAGES.push({
          key: w.id + "-" + s,
          world: w.id,
          sub: s,
          index: index,
          name: w.name,
          label: w.id + "-" + s,
          isBoss: isBoss,
          recAtk: G.stageRecAtk(w.id, s),
          emoji: w.emoji,
          sky: w.sky,
          ground: w.ground,
          desc: isBoss ? `${w.name}의 지배자의 방` : w.desc,
          worldData: w,
          patterns: isBoss ? w.patterns : []
        });
      }
    });
  })();

  G.TOTAL_STAGES = G.STAGES.length;

  G.stageByKey = function (key) {
    return G.STAGES.find((s) => s.key === key) || null;
  };

  G.worldById = function (id) {
    return G.WORLDS.find((w) => w.id === id) || null;
  };

  G.STAGE_TUNE = {
    normalHp: 4.4,
    bossHpMul: 9,
    bossAtkMul: 1.2,
    goldBase: 12,
    goldGrowth: 1.5,
    bossGoldMul: 8,
    expBase: 5,
    expGrowth: 1.42,
    bossExpMul: 6,
    waveHeal: 0.10,
    mobAtkMul: 0.46          // 다수 몹이 동시에 때리므로 한 마리당 피해를 낮춘다
  };

  /* ---------------------------------------------------------------
     다수 몹 몰이사냥 웨이브 설정
     한 번에 8~14마리가 화면에 있고, 처치 할당량을 채우면 다음 웨이브
     --------------------------------------------------------------- */
  G.HORDE = {
    waveQuota: 14,          // 웨이브당 처치 목표
    maxAlive: 11,           // 동시에 살아 있는 최대 몹
    burst: 9,               // 웨이브 시작 시 한꺼번에 등장
    respawnGap: 0.42,       // 처치되면 다시 채워지는 간격
    bossAdds: 4,            // 지배자방 동시 소환수
    bossMaxAlive: 7,        // 지배자방 최대 생존(소환수만)
    bossWaveQuota: 11
  };

  /* ---------------------------------------------------------------
     3인 파티 동료
     --------------------------------------------------------------- */
  G.PARTY = [
    {
      id: "knight", name: "철벽 기사 가웨인", short: "가웨인", role: "vanguard",
      icon: "🛡", color: "#7fb2ff", unlock: 0,
      desc: "성문을 지키다 저주에 스며든 기사. 앞장서서 몹을 붙잡습니다.",
      baseHp: 168, hpPer: 17, atkMul: 0.85, atkPer: 5.4, interval: 1.12,
      range: 12.5, speed: 29,
      skill: { name: "철벽 강타", icon: "🛡", cd: 5.2, power: 1.9, shape: "cone", radius: 21, half: 62,
               hint: "전방 부채꼴을 내리쳐 도발합니다" }
    },
    {
      id: "mage", name: "화염 술사 리안", short: "리안", role: "flame",
      icon: "🔥", color: "#ff9a5c", unlock: 400,
      desc: "성화를 훔쳐 달아난 술사. 멀리서 불덩이를 퍼붓습니다.",
      baseHp: 104, hpPer: 10.5, atkMul: 1.12, atkPer: 7.2, interval: 1.45,
      range: 30, speed: 27,
      skill: { name: "화염 폭류", icon: "🔥", cd: 6.4, power: 2.3, shape: "circle", radius: 23, half: 180,
               hint: "무리 한가운데에 불기둥을 세웁니다" }
    }
  ];

  G.PARTY_LV = {
    max: 60,
    cost: (lv) => Math.round(150 * Math.pow(1.31, Math.max(0, lv - 1))),
    stones: (lv) => (lv >= 20 ? 2 : lv >= 10 ? 1 : 0)
  };

  /* 지배자 패턴 */
  G.PATTERNS = {
    slam: {
      id: "slam", name: "강타", icon: "💥", action: "guard", actionLabel: "🛡 방어",
      warn: "묵직한 강타가 날아옵니다!",
      hint: "방어로 피해를 줄입니다",
      telegraph: 2.4, mult: 2.8, reduce: 0.25, color: "#ff5a4a"
    },
    charge: {
      id: "charge", name: "돌진", icon: "💨", action: "dodge", actionLabel: "🌀 회피",
      warn: "몸을 낮추고 돌진을 준비합니다!",
      hint: "회피로 완전히 흘려냅니다",
      telegraph: 1.9, mult: 3.2, reduce: 0, color: "#ffb84d"
    },
    shield: {
      id: "shield", name: "보호막", icon: "🛡", action: "counter", actionLabel: "⚡ 카운터",
      warn: "핏빛 보호막을 펼쳤습니다!",
      hint: "카운터로 보호막을 깹니다",
      telegraph: 0, duration: 5.0, mult: 0, reduce: 0.25, color: "#7fb2ff"
    }
  };

  /* 금지된 기술 — 세 기술 모두 진짜 공간 광역기 */
  G.SKILLS = [
    {
      id: "blossom", name: "혈월 참격", icon: "🌑", unlockLv: 1,
      cd: 8, type: "damage", shape: "arc", radius: 27, half: 78,
      power: 2.4, perLevel: 0.12,
      desc: "전방 부채꼴의 모든 몹을 베는 초승달 참격", useMsg: "혈월 참격!"
    },
    {
      id: "jelly", name: "흡혈 성찬", icon: "🩸", unlockLv: 3,
      cd: 20, type: "heal", shape: "nova", radius: 26, half: 180,
      power: 0.3, perLevel: 0.02, dmgPower: 1.35,
      desc: "주변을 핏빛 파동으로 쓸고 파티 전원을 회복", useMsg: "흡혈 성찬!"
    },
    {
      id: "meteor", name: "심연 낙성", icon: "☄️", unlockLv: 5,
      cd: 15, type: "damage", shape: "circle", radius: 31, half: 180,
      power: 4.2, perLevel: 0.18, alwaysCrit: true,
      desc: "무리 한가운데로 떨어지는 확정 치명타 운석", useMsg: "심연 낙성!"
    }
  ];

  /* 파티 연계 궁극기 */
  G.ULT = {
    name: "성검 연계 · 심연 폭풍", icon: "✦",
    power: 4.2, heal: 0.32, chargeMax: 100,
    perKill: 7, perHit: 0.55, perWave: 12
  };

  /* 유물 */
  G.RELICS = [
    {
      id: "flag", name: "전몰자의 군기", icon: "🏴", color: "#4a3a2a",
      unlock: 8, effect: 6, max: 12, unit: "%", stat: "atk",
      text: (v) => `공격력 +${v}%`, desc: "전장에 쓰러진 자들의 깃발이 아직 펄럭입니다."
    },
    {
      id: "clover", name: "저주받은 네잎", icon: "🍀", color: "#20301f",
      unlock: 10, effect: 1.5, max: 12, unit: "%p", stat: "crit",
      text: (v) => `치명타 확률 +${v}%p`, desc: "행운 대신 죽음을 불러오는 네잎."
    },
    {
      id: "key", name: "해골 열쇠", icon: "🗝️", color: "#3a2c14",
      unlock: 6, effect: 8, max: 12, unit: "%", stat: "gold",
      text: (v) => `골드 획득 +${v}%`, desc: "무덤의 자물쇠를 여는 뼈 열쇠."
    },
    {
      id: "heart", name: "핏빛 성심", icon: "🫀", color: "#3a141c",
      unlock: 6, effect: 6, max: 12, unit: "%", stat: "hp",
      text: (v) => `최대 체력 +${v}%`, desc: "아직 뛰고 있는 심장. 주인이 죽었는데도."
    },
    {
      id: "anvil", name: "저주받은 모루", icon: "⚒️", color: "#2a2036",
      unlock: 12, effect: 1, max: 10, unit: "%p", stat: "enhance",
      text: (v) => `강화 성공률 +${v}%p`, desc: "두드릴수록 저주가 검에 스며듭니다."
    },
    {
      id: "hourglass", name: "월식 모래시계", icon: "⏳", color: "#1c2a38",
      unlock: 10, effect: 12, max: 10, unit: "%", stat: "offline",
      text: (v) => `오프라인 보상 +${v}%`, desc: "멈춘 시간 동안에도 심연은 무언가를 모읍니다."
    }
  ];

  /* 업적 */
  G.ACHIEVEMENTS = [
    { id: "first_forge", icon: "⚒️", name: "첫 망치질", desc: "처음으로 검을 두드렸습니다", reward: { gold: 200, stones: 2 }, check: (s) => s.stats.tries >= 1 },
    { id: "plus5", icon: "🌫️", name: "+5강 각성", desc: "검을 +5강까지 벼렸습니다", reward: { gold: 800, stones: 5 }, check: (s) => s.stats.maxLv >= 5 },
    { id: "plus10", icon: "🩸", name: "+10강 서약", desc: "검을 +10강까지 벼렸습니다", reward: { gold: 3000, stones: 12 }, check: (s) => s.stats.maxLv >= 10 },
    { id: "plus15", icon: "🌒", name: "+15강 저주", desc: "검을 +15강까지 벼렸습니다", reward: { gold: 12000, stones: 30, frags: 6 }, check: (s) => s.stats.maxLv >= 15 },
    { id: "plus20", icon: "👑", name: "+20강 심연", desc: "검을 +20강까지 벼렸습니다", reward: { gold: 60000, stones: 80, frags: 20 }, check: (s) => s.stats.maxLv >= 20 },
    { id: "plus25", icon: "✦", name: "종말의 성검", desc: "검을 +25강까지 벼렸습니다", reward: { gold: 300000, stones: 200, frags: 60 }, check: (s) => s.stats.maxLv >= 25 },
    { id: "try50", icon: "🔨", name: "잿더미의 장인", desc: "강화를 50회 시도했습니다", reward: { gold: 1500, stones: 6 }, check: (s) => s.stats.tries >= 50 },
    { id: "try200", icon: "🏅", name: "저주를 두른 손", desc: "강화를 200회 시도했습니다", reward: { gold: 9000, stones: 20, frags: 5 }, check: (s) => s.stats.tries >= 200 },
    { id: "hunt50", icon: "🐺", name: "황야의 사냥꾼", desc: "몬스터를 50마리 베었습니다", reward: { gold: 600, stones: 4 }, check: (s) => s.stats.kills >= 50 },
    { id: "hunt500", icon: "🏹", name: "잿빛 별", desc: "몬스터를 500마리 베었습니다", reward: { gold: 8000, stones: 25, frags: 4 }, check: (s) => s.stats.kills >= 500 },
    { id: "boss1", icon: "👁️", name: "첫 지배자 격파", desc: "1-10 썩은 왕 점액을 베었습니다", reward: { gold: 1500, stones: 6, frags: 2 }, check: (s) => (s.stats.bossKills || 0) >= 1 },
    { id: "world3", icon: "🩸", name: "핏빛 목장 정복", desc: "세계 3의 지배자를 베었습니다", reward: { gold: 5000, stones: 15, frags: 5 }, check: (s) => !!s.progress.cleared["3-10"] },
    { id: "world5", icon: "✨", name: "성흔을 건너서", desc: "세계 5의 지배자를 베었습니다", reward: { gold: 16000, stones: 25, frags: 10 }, check: (s) => !!s.progress.cleared["5-10"] },
    { id: "world10", icon: "🏰", name: "악몽의 성채 정복", desc: "세계 10의 지배자를 베었습니다", reward: { gold: 90000, stones: 80, frags: 30 }, check: (s) => !!s.progress.cleared["10-15"] },
    { id: "world15", icon: "👑", name: "전설의 성검", desc: "세계 15의 마지막 지배자를 베었습니다", reward: { gold: 500000, stones: 300, frags: 100 }, check: (s) => !!s.progress.cleared["15-15"] },
    { id: "relic3", icon: "🔮", name: "유물 수집가", desc: "유물 3개를 각성했습니다", reward: { gold: 2500, stones: 8 }, check: (s) => Object.values(s.relics).filter((r) => r.u).length >= 3 },
    { id: "relicAll", icon: "🎁", name: "유물 도감 완성", desc: "모든 유물을 각성했습니다", reward: { gold: 30000, stones: 40, frags: 15 }, check: (s) => Object.values(s.relics).filter((r) => r.u).length >= G.RELICS.length },
    { id: "lvl10", icon: "🗡️", name: "성장하는 서약자", desc: "서약자 Lv.10 달성", reward: { gold: 1500, stones: 8 }, check: (s) => s.hero.level >= 10 },
    { id: "lvl30", icon: "🖤", name: "든든한 서약자", desc: "서약자 Lv.30 달성", reward: { gold: 12000, stones: 30, frags: 8 }, check: (s) => s.hero.level >= 30 },
    { id: "lvl60", icon: "🕯️", name: "전설의 서약자", desc: "서약자 Lv.60 달성", reward: { gold: 120000, stones: 120, frags: 40 }, check: (s) => s.hero.level >= 60 },
    { id: "gold100k", icon: "💰", name: "황금에 굶주린 자", desc: "골드를 100,000 모았습니다", reward: { gold: 5000, stones: 15 }, check: (s) => s.stats.goldEarned >= 100000 },
    { id: "codex10", icon: "📖", name: "도감 수집가", desc: "도감을 10칸 채웠습니다", reward: { gold: 3000, stones: 10, frags: 3 }, check: (s) => Object.keys(s.codex).length >= 10 },
    { id: "codexAll", icon: "🏆", name: "심연 도감 마스터", desc: "모든 몬스터를 기록했습니다", reward: { gold: 60000, stones: 80, frags: 25 }, check: (s) => Object.keys(s.codex).length >= Object.keys(G.MONSTERS).length }
  ];

  /* ---------------------------------------------------------------
     초보자 안내 퀘스트 (4단계)
     --------------------------------------------------------------- */
  G.TUTORIAL = [
    {
      id: "forge", icon: "⚒️", tab: "forge", target: "enhanceBtn",
      title: "첫 망치질",
      goal: "대장간에서 검을 1회 강화하기",
      hint: "대장간 탭에서 [망치질]을 눌러보세요",
      reward: { gold: 500, stones: 5 }
    },
    {
      id: "equip", icon: "⚔️", tab: "forge", target: "equipBtn",
      title: "성검을 손에",
      goal: "강화한 검을 [장착하기]",
      hint: "강화 슬롯의 [장착하기]를 누르면 그 검으로 사냥합니다",
      reward: { gold: 800, stones: 4, protect: 1 }
    },
    {
      id: "hunt", icon: "🗡️", tab: "hunt", target: "stageGrid",
      title: "첫 사냥",
      goal: "사냥 구역 1-1 클리어하기",
      hint: "사냥 탭에서 1-1 잿빛 황야에 도전하세요",
      reward: { gold: 1500, frags: 10 }
    },
    {
      id: "relic", icon: "🔮", tab: "relic", target: "relicList",
      title: "심연의 각성",
      goal: "대장간 연구 또는 유물 1회 강화하기",
      hint: "대장간 연구(골드)나 유물(파편) 중 하나를 올리면 완료됩니다",
      reward: { gold: 3000, frags: 20, title: "심연의 서약자" }
    }
  ];
  G.TUTORIAL_TITLE = "심연의 서약자";

  G.TIPS = [
    "강화는 +0부터 +25까지. +5강부터는 실패하면 단계가 내려갑니다.",
    "+10강부터는 검이 부서질 수 있습니다. 봉인 부적을 켜두면 안전합니다.",
    "장인의 원한이 100%가 되면 다음 강화는 반드시 성공합니다.",
    "지배자의 방은 X-10(또는 X-15)입니다. 지배자를 베면 유물 파편을 크게 줍니다.",
    "강타는 '방어', 돌진은 '회피', 보호막은 '카운터'로 받아냅니다.",
    "유물은 영구 효과입니다. 사냥할수록 검이 깊어집니다.",
    "자리를 비우면 오프라인 보상이 쌓입니다. 모래시계 유물로 늘릴 수 있습니다.",
    "지나온 구역을 다시 골라 골드와 룬석을 모을 수 있습니다.",
    "치명타 확률은 저주받은 네잎 유물로 올립니다.",
    "전투 화면 아래 스킬창에서 공격·방어·회피·카운터를 직접 누를 수 있습니다.",
    "몹은 무리 지어 몰려옵니다. 한 번의 베기로 최대 5~6마리를 함께 벨 수 있습니다.",
    "파티 칩(좌측 상단)을 누르면 그 영웅으로 조종권이 넘어갑니다. 동료는 스스로 싸웁니다.",
    "처치와 타격으로 궁극기 게이지가 차오릅니다. 가득 차면 화면 오른쪽 ✦ 버튼을 누르세요."
  ];
})();
