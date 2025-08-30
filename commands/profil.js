const { MessageEmbed } = require("discord.js");

exports.execute = async (client, message, args) => {
  const subcommand = args[0];
  if (!subcommand) {
    return message.reply(
      "⚠️ **Lütfen bir alt komut belirtin: işleme, sil veya göster.**"
    );
  }

  if (subcommand.toLowerCase() === "işleme") {
    let dataString = args.slice(1).join(" ");
    let parts = dataString.split(";").map((p) => p.trim());

    if (parts.length < 13) {
      return message.reply(
        "⚠️ **Lütfen tüm alanları girin. Eksik alanları boş bırakmak için sadece noktalı virgül (;) kullanın.**"
      );
    }

    const userInfo = {
      yas: parts[0] || "Veri yok",
      isim: parts[1] || "Veri yok",
      soyisim: parts[2] || "Veri yok",
      hakkimda: parts[3] || "Veri yok",
      sevdiğimOyuncu: parts[4] || "Veri yok",
      sevdiğimYemek: parts[5] || "Veri yok",
      sevdiğimRenk: parts[6] || "Veri yok",
      sevdiğimHobi: parts[7] || "Veri yok",
      sevdiğimHayvan: parts[8] || "Veri yok",
      sevdiğimFilm: parts[9] || "Veri yok",
      sevdiğimSarkı: parts[10] || "Veri yok",
      dogumGunum: parts[11] || "Veri yok",
      aktiflik: parts[12] || "Veri yok",
    };

    // Türkçe karakter desteği olan isim ve soyisim kontrolü
    if (userInfo.yas !== "Veri yok" && !/^\d{1,3}$/.test(userInfo.yas)) {
      return message.reply(
        "⚠️ **Yaş, yalnızca sayı olmalı ve en fazla 3 haneli olmalıdır.**"
      );
    }

    if (
      userInfo.isim !== "Veri yok" &&
      (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(userInfo.isim) ||
        userInfo.isim.length > 50)
    ) {
      return message.reply(
        "⚠️ **İsim yalnızca harflerden oluşmalı ve en fazla 50 karakter olmalıdır.**"
      );
    }

    if (
      userInfo.soyisim !== "Veri yok" &&
      (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(userInfo.soyisim) ||
        userInfo.soyisim.length > 50)
    ) {
      return message.reply(
        "⚠️ **Soyisim yalnızca harflerden oluşmalı ve en fazla 50 karakter olmalıdır.**"
      );
    }

    if (userInfo.hakkimda.length > 250) {
      return message.reply("⚠️ **Hakkımda bölümü 250 karakteri geçemez.**");
    }

    if (
      userInfo.aktiflik !== "Veri yok" &&
      !/^\d{1,2}$/.test(userInfo.aktiflik)
    ) {
      return message.reply(
        "⚠️ **Aktiflik yalnızca sayı olmalı ve en fazla 2 haneli olmalıdır.**"
      );
    }

    try {
      await client.db.set(`profile_${message.author.id}`, userInfo);
      return message.reply("✅ **Profil bilgileri başarıyla kaydedildi!**");
    } catch (error) {
      console.error("Profil bilgileri kaydedilirken hata oluştu:", error);
      return message.reply(
        "❌ **Profil bilgileri kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.**"
      );
    }
  } else if (subcommand.toLowerCase() === "sil") {
    try {
      await client.db.delete(`profile_${message.author.id}`);
      return message.reply("✅ **Profil bilgileri başarıyla silindi!**");
    } catch (error) {
      console.error("Profil bilgileri silinirken hata oluştu:", error);
      return message.reply(
        "❌ **Profil bilgileri silinirken bir hata oluştu. Lütfen tekrar deneyin.**"
      );
    }
  } else if (subcommand.toLowerCase() === "göster") {
    // Kullanıcı belirtilmiş mi?
    let member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[1]) ||
      message.member;

    try {
      const profile = await client.db.get(`profile_${member.id}`);

      if (!profile) {
        return message.reply("⚠️ **Bu kullanıcının profili bulunamadı.**");
      }

      const embed = new MessageEmbed()
        .setTitle(`${member.user.tag} kullanıcısının profili`)
        .setColor("#00FF00")
        .addField("Yaş", profile.yas, true)
        .addField("İsim", profile.isim, true)
        .addField("Soyisim", profile.soyisim, true)
        .addField("Hakkımda", profile.hakkimda)
        .addField("En Sevdiğim Oyuncu", profile.sevdiğimOyuncu, true)
        .addField("En Sevdiğim Yemek", profile.sevdiğimYemek, true)
        .addField("En Sevdiğim Renk", profile.sevdiğimRenk, true)
        .addField("En Sevdiğim Hobi", profile.sevdiğimHobi, true)
        .addField("En Sevdiğim Hayvan", profile.sevdiğimHayvan, true)
        .addField("En Sevdiğim Film", profile.sevdiğimFilm, true)
        .addField("En Sevdiğim Şarkı", profile.sevdiğimSarkı, true)
        .addField("Doğum Günü", profile.dogumGunum, true)
        .addField("Aktiflik", profile.aktiflik, true)
        .setFooter({
          text: `Profil görüntüleyen: ${message.member.displayName}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Profil gösterilirken hata oluştu:", error);
      return message.reply("❌ **Profil görüntülenirken bir hata oluştu.**");
    }
  } else {
    return message.reply(
      "⚠️ **Geçersiz alt komut! Lütfen 'işleme', 'sil' veya 'göster' kullanın.**"
    );
  }
};

exports.help = {
  name: "hakkımda",
  aliases: ["profile", "kimlik"],
  usage: "hakkımda <işleme | sil | göster> [veriler veya kullanıcı]",
  description: "Kullanıcı hakkında bilgileri kaydeder, siler veya gösterir.",
  category: "Araçlar",
  cooldown: 10,
};
