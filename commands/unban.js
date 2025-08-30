exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("BAN_MEMBERS")) {
    return message.reply(
      "Bu komutu kullanmak için `BAN_MEMBERS` yetkiniz yok."
    );
  }

  const userId = args[0];

  if (!userId) {
    return message.reply(
      "Lütfen banı kaldırılacak kullanıcının ID'sini girin."
    );
  }

  try {
    // Banlı kullanıcıyı unban yap
    const user = await message.guild.members.unban(userId);

    if (!user) {
      return message.reply(
        "Verilen ID ile banlanmış bir kullanıcı bulunamadı."
      );
    }

    // Başarılı işlem mesajı
    await message.channel.send(
      `ID'si ${userId} olan kullanıcının banı başarıyla kaldırıldı.`
    );
  } catch (error) {
    console.error(error);
    return message.reply(
      "Ban kaldırılırken bir hata oluştu. Kullanıcı ID'sinin doğru olduğundan ve kullanıcının gerçekten banlandığından emin olun."
    );
  }
};

exports.help = {
  name: "unban",
  aliases: ["banıaç"],
  usage: "unban <kullanıcı ID>",
  description: "Bir kullanıcının yasağını kaldırır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["BAN_MEMBERS"],
};
