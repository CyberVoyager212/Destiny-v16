// commands/komik.js
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fetch = require("node-fetch");
const translate = require("translate-google");

exports.help = {
  name: "komik",
  aliases: ["caps", "guldur", "mizah"],
  usage: "komik",
  description:
    "Rastgele bir meme gönderir ve isteğe bağlı görüntüyü yapay zekaya açıklatır, ardından metni Türkçeye çevirir.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    // Meme API'den rastgele meme al
    const res = await fetch("https://meme-api.com/gimme");
    const meme = await res.json();

    if (!meme || !meme.url) {
      return message.channel.send(
        "❌ **Meme bulunamadı! Lütfen tekrar deneyin.**"
      );
    }

    // Embed oluştur
    const embed = new MessageEmbed()
      .setTitle(meme.title || "Meme")
      .setURL(meme.postLink || "")
      .setColor("RANDOM")
      .setImage(meme.url)
      .setFooter({ text: `👍 ${meme.ups || 0} || 💬 ${meme.comment || 0}` });

    // Açıkla butonu
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("explain_image")
        .setLabel("Açıkla ve Çevir")
        .setStyle("PRIMARY")
    );

    // Mesajı gönder
    const sentMessage = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    // Collector: buton tıklamasını dinle
    const filter = (interaction) =>
      interaction.customId === "explain_image" &&
      interaction.user.id === message.author.id;
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 60_000,
      max: 1,
    });

    collector.on("collect", async (interaction) => {
      await interaction.deferReply({ ephemeral: true });
      try {
        // OpenRouter API çağrısı
        const payload = {
          model: "google/gemini-2.5-flash-image-preview:free",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Bu instagram gönderisini anlamadım olay ne",
                },
                { type: "image_url", image_url: { url: meme.url } },
              ],
            },
          ],
        };
        const aiRes = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${client.config.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify(payload),
          }
        );
        const aiData = await aiRes.json();
        const choice = aiData.choices?.[0];
        const raw = choice?.message?.content ?? choice?.text;
        const explanation = raw?.trim() || "Açıklama alınamadı.";
        // Türkçeye çevir
        const translated = await translate(explanation, { to: "tr" });

        // Kullanıcıya dön
        await interaction.editReply({ content: translated });
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: "❌ Açıklama veya çeviri sırasında bir hata oluştu.",
        });
      }
    });

    collector.on("end", (collected) => {
      // Zaman dolunca butonu disable et
      const disabledRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("explain_image")
          .setLabel("Açıkla ve Çevir")
          .setStyle("PRIMARY")
          .setDisabled(true)
      );
      sentMessage.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error("Meme alma hatası:", error);
    return message.channel.send(
      "❌ **Bir hata oluştu, lütfen daha sonra tekrar deneyin.**"
    );
  }
};
