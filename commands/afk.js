// commands/afk.js
exports.help = {
  name: "afk",
  aliases: [],
  usage: "afk [sebep]",
  description: "AFK moduna girersiniz. Sebep belirtmek isteğe bağlıdır.",
  category: "Araçlar",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  const sebep = args.join(" ") || null;
  const db = client.db;

  const afkKey = `afk_${message.author.id}`;
  const now = Date.now();

  await db.set(afkKey, { reason: sebep, start: now });

  return message.reply(
    `AFK moduna geçtin.${sebep ? ` Sebep: **${sebep}**` : ""}`
  );
};
