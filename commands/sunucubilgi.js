// sunucubilgi.js
const { MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  const owner = await message.guild.fetchOwner();
  const embed = new MessageEmbed()
    .setTitle(`${message.guild.name} Bilgileri`)
    .setThumbnail(message.guild.iconURL({ dynamic: true }))
    .addField("ID", message.guild.id, true)
    .addField("Sahibi", `<@${owner.id}>`, true)
    .addField("Üyeler", `${message.guild.memberCount}`, true)
    .addField("Oluşturulma", message.guild.createdAt.toLocaleDateString(), true)
    .addField("Roller", `${message.guild.roles.cache.size}`, true)
    .addField("Boost", `${message.guild.premiumSubscriptionCount}`, true)
    .setColor("BLUE")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};

exports.help = {
  name: "sunucubilgi",
  aliases: ["sb"],
  usage: "sunucubilgi",
  description: "Sunucunun temel bilgilerini gösterir.",
  category: "Moderasyon",
  cooldown: 5,
};
