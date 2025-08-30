exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.reply(
        "⛔ **Bu komutu kullanmak için `Yönetici` iznine sahip olmalısınız!**"
      );
    }

    const botId = client.user.id;
    const inviteLink = `https://discord.com/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot`;

    return message.reply(
      `🤖 **Botu sunucuna davet etmek için aşağıya tıkla:**\n🔗 [Davet Et](${inviteLink})`
    );
  } catch (error) {
    console.error("Davet hatası:", error);
    return message.reply("❌ **Davet linki oluşturulurken bir hata oluştu.**");
  }
};

exports.help = {
  name: "bot-davet",
  aliases: ["davet"],
  usage: "bot-davet",
  description: "Botun davet linkini gönderir.",
  category: "Bot",
  cooldown: 10,
  permissions: ["ADMINISTRATOR"],
};
