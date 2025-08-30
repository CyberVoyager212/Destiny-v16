const { Permissions } = require("discord.js");

module.exports = {
  name: "massban",
  description: "Belirtilen kullanıcıları toplu olarak yasaklar.",
  aliases: ["mban", "massbanhammer"],
  usage: "massban @user1 @user2 ...",

  async execute(client, message, args) {
    if (!message.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
      return message.reply(
        "Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın."
      );
    }

    if (!message.guild.me.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
      return message.reply("Benim **Üyeleri Yasakla** yetkim yok!");
    }

    const users = message.mentions.members;
    if (!users.size)
      return message.reply("Lütfen yasaklanacak kullanıcıları etiketleyin.");

    let success = 0,
      failed = 0;
    for (const [id, member] of users) {
      try {
        await member.ban({
          reason: `Toplu Yasaklama - Yetkili: ${message.member.displayName}`,
        });
        success++;
      } catch (error) {
        failed++;
      }
    }

    message.channel.send(
      `✅ **Başarıyla yasaklananlar:** ${success} kişi\n❌ **Başarısız:** ${failed} kişi`
    );
  },

  help: {
    name: "massban",
    aliases: ["mban", "massbanhammer"],
    usage: "massban @user1 @user2 ...",
    description: "Belirtilen kişileri topluca yasaklar.",
    category: "Moderasyon",
    cooldown: 10,
    permissions: ["BAN_MEMBERS"],

  },
};
