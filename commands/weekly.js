const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  const db = client.db; // quick.db instance
  const userId = message.author.id;
  const cooldownKey = `weekllyCooldown_${userId}`;
  const moneyKey = `money_${userId}`;

  const cooldownTime = 7 * 24 * 60 * 60 * 1000; // 7 gün cooldown (ms cinsinden)
  const now = Date.now();

  // Cooldown kontrolü
  const lastUsed = await db.get(cooldownKey);
  if (lastUsed && now - lastUsed < cooldownTime) {
    const remaining = cooldownTime - (now - lastUsed);

    // Kalan süreyi detaylı hesapla
    const seconds = Math.floor((remaining / 1000) % 60);
    const minutes = Math.floor((remaining / 1000 / 60) % 60);
    const hours = Math.floor((remaining / 1000 / 60 / 60) % 24);
    const days = Math.floor(remaining / 1000 / 60 / 60 / 24);

    return message.reply(
      `Haftalık kredinizi zaten aldınız. ${days} gün, ${hours} saat, ${minutes} dakika ve ${seconds} saniye sonra tekrar alabilirsiniz.`
    );
  }

  // Random miktar belirle (500 ile 1500 arası)
  let amount = Math.floor(Math.random() * 1000) + 500;

  // Kullanıcının parasını al (yoksa 0)
  let currentMoney = (await db.get(moneyKey)) || 0;
  let newMoney = currentMoney + amount;

  // Parayı ekle ve cooldown zamanını güncelle
  await db.set(moneyKey, newMoney);
  await db.set(cooldownKey, now);

  // Emoji seç
  const emoji = chooseEmoji(amount);

  // Mesajı gönder
  return message.reply(
    `Haftalık krediniz olarak **${amount}** ${emoji} aldınız ve şimdi toplamda **${newMoney}** ${emoji} paranız var.`
  );
};

exports.help = {
  name: "weekly",
  aliases: [],
  usage: "weekly",
  description: "Haftalık ödülünüzü almanızı sağlar.",
  category: "Ekonomi",
  cooldown: 5,
};
