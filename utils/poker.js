const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// ——— Yardımcı Fonksiyonlar ——— //

// 1) Kart destesi oluşturma
function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [
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
    "A",
  ];
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// 2) Kart sıralama haritası
const cardOrder = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

// 3) 5 kartlık eli değerlendir
function evaluate5(hand) {
  const sorted = hand
    .slice()
    .sort((a, b) => cardOrder[a.value] - cardOrder[b.value]);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const nums = sorted.map((c) => cardOrder[c.value]);
  let isStraight = false,
    straightHigh = null;

  if (nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)) {
    isStraight = true;
    straightHigh = nums[4];
  } else {
    const low = [2, 3, 4, 5, 14];
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    if (uniq.length === 5 && low.every((v, i) => uniq[i] === v)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const freq = {};
  for (const v of values) freq[v] = (freq[v] || 0) + 1;
  const counts = Object.values(freq);
  const four = counts.includes(4);
  const three = counts.includes(3);
  const pairs = counts.filter((c) => c === 2).length;

  if (isStraight && isFlush && straightHigh === 14)
    return { rank: 10, name: "Royal Flush" };
  if (isStraight && isFlush) return { rank: 9, name: "Straight Flush" };
  if (four) return { rank: 8, name: "Four of a Kind" };
  if (three && pairs === 1) return { rank: 7, name: "Full House" };
  if (isFlush) return { rank: 6, name: "Flush" };
  if (isStraight) return { rank: 5, name: "Straight" };
  if (three) return { rank: 4, name: "Three of a Kind" };
  if (pairs === 2) return { rank: 3, name: "Two Pair" };
  if (pairs === 1) return { rank: 2, name: "One Pair" };
  return { rank: 1, name: "High Card" };
}

// 4) Kombinasyon üretme
function getCombinations(arr, k) {
  const results = [];
  function comb(tmp, start) {
    if (tmp.length === k) {
      results.push(tmp);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      comb(tmp.concat(arr[i]), i + 1);
    }
  }
  comb([], 0);
  return results;
}

// 5) 7 karttan en iyisini seç
function evaluateHand(cards) {
  const combos = getCombinations(cards, 5);
  let best = { rank: 0, name: "" };
  for (const hand of combos) {
    const res = evaluate5(hand);
    if (res.rank > best.rank) best = res;
  }
  return best;
}

// 6) Kart emojileri
const cardEmoji = emojis.cards;
const cardBack = emojis.cardBack;

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

// ——— Komutun Kendisi ——— //
exports.execute = async (client, message, args) => {
  const user = message.author;

  // ---- Bahis mesajları öne alındı ---- //
  const raiseMessages = [
    "Dostum, raise yapıyorum, hadi oyunu ısıtalım!",
    "Raise: Bahsi artırıyorum, ne yapacaksın?",
    "Ben raise yapıyorum, meydanı sallıyorum!",
    "Raise yapıyorum, senin hamleni görmek istiyorum!",
    "Raise: Bahsimi yükseltiyorum, oyuna renk katıyorum!",
  ];
  const callMessages = [
    "Call yapıyorum, seninle aynıyım.",
    "Call: Bahsi eşitliyorum, devam ediyorum.",
    "Ben call yapıyorum, hamlemi takip ediyorum.",
    "Call: Oyunda kalıyorum, bakalım ne olacak.",
    "Call yapıyorum, senin hamleni görüyorum.",
  ];
  const foldMessages = [
    "Fold: Bu eli bırakıyorum, elim bana göre değil.",
    "Fold ediyorum, bugün şansım yaver gitmedi.",
    "Fold: Elimde iyi bir şey yok, çekiliyorum.",
    "Fold ediyorum, oyundan çıkıyorum.",
    "Fold: Bu tur benim için uygun değil.",
  ];

  // 1) Bakiyeyi çek
  const balanceData = await client.eco.fetchMoney(user.id);
  const balance =
    typeof balanceData === "object" && balanceData.amount != null
      ? balanceData.amount
      : Number(balanceData) || 0;

  if (balance < 10) {
    return message.channel.send(
      `❌ Oynamak için en az 10 ${chooseEmoji(
        10
      )} gerekiyor! (Bakiyen: **${balance}** ${chooseEmoji(balance)})`
    );
  }

  // 2) Bahis seçimi için embed + select menu
  const betEmbed = new MessageEmbed()
    .setTitle("🃏 Poker Bahsi")
    .setDescription(
      `Bakiyen: **${balance}** ${chooseEmoji(
        balance
      )}\nLütfen bir bahis miktarı seç.`
    )
    .setColor("BLUE");

  const betRow = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("poker_bet")
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
    embeds: [betEmbed],
    components: [betRow],
  });

  const filter = (i) => i.user.id === user.id && i.customId === "poker_bet";
  const collector = menuMsg.createMessageComponentCollector({
    componentType: "SELECT_MENU",
    time: 30000,
    filter,
  });

  collector.on("collect", async (interaction) => {
    let choice = interaction.values[0];
    let betAmount = choice === "all" ? balance : parseInt(choice, 10);

    if (betAmount > balance) {
      return interaction.reply({
        content: `❌ Yetersiz bakiye! (Bakiyen: ${balance})`,
        ephemeral: true,
      });
    }

    await client.eco.removeMoney(user.id, betAmount);

    // --- Poker oyunu başlıyor ---
    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const bots = [
      { name: "Bot 1", hand: [deck.pop(), deck.pop()] },
      { name: "Bot 2", hand: [deck.pop(), deck.pop()] },
      { name: "Bot 3", hand: [deck.pop(), deck.pop()] },
    ];
    const community = [
      deck.pop(),
      deck.pop(),
      deck.pop(),
      deck.pop(),
      deck.pop(),
    ];

    const toEmoji = (cards) =>
      cards.map((c) => cardEmoji[c.value] || cardBack).join(" ");

    const startEmbed = new MessageEmbed()
      .setTitle("🃏 Poker Oyunu Başladı!")
      .setDescription(
        `**Senin Kartların:** ${toEmoji(playerHand)}\n\n` +
          `**Bot Kartları:**\n${bots
            .map((b) => `${b.name}: ${cardBack} ${cardBack}`)
            .join("\n")}\n\n` +
          `**Topluluk Kartları:** ${toEmoji(community)}\n\n` +
          `Bahis: **${betAmount}** ${chooseEmoji(betAmount)}`
      )
      .setColor("GREEN");

    await interaction.update({ embeds: [startEmbed], components: [] });

    const actionRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("action_raise")
        .setLabel("Raise")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("action_call")
        .setLabel("Call")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("action_fold")
        .setLabel("Fold")
        .setStyle("DANGER")
    );

    const actionMsg = await message.channel.send({
      content: "Hamleni seç:",
      components: [actionRow],
    });

    const actionCollector = actionMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === user.id,
      componentType: "BUTTON",
      time: 30000,
    });

    actionCollector.on("collect", async (ai) => {
      let extraBet = 0;
      if (ai.customId === "action_fold") {
        return ai.update({
          content: "❌ Sen fold ettin. Oyunu kaybettin.",
          components: [],
        });
      }
      if (ai.customId === "action_raise") {
        extraBet = Math.floor(betAmount * 0.5);
        await client.eco.removeMoney(user.id, extraBet);
        betAmount += extraBet;
        await ai.update({
          content: `🔼 Raise yaptın! Yeni bahis: **${betAmount}** ${chooseEmoji(
            betAmount
          )}`,
          components: [],
        });
      } else {
        await ai.update({
          content: "✅ Call yaptın. Oyuna devam ediyorsun.",
          components: [],
        });
      }

      // Bot hamleleri…
      bots.forEach((bot) => {
        const score = evaluateHand(bot.hand.concat(community));
        let action, msg;
        if (score.rank >= 9) {
          action = "raises";
          msg = raiseMessages[Math.floor(Math.random() * raiseMessages.length)];
          bot.active = true;
        } else if (score.rank >= 2) {
          action = "calls";
          msg = callMessages[Math.floor(Math.random() * callMessages.length)];
          bot.active = true;
        } else {
          if (Math.random() < 0.3) {
            action = Math.random() < 0.5 ? "raises" : "calls";
            msg = (action === "raises" ? raiseMessages : callMessages)[
              Math.floor(Math.random() * 5)
            ];
            bot.active = true;
          } else {
            action = "folds";
            msg = foldMessages[Math.floor(Math.random() * foldMessages.length)];
            bot.active = false;
          }
        }
        bot.action = `${bot.name}: ${msg} (El: ${score.name})`;
      });

      const botEmbed = new MessageEmbed()
        .setTitle("🤖 Bot Hamleleri")
        .setDescription(bots.map((b) => b.action).join("\n"))
        .setColor("ORANGE");
      await message.channel.send({ embeds: [botEmbed] });
      await message.channel.send(
        "💬 Botlar arasında kısa bir sohbet geçiyor..."
      );

      setTimeout(async () => {
        const activeBots = bots.filter((b) => b.active);
        if (activeBots.length === 0) {
          await client.eco.addMoney(user.id, betAmount * 2);
          return message.channel.send(
            `🎉 **Kazandın!** Tüm botlar fold etti. **${
              betAmount * 2
            }** ${chooseEmoji(betAmount)} kazandın!`
          );
        }

        const playerScore = evaluateHand(playerHand.concat(community));
        const botScores = activeBots.map((b) => ({
          name: b.name,
          score: evaluateHand(b.hand.concat(community)),
        }));
        const all = [...botScores, { name: "Sen", score: playerScore }].sort(
          (a, b) => b.score.rank - a.score.rank
        );

        const winner = all[0];
        if (winner.name === "Sen") {
          await client.eco.addMoney(user.id, betAmount * 2);
          return message.channel.send(
            `🎉 **Kazanan: Sen!** (${playerScore.name}) **${
              betAmount * 2
            }** ${chooseEmoji(betAmount)} kazandın!`
          );
        } else {
          return message.channel.send(
            `😔 **Kaybettin!** Kazanan: **${winner.name}** (${winner.score.name}).`
          );
        }
      }, 5000);
    });

    actionCollector.on("end", (collected) => {
      if (collected.size === 0) {
        actionMsg.edit({
          content: "⏰ Süre doldu, hamle yapmadın.",
          components: [],
        });
      }
    });
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      menuMsg.edit({
        content: "⏰ Süre doldu, bahis seçilmedi.",
        embeds: [],
        components: [],
      });
    }
  });
};

exports.help = {
  name: "poker",
  description:
    "Texas Hold'em tarzı poker oynayın. Botlar blöf yapar, sohbet eder ve hamleler için menü kullanılır.",
  usage: "poker",
  example: "poker",
};
