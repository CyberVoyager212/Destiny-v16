const ms = require("ms");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

module.exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;

    // Kullanıcının parasını veritabanından çek (yoksa 0)
    let money = (await client.db.get(`money_${userId}`)) || 0;

    // Bahis miktarını belirle
    let betAmount;
    if (args[0] === "all") {
      betAmount = Math.min(money, 250000);
    } else {
      betAmount = parseInt(args[0]);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("⚠️ Lütfen geçerli bir bahis miktarı girin.");
    }

    betAmount = Math.min(betAmount, 250000);

    if (money < betAmount) {
      return message.reply(
        `❌ Yeterli paranız yok. Mevcut paranız: **${money}** ${chooseEmoji(
          money
        )}.`
      );
    }

    let colorChoice = args[1]?.toLowerCase();
    if (!["kırmızı", "beyaz", "siyah"].includes(colorChoice)) {
      return message.reply(
        "⚠️ Lütfen `kırmızı`, `beyaz` veya `siyah` renklerinden birini seçin."
      );
    }

    const bettingMessage = await message.reply(
      `🎰 Bahis oynanıyor... **${betAmount}** ${chooseEmoji(
        betAmount
      )} oynanıyor ve ${colorChoice} topuna bahis yapılıyor...`
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const colors = [
      "🔴",
      "⚪",
      "🔴",
      "⚪",
      "🔴",
      "⚪",
      "🔴",
      "⚫",
      "🔴",
      "⚪",
      "🔴",
      "⚪",
      "🔴",
      "⚪",
    ];
    let currentColors = [...colors];

    let animationSteps = Math.floor(Math.random() * 40) + 1;

    for (let i = 0; i < animationSteps; i++) {
      const lastBall = currentColors.pop();
      currentColors.unshift(lastBall);

      const updatedMessage = `🎰 Bahis oynanıyor... **${betAmount}** ${chooseEmoji(
        betAmount
      )} oynanıyor ve ${colorChoice} topuna bahis yapılıyor...
  \n${currentColors.join(" ")}
  \n⬆️
  \n **Beyaz=2x** | **Kırmızı=2x** | **Siyah=3x**`;

      await bettingMessage.edit(updatedMessage);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    let firstBall = currentColors[0];
    let multiplier = 0;
    let resultMessage = "";

    if (firstBall === "⚪" && colorChoice === "beyaz") {
      multiplier = 2;
      resultMessage = `⚪ Top beyaz geldi! **Tebrikler!** Paranızın **2 katı** kadar kazandınız.`;
    } else if (firstBall === "🔴" && colorChoice === "kırmızı") {
      multiplier = 2;
      resultMessage = `🔴 Top kırmızı geldi! **Tebrikler!** Paranızın **2 katı** kadar kazandınız.`;
    } else if (firstBall === "⚫" && colorChoice === "siyah") {
      multiplier = 3;
      resultMessage = `⚫ Top siyah geldi! **Tebrikler!** Paranızın **3 katı** kadar kazandınız.`;
    } else {
      multiplier = 0;
      resultMessage = `💔 Üzgünüz, top **${firstBall}** geldi. Kaybettiniz.`;
    }

    let winnings = betAmount * multiplier;

    if (multiplier > 0) {
      // Kazanç ekle
      money += winnings;
      await client.db.set(`money_${userId}`, money);
    } else {
      // Kaybedilen miktarı düş
      money -= betAmount;
      if (money < 0) money = 0;
      await client.db.set(`money_${userId}`, money);
    }

    resultMessage += ` Şu an toplamda **${money}** ${chooseEmoji(
      money
    )} paranız var.`;

    await message.channel.send(resultMessage);
  } catch (error) {
    console.error("Bet komutu hatası:", error);
    return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "bet",
  aliases: [],
  usage: "bet <miktar> <renk> veya bet all <renk>",
  description:
    "Bahis yapmak için kullanılır. `<miktar>` ile belirli bir miktarda bahis yapılabilir veya `bet all` ile tüm bakiye ile bahis yapılır. Renkler: kırmızı, beyaz, siyah.",
  category: "Ekonomi",
  cooldown: 5,
};
