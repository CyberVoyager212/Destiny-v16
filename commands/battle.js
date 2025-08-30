// commands/battle.js
const fs = require("fs");
const path = require("path");
const {
  createBattleEmbed,
  rarityLetterFromCounts,
} = require("../utils/battleevent");
const { sendChallenge } = require("../utils/battlefriend");
const { applyXpAndLevel } = require("../utils/levelup");

const DATA_DIR = path.join(__dirname, "..", "utils");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");
const POOL_FILE = path.join(DATA_DIR, "pool.json");
const WEAPONS_FILE = path.join(DATA_DIR, "weapons.json");

// --- JSON helpers
function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (e) {
    return {};
  }
}
function writeJSON(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.error("JSON write error:", file, e);
  }
}

// --- Player helpers
function getPlayer(userId) {
  const p = readJSON(PLAYERS_FILE);
  return p[userId] || null;
}
function savePlayer(userId, data) {
  const p = readJSON(PLAYERS_FILE);
  p[userId] = data;
  writeJSON(PLAYERS_FILE, p);
}

// --- Create enemy team from player (used for random vs)
function constructEnemyFromPlayer(player) {
  const pool = readJSON(POOL_FILE).PET_POOL || {};
  const playerTeam = player.team || [];
  const enemy = [];

  // determine majority rarity among player's equipped items
  const rarityMapForPlayer = { legendary: 0, epic: 0, rare: 0, common: 0 };
  playerTeam.forEach((pet) => {
    if (pet.items && pet.items.rarity)
      rarityMapForPlayer[pet.items.rarity] =
        (rarityMapForPlayer[pet.items.rarity] || 0) + 1;
  });

  for (let i = 0; i < 3; i++) {
    const base = playerTeam[i] || { level: 3, name: "Vahşi" };
    const lvl = Math.max(1, base.level + (Math.floor(Math.random() * 5) - 2));

    // pick rarity from player's majority (fallback common)
    const letter =
      rarityMapForPlayer.legendary > 0
        ? "legendary"
        : rarityMapForPlayer.epic > 0
        ? "epic"
        : rarityMapForPlayer.rare > 0
        ? "rare"
        : "common";

    const choices = pool[letter] || pool["common"] || [];
    const choice = choices[Math.floor(Math.random() * choices.length)] || {
      name: "Vahşi",
      baseLevel: lvl,
    };

    enemy.push({
      level: lvl,
      name: choice.name || "Vahşi",
      items: {
        attack: true,
        armor: true,
        magic: true,
        rarity: letter,
      },
      itemRarityLetter: { legendary: "L", epic: "E", rare: "R", common: "C" }[
        letter
      ],
    });
  }

  return enemy;
}

// --- Power calculation (level * rarity multiplier)
function powerOfTeam(team) {
  let s = 0;
  team.forEach((p) => {
    const base = p.level || 1;
    let rMult = 1;
    const r = (p.items && p.items.rarity) || "common";
    if (r === "legendary") rMult = 1.5;
    else if (r === "epic") rMult = 1.3;
    else if (r === "rare") rMult = 1.1;
    s += base * rMult;
  });
  return s;
}

// --- Box creation (weapons) when player wins vs random enemy
function maybeCreateBoxForPlayer(userId, player, now) {
  // returns object { created: bool, message: string } or { created:false }
  const pool = readJSON(POOL_FILE).WEAPON_POOL || {};
  const weaponsDB = readJSON(WEAPONS_FILE) || {};

  // count item rarities on player's team
  const counts = { legendary: 0, epic: 0, rare: 0, common: 0 };
  (player.team || []).forEach((p) => {
    if (p.items && p.items.rarity)
      counts[p.items.rarity] = (counts[p.items.rarity] || 0) + 1;
  });

  let majority = "common";
  let max = -1;
  for (const r of Object.keys(counts)) {
    if (counts[r] > max) {
      max = counts[r];
      majority = r;
    }
  }
  if (max <= 0) majority = "common";

  const chosenRarity = majority;

  // pick items lists (safeguard if missing)
  const attackList = (pool.WEAPON_OF_ATTACK &&
    pool.WEAPON_OF_ATTACK[chosenRarity]) ||
    (pool.WEAPON_OF_ATTACK && pool.WEAPON_OF_ATTACK.common) || [
      { name: "Tahta Kılıç" },
    ];
  const armorList = (pool.WEAPON_OF_ARMOR &&
    pool.WEAPON_OF_ARMOR[chosenRarity]) ||
    (pool.WEAPON_OF_ARMOR && pool.WEAPON_OF_ARMOR.common) || [
      { name: "Hırka" },
    ];
  const magicList = (pool.WEAPON_OF_MAGIC &&
    pool.WEAPON_OF_MAGIC[chosenRarity]) ||
    (pool.WEAPON_OF_MAGIC && pool.WEAPON_OF_MAGIC.common) || [
      { name: "Çubuk" },
    ];

  const attack = attackList[Math.floor(Math.random() * attackList.length)] || {
    name: "Tahta Kılıç",
  };
  const armor = armorList[Math.floor(Math.random() * armorList.length)] || {
    name: "Hırka",
  };
  const magic = magicList[Math.floor(Math.random() * magicList.length)] || {
    name: "Çubuk",
  };

  // unique id generator
  function genId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 6; i++)
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  let id;
  do {
    id = genId();
  } while (weaponsDB[id]);

  // create and persist
  weaponsDB[id] = {
    id,
    rarity: chosenRarity,
    items: [attack.name, armor.name, magic.name],
    createdAt: now,
    owner: userId, // assign ownership directly to winner
  };

  writeJSON(WEAPONS_FILE, weaponsDB);

  const short = `Kutu açıldı: (${chosenRarity[0].toUpperCase()}) - ${
    attack.name
  } / ${armor.name} / ${magic.name} - ID: ${id}`;
  return { created: true, message: short };
}

// --- exports
module.exports.help = {
  name: "battle",
  aliases: ["savaş"],
  usage: "battle",
  description: "Takımdaki hayvanlarla savaşmaya başla (veya birini etiketle).",
  category: "Battle",
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const mention = message.mentions.users.first();

  const player = getPlayer(userId);
  if (!player || !player.team || player.team.length === 0) {
    return message.channel.send("Takımın yok! Önce `team add` ile takımı kur.");
  }

  // normalize some player fields
  player.streak = player.streak || 0;
  player.winTimestamps = player.winTimestamps || [];
  player.team = player.team || [];

  // --- If challenge (mention) flow
  if (mention && mention.id !== userId) {
    const targetPlayer = getPlayer(mention.id);
    if (!targetPlayer || !targetPlayer.team || targetPlayer.team.length === 0) {
      return message.channel.send("Etiketlediğin kişinin takımı yok.");
    }

    const res = await sendChallenge(message, message.author, mention, 300000);
    if (!res.accepted) {
      if (res.timeout) return; // message already edited by sendChallenge
      return message.channel.send("Karşı taraf savaşı reddetti.");
    }

    // use exact team of the target as enemy
    const enemyTeam = targetPlayer.team.slice(0, 3).map((p) => ({
      level: p.level || 1,
      name: p.name || "Vahşi",
      items: p.items || {},
      itemRarityLetter: { legendary: "L", epic: "E", rare: "R", common: "C" }[
        (p.items && p.items.rarity) || "common"
      ],
    }));

    // compare power (simple: sum levels)
    const myPower = player.team
      .slice(0, 3)
      .reduce((s, p) => s + (p.level || 1), 0);
    const enemyPower = enemyTeam.reduce((s, p) => s + (p.level || 1), 0);

    const iWon = myPower >= enemyPower; // tie -> user wins

    // update streak & xp
    player.streak = iWon ? (player.streak || 0) + 1 : 0;
    const xpGain = player.streak * (player.streak * 50);

    // apply xp and level up per pet
    const levelUpMessages = [];
    player.team.forEach((p) => {
      p.xp = (p.xp || 0) + xpGain;
      const res = applyXpAndLevel(p, { maxLevel: 999 }); // gerektiğinde maxLevel ayarla
      if (res.levelsGained > 0) {
        levelUpMessages.push(
          `${p.name} ${res.levelsGained} seviye kazandı! Yeni seviye: ${p.level}`
        );
      }
    });

    // persist only player's changes (no boxes for pvp)
    savePlayer(userId, player);

    const embed = createBattleEmbed(
      message.member.displayName || message.author.username,
      player.team.slice(0, 3),
      enemyTeam,
      true,
      player.streak
    );
    await message.channel.send({ embeds: [embed] });

    if (iWon) {
      await message.channel.send(
        `Tebrikler! ${mention.username}'ye karşı savaşı kazandın. Streak: ${player.streak}`
      );
      if (levelUpMessages.length) {
        await message.channel.send(levelUpMessages.join("\n"));
      }
    } else {
      await message.channel.send("Maalesef kaybettin.");
    }
    return;
  }

  // --- No mention: vs random enemy
  const enemyTeam = constructEnemyFromPlayer(player);
  const myPower = powerOfTeam(player.team.slice(0, 3));
  const enemyPower = powerOfTeam(enemyTeam);
  const iWon = myPower >= enemyPower;

  // update streak & xp
  player.streak = iWon ? (player.streak || 0) + 1 : 0;
  const xpGain = player.streak * (player.streak * 50);

  // apply xp & levels
  const levelUpMessages = [];
  player.team.forEach((p) => {
    p.xp = (p.xp || 0) + xpGain;
    const res = applyXpAndLevel(p, { maxLevel: 999 });
    if (res.levelsGained > 0) {
      levelUpMessages.push(
        `${p.name} ${res.levelsGained} seviye kazandı! Yeni seviye: ${p.level}`
      );
    }
  });

  // Kutu kazanma mechanic (sadece random vs için geçerli)
  const now = Date.now();
  // temizle 24 saatten eski
  player.winTimestamps = (player.winTimestamps || []).filter(
    (ts) => now - ts < 24 * 3600 * 1000
  );
  if (iWon) player.winTimestamps.push(now);

  // persist player changes (xp/streak/wintimestamps)
  savePlayer(userId, player);

  const embed = createBattleEmbed(
    message.member.displayName || message.author.username,
    player.team.slice(0, 3),
    enemyTeam,
    false,
    player.streak
  );
  await message.channel.send({ embeds: [embed] });

  if (iWon) {
    // kutu şansı: son 3 galibiyet içinde ise %80, değilse %0
    const winsIn24h = player.winTimestamps.length;
    let boxGot = false;
    if (winsIn24h >= 1 && winsIn24h <= 3) {
      if (Math.random() < 0.8) boxGot = true;
    }

    if (boxGot) {
      const box = maybeCreateBoxForPlayer(userId, player, now);
      if (box && box.created) {
        await message.channel.send(box.message);
      }
    } else {
      await message.channel.send("Kutu kazanma şansın bu sefer bulunmadı.");
    }

    await message.channel.send(
      `Tebrikler! Savaşı kazandın. Streak: ${player.streak}. Her hayvanına ${xpGain} XP eklendi.`
    );

    if (levelUpMessages.length) {
      await message.channel.send(levelUpMessages.join("\n"));
    }
  } else {
    // kaybetme hali: streak sıfırlanır (zaten yukarda güncellendi)
    await message.channel.send("Maalesef kaybettin. Streak sıfırlandı.");
  }
};
