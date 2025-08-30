// addegis.js
const { MessageEmbed } = require("discord.js");

exports.help = {
  name: "addeğiş",
  aliases: [],
  usage: "addeğiş <@kullanıcı> <yeni İsim>",
  description: "Belirtilen kullanıcının sunucu üzerindeki adını değiştirir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_NICKNAMES"],
};

exports.execute = async (client, message, args) => {
  // Komutu kullanan kişinin MANAGE_NICKNAMES yetkisi var mı?
  if (!message.member.permissions.has("MANAGE_NICKNAMES"))
    return message.reply(
      "Bu komutu kullanmak için `İsimleri Yönet` yetkisine sahip olmalısın."
    );

  // Botun MANAGE_NICKNAMES yetkisi var mı?
  if (!message.guild.me.permissions.has("MANAGE_NICKNAMES"))
    return message.reply("Botun `İsimleri Yönet` yetkisi yok!");

  // Mention ile kullanıcı al
  const member = message.mentions.members.first();
  // Yeni isim argüman olarak alın (ilk argüman mention sonrası)
  const yeni = args.slice(1).join(" ");

  if (!member || !yeni)
    return message.reply("Kullanıcıyı ve yeni ismi belirtmelisin.");

  // Botun rolü, hedef kullanıcının rolünden yüksek mi? (Rol hiyerarşisi kontrolü)
  if (member.roles.highest.position >= message.guild.me.roles.highest.position)
    return message.reply(
      "Bu kullanıcının ismini değiştirmek için yeterli yetkim yok."
    );

  try {
    // İsim değiştirme işlemi
    await member.setNickname(yeni);

    // Başarılı mesajı gönder
    message.channel.send(
      `✅ ${member.user.tag} ismisi **${yeni}** olarak değiştirildi.`
    );
  } catch (e) {
    console.error(e);
    message.reply("❌ İsim değiştirme sırasında hata oldu.");
  }
};
