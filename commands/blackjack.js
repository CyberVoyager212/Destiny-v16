const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const crypto = require("crypto");
const emojis = require("../emoji.json"); // doğru yoldan emin ol

const cardEmoji = emojis.cards;
const cardBack = emojis.cardBack;

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

function formatHand(hand) {
  // Kartları emoji ile göster
  return hand
    .map((card) => cardEmoji[card.value] || `${card.value}${card.suit}`)
    .join(" ");
}

exports.execute = async (client, message, args) => {
  try {
    // Bahis miktarı
    let betAmount;
    if (args[0] === "all") {
      const userBalance = await client.eco.fetchMoney(message.author.id);
      betAmount = userBalance.amount;
    } else {
      betAmount = parseInt(args[0]);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply("Lütfen geçerli bir bahis miktarı girin.");
    }

    // Kullanıcının bakiyesi
    const userBalance = await client.eco.fetchMoney(message.author.id);
    if (userBalance.amount < betAmount) {
      return message.reply(
        `Yeterli paranız yok. Mevcut paranız: **${
          userBalance.amount
        }** ${chooseEmoji(userBalance.amount)}`
      );
    }

    // Para düşülüyor
    await client.eco.removeMoney(message.author.id, betAmount);

    // Desteyi hazırla
    let deck = [];
    const suits = ["♠", "♥", "♦", "♣"];
    const values = [
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

    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }

    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    deck = shuffle(deck);

    function calculateHandValue(hand) {
      let value = 0;
      let aceCount = 0;

      for (const card of hand) {
        if (["J", "Q", "K"].includes(card.value)) {
          value += 10;
        } else if (card.value === "A") {
          aceCount++;
          value += 11;
        } else {
          value += parseInt(card.value);
        }
      }

      while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount--;
      }

      return value;
    }

    let userHand = [deck.pop(), deck.pop()];
    let dealerHand = [deck.pop(), deck.pop()];

    const gameId = crypto.randomBytes(3).toString("hex");

    await client.db.set(`blackjack_${gameId}`, {
      userId: message.author.id,
      betAmount,
      deck,
      userHand,
      dealerHand,
      timestamp: Date.now(),
    });

    const embed = new MessageEmbed()
      .setTitle("🃏 Blackjack Oyunu Başladı!")
      .setDescription(
        `Oyun kodunuz: **${gameId}**\nKartlarınız: ${formatHand(
          userHand
        )}\nToplam değer: **${calculateHandValue(
          userHand
        )}**\nDağıtıcının açık kartı: ${
          cardEmoji[dealerHand[0].value] ||
          dealerHand[0].value + dealerHand[0].suit
        }`
      )
      .setColor("GREEN");

    const hitButton = new MessageButton()
      .setCustomId("hit")
      .setLabel("Çek")
      .setStyle("PRIMARY");

    const stayButton = new MessageButton()
      .setCustomId("stay")
      .setLabel("Dur")
      .setStyle("DANGER");

    const row = new MessageActionRow().addComponents(hitButton, stayButton);

    const gameMessage = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = gameMessage.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      let gameState = await client.db.get(`blackjack_${gameId}`);
      if (!gameState) {
        return interaction.reply({
          content: "Oyun sona erdi.",
          ephemeral: true,
        });
      }

      if (interaction.customId === "hit") {
        let newCard = gameState.deck.pop();
        gameState.userHand.push(newCard);

        let userValue = calculateHandValue(gameState.userHand);
        if (userValue > 21) {
          await client.db.delete(`blackjack_${gameId}`);
          return interaction.reply(
            `Büst! Toplam değeriniz: **${userValue}**. Bahis miktarınız **${betAmount}** ${chooseEmoji(
              betAmount
            )} kaybedildi.`
          );
        }

        let updatedEmbed = new MessageEmbed(embed).setDescription(
          `Kart çektiniz: ${
            cardEmoji[newCard.value] || newCard.value + newCard.suit
          }\nŞimdiki kartlarınız: ${formatHand(
            gameState.userHand
          )}\nToplam değer: **${userValue}**\nDağıtıcının açık kartı: ${
            cardEmoji[gameState.dealerHand[0].value] ||
            gameState.dealerHand[0].value + gameState.dealerHand[0].suit
          }`
        );

        await gameMessage.edit({ embeds: [updatedEmbed] });
      } else if (interaction.customId === "stay") {
        let dealerValue = calculateHandValue(gameState.dealerHand);

        while (dealerValue < 17) {
          gameState.dealerHand.push(gameState.deck.pop());
          dealerValue = calculateHandValue(gameState.dealerHand);
        }

        let userValue = calculateHandValue(gameState.userHand);

        if (dealerValue > 21 || userValue > dealerValue) {
          const winnings = gameState.betAmount * 2;
          await client.eco.addMoney(message.author.id, winnings);
          await client.db.delete(`blackjack_${gameId}`);
          return interaction.reply(
            `🎉 Tebrikler! Toplam değeriniz: **${userValue}**, Dağıtıcının değeri: **${dealerValue}**. Bahis kazandınız ve **${winnings}** ${chooseEmoji(
              winnings
            )} kazandınız.`
          );
        } else {
          await client.db.delete(`blackjack_${gameId}`);
          return interaction.reply(
            `Üzgünüm! Toplam değeriniz: **${userValue}**, Dağıtıcının değeri: **${dealerValue}**. Bahis miktarınız **${betAmount}** ${chooseEmoji(
              betAmount
            )} kaybedildi.`
          );
        }
      }

      await client.db.set(`blackjack_${gameId}`, gameState);
      interaction.deferUpdate();
    });

    collector.on("end", () => {
      gameMessage.edit({ components: [] });
    });
  } catch (error) {
    console.error(error);
    return message.reply("❌ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};

exports.help = {
  name: "blackjack",
  aliases: ["bj"],
  usage: "blackjack <miktar> veya blackjack all",
  description:
    "Blackjack oyununu oynatır. `<miktar>` ile belirli bir miktarda bahis yapılabilir veya `blackjack all` ile tüm bakiye ile oyun oynanır.",
  category: "Ekonomi",
  cooldown: 10, // saniye cinsinden
};
