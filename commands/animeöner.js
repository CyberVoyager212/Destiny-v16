// commands/animeoner.js
const fetch = require("node-fetch");

exports.help = {
  name: "animeoner",
  aliases: ["animeöner", "anime"],
  usage: "animeoner",
  description: "Size yeni bir anime önerir ve açıklamasını verir.",
  category: "Eğlence",
  cooldown: 10,
};

async function fetchAnimeFromOpenRouter(db, userId, OPENROUTER_API_KEY) {
  const previouslyRecommended =
    (await db.get(`animeRecommended_${userId}`)) || [];

  const messages = [
    {
      role: "system",
      content: `Daha önce önerdiğin animeler: ${
        previouslyRecommended.join(", ") || "Yok"
      }. Bunlar dışında yeni bir anime öner ve kısa bir açıklama yap sadece "Anime Adı: Açıklama" formatında yanıtla.`,
    },
  ];

  const payload = {
    model: "z-ai/glm-4.5-air:free",
    messages,
    max_tokens: 4000,
    temperature: 0.7,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`İstek başarısız oldu: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  // OpenRouter dönüşünün hem message.content hem text olabilen yapısını destekle
  const choice = data.choices?.[0];
  const raw = choice?.message?.content ?? choice?.text;
  const content = raw?.trim();
  if (!content) {
    console.error("OpenRouter response:", JSON.stringify(data, null, 2));
    throw new Error("Geçerli bir içerik gelmedi.");
  }

  const splitIndex = content.indexOf(":");
  if (splitIndex === -1) {
    return { name: "Bilinmeyen Anime", description: content };
  }

  const name = content.slice(0, splitIndex).trim();
  const description = content.slice(splitIndex + 1).trim();
  return { name, description };
}

exports.execute = async (client, message, args) => {
  try {
    const db = client.db;
    const userId = message.author.id;
    const OPENROUTER_API_KEY = client.config.OPENROUTER_API_KEY;

    const previouslyRecommended =
      (await db.get(`animeRecommended_${userId}`)) || [];
    const anime = await fetchAnimeFromOpenRouter(
      db,
      userId,
      OPENROUTER_API_KEY
    );

    if (previouslyRecommended.includes(anime.name)) {
      return message.reply(
        `❌ ${anime.name} zaten önerilmişti. Lütfen tekrar dene.`
      );
    }

    previouslyRecommended.push(anime.name);
    await db.set(`animeRecommended_${userId}`, previouslyRecommended);

    const { MessageEmbed } = require("discord.js");
    const embed = new MessageEmbed()
      .setTitle(`🎬 Anime Önerisi: ${anime.name}`)
      .setDescription(anime.description)
      .setColor("#00FFAA")
      .setFooter({ text: `${client.user.username} Anime Önerici` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    return message.reply(
      "❌ Anime önerisi alınırken bir hata oluştu, lütfen tekrar deneyiniz."
    );
  }
};
