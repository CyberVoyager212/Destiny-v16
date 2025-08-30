const { MessageEmbed, MessageCollector } = require("discord.js");

exports.help = {
  name: "sil",
  aliases: ["temizle", "purge"],
  usage: "sil <miktar>",
  description:
    "Belirtilen sayıda mesajı toplu olarak siler. 14 günden eski mesajlar topluca silinemez, istenirse tek tek silinebilir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_MESSAGES"))
    return message.reply(
      "Bu komutu kullanmak için Mesajları Yönet iznine sahip olmalısın."
    );

  const amount = parseInt(args[0]);
  if (!amount || amount < 1 || amount > 100)
    return message.reply("Lütfen 1 ile 100 arasında bir sayı giriniz.");

  // Silinecek mesajları al (max 100)
  const fetched = await message.channel.messages.fetch({ limit: amount });

  // 14 günden eski mesajları filtrele
  const now = Date.now();
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const bulkDeletable = fetched.filter(
    (msg) => now - msg.createdTimestamp < twoWeeks
  );
  const oldMessages = fetched.filter(
    (msg) => now - msg.createdTimestamp >= twoWeeks
  );

  // Önce siliniyor mesajı
  const infoMsg = await message.channel.send(`${amount} mesaj siliniyor...`);

  // Toplu sil
  let bulkDeletedCount = 0;
  try {
    const deleted = await message.channel.bulkDelete(bulkDeletable, true);
    bulkDeletedCount = deleted.size;
  } catch {
    // Hata varsa yut
  }

  if (oldMessages.size === 0) {
    // Tüm mesajlar topluca silindi
    await infoMsg.edit(`${bulkDeletedCount} mesaj toplu olarak silindi.`);

    // 2 saniye sonra hem info hem komut mesajı silinsin
    setTimeout(async () => {
      try {
        await infoMsg.delete();
        await message.delete();
      } catch {}
    }, 2000);
    return;
  }

  // Eğer topluca silinemeyen mesaj varsa onay iste
  await infoMsg.edit(
    `${bulkDeletedCount} mesaj toplu olarak silindi fakat geriye kalan ${oldMessages.size} mesaj 14 günden eski olduğu için topluca silinemiyor.\n` +
      "Tek tek silmek istersen `onaylıyorum` yaz, istemiyorsan `onaylamıyorum` yaz."
  );

  // Onay bekle
  const filter = (m) =>
    m.author.id === message.author.id &&
    ["onaylıyorum", "onaylamıyorum"].includes(m.content.toLowerCase());

  const collector = new MessageCollector(message.channel, {
    filter,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (m) => {
    if (m.content.toLowerCase() === "onaylıyorum") {
      await m.delete().catch(() => {});
      await infoMsg.edit(`${oldMessages.size} mesaj tek tek siliniyor...`);

      let deletedCount = 0;
      for (const msg of oldMessages.values()) {
        try {
          await msg.delete();
          deletedCount++;
          // İstersen araya delay koyabilirsin (ör: await new Promise(r => setTimeout(r, 100));)
        } catch {}
      }

      // Süre hesaplama için eski mesajlardan en yenisini alalım
      const latestTimestamp = oldMessages.reduce(
        (max, msg) => Math.max(max, msg.createdTimestamp),
        0
      );
      const diffMs = now - latestTimestamp;

      // Gün/saat/dakika/saniye hesapla
      const diffTime = (ms) => {
        let remaining = ms;
        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        remaining %= 24 * 60 * 60 * 1000;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        remaining %= 60 * 60 * 1000;
        const minutes = Math.floor(remaining / (60 * 1000));
        remaining %= 60 * 1000;
        const seconds = Math.floor(remaining / 1000);
        remaining %= 1000;
        const msLeft = remaining;

        if (days > 0) return `${days} gün`;
        if (hours > 0) return `${hours} saat`;
        if (minutes > 0) return `${minutes} dakika`;
        if (seconds > 0) return `${seconds} saniye`;
        return `${msLeft} milisaniye`;
      };

      await infoMsg.edit(
        `${deletedCount} mesaj tek tek silindi. (En yeni mesaj ${diffTime(
          diffMs
        )} önce gönderilmişti.)`
      );

      setTimeout(async () => {
        try {
          await infoMsg.delete();
          await message.delete();
        } catch {}
      }, 4000);
    } else {
      await infoMsg.edit("İşlem iptal edildi.");
      setTimeout(async () => {
        try {
          await infoMsg.delete();
          await message.delete();
          await m.delete();
        } catch {}
      }, 2000);
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0) {
      infoMsg.edit("Zaman doldu, işlem iptal edildi.").catch(() => {});
      setTimeout(async () => {
        try {
          await infoMsg.delete();
          await message.delete();
        } catch {}
      }, 2000);
    }
  });
};
