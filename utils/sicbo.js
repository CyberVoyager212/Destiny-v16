const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

// ——— Paraya Göre Emoji Seçimi ——— //
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  const userId = message.author.id;

  // 1) Bakiyeyi al
  const balance = await client.eco.fetchMoney(userId);
  const balanceEmoji = chooseEmoji(balance);

  if (balance < 10) {
    return message.reply(
      `❌ Oynamak için en az 10 ${chooseEmoji(10)} gerekiyor!`
    );
  }

  // 2) SelectMenu ile bahis miktarı seçtirme
  const betEmbed = new MessageEmbed()
    .setTitle("🎲 Sic Bo Bahis")
    .setDescription(
      `Mevcut bakiyen: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
        "Lütfen bahis miktarını seç:\n(min: 10 • max: 250.000 veya **All**)"
    )
    .setColor("BLUE");

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

    // 3) Bet miktarını belirle
    const choice = interaction.values[0];
    const betAmount =
      choice === "all" ? Math.min(balance, 250000) : parseInt(choice, 10);

    if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
      return interaction.followUp({
        content: "❌ Geçersiz bahis! 10 ile 250.000 arasında seç.",
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

    // 5) High/Low butonları
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("high")
        .setLabel("Yüksek (11-17)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("low")
        .setLabel("Alçak (4-10)")
        .setStyle("DANGER")
    );

    const chooseEmbed = new MessageEmbed()
      .setTitle("🎲 Sic Bo Seçim")
      .setDescription(
        `Bahis: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
          "Yüksek mi (11-17), yoksa Alçak mı (4-10) seç?"
      )
      .setColor("BLUE");

    const chooseMsg = await interaction.followUp({
      embeds: [chooseEmbed],
      components: [row],
      fetchReply: true,
    });

    // 6) Buton etkileşimi
    const compCollector = chooseMsg.createMessageComponentCollector({
      componentType: "BUTTON",
      time: 30000,
      max: 1,
      filter: (i) => i.user.id === userId,
    });

    compCollector.on("collect", async (btn) => {
      await btn.deferUpdate();
      const choice = btn.customId; // "high" veya "low"

      // 7) Zarları at
      const roll = () => Math.floor(Math.random() * 6) + 1;
      const dices = [roll(), roll(), roll()];
      const total = dices.reduce((a, b) => a + b, 0);

      // 8) Sonucu belirle
      const isHigh = total >= 11 && total <= 17;
      const isLow = total >= 4 && total <= 10;
      const won = (choice === "high" && isHigh) || (choice === "low" && isLow);

      // 9) Ödeme işlemi
      if (won) {
        await client.eco.addMoney(userId, betAmount);
      } else {
        // bahis zaten çekildi
      }

      // 10) Sonuç embed
      const resultEmbed = new MessageEmbed()
        .setTitle("🎲 Sic Bo Sonuç")
        .setDescription(
          `Zarlar: **${dices.join(" - ")}** (Toplam: **${total}**)\n` +
            (won ? "✅ **Kazandın!**" : "❌ **Kaybettin!**") +
            `\n\n${
              won
                ? `Kazanç: **${betAmount.toLocaleString()}** ${chooseEmoji(
                    betAmount
                  )}`
                : `Kaybettiğin: **${betAmount.toLocaleString()}** ${chooseEmoji(
                    betAmount
                  )}`
            }`
        )
        .setColor(won ? "GREEN" : "RED");

      await btn.editReply({ embeds: [resultEmbed], components: [] });
    });

    compCollector.on("end", (_, reason) => {
      if (reason === "time") {
        chooseMsg.edit({
          content: "⏳ Süre doldu, seçim yapılmadı.",
          embeds: [],
          components: [],
        });
      }
    });
  });

  betCollector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      betMsg.edit({
        content: "⏳ Süre doldu, bahis yapılmadı.",
        embeds: [],
        components: [],
      });
    }
  });
};

exports.help = {
  name: "sicbo",
  description: "Sic Bo oyununu oynayın.",
  usage: "sicbo",
  example: "sicbo",
  category: "Games",
  cooldown: 5,
};
