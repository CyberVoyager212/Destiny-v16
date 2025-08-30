const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
} = require("discord.js");

const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message) => {
  // 1. Mevcut bakiye al
  const balData = await client.eco.fetchMoney(message.author.id);
  const userBalance =
    typeof balData === "object" && balData.amount != null
      ? balData.amount
      : Number(balData) || 0;

  if (userBalance < 10) {
    return message.channel.send(
      "❌ Oynamak için en az 10 " + chooseEmoji(10) + " gerekiyor!"
    );
  }

  // 2. Bahis miktarı seçtirmek için select menu
  const embed = new MessageEmbed()
    .setTitle(`${emojis.guns.bos} Rus Ruleti`)
    .setDescription("Lütfen bahis miktarınızı seçin:")
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

  let gameMessage = await message.channel.send({
    embeds: [embed],
    components: [row],
  });

  const filter = (i) => i.user.id === message.author.id;
  const collector = gameMessage.createMessageComponentCollector({
    filter,
    time: 60000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    let betAmount =
      interaction.values[0] === "all"
        ? Math.min(userBalance, 250000)
        : parseInt(interaction.values[0], 10);

    if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
      return interaction.update({
        content: `❌ Geçersiz miktar! 10 ile 250.000 arasında veya "All".`,
        components: [],
      });
    }
    if (userBalance < betAmount) {
      return interaction.update({
        content: "❌ Yeterli bakiyeniz yok!",
        components: [],
      });
    }

    let roundsSurvived = 0;

    // 3. Oyun başlangıç embed ve butonlar
    const gameEmbed = new MessageEmbed()
      .setTitle(`${emojis.guns.bos} Rus Ruleti`)
      .setDescription(
        `Bahis başlıyor! İlk bahis: **${betAmount.toLocaleString()}** ${chooseEmoji(
          betAmount
        )}\n\n` + `Tetiği çekmek için "Tetik Çek" butonuna bas!`
      )
      .setColor("DARK_RED");

    const gameRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("shoot")
        .setLabel("Tetik Çek")
        .setStyle("DANGER"),
      new MessageButton()
        .setCustomId("leave")
        .setLabel("Çekil")
        .setStyle("SECONDARY")
    );

    await interaction.update({ embeds: [gameEmbed], components: [gameRow] });

    const gameCollector = gameMessage.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    gameCollector.on("collect", async (gameInteraction) => {
      // Çekil seçeneği
      if (gameInteraction.customId === "leave") {
        gameCollector.stop();
        return gameInteraction.update({
          content: `Oyundan çekildin! **${betAmount.toLocaleString()}** ${chooseEmoji(
            betAmount
          )} paranı geri aldın.`,
          embeds: [],
          components: [],
        });
      }

      await gameInteraction.deferUpdate();
      const shot = Math.random() < 0.5; // %50 ölüm

      if (shot) {
        // Ateş etti, ölüm
        gameCollector.stop();
        await client.eco.removeMoney(message.author.id, betAmount);
        return gameInteraction.editReply({
          content: `${
            emojis.guns.ates
          } **BANG!** Öldün .38 Special silahı senin beynini adeta uçurdu ve **${betAmount.toLocaleString()}** ${chooseEmoji(
            betAmount
          )} kaybettin!`,
          embeds: [],
          components: [],
        });
      } else {
        // Boş şarjör
        roundsSurvived++;
        betAmount *= 2;

        if (roundsSurvived >= 3) {
          // 3 tur hayatta kaldı, büyük ödül
          gameCollector.stop();
          const winnings = betAmount * 5;
          await client.eco.addMoney(message.author.id, winnings);
          return gameInteraction.editReply({
            content: `🎉 **3 Tur Hayatta Kaldın!** Büyük ödülü kazandın: **${winnings.toLocaleString()}** ${chooseEmoji(
              winnings
            )}!`,
            embeds: [],
            components: [],
          });
        }

        // Devam ediliyor
        const newGameEmbed = new MessageEmbed()
          .setTitle(`${emojis.guns.bos} Rus Ruleti`)
          .setDescription(
            `${
              emojis.guns.bos
            } Tetiği çekti, şarjör boş! Yeni bahis: **${betAmount.toLocaleString()}** ${chooseEmoji(
              betAmount
            )}\n\n` + `Devam etmek ister misin?`
          )
          .setColor("GOLD");

        const newGameRow = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId("shoot")
            .setLabel("Tetik Çek")
            .setStyle("DANGER"),
          new MessageButton()
            .setCustomId("leave")
            .setLabel("Çekil")
            .setStyle("SECONDARY")
        );

        await gameInteraction.editReply({
          embeds: [newGameEmbed],
          components: [newGameRow],
        });
      }
    });

    gameCollector.on("end", (_, reason) => {
      if (reason === "time") {
        gameMessage.edit({
          content: "⏳ Süre doldu, oyun iptal edildi.",
          embeds: [],
          components: [],
        });
      }
    });
  });

  collector.on("end", (_, reason) => {
    if (reason === "time") {
      message.reply("⏳ Süre doldu, bahis yapılmadı.");
    }
  });
};

exports.help = {
  name: "rusruleti",
  description:
    "Rus Ruleti oynayın ve şansınızı deneyin. Bahis miktarınızı oyunda seçebilirsiniz.",
  usage: "rusruleti",
  example: "rusruleti",
};
