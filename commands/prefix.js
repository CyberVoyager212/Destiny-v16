// commands/prefix.js
exports.help = {
  name: "prefix",
  aliases: [],
  usage: "prefix <yeni prefix>",
  description: "Sunucu için prefix ayarlar veya mevcut prefixi gösterir.",
  category: "Araçlar",
  cooldown: 10,
  permissions: ["MANAGE_GUILD"],
};

exports.execute = async (client, message, args) => {
  // Yetki kontrolü
  if (!message.member.permissions.has("MANAGE_GUILD")) {
    return message.reply(
      "Bu komutu kullanmak için **Sunucuyu Yönet** yetkisine sahip olmalısın."
    );
  }

  const guildId = message.guild.id;
  const db = client.db;

  // DB'den mevcut prefix'i al (yoksa default)
  const currentPrefix =
    (await db.get(`prefix_${guildId}`)) || client.config.prefix;

  // Yeni prefix verilmemişse mevcut prefix'i göster
  const newPrefix = args[0];
  if (!newPrefix) {
    return message.reply(
      `Mevcut prefix: \`${currentPrefix}\`\nYeni prefix ayarlamak için: \`prefix <yeni prefix>\``
    );
  }

  // Uzunluk kontrolü
  if (newPrefix.length > 5) {
    return message.reply("Prefix en fazla 5 karakter olabilir.");
  }

  // DB'ye yaz, config'i de güncelle
  try {
    await db.set(`prefix_${guildId}`, newPrefix);
    client.config.prefix = newPrefix;
    return message.channel.send(
      `✅ Prefix başarıyla \`${newPrefix}\` olarak ayarlandı.`
    );
  } catch (error) {
    console.error(error);
    return message.reply("❌ Prefix ayarlanırken bir hata oluştu.");
  }
};
