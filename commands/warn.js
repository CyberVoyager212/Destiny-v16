// commands/warn.js
const { Collection } = require("discord.js");

module.exports = {
  help: {
    name: "warn",
    aliases: ["uyar"],
    usage: "warn <ver|list|clear> <@kullanıcı / ID / isim> [sebep]",
    description:
      "Kullanıcıya uyarı verme, uyarıları listeleme veya temizleme komutu.",
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["MANAGE_MESSAGES"],
  },

  execute: async (client, message, args) => {
    const db = client.db;

    if (!message.member.permissions.has("MANAGE_MESSAGES"))
      return message.reply(
        "❌ **Bu komutu kullanmak için `Mesajları Yönet` yetkiniz yok.**"
      );

    const sub = args[0]?.toLowerCase();

    // --- UYARI VERME (default ya da 'ver') ---
    if (!sub || sub === "ver") {
      const idx = sub === "ver" ? 1 : 0;
      const user =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[idx]) ||
        message.guild.members.cache.find(
          (m) => m.user.username.toLowerCase() === args[idx]?.toLowerCase()
        );

      if (!user)
        return message.reply(
          "⚠️ **Lütfen uyarı vermek istediğiniz kullanıcıyı belirtin.**"
        );

      if (user.user.bot) return message.reply("🤖 **Botları uyaramazsınız!**");

      const reason = args.slice(idx + 1).join(" ") || "Sebep belirtilmedi.";
      let warnings =
        (await db.get(`warnings_${message.guild.id}_${user.id}`)) || [];

      warnings.push({ admin: message.author.id, reason });
      await db.set(`warnings_${message.guild.id}_${user.id}`, warnings);

      await message.channel.send(
        `⚠️ **${user.user.tag}** kullanıcısına uyarı verildi. (Toplam: ${warnings.length})`
      );

      // 5 uyarıda ban
      if (warnings.length >= 5) {
        try {
          const list = warnings
            .map((w, i) => `**${i + 1}.** <@${w.admin}> - ${w.reason}`)
            .join("\n");
          await user.send(
            `🚨 **5 uyarı aldığın için banlandın.**\n` +
              `İtiraz için yöneticilere başvurabilirsin:\n${list}`
          );
          await user.ban({ reason: "5 uyarıya ulaştı." });
          await db.delete(`warnings_${message.guild.id}_${user.id}`);
          message.channel.send(`🔨 **${user.user.tag}** banlandı (5 uyarı).`);
        } catch (e) {
          console.error(e);
          message.channel.send("❌ **Ban işlemi sırasında hata oluştu.**");
        }
      }

      return;
    }

    // --- UYARILARI LİSTELEME ---
    if (sub === "list") {
      const user =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]) ||
        message.guild.members.cache.find(
          (m) => m.user.username.toLowerCase() === args[1]?.toLowerCase()
        );

      if (!user)
        return message.reply(
          "⚠️ **Uyarılarını görmek istediğin kullanıcıyı belirt.**"
        );

      const warnings =
        (await db.get(`warnings_${message.guild.id}_${user.id}`)) || [];
      if (!warnings.length)
        return message.reply("✅ **Bu kullanıcının hiç uyarısı yok.**");

      const list = warnings
        .map((w, i) => `**${i + 1}.** <@${w.admin}> - ${w.reason}`)
        .join("\n");
      return message.channel.send(
        `⚠️ **${user.user.tag}** uyarıları:\n${list}`
      );
    }

    // --- UYARILARI TEMİZLEME ---
    if (sub === "clear") {
      const user =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]) ||
        message.guild.members.cache.find(
          (m) => m.user.username.toLowerCase() === args[1]?.toLowerCase()
        );

      if (!user)
        return message.reply(
          "⚠️ **Uyarılarını silmek istediğin kullanıcıyı belirt.**"
        );

      const warnings =
        (await db.get(`warnings_${message.guild.id}_${user.id}`)) || [];
      if (!warnings.length)
        return message.reply(
          "✅ **Bu kullanıcının zaten hiçbir uyarısı yok.**"
        );

      await db.delete(`warnings_${message.guild.id}_${user.id}`);
      return message.channel.send(
        `🗑️ **${user.user.tag}** uyarıları temizlendi.`
      );
    }

    // --- GEÇERSİZ ALT KOMUT ---
    return message.reply(
      "❌ **Geçersiz alt komut!** Kullanabileceğiniz: `ver`, `list`, `clear`"
    );
  },
};
