const moment = require("moment-timezone");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  if (!args[0] || isNaN(args[0]) || parseInt(args[0]) <= 0) {
    return message.reply("⚠️ Lütfen geçerli bir ödeme miktarı girin.");
  }

  const userId = message.author.id;
  let paymentAmount = parseInt(args[0]);

  let userBalance = (await client.db.get(`money_${userId}`)) || 0;
  let loanData = (await client.db.get(`loan_${userId}`)) || {
    amount: 0,
    time: null,
  };
  let creditScore = (await client.db.get(`credit_${userId}`)) || 100;

  if (loanData.amount <= 0) {
    return message.reply("✅ Mevcut bir borcunuz bulunmamaktadır!");
  }

  // Faiz hesaplama
  const lastLoanTime = moment(loanData.time);
  const currentTime = moment().tz("Europe/Istanbul");
  const daysPassed = currentTime.diff(lastLoanTime, "days");

  const interestRate = 0.05; // Günlük %5 faiz
  const totalInterest = Math.floor(
    loanData.amount * Math.pow(1 + interestRate, daysPassed) - loanData.amount
  );

  if (daysPassed > 0) {
    loanData.amount += totalInterest;
    creditScore -= daysPassed * 2;
  }

  paymentAmount = Math.min(paymentAmount, loanData.amount, userBalance);

  if (paymentAmount <= 0) {
    return message.reply("❌ Ödeme yapmak için yeterli paranız yok.");
  }

  userBalance -= paymentAmount;
  await client.db.set(`money_${userId}`, userBalance);

  const remainingLoan = loanData.amount - paymentAmount;

  if (remainingLoan <= 0) {
    await client.db.set(`loan_${userId}`, { amount: 0, time: null });

    const loanDuration = currentTime.diff(lastLoanTime, "hours");

    if (loanDuration < 24 && loanData.amount >= 100000) {
      creditScore += 15;
    } else if (loanDuration < 48) {
      creditScore += 10;
    }

    if (paymentAmount >= loanData.amount / 2) {
      creditScore += 5;
    }

    if (daysPassed === 0) {
      creditScore += 10;
    }

    await client.db.set(`credit_${userId}`, creditScore);

    return message.reply(
      `✅ Borcunuzu tamamen ödediniz! Faiz dahil toplam ödeme: **${
        paymentAmount + totalInterest
      }** ${chooseEmoji(paymentAmount + totalInterest)}.\n` +
        `📈 Kredi puanınız **${creditScore}** oldu.`
    );
  } else {
    await client.db.set(`loan_${userId}`, {
      amount: remainingLoan,
      time: loanData.time,
    });

    await client.db.set(`credit_${userId}`, creditScore);

    return message.reply(
      `✅ **${paymentAmount}** ${chooseEmoji(
        paymentAmount
      )} ödeme yaptınız.\n` +
        `💸 Kalan borcunuz: **${remainingLoan}** ${chooseEmoji(
          remainingLoan
        )}\n` +
        `📊 Güncel kredi puanınız: **${creditScore}**.`
    );
  }
};

exports.help = {
  name: "ödeme",
  aliases: [],
  usage: "ödeme <miktar>",
  description:
    "Mevcut borcunuzdan ödeme yaparak bakiyenizden düşersiniz. Ödeme geciktikçe faiz işler ve kredi puanınız düşer.",
  category: "Ekonomi",
  cooldown: 15,
};
