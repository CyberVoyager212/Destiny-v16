const { MessageAttachment } = require("discord.js");
const DIG = require("discord-image-generation");

exports.execute = async (client, message, args) => {
  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (r) => r.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) => r.displayName.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.member;

  let m = await message.channel.send("**Lütfen bekleyin...**");

  let avatar = user.user.displayAvatarURL({
    dynamic: false,
    format: "png",
  });

  let img = await new DIG.Rip().getImage(avatar);

  let attachment = new MessageAttachment(img, "rip.png");

  setTimeout(() => m.delete().catch(() => {}), 5000);
  message.channel.send({ files: [attachment] });
};

exports.help = {
  name: "rip",
  aliases: ["rip"],
  description: "Bir kullanıcının avatarından RIP resmi oluşturur.",
  usage: "[mention | kullanıcı adı]",
  category: "Eğlence",
  cooldown: 5,
};
