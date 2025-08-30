exports.help = {
  name: "yapiskanmesaj",
  aliases: ["sticky", "sabit"],
  usage: "yapiskanmesaj <ekle|sil|list> [#kanal] [mesaj]",
  description: "Belirtilen kanala yapışkan mesaj ekler, siler veya listeler.",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["ADMINISTRATOR"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(
      "❌ **Bu komutu kullanmak için `Yönetici` yetkiniz yok.**"
    );
  }

  const sub = args[0]?.toLowerCase();
  const db = client.db;

  if (sub === "ekle") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(
        "⚠️ **Lütfen mesajın gönderileceği kanalı etiketleyin!**"
      );
    }
    const content = args.slice(2).join(" ");
    if (!content) {
      return message.reply("⚠️ **Lütfen gönderilecek yapışkan mesajı yazın!**");
    }

    try {
      const sent = await channel.send(content);
      await db.set(`stickyMessage_${channel.id}`, {
        messageId: sent.id,
        content,
      });
      return message.reply(
        `✅ **Yapışkan mesaj başarıyla ${channel} kanalına ayarlandı!**`
      );
    } catch (err) {
      console.error("Yapışkan mesaj gönderilirken hata:", err);
      return message.reply(
        "❌ **Yapışkan mesaj ayarlanırken bir hata oluştu.**"
      );
    }
  } else if (sub === "sil") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(
        "⚠️ **Lütfen silinecek yapışkan mesajın bulunduğu kanalı etiketleyin!**"
      );
    }
    const key = `stickyMessage_${channel.id}`;
    const data = await db.get(key);
    if (!data) {
      return message.reply(
        "⚠️ **Bu kanalda ayarlanmış bir yapışkan mesaj bulunamadı.**"
      );
    }
    await db.delete(key);
    return message.reply(
      `✅ **${channel} kanalındaki yapışkan mesaj başarıyla kaldırıldı!**`
    );
  } else if (sub === "list") {
    const all = await db.all();
    const sticky = all.filter((e) => e.id.startsWith("stickyMessage_"));
    if (!sticky.length) {
      return message.reply("⚠️ **Ayarlanmış yapışkan mesaj bulunamadı.**");
    }

    let txt = "📌 **Ayarlanmış Yapışkan Mesajlar:**\n";
    for (const entry of sticky) {
      const channelId = entry.id.split("_")[1];
      txt += `<#${channelId}>: ${entry.value.content}\n`;
    }
    return message.reply(txt);
  } else {
    return message.reply(
      "⚠️ **Geçersiz alt komut!** `ekle`, `sil` veya `list` kullanın."
    );
  }
};
