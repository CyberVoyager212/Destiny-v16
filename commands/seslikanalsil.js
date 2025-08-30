// seslikanalsil.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "seslikanalsil",
  aliases: ["skanalsil"],
  usage: "seslikanalsil <#kanal|id|isim> [başka...]",
  description: "Belirtilen SESLİ kanalları siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS"))
    return message.reply(
      "Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısın."
    );

  if (!args.length)
    return message.reply("Silinecek sesli kanalları belirtmelisin.");

  const deleted = [];
  for (const target of args) {
    const kanal =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(target) ||
      message.guild.channels.cache.find((c) => c.name === target);
    if (!kanal || kanal.type !== "GUILD_VOICE") {
      message.channel.send(
        `❌ "${target}" bulunamadı veya SESLİ kanalı değil.`
      );
      continue;
    }
    try {
      await kanal.delete();
      deleted.push(kanal.name);
    } catch (e) {
      console.error(e);
      message.channel.send(`❌ "${kanal.name}" silinemedi.`);
    }
  }

  const embed = new MessageEmbed()
    .setDescription(`✅ Başarıyla silindi: ${deleted.join(", ")}`)
    .setColor("#FF0000")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
