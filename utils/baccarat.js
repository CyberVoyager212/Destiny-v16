const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

// ——— Yardımcı Fonksiyonlar ——— //
// 1) Paraya göre emoji seçen fonksiyon
// Kazanca göre emoji seçici
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message) => {
  const userId = message.author.id;

  // 1) Bakiyeyi al
  const balance = await client.eco.fetchMoney(userId);
  const balanceEmoji = chooseEmoji(balance);

  if (balance < 10) {
    return message.reply(
      `❌ Oynamak için en az 10 ${chooseEmoji(10)} gerekiyor!`
    );
  }

  // 2) Bahis miktarı seçimi için SelectMenu
  const betEmbed = new MessageEmbed()
    .setTitle("🎲 Baccarat Bahis")
    .setDescription(
      `Mevcut bakiyen: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
        "Lütfen bahis miktarını seç (min: 10 • max: 250.000 veya **All**):"
    )
    .setColor("GOLD");

  const betRow = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("bet_amount")
      .setPlaceholder("Bahis miktarı seçin")
      .addOptions([
        { label: "10", value: "10" },
        { label: "50", value: "50" },
        { label: "100", value: "100" },
        { label: "1.000", value: "1000" },
        { label: "10.000", value: "10000" },
        { label: "50.000", value: "50000" },
        { label: "75.000", value: "75000" },
        { label: "100.000", value: "100000" },
        { label: "250.000", value: "250000" },
        { label: "All", value: "all" },
      ])
  );

  const betMsg = await message.channel.send({
    embeds: [betEmbed],
    components: [betRow],
  });

  const betCollector = betMsg.createMessageComponentCollector({
    componentType: "SELECT_MENU",
    time: 60000,
    max: 1,
    filter: (i) => i.user.id === userId && i.customId === "bet_amount",
  });

  betCollector.on("collect", async (interaction) => {
    await interaction.deferUpdate();

    // 3) Bahis miktarını belirle
    const choice = interaction.values[0];
    const betAmount =
      choice === "all" ? Math.min(balance, 250000) : parseInt(choice, 10);

    if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
      return interaction.followUp({
        content: "❌ Geçersiz bahis! 10 ile 250.000 arasında bir değer seç.",
        ephemeral: true,
      });
    }
    if (betAmount > balance) {
      return interaction.followUp({
        content: "❌ Yetersiz bakiye!",
        ephemeral: true,
      });
    }

    // 4) Bahsi hesabından düş
    await client.eco.removeMoney(userId, betAmount);
    const betEmoji = chooseEmoji(betAmount);

    // 5) Bahis seçimi için butonlar
    const buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("player")
        .setLabel("🟦 Oyuncuya Bahis")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("banker")
        .setLabel("🟥 Bankere Bahis")
        .setStyle("DANGER"),
      new MessageButton()
        .setCustomId("tie")
        .setLabel("🟩 Beraberlik")
        .setStyle("SUCCESS")
    );

    const choiceEmbed = new MessageEmbed()
      .setTitle("🎲 Baccarat Bahis Seçimi")
      .setDescription(
        `Bahis miktarı: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
          "🟦 **Oyuncu** (2×)\n" +
          "🟥 **Banker** (1.95×, %5 komisyon)\n" +
          "🟩 **Beraberlik** (8×)"
      )
      .setColor("GOLD");

    const choiceMsg = await interaction.followUp({
      embeds: [choiceEmbed],
      components: [buttonRow],
      fetchReply: true,
    });

    const buttonCollector = choiceMsg.createMessageComponentCollector({
      componentType: "BUTTON",
      time: 30000,
      max: 1,
      filter: (btn) => btn.user.id === userId,
    });

    buttonCollector.on("collect", async (btnInt) => {
      await btnInt.deferUpdate();
      const betChoice = btnInt.customId; // "player", "banker" veya "tie"

      // 6) Kart destesi ve değer fonksiyonu
      const deck = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
      ];
      const getCardValue = (c) => {
        if (c === "A") return 1;
        if (["10", "J", "Q", "K"].includes(c)) return 0;
        return parseInt(c);
      };
      const draw = () => deck[Math.floor(Math.random() * deck.length)];

      // 7) Kartları çek
      const playerCards = [draw(), draw()];
      const bankerCards = [draw(), draw()];
      const playerScore =
        (getCardValue(playerCards[0]) + getCardValue(playerCards[1])) % 10;
      const bankerScore =
        (getCardValue(bankerCards[0]) + getCardValue(bankerCards[1])) % 10;

      // 8) Sonucu ve kazancı hesapla
      let resultText = "";
      let winnings = 0;
      if (playerScore > bankerScore) {
        resultText = "**🟦 Oyuncu kazandı!**";
        if (betChoice === "player") winnings = betAmount * 2;
      } else if (bankerScore > playerScore) {
        resultText = "**🟥 Banker kazandı!**";
        if (betChoice === "banker") winnings = betAmount * 1.95;
      } else {
        resultText = "**🟩 Beraberlik!**";
        if (betChoice === "tie") winnings = betAmount * 8;
      }

      // 9) Hesapları güncelle
      if (winnings > 0) {
        await client.eco.addMoney(userId, winnings);
      } else {
        await client.eco.removeMoney(userId, betAmount);
      }

      // 10) Sonuç embed
      const winEmoji = chooseEmoji(winnings);
      const resultEmbed = new MessageEmbed()
        .setTitle("🎲 Baccarat Sonuç")
        .setDescription(
          `${resultText}\n\n` +
            `🟦 Oyuncu: ${playerCards.join(" - ")} (**${playerScore}**)\n` +
            `🟥 Banker: ${bankerCards.join(" - ")} (**${bankerScore}**)\n\n` +
            `💰 Kazanç: **${winnings.toLocaleString()}** ${winEmoji}`
        )
        .setColor(winnings > 0 ? "GREEN" : "RED");

      await btnInt.editReply({ embeds: [resultEmbed], components: [] });
    });
  });

  betCollector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      betMsg.edit({
        content: "⏳ Süre doldu! Bahis seçilmedi, oyun iptal edildi.",
        components: [],
      });
    }
  });
};

exports.help = {
  name: "baccarat",
  description: "Baccarat oyununu oynayın.",
  usage: "baccarat",
  example: "baccarat",
};
