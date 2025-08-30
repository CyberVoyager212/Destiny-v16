const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

// ——— Yardımcı Fonksiyonlar ——— //
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const balance = await client.eco.fetchMoney(userId);
  const balanceEmoji = chooseEmoji(balance);

  if (balance < 10) {
    return message.channel.send(
      `❌ Oynamak için en az 10 ${chooseEmoji(10)} gerekiyor!`
    );
  }

  // 1) Bahis menüsü
  const embed = new MessageEmbed()
    .setTitle("🎲 Craps Oyunu")
    .setDescription(
      `Mevcut bakiyen: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
        "Lütfen bahis miktarını seç:\n(min: 10 • max: 250.000 veya **All**)"
    )
    .setColor("BLUE");

  const row = new MessageActionRow().addComponents(
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

  const menuMsg = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const collector = menuMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === userId && i.customId === "bet_amount",
    componentType: "SELECT_MENU",
    time: 60000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    await interaction.deferUpdate();

    // Bahis miktarını belirle
    const choice = interaction.values[0];
    let betAmount =
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

    // Bahsi düş
    await client.eco.removeMoney(userId, betAmount);
    const betEmoji = chooseEmoji(betAmount);

    // — Botcollector’dan ÖNCE tanımlıyoruz —
    let point = null;
    let gameOver = false;

    // 2) Zar atma ekranı
    const gameEmbed = new MessageEmbed()
      .setTitle("🎲 Craps Oyunu")
      .setDescription(
        `İlk zar atılıyor! Bahis: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
          "“Zar At” butonuna bas!"
      )
      .setColor("BLUE");

    const gameRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("roll")
        .setLabel("🎲 Zar At")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("leave")
        .setLabel("🏃 Çekil")
        .setStyle("SECONDARY")
    );

    // Butonlu mesajı gönder ve referans al
    const gameMessage = await interaction.followUp({
      embeds: [gameEmbed],
      components: [gameRow],
      fetchReply: true,
    });

    // 3) Buton collector
    const gameCollector = gameMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      componentType: "BUTTON",
      time: 60000,
    });

    gameCollector.on("collect", async (gameInteraction) => {
      const { customId } = gameInteraction;

      // Çekil butonu
      if (customId === "leave") {
        gameCollector.stop();
        return gameInteraction.update({
          content: `🏃 Oyundan çekildin! **${betAmount.toLocaleString()}** ${betEmoji} geri verildi.`,
          embeds: [],
          components: [],
        });
      }

      // Zar at
      await gameInteraction.deferUpdate();
      if (gameOver) return;

      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const roll = dice1 + dice2;

      // Come-out roll
      if (point === null) {
        if (roll === 7 || roll === 11) {
          gameOver = true;
          await client.eco.addMoney(userId, betAmount * 2);
          return gameInteraction.editReply({
            content:
              `🎉 **Kazandın!** Zar: **${dice1}+${dice2}=${roll}**\n` +
              `💰 Kazanç: **${(betAmount * 2).toLocaleString()}** ${chooseEmoji(
                betAmount * 2
              )}`,
            embeds: [],
            components: [],
          });
        }
        if ([2, 3, 12].includes(roll)) {
          gameOver = true;
          return gameInteraction.editReply({
            content:
              `💀 **Kaybettin!** Zar: **${dice1}+${dice2}=${roll}**\n` +
              `Kaybedilen bahis: **${betAmount.toLocaleString()}** ${betEmoji}`,
            embeds: [],
            components: [],
          });
        }
        // Point belirleme
        point = roll;
        return gameInteraction.editReply({
          embeds: [
            new MessageEmbed()
              .setTitle("🎲 Craps Oyunu")
              .setDescription(
                `Point belirlendi: **${point}** 🎯\n` +
                  `Şimdi **${point}** atarsan kazanırsın, **7** atarsan kaybedersin!`
              )
              .setColor("GOLD"),
          ],
          components: [gameRow],
        });
      }

      // Point sonrası
      if (roll === point) {
        gameOver = true;
        await client.eco.addMoney(userId, betAmount * 2);
        return gameInteraction.editReply({
          content:
            `🎉 **Point'i tutturdun!** Zar: **${dice1}+${dice2}=${roll}**\n` +
            `💰 Kazanç: **${(betAmount * 2).toLocaleString()}** ${chooseEmoji(
              betAmount * 2
            )}`,
          embeds: [],
          components: [],
        });
      }
      if (roll === 7) {
        gameOver = true;
        return gameInteraction.editReply({
          content:
            `💀 **7 Geldi! Kaybettin!** Zar: **${dice1}+${dice2}=${roll}**\n` +
            `Kaybedilen bahis: **${betAmount.toLocaleString()}** ${betEmoji}`,
          embeds: [],
          components: [],
        });
      }

      // Devam
      return gameInteraction.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("🎲 Craps Oyunu")
            .setDescription(
              `🎲 Zar: **${dice1}+${dice2}=${roll}**\n` +
                `Hedef: **${point}**, devam etmek için “Zar At”`
            )
            .setColor("YELLOW"),
        ],
        components: [gameRow],
      });
    });
  });
};

exports.help = {
  name: "craps",
  description: "Craps zar oyunu oynayın ve şansınızı deneyin.",
  usage: "craps",
  example: "craps",
};
