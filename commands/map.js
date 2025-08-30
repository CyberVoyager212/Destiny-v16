const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");

exports.execute = async (client, message, args) => {
  const konum = args.join(" ");

  if (!konum) {
    return message.reply("❌ **Lütfen geçerli bir konum girin!**");
  }

  const site = `https://maps.google.com/?q=${encodeURIComponent(konum)}`;

  try {
    const msg = await message.channel.send({
      content: "⏳ **Lütfen bekleyin...** Bu işlem birkaç saniye sürebilir.",
    });

    // Google Maps ekran görüntüsünü çekme
    const res = await fetch(
      `https://image.thum.io/get/width/1920/crop/675/noanimate/${site}`
    );
    const buffer = await res.buffer();

    // Eğer API bir hata döndürdüyse
    if (!buffer || buffer.length < 100) {
      await msg.delete();
      return message.reply(
        "❌ **Görsel oluşturulamadı! Lütfen farklı bir konum deneyin.**"
      );
    }

    // Resim dosyası olarak ekle
    const attachment = new MessageAttachment(buffer, `${konum}.png`);

    await msg.delete(); // Bekleme mesajını sil
    return message.channel.send({ files: [attachment] });
  } catch (err) {
    console.error("Hata:", err);
    return message.reply(
      `❌ **Bir hata oluştu:** \`${err.message}\`. Lütfen daha sonra tekrar deneyin.`
    );
  }
};

exports.help = {
  name: "harita",
  aliases: ["map", "konum", "lokasyon"],
  usage: "harita <konum>",
  description: "Belirtilen konumun Google Maps görüntüsünü gönderir.",
  category: "Araçlar",
  cooldown: 5,
};
