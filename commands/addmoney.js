const emojis = require("../emoji.json"); // emoji.json dosyasını doğru path'ten çağır

exports.execute = async (client, message, args) => {
  // Bot sahibi kontrolü
  if (!client.config.admins.includes(message.author.id)) {
    return message.reply("❌ **Bu komutu kullanmak için yetkiniz yok.**");
  }

  // Etiketlenen kullanıcı kontrolü
  let user = message.mentions.users.first();
  if (!user) {
    return message.reply("⚠️ **Lütfen bir kullanıcı etiketleyin.**");
  }

  // Verilen miktarın geçerli olup olmadığını kontrol et
  let amount = args[1];
  if (!amount || isNaN(amount)) {
    return message.reply("⚠️ **Lütfen geçerli bir miktar belirtin.**");
  }

  // Miktar sıfır veya negatif olamaz
  amount = parseInt(amount);
  if (amount <= 0) {
    return message.reply("⚠️ **Miktar sıfır veya negatif olamaz.**");
  }

  // Emoji seçim fonksiyonu
  const chooseEmoji = (amount) => {
    if (amount > 100000) return emojis.money.high;
    if (amount > 10000) return emojis.money.medium;
    return emojis.money.low;
  };

  const feeEmoji = chooseEmoji(amount);

  try {
    // Para ekleme işlemi
    await client.eco.addMoney(user.id, amount);

    // Başarılı işlem sonrası mesaj
    return message.channel.send(
      `✅ **${user.tag}** kullanıcısına **${amount}** ${feeEmoji} başarıyla eklendi!`
    );
  } catch (error) {
    console.error(error);
    return message.reply(
      "❌ **Para eklerken bir hata oluştu. Lütfen tekrar deneyin.**"
    );
  }
};

exports.help = {
  name: "addmoney",
  aliases: ["addbal"],
  usage: "addmoney @kullanıcı <miktar>",
  description: "Bir kullanıcıya belirli miktarda para ekler.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};
