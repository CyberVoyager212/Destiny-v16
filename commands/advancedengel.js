// commands/advencedengel.js
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { MessageEmbed } = require("discord.js");
const config = require("../botConfig.js");
const prefix = config.prefix || "!";

exports.execute = async (client, message, args) => {
  try {
    // Yetki kontrolü
    if (!message.member.permissions.has("MANAGE_MESSAGES")) {
      return message.channel.send(
        "❌ Bu komutu kullanmak için `Mesajları Yönet` yetkisine sahip olmalısın."
      );
    }

    const sub = (args[0] || "").toLowerCase();
    const guildId = message.guild.id;

    if (!sub) {
      const embed = new MessageEmbed()
        .setTitle("⚙️ Advanced Engel Sistemi")
        .setColor("YELLOW")
        .setDescription(
          `Kullanım:\n` +
            `\`${prefix}advencedengel kur <kelime veya ifade>\`\n` +
            `\`${prefix}advencedengel sil <kelime veya ifade>\`\n` +
            `\`${prefix}advencedengel liste\`\n\n` +
            `Not: Kelimeler veritabanına küçük harfli olarak kaydedilir, arama büyük/küçük harf duyarlı değildir.`
        );
      return message.channel.send({ embeds: [embed] });
    }

    // --- KUR ---
    if (sub === "kur") {
      const raw = args.slice(1).join(" ").trim();
      if (!raw)
        return message.channel.send(
          "❌ Lütfen engellenecek bir kelime veya ifade gir."
        );

      const word = raw.toLowerCase();

      // Basit sanitizasyon: baş/son boşlukları temizledik. (Regex özel karakterlerine dokunmuyoruz; regex kullanırken dikkat)
      if (word.length > 200)
        return message.channel.send(
          "❌ Kelime/ifadeyi 200 karakterle sınırlı tutun."
        );

      let words = (await db.get(`engelKelime_${guildId}`)) || [];
      if (!Array.isArray(words)) words = [];

      if (words.includes(word)) {
        return message.channel.send(`❌ **${raw}** zaten engellenmiş.`);
      }

      words.push(word);
      await db.set(`engelKelime_${guildId}`, words);

      const embed = new MessageEmbed()
        .setTitle("✅ Kelime Engellendi")
        .setColor("GREEN")
        .setDescription(
          `**${raw}** adlı kelime/ifadeyi engel listesine ekledim.`
        )
        .addField("Toplam engellenen kelime", `${words.length}`, true);

      return message.channel.send({ embeds: [embed] });
    }

    // --- SIL ---
    if (sub === "sil") {
      const raw = args.slice(1).join(" ").trim();
      if (!raw)
        return message.channel.send("❌ Silmek istediğin kelimeyi gir.");

      const word = raw.toLowerCase();
      let words = (await db.get(`engelKelime_${guildId}`)) || [];
      if (!Array.isArray(words)) words = [];

      if (!words.includes(word)) {
        return message.channel.send(
          `❌ **${raw}** engel listesinde bulunamadı.`
        );
      }

      words = words.filter((w) => w !== word);
      await db.set(`engelKelime_${guildId}`, words);

      const embed = new MessageEmbed()
        .setTitle("🗑️ Kelime Silindi")
        .setColor("RED")
        .setDescription(`**${raw}** engel listesinden başarıyla kaldırıldı.`)
        .addField("Kalan engellenen kelime", `${words.length}`, true);

      return message.channel.send({ embeds: [embed] });
    }

    // --- LISTE ---
    if (sub === "liste") {
      const words = (await db.get(`engelKelime_${guildId}`)) || [];
      if (!Array.isArray(words) || words.length === 0) {
        return message.channel.send(
          "ℹ️ Bu sunucuda engellenmiş kelime/ifade yok."
        );
      }

      // Eğer çok uzunsa bölümlere ayır
      const perPage = 25;
      const pages = [];
      for (let i = 0; i < words.length; i += perPage) {
        const chunk = words.slice(i, i + perPage);
        const desc = chunk
          .map((w, idx) => `**${i + idx + 1}.** ${w}`)
          .join("\n");
        pages.push(desc);
      }

      // Tek embed ile ilk sayfayı gönder (basit ve yeterli)
      const embed = new MessageEmbed()
        .setTitle("📋 Engellenen Kelimeler")
        .setColor("ORANGE")
        .setDescription(pages[0])
        .setFooter({ text: `Toplam: ${words.length}` });

      // Eğer birden fazla sayfa varsa kullanıcıya uyar (isteğe bağlı sayfalama eklenebilir)
      if (pages.length > 1) {
        embed.addField(
          "Not",
          `Liste ${pages.length} sayfa içeriyor. Gerekirse sayfalama ekleyebilirim.`
        );
      }

      return message.channel.send({ embeds: [embed] });
    }

    // bilinmeyen alt komut
    return message.channel.send(
      `❌ Geçersiz alt komut. Kullanım: \`${prefix}advencedengel kur/sil/liste <kelime>\``
    );
  } catch (err) {
    console.error("advencedengel hata:", err);
    // Hata mesajı gönderirken message_reference kullanılmaması için message.channel.send kullanıyoruz
    return message.channel.send("❌ Komut çalıştırılırken bir hata oluştu.");
  }
};

exports.help = {
  name: "advencedengel",
  aliases: ["engelsistemi"],
  usage: "advencedengel kur/sil/liste <kelime veya ifade>",
  description: "Gelişmiş kelime engel sistemi (kur/sil/liste)",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};
