const { MessageEmbed } = require("discord.js");

module.exports.help = {
  name: "basit-oyun",
  aliases: ["b-oyun", "bo", "basito"],
  description: "Üç taş (Tic-Tac-Toe) veya taş-kağıt-makas (RPS) oyunu oynayın!",
  usage: "basit-oyun [tkm / üt] [@kullanıcı (üt için)]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  if (!args[0]) {
    return message.channel.send(
      "**Lütfen bir oyun seçin: `tkm` (taş-kağıt-makas) veya `üt` (üç taş)!**"
    );
  }

  let gameType = args[0].toLowerCase();

  if (!bot.games) bot.games = new Map(); // Eğer bot.games tanımlı değilse oluştur

  if (gameType === "tkm") {
    return playRPS(bot, message, args);
  } else if (gameType === "üt") {
    return playTicTacToe(bot, message, args);
  } else {
    return message.channel.send(
      "**Geçersiz oyun türü! `tkm` (taş-kağıt-makas) veya `üt` (üç taş) seçin.**"
    );
  }
};

// 📌 Taş-Kağıt-Makas Oyunu (RPS)
async function playRPS(bot, message, args) {
  const choices = ["taş", "kağıt", "makas"]; // Taş, Kağıt, Makas
  const res = { taş: "🪨 Taş", kağıt: "📜 Kağıt", makas: "✂️ Makas" };

  let userChoice = args[1]?.toLowerCase(); // Kullanıcının seçimi
  if (!choices.includes(userChoice))
    return message.channel.send(
      "**Lütfen `taş`, `kağıt` veya `makas` girin!**"
    );

  const botChoice = choices[Math.floor(Math.random() * choices.length)]; // Botun seçimi rastgele

  let result;
  if (userChoice === botChoice) {
    result = "**Berabere! Kimse kazanmadı.**";
  } else if (
    (userChoice === "taş" && botChoice === "kağıt") || // Taş vs Kağıt -> Bot kazanır
    (userChoice === "kağıt" && botChoice === "makas") || // Kağıt vs Makas -> Bot kazanır
    (userChoice === "makas" && botChoice === "taş") // Makas vs Taş -> Bot kazanır
  ) {
    result = `**${bot.user.username} kazandı!**`;
  } else {
    result = `**${message.member.displayName} kazandı! Tebrikler! 🎉**`;
  }

  const embed = new MessageEmbed()
    .setTitle(
      `${message.member.displayName} vs ${bot.user.username} - Taş Kağıt Makas`
    )
    .addFields(
      {
        name: `${message.member.displayName}`,
        value: res[userChoice],
        inline: true,
      },
      { name: `${bot.user.username}`, value: res[botChoice], inline: true },
      { name: "Sonuç", value: result }
    )
    .setFooter({
      text: `Meydan okuyan: ${message.member.displayName}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp()
    .setColor("BLUE");

  return message.channel.send({ embeds: [embed] });
}

// 📌 Üç Taş (Tic-Tac-Toe) Oyunu
async function playTicTacToe(bot, message, args) {
  if (!args[1])
    return message.channel.send("**Lütfen bir kullanıcı etiketleyin!**");

  let opponent =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[1]) ||
    message.guild.members.cache.find(
      (r) =>
        r.user.username.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) =>
        r.displayName.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    );

  if (!opponent)
    return message.channel.send("**Lütfen geçerli bir kullanıcı girin!**");
  if (opponent.user.bot)
    return message.channel.send("**Botlarla oynayamazsınız!**");
  if (opponent.user.id === message.author.id)
    return message.channel.send("**Kendi kendine oynayamazsın!**");

  const current = bot.games.get(message.channel.id);
  if (current)
    return message.channel.send(
      `**Lütfen mevcut \`${current.name}\` oyununun bitmesini bekleyin!**`
    );

  bot.games.set(message.channel.id, { name: "tictactoe" });

  try {
    await message.channel.send(
      `**${opponent}, bu meydan okumayı kabul ediyor musun?**`
    );
    const verification = await verify(message.channel, opponent);
    if (!verification) {
      bot.games.delete(message.channel.id);
      return message.channel.send(
        `**Görünüşe göre ${opponent} oynamak istemiyor!**`
      );
    }

    const sides = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const taken = [];
    let userTurn = true;
    let winner = null;
    let lastTurnTimeout = false;

    while (!winner && taken.length < 9) {
      const user = userTurn ? message.author : opponent;
      const sign = userTurn ? "❌" : "⭕";

      await message.channel
        .send(`**${user}, hangi kareyi seçiyorsun? \`Bırak\` yazarak pes edebilirsin!**\n\`\`\`
            ${sides[0]} | ${sides[1]} | ${sides[2]}
            —————————
            ${sides[3]} | ${sides[4]} | ${sides[5]}
            —————————
            ${sides[6]} | ${sides[7]} | ${sides[8]}
            \`\`\``);

      const filter = (res) =>
        res.author.id === user.id &&
        (sides.includes(res.content) || res.content.toLowerCase() === "bırak");
      const turn = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000,
      });

      if (!turn.size) {
        await message.channel.send(`**Süre doldu, oyun bitti!**`);
        if (lastTurnTimeout) {
          winner = "süre";
          break;
        } else {
          userTurn = !userTurn;
          lastTurnTimeout = true;
          continue;
        }
      }

      const choice = turn.first().content;
      if (choice.toLowerCase() === "bırak") {
        winner = userTurn ? opponent : message.author;
        break;
      }

      sides[parseInt(choice, 10) - 1] = sign;
      taken.push(choice);

      if (verifyWin(sides)) winner = userTurn ? message.author : opponent;
      if (lastTurnTimeout) lastTurnTimeout = false;
      userTurn = !userTurn;
    }

    bot.games.delete(message.channel.id);
    return message.channel.send(
      winner === "süre"
        ? "**Oyun süresizliğe takıldı, iptal edildi!**"
        : winner
        ? `**Tebrikler, ${winner}!** 🎉`
        : "**Berabere!**"
    );
  } catch (err) {
    bot.games.delete(message.channel.id);
    console.error(err);
  }
}

// Kazananı kontrol etme fonksiyonu
function verifyWin(sides) {
  return (
    (sides[0] === sides[1] && sides[0] === sides[2]) ||
    (sides[3] === sides[4] && sides[3] === sides[5]) ||
    (sides[6] === sides[7] && sides[6] === sides[8]) ||
    (sides[0] === sides[3] && sides[0] === sides[6]) ||
    (sides[1] === sides[4] && sides[1] === sides[7]) ||
    (sides[2] === sides[5] && sides[2] === sides[8]) ||
    (sides[0] === sides[4] && sides[0] === sides[8]) ||
    (sides[2] === sides[4] && sides[2] === sides[6])
  );
}

// Kullanıcı doğrulama fonksiyonu
async function verify(channel, user) {
  const filter = (res) =>
    res.author.id === user.id &&
    ["evet", "hayır"].includes(res.content.toLowerCase());
  const response = await channel.awaitMessages({ filter, max: 1, time: 30000 });
  return response.size && response.first().content.toLowerCase() === "evet";
}
