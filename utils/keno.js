const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
} = require("discord.js");

// ——— Yardımcı Fonksiyonlar ——— //

// 1) Paraya göre emoji seçen fonksiyon
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message) => {
  const userId = message.author.id;

  // 1) Bakiyeyi doğrudan al
  const balance = await client.eco.fetchMoney(userId);
  const balanceEmoji = chooseEmoji(balance);

  // 2) Bahis miktarı seçimi: SelectMenu ile
  const embed = new MessageEmbed()
    .setTitle("🎲 Keno Bahis")
    .setDescription(
      `Ne kadar bahis yapmak istiyorsun? 💰\n\n` +
        `Mevcut paran: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
        `⏳ 30 saniyede bir seçenek seçmelisin.\n\n` +
        `**Min:** 10 ${chooseEmoji(10)} • **Max:** 250.000 ${chooseEmoji(
          250000
        )}\n` +
        `Ya da **All** seçerek tüm bakiyeni kullanabilirsin.`
    )
    .setColor("GOLD");

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

  const betCollector = menuMsg.createMessageComponentCollector({
    componentType: "SELECT_MENU",
    time: 30000,
    max: 1,
    filter: (i) => i.user.id === userId && i.customId === "bet_amount",
  });

  betCollector.on("collect", async (interaction) => {
    await interaction.deferUpdate();
    const choice = interaction.values[0];
    const betAmount =
      choice === "all" ? Math.min(balance, 250000) : parseInt(choice, 10);

    // Geçerlilik kontrolleri
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

    // Para düşme
    await client.eco.removeMoney(userId, betAmount);
    const betEmoji = chooseEmoji(betAmount);

    // 3) Sayı seçimi için embed
    const kenoEmbed = new MessageEmbed()
      .setTitle("🎲 Keno Sayıları Seç")
      .setDescription(
        `**Bahis:** ${betAmount.toLocaleString()} ${betEmoji}\n\n` +
          "1–80 arasında **en fazla 10** sayı seçip boşlukla ayır.\n" +
          "Örnek: `3 15 27 80`\n\n" +
          "**Kazanç:**\n" +
          "- 1–3 eşleşme: 2×\n" +
          "- 4–6 eşleşme: 5×\n" +
          "- 7–9 eşleşme: 10×\n" +
          "- 10 eşleşme: 100×"
      )
      .setColor("GOLD");

    await interaction.followUp({ embeds: [kenoEmbed] });

    // 4) Kullanıcıdan sayı mesajı topla
    const numberCollector = message.channel.createMessageCollector({
      filter: (m) => m.author.id === userId,
      time: 30000,
      max: 1,
    });

    numberCollector.on("collect", async (numberMsg) => {
      const selected = numberMsg.content
        .split(/\s+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => n >= 1 && n <= 80);

      if (selected.length === 0 || selected.length > 10) {
        return numberMsg.reply(
          "❌ Hatalı seçim! 1–80 arasında, en fazla 10 sayı seç."
        );
      }
      numberCollector.stop();

      // 5) Çekiliş: 20 benzersiz sayı
      const drawn = [];
      while (drawn.length < 20) {
        const n = Math.floor(Math.random() * 80) + 1;
        if (!drawn.includes(n)) drawn.push(n);
      }

      const matched = selected.filter((n) => drawn.includes(n));
      let winnings = 0;
      if (matched.length === 0) winnings = 0;
      else if (matched.length <= 3) winnings = betAmount * 2;
      else if (matched.length <= 6) winnings = betAmount * 5;
      else if (matched.length <= 9) winnings = betAmount * 10;
      else if (matched.length === 10) winnings = betAmount * 100;

      // Kazancı hesabına ekle (kaybettiyse zaten parayı çektik)
      if (winnings > 0) {
        await client.eco.addMoney(userId, winnings);
      }

      const winEmoji = chooseEmoji(winnings);

      // 6) Sonuç embed’i
      const resultEmbed = new MessageEmbed()
        .setTitle("🎲 Keno Sonuç")
        .setDescription(
          `**Çekilen:** ${drawn.join(", ")}\n` +
            `**Seçilen:** ${selected.join(", ")}\n` +
            `**Eşleşen:** ${matched.join(", ") || "–"}\n\n` +
            `💰 **Kazanç:** ${winnings.toLocaleString()} ${winEmoji}`
        )
        .setColor(winnings > 0 ? "GREEN" : "RED");

      await numberMsg.reply({ embeds: [resultEmbed] });
    });

    numberCollector.on("end", (collected, reason) => {
      if (reason === "time" && collected.size === 0) {
        message.channel.send(
          "⏳ Süre doldu! Sayı seçilmedi, oyun iptal edildi."
        );
      }
    });
  });

  betCollector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      menuMsg.edit({
        content: "⏳ Süre doldu! Bahis yapılmadı, oyun iptal edildi.",
        embeds: [],
        components: [],
      });
    }
  });
};

exports.help = {
  name: "keno",
  description: "Keno oyununu oynayın.",
  usage: "keno",
  example: "keno",
};
