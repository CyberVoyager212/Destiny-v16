// commands/zoo.js
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "utils");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return {};
  }
}

module.exports.help = {
  name: "zoo",
  aliases: ["hayvanlar"],
  usage: "zoo",
  description: "Toplanan hayvanları gösterir.",
  category: "Battle",
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const players = readJSON(PLAYERS_FILE);
  const me = players[message.author.id];
  if (!me || !me.team || me.team.length === 0)
    return message.channel.send("Henüz hayvanın yok.");
  const text = me.team
    .map((p) => `${p.name} — Lv:${p.level} XP:${p.xp || 0} ID:${p.id}`)
    .join("\n");
  return message.channel.send(`Hayvanların:\n${text}`);
};
