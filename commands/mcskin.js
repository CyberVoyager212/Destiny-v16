const { MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  const name = args.join(" ");

  if (!name) {
    return message.reply("Lütfen bir Minecraft oyuncusu adı belirtin.");
  }

  const skinUrl = `https://minotar.net/armor/body/${name}/700.png`;

  const skinEmbed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle(`🎮 ${name}'ın Skin'i 🎮`)
    .setImage(skinUrl)
    .setFooter("Minecraft skinini görüntülediniz.");

  message.channel.send({ embeds: [skinEmbed] });
};

exports.help = {
  name: "mcskin",
  aliases: ["skin"],
  usage: "mcskin <oyuncu adı>",
  description: "Belirtilen Minecraft oyuncusunun skin'ini görüntüler.",
  category: "Eğlence",
  cooldown: 10,
};
