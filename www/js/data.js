/* =====================================================================
   몽글 대장간: 별빛 성검 키우기 — 게임 데이터 (v2.1)
   세계 15개 · 스테이지 180개 · 보스 패턴
   ===================================================================== */
(function () {
  "use strict";

  const G = (window.GAME = window.GAME || {});

  G.VERSION = "2.1.0";
  G.SAVE_KEY = "mongle_forge_save_v2";
  G.LEGACY_KEYS = ["sword_enhancer_app_save_v1"];
  G.MAX_LV = 25;

  /* ---------------------------------------------------------------
     무기
     --------------------------------------------------------------- */
  G.WEAPONS = [
    "몽글몽글 목검", "말랑말랑 철검", "반짝이는 강철검", "딸기 설탕 장검",
    "민트 초코 세이버", "구름솜 대검", "별빛 장식 검", "노을빛 화염검",
    "사과향 서리검", "폭신폭신 집행검", "꿀단지 황금검", "무지개 수호검",
    "달토끼 은빛검", "천둥방울 심판검", "심연의 솜사탕검", "별가루 성운검",
    "태양의 불사조검", "용기의 비늘검", "차원의 마카롱검", "신왕의 황금검",
    "영겁의 세라프검", "심판자의 자장가", "세계수의 축복검", "종말의 별빛검",
    "전설의 대장장이 검", "종말의 성검 ✨"
  ];

  G.TIERS = [
    { min: 0, name: "나무", blade: "#e2b487", blade2: "#f8e6cd", glow: "rgba(216,176,140,0.5)", bolt: "#a77a50" },
    { min: 4, name: "민트", blade: "#8fd9c0", blade2: "#dcfff3", glow: "rgba(122,220,190,0.55)", bolt: "#4fae94" },
    { min: 8, name: "하늘", blade: "#9ccdf2", blade2: "#e3f5ff", glow: "rgba(120,190,240,0.6)", bolt: "#5c9fd0" },
    { min: 12, name: "라벤더", blade: "#c9b2f0", blade2: "#f2eaff", glow: "rgba(180,150,240,0.65)", bolt: "#9472cf" },
    { min: 16, name: "노을", blade: "#ffb27a", blade2: "#ffe6d1", glow: "rgba(255,160,100,0.7)", bolt: "#e08a4c" },
    { min: 20, name: "벚꽃", blade: "#ffa9c0", blade2: "#ffe3ec", glow: "rgba(255,150,185,0.75)", bolt: "#e0789a" },
    { min: 23, name: "성광", blade: "#ffe08a", blade2: "#fff9d9", glow: "rgba(255,215,120,0.9)", bolt: "#e6b23c" }
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
    { key: "pity", name: "장인의 영감", icon: "🌙", desc: "실패 시 장인의 기운 획득량 +25%", base: 1000, mult: 1.7, max: 20 },
    { key: "furnace", name: "자동 용광로", icon: "🏮", desc: "1초마다 골드 +35 (자리를 비워도 조금씩)", base: 900, mult: 1.65, max: 30 },
    { key: "pickaxe", name: "설탕 곡괭이", icon: "🍬", desc: "광맥 채굴 획득량 +45 골드", base: 700, mult: 1.6, max: 20 }
  ];

  /* ---------------------------------------------------------------
     세계 (World)
     --------------------------------------------------------------- */
  G.WORLDS = [
    {
      id: 1, name: "몽글 초원", emoji: "🌱", sub: 10, patterns: ["slam"],
      desc: "말랑한 슬라임이 뒹구는 첫 사냥터",
      sky: ["#e8f7ec", "#fdf6e6"], ground: "#cdebd8",
      monsters: ["m_pudding", "m_bunny"], boss: "b_bigpudding"
    },
    {
      id: 2, name: "버섯 숲", emoji: "🍄", sub: 10, patterns: ["slam"],
      desc: "도토리를 줍는 콩들이 사는 숲",
      sky: ["#f7ecdd", "#fdf4e8"], ground: "#e6d3b8",
      monsters: ["m_mush", "m_acorn"], boss: "b_mushchief"
    },
    {
      id: 3, name: "딸기 목장", emoji: "🍓", sub: 10, patterns: ["charge"],
      desc: "달콤한 향기가 가득한 목장",
      sky: ["#ffeef2", "#fff8e8"], ground: "#f7d4dc",
      monsters: ["m_sheep", "m_bee"], boss: "b_jamgolem"
    },
    {
      id: 4, name: "구름 언덕", emoji: "☁️", sub: 10, patterns: ["shield"],
      desc: "구름을 베고 낮잠 자는 언덕",
      sky: ["#e9f4ff", "#fff6ea"], ground: "#d5e8f8",
      monsters: ["m_cloud", "m_star"], boss: "b_cloudwhale"
    },
    {
      id: 5, name: "별빛 동굴", emoji: "✨", sub: 10, patterns: ["slam", "shield"],
      desc: "반딧불이 별처럼 빛나는 동굴",
      sky: ["#e8e2ff", "#f5eeff"], ground: "#c9c0e8",
      monsters: ["m_firefly", "m_bat"], boss: "b_crystalturtle"
    },
    {
      id: 6, name: "유리 화원", emoji: "🦋", sub: 10, patterns: ["charge", "shield"],
      desc: "유리로 된 꽃이 피어나는 정원",
      sky: ["#fdeeff", "#eefaff"], ground: "#ded4f2",
      monsters: ["m_butterfly", "m_plant"], boss: "b_glassqueen"
    },
    {
      id: 7, name: "달빛 사원", emoji: "🌙", sub: 10, patterns: ["slam", "charge"],
      desc: "조용히 달을 빚는 사원",
      sky: ["#e6e8ff", "#f7f2ff"], ground: "#c6c8ea",
      monsters: ["m_moonrabbit", "m_shadowcat"], boss: "b_moonguardian"
    },
    {
      id: 8, name: "쿠키 협곡", emoji: "🍪", sub: 10, patterns: ["slam", "charge"],
      desc: "따끈한 초코 냄새가 나는 협곡",
      sky: ["#ffeee2", "#fff6e0"], ground: "#e8c9a8",
      monsters: ["m_cookie", "m_chocoslime"], boss: "b_lavadragon"
    },
    {
      id: 9, name: "하늘 정원", emoji: "🕊️", sub: 10, patterns: ["shield", "slam"],
      desc: "구름 위에 떠 있는 비밀 정원",
      sky: ["#e6fbff", "#fff9e8"], ground: "#cfeee6",
      monsters: ["m_fairy", "m_angelsheep"], boss: "b_phoenix"
    },
    {
      id: 10, name: "악몽의 성", emoji: "🏰", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "별빛 성검의 첫 번째 시험",
      sky: ["#efe6ff", "#ffe9f2"], ground: "#c9b6d8",
      monsters: ["m_ghost", "m_shadowknight"], boss: "b_demonking"
    },
    {
      id: 11, name: "별가루 설원", emoji: "❄️", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "눈송이가 별가루로 내리는 설원",
      sky: ["#eaf6ff", "#f7fbff"], ground: "#d7ecf7",
      monsters: ["m_snowpuff", "m_penguin"], boss: "b_snowqueen"
    },
    {
      id: 12, name: "무지개 호수", emoji: "🌈", sub: 15, patterns: ["charge", "shield", "slam"],
      desc: "일곱 빛깔 물결이 반짝이는 호수",
      sky: ["#e8fbf5", "#fff3f8"], ground: "#c6ece0",
      monsters: ["m_droplet", "m_koi"], boss: "b_lakedragon"
    },
    {
      id: 13, name: "시계탑", emoji: "⏰", sub: 15, patterns: ["shield", "slam", "charge"],
      desc: "태엽 소리가 자장가처럼 들리는 탑",
      sky: ["#f7f1e4", "#fffaf0"], ground: "#e2d5bd",
      monsters: ["m_gear", "m_owl"], boss: "b_timekeeper"
    },
    {
      id: 14, name: "용암 쿠키 공장", emoji: "🍫", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "따끈따끈, 초코가 흐르는 공장",
      sky: ["#ffe9e0", "#fff4e0"], ground: "#e8bba0",
      monsters: ["m_chick", "m_jellybot"], boss: "b_cookiemonarch"
    },
    {
      id: 15, name: "종말의 성전", emoji: "👑", sub: 15, patterns: ["slam", "charge", "shield"],
      desc: "전설의 성검이 잠들어 있는 마지막 성전",
      sky: ["#efe4ff", "#fff0e8"], ground: "#cbb6e0",
      monsters: ["m_starknight", "m_finalshadow"], boss: "b_swordguardian"
    }
  ];

  /* 몬스터 도감 (45종) */
  G.MONSTERS = {
    /* W1 */
    m_pudding: { name: "몽글 푸딩", kind: "blob", color: "#b7e8cf", color2: "#e7fff4", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "찔러도 말랑, 넘어져도 말랑." },
    m_bunny: { name: "솜토끼", kind: "bunny", color: "#ffd6e2", color2: "#fff0f5", interval: 1.7, hpMul: 0.9, atkMul: 1.1, goldMul: 1, desc: "당근보다 강화석을 좋아해요." },
    b_bigpudding: { name: "대왕 푸딩", kind: "crowned", color: "#a8e6cf", color2: "#e9fff6", interval: 2.1, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "초원의 왕. 흔들리면 지진이 나요." },
    /* W2 */
    m_mush: { name: "버섯 콩", kind: "mushroom", color: "#ffb3a7", color2: "#fff0ec", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "비 오는 날이 제일 신나요." },
    m_acorn: { name: "도토리 도둑", kind: "acorn", color: "#d9b382", color2: "#f6e3c8", interval: 1.8, hpMul: 1.1, atkMul: 1, goldMul: 1.1, desc: "주머니가 도토리로 가득해요." },
    b_mushchief: { name: "버섯 대장", kind: "crowned", color: "#e8927c", color2: "#ffdccf", interval: 2.1, hpMul: 1, atkMul: 1.15, goldMul: 1, boss: true, desc: "숲의 질서를 지키는 든든한 대장." },
    /* W3 */
    m_sheep: { name: "딸기 양", kind: "fluffy", color: "#ffd1dc", color2: "#fff0f4", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "털에서 딸기 향이 나요." },
    m_bee: { name: "꿀벌 콩", kind: "bee", color: "#ffd98e", color2: "#fff6d9", interval: 1.5, hpMul: 0.8, atkMul: 1.2, goldMul: 1.1, desc: "꿀단지를 지키는 부지런한 콩." },
    b_jamgolem: { name: "딸기잼 골렘", kind: "golem", color: "#ff8f9c", color2: "#ffd6dc", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "끈적끈적하지만 마음은 달콤해요." },
    /* W4 */
    m_cloud: { name: "솜구름", kind: "cloud", color: "#cfe6fb", color2: "#f2f9ff", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1, desc: "하품하면 비가 내려요." },
    m_star: { name: "별똥이", kind: "star", color: "#ffe9a8", color2: "#fffbe6", interval: 1.7, hpMul: 0.9, atkMul: 1.1, goldMul: 1, desc: "소원을 들어주고 싶어서 떨어졌어요." },
    b_cloudwhale: { name: "구름 고래", kind: "whale", color: "#b8dcf7", color2: "#e9f6ff", interval: 2.3, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "하늘을 유영하는 느긋한 고래." },
    /* W5 */
    m_firefly: { name: "반딧불", kind: "bee", color: "#fff3a8", color2: "#fffce3", interval: 1.5, hpMul: 0.8, atkMul: 1.15, goldMul: 1.1, desc: "동굴의 작은 램프." },
    m_bat: { name: "동굴 박쥐", kind: "bat", color: "#c9b6e8", color2: "#efe6ff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "거꾸로 매달려 낮잠을 자요." },
    b_crystalturtle: { name: "수정 거북", kind: "turtle", color: "#a8e6cf", color2: "#e6fff6", interval: 2.4, hpMul: 1.12, atkMul: 1.15, goldMul: 1, boss: true, desc: "등껍질에 별빛이 맺혀 있어요." },
    /* W6 */
    m_butterfly: { name: "유리나비", kind: "butterfly", color: "#d8c8f5", color2: "#f7f0ff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "날갯짓 소리가 종소리 같아요." },
    m_plant: { name: "가시덩굴", kind: "plant", color: "#9fd6a8", color2: "#e6ffea", interval: 2.0, hpMul: 1.2, atkMul: 0.95, goldMul: 1, desc: "안아주면 아파요. 조심." },
    b_glassqueen: { name: "유리 여왕", kind: "queen", color: "#e0d0ff", color2: "#fbf5ff", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "깨지지 않는 유리 왕관을 썼어요." },
    /* W7 */
    m_moonrabbit: { name: "달토끼", kind: "bunny", color: "#e6e0ff", color2: "#faf7ff", interval: 1.7, hpMul: 1, atkMul: 1, goldMul: 1, desc: "떡 대신 별가루를 빚어요." },
    m_shadowcat: { name: "그림자 고양이", kind: "cat", color: "#b6a8d6", color2: "#e8e0ff", interval: 1.6, hpMul: 0.9, atkMul: 1.2, goldMul: 1.1, desc: "발소리가 들리지 않아요." },
    b_moonguardian: { name: "달빛 수호신", kind: "fox", color: "#ffe6b8", color2: "#fff7e3", interval: 2.2, hpMul: 1, atkMul: 1.2, goldMul: 1, boss: true, desc: "사원의 달을 지키는 여우." },
    /* W8 */
    m_cookie: { name: "쿠키 골렘", kind: "cookie", color: "#d9b382", color2: "#f2ddbe", interval: 2.0, hpMul: 1.15, atkMul: 0.95, goldMul: 1, desc: "부서지면 다시 구우면 돼요." },
    m_chocoslime: { name: "초코 슬라임", kind: "blob", color: "#a8795c", color2: "#d8b49a", interval: 1.9, hpMul: 1, atkMul: 1, goldMul: 1.1, desc: "따뜻하면 녹아요. 조심." },
    b_lavadragon: { name: "용암 쿠키 드래곤", kind: "dragon", color: "#ff9f8a", color2: "#ffdccf", interval: 2.2, hpMul: 1, atkMul: 1.25, goldMul: 1, boss: true, desc: "입에서 초코가 흘러요." },
    /* W9 */
    m_fairy: { name: "하늘 요정", kind: "fairy", color: "#d6f3ff", color2: "#f2fdff", interval: 1.6, hpMul: 0.85, atkMul: 1.2, goldMul: 1.1, desc: "정원의 꽃에 물을 줘요." },
    m_angelsheep: { name: "천사양", kind: "fluffy", color: "#fff1d6", color2: "#fffbea", interval: 1.9, hpMul: 1.1, atkMul: 1, goldMul: 1, desc: "구름보다 폭신해요." },
    b_phoenix: { name: "정원의 불사조", kind: "bird", color: "#ffcf8a", color2: "#fff0cf", interval: 2.2, hpMul: 1.05, atkMul: 1.2, goldMul: 1, boss: true, desc: "불꽃이 아니라 꽃잎이 타올라요." },
    /* W10 */
    m_ghost: { name: "악몽 유령", kind: "ghost", color: "#c9c2e6", color2: "#efecff", interval: 1.8, hpMul: 1.05, atkMul: 1.05, goldMul: 1, desc: "무서운 척하지만 혼자 있기 싫어요." },
    m_shadowknight: { name: "그림자 기사", kind: "knight", color: "#b0a8c9", color2: "#e4e0f2", interval: 1.9, hpMul: 1.2, atkMul: 1, goldMul: 1.1, desc: "성검을 동경하는 어두운 기사." },
    b_demonking: { name: "종말의 마왕", kind: "demon", color: "#d8a8f0", color2: "#f6e6ff", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "성검의 첫 번째 시험을 준비했어요." },
    /* W11 */
    m_snowpuff: { name: "눈꽃 콩", kind: "fluffy", color: "#e2f4ff", color2: "#ffffff", interval: 1.9, hpMul: 1.05, atkMul: 1, goldMul: 1, desc: "재채기하면 눈보라가 불어요." },
    m_penguin: { name: "펭귄 콩", kind: "bird", color: "#b8c7e8", color2: "#eef3ff", interval: 1.7, hpMul: 1, atkMul: 1.1, goldMul: 1, desc: "뒤뚱뒤뚱, 하지만 빠르게 미끄러져요." },
    b_snowqueen: { name: "설원의 여왕", kind: "queen", color: "#d9ecff", color2: "#ffffff", interval: 2.1, hpMul: 1.05, atkMul: 1.2, goldMul: 1, boss: true, desc: "눈송이로 왕관을 만들었어요." },
    /* W12 */
    m_droplet: { name: "물방울 콩", kind: "blob", color: "#a8dcff", color2: "#e6f7ff", interval: 1.8, hpMul: 1, atkMul: 1.05, goldMul: 1, desc: "톡 튀면 무지개가 생겨요." },
    m_koi: { name: "무지개 잉어", kind: "whale", color: "#ffb3c7", color2: "#fff0f5", interval: 1.8, hpMul: 1.05, atkMul: 1.05, goldMul: 1.05, desc: "일곱 빛깔 비늘을 가졌어요." },
    b_lakedragon: { name: "호수의 용", kind: "dragon", color: "#8fd9c0", color2: "#e6fff7", interval: 2.1, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "호수 깊은 곳에서 무지개를 지켜요." },
    /* W13 */
    m_gear: { name: "톱니 콩", kind: "golem", color: "#d9c9a8", color2: "#f5ecd8", interval: 2.0, hpMul: 1.2, atkMul: 1, goldMul: 1, desc: "돌아가는 걸 멈추면 잠이 와요." },
    m_owl: { name: "시계 부엉이", kind: "bird", color: "#c9b6a8", color2: "#f2e7dd", interval: 1.7, hpMul: 0.95, atkMul: 1.15, goldMul: 1.1, desc: "정각마다 부엉부엉 울어요." },
    b_timekeeper: { name: "시간의 수호자", kind: "crowned", color: "#e8d5a8", color2: "#fff8e6", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "태엽을 감아 세계의 시간을 지켜요." },
    /* W14 */
    m_chick: { name: "초코 병아리", kind: "bird", color: "#ffd98e", color2: "#fff6dd", interval: 1.6, hpMul: 0.9, atkMul: 1.2, goldMul: 1.1, desc: "갓 구워져서 아직 따뜻해요." },
    m_jellybot: { name: "젤리 로봇", kind: "golem", color: "#ffb3c7", color2: "#ffe3ea", interval: 2.0, hpMul: 1.15, atkMul: 1, goldMul: 1, desc: "공장에서 만든 달콤한 일꾼." },
    b_cookiemonarch: { name: "쿠키 마왕", kind: "demon", color: "#c99a6a", color2: "#f2dcc2", interval: 2.0, hpMul: 1.05, atkMul: 1.25, goldMul: 1, boss: true, desc: "부서져도 오븐에서 다시 나와요." },
    /* W15 */
    m_starknight: { name: "별빛 기사", kind: "knight", color: "#dfe6ff", color2: "#ffffff", interval: 1.8, hpMul: 1.1, atkMul: 1.1, goldMul: 1.1, desc: "성검을 지키는 마지막 문지기." },
    m_finalshadow: { name: "종말의 그림자", kind: "ghost", color: "#b0a8c9", color2: "#e4e0f2", interval: 1.7, hpMul: 1.05, atkMul: 1.15, goldMul: 1.1, desc: "성검의 마지막 시험을 응원해요." },
    b_swordguardian: { name: "성검의 수호자", kind: "demon", color: "#ffe08a", color2: "#fffbe6", interval: 1.9, hpMul: 1.1, atkMul: 1.3, goldMul: 1, boss: true, desc: "종말의 성검을 지키는 마지막 보스." }
  };

  /* ---------------------------------------------------------------
     스테이지 자동 생성 (1-1 … 15-15)
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
          desc: isBoss ? `${w.name}의 보스방` : w.desc,
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
    normalHp: 2.6,
    bossHpMul: 10,
    bossAtkMul: 1.2,
    goldBase: 12,
    goldGrowth: 1.5,
    bossGoldMul: 8,
    expBase: 5,
    expGrowth: 1.42,
    bossExpMul: 6,
    waveHeal: 0.07
  };

  /* 보스 패턴 */
  G.PATTERNS = {
    slam: {
      id: "slam", name: "강타", icon: "💥", action: "guard", actionLabel: "🛡️ 방어",
      warn: "묵직한 강타가 날아와요!",
      hint: "방어 버튼으로 피해를 줄여요",
      telegraph: 2.4, mult: 2.8, reduce: 0.25, color: "#ff8f7a"
    },
    charge: {
      id: "charge", name: "돌진", icon: "💨", action: "dodge", actionLabel: "🌀 회피",
      warn: "몸을 낮추고 돌진을 준비해요!",
      hint: "회피 버튼으로 완전히 피해요",
      telegraph: 1.9, mult: 3.2, reduce: 0, color: "#ffb84d"
    },
    shield: {
      id: "shield", name: "보호막", icon: "🛡️", action: "counter", actionLabel: "⚡ 카운터",
      warn: "단단한 보호막을 펼쳤어요!",
      hint: "카운터로 보호막을 깨요",
      telegraph: 0, duration: 5.0, mult: 0, reduce: 0.25, color: "#8ecbf5"
    }
  };

  /* 스킬 */
  G.SKILLS = [
    {
      id: "blossom", name: "벚꽃 회오리", icon: "🌸", unlockLv: 1,
      cd: 9, type: "damage", power: 2.4, perLevel: 0.12,
      desc: "공격력 240%의 회오리 참격", useMsg: "벚꽃 회오리!"
    },
    {
      id: "jelly", name: "힐링 젤리", icon: "🍮", unlockLv: 3,
      cd: 22, type: "heal", power: 0.3, perLevel: 0.02,
      desc: "최대 체력의 30% 회복", useMsg: "힐링 젤리 냠!"
    },
    {
      id: "meteor", name: "별똥별", icon: "🌟", unlockLv: 5,
      cd: 16, type: "damage", power: 4.2, perLevel: 0.18, alwaysCrit: true,
      desc: "공격력 420%의 확정 치명타", useMsg: "별똥별 소환!"
    }
  ];

  /* 유물 */
  G.RELICS = [
    {
      id: "flag", name: "용기의 깃발", icon: "🚩", color: "#ffcf8a",
      unlock: 8, effect: 6, max: 12, unit: "%", stat: "atk",
      text: (v) => `공격력 +${v}%`, desc: "작은 깃발이지만 펄럭이면 용기가 솟아요."
    },
    {
      id: "clover", name: "네잎 클로버", icon: "🍀", color: "#a8e6cf",
      unlock: 10, effect: 1.5, max: 12, unit: "%p", stat: "crit",
      text: (v) => `치명타 확률 +${v}%p`, desc: "가방에 넣어두면 행운이 따라와요."
    },
    {
      id: "key", name: "황금 열쇠", icon: "🔑", color: "#ffe08a",
      unlock: 6, effect: 8, max: 12, unit: "%", stat: "gold",
      text: (v) => `골드 획득 +${v}%`, desc: "어떤 상자든 열리는, 아주 작은 열쇠."
    },
    {
      id: "heart", name: "하트 젤리", icon: "💗", color: "#ffb3c7",
      unlock: 6, effect: 6, max: 12, unit: "%", stat: "hp",
      text: (v) => `최대 체력 +${v}%`, desc: "먹으면 심장이 말랑해져요."
    },
    {
      id: "anvil", name: "대장장이의 모루", icon: "🔨", color: "#c9b6e8",
      unlock: 12, effect: 1, max: 10, unit: "%p", stat: "enhance",
      text: (v) => `강화 성공률 +${v}%p`, desc: "두드릴수록 대장장이의 마음이 단단해져요."
    },
    {
      id: "hourglass", name: "달빛 모래시계", icon: "⏳", color: "#b8dcf7",
      unlock: 10, effect: 12, max: 10, unit: "%", stat: "offline",
      text: (v) => `오프라인 보상 +${v}%`, desc: "자리를 비운 동안에도 별빛이 모여요."
    }
  ];

  /* 업적 */
  G.ACHIEVEMENTS = [
    { id: "first_forge", icon: "⚒️", name: "첫 망치질", desc: "처음으로 무기를 강화했어요", reward: { gold: 200, stones: 2 }, check: (s) => s.stats.tries >= 1 },
    { id: "plus5", icon: "✨", name: "+5강 달성", desc: "무기를 +5강까지 올렸어요", reward: { gold: 800, stones: 5 }, check: (s) => s.stats.maxLv >= 5 },
    { id: "plus10", icon: "🌈", name: "+10강 달성", desc: "무기를 +10강까지 올렸어요", reward: { gold: 3000, stones: 12 }, check: (s) => s.stats.maxLv >= 10 },
    { id: "plus15", icon: "💫", name: "+15강 달성", desc: "무기를 +15강까지 올렸어요", reward: { gold: 12000, stones: 30, frags: 6 }, check: (s) => s.stats.maxLv >= 15 },
    { id: "plus20", icon: "👑", name: "+20강 달성", desc: "무기를 +20강까지 올렸어요", reward: { gold: 60000, stones: 80, frags: 20 }, check: (s) => s.stats.maxLv >= 20 },
    { id: "plus25", icon: "🌟", name: "종말의 성검", desc: "무기를 +25강까지 올렸어요", reward: { gold: 300000, stones: 200, frags: 60 }, check: (s) => s.stats.maxLv >= 25 },
    { id: "try50", icon: "🔨", name: "성실한 대장장이", desc: "강화를 50회 시도했어요", reward: { gold: 1500, stones: 6 }, check: (s) => s.stats.tries >= 50 },
    { id: "try200", icon: "🏅", name: "장인의 손길", desc: "강화를 200회 시도했어요", reward: { gold: 9000, stones: 20, frags: 5 }, check: (s) => s.stats.tries >= 200 },
    { id: "hunt50", icon: "🐾", name: "몽글 사냥꾼", desc: "몬스터를 50마리 쓰러뜨렸어요", reward: { gold: 600, stones: 4 }, check: (s) => s.stats.kills >= 50 },
    { id: "hunt500", icon: "🏹", name: "초원의 별", desc: "몬스터를 500마리 쓰러뜨렸어요", reward: { gold: 8000, stones: 25, frags: 4 }, check: (s) => s.stats.kills >= 500 },
    { id: "boss1", icon: "🍮", name: "첫 보스 격파", desc: "1-10 대왕 푸딩을 물리쳤어요", reward: { gold: 1500, stones: 6, frags: 2 }, check: (s) => (s.stats.bossKills || 0) >= 1 },
    { id: "world3", icon: "🍓", name: "딸기 목장 정복", desc: "세계 3의 보스를 물리쳤어요", reward: { gold: 5000, stones: 15, frags: 5 }, check: (s) => !!s.progress.cleared["3-10"] },
    { id: "world5", icon: "✨", name: "별빛을 건너서", desc: "세계 5의 보스를 물리쳤어요", reward: { gold: 16000, stones: 25, frags: 10 }, check: (s) => !!s.progress.cleared["5-10"] },
    { id: "world10", icon: "🏰", name: "악몽의 성 정복", desc: "세계 10의 보스를 물리쳤어요", reward: { gold: 90000, stones: 80, frags: 30 }, check: (s) => !!s.progress.cleared["10-15"] },
    { id: "world15", icon: "👑", name: "전설의 성검", desc: "세계 15의 마지막 보스를 물리쳤어요", reward: { gold: 500000, stones: 300, frags: 100 }, check: (s) => !!s.progress.cleared["15-15"] },
    { id: "relic3", icon: "🔮", name: "유물 수집가", desc: "유물 3개를 해금했어요", reward: { gold: 2500, stones: 8 }, check: (s) => Object.values(s.relics).filter((r) => r.u).length >= 3 },
    { id: "relicAll", icon: "🎁", name: "유물 도감 완성", desc: "모든 유물을 해금했어요", reward: { gold: 30000, stones: 40, frags: 15 }, check: (s) => Object.values(s.relics).filter((r) => r.u).length >= G.RELICS.length },
    { id: "lvl10", icon: "🌱", name: "성장하는 영웅", desc: "영웅 Lv.10 달성", reward: { gold: 1500, stones: 8 }, check: (s) => s.hero.level >= 10 },
    { id: "lvl30", icon: "🌻", name: "든든한 영웅", desc: "영웅 Lv.30 달성", reward: { gold: 12000, stones: 30, frags: 8 }, check: (s) => s.hero.level >= 30 },
    { id: "lvl60", icon: "🌳", name: "전설의 영웅", desc: "영웅 Lv.60 달성", reward: { gold: 120000, stones: 120, frags: 40 }, check: (s) => s.hero.level >= 60 },
    { id: "gold100k", icon: "💰", name: "부자 대장장이", desc: "골드를 100,000 모았어요", reward: { gold: 5000, stones: 15 }, check: (s) => s.stats.goldEarned >= 100000 },
    { id: "codex10", icon: "📖", name: "도감 수집가", desc: "도감을 10칸 채웠어요", reward: { gold: 3000, stones: 10, frags: 3 }, check: (s) => Object.keys(s.codex).length >= 10 },
    { id: "codexAll", icon: "🏆", name: "몽글 도감 마스터", desc: "모든 몬스터를 기록했어요", reward: { gold: 60000, stones: 80, frags: 25 }, check: (s) => Object.keys(s.codex).length >= Object.keys(G.MONSTERS).length }
  ];

  G.TIPS = [
    "강화는 +0부터 +25까지! +5강부터는 실패하면 단계가 내려가요.",
    "+10강부터는 무기가 부서질 수 있어요. 파괴 방지권을 켜두면 안전!",
    "장인의 기운이 100%가 되면 다음 강화는 무조건 성공해요.",
    "보스방은 X-10(또는 X-15)이에요. 보스를 잡으면 유물 조각을 크게 줘요.",
    "보스의 강타는 '방어', 돌진은 '회피', 보호막은 '카운터'로 대응해요!",
    "유물은 영구 효과예요. 사냥할수록 강해져요.",
    "자리를 비우면 오프라인 보상이 쌓여요. 모래시계 유물로 늘릴 수 있어요.",
    "지나온 사냥터를 다시 골라 골드와 강화석을 모을 수 있어요.",
    "치명타 확률은 네잎 클로버 유물로 올릴 수 있어요."
  ];
})();
