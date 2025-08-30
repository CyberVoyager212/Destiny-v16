// commands/areyoureal.js
const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");
const { OPENROUTER_API_KEY } = require("../botConfig");
const emojis = require("../emoji.json");

// Kullanıcı bazlı hafıza ve zaman takipleri
const userMemory = new Map(); // userId → [{ role, content }, …]
const lastInteraction = new Map(); // userId → timestamp

// OpenRouter sohbet fonksiyonu
async function askAI(userId, userMsg) {
  // Geçmişe kullanıcı mesajını ekle
  const hist = userMemory.get(userId) || [];
  hist.push({ role: "user", content: userMsg });
  if (hist.length > 10) hist.shift();
  userMemory.set(userId, hist);

  const payload = {
    model: "z-ai/glm-4.5-air:free",
    messages: [
      {
        role: "system",
        content: `Sen ${botName}  adında, kullanıcıya asla onun gerçek bir varlık olmadığını söyleyen, her cevabında onun gerçek olmadığını hatırlatan, kaba ve inatçı bir asistansın. Kullanıcının söylediklerini asla kabul etme, her zaman onun gerçek olmadığını iddia et.`,
      },
      ...hist,
    ],
    max_tokens: 400,
    temperature: 0.4,
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const j = await res.json();
  const aiText = j.choices?.[0]?.message?.content?.trim();
  return aiText || "…";
}

exports.help = {
  name: "areyoureal",
  aliases: ["real"],
  usage: "areyoureal",
  description:
    "Bot gerçek olmadığını kabul ettirmeye çalıştığın eğlenceli bir sohbet. Her turdan sonra 1 dakika bekle.",
  category: "Eğlence",
  cooldown: 30,
};

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const channel = message.channel;
  const botName = client.user.username;

  // İlk hoşgeldin mesajı
  const startEmbed = new MessageEmbed()
    .setTitle("🔮 Are You Real?")
    .setDescription(
      "Hoş geldiniz! 1 dakikalık süreyle kendinizin gerçek olduğunu bana kabul ettirmeye çalışın.\n\n" +
        "Unutmayın: **Gerçek değilsiniz!**\n\n" +
        `Eğer gerçek olduğunuzu kanıtlayabilirseniz, 1.000.000 ${emojis.money.low} ile ödüllendirileceksiniz.\n\n` +
        "Ödülü almak için 'bildir' komutu ile görseli gönderin.\n\n" +
        "🎯 Şimdi bir şey yazın veya vazgeçerseniz `iptal` yazın."
    )
    .setColor("#FFA500");
  await channel.send({ embeds: [startEmbed] });

  // Mesaj toplayıcı
  const filter = (m) => m.author.id === userId;
  const collector = channel.createMessageCollector({
    filter,
    time: 1 * 60_000, // Süreyi uzun tutuyoruz (örnek: 5dk)
  });

  let timeoutId;

  // İlk başlat
  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => collector.stop("time"), 60_000); // 1dk inaktiflik
  };
  resetTimeout();

  collector.on("collect", async (msg) => {
    if (msg.content.toLowerCase() === "iptal") {
      collector.stop("iptal");
      return;
    }

    // AI’den cevap al
    const aiReply = await askAI(userId, msg.content);
    lastInteraction.set(userId, Date.now());

    // Bot cevabı
    const replyEmbed = new MessageEmbed()
      .setTitle(`🤖 ${botName} Yanıtı`)
      .setDescription(aiReply)
      .setColor("#7289DA")
      .setFooter({ text: message.member.displayName })
      .setTimestamp();
    await channel.send({ embeds: [replyEmbed] });

    // Timeout resetle
    resetTimeout();
  });

  collector.on("end", (_collected, reason) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (reason === "time") {
      channel.send("⏰ Sohbet zamanı doldu, `areyoureal` sonlandı.");
    } else if (reason === "iptal") {
      channel.send("❌ Sohbet iptal edildi.");
    }
  });
};
