// slowmode.js
exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS"))
    return message.reply("❌ Bunun için `Kanalları Yönet` yetkisi gerekli.");

  if (!message.guild.me.permissions.has("MANAGE_CHANNELS"))
    return message.reply("❌ Botun `Kanalları Yönet` yetkisi yok.");

  const time = parseInt(args[0]);
  if (isNaN(time) || time < 0 || time > 21600)
    return message.reply("⚠️ 0-21600 saniye arasında bir sayı girin.");

  await message.channel.setRateLimitPerUser(time);
  return message.channel.send(
    time === 0
      ? "✅ Yavaş mod kapatıldı!"
      : `✅ Yavaş mod ${time} saniye olarak ayarlandı!`
  );
};

exports.help = {
  name: "slowmode",
  aliases: ["yavaşmod", "slow"],
  usage: "slowmode <saniye>",
  description: "Belirtilen kanal için yavaş modu ayarlar (0 kapatır).",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};
