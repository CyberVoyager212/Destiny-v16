const axios = require("axios");
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "korkuhikayesi",
  aliases: ["korku", "horror"],
  usage: "korkuhikayesi",
  description: "Yapay zeka tarafından kısa bir korku hikayesi anlatır.",
  category: "Eğlence",
  cooldown: 20,
};

async function getHorrorStory(API_KEY) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "z-ai/glm-4.5-air:free", // İstersen farklı model seçebilirsin
      messages: [
        {
          role: "system",
          content:
            "Kısa, ürkütücü ve akılda kalıcı bir korku hikayesi yaz. Fazla uzun olmasın, maksimum 5-6 cümle. Sadece hikayeyi yaz, başka bir şey ekleme.",
        },
        {
          role: "user",
          content: "Bana korku hikayesi anlat.",
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
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
    return "Karanlıkta bir ses duydum, ama sesin sahibi yoktu...";
  }

  return response.data.choices[0].message.content.trim();
}

exports.execute = async (client, message, args) => {
  try {
    const story = await getHorrorStory(client.config.OPENROUTER_API_KEY);

    const embed = new MessageEmbed()
      .setTitle("👻 Korku Hikayesi")
      .setDescription(story)
      .setColor("#8B0000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("❌ Korku hikayesi alınırken bir hata oluştu.");
  }
};
