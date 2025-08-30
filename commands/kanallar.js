module.exports = {
  async execute(client, message, args) {
    try {
      // Yetki kontrolü (opsiyonel)
      if (!message.member.permissions.has("VIEW_CHANNEL")) {
        return message.reply(
          "❌ Bu komutu kullanmak için yeterli yetkiniz yok."
        );
      }

      // Sunucudaki tüm kanalları al
      const channels = message.guild.channels.cache
        .map(
          (channel) => `📌 ${channel.name} (${channel.id}) [${channel.type}]`
        )
        .join("\n");

      // Eğer karakter sınırını aşıyorsa bölerek gönder
      if (channels.length > 2000) {
        const chunks = channels.match(/[\s\S]{1,2000}/g); // 2000 karakterlik parçalar
        for (const chunk of chunks) {
          await message.channel.send(`📢 **Kanallar:**\n${chunk}`);
        }
      } else {
        message.channel.send(`📢 **Kanallar:**\n${channels}`);
      }
    } catch (error) {
      console.error(error);
      message.reply(
        "❌ Kanallar listelenirken bir hata oluştu. Lütfen tekrar deneyin."
      );
    }
  },

  help: {
    name: "kanallar",
    aliases: ["channels", "sunucu-kanallar"],
    usage: "kanallar",
    description: "Sunucudaki tüm kanalları listeler.",
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["VIEW_CHANNEL"],
  },
};
