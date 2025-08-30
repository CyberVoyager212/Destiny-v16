// commands/team.js
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "utils");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");
const WEAPONS_FILE = path.join(DATA_DIR, "weapons.json");

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
  name: "team",
  aliases: ["takım"],
  usage: "team add/remove/list",
  description:
    "Takım yönetimi: add/remove/list ve team weapon <slot> <weaponId|remove>",
  category: "Battle",
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const sub = (args[0] || "").toLowerCase();

  const players = readJSON(PLAYERS_FILE);
  const weaponsDB = readJSON(WEAPONS_FILE);

  const me = players[userId] || {
    team: [],
    inventory: { diamonds: [], emeralds: [], hearts: [] },
  };

  // --- SUB: team add <slot> <petId|petName> [weaponId]
  if (sub === "add") {
    const slot = parseInt(args[1]);
    const petIdentifier = args[2];
    const weaponId = args[3]; // optional

    if (!slot || slot < 1 || slot > 3)
      return message.channel.send("Slot 1-3 arası olabilir.");

    // Find pet by ID or name in me.team (collected pets are in me.team)
    const pet =
      me.team.find((p) => p.id === petIdentifier) ||
      me.team.find(
        (p) =>
          p.name && p.name.toLowerCase() === (petIdentifier || "").toLowerCase()
      );

    if (!pet)
      return message.channel.send(
        "Hayvan bulunamadı. ID veya isim ile eşleştirmeyi dene."
      );

    // If weaponId provided, try to attach it immediately
    if (weaponId) {
      const weapon = weaponsDB[weaponId];
      if (!weapon)
        return message.channel.send("Böyle bir weapon ID'si bulunamadı.");

      // If the weapon has an owner and it's not this user -> deny
      if (weapon.owner && weapon.owner !== userId)
        return message.channel.send("Bu eşyaya başka bir kullanıcı sahip.");

      // assign ownership if not already
      weapon.owner = userId;
      weapon.equippedTo = { userId, slot };

      // Attach weapon items to pet
      pet.items = pet.items || {};
      // We expect weapon.items to be [attack, armor, magic] (based on earlier structure)
      const items = weapon.items || [];
      pet.items.attack = items[0] || pet.items.attack || null;
      pet.items.armor = items[1] || pet.items.armor || null;
      pet.items.magic = items[2] || pet.items.magic || null;
      pet.items.rarity = weapon.rarity || pet.items.rarity || "common";
      pet.items.weaponId = weaponId;

      // persist weapon DB and players DB
      weaponsDB[weaponId] = weapon;
      players[userId] = me;
      writeJSON(WEAPONS_FILE, weaponsDB);
      writeJSON(PLAYERS_FILE, players);

      me.team[slot - 1] = pet;
      return message.channel.send(
        `Hayvan ${pet.name} slot ${slot}'e eklendi ve weapon ${weaponId} takıldı.`
      );
    }

    // No weapon => just put pet into slot
    me.team[slot - 1] = pet;
    players[userId] = me;
    writeJSON(PLAYERS_FILE, players);
    return message.channel.send(`Hayvan ${pet.name} slot ${slot}'e eklendi.`);
  }

  // --- SUB: team remove/sil <slot>
  else if (sub === "remove" || sub === "sil") {
    const slot = parseInt(args[1]);
    if (!slot || slot < 1 || slot > 3)
      return message.channel.send("Slot 1-3 arası olmalı.");
    // If there is an equipped weapon, unequip it (clear equippedTo)
    const current = me.team[slot - 1];
    if (current && current.items && current.items.weaponId) {
      const wid = current.items.weaponId;
      const w = weaponsDB[wid];
      if (
        w &&
        w.equippedTo &&
        w.equippedTo.userId === userId &&
        w.equippedTo.slot === slot
      ) {
        delete w.equippedTo;
        // keep ownership (owner stays userId) — weapon isn't deleted, just unequipped
        weaponsDB[wid] = w;
        writeJSON(WEAPONS_FILE, weaponsDB);
      }
    }
    me.team[slot - 1] = undefined;
    players[userId] = me;
    writeJSON(PLAYERS_FILE, players);
    return message.channel.send(`Slot ${slot} temizlendi.`);
  }

  // --- SUB: team weapon <slot> <weaponId|remove>
  else if (sub === "weapon") {
    const slot = parseInt(args[1]);
    const opt = args[2];

    if (!slot || slot < 1 || slot > 3)
      return message.channel.send("Slot 1-3 arası olmalı.");

    const pet = me.team[slot - 1];
    if (!pet)
      return message.channel.send("O slotta bir hayvan yok. Önce takıma ekle.");

    if (!opt)
      return message.channel.send(
        "Kullanım: `team weapon <slot 1-3> <weaponId|remove>`"
      );

    if (opt.toLowerCase() === "remove" || opt.toLowerCase() === "unequip") {
      // unequip weapon from pet (if any)
      if (pet.items && pet.items.weaponId) {
        const wid = pet.items.weaponId;
        const w = weaponsDB[wid];
        if (
          w &&
          w.equippedTo &&
          w.equippedTo.userId === userId &&
          w.equippedTo.slot === slot
        ) {
          delete w.equippedTo;
          // keep owner as userId so they still own the weapon
          weaponsDB[wid] = w;
        }
        // remove item fields from pet
        delete pet.items.attack;
        delete pet.items.armor;
        delete pet.items.magic;
        delete pet.items.weaponId;
        delete pet.items.rarity;
        players[userId] = me;
        writeJSON(WEAPONS_FILE, weaponsDB);
        writeJSON(PLAYERS_FILE, players);
        return message.channel.send(`Slot ${slot}'teki silah çıkarıldı.`);
      } else {
        return message.channel.send("Bu slotta takılı bir silah yok.");
      }
    }

    // otherwise opt is weaponId
    const weaponId = opt;
    const weapon = weaponsDB[weaponId];
    if (!weapon)
      return message.channel.send("Böyle bir weapon ID'si bulunamadı.");

    if (weapon.owner && weapon.owner !== userId)
      return message.channel.send("Bu eşyaya başka bir kullanıcı sahip.");

    // set ownership and mark equippedTo
    weapon.owner = userId;
    weapon.equippedTo = { userId, slot };

    // Attach weapon items to pet
    pet.items = pet.items || {};
    const items = weapon.items || [];
    pet.items.attack = items[0] || pet.items.attack || null;
    pet.items.armor = items[1] || pet.items.armor || null;
    pet.items.magic = items[2] || pet.items.magic || null;
    pet.items.rarity = weapon.rarity || pet.items.rarity || "common";
    pet.items.weaponId = weaponId;

    // persist changes
    weaponsDB[weaponId] = weapon;
    me.team[slot - 1] = pet;
    players[userId] = me;
    writeJSON(WEAPONS_FILE, weaponsDB);
    writeJSON(PLAYERS_FILE, players);

    return message.channel.send(
      `Slot ${slot}'e weapon ${weaponId} başarıyla takıldı.`
    );
  }

  // --- DEFAULT: list
  else {
    const list = (me.team || [])
      .map(
        (p, i) =>
          `Slot ${i + 1}: ${
            p
              ? `${p.name} (Lv ${p.level || 1})${
                  p.items && p.items.weaponId
                    ? ` — Weapon:${p.items.weaponId}`
                    : ""
                }`
              : "—"
          }`
      )
      .join("\n");
    return message.channel.send(`Takımın:\n${list}`);
  }
};
