const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    if (!client.config.admins.includes(message.author.id)) {
      return message.reply("⛔ **Bu komutu kullanma yetkiniz yok.**");
    }

    let user = message.mentions.users.first();
    if (!user) {
      return message.reply(
        "👤 **Lütfen bir kullanıcı etiketleyin!**\nÖrnek: `setmoney @kullanıcı 1000`"
      );
    }

    let amount = args[1];
    if (!amount || isNaN(amount) || parseInt(amount) < 0) {
      return message.reply(
        "💰 **Lütfen geçerli bir miktar belirtin!**\nÖrnek: `setmoney @kullanıcı 1000`"
      );
    }

    const moneyKey = `money_${user.id}`;
    await client.db.set(moneyKey, parseInt(amount));
    const newBalance = await client.db.get(moneyKey);

    return message.channel.send(
      `✅ **${
        user.tag
      }** kullanıcısının bakiyesi başarıyla \`${newBalance}\` ${chooseEmoji(
        newBalance
      )} olarak güncellendi!`
    );
  } catch (error) {
    console.error(error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin.**");
  }
};

exports.help = {
  name: "setmoney",
  aliases: ["setbal"],
  usage: "setmoney @kullanıcı <miktar>",
  description:
    "Belirtilen kullanıcının parasını belirttiğiniz miktara ayarlarsınız.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};
