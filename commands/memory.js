const { MessageEmbed, Collection } = require("discord.js");

module.exports.help = {
  name: "memory",
  aliases: ["hafıza", "ezber"],
  description:
    "Verilen kelimeleri ezberleyip tekrar yazmanız gereken bir oyun oynayın.",
  usage: "memory [1-20]",
  category: "Eğlence",
  cooldown: 20, // saniye
};

module.exports.execute = async (bot, message, args) => {
  if (!args[0])
    return message.channel.send(
      "**Lütfen 1-20 arasında bir seviye belirtin!**"
    );

  let level = parseInt(args[0]);
  if (isNaN(level) || level < 1 || level > 20)
    return message.channel.send(
      "**Sadece 1 ile 20 arasında bir seviye seçebilirsiniz!**"
    );

  if (!bot.games) bot.games = new Collection();

  const current = bot.games.get(message.channel.id);
  if (current)
    return message.channel.send(
      `**Lütfen mevcut \`${current.name}\` oyununun bitmesini bekleyin!**`
    );

  bot.games.set(message.channel.id, { name: "memory" });

  try {
    const memorize = genArray(level);
    const memorizeDisplay = memorize
      .map((word) => `\`${word.toUpperCase()}\``)
      .join(" ");

    const embed = new MessageEmbed()
      .setTitle("🧠 Hafıza Oyunu")
      .setDescription(
        `**10 saniyeniz var, bu kelimeleri ezberleyin!**\n${memorizeDisplay}`
      )
      .setColor("BLUE");

    const memorizemessage = await message.channel.send({ embeds: [embed] });

    await delay(10000);

    const embed2 = new MessageEmbed()
      .setTitle("⌛ Süre Doldu!")
      .setDescription("**Şimdi gördüğünüz kelimeleri sadece yazın!**")
      .setColor("RED");

    await memorizemessage.edit({ embeds: [embed2] });

    const memorizeType = memorize.join(" ");
    const filter = (res) => res.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
    });

    bot.games.delete(message.channel.id);

    if (!collected.size) {
      return message.channel.send(
        `**⏳ Süre doldu! Doğru cevap: ${memorizeDisplay}**`
      );
    }

    const answer = collected.first().content.toLowerCase();
    if (answer !== memorizeType) {
      return message.channel.send(
        `**❌ Yanlış yazdınız! Doğru cevap: ${memorizeDisplay}**`
      );
    }

    return message.channel.send("**✅ Tebrikler, kazandınız! 🎉🎉**");
  } catch (err) {
    bot.games.delete(message.channel.id);
    console.error(err);
  }
};

function genArray(level) {
  const colors = [
    "kırmızı",
    "mavi",
    "yeşil",
    "sarı",
    "turuncu",
    "mor",
    "pembe",
  ];
  const directions = ["sağ", "sol", "yukarı", "aşağı", "ileri", "geri"];
  const fruits = ["elma", "armut", "muz", "çilek", "karpuz", "üzüm"];

  const sourceArr = [colors, directions, fruits][Math.floor(Math.random() * 3)];
  const arr = [];
  for (let i = 0; i < level; i++)
    arr.push(sourceArr[Math.floor(Math.random() * sourceArr.length)]);
  return arr;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
