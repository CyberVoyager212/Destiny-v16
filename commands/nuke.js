const { Client, Message } = require("discord.js");

module.exports.help = {
  name: "nuke",
  aliases: ["clearall", "purgeall"],
  description: "Kanalda bulunan tüm mesajları siler.",
  usage: "nuke",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_CHANNELS"],
};

module.exports.execute = async (bot, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS")) {
    return message.channel.send(
      "**Bu komutu kullanmak için `Kanalları Yönet` iznine sahip olmalısın!**"
    );
  }

  let channel = message.channel;

  await message.channel.send("**Bu kanal temizleniyor...**");

  let newChannel = await channel.clone();
  await channel.delete();

  // Kanalın en son kimin tarafından nukelendiğini kaydet
  bot.db.set(`nuked_${newChannel.id}`, {
    nukedBy: message.author.id,
    nukedAt: Date.now(),
  });

  newChannel.send(`# **Nuked by ${message.author.username}**`);
};
