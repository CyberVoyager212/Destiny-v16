exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.reply(
        "⛔ **Bu komutu kullanmak için yönetici iznine sahip olmalısınız!**"
      );
    }

    const subCommand = args[0]?.toLowerCase();

    if (!subCommand || !["kur", "sil", "otoisim"].includes(subCommand)) {
      return message.reply(
        "⚠ **Geçerli alt komutlar:** `kur`, `sil`, `otoisim`\n\n📝 **Örnek:** `kayıtsistemi kur cinsiyet`"
      );
    }

    if (subCommand === "kur") {
      const mode = args[1]?.toLowerCase();
      if (!["cinsiyet", "normal"].includes(mode)) {
        return message.reply(
          "❌ **Kurulum modu belirtmelisin:** `cinsiyet` veya `normal`\nÖrn: `kayıtsistemi kur cinsiyet`"
        );
      }

      const parts = args
        .slice(2)
        .join(" ")
        .split(",")
        .map((s) => s.trim());

      // Varsayılan isimler
      let [
        kayitsizRolName,
        yetkiliRolName,
        kayitsizKanalName,
        maleRolName,
        femaleRolName,
      ] = [
        parts[0] || "Kayıtsız",
        parts[1] || "Yetkili",
        parts[2] || "kayıtsızlar",
        parts[3] || "Erkek",
        parts[4] || "Kadın",
      ];

      const startTime = Date.now();

      // Kayıtsız rolü
      let kayitsizRol = message.guild.roles.cache.find(
        (r) => r.name === kayitsizRolName
      );
      if (!kayitsizRol) {
        kayitsizRol = await message.guild.roles.create({
          name: kayitsizRolName,
          color: "#808080",
          permissions: [],
        });
      }

      // Yetkili rolü
      let yetkiliRol = message.guild.roles.cache.find(
        (r) => r.name === yetkiliRolName
      );
      if (!yetkiliRol) {
        yetkiliRol = await message.guild.roles.create({
          name: yetkiliRolName,
          color: "#0000FF",
          permissions: [
            "MANAGE_ROLES",
            "MANAGE_CHANNELS",
            "KICK_MEMBERS",
            "BAN_MEMBERS",
          ],
        });
      }

      // Kayıtsızlar kanalı
      let kayitsizKanal = message.guild.channels.cache.find(
        (c) => c.name === kayitsizKanalName
      );
      if (!kayitsizKanal) {
        kayitsizKanal = await message.guild.channels.create(kayitsizKanalName, {
          type: "GUILD_TEXT",
          permissionOverwrites: [
            { id: message.guild.id, deny: ["VIEW_CHANNEL"] },
            { id: kayitsizRol.id, allow: ["VIEW_CHANNEL"] },
            ...(yetkiliRol
              ? [{ id: yetkiliRol.id, allow: ["VIEW_CHANNEL"] }]
              : []),
          ],
        });
      }

      // Diğer kanallardan kayıtsız rolü gizleniyor
      const feedbackMessage = await message.channel.send(
        "⏳ **Kayıtsız rolünün kanal izinleri güncelleniyor...**"
      );
      for (const ch of message.guild.channels.cache.values()) {
        if (ch.id !== kayitsizKanal.id) {
          await ch.permissionOverwrites
            .edit(kayitsizRol, { VIEW_CHANNEL: false })
            .catch(() => {});
        }
      }

      // Cinsiyetli modda ek roller
      let maleRol = null;
      let femaleRol = null;
      if (mode === "cinsiyet") {
        maleRol = message.guild.roles.cache.find((r) => r.name === maleRolName);
        if (!maleRol) {
          maleRol = await message.guild.roles.create({
            name: maleRolName,
            color: "#3498db", // mavi
            permissions: [],
          });
        }

        femaleRol = message.guild.roles.cache.find(
          (r) => r.name === femaleRolName
        );
        if (!femaleRol) {
          femaleRol = await message.guild.roles.create({
            name: femaleRolName,
            color: "#e91e63", // pembe
            permissions: [],
          });
        }
      }

      // Veritabanına kayıt
      await client.db.set(`kayitsizRol_${message.guild.id}`, kayitsizRol.id);
      await client.db.set(
        `kayitsizKanal_${message.guild.id}`,
        kayitsizKanal.id
      );
      await client.db.set(`yetkiliRol_${message.guild.id}`, yetkiliRol.id);

      if (mode === "cinsiyet") {
        await client.db.set(`maleRol_${message.guild.id}`, maleRol.id);
        await client.db.set(`femaleRol_${message.guild.id}`, femaleRol.id);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      return feedbackMessage.edit(
        `✅ **Kayıt Sistemi (${mode.toUpperCase()}) Başarıyla Kuruldu!** 🎉\n\n` +
          `👤 **Kayıtsız Rol:** ${kayitsizRol.name}\n` +
          `🔧 **Yetkili Rol:** ${yetkiliRol.name}\n` +
          `📢 **Kanal:** ${kayitsizKanal.name}\n` +
          (mode === "cinsiyet"
            ? `🚹 **Erkek Rol:** ${maleRol.name}\n🚺 **Kadın Rol:** ${femaleRol.name}\n`
            : ``) +
          `🕒 **Süre:** ${duration} saniye\n👤 **Komutu kullanan:** ${message.member.displayName}`
      );
    } else if (subCommand === "sil") {
      const guildId = message.guild.id;

      // Veritabanından ID'leri çek
      const kayitsizRolID = await client.db.get(`kayitsizRol_${guildId}`);
      const kayitsizKanalID = await client.db.get(`kayitsizKanal_${guildId}`);
      const yetkiliRolID = await client.db.get(`yetkiliRol_${guildId}`);
      const maleRolID = await client.db.get(`maleRol_${guildId}`);
      const femaleRolID = await client.db.get(`femaleRol_${guildId}`);
      const otoIsim = await client.db.get(`autoName_${guildId}`);

      // Sistem hiç kurulmamışsa
      if (!kayitsizRolID && !kayitsizKanalID && !yetkiliRolID && !otoIsim) {
        return message.reply("⚠ **Kayıt sistemi zaten kurulu değil.**");
      }

      // Varsayılan isimler
      let kayitsizRolName = "Kayıtsız";
      let kayitsizKanalName = "kayıtsızlar";
      let yetkiliRolName = "Yetkili";
      let maleRolName = "Erkek";
      let femaleRolName = "Kadın";

      // Silme işlemleri
      if (kayitsizRolID) {
        const r = message.guild.roles.cache.get(kayitsizRolID);
        if (r) {
          kayitsizRolName = r.name;
          await r.delete().catch(() => {});
        }
        await client.db.delete(`kayitsizRol_${guildId}`);
      }

      if (kayitsizKanalID) {
        const c = message.guild.channels.cache.get(kayitsizKanalID);
        if (c) {
          kayitsizKanalName = c.name;
          await c.delete().catch(() => {});
        }
        await client.db.delete(`kayitsizKanal_${guildId}`);
      }

      if (yetkiliRolID) {
        const r = message.guild.roles.cache.get(yetkiliRolID);
        if (r) {
          yetkiliRolName = r.name;
          await r.delete().catch(() => {});
        }
        await client.db.delete(`yetkiliRol_${guildId}`);
      }

      if (maleRolID) {
        const r = message.guild.roles.cache.get(maleRolID);
        if (r) {
          maleRolName = r.name;
          await r.delete().catch(() => {});
        }
        await client.db.delete(`maleRol_${guildId}`);
      }

      if (femaleRolID) {
        const r = message.guild.roles.cache.get(femaleRolID);
        if (r) {
          femaleRolName = r.name;
          await r.delete().catch(() => {});
        }
        await client.db.delete(`femaleRol_${guildId}`);
      }

      if (otoIsim) {
        await client.db.delete(`autoName_${guildId}`);
      }

      // Geri bildirim
      let mesaj = `🗑️ **Kayıt sistemi başarıyla sıfırlandı!**\n\n`;
      mesaj += `👤 **Komutu kullanan:** ${message.member.displayName}\n`;
      mesaj += `👥 **Silinen Rol:** ${kayitsizRolName}\n`;
      mesaj += `📢 **Silinen Kanal:** ${kayitsizKanalName}\n`;
      mesaj += `🔧 **Yetkili Rolü:** ${yetkiliRolName}`;

      if (maleRolID || femaleRolID) {
        mesaj += `\n🚹 **Erkek Rolü:** ${maleRolName}\n🚺 **Kadın Rolü:** ${femaleRolName}`;
      }

      if (otoIsim) {
        mesaj += `\n📝 **Oto İsim:** Aktifti ve kaldırıldı.`;
      }

      return message.channel.send(mesaj);
    } else if (subCommand === "otoisim") {
      const defaultName = args.slice(1).join(" ");
      if (!defaultName) {
        return message.reply(
          "⚠ **Geçerli bir varsayılan isim belirtmelisiniz!**\n\n📝 **Örnek:** `kayıtsistemi otoisim YeniÜye`"
        );
      }

      client.db.set(`autoName_${message.guild.id}`, defaultName);

      return message.channel.send(
        `✅ **Otomatik İsim Ayarlandı!** 🎭\n\n📌 **Komutu kullanan:** ${message.member.displayName}\n👤 **Yeni Varsayılan İsim:** ${defaultName}`
      );
    }
  } catch (err) {
    console.error(err);
    if (err.message.includes("Missing Permissions")) {
      return message.reply("❌ **Botun gerekli yetkileri yok!**");
    }
    return message.reply("❌ **Bir hata oluştu. Lütfen tekrar deneyin.**");
  }
};

exports.help = {
  name: "kayıtsistemi",
  aliases: ["ks"],
  usage:
    "kayıtsistemi kur <normal|cinsiyet> [Kayıtsız,Yetkili,Kanal[,Erkek,Kadın]]\n" +
    "kayıtsistemi sil\n" +
    "kayıtsistemi otoisim <varsayılan isim>",
  description: "Kayıt sistemi kurar, siler veya otomatik isim ayarlar.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["ADMINISTRATOR"],
};
