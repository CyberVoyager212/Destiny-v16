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
    let betAmount = parseInt(args[0], 10);
    let userBalance = await client.eco.fetchMoney(message.author.id);
    const maxBet = 250000;

    if (args[0] === "all") {
      betAmount = Math.min(userBalance.amount, maxBet);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("❌ **Lütfen geçerli bir bahis miktarı girin.**");
    }

    if (betAmount > maxBet) {
      betAmount = maxBet;
    }

    if (userBalance.amount < betAmount) {
      return message.reply(
        `❌ **Yeterli bakiyeniz yok. Mevcut paranız:** \`${
          userBalance.amount
        }\` ${chooseEmoji(userBalance.amount)}`
      );
    }

    await client.eco.removeMoney(message.author.id, betAmount);

    const spinningEmoji = emojis.slot.spinning;
    // emoji.json'dan slot emojileri alınıyor
    const slotEmojis = [
      emojis.slot.slot1, // 2x
      emojis.slot.slot2, // 3x
      emojis.slot.slot3, // 4x
    ];

    const multipliers = {
      [emojis.slot.slot1]: 2,
      [emojis.slot.slot2]: 3,
      [emojis.slot.slot3]: 4,
    };

    let slotMessage = await message.channel.send(`
🎰 **Slot Makinesi Çalışıyor...**

[ ${spinningEmoji} | ${spinningEmoji} | ${spinningEmoji} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.author.username}

        `);

    await new Promise((resolve) => setTimeout(resolve, 2500));

    let isWinner = Math.random() < 0.5;
    let finalSlots;

    if (isWinner) {
      let winningEmoji =
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
      finalSlots = [winningEmoji, winningEmoji, winningEmoji];
    } else {
      finalSlots = [
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
      ];
    }

    let revealedSlots = [spinningEmoji, spinningEmoji, spinningEmoji];
    for (let i = 0; i < 3; i++) {
      revealedSlots[i] = finalSlots[i];
      await slotMessage.edit(`
🎰 **Slot Makinesi Çalışıyor...**

[ ${revealedSlots[0]} | ${revealedSlots[1]} | ${revealedSlots[2]} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.author.username}

            `);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    let reward = 0;
    if (isWinner) {
      reward = betAmount * multipliers[finalSlots[0]];
      await client.eco.addMoney(message.author.id, reward);
    }

    await slotMessage.edit(`
🎰 **Slot Sonucu**

[ ${finalSlots[0]} | ${finalSlots[1]} | ${finalSlots[2]} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.author.username}
${
  reward > 0
    ? `Kazanç: +${reward} ${chooseEmoji(reward)} 🎉`
    : `Kaybettiniz: -${betAmount} ${chooseEmoji(betAmount)} 😢`
}

        `);
  } catch (error) {
    console.error(error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin.**");
  }
};

exports.help = {
  name: "slot",
  aliases: [],
  usage: "slot <miktar> veya slot all",
  description: "Slot makinesi oynayarak şansınızı deneyin.",
  category: "Ekonomi",
  cooldown: 5,
};
