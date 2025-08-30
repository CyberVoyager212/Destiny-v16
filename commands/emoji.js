const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const botConfig = require("../botConfig.js");

exports.help = {
  name: "emojiçevir",
  aliases: ["emojify"],
  usage: "emojiçevir <metin>",
  description:
    "Verilen metni yapay zeka ile sadece emojilerden oluşacak şekilde çevirir.",
  category: "Eğlence",
  cooldown: 10, // saniye
};

exports.execute = async (client, message, args) => {
  const inputText = args.join(" ");
  if (!inputText) return message.reply("Lütfen çevirilecek bir metin girin.");

  const aiMessages = [
    {
      role: "user",
      content: `Sen bir "emoji çeviri botusun". bu metni: ${inputText} yalnızca emojilerle ifade et. Harf veya sayı kullanma. kullandığın emoji sayısı kelime sayısıyla orantılı olmaya çalışsın. herhangi bir açıklama yapma metin kullanma sadece emojileri yaz.`,
    },
  ];

  try {
    const aiRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "z-ai/glm-4.5-air:free",
        messages: aiMessages,
        max_tokens: 2048,
        temperature: 0.4,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
        },
      }
    );

    const aiReply = aiRes.data.choices[0].message.content;
    const embed = new MessageEmbed()
      .setTitle("Emoji Çeviri")
      .setDescription(aiReply)
      .setColor("RANDOM")
      .setFooter({ text: `Çeviren: ${message.author.tag}` });

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("Emoji çevirisi sırasında bir hata oluştu.");
  }
};
