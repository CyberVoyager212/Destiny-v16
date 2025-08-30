// commands/collect.js
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "utils");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");
const POOL_FILE = path.join(DATA_DIR, "pool.json");

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return {};
  }
}
function writeJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

module.exports.help = {
  name: "collect",
  usage: "collect",
  description: "Hayvan toplama komutu. (diamonds/emeralds/hearts etkiler)",
  category: "Battle",
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const playerDB = readJSON(PLAYERS_FILE);
  const pools = readJSON(POOL_FILE);
  const player = playerDB[userId] || {
    inventory: { diamonds: [], emeralds: [], hearts: [] },
    team: [],
  };

  // simplify: choose rarity weighted by whether player has emeralds (increase chance for higher rarities)
  let weight = { common: 70, rare: 20, epic: 8, legendary: 2 };
  // if player has emeralds reduce their durability chance -> boost rarities
  const emeralds = player.inventory.emeralds || [];
  if (emeralds.length > 0) {
    weight.common -= 20;
    weight.rare += 10;
    weight.epic += 8;
    weight.legendary += 2;
  }
  // get random rarity
  const sum = Object.values(weight).reduce((a, b) => a + b, 0);
  let r = Math.random() * sum,
    cum = 0,
    rarity = "common";
  for (const k of Object.keys(weight)) {
    cum += weight[k];
    if (r <= cum) {
      rarity = k;
      break;
    }
  }

  const choices =
    (pools.PET_POOL && pools.PET_POOL[rarity]) || pools.PET_POOL.common;
  const pick = choices[Math.floor(Math.random() * choices.length)];
  const newPet = {
    id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: pick.name || "Vahşi",
    level: pick.baseLevel || 1,
    xp: 0,
    items: {},
  };

  // If player has hearts -> grant xp
  const hearts = player.inventory.hearts || [];
  if (hearts.length > 0) newPet.xp += 50;

  // push to collected pets (zoo)
  player.team = player.team || [];
  player.team.push(newPet);
  playerDB[userId] = player;
  writeJSON(PLAYERS_FILE, playerDB);

  // reduce durability for used items (simplified: remove one from each inventory)
  // We'll simulate durability by storing objects {type, durability, rank}
  // For now just pop one if exists
  if (player.inventory.diamonds && player.inventory.diamonds.length > 0)
    player.inventory.diamonds.pop();
  if (player.inventory.emeralds && player.inventory.emeralds.length > 0)
    player.inventory.emeralds.pop();
  if (player.inventory.hearts && player.inventory.hearts.length > 0)
    player.inventory.hearts.pop();

  writeJSON(PLAYERS_FILE, playerDB);

  return message.channel.send(
    `Yeni hayvan topladın: ${newPet.name} (Seviye ${
      newPet.level
    }, Rarity: ${rarity.toUpperCase()})`
  );
};
