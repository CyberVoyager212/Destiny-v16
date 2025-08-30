const { MessageAttachment } = require("discord.js");
const DIG = require("discord-image-generation");

module.exports.help = {
  name: "delete",
  aliases: [],
  description:
    "Belirtilen kullanıcının avatarını silinmiş gibi gösteren bir resim oluşturur.",
  usage: "delete [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (m) => m.displayName.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.member;

  if (!user) return message.reply("❎ Lütfen geçerli bir kullanıcı belirtin!");

  const loadingMsg = await message.channel.send("🔄 Resim oluşturuluyor...");

  const avatar = user.user.displayAvatarURL({ format: "png", size: 512 });

  try {
    const img = await new DIG.Delete().getImage(avatar);
    const attachment = new MessageAttachment(img, "delete.png");

    await loadingMsg.delete();
    return message.channel.send({ files: [attachment] });
  } catch (err) {
    console.error(err);
    return message.reply("❎ Bir hata oluştu. Lütfen tekrar deneyin.");
  }
};
