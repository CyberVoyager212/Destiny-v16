const emojis = require("../emoji.json");

module.exports.help = {
  name: "coinflip",
  aliases: ["flip", "yazıtura"],
  description: "Yazı veya tura atar.",
  usage: "coinflip",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  // JSON içinden al
  const spinner = emojis.coinflip.spinner;
  const headsEmoji = emojis.coinflip.heads;
  const tailsEmoji = emojis.coinflip.tails;

  // Başlangıç spinner
  const msg = await message.channel.send(
    `${spinner} Para havaya fırlatılıyor...`
  );

  // 5 saniye bekle
  setTimeout(() => {
    const isHeads = Math.random() < 0.5;
    const resultEmoji = isHeads ? headsEmoji : tailsEmoji;
    const resultText = isHeads ? "**Sonuç: Yazı!**" : "**Sonuç: Tura!**";

    msg.edit(`${resultEmoji} ${resultText}`);
  }, 5000);
};
