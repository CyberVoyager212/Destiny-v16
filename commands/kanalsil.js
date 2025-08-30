// kanalsil.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "kanalsil",
  aliases: [],
  usage: "kanalsil <#kanal|id|isim> [başka_kanal...]",
  description: "Belirtilen METİN kanallarını siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],

};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS"))
    return message.reply(
      "Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısın."
    );

  if (!args.length) return message.reply("Silinecek kanalları belirtmelisin.");

  const deleted = [];
  for (const target of args) {
    const kanal =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(target) ||
      message.guild.channels.cache.find((c) => c.name === target);
    if (!kanal || kanal.type !== "GUILD_TEXT") {
      message.channel.send(
        `❌ "${target}" bulunamadı veya METİN kanalı değil.`
      );
      continue;
    }
    try {
      await kanal.delete("Komut ile kanal silindi");
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
