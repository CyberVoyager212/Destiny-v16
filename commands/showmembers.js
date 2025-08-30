// showmembers.js
const { Permissions, MessageAttachment } = require("discord.js");
const fs = require("fs");
const path = require("path");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
    return message.reply(
      "❌ **Bu komutu kullanmak için yeterli yetkiniz yok.**"
    );
  }

  const infoMsg = await message.reply(
    "🔄 Üyeler yükleniyor, bu büyük sunucularda biraz sürebilir..."
  );

  try {
    // Tüm üyeleri fetch et (çevrimdışı dahil)
    const membersCollection = await message.guild.members.fetch();
    const members = membersCollection.map((m) => `${m.user.tag} (${m.id})`);

    if (!members.length) {
      return infoMsg.edit("❌ Sunucuda hiç üye bulunamadı.");
    }

    const fileName = `uyeler_${message.guild.id}.txt`;
    const filePath = path.join(__dirname, "..", "temp", fileName);

    // temp klasörünü yoksa oluştur
    const tempDir = path.join(__dirname, "..", "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    fs.writeFileSync(filePath, members.join("\n"), "utf8");

    const attachment = new MessageAttachment(filePath);

    await message.channel.send({
      content: `✅ Toplam **${members.length} üye bulundu**.\nAşşağıdan sunucunun üyelerini .txt halinde indirebilirsiniz.`,
      files: [attachment],
    });

    await infoMsg.delete();

    // 10 saniye sonra geçici dosyayı temizle
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error("Dosya silinemedi:", err);
      });
    }, 10000);
  } catch (err) {
    console.error(err);
    infoMsg.edit("❌ Üyeler alınırken bir hata oluştu.");
  }
};

exports.help = {
  name: "showmembers",
  aliases: ["üyeler"],
  usage: "showmembers",
  description:
    "Sunucudaki tüm üyelerin (çevrimdışı dahil) tag ve ID bilgilerini listeler ve .txt olarak indirmenizi sağlar.",
  category: "Araçlar",
  cooldown: 10,
  permissions: ["VIEW_AUDIT_LOG"],
};
