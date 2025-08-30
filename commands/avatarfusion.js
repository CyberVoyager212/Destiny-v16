const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");

module.exports.help = {
  name: "avatarfusion",
  aliases: ["afusion", "fusion"],
  description: "İki kullanıcının avatarlarını birleştirir.",
  usage: "avatarfusion [@kullanıcı1] [@kullanıcı2]",
  category: "Eğlence",
  cooldown: 5,
  permissions: ["ATTACH_FILES"],
};

module.exports.execute = async (client, message, args) => {
  if (!message.guild.members.me.permissions.has("ATTACH_FILES")) {
    return message.reply(
      "❌ Bu komut için **`ATTACH_FILES`** yetkisine ihtiyacım var."
    );
  }

  if (!args[0] || !args[1]) {
    return message.reply(
      "⚠️ Lütfen birbirinden farklı iki kullanıcıyı etiketleyin veya ID girin!"
    );
  }

  const member1 =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]);
  // mentions.members.at(1) alternatif olmadığı için args[1] ile alalım
  const member2 =
    message.mentions.members.size > 1
      ? message.mentions.members.map((m) => m)[1]
      : message.guild.members.cache.get(args[1]);

  if (!member1 || !member2) {
    return message.reply("⚠️ Geçerli iki kullanıcı bulunamadı.");
  }

  try {
    // Canvas boyutları
    const width = 512;
    const height = 512;

    // Yeni canvas oluştur
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Avatarları yükle
    const avatar1 = await Canvas.loadImage(
      member1.user.displayAvatarURL({ format: "png", size: 512 })
    );
    const avatar2 = await Canvas.loadImage(
      member2.user.displayAvatarURL({ format: "png", size: 512 })
    );

    // İlk avatarı çiz (arka plan)
    ctx.drawImage(avatar1, 0, 0, width, height);

    // İkinci avatarı yarı saydam olarak çiz (üzerinde)
    ctx.globalAlpha = 0.5; // %50 şeffaflık
    ctx.drawImage(avatar2, 0, 0, width, height);
    ctx.globalAlpha = 1; // alpha'yı resetle

    // Oluşan resmi buffer olarak al
    const attachment = new MessageAttachment(
      canvas.toBuffer(),
      "avatarfusion.png"
    );

    // Gönder
    return message.channel.send({
      content: `🖼️ **${member1.user.username} + ${member2.user.username} Avatar Füzyonu:**`,
      files: [attachment],
    });
  } catch (error) {
    console.error("Avatar Fusion Hatası:", error);
    return message.reply(
      "❌ Avatarları birleştirirken bir hata oluştu, lütfen tekrar deneyin."
    );
  }
};
