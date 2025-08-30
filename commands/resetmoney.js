const { MessageEmbed } = require("discord.js");
const { QuickDB } = require("quick.db"); // quick.db 8+ sürümleri için
const db = new QuickDB();

exports.execute = async (client, message, args) => {
  // Yetki kontrolü
  if (!client.config.admins.includes(message.author.id)) {
    return message.reply("🚫 **Bu komutu kullanma iznin yok!**");
  }

  const user = message.mentions.users.first();
  const resetAll = args[0] === "all";

  try {
    if (resetAll) {
      const guild = message.guild;
      const members = await guild.members.fetch();

      for (const member of members.values()) {
        if (member.user.bot) continue;
        await db.set(`money_${member.user.id}`, 0);
      }

      const embed = new MessageEmbed()
        .setTitle("💰 Tüm Kullanıcıların Parası Sıfırlandı!")
        .setDescription(
          "🔄 Sunucudaki tüm kullanıcıların bakiyesi başarıyla sıfırlandı."
        )
        .setColor("RANDOM")
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } else if (user) {
      await db.set(`money_${user.id}`, 0);

      const embed = new MessageEmbed()
        .setTitle("💰 Kullanıcının Parası Sıfırlandı!")
        .addFields(
          { name: "Kullanıcı", value: `<@${user.id}>`, inline: true },
          { name: "Toplam Miktar", value: "0", inline: true }
        )
        .setColor("RANDOM")
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } else {
      return message.reply(
        "❌ **Lütfen bir kullanıcı etiketleyin veya `all` parametresini kullanın!**"
      );
    }
  } catch (error) {
    console.error("resetmoney hata:", error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin.**");
  }
};

exports.help = {
  name: "resetmoney",
  aliases: ["resetbal"],
  usage: "resetmoney @kullanıcı | resetmoney all",
  description:
    "Bir kullanıcının parasını veya tüm kullanıcıların parasını sıfırlar.",
  category: "Ekonomi",
  cooldown: 5, // saniye
  admin: true,
};
