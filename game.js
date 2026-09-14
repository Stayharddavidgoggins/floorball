// UI
const menuEl = document.getElementById("menu");
const gameUIEl = document.getElementById("gameUI");
const modeSelect = document.getElementById("modeSelect");
const modeTypeSelect = document.getElementById("modeTypeSelect");
const kitSelect = document.getElementById("kitSelect");
const colorSelect = document.getElementById("colorSelect");
const refreshShopBtn = document.getElementById("refreshShopBtn");
const shopItemsEl = document.getElementById("shopItems");
const ultraBtn = document.getElementById("ultraBtn");
const startGameBtn = document.getElementById("startGameBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");

const levelText = document.getElementById("levelText");
const xpText = document.getElementById("xpText");
const rankText = document.getElementById("rankText");
const rankPointsText = document.getElementById("rankPointsText");
const coinsText = document.getElementById("coinsText");
const seasonText = document.getElementById("seasonText");

const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

const buyPassBtn = document.getElementById("buyPassBtn");
const toggleBPBtn = document.getElementById("toggleBPBtn");
const bpPanel = document.getElementById("bpPanel");
const bpOwnedText = document.getElementById("bpOwnedText");
const bpXPText = document.getElementById("bpXPText");
const bpMissionsEl = document.getElementById("bpMissions");
const bpTiersEl = document.getElementById("bpTiers");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreAEl = document.getElementById("scoreA");
const scoreBEl = document.getElementById("scoreB");
const timeTextEl = document.getElementById("timeText");
const hudTextEl = document.getElementById("hudText");

const crowdLoop = document.getElementById("crowdLoop");
const crowdCheer = document.getElementById("crowdCheer");

const FIELD_W = canvas.width;
const FIELD_H = canvas.height;

let state = "menu"; // menu, walkout, lineup, game, victory

let scoreA = 0;
let scoreB = 0;
let matchTime = 600;
let timerRunning = true;

let players = [];
let ball = { x: FIELD_W / 2, y: FIELD_H / 2, vx: 0, vy: 0, r: 5, owner: null };

const TEAM_A = 0;
const TEAM_B = 1;

let touchState = { active: false, id: null, x: 0, y: 0 };

let shopInventory = [];
let ownedBoosts = { speed: 0, agility: 0, ultra: 0 };

// cosmetics inventory
let cosmetics = {
  specialKitTier: 0,   // 0 = none, 1..10 = prestige kits
  accessoryMask: false,
  accessoryVisor: false,
  accessoryGlow: false,
  entranceStyle: "none", // "none", "flex", "spin"
  victoryStyle: "none"   // "none", "pose", "dance"
};

let crowdIntensity = 0;

// progression + seasons
let level = 1;
let xp = 0;
let rankPoints = 0;
let coins = 0;
let season = 1;

// match history
let matchHistory = [];

// walkout / lineup / victory
let walkoutTimer = 0;
let lineupTimer = 0;
let victoryTimer = 0;

// opponent stats
function generateOpponentStats() {
  for (const p of players) {
    if (p.team === TEAM_B) {
      p.stats = {
        level: Math.floor(Math.random() * 20) + 1,
        peakRank: ["Bronze", "Silver", "Gold", "Platinum", "Legend"][Math.floor(Math.random() * 5)],
        currentRank: ["Unranked", "Bronze", "Silver", "Gold", "Platinum", "Legend"][Math.floor(Math.random() * 6)],
        gamesPlayed: Math.floor(Math.random() * 500) + 20,
        goals: Math.floor(Math.random() * 200),
        assists: Math.floor(Math.random() * 150)
      };
    }
  }
}

// battle pass
let bpOwned = false;
let bpXP = 0;
let bpTiers = [];
let bpMissions = [];

// BP setup
function initBattlePass() {
  bpTiers = [];
  for (let i = 1; i <= 100; i++) {
    bpTiers.push({
      tier: i,
      requiredXP: i * 100,
      claimed: false,
      reward: generateTierReward(i)
    });
  }
  generateMissions();
  loadBPState();
  renderBP();
}

function generateTierReward(tier) {
  // tie cosmetics to higher tiers
  if (tier === 20) return { type: "kit", name: "Prestige Kit I", level: 1 };
  if (tier === 40) return { type: "kit", name: "Prestige Kit II", level: 2 };
  if (tier === 60) return { type: "kit", name: "Prestige Kit III", level: 3 };
  if (tier === 80) return { type: "kit", name: "Prestige Kit IV", level: 4 };
  if (tier === 100) return { type: "kit", name: "Prestige Kit V", level: 5 };

  if (tier === 25) return { type: "accessory", name: "Mask", mask: true };
  if (tier === 50) return { type: "accessory", name: "Visor", visor: true };
  if (tier === 75) return { type: "accessory", name: "Glow", glow: true };

  if (tier === 30) return { type: "entrance", name: "Flex Entrance", style: "flex" };
  if (tier === 70) return { type: "entrance", name: "Spin Entrance", style: "spin" };

  if (tier === 35) return { type: "victory", name: "Victory Pose", style: "pose" };
  if (tier === 90) return { type: "victory", name: "Victory Dance", style: "dance" };

  if (tier % 5 === 0) {
    return { type: "boost", name: "Stat Boost +" + (tier / 5), speed: 0.05, agility: 0.05 };
  }
  return { type: "coins", name: "Coins Reward", amount: 50 };
}

function generateMissions() {
  bpMissions = [
    {
      id: "daily_goals",
      name: "Score 3 goals (any mode)",
      target: 3,
      progress: 0,
      rewardXP: 150,
      type: "daily"
    },
    {
      id: "daily_skills",
      name: "Perform 10 skill moves",
      target: 10,
      progress: 0,
      rewardXP: 150,
      type: "daily"
    },
    {
      id: "weekly_ranked",
      name: "Win 5 ranked matches",
      target: 5,
      progress: 0,
      rewardXP: 500,
      type: "weekly"
    },
    {
      id: "weekly_block",
      name: "Play 10 matches",
      target: 10,
      progress: 0,
      rewardXP: 500,
      type: "weekly"
    }
  ];
}

function loadBPState() {
  const savedOwned = localStorage.getItem("floorballBPOwned");
  const savedXP = localStorage.getItem("floorballBPXP");
  const savedTiers = localStorage.getItem("floorballBPTiers");
  const savedMissions = localStorage.getItem("floorballBPMissions");
  const savedCosmetics = localStorage.getItem("floorballCosmetics");

  bpOwned = savedOwned === "true";
  bpXP = savedXP ? parseInt(savedXP, 10) : 0;
  if (savedTiers) bpTiers = JSON.parse(savedTiers);
  if (savedMissions) bpMissions = JSON.parse(savedMissions);
  if (savedCosmetics) cosmetics = JSON.parse(savedCosmetics);

  updateBPUI();
}

function saveBPState() {
  localStorage.setItem("floorballBPOwned", bpOwned ? "true" : "false");
  localStorage.setItem("floorballBPXP", String(bpXP));
  localStorage.setItem("floorballBPTiers", JSON.stringify(bpTiers));
  localStorage.setItem("floorballBPMissions", JSON.stringify(bpMissions));
  localStorage.setItem("floorballCosmetics", JSON.stringify(cosmetics));
}

function updateBPUI() {
  bpOwnedText.textContent = bpOwned ? "Yes" : "No";
  bpXPText.textContent = bpXP;
}

function renderBP() {
  updateBPUI();
  bpMissionsEl.innerHTML = "";
  bpMissions.forEach(m => {
    const div = document.createElement("div");
    div.classList.add("bpMission");
    const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
    div.textContent = `${m.name} [${m.type}] — ${m.progress}/${m.target} (${pct}%) — Reward: ${m.rewardXP} BP XP`;
    bpMissionsEl.appendChild(div);
  });

  bpTiersEl.innerHTML = "";
  bpTiers.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("bpTier");
    const unlocked = bpXP >= t.requiredXP;
    if (unlocked) div.classList.add("unlocked");
    if (t.claimed) div.classList.add("claimed");
    const left = document.createElement("span");
    left.textContent = `Tier ${t.tier} — Req: ${t.requiredXP} BP XP`;
    const right = document.createElement("span");
    let desc;
    switch (t.reward.type) {
      case "coins":
        desc = `Coins +${t.reward.amount}`;
        break;
      case "boost":
        desc = `Boost: +${t.reward.speed.toFixed(2)} SPD / +${t.reward.agility.toFixed(2)} AGI`;
        break;
      case "kit":
        desc = `Special Kit: ${t.reward.name}`;
        break;
      case "accessory":
        desc = `Accessory: ${t.reward.name}`;
        break;
      case "entrance":
        desc = `Entrance: ${t.reward.name}`;
        break;
      case "victory":
        desc = `Victory: ${t.reward.name}`;
        break;
      default:
        desc = t.reward.name;
    }
    right.textContent = desc;
    div.appendChild(left);
    div.appendChild(right);
    if (unlocked && !t.claimed && bpOwned) {
      div.style.cursor = "pointer";
      div.onclick = () => claimTierReward(t);
    }
    bpTiersEl.appendChild(div);
  });
}

function claimTierReward(tierObj) {
  if (tierObj.claimed) return;
  if (bpXP < tierObj.requiredXP) return;
  tierObj.claimed = true;

  switch (tierObj.reward.type) {
    case "coins":
      coins += tierObj.reward.amount;
      break;
    case "boost":
      ownedBoosts.speed += tierObj.reward.speed;
      ownedBoosts.agility += tierObj.reward.agility;
      break;
    case "kit":
      cosmetics.specialKitTier = Math.max(cosmetics.specialKitTier, tierObj.reward.level);
      break;
    case "accessory":
      if (tierObj.reward.mask) cosmetics.accessoryMask = true;
      if (tierObj.reward.visor) cosmetics.accessoryVisor = true;
      if (tierObj.reward.glow) cosmetics.accessoryGlow = true;
      break;
    case "entrance":
      cosmetics.entranceStyle = tierObj.reward.style;
      break;
    case "victory":
      cosmetics.victoryStyle = tierObj.reward.style;
      break;
  }

  updateProgressUI();
  saveBPState();
  renderBP();
  alert("Battle Pass reward claimed: " + tierObj.reward.name);
}

function addBPXP(amount) {
  if (!bpOwned) return;
  bpXP += amount;
  updateBPUI();
  saveBPState();
  renderBP();
}

// mission progress hooks
function missionEvent(eventType) {
  bpMissions.forEach(m => {
    if (eventType === "goal" && m.id === "daily_goals") m.progress++;
    if (eventType === "skill" && m.id === "daily_skills") m.progress++;
    if (eventType === "match_played" && m.id === "weekly_block") m.progress++;
    if (eventType === "ranked_win" && m.id === "weekly_ranked") m.progress++;
    if (m.progress >= m.target && !m.completed) {
      m.completed = true;
      addBPXP(m.rewardXP);
      alert("Mission completed: " + m.name + " — +" + m.rewardXP + " BP XP");
    }
  });
  saveBPState();
  renderBP();
}

// BP buttons
buyPassBtn.onclick = () => {
  const cost = 2000;
  if (bpOwned) {
    alert("You already own the Battle Pass this season.");
    return;
  }
  if (coins < cost) {
    alert("You need " + cost + " coins to buy the Battle Pass.");
    return;
  }
  coins -= cost;
  bpOwned = true;
  updateProgressUI();
  saveBPState();
  renderBP();
  alert("Battle Pass purchased! Grind missions to unlock unique rewards.");
};

toggleBPBtn.onclick = () => {
  bpPanel.style.display = bpPanel.style.display === "none" ? "block" : "none";
};

// progression UI
function updateProgressUI() {
  levelText.textContent = level;
  xpText.textContent = xp;
  rankPointsText.textContent = rankPoints;
  coinsText.textContent = coins;
  rankText.textContent = getRankName(rankPoints);
  seasonText.textContent = season;
}

function getRankName(rp) {
  if (rp < 100) return "Unranked";
  if (rp < 200) return "Bronze";
  if (rp < 400) return "Silver";
  if (rp < 700) return "Gold";
  if (rp < 1000) return "Platinum";
  return "Legend";
}

function addXP(amount) {
  xp += amount;
  let needed = level * 100;
  while (xp >= needed) {
    xp -= needed;
    level++;
    alert("Level up! You are now level " + level);
    needed = level * 100;
  }
  updateProgressUI();
}

function addCoins(amount) {
  coins += amount;
  updateProgressUI();
}

function addRankPoints(amount) {
  rankPoints += amount;
  if (rankPoints < 0) rankPoints = 0;
  updateProgressUI();
}

// seasons
function getToday() {
  return new Date().getTime();
}

function loadSeason() {
  const savedSeason = parseInt(localStorage.getItem("floorballSeason") || "1", 10);
  const savedStart = parseInt(localStorage.getItem("floorballSeasonStart") || "0", 10);
  season = savedSeason;
  const now = getToday();
  if (savedStart === 0) {
    localStorage.setItem("floorballSeasonStart", String(now));
  } else {
    const diffDays = (now - savedStart) / (1000 * 60 * 60 * 24);
    if (diffDays >= 60) {
      season++;
      localStorage.setItem("floorballSeason", String(season));
      localStorage.setItem("floorballSeasonStart", String(now));
      rankPoints = 0;
      addCoins(500);
      bpOwned = false;
      bpXP = 0;
      bpTiers.forEach(t => (t.claimed = false));
      cosmetics = {
        specialKitTier: 0,
        accessoryMask: false,
        accessoryVisor: false,
        accessoryGlow: false,
        entranceStyle: "none",
        victoryStyle: "none"
      };
      generateMissions();
      saveBPState();
      alert("New season started! Season " + season + ". Rank points reset, Battle Pass reset, cosmetics reset, bonus coins awarded.");
    }
  }
  updateProgressUI();
}

// daily shop
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function randomShopItems() {
  const allItems = [
    { name: "Speed Kit +1", type: "speed", value: 0.1, cost: 50 },
    { name: "Speed Kit +2", type: "speed", value: 0.2, cost: 100 },
    { name: "Agility Kit +1", type: "agility", value: 0.1, cost: 50 },
    { name: "Agility Kit +2", type: "agility", value: 0.2, cost: 100 },
    { name: "Balanced Kit", type: "speed", value: 0.1, extraType: "agility", extraValue: 0.1, cost: 120 }
  ];
  shopInventory = [];
  for (let i = 0; i < 3; i++) {
    shopInventory.push(allItems[Math.floor(Math.random() * allItems.length)]);
  }
  renderShop();
  localStorage.setItem("floorballShopDay", getTodayKey());
  localStorage.setItem("floorballShopItems", JSON.stringify(shopInventory));
}

function loadDailyShop() {
  const savedDay = localStorage.getItem("floorballShopDay");
  const today = getTodayKey();
  if (savedDay === today) {
    const savedItems = localStorage.getItem("floorballShopItems");
    if (savedItems) {
      shopInventory = JSON.parse(savedItems);
      renderShop();
      return;
    }
  }
  randomShopItems();
}

function renderShop() {
  shopItemsEl.innerHTML = "";
  shopInventory.forEach(item => {
    const btn = document.createElement("button");
    btn.textContent = `${item.name} - ${item.cost} coins`;
    btn.onclick = () => {
      if (coins < item.cost) {
        alert("Not enough coins.");
        return;
      }
      coins -= item.cost;
      ownedBoosts[item.type] += item.value;
      if (item.extraType) ownedBoosts[item.extraType] += item.extraValue;
      updateProgressUI();
      alert(
        "Bought: " + item.name +
        "\nSpeed boost: " + ownedBoosts.speed.toFixed(2) +
        " | Agility boost: " + ownedBoosts.agility.toFixed(2)
      );
    };
    shopItemsEl.appendChild(btn);
  });
}

refreshShopBtn.onclick = () => {
  randomShopItems();
};

// ultra pack
ultraBtn.onclick = () => {
  const requiredLevel = 5;
  const cost = 500;
  if (level < requiredLevel) {
    alert("You need to be at least level " + requiredLevel + " to buy Ultra Boost Pack.");
    return;
  }
  if (coins < cost) {
    alert("You need " + cost + " coins to buy Ultra Boost Pack.");
    return;
  }
  coins -= cost;
  ownedBoosts.ultra += 1;
  ownedBoosts.speed += 0.3;
  ownedBoosts.agility += 0.3;
  updateProgressUI();
  alert("Ultra Boost Pack purchased! Massive boosts applied.");
};

// match history
function loadHistory() {
  const saved = localStorage.getItem("floorballHistory");
  if (saved) {
    matchHistory = JSON.parse(saved);
  } else {
    matchHistory = [];
  }
  renderHistory();
}

function saveHistory() {
  localStorage.setItem("floorballHistory", JSON.stringify(matchHistory));
}

function renderHistory() {
  historyList.innerHTML = "";
  matchHistory.slice().reverse().forEach(entry => {
    const card = document.createElement("div");
    card.classList.add("historyCard");
    card.classList.add(entry.result);
    const header = document.createElement("div");
    header.classList.add("historyHeader");
    header.textContent = `${entry.result.toUpperCase()} — ${entry.modeType} ${entry.mode}v${entry.mode}`;
    const meta = document.createElement("div");
    meta.classList.add("historyMeta");
    meta.textContent = entry.date;
    const body = document.createElement("div");
    body.innerHTML =
      `XP: +${entry.xpGain} | Coins: +${entry.coinGain}` +
      (entry.modeType === "ranked" ? ` | RP: ${entry.rpChange > 0 ? "+" : ""}${entry.rpChange}` : "");
    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(body);
    historyList.appendChild(card);
  });
}

toggleHistoryBtn.onclick = () => {
  historyPanel.style.display = historyPanel.style.display === "none" ? "block" : "none";
};

clearHistoryBtn.onclick = () => {
  if (confirm("Clear all match history?")) {
    matchHistory = [];
    saveHistory();
    renderHistory();
  }
};

// start / back
startGameBtn.onclick = () => {
  startMatch();
};

backToMenuBtn.onclick = () => {
  state = "menu";
  gameUIEl.style.display = "none";
  menuEl.style.display = "block";
  try { crowdLoop.pause(); } catch (e) {}
};

// match start with walkout
function startMatch() {
  state = "walkout";
  menuEl.style.display = "none";
  gameUIEl.style.display = "block";

  scoreA = 0;
  scoreB = 0;
  matchTime = 600;
  timerRunning = true;
  scoreAEl.textContent = "0";
  scoreBEl.textContent = "0";
  hudTextEl.textContent = modeTypeSelect.value === "ranked" ? "Ranked Match" : "Casual Match";

  const mode = parseInt(modeSelect.value, 10);
  applyKitBoosts();
  createTeams(mode);
  generateOpponentStats();
  prepareWalkout();

  missionEvent("match_played");

  try {
    crowdLoop.volume = 0.3;
    crowdLoop.play();
  } catch (e) {}
}

function applyKitBoosts() {
  if (kitSelect.value === "speed") {
    ownedBoosts.speed += 0.1;
  } else if (kitSelect.value === "agility") {
    ownedBoosts.agility += 0.1;
  }
}

// teams with keepers
function createTeams(countPerSide) {
  players = [];
  const spacingY = FIELD_H / (countPerSide + 1);
  const baseColor = colorSelect.value;

  for (let i = 0; i < countPerSide; i++) {
    players.push({
      team: TEAM_A,
      x: -40,
      y: spacingY * (i + 1),
      vx: 0,
      vy: 0,
      baseSpeed: 2.2,
      speed: 2.2,
      hasBall: false,
      stamina: 1.0,
      color: baseColor,
      keeper: false,
      cosmetic: { ...cosmetics } // apply player cosmetics
    });
  }

  players.push({
    team: TEAM_A,
    x: -40,
    y: FIELD_H / 2,
    vx: 0,
    vy: 0,
    baseSpeed: 1.8,
    speed: 1.8,
    hasBall: false,
    stamina: 1.0,
    color: baseColor,
    keeper: true,
    cosmetic: { ...cosmetics }
  });

  for (let i = 0; i < countPerSide; i++) {
    players.push({
      team: TEAM_B,
      x: FIELD_W - 80,
      y: spacingY * (i + 1),
      vx: 0,
      vy: 0,
      baseSpeed: 2.0,
      speed: 2.0,
      hasBall: false,
      stamina: 1.0,
      color: "#ff4444",
      keeper: false,
      cosmetic: { specialKitTier: 0, accessoryMask: false, accessoryVisor: false, accessoryGlow: false, entranceStyle: "none", victoryStyle: "none" }
    });
  }

  players.push({
    team: TEAM_B,
    x: FIELD_W - 30,
    y: FIELD_H / 2,
    vx: 0,
    vy: 0,
    baseSpeed: 1.8,
    speed: 1.8,
    hasBall: false,
    stamina: 1.0,
    color: "#ff4444",
    keeper: true,
    cosmetic: { specialKitTier: 0, accessoryMask: false, accessoryVisor: false, accessoryGlow: false, entranceStyle: "none", victoryStyle: "none" }
  });

  ball.owner = null;
  ball.x = FIELD_W / 2;
  ball.y = FIELD_H / 2;
}

// walkout setup
function prepareWalkout() {
  walkoutTimer = 0;
  lineupTimer = 0;
  victoryTimer = 0;
  const teamA = players.filter(p => p.team === TEAM_A);
  teamA.forEach((p, i) => {
    p.x = -40;
    p.y = FIELD_H / 2 - (teamA.length * 12) + i * 24;
  });
}

// touch controls
canvas.addEventListener("touchstart", e => {
  if (state !== "game") return;
  e.preventDefault();
  const t = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  const y = t.clientY - rect.top;

  touchState.active = true;
  touchState.id = t.identifier;
  touchState.x = x;
  touchState.y = y;

  const p = players[0];

  if (x < FIELD_W * 0.5) return;

  if (y < FIELD_H * 0.33) {
    doPass(p);
    touchState.active = false;
  } else if (y < FIELD_H * 0.66) {
    doAdvancedSkill(p);
    missionEvent("skill");
    touchState.active = false;
  } else {
    doShot(p);
    touchState.active = false;
  }
});

canvas.addEventListener("touchmove", e => {
  if (state !== "game") return;
  e.preventDefault();
  const t = e.changedTouches[0];
  if (t.identifier !== touchState.id) return;
  const rect = canvas.getBoundingClientRect();
  touchState.x = t.clientX - rect.left;
  touchState.y = t.clientY - rect.top;
});

canvas.addEventListener("touchend", e => {
  if (state !== "game") return;
  e.preventDefault();
  touchState.active = false;
});

// skills
function doAdvancedSkill(p) {
  if (!p.hasBall || p.stamina <= 0.2) return;
  p.x += 40 * (1 + ownedBoosts.agility + ownedBoosts.ultra * 0.5);
  p.y += (Math.random() > 0.5 ? 1 : -1) * 20;
  p.stamina -= 0.2;
}

function doPass(p) {
  if (!p.hasBall) return;
  let best = null;
  let bestDist = Infinity;
  for (const t of players) {
    if (t.team === p.team && t !== p) {
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
  }
  if (!best) return;
  ball.owner = null;
  p.hasBall = false;
  const dx = best.x - p.x;
  const dy = best.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const power = 4 + ownedBoosts.agility * 4;
  ball.x = p.x;
  ball.y = p.y;
  ball.vx = (dx / dist) * power;
  ball.vy = (dy / dist) * power;
}

function doShot(p) {
  if (!p.hasBall) return;
  ball.owner = null;
  p.hasBall = false;
  const powerBase = 6 + ownedBoosts.speed * 10 + ownedBoosts.ultra * 5;
  const dx = FIELD_W;
  const dy = FIELD_H / 2 - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  ball.x = p.x;
  ball.y = p.y;
  ball.vx = (dx / dist) * powerBase;
  ball.vy = (dy / dist) * powerBase * (0.3 + ownedBoosts.agility + ownedBoosts.ultra * 0.2);
  p.stamina -= 0.25;
}

// controlled player
function updateControlled(dt) {
  const p = players[0];
  if (touchState.active && touchState.x < FIELD_W * 0.5) {
    const dx = touchState.x - FIELD_W * 0.25;
    const dy = touchState.y - FIELD_H * 0.5;
    const dist = Math.hypot(dx, dy);
    if (dist > 10 && p.stamina > 0.05) {
      const speedBoost = ownedBoosts.speed + ownedBoosts.ultra * 0.3;
      const agilityBoost = ownedBoosts.agility + ownedBoosts.ultra * 0.3;
      const speed = p.baseSpeed * (1 + speedBoost) * (0.5 + p.stamina * 0.5);
      p.vx = (dx / dist) * speed;
      p.vy = (dy / dist) * speed * (1 + agilityBoost);
      p.stamina -= 0.002 * dt;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
  } else {
    p.vx = 0;
    p.vy = 0;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

// AI + keepers
function updateAI(dt) {
  for (const p of players) {
    if (p.team === TEAM_B && !p.keeper) {
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = p.baseSpeed * (0.5 + p.stamina * 0.5);
      p.vx = (dx / dist) * speed;
      p.vy = (dy / dist) * speed;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    if (p.keeper) {
      const targetY = ball.y;
      p.y += (targetY - p.y) * 0.05 * dt;
      if (p.team === TEAM_A) {
        p.x = Math.max(20, p.x - 0.1 * dt);
      } else {
        p.x = Math.min(FIELD_W - 20, p.x + 0.1 * dt);
      }
    }
  }
}

// stamina
function updateStamina(dt) {
  for (const p of players) {
    p.stamina += 0.0015 * dt;
    if (p.stamina > 1) p.stamina = 1;
    if (p.stamina < 0) p.stamina = 0;
  }
}

// ball
function updateBall(dt) {
  if (ball.owner != null) {
    const p = players[ball.owner];
    ball.x = p.x + 10;
    ball.y = p.y;
    ball.vx = 0;
    ball.vy = 0;
    return;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= 0.99;
  ball.vy *= 0.99;

  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.vx *= -0.6;
  }
  if (ball.x > FIELD_W - ball.r) {
    ball.x = FIELD_W - ball.r;
    ball.vx *= -0.6;
  }
  if (ball.y < ball.r) {
    ball.y = ball.r;
    ball.vy *= -0.6;
  }
  if (ball.y > FIELD_H - ball.r) {
    ball.y = FIELD_H - ball.r;
    ball.vy *= -0.6;
  }

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < 14) {
      ball.owner = i;
      p.hasBall = true;
      break;
    }
  }

  if (ball.x < 10 && ball.y > FIELD_H / 2 - 40 && ball.y < FIELD_H / 2 + 40) {
    scoreB++;
    scoreBEl.textContent = scoreB;
    missionEvent("goal");
    triggerGoal();
  }
  if (ball.x > FIELD_W - 10 && ball.y > FIELD_H / 2 - 40 && ball.y < FIELD_H / 2 + 40) {
    scoreA++;
    scoreAEl.textContent = scoreA;
    missionEvent("goal");
    triggerGoal();
  }
}

function triggerGoal() {
  crowdIntensity = 1.0;
  try {
    crowdCheer.currentTime = 0;
    crowdCheer.play();
  } catch (e) {}
  const mode = parseInt(modeSelect.value, 10);
  createTeams(mode);
  generateOpponentStats();
  ball.owner = 0;
  ball.x = players[0].x + 10;
  ball.y = players[0].y;
}

// timer + match result
function updateTimer(dt) {
  if (!timerRunning) return;
  matchTime -= dt / 60;
  if (matchTime <= 0) {
    matchTime = 0;
    timerRunning = false;
    endMatch();
  }
  const min = Math.floor(matchTime / 60);
  const sec = Math.floor(matchTime % 60);
  timeTextEl.textContent = `${min}:${sec.toString().padStart(2, "0")}`;
}

function endMatch() {
  let result;
  if (scoreA > scoreB) result = "win";
  else if (scoreA < scoreB) result = "loss";
  else result = "draw";

  const modeType = modeTypeSelect.value;
  const mode = parseInt(modeSelect.value, 10);
  let xpGain = 0;
  let coinGain = 0;
  let rpGain = 0;
  let bpGain = 0;

  if (result === "win") {
    xpGain = modeType === "ranked" ? 80 : 50;
    coinGain = modeType === "ranked" ? 100 : 60;
    rpGain = modeType === "ranked" ? 40 : 0;
    bpGain = 200;
    hudTextEl.textContent = "You Win!";
    if (modeType === "ranked") missionEvent("ranked_win");
  } else if (result === "loss") {
    xpGain = modeType === "ranked" ? 30 : 20;
    coinGain = modeType === "ranked" ? 40 : 30;
    rpGain = modeType === "ranked" ? -20 : 0;
    bpGain = 100;
    hudTextEl.textContent = "You Lose";
  } else {
    xpGain = modeType === "ranked" ? 50 : 30;
    coinGain = modeType === "ranked" ? 70 : 40;
    rpGain = modeType === "ranked" ? 10 : 0;
    bpGain = 150;
    hudTextEl.textContent = "Draw";
  }

  addXP(xpGain);
  addCoins(coinGain);
  if (modeType === "ranked") addRankPoints(rpGain);
  addBPXP(bpGain);

  const dateStr = new Date().toLocaleString();
  matchHistory.push({
    date: dateStr,
    result,
    modeType,
    mode,
    xpGain,
    coinGain,
    rpChange: rpGain
  });
  saveHistory();
  renderHistory();

  alert(
    `Match result: ${result.toUpperCase()}\n` +
    `XP gained: ${xpGain}\nCoins gained: ${coinGain}\nBattle Pass XP: +${bpGain}` +
    (modeType === "ranked" ? `\nRank points change: ${rpGain}` : "")
  );

  // trigger victory animation state
  state = "victory";
  victoryTimer = 0;
}

// crowd visual
function updateCrowd(dt) {
  crowdIntensity *= 0.98;
  ctx.globalAlpha = crowdIntensity * 0.25;
  ctx.fillStyle = "yellow";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.globalAlpha = 1.0;
}

// draw field
function drawField() {
  ctx.fillStyle = "#0b5d2a";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(FIELD_W / 2, 0);
  ctx.lineTo(FIELD_W / 2, FIELD_H);
  ctx.stroke();

  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, FIELD_H / 2 - 40, 10, 80);
  ctx.strokeRect(FIELD_W - 10, FIELD_H / 2 - 40, 10, 80);

  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, FIELD_W, 30);
  ctx.fillRect(0, FIELD_H - 30, FIELD_W, 30);
  ctx.fillStyle = "#888";
  for (let i = 0; i < FIELD_W; i += 20) {
    ctx.beginPath();
    ctx.arc(i + 10, 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(i + 10, FIELD_H - 15, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// helper: draw player with cosmetics
function drawPlayerWithCosmetics(p, timeFactor = 0) {
  let color = p.team === TEAM_A ? p.color : "#ff4444";

  // special kit color override
  if (p.team === TEAM_A && p.cosmetic.specialKitTier > 0) {
    const tier = p.cosmetic.specialKitTier;
    const palette = ["#ffd700", "#e5e4e2", "#ff00ff", "#00ffff", "#ff8800"];
    color = palette[Math.min(palette.length - 1, tier - 1)];
  }

  // entrance animation (flex/spin) only during walkout
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  if (state === "walkout" && p.team === TEAM_A) {
    if (p.cosmetic.entranceStyle === "flex") {
      offsetY = Math.sin(timeFactor * 0.2) * 4;
    } else if (p.cosmetic.entranceStyle === "spin") {
      scale = 1 + Math.sin(timeFactor * 0.2) * 0.2;
    }
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);

  // base body
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(offsetX, offsetY, p.keeper ? 12 : 10, 0, Math.PI * 2);
  ctx.fill();

  // accessories
  if (p.cosmetic.accessoryMask) {
    ctx.fillStyle = "#000";
    ctx.fillRect(-8, -6 + offsetY, 16, 6);
  }
  if (p.cosmetic.accessoryVisor) {
    ctx.fillStyle = "#0ff";
    ctx.fillRect(-8, -10 + offsetY, 16, 4);
  }
  if (p.cosmetic.accessoryGlow) {
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, p.keeper ? 14 : 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ball indicator
  if (p.hasBall) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, p.keeper ? 16 : 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// draw players
function drawPlayers(timeFactor = 0) {
  for (const p of players) {
    drawPlayerWithCosmetics(p, timeFactor);
  }
}

// draw ball
function drawBall() {
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

// walkout animation
function drawWalkout(dt) {
  drawField();

  ctx.fillStyle = "#333";
  ctx.fillRect(0, FIELD_H / 2 - 40, 80, 80);

  ctx.fillStyle = "#555";
  ctx.fillRect(80, FIELD_H / 2 - 80, FIELD_W - 80, 40);
  ctx.fillRect(80, FIELD_H / 2 + 40, FIELD_W - 80, 40);

  const teamA = players.filter(p => p.team === TEAM_A);
  walkoutTimer += dt;
  const stepDuration = 60;
  const totalSteps = teamA.length;

  for (let i = 0; i < teamA.length; i++) {
    const p = teamA[i];
    const startX = -40;
    const endX = 120;
    const baseY = FIELD_H / 2 - (teamA.length * 12) + i * 24;
    const playerStart = i * stepDuration;
    const playerEnd = playerStart + stepDuration;
    let t = (walkoutTimer - playerStart) / (playerEnd - playerStart);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    p.x = startX + (endX - startX) * t;
    p.y = baseY;
  }

  drawPlayers(walkoutTimer);

  if (walkoutTimer > stepDuration * totalSteps + 60) {
    prepareLineup();
    state = "lineup";
  }
}

// lineup + opponent stat cards
function prepareLineup() {
  const teamA = players.filter(p => p.team === TEAM_A);
  const teamB = players.filter(p => p.team === TEAM_B);

  teamA.forEach((p, i) => {
    p.x = FIELD_W / 2 - 80;
    p.y = FIELD_H / 2 - (teamA.length * 12) + i * 24;
  });

  teamB.forEach((p, i) => {
    p.x = FIELD_W / 2 + 80;
    p.y = FIELD_H / 2 - (teamB.length * 12) + i * 24;
  });

  lineupTimer = 0;
}

function drawLineup(dt) {
  drawField();
  drawPlayers(lineupTimer);

  const opponents = players.filter(p => p.team === TEAM_B);
  if (opponents.length === 0) {
    state = "game";
    return;
  }

  lineupTimer += dt;
  const displayDuration = 180;
  const currentIndex = Math.floor(lineupTimer / displayDuration);
  if (currentIndex >= opponents.length) {
    state = "game";
    return;
  }

  const p = opponents[currentIndex];
  const cardW = 180;
  const cardH = 100;
  const cardX = FIELD_W / 2 - cardW / 2;
  const cardY = 40;

  ctx.fillStyle = "#222";
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = "#0a84ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  ctx.fillStyle = "#fff";
  ctx.font = "12px sans-serif";
  ctx.fillText("Opponent Player Stats", cardX + 10, cardY + 16);
  ctx.fillText("Level: " + p.stats.level, cardX + 10, cardY + 32);
  ctx.fillText("Peak Rank: " + p.stats.peakRank, cardX + 10, cardY + 48);
  ctx.fillText("Current Rank: " + p.stats.currentRank, cardX + 10, cardY + 64);
  ctx.fillText("Games: " + p.stats.gamesPlayed, cardX + 10, cardY + 80);
  ctx.fillText("Goals: " + p.stats.goals + " | Assists: " + p.stats.assists, cardX + 10, cardY + 96);
}

// victory animation
function drawVictory(dt) {
  drawField();
  victoryTimer += dt;

  const teamA = players.filter(p => p.team === TEAM_A);
  const centerX = FIELD_W / 2;
  const centerY = FIELD_H / 2;

  // place team in center
  teamA.forEach((p, i) => {
    p.x = centerX - (teamA.length * 12) + i * 24;
    p.y = centerY;
  });

  // apply victory style
  if (cosmetics.victoryStyle === "pose") {
    // slight bob
    const offset = Math.sin(victoryTimer * 0.1) * 4;
    teamA.forEach(p => {
      p.y = centerY + offset;
    });
  } else if (cosmetics.victoryStyle === "dance") {
    // rotate around center
    teamA.forEach((p, i) => {
      const angle = victoryTimer * 0.05 + i * (Math.PI * 2 / teamA.length);
      p.x = centerX + Math.cos(angle) * 40;
      p.y = centerY + Math.sin(angle) * 20;
    });
  }

  drawPlayers(victoryTimer);

  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText("Victory Animation", FIELD_W / 2 - 60, 40);

  if (victoryTimer > 240) {
    state = "game"; // go back to game state (field still visible)
  }
}

// main loop
let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 16.67;
  lastTime = now;

  if (state === "walkout") {
    drawWalkout(dt);
  } else if (state === "lineup") {
    drawLineup(dt);
  } else if (state === "game") {
    drawField();
    updateControlled(dt);
    updateAI(dt);
    updateStamina(dt);
    updateBall(dt);
    updateTimer(dt);
    updateCrowd(dt);
    drawPlayers(now);
    drawBall();
  } else if (state === "victory") {
    drawVictory(dt);
  }

  requestAnimationFrame(loop);
}

// init
loadSeason();
loadDailyShop();
loadHistory();
initBattlePass();
updateProgressUI();
requestAnimationFrame(loop);
