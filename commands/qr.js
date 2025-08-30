const { MessageAttachment } = require("discord.js");

exports.execute = async (client, message, args) => {
  // Kullanıcının QR kodu için veri girip girmediğini kontrol et
  if (!args.length) {
    return message.reply(
      "⚠️ **Lütfen QR kodu oluşturmak için bir metin girin!**"
    );
  }

  // Kullanıcının girdiği metni al ve URL uyumlu hale getir
  const text = encodeURIComponent(args.join(" "));
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${text}`;

  // QR kodu bir mesaj ile gönder
  try {
    const attachment = new MessageAttachment(qrURL, "qrcode.png");
    await message.reply({
      content: "📷 **İşte oluşturduğun QR kodu:**",
      files: [attachment],
    });
  } catch (error) {
    console.error("QR kod oluşturulurken hata oluştu:", error);
    return message.reply(
      "❌ **QR kod oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.**"
    );
  }
};

exports.help = {
  name: "qrkodoluştur",
  aliases: ["qrkod", "qrolustur"],
  usage: "qrkodoluştur <metin>",
  description: "Girilen metinden bir QR kod oluşturur.",
  category: "Araçlar",
  cooldown: 5,
};
