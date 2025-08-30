// status.js
exports.execute = async (client, message, args) => {
  if (!client.config.admins.includes(message.author.id))
    return message.reply("❌ Yetkiniz yok.");

  if (args.length < 2)
    return message.reply(
      "⚠️ playing|streaming|listening|watching|online|idle|dnd|invisible <mesaj>"
    );

  const type = args[0].toLowerCase();
  const text = args.slice(1).join(" ");
  const ACT = ["playing", "streaming", "listening", "watching"];
  const STAT = ["online", "idle", "dnd", "invisible"];

  if (ACT.includes(type)) {
    await client.user.setActivity(text, {
      type: type.toUpperCase(),
      url: type === "streaming" ? "https://twitch.tv/" : "",
    });
    return message.reply(`✅ Activity: ${type} ${text}`);
  }
  if (STAT.includes(type)) {
    await client.user.setStatus(type);
    return message.reply(`✅ Status: ${type}`);
  }
  message.reply("⚠️ Geçersiz tür.");
};

exports.help = {
  name: "status",
  aliases: ["setstatus", "durum"],
  usage:
    "status <playing|streaming|listening|watching|online|idle|dnd|invisible> <mesaj>",
  description: "Botun durumunu değiştirir.",
  category: "Bot",
  cooldown: 5,
};
