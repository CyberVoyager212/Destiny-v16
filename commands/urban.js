const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const translate = require("translate-google");

exports.execute = async (client, message, args) => {
  let query = args.join(" ");

  if (!query) {
    return message.reply("❌ **Lütfen aramak istediğiniz kelimeyi girin!**");
  }

  // Sorgu için çeviri (Türkçe → İngilizce)
  let translatedQuery;
  try {
    translatedQuery = await translate(query, { from: "tr", to: "en" });
  } catch (err) {
    console.error("Çeviri hatası:", err);
    return message.reply("❌ **Kelime çevrilemedi, lütfen tekrar deneyin.**");
  }

  try {
    const { data } = await axios.get(
      `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(
        translatedQuery
      )}`
    );

    if (!data.list.length) {
      return message.reply(
        "❌ **Bu kelime için herhangi bir tanım bulunamadı!**"
      );
    }

    const answer = data.list[0];

    // Tanım ve örnek Türkçeye çevriliyor
    let definitionTr = answer.definition;
    let exampleTr = answer.example;

    try {
      definitionTr = await translate(definitionTr, { from: "en", to: "tr" });
    } catch (e) {
      console.warn("Tanım çevirisi başarısız:", e);
    }

    try {
      exampleTr = await translate(exampleTr, { from: "en", to: "tr" });
    } catch (e) {
      console.warn("Örnek çevirisi başarısız:", e);
    }

    const embed = new MessageEmbed()
      .setTitle(query) // burada çeviri yapılmadı, orijinal sorgu yazıyor
      .setURL(answer.permalink)
      .setColor("RANDOM")
      .addFields(
        { name: "📖 Tanım (TR)", value: trim(definitionTr) },
        { name: "✍️ Örnek (TR)", value: trim(exampleTr) },
        {
          name: "👍 Beğeniler",
          value: `👍 ${answer.thumbs_up} || 👎 ${answer.thumbs_down}`,
        }
      );

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Urban Dictionary Hata:", error);
    return message.reply(
      "❌ **Bir hata oluştu, lütfen daha sonra tekrar deneyin.**"
    );
  }
};

// Metin uzunluğunu sınırlar
function trim(input) {
  return input.length > 1024 ? `${input.slice(0, 1020)} ...` : input;
}

exports.help = {
  name: "urban",
  aliases: ["ud", "kelime"],
  usage: "urban <kelime>",
  description:
    "Urban Dictionary'den bir kelimenin tanımını getirir. Türkçe kelime yazabilirsiniz, anlamı ve örneği Türkçeye çevrilir.",
  category: "Eğlence",
  cooldown: 5,
};
