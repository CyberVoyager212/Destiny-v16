// kanalekle.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "kanalekle",
  aliases: [],
  usage: "kanalekle <isim1> [isim2] [isim3] ...",
  description: "Belirtilen isimlerle 1 veya daha fazla METİN kanalı oluşturur.",
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
    return message.reply("Oluşturulacak kanal isimlerini belirtmelisin.");

  const created = [];
  for (const isim of args) {
    try {
      const kanal = await message.guild.channels.create(isim, {
        type: "GUILD_TEXT",
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: ["VIEW_CHANNEL"],
          },
        ],
      });

      created.push(kanal.name);
    } catch (e) {
      console.error(e);
      message.channel.send(`❌ "${isim}" oluşturulamadı.`);
    }
  }

  const embed = new MessageEmbed()
    .setDescription(`✅ Başarıyla oluşturuldu: ${created.join(", ")}`)
    .setColor("#00FF00")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
};
