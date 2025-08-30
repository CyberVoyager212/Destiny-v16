const { MessageEmbed } = require("discord.js"); // EmbedBuilder yerine MessageEmbed kullanıyoruz
const { items } = require("../index.js"); // index.js dosyasından eşyalar alındı
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
    const cooldownKey = `cooldown_${user.id}`;
    const inventoryKey = `inventory_${user.id}`;
    const currentTime = Date.now();

    // Check cooldown time
    let cooldown = await client.db.get(cooldownKey);
    if (!cooldown) cooldown = 0;

    if (cooldown > currentTime) {
      const timeLeft = Math.ceil((cooldown - currentTime) / 1000);
      return message.reply(
        `⏳ Bir dahaki toplama işlemi için ${timeLeft} saniye beklemelisin.`
      );
    }

    // Check if 'items' is properly defined and not empty
    if (!Array.isArray(items) || items.length === 0) {
      return message.reply(
        "⚠️ Eşyalar listesi şu anda boş! Lütfen yöneticinizle iletişime geçin."
      );
    }

    // Randomly select item
    const item = items[Math.floor(Math.random() * items.length)];
    const quantity = Math.floor(Math.random() * 5) + 1; // 1 ile 5 arası miktar

    // Get current inventory or initialize
    let inventory = await client.db.get(inventoryKey);
    if (!inventory) inventory = [];

    // Add items to inventory
    for (let i = 0; i < quantity; i++) {
      inventory.push(item);
    }
    await client.db.set(inventoryKey, inventory);

    // Set new cooldown (20 saniye)
    const cooldownTime = 20 * 1000;
    await client.db.set(cooldownKey, currentTime + cooldownTime);

    // Choose emoji for quantity (örnek olarak miktara göre)
    const emoji = chooseEmoji(quantity);

    // Embed mesajı oluştur
    const embed = new MessageEmbed()
      .setTitle("🎉 Eşya Toplama")
      .setDescription(`Topladığın eşyalar: ${quantity}x **${item.name}**`)
      .setColor("GREEN")
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Hata:", error);
    return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "topla",
  aliases: [],
  usage: "topla",
  description: "Rastgele bir eşya toplar ve envanterinize ekler.",
  category: "Ekonomi",
  cooldown: 20,
};
