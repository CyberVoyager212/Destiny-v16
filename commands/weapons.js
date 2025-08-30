// commands/weapons.js
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "utils");
const WEAPONS_FILE = path.join(DATA_DIR, "weapons.json");

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch (e) {
    return {};
  }
}

module.exports.help = {
  name: "weapons",
  aliases: ["silahlar", "eşyalar"],
  usage: "weapons",
  description: "Elde ettiğin eşyaları gösterir.",
  category: "Battle",
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const wdb = readJSON(WEAPONS_FILE);
  const list = Object.values(wdb);
  if (!list || list.length === 0)
    return message.channel.send("Hiç eşyaya sahip değilsin.");
  // show only first 10 for brevity
  const out = list
    .map(
      (w) => `${w.id} — (${w.rarity[0].toUpperCase()}) ${w.items.join(" / ")}`
    )
    .slice(0, 20)
    .join("\n");
  return message.channel.send(`Eşyalar:\n${out}`);
};
