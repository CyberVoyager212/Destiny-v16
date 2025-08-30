const axios = require("axios");

exports.help = {
  name: "garipbilgi",
  aliases: ["ilginçbilgi", "tuhafbilgi"],
  usage: "garipbilgi",
  description: "Sana ilginç, garip ve tuhaf bir bilgi verir.",
  category: "Eğlence",
  cooldown: 10,
};

async function fetchWeirdFactFromOpenRouter(OPENROUTER_API_KEY) {
  const messages = [
    {
      role: "user",
      content:
        "Sen garip, eğlenceli ve tuhaf bilgiler veren bir botsun. Kullanıcıya internette pek bulunmayan, garip veya tuhaf bir bilgi ver. Bilgiyi sade, kısa ve eğlenceli anlat. Sadece bilgi ver, başka şey yazma.",
    },
  ];

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "z-ai/glm-4.5-air:free", // model değiştirilebilir
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
    }
  );

  if (
    !response.data.choices ||
    !response.data.choices[0].message ||
    !response.data.choices[0].message.content
  ) {
    throw new Error("OpenRouter’dan geçerli bir içerik gelmedi.");
  }

  return response.data.choices[0].message.content.trim();
}

exports.execute = async (client, message, args) => {
  try {
    const OPENROUTER_API_KEY = client.config.OPENROUTER_API_KEY;

    const weirdFact = await fetchWeirdFactFromOpenRouter(OPENROUTER_API_KEY);

    // Embed ile gönder
    const embed = {
      title: "🤯 Garip Bilgi!",
      description: weirdFact,
      color: "#00CCCC",
      footer: { text: `${client.user.username} Garip Bilgi Botu` },
      timestamp: new Date(),
    };

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    return message.reply(
      "❌ Garip bilgi alınırken bir hata oluştu, lütfen tekrar deneyiniz."
    );
  }
};
