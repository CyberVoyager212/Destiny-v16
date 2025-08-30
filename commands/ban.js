const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "ban",
  aliases: [],
  usage: "ban <@kullanıcı|id|isim> [sebep]",
  description:
    "Belirttiğin kullanıcıyı sunucudan yasaklar. Öncesinde DM ile detay gönderir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["BAN_MEMBERS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("BAN_MEMBERS"))
    return message.reply(
      "Bu komutu kullanmak için `Üyeleri Yasakla` yetkisine sahip olmalısın."
    );

  const target = args[0];
  const member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(target) ||
    message.guild.members.cache.find((m) => m.user.username === target);
  if (!member) return message.reply("Yasaklanacak kullanıcıyı belirt.");

  const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";

  // DM ile bilgilendir
  const dmEmbed = new MessageEmbed()
    .setTitle(`Sunucudan Yasaklandın`)
    .setDescription(`**Sunucu:** ${message.guild.name}\n**Sebep:** ${reason}`)
    .setColor("#F04747")
    .setTimestamp();
  member.send({ embeds: [dmEmbed] }).catch(() => {});

  await member.ban({ reason });
  const embed = new MessageEmbed()
    .setDescription(`✅ ${member.user.tag} banlandı.\n**Sebep:** ${reason}`)
    .setColor("#F04747")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
