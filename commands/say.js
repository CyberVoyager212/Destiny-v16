// say.js
const { Permissions } = require("discord.js");

exports.execute = async (client, message, args) => {
  if (!client.config.admins.includes(message.author.id)) {
    return message.reply("❌ **Bu komutu kullanma yetkiniz yok.**");
  }

  let sayMessage = args.join(" ");
  if (!sayMessage) {
    return message.reply("⚠️ **Lütfen bir mesaj belirtin.**");
  }

  sayMessage = sayMessage.replace(/\((\d+)\)/g, (match, emojiID) => {
    const emoji = message.guild.emojis.cache.get(emojiID);
    return emoji ? emoji.toString() : match;
  });

  await message.delete();
  await message.channel.send(sayMessage);
};

exports.help = {
  name: "say",
  aliases: [],
  usage: "say <mesaj>",
  description:
    "Belirtilen mesajı sunucuda yayınlar ve özel emoji formatını destekler.",
  category: "Bot",
  cooldown: 5,
};
