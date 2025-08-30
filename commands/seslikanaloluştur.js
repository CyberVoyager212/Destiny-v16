// seslikanaloluştur.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "seslikanaloluştur",
  aliases: ["skanaloluştur"],
  usage: "seslikanaloluştur <isim1> [isim2]...",
  description: "Belirtilen isimlerle 1 veya daha fazla SESLİ kanal oluşturur.",
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
    return message.reply("Oluşturulacak sesli kanal isimlerini belirtmelisin.");

  const created = [];
  for (const isim of args) {
    try {
      const kanal = await message.guild.channels.create(isim, {
        type: "GUILD_VOICE", // Discord.js v13
      });
      created.push(kanal.name);
    } catch (e) {
      console.error(e);
      message.channel.send(`❌ "${isim}" adlı kanal oluşturulamadı.`);
    }
  }

  if (!created.length)
    return message.channel.send("❌ Hiçbir kanal oluşturulamadı.");

  const embed = new MessageEmbed()
    .setDescription(`✅ Başarıyla oluşturuldu: ${created.join(", ")}`)
    .setColor("#00FF00")
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};
