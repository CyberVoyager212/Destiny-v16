const DIG = require("discord-image-generation");
const { MessageAttachment } = require("discord.js");

exports.help = {
  name: "blur",
  aliases: [],
  usage: "blur [@kullanıcı]",
  description: "Kullanıcının avatarını bulanıklaştırır.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const member = message.mentions.members.first() || message.member;
    const avatarURL = member.user.displayAvatarURL({
      format: "png",
      size: 512,
    });

    const img = await new DIG.Blur().getImage(avatarURL);
    const attachment = new MessageAttachment(img, "blur.png");

    await message.channel.send({ files: [attachment] });
  } catch (error) {
    console.error(error);
    message.reply("Avatar bulanıklaştırılırken bir hata oluştu.");
  }
};
