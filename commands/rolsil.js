// rolsil.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "rolsil",
  aliases: [],
  usage: "rolsil <@rol|id|isim> [başka_rol...]",
  description: "Belirtilen rolleri siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_ROLES"))
    return message.reply(
      "Bu komutu kullanmak için `Rolleri Yönet` yetkisine sahip olmalısın."
    );

  if (!args.length) return message.reply("Silinecek rolleri belirtmelisin.");

  const deleted = [];
  for (const target of args) {
    const rol =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(target) ||
      message.guild.roles.cache.find((r) => r.name === target);
    if (!rol) {
      message.channel.send(`❌ "${target}" bulunamadı.`);
      continue;
    }
    try {
      await rol.delete();
      deleted.push(rol.name);
    } catch (e) {
      console.error(e);
      message.channel.send(`❌ "${rol.name}" silinemedi.`);
    }
  }

  const embed = new MessageEmbed()
    .setDescription(`✅ Başarıyla silindi: ${deleted.join(", ")}`)
    .setColor("#FF0000")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
