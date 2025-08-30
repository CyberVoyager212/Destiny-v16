const { MessageEmbed } = require("discord.js");

const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const user = message.author;
    const inventoryKey = `inventory_${user.id}`;

    // Envanter verisini çek
    let items = await client.db.get(inventoryKey);

    if (!Array.isArray(items) || items.length === 0) {
      return message.reply(
        "🛍️ **Envanterin boş!** Toplamak için `huntbot` veya `topla` kullanabilirsin."
      );
    }

    // Eşyaları gruplandırma ve miktarları hesaplama
    const itemCounts = {};
    let totalValue = 0;

    for (const item of items) {
      if (!item) continue;
      const emoji = item.emoji || "❓";
      const name = item.name || "Bilinmeyen";
      const value = item.value || 0;

      totalValue += value;

      const key = `${emoji} ${name}`;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    }

    // Gösterilecek mesaj hazırlanması
    const embed = new MessageEmbed()
      .setTitle(`📦 ${user.username}'in Envanteri`)
      .setColor("#00B0F4")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    Object.entries(itemCounts).forEach(([itemName, count]) => {
      embed.addField(itemName, `Miktar: **${count}**`, true);
    });

    // Kazanca göre emoji belirleyip toplam değeri ekle
    const gainEmoji = chooseEmoji(totalValue);
    embed.addField(
      `${gainEmoji} Toplam Envanter Değeri`,
      `${totalValue} `,
      false
    );

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("🛑 inventory komutu hata:", error);
    return message.reply(
      "❌ **Envanter görüntülenirken bir hata oluştu. Lütfen tekrar deneyin.**"
    );
  }
};

exports.help = {
  name: "inventory",
  aliases: ["env"],
  usage: "inventory",
  description: "Envanterinizdeki eşyaları listeler.",
  category: "Ekonomi",
  cooldown: 5,
};
