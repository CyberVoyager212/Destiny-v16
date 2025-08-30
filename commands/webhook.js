const { WebhookClient } = require("discord.js");

exports.help = {
  name: "webhookat",
  aliases: ["whsend", "whisper"],
  usage: "webhookat <mesaj>",
  description: "Webhook oluşturup anonim olarak belirtilen mesajı gönderir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_WEBHOOKS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_WEBHOOKS"))
    return message.reply(
      "Bu komutu kullanmak için `Webhookları Yönet` yetkisine sahip olmalısın."
    );

  const content = args.join(" ");
  if (!content)
    return message.reply("Lütfen gönderilecek mesajı yaz: `webhookat <mesaj>`");

  // Komutu gizlemek için 0.5 saniye sonra sil
  setTimeout(() => {
    message.delete().catch(() => {});
  }, 500);

  try {
    // Kanalda önceden oluşturulmuş webhook var mı kontrol et
    const webhooks = await message.channel.fetchWebhooks();
    let webhook = webhooks.find((w) => w.name === "WebhookAtBot");

    if (!webhook) {
      webhook = await message.channel.createWebhook("WebhookAtBot", {
        avatar: "https://i.imgur.com/0TeacfY.png",
      });
    }

    // Webhook üzerinden mesaj gönder
    await webhook.send({
      content: content,
      username: "Void Whisperer",
      avatarURL: "https://i.imgur.com/0TeacfY.png",
    });
  } catch (err) {
    console.error(err);
    message.channel.send("Webhook mesajı gönderilirken bir hata oluştu.");
  }
};
