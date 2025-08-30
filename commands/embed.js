const { MessageEmbed, Permissions } = require("discord.js");

module.exports.execute = async (client, message, args) => {
  // Yetki kontrolü
  if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
    return message.reply(
      "🚫 Bu komutu kullanmak için **'Mesajları Yönet'** yetkiniz olmalı!"
    );
  }

  // Kanal etiketlendi mi?
  const channelMention = message.mentions.channels.first();
  if (!channelMention) {
    return message.reply(
      "ℹ️ **Lütfen embed mesajının gönderileceği kanalı etiketleyin!**"
    );
  }

  const filter = (m) => m.author.id === message.author.id;

  try {
    // Başlık al
    await message.channel.send(
      "📝 **Lütfen embed için bir başlık girin.** _(İptal etmek için `iptal` yazın)_"
    );
    const titleMsg = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ["time"],
    });
    const title = titleMsg.first().content;
    if (title.toLowerCase() === "iptal")
      return message.channel.send("❌ **İşlem iptal edildi.**");

    // Açıklama al
    await message.channel.send(
      "📖 **Şimdi açıklamayı girin.** _(İptal etmek için `iptal` yazın)_"
    );
    const descMsg = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ["time"],
    });
    const description = descMsg.first().content;
    if (description.toLowerCase() === "iptal")
      return message.channel.send("❌ **İşlem iptal edildi.**");

    // Renk oluştur
    const randomColor = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;

    // Embed oluştur
    const embed = new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setColor(randomColor)
      .setFooter({
        text: `Oluşturan: ${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Gönder
    await channelMention.send({ embeds: [embed] });
    await message.channel.send(
      `✅ **Embed başarıyla** ${channelMention} **kanalına gönderildi!**`
    );
  } catch (err) {
    console.error("Embed komutu hatası:", err);
    return message.reply(
      "❌ **Bir hata oluştu veya işlem zaman aşımına uğradı!** ⏳"
    );
  }
};

module.exports.help = {
  name: "embed",
  aliases: ["embedyap", "embedolustur"],
  usage: "embed #kanal",
  description: "Verilen kanalda bir embed mesajı oluşturur.",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};
