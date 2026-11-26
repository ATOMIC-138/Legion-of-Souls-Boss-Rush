/**
 * 遊戲全域資料與設定檔 (Game Data & Configurations)
 * 包含：
 * - 30 波次制生存規則 (每波 12 秒，逢 5 出特色小 Boss，逢 10 出史詩大 Boss)
 * - 隨從圖鑑 (含 ★3 終極覺醒技 + 單體破甲/範圍平衡)
 * - ★★★★4 星跨種族神話融合配方 (Mythic Fusion Recipes)
 * - 敵人、貪婪黃金哥布林、卵囊、小 Boss (Wave 5/15/25) 與 三大傳說大 Boss (Wave 10/20/30) 圖鑑
 * - 地圖互動聖壇事件 (Shrine Events)
 * - 10 大完整羈絆規則 (Synergy Rules)
 * - 首領寶箱遺物 (Boss Relics)、局外永久天賦 (Meta Upgrades) 與 主角傳說造型商場 (Player Skins)
 */

export const WORLD_CONFIG = {
  width: 2400,
  height: 2400,
  gridSize: 60,
  boundaryPadding: 28,
  waveDuration: 12,
  maxWaves: 30
};

// 隨從圖鑑 (Minion Data - 單體 vs 範圍平衡優化 + ★3 終極覺醒大招)
export const MINION_DATA = [
  {
    id: "m_01",
    name: "骷髏步兵",
    awakenedName: "骸骨死神騎士",
    tier: 1,
    tags: ["Undead", "Warrior"],
    stats: { maxHp: 210, attackPower: 18, attackSpeed: 1.25, range: 58, moveSpeed: 92 },
    attackType: "Melee",
    roleTag: "前排坦克 / 破甲斬擊",
    color: "#94a3b8",
    skillDesc: "前排骨盾衛士，吸引近距離魔物仇恨並格擋傷害",
    ultName: "【★3覺醒】冥界死神劍氣",
    ultDesc: "每 5.5 秒揮出貫穿戰場的巨型冥界新月劍氣，對路徑上所有敵人造成 280% 斬擊傷害！"
  },
  {
    id: "m_02",
    name: "發條射手",
    awakenedName: "殲滅者重砲機神",
    tier: 1,
    tags: ["Mech", "Ranger"],
    stats: { maxHp: 95, attackPower: 25, attackSpeed: 1.15, range: 360, moveSpeed: 104 },
    attackType: "Projectile",
    roleTag: "單體獵首 / 穿甲狙擊",
    color: "#f59e0b",
    skillDesc: "【獵首破甲】對菁英與 Boss 傷害 +45%，每第 4 擊射出 220% 傷害的高爆穿甲狙擊彈",
    ultName: "【★3覺醒】毀滅電磁軌道砲",
    ultDesc: "每 5 秒鎖定強敵發射貫穿全場的高能電磁軌道束，並向四周齊射 10 發追蹤機砲！"
  },
  {
    id: "m_03",
    name: "虛空潛影",
    awakenedName: "次元影皇・阿卡莉",
    tier: 1,
    tags: ["Void", "Assassin"],
    stats: { maxHp: 105, attackPower: 38, attackSpeed: 1.15, range: 68, moveSpeed: 145 },
    attackType: "Melee",
    roleTag: "單體爆發 / 瞬移處決",
    color: "#a855f7",
    skillDesc: "【暗影獵殺】每 3 次普攻瞬移背刺必出爆擊，對高血量首領疊加最高 +60% 連擊破甲印記",
    ultName: "【★3覺醒】次元五連絕影斬",
    ultDesc: "每 5 秒化為無敵暗影，在戰場強敵間連續瞬移斬擊 5 次，每次造成 240% 必爆擊真實傷害！"
  },
  {
    id: "m_04",
    name: "星火小妖",
    awakenedName: "烈陽不死鳥・鳳凰",
    tier: 1,
    tags: ["Elemental", "Mage"],
    stats: { maxHp: 100, attackPower: 17, attackSpeed: 1.3, range: 285, moveSpeed: 96 },
    attackType: "Projectile",
    roleTag: "群體清場 / 元素爆裂",
    color: "#ef4444",
    skillDesc: "【星火爆裂】普攻命中引發範圍火球濺射 (55% AOE 傷害) 與連鎖閃電",
    ultName: "【★3覺醒】天罰烈陽隕石雨",
    ultDesc: "每 5.5 秒召喚 4 顆巨型烈陽隕石轟炸敵群，造成大範圍爆裂傷害！"
  },
  {
    id: "m_05",
    name: "祭祀巨熊",
    awakenedName: "森羅古神・德魯伊",
    tier: 1,
    tags: ["Beast", "Priest"],
    stats: { maxHp: 290, attackPower: 16, attackSpeed: 1.4, range: 74, moveSpeed: 92 },
    attackType: "Melee",
    roleTag: "團隊治療 / 守護震波",
    color: "#10b981",
    skillDesc: "【翡翠治療波】每隔 6.5 秒釋放治療光環，治療全體隨從與召喚師",
    ultName: "【★3覺醒】世界樹神聖庇佑",
    ultDesc: "治療波升級為神聖金綠衝擊波，大幅治療全軍、賦予短暫減傷護盾並震退周圍所有敵人！"
  },
  {
    id: "m_06",
    name: "重裝機兵",
    awakenedName: "雷神泰坦裝甲",
    tier: 1,
    tags: ["Mech", "Warrior"],
    stats: { maxHp: 280, attackPower: 22, attackSpeed: 1.05, range: 64, moveSpeed: 86 },
    attackType: "Melee",
    roleTag: "重裝控制 / 磁暴震地",
    color: "#eab308",
    skillDesc: "重裝泰坦裝甲，高仇恨值並附帶單體重錘破甲傷害",
    ultName: "【★3覺醒】超電磁重力風暴",
    ultDesc: "每 5.5 秒重擊地面引發半徑 160px 電磁震波，將周圍魔物聚攏減速並降下雷霆轟擊！"
  },
  {
    id: "m_07",
    name: "幽魂獵手",
    awakenedName: "冥府萬箭魔弓",
    tier: 1,
    tags: ["Undead", "Ranger"],
    stats: { maxHp: 100, attackPower: 26, attackSpeed: 1.3, range: 340, moveSpeed: 104 },
    attackType: "Projectile",
    roleTag: "穿透神箭 / 首領剋星",
    color: "#38bdf8",
    skillDesc: "【幽冥穿雲箭】靈魂箭矢可穿透 2 個目標，對首領與菁英造成 +45% 破甲傷害",
    ultName: "【★3覺醒】冥王萬箭齊發",
    ultDesc: "每 5 秒朝敵群連續射出 9 支高穿透冥府神箭，瞬間洞穿整排魔物與首領！"
  },
  {
    id: "m_08",
    name: "荒野狂戰",
    awakenedName: "血獄戰神・阿瑞斯",
    tier: 1,
    tags: ["Beast", "Warrior"],
    stats: { maxHp: 230, attackPower: 29, attackSpeed: 1.3, range: 64, moveSpeed: 116 },
    attackType: "Melee",
    roleTag: "狂暴處決 / 旋風吸血",
    color: "#f97316",
    skillDesc: "【狂野嗜血】血量越低傷害與攻速越高，對單一目標連續劈砍傷害遞增",
    ultName: "【★3覺醒】血獄毀滅大旋風",
    ultDesc: "每 5 秒化身烈焰刀刃風暴，對周圍敵人造成 320% 旋風斬擊並恢復自身 25% 生命！"
  }
];

// 🌈 ★★★★4 星「跨種族神話超進化」配方與圖鑑 (Mythic Fusion Recipes)
export const MYTHIC_RECIPES = [
  {
    id: "mythic_01",
    name: "【★★★★神話】煉獄泰坦機神・歐米茄",
    ingredients: ["m_02", "m_06"], // ★★★ 發條射手 + ★★★ 重裝機兵
    altIngredient: "m_04",
    recipeText: "★★★ 發條射手 + ★★★ 重裝機兵 (或星火小妖)",
    tags: ["Mech", "Ranger", "Warrior", "Elemental"],
    stats: { maxHp: 3200, attackPower: 240, attackSpeed: 2.2, range: 400, moveSpeed: 125 },
    attackType: "Projectile",
    color: "#fbbf24",
    skillDesc: "【神話超進化】兼具超高單體重砲與範圍轟炸！普攻同時發射 3 發穿甲電磁砲與追蹤導彈",
    ultName: "【★★★★神話大招】歐米茄滅世核融砲",
    ultDesc: "每 4.5 秒發射全畫面毀滅雷射並降下環狀核融飛彈，對首領造成巨額破甲真傷！"
  },
  {
    id: "mythic_02",
    name: "【★★★★神話】深淵冥王死神・塔納托斯",
    ingredients: ["m_01", "m_03"], // ★★★ 骷髏步兵 + ★★★ 虛空潛影
    altIngredient: "m_07",
    recipeText: "★★★ 骷髏步兵 + ★★★ 虛空潛影 (或幽魂獵手)",
    tags: ["Undead", "Void", "Assassin", "Warrior"],
    stats: { maxHp: 2800, attackPower: 310, attackSpeed: 2.0, range: 95, moveSpeed: 165 },
    attackType: "Melee",
    color: "#e879f9",
    skillDesc: "【神話超進化】揮舞雙頭冥王巨鐮，每次揮砍皆必出爆擊並斬出十字虛空死光！",
    ultName: "【★★★★神話大招】冥界次元千刃斬",
    ultDesc: "每 4.5 秒瞬移收割戰場所有強敵，留下持續絞殺敵人的虛空死神鐮刀陣！"
  },
  {
    id: "mythic_03",
    name: "【★★★★神話】荒古狂雷戰神・芬里爾",
    ingredients: ["m_05", "m_08"], // ★★★ 祭祀巨熊 + ★★★ 荒野狂戰
    altIngredient: "m_01",
    recipeText: "★★★ 祭祀巨熊 + ★★★ 荒野狂戰",
    tags: ["Beast", "Priest", "Warrior", "Elemental"],
    stats: { maxHp: 3800, attackPower: 260, attackSpeed: 2.1, range: 90, moveSpeed: 145 },
    attackType: "Melee",
    color: "#34d399",
    skillDesc: "【神話超進化】荒古雷霆神獸！攻擊附帶狂雷爪擊，並持續散發神聖再生光環保護全軍",
    ultName: "【★★★★神話大招】諸神黃昏・雷霆咆哮",
    ultDesc: "每 5 秒釋放全場雷暴審判並為全軍恢復生命與賦予黃金聖盾！"
  }
];

// 地圖隨機互動聖壇事件 (Shrine Events)
export const SHRINE_TYPES = [
  {
    id: "thunder",
    name: "⚡ 雷霆超載聖壇",
    desc: "站入圈內 3 秒充能：全軍獲得 15 秒【雷霆超載】（攻速+50%、移速+45%、攻擊降下天罰落雷）！",
    color: "#38bdf8",
    secondaryColor: "#fde047",
    icon: "⚡",
    chargeTime: 3.0
  },
  {
    id: "blood",
    name: "🩸 鮮血獻祭祭壇",
    desc: "站入圈內 2.5 秒獻祭 25% 當前生命：立即掉落【📦皇家秘寶箱】並將隨機 ★1 隨從直接晉升 ★2！",
    color: "#f43f5e",
    secondaryColor: "#fb923c",
    icon: "🩸",
    chargeTime: 2.5
  },
  {
    id: "starlight",
    name: "🌟 星辰賜福聖壇",
    desc: "站入圈內 3 秒祈禱：免費獲得 1 次【星辰隨從抽卡】、全軍恢復 35% 生命並獲得 +40 金幣！",
    color: "#facc15",
    secondaryColor: "#a855f7",
    icon: "🌟",
    chargeTime: 3.0
  }
];

// 敵人、黃金哥布林、小 Boss 與三大傳說大 Boss 圖鑑 (難度與壓迫感強化版)
export const ENEMY_DATA = [
  // 一般魔物 (傷害與血量適度強化，讓玩家走位與陣型切換更具挑戰性)
  {
    id: "e_01",
    name: "腐化史萊姆",
    stats: { maxHp: 38, speed: 48, damage: 11, expReward: 1, knockbackResist: 0.15 },
    color: "#84cc16",
    size: 24,
    isBoss: false,
    isElite: false
  },
  {
    id: "e_02",
    name: "狂暴蝙蝠",
    stats: { maxHp: 22, speed: 105, damage: 13, expReward: 2, knockbackResist: 0.0 },
    color: "#ec4899",
    size: 20,
    isBoss: false,
    isElite: false
  },
  {
    id: "e_04",
    name: "深淵魔蛛",
    stats: { maxHp: 68, speed: 74, damage: 16, expReward: 3, knockbackResist: 0.35 },
    color: "#7c3aed",
    size: 26,
    isBoss: false,
    isElite: false
  },
  // 👾 隨機亂入事件：貪婪黃金哥布林盜寶賊
  {
    id: "e_goblin",
    name: "💰 貪婪黃金哥布林",
    subtitle: "限時 14 秒集火擊殺！爆出大量金幣與磁鐵！",
    stats: { maxHp: 620, speed: 118, damage: 0, expReward: 18, knockbackResist: 0.7 },
    color: "#facc15",
    size: 32,
    isBoss: false,
    isElite: true,
    isGoblin: true
  },
  // 阿拉克涅召喚的特殊機制單位：劇毒魔蛛卵囊 & 自爆狂蛛
  {
    id: "e_egg",
    name: "劇毒魔蛛卵囊",
    stats: { maxHp: 460, speed: 0, damage: 0, expReward: 8, knockbackResist: 1.0 },
    color: "#a855f7",
    size: 36,
    isBoss: false,
    isElite: false,
    isEgg: true
  },
  {
    id: "e_spider_bomb",
    name: "菁英自爆魔蛛",
    stats: { maxHp: 110, speed: 130, damage: 28, expReward: 5, knockbackResist: 0.4 },
    color: "#e879f9",
    size: 24,
    isBoss: false,
    isElite: false
  },

  // ⚔️ 逢 5 特色小 Boss (Wave 5 / 15 / 25 — 體型放大、光柱標記、霸體推開小怪)
  {
    id: "mb_05",
    name: "【小Boss】骸骨暴徒隊長",
    subtitle: "蠻牛衝鋒 & 碎骨旋風錘",
    stats: { maxHp: 1850, speed: 54, damage: 28, expReward: 30, knockbackResist: 0.88 },
    color: "#dc2626",
    size: 62,
    isBoss: false,
    isElite: true,
    isMiniBoss: true
  },
  {
    id: "mb_15",
    name: "【小Boss】發條處刑者",
    subtitle: "紅線狙擊雷射 & 高爆定時炸彈",
    stats: { maxHp: 4600, speed: 50, damage: 34, expReward: 48, knockbackResist: 0.9 },
    color: "#f59e0b",
    size: 66,
    isBoss: false,
    isElite: true,
    isMiniBoss: true
  },
  {
    id: "mb_25",
    name: "【小Boss】深淵雙子刺客",
    subtitle: "高速瞬步 & 交叉 X 型次元斬",
    stats: { maxHp: 7500, speed: 92, damage: 40, expReward: 65, knockbackResist: 0.85 },
    color: "#c084fc",
    size: 60,
    isBoss: false,
    isElite: true,
    isMiniBoss: true
  },

  // ============================================================================
  // 👑 Wave 10 傳說君王池 (隨機 3 選 1 降臨・清場單挑決鬥)
  // ============================================================================
  {
    id: "b_10",
    waveTier: 10,
    name: "【Wave 10 君王】煉獄熔岩巨像・伊格尼斯",
    subtitle: "地脈內外環震爆 / 熔岩流星火雨 / 烈焰蠻牛衝鋒",
    stats: { maxHp: 14500, speed: 50, damage: 42, expReward: 110, knockbackResist: 0.98 },
    color: "#ea580c",
    size: 98,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_10_frost",
    waveTier: 10,
    name: "【Wave 10 君王】永冬冰霜暴君・波瑞亞斯",
    subtitle: "極凍內外環冰爆 / 雙螺旋寒冰利刃 / 雪崩破冰連衝",
    stats: { maxHp: 14000, speed: 54, damage: 40, expReward: 110, knockbackResist: 0.98 },
    color: "#38bdf8",
    size: 96,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_10_treant",
    waveTier: 10,
    name: "【Wave 10 君王】腐化世界古樹・尤格拉希爾",
    subtitle: "旋轉荊棘死光 / 劇毒孢子沼澤雨 / 地脈根鬚黑洞",
    stats: { maxHp: 15800, speed: 44, damage: 40, expReward: 110, knockbackResist: 0.99 },
    color: "#22c55e",
    size: 102,
    isBoss: true,
    isElite: true
  },

  // ============================================================================
  // 👑 Wave 20 傳說君王池 (隨機 3 選 1 降臨・清場單挑決鬥)
  // ============================================================================
  {
    id: "b_20",
    waveTier: 20,
    name: "【Wave 20 女皇】深淵織網女皇・阿拉克涅",
    subtitle: "四軌螺旋毒彈幕 / 緩速束縛蛛網 / 劇毒卵囊孵化",
    stats: { maxHp: 46000, speed: 56, damage: 52, expReward: 200, knockbackResist: 0.98 },
    color: "#9333ea",
    size: 102,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_20_mech",
    waveTier: 20,
    name: "【Wave 20 帝皇】殲滅機械帝皇・奧米茄零式",
    subtitle: "十字軌道旋轉雷射 / 地毯式凝固汽油轟炸 / 超載電磁砲連狙",
    stats: { maxHp: 49000, speed: 52, damage: 56, expReward: 200, knockbackResist: 0.99 },
    color: "#f59e0b",
    size: 104,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_20_vampire",
    waveTier: 20,
    name: "【Wave 20 真祖】鮮血緋紅真祖・德古拉",
    subtitle: "腥紅血月內外環 / 血蝠瞬移奇襲牆 / 真祖魔劍螺旋風暴",
    stats: { maxHp: 44000, speed: 64, damage: 54, expReward: 200, knockbackResist: 0.97 },
    color: "#e11d48",
    size: 98,
    isBoss: true,
    isElite: true
  },

  // ============================================================================
  // 👑 Wave 30 終極大君池 (隨機 3 選 1 降臨・清場最終決戰)
  // ============================================================================
  {
    id: "b_30",
    waveTier: 30,
    name: "【Wave 30 終焉】虛空死靈大君・瑪爾扎哈",
    subtitle: "八向旋轉滅世死光 / 亡靈鐵騎彈幕牆 / 靈魂虹吸黑洞",
    stats: { maxHp: 135000, speed: 54, damage: 66, expReward: 400, knockbackResist: 0.99 },
    color: "#ec4899",
    size: 110,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_30_dragon",
    waveTier: 30,
    name: "【Wave 30 終焉】滅世混沌古龍・巴哈姆特",
    subtitle: "焦土旋轉龍息 / 天災龍炎隕石雨 / 神龍俯衝與混沌引力核",
    stats: { maxHp: 148000, speed: 58, damage: 70, expReward: 400, knockbackResist: 0.99 },
    color: "#f97316",
    size: 116,
    isBoss: true,
    isElite: true
  },
  {
    id: "b_30_seraph",
    waveTier: 30,
    name: "【Wave 30 終焉】墮落六翼熾天使・路西法",
    subtitle: "聖魔八芒裁決死光 / 墮天光羽彈幕海 / 創世奇點黑洞與聖槍牆",
    stats: { maxHp: 138000, speed: 60, damage: 68, expReward: 400, knockbackResist: 0.99 },
    color: "#facc15",
    size: 112,
    isBoss: true,
    isElite: true
  }
];

// 逢 10 波次隨機大 Boss 抽選池 (每局每 10 波從 3 位特色君王中隨機降臨 1 位！)
export const WAVE_BOSS_POOLS = {
  10: ["b_10", "b_10_frost", "b_10_treant"],
  20: ["b_20", "b_20_mech", "b_20_vampire"],
  30: ["b_30", "b_30_dragon", "b_30_seraph"]
};

// 10 大完整羈絆規則
export const SYNERGY_RULES = {
  Undead: {
    name: "💀 不死族 (Undead)",
    thresholds: [2, 4],
    descriptions: [
      "(2) 隨從獲得 8% 生命汲取 (主角上限 5HP/s)",
      "(4) 致命傷時以 50% 血量復活一次"
    ]
  },
  Mech: {
    name: "⚙️ 機械 (Mech)",
    thresholds: [2, 4],
    descriptions: [
      "(2) 全軍減傷 15%",
      "(4) 每攻擊 5 次發射高爆穿甲導彈"
    ]
  },
  Warrior: {
    name: "🛡️ 戰士 (Warrior)",
    thresholds: [3, 6],
    descriptions: [
      "(3) 最大血量 +30% 且吸引敵人仇恨",
      "(6) 獲得 50% 物理反傷"
    ]
  },
  Ranger: {
    name: "🏹 遊俠 (Ranger)",
    thresholds: [3, 6],
    descriptions: [
      "(3) 射程 +30%、20% 爆擊率且破甲提升",
      "(6) 遠程攻擊額外分裂 2 發子彈"
    ]
  },
  Priest: {
    name: "✨ 牧師 (Priest)",
    thresholds: [1, 2],
    descriptions: [
      "(1) 每 6.5 秒釋放翡翠治療波回血",
      "(2) 治療波附帶護盾並提升全軍 15% 攻速"
    ]
  },
  Mage: {
    name: "🔮 法師 (Mage)",
    thresholds: [1, 2],
    descriptions: [
      "(1) 攻擊附帶星火濺射 AOE (55% 範圍傷害)",
      "(2) 命中時額外彈射 2 道連鎖閃電"
    ]
  },
  Elemental: {
    name: "🔥 元素 (Elemental)",
    thresholds: [1, 2],
    descriptions: [
      "(1) 元素爆裂範圍 +35%",
      "(2) 技能冷卻縮減 25% 且傷害 +25%"
    ]
  },
  Assassin: {
    name: "🗡️ 刺客 (Assassin)",
    thresholds: [1, 2],
    descriptions: [
      "(1) 瞬移背刺且必爆擊，對首領傷害 +45%",
      "(2) 爆擊傷害提升至 250%"
    ]
  },
  Void: {
    name: "🌌 虛空 (Void)",
    thresholds: [1, 2],
    descriptions: [
      "(1) 攻擊無視抗性並造成 20% 額外真實傷害",
      "(2) 擊殺敵人時引發虛空震波"
    ]
  },
  Beast: {
    name: "🐾 野獸 (Beast)",
    thresholds: [2, 4],
    descriptions: [
      "(2) 全軍移速 +20%、攻速 +20%",
      "(4) 狂野嗜血：全軍攻速 +45%"
    ]
  }
};

// 首領寶箱專屬獎勵池 (領取後會顯示在左上角 Relic Inventory 遺物裝備欄)
export const BOSS_CHEST_REWARDS = [
  {
    id: "relic_magnet",
    name: "✨ 奧術引力聖物",
    shortName: "引力聖物",
    desc: "主角拾取範圍永久 +55%，並立即全圖吸取一次寶石！",
    icon: "🧲",
    type: "relic"
  },
  {
    id: "relic_boots",
    name: "⚡ 疾風行者之靴",
    shortName: "疾風之靴",
    desc: "主角與全體隨從移動速度永久 +22%，閃現冷卻縮短 0.8 秒！",
    icon: "🥾",
    type: "relic"
  },
  {
    id: "relic_staff",
    name: "🔮 大魔導雙子星核",
    shortName: "雙子星核",
    desc: "主角奧術法杖升級為多發連射，且法杖傷害永久 +12！",
    icon: "🪄",
    type: "relic"
  },
  {
    id: "relic_banner",
    name: "🚩 統帥戰爭號角",
    shortName: "戰爭號角",
    desc: "全體隨從攻擊速度永久 +25%，狂暴號角持續時間 +2 秒！",
    icon: "📯",
    type: "relic"
  },
  {
    id: "relic_slayer",
    name: "🗡️ 弒神破甲聖劍",
    shortName: "弒神聖劍",
    desc: "全軍爆擊率永久 +15%，且對菁英與傳說大 Boss 傷害額外 +30%！",
    icon: "🗡️",
    type: "relic"
  },
  {
    id: "relic_aegis",
    name: "🛡️ 不朽泰坦聖盾",
    shortName: "泰坦聖盾",
    desc: "主角與隨從最大生命值永久 +25%，鐵壁陣型減傷再 +15%！",
    icon: "🛡️",
    type: "relic"
  },
  {
    id: "reward_reinforce",
    name: "👑 皇家隨從空投箱",
    shortName: "皇家空投",
    desc: "立即隨機獲得 2 隻隨從加入大軍（可直接觸發三合一升星）！",
    icon: "🎁",
    type: "minions"
  }
];

// 局外永久天賦配置
export const META_UPGRADE_CONFIG = [
  {
    id: "maxHpLevel",
    name: "❤️ 召喚師體魄",
    desc: "每級永久提升開局最大生命 +25",
    baseCost: 30,
    costStep: 25,
    maxLevel: 10
  },
  {
    id: "startMinionsLevel",
    name: "👥 初始隨從編隊",
    desc: "每級開局額外多帶 +1 隻隨機隨從 (最高 +4)",
    baseCost: 60,
    costStep: 60,
    maxLevel: 4
  },
  {
    id: "rerollLevel",
    name: "🎲 命運重骰次數",
    desc: "每級增加三選一抽卡刷新 (Reroll) 次數 +2",
    baseCost: 40,
    costStep: 35,
    maxLevel: 6
  },
  {
    id: "attackBonusLevel",
    name: "⚔️ 統帥戰意強化",
    desc: "每級永久提升全軍隨從與主角傷害 +10%",
    baseCost: 45,
    costStep: 40,
    maxLevel: 8
  },
  {
    id: "greedLevel",
    name: "💰 皇家賞金契約",
    desc: "每級永久提升結算與哥布林金幣收益 +20%",
    baseCost: 50,
    costStep: 45,
    maxLevel: 5
  }
];

// 👑 主角傳說造型與炫酷神兵光環商場 (Cosmetic Skins & Weapon Auras)
export const PLAYER_SKINS = [
  {
    id: "skin_default",
    name: "🧙‍♂️ 星界大召喚師",
    subtitle: "經典星藍魔導袍・奧術水晶杖",
    desc: "標準星界大召喚師裝束，散發沉穩的青藍星辰法陣。",
    cost: 0,
    capeColor: "#1d4ed8",
    robeColor: "#1e3a8a",
    trimColor: "#facc15",
    auraColor: "#38bdf8",
    projectileColor: "#38bdf8",
    wingType: "none",
    bonusDesc: "基礎平衡形態"
  },
  {
    id: "skin_inferno",
    name: "🔥 紅蓮煉獄魔導皇",
    subtitle: "黑金熔岩帝王披風・惡魔角冠・鳳凰火杖",
    desc: "展開熾熱火焰魔翼、頭戴黑曜金角王冠，腳踏紅蓮業火法陣！",
    cost: 180,
    capeColor: "#991b1b",
    robeColor: "#450a0a",
    trimColor: "#f97316",
    auraColor: "#f97316",
    projectileColor: "#fb923c",
    wingType: "flame_wings",
    bonusDesc: "裝備加成：主角與全軍攻擊力 +12%"
  },
  {
    id: "skin_void",
    name: "🌌 虛空星神大君",
    subtitle: "次元紫晶星翼・懸浮星冕・銀河聖杖",
    desc: "背後展開六片懸浮虛空星能水晶翼，腳下旋轉銀河黑洞星盤！",
    cost: 320,
    capeColor: "#581c87",
    robeColor: "#2e1065",
    trimColor: "#e879f9",
    auraColor: "#c084fc",
    projectileColor: "#e879f9",
    wingType: "void_wings",
    bonusDesc: "裝備加成：全軍移速 +10%、閃現冷卻 -0.5 秒"
  },
  {
    id: "skin_seraph",
    name: "⚡ 熾天使黃金武神",
    subtitle: "璀璨六翼黃金聖羽・神聖太陽輪・裁決雷杖",
    desc: "傳說級至高造型！展開璀璨黃金聖羽與太陽神環，法杖射出金色裁決聖雷！",
    cost: 500,
    capeColor: "#b45309",
    robeColor: "#78350f",
    trimColor: "#fef08a",
    auraColor: "#facc15",
    projectileColor: "#fde047",
    wingType: "seraph_wings",
    bonusDesc: "裝備加成：全軍攻速 +15%、開局最大生命 +40"
  }
];
