const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
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

// 2) Big Six Wheel segment verileri
const wheelSegments = [
  { label: "⚀", payout: 1 },
  { label: "⚁", payout: 2 },
  { label: "⚂", payout: 5 },
  { label: "⚃", payout: 10 },
  { label: "⚄", payout: 20 },
  { label: "⚅", payout: 50 },
  { label: "$", payout: 100 },
];

// customId ile segment label eşleştirmesi
const betMapping = {
  "1x": "⚀",
  "2x": "⚁",
  "5x": "⚂",
  "10x": "⚃",
  "20x": "⚄",
  "50x": "⚅",
  "100x": "$",
};

// 3) Spin mantığı: ağırlıklı seçim
function spinWheel() {
  const weighted = [];
  wheelSegments.forEach((seg) => {
    const weight = Math.round(100 / seg.payout);
    for (let i = 0; i < weight; i++) weighted.push(seg);
  });
  const choice = weighted[Math.floor(Math.random() * weighted.length)];
  return choice;
}

// 4) Çark döndürme animasyonu
async function spinWheelWithEffect(message, selectedSymbol) {
  // Mesaj gönder ve referans al
  const spinningMessage = await message.channel.send(
    `🎡 Çark dönüyor... Seçimin: ${selectedSymbol}`
  );

  const frames = [
    "🎡 Çark dönüyor |",
    "🎡 Çark dönüyor /",
    "🎡 Çark dönüyor -",
    "🎡 Çark dönüyor \\",
  ];
  let idx = 0;
  const iv = setInterval(() => {
    spinningMessage.edit(`${frames[idx]} — Seçimin: ${selectedSymbol}`);
    idx = (idx + 1) % frames.length;
  }, 500);

  // 3–9 saniye arasında rastgele bekle
  const duration = Math.floor(Math.random() * 6000) + 3000;
  await new Promise((r) => setTimeout(r, duration));

  clearInterval(iv);
  await spinningMessage.delete();
}

// ——— Komut ——— //
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

  // 2) Bahis miktarı seçimi
  const betEmbed = new MessageEmbed()
    .setTitle("🎡 Big Six Wheel Bahis")
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
    time: 30000,
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

    // 4) Bakiyeden düş
    await client.eco.removeMoney(userId, betAmount);
    const betEmoji = chooseEmoji(betAmount);

    // 5) Segment seçimi
    const row1 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("segment_1x")
        .setLabel("⚀ (1x)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("segment_2x")
        .setLabel("⚁ (2x)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("segment_5x")
        .setLabel("⚂ (5x)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("segment_10x")
        .setLabel("⚃ (10x)")
        .setStyle("PRIMARY")
    );
    const row2 = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("segment_20x")
        .setLabel("⚄ (20x)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("segment_50x")
        .setLabel("⚅ (50x)")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("segment_100x")
        .setLabel("$ (100x)")
        .setStyle("PRIMARY")
    );

    const segEmbed = new MessageEmbed()
      .setTitle("🎡 Bahis Segmenti Seç")
      .setDescription(
        `Bahis: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
          "Hangi segment için oynamak istiyorsun?"
      )
      .setColor("YELLOW");

    const segMsg = await interaction.followUp({
      embeds: [segEmbed],
      components: [row1, row2],
      fetchReply: true,
    });

    // 6) Segment butonlarını dinle
    try {
      const segInteraction = await segMsg.awaitMessageComponent({
        time: 30000,
      });
      await segInteraction.deferUpdate();

      const segmentKey = segInteraction.customId.split("_")[1]; // "1x", vb.
      const selectedSymbol = betMapping[segmentKey];

      // 7) Çark animasyonu
      await spinWheelWithEffect(message, selectedSymbol);

      // 8) Gerçek spin ve sonuç
      const resultSeg = spinWheel();
      const payoutInfo = wheelSegments.find((s) => s.label === resultSeg.label);
      const winnings =
        selectedSymbol === resultSeg.label ? betAmount * payoutInfo.payout : 0;

      if (winnings > 0) {
        await client.eco.addMoney(userId, winnings);
      }

      // 9) Sonuç embed
      const resultEmbed = new MessageEmbed()
        .setTitle("🎡 Big Six Wheel Sonuç")
        .setDescription(
          `Seçimin: **${selectedSymbol}**\n` +
            `Çark: **${resultSeg.label}**\n\n` +
            `**${winnings > 0 ? "Kazandın!" : "Kaybettin!"}**\n` +
            `Bahis: **${betAmount.toLocaleString()}** ${betEmoji}\n` +
            `Kazanç: **${winnings.toLocaleString()}** ${chooseEmoji(winnings)}`
        )
        .setColor(winnings > 0 ? "GREEN" : "RED");

      return segInteraction.followUp({ embeds: [resultEmbed] });
    } catch {
      return message.channel.send(
        "⏳ Süre doldu! Segment seçilmedi, oyun iptal edildi."
      );
    }
  });

  betCollector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      betMsg.edit({
        content: "⏳ Süre doldu! Bahis yapılmadı, iptal edildi.",
        components: [],
      });
    }
  });
};

exports.help = {
  name: "bigsix",
  description: "Big Six Wheel oyununu oynayın.",
  usage: "bigsix",
};
