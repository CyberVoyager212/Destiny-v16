exports.execute = async (client, message, args) => {
  try {
    // Yetki kontrolü
    if (!client.config.admins.includes(message.author.id)) {
      return message.reply("⛔ **Bu komutu kullanma iznin yok!**");
    }

    // Kullanıcıyı al
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(
        "👤 **Lütfen bir kullanıcı etiketleyin!**\nÖrnek: `additem @kullanıcı Elmas 💎 1000`"
      );
    }

    // Eşya adı
    const itemName = args[1];
    if (!itemName) {
      return message.reply(
        "📜 **Lütfen eklemek istediğiniz eşyanın adını belirtin!**\nÖrnek: `additem @kullanıcı Elmas 💎 1000`"
      );
    }

    // Emoji kontrolü
    const itemEmoji = args[2];
    if (!itemEmoji) {
      return message.reply(
        "😊 **Lütfen eşyanın bir emojisini belirtin!**\nÖrnek: `additem @kullanıcı Elmas 💎 1000`"
      );
    }

    // Değer kontrolü
    const itemValue = args[3];
    if (!itemValue || isNaN(itemValue)) {
      return message.reply(
        "💰 **Lütfen geçerli bir değer girin!**\nÖrnek: `additem @kullanıcı Elmas 💎 1000`"
      );
    }

    // Yeni eşya objesi
    const newItem = {
      name: itemName,
      emoji: itemEmoji,
      value: parseInt(itemValue),
    };

    // Kullanıcının envanterine ekle
    const inventoryKey = `inventory_${user.id}`;
    const inventory = (await client.db.get(inventoryKey)) || [];
    inventory.push(newItem);
    await client.db.set(inventoryKey, inventory);

    // Başarı mesajı
    return message.channel.send(
      `✅ **${user.username} kullanıcısına yeni eşya eklendi!**\n🆕 **Eşya:** ${newItem.emoji} ${newItem.name}\n💰 **Değer:** ${newItem.value}`
    );
  } catch (error) {
    console.error("⚠️ additem komutu hata:", error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin!**");
  }
};

exports.help = {
  name: "additem",
  aliases: [],
  usage: "additem @user <item_name> <item_emoji> <item_value>",
  description: "Kullanıcının envanterine yeni bir eşya ekler.",
  category: "Ekonomi",
  cooldown: 5, // saniye
  admin: true,
};
