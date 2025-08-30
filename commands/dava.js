const axios = require("axios");
const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

exports.help = {
  name: "dava",
  description:
    "Dedektiflik oyununu başlatır ve bir davayı çözüme kavuşturmanı ister.",
  usage: "dava başlat",
  category: "Eğlence",
  cooldown: 1, // saniye cinsinden cooldown süresi
};

// OpenRouter ayarları
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Hızlı model: gerektiğinde burayı değiştir (örnek: "z-ai/glm-4.5-air:free")
const MODEL = "z-ai/glm-4.5-air:free";

async function callAI(API_KEY, prompt, maxTokens = 1500, temperature = 0.8) {
  try {
    const res = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 20000, // 20s timeout, istenirse ayarlanabilir
      }
    );

    // OpenRouter benzeri cevap formatlarını kontrol et
    const data = res.data;
    // Yaygın yapı: data.choices[0].message.content
    const content =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      null;

    return (content || "Yanıt alınamadı.").trim();
  } catch (err) {
    console.error("OpenRouter call error:", err?.response?.data || err.message);
    return "AI servisine bağlanırken bir hata oluştu.";
  }
}

async function getCaseSummary(API_KEY) {
  const prompt = `Bir şehir merkezinde işlenen davayı detaylıca anlat. Mağdur: zengin iş insanı. Şüpheliler: üç farklı profil. Olay yeri, zaman ve genel tema hakkında üç kısa paragraf yaz. Her paragraf açık, merak uyandırıcı olsun.`;
  return callAI(API_KEY, prompt, 1200, 0.7);
}

async function getSuspectInterrogation(API_KEY, suspect) {
  const prompt = `Şüpheli ${suspect} ile yapılan sorgu tutanağı hazırla. Diyaloğu 3-4 kısa cümle halinde yaz ve her cümleden bir ipucu çıkar. Sonuçta 3 adet net ipucu madde listesi olarak belirt.`;
  return callAI(API_KEY, prompt, 1000, 0.8);
}

async function getCrimeSceneReport(API_KEY) {
  const prompt = `Cinayet mahallindeki kritik unsurları açıkla. En az 5 farklı detay (nesne, leke, iz) listele ve her biri için 1-2 cümle kısa açıklama ekle.`;
  return callAI(API_KEY, prompt, 1000, 0.8);
}

exports.execute = async (client, message, args) => {
  const COOLDOWN = exports.help.cooldown * 1000;
  const userKey = `game_${message.author.id}`;
  const now = Date.now();
  const last = (await db.get(`${userKey}.last`)) || 0;
  if (now - last < COOLDOWN) {
    const remaining = Math.ceil((COOLDOWN - (now - last)) / 1000);
    return message.reply(
      `⏳ Lütfen bekleyin, ${remaining} saniye sonra tekrar başlayabilirsiniz.`
    );
  }
  await db.set(`${userKey}.last`, now);

  if (!args[0] || args[0].toLowerCase() !== "başlat") {
    return message.reply("🔍 Dava oyununu başlatmak için `dava başlat` yaz.");
  }

  const API_KEY = client.config?.OPENROUTER_API_KEY;
  if (!API_KEY)
    return message.reply("⚠️ OpenRouter API anahtarı ayarlı değil.");

  await db.set(`${userKey}.clues`, []);
  await db.set(`${userKey}.queries`, 0);
  await db.set(`${userKey}.score`, 0);

  // Rastgele suçlu belirle
  const suspects = ["A", "B", "C"];
  const correct = suspects[Math.floor(Math.random() * suspects.length)];
  await db.set(`${userKey}.correct`, correct);

  // Davayı al
  const summary = await getCaseSummary(API_KEY);
  const embed = new MessageEmbed()
    .setTitle("🕵️‍♂️ Dosya Özeti")
    .setDescription(summary)
    .setColor("#2F3136")
    .setTimestamp();

  const row1 = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("suspect_A")
      .setLabel("Şüpheli A")
      .setStyle("SECONDARY"),
    new MessageButton()
      .setCustomId("suspect_B")
      .setLabel("Şüpheli B")
      .setStyle("SECONDARY"),
    new MessageButton()
      .setCustomId("suspect_C")
      .setLabel("Şüpheli C")
      .setStyle("SECONDARY"),
    new MessageButton()
      .setCustomId("investigate_scene")
      .setLabel("Olay Yerini İncele")
      .setStyle("SECONDARY")
  );
  const row2 = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("accuse")
      .setPlaceholder("Suçluyu Tahmin Et")
      .addOptions([
        { label: "Şüpheli A", value: "A" },
        { label: "Şüpheli B", value: "B" },
        { label: "Şüpheli C", value: "C" },
      ])
  );

  const sent = await message.channel.send({
    embeds: [embed],
    components: [row1, row2],
  });

  const filter = (i) => i.user.id === message.author.id;
  const collector = sent.createMessageComponentCollector({
    filter,
    time: 300000, // 5 dakika
  });

  collector.on("collect", async (interaction) => {
    // Seçim menüsü (suçlama)
    if (interaction.isSelectMenu() && interaction.customId === "accuse") {
      await interaction.deferReply({ ephemeral: true });
      const choice = interaction.values[0];
      const correctSuspect = await db.get(`${userKey}.correct`);
      let scoreChange = 0;
      let resultEmbed;
      if (choice === correctSuspect) {
        scoreChange = 10;
        resultEmbed = new MessageEmbed()
          .setTitle("✅ Doğru Tahmin!")
          .setDescription(`Tebrikler! Şüpheli ${choice} suçlu çıktı.`)
          .setColor("GREEN");
      } else {
        scoreChange = -5;
        resultEmbed = new MessageEmbed()
          .setTitle("❌ Yanlış Tahmin!")
          .setDescription(
            `Maalesef, gerçek suçlu Şüpheli ${correctSuspect} idi.`
          )
          .setColor("RED");
      }
      await db.add(`${userKey}.score`, scoreChange);
      return interaction.editReply({ embeds: [resultEmbed] });
    }

    // Diğer butonlar için defer
    await interaction.deferReply({ ephemeral: true });

    // Şüpheli sorgulama
    if (interaction.customId && interaction.customId.startsWith("suspect_")) {
      let count = (await db.get(`${userKey}.queries`)) || 0;
      if (count >= 3)
        return interaction.editReply("❌ Bu şüpheli için sorgu hakkın doldu.");
      await db.add(`${userKey}.queries`, 1);
      const suspect = interaction.customId.split("_")[1];
      const result = await getSuspectInterrogation(API_KEY, suspect);
      await db.push(`${userKey}.clues`, `Şüpheli ${suspect}: ${result}`);
      const embed2 = new MessageEmbed()
        .setTitle(`🔍 ${suspect} İfadesi`)
        .setDescription(result)
        .setColor("#FFA500");
      return interaction.editReply({ embeds: [embed2] });
    }

    // Olay yeri inceleme
    if (interaction.customId === "investigate_scene") {
      const report = await getCrimeSceneReport(API_KEY);
      await db.push(`${userKey}.clues`, `Olay Yeri: ${report}`);
      const embed3 = new MessageEmbed()
        .setTitle("🗺️ Olay Yeri İncelemesi")
        .setDescription(report)
        .setColor("#00BFFF");
      return interaction.editReply({ embeds: [embed3] });
    }

    // Bilinmeyen customId
    return interaction.editReply("Bilinmeyen işlem.");
  });

  collector.on("end", async () => {
    // İsteğe bağlı: interaktif süre bittikten sonra butonları devre dışı bırak
    try {
      const disabledRow1 = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("suspect_A")
          .setLabel("Şüpheli A")
          .setStyle("SECONDARY")
          .setDisabled(true),
        new MessageButton()
          .setCustomId("suspect_B")
          .setLabel("Şüpheli B")
          .setStyle("SECONDARY")
          .setDisabled(true),
        new MessageButton()
          .setCustomId("suspect_C")
          .setLabel("Şüpheli C")
          .setStyle("SECONDARY")
          .setDisabled(true),
        new MessageButton()
          .setCustomId("investigate_scene")
          .setLabel("Olay Yerini İncele")
          .setStyle("SECONDARY")
          .setDisabled(true)
      );
      const disabledRow2 = new MessageActionRow().addComponents(
        new MessageSelectMenu()
          .setCustomId("accuse")
          .setPlaceholder("Suçluyu Tahmin Et")
          .addOptions([
            { label: "Şüpheli A", value: "A" },
            { label: "Şüpheli B", value: "B" },
            { label: "Şüpheli C", value: "C" },
          ])
          .setDisabled(true)
      );
      await sent.edit({ components: [disabledRow1, disabledRow2] });
    } catch (e) {
      // ignore
    }
  });
};
