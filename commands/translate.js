const translate = require("translate-google");
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "translate",
  aliases: ["çeviri", "tercüme", "tr"],
  usage: "translate <hedef-dil-kodu> <metin> | translate help",
  description:
    "Metni istediğin dile çevirir veya `help` ile dil kodlarını gösterir.",
  category: "Araçlar",
  cooldown: 5,
};

const languageCodes = {
  EN: "İngilizce",
  TR: "Türkçe",
  DE: "Almanca",
  FR: "Fransızca",
  ES: "İspanyolca",
  IT: "İtalyanca",
  NL: "Flemenkçe",
  PL: "Lehçe",
  PT: "Portekizce",
  RU: "Rusça",
  JA: "Japonca",
  ZH: "Çince (Basitleştirilmiş)",
  ZH_TW: "Çince (Geleneksel)",
  KO: "Korece",
  AR: "Arapça",
  SV: "İsveççe",
  NO: "Norveççe",
  DA: "Danca",
  FI: "Fince",
  CS: "Çekçe",
};

exports.execute = async (client, message, args) => {
  // help listesi
  if (!args.length || args[0].toLowerCase() === "help") {
    const embed = new MessageEmbed()
      .setTitle("🌍 Desteklenen Dil Kodları")
      .setDescription(
        Object.entries(languageCodes)
          .map(([code, name]) => `\`${code}\` - ${name}`)
          .join("\n")
      )
      .setColor("#5865F2")
      .setFooter({ text: "Örnek kullanım: translate TR Merhaba dünya" })
      .setTimestamp();
    return message.channel.send({ embeds: [embed] });
  }

  const targetLang = args.shift().toLowerCase(); // translate-google küçük harf istiyor
  const text = args.join(" ");
  if (!languageCodes[targetLang.toUpperCase()]) {
    return message.reply(
      "Geçersiz dil kodu. Desteklenen kodlar için `translate help`."
    );
  }
  if (!text) return message.reply("Çevrilecek metni gir.");

  try {
    const res = await translate(text, { to: targetLang });
    // res doğrudan çeviri metni
    const embed = new MessageEmbed()
      .setTitle("🌐 Çeviri Sonucu")
      .addFields(
        { name: "📥 Orijinal", value: text },
        { name: "📤 Çevrilen", value: res },
        { name: "🌍 Dil", value: `${targetLang.toUpperCase()}` }
      )
      .setColor("#5865F2")
      .setFooter({ text: message.member.displayName })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply("⚠️ Çeviri yapılırken bir hata oluştu.");
  }
};
