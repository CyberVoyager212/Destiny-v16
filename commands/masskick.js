const { Permissions } = require("discord.js");

module.exports = {
  name: "masskick",
  description: "Belirtilen kullanıcıları toplu olarak sunucudan atar.",
  aliases: ["mkick", "masskickhammer"],
  usage: "masskick @user1 @user2 ...",

  async execute(client, message, args) {
    if (!message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      return message.reply(
        "Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısın."
      );
    }

    if (!message.guild.me.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      return message.reply("Benim **Üyeleri At** yetkim yok!");
    }

    const users = message.mentions.members;
    if (!users.size)
      return message.reply("Lütfen atılacak kullanıcıları etiketleyin.");

    let success = 0,
      failed = 0;
    for (const [id, member] of users) {
      try {
        await member.kick(`Toplu Atma - Yetkili: ${message.member.displayName}`);
        success++;
      } catch (error) {
        failed++;
      }
    }

    message.channel.send(
      `✅ **Başarıyla atılanlar:** ${success} kişi\n❌ **Başarısız:** ${failed} kişi`
    );
  },

  help: {
    name: "masskick",
    aliases: ["mkick", "masskickhammer"],
    usage: "masskick @user1 @user2 ...",
    description: "Belirtilen kişileri topluca sunucudan atar.",
    category: "Moderasyon",
    cooldown: 10,
    permissions: ["KICK_MEMBERS"],
  },
};
