const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");

exports.execute = async (client, message, args) => {
  const split = args.join(" ").split(",");
  const user = split[0]?.trim();
  const user2 = split[1]?.trim();

  if (!user || !user2) {
    return message.reply(
      "⚠️ **Lütfen iki metin girin ve bunları virgülle ayırın!**"
    );
  }

  try {
    const res = await fetch(
      `https://frenchnoodles.xyz/api/endpoints/drake/?text1=${encodeURIComponent(
        user
      )}&text2=${encodeURIComponent(user2)}`
    );
    const image = await res.buffer();
    const drakememe = new MessageAttachment(image, "drake-meme.png");

    return message.channel.send({ files: [drakememe] });
  } catch (error) {
    console.error(error);
    return message.reply(
      "❌ **Meme oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.**"
    );
  }
};

exports.help = {
  name: "drake-meme",
  aliases: ["drake"],
  usage: "drake-meme <metin1>, <metin2>",
  description: "Drake meme oluşturur. İki metni virgülle ayırarak girin.",
  category: "Eğlence",
  cooldown: 10,
};
