const { MessageEmbed } = require("discord.js");

module.exports.help = {
  name: "changemymind",
  aliases: ["cmm"],
  description: "Belirtilen metni Change My Mind meme formatında oluşturur.",
  usage: "changemymind <yazı>",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  if (!args.length) {
    return message.reply("❌ Lütfen bir metin girin!");
  }

  const text = encodeURIComponent(args.join(" "));
  const imageUrl = `https://vacefron.nl/api/changemymind?text=${text}`;

  const embed = new MessageEmbed()
    .setTitle("🪧 Change My Mind")
    .setImage(imageUrl)
    .setColor("RANDOM")
    .setFooter({
      text: `İsteyen: ${message.member.displayName}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    });

  return message.channel.send({ embeds: [embed] });
};
