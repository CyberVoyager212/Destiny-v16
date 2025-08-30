// commands/afklist.js
exports.help = {
  name: "afklist",
  aliases: ["afkliste", "afk-liste"],
  usage: "afklist",
  description: "Şu anda AFK olan kullanıcıları gösterir.",
  category: "Araçlar",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  const db = client.db;

  // QuickDB.all() → [{ id, value }, ...]
  const allEntries = await db.all();
  // id alanı "afk_<userId>" ile başlıyor
  const afkUsers = allEntries.filter((e) => e.id.startsWith("afk_"));

  if (!afkUsers.length) {
    return message.reply("Şu anda hiç AFK kullanıcı yok.");
  }

  let reply = "AFK kullanıcılar:\n";
  afkUsers.forEach(({ id, value }) => {
    const userId = id.split("_")[1];
    const sebep = value.reason || "Belirtilmemiş";
    reply += `<@${userId}> — Sebep: ${sebep}\n`;
  });

  return message.channel.send(reply);
};
