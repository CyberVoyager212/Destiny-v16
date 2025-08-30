const { Message } = require("discord.js");
const botConfig = require("../botConfig"); // admin list vs. diğer ayarlar burada

/**
 * /konuş @kullanıcı mesaj
 * Bu komut belirtilen kullanıcı adına (sunucu takma adı varsa takma ad, yoksa kullanıcı adı) webhook ile mesaj gönderir.
 */
exports.execute = async (client, message, args) => {
  try {
    // Yetki kontrolü (botConfig.admins bir dizi olmalı)
    if (
      !Array.isArray(botConfig.admins) ||
      !botConfig.admins.includes(message.author.id)
    ) {
      return message.reply("🚫 | Bu komutu kullanmak için yetkiniz yok.");
    }

    // Hedef kullanıcıyı al (GuildMember olmalı)
    const targetUser = message.mentions.members
      ? message.mentions.members.first()
      : null;
    if (!targetUser) {
      return message.reply(
        "❌ | Lütfen taklit edilecek kullanıcıyı etiketleyin."
      );
    }

    // Mesaj içeriğini al
    const text = args.slice(1).join(" ").trim();
    if (!text) {
      return message.reply("⚠️ | Lütfen gönderilecek mesajı yazın.");
    }

    // Komutu çağıran mesajı silmeye çalış (hata olursa yoksay)
    try {
      await message.delete();
    } catch (err) {
      console.warn("❗ | Mesaj silinemedi veya izin yok:", err.message || err);
    }

    // Kanalda mevcut webhook'ları al
    const webhooks = await message.channel.fetchWebhooks();
    // İstenilen isimle bir webhook arıyoruz. İsterseniz ismi değiştirin veya kanal başına bir tane tutun.
    let webhook = webhooks.find((wh) => wh.name === "Webhook");

    // Yoksa oluşturalım (botun Manage Webhooks izni olmalı)
    if (!webhook) {
      webhook = await message.channel.createWebhook("Webhook", {
        avatar: client.user.displayAvatarURL(),
      });
    }

    // Kullanıcının sunucu içindeki takma adı varsa onu, yoksa normal kullanıcı adını al
    const displayName = targetUser.displayName || targetUser.user.username;

    // Gönderim seçenekleri
    const options = {
      content: text,
      username: displayName,
      avatarURL: targetUser.user.displayAvatarURL({ dynamic: true }),
      // allowedMentions: { parse: [] } // istersen mention engellemek için aç
    };

    // Eğer orijinal mesaj bir mesaja referans (reply) ise, mümkünse referans bilgisi ekle
    // Not: Webhook üzerinden tam "reply" davranışı her zaman birebir çalışmayabilir; sunucu ve discord API sürümüne bağlıdır.
    if (message.reference && message.reference.messageId) {
      // Bazı discord.js sürümlerinde doğrudan messageReference kullanmak gerekebilir;
      // burada basit bir şekilde ekliyoruz — eğer hata verirse bu satırı çıkarabilirsiniz.
      options.messageReference = message.reference.messageId;
    }

    // Webhook ile gönder
    await webhook.send(options);
  } catch (error) {
    console.error("⚠️ | Komut çalıştırılırken bir hata oluştu:", error);
    return message.reply(
      "❌ | Komut çalıştırılırken bir hata oluştu, lütfen tekrar deneyin."
    );
  }
};

exports.help = {
  name: "konuş",
  aliases: ["konustur"],
  usage: "konuş @kullanıcı mesaj",
  description:
    "Belirtilen kullanıcı adına mesaj gönderir (sunucudaki takma ad kullanılacak).",
  category: "Moderasyon",
  cooldown: 5,
  admin: true,
};
