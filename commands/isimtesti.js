const axios = require("axios");
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "isimtesti",
  aliases: ["isim-anlam", "adtest"],
  usage: "isimtesti <isim>",
  description: "Girilen ismin anlamını yapay zeka ile öğrenir.",
  category: "Eğlence",
  cooldown: 10,
};

async function fetchNameMeaning(name, API_KEY) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "z-ai/glm-4.5-air:free", // istersen farklı model seçebilirsin
      messages: [
        {
          role: "user",
          content: `Bana "${name}" isminin anlamını söyle. ekstra bişey ekleme sadece bu ismin anlamını söyle bir fikrin yoksa rastgele bişi söyle`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
    }
  );

  if (
    !response.data.choices ||
    !response.data.choices[0].message ||
    !response.data.choices[0].message.content
  ) {
    return "Bu ismin anlamı bulunamadı.";
  }

  return response.data.choices[0].message.content.trim();
}

exports.execute = async (client, message, args) => {
  const name = args.join(" ");
  if (!name) return message.reply("Lütfen bir isim gir: `isimtesti <isim>`");

  try {
    const meaning = await fetchNameMeaning(
      name,
      client.config.OPENROUTER_API_KEY
    );

    const embed = new MessageEmbed()
      .setTitle(`📖 "${name}" İsminin Anlamı`)
      .setDescription(meaning)
      .setColor("#4B0082")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("❌ İsim anlamı alınırken bir hata oluştu.");
  }
};
