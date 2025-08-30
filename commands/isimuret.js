const axios = require("axios");
const botConfig = require("../botConfig.js");

exports.help = {
  name: "isimuret",
  aliases: ["aduret", "isimüret"],
  usage: "isimuret",
  description: "Güzel ve kullanılabilir bir isim üretir.",
  category: "Eğlence",
  cooldown: 10,
};

async function generateName(message) {
  // Son 10 mesajı al (kendisi hariç)
  const fetchedMessages = await message.channel.messages.fetch({ limit: 10 });
  const history = fetchedMessages
    .filter((m) => !m.author.bot && m.id !== message.id)
    .map((m) => `Kullanıcı: ${m.content}`)
    .reverse();

  // Mesaj geçmişi ile API promptu oluştur
  const aiMessages = [
    ...history.map((h) => ({ role: "user", content: h })),
    {
      role: "user",
      content:
        "Kısa, modern, güzel farklı bir tek bir isim üret ve başına rastgele bir emoji ekle. Yalnızca 'emoji | isim' formatında dön, başka hiçbir şey yazma.",
    },
  ];

  try {
    const aiRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "z-ai/glm-4.5-air:free",
        messages: aiMessages,
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
        },
      }
    );

    // API cevabını direkt gönderiyoruz, müdahale yok
    return aiRes.data?.choices?.[0]?.message?.content?.trim() || "✨ | Nova";
  } catch (err) {
    console.error("API hatası:", err);
    return "✨ | Nova";
  }
}

exports.execute = async (client, message, args) => {
  try {
    const name = await generateName(message);
    message.channel.send(name);
  } catch (err) {
    console.error(err);
    message.reply("❌ İsim üretirken bir hata oluştu.");
  }
};
