const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");

module.exports.help = {
  name: "clyde",
  aliases: [],
  description: "Clyde botunun mesaj atmış gibi görünmesini sağlar.",
  usage: "clyde <mesaj>",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  const text = args.join(" ");
  if (!text) {
    return message.reply("❎ Lütfen Clyde'ın yazması için bir mesaj girin.");
  }

  try {
    const url = `https://nekobot.xyz/api/imagegen?type=clyde&text=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.message) {
      return message.reply("❎ API'den geçerli bir yanıt alınamadı.");
    }

    const attachment = new MessageAttachment(data.message, "clyde.png");
    return message.channel.send({ files: [attachment] });
  } catch (err) {
    console.error(err);
    return message.reply("❎ Bir hata oluştu, lütfen tekrar deneyin.");
  }
};
