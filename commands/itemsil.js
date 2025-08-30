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
        "👤 **Lütfen bir kullanıcı etiketleyin!**\nÖrnek: `removeitem @kullanıcı Elmas`"
      );
    }

    // Eşya adını al
    const itemName = args.slice(1).join(" ");
    if (!itemName) {
      return message.reply(
        "📜 **Lütfen silmek istediğiniz eşyanın adını belirtin!**\nÖrnek: `removeitem @kullanıcı Elmas`"
      );
    }

    // Kullanıcının envanterini al
    const inventoryKey = `inventory_${user.id}`;
    const inventory = (await client.db.get(inventoryKey)) || [];

    // Eşya var mı kontrol et
    const itemIndex = inventory.findIndex(
      (item) => item.name.toLowerCase() === itemName.toLowerCase()
    );
    if (itemIndex === -1) {
      return message.reply(
        `❌ **${user.username} kullanıcısının envanterinde "${itemName}" bulunamadı!**`
      );
    }

    // Emoji kontrolü
    const removedItem = inventory[itemIndex];
    if (!removedItem.emoji) {
      removedItem.emoji = "❓";
    }

    // Eşyayı sil
    inventory.splice(itemIndex, 1);
    await client.db.set(inventoryKey, inventory);

    // Başarı mesajı
    return message.channel.send(
      `✅ **${user.username} kullanıcısından eşya silindi!**\n🗑️ **Silinen Eşya:** ${removedItem.emoji} ${removedItem.name}`
    );
  } catch (error) {
    console.error("⚠️ removeitem komutu hata:", error);
    return message.reply("❌ **Bir hata oluştu, lütfen tekrar deneyin!**");
  }
};

exports.help = {
  name: "removeitem",
  aliases: [],
  usage: "removeitem @user <item_name>",
  description: "Kullanıcının envanterinden bir eşyayı siler.",
  category: "Ekonomi",
  cooldown: 5, // saniye
  admin: true,
};
