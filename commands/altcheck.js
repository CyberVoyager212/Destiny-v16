// altcheck.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "altcheck",
  aliases: [],
  usage: "altcheck <@kullanıcı|id|isim> [başka...]",
  description:
    "Kullanıcıların hesap oluşturma ve sunucuya katılma tarihlerini gösterir, güvenli olup olmadıklarına dair basit bir tahminde bulunur.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MODERATE_MEMBERS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MODERATE_MEMBERS"))
    return message.reply(
      "Bu komutu kullanmak için `Üyeleri Sustur` yetkisine sahip olmalısın."
    );

  if (!args.length) return message.reply("Kullanıcı(ları) belirtmelisin.");

  for (const target of args) {
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(target) ||
      message.guild.members.cache.find((m) => m.user.username === target);
    if (!member) {
      message.channel.send(`❌ "${target}" bulunamadı.`);
      continue;
    }

    const {
      user,
      joinedAt,
      user: { createdAt },
    } = member;
    const diff = Date.now() - createdAt.getTime();
    const güven = diff > 1000 * 60 * 60 * 24 * 30 ? "Güvenli" : "Şüpheli";

    const embed = new MessageEmbed()
      .setTitle(`${user.tag} İncelemesi`)
      .addField("Hesap Açılış", createdAt.toUTCString(), true)
      .addField("Sunucu Katılma", joinedAt.toUTCString(), true)
      .addField("Durum", güven, true)
      .setThumbnail(user.displayAvatarURL())
      .setColor(güven === "Güvenli" ? "#00FF00" : "#FF9900")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
