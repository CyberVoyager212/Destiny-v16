const Discord = require("discord.js");

module.exports = {
  config: {
    name: "minecraft",
    description: "Minecraft tarzında bir başarı (achievement) resmi oluşturur.",
    aliases: ["mc"],
    usage: "minecraft <metin1> ; <metin2>",
  },

  execute: async (client, message, args) => {
    const text = args.join(" ").split(";");

    if (text.length !== 2) {
      return message.channel.send('Lütfen metni ";" ile ikiye ayırın.');
    }

    const text1 = encodeURIComponent(text[0].trim());
    const text2 = encodeURIComponent(text[1].trim());

    const randomNum = Math.floor(Math.random() * 21) + 10;

    const imageUrl = `https://skinmc.net/achievement/${randomNum}/${text1}/${text2}`;

    let embed = new Discord.MessageEmbed()
      .setTitle("Achievement unlocked!")
      .setImage(imageUrl)
      .setColor("RANDOM")
      .setFooter({ text: "Minecraft Achievement" });

    message.channel.send({ embeds: [embed] });
  },

  help: {
    name: "minecraft",
    aliases: ["mc"],
    usage: "minecraft <metin1> ; <metin2>",
    description:
      'Minecraft başarı resmi oluşturur. Metinleri ";" ile ayırarak yazmalısınız.',
    category: "Eğlence",
    cooldown: 10,
  },
};
