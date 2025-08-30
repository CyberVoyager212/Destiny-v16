// ghostping.js
module.exports = {
  help: {
    name: "ghostping",
    aliases: ["hayaletping", "gp"],
    usage: "ghostping <@kullanıcı | KullanıcıAdı | KullanıcıID>",
    description:
      "Belirtilen kullanıcıya hayalet ping atar ve mesajı hemen siler.",
    category: "Moderasyon",
    cooldown: 5, // saniye
    permissions: ["MANAGE_MESSAGES"],
  },

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_MESSAGES")) {
      return message.reply(
        "❌ Bu komutu kullanmak için **Mesajları Yönet** iznine sahip olmalısın!"
      );
    }

    let user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === args.join(" ").toLowerCase()
      );

    if (!user)
      return message.reply(
        "❌ Geçerli bir kullanıcı belirtmelisin! (Etiket, Kullanıcı Adı veya ID)"
      );

    message.channel.send(`${user}`).then((sentMessage) => {
      setTimeout(() => {
        sentMessage.delete().catch(() => {});
      }, 1000);
    });

    message.delete().catch(() => {});
  },
};
