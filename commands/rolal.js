// rolal.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "rolal",
  aliases: [],
  usage: "rolal <@kullanıcı> <@rol|id|isim> [başka_rol...]",
  description: "Kullanıcıdan bir veya birden fazla rol alır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_ROLES"))
    return message.reply(
      "Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın."
    );

  const member = message.mentions.members.first();
  if (!member) return message.reply("Rolü alınacak kullanıcıyı belirt.");

  const roles = args
    .slice(1)
    .map(
      (r) =>
        message.guild.roles.cache.get(r) ||
        message.guild.roles.cache.find((x) => x.name === r) ||
        message.mentions.roles.first()
    )
    .filter(Boolean);

  if (!roles.length) return message.reply("Alınacak rolleri belirtmelisin.");

  const removed = [];
  for (const rol of roles) {
    try {
      if (member.roles.cache.has(rol.id)) {
        await member.roles.remove(rol);
        removed.push(rol.name);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!removed.length) {
    return message.channel.send(
      `❌ ${member.user.tag} kullanıcısından alınabilecek bir rol bulunamadı veya yetkim yetersiz.`
    );
  }

  const embed = new MessageEmbed()
    .setDescription(
      `✅ ${member.user.tag} kullanıcısından alındı: ${removed.join(", ")}`
    )
    .setColor("#FF0000");

  message.channel.send({ embeds: [embed] });
};
