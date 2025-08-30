const { MessageEmbed } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const emojis = require("../emoji.json");

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const loadingMsg = await message.channel.send(
      "🔄 Liderlik tablosu hazırlanıyor, lütfen bekleyin..."
    );
    setTimeout(() => loadingMsg.delete().catch(() => {}), 5000);

    // Tüm üyeleri fetch ederek çevrimdışı dahil almak
    await message.guild.members.fetch();

    // Bot olmayan tüm üyeler
    const members = message.guild.members.cache.filter((m) => !m.user.bot);

    if (!members.size) {
      const msg = await message.channel.send(
        "❌ | Sunucuda listelenecek üye bulunamadı!"
      );
      setTimeout(() => msg.delete().catch(() => {}), 5000);
      return;
    }

    let leaderboard = [];

    for (const [id, member] of members) {
      let userData = await db.get(`money_${id}`);
      if (userData === null || userData === undefined) {
        await db.set(`money_${id}`, 0);
        userData = 0;
      }
      leaderboard.push({
        userId: id,
        money: userData,
      });
    }

    leaderboard = leaderboard.sort((a, b) => b.money - a.money).slice(0, 10);

    if (leaderboard.length < 1) {
      const msg = await message.channel.send(
        "❌ | Sunucuda geçerli bir liderlik tablosu bulunamadı!"
      );
      setTimeout(() => msg.delete().catch(() => {}), 5000);
      return;
    }

    const embed = new MessageEmbed()
      .setTitle(`🏆 ${message.guild.name} | Liderlik Tablosu`)
      .setColor("#FFD700")
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({ text: `Toplam ${leaderboard.length} kullanıcı listelendi.` })
      .setTimestamp()
      .setDescription(
        leaderboard
          .map((entry, index) => {
            const user = client.users.cache.get(entry.userId);
            const username = user ? user.tag : "Bilinmeyen Kullanıcı";
            const emoji = chooseEmoji(entry.money);
            return `**${index + 1}.** ${username} - **${
              entry.money
            }** ${emoji}`;
          })
          .join("\n")
      );

    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("⚠️ | Liderlik tablosu alınırken hata oluştu:", error);
    const errMsg = await message.channel.send(
      "❌ | Liderlik tablosu alınırken bir hata oluştu, lütfen tekrar deneyin."
    );
    setTimeout(() => errMsg.delete().catch(() => {}), 5000);
  }
};

exports.help = {
  name: "lb",
  aliases: ["liderliktablosu"],
  usage: "lb",
  description:
    "Sunucudaki kullanıcıların paraya göre sıralandığı liderlik tablosunu gösterir.",
  category: "Ekonomi",
  cooldown: 20,
};
