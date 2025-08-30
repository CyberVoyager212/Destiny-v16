const ms = require("ms");
const emojis = require("../emoji.json"); // emoji.json'u içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

module.exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;
    const cooldownKey = `dailyCooldownn_${userId}`;
    const moneyKey = `money_${userId}`;
    const cooldownTime = ms("24h");

    const lastClaim = (await client.db.get(cooldownKey)) || 0;
    const now = Date.now();

    if (now - lastClaim < cooldownTime) {
      const remaining = cooldownTime - (now - lastClaim);
      const hours = Math.floor(
        (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return message.reply(
        `⏳ **Günlük ödülünü zaten aldın!**\n🕒 **Tekrar alabilmen için:** \`${hours} saat, ${minutes} dakika, ${seconds} saniye\` beklemelisin.`
      );
    }

    const amount = Math.floor(Math.random() * 500) + 100; // 100 - 599
    const currentMoney = (await client.db.get(moneyKey)) || 0;
    const newBalance = currentMoney + amount;

    await client.db.set(moneyKey, newBalance);
    await client.db.set(cooldownKey, now);

    const emoji = chooseEmoji(newBalance);

    return message.reply(
      `🎁 **Günlük ödülünü aldın!**\n${emoji} **Miktar:** \`${amount}\`\n💼 **Toplam paran:** \`${newBalance}\``
    );
  } catch (error) {
    console.error("⚠️ daily komutu hata:", error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin!**");
  }
};

module.exports.help = {
  name: "daily",
  aliases: ["günlük"],
  usage: "daily",
  description: "Günlük para ödülü alırsınız.",
  category: "Ekonomi",
  cooldown: 5,
};
