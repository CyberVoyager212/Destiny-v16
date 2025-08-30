const moment = require("moment-timezone");
const emojis = require("../emoji.json"); // emoji.json'u içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  if (!args[0] || isNaN(args[0]) || parseInt(args[0]) <= 0) {
    return message.reply("⚠️ Lütfen geçerli bir miktar girin.");
  }

  const userId = message.author.id;
  const borrowAmount = parseInt(args[0]);

  const userCredit = (await client.db.get(`credit_${userId}`)) || 100;
  const existingLoan = (await client.db.get(`loan_${userId}`)) || {
    amount: 0,
    time: null,
  };

  const maxLoan = userCredit * 1000;

  if (existingLoan.amount > 0) {
    return message.reply("❌ Önce mevcut borcunuzu ödemelisiniz!");
  }

  if (borrowAmount > maxLoan) {
    return message.reply(
      `⚠️ Maksimum çekebileceğiniz miktar **${maxLoan}** ${chooseEmoji(
        maxLoan
      )}.`
    );
  }

  await client.db.set(`loan_${userId}`, {
    amount: borrowAmount,
    time: moment().tz("Europe/Istanbul").format(),
  });

  await client.eco.addMoney(userId, borrowAmount);

  let creditScore = userCredit;
  if (borrowAmount >= 100000) creditScore -= 10;
  else if (borrowAmount >= 50000) creditScore -= 5;

  await client.db.set(`credit_${userId}`, creditScore);

  return message.reply(
    `✅ **${borrowAmount}** ${chooseEmoji(borrowAmount)} borç aldınız. ` +
      `Kredi puanınız şimdi **${creditScore}**. ` +
      `Borcunuzu zamanında ödemeye dikkat edin. ` +
      `5 gün içinde ödenmeyen borçlar yüzünden bot kullanımınız kapanabilir!`
  );
};

exports.help = {
  name: "paraçek",
  aliases: [],
  usage: "paraçek <miktar>",
  description:
    "Borç alarak bakiyenizi artırırsınız. Kredi puanınıza bağlı olarak maksimum çekebileceğiniz miktar değişir.",
  category: "Ekonomi",
  cooldown: 30, // 30 saniye cooldown önerisi
};
